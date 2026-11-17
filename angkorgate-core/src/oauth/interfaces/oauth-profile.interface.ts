export interface OauthProfile {
    provider: string; // 'google'
    providerUserId: string; // Google 'sub'
    email: string | null;
    emailVerified: boolean;
    firstName?: string;
    lastName?: string;
    fullName?: string;
    avatarUrl?: string;
    raw: Record<string, unknown>;
}