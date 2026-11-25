import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LinkedCustomerSummaryDto {
    @ApiProperty({ description: 'Customer ID' })
    id: string;

    @ApiProperty({ description: 'Customer formatted code' })
    customerCode: string;

    @ApiProperty({ description: 'Customer classification type' })
    type: string;

    @ApiPropertyOptional({ description: 'Account status' })
    status?: string;
}

export class LinkedEmployeeSummaryDto {
    @ApiProperty({ description: 'Employee ID' })
    id: string;

    @ApiProperty({ description: 'Employee formatted code' })
    employeeCode: string;

    @ApiPropertyOptional({ description: 'Employment status' })
    employmentStatus?: string;
}

export class UserProfileDto {
    @ApiProperty({ description: 'User account UUID' })
    id: string;

    @ApiPropertyOptional({ description: 'User email address', nullable: true })
    email: string | null;

    @ApiPropertyOptional({ description: 'User phone number', nullable: true })
    phone: string | null;

    @ApiPropertyOptional({ description: 'Full display or legal name', nullable: true })
    fullName: string | null;

    @ApiProperty({ description: 'Assigned role codes', type: [String] })
    roles: string[];

    @ApiProperty({ description: 'Effective RBAC permission codes', type: [String] })
    permissions: string[];

    @ApiProperty({ description: 'Whether email is verified' })
    isEmailVerified: boolean;

    @ApiProperty({ description: 'Whether phone is verified' })
    isPhoneVerified: boolean;

    @ApiProperty({ description: 'Whether two-factor authentication (TOTP) is active' })
    mfaEnabled: boolean;

    @ApiProperty({ description: 'Count of registered WebAuthn / Passkey biometric credentials' })
    passkeysCount: number;

    @ApiProperty({ description: 'Account creation timestamp' })
    createdAt: Date;

    @ApiPropertyOptional({ description: 'Associated customer profile details if linked', type: LinkedCustomerSummaryDto, nullable: true })
    customer?: LinkedCustomerSummaryDto | null;

    @ApiPropertyOptional({ description: 'Associated employee profile details if linked', type: LinkedEmployeeSummaryDto, nullable: true })
    employee?: LinkedEmployeeSummaryDto | null;
}
