export interface JwtPayload {
    sub: string;          // user id
    email: string | null;
    phone: string | null;
    roles: string[];      // role codes, e.g. ['ADMIN']
    iat?: number;
    exp?: number;
}

export interface AuthenticatedUser {
    id: string;
    email: string | null;
    phone: string | null;
    roles: string[];
}

export interface MfaPendingPayload {
    sub: string;
    mfaPending: true;
    iat?: number;
    exp?: number;
}