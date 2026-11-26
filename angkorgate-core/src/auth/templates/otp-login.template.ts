import { escapeHtml } from '../../common/utils/string.util';

export function otpLoginTemplate(params: {
    fullName: string;
    code: string;
    expiresInMinutes: number;
}): { subject: string; html: string; text: string } {
    const { fullName, code, expiresInMinutes } = params;
    const safeName = escapeHtml(fullName);
    const safeCode = escapeHtml(code);
    return {
        subject: `Your sign-in verification code: ${code}`,
        html: `
      <div style="font-family:sans-serif;max-width:600px;margin:auto;padding:24px">
        <h2>Your One-Time Sign-In Code</h2>
        <p>Hi ${safeName},</p>
        <p>Use the 6-digit verification code below to sign in:</p>
        <div style="margin:20px 0;padding:16px 24px;background:#f4f4f5;border-radius:8px;text-align:center;font-family:monospace;font-size:32px;font-weight:700;letter-spacing:8px;color:#18181b">
          ${safeCode}
        </div>
        <p style="color:#666;font-size:14px">
          This code expires in ${expiresInMinutes} minutes and can only be used once. Do not share this code with anyone.
        </p>
      </div>
    `,
        text: `Hi ${fullName},\n\nYour one-time sign-in code is: ${code}\n\nThis code expires in ${expiresInMinutes} minutes. Do not share it with anyone.`,
    };
}
