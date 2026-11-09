import {
    IsDateString,
    IsIn,
    IsOptional,
    IsString,
    IsUUID,
    MaxLength,
} from 'class-validator';

export class CreateEmployeeDto {
    @IsUUID()
    userId: string;

    @IsString()
    @MaxLength(30)
    employeeCode: string;

    @IsString()
    @MaxLength(150)
    fullName: string;

    @IsOptional()
    @IsIn(['MALE', 'FEMALE', 'OTHER'])
    gender?: 'MALE' | 'FEMALE' | 'OTHER';

    @IsOptional()
    @IsDateString()
    dateOfBirth?: string;

    @IsOptional()
    @IsString()
    @MaxLength(50)
    nationalId?: string;

    @IsOptional()
    @IsString()
    @MaxLength(20)
    phone?: string;

    @IsOptional()
    @IsString()
    address?: string;

    @IsOptional()
    @IsString()
    avatarUrl?: string;

    @IsOptional()
    @IsDateString()
    hireDate?: string;
}