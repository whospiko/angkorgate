import { AuthResponseDto } from '../../auth/dto/auth-response.dto';

export class OauthResponseDto extends AuthResponseDto {
    provider: string;
}

export class OauthTicketResponseDto {
    accessToken: string;
    refreshToken: string;
    userId: string;
    provider: string;
}