import {
    IsDateString,
    IsEmail,
    IsIn,
    IsOptional,
    IsString,
    IsUUID,
    MaxLength,
    Matches,
} from 'class-validator';

export class CreateCustomerDto {
    /** If omitted, defaults to 'CUSTOMER'. Clinic sends 'PATIENT', hotel sends 'GUEST'. */
    @IsOptional()
    @IsIn(['PATIENT', 'GUEST', 'CUSTOMER'])
    type?: 'PATIENT' | 'GUEST' | 'CUSTOMER';

    /** Optional link to a login account (patient portal, guest loyalty program) */
    @IsOptional()
    @IsUUID()
    userId?: string;

    @IsString()
    @MaxLength(150)
    fullName: string;

    @IsOptional()
    @IsIn(['MALE', 'FEMALE', 'OTHER'])
    gender?: 'MALE' | 'FEMALE' | 'OTHER';

    @IsDateString()
    dateOfBirth: string;

    @IsOptional()
    @IsString()
    @Matches(/^\+?[0-9]{8,20}$/)
    phone?: string;

    @IsOptional()
    @IsEmail()
    email?: string;

    @IsOptional()
    @IsString()
    address?: string;

    @IsOptional()
    @IsString()
    @MaxLength(50)
    nationalId?: string;

    @IsOptional()
    @IsString()
    avatarUrl?: string;
}