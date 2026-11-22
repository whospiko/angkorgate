/**
 * Infers user-friendly HTTP response messages based on HTTP method and status code.
 */
export function inferMessage(method: string, status: number): string {
    if (status === 201) return 'Created successfully';
    if (status === 204) return 'No content';
    switch (method.toUpperCase()) {
        case 'GET':
            return 'Resource retrieved successfully';
        case 'POST':
            return 'Resource created successfully';
        case 'PUT':
        case 'PATCH':
            return 'Resource updated successfully';
        case 'DELETE':
            return 'Resource deleted successfully';
        default:
            return 'Request completed successfully';
    }
}
