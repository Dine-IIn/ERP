import { Injectable } from "@nestjs/common";
import type { ProductSummary } from "@nexaerp/shared-types";

const products: ProductSummary[] = [
  { id: "prd_steel_plate", code: "RM-STL-PLT-001", name: "Steel Plate 8mm", type: "raw_material", stockOnHand: 1280, reservedQty: 220, salePrice: 0, minStockLevel: 500 },
  { id: "prd_control_panel", code: "FG-CTRL-PNL-100", name: "Industrial Control Panel", type: "finished_good", stockOnHand: 42, reservedQty: 12, salePrice: 18500, minStockLevel: 15 },
  { id: "prd_installation", code: "SRV-INSTALL", name: "On-site Installation", type: "service", stockOnHand: 0, reservedQty: 0, salePrice: 7500, minStockLevel: 0 }
];

@Injectable()
export class InventoryService {
  listProducts(): ProductSummary[] {
    return products;
  }

  getStockRisk() {
    return products
      .filter((product) => product.stockOnHand - product.reservedQty <= product.minStockLevel)
      .map((product) => ({
        ...product,
        availableQty: product.stockOnHand - product.reservedQty
      }));
  }
}
