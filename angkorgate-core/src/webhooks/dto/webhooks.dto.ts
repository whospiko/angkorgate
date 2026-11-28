import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    ArrayNotEmpty,
    IsArray,
    IsBoolean,
    IsIn,
    IsOptional,
    IsString,
    IsUrl,
    MaxLength,
} from 'class-validator';

export const SUPPORTED_WEBHOOK_EVENTS = [
    'customer.created',
    'employee.onboarded',
    'leave.approved',
] as const;

export class CreateWebhookEndpointDto {
    @ApiProperty({ example: 'Clinic HIS Sync' })
    @IsString()
    @MaxLength(100)
    name: string;

    @ApiProperty({ example: 'https://his.example.com/webhooks/angkorgate' })
    @IsUrl({ require_tld: false, require_protocol: true })
    url: string;

    @ApiProperty({
        enum: SUPPORTED_WEBHOOK_EVENTS,
        isArray: true,
        example: ['customer.created', 'leave.approved'],
    })
    @IsArray()
    @ArrayNotEmpty()
    @IsIn(SUPPORTED_WEBHOOK_EVENTS, { each: true })
    events: string[];

    @ApiPropertyOptional({ description: 'Optional HMAC signing secret (auto-generated if omitted)' })
    @IsOptional()
    @IsString()
    @MaxLength(128)
    secret?: string;

    @ApiPropertyOptional({ default: true })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}

export class UpdateWebhookEndpointDto {
    @IsOptional()
    @IsString()
    @MaxLength(100)
    name?: string;

    @IsOptional()
    @IsUrl({ require_tld: false, require_protocol: true })
    url?: string;

    @IsOptional()
    @IsArray()
    @ArrayNotEmpty()
    @IsIn(SUPPORTED_WEBHOOK_EVENTS, { each: true })
    events?: string[];

    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}
