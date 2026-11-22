/**
 * Extracts column/field name from a Postgres unique constraint or error detail.
 */
export function extractFieldFromConstraint(
    constraint: string,
    detail?: string,
): string | null {
    // Postgres detail: Key (email)=(x@y.com) already exists.
    const fromDetail = detail?.match(/Key \(([^)]+)\)/)?.[1];
    if (fromDetail) return fromDetail;

    // Fallback: guess from constraint name like UQ_97672ac88f789774dd47f7c8be3
    // or users_email_key / uq_users_email
    const fromConstraint = constraint
        .toLowerCase()
        .match(/uq[_\d]*_?(\w+?)(?:_key|_unique)?$/)?.[1];
    return fromConstraint ?? null;
}
