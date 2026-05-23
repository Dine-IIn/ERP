import os
import re

components_dir = r"d:\ERP\Manual ERP\frontend\src\components"

print("Checking features in modules...")

for filename in os.listdir(components_dir):
    if filename.endswith(".tsx"):
        path = os.path.join(components_dir, filename)
        with open(path, 'r', encoding='utf-8') as f:
            content = f.read()
            
        # extract tabs array
        tabs_match = re.search(r'const tabs = \[\s*(.*?)\s*\];', content, re.DOTALL)
        if tabs_match:
            tabs_str = tabs_match.group(1)
            # Find all ids
            ids = re.findall(r"id:\s*'(.*?)'", tabs_str)
            labels = re.findall(r"label:\s*'(.*?)'", tabs_str)
            
            # actually let's just find the placeholder
            # Sometimes it's `{currentTab !== 'xyz' && (`
            placeholder_match = re.search(r'\{currentTab !== \'([^\']+)\'(?: && currentTab !== \'([^\']+)\')*(?: && currentTab !== \'([^\']+)\')* && \(\s*<div[^>]*>.*?under construction', content, re.DOTALL | re.IGNORECASE)
            
            if placeholder_match:
                implemented_ids = [m for m in placeholder_match.groups() if m]
                under_construction = [label for id, label in zip(ids, labels) if id not in implemented_ids]
                
                print(f"--- {filename} ---")
                print(f"Implemented IDs: {implemented_ids}")
                print(f"Under Construction: {under_construction}\n")
            else:
                if "under construction" in content.lower():
                    print(f"--- {filename} ---")
                    print(f"Has under construction placeholder but regex didn't match. Total tabs: {labels}\n")
