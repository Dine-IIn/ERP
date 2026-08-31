import React from 'react';
import { SalesOrder } from '../../types/erp';
import { GECPrintHeader, GECPrintSignatory } from './WOPrintTemplates';

// 1. Single Sales Order Commercial Confirmation
export const SingleSOPrintView: React.FC<{ so: SalesOrder; customerDetails?: any }> = ({
  so,
  customerDetails
}) => (
  <div>
    <GECPrintHeader docTitle="SALES ORDER CONFIRMATION" refNo={so.soNumber} date={so.orderDate} />

    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
      <div style={{ padding: '8px 12px', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '4px', fontSize: '0.8rem' }}>
        <h5 style={{ margin: '0 0 4px 0', fontSize: '0.82rem', fontWeight: 800, color: '#2563eb' }}>CUSTOMER BILL TO / SHIP TO:</h5>
        <div style={{ fontWeight: 700 }}>{so.customerName}</div>
        <div>{customerDetails?.address || 'GIDC Industrial Zone, Phase II'}</div>
        <div>{customerDetails?.city || 'Ahmedabad'}, Gujarat</div>
        <div>GSTIN: <strong>{customerDetails?.gstin || '24AAACG9999Z1Z5'}</strong></div>
        <div>Contact: {customerDetails?.contactPerson || 'Procurement Manager'} ({customerDetails?.phone || '+91 98000 00000'})</div>
      </div>

      <div style={{ padding: '8px 12px', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '4px', fontSize: '0.8rem' }}>
        <h5 style={{ margin: '0 0 4px 0', fontSize: '0.82rem', fontWeight: 800, color: '#2563eb' }}>ORDER SPECIFICATIONS:</h5>
        <div>SO Number: <strong>{so.soNumber}</strong></div>
        <div>Order Date: {so.orderDate || new Date().toISOString().split('T')[0]}</div>
        <div>Target Delivery: <strong>{so.deliveryDate}</strong></div>
        <div>Order Status: <strong>{so.status}</strong></div>
        <div>Payment Terms: <strong>30% Advance, 70% Before Dispatch</strong></div>
      </div>
    </div>

    <table className="print-table">
      <thead>
        <tr>
          <th style={{ width: '35px' }}>#</th>
          <th>Machine Model / Equipment Description</th>
          <th style={{ width: '80px', textAlign: 'right' }}>Qty</th>
          <th style={{ width: '120px', textAlign: 'right' }}>Unit Price (₹)</th>
          <th style={{ width: '130px', textAlign: 'right' }}>Total Amount (₹)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>1</td>
          <td>
            <div style={{ fontWeight: 700 }}>{so.machineModel}</div>
            {so.customNotes && <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '2px' }}>Customization: {so.customNotes}</div>}
          </td>
          <td style={{ textAlign: 'right', fontWeight: 700 }}>{so.quantity}</td>
          <td style={{ textAlign: 'right' }}>₹ 18,50,000.00</td>
          <td style={{ textAlign: 'right', fontWeight: 800 }}>₹ {(so.quantity * 1850000).toLocaleString('en-IN')}.00</td>
        </tr>
      </tbody>
      <tfoot>
        <tr style={{ fontWeight: 700, backgroundColor: '#f3f4f6' }}>
          <td colSpan={4} style={{ textAlign: 'right' }}>Subtotal:</td>
          <td style={{ textAlign: 'right' }}>₹ {(so.quantity * 1850000).toLocaleString('en-IN')}.00</td>
        </tr>
        <tr style={{ fontWeight: 700, backgroundColor: '#f3f4f6' }}>
          <td colSpan={4} style={{ textAlign: 'right' }}>GST @ 18%:</td>
          <td style={{ textAlign: 'right' }}>₹ {(so.quantity * 1850000 * 0.18).toLocaleString('en-IN')}.00</td>
        </tr>
        <tr style={{ fontWeight: 800, fontSize: '0.9rem', backgroundColor: '#e5e7eb' }}>
          <td colSpan={4} style={{ textAlign: 'right', color: '#111827' }}>Grand Total (INR):</td>
          <td style={{ textAlign: 'right', color: '#2563eb' }}>₹ {(so.quantity * 1850000 * 1.18).toLocaleString('en-IN')}.00</td>
        </tr>
      </tfoot>
    </table>

    <div style={{ marginTop: '1rem', fontSize: '0.75rem', color: '#6b7280', borderTop: '1px solid #e5e7eb', paddingTop: '0.5rem' }}>
      <strong>Standard Commercial Terms:</strong> Delivery timeline calculated from the date of advance payment and final technical BOM freeze. Warranty: 12 months comprehensive from commissioning date.
    </div>

    <GECPrintSignatory preparedBy="Sales Engineer" checkedBy="Commercial Head" authorizedBy="Director" />
  </div>
);

// 2. Filtered Sales Orders List Report
export const SOListPrintView: React.FC<{ salesOrders: SalesOrder[]; filterLabel?: string }> = ({
  salesOrders,
  filterLabel = 'Active Sales Orders'
}) => (
  <div>
    <GECPrintHeader docTitle="SALES ORDERS SUMMARY REPORT" />

    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.8rem', color: '#4b5563' }}>
      <div>Scope: <strong>{filterLabel}</strong> ({salesOrders.length} records)</div>
      <div>Generated: {new Date().toLocaleString()}</div>
    </div>

    <table className="print-table">
      <thead>
        <tr>
          <th style={{ width: '30px' }}>#</th>
          <th>SO Number</th>
          <th>Customer Name</th>
          <th>Machine Model</th>
          <th style={{ width: '50px', textAlign: 'center' }}>Qty</th>
          <th>Order Date</th>
          <th>Delivery Date</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {salesOrders.map((so, i) => (
          <tr key={i}>
            <td>{i + 1}</td>
            <td style={{ fontFamily: 'monospace', fontWeight: 700, color: '#2563eb' }}>{so.soNumber}</td>
            <td style={{ fontWeight: 600 }}>{so.customerName}</td>
            <td>{so.machineModel}</td>
            <td style={{ textAlign: 'center', fontWeight: 700 }}>{so.quantity}</td>
            <td>{so.orderDate || '-'}</td>
            <td>{so.deliveryDate || '-'}</td>
            <td style={{ fontWeight: 700 }}>{so.status}</td>
          </tr>
        ))}
      </tbody>
    </table>

    <div style={{ marginTop: '1rem', fontSize: '0.8rem', textAlign: 'right', fontWeight: 700 }}>
      Total Machines Booked: {salesOrders.reduce((s, o) => s + (o.quantity || 1), 0)} Units
    </div>

    <GECPrintSignatory />
  </div>
);
