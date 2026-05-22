import { BaseEntity } from '../../../database/base.entity';
export declare class PlatformUser extends BaseEntity {
    email: string;
    passwordHash: string;
    role: 'developer' | 'super_admin' | 'support_staff' | 'billing_staff';
    status: string;
}
