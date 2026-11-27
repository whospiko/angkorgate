/** Escapes a single cell value according to RFC-4180 CSV rules. */
export function escapeCsvCell(value: unknown): string {
    if (value === null || value === undefined) {
        return '';
    }
    const str = value instanceof Date ? value.toISOString() : String(value);
    if (/[",\r\n]/.test(str)) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
}

/** Builds a UTF-8 CSV string from header names and row tuples. */
export function buildCsv(headers: string[], rows: unknown[][]): string {
    const lines = [headers.map(escapeCsvCell).join(',')];
    for (const row of rows) {
        lines.push(row.map(escapeCsvCell).join(','));
    }
    return lines.join('\n');
}
