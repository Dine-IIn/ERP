import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InventoryMovement } from '../entities/inventory-movement.entity';

@Injectable()
export class InventoryMovementRepository {
  constructor(
    @InjectRepository(InventoryMovement)
    private readonly repository: Repository<InventoryMovement>,
  ) {}

  create(movement: Partial<InventoryMovement>) {
    return this.repository.save(this.repository.create(movement));
  }

  findByCompany(companyId: string) {
    return this.repository.find({
      where: { companyId },
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }
}
