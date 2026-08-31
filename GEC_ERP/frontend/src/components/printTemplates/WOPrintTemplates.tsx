import React from 'react';
import { WorkOrder } from '../../types/erp';

// Header section for GEC Moulding Machines
export const GECPrintHeader: React.FC<{ docTitle: string; refNo?: string; date?: string }> = ({
  docTitle,
  refNo,
  date
}) => (
  <div className="print-header">
    <div>
      <h2 className="print-company-title">GEC MOULDING MACHINES</h2>
      <div className="print-company-subtitle">GIDC Industrial Estate, Odhav, Ahmedabad - 382415, Gujarat, India</div>
      <div className="print-company-subtitle">GSTIN: 24AAACG1234F1Z9 | Phone: +91 98250 00000 | info@gecmachines.com</div>
    </div>
    <div style={{ textAlign: 'right' }}>
      <h3 className="print-doc-badge">{docTitle}</h3>
      {refNo && <div style={{ fontSize: '0.85rem', fontWeight: 700, fontFamily: 'monospace', marginTop: '2px' }}>Ref: {refNo}</div>}
      <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '2px' }}>
        Date: {date || new Date().toISOString().split('T')[0]}
      </div>
    </div>
  </div>
);

// Signatory block
export const GECPrintSignatory: React.FC<{ preparedBy?: string; checkedBy?: string; authorizedBy?: string }> = ({
  preparedBy = 'Production Supervisor',
  checkedBy = 'Quality Manager',
  authorizedBy = 'Works Director'
}) => (
  <div className="print-signatory-section">
    <div className="print-signatory-box">Prepared By ({preparedBy})</div>
    <div className="print-signatory-box">Checked By ({checkedBy})</div>
    <div className="print-signatory-box">Authorized Signatory ({authorizedBy})</div>
  </div>
);

// 1. Single Work Order Job Card / Production Traveller
export const SingleWOPrintView: React.FC<{ wo: WorkOrder }> = ({ wo }) => {
  const comps = wo.woComponents || [];
  const standardComps = comps.filter(c => !c.isCustomExtra);
  const extraComps = comps.filter(c => c.isCustomExtra);

  return (
    <div>
      <GECPrintHeader docTitle="PRODUCTION WORK ORDER JOB CARD" refNo={wo.workOrderNo || wo.woNumber} date={wo.startDate} />

      <div className="print-meta-grid">
        <div><strong>Machine Model:</strong> {wo.machineModel}</div>
        <div><strong>Build Quantity:</strong> {wo.quantity || wo.targetQuantity || 1} Units</div>
        <div><strong>Linked Sales Order:</strong> {wo.soNumber || 'STOCK_BUILD'}</div>
        <div><strong>Target Delivery:</strong> {wo.targetCompletionDate || '-'}</div>
        <div><strong>Current Stage:</strong> {wo.stage || 'PLANNED'}</div>
        <div><strong>Assigned Lead:</strong> {wo.assignedLead || 'Production Lead'}</div>
      </div>

      {wo.remarks && (
        <div style={{ padding: '6px 10px', backgroundColor: '#fef3c7', border: '1px solid #fde68a', borderRadius: '4px', fontSize: '0.78rem', marginBottom: '0.75rem' }}>
          <strong>Special Customization Notes:</strong> {wo.remarks}
        </div>
      )}

      <h4 style={{ fontSize: '0.9rem', fontWeight: 800, margin: '0.75rem 0 0.25rem 0' }}>Bill of Materials & Components List</h4>
      <table className="print-table">
        <thead>
          <tr>
            <th style={{ width: '35px' }}>#</th>
            <th>Item Code</th>
            <th>Part Description</th>
            <th>Sub-Assembly Section</th>
            <th style={{ width: '90px' }}>Qty Req</th>
            <th style={{ width: '60px' }}>UOM</th>
          </tr>
        </thead>
        <tbody>
          {standardComps.map((c, i) => (
            <tr key={i}>
              <td>{i + 1}</td>
              <td style={{ fontFamily: 'monospace', fontWeight: 700 }}>{c.itemCode}</td>
              <td>{c.itemName}</td>
              <td>{c.subAssemblyTag || 'Base Frame'}</td>
              <td style={{ fontWeight: 700 }}>{c.qtyRequired}</td>
              <td>{c.unit || 'Pcs'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {extraComps.length > 0 && (
        <>
          <h4 style={{ fontSize: '0.9rem', fontWeight: 800, margin: '1rem 0 0.25rem 0', color: '#7c3aed' }}>Additional Products & Tooling</h4>
          <table className="print-table">
            <thead>
              <tr style={{ backgroundColor: '#f5f3ff' }}>
                <th style={{ width: '35px' }}>#</th>
                <th>Item Code</th>
                <th>Additional Product Description</th>
                <th style={{ width: '90px' }}>Qty Req</th>
                <th style={{ width: '60px' }}>UOM</th>
              </tr>
            </thead>
            <tbody>
              {extraComps.map((c, i) => (
                <tr key={i}>
                  <td>{i + 1}</td>
                  <td style={{ fontFamily: 'monospace', fontWeight: 700, color: '#7c3aed' }}>{c.itemCode}</td>
                  <td>{c.itemName}</td>
                  <td style={{ fontWeight: 700 }}>{c.qtyRequired}</td>
                  <td>{c.unit || 'Pcs'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      <GECPrintSignatory />
    </div>
  );
};

// 2. Active / Filtered Work Orders List Report
export const WOListPrintView: React.FC<{ workOrders: WorkOrder[]; filterLabel?: string }> = ({
  workOrders,
  filterLabel = 'Active Work Orders'
}) => (
  <div>
    <GECPrintHeader docTitle="WORK ORDERS STATUS REPORT" />

    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.8rem', color: '#4b5563' }}>
      <div>Report Scope: <strong>{filterLabel}</strong> ({workOrders.length} records)</div>
      <div>Generated: {new Date().toLocaleString()}</div>
    </div>

    <table className="print-table">
      <thead>
        <tr>
          <th style={{ width: '30px' }}>#</th>
          <th>WO Number</th>
          <th>SO Ref</th>
          <th>Machine Model</th>
          <th>Qty</th>
          <th>Stage</th>
          <th>Assigned Lead</th>
          <th>Target Date</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {workOrders.map((wo, i) => (
          <tr key={i}>
            <td>{i + 1}</td>
            <td style={{ fontFamily: 'monospace', fontWeight: 700, color: '#2563eb' }}>{wo.workOrderNo || wo.woNumber}</td>
            <td>{wo.soNumber || '-'}</td>
            <td style={{ fontWeight: 600 }}>{wo.machineModel}</td>
            <td style={{ fontWeight: 700 }}>{wo.quantity || wo.targetQuantity || 1}</td>
            <td>{wo.stage}</td>
            <td>{wo.assignedLead || '-'}</td>
            <td>{wo.targetCompletionDate || '-'}</td>
            <td style={{ fontWeight: 700 }}>{wo.status || 'ACTIVE'}</td>
          </tr>
        ))}
      </tbody>
    </table>

    <div style={{ marginTop: '1rem', fontSize: '0.8rem', textAlign: 'right', fontWeight: 700 }}>
      Total Units in Schedule: {workOrders.reduce((sum, w) => sum + (w.quantity || w.targetQuantity || 1), 0)} Units
    </div>

    <GECPrintSignatory />
  </div>
);
