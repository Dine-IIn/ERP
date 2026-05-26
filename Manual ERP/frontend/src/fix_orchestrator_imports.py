import os

components_dir = r"d:\ERP\Manual ERP\frontend\src\components"

print("Starting to fix relative imports for moved components...")

fixed_count = 0

for root, dirs, files in os.walk(components_dir):
    # Skip the root components directory to only touch files inside subdirectories
    if root == components_dir:
        continue
        
    for file in files:
        if file.endswith('.tsx'):
            filepath = os.path.join(root, file)
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
            
            modified = False
            
            # Fix relative apiService import
            if "../utils/apiService" in content:
                content = content.replace("../utils/apiService", "../../utils/apiService")
                modified = True
                
            # Fix relative features import
            if "../features" in content:
                content = content.replace("../features", "../../features")
                modified = True
                
            if modified:
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(content)
                print(f"Fixed imports in: {filepath}")
                fixed_count += 1

print(f"Finished. Fixed relative imports in {fixed_count} files.")
