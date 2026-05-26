import React from 'react';
import { Briefcase } from 'lucide-react';

interface CorporateDepartmentsProps {
  departmentList: any[];
  companyUsers: any[];
  companyFeatures: string[];
  deptForm: {
    name: string;
    description: string;
    features: string[];
    managerId: string;
  };
  setDeptForm: React.Dispatch<React.SetStateAction<any>>;
  isEditingDept: boolean;
  setIsEditingDept: (val: boolean) => void;
  editingDeptId: string | null;
  setEditingDeptId: (val: string | null) => void;
  handleCreateOrUpdateDeptSubmit: (e: React.FormEvent) => Promise<void>;
  handleDeleteDept: (deptId: string) => Promise<void>;
}

export default function CorporateDepartments({
  departmentList,
  companyUsers,
  companyFeatures,
  deptForm,
  setDeptForm,
  isEditingDept,
  setIsEditingDept,
  editingDeptId,
  setEditingDeptId,
  handleCreateOrUpdateDeptSubmit,
  handleDeleteDept,
}: CorporateDepartmentsProps) {
  return (
    <div className="animate-fade-in flex flex-col gap-4 text-left">
      <div className="flex justify-between items-center border-b border-[var(--border-color)] pb-2 text-left">
        <h3 className="font-bold text-sm text-[var(--text-primary)] font-display flex items-center gap-1.5 uppercase tracking-wide">
          <Briefcase className="w-4 h-4 text-indigo-400" /> Corporate divisions & Departments
        </h3>
        <button
          type="button"
          onClick={() => {
            setIsEditingDept(!isEditingDept);
            setEditingDeptId(null);
            setDeptForm({ name: '', description: '', features: [], managerId: '' });
          }}
          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-[9px] uppercase tracking-wider rounded-lg transition-colors cursor-pointer border-0"
        >
          {isEditingDept && !editingDeptId ? 'Close Form' : 'Create Department'}
        </button>
      </div>

      {/* Edit/Create Department Form */}
      {isEditingDept && (
        <form onSubmit={handleCreateOrUpdateDeptSubmit} className="bg-[var(--bg-primary)] border border-[var(--border-color)] p-5 rounded-xl flex flex-col gap-4 select-none animate-scale-up text-left max-w-xl mx-auto w-full border-0">
          <span className="text-[10px] font-extrabold text-indigo-400 tracking-wider uppercase block border-b border-[var(--border-color)]/50 pb-2">
            {editingDeptId ? `Modify Department: ${deptForm.name}` : 'Create Department'}
          </span>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
            <div className="text-left">
              <label className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider block text-left">Department Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Sales, Human Resources"
                value={deptForm.name}
                onChange={e => setDeptForm({ ...deptForm, name: e.target.value })}
                className="w-full mt-1 bg-[var(--bg-secondary)] border border-[var(--border-color)] py-2 px-3 rounded-lg text-xs"
              />
            </div>
            <div className="text-left">
              <label className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider block text-left">Designate Manager (Optional)</label>
              <select
                value={deptForm.managerId}
                onChange={e => setDeptForm({ ...deptForm, managerId: e.target.value })}
                className="w-full mt-1 bg-[var(--bg-secondary)] border border-[var(--border-color)] py-2 px-3 rounded-lg text-xs cursor-pointer text-[var(--text-primary)] font-semibold"
              >
                <option value="">-- Choose Manager --</option>
                {companyUsers.map(u => (
                  <option key={u.id} value={u.id}>{u.username}</option>
                ))}
              </select>
            </div>
            <div className="col-span-1 md:col-span-2 text-left">
              <label className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider block text-left">Description</label>
              <textarea
                rows={2}
                placeholder="Describe the department responsibilities..."
                value={deptForm.description}
                onChange={e => setDeptForm({ ...deptForm, description: e.target.value })}
                className="w-full mt-1 bg-[var(--bg-secondary)] border border-[var(--border-color)] py-2 px-3 rounded-lg text-xs resize-none"
              />
            </div>

            {/* Features checkboxes */}
            <div className="col-span-1 md:col-span-2 text-left">
              <label className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider block mb-2 text-left">Allocate Subscription Modules Feature Access</label>
              <div className="grid grid-cols-2 gap-3 border border-[var(--border-color)]/60 rounded-xl p-3 bg-[var(--bg-secondary)]/30 text-left">
                {['GENERAL_CHAT', 'GENERAL_EXPENSE_CHAT', 'NOTIFICATIONS_PUSH', 'NOTIFICATIONS_AUDIT'].map(featureKey => {
                  const isChecked = deptForm.features.includes(featureKey);
                  const isGranted = companyFeatures.includes(featureKey);
                  if (!isGranted) return null;

                  return (
                    <label key={featureKey} className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          const updated = isChecked
                            ? deptForm.features.filter(f => f !== featureKey)
                            : [...deptForm.features, featureKey];
                          setDeptForm({ ...deptForm, features: updated });
                        }}
                        className="rounded bg-[var(--bg-primary)] border-[var(--border-color)] text-indigo-600 focus:ring-0 w-4 h-4 cursor-pointer"
                      />
                      {featureKey.replace('_', ' ')}
                    </label>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex gap-2 justify-end mt-4 pt-3 border-t border-[var(--border-color)]/50 text-left">
            <button
              type="button"
              onClick={() => {
                setIsEditingDept(false);
                setEditingDeptId(null);
              }}
              className="px-4 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-color)] hover:text-[var(--text-primary)] text-xs font-bold rounded-lg cursor-pointer border-0 bg-transparent"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg cursor-pointer border-0"
            >
              {editingDeptId ? 'Save Division' : 'Build Division'}
            </button>
          </div>
        </form>
      )}

      {/* Departments directory listing */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2 text-left">
        {departmentList.map(dept => {
          return (
            <div key={dept.id} className="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl p-4.5 flex flex-col justify-between gap-3 text-left">
              <div className="text-left">
                <div className="flex justify-between items-center pb-1.5 border-b border-[var(--border-color)]/50 text-left">
                  <span className="font-bold text-sm text-[var(--text-primary)] font-display uppercase tracking-wider">{dept.name}</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditingDept(true);
                        setEditingDeptId(dept.id);
                        setDeptForm({
                          name: dept.name,
                          description: dept.description || '',
                          features: dept.features || [],
                          managerId: dept.manager?.id || ''
                        });
                      }}
                      className="px-2 py-0.5 bg-indigo-600/10 hover:bg-indigo-600 text-indigo-400 hover:text-white font-extrabold text-[8px] uppercase rounded transition-all cursor-pointer border-0 bg-transparent"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteDept(dept.id)}
                      className="px-2 py-0.5 bg-rose-500/10 hover:bg-rose-600 text-rose-400 hover:text-white font-extrabold text-[8px] uppercase rounded transition-all cursor-pointer border-0 bg-transparent"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <p className="text-[var(--text-secondary)] text-[11px] mt-2 leading-relaxed h-10 overflow-y-auto">{dept.description || 'No division description provided.'}</p>
                
                <div className="mt-3 flex flex-col gap-1 text-[10px] text-left">
                  <span className="text-[var(--text-muted)] text-left">Designated Manager: <strong className="text-[var(--text-primary)]">{dept.manager?.username || 'None Assigned'}</strong></span>
                  <span className="text-[var(--text-muted)] text-left">Division Employees: <strong className="text-indigo-400">{dept._count?.users || 0} Members</strong></span>
                </div>
              </div>

              {/* Feature tag chips */}
              <div className="border-t border-[var(--border-color)]/30 pt-2.5 flex flex-wrap gap-1 mt-1 text-left">
                {(dept.features || []).map((fKey: string) => (
                  <span key={fKey} className="bg-indigo-500/10 text-indigo-400 font-bold text-[8px] uppercase tracking-wider py-0.5 px-2 rounded-full border border-indigo-500/10">
                    {fKey.replace('GENERAL_', '').replace('NOTIFICATIONS_', '').replace('_', ' ')}
                  </span>
                ))}
                {(dept.features || []).length === 0 && (
                  <span className="text-[8px] text-[var(--text-muted)] italic font-bold">No feature modules allocated to this division</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
