import os

file_path = "App.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Add states
if "const [featureSearchTerm" not in content:
    state_injection = """  const [featureSearchTerm, setFeatureSearchTerm] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  
  const toggleCategoryAccordion = (key: string) => {
    setExpandedCategories(prev => 
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };
  
  const filteredHierarchy = MASTER_FEATURES_HIERARCHY.map(cat => {
    const term = featureSearchTerm.toLowerCase();
    const matchCat = cat.name.toLowerCase().includes(term) || cat.desc.toLowerCase().includes(term);
    const matchChildren = cat.children.filter(c => c.name.toLowerCase().includes(term) || c.desc.toLowerCase().includes(term));
    if (term && (matchCat || matchChildren.length > 0)) {
      return { ...cat, children: matchCat ? cat.children : matchChildren, isMatch: true };
    } else if (!term) {
      return { ...cat, isMatch: false };
    }
    return null;
  }).filter(Boolean);

  const handleEnableAllNewCompany = () => {
    const all = MASTER_FEATURES_HIERARCHY.flatMap(cat => [cat.key, ...cat.children.map(c => c.key)]);
    setNewCompany({ ...newCompany, features: all });
  };

  const handleEnableCategoryAllNewCompany = (catKey: string) => {
    const cat = MASTER_FEATURES_HIERARCHY.find(c => c.key === catKey);
    if (!cat) return;
    const toAdd = [cat.key, ...cat.children.map(c => c.key)];
    const updated = [...new Set([...newCompany.features, ...toAdd])];
    setNewCompany({ ...newCompany, features: updated });
  };

  const handleEnableAllCompany = async () => {
    if (!selectedCompany) return;
    const all = MASTER_FEATURES_HIERARCHY.flatMap(cat => [cat.key, ...cat.children.map(c => c.key)]);
    try {
      await apiRequest(`/api/super/company/${selectedCompany.id}`, 'PATCH', { features: all });
      fetchSuperAdminData();
    } catch (e) {}
  };

  const handleEnableCategoryAllCompany = async (catKey: string) => {
    if (!selectedCompany) return;
    const cat = MASTER_FEATURES_HIERARCHY.find(c => c.key === catKey);
    if (!cat) return;
    const current = selectedCompany.features.map((f: any) => f.feature.key);
    const toAdd = [cat.key, ...cat.children.map(c => c.key)];
    const updated = [...new Set([...current, ...toAdd])];
    try {
      await apiRequest(`/api/super/company/${selectedCompany.id}`, 'PATCH', { features: updated });
      fetchSuperAdminData();
    } catch (e) {}
  };
"""
    content = content.replace("const [editUserForm, setEditUserForm] = useState({", state_injection + "\n  const [editUserForm, setEditUserForm] = useState({")

# Replace newCompany map
old_new_map = """                      <div className="flex flex-col gap-3">
                        {MASTER_FEATURES_HIERARCHY.map((cat: any) => {
                          const isParentActive = newCompany.features.includes(cat.key);
                          const isNotifications = cat.key === 'NOTIFICATIONS';

                          return (
                            <div key={cat.key} className="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl p-4 flex flex-col gap-3 select-none">
                              <div className="flex items-center justify-between pb-2 border-b border-[var(--border-color)]/50">
                                <div className="text-left">
                                  <span className="text-xs font-extrabold text-[var(--text-primary)] block font-display uppercase tracking-wider flex items-center gap-1.5">
                                    <span className={`w-2.5 h-2.5 rounded-full ${isParentActive ? 'bg-indigo-500 animate-pulse' : 'bg-slate-500'}`} />
                                    {cat.name}
                                  </span>
                                  <span className="text-[9px] text-[var(--text-muted)] mt-0.5 block">{cat.desc}</span>
                                </div>
                                <button
                                  type="button"
                                  disabled={isNotifications}
                                  onClick={() => handleToggleNewCompanyFeatureHierarchical(cat.key)}
                                  className={`px-3 py-1 rounded text-[10px] font-extrabold transition-colors cursor-pointer ${
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

                              {/* Child items grid */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-1 pl-4 border-l-2 border-indigo-500/10">
                                {cat.children.map(child => {"""

new_new_map = """                      <div className="flex items-center justify-between mb-3">
                        <label className="text-[10px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block">Subscription Feature Modules</label>
                        <button type="button" onClick={handleEnableAllNewCompany} className="px-3 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold shadow-sm transition-colors cursor-pointer">
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
                          const isParentActive = newCompany.features.includes(cat.key);
                          const isNotifications = cat.key === 'NOTIFICATIONS';
                          const isExpanded = expandedCategories.includes(cat.key) || cat.isMatch;

                          return (
                            <div key={cat.key} className="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl p-4 flex flex-col gap-3 select-none">
                              <div className="flex items-center justify-between pb-2 border-b border-[var(--border-color)]/50">
                                <div className="text-left cursor-pointer flex-1" onClick={() => toggleCategoryAccordion(cat.key)}>
                                  <span className="text-xs font-extrabold text-[var(--text-primary)] block font-display uppercase tracking-wider flex items-center gap-2">
                                    {isExpanded ? <ChevronDown size={14} className="text-indigo-500" /> : <ChevronRight size={14} className="text-slate-400" />}
                                    <span className={`w-2.5 h-2.5 rounded-full ${isParentActive ? 'bg-indigo-500 animate-pulse' : 'bg-slate-500'}`} />
                                    {cat.name}
                                  </span>
                                  <span className="text-[9px] text-[var(--text-muted)] mt-0.5 block ml-6">{cat.desc}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  {!isNotifications && (
                                    <button
                                      type="button"
                                      onClick={() => handleEnableCategoryAllNewCompany(cat.key)}
                                      className="px-2 py-1 rounded text-[9px] font-bold bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 border border-indigo-500/20 cursor-pointer"
                                    >
                                      ENABLE ALL
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    disabled={isNotifications}
                                    onClick={() => handleToggleNewCompanyFeatureHierarchical(cat.key)}
                                    className={`px-3 py-1 rounded text-[10px] font-extrabold transition-colors cursor-pointer ${
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
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-1 pl-4 border-l-2 border-indigo-500/10">
                                {cat.children.map((child: any) => {"""

if 'label className="text-[10px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block mb-3"' in content:
    content = content.replace("""                      <label className="text-[10px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block mb-3">Subscription Feature Modules (Hierarchical Configuration)</label>\n""" + old_new_map, new_new_map)

# Replace selectedCompany map
old_sel_map = """                      <div className="flex flex-col gap-3">
                        {MASTER_FEATURES_HIERARCHY.map((cat: any) => {
                          const activeKeys = selectedCompany.features.map((f: any) => f.feature.key);
                          const isParentActive = activeKeys.includes(cat.key);
                          const isNotifications = cat.key === 'NOTIFICATIONS';

                          return (
                            <div key={cat.key} className="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl p-4 flex flex-col gap-3 select-none">
                              <div className="flex items-center justify-between pb-2 border-b border-[var(--border-color)]/50">
                                <div className="text-left">
                                  <span className="text-xs font-extrabold text-[var(--text-primary)] block font-display uppercase tracking-wider flex items-center gap-1.5">
                                    <span className={`w-2.5 h-2.5 rounded-full ${isParentActive ? 'bg-indigo-500 animate-pulse' : 'bg-slate-500'}`} />
                                    {cat.name}
                                  </span>
                                  <span className="text-[9px] text-[var(--text-muted)] mt-0.5 block">{cat.desc}</span>
                                </div>
                                <button
                                  type="button"
                                  disabled={isNotifications}
                                  onClick={() => handleToggleCompanyFeatureHierarchical(cat.key)}
                                  className={`px-3 py-1 rounded text-[10px] font-extrabold transition-colors cursor-pointer ${
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

                              {/* Child items grid */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-1 pl-4 border-l-2 border-indigo-500/10">
                                {cat.children.map(child => {"""

new_sel_map = """                      <div className="flex items-center justify-between mb-3">
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
                            <div key={cat.key} className="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl p-4 flex flex-col gap-3 select-none">
                              <div className="flex items-center justify-between pb-2 border-b border-[var(--border-color)]/50">
                                <div className="text-left cursor-pointer flex-1" onClick={() => toggleCategoryAccordion(cat.key)}>
                                  <span className="text-xs font-extrabold text-[var(--text-primary)] block font-display uppercase tracking-wider flex items-center gap-2">
                                    {isExpanded ? <ChevronDown size={14} className="text-indigo-500" /> : <ChevronRight size={14} className="text-slate-400" />}
                                    <span className={`w-2.5 h-2.5 rounded-full ${isParentActive ? 'bg-indigo-500 animate-pulse' : 'bg-slate-500'}`} />
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
                                    className={`px-3 py-1 rounded text-[10px] font-extrabold transition-colors cursor-pointer ${
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
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-1 pl-4 border-l-2 border-indigo-500/10">
                                {cat.children.map((child: any) => {"""

if '<h3 className="font-bold text-sm text-[var(--text-primary)] border-b border-[var(--border-color)] pb-2 font-display">\n                          Hierarchical Feature Configuration\n                        </h3>' in content:
    content = content.replace("""                        <h3 className="font-bold text-sm text-[var(--text-primary)] border-b border-[var(--border-color)] pb-2 font-display">
                          Hierarchical Feature Configuration
                        </h3>
                        <p className="text-[var(--text-secondary)] text-[10px] leading-relaxed">
                          Toggle category locks or individually assign active features for this corporate tenant. Child sub-features auto-enable their parent categories.
                        </p>\n\n""" + old_sel_map, new_sel_map)


# Need to close the extra `{isExpanded && (` at the bottom of the map blocks.
# Let's find: `)}` right after the map blocks...
# Actually, the original is:
#                                 {cat.children.map(child => {
# ...
#                                 })}
#                               </div>
#                             </div>
#                           );
#                         })}
#
# I need to change:
#                               </div>
#                             </div>
#                           );
#                         })}
# To:
#                               </div>
#                               )}
#                             </div>
#                           );
#                         })}

# We'll just do a targeted regex or string replacement for those end tags.
end_old = """                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>"""

end_new = """                                  </div>
                                </div>
                              );
                            })}
                          </div>
                          )}
                        </div>"""

content = content.replace(end_old, end_new)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("App.tsx updated")
