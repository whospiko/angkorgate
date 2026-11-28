import { BadRequestException, ConflictException, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { WorkSchedule } from '../entities/work-schedule.entity';
import { ScheduleOverride } from '../entities/schedule-override.entity';
import { LeaveRequest } from '../entities/leave-request.entity';
import { AttendanceLog, type AttendanceSource } from '../entities/attendance-log.entity';
import { CreateScheduleDto } from '../dto/create-schedule.dto';
import { UpdateScheduleDto } from '../dto/update-schedule.dto';
import { CreateScheduleOverrideDto } from '../dto/create-schedule-override.dto';
import { EmployeesService } from './employees.service';
import { AuditService } from '../../audit/services/audit.service';

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
    ): Promise<AttendanceLog> {
        if (!this.attendanceRepo) {
            throw new BadRequestException('Attendance repository is not configured');
        }
        await this.employees.findByIdOrFail(employeeId);

        const open = await this.attendanceRepo.findOne({
            where: { employeeId, clockOutAt: IsNull() },
        });
        if (open) {
            throw new ConflictException('Employee is already clocked in');
        }

        const saved = await this.attendanceRepo.save(
            this.attendanceRepo.create({
                employeeId,
                clockInAt: new Date(),
                clockOutAt: null,
                source,
                notes: notes ?? null,
            }),
        );

        void this.audit.log({
            actorId: actorId ?? null,
            action: 'employee.attendance.clock_in',
            entity: 'attendance_log',
            entityId: saved.id,
            newValue: { employeeId, source, clockInAt: saved.clockInAt },
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

        open.clockOutAt = new Date();
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

    async listAttendance(employeeId?: string, limit = 50): Promise<AttendanceLog[]> {
        if (!this.attendanceRepo) return [];
        const qb = this.attendanceRepo
            .createQueryBuilder('a')
            .leftJoin('a.employee', 'emp')
            .addSelect(['emp.id', 'emp.employeeCode', 'emp.fullName'])
            .orderBy('a.clockInAt', 'DESC')
            .take(Math.min(Math.max(limit, 1), 200));

        if (employeeId) {
            qb.where('a.employeeId = :eid', { eid: employeeId });
        }
        return qb.getMany();
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
}
