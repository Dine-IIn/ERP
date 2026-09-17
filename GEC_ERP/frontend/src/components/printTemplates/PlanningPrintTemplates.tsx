import React from 'react';
import './printStyles.css';

export interface PlanningPrintRow {
  item: {
    id: string;
    itemCode: string;
    partCode?: string;
    name: string;
    category?: string;
    unit?: string;
    leadTimeDays?: number;
  };
  partCode: string;
  itemCode: string;
  name: string;
  priorityRank?: string;
  leadTimeDays?: number;
  pendingWO: number;
  pendingJobCard: number;
  totalRequired: number;
  currentStock: number;
  pendingPO: number;
  pendingJW: number;
  pendingQC: number;
  shortage: number;
  minStockLevel: number;
  minShortage: number;
}

export interface PlanningPrintFilters {
  selectedClasses?: string[];
  selectedProcessType?: string;
  searchTerm?: string;
}

interface PlanningPrintReportProps {
  data: PlanningPrintRow[];
  filters?: PlanningPrintFilters;
}

export const PlanningPrintReport: React.FC<PlanningPrintReportProps> = ({ data }) => {
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
      {/* ------------------------------------------------------------- */}
      {/* 16-COLUMN INDUSTRIAL PLANNING DATA TABLE */}
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
            <th style={{ ...thBaseStyle, width: '4.5%', textAlign: 'center' }}>Pri<br/>ority</th>
            <th style={{ ...thBaseStyle, width: '5%', textAlign: 'center' }}>Lead<br/>Time</th>
            <th style={{ ...thBaseStyle, width: '9%', textAlign: 'left' }}>Part<br/>Code</th>
            <th style={{ ...thBaseStyle, width: '9.5%', textAlign: 'left' }}>Item<br/>Code</th>
            <th style={{ ...thBaseStyle, width: '21.5%', textAlign: 'left' }}>Item<br/>Description</th>
            <th style={{ ...thBaseStyle, width: '4.5%', textAlign: 'center' }}>WO<br/>Req</th>
            <th style={{ ...thBaseStyle, width: '5.5%', textAlign: 'center' }}>Pend<br/>JobCard</th>
            <th style={{ ...thBaseStyle, width: '5%', textAlign: 'center' }}>Total<br/>Req</th>
            <th style={{ ...thBaseStyle, width: '5%', textAlign: 'center' }}>Curr<br/>Stock</th>
            <th style={{ ...thBaseStyle, width: '4.5%', textAlign: 'center' }}>Pend<br/>PO</th>
            <th style={{ ...thBaseStyle, width: '5.5%', textAlign: 'center' }}>Pend<br/>JobWork</th>
            <th style={{ ...thBaseStyle, width: '4.5%', textAlign: 'center' }}>Pend<br/>QC</th>
            <th style={{ ...thBaseStyle, width: '5%', textAlign: 'center' }}>Short<br/>age</th>
            <th style={{ ...thBaseStyle, width: '4.5%', textAlign: 'center' }}>Min<br/>Level</th>
            <th style={{ ...thBaseStyle, width: '5.5%', textAlign: 'center' }}>Min Level<br/>Shortage</th>
          </tr>
        </thead>
        <tbody style={{ fontSize: '8.5pt' }}>
          {data.length === 0 ? (
            <tr>
              <td colSpan={16} style={{ textAlign: 'center', padding: '12px', color: '#000000', fontStyle: 'italic', border: '1px solid #000000' }}>
                No items match the active filters or search criteria.
              </td>
            </tr>
          ) : (
            data.map((row, idx) => {
              const hasShortage = (row.shortage || 0) > 0;
              const isEven = idx % 2 === 0;
              const rowBg = hasShortage ? '#fee2e2' : (isEven ? '#ffffff' : '#f8fafc');

              return (
                <tr 
                  key={row.item?.id || idx}
                  style={{ backgroundColor: rowBg }}
                >
                  <td style={{ ...tdBaseStyle, textAlign: 'center', color: '#000000', fontSize: '8pt' }}>
                    {idx + 1}
                  </td>
                  <td style={{ ...tdBaseStyle, textAlign: 'center', fontWeight: 800, color: '#000000', fontSize: '7.5pt' }}>
                    {row.priorityRank || `P${idx + 1}`}
                  </td>
                  <td style={{ ...tdBaseStyle, textAlign: 'center', fontWeight: 600, color: '#000000', fontSize: '7.5pt' }}>
                    {row.leadTimeDays || row.item?.leadTimeDays || 10}D
                  </td>
                  <td style={{ ...tdBaseStyle, textAlign: 'left', fontFamily: 'monospace', fontWeight: 700, color: '#000000', fontSize: '8pt', whiteSpace: 'nowrap' }}>
                    {row.partCode || '-'}
                  </td>
                  <td style={{ ...tdBaseStyle, textAlign: 'left', fontFamily: 'monospace', fontWeight: 700, color: '#000000', fontSize: '8pt', whiteSpace: 'nowrap' }}>
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
                    {row.name}
                  </td>
                  <td style={{ ...tdBaseStyle, textAlign: 'center', color: '#000000' }}>
                    {row.pendingWO || 0}
                  </td>
                  <td style={{ ...tdBaseStyle, textAlign: 'center', color: '#000000' }}>
                    {row.pendingJobCard || 0}
                  </td>
                  <td style={{ ...tdBaseStyle, textAlign: 'center', fontWeight: 800, color: '#000000' }}>
                    {row.totalRequired || 0}
                  </td>
                  <td style={{ ...tdBaseStyle, textAlign: 'center', fontWeight: 700, color: '#000000' }}>
                    {row.currentStock || 0}
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
                    fontWeight: (row.minShortage || 0) > 0 ? 800 : 500,
                    color: '#000000'
                  }}>
                    {row.minShortage || 0}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
};
