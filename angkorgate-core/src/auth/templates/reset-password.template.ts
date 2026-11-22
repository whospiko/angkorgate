import { escapeHtml } from '../../common/utils/string.util';

export function resetPasswordTemplate(params: {
    fullName: string;
    resetUrl: string;
    expiresInMinutes: number;
}): { subject: string; html: string; text: string } {
    const { fullName, resetUrl, expiresInMinutes } = params;
    return {
        subject: 'Reset your password',
        html: `
      <div style="font-family:sans-serif;max-width:600px;margin:auto;padding:24px">
        <h2>Hi ${escapeHtml(fullName)},</h2>
        <p>We received a request to reset your password. Click below to choose a new one:</p>
        <p>
          <a href="${resetUrl}"
             style="display:inline-block;padding:12px 24px;background:#dc2626;color:#fff;border-radius:6px;text-decoration:none">
            Reset Password
          </a>
        </p>
        <p style="color:#666;font-size:14px">
          Or copy this link: <a href="${resetUrl}">${resetUrl}</a>
        </p>
        <p style="color:#666;font-size:14px">
          This link expires in ${expiresInMinutes} minutes.
          If you didn't request this, you can safely ignore this email — your password won't change.
        </p>
      </div>
    `,
        text: `Hi ${fullName},\n\nReset your password: ${resetUrl}\n\nExpires in ${expiresInMinutes} minutes.`,
    };
}