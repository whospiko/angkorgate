import {
    Body,
    Controller,
    Get,
    Param,
    ParseUUIDPipe,
    Patch,
    Post,
    Query,
    UseGuards,
} from '@nestjs/common';
import {
    ApiBearerAuth,
    ApiOperation,
    ApiParam,
    ApiQuery,
    ApiResponse,
    ApiTags,
} from '@nestjs/swagger';
import { PermissionsGuard } from '../../rbac/guards/permissions.guard';
import { Permissions } from '../../rbac/decorators/permissions.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { UnifiedAuthGuard } from '../../auth/guards/unified-auth.guard';
import { LeaveRequestsService } from '../services/leave-requests.service';
import {
    CreateLeaveRequestDto,
    ReviewLeaveRequestDto,
    UpdateLeavePolicyDto,
} from '../dto/leave-request.dto';
import type { QuotaLeaveType } from '../entities/leave-policy.entity';

@ApiTags('Employees')
@ApiBearerAuth('bearerAuth')
@UseGuards(UnifiedAuthGuard, PermissionsGuard)
@Controller()
export class LeaveRequestsController {
    constructor(private readonly leaves: LeaveRequestsService) { }

    @Post('employees/:employeeId/leave-requests')
    @Permissions('employee:write')
    @ApiOperation({ summary: 'Submit a leave request for an employee' })
    @ApiParam({ name: 'employeeId', description: 'Employee UUID' })
    @ApiResponse({ status: 201, description: 'Leave request created' })
    create(
        @Param('employeeId', ParseUUIDPipe) employeeId: string,
        @Body() dto: CreateLeaveRequestDto,
        @CurrentUser('id') actorId: string,
    ) {
        return this.leaves.create(employeeId, dto, actorId);
    }

    @Get('employees/:employeeId/leave-requests')
    @Permissions('employee:read')
    @ApiOperation({ summary: 'List leave requests for a specific employee' })
    @ApiParam({ name: 'employeeId', description: 'Employee UUID' })
    listByEmployee(@Param('employeeId', ParseUUIDPipe) employeeId: string) {
        return this.leaves.findByEmployee(employeeId);
    }

    @Get('leave-requests')
    @Permissions('employee:read')
    @ApiOperation({ summary: 'List all leave requests (HR queue)' })
    @ApiQuery({ name: 'status', required: false, enum: ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'] })
    @ApiQuery({ name: 'employeeId', required: false })
    @ApiQuery({ name: 'page', required: false })
    @ApiQuery({ name: 'limit', required: false })
    findAll(
        @Query('status') status?: string,
        @Query('employeeId') employeeId?: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        return this.leaves.findAll({
            status,
            employeeId,
            page: page ? parseInt(page, 10) : undefined,
            limit: limit ? parseInt(limit, 10) : undefined,
        });
    }

    @Patch('leave-requests/:id/review')
    @Permissions('employee:write')
    @ApiOperation({ summary: 'Approve or reject a pending leave request' })
    @ApiParam({ name: 'id', description: 'Leave Request UUID' })
    review(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: ReviewLeaveRequestDto,
        @CurrentUser('id') actorId: string,
    ) {
        return this.leaves.review(id, dto, actorId);
    }

    @Patch('leave-requests/:id/cancel')
    @Permissions('employee:write')
    @ApiOperation({ summary: 'Cancel a leave request' })
    @ApiParam({ name: 'id', description: 'Leave Request UUID' })
    cancel(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser('id') actorId: string,
    ) {
        return this.leaves.cancel(id, actorId);
    }

    @Get('leave-policies')
    @Permissions('employee:read')
    @ApiOperation({ summary: 'List yearly leave quota policies' })
    listPolicies() {
        return this.leaves.getPolicies();
    }

    @Patch('leave-policies/:leaveType')
    @Permissions('employee:write')
    @ApiOperation({ summary: 'Update yearly quota policy for ANNUAL, SICK, or MATERNITY leave' })
    updatePolicy(
        @Param('leaveType') leaveType: QuotaLeaveType,
        @Body() dto: UpdateLeavePolicyDto,
        @CurrentUser('id') actorId: string,
    ) {
        return this.leaves.updatePolicy(leaveType, dto, actorId);
    }
}
