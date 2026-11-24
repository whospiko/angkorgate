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
    Query,
    UseGuards,
    UseInterceptors,
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
import { FieldProjectionInterceptor } from '../../common/interceptors/field-projection.interceptor';
import { EmployeesService } from '../services/employees.service';
import { CreateEmployeeDto } from '../dto/create-employee.dto';
import { UpdateEmployeeDto } from '../dto/update-employee.dto';
import { EmployeeResponseDto } from '../dto/employee-response.dto';

@ApiTags('Employees')
@ApiBearerAuth('bearerAuth')
@UseGuards(UnifiedAuthGuard, PermissionsGuard)
@UseInterceptors(FieldProjectionInterceptor)
@Controller('employees')
export class EmployeesController {
    constructor(private readonly employees: EmployeesService) { }

    @Post()
    @Permissions('employee:write')
    @ApiOperation({ summary: 'Create a new employee profile' })
    @ApiResponse({ status: 201, description: 'Employee profile created successfully', type: EmployeeResponseDto })
    @ApiResponse({ status: 400, description: 'Validation error' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden (lacks employee:write permission)' })
    @ApiResponse({ status: 409, description: 'Employee code already exists' })
    create(
        @Body() dto: CreateEmployeeDto,
        @CurrentUser('id') actorId: string,
    ) {
        return this.employees.create(dto, actorId);
    }

    @Get()
    @Permissions('employee:read')
    @ApiOperation({ summary: 'List employees with optional filtering and pagination' })
    @ApiQuery({ name: 'status', required: false, description: 'Filter by employment status' })
    @ApiQuery({ name: 'departmentCode', required: false, description: 'Filter by department code' })
    @ApiQuery({ name: 'jobTitleCode', required: false, description: 'Filter by job title code' })
    @ApiQuery({ name: 'page', required: false, example: '1', description: 'Page number' })
    @ApiQuery({ name: 'limit', required: false, example: '20', description: 'Items per page' })
    @ApiResponse({ status: 200, description: 'Paginated employee list' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden (lacks employee:read permission)' })
    findAll(
        @Query('status') status?: string,
        @Query('departmentCode') departmentCode?: string,
        @Query('jobTitleCode') jobTitleCode?: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        return this.employees.findAll({
            status,
            departmentCode,
            jobTitleCode,
            page: page ? parseInt(page, 10) : undefined,
            limit: limit ? parseInt(limit, 10) : undefined,
        });
    }

    @Get('by-user/:userId')
    @Permissions('employee:read')
    @ApiOperation({ summary: 'Get employee profile linked to a user account UUID' })
    @ApiParam({ name: 'userId', description: 'User account UUID' })
    @ApiResponse({ status: 200, description: 'Employee profile or null if unlinked', type: EmployeeResponseDto })
    async findByUserId(@Param('userId', ParseUUIDPipe) userId: string) {
        return this.employees.findByUserId(userId);
    }

    @Get(':id')
    @Permissions('employee:read')
    @ApiOperation({ summary: 'Get employee profile by UUID' })
    @ApiParam({ name: 'id', description: 'Employee UUID' })
    @ApiResponse({ status: 200, description: 'Employee profile retrieved', type: EmployeeResponseDto })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden (lacks employee:read permission)' })
    @ApiResponse({ status: 404, description: 'Employee not found' })
    findOne(@Param('id', ParseUUIDPipe) id: string) {
        return this.employees.findByIdOrFail(id);
    }

    @Patch(':id')
    @Permissions('employee:write')
    @ApiOperation({ summary: 'Update employee profile' })
    @ApiParam({ name: 'id', description: 'Employee UUID' })
    @ApiResponse({ status: 200, description: 'Employee profile updated', type: EmployeeResponseDto })
    @ApiResponse({ status: 400, description: 'Validation error' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden (lacks employee:write permission)' })
    @ApiResponse({ status: 404, description: 'Employee not found' })
    update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateEmployeeDto,
        @CurrentUser('id') actorId: string,
    ) {
        return this.employees.update(id, dto, actorId);
    }

    @Patch(':id/status/:status')
    @HttpCode(HttpStatus.NO_CONTENT)
    @Permissions('employee:write')
    @ApiOperation({ summary: 'Update employee employment status' })
    @ApiParam({ name: 'id', description: 'Employee UUID' })
    @ApiParam({ name: 'status', enum: ['ACTIVE', 'ON_LEAVE', 'RESIGNED', 'TERMINATED'], description: 'New employment status' })
    @ApiResponse({ status: 204, description: 'Employee status updated successfully' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden (lacks employee:write permission)' })
    @ApiResponse({ status: 404, description: 'Employee not found' })
    setStatus(
        @Param('id', ParseUUIDPipe) id: string,
        @Param('status') status: string,
        @CurrentUser('id') actorId: string,
    ) {
        return this.employees.setStatus(
            id,
            status.toUpperCase() as 'ACTIVE' | 'ON_LEAVE' | 'RESIGNED' | 'TERMINATED',
            actorId,
        );
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @Permissions('employee:write')
    @ApiOperation({ summary: 'Delete employee profile' })
    @ApiParam({ name: 'id', description: 'Employee UUID' })
    @ApiResponse({ status: 204, description: 'Employee deleted successfully' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden (lacks employee:write permission)' })
    @ApiResponse({ status: 404, description: 'Employee not found' })
    remove(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser('id') actorId: string,
    ) {
        return this.employees.remove(id, actorId);
    }
}
