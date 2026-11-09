import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from '../../rbac/guards/permissions.guard';
import { Permissions } from '../../rbac/decorators/permissions.decorator';
import { JobTitlesService } from '../job-titles.service';
import { CreateJobTitleDto } from '../dto/create-job-title.dto';

@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@Controller('job-titles')
export class JobTitlesController {
    constructor(private readonly jobTitles: JobTitlesService) { }

    @Post()
    @Permissions('employee:write')
    create(@Body() dto: CreateJobTitleDto) {
        return this.jobTitles.create(dto);
    }

    @Get()
    @Permissions('employee:read')
    findAll(@Query('category') category?: string) {
        return this.jobTitles.findAll(category);
    }
}