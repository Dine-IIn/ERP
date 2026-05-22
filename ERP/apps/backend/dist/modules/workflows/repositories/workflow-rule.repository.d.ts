import { Repository } from 'typeorm';
import { WorkflowRule } from '../entities/workflow-rule.entity';
export declare class WorkflowRuleRepository {
    private readonly repository;
    constructor(repository: Repository<WorkflowRule>);
    create(rule: Partial<WorkflowRule>): Promise<WorkflowRule>;
    findByCompany(companyId: string): Promise<WorkflowRule[]>;
}
