import os
import re

components_dir = r"d:\ERP\Manual ERP\frontend\src\components"

print("Starting deep import path standardizer...")

fixed_count = 0

for root, dirs, files in os.walk(components_dir):
    for file in files:
        if file.endswith('.tsx'):
            filepath = os.path.join(root, file)
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
            
            modified = False
            
            # Normalize any apiService imports to exact '../../utils/apiService'
            new_content, count1 = re.subn(r"from\s+['\"][\./]+utils/apiService['\"]", "from '../../utils/apiService'", content)
            if count1 > 0:
                content = new_content
                modified = True
                
            # Normalize any features imports to exact '../../features'
            new_content, count2 = re.subn(r"from\s+['\"][\./]+features['\"]", "from '../../features'", content)
            if count2 > 0:
                content = new_content
                modified = True
                
            if modified:
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(content)
                print(f"Normalized imports in: {filepath}")
                fixed_count += 1

print(f"Finished. Standardized imports in {fixed_count} files.")
