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
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from '../../rbac/guards/permissions.guard';
import { Permissions } from '../../rbac/decorators/permissions.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { EmployeesService } from '../employees.service';
import { CreateEmployeeDto } from '../dto/create-employee.dto';
import { UpdateEmployeeDto } from '../dto/update-employee.dto';

@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@Controller('employees')
export class EmployeesController {
    constructor(private readonly employees: EmployeesService) { }

    @Post()
    @Permissions('employee:write')
    create(
        @Body() dto: CreateEmployeeDto,
        @CurrentUser('id') actorId: string,
    ) {
        return this.employees.create(dto, actorId);
    }

    @Get()
    @Permissions('employee:read')
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

    @Get(':id')
    @Permissions('employee:read')
    findOne(@Param('id', ParseUUIDPipe) id: string) {
        return this.employees.findByIdOrFail(id);
    }

    @Patch(':id')
    @Permissions('employee:write')
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
    remove(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser('id') actorId: string,
    ) {
        return this.employees.remove(id, actorId);
    }

}