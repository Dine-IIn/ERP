import { CreateInventoryMovementDto } from '../dto/create-inventory-movement.dto';
import { InventoryMovementRepository } from '../repositories/inventory-movement.repository';
export declare class InventoryService {
    private readonly movements;
    constructor(movements: InventoryMovementRepository);
    recordMovement(dto: CreateInventoryMovementDto): Promise<import("../entities/inventory-movement.entity").InventoryMovement>;
    recentMovements(companyId: string): Promise<import("../entities/inventory-movement.entity").InventoryMovement[]>;
}
