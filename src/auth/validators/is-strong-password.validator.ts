import {
    registerDecorator,
    ValidationOptions,
    ValidatorConstraint,
    ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'isStrongPassword', async: false })
export class IsStrongPasswordConstraint implements ValidatorConstraintInterface {
    validate(value: unknown): boolean {
        if (typeof value !== 'string' || value.length < 10) return false;
        if (!/[A-Z]/.test(value)) return false;
        if (!/[a-z]/.test(value)) return false;
        if (!/[0-9]/.test(value)) return false;
        if (!/[^A-Za-z0-9]/.test(value)) return false;
        return true;
    }

    defaultMessage(): string {
        return 'Password must be at least 10 chars and contain upper, lower, digit, and symbol';
    }
}

export function IsStrongPassword(options?: ValidationOptions) {
    return (object: object, propertyName: string) => {
        registerDecorator({
            target: object.constructor,
            propertyName,
            options,
            constraints: [],
            validator: IsStrongPasswordConstraint,
        });
    };
}