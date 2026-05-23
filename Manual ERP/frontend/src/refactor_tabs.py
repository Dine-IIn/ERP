import os
import re

components_dir = r"d:\ERP\Manual ERP\frontend\src\components"

mappings = {
    'crm': {
        'file': 'CrmModule.tsx',
        'default': 'dashboard',
        'keyMap': {
            'CRM_DASHBOARD': 'dashboard',
            'CRM_LEADS': 'leads',
            'CRM_CUSTOMER': 'customers',
            'CRM_PIPELINE': 'pipeline',
            'CRM_FOLLOWUP': 'followups',
            'CRM_OPPORTUNITY': 'opportunities',
            'CRM_STAGES': 'stages',
            'CRM_NOTES': 'notes'
        }
    },
    'hr': {
        'file': 'HumanResources.tsx',
        'default': 'dashboard',
        'keyMap': {
            'HR_DASHBOARD': 'dashboard',
            'HR_PROFILES': 'employees',
            'HR_ATTENDANCE': 'attendance',
            'HR_LEAVE': 'leave',
            'HR_PAYROLL': 'payroll',
            'HR_SALARY_SLIPS': 'slips',
            'HR_REIMBURSEMENTS': 'reimbursements',
            'HR_RECRUITMENT': 'recruitment',
            'HR_SHIFT': 'shifts',
            'HR_PERFORMANCE': 'performance',
            'HR_REPORTS': 'reports',
            'HR_DOCUMENTS': 'documents'
        }
    }
}

for module, data in mappings.items():
    filepath = os.path.join(components_dir, data['file'])
    if not os.path.exists(filepath):
        continue
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Add activeTab to Props
    if 'activeTab?: string;' not in content:
        content = re.sub(r'interface Props \{', r'interface Props {\n  activeTab?: string;', content)
    
    # Destructure activeTab
    if 'activeTab' not in content.split('=>')[0]:
        content = re.sub(r'const ' + data['file'].replace('.tsx', '') + r': React.FC<Props> = \(\{ user \}\) => \{',
                         f'const {data["file"].replace(".tsx", "")}: React.FC<Props> = ({{ user, activeTab }}) => {{',
                         content)

    # Replace useState('...') with local var mapped by activeTab
    mapping_str = "{" + ", ".join([f"'{k}': '{v}'" for k, v in data['keyMap'].items()]) + "}"
    
    # find useState for crmSubTab or activeTab
    # In HR: const [hrSubTab, setHrSubTab] = useState('dashboard');
    # In CRM: const [crmSubTab, setCrmSubTab] = useState('dashboard');
    # Wait, earlier I found they had "activeTab" in the duplicate identifier error, so maybe they have activeTab.
    # Let's replace both just in case.
    
    state_pattern_active = r"const \[activeTab, setActiveTab\] = useState\([^)]+\);"
    state_pattern_crm = r"const \[crmSubTab, setCrmSubTab\] = useState\([^)]+\);"
    state_pattern_hr = r"const \[hrSubTab, setHrSubTab\] = useState\([^)]+\);"
    
    replacement = f"""  const mapping: any = {mapping_str};
  const currentTab = (activeTab && mapping[activeTab]) ? mapping[activeTab] : '{data["default"]}';"""

    if re.search(state_pattern_active, content):
        content = re.sub(state_pattern_active, replacement, content)
        content = re.sub(r'\bactiveTab ===', 'currentTab ===', content)
        content = re.sub(r'\bactiveTab !==', 'currentTab !==', content)
        
    if re.search(state_pattern_crm, content):
        content = re.sub(state_pattern_crm, replacement, content)
        content = re.sub(r'\bcrmSubTab ===', 'currentTab ===', content)
        content = re.sub(r'\bcrmSubTab !==', 'currentTab !==', content)
        
    if re.search(state_pattern_hr, content):
        content = re.sub(state_pattern_hr, replacement, content)
        content = re.sub(r'\bhrSubTab ===', 'currentTab ===', content)
        content = re.sub(r'\bhrSubTab !==', 'currentTab !==', content)

    # Delete Tabs UI completely
    # {/\* Tabs \*/} down to </div> before {/* Content Area */}
    # Wait, maybe they use something else, like `<div className="flex gap-2 overflow-x-auto pb-4">`
    tabs_ui_pattern = r"\{\/\* Module Tabs \*\/}.*?\{\/\* Content Area \*\/}"
    content = re.sub(tabs_ui_pattern, "{/* Content Area */}", content, flags=re.DOTALL)
    
    tabs_ui_pattern_2 = r"\{\/\* Tabs \*\/}.*?\{\/\* Content Area \*\/}"
    content = re.sub(tabs_ui_pattern_2, "{/* Content Area */}", content, flags=re.DOTALL)
    
    tabs_ui_pattern_3 = r"\{\/\* Navigation Tabs \*\/}.*?\{\/\* Content Area \*\/}"
    content = re.sub(tabs_ui_pattern_3, "{/* Content Area */}", content, flags=re.DOTALL)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

print("CRM and HR refactored.")
