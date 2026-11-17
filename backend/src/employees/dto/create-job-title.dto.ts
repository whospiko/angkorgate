import { IsBoolean, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class CreateJobTitleDto {
    @IsString()
    @Matches(/^[A-Z][A-Z0-9_]{1,49}$/)
    code: string;

    @IsString()
    @MaxLength(100)
    name: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsString()
    @MaxLength(50)
    category?: string; // 'CLINIC' | 'HOTEL' | 'POS' | 'GENERAL'

    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}