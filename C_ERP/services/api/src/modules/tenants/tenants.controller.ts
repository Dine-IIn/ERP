import { Controller, Get, Param } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { TenantsService } from "./tenants.service";

@ApiTags("tenants")
@Controller("tenants")
export class TenantsController {
  constructor(private readonly tenants: TenantsService) {}

  @Get()
  listCompanies() {
    return this.tenants.listCompanies();
  }

  @Get(":slug")
  getCompany(@Param("slug") slug: string) {
    return this.tenants.findBySlug(slug);
  }
}
