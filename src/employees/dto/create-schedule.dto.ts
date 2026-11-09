import {
    IsBoolean,
    IsInt,
    IsOptional,
    IsUUID,
    Matches,
    Max,
    Min,
} from 'class-validator';

export class CreateScheduleDto {
    @IsUUID()
    employeeId: string;

    @IsOptional()
    @IsUUID()
    departmentId?: string;

    @IsInt()
    @Min(0)
    @Max(6)
    dayOfWeek: number;

    @Matches(/^\d{2}:\d{2}(:\d{2})?$/)
    startTime: string;

    @Matches(/^\d{2}:\d{2}(:\d{2})?$/)
    endTime: string;

    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}