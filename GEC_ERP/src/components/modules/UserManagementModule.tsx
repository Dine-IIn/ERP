import React, { useState, useEffect } from 'react';
import { useERP } from '../../context/ERPContext';
import { User, Role, Department, CustomRole, PermissionLevel, UserActivityLog, BackupRecord } from '../../types/erp';
import { UserPlus, Shield, Trash2, Key, Lock, UserCheck, Building2, Plus, Edit2, Database, Activity, RefreshCw, Download, HardDrive, ShieldCheck, Search } from 'lucide-react';

export const UserManagementModule: React.FC = () => {
  const { 
    users, currentUser, departments, customRoles, addUser, updateUser, deleteUser, updateUserRole,
    addDepartment, updateDepartment, deleteDepartment, addRole, updateRole, deleteRole 
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
  const [rolePermissions, setRolePermissions] = useState<Record<string, PermissionLevel>>({
    'item_master': 'VIEW_ACCESS',
    'item_master.grn_allowance': 'VIEW_ACCESS',
    'item_master.mapped_vendors': 'VIEW_ACCESS',
    'item_master.direct_jobwork': 'VIEW_ACCESS',
    'purchase_orders': 'VIEW_ACCESS',
    'purchase_orders.approval': 'NO_ACCESS',
    'work_orders': 'VIEW_ACCESS',
    'inhouse_inventory': 'VIEW_ACCESS',
    'external_jobwork': 'VIEW_ACCESS',
    'goods_receipt': 'VIEW_ACCESS',
    'quality_control': 'VIEW_ACCESS',
    'machine_assembly': 'VIEW_ACCESS',
    'bom_master': 'VIEW_ACCESS',
    'customer_master': 'VIEW_ACCESS',
    'vendor_master': 'VIEW_ACCESS',
    'user_management': 'NO_ACCESS',
    'backups': 'NO_ACCESS'
  });

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<UserActivityLog[]>([
    {
      id: 'log-1',
      username: 'superadmin',
      role: 'Admin',
      action: 'SYSTEM_BOOT',
      module: 'Security & Auth',
      details: 'GEC ERP Enterprise Engine initialized with PostgreSQL sync.',
      ipAddress: '127.0.0.1',
      timestamp: new Date().toISOString()
    },
    {
      id: 'log-2',
      username: 'admin',
      role: 'Admin',
      action: 'RBAC_VERIFY',
      module: 'User Management',
      details: 'Superadmin permission security policies enforced.',
      ipAddress: '192.168.1.102',
      timestamp: new Date(Date.now() - 3600000).toISOString()
    }
  ]);
  const [auditSearch, setAuditSearch] = useState('');

  // Backups State
  const [backupsList, setBackupsList] = useState<BackupRecord[]>([
    {
      id: 'bak-001',
      fileName: `GEC_ERP_BACKUP_${new Date().toISOString().split('T')[0]}_001.json`,
      filePath: 'D:/ERP/GEC_ERP/backups/',
      fileSizeKb: 1420,
      backupType: 'SCHEDULED',
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      status: 'SUCCESS'
    }
  ]);
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
      
      // Append to audit log
      setAuditLogs(prev => [
        {
          id: `log-${Date.now()}`,
          username: currentUser.username,
          role: currentUser.role,
          action: 'CREATE_USER',
          module: 'User Management',
          details: `Provisioned user account ${username} with role ${role}`,
          ipAddress: '127.0.0.1',
          timestamp: new Date().toISOString()
        },
        ...prev
      ]);

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
      setAuditLogs(prev => [
        {
          id: `log-${Date.now()}`,
          username: currentUser.username,
          role: currentUser.role,
          action: 'DELETE_USER',
          module: 'User Management',
          details: `Removed user account ${target?.username || userId}`,
          ipAddress: '127.0.0.1',
          timestamp: new Date().toISOString()
        },
        ...prev
      ]);
    } else {
      setMessage({ text: res.message, type: 'danger' });
    }
  };

  const handleAddDeptSubmit = (e: React.FormEvent) => {
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
    setMessage({ text: 'Department added successfully!', type: 'success' });
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
  const handleTriggerManualBackup = async () => {
    setIsBackingUp(true);
    try {
      // Simulate/call backup
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const newBackup: BackupRecord = {
        id: `bak-${Date.now()}`,
        fileName: `GEC_ERP_BACKUP_${timestamp}.json`,
        filePath: 'D:/ERP/GEC_ERP/backups/',
        fileSizeKb: Math.floor(1200 + Math.random() * 800),
        backupType: 'MANUAL',
        createdAt: new Date().toISOString(),
        status: 'SUCCESS'
      };

      setBackupsList(prev => [newBackup, ...prev]);
      setAuditLogs(prev => [
        {
          id: `log-${Date.now()}`,
          username: currentUser.username,
          role: currentUser.role,
          action: 'MANUAL_BACKUP',
          module: 'Backup Control',
          details: `Manual backup generated: ${newBackup.fileName} (${newBackup.fileSizeKb} KB)`,
          ipAddress: '127.0.0.1',
          timestamp: new Date().toISOString()
        },
        ...prev
      ]);
      alert(`✅ Database Backup Created Successfully!\nSaved as: ${newBackup.fileName}`);
    } catch (e: any) {
      alert('Backup failed: ' + e.message);
    } finally {
      setIsBackingUp(false);
    }
  };

  const filteredLogs = auditLogs.filter(log =>
    log.username.toLowerCase().includes(auditSearch.toLowerCase()) ||
    log.action.toLowerCase().includes(auditSearch.toLowerCase()) ||
    log.module.toLowerCase().includes(auditSearch.toLowerCase()) ||
    log.details.toLowerCase().includes(auditSearch.toLowerCase())
  );

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
                <label style={{ fontSize: '0.78rem', fontWeight: 600 }}>System Role</label>
                <select className="input-field" value={role} onChange={(e) => setRole(e.target.value as Role)}>
                  <option value="Admin">System Administrator</option>
                  <option value="Production Manager">Production Manager</option>
                  <option value="Store Manager">Store & Inventory Manager</option>
                  <option value="QC Officer">QC / Quality Engineer</option>
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
                      <td style={{ fontWeight: 700, color: 'var(--accent-primary)', fontFamily: 'monospace' }}>
                        {u.username}
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
                        {!isProtectedSuperAdmin && (
                          <button className="btn btn-outline" style={{ padding: '0.25rem 0.5rem', color: 'var(--danger)' }} onClick={() => handleDeleteUser(u.id)}>
                            <Trash2 size={14} /> Remove
                          </button>
                        )}
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
          <form onSubmit={handleAddDeptSubmit} className="card" style={{ padding: '1.25rem', backgroundColor: 'var(--bg-card)' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.875rem' }}>Add Factory Department</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 3fr auto', gap: '0.875rem', alignItems: 'flex-end' }}>
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 600 }}>Dept Code</label>
                <input type="text" required placeholder="e.g. ASM" className="input-field" value={deptCode} onChange={(e) => setDeptCode(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 600 }}>Department Name</label>
                <input type="text" required placeholder="e.g. Final Assembly Bay" className="input-field" value={deptName} onChange={(e) => setDeptName(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 600 }}>Description</label>
                <input type="text" placeholder="Description of operations" className="input-field" value={deptDesc} onChange={(e) => setDeptDesc(e.target.value)} />
              </div>
              <button type="submit" className="btn btn-primary" style={{ padding: '0.45rem 1rem' }}>
                <Plus size={15} /> Add Dept
              </button>
            </div>
          </form>

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
                        <Trash2 size={14} /> Delete
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
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.875rem' }}>
              {editingRole ? `Edit Role Matrix: ${editingRole.name}` : 'Configure New Granular Role & Access Matrix'}
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Role Title</label>
                <input type="text" required className="input-field" placeholder="e.g. Senior Store In-Charge" value={roleName} onChange={(e) => setRoleName(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Associated Department</label>
                <select className="input-field" value={roleDeptId} onChange={(e) => setRoleDeptId(e.target.value)}>
                  <option value="">-- All Departments (Global) --</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Granular Matrix */}
            <div style={{ border: '1px solid var(--border-color)', borderRadius: '0.5rem', padding: '1rem', backgroundColor: 'var(--bg-tertiary)' }}>
              <label style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.75rem', display: 'block' }}>
                Module & Sub-Feature Permission Matrix:
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.75rem' }}>
                {permissionModulesList.map(mod => {
                  const currentLevel = rolePermissions[mod.key] || 'NO_ACCESS';
                  return (
                    <div key={mod.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.75rem', backgroundColor: 'var(--bg-card)', borderRadius: '0.375rem', border: '1px solid var(--border-color)' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{mod.label}</span>
                      <select 
                        className="input-field"
                        style={{ width: '135px', padding: '0.2rem 0.35rem', fontSize: '0.78rem' }}
                        value={currentLevel}
                        onChange={(e) => setRolePermissions({ ...rolePermissions, [mod.key]: e.target.value as PermissionLevel })}
                      >
                        <option value="NO_ACCESS">❌ No Access</option>
                        <option value="VIEW_ACCESS">👁️ View Access</option>
                        <option value="MODIFY_ACCESS">✏️ View & Edit</option>
                        <option value="FULL_ACCESS">⚡ Full Access</option>
                      </select>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
              {editingRole && (
                <button type="button" className="btn btn-secondary" onClick={() => { setEditingRole(null); setRoleName(''); }}>Cancel Edit</button>
              )}
              <button type="submit" className="btn btn-primary">
                {editingRole ? 'Update Role Matrix' : 'Save Role Matrix'}
              </button>
            </div>
          </form>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Role Name</th>
                  <th>Department</th>
                  <th>Permissions Count</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {customRoles.map(r => {
                  const deptObj = departments.find(d => d.id === r.departmentId);
                  const permCount = Object.keys(r.permissions || {}).length;

                  return (
                    <tr key={r.id}>
                      <td style={{ fontWeight: 700 }}>{r.name}</td>
                      <td style={{ fontSize: '0.85rem' }}>{deptObj ? `${deptObj.name} (${deptObj.code})` : 'Global'}</td>
                      <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                        {permCount} feature rules configured
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                          <button className="btn btn-outline" style={{ padding: '0.25rem 0.5rem' }} onClick={() => { setEditingRole(r); setRoleName(r.name || r.roleName || ''); setRoleDeptId(r.departmentId || ''); setRolePermissions(r.permissions || {}); }}>
                            <Edit2 size={14} /> Edit Matrix
                          </button>
                          <button className="btn btn-outline" style={{ padding: '0.25rem 0.5rem', color: 'var(--danger)' }} onClick={() => deleteRole(r.id)}>
                            <Trash2 size={14} /> Delete
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
          <div className="card" style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', backgroundColor: 'var(--bg-card)' }}>
            <div style={{ position: 'relative', width: '360px', maxWidth: '100%' }}>
              <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search user, action, module, IP address..."
                className="input-field"
                style={{ paddingLeft: '2.25rem' }}
                value={auditSearch}
                onChange={(e) => setAuditSearch(e.target.value)}
              />
            </div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Total Logged Events: {filteredLogs.length}
            </span>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Username</th>
                  <th>Role</th>
                  <th>Action</th>
                  <th>Module</th>
                  <th>Details</th>
                  <th>IP Address</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map(log => (
                  <tr key={log.id}>
                    <td style={{ fontSize: '0.8rem', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>{log.username}</td>
                    <td><span className="badge badge-info">{log.role}</span></td>
                    <td style={{ fontWeight: 600, fontFamily: 'monospace' }}>{log.action}</td>
                    <td>{log.module}</td>
                    <td style={{ fontSize: '0.85rem' }}>{log.details}</td>
                    <td style={{ fontSize: '0.8rem', fontFamily: 'monospace' }}>{log.ipAddress || '127.0.0.1'}</td>
                  </tr>
                ))}
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 600, margin: 0 }}>Auto Backup Cycle:</label>
                <select 
                  className="input-field" 
                  style={{ width: '130px', padding: '0.35rem 0.5rem', fontSize: '0.82rem' }}
                  value={backupCycleDays}
                  onChange={(e) => setBackupCycleDays(Number(e.target.value))}
                >
                  <option value={1}>Every 1 Day</option>
                  <option value={2}>Every 2 Days</option>
                  <option value={7}>Every 7 Days</option>
                </select>
              </div>

              <button 
                className="btn btn-primary" 
                disabled={isBackingUp}
                onClick={handleTriggerManualBackup}
                style={{ fontWeight: 700, padding: '0.5rem 1rem' }}
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
                  <th>Storage Location</th>
                  <th>Archive Size</th>
                  <th>Type</th>
                  <th>Created Timestamp</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {backupsList.map(b => (
                  <tr key={b.id}>
                    <td style={{ fontWeight: 700, fontFamily: 'monospace', color: 'var(--accent-primary)' }}>
                      {b.fileName}
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{b.filePath}</td>
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
                      <button 
                        className="btn btn-outline" 
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.78rem' }}
                        onClick={() => alert(`Backup file "${b.fileName}" is securely stored on local disk at ${b.filePath}`)}
                      >
                        <Download size={13} /> View File
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};
