import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateProviderDto } from './create-provider.dto';

/**
 * `code` is the lookup key — immutable.
 * All other fields editable (name, credentials, scopes, isActive, extraConfig).
 */
export class UpdateProviderDto extends PartialType(
    OmitType(CreateProviderDto, ['code'] as const),
) { }
