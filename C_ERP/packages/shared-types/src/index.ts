export type PlanKey = "starter" | "growth" | "enterprise";

export type ModuleKey =
  | "dashboard"
  | "inventory"
  | "sales"
  | "purchase"
  | "warehouse"
  | "manufacturing"
  | "accounts"
  | "hr"
  | "crm"
  | "reports";

export type PermissionAction = "view" | "create" | "edit" | "delete" | "approve";

export interface CompanySummary {
  id: string;
  name: string;
  slug: string;
  email: string;
  primaryColor: string;
  plan: PlanKey;
  isActive: boolean;
  modules: ModuleKey[];
}

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  permissions: Array<{
    module: ModuleKey;
    actions: PermissionAction[];
  }>;
}

export interface ProductSummary {
  id: string;
  code: string;
  name: string;
  type: "physical" | "service" | "raw_material" | "finished_good" | "consumable" | "digital";
  stockOnHand: number;
  reservedQty: number;
  salePrice: number;
  minStockLevel: number;
}

export interface SalesOrderSummary {
  id: string;
  orderNumber: string;
  customerName: string;
  status: "draft" | "pending" | "approved" | "rejected" | "completed" | "cancelled";
  orderDate: string;
  totalAmount: number;
}

export interface DashboardMetric {
  label: string;
  value: string;
  trend: "up" | "down" | "flat";
  helper: string;
}
