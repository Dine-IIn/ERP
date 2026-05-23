import os
import re

app_tsx_path = r"d:\ERP\Manual ERP\frontend\src\App.tsx"

with open(app_tsx_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Insert useState
if "const [activeWorkspaceSubModule, setActiveWorkspaceSubModule] = useState<string>('');" not in content:
    content = content.replace(
        "const [activeWorkspaceModule, setActiveWorkspaceModule] = useState<string>('dashboard');",
        "const [activeWorkspaceModule, setActiveWorkspaceModule] = useState<string>('dashboard');\n  const [activeWorkspaceSubModule, setActiveWorkspaceSubModule] = useState<string>('');"
    )

# 2. Update components
components = ['InventoryWarehouse', 'PurchaseProcurement', 'SalesOrder', 'ManufacturingProduction', 'QualityMaintenance', 'GlobalEmailSystem']
for comp in components:
    content = re.sub(fr'<{comp}\s+user={{user!}}\s+activeTab={{[^}}]+}}\s*/>', f'<{comp} user={{user!}} />', content)
    content = re.sub(fr'<{comp}\s+user={{user!}}\s*/>', f'<{comp} user={{user!}} activeTab={{activeWorkspaceSubModule}} />', content)

# 3. Re-write the sidebar
start_marker = "{/* Category: INVENTORY */}"
end_marker = "{/* Category E: System Administration (Admin Role Only) */}"

dynamic_sidebar = """{/* Dynamic Sidebar Modules */}
                  {['INVENTORY', 'PURCHASE', 'SALES', 'MANUFACTURING', 'QUALITY', 'EMAIL'].map((modKey) => {
                    if (!companyFeatures.includes(modKey)) return null;
                    const catData = MASTER_FEATURES_HIERARCHY.find(c => c.key === modKey);
                    if (!catData) return null;
                    
                    const moduleKeyMap: Record<string, string> = {
                        'INVENTORY': 'inventory',
                        'PURCHASE': 'purchase',
                        'SALES': 'sales',
                        'MANUFACTURING': 'manufacturing',
                        'QUALITY': 'quality',
                        'EMAIL': 'email'
                    };
                    const mKey = moduleKeyMap[modKey];
                    
                    const iconMap: Record<string, any> = {
                        'INVENTORY': Box,
                        'PURCHASE': ShoppingCart,
                        'SALES': Tag,
                        'MANUFACTURING': Factory,
                        'QUALITY': Shield,
                        'EMAIL': Mail
                    };
                    const Icon = iconMap[modKey] || Folder;
                    
                    // Tailwind requires full class names
                    const colors: Record<string, any> = {
                        'INVENTORY': { text: 'text-blue-400', bgHover: 'bg-blue-500/10', textHover: 'text-blue-500', activeBg: 'bg-blue-500/5' },
                        'PURCHASE': { text: 'text-teal-400', bgHover: 'bg-teal-500/10', textHover: 'text-teal-500', activeBg: 'bg-teal-500/5' },
                        'SALES': { text: 'text-pink-400', bgHover: 'bg-pink-500/10', textHover: 'text-pink-500', activeBg: 'bg-pink-500/5' },
                        'MANUFACTURING': { text: 'text-orange-400', bgHover: 'bg-orange-500/10', textHover: 'text-orange-500', activeBg: 'bg-orange-500/5' },
                        'QUALITY': { text: 'text-rose-400', bgHover: 'bg-rose-500/10', textHover: 'text-rose-500', activeBg: 'bg-rose-500/5' },
                        'EMAIL': { text: 'text-amber-400', bgHover: 'bg-amber-500/10', textHover: 'text-amber-500', activeBg: 'bg-amber-500/5' }
                    };
                    const theme = colors[modKey];

                    return (
                    <div key={modKey} className="flex flex-col mt-1 relative">
                      {sidebarCollapsed ? (
                        <div className="flex justify-center">
                          <button
                            onClick={() => setActivePopoverCategory(activePopoverCategory === mKey ? null : mKey)}
                            className={`p-2.5 rounded-xl hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer ${activeWorkspaceModule === mKey ? `${theme.bgHover} ${theme.textHover}` : theme.text}`}
                            title={catData.name}
                          >
                            <Icon className="w-4 h-4" />
                          </button>
                          {activePopoverCategory === mKey && (
                            <div className="absolute left-14 top-0 z-50 w-52 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl shadow-2xl p-2 animate-scale-up text-left flex flex-col gap-1 max-h-[360px] overflow-y-auto">
                              <span className="text-[9px] font-bold text-[var(--text-muted)] tracking-widest uppercase px-2 block mb-1">{catData.name}</span>
                              {catData.children.map((child: any) => {
                                if (!companyFeatures.includes(child.key)) return null;
                                const isActive = activeWorkspaceModule === mKey && activeWorkspaceSubModule === child.key;
                                return (
                                  <button
                                    key={child.key}
                                    onClick={() => { setActiveWorkspaceModule(mKey); setActiveWorkspaceSubModule(child.key); setActivePopoverCategory(null); }}
                                    className={`w-full py-1.5 px-2 rounded-md text-left text-[11px] font-semibold transition-colors flex items-center gap-2 ${isActive ? `${theme.textHover} font-bold ${theme.activeBg}` : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                                  >
                                    <Folder className="w-3.5 h-3.5" /> <span>{child.name}</span>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={() => toggleSidebarCategory(mKey)}
                            className="w-full py-2 px-3 rounded-lg text-left text-xs font-bold text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] flex items-center justify-between transition-colors cursor-pointer"
                          >
                            <span className="flex items-center gap-2">
                              <Icon className={`w-4 h-4 ${theme.text}`} style={{ flexShrink: 0 }} />
                              <span>{catData.name}</span>
                            </span>
                            {expandedCategories[mKey] ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                          </button>
                          
                          {expandedCategories[mKey] && (
                            <div className="pl-6 flex flex-col gap-1 mt-1 border-l border-[var(--border-color)] ml-4">
                              {catData.children.map((child: any) => {
                                if (!companyFeatures.includes(child.key)) return null;
                                const isActive = activeWorkspaceModule === mKey && activeWorkspaceSubModule === child.key;
                                return (
                                  <button
                                    key={child.key}
                                    onClick={() => { setActiveWorkspaceModule(mKey); setActiveWorkspaceSubModule(child.key); }}
                                    className={`w-full py-1.5 px-3 rounded-md text-left text-[11px] font-semibold transition-colors flex items-center gap-2 ${isActive ? `${theme.textHover} font-bold ${theme.activeBg}` : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                                  >
                                    <Folder className="w-3.5 h-3.5" style={{ flexShrink: 0 }} />
                                    <span>{child.name}</span>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  );
                  })}

                  """

start_idx = content.find(start_marker)
end_idx = content.find(end_marker)

if start_idx != -1 and end_idx != -1:
    new_content = content[:start_idx] + dynamic_sidebar + content[end_idx:]
    with open(app_tsx_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("Sidebar updated successfully.")
else:
    print("Could not find markers.")
