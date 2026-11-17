// src/common/decorators/api-ok-response.decorator.ts
import { applyDecorators, Type } from '@nestjs/common';
import { ApiOkResponse, ApiExtraModels, getSchemaPath } from '@nestjs/swagger';

export const ApiOkEnvelope = <T extends Type>(dataType: T, message = 'OK') =>
    applyDecorators(
        ApiExtraModels(dataType),
        ApiOkResponse({
            schema: {
                type: 'object',
                properties: {
                    success: { type: 'boolean', example: true },
                    statusCode: { type: 'number', example: 200 },
                    message: { type: 'string', example: message },
                    data: { $ref: getSchemaPath(dataType) },
                    meta: {
                        type: 'object',
                        properties: {
                            timestamp: { type: 'string' },
                            path: { type: 'string' },
                            requestId: { type: 'string' },
                            durationMs: { type: 'number' },
                        },
                    },
                },
            },
        }),
    );