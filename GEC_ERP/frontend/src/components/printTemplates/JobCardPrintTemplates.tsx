import React from 'react';
import { JobCard, DispatchRecord } from '../../types/erp';
import { useERP } from '../../context/ERPContext';
import { GECPrintHeader, GECPrintSignatory } from './WOPrintTemplates';
import { CompanyPrintFooter } from './CompanyPrintFooter';
import { PrintDocumentLayout } from './StandardCompanyHeaderFooter';

// 1. Single Job Card / Station Routing Ticket
export const SingleJobCardPrintView: React.FC<{ jobCard: JobCard }> = ({ jobCard }) => {
  const { items } = useERP();

  // O(1) Item Master map for exact fallback lookup of partCode, oldItemCode, location
  const itemMap = React.useMemo(() => {
    const map = new Map<string, any>();
    (items || []).forEach(it => {
      if (it.id) map.set(it.id, it);
      if (it.itemCode) map.set(it.itemCode.toLowerCase(), it);
    });
    return map;
  }, [items]);

  return (
    <PrintDocumentLayout
      header={<GECPrintHeader docTitle="WORKSTATION JOB CARD ROUTING TICKET" refNo={jobCard.jobCardNo || jobCard.id} date={jobCard.startDate} />}
      footer={<CompanyPrintFooter />}
    >
      <div className="print-meta-grid">
        <div><strong>Job Card No:</strong> {jobCard.jobCardNo || jobCard.id}</div>
        <div><strong>Work Order No:</strong> {jobCard.woNumber || jobCard.woId || '-'}</div>
        <div><strong>Item / Assembly:</strong> {jobCard.itemName} ({jobCard.itemCode})</div>
        <div><strong>Workstation:</strong> {jobCard.stationName || 'Assembly Station'}</div>
        <div><strong>Assigned Operator:</strong> {jobCard.assignedOperator || 'Assembly Technician'}</div>
        <div><strong>Start Date:</strong> {jobCard.startDate || '-'}</div>
        <div><strong>Status:</strong> {jobCard.status}</div>
      </div>

      <h4 style={{ fontSize: '0.9rem', fontWeight: 800, margin: '0.75rem 0 0.25rem 0' }}>Component Bill & Materials List</h4>
      <table className="print-table">
        <thead>
          <tr>
            <th style={{ width: '35px' }}>#</th>
            <th style={{ width: '120px' }}>Part Code</th>
            <th>Item Description</th>
            <th style={{ width: '110px' }}>Old Code</th>
            <th style={{ width: '90px' }}>Location</th>
            <th style={{ width: '80px', textAlign: 'right' }}>Qty</th>
            <th style={{ width: '100px' }}>Remarks / Sign</th>
          </tr>
        </thead>
        <tbody>
          {(jobCard.components || []).map((comp: any, idx: number) => {
            const itemObj = itemMap.get(comp.itemId) || itemMap.get((comp.itemCode || '').toLowerCase());
            const partCode = comp.partCode || itemObj?.partCode || comp.itemCode || '-';
            const oldCode = comp.oldItemCode || comp.oldCode || itemObj?.oldItemCode || '-';
            const location = comp.location || itemObj?.location || '-';

            return (
              <tr key={idx}>
                <td>{idx + 1}</td>
                <td style={{ fontFamily: 'monospace', fontWeight: 700, color: '#2563eb' }}>{partCode}</td>
                <td>{comp.itemName || comp.description || itemObj?.name || '-'}</td>
                <td style={{ fontFamily: 'monospace' }}>{oldCode}</td>
                <td>{location}</td>
                <td style={{ textAlign: 'right', fontWeight: 700 }}>{comp.totalRequiredQty || comp.qtyRequired || comp.qty || 1} {comp.unit || 'Pcs'}</td>
                <td></td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <GECPrintSignatory preparedBy="Station Incharge" checkedBy="Assembly Lead" authorizedBy="Production Manager" />
    </PrintDocumentLayout>
  );
};

// 2. Filtered Job Cards List
export const JobCardListPrintView: React.FC<{ jobCards: JobCard[]; filterLabel?: string }> = ({
  jobCards,
  filterLabel = 'Active Job Cards'
}) => (
  <PrintDocumentLayout
    header={<GECPrintHeader docTitle="JOB CARDS FLOOR ROUTING REPORT" />}
    footer={<CompanyPrintFooter />}
  >
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.8rem', color: '#4b5563' }}>
      <div>Scope: <strong>{filterLabel}</strong> ({jobCards.length} records)</div>
      <div>Generated: {new Date().toLocaleString()}</div>
    </div>

    <table className="print-table">
      <thead>
        <tr>
          <th style={{ width: '30px' }}>#</th>
          <th>Job Card No</th>
          <th>WO Number</th>
          <th>Item / Assembly</th>
          <th>Station</th>
          <th>Operator</th>
          <th>Start Date</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {jobCards.map((jc, i) => (
          <tr key={i}>
            <td>{i + 1}</td>
            <td style={{ fontFamily: 'monospace', fontWeight: 700, color: '#2563eb' }}>{jc.jobCardNo || jc.id}</td>
            <td style={{ fontFamily: 'monospace' }}>{jc.woNumber || jc.woId || '-'}</td>
            <td style={{ fontWeight: 600 }}>{jc.itemName}</td>
            <td>{jc.stationName || '-'}</td>
            <td>{jc.assignedOperator || '-'}</td>
            <td>{jc.startDate || '-'}</td>
            <td style={{ fontWeight: 700 }}>{jc.status}</td>
          </tr>
        ))}
      </tbody>
    </table>

    <GECPrintSignatory />
  </PrintDocumentLayout>
);

// 3. Single Dispatch Challan / Gate Pass
export const SingleDispatchPrintView: React.FC<{ dispatch: DispatchRecord }> = ({ dispatch }) => (
  <PrintDocumentLayout
    header={<GECPrintHeader docTitle="DELIVERY CHALLAN & GATE PASS" refNo={dispatch.dispatchNo || dispatch.id} date={dispatch.dispatchDate} />}
    footer={<CompanyPrintFooter />}
  >
    <div className="print-meta-grid">
      <div><strong>Gate Pass No:</strong> {dispatch.dispatchNo || dispatch.id}</div>
      <div><strong>Customer Name:</strong> {dispatch.customerName}</div>
      <div><strong>SO Number:</strong> {dispatch.soNumber}</div>
      <div><strong>Machine Serial No:</strong> <strong style={{ fontFamily: 'monospace', color: '#2563eb' }}>{dispatch.serialNo || 'GEC-2026-SN-001'}</strong></div>
      <div><strong>Machine Model:</strong> {dispatch.machineModel}</div>
      <div><strong>Transport / Carrier:</strong> {dispatch.transporterName || 'V-Trans Logistics'}</div>
      <div><strong>Vehicle / L.R. No:</strong> {dispatch.vehicleNo || 'GJ-01-XX-1234'} / {dispatch.docketNo || 'LR-9988'}</div>
    </div>

    <table className="print-table">
      <thead>
        <tr>
          <th style={{ width: '35px' }}>#</th>
          <th>Machine Model / Accessory Tooling</th>
          <th>Serial Number</th>
          <th style={{ width: '80px', textAlign: 'right' }}>Qty</th>
          <th>Packaging Type</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>1</td>
          <td style={{ fontWeight: 700 }}>{dispatch.machineModel}</td>
          <td style={{ fontFamily: 'monospace', fontWeight: 700 }}>{dispatch.serialNo || 'SN-001'}</td>
          <td style={{ textAlign: 'right', fontWeight: 700 }}>1 Unit</td>
          <td>Wooden Skid & Tarpaulin Wrap</td>
        </tr>
      </tbody>
    </table>

    <div style={{ marginTop: '1rem', fontSize: '0.75rem', color: '#6b7280' }}>
      <strong>Receiver Acknowledgment:</strong> Received the above machine equipment in good condition with standard toolkits and operation manual.
    </div>

    <div className="print-signatory-section">
      <div className="print-signatory-box">Dispatched By (Logistics Incharge)</div>
      <div className="print-signatory-box">Gate Security Checked & Passed</div>
      <div className="print-signatory-box">Receiver Sign & Rubber Stamp</div>
    </div>
  </PrintDocumentLayout>
);

// 4. Filtered Dispatch History List Report
export const DispatchListPrintView: React.FC<{ records: DispatchRecord[]; filterLabel?: string }> = ({
  records,
  filterLabel = 'Active Dispatch Records'
}) => (
  <PrintDocumentLayout
    header={<GECPrintHeader docTitle="MACHINE DISPATCH & LOGISTICS REPORT" />}
    footer={<CompanyPrintFooter />}
  >
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.8rem', color: '#4b5563' }}>
      <div>Scope: <strong>{filterLabel}</strong> ({records.length} dispatches)</div>
      <div>Generated: {new Date().toLocaleString()}</div>
    </div>

    <table className="print-table">
      <thead>
        <tr>
          <th style={{ width: '30px' }}>#</th>
          <th>Dispatch No</th>
          <th>Customer Name</th>
          <th>SO Number</th>
          <th>Machine Model</th>
          <th>Serial No</th>
          <th>Transporter / Vehicle</th>
          <th>Date</th>
        </tr>
      </thead>
      <tbody>
        {records.map((d, i) => (
          <tr key={i}>
            <td>{i + 1}</td>
            <td style={{ fontFamily: 'monospace', fontWeight: 700, color: '#2563eb' }}>{d.dispatchNo || d.id}</td>
            <td style={{ fontWeight: 600 }}>{d.customerName}</td>
            <td>{d.soNumber}</td>
            <td>{d.machineModel}</td>
            <td style={{ fontFamily: 'monospace' }}>{d.serialNo || '-'}</td>
            <td>{d.transporterName || '-'} ({d.vehicleNo || '-'})</td>
            <td>{d.dispatchDate}</td>
          </tr>
        ))}
      </tbody>
    </table>

    <GECPrintSignatory />
  </PrintDocumentLayout>
);
