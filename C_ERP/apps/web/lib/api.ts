import type { CompanySummary, DashboardMetric, ProductSummary, SalesOrderSummary } from "@nexaerp/shared-types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

async function getJson<T>(path: string, fallback: T): Promise<T> {
  try {
    const response = await fetch(`${API_URL}/api/v1${path}`, { next: { revalidate: 15 } });
    if (!response.ok) {
      return fallback;
    }
    return (await response.json()) as T;
  } catch {
    return fallback;
  }
}

export async function getDashboardMetrics() {
  const fallback: DashboardMetric[] = [
    { label: "Open sales value", value: "₹4,22,200", trend: "up", helper: "Across active sales orders" },
    { label: "Pending approvals", value: "1", trend: "flat", helper: "Awaiting manager action" },
    { label: "Inventory risks", value: "2", trend: "down", helper: "Items near minimum stock" },
    { label: "On-time dispatch", value: "94%", trend: "up", helper: "Last 30 days" }
  ];
  return getJson<DashboardMetric[]>("/sales/dashboard", fallback);
}

export async function getProducts() {
  const fallback: ProductSummary[] = [
    { id: "prd_steel_plate", code: "RM-STL-PLT-001", name: "Steel Plate 8mm", type: "raw_material", stockOnHand: 1280, reservedQty: 220, salePrice: 0, minStockLevel: 500 },
    { id: "prd_control_panel", code: "FG-CTRL-PNL-100", name: "Industrial Control Panel", type: "finished_good", stockOnHand: 42, reservedQty: 12, salePrice: 18500, minStockLevel: 15 }
  ];
  return getJson<ProductSummary[]>("/inventory/products", fallback);
}

export async function getSalesOrders() {
  const fallback: SalesOrderSummary[] = [
    { id: "so_1001", orderNumber: "SO-2026-1001", customerName: "Apex Fabricators", status: "approved", orderDate: "2026-05-19", totalAmount: 284500 },
    { id: "so_1002", orderNumber: "SO-2026-1002", customerName: "Northline Automation", status: "pending", orderDate: "2026-05-20", totalAmount: 96500 }
  ];
  return getJson<SalesOrderSummary[]>("/sales/orders", fallback);
}

export async function getCompany() {
  const fallback: CompanySummary = {
    id: "cmp_nexa_demo",
    name: "Nexa Industrial Demo",
    slug: "demo",
    email: "admin@nexaerp.local",
    primaryColor: "#2563eb",
    plan: "enterprise",
    isActive: true,
    modules: ["dashboard", "inventory", "sales", "purchase", "warehouse", "manufacturing", "accounts", "hr", "crm", "reports"]
  };
  return getJson<CompanySummary>("/tenants/demo", fallback);
}
