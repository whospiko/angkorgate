import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Employee } from '../entities/employee.entity';

export class EmployeeResponseDto {
    @ApiProperty({ description: 'Employee UUID', example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' })
    id: string;

    @ApiPropertyOptional({ description: 'Associated user account UUID', example: '123e4567-e89b-12d3-a456-426614174000', nullable: true })
    userId: string | null;

    @ApiProperty({ description: 'Unique employee ID code', example: 'EMP-001' })
    employeeCode: string;

    @ApiProperty({ description: 'Full name', example: 'Jane Smith' })
    fullName: string;

    @ApiPropertyOptional({ description: 'Gender', example: 'FEMALE', nullable: true })
    gender: string | null;

    @ApiPropertyOptional({ description: 'Date of birth', example: '1992-05-20', nullable: true })
    dateOfBirth: string | null;

    @ApiPropertyOptional({ description: 'National ID or Passport number', example: 'NID987654321', nullable: true })
    nationalId: string | null;

    @ApiPropertyOptional({ description: 'Contact phone number', example: '+85512345678', nullable: true })
    phone: string | null;

    @ApiPropertyOptional({ description: 'Residential address', example: 'Phnom Penh, Cambodia', nullable: true })
    address: string | null;

    @ApiPropertyOptional({ description: 'Avatar image URL', example: 'https://cdn.example.com/avatar.jpg', nullable: true })
    avatarUrl: string | null;

    @ApiPropertyOptional({ description: 'Employment start / hire date', example: '2024-01-01', nullable: true })
    hireDate: string | null;

    @ApiProperty({ description: 'Current employment status', example: 'ACTIVE' })
    employmentStatus: string;

    @ApiProperty({ description: 'Record creation timestamp', example: '2026-11-21T10:00:00.000Z' })
    createdAt: Date;

    @ApiProperty({ description: 'Record last update timestamp', example: '2026-11-21T11:00:00.000Z' })
    updatedAt: Date;

    static fromEntity(e: Employee): EmployeeResponseDto {
        const dto = new EmployeeResponseDto();
        dto.id = e.id;
        dto.userId = e.userId;
        dto.employeeCode = e.employeeCode;
        dto.fullName = e.fullName;
        dto.gender = e.gender;
        dto.dateOfBirth = e.dateOfBirth;
        dto.nationalId = e.nationalId;
        dto.phone = e.phone;
        dto.address = e.address;
        dto.avatarUrl = e.avatarUrl;
        dto.hireDate = e.hireDate;
        dto.employmentStatus = e.employmentStatus;
        dto.createdAt = e.createdAt;
        dto.updatedAt = e.updatedAt;
        return dto;
    }
}
