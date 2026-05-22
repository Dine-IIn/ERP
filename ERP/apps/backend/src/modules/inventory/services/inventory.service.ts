import { Injectable } from '@nestjs/common';
import { CreateInventoryMovementDto } from '../dto/create-inventory-movement.dto';
import { InventoryMovementRepository } from '../repositories/inventory-movement.repository';

@Injectable()
export class InventoryService {
  constructor(private readonly movements: InventoryMovementRepository) {}

  recordMovement(dto: CreateInventoryMovementDto) {
    return this.movements.create(dto);
  }

  recentMovements(companyId: string) {
    return this.movements.findByCompany(companyId);
  }
}
