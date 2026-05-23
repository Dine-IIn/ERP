import os

file_path = "components/GeneralAdmin.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

if "MASTER_FEATURES_HIERARCHY" not in content:
    content = content.replace("import React, { useState, useEffect } from 'react';", "import React, { useState, useEffect } from 'react';\nimport { MASTER_FEATURES_HIERARCHY } from '../features';")

old_list = """    const [featuresList] = useState<any[]>([
      { key: 'CRM', name: 'Sales & CRM Module', description: 'Enable sales lead tracking and corporate pipelines' },
      { key: 'CRM_LEADS', name: 'Leads & Opportunities', description: 'Deep sales pipeline details' },
      { key: 'CRM_CUSTOMER', name: 'Customer Database', description: 'Central storage of client portfolios' },
      { key: 'HR', name: 'Human Resources Module', description: 'Manage employee directories and contracts' },
      { key: 'HR_ROSTER', name: 'Roster Schedule', description: 'Staff timings and workspace presence controls' },
      { key: 'HR_ATTENDANCE', name: 'Attendance & Checkins', description: 'Visual punches logs' },
      { key: 'FINANCE', name: 'Financials Core', description: 'Full double-entry ledger book-keeping' },
      { key: 'FINANCE_LEDGER', name: 'General Ledger', description: 'Tax reports, statements generator' },
      { key: 'FINANCE_INVOICING', name: 'Invoicing Terminal', description: 'Billing portals and PDF invoice creation' },
      { key: 'NOTIFICATIONS', name: 'System Alerts Engine', description: 'Live triggers and background push signals' }
    ]);"""

new_list = """    const [featuresList] = useState<any[]>(
      MASTER_FEATURES_HIERARCHY.flatMap(cat => [
        { key: cat.key, name: cat.name, description: cat.desc },
        ...cat.children.map(child => ({ key: child.key, name: child.name, description: child.desc }))
      ])
    );"""

content = content.replace(old_list, new_list)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Done")
