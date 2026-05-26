import React, { useState } from 'react';
import { Shield } from 'lucide-react';
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
  // Local state for permissions matrix editing
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [rolePermissionsForm, setRolePermissionsForm] = useState<Record<string, string[]>>({});

  return (
    <div className="animate-fade-in flex flex-col gap-4">
      <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-2">
        <h3 className="font-bold text-sm text-[var(--text-primary)] font-display flex items-center gap-1.5 uppercase tracking-wide">
          <Shield className="w-4 h-4 text-indigo-400" /> Roles Authorization & Permissions Grid
        </h3>
        {/* Create Custom Role Trigger Inline */}
        <form onSubmit={handleCreateRoleSubmit} className="flex items-center gap-2">
          <input
            type="text"
            required
            placeholder="Create Custom Role"
            value={newRole.name}
            onChange={e => setNewRole({ ...newRole, name: e.target.value })}
            className="bg-[var(--bg-primary)] border border-[var(--border-color)] py-1.5 px-3 rounded-lg text-[10px]"
          />
          <button
            type="submit"
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-[9px] uppercase tracking-wider rounded-lg transition-colors cursor-pointer border-0"
          >
            Create
          </button>
        </form>
      </div>

      {/* List Roles with accordions mapping permission checkboxes */}
      <div className="flex flex-col gap-3.5 mt-2">
        {companyRoles.map(role => {
          const isEditing = editingRoleId === role.id;
          const isMasterAdmin = role.name === 'Admin';
          const rolePerms = isEditing ? rolePermissionsForm : (role.permissions || {});

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
            <div key={role.id} className="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl p-4 flex flex-col gap-3">
              <div className="flex justify-between items-center pb-2 border-b border-[var(--border-color)]/50 text-left">
                <div className="text-left">
                  <span className="font-bold text-xs text-[var(--text-primary)] block font-display uppercase tracking-wider">{role.name}</span>
                  <span className="text-[9px] text-[var(--text-muted)] mt-0.5 block">
                    {isMasterAdmin ? 'Master administrator permissions. Read/Write/Delete boundary bypasses enabled.' : 'Configure granular accessibility keys below.'}
                  </span>
                </div>
                
                {!isMasterAdmin && (
                  <div className="flex gap-2">
                    {isEditing ? (
                      <>
                        <button
                          type="button"
                          onClick={async () => {
                            await handleUpdateRolePermissionsSubmit(role.id, rolePerms);
                            setEditingRoleId(null);
                          }}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[8px] uppercase rounded transition-colors cursor-pointer border-0"
                        >
                          Save Grid
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingRoleId(null)}
                          className="px-2.5 py-1 bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-[var(--text-secondary)] font-extrabold text-[8px] uppercase rounded cursor-pointer border-0 bg-transparent"
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
                          className="px-2.5 py-1 bg-indigo-600/10 hover:bg-indigo-600 text-indigo-400 hover:text-white font-extrabold text-[8px] uppercase rounded transition-all cursor-pointer border-0 bg-transparent"
                        >
                          Modify Permissions
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteRole(role.id)}
                          className="px-2.5 py-1 bg-rose-500/10 hover:bg-rose-600 text-rose-400 hover:text-white font-extrabold text-[8px] uppercase rounded transition-all cursor-pointer border-0 bg-transparent"
                        >
                          Delete Role
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Permissions checkboxes grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left p-1">
                {MASTER_FEATURES_HIERARCHY.map(cat => {
                  const catKey = cat.key;
                  const activeFeatures = cat.children.filter(c => companyFeatures.includes(c.key));
                  if (activeFeatures.length === 0) return null;

                  return (
                    <div key={catKey} className="border border-[var(--border-color)] rounded-lg p-3 bg-[var(--bg-secondary)]/30 flex flex-col gap-2 select-none">
                      <span className="text-[9px] font-extrabold text-indigo-400 block font-display tracking-widest uppercase pb-1.5 border-b border-[var(--border-color)]">{cat.name}</span>
                      <div className="flex flex-col gap-2.5 mt-1.5 text-left">
                        {activeFeatures.map(child => {
                          const actions = rolePerms[child.key] || [];
                          return (
                            <div key={child.key} className="flex flex-col gap-1 border-b border-[var(--border-color)]/20 pb-1.5 last:border-b-0 last:pb-0 text-left">
                              <span className="font-bold text-[10px] text-[var(--text-primary)] block font-display truncate text-left">{child.name}</span>
                              
                              {isMasterAdmin ? (
                                <span className="text-[8px] font-extrabold text-emerald-500 uppercase block tracking-wider mt-0.5 text-left">FULL BYPASS ASSIGNED</span>
                              ) : (
                                <div className="flex gap-3.5 mt-0.5 text-left">
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
          );
        })}
      </div>
    </div>
  );
}
