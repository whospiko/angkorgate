import { Employee } from '../entities/employee.entity';

export class EmployeeResponseDto {
    id: string;
    userId: string;
    employeeCode: string;
    fullName: string;
    gender: string | null;
    dateOfBirth: string | null;
    nationalId: string | null;
    phone: string | null;
    address: string | null;
    avatarUrl: string | null;
    hireDate: string | null;
    employmentStatus: string;
    createdAt: Date;
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