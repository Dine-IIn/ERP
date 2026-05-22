import { BaseEntity } from '../../../database/base.entity';
import { InventoryMovementType } from '../dto/create-inventory-movement.dto';
export declare class InventoryMovement extends BaseEntity {
    companyId: string;
    productId: string;
    warehouseId: string;
    type: InventoryMovementType;
    quantity: string;
    referenceType?: string;
    referenceId?: string;
}
