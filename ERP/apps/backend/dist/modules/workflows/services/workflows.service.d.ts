import { CreateWorkflowRuleDto } from '../dto/create-workflow-rule.dto';
import { WorkflowRuleRepository } from '../repositories/workflow-rule.repository';
export declare class WorkflowsService {
    private readonly rules;
    constructor(rules: WorkflowRuleRepository);
    createRule(dto: CreateWorkflowRuleDto): Promise<import("../entities/workflow-rule.entity").WorkflowRule>;
    findRules(companyId: string): Promise<import("../entities/workflow-rule.entity").WorkflowRule[]>;
}
