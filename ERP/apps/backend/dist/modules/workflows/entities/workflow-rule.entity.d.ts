import { BaseEntity } from '../../../database/base.entity';
export declare class WorkflowRule extends BaseEntity {
    companyId: string;
    name: string;
    module: string;
    trigger: Record<string, unknown>;
    actions: Record<string, unknown>[];
    enabled: boolean;
}
