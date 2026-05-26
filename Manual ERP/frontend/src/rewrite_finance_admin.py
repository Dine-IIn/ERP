import os
import re

components_base = r"d:\ERP\Manual ERP\frontend\src\components"

modules = [
    {
        "dir": "finance",
        "file": "FinanceAccounting.tsx",
        "comp_prefix": "Finance",
        "tab_var": "activeTab"
    },
    {
        "dir": "admin",
        "file": "GeneralAdmin.tsx",
        "comp_prefix": "Admin",
        "tab_var": "activeTab"
    }
]

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

def camel_case(s):
    parts = s.replace('_', ' ').replace('-', ' ').split()
    return "".join([p.capitalize() for p in parts])

for mod in modules:
    dir_path = os.path.join(components_base, mod["dir"])
    file_path = os.path.join(dir_path, mod["file"])
    
    with open(file_path, "r", encoding="utf-8") as f:
        code = f.read()
        
    tab_var = mod["tab_var"]
    pattern = r"\{" + tab_var + r" === '([a-zA-Z0-9_]+)'\s*&&\s*"
    matches = list(re.finditer(pattern, code))
    
    if not matches:
        print(f"No matches in {mod['file']}")
        continue
        
    # Find all variables in the orchestrator
    comp_declaration = re.search(r"const\s+[a-zA-Z0-9_]+\s*:\s*React\.FC.*?=\s*\(\{\s*(.*?)\s*\}\)", code, re.DOTALL)
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
    
    scope_variables = set(prop_names)
    scope_variables.add("renderTable")
    scope_variables.add("showToast")
    if "const Clock = " in code:
        scope_variables.add("Clock")
    for v1, v2 in body_vars:
        if v1: scope_variables.add(v1)
        if v2: scope_variables.add(v2)
        
    subcomponents = {}
    comp_mapping = {}
    
    # Calculate bounds of all conditional tab renderings to replace
    min_idx = len(code)
    max_idx = 0
    
    for match in matches:
        feature = match.group(1)
        brace_idx = match.start()
        close_idx = find_matching_brace(code, brace_idx + 1)
        
        if close_idx == -1:
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
        
    # Rewrite the Orchestrator Component
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
    
    # Replace from min_idx to max_idx
    new_code = code[:min_idx] + replacement + code[max_idx:]
    
    # Add imports at top
    import_end_idx = 0
    for m in re.finditer(r"import.*?\n", new_code):
        import_end_idx = max(import_end_idx, m.end())
        
    new_code = new_code[:import_end_idx] + "\n" + orchestrator_imports + "\n" + new_code[import_end_idx:]
    
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(new_code)
        
    print(f"Successfully rewritten orchestrator for {mod['file']}!")
