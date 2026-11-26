import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    ParseUUIDPipe,
    Patch,
    Post,
    UseGuards,
} from '@nestjs/common';
import {
    ApiBearerAuth,
    ApiOperation,
    ApiParam,
    ApiResponse,
    ApiTags,
} from '@nestjs/swagger';
import { PermissionsGuard } from '../../rbac/guards/permissions.guard';
import { Permissions } from '../../rbac/decorators/permissions.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { UnifiedAuthGuard } from '../../auth/guards/unified-auth.guard';
import { SchedulesService } from '../services/schedules.service';
import { CreateEmployeeScheduleDto } from '../dto/create-schedule.dto';
import { UpdateScheduleDto } from '../dto/update-schedule.dto';

@ApiTags('Employees')
@ApiBearerAuth('bearerAuth')
@UseGuards(UnifiedAuthGuard, PermissionsGuard)
@Controller('employees/:employeeId/schedules')
export class SchedulesController {
    constructor(private readonly schedules: SchedulesService) { }

    @Post()
    @Permissions('employee:write')
    @ApiOperation({ summary: 'Create a shift work schedule for employee' })
    @ApiParam({ name: 'employeeId', description: 'Employee UUID' })
    @ApiResponse({ status: 201, description: 'Shift schedule created successfully' })
    @ApiResponse({ status: 400, description: 'Validation error' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    @ApiResponse({ status: 404, description: 'Employee not found' })
    create(
        @Param('employeeId', ParseUUIDPipe) employeeId: string,
        @Body() dto: CreateEmployeeScheduleDto,
        @CurrentUser('id') actorId: string,
    ) {
        return this.schedules.create({ ...dto, employeeId }, actorId);
    }

    @Get()
    @Permissions('employee:read')
    @ApiOperation({ summary: 'List all shift work schedules for employee' })
    @ApiParam({ name: 'employeeId', description: 'Employee UUID' })
    @ApiResponse({ status: 200, description: 'List of shift schedules' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    @ApiResponse({ status: 404, description: 'Employee not found' })
    list(@Param('employeeId', ParseUUIDPipe) employeeId: string) {
        return this.schedules.findByEmployee(employeeId);
    }

    @Get(':id')
    @Permissions('employee:read')
    @ApiOperation({ summary: 'Get details of a single shift work schedule' })
    @ApiParam({ name: 'employeeId', description: 'Employee UUID' })
    @ApiParam({ name: 'id', description: 'Schedule UUID' })
    @ApiResponse({ status: 200, description: 'Shift schedule details' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    @ApiResponse({ status: 404, description: 'Schedule not found' })
    findOne(
        @Param('employeeId', ParseUUIDPipe) employeeId: string,
        @Param('id', ParseUUIDPipe) id: string,
    ) {
        return this.schedules.findById(employeeId, id);
    }

    @Patch(':id')
    @Permissions('employee:write')
    @ApiOperation({ summary: 'Update a shift work schedule' })
    @ApiParam({ name: 'employeeId', description: 'Employee UUID' })
    @ApiParam({ name: 'id', description: 'Schedule UUID' })
    @ApiResponse({ status: 200, description: 'Shift schedule updated successfully' })
    @ApiResponse({ status: 400, description: 'Validation error' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    @ApiResponse({ status: 404, description: 'Schedule not found' })
    update(
        @Param('employeeId', ParseUUIDPipe) employeeId: string,
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateScheduleDto,
        @CurrentUser('id') actorId: string,
    ) {
        return this.schedules.update(employeeId, id, dto, actorId);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @Permissions('employee:write')
    @ApiOperation({ summary: 'Delete a shift work schedule' })
    @ApiParam({ name: 'employeeId', description: 'Employee UUID' })
    @ApiParam({ name: 'id', description: 'Schedule UUID' })
    @ApiResponse({ status: 204, description: 'Shift schedule deleted successfully' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    @ApiResponse({ status: 404, description: 'Schedule not found' })
    remove(
        @Param('employeeId', ParseUUIDPipe) employeeId: string,
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser('id') actorId: string,
    ) {
        return this.schedules.remove(employeeId, id, actorId);
    }
}
