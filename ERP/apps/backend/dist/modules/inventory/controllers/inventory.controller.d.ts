import { CreateInventoryMovementDto } from '../dto/create-inventory-movement.dto';
import { InventoryService } from '../services/inventory.service';
export declare class InventoryController {
    private readonly inventory;
    constructor(inventory: InventoryService);
    recentMovements(companyId: string): Promise<import("../entities/inventory-movement.entity").InventoryMovement[]>;
    recordMovement(dto: CreateInventoryMovementDto): Promise<import("../entities/inventory-movement.entity").InventoryMovement>;
}
