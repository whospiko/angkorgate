import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateJobTitleDto } from './create-job-title.dto';

export class UpdateJobTitleDto extends PartialType(
    OmitType(CreateJobTitleDto, ['code'] as const),
) { }
