import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkSchedule } from '../entities/work-schedule.entity';
import { CreateScheduleDto } from '../dto/create-schedule.dto';
import { EmployeesService } from './employees.service';

@Injectable()
export class SchedulesService {
    constructor(
        @InjectRepository(WorkSchedule)
        private readonly repo: Repository<WorkSchedule>,
        private readonly employees: EmployeesService,
    ) { }

    async create(dto: CreateScheduleDto): Promise<WorkSchedule> {
        await this.employees.findByIdOrFail(dto.employeeId);

        const overlap = await this.repo
            .createQueryBuilder('s')
            .where('s.employeeId = :eid', { eid: dto.employeeId })
            .andWhere('s.dayOfWeek = :day', { day: dto.dayOfWeek })
            .andWhere('s.isActive = true')
            .andWhere('(s.startTime < :end AND s.endTime > :start)', {
                start: dto.startTime,
                end: dto.endTime,
            })
            .getExists();
        if (overlap) {
            throw new BadRequestException('Overlapping schedule exists for this day');
        }

        return this.repo.save(this.repo.create(dto));
    }

    findByEmployee(employeeId: string): Promise<WorkSchedule[]> {
        return this.repo.find({
            where: { employeeId },
            order: { dayOfWeek: 'ASC', startTime: 'ASC' },
        });
    }

    async remove(id: string): Promise<void> {
        const r = await this.repo.delete(id);
        if (r.affected === 0) throw new NotFoundException(`Schedule ${id} not found`);
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
}