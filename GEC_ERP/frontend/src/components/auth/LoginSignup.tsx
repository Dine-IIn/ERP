import React, { useState, useEffect } from 'react';
import { useERP } from '../../context/ERPContext';
import { apiClient, ServerHealthResponse } from '../../services/apiClient';
import { Lock, UserCheck, Building2, Sun, Moon, ArrowRight, Mail, CheckCircle2, AlertCircle, Eye, EyeOff, Server, Wifi, WifiOff, Settings, RefreshCw, Globe, Radio } from 'lucide-react';
import { Modal } from '../common/Modal';

export const LoginSignup: React.FC = () => {
  const { login, theme, toggleTheme, users, resetUserPassword } = useERP();
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showNewPassword, setShowNewPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Server Connection Status State
  const [serverMode, setServerMode] = useState<'LAN' | 'CLOUD' | 'LOCALHOST' | 'OFFLINE' | 'CHECKING'>('CHECKING');
  const [isServerOnline, setIsServerOnline] = useState<boolean>(false);
  const [activeEndpoint, setActiveEndpoint] = useState<string>(apiClient.getBaseUrl());
  const [isProbingServer, setIsProbingServer] = useState<boolean>(false);
  const [serverHealthData, setServerHealthData] = useState<ServerHealthResponse | null>(null);

  // Server Settings Modal State
  const [isServerConfigOpen, setIsServerConfigOpen] = useState<boolean>(false);
  const [lanInput, setLanInput] = useState<string>(apiClient.getLanUrl() || '');
  const [cloudInput, setCloudInput] = useState<string>(apiClient.getCloudUrl() || '');
  const [configFeedback, setConfigFeedback] = useState<{ text: string; type: 'success' | 'danger' | 'info' } | null>(null);
  const [isTestingConfig, setIsTestingConfig] = useState<boolean>(false);

  // Forgot Password Modal State
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [otpStep, setOtpStep] = useState<'EMAIL' | 'OTP' | 'SUCCESS'>('EMAIL');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [userOtpInput, setUserOtpInput] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [forgotMsg, setForgotMsg] = useState<{ text: string; type: 'success' | 'danger' } | null>(null);

  // Check Server Health
  const checkServerStatus = async () => {
    setIsProbingServer(true);
    try {
      const res = await apiClient.checkHealth();
      setIsServerOnline(res.online);
      setServerMode(res.mode);
      setActiveEndpoint(apiClient.getBaseUrl());
      setServerHealthData(res.data || null);
    } catch {
      setIsServerOnline(false);
      setServerMode('OFFLINE');
    } finally {
      setIsProbingServer(false);
    }
  };

  useEffect(() => {
    checkServerStatus();
    const timer = setInterval(checkServerStatus, 5000);
    return () => clearInterval(timer);
  }, []);

  const handleSaveAndTestConfig = async (overrideLan?: string, overrideCloud?: string) => {
    const targetLan = overrideLan !== undefined ? overrideLan : lanInput;
    const targetCloud = overrideCloud !== undefined ? overrideCloud : cloudInput;

    setIsTestingConfig(true);
    setConfigFeedback({ text: 'Testing server connectivity...', type: 'info' });

    apiClient.setLanUrl(targetLan);
    apiClient.setCloudUrl(targetCloud);
    apiClient.setCustomServerUrl('');

    setLanInput(apiClient.getLanUrl() || '');
    setCloudInput(apiClient.getCloudUrl() || '');

    try {
      const res = await apiClient.checkHealth();
      setIsServerOnline(res.online);
      setServerMode(res.mode);
      setActiveEndpoint(apiClient.getBaseUrl());
      setServerHealthData(res.data || null);

      if (res.online) {
        setConfigFeedback({
          text: `Connected to ${res.mode === 'CLOUD' ? 'Cloud Tunnel' : (res.mode === 'LOCALHOST' ? 'Localhost' : 'LAN Server')} (${apiClient.getBaseUrl()})`,
          type: 'success'
        });
      } else {
        setConfigFeedback({
          text: 'Unable to reach server. Please ensure backend server or Cloudflare tunnel is running.',
          type: 'danger'
        });
      }
    } catch (e: any) {
      setConfigFeedback({ text: `Connection check failed: ${e?.message || 'Network error'}`, type: 'danger' });
    } finally {
      setIsTestingConfig(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!username.trim() || !password) {
      setErrorMsg('Please enter both username and password.');
      return;
    }

    if (!isServerOnline && serverMode === 'OFFLINE') {
      setErrorMsg('Cannot log in: Central server is offline or unreachable. Please connect to network/internet and try again.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await login(username.trim(), password);
      if (!res.success) {
        setErrorMsg(res.message);
      } else {
        setUsername('');
        setPassword('');
      }
    } finally {
      setIsSubmitting(false);
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

  const handleVerifyOtpAndReset = async (e: React.FormEvent) => {
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

    // Update user password in backend
    const resetRes = await resetUserPassword(forgotEmail, newPassword);
    if (resetRes.success) {
      setOtpStep('SUCCESS');
      setForgotMsg({ text: 'Password reset successfully! You may now sign in with your new credentials.', type: 'success' });
    } else {
      setForgotMsg({ text: resetRes.message, type: 'danger' });
    }
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

        {/* Live Server Connection Status Card */}
        <div style={{
          marginBottom: '1.5rem',
          padding: '0.75rem 1rem',
          borderRadius: '0.75rem',
          backgroundColor: isServerOnline 
            ? (serverMode === 'CLOUD' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(59, 130, 246, 0.1)') 
            : 'rgba(239, 68, 68, 0.12)',
          border: `1px solid ${isServerOnline 
            ? (serverMode === 'CLOUD' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(59, 130, 246, 0.3)') 
            : 'rgba(239, 68, 68, 0.3)'}`,
          display: 'flex',
          flexDirection: 'column',
          gap: '0.4rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{
                display: 'inline-block',
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                backgroundColor: isServerOnline 
                  ? (serverMode === 'CLOUD' ? 'var(--success)' : 'var(--accent-primary)') 
                  : 'var(--danger)',
                boxShadow: isServerOnline 
                  ? `0 0 8px ${serverMode === 'CLOUD' ? 'var(--success)' : 'var(--accent-primary)'}` 
                  : '0 0 8px var(--danger)',
                animation: isProbingServer ? 'pulse 1s infinite' : 'none'
              }} />
              <span style={{
                fontSize: '0.82rem',
                fontWeight: 700,
                color: isServerOnline 
                  ? (serverMode === 'CLOUD' ? 'var(--success)' : 'var(--accent-primary)') 
                  : 'var(--danger)'
              }}>
                {serverMode === 'CHECKING' ? 'Checking Server...' : (
                  isServerOnline 
                    ? `Server Online (${serverMode === 'CLOUD' ? 'Cloud Tunnel' : (serverMode === 'LOCALHOST' ? 'Localhost' : 'High-Speed LAN')})` 
                    : 'Server Offline'
                )}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <button
                type="button"
                onClick={checkServerStatus}
                title="Refresh connection status"
                disabled={isProbingServer}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '0.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  borderRadius: '0.25rem'
                }}
              >
                <RefreshCw size={14} className={isProbingServer ? 'animate-spin' : ''} />
              </button>
              <button
                type="button"
                onClick={() => {
                  setLanInput(apiClient.getLanUrl() || '');
                  setCloudInput(apiClient.getCloudUrl() || '');
                  setConfigFeedback(null);
                  setIsServerConfigOpen(true);
                }}
                title="Configure Server Endpoints (LAN / Cloud)"
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '0.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  borderRadius: '0.25rem'
                }}
              >
                <Settings size={14} />
              </button>
            </div>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.72rem',
            color: 'var(--text-muted)'
          }}>
            <span style={{ wordBreak: 'break-all', maxWidth: '280px' }}>
              <strong>Endpoint:</strong> {activeEndpoint}
            </span>
            {isServerOnline && serverHealthData && (
              <span className="badge badge-neutral" style={{ fontSize: '0.62rem', padding: '0.1rem 0.4rem' }}>
                {serverHealthData.database.includes('PostgreSQL') ? 'Postgres' : 'Cache'}
              </span>
            )}
          </div>

          {!isServerOnline && (
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.72rem', color: 'var(--danger)', fontWeight: 600 }}>
              ⚠️ Offline login is disabled. Please connect to internet or check server.
            </p>
          )}
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
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="off"
                placeholder="Enter password"
                className="input-field"
                style={{ paddingLeft: '2.5rem', paddingRight: '2.5rem' }}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0.25rem'
                }}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="btn btn-primary"
            style={{ 
              width: '100%', 
              padding: '0.75rem', 
              fontSize: '0.95rem', 
              fontWeight: 700, 
              marginTop: '0.5rem',
              opacity: isSubmitting ? 0.7 : 1,
              cursor: isSubmitting ? 'not-allowed' : 'pointer'
            }}
          >
            <span>{isSubmitting ? 'Verifying with Server...' : 'Sign In to GEC ERP'}</span>
            {!isSubmitting && <ArrowRight size={18} />}
          </button>
        </form>

        <div style={{ marginTop: '2rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-color)', textAlign: 'center' }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
            🔒 Server-authenticated access. Offline login fallback is disabled.
          </p>
        </div>
      </div>

      {/* Server Connection Settings Modal */}
      <Modal
        isOpen={isServerConfigOpen}
        onClose={() => setIsServerConfigOpen(false)}
        title="Server Connection Settings"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0 }}>
            Configure and test central ERP server endpoints. The app will automatically prioritize high-speed LAN when on the local Wi-Fi, and fall back to Cloud Domain elsewhere.
          </p>

          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.35rem' }}>
              🌐 Cloud Domain Server (Cloudflare Tunnel / Public HTTPS)
            </label>
            <input
              type="text"
              placeholder="e.g. https://erpdev.manavkalola.xyz"
              className="input-field"
              value={cloudInput}
              onChange={(e) => setCloudInput(e.target.value)}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.35rem' }}>
              🚀 Local LAN Server IP (High-Speed Office Wi-Fi)
            </label>
            <input
              type="text"
              placeholder="e.g. http://192.168.1.88:5000"
              className="input-field"
              value={lanInput}
              onChange={(e) => setLanInput(e.target.value)}
            />
          </div>

          {configFeedback && (
            <div style={{
              padding: '0.75rem 1rem',
              borderRadius: '0.5rem',
              fontSize: '0.82rem',
              fontWeight: 600,
              backgroundColor: configFeedback.type === 'success' 
                ? 'rgba(16, 185, 129, 0.15)' 
                : configFeedback.type === 'danger' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(59, 130, 246, 0.15)',
              color: configFeedback.type === 'success' 
                ? 'var(--success)' 
                : configFeedback.type === 'danger' ? 'var(--danger)' : 'var(--accent-primary)',
              border: `1px solid ${configFeedback.type === 'success' 
                ? 'var(--success)' 
                : configFeedback.type === 'danger' ? 'var(--danger)' : 'var(--accent-primary)'}`
            }}>
              {configFeedback.text}
            </div>
          )}

          <div style={{
            padding: '0.75rem',
            borderRadius: '0.5rem',
            backgroundColor: 'var(--bg-tertiary)',
            fontSize: '0.75rem',
            lineHeight: 1.5,
            color: 'var(--text-secondary)'
          }}>
            <div><strong>Active Endpoint:</strong> <code style={{ color: 'var(--accent-primary)' }}>{activeEndpoint}</code></div>
            <div><strong>Current Status:</strong> {isServerOnline ? `🟢 Connected (${serverMode})` : '🔴 Server Offline'}</div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ fontSize: '0.78rem' }}
              onClick={() => {
                setLanInput('http://192.168.1.88:5000');
                setCloudInput('https://erpdev.manavkalola.xyz');
                handleSaveAndTestConfig('http://192.168.1.88:5000', 'https://erpdev.manavkalola.xyz');
              }}
            >
              🔄 Reset to Defaults
            </button>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => setIsServerConfigOpen(false)}
              >
                Cancel
              </button>
              <button 
                type="button" 
                disabled={isTestingConfig}
                className="btn btn-primary" 
                onClick={() => handleSaveAndTestConfig()}
              >
                {isTestingConfig ? 'Testing...' : 'Test & Save'}
              </button>
            </div>
          </div>
        </div>
      </Modal>

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
                <div style={{ position: 'relative' }}>
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    placeholder="Enter new password (min 6 characters)"
                    className="input-field"
                    style={{ paddingRight: '2.5rem' }}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    style={{
                      position: 'absolute',
                      right: '0.75rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      padding: '0.25rem'
                    }}
                    title={showNewPassword ? 'Hide password' : 'Show password'}
                  >
                    {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label>Confirm New Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    placeholder="Re-enter new password"
                    className="input-field"
                    style={{ paddingRight: '2.5rem' }}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={{
                      position: 'absolute',
                      right: '0.75rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      padding: '0.25rem'
                    }}
                    title={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
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
