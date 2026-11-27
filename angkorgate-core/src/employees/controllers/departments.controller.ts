import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, UseGuards } from '@nestjs/common';
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
import { DepartmentsService } from '../services/departments.service';
import { CreateDepartmentDto } from '../dto/create-department.dto';
import { UpdateDepartmentDto } from '../dto/update-department.dto';

@ApiTags('Employees')
@ApiBearerAuth('bearerAuth')
@UseGuards(UnifiedAuthGuard, PermissionsGuard)
@Controller('departments')
export class DepartmentsController {
    constructor(private readonly departments: DepartmentsService) { }

    @Post()
    @Permissions('employee:write')
    @ApiOperation({ summary: 'Create a new department' })
    @ApiResponse({ status: 201, description: 'Department created successfully' })
    @ApiResponse({ status: 400, description: 'Validation error' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    create(
        @Body() dto: CreateDepartmentDto,
        @CurrentUser('id') actorId: string,
    ) {
        return this.departments.create(dto, actorId);
    }

    @Get()
    @Permissions('employee:read')
    @ApiOperation({ summary: 'List all departments' })
    @ApiResponse({ status: 200, description: 'List of departments' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    findAll() {
        return this.departments.findAll();
    }

    @Get('tree')
    @Permissions('employee:read')
    @ApiOperation({ summary: 'Get hierarchical department tree' })
    @ApiResponse({ status: 200, description: 'Nested department hierarchy' })
    getTree() {
        return this.departments.getTree();
    }

    @Get(':code')
    @Permissions('employee:read')
    @ApiOperation({ summary: 'Get details of a single department by code' })
    @ApiParam({ name: 'code', description: 'Department code', example: 'CARDIOLOGY' })
    @ApiResponse({ status: 200, description: 'Department details' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    @ApiResponse({ status: 404, description: 'Department not found' })
    findOne(@Param('code') code: string) {
        return this.departments.findByCodeOrFail(code);
    }

    @Patch(':code')
    @Permissions('employee:write')
    @ApiOperation({ summary: 'Update an existing department' })
    @ApiParam({ name: 'code', description: 'Department code', example: 'CARDIOLOGY' })
    @ApiResponse({ status: 200, description: 'Department updated successfully' })
    @ApiResponse({ status: 400, description: 'Validation error' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    @ApiResponse({ status: 404, description: 'Department not found' })
    update(
        @Param('code') code: string,
        @Body() dto: UpdateDepartmentDto,
        @CurrentUser('id') actorId: string,
    ) {
        return this.departments.update(code, dto, actorId);
    }

    @Delete(':code')
    @Permissions('employee:write')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Delete a department' })
    @ApiParam({ name: 'code', description: 'Department code', example: 'CARDIOLOGY' })
    @ApiResponse({ status: 204, description: 'Department deleted successfully' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    @ApiResponse({ status: 404, description: 'Department not found' })
    remove(
        @Param('code') code: string,
        @CurrentUser('id') actorId: string,
    ) {
        return this.departments.remove(code, actorId);
    }

    @Post('seed/:template')
    @Permissions('employee:write')
    @ApiOperation({ summary: 'Seed standard department hierarchy from predefined template' })
    @ApiParam({ name: 'template', description: 'Industry template (e.g. clinic, hotel, pos)' })
    @ApiResponse({ status: 201, description: 'Departments seeded successfully' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    async seed(
        @Param('template') template: string,
        @CurrentUser('id') actorId: string,
    ) {
        return this.departments.seedFromTemplate(template, actorId);
    }
}
