import React from 'react';
import { UserActivityLog } from '../../types/erp';
import { GECPrintHeader, GECPrintSignatory } from './WOPrintTemplates';

export const AuditLogListPrintView: React.FC<{
  logs: UserActivityLog[];
  filterLabel?: string;
}> = ({ logs, filterLabel = 'System Security & Activity Audit Trail' }) => (
  <div className="print-document a4-landscape">
    <GECPrintHeader docTitle="SECURITY AUDIT TRAIL & SYSTEM ACTIVITY REGISTER" />

    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontSize: '0.82rem', color: '#4b5563' }}>
      <span><strong>Audit Scope:</strong> {filterLabel}</span>
      <span><strong>Total Events Logged:</strong> {logs.length}</span>
    </div>

    <table className="print-table">
      <thead>
        <tr>
          <th style={{ width: '35px' }}>#</th>
          <th style={{ width: '130px' }}>Timestamp</th>
          <th style={{ width: '110px' }}>User</th>
          <th style={{ width: '90px' }}>Role</th>
          <th style={{ width: '90px' }}>Action</th>
          <th style={{ width: '120px' }}>Module</th>
          <th>Activity Details / Payload</th>
          <th style={{ width: '100px' }}>IP Address</th>
        </tr>
      </thead>
      <tbody>
        {logs.map((l, i) => (
          <tr key={l.id || i}>
            <td>{i + 1}</td>
            <td style={{ whiteSpace: 'nowrap', fontSize: '0.75rem' }}>{new Date(l.timestamp).toLocaleString()}</td>
            <td><strong>{l.username || (l as any).userId}</strong></td>
            <td>{(l as any).role || 'User'}</td>
            <td>
              <span style={{ fontWeight: 700, fontSize: '0.72rem' }}>{l.action}</span>
            </td>
            <td>{l.module}</td>
            <td style={{ fontSize: '0.76rem', color: '#374151' }}>{l.details}</td>
            <td style={{ fontFamily: 'monospace', fontSize: '0.72rem' }}>{l.ipAddress || '127.0.0.1'}</td>
          </tr>
        ))}
      </tbody>
    </table>

    <GECPrintSignatory preparedBy="System Auditor" checkedBy="IT Security Lead" authorizedBy="Chief Executive Officer" />
  </div>
);
