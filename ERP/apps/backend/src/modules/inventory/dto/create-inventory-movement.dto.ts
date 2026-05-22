import { IsIn, IsNotEmpty, IsNumberString, IsUUID } from 'class-validator';

export type InventoryMovementType =
  | 'purchase'
  | 'sale'
  | 'return'
  | 'damage'
  | 'transfer'
  | 'adjustment'
  | 'manufacturing';

export class CreateInventoryMovementDto {
  @IsUUID()
  companyId: string;

  @IsUUID()
  productId: string;

  @IsUUID()
  warehouseId: string;

  @IsIn(['purchase', 'sale', 'return', 'damage', 'transfer', 'adjustment', 'manufacturing'])
  type: InventoryMovementType;

  @IsNumberString()
  @IsNotEmpty()
  quantity: string;
}
