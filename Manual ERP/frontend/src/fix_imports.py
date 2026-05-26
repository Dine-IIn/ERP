import os
import re

components_dir = r"d:\ERP\Manual ERP\frontend\src\components"

def find_multiline_import_start(content, end_idx):
    idx = end_idx
    while True:
        idx = content.rfind("import {", 0, idx)
        if idx == -1:
            return -1
        line_start = content.rfind("\n", 0, idx) + 1
        line_end = content.find("\n", idx)
        if line_end == -1:
            line_end = len(content)
        line = content[line_start:line_end]
        if "from" not in line:
            return idx
        # Continue searching backwards

print("Starting import fix script...")

fixed_files = []

for root, dirs, files in os.walk(components_dir):
    for file in files:
        if file.endswith('.tsx'):
            filepath = os.path.join(root, file)
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Find the lucide-react import
            match = re.search(r"\}\s*from\s*['\"]lucide-react['\"];?", content)
            if not match:
                continue
                
            end_idx = match.end()
            start_idx = find_multiline_import_start(content, end_idx)
            if start_idx == -1:
                continue
                
            block = content[start_idx:end_idx]
            
            # Check for nested imports (excluding the first line)
            lines = block.splitlines()
            if not lines:
                continue
                
            has_nested = False
            for line in lines[1:]:
                if line.strip().startswith("import "):
                    has_nested = True
                    break
                    
            if has_nested:
                print(f"Found corrupted lucide-react import in {filepath}")
                
                nested_imports = []
                remaining_lines = [lines[0]] # Keep the first line: "import {"
                
                for line in lines[1:]:
                    stripped = line.strip()
                    if stripped.startswith("import "):
                        nested_imports.append(stripped)
                    else:
                        remaining_lines.append(line)
                
                # Deduplicate nested imports
                unique_nested = []
                for imp in nested_imports:
                    if imp not in unique_nested:
                        unique_nested.append(imp)
                
                # Reconstruct remaining lucide-react block
                lucide_block = "\n".join(remaining_lines)
                lucide_block = re.sub(r'\n\s*\n', '\n', lucide_block)
                
                nested_str = "\n".join(unique_nested)
                replacement = nested_str + "\n" + lucide_block
                
                new_content = content[:start_idx] + replacement + content[end_idx:]
                
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                
                print(f"-> Successfully fixed imports in {file}!")
                fixed_files.append(file)

print(f"\nFinished. Total files fixed: {len(fixed_files)}")
