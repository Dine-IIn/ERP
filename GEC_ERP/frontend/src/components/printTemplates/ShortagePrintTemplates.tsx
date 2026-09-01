import React from 'react';
import { GECPrintHeader, GECPrintSignatory } from './WOPrintTemplates';

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
  }>;
}

// 1. Item-Wise Shortage & Capacity Planning Report
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
                <td colSpan={9} style={{ textAlign: 'center', padding: '8px', color: '#6b7280' }}>
                  No BOM sub-components found for this item.
                </td>
              </tr>
            ) : (
              itemPlan.components.map((comp, cIdx) => (
                <tr key={cIdx} style={{ backgroundColor: comp.netShortage > 0 ? '#fef2f2' : 'transparent' }}>
                  <td>{cIdx + 1}</td>
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
            <td style={{ fontFamily: 'monospace', fontWeight: 700, color: '#2563eb' }}>{it.itemCode}</td>
            <td style={{ fontWeight: 600 }}>{it.name}</td>
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
