import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AuthModule } from "./auth/auth.module";
import { InventoryModule } from "./inventory/inventory.module";
import { SalesModule } from "./sales/sales.module";
import { TenantsModule } from "./tenants/tenants.module";
import { HealthController } from "../common/health.controller";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TenantsModule,
    AuthModule,
    InventoryModule,
    SalesModule
  ],
  controllers: [HealthController]
})
export class AppModule {}
