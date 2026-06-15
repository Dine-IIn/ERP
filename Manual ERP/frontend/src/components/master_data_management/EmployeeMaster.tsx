import React, { useState, useEffect } from 'react';
import { EmployeeSchema } from '../../utils/schemas';
import { Users, User, Shield, Briefcase, Calendar, Lock, Plus, Trash2, Edit, Check, AlertCircle, X, Search } from 'lucide-react';

interface EmployeeMasterProps {
  companyUsers: any[];
  companyRoles: any[];
  departmentList: any[];
  handleCreateOrUpdateAdminUserSubmit: (e: React.FormEvent) => Promise<void>;
  handleDeleteAdminUser: (userId: string) => Promise<void>;
  adminUserForm: any;
  setAdminUserForm: React.Dispatch<React.SetStateAction<any>>;
  isEditingAdminUser: boolean;
  setIsEditingAdminUser: React.Dispatch<React.SetStateAction<boolean>>;
  editingAdminUserId: string | null;
  setEditingAdminUserId: React.Dispatch<React.SetStateAction<string | null>>;
  currentUser: any;
}

const EmployeeMaster = React.memo(function EmployeeMaster({
  companyUsers,
  companyRoles,
  departmentList,
  handleCreateOrUpdateAdminUserSubmit,
  handleDeleteAdminUser,
  adminUserForm,
  setAdminUserForm,
  isEditingAdminUser,
  setIsEditingAdminUser,
  editingAdminUserId,
  setEditingAdminUserId,
  currentUser,
}: EmployeeMasterProps) {
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [showFormModal, setShowFormModal] = useState(false);
  const [localErr, setLocalErr] = useState<string | null>(null);
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');

  // Local state for structured identity documents
  const [docForm, setDocForm] = useState({
    aadhaarNumber: '',
    panNumber: '',
    customDocType: '',
    customDocNumber: ''
  });

  // Synchronize docForm into parent adminUserForm.documents reactively
  useEffect(() => {
    if (showFormModal) {
      const docStr = JSON.stringify(docForm);
      if (adminUserForm.documents !== docStr) {
        setAdminUserForm(prev => ({
          ...prev,
          documents: docStr
        }));
      }
    }
  }, [docForm, showFormModal, adminUserForm.documents, setAdminUserForm]);

  const getRoleName = (roleId: string) => {
    return companyRoles.find(r => r.id === roleId)?.name || 'colleague';
  };

  const getDeptName = (deptId: string) => {
    return departmentList.find(d => d.id === deptId)?.name || 'unassigned';
  };

  const getManagerName = (managerId: string) => {
    return companyUsers.find(u => u.id === managerId)?.username || 'unassigned';
  };

  const openOnboardModal = () => {
    setAdminUserForm({
      username: '',
      mobileNo: '',
      email: '',
      password: '',
      roleId: companyRoles[0]?.id || '',
      departmentId: '',
      status: 'ACTIVE',
      reportsToId: '',
      shiftStart: '09:00',
      shiftEnd: '17:00',
      shiftName: 'General Morning Shift',
      documents: ''
    });
    setDocForm({
      aadhaarNumber: '',
      panNumber: '',
      customDocType: '',
      customDocNumber: ''
    });
    setIsEditingAdminUser(false);
    setEditingAdminUserId(null);
    setLocalErr(null);
    setShowFormModal(true);
  };

  const openEditModal = (user: any) => {
    let docStr = '';
    let aadhaar = '';
    let pan = '';
    let customType = '';
    let customNo = '';

    if (user.documents) {
      try {
        const parsed = JSON.parse(user.documents);
        docStr = JSON.stringify(parsed);
        aadhaar = parsed.aadhaarNumber || parsed.aadhaarCard || parsed.aadhaar || '';
        pan = parsed.panNumber || parsed.panCard || parsed.pan || '';
        customType = parsed.customDocType || '';
        customNo = parsed.customDocNumber || '';
      } catch {
        docStr = user.documents;
        customType = 'Raw Metadata';
        customNo = user.documents;
      }
    }

    setAdminUserForm({
      username: user.username,
      mobileNo: user.mobileNo,
      email: user.email || '',
      password: '', // Leave blank to keep current
      roleId: user.roleId || '',
      departmentId: user.departmentId || '',
      status: user.status || 'ACTIVE',
      reportsToId: user.reportsToId || '',
      shiftStart: user.shiftStart || '09:00',
      shiftEnd: user.shiftEnd || '17:00',
      shiftName: user.shiftName || 'General Morning Shift',
      documents: docStr
    });

    setDocForm({
      aadhaarNumber: aadhaar,
      panNumber: pan,
      customDocType: customType,
      customDocNumber: customNo
    });

    setIsEditingAdminUser(true);
    setEditingAdminUserId(user.id);
    setLocalErr(null);
    setShowFormModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
      setLocalErr(null);

      const parsed = EmployeeSchema.safeParse(adminUserForm);
      if (!parsed.success) {
        setLocalErr(parsed.error.errors[0].message);
        return;
      }

      try {
      await handleCreateOrUpdateAdminUserSubmit(e);
      setShowFormModal(false);
      setSelectedUser(null);
    } catch (err: any) {
      setLocalErr(err.message || "Failed to save employee profile details.");
    }
  };

  // Filter manager dropdown options to exclude the active employee themselves
  const potentialManagers = companyUsers.filter(u => u.id !== editingAdminUserId);

  const filteredEmployees = (companyUsers || []).filter(emp => {
    const username = emp?.username || '';
    const email = emp?.email || '';
    const mobileNo = emp?.mobileNo || '';
    const roleId = emp?.roleId || '';
    const departmentId = emp?.departmentId || '';
    const roleName = getRoleName(roleId).toLowerCase();
    const deptName = getDeptName(departmentId).toLowerCase();
    const term = (employeeSearch || '').toLowerCase();
    
    const matchesSearch = username.toLowerCase().includes(term) ||
      email.toLowerCase().includes(term) ||
      mobileNo.toLowerCase().includes(term) ||
      roleName.includes(term) ||
      deptName.includes(term);
    const matchesDept = departmentFilter === 'ALL' || departmentId === departmentFilter;
    return matchesSearch && matchesDept;
  });

  return (
    <div className="animate-fade-in flex flex-col gap-4 text-left select-none">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-[var(--border-color)] pb-3">
        <div>
          <h3 className="font-bold text-sm text-[var(--text-primary)] font-display flex items-center gap-1.5 uppercase tracking-wide">
            <Users className="w-4 h-4 text-indigo-400" /> Employee Master Hub
          </h3>
          <p className="text-[var(--text-secondary)] text-[10px] mt-0.5">Administer organizational hierarchies, shift timings, secure documents, and role permissions</p>
        </div>
        
        <button
          type="button"
          onClick={openOnboardModal}
          className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-xs cursor-pointer flex items-center gap-1.5 border-0 bg-transparent transition-all shadow-md active:scale-95 shrink-0"
        >
          <Plus className="w-3.5 h-3.5" /> Onboard New Colleague
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start mt-2">
        
        {/* Employees Listing Pane */}
        <div className="lg:col-span-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl p-4 min-h-[400px]">
          <span className="text-[10px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block mb-3 text-left">Active Employees Registry ({filteredEmployees.length} / {companyUsers.length})</span>
          
          <div className="flex flex-col sm:flex-row gap-3 mb-4 w-full max-w-xl">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                type="text"
                placeholder="Search employees by name, role, email..."
                value={employeeSearch}
                onChange={e => setEmployeeSearch(e.target.value)}
                className="w-full bg-[var(--bg-secondary)]/50 border border-[var(--border-color)] focus:border-indigo-500/50 py-1.5 pl-9 pr-4 rounded-lg text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none transition-all"
              />
            </div>
            <select
              value={departmentFilter}
              onChange={e => setDepartmentFilter(e.target.value)}
              className="bg-[var(--bg-secondary)]/50 border border-[var(--border-color)] text-xs text-[var(--text-secondary)] rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-500/50 cursor-pointer"
            >
              <option value="ALL">All Departments</option>
              {departmentList.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredEmployees.map(emp => {
              const isActive = selectedUser?.id === emp.id;
              const roleName = getRoleName(emp.roleId);
              
              return (
                <div
                  key={emp.id}
                  onClick={() => setSelectedUser(emp)}
                  className={`border p-3.5 rounded-xl transition-all cursor-pointer text-left relative overflow-hidden flex items-start gap-3 ${
                    isActive 
                      ? 'bg-indigo-600/5 border-indigo-500 shadow-sm' 
                      : 'bg-[var(--bg-secondary)]/40 border-[var(--border-color)] hover:bg-[var(--bg-secondary)]'
                  }`}
                >
                  <div className={`p-2 rounded-lg shrink-0 ${
                    isActive ? 'bg-indigo-500/10 text-indigo-400' : 'bg-[var(--bg-primary)] text-[var(--text-secondary)]'
                  }`}>
                    <User className="w-4 h-4" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-xs text-[var(--text-primary)] truncate">{emp.username}</h4>
                    <p className="text-[10px] text-[var(--text-muted)] mt-0.5 truncate flex items-center gap-1">
                      <Shield className="w-2.5 h-2.5 shrink-0 text-indigo-400" /> {roleName}
                    </p>
                    <p className="text-[10px] text-[var(--text-secondary)] truncate flex items-center gap-1 mt-0.5">
                      <Briefcase className="w-2.5 h-2.5 shrink-0 text-emerald-400" /> {getDeptName(emp.departmentId)}
                    </p>
                  </div>

                  <div className="flex gap-1.5 self-center shrink-0">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); openEditModal(emp); }}
                      className="p-1 bg-[var(--bg-primary)] hover:bg-indigo-500/10 text-[var(--text-secondary)] hover:text-indigo-400 rounded border border-[var(--border-color)] cursor-pointer"
                      title="Edit Master Settings"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    {currentUser.userId !== emp.id && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleDeleteAdminUser(emp.id); setSelectedUser(null); }}
                        className="p-1 bg-[var(--bg-primary)] hover:bg-rose-500/10 text-[var(--text-secondary)] hover:text-rose-400 rounded border border-[var(--border-color)] cursor-pointer"
                        title="Delete Colleague"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Employee Detailed Sidebar Card */}
        <div className="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl p-5 min-h-[400px] flex flex-col gap-4 text-left relative overflow-hidden">
          {selectedUser ? (
            <div className="animate-fade-in flex flex-col gap-4">
              <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-xl pointer-events-none" />
              
              <div className="border-b border-[var(--border-color)] pb-3">
                <span className="text-[9px] font-bold text-indigo-400 tracking-wider uppercase block mb-1">Corporate Profile View</span>
                <h4 className="font-extrabold text-sm text-[var(--text-primary)] font-display">{selectedUser.username}</h4>
                <p className="text-[10px] text-[var(--text-secondary)] font-mono mt-0.5">{selectedUser.mobileNo} • {selectedUser.email || 'No email'}</p>
              </div>

              {/* Hierarchy reports card */}
              <div className="bg-[var(--bg-secondary)]/50 border border-[var(--border-color)]/70 p-3 rounded-lg">
                <span className="text-[8px] font-bold text-[var(--text-muted)] tracking-wider uppercase block mb-1.5">Organizational Hierarchy</span>
                <div className="text-xs text-[var(--text-primary)] font-semibold flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-indigo-400" /> Reports To: <span className="text-indigo-400 font-extrabold">{getManagerName(selectedUser.reportsToId)}</span>
                </div>
              </div>

              {/* Timing Shift settings */}
              <div className="bg-[var(--bg-secondary)]/50 border border-[var(--border-color)]/70 p-3 rounded-lg">
                <span className="text-[8px] font-bold text-[var(--text-muted)] tracking-wider uppercase block mb-1.5">Shift Planner Schedule</span>
                <div className="text-xs text-[var(--text-primary)] font-semibold flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-emerald-400" /> Shift Name: <span className="text-emerald-400 font-extrabold">{selectedUser.shiftName || 'General Morning Shift'}</span>
                </div>
                <div className="text-[10px] text-[var(--text-secondary)] font-mono mt-1 pl-5">
                  Timing Interval: {selectedUser.shiftStart || '09:00'} - {selectedUser.shiftEnd || '17:00'}
                </div>
              </div>

              {/* Documents pan/adhaar */}
              <div className="bg-[var(--bg-secondary)]/50 border border-[var(--border-color)]/70 p-3 rounded-lg">
                <span className="text-[8px] font-bold text-[var(--text-muted)] tracking-wider uppercase block mb-1.5">Authorized Identity Documents</span>
                <div className="text-xs text-[var(--text-primary)] font-semibold flex items-center gap-1.5 mb-1.5">
                  <Lock className="w-3.5 h-3.5 text-rose-400" /> PAN / Aadhaar Particulars
                </div>
                
                {selectedUser.documents ? (
                  <div className="flex flex-col gap-2 mt-1">
                    {(() => {
                      try {
                        const parsed = JSON.parse(selectedUser.documents);
                        const hasAadhaar = parsed.aadhaarNumber || parsed.aadhaarCard || parsed.aadhaar;
                        const hasPan = parsed.panNumber || parsed.panCard || parsed.pan;
                        const hasCustom = parsed.customDocNumber;

                        if (!hasAadhaar && !hasPan && !hasCustom) {
                          return <span className="text-[10px] text-[var(--text-muted)] italic">No document fields recorded</span>;
                        }

                        return (
                          <>
                            {hasAadhaar && (
                              <div className="bg-[var(--bg-primary)] p-2 rounded-lg border border-[var(--border-color)]/40 flex items-center justify-between text-[10px] font-mono text-[var(--text-secondary)]">
                                <span className="font-sans font-bold text-[var(--text-primary)]">Aadhaar Card:</span>
                                <span>{hasAadhaar}</span>
                              </div>
                            )}
                            {hasPan && (
                              <div className="bg-[var(--bg-primary)] p-2 rounded-lg border border-[var(--border-color)]/40 flex items-center justify-between text-[10px] font-mono text-[var(--text-secondary)] uppercase">
                                <span className="font-sans font-bold text-[var(--text-primary)]">PAN Card:</span>
                                <span>{hasPan}</span>
                              </div>
                            )}
                            {parsed.customDocType && hasCustom && (
                              <div className="bg-[var(--bg-primary)] p-2 rounded-lg border border-[var(--border-color)]/40 flex items-center justify-between text-[10px] font-mono text-[var(--text-secondary)] uppercase">
                                <span className="font-sans font-bold text-[var(--text-primary)]">{parsed.customDocType}:</span>
                                <span>{hasCustom}</span>
                              </div>
                            )}
                          </>
                        );
                      } catch {
                        return (
                          <pre className="text-[9px] font-mono text-[var(--text-secondary)] bg-[var(--bg-primary)] p-2 rounded border border-[var(--border-color)]/40 overflow-x-auto max-h-36">
                            {selectedUser.documents}
                          </pre>
                        );
                      }
                    })()}
                  </div>
                ) : (
                  <span className="text-[10px] text-[var(--text-muted)] italic pl-5">No document credentials registered yet.</span>
                )}
              </div>

              <button
                type="button"
                onClick={() => openEditModal(selectedUser)}
                className="w-full mt-2 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-xs cursor-pointer border-0 bg-transparent flex items-center justify-center gap-1.5 shadow-md transition-all active:scale-95"
              >
                <Edit className="w-3.5 h-3.5" /> Modify Employee Master Data
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 h-full py-20 text-center select-none">
              <div className="p-3.5 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl text-[var(--text-muted)] shadow-sm">
                <Users className="w-10 h-10" />
              </div>
              <h4 className="font-bold text-xs text-[var(--text-primary)] font-display mt-2">Select Employee User</h4>
              <p className="text-[var(--text-muted)] text-[10px] max-w-[200px] leading-relaxed mt-0.5">Click on a colleague profile on the left to configure organizational structures, timings shifts, and secure documents.</p>
            </div>
          )}
        </div>
      </div>

      {/* ==========================================
          MODAL: CREATOR & MODIFIER FORM
          ========================================== */}
      {showFormModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in">
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl w-full max-w-lg p-6 relative shadow-2xl text-left select-none animate-scale-up max-h-[90vh] overflow-y-auto">
            <button 
              onClick={() => setShowFormModal(false)}
              className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer bg-transparent border-0"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 pb-3 border-b border-[var(--border-color)]">
              <div className="p-2.5 bg-indigo-500/10 rounded-xl text-indigo-400 border border-indigo-500/20">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base text-[var(--text-primary)] font-display">
                  {isEditingAdminUser ? 'Modify Employee Profile' : 'Onboard New Employee'}
                </h3>
                <p className="text-[var(--text-secondary)] text-[10px]">Setup organizational parameters, timing cycles, and identity documents</p>
              </div>
            </div>

            {localErr && (
              <div className="p-3 mt-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{localErr}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Username */}
              <div>
                <label className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block mb-1">Username</label>
                <input
                  type="text"
                  required
                  value={adminUserForm.username}
                  onChange={e => setAdminUserForm({ ...adminUserForm, username: e.target.value })}
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-indigo-500/50 py-2 px-3 rounded-lg text-xs text-[var(--text-primary)] focus:outline-none"
                  placeholder="e.g. manav"
                />
              </div>

              {/* Mobile number */}
              <div>
                <label className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block mb-1">Mobile Number</label>
                <input
                  type="text"
                  required
                  value={adminUserForm.mobileNo}
                  onChange={e => setAdminUserForm({ ...adminUserForm, mobileNo: e.target.value })}
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-indigo-500/50 py-2 px-3 rounded-lg text-xs text-[var(--text-primary)] focus:outline-none"
                  placeholder="e.g. +91XXXXXXXXXX"
                />
              </div>

              {/* Email Address */}
              <div>
                <label className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block mb-1">Email Address</label>
                <input
                  type="email"
                  value={adminUserForm.email}
                  onChange={e => setAdminUserForm({ ...adminUserForm, email: e.target.value })}
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-indigo-500/50 py-2 px-3 rounded-lg text-xs text-[var(--text-primary)] focus:outline-none"
                  placeholder="e.g. colleague@dineiin.com"
                />
              </div>

              {/* Password */}
              <div>
                <label className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block mb-1">
                  Password {!isEditingAdminUser && <span className="text-red-400">*</span>}
                </label>
                <input
                  type="password"
                  required={!isEditingAdminUser}
                  placeholder={isEditingAdminUser ? "Leave blank to keep current" : "••••••••"}
                  value={adminUserForm.password}
                  onChange={e => setAdminUserForm({ ...adminUserForm, password: e.target.value })}
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-indigo-500/50 py-2 px-3 rounded-lg text-xs text-[var(--text-primary)] focus:outline-none"
                />
              </div>

              {/* Role select */}
              <div>
                <label className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block mb-1">Assigned Role</label>
                <select
                  value={adminUserForm.roleId}
                  onChange={e => setAdminUserForm({ ...adminUserForm, roleId: e.target.value })}
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-indigo-500/50 py-2 px-3 rounded-lg text-xs text-[var(--text-primary)] focus:outline-none cursor-pointer"
                >
                  {companyRoles.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>

              {/* Department select */}
              <div>
                <label className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block mb-1">Assigned Department</label>
                <select
                  value={adminUserForm.departmentId}
                  onChange={e => setAdminUserForm({ ...adminUserForm, departmentId: e.target.value })}
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-indigo-500/50 py-2 px-3 rounded-lg text-xs text-[var(--text-primary)] focus:outline-none cursor-pointer"
                >
                  <option value="">Unassigned (None)</option>
                  {departmentList.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              {/* Reports To (Hierarchy Manager) */}
              <div>
                <label className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block mb-1">Reporting Manager (Reports To)</label>
                <select
                  value={adminUserForm.reportsToId}
                  onChange={e => setAdminUserForm({ ...adminUserForm, reportsToId: e.target.value })}
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-indigo-500/50 py-2 px-3 rounded-lg text-xs text-[var(--text-primary)] focus:outline-none cursor-pointer"
                >
                  <option value="">No Reporting Manager (Master Role)</option>
                  {potentialManagers.map(mgr => (
                    <option key={mgr.id} value={mgr.id}>{mgr.username}</option>
                  ))}
                </select>
              </div>

              {/* Vetting Status (only when editing) */}
              {isEditingAdminUser ? (
                <div>
                  <label className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block mb-1">Profile Status</label>
                  <select
                    value={adminUserForm.status}
                    onChange={e => setAdminUserForm({ ...adminUserForm, status: e.target.value })}
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-indigo-500/50 py-2 px-3 rounded-lg text-xs text-[var(--text-primary)] focus:outline-none cursor-pointer"
                  >
                    <option value="ACTIVE">ACTIVE (Authorized Access)</option>
                    <option value="PENDING_APPROVAL">PENDING APPROVAL (Security Vetting)</option>
                    <option value="SUSPENDED">SUSPENDED (Locked Access)</option>
                  </select>
                </div>
              ) : (
                <div />
              )}

              {/* Shift timings settings */}
              <div className="md:col-span-2 border-t border-[var(--border-color)] pt-3 mt-1">
                <span className="text-[9px] font-bold text-indigo-400 tracking-wider uppercase block mb-2">Shift Schedule settings</span>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[8px] font-bold text-[var(--text-secondary)] block mb-1">Shift Name</label>
                    <input
                      type="text"
                      value={adminUserForm.shiftName}
                      onChange={e => setAdminUserForm({ ...adminUserForm, shiftName: e.target.value })}
                      className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] py-1.5 px-3 rounded-lg text-xs text-[var(--text-primary)] focus:outline-none"
                      placeholder="e.g. General Morning Shift"
                    />
                  </div>
                  <div>
                    <label className="text-[8px] font-bold text-[var(--text-secondary)] block mb-1">Shift Start Time</label>
                    <input
                      type="time"
                      value={adminUserForm.shiftStart}
                      onChange={e => setAdminUserForm({ ...adminUserForm, shiftStart: e.target.value })}
                      className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] py-1.5 px-3 rounded-lg text-xs text-[var(--text-primary)] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[8px] font-bold text-[var(--text-secondary)] block mb-1">Shift End Time</label>
                    <input
                      type="time"
                      value={adminUserForm.shiftEnd}
                      onChange={e => setAdminUserForm({ ...adminUserForm, shiftEnd: e.target.value })}
                      className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] py-1.5 px-3 rounded-lg text-xs text-[var(--text-primary)] focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Structured Identity Verification Documents Form */}
              <div className="md:col-span-2 border-t border-[var(--border-color)] pt-3 flex flex-col gap-3">
                <label className="text-[9px] font-bold text-indigo-400 tracking-wider uppercase block mb-0.5 flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5" /> Secure Identity Verification Documents
                </label>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[8px] font-bold text-[var(--text-secondary)] block mb-1 uppercase">Aadhaar Card Number</label>
                    <input
                      type="text"
                      value={docForm.aadhaarNumber}
                      onChange={e => setDocForm({ ...docForm, aadhaarNumber: e.target.value })}
                      className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-indigo-500/50 py-1.5 px-3 rounded-lg text-xs text-[var(--text-primary)] focus:outline-none font-mono"
                      placeholder="e.g. 1234-5678-9012"
                    />
                  </div>

                  <div>
                    <label className="text-[8px] font-bold text-[var(--text-secondary)] block mb-1 uppercase">PAN Card Number</label>
                    <input
                      type="text"
                      value={docForm.panNumber}
                      onChange={e => setDocForm({ ...docForm, panNumber: e.target.value })}
                      className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-indigo-500/50 py-1.5 px-3 rounded-lg text-xs text-[var(--text-primary)] focus:outline-none font-mono uppercase"
                      placeholder="e.g. ABCDE1234F"
                    />
                  </div>

                  <div>
                    <label className="text-[8px] font-bold text-[var(--text-secondary)] block mb-1 uppercase">Custom Document Type</label>
                    <input
                      type="text"
                      value={docForm.customDocType}
                      onChange={e => setDocForm({ ...docForm, customDocType: e.target.value })}
                      className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-indigo-500/50 py-1.5 px-3 rounded-lg text-xs text-[var(--text-primary)] focus:outline-none"
                      placeholder="e.g. Driver's License"
                    />
                  </div>

                  <div>
                    <label className="text-[8px] font-bold text-[var(--text-secondary)] block mb-1 uppercase">Custom Document No.</label>
                    <input
                      type="text"
                      value={docForm.customDocNumber}
                      onChange={e => setDocForm({ ...docForm, customDocNumber: e.target.value })}
                      className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-indigo-500/50 py-1.5 px-3 rounded-lg text-xs text-[var(--text-primary)] focus:outline-none font-mono"
                      placeholder="e.g. DL-123456789"
                    />
                  </div>
                </div>
              </div>

              <div className="md:col-span-2 flex gap-3 mt-3 border-t border-[var(--border-color)] pt-3">
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  className="w-1/2 bg-[var(--bg-tertiary)] border border-[var(--border-color)] hover:text-[var(--text-primary)] font-bold py-2 rounded-lg text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 rounded-lg text-xs cursor-pointer transition-colors"
                >
                  {isEditingAdminUser ? 'Apply Master Changes' : 'Complete Onboarding'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
})

export default EmployeeMaster;
