import os

file_path = "features.ts"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

general_str = """  {
    key: 'GENERAL',
    name: 'GENERAL CONFIGURATION',
    desc: 'General Chat & Expenses',
    children: [
      { key: 'GENERAL_CHAT', name: 'General Chat', desc: 'General Chat' },
      { key: 'GENERAL_EXPENSE_CHAT', name: 'Expense Chat', desc: 'Expense Chat' }
    ]
  },
  {
    key: 'NOTIFICATIONS',"""

if "key: 'GENERAL'" not in content:
    content = content.replace("  {\n    key: 'NOTIFICATIONS',", general_str)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("features.ts updated.")
