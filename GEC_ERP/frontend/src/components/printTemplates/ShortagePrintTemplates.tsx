import React from 'react';
import { GECPrintHeader, GECPrintSignatory } from './WOPrintTemplates';
import './printStyles.css';

export interface ConsolidatedComponentRow {
  srNo: number;
  priorityRank?: string;
  leadTimeDays?: number;
  partCode: string;
  itemCode: string;
  itemName: string;
  category: string;
  processType: string;
  unit: string;
  totalRequired: number;
  inHouseStock: number;
  pendingPO: number;
  pendingJW: number;
  pendingQC: number;
  shortage: number;
  minStockLevel: number;
  minShortage: number;
  requiredByItems?: Array<{
    itemCode: string;
    targetQty: number;
    requiredQty: number;
  }>;
}

export interface SelectedParentItemMeta {
  itemId: string;
  itemCode: string;
  itemName: string;
  category?: string;
  targetQuantity: number;
  maxBuildableQty: number;
  constrainingComponent?: string;
}

export interface ConsolidatedItemWiseShortagePrintProps {
  data: ConsolidatedComponentRow[];
  selectedItems: SelectedParentItemMeta[];
  filterLabel?: string;
}

export const ConsolidatedItemWiseShortagePrintReport: React.FC<ConsolidatedItemWiseShortagePrintProps> = ({
  data,
  selectedItems,
  filterLabel = 'Consolidated Item-Wise Shortage Analysis'
}) => {
  const totalRequiredSum = data.reduce((acc, d) => acc + (d.totalRequired || 0), 0);
  const totalShortageSum = data.reduce((acc, d) => acc + (d.shortage || 0), 0);

  const thBaseStyle: React.CSSProperties = {
    padding: '4px 2px',
    fontWeight: 800,
    verticalAlign: 'middle',
    border: '1px solid #000000',
    backgroundColor: '#f1f5f9',
    color: '#000000',
    backgroundClip: 'padding-box',
    boxSizing: 'border-box'
  };

  const tdBaseStyle: React.CSSProperties = {
    padding: '3.5px 2px',
    verticalAlign: 'middle',
    border: '1px solid #000000',
    color: '#000000',
    backgroundClip: 'padding-box',
    boxSizing: 'border-box'
  };

  return (
    <div 
      className="planning-print-root"
      style={{
        width: '100%',
        backgroundColor: '#ffffff',
        color: '#000000',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        fontSize: '9pt',
        lineHeight: '1.25',
        padding: '0.1rem'
      }}
    >
      {/* Document Header */}
      <div style={{ marginBottom: '6px', borderBottom: '1.5px solid #000000', paddingBottom: '4px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '11pt', fontWeight: 900, letterSpacing: '-0.02em', textTransform: 'uppercase' }}>
              CONSOLIDATED ITEM-WISE SHORTAGE & CAPACITY REPORT
            </span>
            <span style={{ marginLeft: '8px', fontSize: '7.5pt', color: '#475569' }}>
              (Total Demand of {selectedItems.length} Selected Planned Items / Assemblies)
            </span>
          </div>
          <div style={{ fontSize: '7.5pt', color: '#475569', fontWeight: 600 }}>
            Generated: {new Date().toLocaleString()}
          </div>
        </div>

        {/* Selected Parent Items Summary Bar */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
          {selectedItems.map((it, idx) => (
            <span 
              key={idx} 
              style={{ 
                fontSize: '7pt', 
                backgroundColor: '#f1f5f9', 
                border: '1px solid #cbd5e1', 
                borderRadius: '3px', 
                padding: '2px 5px',
                color: '#1e293b'
              }}
            >
              <strong>{it.itemCode}</strong>: Plan <strong>{it.targetQuantity}</strong> (Max: <span style={{ color: it.maxBuildableQty >= it.targetQuantity ? '#059669' : '#dc2626', fontWeight: 700 }}>{it.maxBuildableQty}</span>)
            </span>
          ))}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 17-COLUMN CONSOLIDATED SHORTAGE DATA TABLE */}
      {/* ------------------------------------------------------------- */}
      <table style={{
        width: '100%',
        borderCollapse: 'collapse',
        fontSize: '9pt',
        border: '1px solid #000000',
        tableLayout: 'fixed'
      }}>
        <thead style={{ fontSize: '5.6pt', lineHeight: '1.2', letterSpacing: '-0.01em', textTransform: 'uppercase' }}>
          <tr style={{ minHeight: '26px' }}>
            <th style={{ ...thBaseStyle, width: '2.5%', textAlign: 'center' }}>#</th>
            <th style={{ ...thBaseStyle, width: '4%', textAlign: 'center' }}>Pri<br/>ority</th>
            <th style={{ ...thBaseStyle, width: '4.5%', textAlign: 'center' }}>Lead<br/>Time</th>
            <th style={{ ...thBaseStyle, width: '8.5%', textAlign: 'left' }}>Part<br/>Code</th>
            <th style={{ ...thBaseStyle, width: '9%', textAlign: 'left' }}>Item<br/>Code</th>
            <th style={{ ...thBaseStyle, width: '20%', textAlign: 'left' }}>Item<br/>Description</th>
            <th style={{ ...thBaseStyle, width: '4%', textAlign: 'center' }}>Class</th>
            <th style={{ ...thBaseStyle, width: '5.5%', textAlign: 'center' }}>Source</th>
            <th style={{ ...thBaseStyle, width: '8%', textAlign: 'left' }}>Demand<br/>From</th>
            <th style={{ ...thBaseStyle, width: '5%', textAlign: 'center' }}>Total<br/>Req</th>
            <th style={{ ...thBaseStyle, width: '5%', textAlign: 'center' }}>Curr<br/>Stock</th>
            <th style={{ ...thBaseStyle, width: '4.5%', textAlign: 'center' }}>Pend<br/>PO</th>
            <th style={{ ...thBaseStyle, width: '5%', textAlign: 'center' }}>Pend<br/>JobWork</th>
            <th style={{ ...thBaseStyle, width: '4.5%', textAlign: 'center' }}>Pend<br/>QC</th>
            <th style={{ ...thBaseStyle, width: '5%', textAlign: 'center' }}>Short<br/>age</th>
            <th style={{ ...thBaseStyle, width: '4.5%', textAlign: 'center' }}>Min<br/>Level</th>
            <th style={{ ...thBaseStyle, width: '5%', textAlign: 'center' }}>Min Level<br/>Shortage</th>
          </tr>
        </thead>
        <tbody style={{ fontSize: '8.5pt' }}>
          {data.length === 0 ? (
            <tr>
              <td colSpan={17} style={{ textAlign: 'center', padding: '12px', color: '#6b7280', fontStyle: 'italic', border: '1px solid #cbd5e1' }}>
                No components or shortages match the selected items or filter criteria.
              </td>
            </tr>
          ) : (
            data.map((row, idx) => {
              const hasShortage = (row.shortage || 0) > 0;
              const hasMinShortage = (row.minShortage || 0) > 0;
              const isEven = idx % 2 === 0;
              const rowBg = hasShortage ? '#fee2e2' : (isEven ? '#ffffff' : '#f8fafc');
              const demandSummary = (row.requiredByItems || [])
                .map(r => `${r.itemCode}: ${r.requiredQty}`)
                .join(', ');

              return (
                <tr key={idx} style={{ backgroundColor: rowBg }}>
                  <td style={{ ...tdBaseStyle, textAlign: 'center', color: '#64748b', fontSize: '8pt' }}>
                    {idx + 1}
                  </td>
                  <td style={{ ...tdBaseStyle, textAlign: 'center', fontWeight: 800, color: '#000000', fontSize: '7.5pt' }}>
                    {row.priorityRank || `P${idx + 1}`}
                  </td>
                  <td style={{ ...tdBaseStyle, textAlign: 'center', fontWeight: 600, color: '#000000', fontSize: '7.5pt' }}>
                    {row.leadTimeDays || 10}D
                  </td>
                  <td style={{ ...tdBaseStyle, textAlign: 'left', fontFamily: 'monospace', fontWeight: 700, color: '#1e293b', fontSize: '8pt', whiteSpace: 'nowrap' }}>
                    {row.partCode || '-'}
                  </td>
                  <td style={{ ...tdBaseStyle, textAlign: 'left', fontFamily: 'monospace', fontWeight: 700, color: '#0f172a', fontSize: '8pt', whiteSpace: 'nowrap' }}>
                    {row.itemCode}
                  </td>
                  <td style={{ 
                    ...tdBaseStyle, 
                    textAlign: 'left',
                    color: '#000000', 
                    fontWeight: 600, 
                    fontSize: '8pt', 
                    whiteSpace: 'normal',
                    wordBreak: 'break-word',
                    lineHeight: '1.2'
                  }}>
                    {row.itemName}
                  </td>
                  <td style={{ ...tdBaseStyle, textAlign: 'center', fontSize: '7.5pt', fontWeight: 600, color: '#475569' }}>
                    {row.category || '-'}
                  </td>
                  <td style={{ ...tdBaseStyle, textAlign: 'center', fontSize: '7.5pt', color: '#334155' }}>
                    {row.processType || 'In-house'}
                  </td>
                  <td style={{ 
                    ...tdBaseStyle, 
                    textAlign: 'left',
                    fontSize: '7pt', 
                    color: '#475569',
                    whiteSpace: 'normal',
                    wordBreak: 'break-word'
                  }}>
                    {demandSummary || '-'}
                  </td>
                  <td style={{ ...tdBaseStyle, textAlign: 'center', fontWeight: 800, color: '#000000' }}>
                    {row.totalRequired || 0}
                  </td>
                  <td style={{ ...tdBaseStyle, textAlign: 'center', fontWeight: 700, color: '#000000' }}>
                    {row.inHouseStock || 0}
                  </td>
                  <td style={{ ...tdBaseStyle, textAlign: 'center', color: '#000000' }}>
                    {row.pendingPO || 0}
                  </td>
                  <td style={{ ...tdBaseStyle, textAlign: 'center', color: '#000000' }}>
                    {row.pendingJW || 0}
                  </td>
                  <td style={{ ...tdBaseStyle, textAlign: 'center', color: '#000000' }}>
                    {row.pendingQC || 0}
                  </td>
                  <td style={{ 
                    ...tdBaseStyle, 
                    textAlign: 'center', 
                    fontWeight: 900, 
                    color: '#000000'
                  }}>
                    {row.shortage || 0}
                  </td>
                  <td style={{ ...tdBaseStyle, textAlign: 'center', color: '#000000' }}>
                    {row.minStockLevel || 0}
                  </td>
                  <td style={{ 
                    ...tdBaseStyle, 
                    textAlign: 'center', 
                    fontWeight: hasMinShortage ? 800 : 500,
                    color: '#000000'
                  }}>
                    {row.minShortage || 0}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
        {data.length > 0 && (
          <tfoot style={{ fontSize: '8pt' }}>
            <tr style={{ backgroundColor: '#e2e8f0' }}>
              <td colSpan={9} style={{ ...thBaseStyle, backgroundColor: '#e2e8f0', textAlign: 'right' }}>
                TOTALS ({data.length} Components):
              </td>
              <td style={{ ...thBaseStyle, backgroundColor: '#e2e8f0', textAlign: 'center', color: '#000000' }}>
                {totalRequiredSum}
              </td>
              <td style={{ ...thBaseStyle, backgroundColor: '#e2e8f0', textAlign: 'center', color: '#000000' }}>
                {data.reduce((s, r) => s + (r.inHouseStock || 0), 0)}
              </td>
              <td style={{ ...thBaseStyle, backgroundColor: '#e2e8f0', textAlign: 'center', color: '#000000' }}>
                {data.reduce((s, r) => s + (r.pendingPO || 0), 0)}
              </td>
              <td style={{ ...thBaseStyle, backgroundColor: '#e2e8f0', textAlign: 'center', color: '#000000' }}>
                {data.reduce((s, r) => s + (r.pendingJW || 0), 0)}
              </td>
              <td style={{ ...thBaseStyle, backgroundColor: '#e2e8f0', textAlign: 'center', color: '#000000' }}>
                {data.reduce((s, r) => s + (r.pendingQC || 0), 0)}
              </td>
              <td style={{ ...thBaseStyle, backgroundColor: '#e2e8f0', textAlign: 'center', color: '#000000' }}>
                {totalShortageSum}
              </td>
              <td style={{ ...thBaseStyle, backgroundColor: '#e2e8f0', textAlign: 'center', color: '#000000' }}>
                {data.reduce((s, r) => s + (r.minStockLevel || 0), 0)}
              </td>
              <td style={{ ...thBaseStyle, backgroundColor: '#e2e8f0', textAlign: 'center', color: '#000000' }}>
                {data.reduce((s, r) => s + (r.minShortage || 0), 0)}
              </td>
            </tr>
          </tfoot>
        )}
      </table>

      <GECPrintSignatory preparedBy="Shortage Planner" checkedBy="Store & Materials Lead" authorizedBy="Plant Head" />
    </div>
  );
};

export interface ItemWiseShortagePrintItem {
  itemId: string;
  itemCode: string;
  itemName: string;
  category: string;
  targetQuantity: number;
  maxBuildableQty: number;
  constrainingComponent?: string;
  components: Array<{
    itemCode: string;
    itemName: string;
    category: string;
    processType: string;
    qtyPerItem: number;
    totalRequired: number;
    inHouseStock: number;
    netShortage: number;
    unit: string;
    leadTimeDays?: number;
    priorityRank?: string;
  }>;
}

// 1. Item-Wise Shortage & Capacity Planning Report (Legacy / Grouped View)
export const ItemWiseShortagePrintView: React.FC<{
  selectedItemsData: ItemWiseShortagePrintItem[];
  filterLabel?: string;
}> = ({
  selectedItemsData,
  filterLabel = 'Item-Wise Shortage Analysis'
}) => (
  <div>
    <GECPrintHeader docTitle="ITEM-WISE PRODUCTION SHORTAGE & CAPACITY REPORT" />

    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontSize: '0.8rem', color: '#4b5563' }}>
      <div>Scope: <strong>{filterLabel}</strong> ({selectedItemsData.length} planned assemblies/items)</div>
      <div>Generated: {new Date().toLocaleString()}</div>
    </div>

    {selectedItemsData.map((itemPlan, idx) => (
      <div key={idx} style={{ marginBottom: '1.5rem', pageBreakInside: 'avoid' }}>
        {/* Planned Item Banner */}
        <div style={{ padding: '8px 12px', backgroundColor: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '4px', marginBottom: '6px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#1f2937' }}>
                {itemPlan.itemCode} &bull; {itemPlan.itemName}
              </span>
              <span style={{ marginLeft: '8px', padding: '2px 6px', backgroundColor: '#e5e7eb', borderRadius: '3px', fontSize: '0.75rem', fontWeight: 600 }}>
                Class: {itemPlan.category}
              </span>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>
                Target Build Qty: <strong>{itemPlan.targetQuantity}</strong> | 
                Max Buildable: <strong style={{ color: itemPlan.maxBuildableQty >= itemPlan.targetQuantity ? '#059669' : '#dc2626' }}>{itemPlan.maxBuildableQty}</strong>
              </span>
            </div>
          </div>
          {itemPlan.constrainingComponent && (
            <div style={{ fontSize: '0.75rem', color: '#b91c1c', marginTop: '2px', fontWeight: 600 }}>
              ⚠️ Bottleneck Constraining Component: {itemPlan.constrainingComponent}
            </div>
          )}
        </div>

        {/* Required Child Components Breakdown Table */}
        <table className="print-table">
          <thead>
            <tr>
              <th style={{ width: '30px' }}>#</th>
              <th style={{ width: '50px', textAlign: 'center' }}>Priority</th>
              <th style={{ width: '60px', textAlign: 'center' }}>Lead Time</th>
              <th>Component Code</th>
              <th>Component Name</th>
              <th>Class</th>
              <th>Source / Process</th>
              <th style={{ width: '70px', textAlign: 'right' }}>Qty / Item</th>
              <th style={{ width: '80px', textAlign: 'right' }}>Total Req</th>
              <th style={{ width: '80px', textAlign: 'right' }}>In Stock</th>
              <th style={{ width: '85px', textAlign: 'right' }}>Net Shortage</th>
            </tr>
          </thead>
          <tbody>
            {itemPlan.components.length === 0 ? (
              <tr>
                <td colSpan={11} style={{ textAlign: 'center', padding: '8px', color: '#6b7280' }}>
                  No BOM sub-components found for this item.
                </td>
              </tr>
            ) : (
              itemPlan.components.map((comp, cIdx) => (
                <tr key={cIdx} style={{ backgroundColor: comp.netShortage > 0 ? '#fef2f2' : 'transparent' }}>
                  <td>{cIdx + 1}</td>
                  <td style={{ textAlign: 'center', fontWeight: 800 }}>{comp.priorityRank || `P${cIdx + 1}`}</td>
                  <td style={{ textAlign: 'center' }}>{comp.leadTimeDays || 10}D</td>
                  <td style={{ fontFamily: 'monospace', fontWeight: 700, color: '#2563eb' }}>{comp.itemCode}</td>
                  <td style={{ fontWeight: 600 }}>{comp.itemName}</td>
                  <td>{comp.category}</td>
                  <td>{comp.processType || 'In-house'}</td>
                  <td style={{ textAlign: 'right' }}>{comp.qtyPerItem}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>{comp.totalRequired} {comp.unit}</td>
                  <td style={{ textAlign: 'right' }}>{comp.inHouseStock} {comp.unit}</td>
                  <td style={{ textAlign: 'right', fontWeight: 800, color: comp.netShortage > 0 ? '#dc2626' : '#059669' }}>
                    {comp.netShortage > 0 ? `${comp.netShortage} ${comp.unit}` : 'OK (0)'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    ))}

    <GECPrintSignatory preparedBy="Shortage Planner" checkedBy="Store & Materials Lead" authorizedBy="Plant Head" />
  </div>
);

// 2. Work Order Shortage Tree Report
export const WOShortagePrintView: React.FC<{
  shortageData: any[];
  filterLabel?: string;
}> = ({
  shortageData,
  filterLabel = 'Work Order Shortages'
}) => (
  <div>
    <GECPrintHeader docTitle="WORK ORDER MANUFACTURING SHORTAGE TREE" />

    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontSize: '0.8rem', color: '#4b5563' }}>
      <div>Scope: <strong>{filterLabel}</strong> ({shortageData.length} Work Orders)</div>
      <div>Generated: {new Date().toLocaleString()}</div>
    </div>

    {shortageData.map((woData, idx) => (
      <div key={idx} style={{ marginBottom: '1.25rem', pageBreakInside: 'avoid' }}>
        <div style={{ padding: '6px 10px', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '4px', marginBottom: '4px' }}>
          <strong>WO No: {woData.wo.workOrderNo || woData.wo.woNumber}</strong> &bull; Model: {woData.wo.machineModel} (Qty: {woData.targetQty} Units)
        </div>

        <table className="print-table">
          <thead>
            <tr>
              <th style={{ width: '30px' }}>#</th>
              <th>Component Code</th>
              <th>Component Name</th>
              <th>Source</th>
              <th style={{ width: '80px', textAlign: 'right' }}>Total Req</th>
              <th style={{ width: '80px', textAlign: 'right' }}>In Stock</th>
              <th style={{ width: '85px', textAlign: 'right' }}>Shortage</th>
            </tr>
          </thead>
          <tbody>
            {(woData.components || []).filter((c: any) => c.netShortage > 0).map((comp: any, cIdx: number) => (
              <tr key={cIdx}>
                <td>{cIdx + 1}</td>
                <td style={{ fontFamily: 'monospace', fontWeight: 700, color: '#2563eb' }}>{comp.itemCode}</td>
                <td style={{ fontWeight: 600 }}>{comp.itemName}</td>
                <td>{comp.processType}</td>
                <td style={{ textAlign: 'right' }}>{comp.totalRequired} {comp.unit}</td>
                <td style={{ textAlign: 'right' }}>{comp.inHouseStock} {comp.unit}</td>
                <td style={{ textAlign: 'right', fontWeight: 800, color: '#dc2626' }}>{comp.netShortage} {comp.unit}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ))}

    <GECPrintSignatory preparedBy="PPC Executive" checkedBy="Production Lead" authorizedBy="Works Director" />
  </div>
);

// 3. Purchase Order Bought-Out Shortage Summary
export const POShortagePrintView: React.FC<{
  items: any[];
  filterLabel?: string;
}> = ({
  items,
  filterLabel = 'Bought-Out Purchase Order Shortage'
}) => (
  <div>
    <GECPrintHeader docTitle="BOUGHT-OUT ITEMS PROCUREMENT SHORTAGE REPORT" />

    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontSize: '0.8rem', color: '#4b5563' }}>
      <div>Scope: <strong>{filterLabel}</strong> ({items.length} shortage items)</div>
      <div>Generated: {new Date().toLocaleString()}</div>
    </div>

    <table className="print-table">
      <thead>
        <tr>
          <th style={{ width: '30px' }}>#</th>
          <th style={{ width: '50px', textAlign: 'center' }}>Priority</th>
          <th style={{ width: '60px', textAlign: 'center' }}>Lead Time</th>
          <th>Item Code</th>
          <th>Description</th>
          <th>Class</th>
          <th style={{ width: '80px', textAlign: 'right' }}>Current Stock</th>
          <th style={{ width: '80px', textAlign: 'right' }}>Min / Reorder</th>
          <th style={{ width: '90px', textAlign: 'right' }}>Shortage Qty</th>
          <th style={{ width: '90px', textAlign: 'right' }}>Unit Rate (₹)</th>
        </tr>
      </thead>
      <tbody>
        {items.map((it, idx) => (
          <tr key={idx}>
            <td>{idx + 1}</td>
            <td style={{ textAlign: 'center', fontWeight: 800 }}>{it.priorityRank || `P${idx + 1}`}</td>
            <td style={{ textAlign: 'center' }}>{it.leadTimeDays || it.itemObj?.leadTimeDays || 10}D</td>
            <td style={{ fontFamily: 'monospace', fontWeight: 700, color: '#2563eb' }}>{it.itemCode}</td>
            <td style={{ fontWeight: 600 }}>{it.name || it.itemName}</td>
            <td>{it.category}</td>
            <td style={{ textAlign: 'right' }}>{it.inHouseStock} {it.unit}</td>
            <td style={{ textAlign: 'right' }}>{it.reorderLevel || it.minStockQty || 0} {it.unit}</td>
            <td style={{ textAlign: 'right', fontWeight: 800, color: '#dc2626' }}>{it.netShortage || (Math.max(0, (it.reorderLevel || 0) - it.inHouseStock))} {it.unit}</td>
            <td style={{ textAlign: 'right' }}>₹ {(it.unitPrice || 0).toLocaleString()}</td>
          </tr>
        ))}
      </tbody>
    </table>

    <GECPrintSignatory preparedBy="Purchase Officer" checkedBy="Procurement Lead" authorizedBy="Commercial Director" />
  </div>
);

// 4. Unified Tabular Shortage Print View
export interface TabularShortageRow {
  srNo: number;
  priorityRank?: string;
  leadTimeDays?: number | string;
  itemCode?: string;
  itemDescription: string;
  partCode: string;
  requiredQty: number | string;
  currentStock: number | string;
  minStockQty?: number | string;
  minShortage?: number | string;
  moq?: number | string;
  inPO?: number | string;
  shortage: number | string;
  unit?: string;
  extraInfo?: string;
}

export const TabularShortagePrintView: React.FC<{
  title: string;
  rows: TabularShortageRow[];
  filterLabel?: string;
  showMOQAndInPO?: boolean;
}> = ({
  title,
  rows,
  filterLabel = 'Shortage Summary',
  showMOQAndInPO = true
}) => (
  <div>
    <GECPrintHeader docTitle={title.toUpperCase()} />

    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontSize: '0.8rem', color: '#4b5563' }}>
      <div>Scope: <strong>{filterLabel}</strong> ({rows.length} Shortage Items)</div>
      <div>Generated: {new Date().toLocaleString()}</div>
    </div>

    <table className="print-table">
      <thead>
        <tr>
          <th style={{ width: '35px', textAlign: 'center' }}>Sr No</th>
          <th style={{ width: '50px', textAlign: 'center' }}>Priority</th>
          <th style={{ width: '60px', textAlign: 'center' }}>Lead Time</th>
          <th>Item Code</th>
          <th>Item Description</th>
          <th>Part Code</th>
          <th style={{ width: '85px', textAlign: 'right' }}>Required Qty</th>
          <th style={{ width: '85px', textAlign: 'right' }}>Current Stock</th>
          <th style={{ width: '85px', textAlign: 'right' }}>Min Stock Qty</th>
          <th style={{ width: '85px', textAlign: 'right' }}>Min Level Shortage</th>
          {showMOQAndInPO && <th style={{ width: '70px', textAlign: 'right' }}>MOQ</th>}
          {showMOQAndInPO && <th style={{ width: '70px', textAlign: 'right' }}>In PO</th>}
          <th style={{ width: '85px', textAlign: 'right' }}>Shortage</th>
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr>
            <td colSpan={showMOQAndInPO ? 13 : 11} style={{ textAlign: 'center', padding: '12px', color: '#059669', fontWeight: 600 }}>
              ✓ No active shortage found. All inventory requirements are satisfied!
            </td>
          </tr>
        ) : (
          rows.map((r, idx) => (
            <tr key={idx} style={{ backgroundColor: Number(r.shortage) > 0 ? '#fef2f2' : 'transparent' }}>
              <td style={{ textAlign: 'center' }}>{r.srNo}</td>
              <td style={{ textAlign: 'center', fontWeight: 800 }}>{r.priorityRank || `P${r.srNo}`}</td>
              <td style={{ textAlign: 'center' }}>{r.leadTimeDays || 10}D</td>
              <td style={{ fontFamily: 'monospace', fontWeight: 700, color: '#2563eb' }}>{r.itemCode || r.partCode}</td>
              <td style={{ fontWeight: 600 }}>
                {r.itemDescription}
                {r.extraInfo && <div style={{ fontSize: '0.7rem', color: '#6b7280' }}>{r.extraInfo}</div>}
              </td>
              <td style={{ fontFamily: 'monospace', color: '#4b5563' }}>{r.partCode}</td>
              <td style={{ textAlign: 'right', fontWeight: 600 }}>{r.requiredQty} {r.unit || ''}</td>
              <td style={{ textAlign: 'right' }}>{r.currentStock} {r.unit || ''}</td>
              <td style={{ textAlign: 'right' }}>{r.minStockQty ?? 0} {r.unit || ''}</td>
              <td style={{ textAlign: 'right', fontWeight: Number(r.minShortage) > 0 ? 700 : 400, color: Number(r.minShortage) > 0 ? '#d97706' : '#6b7280' }}>
                {r.minShortage ?? 0} {r.unit || ''}
              </td>
              {showMOQAndInPO && <td style={{ textAlign: 'right' }}>{r.moq || '-'}</td>}
              {showMOQAndInPO && <td style={{ textAlign: 'right', color: '#2563eb' }}>{r.inPO || '0'}</td>}
              <td style={{ textAlign: 'right', fontWeight: 800, color: Number(r.shortage) > 0 ? '#dc2626' : '#059669' }}>
                {r.shortage} {r.unit || ''}
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>

    <GECPrintSignatory preparedBy="Materials Planner" checkedBy="Store & Purchase Lead" authorizedBy="Operations Head" />
  </div>
);
