import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitCustomers1700000005000 implements MigrationInterface {
    public async up(q: QueryRunner): Promise<void> {
        await q.query(`
            CREATE TABLE customers (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                customer_code VARCHAR(30) UNIQUE NOT NULL,
                user_id UUID UNIQUE REFERENCES users(id) ON DELETE SET NULL,
                type VARCHAR(20) NOT NULL DEFAULT 'CUSTOMER'
                CHECK (type IN ('PATIENT','GUEST','CUSTOMER')),
                full_name VARCHAR(150) NOT NULL,
                gender VARCHAR(10) CHECK (gender IN ('MALE','FEMALE','OTHER')),
                date_of_birth DATE NOT NULL,
                phone VARCHAR(20),
                email CITEXT,
                address TEXT,
                national_id VARCHAR(50),
                avatar_url TEXT,
                status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
                CHECK (status IN ('ACTIVE','INACTIVE','ARCHIVED')),
                created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
            );
        `);
        await q.query(`CREATE INDEX idx_customers_type ON customers(type);`);
        await q.query(`CREATE INDEX idx_customers_name ON customers(full_name);`);
        await q.query(`CREATE INDEX idx_customers_phone ON customers(phone);`);
        await q.query(`CREATE INDEX idx_customers_status ON customers(status);`);

        await q.query(`
      CREATE TABLE customer_contacts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
        full_name VARCHAR(150) NOT NULL,
        relationship VARCHAR(50),
        phone VARCHAR(20),
        email CITEXT,
        address TEXT,
        is_primary BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT uq_customer_contact_phone UNIQUE (customer_id, phone)
      );
    `);
        await q.query(`CREATE INDEX idx_contacts_customer ON customer_contacts(customer_id);`);
        await q.query(`
      CREATE UNIQUE INDEX uq_one_primary_contact_per_customer
        ON customer_contacts(customer_id)
        WHERE is_primary = TRUE;
    `);

        await q.query(`
      CREATE TABLE customer_attributes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
        key VARCHAR(100) NOT NULL,
        value JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT uq_customer_attr_key UNIQUE (customer_id, key)
      );
    `);
        await q.query(`CREATE INDEX idx_customer_attrs_customer ON customer_attributes(customer_id);`);
        await q.query(`CREATE INDEX idx_customer_attrs_value_gin ON customer_attributes USING GIN (value);`);

        await q.query(`
      CREATE TABLE contact_attributes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        contact_id UUID NOT NULL REFERENCES customer_contacts(id) ON DELETE CASCADE,
        key VARCHAR(100) NOT NULL,
        value JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT uq_contact_attr_key UNIQUE (contact_id, key)
      );
    `);
        await q.query(`CREATE INDEX idx_contact_attrs_contact ON contact_attributes(contact_id);`);
    }

    public async down(q: QueryRunner): Promise<void> {
        await q.query(`DROP TABLE contact_attributes;`);
        await q.query(`DROP TABLE customer_attributes;`);
        await q.query(`DROP TABLE customer_contacts;`);
        await q.query(`DROP TABLE customers;`);
    }
}