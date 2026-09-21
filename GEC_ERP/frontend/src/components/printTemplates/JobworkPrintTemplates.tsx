import React from 'react';
import { JobworkChallan } from '../../types/erp';
import { GECPrintHeader, GECPrintSignatory } from './WOPrintTemplates';
import { CompanyPrintFooter } from './CompanyPrintFooter';
import { PrintDocumentLayout } from './StandardCompanyHeaderFooter';

// 1. Single Jobwork Outward / Return Challan
export const SingleJobworkPrintView: React.FC<{ challan: JobworkChallan }> = ({ challan }) => (
  <PrintDocumentLayout
    header={<GECPrintHeader docTitle="JOBWORK OUTWARD CHALLAN" refNo={challan.challanNo} date={challan.issueDate} />}
    footer={<CompanyPrintFooter />}
  >
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
          <th style={{ width: '120px' }}>Item Code</th>
          <th>Item Description</th>
          <th style={{ width: '80px', textAlign: 'right' }}>Sent Qty</th>
          <th style={{ width: '80px', textAlign: 'right' }}>Received</th>
          <th style={{ width: '80px', textAlign: 'right' }}>Balance</th>
          <th style={{ width: '100px' }}>Remarks</th>
        </tr>
      </thead>
      <tbody>
        {(challan.items && challan.items.length > 0 ? challan.items : [
          { itemCode: challan.itemCode || 'PART-001', itemName: challan.itemName || 'Machined Component', sentQuantity: challan.sentQuantity || 1, unit: 'Pcs' }
        ]).map((item: any, idx: number) => (
          <tr key={idx}>
            <td>{idx + 1}</td>
            <td style={{ fontFamily: 'monospace', fontWeight: 700, color: '#2563eb' }}>{item.itemCode || '-'}</td>
            <td>{item.itemName || item.description || '-'}</td>
            <td style={{ textAlign: 'right', fontWeight: 700 }}>{item.sentQuantity || item.quantity || item.qty || 1} {item.unit || 'Pcs'}</td>
            <td style={{ textAlign: 'right' }}>{item.receivedQuantity || 0}</td>
            <td style={{ textAlign: 'right', fontWeight: 700, color: '#dc2626' }}>{(item.sentQuantity || item.quantity || item.qty || 1) - (item.receivedQuantity || 0)}</td>
            <td>{item.remarks || ''}</td>
          </tr>
        ))}
      </tbody>
    </table>

    <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: '#6b7280' }}>
      <strong>Statutory Jobwork Declaration:</strong> Goods dispatched for processing under Rule 45 of CGST Rules. To be returned within 180 days from the date of issue.
    </div>

    <GECPrintSignatory preparedBy="Jobwork Dispatch Incharge" checkedBy="Gate Security Officer" authorizedBy="Stores Incharge" />
  </PrintDocumentLayout>
);

// 2. Filtered Jobwork Challan List Report
export const JobworkListPrintView: React.FC<{ challans: JobworkChallan[]; filterLabel?: string }> = ({
  challans,
  filterLabel = 'Active Jobwork Challans'
}) => (
  <PrintDocumentLayout
    header={<GECPrintHeader docTitle="JOBWORK OUTWARD & PROCESS TRACKING REPORT" />}
    footer={<CompanyPrintFooter />}
  >
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
  </PrintDocumentLayout>
);
