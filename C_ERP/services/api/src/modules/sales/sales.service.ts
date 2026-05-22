import { Injectable } from "@nestjs/common";
import type { DashboardMetric, SalesOrderSummary } from "@nexaerp/shared-types";

const orders: SalesOrderSummary[] = [
  { id: "so_1001", orderNumber: "SO-2026-1001", customerName: "Apex Fabricators", status: "approved", orderDate: "2026-05-19", totalAmount: 284500 },
  { id: "so_1002", orderNumber: "SO-2026-1002", customerName: "Northline Automation", status: "pending", orderDate: "2026-05-20", totalAmount: 96500 },
  { id: "so_1003", orderNumber: "SO-2026-1003", customerName: "Veda Engineering", status: "draft", orderDate: "2026-05-20", totalAmount: 41200 }
];

@Injectable()
export class SalesService {
  listOrders(): SalesOrderSummary[] {
    return orders;
  }

  getDashboard(): DashboardMetric[] {
    const revenue = orders.reduce((sum, order) => sum + order.totalAmount, 0);
    return [
      { label: "Open sales value", value: `₹${revenue.toLocaleString("en-IN")}`, trend: "up", helper: "Across active sales orders" },
      { label: "Pending approvals", value: orders.filter((order) => order.status === "pending").length.toString(), trend: "flat", helper: "Awaiting manager action" },
      { label: "Inventory risks", value: "2", trend: "down", helper: "Items near minimum stock" },
      { label: "On-time dispatch", value: "94%", trend: "up", helper: "Last 30 days" }
    ];
  }
}
