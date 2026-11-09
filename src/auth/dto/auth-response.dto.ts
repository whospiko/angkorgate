export class AuthResponseDto {
    accessToken: string;
    refreshToken: string;
    accessTokenExpiresIn: number;  // seconds
    refreshTokenExpiresIn: number; // seconds
    user: {
        id: string;
        email: string | null;
        phone: string | null;
        roles: string[];
        mustChangePassword: boolean;
    };
}