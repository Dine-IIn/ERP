import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkflowRule } from '../entities/workflow-rule.entity';

@Injectable()
export class WorkflowRuleRepository {
  constructor(
    @InjectRepository(WorkflowRule)
    private readonly repository: Repository<WorkflowRule>,
  ) {}

  create(rule: Partial<WorkflowRule>) {
    return this.repository.save(this.repository.create(rule));
  }

  findByCompany(companyId: string) {
    return this.repository.find({ where: { companyId }, order: { createdAt: 'DESC' } });
  }
}
