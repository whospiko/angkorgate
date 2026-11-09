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
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from '../../rbac/guards/permissions.guard';
import { Permissions } from '../../rbac/decorators/permissions.decorator';
import { PositionsService } from '../positions.service';
import { AssignPositionDto } from '../dto/assign-position.dto';
import { SetAttributeDto } from '../dto/set-attribute.dto';

@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@Controller('employees/:employeeId/positions')
export class PositionsController {
    constructor(private readonly positions: PositionsService) { }

    @Post()
    @Permissions('employee:write')
    assign(
        @Param('employeeId', ParseUUIDPipe) employeeId: string,
        @Body() dto: Omit<AssignPositionDto, 'employeeId'>,
    ) {
        return this.positions.assign({ ...dto, employeeId });
    }

    @Get()
    @Permissions('employee:read')
    list(@Param('employeeId', ParseUUIDPipe) employeeId: string) {
        return this.positions.findByEmployee(employeeId);
    }

    @Delete(':positionId')
    @HttpCode(HttpStatus.NO_CONTENT)
    @Permissions('employee:write')
    remove(@Param('positionId', ParseUUIDPipe) positionId: string) {
        return this.positions.remove(positionId);
    }

    @Get(':positionId/attributes')
    @Permissions('employee:read')
    getAttrs(@Param('positionId', ParseUUIDPipe) positionId: string) {
        return this.positions.getAttributes(positionId);
    }

    @Put(':positionId/attributes/:key')
    @Permissions('employee:write')
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
    deleteAttr(
        @Param('positionId', ParseUUIDPipe) positionId: string,
        @Param('key') key: string,
    ) {
        return this.positions.deleteAttribute(positionId, key);
    }
}