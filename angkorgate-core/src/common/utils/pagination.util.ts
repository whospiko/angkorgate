export interface PaginationParams {
    page: number;
    limit: number;
    skip: number;
}

export interface PaginatedResult<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
}

/**
 * Normalizes page and limit parameters, calculating database skip offset.
 */
export function normalizePagination(
    page?: number,
    limit?: number,
    defaultLimit = 20,
    maxLimit = 100,
): PaginationParams {
    const validPage = Math.max(1, page ?? 1);
    const validLimit = Math.min(maxLimit, Math.max(1, limit ?? defaultLimit));
    const skip = (validPage - 1) * validLimit;
    return { page: validPage, limit: validLimit, skip };
}
