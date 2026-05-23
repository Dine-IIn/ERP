import re

with open("d:\\ERP\\Manual ERP\\frontend\\src\\App.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# Find the start of the sidebar
start_idx = content.find('<aside ref={sidebarRef}')
if start_idx == -1:
    print("Sidebar not found")
else:
    end_idx = content.find('</aside>', start_idx)
    sidebar_code = content[start_idx:end_idx]
    
    with open("d:\\ERP\\Manual ERP\\frontend\\src\\sidebar.txt", "w", encoding="utf-8") as out:
        out.write(sidebar_code)
    
    print("Sidebar code extracted to sidebar.txt")
