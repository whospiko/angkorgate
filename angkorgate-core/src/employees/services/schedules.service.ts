import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, IsNull, Repository } from 'typeorm';
import { WorkSchedule } from '../entities/work-schedule.entity';
import { ScheduleOverride } from '../entities/schedule-override.entity';
import { LeaveRequest } from '../entities/leave-request.entity';
import { AttendanceLog, type AttendanceSource } from '../entities/attendance-log.entity';
import { AttendancePolicy, type AttendanceSessionRule } from '../entities/attendance-policy.entity';
import { CreateScheduleDto } from '../dto/create-schedule.dto';
import { UpdateScheduleDto } from '../dto/update-schedule.dto';
import { CreateScheduleOverrideDto } from '../dto/create-schedule-override.dto';
import {
    CreateAttendancePolicyDto,
    UpdateAttendancePolicyDto,
} from '../dto/attendance-policy.dto';
import { EmployeesService } from './employees.service';
import { AuditService } from '../../audit/services/audit.service';
import { buildCsv } from '../../common/utils/csv.util';

@Injectable()
export class SchedulesService {
    constructor(
        @InjectRepository(WorkSchedule)
        private readonly repo: Repository<WorkSchedule>,
        private readonly employees: EmployeesService,
        private readonly audit: AuditService,
        @Optional()
        @InjectRepository(ScheduleOverride)
        private readonly overrideRepo?: Repository<ScheduleOverride>,
        @Optional()
        @InjectRepository(LeaveRequest)
        private readonly leaveRepo?: Repository<LeaveRequest>,
        @Optional()
        @InjectRepository(AttendanceLog)
        private readonly attendanceRepo?: Repository<AttendanceLog>,
        @Optional()
        @InjectRepository(AttendancePolicy)
        private readonly policyRepo?: Repository<AttendancePolicy>,
    ) { }

    async create(dto: CreateScheduleDto, actorId?: string): Promise<WorkSchedule> {
        await this.employees.findByIdOrFail(dto.employeeId);
        this.assertValidTimeRange(dto.startTime, dto.endTime);

        if (dto.isActive !== false) {
            await this.assertNoOverlap(
                dto.employeeId,
                dto.dayOfWeek,
                dto.startTime,
                dto.endTime,
            );
        }

        const saved = await this.repo.save(this.repo.create(dto));

        void this.audit.log({
            actorId: actorId ?? null,
            action: 'employee.schedule.create',
            entity: 'work_schedule',
            entityId: saved.id,
            newValue: {
                employeeId: dto.employeeId,
                dayOfWeek: saved.dayOfWeek,
                startTime: saved.startTime,
                endTime: saved.endTime,
                isActive: saved.isActive,
            },
        });

        return saved;
    }

    async findByEmployee(employeeId: string): Promise<WorkSchedule[]> {
        await this.employees.findByIdOrFail(employeeId);
        return this.repo.find({
            where: { employeeId },
            order: { dayOfWeek: 'ASC', startTime: 'ASC' },
        });
    }

    async findById(employeeId: string, id: string): Promise<WorkSchedule> {
        const s = await this.repo.findOne({ where: { id, employeeId } });
        if (!s) throw new NotFoundException(`Schedule ${id} not found`);
        return s;
    }

    async update(
        employeeId: string,
        id: string,
        dto: UpdateScheduleDto,
        actorId?: string,
    ): Promise<WorkSchedule> {
        const s = await this.findById(employeeId, id);

        const nextDay = dto.dayOfWeek ?? s.dayOfWeek;
        const nextStart = dto.startTime ?? s.startTime;
        const nextEnd = dto.endTime ?? s.endTime;
        const nextActive = dto.isActive ?? s.isActive;

        this.assertValidTimeRange(nextStart, nextEnd);

        if (nextActive) {
            await this.assertNoOverlap(employeeId, nextDay, nextStart, nextEnd, id);
        }

        const oldValue = {
            dayOfWeek: s.dayOfWeek,
            startTime: s.startTime,
            endTime: s.endTime,
            isActive: s.isActive,
        };
        Object.assign(s, dto);
        const saved = await this.repo.save(s);

        void this.audit.log({
            actorId: actorId ?? null,
            action: 'employee.schedule.update',
            entity: 'work_schedule',
            entityId: id,
            oldValue,
            newValue: dto as Record<string, unknown>,
        });

        return saved;
    }

    async remove(employeeId: string, id: string, actorId?: string): Promise<void> {
        const existing = await this.findById(employeeId, id);
        const r = await this.repo.delete({ id, employeeId });
        if (r.affected === 0) throw new NotFoundException(`Schedule ${id} not found`);

        void this.audit.log({
            actorId: actorId ?? null,
            action: 'employee.schedule.delete',
            entity: 'work_schedule',
            entityId: id,
            oldValue: {
                employeeId,
                dayOfWeek: existing.dayOfWeek,
                startTime: existing.startTime,
                endTime: existing.endTime,
            },
        });
    }

    // --- Schedule Overrides ---

    async setOverride(
        employeeId: string,
        dto: CreateScheduleOverrideDto,
        actorId?: string,
    ): Promise<ScheduleOverride> {
        await this.employees.findByIdOrFail(employeeId);

        if (dto.isAvailable) {
            if (!dto.startTime || !dto.endTime) {
                throw new BadRequestException(
                    'startTime and endTime are required when override isAvailable is true',
                );
            }
            this.assertValidTimeRange(dto.startTime, dto.endTime);
        }

        if (!this.overrideRepo) {
            throw new BadRequestException('Schedule overrides repository unavailable');
        }

        let existing = await this.overrideRepo.findOne({
            where: { employeeId, date: dto.date },
        });
        if (existing) {
            existing.isAvailable = dto.isAvailable;
            existing.startTime = dto.isAvailable ? (dto.startTime ?? null) : null;
            existing.endTime = dto.isAvailable ? (dto.endTime ?? null) : null;
            existing.reason = dto.reason ?? null;
        } else {
            existing = this.overrideRepo.create({
                employeeId,
                date: dto.date,
                isAvailable: dto.isAvailable,
                startTime: dto.isAvailable ? (dto.startTime ?? null) : null,
                endTime: dto.isAvailable ? (dto.endTime ?? null) : null,
                reason: dto.reason ?? null,
            });
        }

        const saved = await this.overrideRepo.save(existing);

        void this.audit.log({
            actorId: actorId ?? null,
            action: 'employee.schedule.override.set',
            entity: 'schedule_override',
            entityId: saved.id,
            newValue: {
                employeeId,
                date: saved.date,
                isAvailable: saved.isAvailable,
                reason: saved.reason,
            },
        });

        return saved;
    }

    async listOverrides(employeeId: string): Promise<ScheduleOverride[]> {
        await this.employees.findByIdOrFail(employeeId);
        if (!this.overrideRepo) return [];
        return this.overrideRepo.find({
            where: { employeeId },
            order: { date: 'ASC' },
        });
    }

    async removeOverride(
        employeeId: string,
        overrideId: string,
        actorId?: string,
    ): Promise<void> {
        if (!this.overrideRepo) return;
        const existing = await this.overrideRepo.findOne({
            where: { id: overrideId, employeeId },
        });
        if (!existing) throw new NotFoundException(`Schedule override ${overrideId} not found`);

        await this.overrideRepo.delete({ id: overrideId, employeeId });

        void this.audit.log({
            actorId: actorId ?? null,
            action: 'employee.schedule.override.delete',
            entity: 'schedule_override',
            entityId: overrideId,
            oldValue: { employeeId, date: existing.date },
        });
    }

    /** Narrow API — used by Appointments & scheduling modules. */
    async isEmployeeAvailable(
        employeeId: string,
        dayOfWeek: number,
        time: string,
    ): Promise<boolean> {
        return this.repo
            .createQueryBuilder('s')
            .where('s.employeeId = :eid', { eid: employeeId })
            .andWhere('s.dayOfWeek = :day', { day: dayOfWeek })
            .andWhere('s.isActive = true')
            .andWhere('s.startTime <= :time', { time })
            .andWhere('s.endTime > :time', { time })
            .getExists();
    }

    /**
     * Date-aware availability check:
     * 1. Date-specific ScheduleOverride (takes precedence)
     * 2. Approved LeaveRequest covering the date
     * 3. Recurring weekly WorkSchedule
     */
    async isEmployeeAvailableOnDate(
        employeeId: string,
        date: string,
        time: string,
    ): Promise<{ available: boolean; reason?: string }> {
        const normTime = this.normalizeTime(time);

        if (this.overrideRepo) {
            const override = await this.overrideRepo.findOne({
                where: { employeeId, date },
            });
            if (override) {
                if (!override.isAvailable) {
                    return {
                        available: false,
                        reason: override.reason || 'Schedule override (day off)',
                    };
                }
                const start = override.startTime ? this.normalizeTime(override.startTime) : '00:00:00';
                const end = override.endTime ? this.normalizeTime(override.endTime) : '23:59:59';
                const within = start <= normTime && end > normTime;
                return {
                    available: within,
                    reason: within ? undefined : 'Outside override shift hours',
                };
            }
        }

        if (this.leaveRepo) {
            const onLeave = await this.leaveRepo
                .createQueryBuilder('l')
                .where('l.employeeId = :eid', { eid: employeeId })
                .andWhere('l.status = :status', { status: 'APPROVED' })
                .andWhere('l.startDate <= :date', { date })
                .andWhere('l.endDate >= :date', { date })
                .getOne();

            if (onLeave) {
                return {
                    available: false,
                    reason: `On approved ${onLeave.leaveType} leave`,
                };
            }
        }

        const dayOfWeek = new Date(`${date}T00:00:00Z`).getUTCDay();
        const regular = await this.isEmployeeAvailable(employeeId, dayOfWeek, time);
        return {
            available: regular,
            reason: regular ? undefined : 'Outside recurring work schedule',
        };
    }

    private assertValidTimeRange(startTime: string, endTime: string): void {
        const startNorm = this.normalizeTime(startTime);
        const endNorm = this.normalizeTime(endTime);
        if (startNorm >= endNorm) {
            throw new BadRequestException('Shift startTime must be earlier than endTime');
        }
    }

    private normalizeTime(t: string): string {
        return t.length === 5 ? `${t}:00` : t;
    }

    private async assertNoOverlap(
        employeeId: string,
        dayOfWeek: number,
        startTime: string,
        endTime: string,
        excludeScheduleId?: string,
    ): Promise<void> {
        const qb = this.repo
            .createQueryBuilder('s')
            .where('s.employeeId = :eid', { eid: employeeId })
            .andWhere('s.dayOfWeek = :day', { day: dayOfWeek })
            .andWhere('s.isActive = true')
            .andWhere('(s.startTime < :end AND s.endTime > :start)', {
                start: startTime,
                end: endTime,
            });

        if (excludeScheduleId) {
            qb.andWhere('s.id != :excludeId', { excludeId: excludeScheduleId });
        }

        if (await qb.getExists()) {
            throw new BadRequestException('Overlapping schedule exists for this day');
        }
    }

    async clockIn(
        employeeId: string,
        notes?: string,
        source: AttendanceSource = 'WEB',
        actorId?: string,
        context?: {
            isSelfService?: boolean;
            clientIp?: string | null;
            latitude?: number;
            longitude?: number;
        },
    ): Promise<AttendanceLog> {
        if (!this.attendanceRepo) {
            throw new BadRequestException('Attendance repository is not configured');
        }
        const employee = await this.employees.findByIdOrFail(employeeId);

        const open = await this.attendanceRepo.findOne({
            where: { employeeId, clockOutAt: IsNull() },
        });
        if (open) {
            throw new ConflictException('Employee is already clocked in');
        }

        const now = new Date();
        const todayStr = now.toISOString().slice(0, 10);
        const dayStart = new Date(`${todayStr}T00:00:00.000Z`);
        const dayEnd = new Date(`${todayStr}T23:59:59.999Z`);
        const todayCount =
            (await this.attendanceRepo.count({
                where: { employeeId, clockInAt: Between(dayStart, dayEnd) },
            })) ?? 0;

        const dayOfWeek = now.getUTCDay();
        const nowMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();

        let expectedStartMinutes: number | null = null;
        let graceMinutes = 5;
        let sessionIndex: number | null = todayCount;
        let policyId: string | null = null;
        const normalizedIp = this.normalizeIp(context?.clientIp);
        let distanceMeters: number | null = null;

        const policy = await this.resolveAttendancePolicyForEmployee(employee);
        if (policy && context?.isSelfService) {
            if (policy.allowSelfServiceWeb === false) {
                throw new ForbiddenException(
                    'Remote web check-in is disabled for your policy. Please check in at the front-desk terminal.',
                );
            }
            if (Array.isArray(policy.allowedIps) && policy.allowedIps.length > 0) {
                if (!this.isIpAllowed(normalizedIp, policy.allowedIps)) {
                    throw new ForbiddenException(
                        `Check-in blocked: network IP (${normalizedIp ?? 'unknown'}) is not on the office/clinic Wi-Fi allowlist.`,
                    );
                }
            }
            if (
                policy.requireGeofence &&
                typeof policy.officeLatitude === 'number' &&
                typeof policy.officeLongitude === 'number'
            ) {
                if (
                    typeof context.latitude !== 'number' ||
                    typeof context.longitude !== 'number'
                ) {
                    throw new BadRequestException(
                        'Location (GPS) permission is required to check in under this policy.',
                    );
                }
                distanceMeters = Math.round(
                    this.haversineMeters(
                        context.latitude,
                        context.longitude,
                        policy.officeLatitude,
                        policy.officeLongitude,
                    ),
                );
                const maxRadius = policy.geofenceRadiusMeters ?? 100;
                if (distanceMeters > maxRadius) {
                    throw new ForbiddenException(
                        `Check-in blocked: you are ${distanceMeters}m away from the workplace (max allowed: ${maxRadius}m).`,
                    );
                }
            }
        } else if (
            policy?.requireGeofence &&
            typeof policy.officeLatitude === 'number' &&
            typeof policy.officeLongitude === 'number' &&
            typeof context?.latitude === 'number' &&
            typeof context?.longitude === 'number'
        ) {
            distanceMeters = Math.round(
                this.haversineMeters(
                    context.latitude,
                    context.longitude,
                    policy.officeLatitude,
                    policy.officeLongitude,
                ),
            );
        }

        if (policy && Array.isArray(policy.sessions) && policy.sessions.length > 0) {
            const sortedSessions = [...policy.sessions].sort((a, b) =>
                a.checkInTime.localeCompare(b.checkInTime),
            );
            if (todayCount >= sortedSessions.length) {
                throw new BadRequestException(
                    `All ${sortedSessions.length} configured check-in session(s) for today are already recorded`,
                );
            }
            const targetSession = sortedSessions[todayCount];
            const [h, m] = targetSession.checkInTime.split(':').map(Number);
            expectedStartMinutes = h * 60 + m;
            graceMinutes = policy.graceMinutes ?? 5;
            policyId = policy.id;
        } else {
            if (this.overrideRepo) {
                const ov = await this.overrideRepo.findOne({ where: { employeeId, date: todayStr } });
                if (ov?.isAvailable && ov.startTime) {
                    const [h, m] = ov.startTime.split(':').map(Number);
                    expectedStartMinutes = h * 60 + m;
                }
            }
            if (expectedStartMinutes === null) {
                const sched = await this.repo.findOne({
                    where: { employeeId, dayOfWeek, isActive: true },
                    order: { startTime: 'ASC' },
                });
                if (sched?.startTime) {
                    const [h, m] = sched.startTime.split(':').map(Number);
                    expectedStartMinutes = h * 60 + m;
                }
            }
        }

        const lateMinutes =
            expectedStartMinutes !== null && nowMinutes > expectedStartMinutes
                ? nowMinutes - expectedStartMinutes
                : 0;
        const status = lateMinutes > graceMinutes ? 'LATE' : 'ON_TIME';

        const saved = await this.attendanceRepo.save(
            this.attendanceRepo.create({
                employeeId,
                clockInAt: now,
                clockOutAt: null,
                source,
                status,
                lateMinutes,
                workedMinutes: null,
                sessionIndex,
                policyId,
                clockInIp: normalizedIp,
                clockInLatitude: typeof context?.latitude === 'number' ? context.latitude : null,
                clockInLongitude: typeof context?.longitude === 'number' ? context.longitude : null,
                distanceMeters,
                notes: notes ?? null,
            }),
        );

        void this.audit.log({
            actorId: actorId ?? null,
            action: 'employee.attendance.clock_in',
            entity: 'attendance_log',
            entityId: saved.id,
            newValue: {
                employeeId,
                source,
                sessionIndex,
                policyId,
                clockInIp: normalizedIp,
                distanceMeters,
                clockInAt: saved.clockInAt,
            },
        });

        return saved;
    }

    async clockOut(
        employeeId: string,
        notes?: string,
        actorId?: string,
    ): Promise<AttendanceLog> {
        if (!this.attendanceRepo) {
            throw new BadRequestException('Attendance repository is not configured');
        }
        await this.employees.findByIdOrFail(employeeId);

        const open = await this.attendanceRepo.findOne({
            where: { employeeId, clockOutAt: IsNull() },
            order: { clockInAt: 'DESC' },
        });
        if (!open) {
            throw new BadRequestException('Employee is not currently clocked in');
        }

        const clockOutAt = new Date();
        open.clockOutAt = clockOutAt;
        open.workedMinutes = Math.max(
            0,
            Math.round((clockOutAt.getTime() - new Date(open.clockInAt).getTime()) / 60_000),
        );
        if (notes) {
            open.notes = open.notes ? `${open.notes} | ${notes}` : notes;
        }
        const saved = await this.attendanceRepo.save(open);

        void this.audit.log({
            actorId: actorId ?? null,
            action: 'employee.attendance.clock_out',
            entity: 'attendance_log',
            entityId: saved.id,
            newValue: { employeeId, clockOutAt: saved.clockOutAt },
        });

        return saved;
    }

    async listAttendance(
        employeeId?: string,
        limit = 50,
        startDate?: string,
        endDate?: string,
    ): Promise<AttendanceLog[]> {
        if (!this.attendanceRepo) return [];
        const qb = this.attendanceRepo
            .createQueryBuilder('a')
            .leftJoin('a.employee', 'emp')
            .addSelect(['emp.id', 'emp.employeeCode', 'emp.fullName'])
            .orderBy('a.clockInAt', 'DESC')
            .take(Math.min(Math.max(limit, 1), 200));

        if (employeeId) {
            qb.andWhere('a.employeeId = :eid', { eid: employeeId });
        }
        if (startDate) {
            qb.andWhere('a.clockInAt >= :fromTs', { fromTs: new Date(`${startDate}T00:00:00Z`) });
        }
        if (endDate) {
            qb.andWhere('a.clockInAt <= :toTs', { toTs: new Date(`${endDate}T23:59:59.999Z`) });
        }
        return qb.getMany();
    }

    async getAttendanceSummary(startDate: string, endDate: string, employeeId?: string) {
        const logs = await this.listAttendance(employeeId, 200, startDate, endDate);
        let onTimeCount = 0;
        let lateCount = 0;
        let totalLateMinutes = 0;
        let totalWorkedMinutes = 0;

        for (const log of logs) {
            if (log.status === 'LATE') lateCount++;
            else onTimeCount++;
            totalLateMinutes += log.lateMinutes || 0;
            totalWorkedMinutes += log.workedMinutes || 0;
        }

        return {
            startDate,
            endDate,
            totalLogs: logs.length,
            onTimeCount,
            lateCount,
            totalLateMinutes,
            totalWorkedMinutes,
            totalWorkedHours: Math.round((totalWorkedMinutes / 60) * 10) / 10,
        };
    }

    async exportAttendanceCsv(startDate?: string, endDate?: string, employeeId?: string) {
        const logs = await this.listAttendance(employeeId, 200, startDate, endDate);
        const headers = [
            'employeeCode',
            'fullName',
            'clockInAt',
            'clockOutAt',
            'status',
            'lateMinutes',
            'workedMinutes',
            'source',
            'notes',
        ];
        const rows = logs.map((l) => [
            l.employee?.employeeCode ?? '',
            l.employee?.fullName ?? '',
            l.clockInAt,
            l.clockOutAt ?? '',
            l.status,
            l.lateMinutes,
            l.workedMinutes ?? '',
            l.source,
            l.notes ?? '',
        ]);
        return {
            filename: 'attendance-export.csv',
            contentType: 'text/csv',
            total: logs.length,
            csv: buildCsv(headers, rows),
        };
    }

    async getTeamRoster(startDate: string, endDate: string, departmentCode?: string) {
        if (startDate > endDate) {
            throw new BadRequestException('startDate cannot be after endDate');
        }
        const startMs = new Date(`${startDate}T00:00:00Z`).getTime();
        const endMs = new Date(`${endDate}T00:00:00Z`).getTime();
        const totalDays = Math.floor((endMs - startMs) / 86_400_000) + 1;
        if (totalDays > 35) {
            throw new BadRequestException('Roster date range cannot exceed 35 days');
        }

        const dates: string[] = [];
        for (let i = 0; i < totalDays; i++) {
            dates.push(new Date(startMs + i * 86_400_000).toISOString().slice(0, 10));
        }

        const { data: allEmployees } = await this.employees.findAll({
            departmentCode,
            page: 1,
            limit: 200,
        });
        const activeEmployees = allEmployees.filter((e) => e.employmentStatus !== 'TERMINATED');
        const empIds = activeEmployees.map((e) => e.id);

        if (empIds.length === 0) {
            return { startDate, endDate, dates, employees: [] };
        }

        const schedules = await this.repo
            .createQueryBuilder('s')
            .where('s.employeeId IN (:...ids)', { ids: empIds })
            .andWhere('s.isActive = true')
            .orderBy('s.startTime', 'ASC')
            .getMany();

        const overrides = this.overrideRepo
            ? await this.overrideRepo
                  .createQueryBuilder('o')
                  .where('o.employeeId IN (:...ids)', { ids: empIds })
                  .andWhere('o.date >= :startDate AND o.date <= :endDate', { startDate, endDate })
                  .getMany()
            : [];

        const leaves = this.leaveRepo
            ? await this.leaveRepo
                  .createQueryBuilder('l')
                  .where('l.employeeId IN (:...ids)', { ids: empIds })
                  .andWhere(`l.status = 'APPROVED'`)
                  .andWhere('l.startDate <= :endDate AND l.endDate >= :startDate', {
                      startDate,
                      endDate,
                  })
                  .getMany()
            : [];

        const logs = this.attendanceRepo
            ? await this.attendanceRepo
                  .createQueryBuilder('a')
                  .where('a.employeeId IN (:...ids)', { ids: empIds })
                  .andWhere('a.clockInAt >= :fromTs AND a.clockInAt <= :toTs', {
                      fromTs: new Date(`${startDate}T00:00:00Z`),
                      toTs: new Date(`${endDate}T23:59:59.999Z`),
                  })
                  .getMany()
            : [];

        const employees = activeEmployees.map((emp) => {
            const empScheds = schedules.filter((s) => s.employeeId === emp.id);
            const empOvs = overrides.filter((o) => o.employeeId === emp.id);
            const empLeaves = leaves.filter((l) => l.employeeId === emp.id);
            const empLogs = logs.filter((a) => a.employeeId === emp.id);
            const primaryPos = emp.positions?.find((p) => p.isPrimary) ?? emp.positions?.[0];

            const days = dates.map((date) => {
                const dayOfWeek = new Date(`${date}T00:00:00Z`).getUTCDay();
                const dayLogs = empLogs
                    .filter((a) => new Date(a.clockInAt).toISOString().slice(0, 10) === date)
                    .map((a) => ({
                        id: a.id,
                        clockInAt: a.clockInAt,
                        clockOutAt: a.clockOutAt,
                    }));

                const ov = empOvs.find((o) => o.date === date);
                if (ov) {
                    return {
                        date,
                        status: ov.isAvailable ? ('OVERRIDE_SHIFT' as const) : ('OVERRIDE_OFF' as const),
                        shifts:
                            ov.isAvailable && ov.startTime && ov.endTime
                                ? [{ startTime: ov.startTime.slice(0, 5), endTime: ov.endTime.slice(0, 5) }]
                                : [],
                        note: ov.reason ?? undefined,
                        attendance: dayLogs,
                    };
                }

                const lv = empLeaves.find((l) => l.startDate <= date && l.endDate >= date);
                if (lv) {
                    return {
                        date,
                        status: 'ON_LEAVE' as const,
                        shifts: [],
                        leaveType: lv.leaveType,
                        note: lv.reason ?? undefined,
                        attendance: dayLogs,
                    };
                }

                const dayShifts = empScheds
                    .filter((s) => s.dayOfWeek === dayOfWeek)
                    .map((s) => ({
                        startTime: s.startTime.slice(0, 5),
                        endTime: s.endTime.slice(0, 5),
                    }));

                return {
                    date,
                    status: dayShifts.length > 0 ? ('SHIFT' as const) : ('OFF' as const),
                    shifts: dayShifts,
                    attendance: dayLogs,
                };
            });

            return {
                id: emp.id,
                employeeCode: emp.employeeCode,
                fullName: emp.fullName,
                departmentName: primaryPos?.department?.name ?? null,
                jobTitleName: primaryPos?.jobTitle?.name ?? null,
                days,
            };
        });

        return { startDate, endDate, dates, employees };
    }

    // ─── Dynamic Attendance Policies ───────────────────────────────────────────

    async listAttendancePolicies(): Promise<AttendancePolicy[]> {
        if (!this.policyRepo) {
            return [];
        }
        return this.policyRepo.find({
            order: { isDefault: 'DESC', createdAt: 'ASC' },
        });
    }

    async createAttendancePolicy(
        dto: CreateAttendancePolicyDto,
        actorId?: string,
    ): Promise<AttendancePolicy> {
        if (!this.policyRepo) {
            throw new BadRequestException('Attendance policy repository is not configured');
        }
        const sessions = this.validateAndSortSessions(dto.sessions);
        const requireGeofence = dto.requireGeofence ?? false;
        const officeLatitude = dto.officeLatitude ?? null;
        const officeLongitude = dto.officeLongitude ?? null;
        if (requireGeofence && (officeLatitude === null || officeLongitude === null)) {
            throw new BadRequestException(
                'officeLatitude and officeLongitude are required when requireGeofence is enabled',
            );
        }
        if (dto.isDefault && dto.isActive !== false) {
            await this.clearDefaultPolicies();
        }
        const saved = await this.policyRepo.save(
            this.policyRepo.create({
                name: dto.name.trim(),
                departmentId: dto.departmentId ?? null,
                isDefault: dto.isDefault ?? false,
                graceMinutes: dto.graceMinutes ?? 5,
                earlyLeaveGraceMinutes: dto.earlyLeaveGraceMinutes ?? 5,
                sessions,
                isActive: dto.isActive ?? true,
                allowSelfServiceWeb: dto.allowSelfServiceWeb ?? true,
                allowedIps: this.normalizeAllowedIps(dto.allowedIps),
                requireGeofence,
                officeLatitude,
                officeLongitude,
                geofenceRadiusMeters: dto.geofenceRadiusMeters ?? 100,
            }),
        );
        void this.audit.log({
            actorId: actorId ?? null,
            action: 'employee.attendance_policy.create',
            entity: 'attendance_policy',
            entityId: saved.id,
            newValue: { ...saved } as unknown as Record<string, unknown>,
        });
        return saved;
    }

    async updateAttendancePolicy(
        id: string,
        dto: UpdateAttendancePolicyDto,
        actorId?: string,
    ): Promise<AttendancePolicy> {
        if (!this.policyRepo) {
            throw new BadRequestException('Attendance policy repository is not configured');
        }
        const existing = await this.policyRepo.findOne({ where: { id } });
        if (!existing) {
            throw new NotFoundException(`Attendance policy "${id}" not found`);
        }

        const nextSessions = dto.sessions
            ? this.validateAndSortSessions(dto.sessions)
            : existing.sessions;
        const nextActive = dto.isActive ?? existing.isActive;
        const nextDefault = dto.isDefault ?? existing.isDefault;
        const nextRequireGeofence = dto.requireGeofence ?? existing.requireGeofence ?? false;
        const nextLat =
            dto.officeLatitude !== undefined ? dto.officeLatitude : existing.officeLatitude ?? null;
        const nextLng =
            dto.officeLongitude !== undefined ? dto.officeLongitude : existing.officeLongitude ?? null;
        if (nextRequireGeofence && (nextLat === null || nextLng === null)) {
            throw new BadRequestException(
                'officeLatitude and officeLongitude are required when requireGeofence is enabled',
            );
        }

        if (nextDefault && nextActive) {
            await this.clearDefaultPolicies(id);
        }

        const saved = await this.policyRepo.save({
            ...existing,
            name: dto.name !== undefined ? dto.name.trim() : existing.name,
            departmentId:
                dto.departmentId !== undefined ? dto.departmentId : existing.departmentId,
            isDefault: nextDefault,
            graceMinutes: dto.graceMinutes ?? existing.graceMinutes,
            earlyLeaveGraceMinutes:
                dto.earlyLeaveGraceMinutes ?? existing.earlyLeaveGraceMinutes,
            sessions: nextSessions,
            isActive: nextActive,
            allowSelfServiceWeb:
                dto.allowSelfServiceWeb ?? existing.allowSelfServiceWeb ?? true,
            allowedIps:
                dto.allowedIps !== undefined
                    ? this.normalizeAllowedIps(dto.allowedIps)
                    : existing.allowedIps ?? null,
            requireGeofence: nextRequireGeofence,
            officeLatitude: nextLat,
            officeLongitude: nextLng,
            geofenceRadiusMeters:
                dto.geofenceRadiusMeters ?? existing.geofenceRadiusMeters ?? 100,
        });

        void this.audit.log({
            actorId: actorId ?? null,
            action: 'employee.attendance_policy.update',
            entity: 'attendance_policy',
            entityId: saved.id,
            oldValue: { ...existing } as unknown as Record<string, unknown>,
            newValue: { ...saved } as unknown as Record<string, unknown>,
        });
        return saved;
    }

    async deleteAttendancePolicy(id: string, actorId?: string): Promise<{ deleted: true }> {
        if (!this.policyRepo) {
            throw new BadRequestException('Attendance policy repository is not configured');
        }
        const existing = await this.policyRepo.findOne({ where: { id } });
        if (!existing) {
            throw new NotFoundException(`Attendance policy "${id}" not found`);
        }
        await this.policyRepo.delete(id);
        void this.audit.log({
            actorId: actorId ?? null,
            action: 'employee.attendance_policy.delete',
            entity: 'attendance_policy',
            entityId: id,
            oldValue: { ...existing } as unknown as Record<string, unknown>,
        });
        return { deleted: true };
    }

    async resolveAttendancePolicyForEmployee(employee: {
        primaryDepartmentId?: string | null;
        positions?: Array<{ isPrimary?: boolean; departmentId?: string | null }>;
    }): Promise<AttendancePolicy | null> {
        if (!this.policyRepo) {
            return null;
        }
        const deptId =
            employee.primaryDepartmentId ??
            employee.positions?.find((p) => p.isPrimary)?.departmentId ??
            null;

        if (deptId) {
            const deptPolicy = await this.policyRepo.findOne({
                where: { departmentId: deptId, isActive: true },
                order: { updatedAt: 'DESC' },
            });
            if (deptPolicy) {
                return deptPolicy;
            }
        }

        const defaultPolicy = await this.policyRepo.findOne({
            where: { isDefault: true, isActive: true },
            order: { updatedAt: 'DESC' },
        });
        return defaultPolicy ?? null;
    }

    private validateAndSortSessions(
        sessions: AttendanceSessionRule[],
    ): AttendanceSessionRule[] {
        if (!Array.isArray(sessions) || sessions.length === 0) {
            throw new BadRequestException('At least one check-in/check-out session is required');
        }
        const sorted = [...sessions]
            .map((s, idx) => ({
                label: (s.label || `Session ${idx + 1}`).trim(),
                checkInTime: s.checkInTime,
                checkOutTime: s.checkOutTime,
            }))
            .sort((a, b) => a.checkInTime.localeCompare(b.checkInTime));

        for (let i = 0; i < sorted.length; i++) {
            const cur = sorted[i];
            if (cur.checkInTime >= cur.checkOutTime) {
                throw new BadRequestException(
                    `Session "${cur.label}": checkInTime (${cur.checkInTime}) must be earlier than checkOutTime (${cur.checkOutTime})`,
                );
            }
            if (i > 0 && cur.checkInTime < sorted[i - 1].checkOutTime) {
                throw new BadRequestException(
                    `Session "${cur.label}" (${cur.checkInTime}-${cur.checkOutTime}) overlaps with "${sorted[i - 1].label}" (${sorted[i - 1].checkInTime}-${sorted[i - 1].checkOutTime})`,
                );
            }
        }
        return sorted;
    }

    private async clearDefaultPolicies(exceptId?: string): Promise<void> {
        if (!this.policyRepo) return;
        const defaults = await this.policyRepo.find({ where: { isDefault: true } });
        for (const p of defaults) {
            if (p.id !== exceptId) {
                await this.policyRepo.update(p.id, { isDefault: false });
            }
        }
    }

    private normalizeAllowedIps(ips?: string[] | null): string[] | null {
        if (!ips || !Array.isArray(ips)) return null;
        const cleaned = ips.map((ip) => ip.trim()).filter(Boolean);
        return cleaned.length > 0 ? cleaned : null;
    }

    private normalizeIp(ip?: string | null): string | null {
        if (!ip) return null;
        const trimmed = ip.trim();
        if (!trimmed) return null;
        if (trimmed === '::1') return '127.0.0.1';
        if (trimmed.startsWith('::ffff:')) return trimmed.slice(7);
        return trimmed;
    }

    private isIpAllowed(clientIp: string | null, allowlist: string[]): boolean {
        if (!clientIp) return false;
        const normalized = this.normalizeIp(clientIp);
        if (!normalized) return false;

        for (const rawEntry of allowlist) {
            const entry = this.normalizeIp(rawEntry);
            if (!entry) continue;
            if (entry === normalized) return true;
            if (entry.includes('/')) {
                if (this.matchesIpv4Cidr(normalized, entry)) return true;
            }
        }
        return false;
    }

    private matchesIpv4Cidr(ip: string, cidr: string): boolean {
        const [range, bitsStr] = cidr.split('/');
        const bits = Number(bitsStr);
        if (!Number.isInteger(bits) || bits < 0 || bits > 32) return false;
        const ipInt = this.ipv4ToInt(ip);
        const rangeInt = this.ipv4ToInt(range);
        if (ipInt === null || rangeInt === null) return false;
        const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
        return (ipInt & mask) === (rangeInt & mask);
    }

    private ipv4ToInt(ip: string): number | null {
        const parts = ip.split('.');
        if (parts.length !== 4) return null;
        let num = 0;
        for (const part of parts) {
            const octet = Number(part);
            if (!Number.isInteger(octet) || octet < 0 || octet > 255) return null;
            num = ((num << 8) | octet) >>> 0;
        }
        return num;
    }

    private haversineMeters(
        lat1: number,
        lon1: number,
        lat2: number,
        lon2: number,
    ): number {
        const R = 6_371_000;
        const toRad = (deg: number) => (deg * Math.PI) / 180;
        const dLat = toRad(lat2 - lat1);
        const dLon = toRad(lon2 - lon1);
        const a =
            Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
        return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }
}
