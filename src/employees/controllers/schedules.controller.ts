import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    ParseUUIDPipe,
    Post,
    UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from '../../rbac/guards/permissions.guard';
import { Permissions } from '../../rbac/decorators/permissions.decorator';
import { SchedulesService } from '../schedules.service';
import { CreateScheduleDto } from '../dto/create-schedule.dto';

@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@Controller('employees/:employeeId/schedules')
export class SchedulesController {
    constructor(private readonly schedules: SchedulesService) { }

    @Post()
    @Permissions('employee:write')
    create(
        @Param('employeeId', ParseUUIDPipe) employeeId: string,
        @Body() dto: Omit<CreateScheduleDto, 'employeeId'>,
    ) {
        return this.schedules.create({ ...dto, employeeId });
    }

    @Get()
    @Permissions('employee:read')
    list(@Param('employeeId', ParseUUIDPipe) employeeId: string) {
        return this.schedules.findByEmployee(employeeId);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @Permissions('employee:write')
    remove(@Param('id', ParseUUIDPipe) id: string) {
        return this.schedules.remove(id);
    }
}