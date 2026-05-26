import React from 'react';
import { Users, Activity } from 'lucide-react';

interface EmployeeRegistryProps {
  companyUsers: any[];
  companyRoles: any[];
  departmentList: any[];
  pendingUsers: any[];
  approveSelectedRole: Record<string, string>;
  setApproveSelectedRole: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  handleApproveUser: (userId: string) => Promise<void>;
  isEditingAdminUser: boolean;
  setIsEditingAdminUser: (val: boolean) => void;
  editingAdminUserId: string | null;
  setEditingAdminUserId: (val: string | null) => void;
  adminUserForm: {
    username: string;
    mobileNo: string;
    email: string;
    password?: string;
    roleId: string;
    departmentId: string;
    status: string;
  };
  setAdminUserForm: React.Dispatch<React.SetStateAction<any>>;
  handleCreateOrUpdateAdminUserSubmit: (e: React.FormEvent) => Promise<void>;
  handleDeleteAdminUser: (userId: string) => Promise<void>;
  currentUser: any;
}

export default function EmployeeRegistry({
  companyUsers,
  companyRoles,
  departmentList,
  pendingUsers,
  approveSelectedRole,
  setApproveSelectedRole,
  handleApproveUser,
  isEditingAdminUser,
  setIsEditingAdminUser,
  editingAdminUserId,
  setEditingAdminUserId,
  adminUserForm,
  setAdminUserForm,
  handleCreateOrUpdateAdminUserSubmit,
  handleDeleteAdminUser,
  currentUser,
}: EmployeeRegistryProps) {
  return (
    <div className="animate-fade-in flex flex-col gap-4 text-left">
      <h3 className="font-bold text-sm text-[var(--text-primary)] border-b border-[var(--border-color)] pb-2 font-display flex items-center gap-1.5 uppercase tracking-wide">
        <Users className="w-4 h-4 text-indigo-400" /> Employee Users & Signup Approvals Workspace
      </h3>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        {/* Directory & Create user column */}
        <div className="xl:col-span-2 flex flex-col gap-4 text-left">
          <div className="flex justify-between items-center text-left">
            <span className="text-[10px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block">Employees Directory ({companyUsers.length})</span>
            <button
              type="button"
              onClick={() => {
                setIsEditingAdminUser(!isEditingAdminUser);
                setEditingAdminUserId(null);
                setAdminUserForm({ username: '', mobileNo: '', email: '', password: '', roleId: '', departmentId: '', status: 'ACTIVE' });
              }}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-[9px] uppercase tracking-wider rounded-lg transition-colors cursor-pointer border-0"
            >
              {isEditingAdminUser && !editingAdminUserId ? 'Close Form' : 'Onboard Colleague'}
            </button>
          </div>

          {/* Onboard colleague form */}
          {isEditingAdminUser && (
            <form onSubmit={handleCreateOrUpdateAdminUserSubmit} className="bg-[var(--bg-primary)] border border-[var(--border-color)] p-4 rounded-xl flex flex-col gap-3.5 select-none animate-scale-up text-left border-0">
              <span className="text-[9px] font-extrabold text-indigo-400 tracking-wider uppercase block border-b border-[var(--border-color)]/50 pb-1.5">
                {editingAdminUserId ? `Modify Colleague: ${adminUserForm.username}` : 'Onboard New Colleague'}
              </span>
              
              <div className="grid grid-cols-2 gap-3 text-left">
                <div className="text-left">
                  <label className="text-[8px] font-bold text-[var(--text-secondary)] tracking-wider block">Username</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. johndoe"
                    disabled={!!editingAdminUserId}
                    value={adminUserForm.username}
                    onChange={e => setAdminUserForm({ ...adminUserForm, username: e.target.value })}
                    className="w-full mt-1 bg-[var(--bg-secondary)] border border-[var(--border-color)] py-1.5 px-3 rounded-lg text-xs"
                  />
                </div>
                <div className="text-left">
                  <label className="text-[8px] font-bold text-[var(--text-secondary)] tracking-wider block">Mobile Phone Number</label>
                  <input
                    type="text"
                    required
                    placeholder="+919876543210"
                    value={adminUserForm.mobileNo}
                    onChange={e => setAdminUserForm({ ...adminUserForm, mobileNo: e.target.value })}
                    className="w-full mt-1 bg-[var(--bg-secondary)] border border-[var(--border-color)] py-1.5 px-3 rounded-lg text-xs"
                  />
                </div>
                <div className="col-span-2 text-left">
                  <label className="text-[8px] font-bold text-[var(--text-secondary)] tracking-wider block">Email Address</label>
                  <input
                    type="email"
                    placeholder="you@company.com"
                    value={adminUserForm.email}
                    onChange={e => setAdminUserForm({ ...adminUserForm, email: e.target.value })}
                    className="w-full mt-1 bg-[var(--bg-secondary)] border border-[var(--border-color)] py-1.5 px-3 rounded-lg text-xs"
                  />
                </div>
                <div className="text-left">
                  <label className="text-[8px] font-bold text-[var(--text-secondary)] tracking-wider block">
                    {editingAdminUserId ? 'New Passphrase (Optional)' : 'Security Passphrase'}
                  </label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={adminUserForm.password}
                    onChange={e => setAdminUserForm({ ...adminUserForm, password: e.target.value })}
                    className="w-full mt-1 bg-[var(--bg-secondary)] border border-[var(--border-color)] py-1.5 px-3 rounded-lg text-xs"
                  />
                </div>
                <div className="text-left">
                  <label className="text-[8px] font-bold text-[var(--text-secondary)] tracking-wider block">Corporate Role</label>
                  <select
                    value={adminUserForm.roleId}
                    required
                    onChange={e => setAdminUserForm({ ...adminUserForm, roleId: e.target.value })}
                    className="w-full mt-1 bg-[var(--bg-secondary)] border border-[var(--border-color)] py-1.5 px-3 rounded-lg text-xs cursor-pointer text-[var(--text-primary)] font-semibold"
                  >
                    <option value="">-- Role --</option>
                    {companyRoles.map(r => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </div>
                <div className="text-left">
                  <label className="text-[8px] font-bold text-[var(--text-secondary)] tracking-wider block">Corporate Division</label>
                  <select
                    value={adminUserForm.departmentId}
                    onChange={e => setAdminUserForm({ ...adminUserForm, departmentId: e.target.value })}
                    className="w-full mt-1 bg-[var(--bg-secondary)] border border-[var(--border-color)] py-1.5 px-3 rounded-lg text-xs cursor-pointer text-[var(--text-primary)] font-semibold"
                  >
                    <option value="">-- No Department --</option>
                    {departmentList.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div className="text-left">
                  <label className="text-[8px] font-bold text-[var(--text-secondary)] tracking-wider block">Employment Status</label>
                  <select
                    value={adminUserForm.status}
                    onChange={e => setAdminUserForm({ ...adminUserForm, status: e.target.value })}
                    className="w-full mt-1 bg-[var(--bg-secondary)] border border-[var(--border-color)] py-1.5 px-3 rounded-lg text-xs cursor-pointer text-[var(--text-primary)] font-semibold"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="SUSPENDED">SUSPENDED</option>
                  </select>
                </div>
              </div>
              
              <div className="flex gap-2 justify-end mt-2 pt-2 border-t border-[var(--border-color)]/30 text-left">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingAdminUser(false);
                    setEditingAdminUserId(null);
                  }}
                  className="px-4 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-color)] hover:text-[var(--text-primary)] text-[11px] font-bold rounded-lg cursor-pointer border-0 bg-transparent"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold rounded-lg cursor-pointer border-0"
                >
                  {editingAdminUserId ? 'Save Colleague' : 'Onboard Colleague'}
                </button>
              </div>
            </form>
          )}

          {/* Employee list directory */}
          <div className="overflow-x-auto border border-[var(--border-color)] rounded-xl select-none">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[var(--bg-tertiary)] border-b border-[var(--border-color)] text-[var(--text-secondary)] font-bold">
                  <th className="p-3 text-[10px] uppercase tracking-wider">Employee</th>
                  <th className="p-3 text-[10px] uppercase tracking-wider">Role / Division</th>
                  <th className="p-3 text-[10px] uppercase tracking-wider">Contacts</th>
                  <th className="p-3 text-[10px] uppercase tracking-wider">Status</th>
                  <th className="p-3 text-[10px] uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {companyUsers.map(colleague => {
                  const isAct = colleague.status === 'ACTIVE';
                  const mappedDept = departmentList.find(d => d.id === colleague.departmentId)?.name || 'None';

                  return (
                    <tr key={colleague.id} className="border-b border-[var(--border-color)]/40 hover:bg-[var(--bg-tertiary)]/20 transition-colors last:border-b-0 text-left">
                      <td className="p-3 font-semibold text-[var(--text-primary)] shrink-0">{colleague.username}</td>
                      <td className="p-3 shrink-0">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-semibold text-[var(--text-secondary)]">{colleague.role || 'Employee'}</span>
                          <span className="text-[9px] text-[var(--text-muted)]">Div: {mappedDept}</span>
                        </div>
                      </td>
                      <td className="p-3 shrink-0 font-mono text-[10px] text-[var(--text-secondary)]">
                        <div className="flex flex-col gap-0.5">
                          <span>{colleague.mobileNo}</span>
                          <span className="text-[9px] text-[var(--text-muted)] lowercase">{colleague.email || 'No Email'}</span>
                        </div>
                      </td>
                      <td className="p-3 shrink-0">
                        <span className={`font-extrabold text-[8px] uppercase tracking-wider py-0.5 px-1.5 rounded ${
                          isAct ? 'bg-emerald-500/15 text-emerald-500' : 'bg-rose-500/15 text-rose-500'
                        }`}>
                          {colleague.status}
                        </span>
                      </td>
                      <td className="p-3 text-right shrink-0">
                        {colleague.id !== currentUser?.id && (
                          <div className="flex gap-2 justify-end">
                            <button
                              type="button"
                              onClick={() => {
                                setIsEditingAdminUser(true);
                                setEditingAdminUserId(colleague.id);
                                setAdminUserForm({
                                  username: colleague.username,
                                  mobileNo: colleague.mobileNo,
                                  email: colleague.email || '',
                                  password: '',
                                  roleId: companyRoles.find(r => r.name === colleague.role)?.id || '',
                                  departmentId: colleague.departmentId || '',
                                  status: colleague.status
                                });
                              }}
                              className="px-2 py-0.5 bg-indigo-600/10 hover:bg-indigo-600 text-indigo-400 hover:text-white font-extrabold text-[8px] uppercase rounded transition-all cursor-pointer border-0 bg-transparent"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteAdminUser(colleague.id)}
                              className="px-2 py-0.5 bg-rose-500/10 hover:bg-rose-600 text-rose-400 hover:text-white font-extrabold text-[8px] uppercase rounded transition-all cursor-pointer border-0 bg-transparent"
                            >
                              Kick
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Signups awaiting approval column */}
        <div className="bg-[var(--bg-primary)] border border-[var(--border-color)] p-4 rounded-xl flex flex-col gap-4 select-none text-left">
          <span className="text-[10px] font-bold text-indigo-400 tracking-wider uppercase block border-b border-[var(--border-color)]/50 pb-2 flex items-center gap-1.5 text-left">
            <Activity className="w-3.5 h-3.5 animate-pulse" /> Pending Signup Approvals
          </span>
          
          <div className="flex flex-col gap-3 text-left">
            {pendingUsers.map(pending => {
              const selectRole = (roleId: string) => {
                setApproveSelectedRole(prev => ({
                  ...prev,
                  [pending.id]: roleId
                }));
              };

              return (
                <div key={pending.id} className="border border-[var(--border-color)] bg-[var(--bg-card)] rounded-xl p-3.5 flex flex-col gap-3 text-left">
                  <div className="text-left border-b border-[var(--border-color)]/50 pb-2">
                    <span className="font-bold text-xs text-[var(--text-primary)] block font-display">{pending.username}</span>
                    <span className="text-[9px] text-[var(--text-secondary)] font-mono block mt-1">Mobile: {pending.mobileNo}</span>
                    {pending.email && <span className="text-[9px] text-[var(--text-muted)] lowercase block mt-0.5">Email: {pending.email}</span>}
                  </div>
                  
                  <div className="flex flex-col gap-2 text-left">
                    <label className="text-[8px] font-bold text-[var(--text-secondary)] tracking-wider block text-left">Assign Access Role</label>
                    <select
                      value={approveSelectedRole[pending.id] || ''}
                      onChange={e => selectRole(e.target.value)}
                      className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] py-1.5 px-2.5 rounded-lg text-[10px] cursor-pointer text-[var(--text-primary)] font-semibold"
                    >
                      <option value="">-- Access Role --</option>
                      {companyRoles.map(r => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleApproveUser(pending.id)}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 rounded-lg text-[10px] cursor-pointer transition-colors shadow-sm border-0"
                  >
                    Approve User Signup
                  </button>
                </div>
              );
            })}
            {pendingUsers.length === 0 && (
              <div className="text-center py-6 text-[var(--text-muted)] italic text-[11px]">No pending registrations awaiting approval</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
