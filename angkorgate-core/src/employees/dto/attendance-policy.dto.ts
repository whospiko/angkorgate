import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

const HH_MM_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

export class AttendanceSessionRuleDto {
  @IsString()
  @MaxLength(60)
  label: string;

  @IsString()
  @Matches(HH_MM_REGEX, { message: 'checkInTime must be in HH:mm format' })
  checkInTime: string;

  @IsString()
  @Matches(HH_MM_REGEX, { message: 'checkOutTime must be in HH:mm format' })
  checkOutTime: string;
}

export class CreateAttendancePolicyDto {
  @IsString()
  @MaxLength(120)
  name: string;

  @IsOptional()
  @IsUUID()
  departmentId?: string | null;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(120)
  graceMinutes?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(120)
  earlyLeaveGraceMinutes?: number;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => AttendanceSessionRuleDto)
  sessions: AttendanceSessionRuleDto[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  allowSelfServiceWeb?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedIps?: string[] | null;

  @IsOptional()
  @IsBoolean()
  requireGeofence?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  officeLatitude?: number | null;

  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  officeLongitude?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10000)
  geofenceRadiusMeters?: number;
}

export class UpdateAttendancePolicyDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsUUID()
  departmentId?: string | null;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(120)
  graceMinutes?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(120)
  earlyLeaveGraceMinutes?: number;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => AttendanceSessionRuleDto)
  sessions?: AttendanceSessionRuleDto[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  allowSelfServiceWeb?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedIps?: string[] | null;

  @IsOptional()
  @IsBoolean()
  requireGeofence?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  officeLatitude?: number | null;

  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  officeLongitude?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10000)
  geofenceRadiusMeters?: number;
}
