import os

ROOT_DIR = r"D:\ERP\Manual ERP"
IGNORE_FOLDERS = {"node_modules", ".git", ".next", "dist", "build", ".vscode", "pnpm-lock.yaml"}

found_references = []

for root, dirs, files in os.walk(ROOT_DIR):
    dirs[:] = [d for d in dirs if d not in IGNORE_FOLDERS]
    for file in files:
        if file in IGNORE_FOLDERS:
            continue
        file_path = os.path.join(root, file)
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                content = f.read()
                if "6000" in content:
                    found_references.append(file_path)
        except Exception:
            pass

print("--- Files containing '6000' ---")
for ref in found_references:
    print(ref)
