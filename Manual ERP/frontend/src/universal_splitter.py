import os
import re

components_base = r"d:\ERP\Manual ERP\frontend\src\components"

modules = [
    {
        "dir": "email",
        "mono_file": "GlobalEmailSystem.tsx",
        "file": "GlobalEmailSystem.tsx",
        "comp_prefix": "Email",
        "tab_var": "currentTab"
    },
    {
        "dir": "hr",
        "mono_file": "HumanResources.tsx",
        "file": "HumanResources.tsx",
        "comp_prefix": "Hr",
        "tab_var": "currentTab"
    },
    {
        "dir": "inventory",
        "mono_file": "InventoryWarehouse.tsx",
        "file": "InventoryWarehouse.tsx",
        "comp_prefix": "Inventory",
        "tab_var": "currentTab"
    },
    {
        "dir": "manufacturing",
        "mono_file": "ManufacturingProduction.tsx",
        "file": "ManufacturingProduction.tsx",
        "comp_prefix": "Manufacturing",
        "tab_var": "currentTab"
    },
    {
        "dir": "purchase",
        "mono_file": "PurchaseProcurement.tsx",
        "file": "PurchaseProcurement.tsx",
        "comp_prefix": "Purchase",
        "tab_var": "currentTab"
    },
    {
        "dir": "quality",
        "mono_file": "QualityMaintenance.tsx",
        "file": "QualityMaintenance.tsx",
        "comp_prefix": "Quality",
        "tab_var": "currentTab"
    },
    {
        "dir": "sales",
        "mono_file": "SalesOrder.tsx",
        "file": "SalesOrder.tsx",
        "comp_prefix": "Sales",
        "tab_var": "currentTab"
    },
    {
        "dir": "finance",
        "mono_file": "FinanceAccounting.tsx",
        "file": "FinanceAccounting.tsx",
        "comp_prefix": "Finance",
        "tab_var": "activeTab"
    },
    {
        "dir": "admin",
        "mono_file": "GeneralAdmin.tsx",
        "file": "GeneralAdmin.tsx",
        "comp_prefix": "Admin",
        "tab_var": "activeTab"
    }
]

KEYWORDS = {
    "break", "case", "catch", "class", "const", "continue", "debugger", "default", "delete", "do",
    "else", "export", "extends", "finally", "for", "function", "if", "import", "in", "instanceof",
    "new", "return", "super", "switch", "this", "throw", "try", "typeof", "var", "void", "while",
    "with", "yield", "let", "static", "enum", "await", "implements", "package", "protected",
    "interface", "private", "public", "null", "undefined", "true", "false", "any", "string",
    "number", "boolean", "symbol", "unknown", "never", "void", "as"
}

def is_valid_variable(name):
    name = name.strip()
    if not name:
        return False
    if name in KEYWORDS:
        return False
    if len(name) <= 1:
        return False
    if name[0].isdigit():
        return False
    return True

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
    return -1

def camel_case(s):
    parts = s.replace('_', ' ').replace('-', ' ').split()
    return "".join([p.capitalize() for p in parts])

for mod in modules:
    mono_path = os.path.join(components_base, mod["mono_file"])
    target_dir = os.path.join(components_base, mod["dir"])
    target_file = os.path.join(target_dir, mod["file"])
    
    if not os.path.exists(mono_path):
        print(f"Skipping {mod['mono_file']} (does not exist at {mono_path})")
        continue
        
    print(f"\n==========================================")
    print(f"Processing monolithic module: {mod['mono_file']}")
    print(f"==========================================")
    
    with open(mono_path, "r", encoding="utf-8") as f:
        code = f.read()
        
    os.makedirs(target_dir, exist_ok=True)
    
    comp_declaration = re.search(r"(?:const\s+[a-zA-Z0-9_]+\s*:\s*React\.FC.*?=\s*|export\s+default\s+function\s+[a-zA-Z0-9_]+\s*)\(\{\s*(.*?)\s*\}\)", code, re.DOTALL)
    prop_names = []
    if comp_declaration:
        params_text = comp_declaration.group(1)
        prop_names = [w.strip() for w in re.findall(r"([a-zA-Z0-9_]+)", params_text)]
        
    body_vars = []
    body_vars.extend(re.findall(r"const\s+\[\s*([a-zA-Z0-9_]+)\s*,\s*(set[a-zA-Z0-9_]+)\s*\]\s*=\s*useState", code))
    body_vars.extend([(w, "") for w in re.findall(r"const\s+([a-zA-Z0-9_]+)\s*=\s*(?!useState|useEffect|useRef)", code)])
    body_vars.extend([(w, "") for w in re.findall(r"let\s+([a-zA-Z0-9_]+)\s*=\s*", code)])
    body_vars.extend([(w, "") for w in re.findall(r"function\s+([a-zA-Z0-9_]+)\s*\(", code)])
    body_vars.extend([(w, "") for w in re.findall(r"const\s+(handle[a-zA-Z0-9_]+)\s*=\s*", code)])
    
    scope_variables = set()
    for p in prop_names:
        if is_valid_variable(p):
            scope_variables.add(p)
            
    for v1, v2 in body_vars:
        if v1 and is_valid_variable(v1):
            scope_variables.add(v1)
        if v2 and is_valid_variable(v2):
            scope_variables.add(v2)
            
    # Add important API and Context globals
    scope_variables.add("renderTable")
    scope_variables.add("showToast")
    scope_variables.add("user")
    scope_variables.add("token")
    scope_variables.add("backendUrl")
    scope_variables.add("socket")
    scope_variables.add("onNavigate")
    scope_variables.add("onUpdateFeatures")
    scope_variables.add("companyFeatures")
    
    if "const Clock = " in code:
        scope_variables.add("Clock")
    if "const Clock3 = " in code:
        scope_variables.add("Clock3")
        
    print(f"Detected {len(scope_variables)} scope variables in orchestrator.")
    
    content_area_start = -1
    for marker in ["      {/* Content Area */}", "      {/* Content Workspace Area */}", "      {/* Content Viewport */}", "      {/* Workspace Content Area */}"]:
        idx = code.find(marker)
        if idx != -1:
            content_area_start = idx
            break
            
    content_area_end = -1
    for marker in ["      {/* ==========================================\n          MODALS CORE DRAWERS", "      {/* ==========================================", "      {/* Modals", "      {/* MODALS"]:
        idx = code.find(marker)
        if idx != -1:
            content_area_end = idx
            break
            
    use_fuzzy = (content_area_start != -1 and content_area_end != -1)
    
    tab_var = mod["tab_var"]
    pattern = r"\{" + tab_var + r" === '([a-zA-Z0-9_]+)'\s*&&\s*"
    
    if use_fuzzy:
        print("Using fuzzy markers to isolate content area.")
        content_area_code = code[content_area_start:content_area_end]
        matches = list(re.finditer(pattern, content_area_code))
    else:
        print("Using min/max index of matches to replace region.")
        matches = list(re.finditer(pattern, code))
        
    print(f"Found {len(matches)} feature matches in file.")
    
    subcomponents = {}
    comp_mapping = {}
    
    min_idx = len(code)
    max_idx = 0
    
    for match in matches:
        feature = match.group(1)
        if use_fuzzy:
            abs_match_start = content_area_start + match.start()
        else:
            abs_match_start = match.start()
            
        brace_idx = abs_match_start
        close_idx = find_matching_brace(code, brace_idx + 1)
        if close_idx == -1:
            print(f"Error finding matching close brace for {feature}")
            continue
            
        min_idx = min(min_idx, brace_idx)
        max_idx = max(max_idx, close_idx + 1)
        
        block = code[brace_idx:close_idx+1]
        
        inner_start = block.find("&&") + 2
        inner_block = block[inner_start:-1].strip()
        if inner_block.startswith('(') and inner_block.endswith(')'):
            inner_block = inner_block[1:-1].strip()
            
        comp_name = mod["comp_prefix"] + camel_case(feature)
        
        referenced_vars = []
        for var in scope_variables:
            if re.search(r"\b" + var + r"\b", inner_block):
                referenced_vars.append(var)
                
        subcomponents[feature] = {
            "inner": inner_block,
            "comp_name": comp_name,
            "props": referenced_vars
        }
        comp_mapping[feature] = (comp_name, referenced_vars)

    dashboard_comp_name = mod["comp_prefix"] + "Dashboard"
    dashboard_match = re.search(r"const renderDashboard = \(\) => \((.*?)\);\s*(?:const renderTable|const apiRequest|const handle|const [a-zA-Z0-9_]+Data|const [a-zA-Z0-9_]+State|const [a-zA-Z0-9_]+ = |const renderDashboard|function |export |const )", code, re.DOTALL)
    
    if dashboard_match is not None:
        inner_dashboard = dashboard_match.group(1).strip()
        referenced_vars = []
        for var in scope_variables:
            if re.search(r"\b" + var + r"\b", inner_dashboard):
                referenced_vars.append(var)
                
        subcomponents['dashboard'] = {
            "inner": inner_dashboard,
            "comp_name": dashboard_comp_name,
            "props": referenced_vars
        }
        comp_mapping['dashboard'] = (dashboard_comp_name, referenced_vars)
        print("Extracted renderDashboard() successfully.")
    else:
        print("No renderDashboard() function found, skipping dashboard extraction.")

    for feature, info in subcomponents.items():
        comp_name = info["comp_name"]
        inner = info["inner"]
        props = info["props"]
        
        props_decl = []
        for p in props:
            if p.startswith('handle') or p.startswith('set') or p in ['renderTable', 'showToast', 'onNavigate', 'apiRequest', 'onUpdateFeatures']:
                props_decl.append(f"  {p}: any;")
            elif p in ['Clock', 'Clock3']:
                props_decl.append(f"  {p}: React.ComponentType<any>;")
            elif p in ['user', 'socket', 'token', 'backendUrl', 'workspaceStats']:
                props_decl.append(f"  {p}: any;")
            else:
                props_decl.append(f"  {p}: any[];")
                
        interface_code = f"interface Props {{\n" + "\n".join(props_decl) + "\n}"
        
        all_icons = ["Mail", "Send", "RefreshCw", "Settings", "LayoutTemplate", "FileArchive", "Plus", "MoreHorizontal", "Trash2", "CheckCircle2", "Activity", "Search", "Filter", "Download", "Briefcase", "Clock", "Users", "Sliders", "ToggleLeft", "ToggleRight", "FileText", "ArrowUpRight", "ArrowDownRight", "Target", "ActivitySquare", "AlertCircle", "Sliders", "SlidersHorizontal", "UserPlus", "Shield", "Boxes", "Factory", "CheckCircle", "Wrench", "ClipboardList", "Calendar", "FileCheck", "TrendingUp", "ShoppingCart", "Percent", "RotateCcw", "CreditCard", "Building", "ChevronDown", "ChevronRight", "GraduationCap", "Check", "X", "Award", "FileUp", "Clock3", "FileSpreadsheet", "FileArchive", "DollarSign", "Clock", "Settings2", "Eye", "EyeOff", "AlertTriangle", "Trash", "Printer", "Edit", "Inbox", "ShieldCheck", "Network", "Server", "Database", "Menu", "LogOut", "LayoutDashboard", "Package", "Truck", "BarChart", "BarChart3", "HelpCircle", "Bell", "Lock", "Unlock"]
        used_icons = sorted(list(set([icon for icon in all_icons if icon in inner])))
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
        sub_path = os.path.join(target_dir, f"{comp_name}.tsx")
        with open(sub_path, "w", encoding="utf-8") as f_sub:
            f_sub.write(sub_code)
        print(f"Created feature component: {comp_name}.tsx")
        
    orchestrator_imports = "\n".join([f"import {{ {comp_mapping[f][0]} }} from './{comp_mapping[f][0]}';" for f in comp_mapping])
    
    orchestrator_renders = []
    for f in comp_mapping:
        comp_name, props = comp_mapping[f]
        props_passing = " ".join([f"{p}={{{p}}}" for p in props])
        extra_modal_passes = []
        for modal_set in ['setShowSmtpModal', 'setShowTemplateModal', 'setShowSendModal', 'setShowRetryModal', 'setShowQuotaModal', 'setShowLeadModal', 'setShowCustomerModal', 'setShowFollowUpModal', 'setShowOpportunityModal', 'setShowNoteModal', 'setShowStageModal', 'setShowEmployeeModal', 'setShowBomModal', 'setShowRequisitionModal', 'setShowInspectionModal', 'setShowDocModal', 'setShowReviewModal', 'setShowLeaveModal', 'setShowShiftModal', 'setShowReimbursementModal', 'setShowVoucherModal', 'setShowAssetModal']:
            if modal_set in code and modal_set not in props:
                extra_modal_passes.append(f"{modal_set}={{{modal_set}}}")
        if extra_modal_passes:
            props_passing += " " + " ".join(extra_modal_passes)
            
        orchestrator_renders.append(f"        {{{tab_var} === '{f}' && <{comp_name} {props_passing} />}}")
        
    replacement = "\n".join(orchestrator_renders)
    
    if use_fuzzy:
        full_replacement = f"      {{/* Content Area */}}\n      <div className=\"flex-1 overflow-hidden\">\n{replacement}\n      </div>"
        new_code = code[:content_area_start] + full_replacement + "\n\n" + code[content_area_end:]
    else:
        new_code = code[:min_idx] + replacement + code[max_idx:]
        
    new_code = re.sub(r"const renderDashboard = \(\) => \((.*?)\);\s*\n?", "", new_code, flags=re.DOTALL)
    
    lucide_match = re.search(r"\}\s*from\s*['\"]lucide-react['\"];?", new_code)
    if lucide_match:
        end_import_idx = lucide_match.end()
        new_code = new_code[:end_import_idx] + "\n" + orchestrator_imports + "\n" + new_code[end_import_idx:]
    else:
        import_end_idx = 0
        for m in re.finditer(r"import.*?\n", new_code):
            import_end_idx = max(import_end_idx, m.end())
        new_code = new_code[:import_end_idx] + "\n" + orchestrator_imports + "\n" + new_code[import_end_idx:]
        
    with open(target_file, "w", encoding="utf-8") as f:
        f.write(new_code)
    print(f"Successfully modularized {mod['file']} orchestrator!")

print("\nAll modules split completed successfully!")
