import os
import re

app_tsx_path = r"d:\ERP\Manual ERP\frontend\src\App.tsx"

with open(app_tsx_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update the dynamic mapping list
old_array = "['INVENTORY', 'PURCHASE', 'SALES', 'MANUFACTURING', 'QUALITY', 'EMAIL', 'CRM', 'HR']"
new_array = "['MDM', 'FINANCE', 'INVENTORY', 'PURCHASE', 'SALES', 'MANUFACTURING', 'QUALITY', 'EMAIL', 'CRM', 'HR']"
content = content.replace(old_array, new_array)

# 2. Update maps
module_map_old = """const moduleKeyMap: Record<string, string> = {
                          'INVENTORY': 'inventory',
                          'PURCHASE': 'purchase',
                          'SALES': 'sales',
                          'MANUFACTURING': 'manufacturing',
                          'QUALITY': 'quality',
                          'EMAIL': 'email',
                          'CRM': 'crm',
                          'HR': 'hr'
                      };"""
module_map_new = """const moduleKeyMap: Record<string, string> = {
                          'INVENTORY': 'inventory',
                          'PURCHASE': 'purchase',
                          'SALES': 'sales',
                          'MANUFACTURING': 'manufacturing',
                          'QUALITY': 'quality',
                          'EMAIL': 'email',
                          'CRM': 'crm',
                          'HR': 'hr',
                          'FINANCE': 'finance',
                          'MDM': 'master_data'
                      };"""
content = content.replace(module_map_old, module_map_new)

icon_map_old = """const iconMap: Record<string, any> = {
                          'INVENTORY': Box,
                          'PURCHASE': ShoppingCart,
                          'SALES': Tag,
                          'MANUFACTURING': Factory,
                          'QUALITY': Shield,
                          'EMAIL': Mail,
                          'CRM': MessageSquare,
                          'HR': Users
                      };"""
icon_map_new = """const iconMap: Record<string, any> = {
                          'INVENTORY': Box,
                          'PURCHASE': ShoppingCart,
                          'SALES': Tag,
                          'MANUFACTURING': Factory,
                          'QUALITY': Shield,
                          'EMAIL': Mail,
                          'CRM': MessageSquare,
                          'HR': Users,
                          'FINANCE': BarChart3,
                          'MDM': Layers
                      };"""
content = content.replace(icon_map_old, icon_map_new)

colors_map_old = """const colors: Record<string, any> = {
                        'INVENTORY': { text: 'text-blue-400', bgHover: 'bg-blue-500/10', textHover: 'text-blue-500', activeBg: 'bg-blue-500/5' },
                        'PURCHASE': { text: 'text-teal-400', bgHover: 'bg-teal-500/10', textHover: 'text-teal-500', activeBg: 'bg-teal-500/5' },
                        'SALES': { text: 'text-pink-400', bgHover: 'bg-pink-500/10', textHover: 'text-pink-500', activeBg: 'bg-pink-500/5' },
                        'MANUFACTURING': { text: 'text-orange-400', bgHover: 'bg-orange-500/10', textHover: 'text-orange-500', activeBg: 'bg-orange-500/5' },
                        'QUALITY': { text: 'text-rose-400', bgHover: 'bg-rose-500/10', textHover: 'text-rose-500', activeBg: 'bg-rose-500/5' },
                        'EMAIL': { text: 'text-amber-400', bgHover: 'bg-amber-500/10', textHover: 'text-amber-500', activeBg: 'bg-amber-500/5' },
                        'CRM': { text: 'text-purple-400', bgHover: 'bg-purple-500/10', textHover: 'text-purple-500', activeBg: 'bg-purple-500/5' },
                        'HR': { text: 'text-cyan-400', bgHover: 'bg-cyan-500/10', textHover: 'text-cyan-500', activeBg: 'bg-cyan-500/5' }
                    };"""
colors_map_new = """const colors: Record<string, any> = {
                        'INVENTORY': { text: 'text-blue-400', bgHover: 'bg-blue-500/10', textHover: 'text-blue-500', activeBg: 'bg-blue-500/5' },
                        'PURCHASE': { text: 'text-teal-400', bgHover: 'bg-teal-500/10', textHover: 'text-teal-500', activeBg: 'bg-teal-500/5' },
                        'SALES': { text: 'text-pink-400', bgHover: 'bg-pink-500/10', textHover: 'text-pink-500', activeBg: 'bg-pink-500/5' },
                        'MANUFACTURING': { text: 'text-orange-400', bgHover: 'bg-orange-500/10', textHover: 'text-orange-500', activeBg: 'bg-orange-500/5' },
                        'QUALITY': { text: 'text-rose-400', bgHover: 'bg-rose-500/10', textHover: 'text-rose-500', activeBg: 'bg-rose-500/5' },
                        'EMAIL': { text: 'text-amber-400', bgHover: 'bg-amber-500/10', textHover: 'text-amber-500', activeBg: 'bg-amber-500/5' },
                        'CRM': { text: 'text-purple-400', bgHover: 'bg-purple-500/10', textHover: 'text-purple-500', activeBg: 'bg-purple-500/5' },
                        'HR': { text: 'text-cyan-400', bgHover: 'bg-cyan-500/10', textHover: 'text-cyan-500', activeBg: 'bg-cyan-500/5' },
                        'FINANCE': { text: 'text-emerald-400', bgHover: 'bg-emerald-500/10', textHover: 'text-emerald-500', activeBg: 'bg-emerald-500/5' },
                        'MDM': { text: 'text-indigo-400', bgHover: 'bg-indigo-500/10', textHover: 'text-indigo-500', activeBg: 'bg-indigo-500/5' }
                    };"""
content = content.replace(colors_map_old, colors_map_new)

# Now, we need to remove the static categories!
# They are marked by `{/* Category: CRM */}`, `{/* Category: HR */}`, `{/* Category: FINANCE */}`, `{/* Category: MDM */}` or similar.
# Wait, let's just find the exact text in `App.tsx` and delete from there to the `{/* Dynamic Sidebar Modules */}`
start_idx = content.find("{/* Category: CRM */}")
if start_idx == -1:
    # try another marker
    start_idx = content.find("toggleSidebarCategory('crm')")
    if start_idx != -1:
        # find the beginning of that div/block
        # It's probably `<div className="flex flex-col mt-1 relative">`
        # Let's search backwards
        start_idx = content.rfind('<div className="flex flex-col mt-1 relative">', 0, start_idx)

end_idx = content.find("{/* Dynamic Sidebar Modules */}")

if start_idx != -1 and end_idx != -1:
    content = content[:start_idx] + content[end_idx:]

with open(app_tsx_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("App.tsx static blocks removed.")
