import os

# Change this to your project folder path
ROOT_DIR = r"D:\ERP\Manual ERP"

# Output file
OUTPUT_FILE = "project_structure.txt"

# Folders/files to ignore
IGNORE_FOLDERS = {
    "node_modules",
    ".git",
    ".next",
    "dist",
    "build",
    "__pycache__",
    ".vercel",
    ".idea",
    ".vscode",
    "coverage"
}

IGNORE_FILES = {
    ".DS_Store"
}


def generate_tree(path, prefix=""):
    items = sorted(os.listdir(path))

    # Remove ignored files/folders
    items = [
        item for item in items
        if item not in IGNORE_FOLDERS
        and item not in IGNORE_FILES
    ]

    tree_lines = []

    for index, item in enumerate(items):
        item_path = os.path.join(path, item)

        connector = "└── " if index == len(items) - 1 else "├── "

        tree_lines.append(prefix + connector + item)

        if os.path.isdir(item_path):
            extension = "    " if index == len(items) - 1 else "│   "
            tree_lines.extend(
                generate_tree(item_path, prefix + extension)
            )

    return tree_lines


def main():
    root_name = os.path.basename(ROOT_DIR.rstrip("\\/"))

    tree = [root_name]
    tree.extend(generate_tree(ROOT_DIR))

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        f.write("\n".join(tree))

    print(f"\nProject structure saved to: {OUTPUT_FILE}")


if __name__ == "__main__":
    main()