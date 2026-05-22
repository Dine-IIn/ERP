import { Controller, Get } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { InventoryService } from "./inventory.service";

@ApiTags("inventory")
@Controller("inventory")
export class InventoryController {
  constructor(private readonly inventory: InventoryService) {}

  @Get("products")
  listProducts() {
    return this.inventory.listProducts();
  }

  @Get("stock-risk")
  getStockRisk() {
    return this.inventory.getStockRisk();
  }
}
