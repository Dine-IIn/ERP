import React, { useState, useEffect } from 'react';
import { X, Shield, Lock, User, Building, AlertCircle, CheckCircle, Key, Phone, Mail } from 'lucide-react';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  BACKEND_URL: string;
  initialCompanyCode: string;
  initialUsername: string;
}

export default function ForgotPasswordModal({
  isOpen,
  onClose,
  BACKEND_URL,
  initialCompanyCode,
  initialUsername,
}: ForgotPasswordModalProps) {
  const [forgotStep, setForgotStep] = useState<1 | 2>(1); // 1 = Request OTP, 2 = Verify & Reset
  const [forgotOtpCode, setForgotOtpCode] = useState('');
  const [forgotCompanyCode, setForgotCompanyCode] = useState(initialCompanyCode);
  const [forgotUsername, setForgotUsername] = useState(initialUsername);
  const [forgotEmailOrPhone, setForgotEmailOrPhone] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [forgotSuccess, setForgotSuccess] = useState<string | null>(null);

  // Sync initial inputs if parent provides them on open
  useEffect(() => {
    if (isOpen) {
      setForgotCompanyCode(initialCompanyCode);
      setForgotUsername(initialUsername);
      setForgotEmailOrPhone('');
      setForgotOtpCode('');
      setForgotNewPassword('');
      setForgotConfirmPassword('');
      setForgotStep(1);
      setForgotError(null);
      setForgotSuccess(null);
    }
  }, [isOpen, initialCompanyCode, initialUsername]);

  if (!isOpen) return null;

  const handleForgotPasswordOtpRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotCompanyCode || !forgotUsername || !forgotEmailOrPhone) {
      setForgotError("All fields are required to request recovery OTP");
      return;
    }
    setForgotLoading(true);
    setForgotError(null);
    setForgotSuccess(null);
    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/forgot-password-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyCode: forgotCompanyCode,
          username: forgotUsername,
          emailOrPhone: forgotEmailOrPhone,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to request recovery OTP.");
      }
      const codeSuffix = data.otpCode ? ` (Developer Mode Code: ${data.otpCode})` : "";
      setForgotSuccess(`${data.message}${codeSuffix}`);
      setForgotStep(2);
    } catch (err: any) {
      setForgotError(err.message || "Failed to request recovery OTP.");
    } finally {
      setForgotLoading(false);
    }
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (forgotNewPassword !== forgotConfirmPassword) {
      setForgotError("Passwords do not match");
      return;
    }
    if (!forgotOtpCode) {
      setForgotError("OTP code is required for password recovery authorization");
      return;
    }
    setForgotLoading(true);
    setForgotError(null);
    setForgotSuccess(null);
    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyCode: forgotCompanyCode,
          username: forgotUsername,
          emailOrPhone: forgotEmailOrPhone,
          newPassword: forgotNewPassword,
          otpCode: forgotOtpCode,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Reset password request failed.");
      }
      setForgotSuccess("Password reset successful! You can now log in.");
      
      // Auto close after 2 seconds
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err: any) {
      setForgotError(err.message || "Failed to reset password.");
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in select-none">
      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl w-full max-w-md p-6 relative shadow-2xl text-left animate-scale-up">
        
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer bg-transparent border-0 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 pb-3 border-b border-[var(--border-color)]">
          <div className="p-2.5 bg-indigo-500/10 rounded-xl text-indigo-400 border border-indigo-500/20">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-base text-[var(--text-primary)] font-display">Account Password Recovery</h3>
            <p className="text-[var(--text-secondary)] text-[10px]">Reset access using registered SMS or Email</p>
          </div>
        </div>

        {/* Alerts */}
        {(forgotError || forgotSuccess) && (
          <div className="mt-4">
            {forgotError && (
              <div className="bg-red-500/10 border border-red-500/20 p-2.5 rounded-lg flex items-center gap-2 text-red-500 text-xs leading-normal">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{forgotError}</span>
              </div>
            )}
            {forgotSuccess && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-lg flex items-center gap-2 text-emerald-500 text-xs leading-normal">
                <CheckCircle className="w-4 h-4 shrink-0" />
                <span>{forgotSuccess}</span>
              </div>
            )}
          </div>
        )}

        {forgotStep === 1 ? (
          /* Step 1: Request OTP form */
          <form onSubmit={handleForgotPasswordOtpRequest} className="mt-4 flex flex-col gap-4">
            <div>
              <label className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block">Company Code</label>
              <div className="mt-1 relative">
                <Building className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  type="text"
                  required
                  placeholder="e.g. DINEIN, APPLE"
                  value={forgotCompanyCode}
                  onChange={e => setForgotCompanyCode(e.target.value.toUpperCase())}
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-indigo-500/50 py-2 px-3 pl-10 rounded-lg text-xs"
                />
              </div>
            </div>

            <div>
              <label className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block">Username</label>
              <div className="mt-1 relative">
                <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  type="text"
                  required
                  placeholder="Enter username"
                  value={forgotUsername}
                  onChange={e => setForgotUsername(e.target.value)}
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-indigo-500/50 py-2 px-3 pl-10 rounded-lg text-xs"
                />
              </div>
            </div>

            <div>
              <label className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block">Registered Email or Phone Number</label>
              <div className="mt-1 relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  type="text"
                  required
                  placeholder="e.g. +919999999999 or email@domain.com"
                  value={forgotEmailOrPhone}
                  onChange={e => setForgotEmailOrPhone(e.target.value)}
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-indigo-500/50 py-2 px-3 pl-10 rounded-lg text-xs"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-2">
              <button
                type="button"
                onClick={onClose}
                className="w-1/2 bg-[var(--bg-tertiary)] border border-[var(--border-color)] hover:text-[var(--text-primary)] font-bold py-2 rounded-lg text-xs cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={forgotLoading}
                className="w-1/2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 rounded-lg text-xs cursor-pointer transition-colors"
              >
                {forgotLoading ? 'Processing...' : 'Send Recovery OTP'}
              </button>
            </div>
          </form>
        ) : (
          /* Step 2: Input OTP & Set New Password */
          <form onSubmit={handleForgotPasswordSubmit} className="mt-4 flex flex-col gap-4">
            <div className="text-center p-2.5 bg-indigo-500/5 border border-indigo-500/10 rounded-xl">
              <span className="text-[10px] text-indigo-400 leading-relaxed block">
                Verification OTP sent to: <strong>{forgotEmailOrPhone}</strong>
              </span>
            </div>

            <div>
              <label className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block">Verification Code</label>
              <div className="mt-1 relative">
                <Key className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  type="text"
                  required
                  maxLength={6}
                  placeholder="6-digit OTP code"
                  value={forgotOtpCode}
                  onChange={e => setForgotOtpCode(e.target.value)}
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-indigo-500/50 py-2 px-3 pl-10 rounded-lg text-xs text-center font-mono tracking-[4px]"
                />
              </div>
            </div>

            <div>
              <label className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block">New Password</label>
              <div className="mt-1 relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  type="password"
                  required
                  placeholder="Minimum 6 characters"
                  value={forgotNewPassword}
                  onChange={e => setForgotNewPassword(e.target.value)}
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-indigo-500/50 py-2 px-3 pl-10 rounded-lg text-xs"
                />
              </div>
            </div>

            <div>
              <label className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block">Confirm New Password</label>
              <div className="mt-1 relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  type="password"
                  required
                  placeholder="Re-enter password"
                  value={forgotConfirmPassword}
                  onChange={e => setForgotConfirmPassword(e.target.value)}
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-indigo-500/50 py-2 px-3 pl-10 rounded-lg text-xs"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-2">
              <button
                type="button"
                onClick={() => setForgotStep(1)}
                className="w-1/2 bg-[var(--bg-tertiary)] border border-[var(--border-color)] hover:text-[var(--text-primary)] font-bold py-2 rounded-lg text-xs cursor-pointer transition-colors"
              >
                Back to OTP Request
              </button>
              <button
                type="submit"
                disabled={forgotLoading}
                className="w-1/2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 rounded-lg text-xs cursor-pointer transition-colors"
              >
                {forgotLoading ? 'Resetting Password...' : 'Reset Password'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
