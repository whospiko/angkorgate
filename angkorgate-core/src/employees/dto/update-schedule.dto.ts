import { PartialType } from '@nestjs/swagger';
import { CreateEmployeeScheduleDto } from './create-schedule.dto';

export class UpdateScheduleDto extends PartialType(CreateEmployeeScheduleDto) { }
