import os

file_path = "App.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add import
if "MASTER_FEATURES_HIERARCHY" not in content:
    content = content.replace("import { io, Socket } from 'socket.io-client';", "import { io, Socket } from 'socket.io-client';\nimport { MASTER_FEATURES_HIERARCHY, getCategoryKeys, getChildKeys, getParentKey } from './features';")

# 2. Replace handleToggleCompanyFeatureHierarchical
old_func1 = """    let updatedFeatures: string[] = selectedCompany.features.map((f: any) => f.feature.key);
    const isCategory = ['CRM', 'HR', 'FINANCE', 'NOTIFICATIONS', 'MDM', 'ADMIN'].includes(featureKey);

    if (isCategory) {
      if (featureKey === 'NOTIFICATIONS') return; // Cannot disable notifications
      if (updatedFeatures.includes(featureKey)) {
        // Toggle off parent -> remove parent and all its children
        updatedFeatures = updatedFeatures.filter(k => k !== featureKey);
        if (featureKey === 'CRM') {
          updatedFeatures = updatedFeatures.filter(k => k !== 'CRM_LEADS' && k !== 'CRM_CUSTOMER');
        } else if (featureKey === 'HR') {
          updatedFeatures = updatedFeatures.filter(k => k !== 'HR_ROSTER' && k !== 'HR_ATTENDANCE');
        } else if (featureKey === 'FINANCE') {
          updatedFeatures = updatedFeatures.filter(k => k !== 'FINANCE_LEDGER' && k !== 'FINANCE_INVOICING');
        } else if (featureKey === 'MDM') {
          updatedFeatures = updatedFeatures.filter(k => k !== 'MDM_PRODUCTS' && k !== 'MDM_PARTNERS');
        } else if (featureKey === 'ADMIN') {
          updatedFeatures = updatedFeatures.filter(k => k !== 'ADMIN_SETTINGS');
        }
      } else {
        // Toggle on parent -> add category key
        updatedFeatures.push(featureKey);
      }
    } else {
      // Child toggle
      if (updatedFeatures.includes(featureKey)) {
        // Toggle off child
        updatedFeatures = updatedFeatures.filter(k => k !== featureKey);
      } else {
        // Toggle on child -> add child and auto-enable parent category
        updatedFeatures.push(featureKey);
        let parent = '';
        if (['CRM_LEADS', 'CRM_CUSTOMER'].includes(featureKey)) parent = 'CRM';
        else if (['HR_ROSTER', 'HR_ATTENDANCE'].includes(featureKey)) parent = 'HR';
        else if (['FINANCE_LEDGER', 'FINANCE_INVOICING'].includes(featureKey)) parent = 'FINANCE';
        else if (['NOTIFICATIONS_PUSH', 'NOTIFICATIONS_AUDIT'].includes(featureKey)) parent = 'NOTIFICATIONS';
        else if (['MDM_PRODUCTS', 'MDM_PARTNERS'].includes(featureKey)) parent = 'MDM';
        else if (['ADMIN_SETTINGS'].includes(featureKey)) parent = 'ADMIN';
        
        if (parent && !updatedFeatures.includes(parent)) {
          updatedFeatures.push(parent);
        }
      }
    }"""

new_func1 = """    let updatedFeatures: string[] = selectedCompany.features.map((f: any) => f.feature.key);
    const isCategory = getCategoryKeys().includes(featureKey);

    if (isCategory) {
      if (featureKey === 'NOTIFICATIONS') return; // Cannot disable notifications
      if (updatedFeatures.includes(featureKey)) {
        // Toggle off parent -> remove parent and all its children
        updatedFeatures = updatedFeatures.filter(k => k !== featureKey);
        const childKeys = getChildKeys(featureKey);
        updatedFeatures = updatedFeatures.filter(k => !childKeys.includes(k));
      } else {
        // Toggle on parent -> add category key
        updatedFeatures.push(featureKey);
      }
    } else {
      // Child toggle
      if (updatedFeatures.includes(featureKey)) {
        // Toggle off child
        updatedFeatures = updatedFeatures.filter(k => k !== featureKey);
      } else {
        // Toggle on child -> add child and auto-enable parent category
        updatedFeatures.push(featureKey);
        const parent = getParentKey(featureKey);
        if (parent && !updatedFeatures.includes(parent)) {
          updatedFeatures.push(parent);
        }
      }
    }"""

content = content.replace(old_func1, new_func1)

# 3. Replace handleToggleNewCompanyFeatureHierarchical
old_func2 = """    let updated = [...newCompany.features];
    const isCategory = ['CRM', 'HR', 'FINANCE', 'NOTIFICATIONS', 'MDM', 'ADMIN'].includes(featureKey);

    if (isCategory) {
      if (featureKey === 'NOTIFICATIONS') return; // Enforced
      if (updated.includes(featureKey)) {
        // Toggle off parent -> remove parent and all its children
        updated = updated.filter(k => k !== featureKey);
        if (featureKey === 'CRM') {
          updated = updated.filter(k => k !== 'CRM_LEADS' && k !== 'CRM_CUSTOMER');
        } else if (featureKey === 'HR') {
          updated = updated.filter(k => k !== 'HR_ROSTER' && k !== 'HR_ATTENDANCE');
        } else if (featureKey === 'FINANCE') {
          updated = updated.filter(k => k !== 'FINANCE_LEDGER' && k !== 'FINANCE_INVOICING');
        } else if (featureKey === 'MDM') {
          updated = updated.filter(k => k !== 'MDM_PRODUCTS' && k !== 'MDM_PARTNERS');
        } else if (featureKey === 'ADMIN') {
          updated = updated.filter(k => k !== 'ADMIN_SETTINGS');
        }
      } else {
        // Toggle on parent
        updated.push(featureKey);
      }
    } else {
      // Child toggle
      if (updated.includes(featureKey)) {
        updated = updated.filter(k => k !== featureKey);
      } else {
        updated.push(featureKey);
        let parent = '';
        if (['CRM_LEADS', 'CRM_CUSTOMER'].includes(featureKey)) parent = 'CRM';
        else if (['HR_ROSTER', 'HR_ATTENDANCE'].includes(featureKey)) parent = 'HR';
        else if (['FINANCE_LEDGER', 'FINANCE_INVOICING'].includes(featureKey)) parent = 'FINANCE';
        else if (['NOTIFICATIONS_PUSH', 'NOTIFICATIONS_AUDIT'].includes(featureKey)) parent = 'NOTIFICATIONS';
        else if (['MDM_PRODUCTS', 'MDM_PARTNERS'].includes(featureKey)) parent = 'MDM';
        else if (['ADMIN_SETTINGS'].includes(featureKey)) parent = 'ADMIN';
        
        if (parent && !updated.includes(parent)) {
          updated.push(parent);
        }
      }
    }"""

new_func2 = """    let updated = [...newCompany.features];
    const isCategory = getCategoryKeys().includes(featureKey);

    if (isCategory) {
      if (featureKey === 'NOTIFICATIONS') return; // Enforced
      if (updated.includes(featureKey)) {
        // Toggle off parent -> remove parent and all its children
        updated = updated.filter(k => k !== featureKey);
        const childKeys = getChildKeys(featureKey);
        updated = updated.filter(k => !childKeys.includes(k));
      } else {
        // Toggle on parent
        updated.push(featureKey);
      }
    } else {
      // Child toggle
      if (updated.includes(featureKey)) {
        updated = updated.filter(k => k !== featureKey);
      } else {
        updated.push(featureKey);
        const parent = getParentKey(featureKey);
        if (parent && !updated.includes(parent)) {
          updated.push(parent);
        }
      }
    }"""

content = content.replace(old_func2, new_func2)

# 4. Replace arrays
old_array = """                        {[
                          {
                            key: 'CRM',
                            name: 'Sales & CRM Category',
                            desc: 'Licensing CRM workflows & lead management tools',
                            children: [
                              { key: 'CRM_LEADS', name: 'Leads & Pipelines', desc: 'Manage opportunities and lead tracking' },
                              { key: 'CRM_CUSTOMER', name: 'Customer Logs', desc: 'Track customer interactions and histories' }
                            ]
                          },
                          {
                            key: 'HR',
                            name: 'Human Resources Category',
                            desc: 'Licensing roster management & employee directories',
                            children: [
                              { key: 'HR_ROSTER', name: 'Employee Roster', desc: 'Directory of company workforce and permissions' },
                              { key: 'HR_ATTENDANCE', name: 'Attendance Log', desc: 'Check in/out metrics and shift timesheets' }
                            ]
                          },
                          {
                            key: 'FINANCE',
                            name: 'Financials Category',
                            desc: 'Licensing ledgers, double-entry assets, & billing',
                            children: [
                              { key: 'FINANCE_LEDGER', name: 'General Ledger', desc: 'Track double-entry assets and liabilities' },
                              { key: 'FINANCE_INVOICING', name: 'Invoicing Module', desc: 'Generate invoices and manage client billing' }
                            ]
                          },
                          {
                            key: 'NOTIFICATIONS',
                            name: 'Alerts & Audit Logs Category',
                            desc: 'Core notification gateways & secure audit trails',
                            children: [
                              { key: 'NOTIFICATIONS_PUSH', name: 'Push Notifications', desc: 'Receive real-time push events on devices' },
                              { key: 'NOTIFICATIONS_AUDIT', name: 'System Audit Logs', desc: 'View secure administrative history trails' }
                            ]
                          },
                          {
                            key: 'MDM',
                            name: 'Master Data Management Category',
                            desc: 'Licensing central master data records',
                            children: [
                              { key: 'MDM_PRODUCTS', name: 'Product Master', desc: 'Manage central product master records' },
                              { key: 'MDM_PARTNERS', name: 'Partners (Customer/Vendor)', desc: 'Manage central customer and vendor master records' }
                            ]
                          },
                          {
                            key: 'ADMIN',
                            name: 'Administration Category',
                            desc: 'System administration configuration',
                            children: [
                              { key: 'ADMIN_SETTINGS', name: 'General Administration', desc: 'Access administrative configuration' }
                            ]
                          }
                        ]"""

new_array = "                        MASTER_FEATURES_HIERARCHY"

content = content.replace(old_array, new_array)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Done")
