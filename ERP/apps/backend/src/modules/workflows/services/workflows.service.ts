import { Injectable } from '@nestjs/common';
import { CreateWorkflowRuleDto } from '../dto/create-workflow-rule.dto';
import { WorkflowRuleRepository } from '../repositories/workflow-rule.repository';

@Injectable()
export class WorkflowsService {
  constructor(private readonly rules: WorkflowRuleRepository) {}

  createRule(dto: CreateWorkflowRuleDto) {
    return this.rules.create({ enabled: true, ...dto });
  }

  findRules(companyId: string) {
    return this.rules.findByCompany(companyId);
  }
}
