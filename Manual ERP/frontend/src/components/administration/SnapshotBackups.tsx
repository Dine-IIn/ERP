import React from 'react';
import { Database, Download, Trash2, RefreshCw, Lock, X, AlertTriangle, CheckCircle, AlertCircle } from 'lucide-react';

interface SnapshotBackupsProps {
  backupList: any[];
  backupRetentionDays: number;
  handleTriggerBackup: () => Promise<void>;
  handleUpdateBackupRetention: (days: number) => Promise<void>;
  BACKEND_URL: string;
  fetchBackups: () => Promise<void>;
}

export default function SnapshotBackups({
  backupList,
  backupRetentionDays,
  handleTriggerBackup,
  handleUpdateBackupRetention,
  BACKEND_URL,
  fetchBackups,
}: SnapshotBackupsProps) {
  const [showOtpModal, setShowOtpModal] = React.useState(false);
  const [otpCode, setOtpCode] = React.useState('');
  const [otpTargetAction, setOtpTargetAction] = React.useState<'download' | 'delete' | 'restore' | null>(null);
  const [targetFilename, setTargetFilename] = React.useState('');

  const [otpLoading, setOtpLoading] = React.useState(false);
  const [otpSuccessMsg, setOtpSuccessMsg] = React.useState<string | null>(null);
  const [otpErrorMsg, setOtpErrorMsg] = React.useState<string | null>(null);

  const handleRequestOtp = async () => {
    setOtpLoading(true);
    setOtpErrorMsg(null);
    setOtpSuccessMsg(null);
    try {
      const token = localStorage.getItem('erp_token');
      const response = await fetch(`${BACKEND_URL}/api/admin/backups/request-otp`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to request OTP');
      }
      setOtpSuccessMsg(data.message || '2FA OTP Code sent to backend developer console!');
    } catch (err: any) {
      setOtpErrorMsg(err.message || 'Failed to trigger OTP.');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleExecuteSecureAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode || otpCode.length !== 6) {
      setOtpErrorMsg('Please enter a valid 6-digit OTP.');
      return;
    }
    setOtpLoading(true);
    setOtpErrorMsg(null);
    setOtpSuccessMsg(null);

    try {
      const token = localStorage.getItem('erp_token');

      if (otpTargetAction === 'delete') {
        const response = await fetch(`${BACKEND_URL}/api/admin/backups/${targetFilename}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'x-otp-code': otpCode
          }
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Failed to delete snapshot');
        }
        setOtpSuccessMsg(data.message || 'Snapshot successfully deleted.');
        setTimeout(() => {
          setShowOtpModal(false);
          fetchBackups();
        }, 1500);
      }

      else if (otpTargetAction === 'restore') {
        const response = await fetch(`${BACKEND_URL}/api/admin/backups/reset`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ filename: targetFilename, otpCode })
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Rollback failed');
        }
        setOtpSuccessMsg('Restore complete! Relational tables rebuilt. Reloading layout...');
        setTimeout(() => {
          setShowOtpModal(false);
          window.location.reload();
        }, 2000);
      }

      else if (otpTargetAction === 'download') {
        const downloadUrl = `${BACKEND_URL}/api/admin/backups/download/${targetFilename}?otpCode=${otpCode}`;
        const response = await fetch(downloadUrl, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to download snapshot');
        }
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = targetFilename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setOtpSuccessMsg('Snapshot successfully downloaded!');
        setTimeout(() => {
          setShowOtpModal(false);
        }, 1500);
      }
    } catch (err: any) {
      setOtpErrorMsg(err.message || 'Action execution failed.');
    } finally {
      setOtpLoading(false);
    }
  };

  const triggerSecureAction = (action: 'download' | 'delete' | 'restore', filename: string) => {
    setOtpTargetAction(action);
    setTargetFilename(filename);
    setOtpCode('');
    setOtpErrorMsg(null);
    setOtpSuccessMsg(null);
    setShowOtpModal(true);
  };

  return (
    <div className="animate-fade-in flex flex-col gap-4 text-left">
      <h3 className="font-bold text-sm text-[var(--text-primary)] border-b border-[var(--border-color)] pb-2 font-display flex items-center gap-1.5 uppercase tracking-wide">
        <Database className="w-4 h-4 text-indigo-400" /> Database Backup & Snapshots Recovery
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
        {/* Backup triggering card */}
        <div className="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl p-5 flex flex-col gap-4 select-none text-left">
          <span className="text-[10px] font-bold text-indigo-400 tracking-wider uppercase block text-left">Simulate Snapshot Provisioning</span>
          <p className="text-[var(--text-secondary)] text-[11px] leading-relaxed text-left">
            Back up all core database entities including employee user accounts, customized roles configurations, divisions, and audit trail files in a secure, encrypted JSON format.
          </p>
          
          <button
            type="button"
            onClick={handleTriggerBackup}
            className="w-full mt-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 rounded-lg transition-colors cursor-pointer text-xs shadow-md shadow-indigo-600/10 flex items-center justify-center gap-1.5 border-0"
          >
            <Database className="w-4 h-4 animate-bounce" /> Take Database Snapshot Now
          </button>
        </div>

        {/* Retention sliders card */}
        <div className="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl p-5 flex flex-col gap-4 select-none text-left">
          <span className="text-[10px] font-bold text-indigo-400 tracking-wider uppercase block text-left">Automatic Snapshot Retention Policy</span>
          <p className="text-[var(--text-secondary)] text-[11px] leading-relaxed text-left">
            Configure the lifecycle duration of system data snapshots. Expired files are automatically scrubbed from uploads registers.
          </p>
          
          <div className="mt-2 flex flex-col gap-2 text-left">
            <div className="flex justify-between items-center text-xs font-semibold text-[var(--text-primary)]">
              <span>Snapshots Lifespan</span>
              <span className="text-indigo-400 font-bold">{backupRetentionDays} Days</span>
            </div>
            <input
              type="range"
              min="30"
              max="180"
              step="30"
              value={backupRetentionDays}
              onChange={e => handleUpdateBackupRetention(parseInt(e.target.value))}
              className="w-full accent-indigo-600 cursor-pointer"
            />
            <div className="flex justify-between text-[8px] text-[var(--text-muted)] font-extrabold uppercase mt-1">
              <span>30 Days</span>
              <span>90 Days</span>
              <span>180 Days</span>
            </div>
          </div>
        </div>
      </div>

      {/* List generated snapshots */}
      <div className="mt-3 text-left">
        <span className="text-[10px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block mb-3.5 text-left">Generated Backups Snapshots ({backupList.length})</span>
        
        <div className="overflow-x-auto border border-[var(--border-color)] rounded-xl mt-2 select-none">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[var(--bg-tertiary)] border-b border-[var(--border-color)] text-[var(--text-secondary)] font-bold">
                <th className="p-3 text-[10px] uppercase tracking-wider">Snapshot Filename</th>
                <th className="p-3 text-[10px] uppercase tracking-wider">Size (KB)</th>
                <th className="p-3 text-[10px] uppercase tracking-wider">Created Timestamp</th>
                <th className="p-3 text-[10px] uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {backupList.map(bk => {
                const date = new Date(bk.createdAt).toLocaleString();
                const sizeKb = (bk.sizeBytes / 1024).toFixed(2);

                return (
                  <tr key={bk.filename} className="border-b border-[var(--border-color)]/40 hover:bg-[var(--bg-tertiary)]/20 transition-colors last:border-b-0 text-left">
                    <td className="p-3 font-semibold text-[var(--text-primary)] shrink-0">{bk.filename}</td>
                    <td className="p-3 font-mono text-[var(--text-secondary)] shrink-0">{sizeKb} KB</td>
                    <td className="p-3 font-mono text-[var(--text-muted)] shrink-0">{date}</td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => triggerSecureAction('download', bk.filename)}
                          className="px-2 py-1 bg-indigo-600/10 hover:bg-indigo-600 text-indigo-400 hover:text-white rounded transition-all cursor-pointer border-0 bg-transparent flex items-center gap-1 text-[9px] uppercase font-bold"
                          title="Secure Download"
                        >
                          <Download className="w-3 h-3" /> Download
                        </button>
                        <button
                          type="button"
                          onClick={() => triggerSecureAction('restore', bk.filename)}
                          className="px-2 py-1 bg-amber-600/10 hover:bg-amber-600 text-amber-400 hover:text-white rounded transition-all cursor-pointer border-0 bg-transparent flex items-center gap-1 text-[9px] uppercase font-bold"
                          title="Rollback Database to Snapshot"
                        >
                          <RefreshCw className="w-3 h-3" /> Restore
                        </button>
                        <button
                          type="button"
                          onClick={() => triggerSecureAction('delete', bk.filename)}
                          className="px-2 py-1 bg-rose-600/10 hover:bg-rose-600 text-rose-400 hover:text-white rounded transition-all cursor-pointer border-0 bg-transparent flex items-center gap-1 text-[9px] uppercase font-bold"
                          title="Permanently Delete Snapshot"
                        >
                          <Trash2 className="w-3 h-3" /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {backupList.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center py-8 text-[var(--text-muted)] italic">No backup files snapshots generated yet</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ==========================================
          MODAL: 2FA OTP SECURITY VERIFICATION LAYER
          ========================================== */}
      {showOtpModal && (
        <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in">
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl w-full max-w-md p-6 relative shadow-2xl text-left select-none animate-scale-up">
            <button
              onClick={() => setShowOtpModal(false)}
              className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer bg-transparent border-0"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 pb-3 border-b border-[var(--border-color)]">
              <div className="p-2.5 bg-rose-500/10 rounded-xl text-rose-400 border border-rose-500/20">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base text-[var(--text-primary)] font-display uppercase tracking-wider">
                  2FA Secure Authorization
                </h3>
                <p className="text-[var(--text-secondary)] text-[10px]">Verify identity before executing database operations</p>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-4">
              {/* Warnings/Context */}
              <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-xl text-xs flex gap-2">
                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold uppercase block mb-0.5">High-Risk Operation</span>
                  {otpTargetAction === 'delete' && "You are permanently deleting a DB backup snapshot from system registers. This cannot be undone."}
                  {otpTargetAction === 'restore' && "CRITICAL: You are rolling back Dine-IIn to a past snapshot state. All active users, custom roles, corporate divisions, and logs will be relationally rewritten!"}
                  {otpTargetAction === 'download' && "You are compiling corporate database structures into an exportable JSON format. Verify recipient security."}
                </div>
              </div>

              {otpSuccessMsg && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg text-xs flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  <span>{otpSuccessMsg}</span>
                </div>
              )}

              {otpErrorMsg && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{otpErrorMsg}</span>
                </div>
              )}

              {/* Action Triggers */}
              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  onClick={handleRequestOtp}
                  disabled={otpLoading}
                  className="w-full py-2 bg-indigo-600/15 hover:bg-indigo-600/30 text-indigo-400 font-bold border border-indigo-500/30 rounded-lg text-xs cursor-pointer transition-colors"
                >
                  {otpLoading ? 'Processing Request...' : 'Send OTP Verification Code'}
                </button>

                <form onSubmit={handleExecuteSecureAction} className="flex flex-col gap-3">
                  <div>
                    <label className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block mb-1">
                      Enter 6-Digit OTP
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      required
                      value={otpCode}
                      onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="e.g. 123456"
                      className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-rose-500/50 py-2 px-3 rounded-lg text-center tracking-[0.5em] font-mono text-sm text-[var(--text-primary)] focus:outline-none"
                    />
                  </div>

                  <div className="flex gap-3 mt-2">
                    <button
                      type="button"
                      onClick={() => setShowOtpModal(false)}
                      className="w-1/2 bg-[var(--bg-tertiary)] border border-[var(--border-color)] hover:text-[var(--text-primary)] font-bold py-2 rounded-lg text-xs cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={otpLoading || otpCode.length !== 6}
                      className="w-1/2 bg-rose-600 hover:bg-rose-500 text-white font-bold py-2 rounded-lg text-xs cursor-pointer transition-colors"
                    >
                      {otpLoading ? 'Verifying...' : 'Authorize Action'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
