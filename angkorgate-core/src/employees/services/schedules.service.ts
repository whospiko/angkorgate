import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkSchedule } from '../entities/work-schedule.entity';
import { CreateScheduleDto } from '../dto/create-schedule.dto';
import { UpdateScheduleDto } from '../dto/update-schedule.dto';
import { EmployeesService } from './employees.service';
import { AuditService } from '../../audit/services/audit.service';

@Injectable()
export class SchedulesService {
    constructor(
        @InjectRepository(WorkSchedule)
        private readonly repo: Repository<WorkSchedule>,
        private readonly employees: EmployeesService,
        private readonly audit: AuditService,
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

    /** Narrow API — used later by Appointments module. */
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
}
