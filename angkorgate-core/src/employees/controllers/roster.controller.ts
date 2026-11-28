import {
    Body,
    Controller,
    Get,
    Param,
    ParseUUIDPipe,
    Post,
    Query,
    UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { UnifiedAuthGuard } from '../../auth/guards/unified-auth.guard';
import { Permissions } from '../../rbac/decorators/permissions.decorator';
import { PermissionsGuard } from '../../rbac/guards/permissions.guard';
import type { AttendanceSource } from '../entities/attendance-log.entity';
import { SchedulesService } from '../services/schedules.service';

export class AttendanceClockDto {
    @IsOptional()
    @IsString()
    @MaxLength(300)
    notes?: string;

    @IsOptional()
    @IsIn(['WEB', 'KIOSK', 'API'])
    source?: AttendanceSource;
}

@ApiTags('Employees')
@ApiBearerAuth('bearerAuth')
@UseGuards(UnifiedAuthGuard, PermissionsGuard)
@Controller('employees')
export class RosterController {
    constructor(private readonly schedules: SchedulesService) {}

    @Get('roster')
    @Permissions('employee:read')
    @ApiOperation({ summary: 'Get weekly/monthly team shift roster calendar' })
    @ApiQuery({ name: 'startDate', required: false, example: '2026-12-01' })
    @ApiQuery({ name: 'endDate', required: false, example: '2026-12-07' })
    @ApiQuery({ name: 'departmentCode', required: false })
    getRoster(
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
        @Query('departmentCode') departmentCode?: string,
    ) {
        const today = new Date();
        const start = startDate || today.toISOString().slice(0, 10);
        const defaultEnd = new Date(today.getTime() + 6 * 86_400_000).toISOString().slice(0, 10);
        return this.schedules.getTeamRoster(start, endDate || defaultEnd, departmentCode);
    }

    @Get('attendance')
    @Permissions('employee:read')
    @ApiOperation({ summary: 'List recent attendance clock-in/out logs' })
    @ApiQuery({ name: 'employeeId', required: false })
    @ApiQuery({ name: 'limit', required: false })
    @ApiQuery({ name: 'startDate', required: false })
    @ApiQuery({ name: 'endDate', required: false })
    listAttendance(
        @Query('employeeId') employeeId?: string,
        @Query('limit') limit?: string,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
    ) {
        return this.schedules.listAttendance(
            employeeId,
            limit ? parseInt(limit, 10) : 50,
            startDate,
            endDate,
        );
    }

    @Get('attendance/summary')
    @Permissions('employee:read')
    @ApiOperation({ summary: 'Get attendance summary (on-time, late, worked hours) for date range' })
    getAttendanceSummary(
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
        @Query('employeeId') employeeId?: string,
    ) {
        const today = new Date();
        const start = startDate || new Date(today.getTime() - 29 * 86_400_000).toISOString().slice(0, 10);
        const end = endDate || today.toISOString().slice(0, 10);
        return this.schedules.getAttendanceSummary(start, end, employeeId);
    }

    @Get('attendance/export')
    @Permissions('employee:read')
    @ApiOperation({ summary: 'Export attendance logs as CSV payload' })
    exportAttendanceCsv(
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
        @Query('employeeId') employeeId?: string,
    ) {
        return this.schedules.exportAttendanceCsv(startDate, endDate, employeeId);
    }

    @Post(':employeeId/attendance/clock-in')
    @Permissions('employee:write')
    @ApiOperation({ summary: 'Clock in an employee shift' })
    clockIn(
        @Param('employeeId', ParseUUIDPipe) employeeId: string,
        @Body() dto: AttendanceClockDto,
        @CurrentUser('id') actorId: string,
    ) {
        return this.schedules.clockIn(employeeId, dto.notes, dto.source ?? 'WEB', actorId);
    }

    @Post(':employeeId/attendance/clock-out')
    @Permissions('employee:write')
    @ApiOperation({ summary: 'Clock out an employee shift' })
    clockOut(
        @Param('employeeId', ParseUUIDPipe) employeeId: string,
        @Body() dto: AttendanceClockDto,
        @CurrentUser('id') actorId: string,
    ) {
        return this.schedules.clockOut(employeeId, dto.notes, actorId);
    }
}
