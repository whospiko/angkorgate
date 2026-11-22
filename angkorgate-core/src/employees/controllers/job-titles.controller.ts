import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import {
    ApiBearerAuth,
    ApiOperation,
    ApiParam,
    ApiQuery,
    ApiResponse,
    ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from '../../rbac/guards/permissions.guard';
import { Permissions } from '../../rbac/decorators/permissions.decorator';
import { JobTitlesService } from '../services/job-titles.service';
import { CreateJobTitleDto } from '../dto/create-job-title.dto';
import { UpdateJobTitleDto } from '../dto/update-job-title.dto';

@ApiTags('Employees')
@ApiBearerAuth('bearerAuth')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@Controller('job-titles')
export class JobTitlesController {
    constructor(private readonly jobTitles: JobTitlesService) { }

    @Post()
    @Permissions('employee:write')
    @ApiOperation({ summary: 'Create a new job title' })
    @ApiResponse({ status: 201, description: 'Job title created successfully' })
    @ApiResponse({ status: 400, description: 'Validation error' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    create(@Body() dto: CreateJobTitleDto) {
        return this.jobTitles.create(dto);
    }

    @Get()
    @Permissions('employee:read')
    @ApiOperation({ summary: 'List job titles with optional category filtering' })
    @ApiQuery({ name: 'category', required: false, description: 'Filter by category (CLINIC, HOTEL, POS, GENERAL)' })
    @ApiResponse({ status: 200, description: 'List of job titles' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    findAll(@Query('category') category?: string) {
        return this.jobTitles.findAll(category);
    }

    @Get(':code')
    @Permissions('employee:read')
    @ApiOperation({ summary: 'Get details of a single job title by code' })
    @ApiParam({ name: 'code', description: 'Job title code', example: 'CHIEF_PHYSICIAN' })
    @ApiResponse({ status: 200, description: 'Job title details' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    @ApiResponse({ status: 404, description: 'Job title not found' })
    findOne(@Param('code') code: string) {
        return this.jobTitles.findByCodeOrFail(code);
    }

    @Patch(':code')
    @Permissions('employee:write')
    @ApiOperation({ summary: 'Update an existing job title' })
    @ApiParam({ name: 'code', description: 'Job title code', example: 'CHIEF_PHYSICIAN' })
    @ApiResponse({ status: 200, description: 'Job title updated successfully' })
    @ApiResponse({ status: 400, description: 'Validation error' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    @ApiResponse({ status: 404, description: 'Job title not found' })
    update(
        @Param('code') code: string,
        @Body() dto: UpdateJobTitleDto,
    ) {
        return this.jobTitles.update(code, dto);
    }

    @Delete(':code')
    @Permissions('employee:write')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Delete a job title' })
    @ApiParam({ name: 'code', description: 'Job title code', example: 'CHIEF_PHYSICIAN' })
    @ApiResponse({ status: 204, description: 'Job title deleted successfully' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    @ApiResponse({ status: 404, description: 'Job title not found' })
    remove(@Param('code') code: string) {
        return this.jobTitles.remove(code);
    }
}
