import { colTimestamptz } from '../../common/utils/db-types.util';
import { Entity, PrimaryColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('oidc_sessions')
export class OidcSession {
    @PrimaryColumn('varchar', { length: 255 })
    id: string;

    @Index()
    @Column({ name: 'model_name', type: 'varchar', length: 100, nullable: true })
    modelName?: string | null;

    @Column('jsonb')
    payload: any;

    @Index()
    @Column({ name: 'grant_id', type: 'varchar', length: 255, nullable: true })
    grantId?: string | null;

    @Index()
    @Column({ name: 'user_code', type: 'varchar', length: 255, nullable: true })
    userCode?: string | null;

    @Index()
    @Column({ name: 'uid', type: 'varchar', length: 255, nullable: true })
    uid?: string | null;

    @Index()
    @Column({ name: 'expires_at', type: colTimestamptz() })
    expiresAt: Date;

    @Column({ name: 'consumed_at', type: colTimestamptz(), nullable: true })
    consumedAt?: Date | null;

    @CreateDateColumn({ name: 'created_at', type: colTimestamptz() })
    createdAt: Date;
}
