export function emailChangeConfirmTemplate(params: {
    fullName: string;
    confirmUrl: string;
    expiresInHours: number;
}): { subject: string; html: string; text: string } {
    const { fullName, confirmUrl, expiresInHours } = params;
    return {
        subject: 'Confirm your new email address',
        html: `
      <div style="font-family:sans-serif;max-width:600px;margin:auto;padding:24px">
        <h2>Hi ${escapeHtml(fullName)},</h2>
        <p>Click below to confirm this email address as the new login for your account:</p>
        <p>
          <a href="${confirmUrl}"
             style="display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;border-radius:6px;text-decoration:none">
            Confirm Email
          </a>
        </p>
        <p style="color:#666;font-size:14px">
          Or copy this link: <a href="${confirmUrl}">${confirmUrl}</a>
        </p>
        <p style="color:#666;font-size:14px">
          This link expires in ${expiresInHours} hours. If you didn't request this, ignore this email — nothing will change.
        </p>
      </div>
    `,
        text: `Hi ${fullName},\n\nConfirm your new email address: ${confirmUrl}\n\nThis link expires in ${expiresInHours} hours. If you didn't request this, ignore this email.\n`,
    };
}

function escapeHtml(s: string): string {
    return s.replace(/[&<>"']/g, (c) =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
    );
}