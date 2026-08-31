import React from 'react';
import { Item, Customer, Vendor } from '../../types/erp';
import { GECPrintHeader, GECPrintSignatory } from './WOPrintTemplates';

// 1. Item Master & Inventory Valuation Report
export const ItemListPrintView: React.FC<{ items: Item[]; filterLabel?: string }> = ({
  items,
  filterLabel = 'Active Items Catalog'
}) => (
  <div>
    <GECPrintHeader docTitle="ITEM MASTER & STOCK VALUATION REPORT" />

    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.8rem', color: '#4b5563' }}>
      <div>Scope: <strong>{filterLabel}</strong> ({items.length} items)</div>
      <div>Generated: {new Date().toLocaleString()}</div>
    </div>

    <table className="print-table">
      <thead>
        <tr>
          <th style={{ width: '30px' }}>#</th>
          <th>Item Code</th>
          <th>Part Code</th>
          <th>Description</th>
          <th>Category</th>
          <th>Process Type</th>
          <th style={{ width: '70px', textAlign: 'right' }}>Stock</th>
          <th style={{ width: '50px' }}>UOM</th>
          <th style={{ width: '90px', textAlign: 'right' }}>Unit Rate (₹)</th>
        </tr>
      </thead>
      <tbody>
        {items.map((it, i) => (
          <tr key={i}>
            <td>{i + 1}</td>
            <td style={{ fontFamily: 'monospace', fontWeight: 700, color: '#2563eb' }}>{it.itemCode}</td>
            <td style={{ fontFamily: 'monospace' }}>{it.partCode || '-'}</td>
            <td style={{ fontWeight: 600 }}>{it.name}</td>
            <td>{it.category}</td>
            <td>{it.processType || it.materialProcessType || '-'}</td>
            <td style={{ textAlign: 'right', fontWeight: 700 }}>{it.inHouseStock || 0}</td>
            <td>{it.unit || 'Pcs'}</td>
            <td style={{ textAlign: 'right' }}>₹ {(it.unitPrice || 0).toLocaleString('en-IN')}</td>
          </tr>
        ))}
      </tbody>
    </table>

    <div style={{ marginTop: '1rem', fontSize: '0.8rem', textAlign: 'right', fontWeight: 700 }}>
      Total Inventory Valuation: ₹ {items.reduce((s, it) => s + (it.inHouseStock || 0) * (it.unitPrice || 0), 0).toLocaleString('en-IN')}.00
    </div>

    <GECPrintSignatory preparedBy="Store Inventory Officer" checkedBy="Finance Officer" authorizedBy="Stores Manager" />
  </div>
);

// 2. Customer Directory Print View
export const CustomerListPrintView: React.FC<{ customers: Customer[]; filterLabel?: string }> = ({
  customers,
  filterLabel = 'Customer Directory'
}) => (
  <div>
    <GECPrintHeader docTitle="CUSTOMER DIRECTORY & ACCOUNTS REPORT" />

    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.8rem', color: '#4b5563' }}>
      <div>Scope: <strong>{filterLabel}</strong> ({customers.length} accounts)</div>
      <div>Generated: {new Date().toLocaleString()}</div>
    </div>

    <table className="print-table">
      <thead>
        <tr>
          <th style={{ width: '30px' }}>#</th>
          <th>Customer Name</th>
          <th>Contact Person</th>
          <th>Phone</th>
          <th>City / State</th>
          <th>GSTIN</th>
        </tr>
      </thead>
      <tbody>
        {customers.map((c, i) => (
          <tr key={i}>
            <td>{i + 1}</td>
            <td style={{ fontWeight: 700, color: '#2563eb' }}>{c.name}</td>
            <td>{c.contactPerson || '-'}</td>
            <td>{c.phone || '-'}</td>
            <td>{c.city || 'Ahmedabad'}, {c.state || 'Gujarat'}</td>
            <td style={{ fontFamily: 'monospace' }}>{c.gstin || '-'}</td>
          </tr>
        ))}
      </tbody>
    </table>

    <GECPrintSignatory />
  </div>
);

// 3. Vendor Directory Print View
export const VendorListPrintView: React.FC<{ vendors: Vendor[]; filterLabel?: string }> = ({
  vendors,
  filterLabel = 'Vendor Directory'
}) => (
  <div>
    <GECPrintHeader docTitle="APPROVED VENDOR & SUPPLIER DIRECTORY" />

    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.8rem', color: '#4b5563' }}>
      <div>Scope: <strong>{filterLabel}</strong> ({vendors.length} vendors)</div>
      <div>Generated: {new Date().toLocaleString()}</div>
    </div>

    <table className="print-table">
      <thead>
        <tr>
          <th style={{ width: '30px' }}>#</th>
          <th>Vendor Name</th>
          <th>Category</th>
          <th>Contact Person</th>
          <th>Phone</th>
          <th>City</th>
          <th>GSTIN</th>
        </tr>
      </thead>
      <tbody>
        {vendors.map((v, i) => (
          <tr key={i}>
            <td>{i + 1}</td>
            <td style={{ fontWeight: 700, color: '#2563eb' }}>{v.name}</td>
            <td>{v.category || '-'}</td>
            <td>{v.contactPerson || '-'}</td>
            <td>{v.phone || '-'}</td>
            <td>{v.city || 'Ahmedabad'}</td>
            <td style={{ fontFamily: 'monospace' }}>{v.gstin || '-'}</td>
          </tr>
        ))}
      </tbody>
    </table>

    <GECPrintSignatory />
  </div>
);

export const ItemMasterListPrintView = ItemListPrintView;
