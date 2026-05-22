import { Column, Entity } from 'typeorm';
import { BaseEntity } from '../../../database/base.entity';
import { InventoryMovementType } from '../dto/create-inventory-movement.dto';

@Entity('inventory_movements')
export class InventoryMovement extends BaseEntity {
  @Column({ name: 'company_id', type: 'uuid' })
  companyId: string;

  @Column({ name: 'product_id', type: 'uuid' })
  productId: string;

  @Column({ name: 'warehouse_id', type: 'uuid' })
  warehouseId: string;

  @Column()
  type: InventoryMovementType;

  @Column({ type: 'numeric', precision: 18, scale: 4 })
  quantity: string;

  @Column({ name: 'reference_type', nullable: true })
  referenceType?: string;

  @Column({ name: 'reference_id', type: 'uuid', nullable: true })
  referenceId?: string;
}
