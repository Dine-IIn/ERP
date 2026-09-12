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
  };
  partCode: string;
  itemCode: string;
  name: string;
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
  const totalRequiredSum = data.reduce((acc, d) => acc + (d.totalRequired || 0), 0);
  const totalShortageSum = data.reduce((acc, d) => acc + (d.shortage || 0), 0);

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
      {/* 14-COLUMN INDUSTRIAL PLANNING DATA TABLE */}
      {/* ------------------------------------------------------------- */}
      <table style={{
        width: '100%',
        borderCollapse: 'collapse',
        fontSize: '9pt',
        border: '1.5px solid #000000',
        tableLayout: 'fixed'
      }}>
        <thead style={{ fontSize: '5.8pt', lineHeight: '1.2', letterSpacing: '-0.01em', textTransform: 'uppercase' }}>
          <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1.5px solid #000000', minHeight: '26px' }}>
            <th style={{ width: '2.5%', padding: '2px 1px', textAlign: 'center', border: '1px solid #94a3b8', fontWeight: 800, verticalAlign: 'middle' }}>#</th>
            <th style={{ width: '9.5%', padding: '4px 1.5px', textAlign: 'left', border: '1px solid #94a3b8', fontWeight: 800, verticalAlign: 'middle' }}>Part<br/>Code</th>
            <th style={{ width: '10%', padding: '4px 1.5px', textAlign: 'left', border: '1px solid #94a3b8', fontWeight: 800, verticalAlign: 'middle' }}>Item<br/>Code</th>
            <th style={{ width: '26%', padding: '4px 2.5px', textAlign: 'left', border: '1px solid #94a3b8', fontWeight: 800, verticalAlign: 'middle' }}>Item<br/>Description</th>
            <th style={{ width: '5%', padding: '4px 1px', textAlign: 'center', border: '1px solid #94a3b8', fontWeight: 800, verticalAlign: 'middle' }}>WO<br/>Req</th>
            <th style={{ width: '6%', padding: '4px 1px', textAlign: 'center', border: '1px solid #94a3b8', fontWeight: 800, verticalAlign: 'middle' }}>Pend<br/>JobCard</th>
            <th style={{ width: '5.5%', padding: '4px 1px', textAlign: 'center', border: '1px solid #94a3b8', fontWeight: 800, verticalAlign: 'middle' }}>Total<br/>Req</th>
            <th style={{ width: '5.5%', padding: '4px 1px', textAlign: 'center', border: '1px solid #94a3b8', fontWeight: 800, verticalAlign: 'middle' }}>Curr<br/>Stock</th>
            <th style={{ width: '5%', padding: '4px 1px', textAlign: 'center', border: '1px solid #94a3b8', fontWeight: 800, verticalAlign: 'middle' }}>Pend<br/>PO</th>
            <th style={{ width: '6%', padding: '4px 1px', textAlign: 'center', border: '1px solid #94a3b8', fontWeight: 800, verticalAlign: 'middle' }}>Pend<br/>JobWork</th>
            <th style={{ width: '5%', padding: '4px 1px', textAlign: 'center', border: '1px solid #94a3b8', fontWeight: 800, verticalAlign: 'middle' }}>Pend<br/>QC</th>
            <th style={{ width: '5.5%', padding: '4px 1px', textAlign: 'center', border: '1px solid #94a3b8', fontWeight: 800, verticalAlign: 'middle' }}>Short<br/>age</th>
            <th style={{ width: '5%', padding: '4px 1px', textAlign: 'center', border: '1px solid #94a3b8', fontWeight: 800, verticalAlign: 'middle' }}>Min<br/>Level</th>
            <th style={{ width: '6.5%', padding: '4px 1px', textAlign: 'center', border: '1px solid #94a3b8', fontWeight: 800, verticalAlign: 'middle' }}>Min Level<br/>Shortage</th>
          </tr>
        </thead>
        <tbody style={{ fontSize: '8.5pt' }}>
          {data.length === 0 ? (
            <tr>
              <td colSpan={14} style={{ textAlign: 'center', padding: '12px', color: '#6b7280', fontStyle: 'italic' }}>
                No items match the active filters or search criteria.
              </td>
            </tr>
          ) : (
            data.map((row, idx) => {
              const hasShortage = (row.shortage || 0) > 0;
              const hasMinShortage = (row.minShortage || 0) > 0;
              const isEven = idx % 2 === 0;

              return (
                <tr 
                  key={row.item?.id || idx}
                  style={{ 
                    backgroundColor: hasShortage ? '#fee2e2' : (isEven ? '#ffffff' : '#f8fafc'),
                    borderBottom: '1px solid #cbd5e1'
                  }}
                >
                  <td style={{ padding: '3.5px 1px', textAlign: 'center', border: '1px solid #cbd5e1', color: '#64748b', fontSize: '8pt', verticalAlign: 'middle' }}>
                    {idx + 1}
                  </td>
                  <td style={{ padding: '3.5px 1.5px', border: '1px solid #cbd5e1', fontFamily: 'monospace', fontWeight: 700, color: '#1e293b', fontSize: '8pt', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                    {row.partCode || '-'}
                  </td>
                  <td style={{ padding: '3.5px 1.5px', border: '1px solid #cbd5e1', fontFamily: 'monospace', fontWeight: 700, color: '#0f172a', fontSize: '8pt', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                    {row.itemCode}
                  </td>
                  <td style={{ 
                    padding: '3.5px 2.5px', 
                    border: '1px solid #cbd5e1', 
                    color: '#000000', 
                    fontWeight: 600, 
                    fontSize: '8pt', 
                    verticalAlign: 'middle',
                    whiteSpace: 'normal',
                    wordBreak: 'break-word',
                    lineHeight: '1.2'
                  }}>
                    {row.name}
                  </td>
                  <td style={{ padding: '3.5px 1px', textAlign: 'right', border: '1px solid #cbd5e1', color: '#334155', verticalAlign: 'middle' }}>
                    {row.pendingWO || 0}
                  </td>
                  <td style={{ padding: '3.5px 1px', textAlign: 'right', border: '1px solid #cbd5e1', color: '#334155', verticalAlign: 'middle' }}>
                    {row.pendingJobCard || 0}
                  </td>
                  <td style={{ padding: '3.5px 1px', textAlign: 'right', border: '1px solid #cbd5e1', fontWeight: 800, color: '#0f172a', verticalAlign: 'middle' }}>
                    {row.totalRequired || 0}
                  </td>
                  <td style={{ padding: '3.5px 1px', textAlign: 'right', border: '1px solid #cbd5e1', fontWeight: 700, color: '#0f172a', verticalAlign: 'middle' }}>
                    {row.currentStock || 0}
                  </td>
                  <td style={{ padding: '3.5px 1px', textAlign: 'right', border: '1px solid #cbd5e1', color: '#334155', verticalAlign: 'middle' }}>
                    {row.pendingPO || 0}
                  </td>
                  <td style={{ padding: '3.5px 1px', textAlign: 'right', border: '1px solid #cbd5e1', color: '#334155', verticalAlign: 'middle' }}>
                    {row.pendingJW || 0}
                  </td>
                  <td style={{ padding: '3.5px 1px', textAlign: 'right', border: '1px solid #cbd5e1', color: '#334155', verticalAlign: 'middle' }}>
                    {row.pendingQC || 0}
                  </td>
                  <td style={{ 
                    padding: '3.5px 1px', 
                    textAlign: 'right', 
                    border: '1px solid #cbd5e1', 
                    fontWeight: 900, 
                    color: hasShortage ? '#b91c1c' : '#15803d',
                    verticalAlign: 'middle'
                  }}>
                    {row.shortage || 0}
                  </td>
                  <td style={{ padding: '3.5px 1px', textAlign: 'right', border: '1px solid #cbd5e1', color: '#475569', verticalAlign: 'middle' }}>
                    {row.minStockLevel || 0}
                  </td>
                  <td style={{ 
                    padding: '3.5px 1px', 
                    textAlign: 'right', 
                    border: '1px solid #cbd5e1', 
                    fontWeight: hasMinShortage ? 800 : 500,
                    color: hasMinShortage ? '#b91c1c' : '#475569',
                    verticalAlign: 'middle'
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
            <tr style={{ backgroundColor: '#e2e8f0', borderTop: '1.5px solid #000000', fontWeight: 800 }}>
              <td colSpan={4} style={{ padding: '3px 2.5px', textAlign: 'right', border: '1px solid #94a3b8' }}>
                TOTALS ({data.length} Items):
              </td>
              <td style={{ padding: '3px 1px', textAlign: 'right', border: '1px solid #94a3b8' }}>
                {data.reduce((s, r) => s + (r.pendingWO || 0), 0)}
              </td>
              <td style={{ padding: '3px 1px', textAlign: 'right', border: '1px solid #94a3b8' }}>
                {data.reduce((s, r) => s + (r.pendingJobCard || 0), 0)}
              </td>
              <td style={{ padding: '3px 1px', textAlign: 'right', border: '1px solid #94a3b8' }}>
                {totalRequiredSum}
              </td>
              <td style={{ padding: '3px 1px', textAlign: 'right', border: '1px solid #94a3b8' }}>
                {data.reduce((s, r) => s + (r.currentStock || 0), 0)}
              </td>
              <td style={{ padding: '3px 1px', textAlign: 'right', border: '1px solid #94a3b8' }}>
                {data.reduce((s, r) => s + (r.pendingPO || 0), 0)}
              </td>
              <td style={{ padding: '3px 1px', textAlign: 'right', border: '1px solid #94a3b8' }}>
                {data.reduce((s, r) => s + (r.pendingJW || 0), 0)}
              </td>
              <td style={{ padding: '3px 1px', textAlign: 'right', border: '1px solid #94a3b8' }}>
                {data.reduce((s, r) => s + (r.pendingQC || 0), 0)}
              </td>
              <td style={{ padding: '3px 1px', textAlign: 'right', border: '1px solid #94a3b8', color: totalShortageSum > 0 ? '#b91c1c' : '#15803d' }}>
                {totalShortageSum}
              </td>
              <td style={{ padding: '3px 1px', textAlign: 'right', border: '1px solid #94a3b8' }}>
                {data.reduce((s, r) => s + (r.minStockLevel || 0), 0)}
              </td>
              <td style={{ padding: '3px 1px', textAlign: 'right', border: '1px solid #94a3b8' }}>
                {data.reduce((s, r) => s + (r.minShortage || 0), 0)}
              </td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
};
