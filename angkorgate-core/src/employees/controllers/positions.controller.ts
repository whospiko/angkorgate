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
    Put,
    UseGuards,
} from '@nestjs/common';
import {
    ApiBearerAuth,
    ApiOperation,
    ApiParam,
    ApiResponse,
    ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from '../../rbac/guards/permissions.guard';
import { Permissions } from '../../rbac/decorators/permissions.decorator';
import { PositionsService } from '../services/positions.service';
import { AssignEmployeePositionDto } from '../dto/assign-position.dto';
import { SetAttributeDto } from '../dto/set-attribute.dto';

@ApiTags('Employees')
@ApiBearerAuth('bearerAuth')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@Controller('employees/:employeeId/positions')
export class PositionsController {
    constructor(private readonly positions: PositionsService) { }

    @Post()
    @Permissions('employee:write')
    @ApiOperation({ summary: 'Assign a position/job title to an employee' })
    @ApiParam({ name: 'employeeId', description: 'Employee UUID' })
    @ApiResponse({ status: 201, description: 'Position assigned successfully' })
    @ApiResponse({ status: 400, description: 'Validation error' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    @ApiResponse({ status: 404, description: 'Employee or job title not found' })
    assign(
        @Param('employeeId', ParseUUIDPipe) employeeId: string,
        @Body() dto: AssignEmployeePositionDto,
    ) {
        return this.positions.assign({ ...dto, employeeId });
    }

    @Get()
    @Permissions('employee:read')
    @ApiOperation({ summary: 'List all positions assigned to an employee' })
    @ApiParam({ name: 'employeeId', description: 'Employee UUID' })
    @ApiResponse({ status: 200, description: 'List of employee positions' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    @ApiResponse({ status: 404, description: 'Employee not found' })
    list(@Param('employeeId', ParseUUIDPipe) employeeId: string) {
        return this.positions.findByEmployee(employeeId);
    }

    @Get(':positionId')
    @Permissions('employee:read')
    @ApiOperation({ summary: 'Get details of a single position assigned to an employee' })
    @ApiParam({ name: 'employeeId', description: 'Employee UUID' })
    @ApiParam({ name: 'positionId', description: 'Position UUID' })
    @ApiResponse({ status: 200, description: 'Position details' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    @ApiResponse({ status: 404, description: 'Position not found' })
    findOne(
        @Param('employeeId', ParseUUIDPipe) employeeId: string,
        @Param('positionId', ParseUUIDPipe) positionId: string,
    ) {
        return this.positions.findById(employeeId, positionId);
    }

    @Delete(':positionId')
    @HttpCode(HttpStatus.NO_CONTENT)
    @Permissions('employee:write')
    @ApiOperation({ summary: 'Remove a position assignment' })
    @ApiParam({ name: 'employeeId', description: 'Employee UUID' })
    @ApiParam({ name: 'positionId', description: 'Position UUID' })
    @ApiResponse({ status: 204, description: 'Position removed successfully' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    @ApiResponse({ status: 404, description: 'Position not found' })
    remove(@Param('positionId', ParseUUIDPipe) positionId: string) {
        return this.positions.remove(positionId);
    }

    @Get(':positionId/attributes')
    @Permissions('employee:read')
    @ApiOperation({ summary: 'Get dynamic attributes of position' })
    @ApiParam({ name: 'employeeId', description: 'Employee UUID' })
    @ApiParam({ name: 'positionId', description: 'Position UUID' })
    @ApiResponse({ status: 200, description: 'Position dynamic attributes map' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    getAttrs(@Param('positionId', ParseUUIDPipe) positionId: string) {
        return this.positions.getAttributes(positionId);
    }

    @Put(':positionId/attributes/:key')
    @Permissions('employee:write')
    @ApiOperation({ summary: 'Set or update dynamic attribute on position' })
    @ApiParam({ name: 'employeeId', description: 'Employee UUID' })
    @ApiParam({ name: 'positionId', description: 'Position UUID' })
    @ApiParam({ name: 'key', description: 'Attribute key' })
    @ApiResponse({ status: 200, description: 'Attribute set successfully' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    setAttr(
        @Param('positionId', ParseUUIDPipe) positionId: string,
        @Param('key') key: string,
        @Body() dto: SetAttributeDto,
    ) {
        return this.positions.setAttribute(positionId, key, dto.value);
    }

    @Delete(':positionId/attributes/:key')
    @HttpCode(HttpStatus.NO_CONTENT)
    @Permissions('employee:write')
    @ApiOperation({ summary: 'Delete dynamic attribute from position' })
    @ApiParam({ name: 'employeeId', description: 'Employee UUID' })
    @ApiParam({ name: 'positionId', description: 'Position UUID' })
    @ApiParam({ name: 'key', description: 'Attribute key' })
    @ApiResponse({ status: 204, description: 'Attribute deleted successfully' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    deleteAttr(
        @Param('positionId', ParseUUIDPipe) positionId: string,
        @Param('key') key: string,
    ) {
        return this.positions.deleteAttribute(positionId, key);
    }
}
