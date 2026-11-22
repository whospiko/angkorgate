import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateAppDto } from './create-app.dto';

/**
 * `appCode` is immutable — it's the identifier. Everything else is editable.
 */
export class UpdateAppSettingsDto extends PartialType(
    OmitType(CreateAppDto, ['appCode'] as const),
) { }
