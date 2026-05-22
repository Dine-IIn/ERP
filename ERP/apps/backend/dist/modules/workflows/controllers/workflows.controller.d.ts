import { CreateWorkflowRuleDto } from '../dto/create-workflow-rule.dto';
import { WorkflowsService } from '../services/workflows.service';
export declare class WorkflowsController {
    private readonly workflows;
    constructor(workflows: WorkflowsService);
    findRules(companyId: string): Promise<import("../entities/workflow-rule.entity").WorkflowRule[]>;
    createRule(dto: CreateWorkflowRuleDto): Promise<import("../entities/workflow-rule.entity").WorkflowRule>;
}
