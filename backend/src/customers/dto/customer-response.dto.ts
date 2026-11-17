import { Customer } from '../entities/customer.entity';

export class CustomerResponseDto {
    id: string;
    customerCode: string;
    userId: string | null;
    type: string;
    fullName: string;
    gender: string | null;
    dateOfBirth: string;
    phone: string | null;
    email: string | null;
    address: string | null;
    nationalId: string | null;
    avatarUrl: string | null;
    status: string;
    isMinor: boolean;
    createdAt: Date;
    updatedAt: Date;

    static fromEntity(c: Customer): CustomerResponseDto {
        const dto = new CustomerResponseDto();
        dto.id = c.id;
        dto.customerCode = c.customerCode;
        dto.userId = c.userId;
        dto.type = c.type;
        dto.fullName = c.fullName;
        dto.gender = c.gender;
        dto.dateOfBirth = c.dateOfBirth;
        dto.phone = c.phone;
        dto.email = c.email;
        dto.address = c.address;
        dto.nationalId = c.nationalId;
        dto.avatarUrl = c.avatarUrl;
        dto.status = c.status;
        dto.isMinor = c.isMinor;
        dto.createdAt = c.createdAt;
        dto.updatedAt = c.updatedAt;
        return dto;
    }
}