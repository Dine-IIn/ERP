with open('d:/ERP/Manual ERP/frontend/src/App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix imports
content = content.replace("import GeneralAdmin from './components/GeneralAdmin';", "import GeneralAdmin from './components/admin/GeneralAdmin';")
content = content.replace("import FinanceAccounting from './components/FinanceAccounting';", "import FinanceAccounting from './components/finance/FinanceAccounting';")
content = content.replace("import CustomDashboard from './components/CustomDashboard';", "import CustomDashboard from './components/dashboard/CustomDashboard';")
content = content.replace("import InventoryWarehouse from './components/InventoryWarehouse';", "import InventoryWarehouse from './components/inventory/InventoryWarehouse';")
content = content.replace("import PurchaseProcurement from './components/PurchaseProcurement';", "import PurchaseProcurement from './components/purchase/PurchaseProcurement';")
content = content.replace("import SalesOrder from './components/SalesOrder';", "import SalesOrder from './components/sales/SalesOrder';")
content = content.replace("import ManufacturingProduction from './components/ManufacturingProduction';", "import ManufacturingProduction from './components/manufacturing/ManufacturingProduction';")
content = content.replace("import QualityMaintenance from './components/QualityMaintenance';", "import QualityMaintenance from './components/quality/QualityMaintenance';")
content = content.replace("import GlobalEmailSystem from './components/GlobalEmailSystem';", "import GlobalEmailSystem from './components/email/GlobalEmailSystem';")
content = content.replace("import CrmModule from './components/CrmModule';", "import CrmModule from './components/crm/CrmModule';")
content = content.replace("import HumanResources from './components/HumanResources';", "import HumanResources from './components/hr/HumanResources';")

# Strip sidebar (since it was reverted, the indices or content should still be the same)
start_str = "                  {/* Dynamic Sidebar Modules */}"
end_str = "                </>\n              )}\n            </div>"

start_idx = content.find(start_str)
end_idx = content.find(end_str, start_idx)

if start_idx != -1 and end_idx != -1:
    replacement = '''                  {/* Dynamic Sidebar Modules */}
                  {/* TODO: Implement categories and features one by one here */}
                  <div className="px-3 py-2 mt-4 text-center">
                    <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest border border-dashed border-[var(--border-color)] rounded p-2 block">
                      Empty Navigation
                    </span>
                  </div>
'''
    new_content = content[:start_idx] + replacement + content[end_idx:]
    with open('d:/ERP/Manual ERP/frontend/src/App.tsx', 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("Successfully replaced and imports fixed.")
else:
    print("Failed to find indices for sidebar replacement.")

