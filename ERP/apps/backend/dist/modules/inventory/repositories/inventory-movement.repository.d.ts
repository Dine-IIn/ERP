import { Repository } from 'typeorm';
import { InventoryMovement } from '../entities/inventory-movement.entity';
export declare class InventoryMovementRepository {
    private readonly repository;
    constructor(repository: Repository<InventoryMovement>);
    create(movement: Partial<InventoryMovement>): Promise<InventoryMovement>;
    findByCompany(companyId: string): Promise<InventoryMovement[]>;
}
