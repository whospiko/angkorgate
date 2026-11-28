import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { UnifiedAuthGuard } from '../../auth/guards/unified-auth.guard';
import { Permissions } from '../../rbac/decorators/permissions.decorator';
import { PermissionsGuard } from '../../rbac/guards/permissions.guard';
import {
  CreateAttendancePolicyDto,
  UpdateAttendancePolicyDto,
} from '../dto/attendance-policy.dto';
import { SchedulesService } from '../services/schedules.service';

@ApiTags('Attendance Policies')
@ApiBearerAuth('bearerAuth')
@UseGuards(UnifiedAuthGuard, PermissionsGuard)
@Controller('attendance-policies')
export class AttendancePoliciesController {
  constructor(private readonly schedules: SchedulesService) {}

  @Get()
  @Permissions('employee:read')
  @ApiOperation({ summary: 'List dynamic attendance check-in/out policies' })
  list() {
    return this.schedules.listAttendancePolicies();
  }

  @Post()
  @Permissions('employee:write')
  @ApiOperation({ summary: 'Create a dynamic attendance check-in/out policy' })
  create(
    @Body() dto: CreateAttendancePolicyDto,
    @CurrentUser('id') actorId: string,
  ) {
    return this.schedules.createAttendancePolicy(dto, actorId);
  }

  @Patch(':id')
  @Permissions('employee:write')
  @ApiOperation({ summary: 'Update an attendance check-in/out policy' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAttendancePolicyDto,
    @CurrentUser('id') actorId: string,
  ) {
    return this.schedules.updateAttendancePolicy(id, dto, actorId);
  }

  @Delete(':id')
  @Permissions('employee:write')
  @ApiOperation({ summary: 'Delete an attendance check-in/out policy' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') actorId: string,
  ) {
    return this.schedules.deleteAttendancePolicy(id, actorId);
  }
}
