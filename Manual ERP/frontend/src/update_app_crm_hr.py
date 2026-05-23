import re

file_path = "d:\\ERP\\Manual ERP\\frontend\\src\\App.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add imports
if "import CrmModule" not in content:
    content = content.replace(
        "import GlobalEmailSystem from './components/GlobalEmailSystem';",
        "import GlobalEmailSystem from './components/GlobalEmailSystem';\nimport CrmModule from './components/CrmModule';\nimport HumanResources from './components/HumanResources';"
    )

# 2. Replace CRM inline code
crm_regex = re.compile(r"\{activeWorkspaceModule === 'crm' && !selectedCompany && \(\s*<div className=\"max-w-4xl.*?(?=\{activeWorkspaceModule === 'hr')", re.DOTALL)
crm_replacement = """{activeWorkspaceModule === 'crm' && !selectedCompany && (
                  <CrmModule user={user!} />
                )}
  
                """
content = crm_regex.sub(crm_replacement, content)

# 3. Replace HR inline code
hr_regex = re.compile(r"\{activeWorkspaceModule === 'hr' && !selectedCompany && \(\s*<div className=\"max-w-4xl.*?(?=\{activeWorkspaceModule === 'finance')", re.DOTALL)
hr_replacement = """{activeWorkspaceModule === 'hr' && !selectedCompany && (
                  <HumanResources user={user!} />
                )}
  
                """
content = hr_regex.sub(hr_replacement, content)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("App.tsx updated for CRM and HR.")
