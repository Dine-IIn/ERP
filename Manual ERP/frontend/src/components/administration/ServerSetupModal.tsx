import React, { useState } from 'react';
import { Server, ShieldCheck, Power, Trash2, Folder, Download, AlertTriangle, CheckCircle, RefreshCw, X } from 'lucide-react';
import { getEffectiveDirectoryPath, getClientPlatform } from '../../utils/localSheetsService';

interface ServerSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ServerSetupModal({ isOpen, onClose }: ServerSetupModalProps) {
  const [directoryPath, setDirectoryPath] = useState(getEffectiveDirectoryPath());
  const [platform] = useState(getClientPlatform());
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSaveDirectory = () => {
    localStorage.setItem('erp_local_sheets_directory', directoryPath.trim());
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in text-left">
      <div className="w-full max-w-2xl bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[var(--border-color)]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/10 rounded-xl text-indigo-400 border border-indigo-500/20">
              <Server className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[var(--text-primary)] font-display">
                ERP Local Server & Client Setup Center
              </h2>
              <p className="text-[var(--text-secondary)] text-xs">
                Configure auto-start services on power cuts, uninstall setup, and manage local sheet directories.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors rounded-lg bg-transparent border-0 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Section 1: Auto-Start on Power Cut / Reboot */}
          <div className="bg-[var(--bg-primary)] p-5 rounded-xl border border-[var(--border-color)] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wide flex items-center gap-2">
                <Power className="w-4 h-4 text-emerald-400" />
                1. Auto-Start Service (Post Power Cuts & Restarts)
              </span>
              <span className="text-[10px] font-bold bg-emerald-500/10 text-emerald-400 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                Auto-Boot Ready
              </span>
            </div>
            <p className="text-[var(--text-secondary)] text-xs leading-relaxed">
              When the server host PC reboots after a power cut, Windows will automatically start the ERP backend in the background silently.
            </p>
            <div className="bg-[var(--bg-card)] p-3 rounded-lg border border-[var(--border-color)]/60 text-[11px] text-[var(--text-secondary)] font-mono space-y-1">
              <div>• Service Script: <code className="text-indigo-300">backend\scripts\install-server-service.bat</code></div>
              <div>• Silent Runner: <code className="text-indigo-300">backend\scripts\server-runner.vbs</code></div>
            </div>
          </div>

          {/* Section 2: Local Sheets Folder Strategy */}
          <div className="bg-[var(--bg-primary)] p-5 rounded-xl border border-[var(--border-color)] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wide flex items-center gap-2">
                <Folder className="w-4 h-4 text-indigo-400" />
                2. Local Sheets Storage Directory ({platform} Client)
              </span>
              <span className="text-[10px] font-bold bg-indigo-500/10 text-indigo-400 px-2.5 py-0.5 rounded-full border border-indigo-500/20">
                {platform} Platform
              </span>
            </div>
            <p className="text-[var(--text-secondary)] text-xs">
              All financial, sales, inventory, and balance sheets auto-sync to this dedicated local folder path on your PC.
            </p>

            <div className="flex gap-2 items-center">
              <input
                type="text"
                value={directoryPath}
                onChange={e => setDirectoryPath(e.target.value)}
                disabled={platform === 'ANDROID'}
                placeholder="e.g. C:\ERP_Sheets"
                className="flex-1 bg-[var(--bg-card)] border border-[var(--border-color)] py-2 px-3 rounded-xl text-xs text-[var(--text-primary)] font-mono focus:outline-none focus:border-indigo-500"
              />
              {platform !== 'ANDROID' && (
                <button
                  onClick={handleSaveDirectory}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl border-0 cursor-pointer transition-all shadow-md"
                >
                  Save Path
                </button>
              )}
            </div>
            {savedSuccess && (
              <div className="text-[11px] text-emerald-400 font-bold flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5" /> Path saved successfully!
              </div>
            )}
          </div>

          {/* Section 3: Server Uninstaller Option */}
          <div className="bg-rose-500/5 p-5 rounded-xl border border-rose-500/20 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-rose-400 uppercase tracking-wide flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-rose-400" />
                3. Uninstall Server Setup
              </span>
            </div>
            <p className="text-[var(--text-secondary)] text-xs leading-relaxed">
              Need to remove the local server setup from this PC? Use the uninstaller script to unregister auto-start tasks and cleanly stop background processes.
            </p>
            <div className="bg-[var(--bg-card)] p-3 rounded-lg border border-rose-500/20 text-[11px] text-[var(--text-secondary)] font-mono">
              Uninstaller Command: <code className="text-rose-300">backend\scripts\uninstall-server-service.bat</code>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-[var(--bg-primary)] border-t border-[var(--border-color)] flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl border-0 cursor-pointer transition-all"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
