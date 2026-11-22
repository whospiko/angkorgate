import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Customer } from '../entities/customer.entity';

export class CustomerResponseDto {
    @ApiProperty({ description: 'Customer UUID', example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' })
    id: string;

    @ApiProperty({ description: 'Unique customer code identifier', example: 'CUST-0001' })
    customerCode: string;

    @ApiPropertyOptional({ description: 'Associated system user account UUID', example: '123e4567-e89b-12d3-a456-426614174000', nullable: true })
    userId: string | null;

    @ApiProperty({ description: 'Customer classification type', example: 'CUSTOMER' })
    type: string;

    @ApiProperty({ description: 'Customer full name', example: 'John Doe' })
    fullName: string;

    @ApiPropertyOptional({ description: 'Gender identity', example: 'MALE', nullable: true })
    gender: string | null;

    @ApiProperty({ description: 'Date of birth', example: '1990-01-15' })
    dateOfBirth: string;

    @ApiPropertyOptional({ description: 'Contact phone number', example: '+85512345678', nullable: true })
    phone: string | null;

    @ApiPropertyOptional({ description: 'Contact email address', example: 'john@example.com', nullable: true })
    email: string | null;

    @ApiPropertyOptional({ description: 'Physical address', example: 'Phnom Penh, Cambodia', nullable: true })
    address: string | null;

    @ApiPropertyOptional({ description: 'National identification number', example: 'ID123456789', nullable: true })
    nationalId: string | null;

    @ApiPropertyOptional({ description: 'Avatar image URL', example: 'https://cdn.example.com/avatar.jpg', nullable: true })
    avatarUrl: string | null;

    @ApiProperty({ description: 'Customer record status', example: 'ACTIVE' })
    status: string;

    @ApiProperty({ description: 'Indicates whether the customer is legally a minor (<18)', example: false })
    isMinor: boolean;

    @ApiProperty({ description: 'Creation timestamp', example: '2026-11-21T10:00:00.000Z' })
    createdAt: Date;

    @ApiProperty({ description: 'Last update timestamp', example: '2026-11-21T11:00:00.000Z' })
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
