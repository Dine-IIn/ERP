import React from 'react';
import { Building, User, Lock, Phone, Mail, AlertCircle, CheckCircle, Clock, Key } from 'lucide-react';

interface SignupProps {
  signupForm: {
    companyCode: string;
    username: string;
    password: string;
    mobileNo: string;
    email: string;
    otpCode: string;
  };
  setSignupForm: React.Dispatch<React.SetStateAction<{
    companyCode: string;
    username: string;
    password: string;
    mobileNo: string;
    email: string;
    otpCode: string;
  }>>;
  signupStep: 1 | 2 | 3;
  setSignupStep: React.Dispatch<React.SetStateAction<1 | 2 | 3>>;
  signupVerificationMethod: 'SMS' | 'EMAIL';
  setSignupVerificationMethod: React.Dispatch<React.SetStateAction<'SMS' | 'EMAIL'>>;
  triggerOtpRequest: () => void;
  handleSignupSubmit: (e: React.FormEvent) => void;
  loading: boolean;
  errorMsg: string | null;
  successMsg: string | null;
  onBackToLoginClick: () => void;
}

export default function Signup({
  signupForm,
  setSignupForm,
  signupStep,
  setSignupStep,
  signupVerificationMethod,
  setSignupVerificationMethod,
  triggerOtpRequest,
  handleSignupSubmit,
  loading,
  errorMsg,
  successMsg,
  onBackToLoginClick,
}: SignupProps) {
  return (
    <div className="w-full max-w-md bg-[var(--bg-card)] border border-[var(--border-color)] p-8 rounded-2xl shadow-xl animate-fade-in">
      
      {/* Step indicator */}
      <div className="flex items-center justify-center gap-3 text-[10px] font-bold text-[var(--text-secondary)] mb-6 select-none">
        <span className={`px-2 py-0.5 rounded-full ${signupStep >= 1 ? 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/20' : 'bg-[var(--bg-tertiary)]'}`}>1. Info</span>
        <div className="w-6 h-px bg-[var(--border-color)]" />
        <span className={`px-2 py-0.5 rounded-full ${signupStep >= 2 ? 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/20' : 'bg-[var(--bg-tertiary)]'}`}>2. OTP</span>
        <div className="w-6 h-px bg-[var(--border-color)]" />
        <span className={`px-2 py-0.5 rounded-full ${signupStep === 3 ? 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/20' : 'bg-[var(--bg-tertiary)]'}`}>3. Wait</span>
      </div>

      {(errorMsg || successMsg) && (
        <div className="mb-4">
          {errorMsg && (
            <div className="bg-red-500/10 border border-red-500/20 p-2.5 rounded-lg flex items-center gap-2 text-red-500 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
          {successMsg && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-lg flex items-center gap-2 text-emerald-500 text-xs">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}
        </div>
      )}

      {signupStep === 1 && (
        <div>
          <div className="text-center">
            <h2 className="text-xl font-bold text-[var(--text-primary)] font-display">Create Employee Account</h2>
            <p className="text-[var(--text-secondary)] text-xs mt-1">Submit registration details under your tenant code.</p>
          </div>

          <div className="mt-5 flex flex-col gap-4">
            <div>
              <label className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block">Target Company Code</label>
              <div className="mt-1 relative">
                <Building className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  type="text"
                  placeholder="e.g. APPLE, DINEIN"
                  value={signupForm.companyCode}
                  onChange={e => setSignupForm({ ...signupForm, companyCode: e.target.value.toUpperCase() })}
                  className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] focus:border-indigo-500/50 py-2.5 pl-10 pr-4 rounded-lg text-xs focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block">Desired Username</label>
              <div className="mt-1 relative">
                <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  type="text"
                  placeholder="Choose username"
                  value={signupForm.username}
                  onChange={e => setSignupForm({ ...signupForm, username: e.target.value })}
                  className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] focus:border-indigo-500/50 py-2.5 pl-10 pr-4 rounded-lg text-xs focus:outline-none"
                />
              </div>
            </div>

            <div className="mt-3 mb-1">
              <label className="text-[8px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block mb-1">Choose Verification Channel</label>
              <div className="flex gap-2 p-1 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg">
                <button
                  type="button"
                  onClick={() => setSignupVerificationMethod('SMS')}
                  className={`flex-1 py-1.5 rounded-md text-[9px] font-bold tracking-wider uppercase transition-all cursor-pointer ${
                    signupVerificationMethod === 'SMS'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] bg-transparent border-0'
                  }`}
                >
                  Verify via SMS
                </button>
                <button
                  type="button"
                  onClick={() => setSignupVerificationMethod('EMAIL')}
                  className={`flex-1 py-1.5 rounded-md text-[9px] font-bold tracking-wider uppercase transition-all cursor-pointer ${
                    signupVerificationMethod === 'EMAIL'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] bg-transparent border-0'
                  }`}
                >
                  Verify via Email
                </button>
              </div>
            </div>

            <div>
              <label className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block">
                Mobile No {signupVerificationMethod === 'SMS' ? <span className="text-indigo-400 font-extrabold">(Compulsory OTP)</span> : <span className="text-slate-500 font-semibold">(Optional)</span>}
              </label>
              <div className="mt-1 relative">
                <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  type="text"
                  placeholder="e.g. +919876543210"
                  value={signupForm.mobileNo}
                  onChange={e => setSignupForm({ ...signupForm, mobileNo: e.target.value })}
                  className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] focus:border-indigo-500/50 py-2.5 pl-10 pr-4 rounded-lg text-xs focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block">
                Email Address {signupVerificationMethod === 'EMAIL' ? <span className="text-indigo-400 font-extrabold">(Compulsory OTP)</span> : <span className="text-slate-500 font-semibold">(Optional)</span>}
              </label>
              <div className="mt-1 relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  type="email"
                  placeholder="Enter email address"
                  value={signupForm.email}
                  onChange={e => setSignupForm({ ...signupForm, email: e.target.value })}
                  className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] focus:border-indigo-500/50 py-2.5 pl-10 pr-4 rounded-lg text-xs focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block">Password</label>
              <div className="mt-1 relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  type="password"
                  placeholder="Minimum 6 characters"
                  value={signupForm.password}
                  onChange={e => setSignupForm({ ...signupForm, password: e.target.value })}
                  className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] focus:border-indigo-500/50 py-2.5 pl-10 pr-4 rounded-lg text-xs focus:outline-none"
                />
              </div>
            </div>

            <button
              onClick={triggerOtpRequest}
              disabled={loading}
              className="w-full mt-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 rounded-lg transition-colors cursor-pointer text-xs"
            >
              {loading ? 'Processing...' : 'Send Verification OTP'}
            </button>
            
            <button 
              type="button" 
              onClick={onBackToLoginClick} 
              className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-bold py-2 rounded-lg transition-colors text-xs cursor-pointer"
            >
              Back to Login
            </button>
          </div>
        </div>
      )}

      {signupStep === 2 && (
        <form onSubmit={handleSignupSubmit} className="text-center">
          <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 rounded-xl w-fit mx-auto mb-4">
            <Key className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-[var(--text-primary)] font-display">Verify Identity</h2>
          <p className="text-[var(--text-secondary)] text-xs mt-1.5 leading-normal">
            Enter the 6-digit {signupVerificationMethod === 'SMS' ? 'SMS' : 'Email'} verification code sent to <span className="font-semibold text-[var(--text-primary)]">{signupVerificationMethod === 'SMS' ? signupForm.mobileNo : signupForm.email}</span>.
          </p>
          
          <div className="mt-3 text-[10px] bg-indigo-500/5 border border-indigo-500/20 p-2.5 rounded-lg text-indigo-400 text-left leading-normal flex items-start gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>Please check your inbox or mobile device. For sandbox environments, the code can also be fetched from the backend server log.</span>
          </div>

          <div className="mt-5 text-left">
            <label className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block">Verification Code</label>
            <input
              type="text"
              required
              maxLength={6}
              placeholder="Enter code"
              value={signupForm.otpCode}
              onChange={e => setSignupForm({ ...signupForm, otpCode: e.target.value })}
              className="w-full mt-1 text-center text-lg tracking-[8px] font-mono bg-[var(--bg-tertiary)] border border-[var(--border-color)] focus:border-indigo-500/50 py-2.5 rounded-lg text-[var(--text-primary)] placeholder-slate-600 focus:outline-none"
            />
          </div>

          <div className="mt-6 flex flex-col gap-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 rounded-lg transition-colors cursor-pointer text-xs"
            >
              {loading ? 'Submitting...' : 'Verify OTP & Finish Registration'}
            </button>
            <button 
              type="button" 
              onClick={() => setSignupStep(1)} 
              className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-bold py-2.5 rounded-lg transition-colors text-xs cursor-pointer"
            >
              Back to Info
            </button>
          </div>
        </form>
      )}

      {signupStep === 3 && (
        <div className="text-center py-4">
          <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 rounded-full w-fit mx-auto mb-4 animate-pulse">
            <Clock className="w-10 h-10" />
          </div>
          <h2 className="text-xl font-bold text-[var(--text-primary)] font-display">Holding for Admin Approval</h2>
          <p className="text-[var(--text-secondary)] text-xs mt-3 leading-normal">
            Your verification was <span className="text-emerald-500 font-semibold">approved</span>. Your account is on hold pending Administrator security vetting.
          </p>
          
          <button
            onClick={onBackToLoginClick}
            className="w-full mt-6 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 rounded-lg transition-colors cursor-pointer text-xs"
          >
            Return to Sign In
          </button>
        </div>
      )}
    </div>
  );
}
