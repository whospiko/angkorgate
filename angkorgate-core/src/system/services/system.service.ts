import {
    ForbiddenException,
    Injectable,
    Logger,
    NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { SystemConfig } from '../entities/system-config.entity';
import { SetupStatusResponseDto } from '../dto/setup-status-response.dto';
import { InitialSetupDto } from '../dto/initial-setup.dto';
import { UpdateBrandingDto } from '../dto/update-branding.dto';
import { BrandingResponseDto } from '../dto/branding-response.dto';
import { UsersService } from '../../users/services/users.service';
import { RbacService } from '../../rbac/services/rbac.service';
import { AuthService, LoginContext } from '../../auth/services/auth.service';
import { AuditService } from '../../audit/services/audit.service';
import { User } from '../../users/entities/user.entity';
import { UserRole } from '../../rbac/entities/user-role.entity';
import { Role } from '../../rbac/entities/role.entity';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class SystemService {
    private readonly logger = new Logger(SystemService.name);

    constructor(
        @InjectRepository(SystemConfig)
        private readonly configRepo: Repository<SystemConfig>,
        private readonly usersService: UsersService,
        private readonly rbacService: RbacService,
        private readonly authService: AuthService,
        private readonly auditService: AuditService,
        private readonly dataSource: DataSource,
    ) { }

    /**
     * Retrieves or lazily creates the default singleton system configuration.
     */
    async getOrCreateConfig(): Promise<SystemConfig> {
        let config = await this.configRepo.findOne({ where: { id: 'default' } });
        if (!config) {
            config = this.configRepo.create({
                id: 'default',
                isInitialized: false,
                appName: 'AngkorGate',
            });
            await this.configRepo.save(config);
        }
        return config;
    }

    /**
     * Checks whether initial setup is completed and whether an admin exists.
     */
    async getSetupStatus(): Promise<SetupStatusResponseDto> {
        const config = await this.getOrCreateConfig();

        // Check if at least one ADMIN exists
        const adminCount = await this.dataSource
            .getRepository(UserRole)
            .createQueryBuilder('ur')
            .innerJoin('roles', 'r', 'r.id = ur.role_id')
            .where('r.code = :code', { code: 'ADMIN' })
            .getCount();

        const isInitialized = config.isInitialized || adminCount > 0;

        return {
            isInitialized,
            requiresAdmin: adminCount === 0,
            appName: config.appName,
            logoUrl: config.logoUrl ?? null,
        };
    }

    /**
     * Executes the initial setup: creates root Super Admin and saves brand settings.
     * Permanently locks initial setup afterwards.
     */
    async executeInitialSetup(
        dto: InitialSetupDto,
        ctx: LoginContext = {},
    ): Promise<{
        success: boolean;
        message: string;
        user: { id: string; email: string | null; roles: string[] };
        tokens: any;
        branding: BrandingResponseDto;
    }> {
        const status = await this.getSetupStatus();
        if (status.isInitialized) {
            throw new ForbiddenException(
                'System setup has already been completed. This endpoint is permanently locked.',
            );
        }

        // Verify ADMIN role exists in system
        const adminRole = await this.dataSource
            .getRepository(Role)
            .findOne({ where: { code: 'ADMIN' } });
        if (!adminRole) {
            throw new NotFoundException(
                'System ADMIN role not found. Ensure database migrations have run.',
            );
        }

        const passwordHash = await bcrypt.hash(dto.adminPassword, BCRYPT_ROUNDS);

        const qr = this.dataSource.createQueryRunner();
        await qr.connect();
        await qr.startTransaction();

        let createdUser: User;
        let updatedConfig: SystemConfig;

        try {
            // 1. Create root Super Admin user
            const userRepo = qr.manager.getRepository(User);
            const user = userRepo.create({
                email: dto.adminEmail.toLowerCase().trim(),
                phone: dto.adminPhone ?? null,
                passwordHash,
                isActive: true,
                isEmailVerified: true,
                isPhoneVerified: Boolean(dto.adminPhone),
                mustChangePassword: false,
            });
            createdUser = await userRepo.save(user);

            // 2. Assign ADMIN role
            const userRoleRepo = qr.manager.getRepository(UserRole);
            const userRole = userRoleRepo.create({
                userId: createdUser.id,
                roleId: adminRole.id,
                assignedBy: createdUser.id,
            });
            await userRoleRepo.save(userRole);

            // 3. Update system config & branding
            const configRepo = qr.manager.getRepository(SystemConfig);
            let config = await configRepo.findOne({ where: { id: 'default' } });
            if (!config) {
                config = configRepo.create({ id: 'default' });
            }

            config.isInitialized = true;
            config.appName = dto.appName.trim();
            if (dto.appDescription !== undefined) config.appDescription = dto.appDescription;
            if (dto.logoUrl !== undefined) config.logoUrl = dto.logoUrl;
            if (dto.faviconUrl !== undefined) config.faviconUrl = dto.faviconUrl;
            if (dto.organizationName !== undefined) config.organizationName = dto.organizationName;
            if (dto.supportEmail !== undefined) config.supportEmail = dto.supportEmail;
            if (dto.footerText !== undefined) config.footerText = dto.footerText;

            updatedConfig = await configRepo.save(config);

            await qr.commitTransaction();
        } catch (error) {
            await qr.rollbackTransaction();
            this.logger.error('Initial setup failed:', error);
            throw error;
        } finally {
            await qr.release();
        }

        // Issue auth tokens so admin is immediately signed in
        const tokens = await this.authService.issueTokensForUser(
            createdUser.id,
            createdUser.email,
            createdUser.phone,
            ctx,
        );

        // Audit setup completion
        void this.auditService.log({
            action: 'system.setup.completed',
            entity: 'system',
            entityId: 'default',
            actorId: createdUser.id,
            newValue: {
                adminEmail: createdUser.email,
                appName: updatedConfig.appName,
                isInitialized: true,
            },
        });

        return {
            success: true,
            message: 'AngkorGate initial setup completed successfully.',
            user: {
                id: createdUser.id,
                email: createdUser.email,
                roles: ['ADMIN'],
            },
            tokens,
            branding: BrandingResponseDto.fromEntity(updatedConfig),
        };
    }

    /**
     * Gets public branding details.
     */
    async getBranding(): Promise<BrandingResponseDto> {
        const config = await this.getOrCreateConfig();
        return BrandingResponseDto.fromEntity(config);
    }

    /**
     * Updates branding / content management settings.
     */
    async updateBranding(
        dto: UpdateBrandingDto,
        actorId?: string,
    ): Promise<BrandingResponseDto> {
        const config = await this.getOrCreateConfig();
        const oldValue = { ...config };

        if (dto.appName !== undefined) config.appName = dto.appName.trim();
        if (dto.appDescription !== undefined) config.appDescription = dto.appDescription;
        if (dto.logoUrl !== undefined) config.logoUrl = dto.logoUrl;
        if (dto.faviconUrl !== undefined) config.faviconUrl = dto.faviconUrl;
        if (dto.organizationName !== undefined) config.organizationName = dto.organizationName;
        if (dto.supportEmail !== undefined) config.supportEmail = dto.supportEmail;
        if (dto.footerText !== undefined) config.footerText = dto.footerText;

        const saved = await this.configRepo.save(config);

        void this.auditService.log({
            action: 'system.branding.updated',
            entity: 'system',
            entityId: 'default',
            actorId: actorId ?? null,
            oldValue: { ...oldValue } as Record<string, unknown>,
            newValue: { ...saved } as Record<string, unknown>,
        });

        return BrandingResponseDto.fromEntity(saved);
    }
}
