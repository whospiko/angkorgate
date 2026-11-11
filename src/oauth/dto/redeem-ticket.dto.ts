import { IsString, MinLength } from 'class-validator';

export class RedeemTicketDto {
    @IsString()
    @MinLength(20)
    ticket: string;
}