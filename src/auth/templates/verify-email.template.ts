export function verifyEmailTemplate(params: {
    fullName: string;
    verifyUrl: string;
    expiresInHours: number;
}): { subject: string; html: string; text: string } {
    const { fullName, verifyUrl, expiresInHours } = params;
    return {
        subject: 'Verify your email',
        html: `
      <div style="font-family:sans-serif;max-width:600px;margin:auto;padding:24px">
        <h2>Welcome, ${escapeHtml(fullName)}!</h2>
        <p>Please verify your email address by clicking the button below:</p>
        <p>
          <a href="${verifyUrl}"
             style="display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;border-radius:6px;text-decoration:none">
            Verify Email
          </a>
        </p>
        <p style="color:#666;font-size:14px">
          Or copy this link: <a href="${verifyUrl}">${verifyUrl}</a>
        </p>
        <p style="color:#666;font-size:14px">
          This link expires in ${expiresInHours} hours. If you didn't sign up, ignore this email.
        </p>
      </div>
    `,
        text: `Welcome, ${fullName}!\n\nVerify your email: ${verifyUrl}\n\nThis link expires in ${expiresInHours} hours.`,
    };
}

function escapeHtml(s: string): string {
    return s.replace(/[&<>"']/g, (c) =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
    );
}