import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { DataSource } from 'typeorm';

export default async function globalSetup() {
    const container = await new PostgreSqlContainer('postgres:16-alpine')
        .withDatabase('clinic_test')
        .withUsername('postgres')
        .withPassword('postgres')
        .start();

    (globalThis as any).__POSTGRES_CONTAINER__ = container;

    process.env.DB_HOST = container.getHost();
    process.env.DB_PORT = String(container.getMappedPort(5432));
    process.env.DB_USERNAME = container.getUsername();
    process.env.DB_PASSWORD = container.getPassword();
    process.env.DB_NAME = container.getDatabase();

    const ds = new DataSource({
        type: 'postgres',
        host: container.getHost(),
        port: container.getMappedPort(5432),
        username: container.getUsername(),
        password: container.getPassword(),
        database: container.getDatabase(),
        migrations: [__dirname + '/../src/database/migrations/*{.ts,.js}'],
    });

    await ds.initialize();
    await ds.runMigrations();
    await ds.destroy();
}
