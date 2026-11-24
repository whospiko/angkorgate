import { ColumnOptions } from 'typeorm';

/**
 * Returns true if the currently targeted database engine is SQLite (e.g. better-sqlite3).
 */
export const isSqlite = (): boolean => {
    const dbType = (process.env.DB_TYPE || '').toLowerCase();
    if (dbType === 'sqlite' || dbType === 'better-sqlite3') return true;
    if (dbType === 'postgres' || dbType === 'postgresql') return false;
    // Default to sqlite for local dev when unspecified; postgres for test and production
    return process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test';
};

/**
 * Cross-database timestamp type resolver.
 * PostgreSQL requires 'timestamptz', while SQLite / better-sqlite3 requires 'datetime'.
 */
export const colTimestamptz = (): 'datetime' | 'timestamptz' =>
    isSqlite() ? 'datetime' : 'timestamptz';

/**
 * Cross-database case-insensitive text type resolver.
 * PostgreSQL uses 'citext' extension, while SQLite uses standard 'varchar' / 'text'.
 */
export const colCitext = (): 'varchar' | 'citext' =>
    isSqlite() ? 'varchar' : 'citext';

/**
 * Cross-database IP address column type resolver.
 * PostgreSQL uses native 'inet' type, while SQLite / better-sqlite3 uses 'varchar'.
 */
export const colInet = (): 'varchar' | 'inet' =>
    isSqlite() ? 'varchar' : 'inet';

/**
 * Cross-database PrimaryGeneratedColumn options for auto-incrementing integer/bigint IDs.
 * PostgreSQL uses 'bigint', while SQLite requires 'integer' for AUTOINCREMENT.
 */
export const colIdIncrement = (): { type: 'integer' | 'bigint' } =>
    ({ type: isSqlite() ? 'integer' : 'bigint' });

/**
 * Cross-database string array column configuration.
 * PostgreSQL supports native 'text[]' with array: true.
 * SQLite / better-sqlite3 stores arrays as TypeORM 'simple-array' (comma-separated string).
 */
export const colArrayText = (name: string): ColumnOptions =>
    isSqlite()
        ? { name, type: 'simple-array', nullable: true }
        : { name, type: 'text', array: true, default: '{}' };
