import React from 'react';
import { JobCard, DispatchRecord } from '../../types/erp';
import { GECPrintHeader, GECPrintSignatory } from './WOPrintTemplates';

// 1. Single Job Card / Station Routing Ticket
export const SingleJobCardPrintView: React.FC<{ jobCard: JobCard }> = ({ jobCard }) => (
  <div>
    <GECPrintHeader docTitle="WORKSTATION JOB CARD ROUTING TICKET" refNo={jobCard.jobCardNo || jobCard.id} date={jobCard.startDate} />

    <div className="print-meta-grid">
      <div><strong>Job Card No:</strong> {jobCard.jobCardNo || jobCard.id}</div>
      <div><strong>Work Order No:</strong> {jobCard.woNumber || jobCard.woId || '-'}</div>
      <div><strong>Item / Assembly:</strong> {jobCard.itemName} ({jobCard.itemCode})</div>
      <div><strong>Workstation:</strong> {jobCard.stationName || 'Assembly Station'}</div>
      <div><strong>Assigned Operator:</strong> {jobCard.assignedOperator || 'Assembly Technician'}</div>
      <div><strong>Start Date:</strong> {jobCard.startDate || '-'}</div>
      <div><strong>Status:</strong> {jobCard.status}</div>
    </div>

    <h4 style={{ fontSize: '0.9rem', fontWeight: 800, margin: '0.75rem 0 0.25rem 0' }}>Component Bill & Consumption</h4>
    <table className="print-table">
      <thead>
        <tr>
          <th style={{ width: '35px' }}>#</th>
          <th>Item Code</th>
          <th>Component Name</th>
          <th style={{ width: '90px', textAlign: 'right' }}>Qty / Unit</th>
          <th style={{ width: '90px', textAlign: 'right' }}>Total Req</th>
          <th style={{ width: '60px' }}>UOM</th>
        </tr>
      </thead>
      <tbody>
        {(jobCard.components || []).map((comp, idx) => (
          <tr key={idx}>
            <td>{idx + 1}</td>
            <td style={{ fontFamily: 'monospace', fontWeight: 700, color: '#2563eb' }}>{comp.itemCode}</td>
            <td>{comp.itemName}</td>
            <td style={{ textAlign: 'right' }}>{comp.qtyPerUnit}</td>
            <td style={{ textAlign: 'right', fontWeight: 700 }}>{comp.totalRequiredQty}</td>
            <td>{comp.unit || 'Pcs'}</td>
          </tr>
        ))}
      </tbody>
    </table>

    <GECPrintSignatory preparedBy="Station Incharge" checkedBy="Assembly Lead" authorizedBy="Production Manager" />
  </div>
);

// 2. Filtered Job Cards List
export const JobCardListPrintView: React.FC<{ jobCards: JobCard[]; filterLabel?: string }> = ({
  jobCards,
  filterLabel = 'Active Job Cards'
}) => (
  <div>
    <GECPrintHeader docTitle="JOB CARDS FLOOR ROUTING REPORT" />

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
  </div>
);

// 3. Single Dispatch Challan / Gate Pass
export const SingleDispatchPrintView: React.FC<{ dispatch: DispatchRecord }> = ({ dispatch }) => (
  <div>
    <GECPrintHeader docTitle="DELIVERY CHALLAN & GATE PASS" refNo={dispatch.dispatchNo || dispatch.id} date={dispatch.dispatchDate} />

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
  </div>
);

// 4. Filtered Dispatch History List Report
export const DispatchListPrintView: React.FC<{ records: DispatchRecord[]; filterLabel?: string }> = ({
  records,
  filterLabel = 'Active Dispatch Records'
}) => (
  <div>
    <GECPrintHeader docTitle="MACHINE DISPATCH & LOGISTICS REPORT" />

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
  </div>
);
