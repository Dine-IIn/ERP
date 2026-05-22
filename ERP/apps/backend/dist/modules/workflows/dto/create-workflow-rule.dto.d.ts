export declare class CreateWorkflowRuleDto {
    companyId: string;
    name: string;
    module: string;
    trigger: Record<string, unknown>;
    actions: Record<string, unknown>[];
    enabled?: boolean;
}
