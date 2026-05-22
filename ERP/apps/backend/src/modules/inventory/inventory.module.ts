import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventoryController } from './controllers/inventory.controller';
import { InventoryMovement } from './entities/inventory-movement.entity';
import { InventoryMovementRepository } from './repositories/inventory-movement.repository';
import { InventoryService } from './services/inventory.service';

@Module({
  imports: [TypeOrmModule.forFeature([InventoryMovement])],
  controllers: [InventoryController],
  providers: [InventoryService, InventoryMovementRepository],
})
export class InventoryModule {}
