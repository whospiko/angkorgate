import { IsBoolean, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class CreateDepartmentDto {
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
    @IsBoolean()
    isActive?: boolean;
}