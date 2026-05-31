import React, { useState } from 'react';
import { Activity } from 'lucide-react';

interface AuditLogsProps {
  auditTrailLogs: any[];
  auditTotal: number;
  auditFilterModule: string;
  setAuditFilterModule: (module: string) => void;
  auditSearchActor: string;
  setAuditSearchActor: (actor: string) => void;
}

export default function AuditLogs({
  auditTrailLogs,
  auditTotal,
  auditFilterModule,
  setAuditFilterModule,
  auditSearchActor,
  setAuditSearchActor,
}: AuditLogsProps) {
  const [visibleCount, setVisibleCount] = useState(50);
  return (
    <div className="animate-fade-in flex flex-col gap-4">
      <h3 className="font-bold text-sm text-[var(--text-primary)] border-b border-[var(--border-color)] pb-2 font-display flex items-center gap-1.5 uppercase tracking-wide">
        <Activity className="w-4 h-4 text-indigo-400" /> Corporate Transaction Audit Trail
      </h3>

      {/* Filtering inputs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-[var(--bg-primary)] p-3 rounded-xl border border-[var(--border-color)]">
        <div className="text-left">
          <label className="text-[8px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block mb-1">Actor Username</label>
          <input
            type="text"
            placeholder="Search username..."
            value={auditSearchActor}
            onChange={e => setAuditSearchActor(e.target.value)}
            className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] py-1.5 px-3 rounded-lg text-xs"
          />
        </div>
        <div className="text-left">
          <label className="text-[8px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block mb-1">Target Category / Module</label>
          <select
            value={auditFilterModule}
            onChange={e => setAuditFilterModule(e.target.value)}
            className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] py-1.5 px-3 rounded-lg text-xs text-[var(--text-primary)] cursor-pointer"
          >
            <option value="">All Categories</option>
            <option value="user">User Directory</option>
            <option value="role">Roles Permissions</option>
            <option value="department">Departments</option>
            <option value="backup">Snapshots Backups</option>
            <option value="company">Company Profile</option>
          </select>
        </div>
        <div className="flex items-end">
          <button
            type="button"
            onClick={() => {
              setAuditSearchActor('');
              setAuditFilterModule('');
            }}
            className="w-full py-1.5 bg-[var(--bg-tertiary)] border border-[var(--border-color)] hover:text-[var(--text-primary)] font-bold text-xs rounded-lg cursor-pointer transition-colors border-0 bg-transparent"
          >
            Reset Filters
          </button>
        </div>
      </div>

      {/* Audit logs history table */}
      <div className="overflow-x-auto border border-[var(--border-color)] rounded-xl mt-2 select-none">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-[var(--bg-tertiary)] border-b border-[var(--border-color)] text-[var(--text-secondary)] font-bold">
              <th className="p-3 text-[10px] uppercase tracking-wider">Timestamp</th>
              <th className="p-3 text-[10px] uppercase tracking-wider">Actor</th>
              <th className="p-3 text-[10px] uppercase tracking-wider">Module</th>
              <th className="p-3 text-[10px] uppercase tracking-wider">Action</th>
              <th className="p-3 text-[10px] uppercase tracking-wider">Historical Diff Details</th>
            </tr>
          </thead>
          <tbody>
            {auditTrailLogs.slice(0, visibleCount).map(log => {
              const date = new Date(log.timestamp).toLocaleString();
              const isCreate = log.actionType === 'CREATE';
              const isDelete = log.actionType === 'DELETE';
              const isUpdate = log.actionType.startsWith('UPDATE');

              return (
                <tr key={log.id} className="border-b border-[var(--border-color)]/40 hover:bg-[var(--bg-tertiary)]/20 transition-colors last:border-b-0 text-left">
                  <td className="p-3 font-mono text-[10px] text-[var(--text-muted)] shrink-0">{date}</td>
                  <td className="p-3 font-semibold text-[var(--text-primary)] shrink-0">{log.username || 'System Agent'}</td>
                  <td className="p-3 shrink-0">
                    <span className="bg-indigo-500/10 text-indigo-400 font-extrabold text-[8px] uppercase tracking-wider py-0.5 px-1.5 rounded border border-indigo-500/20">
                      {log.moduleName}
                    </span>
                  </td>
                  <td className="p-3 shrink-0">
                    <span className={`font-extrabold text-[8px] uppercase tracking-wider py-0.5 px-1.5 rounded ${
                      isCreate ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/20' :
                      isDelete ? 'bg-rose-500/15 text-rose-500 border border-rose-500/20' :
                      'bg-amber-500/15 text-amber-500 border border-amber-500/20'
                    }`}>
                      {log.actionType}
                    </span>
                  </td>
                  <td className="p-3 font-mono text-[9px] max-w-sm overflow-hidden text-ellipsis truncate leading-relaxed">
                    {isUpdate ? (
                      <div>
                        <span className="text-rose-400">- {log.oldValue || 'None'}</span><br/>
                        <span className="text-emerald-400">+ {log.newValue || 'None'}</span>
                      </div>
                    ) : (
                      <span className="text-[var(--text-secondary)]">{log.newValue || log.oldValue || 'N/A'}</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {auditTrailLogs.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center py-8 text-[var(--text-muted)] italic">No historical action trails recorded for this filter scope</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {auditTrailLogs.length > visibleCount && (
        <div className="flex justify-center mt-3 select-none">
          <button
            type="button"
            onClick={() => setVisibleCount(prev => prev + 50)}
            className="px-4 py-2 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 rounded-xl text-xs font-bold transition-all hover:scale-105 active:scale-95 cursor-pointer"
          >
            Show More Action Records (+50)
          </button>
        </div>
      )}
    </div>
  );
}
