import re

file_path = "App.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

pattern = re.compile(
    r'<h3 className="font-bold text-sm text-\[var\(--text-primary\)\] border-b border-\[var\(--border-color\)\] pb-2 font-display">\s*Hierarchical Feature Configuration\s*</h3>.*?(?=\s*\{/\* Corporate Admin addition card \*/\})',
    re.DOTALL
)

new_content = """<h3 className="font-bold text-sm text-[var(--text-primary)] border-b border-[var(--border-color)] pb-2 font-display">
                        Hierarchical Feature Configuration
                      </h3>
                      <p className="text-[var(--text-secondary)] text-[10px] leading-relaxed">
                        Toggle category locks or individually assign active features for this corporate tenant. Child sub-features auto-enable their parent categories.
                      </p>

                      <div className="flex items-center justify-between mt-3 mb-1">
                        <label className="text-[10px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block">Subscription Feature Modules</label>
                        <button type="button" onClick={handleEnableAllCompany} className="px-3 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold shadow-sm transition-colors cursor-pointer">
                          Enable All Categories & Features
                        </button>
                      </div>
                      <div className="mb-4 relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Activity className="h-4 w-4 text-[var(--text-muted)]" />
                        </div>
                        <input
                          type="text"
                          placeholder="Search features or categories..."
                          value={featureSearchTerm}
                          onChange={(e) => setFeatureSearchTerm(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg text-xs focus:outline-none focus:border-indigo-500/50 text-[var(--text-primary)] transition-colors"
                        />
                      </div>
                      <div className="flex flex-col gap-3">
                        {filteredHierarchy.map((cat: any) => {
                          const activeKeys = selectedCompany.features.map((f: any) => f.feature.key);
                          const isParentActive = activeKeys.includes(cat.key);
                          const isNotifications = cat.key === 'NOTIFICATIONS';
                          const isExpanded = expandedCategories.includes(cat.key) || cat.isMatch;

                          return (
                            <div key={cat.key} className="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl p-3 flex flex-col gap-2.5 select-none">
                              <div className="flex items-center justify-between pb-1.5 border-b border-[var(--border-color)]/50">
                                <div className="text-left cursor-pointer flex-1" onClick={() => toggleCategoryAccordion(cat.key)}>
                                  <span className="text-[11px] font-extrabold text-[var(--text-primary)] block font-display uppercase tracking-wider flex items-center gap-2">
                                    {isExpanded ? <ChevronDown size={14} className="text-indigo-500" /> : <ChevronRight size={14} className="text-slate-400" />}
                                    <span className={`w-2 h-2 rounded-full ${isParentActive ? 'bg-indigo-500 animate-pulse' : 'bg-slate-500'}`} />
                                    {cat.name}
                                  </span>
                                  <span className="text-[9px] text-[var(--text-muted)] mt-0.5 block ml-6">{cat.desc}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  {!isNotifications && (
                                    <button
                                      type="button"
                                      onClick={() => handleEnableCategoryAllCompany(cat.key)}
                                      className="px-2 py-1 rounded text-[9px] font-bold bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 border border-indigo-500/20 cursor-pointer"
                                    >
                                      ENABLE ALL
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    disabled={isNotifications}
                                    onClick={() => handleToggleCompanyFeatureHierarchical(cat.key)}
                                    className={`px-2 py-0.5 rounded text-[9px] font-extrabold transition-colors cursor-pointer ${
                                      isNotifications 
                                        ? 'bg-indigo-500/20 text-indigo-400 cursor-not-allowed border border-indigo-500/30'
                                        : isParentActive 
                                          ? 'bg-emerald-600 text-white hover:bg-emerald-700' 
                                          : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                    }`}
                                  >
                                    {isNotifications ? 'ENFORCED' : isParentActive ? 'ENABLED' : 'DISABLED'}
                                  </button>
                                </div>
                              </div>

                              {/* Child items grid */}
                              {isExpanded && (
                              <div className="grid grid-cols-1 gap-2 mt-0.5 pl-3 border-l-2 border-indigo-500/10 text-left">
                                {cat.children.map((child: any) => {
                                  const isChildActive = activeKeys.includes(child.key);
                                  const isLocked = !isParentActive;

                                  return (
                                    <div 
                                      key={child.key}
                                      className={`p-2 border rounded-lg flex items-center justify-between transition-all ${
                                        isLocked
                                          ? 'opacity-40 bg-[var(--bg-tertiary)] border-[var(--border-color)] cursor-not-allowed'
                                          : isChildActive
                                            ? 'bg-indigo-500/5 border-indigo-500/30'
                                            : 'bg-[var(--bg-primary)] border-[var(--border-color)] hover:border-[var(--border-active)]'
                                      }`}
                                    >
                                      <div className="text-left max-w-[70%]">
                                        <span className="text-[10px] font-bold text-[var(--text-primary)] block font-display leading-tight">{child.name}</span>
                                        <span className="text-[8px] text-[var(--text-muted)] leading-tight block mt-0.5">{child.desc}</span>
                                      </div>

                                      <button
                                        type="button"
                                        disabled={isLocked || (isNotifications && child.key === 'NOTIFICATIONS_PUSH')}
                                        onClick={() => handleToggleCompanyFeatureHierarchical(child.key)}
                                        className={`px-1.5 py-0.5 rounded text-[8px] font-bold cursor-pointer transition-colors ${
                                          isLocked
                                            ? 'bg-transparent text-[var(--text-muted)] border border-dashed border-[var(--border-color)] cursor-not-allowed'
                                            : isChildActive
                                              ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                                              : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                        }`}
                                      >
                                        {isLocked ? 'LOCKED' : isChildActive ? 'ACTIVE' : 'OFF'}
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>"""

matches = pattern.findall(content)
if not matches:
    print("Could not find the block to replace!")
else:
    content = pattern.sub(new_content, content)
    # Also fix the first block if it's missing parenthesis
    content = content.replace("{isExpanded && \n                              <div", "{isExpanded && (\n                              <div")
    content = content.replace("</div>\n                              }", "</div>\n                              )}")
    content = content.replace("</div>\n                                }", "</div>\n                                )}")
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)
    print("Replaced successfully!")
