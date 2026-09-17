import React from 'react';
import { MaterialIssueRecord } from '../../types/erp';
import { GECPrintHeader, GECPrintSignatory } from './WOPrintTemplates';

export const SingleMaterialIssuePrintView: React.FC<{
  record: MaterialIssueRecord;
  itemDetails?: { itemCode: string; name: string; category?: string; uom?: string };
}> = ({ record, itemDetails }) => (
  <div className="print-document a4-portrait">
    <GECPrintHeader 
      docTitle="STORE MATERIAL ISSUE MEMO & VOUCHER" 
      refNo={record.issueNo || record.id} 
      date={record.issuedDate} 
    />

    <div className="print-meta-grid" style={{ marginBottom: '1rem' }}>
      <div><strong>Issue Voucher No:</strong> {record.issueNo || record.id}</div>
      <div><strong>Target Reference:</strong> <span style={{ textTransform: 'uppercase' }}>{record.type} ({record.referenceNo})</span></div>
      <div><strong>Date:</strong> {record.issuedDate}</div>
      <div><strong>Issued By:</strong> {record.issuedBy || 'Store Incharge'}</div>
      <div><strong>Issued To / Floor:</strong> {record.issuedTo || 'Shop Floor Operator'}</div>
      <div><strong>Machine / Purpose:</strong> {record.machineModel || '-'}</div>
    </div>

    <table className="print-table" style={{ marginBottom: '1.5rem' }}>
      <thead>
        <tr>
          <th style={{ width: '40px' }}>#</th>
          <th>Item Code</th>
          <th>Item Description / Component</th>
          <th>Category</th>
          <th style={{ textAlign: 'right', width: '120px' }}>Issued Qty</th>
          <th style={{ width: '70px', textAlign: 'center' }}>UOM</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>1</td>
          <td><strong>{record.itemCode || itemDetails?.itemCode || '-'}</strong></td>
          <td>{record.itemName || itemDetails?.name || '-'}</td>
          <td>{itemDetails?.category || 'Component Part'}</td>
          <td style={{ textAlign: 'right', fontWeight: 800, fontSize: '1.05rem', color: '#111827' }}>
            {record.issuedQty}
          </td>
          <td style={{ textAlign: 'center' }}>{record.unit || itemDetails?.uom || 'PCS'}</td>
        </tr>
      </tbody>
    </table>

    {record.notes && (
      <div style={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', padding: '8px 12px', borderRadius: '4px', marginBottom: '1.5rem', fontSize: '0.82rem' }}>
        <strong>Issue Notes / Justification:</strong> {record.notes}
      </div>
    )}

    <div style={{ fontSize: '0.78rem', color: '#6b7280', marginBottom: '1.5rem', fontStyle: 'italic' }}>
      * This is an authorized store issue memo. Materials must be verified upon receipt. Defective or surplus items must be routed through store re-issue/return protocols.
    </div>

    <GECPrintSignatory 
      preparedBy="Store Officer" 
      checkedBy="Production Supervisor" 
      authorizedBy="Works Manager" 
    />
  </div>
);

export const MaterialIssueListPrintView: React.FC<{
  records: MaterialIssueRecord[];
  filterLabel?: string;
}> = ({ records, filterLabel = 'Active Material Issue Register' }) => (
  <div className="print-document a4-portrait">
    <GECPrintHeader docTitle="MATERIAL ISSUANCE & STORE DISPATCH REGISTER" />

    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontSize: '0.82rem', color: '#4b5563' }}>
      <span><strong>Scope:</strong> {filterLabel}</span>
      <span><strong>Total Entries:</strong> {records.length}</span>
    </div>

    <table className="print-table">
      <thead>
        <tr>
          <th style={{ width: '35px' }}>#</th>
          <th>Voucher No</th>
          <th>Date</th>
          <th>Source Type</th>
          <th>Reference No</th>
          <th>Item Code</th>
          <th>Component Name</th>
          <th style={{ textAlign: 'right' }}>Qty</th>
          <th>Receiver</th>
        </tr>
      </thead>
      <tbody>
        {records.map((r, i) => (
          <tr key={r.id}>
            <td>{i + 1}</td>
            <td><strong>{r.issueNo}</strong></td>
            <td style={{ whiteSpace: 'nowrap' }}>{r.issuedDate}</td>
            <td>{r.type}</td>
            <td><strong>{r.referenceNo}</strong></td>
            <td>{r.itemCode}</td>
            <td>{r.itemName}</td>
            <td style={{ textAlign: 'right', fontWeight: 700 }}>{r.issuedQty} {r.unit}</td>
            <td>{r.issuedTo || '-'}</td>
          </tr>
        ))}
      </tbody>
    </table>

    <GECPrintSignatory preparedBy="Store Incharge" checkedBy="Operations Lead" authorizedBy="Factory Head" />
  </div>
);
