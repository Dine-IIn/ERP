import React from 'react';
import { JobworkChallan } from '../../types/erp';
import { GECPrintHeader, GECPrintSignatory } from './WOPrintTemplates';

// 1. Single Jobwork Outward / Return Challan
export const SingleJobworkPrintView: React.FC<{ challan: JobworkChallan }> = ({ challan }) => (
  <div>
    <GECPrintHeader docTitle="JOBWORK OUTWARD CHALLAN" refNo={challan.challanNo} date={challan.issueDate} />

    <div className="print-meta-grid">
      <div><strong>Challan No:</strong> {challan.challanNo}</div>
      <div><strong>Vendor / Jobworker:</strong> {challan.vendorName}</div>
      <div><strong>Issue Date:</strong> {challan.issueDate}</div>
      <div><strong>Expected Return:</strong> {challan.expectedReturnDate || '-'}</div>
      <div><strong>Process Nature:</strong> {challan.processRequired || 'Machining / Surface Treatment'}</div>
      <div><strong>Status:</strong> {challan.status}</div>
    </div>

    <table className="print-table">
      <thead>
        <tr>
          <th style={{ width: '35px' }}>#</th>
          <th>Raw Part Code</th>
          <th>Description & Specification</th>
          <th style={{ width: '90px', textAlign: 'right' }}>Sent Qty</th>
          <th style={{ width: '90px', textAlign: 'right' }}>Received Back</th>
          <th style={{ width: '60px' }}>UOM</th>
        </tr>
      </thead>
      <tbody>
        {(challan.items && challan.items.length > 0 ? challan.items : [
          { itemCode: challan.itemCode || 'PART-001', itemName: challan.itemName || 'Machined Component', sentQuantity: challan.sentQuantity || 1, receivedQuantity: challan.receivedQuantity || 0, unit: 'Pcs' }
        ]).map((item: any, idx: number) => (
          <tr key={idx}>
            <td>{idx + 1}</td>
            <td style={{ fontFamily: 'monospace', fontWeight: 700, color: '#2563eb' }}>{item.itemCode || '-'}</td>
            <td>{item.itemName || '-'}</td>
            <td style={{ textAlign: 'right', fontWeight: 700 }}>{item.sentQuantity || 0}</td>
            <td style={{ textAlign: 'right', fontWeight: 700, color: '#059669' }}>{item.receivedQuantity || 0}</td>
            <td>{item.unit || 'Pcs'}</td>
          </tr>
        ))}
      </tbody>
    </table>

    <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: '#6b7280' }}>
      <strong>Statutory Jobwork Declaration:</strong> Goods dispatched for processing under Rule 45 of CGST Rules. To be returned within 180 days from the date of issue.
    </div>

    <GECPrintSignatory preparedBy="Jobwork Dispatch Incharge" checkedBy="Gate Security Officer" authorizedBy="Stores Incharge" />
  </div>
);

// 2. Filtered Jobwork Challan List Report
export const JobworkListPrintView: React.FC<{ challans: JobworkChallan[]; filterLabel?: string }> = ({
  challans,
  filterLabel = 'Active Jobwork Challans'
}) => (
  <div>
    <GECPrintHeader docTitle="JOBWORK OUTWARD & PROCESS TRACKING REPORT" />

    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.8rem', color: '#4b5563' }}>
      <div>Scope: <strong>{filterLabel}</strong> ({challans.length} records)</div>
      <div>Generated: {new Date().toLocaleString()}</div>
    </div>

    <table className="print-table">
      <thead>
        <tr>
          <th style={{ width: '30px' }}>#</th>
          <th>Challan No</th>
          <th>Vendor Name</th>
          <th>Process Nature</th>
          <th>Issue Date</th>
          <th>Expected Return</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {challans.map((ch, i) => (
          <tr key={i}>
            <td>{i + 1}</td>
            <td style={{ fontFamily: 'monospace', fontWeight: 700, color: '#2563eb' }}>{ch.challanNo}</td>
            <td style={{ fontWeight: 600 }}>{ch.vendorName}</td>
            <td>{ch.processRequired || 'Machining'}</td>
            <td>{ch.issueDate}</td>
            <td>{ch.expectedReturnDate || '-'}</td>
            <td style={{ fontWeight: 700 }}>{ch.status}</td>
          </tr>
        ))}
      </tbody>
    </table>

    <GECPrintSignatory />
  </div>
);
