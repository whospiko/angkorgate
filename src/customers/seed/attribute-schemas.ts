/**
 * Suggested attribute keys per domain. This is documentation + optional validation,
 * NOT enforced. Services accept any key/value via setAttribute().
 *
 * Use this to:
 *   1. Document what keys the frontend should send
 *   2. Validate in a future schema-validation layer
 *   3. Auto-suggest keys in the admin UI
 */
export const ATTRIBUTE_SCHEMAS: Record<string, Record<string, string>> = {
    PATIENT: {
        blood_type: 'string',           // "O+"
        allergies: 'array<string>',     // ["peanuts","penicillin"]
        medical_notes: 'string',
        insurance_provider: 'string',
        insurance_number: 'string',
        emergency_contact_name: 'string',
    },
    GUEST: {
        passport_number: 'string',
        nationality: 'string',
        loyalty_tier: 'string',         // "GOLD"
        preferences: 'object',          // {"room":"high_floor","pillow":"soft"}
        vip: 'boolean',
        special_requests: 'string',
    },
    CUSTOMER: {
        loyalty_points: 'number',
        tax_exempt: 'boolean',
        preferred_payment: 'string',    // "CASH" | "CARD"
        credit_limit: 'number',
    },
};