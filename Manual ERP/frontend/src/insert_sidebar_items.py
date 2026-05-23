import json

hierarchy = [
  {
    "key": "INVENTORY",
    "id": "inventory",
    "name": "Inventory & Warehouse",
    "icon": "Box",
    "color": "blue",
    "children": [
      { "name": "Real-time stock tracking" },
      { "name": "Multi-warehouse support" },
      { "name": "Stock transfers" },
      { "name": "Stock ledger" }
    ]
  },
  {
    "key": "PURCHASE",
    "id": "purchase",
    "name": "Purchase & Procurement",
    "icon": "ShoppingCart",
    "color": "teal",
    "children": [
      { "name": "Vendor management" },
      { "name": "Purchase requisitions" },
      { "name": "Purchase orders" },
      { "name": "Vendor quotations" }
    ]
  },
  {
    "key": "SALES",
    "id": "sales",
    "name": "Sales & Order Management",
    "icon": "Tag",
    "color": "pink",
    "children": [
      { "name": "Quotations" },
      { "name": "Sales orders" },
      { "name": "Invoice generation" },
      { "name": "Returns/refunds" }
    ]
  },
  {
    "key": "MANUFACTURING",
    "id": "manufacturing",
    "name": "Manufacturing / Production",
    "icon": "Factory",
    "color": "orange",
    "children": [
      { "name": "BOM (Bill of Materials)" },
      { "name": "Production orders" },
      { "name": "Work orders" },
      { "name": "Machine allocation" }
    ]
  },
  {
    "key": "QUALITY",
    "id": "quality",
    "name": "Quality & Maintenance",
    "icon": "Shield",
    "color": "rose",
    "children": [
      { "name": "Quality inspections" },
      { "name": "Defect tracking" },
      { "name": "Preventive maintenance" },
      { "name": "Breakdown logging" }
    ]
  },
  {
    "key": "EMAIL",
    "id": "email",
    "name": "Global Email System",
    "icon": "Mail",
    "color": "violet",
    "children": [
      { "name": "SMTP configuration" },
      { "name": "Email templates" },
      { "name": "Email logs/history" },
      { "name": "Email queue system" }
    ]
  }
]

components = ""
for cat in hierarchy:
    color = cat["color"]
    key = cat["key"]
    id_ = cat["id"]
    name = cat["name"]
    icon = cat["icon"]
    
    children_html = ""
    for child in cat["children"]:
        children_html += f"""
                              <button
                                onClick={{() => setActiveWorkspaceModule('{id_}')}}
                                className={{`w-full py-1.5 px-3 rounded-md text-left text-[11px] font-semibold transition-colors flex items-center gap-2 ${{activeWorkspaceModule === '{id_}' ? 'text-{color}-400 font-bold bg-{color}-500/5' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}}`}}
                              >
                                <Folder className="w-3.5 h-3.5" style={{ flexShrink: 0 }} />
                                <span>{child["name"]}</span>
                              </button>"""

    children_popover_html = ""
    for child in cat["children"]:
        children_popover_html += f"""
                              <button
                                onClick={{() => {{ setActiveWorkspaceModule('{id_}'); setActivePopoverCategory(null); }}}}
                                className="w-full py-1.5 px-2 rounded-md text-left text-[11px] font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors flex items-center gap-2"
                              >
                                <Folder className="w-3.5 h-3.5" /> <span>{child["name"]}</span>
                              </button>"""

    block = f"""
                  {{/* Category: {key} */}}
                  {{companyFeatures.includes('{key}') && (
                    <div className="flex flex-col mt-1 relative">
                      {{sidebarCollapsed ? (
                        <div className="flex justify-center">
                          <button
                            onClick={{() => setActivePopoverCategory(activePopoverCategory === '{id_}' ? null : '{id_}')}}
                            className={{`p-2.5 rounded-xl hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer ${{activeWorkspaceModule === '{id_}' ? 'bg-{color}-500/10 text-{color}-500' : 'text-{color}-400'}}`}}
                            title="{name}"
                          >
                            <{icon} className="w-4 h-4" />
                          </button>
                          {{activePopoverCategory === '{id_}' && (
                            <div className="absolute left-14 top-0 z-50 w-52 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl shadow-2xl p-2 animate-scale-up text-left flex flex-col gap-1 max-h-[360px] overflow-y-auto">
                              <span className="text-[9px] font-bold text-[var(--text-muted)] tracking-widest uppercase px-2 block mb-1">{name}</span>{children_popover_html}
                            </div>
                          )}}
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={{() => toggleSidebarCategory('{id_}')}}
                            className="w-full py-2 px-3 rounded-lg text-left text-xs font-bold text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] flex items-center justify-between transition-colors cursor-pointer"
                          >
                            <span className="flex items-center gap-2">
                              <{icon} className="w-4 h-4 text-{color}-400" style={{{{ flexShrink: 0 }}}} />
                              <span>{name}</span>
                            </span>
                            {{expandedCategories.{id_} ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}}
                          </button>
                          
                          {{expandedCategories.{id_} && (
                            <div className="pl-6 flex flex-col gap-1 mt-1 border-l border-[var(--border-color)] ml-4">{children_html}
                            </div>
                          )}}
                        </>
                      )}}
                    </div>
                  )}}
"""
    components += block

with open("d:\\ERP\\Manual ERP\\frontend\\src\\App.tsx", "r", encoding="utf-8") as f:
    content = f.read()

target = "{/* Category E: System Administration (Admin Role Only) */}"
if target in content:
    new_content = content.replace(target, components + "\n                  " + target)
    with open("d:\\ERP\\Manual ERP\\frontend\\src\\App.tsx", "w", encoding="utf-8") as f:
        f.write(new_content)
    print("Successfully inserted sidebar items.")
else:
    print("Target not found.")
