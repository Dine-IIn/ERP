import os

file_path = "App.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Imports
imports = """import GeneralAdmin from './components/GeneralAdmin';
import MasterDataManagement from './components/MasterDataManagement';
import FinanceAccounting from './components/FinanceAccounting';
import CustomDashboard from './components/CustomDashboard';
import InventoryWarehouse from './components/InventoryWarehouse';
import PurchaseProcurement from './components/PurchaseProcurement';
import SalesOrder from './components/SalesOrder';
import ManufacturingProduction from './components/ManufacturingProduction';
import QualityMaintenance from './components/QualityMaintenance';
import GlobalEmailSystem from './components/GlobalEmailSystem';"""

old_imports = """import GeneralAdmin from './components/GeneralAdmin';
import MasterDataManagement from './components/MasterDataManagement';
import FinanceAccounting from './components/FinanceAccounting';
import CustomDashboard from './components/CustomDashboard';"""

if "import InventoryWarehouse from './components/InventoryWarehouse';" not in content:
    content = content.replace(old_imports, imports)

# 2. Add icons to Lucide React imports if not there.
# We need: Box, ShoppingCart, TrendingUp, Factory, CheckCircle, Mail (already there), Wrench, Shield
icons_to_add = ["Box", "ShoppingCart", "Factory", "Wrench"]
for icon in icons_to_add:
    if icon not in content:
        content = content.replace("import {", f"import {{\n  {icon},")

# 3. Sidebar UI Injection
# We find:
#                     {/* Category D: Master Data (MDM) */}
#                     {companyFeatures.includes('MDM') && (
#                       ...
#                     )}
# We'll append our new modules right after MDM.
new_sidebar_modules = """
                    {/* Category E: INVENTORY */}
                    {companyFeatures.includes('INVENTORY') && (
                      <div className="flex flex-col mt-1 relative">
                        {sidebarCollapsed ? (
                          <div className="flex justify-center">
                            <button
                              onClick={() => setActiveWorkspaceModule('inventory')}
                              className={`p-2.5 rounded-xl hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer ${activeWorkspaceModule === 'inventory' ? 'bg-orange-500/10 text-orange-500' : 'text-orange-400'}`}
                              title="Inventory & Warehouse"
                            >
                              <Box className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setActiveWorkspaceModule('inventory')}
                            className={`w-full py-2 px-3 rounded-xl text-left text-xs font-bold transition-colors cursor-pointer flex items-center justify-between ${
                              activeWorkspaceModule === 'inventory' ? 'bg-orange-500 text-white shadow-md' : 'text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
                            }`}
                          >
                            <span className="flex items-center gap-2">
                              <Box className="w-4 h-4" />
                              Inventory & Warehouse
                            </span>
                          </button>
                        )}
                      </div>
                    )}

                    {/* Category F: PURCHASE */}
                    {companyFeatures.includes('PURCHASE') && (
                      <div className="flex flex-col mt-1 relative">
                        {sidebarCollapsed ? (
                          <div className="flex justify-center">
                            <button
                              onClick={() => setActiveWorkspaceModule('purchase')}
                              className={`p-2.5 rounded-xl hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer ${activeWorkspaceModule === 'purchase' ? 'bg-teal-500/10 text-teal-500' : 'text-teal-400'}`}
                              title="Purchase & Procurement"
                            >
                              <ShoppingCart className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setActiveWorkspaceModule('purchase')}
                            className={`w-full py-2 px-3 rounded-xl text-left text-xs font-bold transition-colors cursor-pointer flex items-center justify-between ${
                              activeWorkspaceModule === 'purchase' ? 'bg-teal-500 text-white shadow-md' : 'text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
                            }`}
                          >
                            <span className="flex items-center gap-2">
                              <ShoppingCart className="w-4 h-4" />
                              Purchase & Procurement
                            </span>
                          </button>
                        )}
                      </div>
                    )}

                    {/* Category G: SALES */}
                    {companyFeatures.includes('SALES') && (
                      <div className="flex flex-col mt-1 relative">
                        {sidebarCollapsed ? (
                          <div className="flex justify-center">
                            <button
                              onClick={() => setActiveWorkspaceModule('sales')}
                              className={`p-2.5 rounded-xl hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer ${activeWorkspaceModule === 'sales' ? 'bg-blue-500/10 text-blue-500' : 'text-blue-400'}`}
                              title="Sales & Orders"
                            >
                              <TrendingUp className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setActiveWorkspaceModule('sales')}
                            className={`w-full py-2 px-3 rounded-xl text-left text-xs font-bold transition-colors cursor-pointer flex items-center justify-between ${
                              activeWorkspaceModule === 'sales' ? 'bg-blue-500 text-white shadow-md' : 'text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
                            }`}
                          >
                            <span className="flex items-center gap-2">
                              <TrendingUp className="w-4 h-4" />
                              Sales & Orders
                            </span>
                          </button>
                        )}
                      </div>
                    )}

                    {/* Category H: MANUFACTURING */}
                    {companyFeatures.includes('MANUFACTURING') && (
                      <div className="flex flex-col mt-1 relative">
                        {sidebarCollapsed ? (
                          <div className="flex justify-center">
                            <button
                              onClick={() => setActiveWorkspaceModule('manufacturing')}
                              className={`p-2.5 rounded-xl hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer ${activeWorkspaceModule === 'manufacturing' ? 'bg-rose-500/10 text-rose-500' : 'text-rose-400'}`}
                              title="Manufacturing & Production"
                            >
                              <Factory className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setActiveWorkspaceModule('manufacturing')}
                            className={`w-full py-2 px-3 rounded-xl text-left text-xs font-bold transition-colors cursor-pointer flex items-center justify-between ${
                              activeWorkspaceModule === 'manufacturing' ? 'bg-rose-500 text-white shadow-md' : 'text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
                            }`}
                          >
                            <span className="flex items-center gap-2">
                              <Factory className="w-4 h-4" />
                              Manufacturing
                            </span>
                          </button>
                        )}
                      </div>
                    )}

                    {/* Category I: QUALITY */}
                    {companyFeatures.includes('QUALITY') && (
                      <div className="flex flex-col mt-1 relative">
                        {sidebarCollapsed ? (
                          <div className="flex justify-center">
                            <button
                              onClick={() => setActiveWorkspaceModule('quality')}
                              className={`p-2.5 rounded-xl hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer ${activeWorkspaceModule === 'quality' ? 'bg-emerald-500/10 text-emerald-500' : 'text-emerald-400'}`}
                              title="Quality & Maintenance"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setActiveWorkspaceModule('quality')}
                            className={`w-full py-2 px-3 rounded-xl text-left text-xs font-bold transition-colors cursor-pointer flex items-center justify-between ${
                              activeWorkspaceModule === 'quality' ? 'bg-emerald-500 text-white shadow-md' : 'text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
                            }`}
                          >
                            <span className="flex items-center gap-2">
                              <CheckCircle className="w-4 h-4" />
                              Quality & Maintenance
                            </span>
                          </button>
                        )}
                      </div>
                    )}

                    {/* Category J: EMAIL */}
                    {companyFeatures.includes('EMAIL') && (
                      <div className="flex flex-col mt-1 relative">
                        {sidebarCollapsed ? (
                          <div className="flex justify-center">
                            <button
                              onClick={() => setActiveWorkspaceModule('email')}
                              className={`p-2.5 rounded-xl hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer ${activeWorkspaceModule === 'email' ? 'bg-pink-500/10 text-pink-500' : 'text-pink-400'}`}
                              title="Global Email System"
                            >
                              <Mail className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setActiveWorkspaceModule('email')}
                            className={`w-full py-2 px-3 rounded-xl text-left text-xs font-bold transition-colors cursor-pointer flex items-center justify-between ${
                              activeWorkspaceModule === 'email' ? 'bg-pink-500 text-white shadow-md' : 'text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
                            }`}
                          >
                            <span className="flex items-center gap-2">
                              <Mail className="w-4 h-4" />
                              Global Email System
                            </span>
                          </button>
                        )}
                      </div>
                    )}
"""

mdm_sidebar = """                          </>
                        )}
                      </div>
                    )}"""

if "{companyFeatures.includes('INVENTORY')" not in content:
    # There might be multiple matches of mdm_sidebar (end blocks of conditional JSX), we need to safely target the MDM block.
    # MDM block ends right before Admin or Notification blocks. Let's find: `activeWorkspaceModule === 'general_admin'`.
    # Wait, the `Master Data (MDM)` is marked by `{/* Category D: Master Data (MDM) */}`
    
    content = content.replace("                    {/* Category Z: Admin Settings (Only if Admin feature mapped) */}", new_sidebar_modules + "\n                    {/* Category Z: Admin Settings (Only if Admin feature mapped) */}")


# 4. Content Routing Rendering
# Add the conditions to render the components.
new_content_renders = """
              {activeWorkspaceModule === 'inventory' && !selectedCompany && (
                <InventoryWarehouse user={user} />
              )}
              {activeWorkspaceModule === 'purchase' && !selectedCompany && (
                <PurchaseProcurement user={user} />
              )}
              {activeWorkspaceModule === 'sales' && !selectedCompany && (
                <SalesOrder user={user} />
              )}
              {activeWorkspaceModule === 'manufacturing' && !selectedCompany && (
                <ManufacturingProduction user={user} />
              )}
              {activeWorkspaceModule === 'quality' && !selectedCompany && (
                <QualityMaintenance user={user} />
              )}
              {activeWorkspaceModule === 'email' && !selectedCompany && (
                <GlobalEmailSystem user={user} />
              )}
"""

if "activeWorkspaceModule === 'inventory'" not in content:
    content = content.replace("              {activeWorkspaceModule === 'alerts' && !selectedCompany && (", new_content_renders + "\n              {activeWorkspaceModule === 'alerts' && !selectedCompany && (")


with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("App.tsx routing updated.")
