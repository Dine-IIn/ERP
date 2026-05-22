export type InventoryMovementType = 'purchase' | 'sale' | 'return' | 'damage' | 'transfer' | 'adjustment' | 'manufacturing';
export declare class CreateInventoryMovementDto {
    companyId: string;
    productId: string;
    warehouseId: string;
    type: InventoryMovementType;
    quantity: string;
}
