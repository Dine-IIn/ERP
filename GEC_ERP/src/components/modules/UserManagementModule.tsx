import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import { User, Role, Department, CustomRole, PermissionLevel } from '../../types/erp';
import { UserPlus, Shield, Trash2, Key, Lock, UserCheck, Building2, Plus, Edit2 } from 'lucide-react';

export const UserManagementModule: React.FC = () => {
  const { 
    users, currentUser, departments, customRoles, addUser, updateUser, deleteUser, updateUserRole,
    addDepartment, updateDepartment, deleteDepartment, addRole, updateRole, deleteRole 
  } = useERP();

  const [activeTab, setActiveTab] = useState<'USERS' | 'DEPARTMENTS' | 'ROLES'>('USERS');

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
    'purchase_orders': 'VIEW_ACCESS',
    'purchase_orders.approval': 'NO_ACCESS',
    'work_orders': 'VIEW_ACCESS',
    'store_inventory': 'VIEW_ACCESS',
    'external_jobwork': 'VIEW_ACCESS',
    'goods_receipt': 'VIEW_ACCESS',
    'quality_control': 'VIEW_ACCESS',
    'machine_assembly': 'VIEW_ACCESS',
    'bom_master': 'VIEW_ACCESS',
    'customer_master': 'VIEW_ACCESS',
    'vendor_master': 'VIEW_ACCESS',
    'mrp_planning': 'VIEW_ACCESS',
    'user_management': 'NO_ACCESS'
  });

  if (!currentUser || currentUser.role !== 'Admin') {
    return (
      <div className="card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--danger)' }}>
        <h3>Access Restricted</h3>
        <p>Only System Administrators can access User & Security Management.</p>
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
    const res = deleteUser(userId);
    if (res.success) {
      setMessage({ text: res.message, type: 'success' });
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
    setMessage({ text: 'Department created successfully!', type: 'success' });
  };

  const handleSaveRoleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleName) return;

    if (editingRole) {
      updateRole({
        ...editingRole,
        roleName: roleName,
        name: roleName,
        departmentId: roleDeptId || undefined,
        permissions: rolePermissions
      });
      setMessage({ text: 'Role permissions updated!', type: 'success' });
    } else {
      addRole({
        roleName: roleName,
        name: roleName,
        description: 'Custom User Role',
        departmentId: roleDeptId || undefined,
        permissions: rolePermissions
      });
      setMessage({ text: 'New Granular Role created!', type: 'success' });
    }

    setEditingRole(null);
    setRoleName('');
  };

  const permissionModulesList = [
    { key: 'item_master', label: 'Item Master Catalog' },
    { key: 'item_master.grn_allowance', label: '↳ Item Master: Edit GRN Allowance % Field' },
    { key: 'item_master.mapped_vendors', label: '↳ Item Master: Edit Mapped Vendors Priority' },
    { key: 'purchase_orders', label: 'Purchase Orders (PO)' },
    { key: 'purchase_orders.approval', label: '↳ PO Approval Authority' },
    { key: 'work_orders', label: 'Work Orders (WO)' },
    { key: 'store_inventory', label: 'In-House Store & Inventory' },
    { key: 'external_jobwork', label: 'Job Work Challans' },
    { key: 'goods_receipt', label: 'Goods Received Notice (GRN)' },
    { key: 'quality_control', label: 'Quality Control (QC)' },
    { key: 'machine_assembly', label: 'Machine Assembly Station' },
    { key: 'bom_master', label: 'BOM Master' },
    { key: 'customer_master', label: 'Customer Master' },
    { key: 'vendor_master', label: 'Vendor Master' },
    { key: 'mrp_planning', label: 'MRP Shortage Planning' },
    { key: 'user_management', label: 'User & Security Access Admin' }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* Header Banner */}
      <div className="card" style={{ padding: '1rem 1.25rem', backgroundColor: 'var(--bg-card)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <UserCheck size={20} color="var(--accent-primary)" /> Deep RBAC, Department & User Security Admin
          </h2>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
            Manage company departments, system users, and ultra-granular access matrices.
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button 
            className={`btn ${activeTab === 'USERS' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setActiveTab('USERS')}
          >
            <UserCheck size={16} /> System Users ({users.length})
          </button>
          <button 
            className={`btn ${activeTab === 'DEPARTMENTS' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setActiveTab('DEPARTMENTS')}
          >
            <Building2 size={16} /> Departments ({departments.length})
          </button>
          <button 
            className={`btn ${activeTab === 'ROLES' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setActiveTab('ROLES')}
          >
            <Shield size={16} /> Roles & Access Matrix ({customRoles.length})
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

      {/* TAB 1: USERS */}
      {activeTab === 'USERS' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Add User Form */}
          <form onSubmit={handleAddUserSubmit} className="card" style={{ padding: '1.25rem', backgroundColor: 'var(--bg-card)' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.875rem' }}>Register New User Account</h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Username</label>
                <input type="text" required className="input-field" placeholder="e.g. rohit.sharma" value={username} onChange={(e) => setUsername(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Full Name</label>
                <input type="text" required className="input-field" placeholder="e.g. Rohit Sharma" value={fullName} onChange={(e) => setFullName(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Email Address</label>
                <input type="email" className="input-field" placeholder="rohit@gecmachines.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '1rem', alignItems: 'flex-end', marginTop: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Primary Standard Role</label>
                <select className="input-field" value={role} onChange={(e) => setRole(e.target.value as Role)}>
                  <option value="Admin">Admin</option>
                  <option value="Production Manager">Production Manager</option>
                  <option value="Store Manager">Store Manager</option>
                  <option value="QC Officer">QC Officer</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Department</label>
                <select className="input-field" value={selectedDeptId} onChange={(e) => setSelectedDeptId(e.target.value)}>
                  <option value="">-- Select Department --</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Granular Role Matrix</label>
                <select className="input-field" value={selectedRoleId} onChange={(e) => setSelectedRoleId(e.target.value)}>
                  <option value="">-- Select Custom Role --</option>
                  {customRoles.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>
              <button type="submit" className="btn btn-primary">
                <UserPlus size={16} /> Create User Account
              </button>
            </div>
          </form>

          {/* Users Table */}
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>User Details</th>
                  <th>Standard Role</th>
                  <th>Department</th>
                  <th>Granular Role</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => {
                  const deptObj = departments.find(d => d.id === u.departmentId);
                  const roleObj = customRoles.find(r => r.id === u.roleId);
                  const isSuper = u.isSuperAdmin || u.username.toLowerCase() === 'superadmin';

                  return (
                    <tr key={u.id}>
                      <td>
                        <div style={{ fontWeight: 700 }}>{u.fullName}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>@{u.username} | {u.email}</div>
                      </td>
                      <td>
                        <span className={`badge ${u.role === 'Admin' ? 'badge-primary' : 'badge-neutral'}`}>
                          {u.role}
                        </span>
                        {isSuper && (
                          <span className="badge badge-success" style={{ marginLeft: '0.35rem', fontSize: '0.7rem' }}>
                            Super Admin
                          </span>
                        )}
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>{deptObj ? `${deptObj.name} (${deptObj.code})` : '-'}</td>
                      <td style={{ fontSize: '0.85rem', fontWeight: 600 }}>{roleObj ? roleObj.name : 'Standard'}</td>
                      <td>
                        {!isSuper ? (
                          <button className="btn btn-outline" style={{ padding: '0.25rem 0.5rem', color: 'var(--danger)', borderColor: 'var(--danger)' }} onClick={() => handleDeleteUser(u.id)}>
                            <Trash2 size={14} /> Remove
                          </button>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Protected</span>
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
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.875rem' }}>Create Company Department</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 2fr auto', gap: '1rem', alignItems: 'flex-end' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Department Name</label>
                <input type="text" required className="input-field" placeholder="e.g. Purchase & Procurement" value={deptName} onChange={(e) => setDeptName(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Dept Code</label>
                <input type="text" required className="input-field" placeholder="PUR" value={deptCode} onChange={(e) => setDeptCode(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Description</label>
                <input type="text" className="input-field" placeholder="Responsibilities & duties..." value={deptDesc} onChange={(e) => setDeptDesc(e.target.value)} />
              </div>
              <button type="submit" className="btn btn-primary">
                <Plus size={16} /> Add Department
              </button>
            </div>
          </form>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Dept Code</th>
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

      {/* TAB 3: ROLES & PERMISSIONS MATRIX */}
      {activeTab === 'ROLES' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          <form onSubmit={handleSaveRoleSubmit} className="card" style={{ padding: '1.25rem', backgroundColor: 'var(--bg-card)' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.875rem' }}>
              {editingRole ? `Edit Role Matrix: ${editingRole.name}` : 'Configure New Granular Role & Access Matrix'}
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Role Title</label>
                <input type="text" required className="input-field" placeholder="e.g. Store & Inventory Sub-Admin" value={roleName} onChange={(e) => setRoleName(e.target.value)} />
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                {permissionModulesList.map(mod => {
                  const currentLevel = rolePermissions[mod.key] || 'NO_ACCESS';
                  return (
                    <div key={mod.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.75rem', backgroundColor: 'var(--bg-card)', borderRadius: '0.375rem', border: '1px solid var(--border-color)' }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>{mod.label}</span>
                      <select 
                        className="input-field"
                        style={{ width: '150px', padding: '0.2rem 0.4rem', fontSize: '0.8rem' }}
                        value={currentLevel}
                        onChange={(e) => setRolePermissions({ ...rolePermissions, [mod.key]: e.target.value as PermissionLevel })}
                      >
                        <option value="NO_ACCESS">❌ No Access</option>
                        <option value="VIEW_ACCESS">👁️ View Access</option>
                        <option value="MODIFY_ACCESS">✏️ Modify (No Del)</option>
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
                {editingRole ? 'Update Role Matrix' : 'Save New Role Matrix'}
              </button>
            </div>
          </form>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Role Name</th>
                  <th>Department</th>
                  <th>Configured Modules</th>
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
                        {permCount} permissions configured
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

    </div>
  );
};
