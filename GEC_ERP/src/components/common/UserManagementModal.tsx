import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import { Modal } from './Modal';
import { User, Role } from '../../types/erp';
import { UserPlus, Shield, Trash2, Key, Lock, UserCheck } from 'lucide-react';

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UserManagementModal: React.FC<UserManagementModalProps> = ({ isOpen, onClose }) => {
  const { users, currentUser, addUser, deleteUser, updateUserRole } = useERP();

  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('Production Manager');
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'danger' } | null>(null);

  if (!currentUser || currentUser.role !== 'Admin') {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Access Restricted">
        <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--danger)' }}>
          Only System Administrators can access User Management.
        </div>
      </Modal>
    );
  }

  const handleAddUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const res = addUser({
      username,
      fullName,
      email: email || `${username}@gecmachines.com`,
      role
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

  const handleRoleChange = (userId: string, newRole: Role) => {
    const res = updateUserRole(userId, newRole);
    if (res.success) {
      setMessage({ text: res.message, type: 'success' });
    } else {
      setMessage({ text: res.message, type: 'danger' });
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="User & Security Access Control Management">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        
        {message && (
          <div style={{
            padding: '0.625rem 0.875rem',
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

        {/* Super Admin Notice Card */}
        <div style={{ padding: '0.75rem 1rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: '0.5rem', border: '1px solid var(--accent-primary)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-primary)', fontWeight: 700, fontSize: '0.85rem' }}>
            <Lock size={16} /> Super Admin & Role Protection Rules
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.25rem', lineHeight: 1.4 }}>
            &bull; Super Admin (<code>superadmin</code>) password is protected with complex combination of numbers, special characters, and uppercase/lowercase letters.<br />
            &bull; Super Admin cannot be removed or demoted by other Admins.<br />
            &bull; Only Super Admin can promote/demote users to/from Admin status.
          </div>
        </div>

        {/* Add User Panel */}
        <form onSubmit={handleAddUserSubmit} style={{ padding: '0.875rem', backgroundColor: 'var(--bg-card)', borderRadius: '0.5rem', border: '1px solid var(--border-color)' }}>
          <h4 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <UserPlus size={16} /> Register New System User
          </h4>

          <div className="form-grid-2">
            <div>
              <label>Username</label>
              <input type="text" required className="input-field" placeholder="e.g. manav.k" value={username} onChange={(e) => setUsername(e.target.value)} />
            </div>
            <div>
              <label>Full Name</label>
              <input type="text" required className="input-field" placeholder="e.g. Manav Kalola" value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
          </div>

          <div className="form-grid-2" style={{ marginTop: '0.5rem' }}>
            <div>
              <label>Email Address</label>
              <input type="email" className="input-field" placeholder="manav@gecmachines.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <label>Access Role</label>
              <select className="input-field" value={role} onChange={(e) => setRole(e.target.value as Role)}>
                <option value="Production Manager">Production Manager</option>
                <option value="Store Manager">Store Manager</option>
                <option value="QC Officer">QC Officer</option>
                {currentUser.isSuperAdmin && <option value="Admin">Admin</option>}
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.75rem' }}>
            <button type="submit" className="btn btn-primary">
              <UserPlus size={15} /> Add User
            </button>
          </div>
        </form>

        {/* Users List Table */}
        <div>
          <h4 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
            Active System Accounts ({users.length}):
          </h4>
          <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '0.5rem', backgroundColor: 'var(--bg-input)' }}>
            {users.map(u => {
              const isSuper = u.isSuperAdmin || u.username.toLowerCase() === 'superadmin';
              return (
                <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.625rem 0.875rem', borderBottom: '1px solid var(--border-color)', backgroundColor: isSuper ? 'var(--bg-tertiary)' : 'transparent' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                      {u.fullName} <span style={{ fontFamily: 'monospace', color: 'var(--accent-primary)', fontSize: '0.75rem' }}>({u.username})</span>
                      {isSuper && <span className="badge badge-warning" style={{ marginLeft: '0.5rem' }}>Super Admin</span>}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{u.email}</div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {currentUser.isSuperAdmin && !isSuper ? (
                      <select
                        className="input-field"
                        style={{ padding: '0.2rem 0.4rem', fontSize: '0.75rem', width: '130px' }}
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.id, e.target.value as Role)}
                      >
                        <option value="Admin">Admin</option>
                        <option value="Production Manager">Production Manager</option>
                        <option value="Store Manager">Store Manager</option>
                        <option value="QC Officer">QC Officer</option>
                      </select>
                    ) : (
                      <span className="badge badge-info" style={{ fontSize: '0.72rem' }}>{u.role}</span>
                    )}

                    {!isSuper && (
                      <button
                        type="button"
                        className="btn btn-outline"
                        style={{ padding: '0.25rem 0.45rem', color: 'var(--danger)', borderColor: 'var(--danger)' }}
                        title="Delete User Account"
                        onClick={() => handleDeleteUser(u.id)}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
        </div>

      </div>
    </Modal>
  );
};
