import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { Permissions } from '../../../common/guards/permissions.decorator';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { CreateInventoryMovementDto } from '../dto/create-inventory-movement.dto';
import { InventoryService } from '../services/inventory.service';

@Controller('inventory')
@UseGuards(PermissionsGuard)
export class InventoryController {
  constructor(private readonly inventory: InventoryService) {}

  @Get('companies/:companyId/movements')
  @Permissions('inventory.view')
  recentMovements(@Param('companyId') companyId: string) {
    return this.inventory.recentMovements(companyId);
  }

  @Post('movements')
  @Permissions('inventory.create')
  recordMovement(@Body() dto: CreateInventoryMovementDto) {
    return this.inventory.recordMovement(dto);
  }
}
