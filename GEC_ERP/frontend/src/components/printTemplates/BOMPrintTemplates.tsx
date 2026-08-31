import React from 'react';
import { BOM } from '../../types/erp';
import { GECPrintHeader, GECPrintSignatory } from './WOPrintTemplates';

// 1. Single BOM Technical Exploded Sheet
export const SingleBOMPrintView: React.FC<{ bom: BOM; isExploded?: boolean }> = ({ bom, isExploded = false }) => (
  <div>
    <GECPrintHeader docTitle={`MASTER BILL OF MATERIALS ${isExploded ? '(EXPLODED)' : ''}`} refNo={bom.bomCode} date={bom.lastUpdated} />

    <div className="print-meta-grid">
      <div><strong>Machine Model:</strong> {bom.machineModel}</div>
      <div><strong>BOM Code:</strong> {bom.bomCode}</div>
      <div><strong>Revision Version:</strong> {bom.version}</div>
      <div><strong>Total Part Lines:</strong> {bom.components?.length || 0} Components</div>
      <div><strong>Est. Production Time:</strong> {bom.estimatedProductionHours || 120} Hours</div>
      <div><strong>Status:</strong> ACTIVE SPECIFICATION</div>
    </div>

    <table className="print-table">
      <thead>
        <tr>
          <th style={{ width: '35px' }}>#</th>
          <th>Item Code</th>
          <th>Component Description</th>
          <th>Sub-Assembly Section</th>
          <th style={{ width: '100px' }}>Qty / Machine</th>
          <th style={{ width: '60px' }}>UOM</th>
        </tr>
      </thead>
      <tbody>
        {(bom.components || []).map((c, i) => (
          <tr key={i}>
            <td>{i + 1}</td>
            <td style={{ fontFamily: 'monospace', fontWeight: 700, color: '#2563eb' }}>{c.itemCode}</td>
            <td style={{ fontWeight: 600 }}>{c.itemName}</td>
            <td>{c.subAssemblyTag || 'Base Frame'}</td>
            <td style={{ fontWeight: 700 }}>{c.qtyPerMachine}</td>
            <td>{c.unit || 'Pcs'}</td>
          </tr>
        ))}
      </tbody>
    </table>

    <GECPrintSignatory preparedBy="Design Engineer" checkedBy="R&D Head" authorizedBy="Technical Director" />
  </div>
);

// 2. BOM Catalog List Report
export const BOMListPrintView: React.FC<{ boms: BOM[]; filterLabel?: string }> = ({
  boms,
  filterLabel = 'Master BOM Catalog'
}) => (
  <div>
    <GECPrintHeader docTitle="BOM MASTER SPECIFICATION CATALOG" />

    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.8rem', color: '#4b5563' }}>
      <div>Scope: <strong>{filterLabel}</strong> ({boms.length} models)</div>
      <div>Generated: {new Date().toLocaleString()}</div>
    </div>

    <table className="print-table">
      <thead>
        <tr>
          <th style={{ width: '30px' }}>#</th>
          <th>BOM Code</th>
          <th>Machine Model Name</th>
          <th>Version</th>
          <th>Part Count</th>
          <th>Est Hours</th>
          <th>Last Revision Date</th>
        </tr>
      </thead>
      <tbody>
        {boms.map((b, i) => (
          <tr key={i}>
            <td>{i + 1}</td>
            <td style={{ fontFamily: 'monospace', fontWeight: 700, color: '#2563eb' }}>{b.bomCode}</td>
            <td style={{ fontWeight: 600 }}>{b.machineModel}</td>
            <td>{b.version}</td>
            <td style={{ fontWeight: 700 }}>{b.components?.length || 0} parts</td>
            <td>{b.estimatedProductionHours || 120} hrs</td>
            <td>{b.lastUpdated || '-'}</td>
          </tr>
        ))}
      </tbody>
    </table>

    <GECPrintSignatory />
  </div>
);
