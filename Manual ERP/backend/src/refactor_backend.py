import os

file_path = "controllers/index.ts"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

general_str = """  { key: "GENERAL", name: "GENERAL CONFIGURATION", description: "General Chat & Expenses" },
  { key: "GENERAL_CHAT", name: "General Chat", description: "General Chat" },
  { key: "GENERAL_EXPENSE_CHAT", name: "Expense Chat", description: "Expense Chat" },

  { key: "NOTIFICATIONS","""

if "key: \"GENERAL\"" not in content:
    content = content.replace('{ key: "NOTIFICATIONS",', general_str)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Backend updated.")
