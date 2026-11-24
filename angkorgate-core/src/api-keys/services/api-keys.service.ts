import {
    ForbiddenException,
    Injectable,
    NotFoundException,
    UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { ApiKey } from '../entities/api-key.entity';
import { CreateApiKeyDto } from '../dto/create-api-key.dto';
import { UpdateApiKeyDto } from '../dto/update-api-key.dto';
import {
    ApiKeyCreatedResponseDto,
    ApiKeyResponseDto,
} from '../dto/api-key-response.dto';

export interface ResourceFieldMeta {
    name: string;
    label: string;
    type: string;
    isPii: boolean;
    isDefault: boolean;
}

export interface ResourceSchemaMeta {
    resource: string;
    title: string;
    description: string;
    basePath: string;
    supportedMethods: ('GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE')[];
    fields: ResourceFieldMeta[];
}

@Injectable()
export class ApiKeysService {
    constructor(
        @InjectRepository(ApiKey)
        private readonly repo: Repository<ApiKey>,
    ) { }

    /**
     * Introspection catalog of business resources exposed for API Key integrations
     */
    getSchemaResources(): ResourceSchemaMeta[] {
        return [
            {
                resource: 'customers',
                title: 'Customers & CRM',
                description: 'Patient, Guest, and Customer directory and profile management',
                basePath: '/customers',
                supportedMethods: ['GET', 'POST', 'PATCH', 'DELETE'],
                fields: [
                    { name: 'id', label: 'UUID', type: 'uuid', isPii: false, isDefault: true },
                    { name: 'customerCode', label: 'Customer Code (PAT/GST/CUS)', type: 'string', isPii: false, isDefault: true },
                    { name: 'type', label: 'Customer Type', type: 'string', isPii: false, isDefault: true },
                    { name: 'fullName', label: 'Full Name', type: 'string', isPii: false, isDefault: true },
                    { name: 'gender', label: 'Gender', type: 'string', isPii: false, isDefault: true },
                    { name: 'status', label: 'Account Status', type: 'string', isPii: false, isDefault: true },
                    { name: 'dateOfBirth', label: 'Date of Birth', type: 'date', isPii: true, isDefault: false },
                    { name: 'phone', label: 'Phone Number', type: 'string', isPii: true, isDefault: false },
                    { name: 'email', label: 'Email Address', type: 'string', isPii: true, isDefault: false },
                    { name: 'address', label: 'Street Address', type: 'string', isPii: true, isDefault: false },
                    { name: 'nationalId', label: 'National ID / Passport', type: 'string', isPii: true, isDefault: false },
                    { name: 'avatarUrl', label: 'Avatar URL', type: 'url', isPii: false, isDefault: false },
                    { name: 'createdAt', label: 'Created At', type: 'timestamp', isPii: false, isDefault: false },
                    { name: 'updatedAt', label: 'Updated At', type: 'timestamp', isPii: false, isDefault: false },
                ],
            },
            {
                resource: 'employees',
                title: 'Employees & Organization',
                description: 'Staff directory, organizational positions, and schedules',
                basePath: '/employees',
                supportedMethods: ['GET', 'POST', 'PATCH', 'DELETE'],
                fields: [
                    { name: 'id', label: 'UUID', type: 'uuid', isPii: false, isDefault: true },
                    { name: 'employeeCode', label: 'Employee Code', type: 'string', isPii: false, isDefault: true },
                    { name: 'fullName', label: 'Full Name', type: 'string', isPii: false, isDefault: true },
                    { name: 'gender', label: 'Gender', type: 'string', isPii: false, isDefault: true },
                    { name: 'employmentStatus', label: 'Employment Status', type: 'string', isPii: false, isDefault: true },
                    { name: 'dateOfBirth', label: 'Date of Birth', type: 'date', isPii: true, isDefault: false },
                    { name: 'hireDate', label: 'Hire Date', type: 'date', isPii: false, isDefault: false },
                    { name: 'phone', label: 'Phone Number', type: 'string', isPii: true, isDefault: false },
                    { name: 'nationalId', label: 'National ID / Tax ID', type: 'string', isPii: true, isDefault: false },
                    { name: 'address', label: 'Residential Address', type: 'string', isPii: true, isDefault: false },
                    { name: 'avatarUrl', label: 'Avatar URL', type: 'url', isPii: false, isDefault: false },
                    { name: 'createdAt', label: 'Created At', type: 'timestamp', isPii: false, isDefault: false },
                    { name: 'updatedAt', label: 'Updated At', type: 'timestamp', isPii: false, isDefault: false },
                ],
            },
        ];
    }

    async create(dto: CreateApiKeyDto, userId: string): Promise<ApiKeyCreatedResponseDto> {
        const env = dto.environment || 'live';
        // 32 random bytes = 64 hex characters
        const randomHex = crypto.randomBytes(32).toString('hex');
        const secretKey = `ag_${env}_${randomHex}`;
        const keyPrefix = secretKey.slice(0, 12); // e.g. ag_live_4a89
        const lastFour = secretKey.slice(-4);
        const keyHash = crypto.createHash('sha256').update(secretKey).digest('hex');

        let expiresAt: Date | null = null;
        if (dto.expirationDays && dto.expirationDays > 0) {
            expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + dto.expirationDays);
        }

        const allowedResources = dto.allowedResources && dto.allowedResources.length > 0
            ? dto.allowedResources
            : ['customers', 'employees'];

        const allowedMethods = dto.allowedMethods || {
            customers: ['GET'],
            employees: ['GET'],
        };

        const permissions = dto.permissions || ['customer:read', 'employee:read'];

        const apiKey = this.repo.create({
            name: dto.name,
            keyPrefix,
            keyHash,
            lastFour,
            userId,
            appCode: dto.appCode || null,
            status: 'ACTIVE',
            allowedResources,
            allowedMethods,
            permissions,
            fieldProjections: dto.fieldProjections || {},
            rateLimit: dto.rateLimit || 120,
            expiresAt,
            totalRequests: 0,
        });

        const saved = await this.repo.save(apiKey);

        return {
            ...this.toResponseDto(saved),
            secretKey, // Shown only once upon creation
        };
    }

    async findAll(userId?: string): Promise<ApiKeyResponseDto[]> {
        const query = this.repo.createQueryBuilder('k')
            .leftJoinAndSelect('k.user', 'u')
            .orderBy('k.created_at', 'DESC');

        if (userId) {
            query.where('k.user_id = :userId', { userId });
        }

        const keys = await query.getMany();
        return keys.map((k) => this.toResponseDto(k));
    }

    async findByIdOrFail(id: string): Promise<ApiKeyResponseDto> {
        const key = await this.repo.findOne({
            where: { id },
            relations: { user: true },
        });
        if (!key) throw new NotFoundException(`API key with ID ${id} not found`);
        return this.toResponseDto(key);
    }

    async update(id: string, dto: UpdateApiKeyDto): Promise<ApiKeyResponseDto> {
        const key = await this.repo.findOne({ where: { id } });
        if (!key) throw new NotFoundException(`API key with ID ${id} not found`);

        if (dto.name !== undefined) key.name = dto.name;
        if (dto.status !== undefined) key.status = dto.status;
        if (dto.allowedResources !== undefined) key.allowedResources = dto.allowedResources;
        if (dto.allowedMethods !== undefined) key.allowedMethods = dto.allowedMethods;
        if (dto.permissions !== undefined) key.permissions = dto.permissions;
        if (dto.fieldProjections !== undefined) key.fieldProjections = dto.fieldProjections;
        if (dto.rateLimit !== undefined) key.rateLimit = dto.rateLimit;
        if (dto.expiresAt !== undefined) key.expiresAt = dto.expiresAt;

        const saved = await this.repo.save(key);
        return this.toResponseDto(saved);
    }

    async revoke(id: string): Promise<ApiKeyResponseDto> {
        return this.update(id, { status: 'REVOKED' });
    }

    async remove(id: string): Promise<void> {
        const res = await this.repo.delete(id);
        if (res.affected === 0) {
            throw new NotFoundException(`API key with ID ${id} not found`);
        }
    }

    /**
     * Validate an API key in handshake requests and enforce method/resource restrictions
     */
    async validateApiKey(
        rawKey: string,
        method?: string,
        path?: string,
    ): Promise<ApiKey> {
        if (!rawKey || typeof rawKey !== 'string') {
            throw new UnauthorizedException('API key is missing or invalid');
        }

        const keyHash = crypto.createHash('sha256').update(rawKey.trim()).digest('hex');
        const key = await this.repo.findOne({
            where: { keyHash },
            relations: { user: true },
        });

        if (!key) {
            throw new UnauthorizedException('Invalid API key');
        }

        if (key.status !== 'ACTIVE') {
            throw new UnauthorizedException(`API key is ${key.status.toLowerCase()}`);
        }

        if (key.expiresAt && new Date(key.expiresAt).getTime() < Date.now()) {
            key.status = 'EXPIRED';
            await this.repo.save(key);
            throw new UnauthorizedException('API key has expired');
        }

        // Granular HTTP Method and Resource restriction
        if (path && method) {
            const cleanPath = path.toLowerCase();
            const normalizedMethod = method.toUpperCase() as 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

            let matchedResource: string | null = null;
            if (cleanPath.includes('/customers')) matchedResource = 'customers';
            else if (cleanPath.includes('/employees')) matchedResource = 'employees';

            if (matchedResource) {
                // Verify resource is allowed
                if (!key.allowedResources.includes(matchedResource)) {
                    throw new ForbiddenException(
                        `Access to resource '${matchedResource}' is not permitted for this API Key`,
                    );
                }

                // Verify method is allowed for this resource
                const resourceMethods = key.allowedMethods?.[matchedResource];
                if (resourceMethods && Array.isArray(resourceMethods) && resourceMethods.length > 0) {
                    const normalizedAllowed = resourceMethods.map((m) => m.toUpperCase());
                    if (!normalizedAllowed.includes(normalizedMethod)) {
                        throw new ForbiddenException(
                            `HTTP method ${normalizedMethod} is not permitted for this API Key on '${matchedResource}'. Permitted: [${normalizedAllowed.join(', ')}]`,
                        );
                    }
                }
            }
        }

        // Asynchronously update last used and request count without blocking response
        this.repo.createQueryBuilder()
            .update(ApiKey)
            .set({
                lastUsedAt: new Date(),
                totalRequests: () => 'total_requests + 1',
            })
            .where('id = :id', { id: key.id })
            .execute()
            .catch(() => { });

        return key;
    }

    private toResponseDto(entity: ApiKey): ApiKeyResponseDto {
        const maskedKey = `${entity.keyPrefix}••••••••${entity.lastFour}`;
        return {
            id: entity.id,
            name: entity.name,
            keyPrefix: entity.keyPrefix,
            lastFour: entity.lastFour,
            maskedKey,
            userId: entity.userId,
            userEmail: entity.user?.email || undefined,
            appCode: entity.appCode,
            status: entity.status,
            allowedResources: entity.allowedResources || [],
            allowedMethods: entity.allowedMethods || {},
            permissions: entity.permissions || [],
            fieldProjections: entity.fieldProjections || {},
            rateLimit: entity.rateLimit,
            expiresAt: entity.expiresAt,
            lastUsedAt: entity.lastUsedAt,
            totalRequests: Number(entity.totalRequests || 0),
            createdAt: entity.createdAt,
            updatedAt: entity.updatedAt,
        };
    }
}
