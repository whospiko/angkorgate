import { OmitType, PartialType } from "@nestjs/swagger";
import { CreateRoleDto } from "./create-role.dto";

export class UpdateRoleDto extends PartialType(
    OmitType(CreateRoleDto, ['code', 'isSystem', 'permissionCodes'] as const),
) { }