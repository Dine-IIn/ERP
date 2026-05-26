import os
import re

email_dir = r"d:\ERP\Manual ERP\frontend\src\components\email"
email_file = os.path.join(email_dir, "GlobalEmailSystem.tsx")

with open(email_file, "r", encoding="utf-8") as f:
    code = f.read()

# Isolate Content Area code
content_area_start = code.find("      {/* Content Area */}")
content_area_end = code.find("      {/* ==========================================\n          MODALS CORE DRAWERS")

if content_area_start == -1 or content_area_end == -1:
    print("Error isolating content area!")
    exit(1)

content_area_code = code[content_area_start:content_area_end]

# Find all matches in isolated code
pattern = r"\{currentTab === '([a-zA-Z0-9_]+)' &&"
matches = list(re.finditer(pattern, content_area_code))

print(f"Found {len(matches)} feature matches in Content Area of GlobalEmailSystem")

def find_opening_brace(text, start_pos):
    idx = start_pos
    while True:
        idx = text.rfind('{', 0, idx)
        if idx == -1:
            return -1
        # Skip comment blocks like {/* ... */}
        if text[idx:idx+2] == '{/':
            idx = idx - 1
            continue
        return idx

def find_matching_brace(text, start_idx):
    stack = []
    for i in range(start_idx, len(text)):
        c = text[i]
        if c == '{':
            stack.append('{')
        elif c == '}':
            if not stack:
                return i
            stack.pop()
            if not stack:
                return i
    return -1

# Extract each match
subcomponents = {}
for match in matches:
    feature = match.group(1)
    
    # Calculate absolute match start position in full code
    abs_match_start = content_area_start + match.start()
    
    # Use our robust finder for opening brace of the conditional block
    brace_idx = find_opening_brace(code, abs_match_start)
    if brace_idx == -1:
        print(f"Error finding brace for {feature}")
        continue
    
    # Now find the matching closing brace
    close_idx = find_matching_brace(code, brace_idx + 1)
    if close_idx == -1:
        print(f"Error finding matching close brace for {feature}")
        continue
    
    # Extract the block
    block = code[brace_idx:close_idx+1]
    
    # Parse out the inner JSX/expression
    inner_start = block.find("&&") + 2
    inner_block = block[inner_start:-1].strip()
    
    # If it is wrapped in parentheses, strip them
    if inner_block.startswith('(') and inner_block.endswith(')'):
        inner_block = inner_block[1:-1].strip()
        
    subcomponents[feature] = inner_block

# Create the files!
comp_mapping = {
    'smtp': ('EmailSmtp', ['smtpConfigs', 'handleTestSmtpConnection', 'setShowSmtpModal', 'renderTable']),
    'templates': ('EmailTemplates', ['emailTemplates', 'setShowTemplateModal', 'renderTable']),
    'invoice': ('EmailInvoice', ['outboxLogs', 'setShowSendModal', 'renderTable']),
    'po': ('EmailPo', ['outboxLogs', 'setShowSendModal', 'renderTable']),
    'approval': ('EmailApproval', ['emailQueue', 'handleForceSendQueue', 'setShowSendModal', 'showToast', 'setEmailQueue']),
    'otp': ('EmailOtp', ['outboxLogs', 'setShowSendModal', 'renderTable']),
    'payroll': ('EmailPayroll', ['outboxLogs', 'setShowSendModal', 'renderTable']),
    'report': ('EmailReport', ['emailQueue', 'handleForceSendQueue', 'setShowSendModal', 'renderTable']),
    'queue': ('EmailQueue', ['emailQueue', 'handleForceSendQueue', 'renderTable']),
    'retry': ('EmailRetry', ['outboxLogs', 'showToast', 'setOutboxLogs', 'setDashboardStats', 'renderTable', 'setShowRetryModal']),
    'attachment': ('EmailAttachment', ['attachmentsData', 'renderTable']),
    'logs': ('EmailLogs', ['outboxLogs', 'setShowSendModal', 'renderTable']),
    'editor': ('EmailEditor', ['emailTemplates', 'selectedEditorTemplate', 'setSelectedEditorTemplate', 'previewCustomerName', 'setPreviewCustomerName', 'previewInvoiceNo', 'setPreviewInvoiceNo', 'previewAmount', 'setPreviewAmount', 'emailTemplates', 'setEmailTemplates', 'showToast']),
    'toggle': ('EmailToggle', ['companyToggles', 'handleToggleCompanyEmail']),
    'enable': ('EmailEnable', ['systemSwitches', 'handleToggleSystemSwitch', 'renderTable']),
    'quota': ('EmailQuota', ['usageQuotas', 'setShowQuotaModal', 'selectedQuotaIndex', 'setSelectedQuotaIndex', 'quotaEditLimit', 'setQuotaEditLimit', 'handleSaveQuotaLimit'])
}

# Add standard dashboard subcomponent (not conditional in matches, but called via renderDashboard)
dashboard_match = re.search(r"const renderDashboard = \(\) => \((.*?)\);\s*(?:const renderTable|const apiRequest)", code, re.DOTALL)
if dashboard_match:
    subcomponents['dashboard'] = dashboard_match.group(1).strip()
    comp_mapping['dashboard'] = ('EmailDashboard', ['dashboardStats', 'outboxLogs', 'emailQueue', 'handleForceSendQueue'])
else:
    print("Could not match renderDashboard")

for feature, inner in subcomponents.items():
    if feature not in comp_mapping:
        continue
    comp_name, props = comp_mapping[feature]
    
    # Build props type and interface
    props_decl = []
    for p in props:
        if p.startswith('handle') or p.startswith('set') or p == 'renderTable' or p == 'showToast':
            props_decl.append(f"  {p}: any;")
        elif p == 'Clock':
            props_decl.append(f"  {p}: React.ComponentType<any>;")
        else:
            props_decl.append(f"  {p}: any[];")
            
    interface_code = f"interface Props {{\n" + "\n".join(props_decl) + "\n}"
    
    # Find which lucide-react icons are used in this subcomponent
    all_icons = ["Mail", "Send", "RefreshCw", "Settings", "LayoutTemplate", "FileArchive", "Plus", "MoreHorizontal", "Trash2", "CheckCircle2", "Activity", "Search", "Filter", "Download", "SendHorizonal", "FileText", "ActivitySquare", "AlertCircle", "Users", "Sliders", "ToggleLeft", "ToggleRight", "FileArchive"]
    used_icons = [icon for icon in all_icons if icon in inner]
    icons_import = ""
    if used_icons:
        icons_import = f"import {{ {', '.join(used_icons)} }} from 'lucide-react';\n"
        
    sub_code = f"""import React from 'react';
{icons_import}
{interface_code}

export const {comp_name}: React.FC<Props> = ({{ {', '.join(props)} }}) => {{
  return (
    {inner}
  );
}};
"""
    # Write to file
    out_path = os.path.join(email_dir, f"{comp_name}.tsx")
    with open(out_path, "w", encoding="utf-8") as f_out:
        f_out.write(sub_code)
    print(f"Created subcomponent: {comp_name}.tsx")

# Now rewrite GlobalEmailSystem.tsx orchestrator
orchestrator_imports = "\n".join([f"import {{ {comp_mapping[f][0]} }} from './{comp_mapping[f][0]}';" for f in comp_mapping])

# Rewrite the content area inside GlobalEmailSystem.tsx
orchestrator_renders = []
for f in comp_mapping:
    comp_name, props = comp_mapping[f]
    props_passing = " ".join([f"{p}={{{p}}}" for p in props])
    
    if f == 'dashboard':
        orchestrator_renders.append(f"        {{currentTab === 'dashboard' && <EmailDashboard {props_passing} />}}")
    elif f == 'retry':
        orchestrator_renders.append(f"        {{currentTab === 'retry' && <EmailRetry {props_passing} setShowRetryModal={{setShowRetryModal}} />}}")
    elif f == 'quota':
        orchestrator_renders.append(f"        {{currentTab === 'quota' && <EmailQuota {props_passing} />}}")
    else:
        orchestrator_renders.append(f"        {{currentTab === '{f}' && <{comp_name} {props_passing} />}}")

replacement = "      {/* Content Area */}\n      <div className=\"flex-1 overflow-hidden\">\n" + "\n".join(orchestrator_renders) + "\n      </div>"

# Replace the Content Area
start_idx = code.find("      {/* Content Area */}")
end_idx = code.find("      {/* ==========================================\n          MODALS CORE DRAWERS")

if start_idx != -1 and end_idx != -1:
    new_code = code[:start_idx] + replacement + "\n\n" + code[end_idx:]
    # Insert imports
    new_code = "import { apiClient } from '../../utils/apiService';\nimport React, { useState, useEffect } from 'react';\n" + orchestrator_imports + "\n" + new_code[new_code.find("import {"): ]
    
    with open(email_file, "w", encoding="utf-8") as f:
        f.write(new_code)
    print("GlobalEmailSystem.tsx orchestrator updated successfully.")
else:
    print("Error finding markers in GlobalEmailSystem.tsx")
