import { BaseEntity } from '../../../database/base.entity';
export declare class Company extends BaseEntity {
    legalName: string;
    displayName: string;
    slug: string;
    databaseName: string;
    status: string;
    branding: Record<string, unknown>;
    featureFlags: Record<string, boolean>;
    license: Record<string, unknown>;
    deploymentConfig: Record<string, unknown>;
}
