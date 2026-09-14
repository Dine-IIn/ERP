import React, { useState, useMemo } from 'react';
import { useERP } from '../../context/ERPContext';
import { PrintManagerModal } from '../printTemplates/PrintManagerModal';
import { PlanningPrintReport } from '../printTemplates/PlanningPrintTemplates';
import { 
  FileSpreadsheet, Search, Printer, RefreshCw, Filter, 
  AlertTriangle, ArrowUpDown, ArrowUp, ArrowDown, Package, Layers, X, CheckSquare, Square, Eye
} from 'lucide-react';
import { Item, FIXED_ITEM_CLASSES, WorkOrder, BOM, JobCard, PurchaseOrder, JobworkChallan } from '../../types/erp';
import { useTableKeyboardNav } from '../../hooks/useTableKeyboardNav';

type SortField = 
  | 'partCode' 
  | 'itemCode' 
  | 'name'
  | 'pendingWO' 
  | 'pendingJobCard' 
  | 'totalRequired' 
  | 'currentStock' 
  | 'pendingPO' 
  | 'pendingJW'
  | 'pendingQC' 
  | 'shortage' 
  | 'minStockLevel' 
  | 'minShortage';

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

  // Keyboard navigation
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);

  const handleSortToggle = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const toggleClassFilter = (code: string) => {
    setSelectedClasses(prev => 
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    );
  };

  // -------------------------------------------------------------
  // LIVE CALCULATION OF DEMANDS AND PIPELINE SUPPLIES
  // -------------------------------------------------------------
  const planningData = useMemo(() => {
    // 1. Active Work Orders (any WO not fully completed or cancelled)
    const activeWOs = workOrders.filter(w => 
      w.status !== 'COMPLETED' && w.status !== 'CANCELLED' && !(w as any).isDeleted
    );

    // 2. Active Job Cards (any JC not completed or cancelled)
    const activeJCs = jobCards.filter(j => 
      j.status !== 'COMPLETED' && j.status !== 'CANCELLED' && !(j as any).isDeleted
    );

    // 3. Active Purchase Orders (undelivered open orders)
    const activePOs = purchaseOrders.filter(p => 
      p.status !== 'CANCELLED' && p.status !== 'GOODS_RECEIVED' && p.status !== 'REJECTED' && !(p as any).isDeleted
    );

    // 4. Active Jobworks (outward material with vendors)
    const activeJWs = jobworks.filter(j => 
      j.status !== 'COMPLETED' && j.status !== 'CANCELLED' && !(j as any).isDeleted
    );

    // Helper: Multi-level Tree/Graph BOM demand explosion with shortage pruning
    const calculateWOItemDemand = (targetItemId: string, targetItemCode: string) => {
      let totalDemand = 0;

      const explodeDemand = (
        components: Array<{ itemId?: string; itemCode?: string; qtyPerMachine?: number; qtyRequired?: number }>,
        parentMultiplier: number,
        visited: Set<string>
      ) => {
        components.forEach(comp => {
          const cItemId = comp.itemId || '';
          const cItemCode = comp.itemCode || '';
          const qtyPer = comp.qtyPerMachine !== undefined ? comp.qtyPerMachine : (comp.qtyRequired || 1);
          const requiredQtyForThisParent = qtyPer * parentMultiplier;

          // 1. Direct requirement for this component at the current BOM level
          if (
            (targetItemId && cItemId && cItemId === targetItemId) ||
            (targetItemCode && cItemCode && cItemCode.toLowerCase() === targetItemCode.toLowerCase())
          ) {
            totalDemand += requiredQtyForThisParent;
          }

          // 2. Check for nested sub-assembly BOM (e.g. Sub-assemblies / in-house manufactured parts)
          const childItem = items.find(i => 
            (cItemId && i.id === cItemId) || 
            (cItemCode && i.itemCode.toLowerCase() === cItemCode.toLowerCase())
          );

          if (childItem) {
            const subBOM = boms.find(b => 
              b.id === childItem.id || 
              b.bomCode?.toLowerCase() === childItem.itemCode.toLowerCase() || 
              b.machineModel?.toLowerCase() === childItem.name?.toLowerCase()
            );

            if (subBOM && subBOM.components && subBOM.components.length > 0 && !visited.has(subBOM.id)) {
              // Calculate available supply for this intermediate component:
              // Physical store stock + Active Job Cards in production + Active Jobwork in progress
              const childStock = childItem.inHouseStock || 0;
              
              const childActiveJC = activeJCs.reduce((sum, jc) => {
                if (
                  (jc.itemId && jc.itemId === childItem.id) ||
                  (jc.itemCode && jc.itemCode.toLowerCase() === childItem.itemCode.toLowerCase())
                ) {
                  return sum + Math.max(0, (jc.targetQuantity || 1) - (jc.completedQuantity || 0));
                }
                return sum;
              }, 0);

              const childActiveJW = activeJWs.reduce((sum, jw) => {
                if (
                  (jw.itemId && jw.itemId === childItem.id) ||
                  (jw.itemCode && jw.itemCode.toLowerCase() === childItem.itemCode.toLowerCase())
                ) {
                  return sum + (jw.pendingBalance !== undefined ? jw.pendingBalance : (jw.sentQuantity || 0));
                }
                return sum;
              }, 0);

              const availableChildSupply = childStock + childActiveJC + childActiveJW;

              // Net unfulfilled shortage of this intermediate sub-assembly
              const childShortage = Math.max(0, requiredQtyForThisParent - availableChildSupply);

              // TREE PRUNING: If shortage == 0 (supply covers requirement), do NOT explode below childItem!
              // If shortage > 0, explode sub-BOM only for the unfulfilled shortage quantity.
              if (childShortage > 0) {
                const nextVisited = new Set(visited);
                nextVisited.add(subBOM.id);
                explodeDemand(subBOM.components, childShortage, nextVisited);
              }
            }
          }
        });
      };

      activeWOs.forEach(wo => {
        const remainingWOQty = Math.max(0, (wo.targetQuantity || wo.quantity || 1) - (wo.completedQuantity || 0));
        if (remainingWOQty <= 0) return;

        if (wo.woComponents && wo.woComponents.length > 0) {
          explodeDemand(
            wo.woComponents.map(c => ({
              itemId: c.itemId,
              itemCode: c.itemCode,
              qtyPerMachine: c.qtyRequired ? c.qtyRequired / (wo.quantity || wo.targetQuantity || 1) : 1
            })),
            remainingWOQty,
            new Set()
          );
        } else {
          const matchedBOM = boms.find(b => 
            b.id === wo.bomId || 
            b.bomCode === (wo as any).bomCode || 
            b.machineModel?.toLowerCase() === wo.machineModel?.toLowerCase()
          );
          if (matchedBOM && matchedBOM.components) {
            explodeDemand(matchedBOM.components, remainingWOQty, new Set([matchedBOM.id]));
          }
        }
      });

      return totalDemand;
    };

    return items.map(item => {
      const partCode = item.partCode || '-';
      const itemCode = item.itemCode;
      const name = item.name;
      const currentStock = item.inHouseStock || 0;
      const minStockLevel = item.minStockQty !== undefined ? item.minStockQty : (item.reorderLevel || 0);

      // 1. Pending PO Quantity (Undelivered line items)
      let pendingPO = 0;
      activePOs.forEach(po => {
        po.items.forEach(pi => {
          if (
            (pi.itemId && pi.itemId === item.id) ||
            (pi.itemCode && pi.itemCode.toLowerCase() === item.itemCode.toLowerCase())
          ) {
            const ord = pi.quantity || pi.orderedQty || 0;
            const rec = pi.receivedQty || 0;
            pendingPO += Math.max(0, ord - rec);
          }
        });
      });

      // 2. Pending WO Demand (Live multi-level BOM explosion from active Work Orders)
      const pendingWO = calculateWOItemDemand(item.id, item.itemCode);

      // 3. Pending Job Card (Quantity of this item currently in production / being assembled on active Job Cards)
      const pendingJobCard = activeJCs.reduce((sum, jc) => {
        if (
          (jc.itemId && jc.itemId === item.id) ||
          (jc.itemCode && jc.itemCode.toLowerCase() === item.itemCode.toLowerCase())
        ) {
          return sum + Math.max(0, (jc.targetQuantity || 1) - (jc.completedQuantity || 0));
        }
        return sum;
      }, 0);

      // 4. Pending QC (Live from active QC inspection queue)
      const openQCs = qcInspections.filter(q => 
        ((q.itemId && q.itemId === item.id) || (q.itemCode && q.itemCode.toLowerCase() === item.itemCode.toLowerCase())) && 
        (q.status === 'IN_INSPECTION' || (q.status as string) === 'PENDING' || q.disposition === 'PENDING' || !q.status)
      );
      const pendingQC = openQCs.reduce((sum, q) => {
        const inspected = q.inspectedQuantity || q.inspectedQty || 0;
        const passed = q.passedQuantity || q.approvedQty || 0;
        const rejected = q.rejectedQty || (q as any).rejectedQuantity || 0;
        return sum + Math.max(0, inspected - passed - rejected);
      }, 0);

      // 5. Pending Job Work Qty (Outward with processing vendors)
      let pendingJW = 0;
      activeJWs.forEach(jw => {
        if (
          (jw.itemId && jw.itemId === item.id) ||
          (jw.itemCode && jw.itemCode.toLowerCase() === item.itemCode.toLowerCase())
        ) {
          pendingJW += (jw.pendingBalance !== undefined ? jw.pendingBalance : (jw.sentQuantity || 0));
        }
      });

      // 6. Total Required = Pending WO (Job Card is creating this item, not demanding it)
      const totalRequired = pendingWO;

      // 7. Shortage = max(0, Total Required - Current Stock)
      const shortage = Math.max(0, totalRequired - currentStock);

      // 8. Min Level Shortage = max(0, (Total Required + Min Level) - Current Stock)
      const minShortage = Math.max(0, (totalRequired + minStockLevel) - currentStock);

      // Process source representation
      const pSources: string[] = item.materialProcessSources && item.materialProcessSources.length > 0
        ? item.materialProcessSources
        : item.processType
        ? [item.processType]
        : ['In-house'];

      return {
        item,
        partCode,
        itemCode,
        name,
        category: item.category || 'BO',
        processType: pSources.join(', '),
        unit: item.unit || 'PCS',
        pendingWO,
        pendingJobCard,
        totalRequired,
        currentStock,
        pendingPO,
        pendingJW,
        pendingQC,
        shortage,
        minStockLevel,
        minShortage
      };
    });
  }, [items, purchaseOrders, workOrders, jobCards, jobworks, boms, qcInspections]);

  // Clean Search Term handling
  const cleanSearchTerm = searchTerm.replace(/@history|@deleted/gi, '').replace(/^@/g, '').trim().toLowerCase();

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

        // Process Source Filter
        let matchesProcess = true;
        if (selectedProcessType !== 'ALL') {
          const p = row.processType.toLowerCase();
          if (selectedProcessType === 'BO') matchesProcess = p.includes('bought out') || row.category === 'BO';
          if (selectedProcessType === 'JW') matchesProcess = p.includes('job work');
          if (selectedProcessType === 'IH') matchesProcess = p.includes('in-house') || row.category === 'MF' || row.category === 'AS';
        }

        // Shortage Switch
        const matchesShortage = !showShortageOnly || row.shortage > 0 || row.minShortage > 0;

        return matchesSearch && matchesClass && matchesProcess && matchesShortage;
      })
      .sort((a, b) => {
        let valA: any = a[sortField];
        let valB: any = b[sortField];

        if (typeof valA === 'string') {
          valA = valA.toLowerCase();
          valB = valB.toLowerCase();
        }

        if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
  }, [planningData, cleanSearchTerm, selectedClasses, selectedProcessType, showShortageOnly, sortField, sortOrder]);

  const totalShortageItemsCount = planningData.filter(d => d.shortage > 0).length;
  const totalMinShortageItemsCount = planningData.filter(d => d.minShortage > 0).length;

  const handleQuickPrint = () => {
    window.print();
  };

  return (
    <div className="module-layout-container" style={{ flex: 1, minHeight: 0, height: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingRight: '0.25rem' }}>
      {/* Top Header */}
      <div className="sticky-module-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ 
            width: '36px', 
            height: '36px', 
            borderRadius: '0.5rem', 
            backgroundColor: 'var(--accent-primary)', 
            color: '#ffffff',
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center' 
          }}>
            <FileSpreadsheet size={18} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)', lineHeight: 1.1 }}>
              Material & Production Planning Matrix
            </h2>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Live Cross-Module Material Demand, Open Orders & Capacity Planning ({filteredData.length} items)
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <button 
            type="button" 
            className="btn btn-primary" 
            onClick={handleQuickPrint} 
            title="Print Planning Report (Choose Landscape or Portrait in dialog)"
            style={{ fontSize: '0.8rem', padding: '0.45rem 0.85rem' }}
          >
            <Printer size={15} /> Print Planning Report
          </button>

        </div>
      </div>

      {/* KPI Badges */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
        <div className="card" style={{ padding: '0.65rem 0.85rem', backgroundColor: 'var(--bg-card)', borderLeft: '4px solid var(--accent-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Items</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>{planningData.length}</div>
          </div>
          <Package size={22} color="var(--accent-primary)" />
        </div>

        <div className="card" style={{ padding: '0.65rem 0.85rem', backgroundColor: 'var(--bg-card)', borderLeft: '4px solid var(--danger)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Production Shortages</div>
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
              {/* 1. Part Code */}
              <th onClick={() => handleSortToggle('partCode')} style={{ padding: '0.4rem 0.5rem', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                  Part Code {sortField === 'partCode' ? (sortOrder === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={11} color="var(--text-muted)" />}
                </div>
              </th>

              {/* 2. Item Code */}
              <th onClick={() => handleSortToggle('itemCode')} style={{ padding: '0.4rem 0.5rem', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                  Item Code {sortField === 'itemCode' ? (sortOrder === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={11} color="var(--text-muted)" />}
                </div>
              </th>

              {/* 3. Description */}
              <th onClick={() => handleSortToggle('name')} style={{ padding: '0.4rem 0.5rem', cursor: 'pointer', minWidth: '180px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                  Description {sortField === 'name' ? (sortOrder === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={11} color="var(--text-muted)" />}
                </div>
              </th>

              {/* 4. WO Required */}
              <th onClick={() => handleSortToggle('pendingWO')} style={{ padding: '0.4rem 0.5rem', cursor: 'pointer', whiteSpace: 'nowrap', textAlign: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.2rem' }}>
                  WO Required {sortField === 'pendingWO' ? (sortOrder === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={11} color="var(--text-muted)" />}
                </div>
              </th>

              {/* 5. Pend JobCard */}
              <th onClick={() => handleSortToggle('pendingJobCard')} style={{ padding: '0.4rem 0.5rem', cursor: 'pointer', whiteSpace: 'nowrap', textAlign: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.2rem' }}>
                  Pend JobCard {sortField === 'pendingJobCard' ? (sortOrder === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={11} color="var(--text-muted)" />}
                </div>
              </th>

              {/* 6. Total Required */}
              <th onClick={() => handleSortToggle('totalRequired')} style={{ padding: '0.4rem 0.5rem', cursor: 'pointer', whiteSpace: 'nowrap', textAlign: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.2rem' }}>
                  Total Required {sortField === 'totalRequired' ? (sortOrder === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={11} color="var(--text-muted)" />}
                </div>
              </th>

              {/* 7. Curr Stock */}
              <th onClick={() => handleSortToggle('currentStock')} style={{ padding: '0.4rem 0.5rem', cursor: 'pointer', whiteSpace: 'nowrap', textAlign: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.2rem' }}>
                  Curr Stock {sortField === 'currentStock' ? (sortOrder === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={11} color="var(--text-muted)" />}
                </div>
              </th>

              {/* 8. Pend PO */}
              <th onClick={() => handleSortToggle('pendingPO')} style={{ padding: '0.4rem 0.5rem', cursor: 'pointer', whiteSpace: 'nowrap', textAlign: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.2rem' }}>
                  Pend PO {sortField === 'pendingPO' ? (sortOrder === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={11} color="var(--text-muted)" />}
                </div>
              </th>

              {/* 9. Pend JobWork */}
              <th onClick={() => handleSortToggle('pendingJW')} style={{ padding: '0.4rem 0.5rem', cursor: 'pointer', whiteSpace: 'nowrap', textAlign: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.2rem' }}>
                  Pend JobWork {sortField === 'pendingJW' ? (sortOrder === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={11} color="var(--text-muted)" />}
                </div>
              </th>

              {/* 10. Pend QC */}
              <th onClick={() => handleSortToggle('pendingQC')} style={{ padding: '0.4rem 0.5rem', cursor: 'pointer', whiteSpace: 'nowrap', textAlign: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.2rem' }}>
                  Pend QC {sortField === 'pendingQC' ? (sortOrder === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={11} color="var(--text-muted)" />}
                </div>
              </th>

              {/* 11. Shortage */}
              <th onClick={() => handleSortToggle('shortage')} style={{ padding: '0.4rem 0.5rem', cursor: 'pointer', whiteSpace: 'nowrap', textAlign: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.2rem' }}>
                  Shortage {sortField === 'shortage' ? (sortOrder === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={11} color="var(--text-muted)" />}
                </div>
              </th>

              {/* 12. Min Level */}
              <th onClick={() => handleSortToggle('minStockLevel')} style={{ padding: '0.4rem 0.5rem', cursor: 'pointer', whiteSpace: 'nowrap', textAlign: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.2rem' }}>
                  Min Level {sortField === 'minStockLevel' ? (sortOrder === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={11} color="var(--text-muted)" />}
                </div>
              </th>

              {/* 13. Min Level Shortage */}
              <th onClick={() => handleSortToggle('minShortage')} style={{ padding: '0.4rem 0.5rem', cursor: 'pointer', whiteSpace: 'nowrap', textAlign: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.2rem' }}>
                  Min Level Shortage {sortField === 'minShortage' ? (sortOrder === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={11} color="var(--text-muted)" />}
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
                        : (hasShortage ? 'rgba(239, 68, 68, 0.04)' : undefined),
                      cursor: 'pointer'
                    }}
                  >
                    {/* 1. Part Code */}
                    <td style={{ padding: '0.35rem 0.5rem', fontFamily: 'monospace', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                      {row.partCode}
                    </td>

                    {/* 2. Item Code */}
                    <td style={{ padding: '0.35rem 0.5rem', fontFamily: 'monospace', fontWeight: 700, color: 'var(--accent-primary)', fontSize: '0.82rem' }}>
                      {row.itemCode}
                    </td>

                    {/* 3. Description */}
                    <td style={{ padding: '0.35rem 0.5rem' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--text-primary)' }}>
                        {row.name}
                      </div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                        Class: <span style={{ fontWeight: 700 }}>{row.category}</span> &bull; {row.processType}
                      </div>
                    </td>

                    {/* 4. WO Required */}
                    <td style={{ padding: '0.35rem 0.5rem', textAlign: 'center', fontSize: '0.82rem' }}>
                      {row.pendingWO > 0 ? (
                        <span style={{ color: '#d97706', fontWeight: 700 }}>{row.pendingWO}</span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>0</span>
                      )}
                    </td>

                    {/* 5. Pend JobCard */}
                    <td style={{ padding: '0.35rem 0.5rem', textAlign: 'center', fontSize: '0.82rem' }}>
                      {row.pendingJobCard > 0 ? (
                        <span style={{ color: '#7c3aed', fontWeight: 700 }}>{row.pendingJobCard}</span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>0</span>
                      )}
                    </td>

                    {/* 6. Total Required */}
                    <td style={{ padding: '0.35rem 0.5rem', textAlign: 'center', fontWeight: 800, fontSize: '0.82rem', color: 'var(--text-primary)' }}>
                      {row.totalRequired}
                    </td>

                    {/* 7. Curr Stock */}
                    <td style={{ padding: '0.35rem 0.5rem', textAlign: 'center', fontWeight: 700, fontSize: '0.82rem' }}>
                      <span style={{ color: row.currentStock === 0 ? 'var(--danger)' : 'var(--text-primary)' }}>
                        {row.currentStock} {row.unit}
                      </span>
                    </td>

                    {/* 8. Pend PO */}
                    <td style={{ padding: '0.35rem 0.5rem', textAlign: 'center', fontSize: '0.82rem' }}>
                      {row.pendingPO > 0 ? (
                        <span style={{ color: '#2563eb', fontWeight: 700 }}>+{row.pendingPO}</span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>0</span>
                      )}
                    </td>

                    {/* 9. Pend JobWork */}
                    <td style={{ padding: '0.35rem 0.5rem', textAlign: 'center', fontSize: '0.82rem' }}>
                      {row.pendingJW > 0 ? (
                        <span style={{ color: '#059669', fontWeight: 700 }}>{row.pendingJW}</span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>0</span>
                      )}
                    </td>

                    {/* 10. Pend QC */}
                    <td style={{ padding: '0.35rem 0.5rem', textAlign: 'center', fontSize: '0.82rem' }}>
                      {row.pendingQC > 0 ? (
                        <span style={{ color: '#0891b2', fontWeight: 700, backgroundColor: 'rgba(8, 145, 178, 0.08)', padding: '0.15rem 0.4rem', borderRadius: '0.25rem' }}>
                          {row.pendingQC}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>0</span>
                      )}
                    </td>

                    {/* 11. Shortage */}
                    <td style={{ padding: '0.35rem 0.5rem', textAlign: 'center', fontSize: '0.82rem' }}>
                      {row.shortage > 0 ? (
                        <span style={{ 
                          color: '#ffffff', 
                          backgroundColor: 'var(--danger)', 
                          padding: '0.15rem 0.45rem', 
                          borderRadius: '0.25rem', 
                          fontWeight: 800 
                        }}>
                          {row.shortage}
                        </span>
                      ) : (
                        <span style={{ color: '#16a34a', fontWeight: 600 }}>OK (0)</span>
                      )}
                    </td>

                    {/* 12. Min Level */}
                    <td style={{ padding: '0.35rem 0.5rem', textAlign: 'center', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                      {row.minStockLevel}
                    </td>

                    {/* 13. Min Level Shortage */}
                    <td style={{ padding: '0.35rem 0.5rem', textAlign: 'center', fontSize: '0.82rem' }}>
                      {row.minShortage > 0 ? (
                        <span style={{ 
                          color: '#b45309', 
                          backgroundColor: 'rgba(245, 158, 11, 0.15)', 
                          padding: '0.15rem 0.4rem', 
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

      {/* Hidden Direct Print Area (Used by Quick Direct Print) */}
      <div id="direct-print-area">
        <PlanningPrintReport 
          data={filteredData} 
          filters={{
            selectedClasses,
            selectedProcessType,
            searchTerm: cleanSearchTerm
          }}
        />
      </div>

      {/* Print Preview Modal */}
      {printModalOpen && (
        <PrintManagerModal
          isOpen={printModalOpen}
          onClose={() => setPrintModalOpen(false)}
          title="Planning & Material Demand Matrix"
        >
          <PlanningPrintReport 
            data={filteredData} 
            filters={{
              selectedClasses,
              selectedProcessType,
              searchTerm: cleanSearchTerm
            }}
          />
        </PrintManagerModal>
      )}
    </div>
  );
};
