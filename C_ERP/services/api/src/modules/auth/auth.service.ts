import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type { AuthUser } from "@nexaerp/shared-types";
import { TenantsService } from "../tenants/tenants.service";
import { LoginDto } from "./auth.dto";

const demoUser: AuthUser = {
  id: "usr_admin",
  email: "admin@nexaerp.local",
  firstName: "Nexa",
  lastName: "Admin",
  role: "super_admin",
  permissions: [
    { module: "dashboard", actions: ["view"] },
    { module: "inventory", actions: ["view", "create", "edit", "delete", "approve"] },
    { module: "sales", actions: ["view", "create", "edit", "delete", "approve"] },
    { module: "reports", actions: ["view"] }
  ]
};

@Injectable()
export class AuthService {
  constructor(
    private readonly jwt: JwtService,
    private readonly tenants: TenantsService
  ) {}

  login(dto: LoginDto) {
    const tenant = this.tenants.findBySlug(dto.tenant);
    const passwordIsValid = dto.password === "NexaERP@123";

    if (dto.email.toLowerCase() !== demoUser.email || !passwordIsValid) {
      throw new UnauthorizedException("Invalid credentials.");
    }

    const accessToken = this.jwt.sign({
      sub: demoUser.id,
      email: demoUser.email,
      tenantId: tenant.id,
      role: demoUser.role
    });

    return {
      accessToken,
      refreshToken: this.jwt.sign({ sub: demoUser.id, tokenType: "refresh" }, { expiresIn: "7d" }),
      user: demoUser,
      company: tenant
    };
  }
}
