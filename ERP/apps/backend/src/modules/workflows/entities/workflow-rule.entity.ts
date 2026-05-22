import { Column, Entity } from 'typeorm';
import { BaseEntity } from '../../../database/base.entity';

@Entity('workflow_rules')
export class WorkflowRule extends BaseEntity {
  @Column({ name: 'company_id', type: 'uuid' })
  companyId: string;

  @Column()
  name: string;

  @Column()
  module: string;

  @Column({ type: 'jsonb' })
  trigger: Record<string, unknown>;

  @Column({ type: 'jsonb' })
  actions: Record<string, unknown>[];

  @Column({ default: true })
  enabled: boolean;
}
