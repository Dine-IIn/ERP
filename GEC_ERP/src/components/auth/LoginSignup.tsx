import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import { ShieldCheck, UserCheck, Lock, User as UserIcon, Building2, Sun, Moon, ArrowRight } from 'lucide-react';
import { Role } from '../../types/erp';

export const LoginSignup: React.FC = () => {
  const { login, signup, theme, toggleTheme } = useERP();
  const [isSignup, setIsSignup] = useState<boolean>(false);
  const [username, setUsername] = useState<string>('admin');
  const [password, setPassword] = useState<string>('password');
  const [fullName, setFullName] = useState<string>('');
  const [role, setRole] = useState<Role>('Admin');
  const [errorMsg, setErrorMsg] = useState<string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (isSignup) {
      const res = signup(username, password, fullName, role);
      if (!res.success) setErrorMsg(res.message);
    } else {
      const res = login(username, password);
      if (!res.success) setErrorMsg(res.message);
    }
  };

  const fillQuickDemo = (demoUser: string, demoRole: Role) => {
    setIsSignup(false);
    setUsername(demoUser);
    setPassword('password');
    setRole(demoRole);
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'var(--bg-primary)',
      padding: '1.5rem',
      position: 'relative'
    }}>
      {/* Top right theme toggle */}
      <div style={{ position: 'absolute', top: '1.5rem', right: '1.5rem' }}>
        <button 
          onClick={toggleTheme}
          className="btn btn-secondary"
          style={{ borderRadius: '9999px', padding: '0.5rem 1rem' }}
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
        </button>
      </div>

      <div className="animate-fade-in" style={{
        width: '100%',
        maxWidth: '460px',
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: '1.25rem',
        padding: '2.5rem',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.25)'
      }}>
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '1rem',
            backgroundColor: 'var(--accent-light)',
            color: 'var(--accent-primary)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '1rem',
            border: '1px solid var(--accent-primary)'
          }}>
            <Building2 size={36} />
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
            GEC ERP
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Moulding Machine Manufacturing & Inventory Portal
          </p>
        </div>

        {/* Tab Switcher */}
        <div style={{
          display: 'flex',
          backgroundColor: 'var(--bg-tertiary)',
          padding: '0.25rem',
          borderRadius: '0.625rem',
          marginBottom: '1.5rem'
        }}>
          <button
            onClick={() => { setIsSignup(false); setErrorMsg(''); }}
            style={{
              flex: 1,
              padding: '0.5rem',
              borderRadius: '0.5rem',
              border: 'none',
              backgroundColor: !isSignup ? 'var(--bg-card)' : 'transparent',
              color: !isSignup ? 'var(--text-primary)' : 'var(--text-secondary)',
              fontWeight: !isSignup ? 600 : 400,
              cursor: 'pointer',
              fontSize: '0.875rem',
              transition: 'all 0.15s ease'
            }}
          >
            Sign In
          </button>
          <button
            onClick={() => { setIsSignup(true); setErrorMsg(''); }}
            style={{
              flex: 1,
              padding: '0.5rem',
              borderRadius: '0.5rem',
              border: 'none',
              backgroundColor: isSignup ? 'var(--bg-card)' : 'transparent',
              color: isSignup ? 'var(--text-primary)' : 'var(--text-secondary)',
              fontWeight: isSignup ? 600 : 400,
              cursor: 'pointer',
              fontSize: '0.875rem',
              transition: 'all 0.15s ease'
            }}
          >
            Create Account
          </button>
        </div>

        {errorMsg && (
          <div style={{
            padding: '0.75rem 1rem',
            borderRadius: '0.5rem',
            backgroundColor: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid var(--danger)',
            color: 'var(--danger)',
            fontSize: '0.875rem',
            marginBottom: '1.25rem'
          }}>
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {isSignup && (
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.375rem', color: 'var(--text-secondary)' }}>
                Full Name
              </label>
              <div style={{ position: 'relative' }}>
                <UserIcon size={18} style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  required
                  placeholder="e.g. Rajesh Shah"
                  className="input-field"
                  style={{ paddingLeft: '2.5rem' }}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.375rem', color: 'var(--text-secondary)' }}>
              Username
            </label>
            <div style={{ position: 'relative' }}>
              <UserCheck size={18} style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                required
                placeholder="Enter username"
                className="input-field"
                style={{ paddingLeft: '2.5rem' }}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.375rem', color: 'var(--text-secondary)' }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="password"
                required
                placeholder="Enter password"
                className="input-field"
                style={{ paddingLeft: '2.5rem' }}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {isSignup && (
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.375rem', color: 'var(--text-secondary)' }}>
                Departmental Role
              </label>
              <select
                className="input-field"
                value={role}
                onChange={(e) => setRole(e.target.value as Role)}
              >
                <option value="Admin">Admin / Management</option>
                <option value="Production Manager">Production Manager</option>
                <option value="Store Manager">Store & Inventory Manager</option>
                <option value="QC Officer">QC / Quality Engineer</option>
              </select>
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', padding: '0.75rem', fontSize: '1rem', marginTop: '0.5rem' }}
          >
            <span>{isSignup ? 'Create Account & Sign In' : 'Sign In to GEC ERP'}</span>
            <ArrowRight size={18} />
          </button>
        </form>

        {/* Quick Demo Logins */}
        <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)' }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.75rem', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
            Quick Demo Login Shortcuts
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            <button 
              onClick={() => fillQuickDemo('admin', 'Admin')}
              className="btn btn-outline"
              style={{ fontSize: '0.75rem', padding: '0.4rem' }}
            >
              <ShieldCheck size={14} /> Admin
            </button>
            <button 
              onClick={() => fillQuickDemo('production', 'Production Manager')}
              className="btn btn-outline"
              style={{ fontSize: '0.75rem', padding: '0.4rem' }}
            >
              Production Lead
            </button>
            <button 
              onClick={() => fillQuickDemo('store', 'Store Manager')}
              className="btn btn-outline"
              style={{ fontSize: '0.75rem', padding: '0.4rem' }}
            >
              Store Head
            </button>
            <button 
              onClick={() => fillQuickDemo('qc', 'QC Officer')}
              className="btn btn-outline"
              style={{ fontSize: '0.75rem', padding: '0.4rem' }}
            >
              QC Engineer
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
