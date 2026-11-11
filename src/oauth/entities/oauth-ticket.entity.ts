import {
    Column,
    CreateDateColumn,
    Entity,
    PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('oauth_tickets')
export class OauthTicket {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'ticket_hash', type: 'text', unique: true })
    ticketHash: string;

    @Column({ name: 'user_id', type: 'uuid' })
    userId: string;

    @Column({ name: 'access_token', type: 'text' })
    accessToken: string;

    @Column({ name: 'refresh_token', type: 'text' })
    refreshToken: string;

    @Column({ name: 'provider', type: 'varchar', length: 50 })
    provider: string;

    @Column({ name: 'expires_at', type: 'timestamptz' })
    expiresAt: Date;

    @Column({ name: 'used_at', type: 'timestamptz', nullable: true })
    usedAt: Date | null;

    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
    createdAt: Date;
}