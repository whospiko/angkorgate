import { escapeHtml } from '../../common/utils/string.util';

export function emailChangeAlertTemplate(params: {
    fullName: string;
    newEmail: string;
    oldEmail: string;
    changeIp: string | null;
    requestedAt: Date;
}): { subject: string; html: string; text: string } {
    const { fullName, newEmail, changeIp, requestedAt } = params;
    const when = requestedAt.toISOString();

    return {
        subject: '⚠️ Security alert: email change requested',
        html: `
      <div style="font-family:sans-serif;max-width:600px;margin:auto;padding:24px">
        <h2>Hi ${escapeHtml(fullName)},</h2>
        <p>Someone requested to change the email address on your account.</p>
        <table style="border-collapse:collapse;margin:16px 0">
          <tr><td style="padding:4px 12px 4px 0;color:#666">New email:</td><td><strong>${escapeHtml(newEmail)}</strong></td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#666">Requested at:</td><td>${escapeHtml(when)}</td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#666">IP address:</td><td>${escapeHtml(changeIp ?? 'unknown')}</td></tr>
        </table>
        <p><strong>If this was you</strong>, ignore this email. You'll receive a separate confirmation link at the new address.</p>
        <p><strong>If this wasn't you</strong>, someone has access to your account. Immediately:</p>
        <ol>
          <li>Change your password</li>
          <li>Review your active sessions and log out all devices</li>
          <li>Contact support if you cannot access your account</li>
        </ol>
        <p style="color:#999;font-size:12px">This is an automated security alert. Do not reply.</p>
      </div>
    `,
        text: `Hi ${fullName},\n\nSomeone requested to change your account email to ${newEmail} at ${when} from ${changeIp ?? 'unknown IP'}.\n\nIf this wasn't you, change your password immediately and log out all devices.\n`,
    };
}