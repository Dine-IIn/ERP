import { Column, Entity } from 'typeorm';
import { BaseEntity } from '../../../database/base.entity';

@Entity('platform_users')
export class PlatformUser extends BaseEntity {
  @Column({ unique: true })
  email: string;

  @Column({ name: 'password_hash' })
  passwordHash: string;

  @Column()
  role: 'developer' | 'super_admin' | 'support_staff' | 'billing_staff';

  @Column({ default: 'active' })
  status: string;
}
