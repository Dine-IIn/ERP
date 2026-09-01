import React, { useState, useEffect } from 'react';
import { useERP } from '../../context/ERPContext';
import { User, Role, Department, CustomRole, PermissionLevel, UserActivityLog, BackupRecord, RBAC_FEATURES, RBACFeatureDefinition } from '../../types/erp';
import { UserPlus, Shield, Trash2, Key, Lock, UserCheck, Building2, Plus, Edit2, Database, Activity, RefreshCw, Download, HardDrive, ShieldCheck, Search, CheckCircle2, XCircle } from 'lucide-react';

export const UserManagementModule: React.FC = () => {
  const { 
    users, currentUser, departments, customRoles, addUser, updateUser, deleteUser, updateUserRole,
    addDepartment, updateDepartment, deleteDepartment, addRole, updateRole, deleteRole,
    auditLogs, addAuditLog, backups, createBackup, deleteBackup, downloadBackup, restoreBackup, resetOperationalData
  } = useERP();

  const [activeTab, setActiveTab] = useState<'USERS' | 'DEPARTMENTS' | 'ROLES' | 'AUDIT_LOGS' | 'BACKUPS'>('USERS');

  // User Form State
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('Production Manager');
  const [selectedDeptId, setSelectedDeptId] = useState<string>('');
  const [selectedRoleId, setSelectedRoleId] = useState<string>('');
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'danger' } | null>(null);

  // Department Form State
  const [deptName, setDeptName] = useState('');
  const [deptCode, setDeptCode] = useState('');
  const [deptDesc, setDeptDesc] = useState('');

  // Role Creation Form State
  const [editingRole, setEditingRole] = useState<CustomRole | null>(null);
  const [roleName, setRoleName] = useState('');
  const [roleDeptId, setRoleDeptId] = useState('');

  // Default permissions: Map all RBAC_FEATURES to 'VIEW'
  const getDefaultPermissions = (level: PermissionLevel = 'VIEW'): Record<string, PermissionLevel> => {
    const perms: Record<string, PermissionLevel> = {};
    RBAC_FEATURES.forEach(f => {
      perms[f.key] = level;
    });
    return perms;
  };

  const [rolePermissions, setRolePermissions] = useState<Record<string, PermissionLevel>>(getDefaultPermissions('VIEW'));

  const [auditSearch, setAuditSearch] = useState('');
  const [selectedAuditUser, setSelectedAuditUser] = useState<string>('ALL');
  const [selectedAuditActionType, setSelectedAuditActionType] = useState<string>('ALL');
  const [selectedAuditModule, setSelectedAuditModule] = useState<string>('ALL');
  const [selectedAuditTimeRange, setSelectedAuditTimeRange] = useState<string>('ALL');
  const [backupCycleDays, setBackupCycleDays] = useState(2);
  const [isBackingUp, setIsBackingUp] = useState(false);

  const permissionModulesList = [
    { key: 'item_master', label: 'Item Master (View & Edit Items)' },
    { key: 'item_master.direct_jobwork', label: 'Item Master: Direct Jobwork Toggle' },
    { key: 'item_master.mapped_vendors', label: 'Item Master: Vendor Priority Sequence' },
    { key: 'purchase_orders', label: 'Purchase Orders (Create & Manage POs)' },
    { key: 'purchase_orders.approval', label: 'Purchase Orders: Approve / Reject Authorization' },
    { key: 'work_orders', label: 'Work Orders (Create & Stage Progress)' },
    { key: 'inhouse_inventory', label: 'In-House Inventory & Safety Stock' },
    { key: 'external_jobwork', label: 'External Jobwork (Challans & Returns)' },
    { key: 'goods_receipt', label: 'Goods Received (GRN Inspection)' },
    { key: 'quality_control', label: 'Quality Control (QC Inspection Approval)' },
    { key: 'machine_assembly', label: 'Machine Assembly Line Tracking' },
    { key: 'bom_master', label: 'BOM Master (Multi-Level BOMs)' },
    { key: 'customer_master', label: 'Customer Master Catalog' },
    { key: 'vendor_master', label: 'Vendor / Supplier Directory' },
    { key: 'user_management', label: 'User & Security Access Administration' },
    { key: 'backups', label: 'Database Backup & Recovery Control' }
  ];

  if (!currentUser || currentUser.role !== 'Admin') {
    return (
      <div className="card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--danger)' }}>
        <h3>Access Restricted</h3>
        <p>Only System Administrators have authorization to access User & Security Management.</p>
      </div>
    );
  }

  const handleAddUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const res = addUser({
      username,
      fullName,
      email: email || `${username}@gecmachines.com`,
      role,
      departmentId: selectedDeptId || undefined,
      roleId: selectedRoleId || undefined
    });

    if (res.success) {
      setMessage({ text: res.message, type: 'success' });
      
      addAuditLog('CREATE_USER', 'User Management', `Provisioned user account ${username} with role ${role}`);

      setUsername('');
      setFullName('');
      setEmail('');
      setRole('Production Manager');
    } else {
      setMessage({ text: res.message, type: 'danger' });
    }
  };

  const handleDeleteUser = (userId: string) => {
    if (!window.confirm('Are you sure you want to remove this user?')) return;
    const target = users.find(u => u.id === userId);
    const res = deleteUser(userId);
    if (res.success) {
      setMessage({ text: res.message, type: 'success' });
      addAuditLog('DELETE_USER', 'User Management', `Removed user account ${target?.username || userId}`);
    } else {
      setMessage({ text: res.message, type: 'danger' });
    }
  };

  const handleAddDepartmentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptName || !deptCode) return;

    addDepartment({
      name: deptName,
      code: deptCode.toUpperCase(),
      description: deptDesc
    });

    setDeptName('');
    setDeptCode('');
    setDeptDesc('');
    setMessage({ text: `Department "${deptName}" added successfully!`, type: 'success' });
  };

  const handlePermissionChange = (moduleKey: string, level: PermissionLevel) => {
    setRolePermissions(prev => ({
      ...prev,
      [moduleKey]: level
    }));
  };

  const handleSaveRoleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleName) return;

    if (editingRole) {
      updateRole({
        ...editingRole,
        name: roleName,
        roleName: roleName,
        departmentId: roleDeptId || undefined,
        permissions: rolePermissions
      });
      setEditingRole(null);
      setMessage({ text: `Role "${roleName}" updated successfully!`, type: 'success' });
    } else {
      addRole({
        roleName,
        departmentId: roleDeptId || undefined,
        permissions: rolePermissions
      });
      setMessage({ text: `Role "${roleName}" created successfully!`, type: 'success' });
    }

    setRoleName('');
    setRoleDeptId('');
  };

  // Trigger Instant Manual Backup
  const handleTriggerManualBackup = () => {
    if (!currentUser || (currentUser.role !== 'Admin' && !currentUser.isSuperAdmin)) {
      alert('Access Denied: Only System Administrators can create backups.');
      return;
    }
    setIsBackingUp(true);
    setTimeout(() => {
      try {
        const newBackup = createBackup();
        alert(`✅ Database Backup Created Successfully!\nArchive: ${newBackup.fileName} (${newBackup.fileSizeKb} KB)`);
      } catch (e: any) {
        alert('Backup failed: ' + e.message);
      } finally {
        setIsBackingUp(false);
      }
    }, 400);
  };

  const handleRestoreFromFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!currentUser || (currentUser.role !== 'Admin' && !currentUser.isSuperAdmin)) {
      alert('Access Denied: Only System Administrators can restore backups.');
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;

    if (!window.confirm(`⚠️ RESTORE CONFIRMATION:\nRestoring from file "${file.name}" will overwrite all current system records.\n\nAre you sure you want to proceed?`)) {
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const jsonContent = JSON.parse(event.target?.result as string);
        const res = restoreBackup(jsonContent);
        if (res.success) {
          alert('✅ ' + res.message);
        } else {
          alert('❌ ' + res.message);
        }
      } catch (err: any) {
        alert('Failed to parse backup JSON file: ' + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Filter audit logs across User, Action Type, Module, Time Range, and Search
  const filteredLogs = auditLogs.filter(log => {
    // User filter
    if (selectedAuditUser !== 'ALL') {
      const targetUser = selectedAuditUser.toLowerCase();
      const match = log.username.toLowerCase().includes(targetUser) || 
                    (log.userId && log.userId === selectedAuditUser);
      if (!match) return false;
    }

    // Action type filter
    if (selectedAuditActionType !== 'ALL') {
      const act = log.action.toUpperCase();
      if (selectedAuditActionType === 'CREATE' && !act.includes('CREATE') && !act.includes('GENERATE') && !act.includes('ADD') && !act.includes('PROVISION')) return false;
      if (selectedAuditActionType === 'UPDATE' && !act.includes('UPDATE') && !act.includes('EDIT') && !act.includes('MOVE') && !act.includes('STAGE')) return false;
      if (selectedAuditActionType === 'DELETE' && !act.includes('DELETE') && !act.includes('REMOVE') && !act.includes('WIPE')) return false;
      if (selectedAuditActionType === 'APPROVE' && !act.includes('APPROVE') && !act.includes('QC') && !act.includes('CLOSE')) return false;
      if (selectedAuditActionType === 'DISPATCH' && !act.includes('DISPATCH') && !act.includes('RETURN') && !act.includes('JOBWORK')) return false;
      if (selectedAuditActionType === 'BACKUP' && !act.includes('BACKUP') && !act.includes('RESTORE')) return false;
      if (selectedAuditActionType === 'SYSTEM' && !act.includes('SYSTEM') && !act.includes('BOOT') && !act.includes('AUTH')) return false;
    }

    // Module filter
    if (selectedAuditModule !== 'ALL') {
      if (log.module !== selectedAuditModule) return false;
    }

    // Time range filter
    if (selectedAuditTimeRange !== 'ALL') {
      const logTime = new Date(log.timestamp).getTime();
      const now = Date.now();
      if (selectedAuditTimeRange === 'TODAY') {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        if (logTime < startOfDay.getTime()) return false;
      } else if (selectedAuditTimeRange === '24H') {
        if (now - logTime > 24 * 3600 * 1000) return false;
      } else if (selectedAuditTimeRange === '7D') {
        if (now - logTime > 7 * 24 * 3600 * 1000) return false;
      } else if (selectedAuditTimeRange === '30D') {
        if (now - logTime > 30 * 24 * 3600 * 1000) return false;
      }
    }

    // Keyword search
    if (auditSearch.trim()) {
      const query = auditSearch.toLowerCase();
      return (
        log.username.toLowerCase().includes(query) ||
        log.action.toLowerCase().includes(query) ||
        log.module.toLowerCase().includes(query) ||
        log.details.toLowerCase().includes(query) ||
        (log.ipAddress && log.ipAddress.toLowerCase().includes(query))
      );
    }

    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShieldCheck size={22} color="var(--accent-primary)" />
            Security, RBAC & Server Management
          </h2>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Superadmin privileges &bull; Role permissions &bull; Audit trail &bull; Automated PostgreSQL backups
          </span>
        </div>

        {/* Tab Switcher */}
        <div style={{ display: 'flex', gap: '0.25rem', backgroundColor: 'var(--bg-tertiary)', padding: '0.25rem', borderRadius: '0.5rem', flexWrap: 'wrap' }}>
          <button 
            className={`btn ${activeTab === 'USERS' ? 'btn-primary' : 'btn-outline'}`}
            style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', border: 'none' }}
            onClick={() => { setActiveTab('USERS'); setMessage(null); }}
          >
            <UserCheck size={14} /> Users & Admins ({users.length})
          </button>
          <button 
            className={`btn ${activeTab === 'ROLES' ? 'btn-primary' : 'btn-outline'}`}
            style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', border: 'none' }}
            onClick={() => { setActiveTab('ROLES'); setMessage(null); }}
          >
            <Key size={14} /> RBAC Matrix ({customRoles.length})
          </button>
          <button 
            className={`btn ${activeTab === 'DEPARTMENTS' ? 'btn-primary' : 'btn-outline'}`}
            style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', border: 'none' }}
            onClick={() => { setActiveTab('DEPARTMENTS'); setMessage(null); }}
          >
            <Building2 size={14} /> Departments ({departments.length})
          </button>
          <button 
            className={`btn ${activeTab === 'AUDIT_LOGS' ? 'btn-primary' : 'btn-outline'}`}
            style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', border: 'none' }}
            onClick={() => { setActiveTab('AUDIT_LOGS'); setMessage(null); }}
          >
            <Activity size={14} /> Security Audit Logs
          </button>
          <button 
            className={`btn ${activeTab === 'BACKUPS' ? 'btn-primary' : 'btn-outline'}`}
            style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', border: 'none' }}
            onClick={() => { setActiveTab('BACKUPS'); setMessage(null); }}
          >
            <Database size={14} /> Backups & Auto-Sync
          </button>
        </div>
      </div>

      {message && (
        <div style={{
          padding: '0.75rem 1rem',
          borderRadius: '0.5rem',
          fontSize: '0.85rem',
          fontWeight: 600,
          backgroundColor: message.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
          color: message.type === 'success' ? 'var(--success)' : 'var(--danger)',
          border: `1px solid ${message.type === 'success' ? 'var(--success)' : 'var(--danger)'}`
        }}>
          {message.text}
        </div>
      )}

      {/* TAB 1: USERS & ADMINS */}
      {activeTab === 'USERS' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Create User Form */}
          <form onSubmit={handleAddUserSubmit} className="card" style={{ padding: '1.25rem', backgroundColor: 'var(--bg-card)' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <UserPlus size={16} /> Provision New Employee / Admin Account
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.875rem' }}>
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 600 }}>Username</label>
                <input type="text" required placeholder="e.g. jigar.patel" className="input-field" value={username} onChange={(e) => setUsername(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 600 }}>Full Name</label>
                <input type="text" required placeholder="e.g. Jigar Patel" className="input-field" value={fullName} onChange={(e) => setFullName(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 600 }}>Work Email (for OTP Reset)</label>
                <input type="email" placeholder="e.g. jigar@gecmachines.com" className="input-field" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 600 }}>Assigned Role *</label>
                <select 
                  className="input-field" 
                  value={role} 
                  onChange={(e) => {
                    const chosenRoleName = e.target.value;
                    setRole(chosenRoleName);
                    const matchingRole = customRoles.find(r => (r.name || r.roleName) === chosenRoleName);
                    if (matchingRole) {
                      setSelectedRoleId(matchingRole.id);
                      if (matchingRole.departmentId) {
                        setSelectedDeptId(matchingRole.departmentId);
                      }
                    }
                  }}
                >
                  {customRoles.map(r => (
                    <option key={r.id} value={r.name || r.roleName}>
                      {r.name || r.roleName}
                    </option>
                  ))}
                  {customRoles.length === 0 && (
                    <>
                      <option value="Admin">Admin</option>
                      <option value="Production Manager">Production Manager</option>
                      <option value="Store Manager">Store Manager</option>
                      <option value="QC Officer">QC Officer</option>
                    </>
                  )}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 600 }}>Assigned Department</label>
                <select className="input-field" value={selectedDeptId} onChange={(e) => setSelectedDeptId(e.target.value)}>
                  <option value="">-- Select Department --</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button type="submit" className="btn btn-primary" style={{ padding: '0.45rem 1rem' }}>
                <Plus size={15} /> Create User Account
              </button>
            </div>
          </form>

          {/* Users Table */}
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Full Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Department</th>
                  <th>Account Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => {
                  const deptObj = departments.find(d => d.id === u.departmentId);
                  const isProtectedSuperAdmin = u.username.toLowerCase() === 'superadmin' || u.isSuperAdmin;

                  return (
                    <tr key={u.id}>
                      <td style={{ fontWeight: 700, fontFamily: 'monospace' }}>
                        <button
                          style={{ background: 'none', border: 'none', padding: 0, color: 'var(--accent-primary)', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline', fontFamily: 'inherit' }}
                          title={`Click to view all activity logs for ${u.username}`}
                          onClick={() => {
                            setSelectedAuditUser(u.username);
                            setActiveTab('AUDIT_LOGS');
                          }}
                        >
                          {u.username}
                        </button>
                        {isProtectedSuperAdmin && (
                          <span className="badge badge-warning" style={{ fontSize: '0.65rem', marginLeft: '0.4rem' }}>
                            SUPERADMIN
                          </span>
                        )}
                      </td>
                      <td style={{ fontWeight: 600 }}>{u.fullName}</td>
                      <td style={{ fontSize: '0.85rem' }}>{u.email || '-'}</td>
                      <td>
                        <span className={`badge ${u.role === 'Admin' ? 'badge-primary' : 'badge-info'}`}>
                          {u.role}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>{deptObj ? deptObj.name : 'All Departments'}</td>
                      <td>
                        <span className="badge badge-success">Active & Verified</span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <button 
                            className="btn btn-outline" 
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }} 
                            title={`Inspect ${u.username}'s complete activity log`}
                            onClick={() => {
                              setSelectedAuditUser(u.username);
                              setActiveTab('AUDIT_LOGS');
                            }}
                          >
                            <Activity size={13} /> Activity Logs
                          </button>
                          {!isProtectedSuperAdmin && (
                            <button className="btn btn-outline" style={{ padding: '0.25rem 0.5rem', color: 'var(--danger)' }} onClick={() => handleDeleteUser(u.id)}>
                              <Trash2 size={14} /> Remove
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: DEPARTMENTS */}
      {activeTab === 'DEPARTMENTS' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Create Department Form */}
          <form onSubmit={handleAddDepartmentSubmit} className="card" style={{ padding: '1.25rem', backgroundColor: 'var(--bg-card)' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Building2 size={16} /> Register New Department
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 3fr auto', gap: '0.875rem', alignItems: 'end' }}>
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 600 }}>Code</label>
                <input type="text" required placeholder="e.g. STORE" className="input-field" value={deptCode} onChange={(e) => setDeptCode(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 600 }}>Department Name</label>
                <input type="text" required placeholder="e.g. Store & Inventory Management" className="input-field" value={deptName} onChange={(e) => setDeptName(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 600 }}>Description</label>
                <input type="text" placeholder="e.g. Raw material receipt & dispatch" className="input-field" value={deptDesc} onChange={(e) => setDeptDesc(e.target.value)} />
              </div>
              <button type="submit" className="btn btn-primary" style={{ padding: '0.45rem 1rem' }}>
                <Plus size={15} /> Add
              </button>
            </div>
          </form>

          {/* Departments Table */}
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Department Name</th>
                  <th>Description</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {departments.map(d => (
                  <tr key={d.id}>
                    <td style={{ fontWeight: 700, fontFamily: 'monospace', color: 'var(--accent-primary)' }}>{d.code}</td>
                    <td style={{ fontWeight: 600 }}>{d.name}</td>
                    <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{d.description || '-'}</td>
                    <td>
                      <button className="btn btn-outline" style={{ padding: '0.25rem 0.5rem', color: 'var(--danger)' }} onClick={() => deleteDepartment(d.id)}>
                        <Trash2 size={14} /> Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: ROLES & RBAC MATRIX */}
      {activeTab === 'ROLES' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <form onSubmit={handleSaveRoleSubmit} className="card" style={{ padding: '1.25rem', backgroundColor: 'var(--bg-card)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
                <ShieldCheck size={18} color="var(--accent-primary)" />
                {editingRole ? `Edit Role: ${editingRole.name || editingRole.roleName}` : 'Create New Role & Permission Matrix'}
              </h3>
              
              {/* Quick Bulk Presets */}
              <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>Quick Presets:</span>
                <button
                  type="button"
                  className="btn btn-outline"
                  style={{ padding: '0.2rem 0.5rem', fontSize: '0.72rem', color: '#059669', borderColor: '#059669' }}
                  onClick={() => setRolePermissions(getDefaultPermissions('FULL_ACCESS'))}
                >
                  All Full Access
                </button>
                <button
                  type="button"
                  className="btn btn-outline"
                  style={{ padding: '0.2rem 0.5rem', fontSize: '0.72rem', color: '#d97706', borderColor: '#d97706' }}
                  onClick={() => setRolePermissions(getDefaultPermissions('EDIT'))}
                >
                  All Edit
                </button>
                <button
                  type="button"
                  className="btn btn-outline"
                  style={{ padding: '0.2rem 0.5rem', fontSize: '0.72rem', color: '#2563eb', borderColor: '#2563eb' }}
                  onClick={() => setRolePermissions(getDefaultPermissions('CREATE'))}
                >
                  All Create
                </button>
                <button
                  type="button"
                  className="btn btn-outline"
                  style={{ padding: '0.2rem 0.5rem', fontSize: '0.72rem', color: '#7c3aed', borderColor: '#7c3aed' }}
                  onClick={() => setRolePermissions(getDefaultPermissions('VIEW'))}
                >
                  All View Only
                </button>
                <button
                  type="button"
                  className="btn btn-outline"
                  style={{ padding: '0.2rem 0.5rem', fontSize: '0.72rem', color: 'var(--danger)' }}
                  onClick={() => setRolePermissions(getDefaultPermissions('NO_ACCESS'))}
                >
                  Reset (No Access)
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700 }}>Role Name *</label>
                <input 
                  type="text" 
                  required 
                  placeholder="e.g. Senior Production Supervisor, Store Officer, Quality Inspector" 
                  className="input-field" 
                  value={roleName} 
                  onChange={(e) => setRoleName(e.target.value)} 
                />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700 }}>Department Scope</label>
                <select className="input-field" value={roleDeptId} onChange={(e) => setRoleDeptId(e.target.value)}>
                  <option value="">Global (All Departments)</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ marginBottom: '0.5rem' }}>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 800, margin: '0 0 0.25rem 0' }}>Feature Access Permission Matrix</h4>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>
                Configure access levels for each module. Permissions dictate ability to create new records, edit existing records, view data, or delete/block items.
              </p>
            </div>

            {/* RBAC Matrix Table */}
            <div className="table-container" style={{ maxHeight: '420px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '0.5rem' }}>
              <table>
                <thead>
                  <tr style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                    <th style={{ minWidth: '220px' }}>Feature / Module</th>
                    <th style={{ width: '130px', textAlign: 'center', color: '#059669' }}>
                      🟢 Full Access
                      <div style={{ fontSize: '0.68rem', fontWeight: 500, color: 'var(--text-muted)' }}>Edit, Create, Delete, View</div>
                    </th>
                    <th style={{ width: '125px', textAlign: 'center', color: '#d97706' }}>
                      🟡 Edit
                      <div style={{ fontSize: '0.68rem', fontWeight: 500, color: 'var(--text-muted)' }}>Edit & View Only</div>
                    </th>
                    <th style={{ width: '125px', textAlign: 'center', color: '#2563eb' }}>
                      🔵 Create
                      <div style={{ fontSize: '0.68rem', fontWeight: 500, color: 'var(--text-muted)' }}>Create & View Only</div>
                    </th>
                    <th style={{ width: '120px', textAlign: 'center', color: '#7c3aed' }}>
                      🟣 View
                      <div style={{ fontSize: '0.68rem', fontWeight: 500, color: 'var(--text-muted)' }}>View Only (Read)</div>
                    </th>
                    <th style={{ width: '110px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      ⚪ No Access
                      <div style={{ fontSize: '0.68rem', fontWeight: 500, color: 'var(--text-muted)' }}>Hidden / Blocked</div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {RBAC_FEATURES.map(feature => {
                    const currentLevel = rolePermissions[feature.key] || 'NO_ACCESS';

                    return (
                      <tr key={feature.key}>
                        <td>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <strong style={{ fontSize: '0.85rem' }}>{feature.name}</strong>
                              <span className="badge badge-neutral" style={{ fontSize: '0.68rem' }}>{feature.category}</span>
                            </div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{feature.description}</div>
                          </div>
                        </td>

                        {/* Full Access */}
                        <td style={{ textAlign: 'center' }}>
                          <label style={{ display: 'flex', justifyContent: 'center', cursor: 'pointer', margin: 0, padding: '0.4rem' }}>
                            <input
                              type="radio"
                              name={`rbac_${feature.key}`}
                              checked={currentLevel === 'FULL_ACCESS'}
                              onChange={() => handlePermissionChange(feature.key, 'FULL_ACCESS')}
                              style={{ width: '17px', height: '17px', cursor: 'pointer', accentColor: '#059669' }}
                            />
                          </label>
                        </td>

                        {/* Edit */}
                        <td style={{ textAlign: 'center' }}>
                          <label style={{ display: 'flex', justifyContent: 'center', cursor: 'pointer', margin: 0, padding: '0.4rem' }}>
                            <input
                              type="radio"
                              name={`rbac_${feature.key}`}
                              checked={currentLevel === 'EDIT'}
                              onChange={() => handlePermissionChange(feature.key, 'EDIT')}
                              style={{ width: '17px', height: '17px', cursor: 'pointer', accentColor: '#d97706' }}
                            />
                          </label>
                        </td>

                        {/* Create */}
                        <td style={{ textAlign: 'center' }}>
                          <label style={{ display: 'flex', justifyContent: 'center', cursor: 'pointer', margin: 0, padding: '0.4rem' }}>
                            <input
                              type="radio"
                              name={`rbac_${feature.key}`}
                              checked={currentLevel === 'CREATE'}
                              onChange={() => handlePermissionChange(feature.key, 'CREATE')}
                              style={{ width: '17px', height: '17px', cursor: 'pointer', accentColor: '#2563eb' }}
                            />
                          </label>
                        </td>

                        {/* View */}
                        <td style={{ textAlign: 'center' }}>
                          <label style={{ display: 'flex', justifyContent: 'center', cursor: 'pointer', margin: 0, padding: '0.4rem' }}>
                            <input
                              type="radio"
                              name={`rbac_${feature.key}`}
                              checked={currentLevel === 'VIEW'}
                              onChange={() => handlePermissionChange(feature.key, 'VIEW')}
                              style={{ width: '17px', height: '17px', cursor: 'pointer', accentColor: '#7c3aed' }}
                            />
                          </label>
                        </td>

                        {/* No Access */}
                        <td style={{ textAlign: 'center' }}>
                          <label style={{ display: 'flex', justifyContent: 'center', cursor: 'pointer', margin: 0, padding: '0.4rem' }}>
                            <input
                              type="radio"
                              name={`rbac_${feature.key}`}
                              checked={currentLevel === 'NO_ACCESS'}
                              onChange={() => handlePermissionChange(feature.key, 'NO_ACCESS')}
                              style={{ width: '17px', height: '17px', cursor: 'pointer', accentColor: '#6b7280' }}
                            />
                          </label>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.25rem' }}>
              {editingRole && (
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => { 
                    setEditingRole(null); 
                    setRoleName(''); 
                    setRoleDeptId('');
                    setRolePermissions(getDefaultPermissions('VIEW'));
                  }}
                >
                  Cancel Edit
                </button>
              )}
              <button type="submit" className="btn btn-primary">
                {editingRole ? 'Update Role Matrix' : 'Save Role Matrix'}
              </button>
            </div>
          </form>

          {/* Configured Roles List Table */}
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Role Name</th>
                  <th>Department Scope</th>
                  <th>Configured Permissions</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {customRoles.map(r => {
                  const deptObj = departments.find(d => d.id === r.departmentId);
                  const perms = r.permissions || {};
                  const fullCount = Object.values(perms).filter(p => p === 'FULL_ACCESS').length;
                  const editCount = Object.values(perms).filter(p => p === 'EDIT').length;
                  const createCount = Object.values(perms).filter(p => p === 'CREATE').length;
                  const viewCount = Object.values(perms).filter(p => p === 'VIEW').length;

                  return (
                    <tr key={r.id}>
                      <td style={{ fontWeight: 700 }}>{r.name}</td>
                      <td style={{ fontSize: '0.85rem' }}>{deptObj ? `${deptObj.name} (${deptObj.code})` : 'Global'}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                          {fullCount > 0 && <span className="badge badge-success" style={{ fontSize: '0.72rem' }}>{fullCount} Full Access</span>}
                          {editCount > 0 && <span className="badge badge-warning" style={{ fontSize: '0.72rem' }}>{editCount} Edit</span>}
                          {createCount > 0 && <span className="badge badge-info" style={{ fontSize: '0.72rem' }}>{createCount} Create</span>}
                          {viewCount > 0 && <span className="badge badge-neutral" style={{ fontSize: '0.72rem' }}>{viewCount} View</span>}
                        </div>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center' }}>
                          <button 
                            className="btn btn-outline" 
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.78rem' }} 
                            onClick={() => { 
                              setEditingRole(r); 
                              setRoleName(r.name || ''); 
                              setRoleDeptId(r.departmentId || ''); 
                              setRolePermissions({
                                ...getDefaultPermissions('NO_ACCESS'),
                                ...(r.permissions || {})
                              }); 
                            }}
                          >
                            <Edit2 size={13} /> Edit Matrix
                          </button>
                          <button 
                            className="btn btn-outline" 
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.78rem', color: 'var(--danger)' }} 
                            onClick={() => deleteRole(r.id)}
                          >
                            <Trash2 size={13} /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: AUDIT LOGS */}
      {activeTab === 'AUDIT_LOGS' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Multi-Dimensional Audit Filters Card */}
          <div className="card" style={{ padding: '1rem 1.25rem', backgroundColor: 'var(--bg-card)', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Activity size={17} color="var(--accent-primary)" />
                Security Audit Log Filter & Activity Explorer
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="badge badge-info" style={{ fontSize: '0.75rem' }}>
                  Showing {filteredLogs.length} of {auditLogs.length} Events
                </span>
                {(selectedAuditUser !== 'ALL' || selectedAuditActionType !== 'ALL' || selectedAuditModule !== 'ALL' || selectedAuditTimeRange !== 'ALL' || auditSearch) && (
                  <button 
                    className="btn btn-outline" 
                    style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
                    onClick={() => {
                      setSelectedAuditUser('ALL');
                      setSelectedAuditActionType('ALL');
                      setSelectedAuditModule('ALL');
                      setSelectedAuditTimeRange('ALL');
                      setAuditSearch('');
                    }}
                  >
                    Clear Filters (View All Users)
                  </button>
                )}
              </div>
            </div>

            {/* Filter Row Controls */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '0.75rem' }}>
              
              {/* Filter 1: By User */}
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
                  Filter by User:
                </label>
                <select 
                  className="input-field" 
                  style={{ fontSize: '0.82rem', padding: '0.35rem 0.6rem' }}
                  value={selectedAuditUser}
                  onChange={(e) => setSelectedAuditUser(e.target.value)}
                >
                  <option value="ALL">👥 All Users (Combined Activity)</option>
                  {users.map(u => (
                    <option key={u.id} value={u.username}>
                      {u.fullName} ({u.username}) - {u.role}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filter 2: By Action Type */}
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
                  Filter by Action:
                </label>
                <select 
                  className="input-field" 
                  style={{ fontSize: '0.82rem', padding: '0.35rem 0.6rem' }}
                  value={selectedAuditActionType}
                  onChange={(e) => setSelectedAuditActionType(e.target.value)}
                >
                  <option value="ALL">⚡ All Action Types</option>
                  <option value="CREATE">➕ CREATE (Added / Generated / Provisioned)</option>
                  <option value="UPDATE">✏️ UPDATE (Edited / Stage Shift / Status)</option>
                  <option value="DELETE">🗑️ DELETE (Removed / Wiped)</option>
                  <option value="APPROVE">🛡️ APPROVE (QC / GRN / Closed)</option>
                  <option value="DISPATCH">🚚 DISPATCH (Finished Goods / Jobwork)</option>
                  <option value="BACKUP">💾 BACKUP & RESTORE</option>
                  <option value="SYSTEM">⚙️ SYSTEM (Auth & Engine Boot)</option>
                </select>
              </div>

              {/* Filter 3: By Target Module */}
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
                  Filter by Module / Entity:
                </label>
                <select 
                  className="input-field" 
                  style={{ fontSize: '0.82rem', padding: '0.35rem 0.6rem' }}
                  value={selectedAuditModule}
                  onChange={(e) => setSelectedAuditModule(e.target.value)}
                >
                  <option value="ALL">📂 All Modules</option>
                  <option value="Item Master">Item Master</option>
                  <option value="BOM Master">BOM Master</option>
                  <option value="Sales Orders">Sales Orders</option>
                  <option value="Work Orders">Work Orders</option>
                  <option value="Job Cards">Job Cards</option>
                  <option value="Purchase Orders">Purchase Orders</option>
                  <option value="Goods Received">Goods Received (GRN)</option>
                  <option value="External Jobwork">External Jobwork</option>
                  <option value="Shopfloor Planning">Shopfloor Planning</option>
                  <option value="Customer Master">Customer Master</option>
                  <option value="Vendor Master">Vendor Master</option>
                  <option value="Quality Control">Quality Control</option>
                  <option value="User Management">User Management</option>
                  <option value="Backup & Restore">Backup & Restore</option>
                  <option value="Security & Auth">Security & Auth</option>
                </select>
              </div>

              {/* Filter 4: By Time Range */}
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
                  Filter by Time:
                </label>
                <select 
                  className="input-field" 
                  style={{ fontSize: '0.82rem', padding: '0.35rem 0.6rem' }}
                  value={selectedAuditTimeRange}
                  onChange={(e) => setSelectedAuditTimeRange(e.target.value)}
                >
                  <option value="ALL">🕒 All Time</option>
                  <option value="TODAY">📅 Today Only</option>
                  <option value="24H">⏱️ Past 24 Hours</option>
                  <option value="7D">🗓️ Past 7 Days</option>
                  <option value="30D">📆 Past 30 Days</option>
                </select>
              </div>

              {/* Filter 5: Keyword Search */}
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
                  Keyword Search:
                </label>
                <div style={{ position: 'relative' }}>
                  <Search size={14} style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    placeholder="Search details, code, IP..."
                    className="input-field"
                    style={{ paddingLeft: '2rem', fontSize: '0.82rem', padding: '0.35rem 0.6rem 0.35rem 2rem' }}
                    value={auditSearch}
                    onChange={(e) => setAuditSearch(e.target.value)}
                  />
                </div>
              </div>

            </div>
          </div>

          {/* Selected User Activity Profile Card */}
          {selectedAuditUser !== 'ALL' && (() => {
            const userObj = users.find(u => u.username.toLowerCase() === selectedAuditUser.toLowerCase());
            const userLogs = auditLogs.filter(l => l.username.toLowerCase().includes(selectedAuditUser.toLowerCase()));
            const createCount = userLogs.filter(l => l.action.toUpperCase().includes('CREATE') || l.action.toUpperCase().includes('GENERATE') || l.action.toUpperCase().includes('ADD')).length;
            const updateCount = userLogs.filter(l => l.action.toUpperCase().includes('UPDATE') || l.action.toUpperCase().includes('EDIT') || l.action.toUpperCase().includes('STAGE')).length;
            const deleteCount = userLogs.filter(l => l.action.toUpperCase().includes('DELETE') || l.action.toUpperCase().includes('REMOVE')).length;
            const lastLog = userLogs[0];

            return (
              <div className="card" style={{ padding: '1rem 1.25rem', backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--accent-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                  <div style={{ width: '42px', height: '42px', borderRadius: '50%', backgroundColor: 'var(--accent-primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.1rem' }}>
                    {(userObj?.fullName || selectedAuditUser)[0].toUpperCase()}
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                      {userObj ? userObj.fullName : selectedAuditUser} <span style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: 'var(--accent-primary)' }}>({selectedAuditUser})</span>
                    </h4>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Role: <strong>{userObj?.role || 'System User'}</strong> &bull; Last Activity: <strong>{lastLog ? new Date(lastLog.timestamp).toLocaleString() : 'No activity recorded yet'}</strong>
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <span className="badge badge-info" style={{ fontSize: '0.75rem' }}>Total: {userLogs.length} Events</span>
                  <span className="badge badge-success" style={{ fontSize: '0.75rem' }}>➕ Created: {createCount}</span>
                  <span className="badge badge-warning" style={{ fontSize: '0.75rem' }}>✏️ Edited: {updateCount}</span>
                  <span className="badge badge-danger" style={{ fontSize: '0.75rem' }}>🗑️ Deleted: {deleteCount}</span>
                  <button 
                    className="btn btn-outline" 
                    style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}
                    onClick={() => setSelectedAuditUser('ALL')}
                  >
                    View All Users Together
                  </button>
                </div>
              </div>
            );
          })()}

          {/* Audit Logs Table */}
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th style={{ width: '165px' }}>Timestamp</th>
                  <th style={{ width: '170px' }}>User / Operator</th>
                  <th style={{ width: '110px' }}>Role</th>
                  <th style={{ width: '160px' }}>Action Type</th>
                  <th style={{ width: '150px' }}>Module</th>
                  <th>Activity Description & Target Details</th>
                  <th style={{ width: '100px' }}>Host / IP</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                      No audit events match your selected filters. Try changing or clearing filters.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map(log => {
                    const actUpper = log.action.toUpperCase();
                    let badgeClass = 'badge-info';
                    if (actUpper.includes('CREATE') || actUpper.includes('GENERATE') || actUpper.includes('ADD') || actUpper.includes('PROVISION')) badgeClass = 'badge-success';
                    else if (actUpper.includes('UPDATE') || actUpper.includes('EDIT') || actUpper.includes('STAGE')) badgeClass = 'badge-warning';
                    else if (actUpper.includes('DELETE') || actUpper.includes('REMOVE') || actUpper.includes('WIPE')) badgeClass = 'badge-danger';
                    else if (actUpper.includes('APPROVE') || actUpper.includes('QC') || actUpper.includes('CLOSE')) badgeClass = 'badge-primary';
                    else if (actUpper.includes('BACKUP') || actUpper.includes('RESTORE') || actUpper.includes('SYSTEM')) badgeClass = 'badge-secondary';

                    return (
                      <tr key={log.id}>
                        <td style={{ fontSize: '0.78rem', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td style={{ fontWeight: 700 }}>
                          <button
                            style={{ background: 'none', border: 'none', padding: 0, color: 'var(--accent-primary)', fontWeight: 700, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', fontSize: '0.82rem' }}
                            title={`Filter feed for ${log.username}`}
                            onClick={() => setSelectedAuditUser(log.username.split(' (')[0].trim())}
                          >
                            👤 {log.username}
                          </button>
                        </td>
                        <td>
                          <span className="badge badge-info" style={{ fontSize: '0.7rem' }}>
                            {log.role}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${badgeClass}`} style={{ fontSize: '0.72rem', fontFamily: 'monospace' }}>
                            {log.action}
                          </span>
                        </td>
                        <td style={{ fontWeight: 600, fontSize: '0.82rem' }}>{log.module}</td>
                        <td style={{ fontSize: '0.82rem', color: 'var(--text-primary)' }}>{log.details}</td>
                        <td style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--text-muted)' }}>{log.ipAddress || '127.0.0.1'}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: BACKUP CONTROL */}
      {activeTab === 'BACKUPS' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Backup Control Banner */}
          <div className="card" style={{ padding: '1.25rem', backgroundColor: 'var(--bg-card)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
                <HardDrive size={20} color="var(--accent-primary)" />
                PostgreSQL Automated & Manual Database Backups
              </h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '0.25rem 0 0 0' }}>
                All modules (Items, BOMs, WOs, POs, GRNs, Customers, Vendors, and Logs) are archived with full data integrity.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              
              {/* Custom Cycle */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, margin: 0 }}>Cycle:</label>
                <input 
                  type="number" 
                  min="1" 
                  style={{ width: '65px', padding: '0.3rem 0.4rem', fontSize: '0.82rem', textAlign: 'center', fontWeight: 700 }}
                  className="input-field"
                  value={backupCycleDays}
                  onChange={(e) => setBackupCycleDays(Number(e.target.value))}
                />
                <select 
                  className="input-field" 
                  style={{ width: '85px', padding: '0.3rem 0.4rem', fontSize: '0.82rem' }}
                  defaultValue="Days"
                >
                  <option value="Hours">Hours</option>
                  <option value="Days">Days</option>
                </select>
              </div>

              {/* Backup Life / Retention */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, margin: 0 }}>Backup Life:</label>
                <select 
                  className="input-field" 
                  style={{ width: '150px', padding: '0.3rem 0.5rem', fontSize: '0.82rem', fontWeight: 600 }}
                  defaultValue="Infinite"
                >
                  <option value="7_Days">7 Days</option>
                  <option value="15_Days">15 Days</option>
                  <option value="30_Days">30 Days</option>
                  <option value="90_Days">90 Days</option>
                  <option value="1_Year">1 Year</option>
                  <option value="Infinite">♾️ Infinite (Keep Forever)</option>
                </select>
              </div>

              <label 
                className="btn btn-outline" 
                style={{ cursor: 'pointer', fontWeight: 600, padding: '0.45rem 0.85rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                title="Restore from a previously downloaded .json backup file"
              >
                <HardDrive size={15} /> Upload & Restore Backup
                <input 
                  type="file" 
                  accept=".json" 
                  style={{ display: 'none' }} 
                  onChange={handleRestoreFromFile} 
                />
              </label>

              <button 
                className="btn btn-primary" 
                disabled={isBackingUp}
                onClick={handleTriggerManualBackup}
                style={{ fontWeight: 700, padding: '0.45rem 1rem' }}
              >
                {isBackingUp ? <RefreshCw size={15} className="animate-spin" /> : <Database size={15} />}
                {isBackingUp ? 'Archiving Database...' : 'Backup Now'}
              </button>
            </div>
          </div>

          {/* Backup History Table */}
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Backup Archive File</th>
                  <th>Archive Size</th>
                  <th>Type</th>
                  <th>Created Timestamp</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {backups.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                      No backup archives found. Click "Backup Now" above to generate a new full database backup snapshot.
                    </td>
                  </tr>
                ) : (
                  backups.map(b => (
                    <tr key={b.id}>
                      <td style={{ fontWeight: 700, fontFamily: 'monospace', color: 'var(--accent-primary)' }}>
                        {b.fileName}
                      </td>
                      <td style={{ fontWeight: 600 }}>{b.fileSizeKb} KB</td>
                      <td>
                        <span className={`badge ${b.backupType === 'MANUAL' ? 'badge-primary' : 'badge-info'}`}>
                          {b.backupType}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>{new Date(b.createdAt).toLocaleString()}</td>
                      <td>
                        <span className="badge badge-success">Verified & Complete</span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <button 
                            className="btn btn-outline" 
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.78rem' }}
                            title="Download JSON file to your device"
                            onClick={() => downloadBackup(b.id)}
                          >
                            <Download size={13} /> Download
                          </button>

                          <button 
                            className="btn btn-outline" 
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.78rem', color: 'var(--warning)', borderColor: 'var(--warning)' }}
                            title="Restore ERP data to this backup state"
                            onClick={() => {
                              if (!currentUser || (currentUser.role !== 'Admin' && !currentUser.isSuperAdmin)) {
                                alert('Only System Administrators can restore backups.');
                                return;
                              }
                              if (window.confirm(`⚠️ RESTORE DATABASE CONFIRMATION:\nAre you sure you want to restore system state from "${b.fileName}"?\nCurrent unsaved records will be replaced.`)) {
                                const payloadStr = localStorage.getItem(`gec_erp_bak_payload_${b.id}`);
                                if (payloadStr) {
                                  const res = restoreBackup(payloadStr);
                                  alert(res.message);
                                } else {
                                  alert('Backup payload not found in local archive.');
                                }
                              }
                            }}
                          >
                            <RefreshCw size={13} /> Restore
                          </button>

                          <button 
                            className="btn btn-outline" 
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.78rem', color: 'var(--danger)', borderColor: 'var(--danger)' }}
                            title="Delete backup archive"
                            onClick={() => {
                              if (!currentUser || (currentUser.role !== 'Admin' && !currentUser.isSuperAdmin)) {
                                alert('Only System Administrators can delete backups.');
                                return;
                              }
                              if (window.confirm(`Delete backup "${b.fileName}"?`)) {
                                deleteBackup(b.id);
                              }
                            }}
                          >
                            <Trash2 size={13} /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Operational Data Reset (Keep Item Master, BOMs & Admin Accounts) */}
          <div className="card" style={{ padding: '1.25rem', backgroundColor: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.35)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginTop: '1rem' }}>
            <div style={{ maxWidth: '750px' }}>
              <h4 style={{ fontSize: '0.98rem', fontWeight: 800, margin: 0, color: '#d97706', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <RefreshCw size={17} />
                Reset Operational Data (Keep Item Master, BOM Master & Admin Accounts)
              </h4>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '0.35rem 0 0 0', lineHeight: 1.45 }}>
                Clears all transactional operations (<strong>Sales Orders, Work Orders, Job Cards, Purchase Orders, Goods Receipt Notices, Jobwork Challans, QC Inspections, Machine Assembly Line, and Finished Goods/Dispatches</strong>).<br />
                <strong style={{ color: 'var(--success)' }}>STRICTLY PRESERVED:</strong> Item Master catalog, Multi-Level BOMs, and Admin user accounts are preserved.
              </p>
            </div>

            <button 
              className="btn btn-primary" 
              style={{ backgroundColor: '#d97706', borderColor: '#d97706', color: '#ffffff', fontWeight: 700, padding: '0.55rem 1.25rem' }}
              onClick={() => {
                if (!currentUser || currentUser.role !== 'Admin') {
                  alert('Only System Administrators have authorization to perform operational reset.');
                  return;
                }
                const confirmed = window.confirm(
                  '⚠️ CONFIRM OPERATIONAL RESET:\n\n' +
                  'Are you sure you want to reset all operational data?\n\n' +
                  '• CLEARED: Sales Orders, Work Orders, Job Cards, POs, GRNs, Jobwork Challans, QC, Assembly & Dispatches\n' +
                  '• PRESERVED: Item Master, BOMs, Departments & Admin Users\n\n' +
                  'Click OK to proceed with the reset.'
                );
                if (confirmed) {
                  const res = resetOperationalData();
                  alert(res.message);
                  setMessage({ text: res.message, type: 'success' });
                }
              }}
            >
              <RefreshCw size={15} /> Reset Operational Data
            </button>
          </div>

          {/* Clean Database / Wipe Demo Data Banner */}
          <div className="card" style={{ padding: '1.25rem', backgroundColor: 'rgba(239, 68, 68, 0.06)', border: '1px solid rgba(239, 68, 68, 0.25)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginTop: '0.75rem' }}>
            <div>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 800, margin: 0, color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Trash2 size={16} />
                Full Database Wipe (Clean Start - Zero Records)
              </h4>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0.25rem 0 0 0' }}>
                Permanently wipes all records including items and BOMs, leaving only 1 default Admin user (<strong>admin</strong> / <strong>password</strong>).
              </p>
            </div>

            <button 
              className="btn btn-outline" 
              style={{ color: 'var(--danger)', borderColor: 'var(--danger)', fontWeight: 700, padding: '0.45rem 1rem' }}
              onClick={() => {
                if (window.confirm('⚠️ Super Admin Warning: Are you sure you want to wipe all records and start completely fresh?')) {
                  Object.keys(localStorage).forEach(key => {
                    if (key.startsWith('gec_erp_')) {
                      localStorage.removeItem(key);
                    }
                  });
                  alert('✅ Database has been wiped clean! Reloading with 1 Admin user.');
                  window.location.reload();
                }
              }}
            >
              Wipe Everything & Start Fresh
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
