export interface SeedTemplate {
    departments: Array<{ code: string; name: string }>;
    jobTitles: Array<{ code: string; name: string; category: string }>;
}

export const SEED_TEMPLATES: Record<string, SeedTemplate> = {
    clinic: {
        departments: [
            { code: 'GENERAL', name: 'General Medicine' },
            { code: 'ORTHO', name: 'Orthopedics' },
            { code: 'ORAL_SURGERY', name: 'Oral Surgery' },
            { code: 'FRONT_DESK', name: 'Front Desk' },
            { code: 'BILLING', name: 'Billing' },
        ],
        jobTitles: [
            { code: 'DOCTOR', name: 'Doctor', category: 'CLINIC' },
            { code: 'ASSISTANT', name: 'Assistant', category: 'CLINIC' },
            { code: 'RECEPTIONIST', name: 'Receptionist', category: 'CLINIC' },
            { code: 'ACCOUNTANT', name: 'Accountant', category: 'CLINIC' },
        ],
    },
    hotel: {
        departments: [
            { code: 'FRONT_DESK', name: 'Front Desk' },
            { code: 'HOUSEKEEPING', name: 'Housekeeping' },
            { code: 'RESTAURANT', name: 'Restaurant' },
            { code: 'MAINTENANCE', name: 'Maintenance' },
            { code: 'MANAGEMENT', name: 'Management' },
        ],
        jobTitles: [
            { code: 'MANAGER', name: 'Manager', category: 'HOTEL' },
            { code: 'CONCIERGE', name: 'Concierge', category: 'HOTEL' },
            { code: 'HOUSEKEEPER', name: 'Housekeeper', category: 'HOTEL' },
            { code: 'WAITER', name: 'Waiter', category: 'HOTEL' },
            { code: 'CHEF', name: 'Chef', category: 'HOTEL' },
            { code: 'TECHNICIAN', name: 'Technician', category: 'HOTEL' },
        ],
    },
    pos: {
        departments: [
            { code: 'STORE_1', name: 'Store 1' },
            { code: 'STORE_2', name: 'Store 2' },
            { code: 'WAREHOUSE', name: 'Warehouse' },
        ],
        jobTitles: [
            { code: 'CASHIER', name: 'Cashier', category: 'POS' },
            { code: 'STOCKER', name: 'Stocker', category: 'POS' },
            { code: 'SUPERVISOR', name: 'Supervisor', category: 'POS' },
        ],
    },
};