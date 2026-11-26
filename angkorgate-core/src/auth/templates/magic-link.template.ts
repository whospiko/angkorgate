import { escapeHtml } from '../../common/utils/string.util';

export function magicLinkTemplate(params: {
    fullName: string;
    magicUrl: string;
    expiresInMinutes: number;
}): { subject: string; html: string; text: string } {
    const { fullName, magicUrl, expiresInMinutes } = params;
    const safeName = escapeHtml(fullName);
    return {
        subject: 'Your one-click sign-in link',
        html: `
      <div style="font-family:sans-serif;max-width:600px;margin:auto;padding:24px">
        <h2>Sign in to AngkorGate</h2>
        <p>Hi ${safeName},</p>
        <p>Click the button below to sign in without a password. This link can only be used once:</p>
        <p>
          <a href="${magicUrl}"
             style="display:inline-block;padding:12px 24px;background:#5865f2;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">
            Sign In with Magic Link
          </a>
        </p>
        <p style="color:#666;font-size:14px">
          Or copy and paste this URL into your browser:<br />
          <a href="${magicUrl}">${magicUrl}</a>
        </p>
        <p style="color:#666;font-size:14px">
          This link expires in ${expiresInMinutes} minutes. If you did not request this link, you can safely ignore this email.
        </p>
      </div>
    `,
        text: `Hi ${fullName},\n\nSign in using this one-time magic link (expires in ${expiresInMinutes} minutes):\n${magicUrl}\n\nIf you did not request this, please ignore this email.`,
    };
}
