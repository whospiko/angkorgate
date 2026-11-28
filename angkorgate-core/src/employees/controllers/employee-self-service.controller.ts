import {
    Body,
    Controller,
    Get,
    NotFoundException,
    Param,
    ParseUUIDPipe,
    Patch,
    Post,
    UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { UnifiedAuthGuard } from '../../auth/guards/unified-auth.guard';
import { CreateLeaveRequestDto, ReviewLeaveRequestDto } from '../dto/leave-request.dto';
import { EmployeesService } from '../services/employees.service';
import { LeaveRequestsService } from '../services/leave-requests.service';
import { SchedulesService } from '../services/schedules.service';

@ApiTags('Employees - Self Service')
@ApiBearerAuth('bearerAuth')
@UseGuards(UnifiedAuthGuard)
@Controller('employees/me')
export class EmployeeSelfServiceController {
    constructor(
        private readonly employees: EmployeesService,
        private readonly schedules: SchedulesService,
        private readonly leaves: LeaveRequestsService,
    ) {}

    private async requireLinkedEmployee(userId: string) {
        const employee = await this.employees.findByUserId(userId);
        if (!employee) {
            throw new NotFoundException('No employee profile is linked to your account');
        }
        return employee;
    }

    @Get()
    @ApiOperation({ summary: 'Get the authenticated user linked employee profile (or null)' })
    @ApiResponse({ status: 200, description: 'Linked employee profile or null' })
    getMyEmployee(@CurrentUser('id') userId: string) {
        return this.employees.findByUserId(userId);
    }

    @Get('schedules')
    @ApiOperation({ summary: 'Get weekly shifts and date overrides for the linked employee' })
    async getMySchedules(@CurrentUser('id') userId: string) {
        const employee = await this.requireLinkedEmployee(userId);
        const [schedules, overrides] = await Promise.all([
            this.schedules.findByEmployee(employee.id),
            this.schedules.listOverrides(employee.id),
        ]);
        return { schedules, overrides };
    }

    @Get('leave-requests')
    @ApiOperation({ summary: 'Get leave requests and annual balance summary for the linked employee' })
    async getMyLeaves(@CurrentUser('id') userId: string) {
        const employee = await this.requireLinkedEmployee(userId);
        const [requests, balances] = await Promise.all([
            this.leaves.findByEmployee(employee.id),
            this.leaves.getBalanceSummary(employee.id),
        ]);
        return { requests, balances };
    }

    @Post('leave-requests')
    @ApiOperation({ summary: 'Submit a leave request as the linked employee' })
    async submitMyLeave(
        @CurrentUser('id') userId: string,
        @Body() dto: CreateLeaveRequestDto,
    ) {
        const employee = await this.requireLinkedEmployee(userId);
        return this.leaves.create(employee.id, dto, userId);
    }

    @Patch('leave-requests/:id/cancel')
    @ApiOperation({ summary: 'Cancel one of the linked employee own leave requests' })
    async cancelMyLeave(
        @CurrentUser('id') userId: string,
        @Param('id', ParseUUIDPipe) id: string,
    ) {
        const employee = await this.requireLinkedEmployee(userId);
        return this.leaves.cancelForEmployee(id, employee.id, userId);
    }

    @Get('approvals')
    @ApiOperation({ summary: 'List leave requests routed to the linked employee as manager' })
    async getMyAssignedApprovals(@CurrentUser('id') userId: string) {
        const employee = await this.requireLinkedEmployee(userId);
        return this.leaves.findAssignedApprovals(employee.id);
    }

    @Patch('approvals/:id/review')
    @ApiOperation({ summary: 'Approve or reject a direct-report leave request routed to you' })
    async reviewAssignedApproval(
        @CurrentUser('id') userId: string,
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: ReviewLeaveRequestDto,
    ) {
        const employee = await this.requireLinkedEmployee(userId);
        return this.leaves.reviewForManager(id, employee.id, dto, userId);
    }

    @Get('attendance')
    @ApiOperation({ summary: 'List own attendance clock-in/out logs' })
    async getMyAttendance(@CurrentUser('id') userId: string) {
        const employee = await this.requireLinkedEmployee(userId);
        return this.schedules.listAttendance(employee.id, 30);
    }

    @Post('attendance/clock-in')
    @ApiOperation({ summary: 'Clock in as the linked employee' })
    async clockInMe(
        @CurrentUser('id') userId: string,
        @Body() body: { notes?: string },
    ) {
        const employee = await this.requireLinkedEmployee(userId);
        return this.schedules.clockIn(employee.id, body?.notes, 'WEB', userId);
    }

    @Post('attendance/clock-out')
    @ApiOperation({ summary: 'Clock out as the linked employee' })
    async clockOutMe(
        @CurrentUser('id') userId: string,
        @Body() body: { notes?: string },
    ) {
        const employee = await this.requireLinkedEmployee(userId);
        return this.schedules.clockOut(employee.id, body?.notes, userId);
    }
}
