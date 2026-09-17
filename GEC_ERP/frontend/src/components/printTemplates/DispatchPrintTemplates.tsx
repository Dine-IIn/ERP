import React from 'react';
import { DispatchRecord } from '../../types/erp';
import { GECPrintHeader, GECPrintSignatory } from './WOPrintTemplates';

export const SingleDispatchGatePassPrintView: React.FC<{
  dispatch: DispatchRecord;
  companyDetails?: any;
}> = ({ dispatch }) => (
  <div className="print-document a4-portrait">
    <GECPrintHeader 
      docTitle="FINISHED GOODS DELIVERY CHALLAN & GATE PASS" 
      refNo={dispatch.dispatchNo || dispatch.id} 
      date={dispatch.dispatchDate} 
    />

    <div className="print-meta-grid" style={{ marginBottom: '1rem' }}>
      <div><strong>Dispatch Challan No:</strong> {dispatch.dispatchNo || dispatch.id}</div>
      <div><strong>Date of Dispatch:</strong> {dispatch.dispatchDate}</div>
      <div><strong>Customer / Consignee:</strong> <strong>{dispatch.customerName}</strong></div>
      <div><strong>Sales Order Ref:</strong> {dispatch.soNumber || '-'}</div>
      <div><strong>Machine Serial No:</strong> {dispatch.serialNo || '-'}</div>
      <div><strong>Vehicle / Transporter:</strong> {dispatch.transporterName || dispatch.vehicleNo || 'Direct Transport'}</div>
    </div>

    <table className="print-table" style={{ marginBottom: '1.5rem' }}>
      <thead>
        <tr>
          <th style={{ width: '40px' }}>#</th>
          <th>Machine Model / Product</th>
          <th>Serial Number(s)</th>
          <th style={{ textAlign: 'right', width: '120px' }}>Dispatch Qty</th>
          <th style={{ width: '80px', textAlign: 'center' }}>UOM</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>1</td>
          <td><strong>{dispatch.machineModel}</strong></td>
          <td>{dispatch.serialNo || 'N/A'}</td>
          <td style={{ textAlign: 'right', fontWeight: 800, fontSize: '1.05rem', color: '#111827' }}>
            {(dispatch as any).quantity || 1}
          </td>
          <td style={{ textAlign: 'center' }}>SET</td>
        </tr>
      </tbody>
    </table>

    <div style={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', padding: '10px 14px', borderRadius: '4px', marginBottom: '1.5rem', fontSize: '0.82rem', lineHeight: 1.5 }}>
      <strong>Terms & Verification:</strong>
      <ol style={{ margin: '4px 0 0', paddingLeft: '1.2rem' }}>
        <li>Goods dispatched in perfect working condition after mandatory Quality Control clearance.</li>
        <li>Consignee acknowledges receipt of machinery and accompanying technical documentation.</li>
        <li>Transit insurance is covered as per agreed commercial proforma terms.</li>
      </ol>
    </div>

    <GECPrintSignatory 
      preparedBy="Dispatch Officer" 
      checkedBy="Quality & Store Lead" 
      authorizedBy="Commercial Director" 
    />
  </div>
);

export const DispatchListPrintView: React.FC<{
  dispatches: DispatchRecord[];
  filterLabel?: string;
}> = ({ dispatches, filterLabel = 'Finished Goods Dispatch Register' }) => (
  <div className="print-document a4-portrait">
    <GECPrintHeader docTitle="FINISHED GOODS DISPATCH & SHIPMENT REGISTER" />

    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontSize: '0.82rem', color: '#4b5563' }}>
      <span><strong>Scope:</strong> {filterLabel}</span>
      <span><strong>Total Shipments:</strong> {dispatches.length}</span>
    </div>

    <table className="print-table">
      <thead>
        <tr>
          <th style={{ width: '35px' }}>#</th>
          <th>Challan No</th>
          <th>Date</th>
          <th>Customer</th>
          <th>Machine Model</th>
          <th>Serial No</th>
          <th style={{ textAlign: 'right' }}>Qty</th>
          <th>Transporter / Vehicle</th>
        </tr>
      </thead>
      <tbody>
        {dispatches.map((d, i) => (
          <tr key={d.id}>
            <td>{i + 1}</td>
            <td><strong>{d.dispatchNo || d.id}</strong></td>
            <td>{d.dispatchDate}</td>
            <td>{d.customerName}</td>
            <td>{d.machineModel}</td>
            <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{d.serialNo}</td>
            <td style={{ textAlign: 'right', fontWeight: 700 }}>{(d as any).quantity || 1}</td>
            <td>{d.vehicleNo || d.transporterName || '-'}</td>
          </tr>
        ))}
      </tbody>
    </table>

    <GECPrintSignatory preparedBy="Dispatch Head" checkedBy="Finance Lead" authorizedBy="Managing Director" />
  </div>
);
