import { Controller, Get } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { SalesService } from "./sales.service";

@ApiTags("sales")
@Controller("sales")
export class SalesController {
  constructor(private readonly sales: SalesService) {}

  @Get("orders")
  listOrders() {
    return this.sales.listOrders();
  }

  @Get("dashboard")
  getDashboard() {
    return this.sales.getDashboard();
  }
}
