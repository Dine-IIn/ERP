import os

components = [
    {
        "name": "InventoryWarehouse",
        "title": "Inventory & Warehouse Management",
        "desc": "Manage your stock levels, warehouse locations, and inventory movements.",
        "icon": "Box"
    },
    {
        "name": "PurchaseProcurement",
        "title": "Purchase & Procurement",
        "desc": "Manage supplier relations, purchase orders, and procurement workflows.",
        "icon": "ShoppingCart"
    },
    {
        "name": "SalesOrder",
        "title": "Sales & Order Management",
        "desc": "Track sales pipelines, customer orders, and distribution logistics.",
        "icon": "TrendingUp"
    },
    {
        "name": "ManufacturingProduction",
        "title": "Manufacturing & Production",
        "desc": "Plan production runs, track bill of materials, and monitor factory output.",
        "icon": "Factory"
    },
    {
        "name": "QualityMaintenance",
        "title": "Quality Management & Maintenance",
        "desc": "Schedule machine maintenance and perform product quality inspections.",
        "icon": "CheckCircle"
    },
    {
        "name": "GlobalEmailSystem",
        "title": "General Email System",
        "desc": "Configure SMTP settings, manage email templates, and view communication logs.",
        "icon": "Mail"
    }
]

template = """import React from 'react';
import {{ {icon} }} from 'lucide-react';

interface Props {{
  user: any;
}}

const {name}: React.FC<Props> = ({{ user }}) => {{
  return (
    <div className="max-w-4xl mx-auto select-none animate-fade-in">
      <div className="flex justify-between items-center border-b border-[var(--border-color)] pb-3 mb-6">
        <h3 className="font-bold text-base text-[var(--text-primary)] flex items-center gap-2 font-display">
          <{icon} className="w-5 h-5 text-indigo-400" />
          {title}
        </h3>
      </div>
      
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-8 text-center flex flex-col items-center justify-center">
        <div className="w-16 h-16 bg-indigo-500/10 text-indigo-500 rounded-full flex items-center justify-center mb-4">
          <{icon} className="w-8 h-8" />
        </div>
        <h4 className="text-lg font-bold text-[var(--text-primary)] mb-2 font-display">Welcome to {title}</h4>
        <p className="text-[var(--text-secondary)] text-sm max-w-md mx-auto">
          {desc} This module is currently active but waiting for data populations. Please configure the sub-features from the super admin panel.
        </p>
      </div>
    </div>
  );
}};

export default {name};
"""

base_path = "components"

for comp in components:
    file_path = os.path.join(base_path, f"{comp['name']}.tsx")
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(template.format(
            name=comp["name"],
            title=comp["title"],
            desc=comp["desc"],
            icon=comp["icon"]
        ))
    print(f"Created {comp['name']}.tsx")
