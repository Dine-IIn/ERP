import React, { useState } from 'react';
import { Shield, ChevronDown, Award, CheckCircle } from 'lucide-react';
import { MASTER_FEATURES_HIERARCHY } from '../../features';

interface RolesPermissionsProps {
  companyRoles: any[];
  companyFeatures: string[];
  newRole: { name: string; permissions: any };
  setNewRole: React.Dispatch<React.SetStateAction<any>>;
  handleCreateRoleSubmit: (e: React.FormEvent) => Promise<void>;
  handleUpdateRolePermissionsSubmit: (roleId: string, permissions: any) => Promise<void>;
  handleDeleteRole: (roleId: string) => Promise<void>;
}

export default function RolesPermissions({
  companyRoles,
  companyFeatures,
  newRole,
  setNewRole,
  handleCreateRoleSubmit,
  handleUpdateRolePermissionsSubmit,
  handleDeleteRole,
}: RolesPermissionsProps) {
  // Local state for active role dropdown selection and permissions matrix editing
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [rolePermissionsForm, setRolePermissionsForm] = useState<Record<string, string[]>>({});

  const activeRoleId = selectedRoleId || companyRoles[0]?.id || null;
  const role = companyRoles.find(r => r.id === activeRoleId);

  const isEditing = editingRoleId === role?.id;
  const isMasterAdmin = role?.name === 'Admin';
  const rolePerms = isEditing ? rolePermissionsForm : (role?.permissions || {});

  const togglePerm = (featureKey: string, action: string) => {
    const activeActions = rolePerms[featureKey] || [];
    const updated = activeActions.includes(action)
      ? activeActions.filter((a: string) => a !== action)
      : [...activeActions, action];
    
    setRolePermissionsForm({
      ...rolePerms,
      [featureKey]: updated
    });
  };

  return (
    <div className="animate-fade-in flex flex-col gap-5 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[var(--border-color)] pb-3 gap-3">
        <div className="text-left">
          <h3 className="font-bold text-base text-[var(--text-primary)] font-display flex items-center gap-2 uppercase tracking-wide">
            <Shield className="w-5 h-5 text-indigo-400" /> Roles Authorization & Permissions Control Panel
          </h3>
          <p className="text-[var(--text-secondary)] text-[10px] mt-0.5">Select a role from the profile selector dropdown to modify its corporate permission gates.</p>
        </div>
      </div>

      {/* Role Selection & Role Creation Panel */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border border-[var(--border-color)] rounded-2xl bg-[var(--bg-secondary)]/30 backdrop-blur-md">
        {/* Dropdown Role Selector */}
        <div className="flex flex-col gap-1.5 text-left">
          <label className="text-[10px] font-extrabold uppercase tracking-widest text-[var(--text-secondary)]">Active Role Profile Selector</label>
          <div className="relative w-full">
            <select
              value={activeRoleId || ''}
              onChange={e => {
                setSelectedRoleId(e.target.value);
                setEditingRoleId(null);
              }}
              className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-indigo-500/50 py-2.5 pl-3.5 pr-10 rounded-xl text-xs font-bold text-[var(--text-primary)] cursor-pointer outline-none appearance-none transition-all"
            >
              {companyRoles.map(r => (
                <option key={r.id} value={r.id}>{r.name} {r.name === 'Admin' ? '(Master Bypass)' : ''}</option>
              ))}
              {companyRoles.length === 0 && (
                <option value="" disabled>No roles configured</option>
              )}
            </select>
            <ChevronDown className="w-4 h-4 text-[var(--text-secondary)] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Create Custom Role Trigger Inline */}
        <form onSubmit={handleCreateRoleSubmit} className="flex flex-col gap-1.5 text-left">
          <label className="text-[10px] font-extrabold uppercase tracking-widest text-[var(--text-secondary)]">Spawn Custom Role</label>
          <div className="flex gap-2">
            <input
              type="text"
              required
              placeholder="e.g. Sales Supervisor"
              value={newRole.name}
              onChange={e => setNewRole({ ...newRole, name: e.target.value })}
              className="flex-1 bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-indigo-500/50 py-2 px-3 rounded-xl text-xs outline-none transition-all"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-[10px] uppercase tracking-wider rounded-xl transition-all cursor-pointer border-0 flex items-center justify-center active:scale-95 shadow-md shadow-indigo-500/10"
            >
              Create Role
            </button>
          </div>
        </form>
      </div>

      {/* Selected Role Permissions Card */}
      {!role ? (
        <div className="p-12 text-center text-[var(--text-muted)] border border-[var(--border-color)] rounded-2xl bg-[var(--bg-secondary)]/10 flex flex-col items-center justify-center">
          <Shield className="w-12 h-12 text-[var(--border-color)] mb-3" />
          <p className="font-semibold text-sm">No corporate roles configured</p>
          <p className="text-[var(--text-secondary)] text-xs mt-1">Please enter a role label above to configure security access.</p>
        </div>
      ) : (
        <div className="bg-[var(--bg-secondary)]/20 border border-[var(--border-color)] rounded-2xl p-5 flex flex-col gap-5 text-left relative overflow-hidden backdrop-blur-xl">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center pb-3.5 border-b border-[var(--border-color)]/50 gap-3">
            <div className="text-left">
              <span className="font-black text-sm text-white flex items-center gap-1.5 uppercase tracking-wider font-display">
                <Award className="w-4 h-4 text-indigo-400" /> {role.name}
              </span>
              <span className="text-[10px] text-[var(--text-secondary)] mt-1 block">
                {isMasterAdmin ? 'Master Administrator: Bypasses read, write, and delete permissions boundaries globally.' : 'Granular access controls configured below.'}
              </span>
            </div>
            
            {!isMasterAdmin && (
              <div className="flex gap-2.5">
                {isEditing ? (
                  <>
                    <button
                      type="button"
                      onClick={async () => {
                        await handleUpdateRolePermissionsSubmit(role.id, rolePerms);
                        setEditingRoleId(null);
                      }}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] uppercase rounded-xl transition-all cursor-pointer border-0 active:scale-95 flex items-center gap-1 shadow-md shadow-emerald-500/10"
                    >
                      <CheckCircle className="w-3.5 h-3.5" /> Save Changes
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingRoleId(null)}
                      className="px-4 py-2 bg-[var(--bg-tertiary)] hover:bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-white font-bold text-[10px] uppercase rounded-xl transition-all cursor-pointer active:scale-95"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingRoleId(role.id);
                        setRolePermissionsForm(role.permissions || {});
                      }}
                      className="px-4 py-2 bg-indigo-600/10 hover:bg-indigo-600 text-indigo-400 hover:text-white font-bold text-[10px] uppercase rounded-xl transition-all cursor-pointer border-0 active:scale-95"
                    >
                      Modify Permissions
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Are you sure you want to delete the "${role.name}" role?`)) {
                          handleDeleteRole(role.id);
                          setSelectedRoleId(null);
                        }
                      }}
                      className="px-4 py-2 bg-rose-500/10 hover:bg-rose-600 text-rose-400 hover:text-white font-bold text-[10px] uppercase rounded-xl transition-all cursor-pointer border-0 active:scale-95"
                    >
                      Delete Role
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Permissions checkboxes grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
            {MASTER_FEATURES_HIERARCHY.map(cat => {
              const catKey = cat.key;
              const activeFeatures = cat.children.filter(c => companyFeatures.includes(c.key));
              if (activeFeatures.length === 0) return null;

              return (
                <div key={catKey} className="border border-[var(--border-color)] rounded-xl p-4 bg-[var(--bg-tertiary)]/40 backdrop-blur-md flex flex-col gap-3 select-none">
                  <span className="text-[10px] font-extrabold text-indigo-400 block font-display tracking-widest uppercase pb-2 border-b border-[var(--border-color)]">{cat.name}</span>
                  <div className="flex flex-col gap-3 mt-1 text-left">
                    {activeFeatures.map(child => {
                      const actions = rolePerms[child.key] || [];
                      return (
                        <div key={child.key} className="flex flex-col gap-1 border-b border-[var(--border-color)]/10 pb-2.5 last:border-b-0 last:pb-0 text-left">
                          <span className="font-bold text-[10px] text-[var(--text-primary)] block font-display truncate text-left">{child.name}</span>
                          
                          {isMasterAdmin ? (
                            <span className="text-[8px] font-extrabold text-emerald-500 uppercase block tracking-wider mt-0.5 text-left">FULL BYPASS ASSIGNED</span>
                          ) : (
                            <div className="flex gap-4 mt-0.5 text-left">
                              {['read', 'write', 'delete'].map(act => {
                                const isChecked = actions.includes(act);
                                return (
                                  <label key={act} className="inline-flex items-center gap-1.5 text-[9px] font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer capitalize">
                                    <input
                                      type="checkbox"
                                      disabled={!isEditing}
                                      checked={isChecked}
                                      onChange={() => togglePerm(child.key, act)}
                                      className="rounded bg-[var(--bg-primary)] border-[var(--border-color)] text-indigo-600 focus:ring-0 w-3.5 h-3.5 cursor-pointer disabled:cursor-not-allowed"
                                    />
                                    {act}
                                  </label>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
