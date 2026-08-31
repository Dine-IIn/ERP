import React from 'react';
import { GoodsReceivedNote } from '../../types/erp';
import { GECPrintHeader, GECPrintSignatory } from './WOPrintTemplates';

// 1. Single Goods Received Notice (GRN) Inward Slip
export const SingleGRNPrintView: React.FC<{ grn: GoodsReceivedNote }> = ({ grn }) => (
  <div>
    <GECPrintHeader docTitle="GOODS RECEIVED NOTICE (GRN)" refNo={grn.grnNumber} date={grn.receivedDate} />

    <div className="print-meta-grid">
      <div><strong>GRN Number:</strong> {grn.grnNumber}</div>
      <div><strong>PO Reference:</strong> {grn.poNumber}</div>
      <div><strong>Vendor Name:</strong> {grn.vendorName}</div>
      <div><strong>Invoice / Challan:</strong> {grn.invoiceNo || grn.challanNo || '-'}</div>
      <div><strong>Received Date:</strong> {grn.receivedDate}</div>
      <div><strong>Received By:</strong> {grn.receivedBy || 'Store Inward Incharge'}</div>
    </div>

    <table className="print-table">
      <thead>
        <tr>
          <th style={{ width: '35px' }}>#</th>
          <th>Item Code</th>
          <th>Item Description</th>
          <th style={{ width: '90px', textAlign: 'right' }}>Received Qty</th>
          <th style={{ width: '90px', textAlign: 'right' }}>Accepted Qty</th>
          <th style={{ width: '90px', textAlign: 'right' }}>Rejected Qty</th>
          <th style={{ width: '60px' }}>UOM</th>
        </tr>
      </thead>
      <tbody>
        {(grn.items || []).map((item, idx) => (
          <tr key={idx}>
            <td>{idx + 1}</td>
            <td style={{ fontFamily: 'monospace', fontWeight: 700, color: '#2563eb' }}>{item.itemCode || '-'}</td>
            <td>{item.itemName || '-'}</td>
            <td style={{ textAlign: 'right', fontWeight: 700 }}>{item.receivedQty || item.quantity || 0}</td>
            <td style={{ textAlign: 'right', fontWeight: 700, color: '#059669' }}>{item.acceptedQty || item.receivedQty || item.quantity || 0}</td>
            <td style={{ textAlign: 'right', fontWeight: 700, color: item.rejectedQty ? '#dc2626' : '#6b7280' }}>
              {item.rejectedQty || 0}
            </td>
            <td>{item.unit || 'Pcs'}</td>
          </tr>
        ))}
      </tbody>
    </table>

    <div style={{ marginTop: '0.75rem', padding: '8px', backgroundColor: '#f9fafb', borderRadius: '4px', fontSize: '0.8rem' }}>
      <strong>Inward Remarks / Inspection Notes:</strong> Material received in sound physical condition and transferred to store staging area.
    </div>

    <GECPrintSignatory preparedBy="Store Inward Incharge" checkedBy="Inward QC Inspector" authorizedBy="Store Manager" />
  </div>
);

// 2. Filtered GRN List Report
export const GRNListPrintView: React.FC<{ grns: GoodsReceivedNote[]; filterLabel?: string }> = ({
  grns,
  filterLabel = 'Active Inward GRNs'
}) => (
  <div>
    <GECPrintHeader docTitle="MATERIAL INWARD GRN LEDGER" />

    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.8rem', color: '#4b5563' }}>
      <div>Scope: <strong>{filterLabel}</strong> ({grns.length} records)</div>
      <div>Generated: {new Date().toLocaleString()}</div>
    </div>

    <table className="print-table">
      <thead>
        <tr>
          <th style={{ width: '30px' }}>#</th>
          <th>GRN Number</th>
          <th>PO Ref</th>
          <th>Vendor Name</th>
          <th>Received Date</th>
          <th>Invoice / Challan</th>
          <th style={{ width: '60px', textAlign: 'center' }}>Lines</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {grns.map((g, i) => (
          <tr key={i}>
            <td>{i + 1}</td>
            <td style={{ fontFamily: 'monospace', fontWeight: 700, color: '#2563eb' }}>{g.grnNumber}</td>
            <td>{g.poNumber}</td>
            <td style={{ fontWeight: 600 }}>{g.vendorName}</td>
            <td>{g.receivedDate}</td>
            <td>{g.invoiceNo || g.challanNo || '-'}</td>
            <td style={{ textAlign: 'center' }}>{g.items?.length || 0}</td>
            <td style={{ fontWeight: 700 }}>{g.status || 'STORED'}</td>
          </tr>
        ))}
      </tbody>
    </table>

    <GECPrintSignatory />
  </div>
);
