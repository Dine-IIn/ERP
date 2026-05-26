import React from 'react';
import { Database } from 'lucide-react';

interface SnapshotBackupsProps {
  backupList: any[];
  backupRetentionDays: number;
  handleTriggerBackup: () => Promise<void>;
  handleUpdateBackupRetention: (days: number) => Promise<void>;
  BACKEND_URL: string;
}

export default function SnapshotBackups({
  backupList,
  backupRetentionDays,
  handleTriggerBackup,
  handleUpdateBackupRetention,
  BACKEND_URL,
}: SnapshotBackupsProps) {
  return (
    <div className="animate-fade-in flex flex-col gap-4 text-left">
      <h3 className="font-bold text-sm text-[var(--text-primary)] border-b border-[var(--border-color)] pb-2 font-display flex items-center gap-1.5 uppercase tracking-wide">
        <Database className="w-4 h-4 text-indigo-400" /> Database Backup & snapshots Recovery
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
        {/* Backup triggering card */}
        <div className="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl p-5 flex flex-col gap-4 select-none text-left">
          <span className="text-[10px] font-bold text-indigo-400 tracking-wider uppercase block text-left">Simulate Snapshot Provisioning</span>
          <p className="text-[var(--text-secondary)] text-[11px] leading-relaxed text-left">
            Back up all core database entities including employee users accounts, customized roles configurations, divisions, and audit trail files in a secure, encrypted JSON format.
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
          <span className="text-[10px] font-bold text-indigo-400 tracking-wider uppercase block text-left">Automatic Snapshot Retention policy</span>
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
        <span className="text-[10px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block mb-3.5 text-left">Generated Backups snapshots ({backupList.length})</span>
        
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
                const downloadUrl = `${BACKEND_URL}/api/admin/backups/download/${bk.filename}`;

                return (
                  <tr key={bk.filename} className="border-b border-[var(--border-color)]/40 hover:bg-[var(--bg-tertiary)]/20 transition-colors last:border-b-0 text-left">
                    <td className="p-3 font-semibold text-[var(--text-primary)] shrink-0">{bk.filename}</td>
                    <td className="p-3 font-mono text-[var(--text-secondary)] shrink-0">{sizeKb} KB</td>
                    <td className="p-3 font-mono text-[var(--text-muted)] shrink-0">{date}</td>
                    <td className="p-3 text-right">
                      <a
                        href={downloadUrl}
                        download
                        className="px-2.5 py-1 bg-indigo-600/10 hover:bg-indigo-600 text-indigo-400 hover:text-white font-extrabold text-[8px] uppercase rounded transition-all cursor-pointer inline-block border-0 bg-transparent"
                        onClick={(e) => {
                          const tok = localStorage.getItem('erp_token');
                          if (tok) {
                            e.preventDefault();
                            fetch(downloadUrl, {
                              headers: { 'Authorization': `Bearer ${tok}` }
                            })
                            .then(res => res.blob())
                            .then(blob => {
                              const url = window.URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = bk.filename;
                              document.body.appendChild(a);
                              a.click();
                              a.remove();
                            })
                            .catch(err => console.error("Backup download error:", err));
                          }
                        }}
                      >
                        Download Snapshot
                      </a>
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
    </div>
  );
}
