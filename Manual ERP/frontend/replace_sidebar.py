with open('d:/ERP/Manual ERP/frontend/src/App.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

start_idx = 1816
end_idx = 2439

replacement = '''                  {/* Dynamic Sidebar Modules */}
                  {/* TODO: Implement categories and features one by one here */}
                  <div className="px-3 py-2 mt-4 text-center">
                    <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest border border-dashed border-[var(--border-color)] rounded p-2 block">
                      Empty Navigation
                    </span>
                  </div>
'''

new_lines = lines[:start_idx] + [replacement] + lines[end_idx:]

with open('d:/ERP/Manual ERP/frontend/src/App.tsx', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)
print("Successfully replaced.")
