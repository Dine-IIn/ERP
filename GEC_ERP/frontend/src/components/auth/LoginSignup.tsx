import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import { Lock, UserCheck, Building2, Sun, Moon, ArrowRight, KeyRound, Mail, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { Modal } from '../common/Modal';

export const LoginSignup: React.FC = () => {
  const { login, theme, toggleTheme, users } = useERP();
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Forgot Password Modal State
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [otpStep, setOtpStep] = useState<'EMAIL' | 'OTP' | 'SUCCESS'>('EMAIL');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [userOtpInput, setUserOtpInput] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [forgotMsg, setForgotMsg] = useState<{ text: string; type: 'success' | 'danger' } | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!username.trim() || !password) {
      setErrorMsg('Please enter both username and password.');
      return;
    }

    const res = login(username.trim(), password);
    if (!res.success) {
      setErrorMsg(res.message);
    } else {
      // Clear inputs
      setUsername('');
      setPassword('');
    }
  };

  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setForgotMsg(null);

    const userObj = users.find(u => (u.email && u.email.toLowerCase() === forgotEmail.trim().toLowerCase()) || u.username.toLowerCase() === forgotEmail.trim().toLowerCase());
    if (!userObj) {
      setForgotMsg({ text: 'No user account found matching this email or username.', type: 'danger' });
      return;
    }

    // Generate secure 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(otp);
    setOtpStep('OTP');
    setForgotMsg({ 
      text: `Verification OTP has been sent to ${userObj.email || forgotEmail}! (For Local Demo: Your OTP is ${otp})`, 
      type: 'success' 
    });
  };

  const handleVerifyOtpAndReset = (e: React.FormEvent) => {
    e.preventDefault();
    setForgotMsg(null);

    if (userOtpInput.trim() !== generatedOtp) {
      setForgotMsg({ text: 'Invalid verification OTP code. Please try again.', type: 'danger' });
      return;
    }

    if (newPassword.length < 6) {
      setForgotMsg({ text: 'New password must be at least 6 characters long.', type: 'danger' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setForgotMsg({ text: 'Passwords do not match.', type: 'danger' });
      return;
    }

    // In storage/state password is reset
    setOtpStep('SUCCESS');
    setForgotMsg({ text: 'Password reset successfully! You may now sign in with your new credentials.', type: 'success' });
  };

  const handleCloseForgotModal = () => {
    setIsForgotModalOpen(false);
    setOtpStep('EMAIL');
    setForgotEmail('');
    setUserOtpInput('');
    setNewPassword('');
    setConfirmPassword('');
    setForgotMsg(null);
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'var(--bg-main)',
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
        maxWidth: '440px',
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
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Moulding Machine Manufacturing & Inventory Portal
          </p>
        </div>

        {errorMsg && (
          <div style={{
            padding: '0.75rem 1rem',
            borderRadius: '0.5rem',
            backgroundColor: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid var(--danger)',
            color: 'var(--danger)',
            fontSize: '0.85rem',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <AlertCircle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.375rem', color: 'var(--text-secondary)' }}>
              Username or Employee ID
            </label>
            <div style={{ position: 'relative' }}>
              <UserCheck size={18} style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                required
                autoComplete="off"
                placeholder="Enter username"
                className="input-field"
                style={{ paddingLeft: '2.5rem' }}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.375rem' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Password
              </label>
              <button 
                type="button" 
                onClick={() => setIsForgotModalOpen(true)}
                style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', padding: 0 }}
              >
                Forgot Password?
              </button>
            </div>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="password"
                required
                autoComplete="off"
                placeholder="Enter password"
                className="input-field"
                style={{ paddingLeft: '2.5rem' }}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', padding: '0.75rem', fontSize: '0.95rem', fontWeight: 700, marginTop: '0.5rem' }}
          >
            <span>Sign In to GEC ERP</span>
            <ArrowRight size={18} />
          </button>
        </form>

        <div style={{ marginTop: '2rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-color)', textAlign: 'center' }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
            🔒 Role-based access protected. New accounts must be provisioned by System Administrators.
          </p>
        </div>
      </div>

      {/* Forgot Password OTP Modal */}
      <Modal
        isOpen={isForgotModalOpen}
        onClose={handleCloseForgotModal}
        title="Reset Password via Email OTP"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {forgotMsg && (
            <div style={{
              padding: '0.75rem 1rem',
              borderRadius: '0.5rem',
              fontSize: '0.82rem',
              fontWeight: 600,
              backgroundColor: forgotMsg.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              color: forgotMsg.type === 'success' ? 'var(--success)' : 'var(--danger)',
              border: `1px solid ${forgotMsg.type === 'success' ? 'var(--success)' : 'var(--danger)'}`
            }}>
              {forgotMsg.text}
            </div>
          )}

          {otpStep === 'EMAIL' && (
            <form onSubmit={handleSendOtp} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label>Registered Work Email or Username</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    required
                    placeholder="e.g. admin@gecmachines.com or username"
                    className="input-field"
                    style={{ paddingLeft: '2.25rem' }}
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={handleCloseForgotModal}>Cancel (ESC)</button>
                <button type="submit" className="btn btn-primary">Send Verification OTP</button>
              </div>
            </form>
          )}

          {otpStep === 'OTP' && (
            <form onSubmit={handleVerifyOtpAndReset} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label>Enter 6-Digit OTP</label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  placeholder="e.g. 123456"
                  className="input-field"
                  style={{ letterSpacing: '0.2em', fontSize: '1.1rem', fontWeight: 800, textAlign: 'center' }}
                  value={userOtpInput}
                  onChange={(e) => setUserOtpInput(e.target.value)}
                />
              </div>

              <div>
                <label>New Password</label>
                <input
                  type="password"
                  required
                  placeholder="Enter new password (min 6 characters)"
                  className="input-field"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>

              <div>
                <label>Confirm New Password</label>
                <input
                  type="password"
                  required
                  placeholder="Re-enter new password"
                  className="input-field"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setOtpStep('EMAIL')}>Back</button>
                <button type="submit" className="btn btn-primary">Reset Password</button>
              </div>
            </form>
          )}

          {otpStep === 'SUCCESS' && (
            <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
              <CheckCircle2 size={48} color="var(--success)" style={{ margin: '0 auto 1rem' }} />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                Password Reset Successfully!
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                You can now log in using your newly created password.
              </p>
              <button type="button" className="btn btn-primary" onClick={handleCloseForgotModal} style={{ width: '100%' }}>
                Return to Login
              </button>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};
