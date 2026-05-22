import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { TenantsModule } from "../tenants/tenants.module";

@Module({
  imports: [
    TenantsModule,
    JwtModule.register({
      secret: process.env.JWT_ACCESS_SECRET ?? "development-only-secret",
      signOptions: { expiresIn: "15m" }
    })
  ],
  controllers: [AuthController],
  providers: [AuthService]
})
export class AuthModule {}
