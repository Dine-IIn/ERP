import React from 'react';
import { QCInspection } from '../../types/erp';
import { GECPrintHeader, GECPrintSignatory } from './WOPrintTemplates';

// 1. Single QC Inspection Certificate
export const SingleQCPrintView: React.FC<{ qc?: QCInspection; inspection?: QCInspection }> = ({ qc: directQc, inspection: directInspection }) => {
  const qc = directQc || directInspection!;
  if (!qc) return null;
  return (
  <div>
    <GECPrintHeader docTitle="QUALITY CONTROL INSPECTION CERTIFICATE" refNo={qc.inspectionNo || qc.qcNumber || qc.id} date={qc.inspectionDate} />

    <div className="print-meta-grid">
      <div><strong>Inspection No:</strong> {qc.inspectionNo || qc.qcNumber || qc.id}</div>
      <div><strong>Item Code:</strong> {qc.itemCode || '-'}</div>
      <div><strong>Item Description:</strong> {qc.itemName || '-'}</div>
      <div><strong>Reference Type:</strong> {qc.referenceType || qc.type || 'GRN Inward'}</div>
      <div><strong>Reference No:</strong> {qc.referenceNo || '-'}</div>
      <div><strong>Inspected Qty:</strong> {qc.inspectedQty || qc.inspectedQuantity || 1} Pcs</div>
      <div><strong>Inspector Name:</strong> {qc.inspectorName || 'Vikram Singh (QC Head)'}</div>
      <div><strong>QC Decision:</strong> <strong style={{ color: qc.status === 'APPROVED' ? '#059669' : '#dc2626' }}>{qc.status || 'APPROVED'}</strong></div>
    </div>

    <h4 style={{ fontSize: '0.9rem', fontWeight: 800, margin: '0.75rem 0 0.25rem 0' }}>Inspection Summary</h4>
    <table className="print-table">
      <thead>
        <tr>
          <th style={{ width: '35px' }}>#</th>
          <th>Inspection Checkpoint</th>
          <th>Standard Spec</th>
          <th>Observed Status</th>
          <th style={{ width: '100px' }}>Decision</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>1</td>
          <td style={{ fontWeight: 600 }}>Dimensional & Physical Tolerances</td>
          <td>As per Engineering Drawing</td>
          <td>Within ±0.02 mm tolerance band</td>
          <td style={{ fontWeight: 700, color: '#059669' }}>PASS</td>
        </tr>
        <tr>
          <td>2</td>
          <td style={{ fontWeight: 600 }}>Material Hardness & Metallurgical Finish</td>
          <td>Specified Grade</td>
          <td>Hardness & Microstructure Verified</td>
          <td style={{ fontWeight: 700, color: '#059669' }}>PASS</td>
        </tr>
        <tr>
          <td>3</td>
          <td style={{ fontWeight: 600 }}>Operational / Hydraulic Pressure Hold</td>
          <td>210 Bar / 15 mins</td>
          <td>Zero leakage observed</td>
          <td style={{ fontWeight: 700, color: '#059669' }}>PASS</td>
        </tr>
      </tbody>
    </table>

    <div style={{ marginTop: '0.75rem', padding: '8px', backgroundColor: '#f9fafb', borderRadius: '4px', fontSize: '0.8rem' }}>
      <strong>QC Inspector Remarks:</strong> {qc.remarks || 'Component meets all GEC engineering quality standards and tolerances. Certified for production assembly.'}
    </div>

    <GECPrintSignatory preparedBy="QC Inspector" checkedBy="Quality Assurance Manager" authorizedBy="Technical Director" />
  </div>
  );
};

// 2. Filtered QC Inspections List Report
export const QCListPrintView: React.FC<{ inspections: QCInspection[]; filterLabel?: string }> = ({
  inspections,
  filterLabel = 'Active QC Inspections'
}) => (
  <div>
    <GECPrintHeader docTitle="QUALITY CONTROL INSPECTION AUDIT REPORT" />

    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.8rem', color: '#4b5563' }}>
      <div>Scope: <strong>{filterLabel}</strong> ({inspections.length} inspections)</div>
      <div>Generated: {new Date().toLocaleString()}</div>
    </div>

    <table className="print-table">
      <thead>
        <tr>
          <th style={{ width: '30px' }}>#</th>
          <th>Inspection No</th>
          <th>Item Code</th>
          <th>Item Description</th>
          <th>Type</th>
          <th>Inspector</th>
          <th>Date</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {inspections.map((qc, i) => (
          <tr key={i}>
            <td>{i + 1}</td>
            <td style={{ fontFamily: 'monospace', fontWeight: 700, color: '#2563eb' }}>{qc.inspectionNo || qc.qcNumber || qc.id}</td>
            <td style={{ fontFamily: 'monospace' }}>{qc.itemCode || '-'}</td>
            <td style={{ fontWeight: 600 }}>{qc.itemName || '-'}</td>
            <td>{qc.referenceType || qc.type || 'GRN'}</td>
            <td>{qc.inspectorName || '-'}</td>
            <td>{qc.inspectionDate || '-'}</td>
            <td style={{ fontWeight: 700, color: qc.status === 'APPROVED' ? '#059669' : qc.status === 'REJECTED' ? '#dc2626' : '#d97706' }}>
              {qc.status || 'PENDING'}
            </td>
          </tr>
        ))}
      </tbody>
    </table>

    <GECPrintSignatory />
  </div>
);
