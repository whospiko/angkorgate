export interface OauthProfile {
    provider: string; // 'google' | 'github' | 'discord' | 'microsoft' | 'telegram' | 'apple'
    providerUserId: string;
    email: string | null;
    emailVerified: boolean;
    username?: string;
    firstName?: string;
    lastName?: string;
    fullName?: string;
    avatarUrl?: string;
    raw: Record<string, unknown>;
}
