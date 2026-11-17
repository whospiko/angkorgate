import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from '../../rbac/guards/permissions.guard';
import { Permissions } from '../../rbac/decorators/permissions.decorator';
import { DepartmentsService } from '../services/departments.service';
import { CreateDepartmentDto } from '../dto/create-department.dto';

@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@Controller('departments')
export class DepartmentsController {
    constructor(private readonly departments: DepartmentsService) { }

    @Post()
    @Permissions('employee:write')
    create(@Body() dto: CreateDepartmentDto) {
        return this.departments.create(dto);
    }

    @Get()
    @Permissions('employee:read')
    findAll() {
        return this.departments.findAll();
    }

    @Post('seed/:template')
    @Permissions('employee:write')
    async seed(@Param('template') template: string) {
        return this.departments.seedFromTemplate(template);
    }
}