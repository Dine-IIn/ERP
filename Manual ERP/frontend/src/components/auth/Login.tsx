import React from 'react';
import { Building, User, Lock, Shield, AlertCircle, CheckCircle } from 'lucide-react';

interface LoginProps {
  loginForm: {
    companyCode: string;
    username: string;
    password: string;
  };
  setLoginForm: React.Dispatch<React.SetStateAction<{
    companyCode: string;
    username: string;
    password: string;
  }>>;
  handleLoginSubmit: (e: React.FormEvent) => void;
  loading: boolean;
  errorMsg: string | null;
  successMsg: string | null;
  onRegisterClick: () => void;
  onForgotPasswordClick: () => void;
  conflictModalOpen: boolean;
  setConflictModalOpen: (open: boolean) => void;
  conflictDeviceModel: string;
  handleForceLogin: () => void;
  onSwitchWorkspace?: () => void;
}

export default function Login({
  loginForm,
  setLoginForm,
  handleLoginSubmit,
  loading,
  errorMsg,
  successMsg,
  onRegisterClick,
  onForgotPasswordClick,
  conflictModalOpen,
  setConflictModalOpen,
  conflictDeviceModel,
  handleForceLogin,
  onSwitchWorkspace,
}: LoginProps) {
  return (
    <div className="w-full max-w-md bg-[var(--bg-card)] border border-[var(--border-color)] p-8 rounded-2xl shadow-xl relative animate-fade-in">
      <div className="flex justify-center mb-6">
        <div className="p-3.5 bg-indigo-500/10 rounded-xl border border-indigo-500/20 text-indigo-500">
          <Shield className="w-8 h-8" />
        </div>
      </div>

      <div className="text-center">
        <span className="text-[10px] font-bold text-indigo-500 tracking-wider uppercase">Manual ERP Platform</span>
        <h2 className="text-xl font-bold text-[var(--text-primary)] mt-1 font-display">Sign In to Console</h2>
        <p className="text-[var(--text-secondary)] text-xs mt-1.5 leading-normal">Provide credentials to enter your company workstation.</p>
      </div>

      {(errorMsg || successMsg) && (
        <div className="mt-4">
          {errorMsg && (
            <div className="bg-red-500/10 border border-red-500/20 p-2.5 rounded-lg flex items-center gap-2 text-red-500 text-xs leading-normal">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
          {successMsg && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-lg flex items-center gap-2 text-emerald-500 text-xs leading-normal">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}
        </div>
      )}

      <form onSubmit={handleLoginSubmit} className="mt-6 flex flex-col gap-4">
        {!(typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__ !== undefined) && (
          <div>
            <label className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block">Company Tenant Code</label>
            <div className="mt-1 relative">
              <Building className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                type="text"
                required
                placeholder="e.g. APPLE, DINEIN, SUPERADMIN"
                value={loginForm.companyCode}
                onChange={e => setLoginForm({ ...loginForm, companyCode: e.target.value })}
                className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] focus:border-indigo-500/50 py-2.5 pl-10 pr-4 rounded-lg text-xs focus:outline-none transition-colors"
              />
            </div>
          </div>
        )}

        <div>
          <label className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block">Username</label>
          <div className="mt-1 relative">
            <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              required
              placeholder="Enter username"
              value={loginForm.username}
              onChange={e => setLoginForm({ ...loginForm, username: e.target.value })}
              className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] focus:border-indigo-500/50 py-2.5 pl-10 pr-4 rounded-lg text-xs focus:outline-none transition-colors"
            />
          </div>
        </div>

        <div>
          <label className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block">Password</label>
          <div className="mt-1 relative">
            <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="password"
              required
              placeholder="••••••••"
              value={loginForm.password}
              onChange={e => setLoginForm({ ...loginForm, password: e.target.value })}
              className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] focus:border-indigo-500/50 py-2.5 pl-10 pr-4 rounded-lg text-xs focus:outline-none transition-colors"
            />
          </div>
          <div className="flex justify-end mt-1.5">
            <button
              type="button"
              onClick={onForgotPasswordClick}
              className="text-indigo-500 hover:text-indigo-400 hover:underline font-semibold text-[10px] cursor-pointer transition-colors bg-transparent border-0"
            >
              Forgot Password?
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full mt-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 rounded-lg transition-colors cursor-pointer text-xs shadow-md shadow-indigo-600/10"
        >
          {loading ? 'Authenticating...' : 'Secure Workspace Login'}
        </button>
      </form>

      <div className="mt-5 text-center border-t border-[var(--border-color)] pt-4">
        <span className="text-[var(--text-muted)] text-xs">New user on the platform?</span>
        <button 
          onClick={onRegisterClick} 
          className="text-indigo-500 hover:underline font-bold text-xs ml-1 cursor-pointer font-display bg-transparent border-0"
        >
          Join Tenant Company
        </button>
      </div>

      {typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__ !== undefined && onSwitchWorkspace && (
        <div className="mt-3 text-center border-t border-[var(--border-color)]/50 pt-3">
          <button
            type="button"
            onClick={onSwitchWorkspace}
            className="text-indigo-500 hover:underline font-bold text-xs cursor-pointer font-display bg-transparent border-0"
          >
            Switch Workspace / Company
          </button>
        </div>
      )}

      {/* Concurrent Session Conflict Modal */}
      {conflictModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in select-none">
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] p-6 rounded-2xl shadow-2xl flex flex-col items-center gap-4 text-center max-w-sm animate-scale-up border-indigo-500/20">
            <div className="p-3 bg-amber-500/10 text-amber-500 rounded-full border border-amber-500/20 animate-pulse">
              <AlertCircle className="w-8 h-8" />
            </div>
            <div>
              <h4 className="font-bold text-base text-[var(--text-primary)] font-display">Active Session Detected</h4>
              <p className="text-[var(--text-secondary)] text-xs mt-2 leading-relaxed">
                You are already signed into another device of this type:<br />
                <strong className="text-indigo-400 font-mono text-[11px] block bg-[var(--bg-tertiary)] py-1.5 px-3 rounded-lg border border-[var(--border-color)] mt-1.5">{conflictDeviceModel}</strong>
              </p>
              <p className="text-[var(--text-muted)] text-[10px] mt-2 leading-normal">
                ERP security protocols limit your active session to one concurrent login per device type. Do you want to terminate the existing session and proceed here?
              </p>
            </div>
            
            <div className="w-full flex gap-3 mt-2">
              <button
                type="button"
                onClick={() => setConflictModalOpen(false)}
                className="w-1/2 bg-[var(--bg-tertiary)] border border-[var(--border-color)] hover:bg-[var(--bg-primary)] hover:text-[var(--text-primary)] text-[var(--text-secondary)] font-bold py-2 rounded-lg text-xs cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleForceLogin}
                className="w-1/2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 rounded-lg text-xs cursor-pointer shadow-md shadow-indigo-600/10 transition-colors"
              >
                Force Log In
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
