import os
import re

components_dir = r"d:\ERP\Manual ERP\frontend\src\components"

print("Checking features in modules...")

for filename in os.listdir(components_dir):
    if filename.endswith(".tsx"):
        path = os.path.join(components_dir, filename)
        with open(path, 'r', encoding='utf-8') as f:
            content = f.read()
            
        tabs_match = re.search(r'const tabs = \[\s*(.*?)\s*\];', content, re.DOTALL)
        if tabs_match:
            tabs_str = tabs_match.group(1)
            ids = re.findall(r"id:\s*'(.*?)'", tabs_str)
            labels = re.findall(r"label:\s*'(.*?)'", tabs_str)
            
            placeholder_match = re.search(r'\{(?:currentTab|activeTab) !== \'([^\']+)\'(?: && (?:currentTab|activeTab) !== \'([^\']+)\')*(?: && (?:currentTab|activeTab) !== \'([^\']+)\')* && \(\s*<div[^>]*>.*?under construction', content, re.DOTALL | re.IGNORECASE)
            
            if placeholder_match:
                implemented_ids = [m for m in placeholder_match.groups() if m]
                under_construction = [label for id, label in zip(ids, labels) if id not in implemented_ids]
                
                print(f"--- {filename.replace('.tsx', '')} ---")
                print(f"Under Construction: {', '.join(under_construction)}\n")
            else:
                if "under construction" in content.lower():
                    # check what is before the placeholder
                    before_match = re.search(r'\{([^}]+) && \(\s*<div[^>]*>.*?under construction', content, re.DOTALL | re.IGNORECASE)
                    if before_match:
                        logic = before_match.group(1).strip()
                        # Extract the negated tabs from logic like: activeTab !== 'xyz' && activeTab !== 'abc'
                        implemented_tabs = re.findall(r'(?:activeTab|currentTab) !== \'([^\']+)\'', logic)
                        
                        under_construction = [label for id, label in zip(ids, labels) if id not in implemented_tabs]
                        print(f"--- {filename.replace('.tsx', '')} ---")
                        print(f"Under Construction: {', '.join(under_construction)}\n")
                    else:
                        print(f"--- {filename.replace('.tsx', '')} ---")
                        print(f"Has under construction placeholder. Total tabs: {labels}\n")
