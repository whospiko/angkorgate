import { IsBoolean, IsDateString, IsOptional, IsString, IsUUID } from 'class-validator';

export class AssignPositionDto {
    @IsUUID()
    employeeId: string;

    @IsString()
    jobTitleCode: string;

    @IsOptional()
    @IsString()
    departmentCode?: string; // optional — position might not be department-bound

    @IsOptional()
    @IsBoolean()
    isPrimary?: boolean;

    @IsOptional()
    @IsDateString()
    startDate?: string;

    @IsOptional()
    @IsDateString()
    endDate?: string;
}