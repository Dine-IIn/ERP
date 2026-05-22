import { Column, Entity } from 'typeorm';
import { BaseEntity } from '../../../database/base.entity';

@Entity('companies')
export class Company extends BaseEntity {
  @Column({ name: 'legal_name' })
  legalName: string;

  @Column({ name: 'display_name' })
  displayName: string;

  @Column({ unique: true })
  slug: string;

  @Column({ name: 'database_name', unique: true })
  databaseName: string;

  @Column({ default: 'active' })
  status: string;

  @Column({ type: 'jsonb', default: {} })
  branding: Record<string, unknown>;

  @Column({ name: 'feature_flags', type: 'jsonb', default: {} })
  featureFlags: Record<string, boolean>;

  @Column({ type: 'jsonb', default: {} })
  license: Record<string, unknown>;

  @Column({ name: 'deployment_config', type: 'jsonb', default: {} })
  deploymentConfig: Record<string, unknown>;
}
