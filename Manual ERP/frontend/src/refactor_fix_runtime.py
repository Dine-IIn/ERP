import re

file_path = "App.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Replace `expandedCategories.includes` with `expandedFeatureCategories.includes`
# Note: we need to be careful if expandedCategories is used properly elsewhere, 
# but it is a Record<string, boolean>, so `.includes` is ALWAYS wrong for it.

content = content.replace("expandedCategories.includes", "expandedFeatureCategories.includes")

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Fixed runtime error!")
