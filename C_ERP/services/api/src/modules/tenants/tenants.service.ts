import { Injectable, NotFoundException } from "@nestjs/common";
import type { CompanySummary } from "@nexaerp/shared-types";

const companies: CompanySummary[] = [
  {
    id: "cmp_nexa_demo",
    name: "Nexa Industrial Demo",
    slug: "demo",
    email: "admin@nexaerp.local",
    primaryColor: "#2563eb",
    plan: "enterprise",
    isActive: true,
    modules: ["dashboard", "inventory", "sales", "purchase", "warehouse", "manufacturing", "accounts", "hr", "crm", "reports"]
  }
];

@Injectable()
export class TenantsService {
  listCompanies(): CompanySummary[] {
    return companies;
  }

  findBySlug(slug: string): CompanySummary {
    const company = companies.find((item) => item.slug === slug && item.isActive);
    if (!company) {
      throw new NotFoundException("Company tenant was not found or is inactive.");
    }
    return company;
  }
}
