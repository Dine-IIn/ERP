import React from 'react';
import { PurchaseOrder } from '../../types/erp';
import { GECPrintHeader, GECPrintSignatory } from './WOPrintTemplates';

// 1. Single Vendor Purchase Order Document
export const SinglePOPrintView: React.FC<{ po: PurchaseOrder; vendorDetails?: any }> = ({
  po,
  vendorDetails
}) => (
  <div>
    <GECPrintHeader docTitle="PURCHASE ORDER" refNo={po.poNumber} date={po.orderDate} />

    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
      <div style={{ padding: '8px 12px', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '4px', fontSize: '0.8rem' }}>
        <h5 style={{ margin: '0 0 4px 0', fontSize: '0.82rem', fontWeight: 800, color: '#2563eb' }}>VENDOR / SUPPLIER:</h5>
        <div style={{ fontWeight: 700 }}>{po.vendorName}</div>
        <div>{vendorDetails?.address || 'Industrial Estate, Phase I'}</div>
        <div>{vendorDetails?.city || 'Rajkot'}, Gujarat</div>
        <div>GSTIN: <strong>{vendorDetails?.gstin || '24AABCV8888K1Z2'}</strong></div>
      </div>

      <div style={{ padding: '8px 12px', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '4px', fontSize: '0.8rem' }}>
        <h5 style={{ margin: '0 0 4px 0', fontSize: '0.82rem', fontWeight: 800, color: '#2563eb' }}>PURCHASE DETAILS:</h5>
        <div>PO Number: <strong>{po.poNumber}</strong></div>
        <div>PO Date: {po.orderDate}</div>
        <div>Expected Delivery: <strong>{po.expectedDeliveryDate || po.deliveryDate || '-'}</strong></div>
        <div>Status: <strong>{po.status}</strong></div>
      </div>
    </div>

    <table className="print-table">
      <thead>
        <tr>
          <th style={{ width: '35px' }}>#</th>
          <th>Item Code</th>
          <th>Item Description & Specification</th>
          <th style={{ width: '80px', textAlign: 'right' }}>Qty</th>
          <th style={{ width: '110px', textAlign: 'right' }}>Rate (₹)</th>
          <th style={{ width: '120px', textAlign: 'right' }}>Total (₹)</th>
        </tr>
      </thead>
      <tbody>
        {(po.items || []).map((item, idx) => {
          const qty = item.quantity || item.orderedQty || 1;
          const rate = item.unitPrice || 0;
          const total = item.totalAmount || item.amount || (qty * rate);

          return (
            <tr key={idx}>
              <td>{idx + 1}</td>
              <td style={{ fontFamily: 'monospace', fontWeight: 700, color: '#2563eb' }}>{item.itemCode || '-'}</td>
              <td>{item.itemName || '-'}</td>
              <td style={{ textAlign: 'right', fontWeight: 700 }}>{qty} {item.unit || 'Pcs'}</td>
              <td style={{ textAlign: 'right' }}>₹ {rate.toLocaleString('en-IN')}.00</td>
              <td style={{ textAlign: 'right', fontWeight: 800 }}>₹ {total.toLocaleString('en-IN')}.00</td>
            </tr>
          );
        })}
      </tbody>
      <tfoot>
        <tr style={{ fontWeight: 800, backgroundColor: '#f3f4f6' }}>
          <td colSpan={5} style={{ textAlign: 'right' }}>Grand Total (INR):</td>
          <td style={{ textAlign: 'right', color: '#2563eb' }}>
            ₹ {(po.totalAmount || (po.items || []).reduce((s, i) => s + (i.totalAmount || i.amount || ((i.quantity || i.orderedQty || 1) * (i.unitPrice || 0))), 0)).toLocaleString('en-IN')}.00
          </td>
        </tr>
      </tfoot>
    </table>

    <div style={{ marginTop: '1rem', fontSize: '0.75rem', color: '#6b7280' }}>
      <strong>Terms & Conditions:</strong> Materials must strictly comply with drawing specifications and test certificates. Defective goods will be rejected at inward QC inspection.
    </div>

    <GECPrintSignatory preparedBy="Purchase Executive" checkedBy="Purchase Head" authorizedBy="Finance Controller" />
  </div>
);

// 2. Purchase Orders List Report
export const POListPrintView: React.FC<{ purchaseOrders: PurchaseOrder[]; filterLabel?: string }> = ({
  purchaseOrders,
  filterLabel = 'Active Purchase Orders'
}) => (
  <div>
    <GECPrintHeader docTitle="PURCHASE ORDERS STATUS REPORT" />

    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.8rem', color: '#4b5563' }}>
      <div>Scope: <strong>{filterLabel}</strong> ({purchaseOrders.length} orders)</div>
      <div>Generated: {new Date().toLocaleString()}</div>
    </div>

    <table className="print-table">
      <thead>
        <tr>
          <th style={{ width: '30px' }}>#</th>
          <th>PO Number</th>
          <th>Vendor Name</th>
          <th>PO Date</th>
          <th>Delivery Date</th>
          <th style={{ width: '60px', textAlign: 'center' }}>Items</th>
          <th style={{ textAlign: 'right' }}>Total Value (₹)</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {purchaseOrders.map((po, i) => (
          <tr key={i}>
            <td>{i + 1}</td>
            <td style={{ fontFamily: 'monospace', fontWeight: 700, color: '#2563eb' }}>{po.poNumber}</td>
            <td style={{ fontWeight: 600 }}>{po.vendorName}</td>
            <td>{po.orderDate}</td>
            <td>{po.expectedDeliveryDate || po.deliveryDate || '-'}</td>
            <td style={{ textAlign: 'center' }}>{po.items?.length || 0}</td>
            <td style={{ textAlign: 'right', fontWeight: 700 }}>
              ₹ {(po.totalAmount || 0).toLocaleString('en-IN')}.00
            </td>
            <td style={{ fontWeight: 700 }}>{po.status}</td>
          </tr>
        ))}
      </tbody>
    </table>

    <div style={{ marginTop: '1rem', fontSize: '0.8rem', textAlign: 'right', fontWeight: 700 }}>
      Total Procurement Value: ₹ {purchaseOrders.reduce((sum, p) => sum + (p.totalAmount || 0), 0).toLocaleString('en-IN')}.00
    </div>

    <GECPrintSignatory />
  </div>
);
