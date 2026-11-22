/**
 * Escapes special HTML characters to prevent XSS in email and templates.
 */
export function escapeHtml(s: string): string {
    return s.replace(/[&<>"']/g, (c) =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
    );
}

/**
 * Strips HTML tags from markup, producing clean plain text.
 */
export function stripHtml(html: string): string {
    return html.replace(/<[^>]+>/g, '').trim();
}

/**
 * Derives a human-readable display name from an email address local-part.
 */
export function emailToDisplayName(email: string): string {
    const localPart = email.split('@')[0];
    return localPart.replace(/[._-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
