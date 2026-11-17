import { IsString, MinLength } from 'class-validator';

export class ConfirmEmailChangeDto {
    @IsString()
    @MinLength(20)
    token: string;
}