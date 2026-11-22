import { CustomerType } from '../entities/customer.entity';

/**
 * Standard prefixes per customer type for human-scannable identifiers.
 * e.g. PAT-0001, GST-0001, CUS-0001
 */
export const CUSTOMER_TYPE_PREFIX: Record<CustomerType, string> = {
    PATIENT: 'PAT',
    GUEST: 'GST',
    CUSTOMER: 'CUS',
};

/**
 * Formats a customer code with prefix and 4-digit zero-padded sequence.
 */
export function formatCustomerCode(prefix: string, sequence: number): string {
    return `${prefix}-${String(sequence).padStart(4, '0')}`;
}

/**
 * Extracts numeric sequence from customer code (e.g. "PAT-0042" -> 42).
 */
export function parseCustomerSequence(customerCode: string): number {
    return parseInt(customerCode.substring(4), 10) || 0;
}
