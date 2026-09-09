import React, { useState, useMemo } from 'react';
import { useERP } from '../../context/ERPContext';
import { PrintManagerModal } from '../printTemplates/PrintManagerModal';
import { openLiveModuleSheet } from '../../utils/sheetFolderManager';
import { 
  FileSpreadsheet, Search, Printer, RefreshCw, Filter, 
  AlertTriangle, ArrowUpDown, ArrowUp, ArrowDown, Package, Layers, X, CheckSquare, Square
} from 'lucide-react';
import { Item, FIXED_ITEM_CLASSES } from '../../types/erp';
import { useTableKeyboardNav } from '../../hooks/useTableKeyboardNav';

type SortField = 
  | 'partCode' 
  | 'itemCode' 
  | 'pendingPO' 
  | 'pendingWO' 
  | 'pendingJobCard' 
  | 'pendingQC' 
  | 'currentStock' 
  | 'totalRequired' 
  | 'shortage' 
  | 'minStockLevel' 
  | 'minShortage' 
  | 'name' 
  | 'pendingJW';

export const PlanningModule: React.FC = () => {
  const { 
    items, purchaseOrders, workOrders, jobCards, jobworks, boms, qcInspections,
    searchTerm, setSearchTerm 
  } = useERP();

  // Filters State
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [selectedProcessType, setSelectedProcessType] = useState<string>('ALL');
  const [showShortageOnly, setShowShortageOnly] = useState<boolean>(false);

  // Sorting State
  const [sortField, setSortField] = useState<SortField>('shortage');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Print Modal State
  const [printModalOpen, setPrintModalOpen] = useState<boolean>(false);

  const handleSortToggle = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // 1. Calculate Open Demands and Supplies Per Item
  const planningData = useMemo(() => {
    // Active WOs (PLANNED, IN_PROGRESS)
    const activeWOs = workOrders.filter(w => w.status === 'PLANNED' || w.status === 'IN_PROGRESS');

    // Active Job Cards (PENDING, IN_PROGRESS, STAGED)
    const activeJCs = jobCards.filter(j => j.status !== 'COMPLETED' && j.status !== 'CANCELLED');

    // Active POs (ISSUED, SENT, APPROVED, PARTIALLY_RECEIVED, WAITING_FOR_APPROVAL)
    const activePOs = purchaseOrders.filter(p => 
      p.status !== 'CANCELLED' && p.status !== 'GOODS_RECEIVED' && p.status !== 'REJECTED'
    );

    // Active Jobworks (ISSUED, PARTIALLY_RECEIVED)
    const activeJWs = jobworks.filter(j => j.status === 'ISSUED' || j.status === 'PARTIALLY_RECEIVED');

    return items.map(item => {
      const partCode = item.partCode || item.itemCode || '-';
      const itemCode = item.itemCode;
      const name = item.name;
      const currentStock = item.inHouseStock || 0;
      const minStockLevel = item.minStockQty ?? item.reorderLevel ?? 0;

      // 1. Pending PO Quantity
      let pendingPO = 0;
      activePOs.forEach(po => {
        po.items.forEach(pi => {
          if (pi.itemId === item.id || pi.itemCode === item.itemCode) {
            const ord = pi.quantity || pi.orderedQty || 0;
            const rec = pi.receivedQty || 0;
            pendingPO += Math.max(0, ord - rec);
          }
        });
      });

      // 2. Pending WO Demand
      let pendingWO = 0;
      activeWOs.forEach(wo => {
        const remainingWOQty = Math.max(0, (wo.targetQuantity || wo.quantity || 1) - (wo.completedQuantity || 0));
        if (remainingWOQty > 0) {
          const matchedBOM = boms.find(b => b.id === wo.bomId || b.machineModel === wo.machineModel);
          if (matchedBOM && matchedBOM.components) {
            matchedBOM.components.forEach(bi => {
              if (bi.itemId === item.id || bi.itemCode === item.itemCode) {
                pendingWO += (bi.qtyPerMachine || 1) * remainingWOQty;
              }
            });
          }
        }
      });

      // 3. Pending Job Card Demand
      let pendingJobCard = 0;
      activeJCs.forEach(jc => {
        const remainingJCQty = Math.max(0, (jc.targetQuantity || 1) - (jc.completedQuantity || 0));
        if (remainingJCQty > 0) {
          if (jc.itemId === item.id || jc.itemCode === item.itemCode) {
            pendingJobCard += remainingJCQty;
          }
        }
      });

      // 4. Pending QC (Inspection Quarantine)
      let pendingQC = item.pendingQCStock || 0;
      if (pendingQC === 0) {
        // Also check uncompleted QC inspections
        const openQCs = qcInspections.filter(q => 
          (q.itemId === item.id || q.itemCode === item.itemCode) && 
          (q.status === 'PENDING' || q.disposition === 'PENDING' || !q.status)
        );
        pendingQC = openQCs.reduce((sum, q) => sum + Math.max(0, (q.inspectedQuantity || q.inspectedQty || 0) - (q.passedQuantity || q.approvedQty || 0)), 0);
      }

      // 5. Pending Job Work Qty (sent outward to vendors)
      let pendingJW = 0;
      activeJWs.forEach(jw => {
        if (jw.itemId === item.id || jw.itemCode === item.itemCode) {
          pendingJW += (jw.pendingBalance !== undefined ? jw.pendingBalance : (jw.sentQuantity || 0));
        }
      });

      // 6. Total Required (Demand from WO + Job Cards)
      const totalRequired = pendingWO + pendingJobCard;

      // 7. Shortage Formula: max(0, (Total Required + Min Stock Level) - Current Stock)
      const shortage = Math.max(0, (totalRequired + minStockLevel) - currentStock);

      // 8. Min Shortage Formula: max(0, Min Stock Level - Current Stock)
      const minShortage = Math.max(0, minStockLevel - currentStock);

      return {
        item,
        partCode,
        itemCode,
        name,
        category: item.category || 'BO',
        processType: item.processType || 'Bought Out',
        unit: item.unit || 'PCS',
        pendingPO,
        pendingWO,
        pendingJobCard,
        pendingQC,
        currentStock,
        totalRequired,
        shortage,
        minStockLevel,
        minShortage,
        pendingJW
      };
    });
  }, [items, purchaseOrders, workOrders, jobCards, jobworks, boms, qcInspections]);

  // Clean Search Term handling
  const cleanSearchTerm = searchTerm.replace(/@history/gi, '').trim().toLowerCase();

  // Filtered & Sorted Records
  const filteredData = useMemo(() => {
    return planningData
      .filter(row => {
        // Search Filter
        const matchesSearch = !cleanSearchTerm || (
          row.partCode.toLowerCase().includes(cleanSearchTerm) ||
          row.itemCode.toLowerCase().includes(cleanSearchTerm) ||
          row.name.toLowerCase().includes(cleanSearchTerm) ||
          row.category.toLowerCase().includes(cleanSearchTerm)
        );

        // Class Filter
        const matchesClass = selectedClasses.length === 0 || selectedClasses.includes(row.category);

        // Process Type Filter
        let matchesProcess = true;
        if (selectedProcessType !== 'ALL') {
          const p = (row.processType || '').toLowerCase();
          if (selectedProcessType === 'BO') matchesProcess = p.includes('brought out') || p.includes('bought out') || row.category === 'BO';
          else if (selectedProcessType === 'JW') matchesProcess = p.includes('job work') || p.includes('jobwork');
          else if (selectedProcessType === 'IH') matchesProcess = p.includes('in-house') || p.includes('inhouse') || ['MF', 'AS', 'SA', 'FG'].includes(row.category);
        }

        // Shortage Only Toggle
        const matchesShortageOnly = !showShortageOnly || row.shortage > 0 || row.minShortage > 0;

        return matchesSearch && matchesClass && matchesProcess && matchesShortageOnly;
      })
      .sort((a, b) => {
        let valA: any = a[sortField];
        let valB: any = b[sortField];

        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();

        if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
  }, [planningData, cleanSearchTerm, selectedClasses, selectedProcessType, showShortageOnly, sortField, sortOrder]);

  const { selectedIndex, setSelectedIndex } = useTableKeyboardNav(filteredData, () => {});

  const toggleClassFilter = (code: string) => {
    setSelectedClasses(prev => 
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    );
  };

  const handleRefreshLiveSheet = () => {
    const data = filteredData.map(r => ({
      partCode: r.partCode,
      itemCode: r.itemCode,
      name: r.name,
      category: r.category,
      pendingPO: r.pendingPO,
      pendingWO: r.pendingWO,
      pendingJobCard: r.pendingJobCard,
      pendingQC: r.pendingQC,
      currentStock: r.currentStock,
      totalRequired: r.totalRequired,
      shortage: r.shortage,
      minStockLevel: r.minStockLevel,
      minShortage: r.minShortage,
      pendingJW: r.pendingJW,
      unit: r.unit
    }));

    const headers: { key: keyof typeof data[0]; label: string }[] = [
      { key: 'partCode', label: 'Part Code' },
      { key: 'itemCode', label: 'Item Code' },
      { key: 'pendingPO', label: 'Pending PO' },
      { key: 'pendingWO', label: 'Pending WO' },
      { key: 'pendingJobCard', label: 'Pending Job Card' },
      { key: 'pendingQC', label: 'Pending QC (Inspection)' },
      { key: 'currentStock', label: 'Current Stock' },
      { key: 'totalRequired', label: 'Total Required' },
      { key: 'shortage', label: 'Shortage' },
      { key: 'minStockLevel', label: 'Min Stock Level' },
      { key: 'minShortage', label: 'Min Shortage' },
      { key: 'name', label: 'Item Description' },
      { key: 'pendingJW', label: 'Pending Job Work Qty' },
      { key: 'unit', label: 'UOM' }
    ];

    openLiveModuleSheet('PLANNING', 'GEC_ERP_Planning_Demand_Matrix_Live', data, headers);
  };

  // Summary KPI statistics
  const totalShortageItemsCount = useMemo(() => {
    return planningData.filter(d => d.shortage > 0).length;
  }, [planningData]);

  const totalMinShortageItemsCount = useMemo(() => {
    return planningData.filter(d => d.minShortage > 0).length;
  }, [planningData]);

  return (
    <div className="module-layout-container" style={{ flex: 1, minHeight: 0, height: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingRight: '0.25rem' }}>
      {/* Top Header */}
      <div className="sticky-module-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '0.375rem',
            backgroundColor: 'var(--accent-primary)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <FileSpreadsheet size={18} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)', lineHeight: 1.1 }}>
              Material & Production Planning Matrix
            </h2>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              Complete Cross-Module Material Demand, Open Orders & Capacity Planning ({filteredData.length} items)
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <button type="button" className="btn btn-outline" onClick={handleRefreshLiveSheet} title="Sync and view live CSV spreadsheet">
            <RefreshCw size={14} /> Live Sheet
          </button>
          <button type="button" className="btn btn-primary" onClick={() => setPrintModalOpen(true)} title="Print formatted planning table">
            <Printer size={14} /> Print Planning Report
          </button>
        </div>
      </div>

      {/* KPI Badges */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
        <div className="card" style={{ padding: '0.65rem 0.85rem', backgroundColor: 'var(--bg-card)', borderLeft: '4px solid var(--accent-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Active Items</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>{planningData.length}</div>
          </div>
          <Package size={22} color="var(--accent-primary)" />
        </div>

        <div className="card" style={{ padding: '0.65rem 0.85rem', backgroundColor: 'var(--bg-card)', borderLeft: '4px solid var(--danger)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Production Shortage Items</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--danger)' }}>{totalShortageItemsCount}</div>
          </div>
          <AlertTriangle size={22} color="var(--danger)" />
        </div>

        <div className="card" style={{ padding: '0.65rem 0.85rem', backgroundColor: 'var(--bg-card)', borderLeft: '4px solid #f59e0b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Min Stock Shortages</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#f59e0b' }}>{totalMinShortageItemsCount}</div>
          </div>
          <Layers size={22} color="#f59e0b" />
        </div>
      </div>

      {/* Filter Control Bar */}
      <div className="card" style={{ padding: '0.75rem 1rem', backgroundColor: 'var(--bg-card)', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
          {/* Search Box */}
          <div style={{ position: 'relative', width: '360px', maxWidth: '100%' }}>
            <Search size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search Part code, Item code, Description..."
              className="input-field"
              style={{ paddingLeft: '2.25rem', fontSize: '0.82rem' }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Process Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Process:</span>
            <select
              className="input-field"
              style={{ fontSize: '0.78rem', padding: '0.28rem 0.6rem', width: 'auto' }}
              value={selectedProcessType}
              onChange={(e) => setSelectedProcessType(e.target.value)}
            >
              <option value="ALL">All Processes</option>
              <option value="BO">Bought Out Only</option>
              <option value="JW">Job Work Only</option>
              <option value="IH">In-House Manufacturing</option>
            </select>
          </div>

          {/* Shortage Only Switch */}
          <button
            type="button"
            className={`btn ${showShortageOnly ? 'btn-primary' : 'btn-outline'}`}
            style={{ padding: '0.3rem 0.65rem', fontSize: '0.78rem', gap: '0.4rem', fontWeight: 600 }}
            onClick={() => setShowShortageOnly(prev => !prev)}
          >
            {showShortageOnly ? <CheckSquare size={14} /> : <Square size={14} />}
            Show Shortages Only
          </button>

          {(selectedClasses.length > 0 || selectedProcessType !== 'ALL' || showShortageOnly || searchTerm) && (
            <button
              type="button"
              className="btn btn-outline"
              style={{ padding: '0.3rem 0.5rem', fontSize: '0.75rem', color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.4)' }}
              onClick={() => {
                setSelectedClasses([]);
                setSelectedProcessType('ALL');
                setShowShortageOnly(false);
                setSearchTerm('');
              }}
            >
              <X size={13} /> Reset Filters
            </button>
          )}
        </div>

        {/* Category / Class Badges Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap', borderTop: '1px solid var(--border-color)', paddingTop: '0.5rem' }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', marginRight: '0.25rem' }}>
            <Filter size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '3px' }} /> Class:
          </span>
          {FIXED_ITEM_CLASSES.map(cls => {
            const isSelected = selectedClasses.includes(cls.code);
            return (
              <button
                key={cls.code}
                type="button"
                onClick={() => toggleClassFilter(cls.code)}
                style={{
                  padding: '0.15rem 0.45rem',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  borderRadius: '0.25rem',
                  border: isSelected ? '1px solid var(--accent-primary)' : '1px solid var(--border-color)',
                  backgroundColor: isSelected ? 'var(--accent-primary)' : 'var(--bg-subtle, rgba(0,0,0,0.03))',
                  color: isSelected ? '#ffffff' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                title={cls.name}
              >
                {cls.code}
              </button>
            );
          })}
        </div>
      </div>

      {/* 13-Column Planning Table */}
      <div className="table-container" style={{ flex: 1, minHeight: '350px', backgroundColor: 'var(--bg-card)' }}>
        <table>
          <thead>
            <tr>
              <th onClick={() => handleSortToggle('partCode')} style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  Part Code {sortField === 'partCode' ? (sortOrder === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={11} color="var(--text-muted)" />}
                </div>
              </th>
              <th onClick={() => handleSortToggle('itemCode')} style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  Item Code {sortField === 'itemCode' ? (sortOrder === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={11} color="var(--text-muted)" />}
                </div>
              </th>
              <th onClick={() => handleSortToggle('name')} style={{ cursor: 'pointer', minWidth: '220px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  Item Description {sortField === 'name' ? (sortOrder === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={11} color="var(--text-muted)" />}
                </div>
              </th>
              <th onClick={() => handleSortToggle('currentStock')} style={{ cursor: 'pointer', textAlign: 'right', whiteSpace: 'nowrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.25rem' }}>
                  Current Stock {sortField === 'currentStock' ? (sortOrder === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={11} color="var(--text-muted)" />}
                </div>
              </th>
              <th onClick={() => handleSortToggle('pendingPO')} style={{ cursor: 'pointer', textAlign: 'right', whiteSpace: 'nowrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.25rem' }}>
                  Pending PO {sortField === 'pendingPO' ? (sortOrder === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={11} color="var(--text-muted)" />}
                </div>
              </th>
              <th onClick={() => handleSortToggle('pendingWO')} style={{ cursor: 'pointer', textAlign: 'right', whiteSpace: 'nowrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.25rem' }}>
                  Pending WO {sortField === 'pendingWO' ? (sortOrder === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={11} color="var(--text-muted)" />}
                </div>
              </th>
              <th onClick={() => handleSortToggle('pendingJobCard')} style={{ cursor: 'pointer', textAlign: 'right', whiteSpace: 'nowrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.25rem' }}>
                  Pending Job Card {sortField === 'pendingJobCard' ? (sortOrder === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={11} color="var(--text-muted)" />}
                </div>
              </th>
              <th onClick={() => handleSortToggle('pendingQC')} style={{ cursor: 'pointer', textAlign: 'right', whiteSpace: 'nowrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.25rem' }}>
                  Pending QC (Inspection) {sortField === 'pendingQC' ? (sortOrder === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={11} color="var(--text-muted)" />}
                </div>
              </th>
              <th onClick={() => handleSortToggle('pendingJW')} style={{ cursor: 'pointer', textAlign: 'right', whiteSpace: 'nowrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.25rem' }}>
                  Pending Job Work Qty {sortField === 'pendingJW' ? (sortOrder === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={11} color="var(--text-muted)" />}
                </div>
              </th>
              <th onClick={() => handleSortToggle('totalRequired')} style={{ cursor: 'pointer', textAlign: 'right', whiteSpace: 'nowrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.25rem' }}>
                  Total Required {sortField === 'totalRequired' ? (sortOrder === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={11} color="var(--text-muted)" />}
                </div>
              </th>
              <th onClick={() => handleSortToggle('minStockLevel')} style={{ cursor: 'pointer', textAlign: 'right', whiteSpace: 'nowrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.25rem' }}>
                  Min Stock Level {sortField === 'minStockLevel' ? (sortOrder === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={11} color="var(--text-muted)" />}
                </div>
              </th>
              <th onClick={() => handleSortToggle('shortage')} style={{ cursor: 'pointer', textAlign: 'right', whiteSpace: 'nowrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.25rem' }}>
                  Shortage {sortField === 'shortage' ? (sortOrder === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={11} color="var(--text-muted)" />}
                </div>
              </th>
              <th onClick={() => handleSortToggle('minShortage')} style={{ cursor: 'pointer', textAlign: 'right', whiteSpace: 'nowrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.25rem' }}>
                  Min Shortage {sortField === 'minShortage' ? (sortOrder === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={11} color="var(--text-muted)" />}
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredData.length === 0 ? (
              <tr>
                <td colSpan={13} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                  <Package size={36} style={{ margin: '0 auto 0.5rem', opacity: 0.4 }} />
                  <div style={{ fontWeight: 600 }}>No planning records found matching active filters.</div>
                </td>
              </tr>
            ) : (
              filteredData.map((row, idx) => {
                const isNavSelected = selectedIndex === idx;
                const hasShortage = row.shortage > 0;
                const hasMinShortage = row.minShortage > 0;

                return (
                  <tr
                    key={row.item.id}
                    onClick={() => setSelectedIndex(idx)}
                    style={{
                      backgroundColor: isNavSelected 
                        ? 'rgba(37, 99, 235, 0.12)' 
                        : (hasShortage ? 'rgba(239, 68, 68, 0.03)' : undefined),
                      cursor: 'pointer'
                    }}
                  >
                    {/* Part Code */}
                    <td style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                      {row.partCode}
                    </td>

                    {/* Item Code */}
                    <td style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--accent-primary)', fontSize: '0.82rem' }}>
                      {row.itemCode}
                    </td>

                    {/* Item Description */}
                    <td>
                      <div style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--text-primary)' }}>
                        {row.name}
                      </div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                        Class: <span style={{ fontWeight: 700 }}>{row.category}</span> &bull; {row.processType}
                      </div>
                    </td>

                    {/* Current Stock */}
                    <td style={{ textAlign: 'right', fontWeight: 700, fontSize: '0.82rem' }}>
                      <span style={{ color: row.currentStock === 0 ? 'var(--danger)' : 'var(--text-primary)' }}>
                        {row.currentStock} {row.unit}
                      </span>
                    </td>

                    {/* Pending PO */}
                    <td style={{ textAlign: 'right', fontSize: '0.82rem' }}>
                      {row.pendingPO > 0 ? (
                        <span style={{ color: '#2563eb', fontWeight: 700 }}>+{row.pendingPO}</span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>0</span>
                      )}
                    </td>

                    {/* Pending WO */}
                    <td style={{ textAlign: 'right', fontSize: '0.82rem' }}>
                      {row.pendingWO > 0 ? (
                        <span style={{ color: '#d97706', fontWeight: 600 }}>{row.pendingWO}</span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>0</span>
                      )}
                    </td>

                    {/* Pending Job Card */}
                    <td style={{ textAlign: 'right', fontSize: '0.82rem' }}>
                      {row.pendingJobCard > 0 ? (
                        <span style={{ color: '#7c3aed', fontWeight: 600 }}>{row.pendingJobCard}</span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>0</span>
                      )}
                    </td>

                    {/* Pending QC (Inspection) */}
                    <td style={{ textAlign: 'right', fontSize: '0.82rem' }}>
                      {row.pendingQC > 0 ? (
                        <span style={{ color: '#0891b2', fontWeight: 700, backgroundColor: 'rgba(8, 145, 178, 0.08)', padding: '0.15rem 0.4rem', borderRadius: '0.25rem' }}>
                          {row.pendingQC}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>0</span>
                      )}
                    </td>

                    {/* Pending Job Work Qty */}
                    <td style={{ textAlign: 'right', fontSize: '0.82rem' }}>
                      {row.pendingJW > 0 ? (
                        <span style={{ color: '#059669', fontWeight: 600 }}>{row.pendingJW}</span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>0</span>
                      )}
                    </td>

                    {/* Total Required */}
                    <td style={{ textAlign: 'right', fontWeight: 700, fontSize: '0.82rem', color: 'var(--text-primary)' }}>
                      {row.totalRequired}
                    </td>

                    {/* Min Stock Level */}
                    <td style={{ textAlign: 'right', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                      {row.minStockLevel}
                    </td>

                    {/* Shortage */}
                    <td style={{ textAlign: 'right', fontSize: '0.82rem' }}>
                      {row.shortage > 0 ? (
                        <span style={{ 
                          color: '#ffffff', 
                          backgroundColor: 'var(--danger)', 
                          padding: '0.2rem 0.5rem', 
                          borderRadius: '0.25rem', 
                          fontWeight: 800 
                        }}>
                          {row.shortage}
                        </span>
                      ) : (
                        <span style={{ color: '#16a34a', fontWeight: 600 }}>OK (0)</span>
                      )}
                    </td>

                    {/* Min Shortage */}
                    <td style={{ textAlign: 'right', fontSize: '0.82rem' }}>
                      {row.minShortage > 0 ? (
                        <span style={{ 
                          color: '#b45309', 
                          backgroundColor: 'rgba(245, 158, 11, 0.15)', 
                          padding: '0.15rem 0.45rem', 
                          borderRadius: '0.25rem', 
                          fontWeight: 700 
                        }}>
                          {row.minShortage}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>0</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Print Manager Modal */}
      {printModalOpen && (
        <PrintManagerModal
          isOpen={printModalOpen}
          onClose={() => setPrintModalOpen(false)}
          title="Planning & Material Demand Matrix"
        >
          <div style={{ padding: '1.5rem', color: '#000000', backgroundColor: '#ffffff', fontFamily: 'sans-serif' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #000000', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
              <div>
                <h1 style={{ fontSize: '1.4rem', fontWeight: 900, margin: 0 }}>GEC PLASTICS & MOULDING MACHINERY</h1>
                <h2 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0.2rem 0 0 0', color: '#2563eb' }}>
                  Material & Production Planning Demand Report
                </h2>
                <div style={{ fontSize: '0.75rem', color: '#555555', marginTop: '0.25rem' }}>
                  Generated on: {new Date().toLocaleString()} &bull; Total Filtered Items: {filteredData.length}
                </div>
              </div>
              <div style={{ textAlign: 'right', fontSize: '0.75rem', color: '#555555' }}>
                <div>Production Planning & Inventory Control</div>
                <div>Class Filter: {selectedClasses.length > 0 ? selectedClasses.join(', ') : 'ALL'}</div>
                <div>Process: {selectedProcessType}</div>
              </div>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.68rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1.5px solid #000000' }}>
                  <th style={{ padding: '4px', textAlign: 'left', border: '1px solid #cbd5e1' }}>Part Code</th>
                  <th style={{ padding: '4px', textAlign: 'left', border: '1px solid #cbd5e1' }}>Item Code</th>
                  <th style={{ padding: '4px', textAlign: 'left', border: '1px solid #cbd5e1' }}>Description</th>
                  <th style={{ padding: '4px', textAlign: 'right', border: '1px solid #cbd5e1' }}>Curr Stock</th>
                  <th style={{ padding: '4px', textAlign: 'right', border: '1px solid #cbd5e1' }}>Pend PO</th>
                  <th style={{ padding: '4px', textAlign: 'right', border: '1px solid #cbd5e1' }}>Pend WO</th>
                  <th style={{ padding: '4px', textAlign: 'right', border: '1px solid #cbd5e1' }}>Pend JC</th>
                  <th style={{ padding: '4px', textAlign: 'right', border: '1px solid #cbd5e1' }}>Pend QC</th>
                  <th style={{ padding: '4px', textAlign: 'right', border: '1px solid #cbd5e1' }}>Pend JW</th>
                  <th style={{ padding: '4px', textAlign: 'right', border: '1px solid #cbd5e1' }}>Tot Req</th>
                  <th style={{ padding: '4px', textAlign: 'right', border: '1px solid #cbd5e1' }}>Min Stk</th>
                  <th style={{ padding: '4px', textAlign: 'right', border: '1px solid #cbd5e1' }}>Shortage</th>
                  <th style={{ padding: '4px', textAlign: 'right', border: '1px solid #cbd5e1' }}>Min Short</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map(row => (
                  <tr key={row.item.id} style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: row.shortage > 0 ? '#fee2e2' : undefined }}>
                    <td style={{ padding: '4px', border: '1px solid #cbd5e1', fontFamily: 'monospace' }}>{row.partCode}</td>
                    <td style={{ padding: '4px', border: '1px solid #cbd5e1', fontFamily: 'monospace', fontWeight: 700 }}>{row.itemCode}</td>
                    <td style={{ padding: '4px', border: '1px solid #cbd5e1' }}>{row.name}</td>
                    <td style={{ padding: '4px', textAlign: 'right', border: '1px solid #cbd5e1', fontWeight: 700 }}>{row.currentStock}</td>
                    <td style={{ padding: '4px', textAlign: 'right', border: '1px solid #cbd5e1' }}>{row.pendingPO}</td>
                    <td style={{ padding: '4px', textAlign: 'right', border: '1px solid #cbd5e1' }}>{row.pendingWO}</td>
                    <td style={{ padding: '4px', textAlign: 'right', border: '1px solid #cbd5e1' }}>{row.pendingJobCard}</td>
                    <td style={{ padding: '4px', textAlign: 'right', border: '1px solid #cbd5e1' }}>{row.pendingQC}</td>
                    <td style={{ padding: '4px', textAlign: 'right', border: '1px solid #cbd5e1' }}>{row.pendingJW}</td>
                    <td style={{ padding: '4px', textAlign: 'right', border: '1px solid #cbd5e1', fontWeight: 700 }}>{row.totalRequired}</td>
                    <td style={{ padding: '4px', textAlign: 'right', border: '1px solid #cbd5e1' }}>{row.minStockLevel}</td>
                    <td style={{ padding: '4px', textAlign: 'right', border: '1px solid #cbd5e1', fontWeight: 800, color: row.shortage > 0 ? '#dc2626' : '#16a34a' }}>{row.shortage}</td>
                    <td style={{ padding: '4px', textAlign: 'right', border: '1px solid #cbd5e1' }}>{row.minShortage}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </PrintManagerModal>
      )}
    </div>
  );
};
