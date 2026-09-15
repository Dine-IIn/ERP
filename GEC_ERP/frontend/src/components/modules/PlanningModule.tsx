import React, { useState, useMemo, useEffect } from 'react';
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
    items, purchaseOrders, workOrders, jobCards, jobworks, boms, qcInspections, finishedGoods,
    searchTerm, setSearchTerm, itemProcessCards 
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
  // HIGH-PERFORMANCE LIVE CALCULATION OF DEMANDS & SUPPLIES
  // -------------------------------------------------------------
  const planningData = useMemo(() => {
    // 1. Active Work Orders
    const activeWOs = workOrders.filter(w => 
      w.status !== 'COMPLETED' && w.status !== 'CANCELLED' && !(w as any).isDeleted
    );

    // 2. Active Job Cards
    const activeJCs = jobCards.filter(j => 
      j.status !== 'COMPLETED' && j.status !== 'CANCELLED' && !(j as any).isDeleted
    );

    // 3. Active Purchase Orders
    const activePOs = purchaseOrders.filter(p => 
      p.status !== 'CANCELLED' && p.status !== 'GOODS_RECEIVED' && p.status !== 'REJECTED' && !(p as any).isDeleted
    );

    // 4. Active Jobworks
    const activeJWs = jobworks.filter(j => 
      j.status !== 'COMPLETED' && j.status !== 'CANCELLED' && !(j as any).isDeleted
    );

    // Pre-index items for O(1) lookup
    const itemById = new Map<string, Item>();
    const itemByCode = new Map<string, Item>();
    const itemByName = new Map<string, Item>();
    items.forEach(it => {
      if (it.id) itemById.set(it.id, it);
      if (it.itemCode) itemByCode.set(it.itemCode.toLowerCase(), it);
      if (it.name) itemByName.set(it.name.toLowerCase(), it);
    });

    // Pre-index BOMs
    const bomById = new Map<string, BOM>();
    const bomByCode = new Map<string, BOM>();
    const bomByModel = new Map<string, BOM>();
    boms.forEach(b => {
      if (b.id) bomById.set(b.id, b);
      if (b.bomCode) bomByCode.set(b.bomCode.toLowerCase(), b);
      if (b.machineModel) bomByModel.set(b.machineModel.toLowerCase(), b);
    });

    // Pre-index active Job Cards producing items (O(N))
    const pendingJCMap = new Map<string, number>();
    activeJCs.forEach(jc => {
      const remaining = Math.max(0, (jc.targetQuantity || 1) - (jc.completedQuantity || 0));
      if (remaining > 0) {
        if (jc.itemId) pendingJCMap.set(jc.itemId, (pendingJCMap.get(jc.itemId) || 0) + remaining);
        if (jc.itemCode) {
          const c = jc.itemCode.toLowerCase();
          pendingJCMap.set(c, (pendingJCMap.get(c) || 0) + remaining);
        }
      }
    });

    // Pre-index active Job Works producing items (O(N))
    const pendingJWMap = new Map<string, number>();
    activeJWs.forEach(jw => {
      const bal = jw.pendingBalance !== undefined ? jw.pendingBalance : (jw.sentQuantity || 0);
      if (bal > 0) {
        if (jw.itemId) pendingJWMap.set(jw.itemId, (pendingJWMap.get(jw.itemId) || 0) + bal);
        if (jw.itemCode) {
          const c = jw.itemCode.toLowerCase();
          pendingJWMap.set(c, (pendingJWMap.get(c) || 0) + bal);
        }
      }
    });

    // Pre-index active PO undelivered quantities (O(N))
    const pendingPOMap = new Map<string, number>();
    activePOs.forEach(po => {
      (po.items || []).forEach(pi => {
        const ord = pi.quantity || pi.orderedQty || 0;
        const rec = pi.receivedQty || 0;
        const undelivered = Math.max(0, ord - rec);
        if (undelivered > 0) {
          if (pi.itemId) pendingPOMap.set(pi.itemId, (pendingPOMap.get(pi.itemId) || 0) + undelivered);
          if (pi.itemCode) {
            const c = pi.itemCode.toLowerCase();
            pendingPOMap.set(c, (pendingPOMap.get(c) || 0) + undelivered);
          }
        }
      });
    });

    // Pre-index QC pending inspection quantities (O(N))
    const pendingQCMap = new Map<string, number>();
    qcInspections.forEach(q => {
      const isOpen = q.status === 'IN_INSPECTION' || (q.status as string) === 'PENDING' || q.disposition === 'PENDING' || !q.status;
      if (isOpen) {
        const inspected = q.inspectedQuantity || q.inspectedQty || 0;
        const passed = q.passedQuantity || q.approvedQty || 0;
        const rejected = q.rejectedQty || (q as any).rejectedQuantity || 0;
        const remainingQC = Math.max(0, inspected - passed - rejected);
        if (remainingQC > 0) {
          if (q.itemId) pendingQCMap.set(q.itemId, (pendingQCMap.get(q.itemId) || 0) + remainingQC);
          if (q.itemCode) {
            const c = q.itemCode.toLowerCase();
            pendingQCMap.set(c, (pendingQCMap.get(c) || 0) + remainingQC);
          }
        }
      }
    });

    // Compute global multi-level demand map with tree shortage pruning
    const demandMap = new Map<string, number>();

    const addDemand = (itemIdOrCode: string, qty: number) => {
      if (!itemIdOrCode || qty <= 0) return;
      const lower = itemIdOrCode.toLowerCase();
      demandMap.set(itemIdOrCode, (demandMap.get(itemIdOrCode) || 0) + qty);
      if (lower !== itemIdOrCode) {
        demandMap.set(lower, (demandMap.get(lower) || 0) + qty);
      }
    };

    // 1. Aggregate root-level demand across all active Work Orders
    const rootDemandByItemKey = new Map<string, number>();

    activeWOs.forEach(wo => {
      const totalWOQty = wo.targetQuantity || wo.quantity || 1;

      // Calculate dispatched units for this WO
      const dispatchedQty = (finishedGoods || []).filter(fg => 
        fg.status === 'DISPATCHED' && (
          fg.woId === wo.id ||
          (wo.workOrderNo && fg.woNumber === wo.workOrderNo) ||
          (wo.woNumber && fg.woNumber === wo.woNumber)
        )
      ).length;

      const undispatchedWOQty = Math.max(0, totalWOQty - dispatchedQty);

      const matchedBOM = (wo.bomId && bomById.get(wo.bomId))
        || ((wo as any).bomCode && bomByCode.get(((wo as any).bomCode as string).toLowerCase()))
        || (wo.machineModel && bomByModel.get(wo.machineModel.toLowerCase()));

      // Finished Product X demand: If WO has undispatched machines, register demand for product X itself
      const topItem = (wo.itemId && itemById.get(wo.itemId))
        || (wo.machineModel && (itemByName.get(wo.machineModel.toLowerCase()) || itemByCode.get(wo.machineModel.toLowerCase())))
        || (matchedBOM && (itemById.get(matchedBOM.id) || itemByCode.get((matchedBOM.bomCode || '').toLowerCase()) || itemByName.get((matchedBOM.machineModel || '').toLowerCase())));

      if (topItem && undispatchedWOQty > 0) {
        addDemand(topItem.id, undispatchedWOQty);
        if (topItem.itemCode) addDemand(topItem.itemCode, undispatchedWOQty);
      }

      // Child components required for unfinished units to build
      const remWOQty = Math.max(0, totalWOQty - (wo.completedQuantity || 0));
      if (remWOQty <= 0) return;

      const components = (wo.woComponents && wo.woComponents.length > 0)
        ? wo.woComponents.map(c => ({
            itemId: c.itemId,
            itemCode: c.itemCode,
            qtyPerMachine: c.qtyRequired ? c.qtyRequired / (wo.quantity || wo.targetQuantity || 1) : 1
          }))
        : (matchedBOM?.components || []).map(c => ({
            itemId: c.itemId,
            itemCode: c.itemCode,
            qtyPerMachine: c.qtyPerMachine || 1
          }));

      components.forEach(c => {
        const key = c.itemId || c.itemCode || '';
        if (key) {
          const qty = (c.qtyPerMachine || 1) * remWOQty;
          rootDemandByItemKey.set(key, (rootDemandByItemKey.get(key) || 0) + qty);
        }
      });
    });

    // 2. Recursive explosion with shortage pruning
    const explodeItemShortage = (itemKey: string, requiredQty: number, visited: Set<string>) => {
      const targetItem = itemById.get(itemKey) || itemByCode.get(itemKey.toLowerCase());
      const idKey = targetItem ? targetItem.id : itemKey;
      const codeKey = targetItem ? targetItem.itemCode : itemKey;

      // Register requirement
      addDemand(idKey, requiredQty);
      if (codeKey && codeKey !== idKey) {
        addDemand(codeKey, requiredQty);
      }

      if (!targetItem) return;

      // Check for sub-assembly BOM
      const subBOM = (targetItem.id && bomById.get(targetItem.id))
        || (targetItem.itemCode && bomByCode.get(targetItem.itemCode.toLowerCase()))
        || (targetItem.name && bomByModel.get(targetItem.name.toLowerCase()));

      const hasSubBOM = subBOM && subBOM.components && subBOM.components.length > 0 && !visited.has(subBOM.id);
      const procCard = (itemProcessCards || []).find(pc => 
        (targetItem.id && pc.itemId === targetItem.id) || 
        (targetItem.itemCode && (pc.itemCode?.toLowerCase() === targetItem.itemCode.toLowerCase() || pc.itemId === targetItem.itemCode))
      );

      if (hasSubBOM || procCard) {
        // Available supply: In-House Stock + Active Job Cards in progress + Active Job Work in progress
        const inHouse = targetItem.inHouseStock || 0;
        const activeJCSupply = (targetItem.id && pendingJCMap.get(targetItem.id)) || (targetItem.itemCode && pendingJCMap.get(targetItem.itemCode.toLowerCase())) || 0;
        const activeJWSupply = (targetItem.id && pendingJWMap.get(targetItem.id)) || (targetItem.itemCode && pendingJWMap.get(targetItem.itemCode.toLowerCase())) || 0;

        const availableSupply = inHouse + activeJCSupply + activeJWSupply;
        const netShortage = Math.max(0, requiredQty - availableSupply);

        // TREE PRUNING: Only explode child components if net shortage > 0
        if (netShortage > 0) {
          // 1. Explode child sub-BOM components if BOM exists
          if (hasSubBOM) {
            const nextVisited = new Set(visited);
            nextVisited.add(subBOM.id);

            subBOM.components.forEach(comp => {
              const compKey = comp.itemId || comp.itemCode || '';
              const compQtyPer = comp.qtyPerMachine !== undefined ? comp.qtyPerMachine : 1;
              const childReqQty = compQtyPer * netShortage;
              if (compKey && childReqQty > 0) {
                explodeItemShortage(compKey, childReqQty, nextVisited);
              }
            });
          }

          // 2. Process Card Link (Indirect BOM: Material Before Process / Casting -> Finished Component)
          if (procCard && (procCard.rawItemId || procCard.rawItemCode)) {
            const rawKey = procCard.rawItemId || procCard.rawItemCode || '';
            if (rawKey && !visited.has(`proc_${rawKey}`)) {
              const nextVisited = new Set(visited);
              nextVisited.add(`proc_${rawKey}`);
              // Induced demand to make netShortage units of finished item
              explodeItemShortage(rawKey, netShortage, nextVisited);
            }
          }
        }
      }
    };

    // Traverse all root requirements
    rootDemandByItemKey.forEach((qty, key) => {
      explodeItemShortage(key, qty, new Set());
    });

    return items.map(item => {
      const partCode = item.partCode || '-';
      const itemCode = item.itemCode;
      const name = item.name;
      const currentStock = item.inHouseStock || 0;
      const minStockLevel = item.minStockQty !== undefined ? item.minStockQty : (item.reorderLevel || 0);

      // Fast Map lookups (O(1))
      const pendingPO = (item.id && pendingPOMap.get(item.id)) || (item.itemCode && pendingPOMap.get(item.itemCode.toLowerCase())) || 0;
      const pendingWO = (item.id && demandMap.get(item.id)) || (item.itemCode && demandMap.get(item.itemCode.toLowerCase())) || (item.itemCode && demandMap.get(item.itemCode)) || 0;
      const pendingJobCard = (item.id && pendingJCMap.get(item.id)) || (item.itemCode && pendingJCMap.get(item.itemCode.toLowerCase())) || 0;
      const pendingQC = (item.id && pendingQCMap.get(item.id)) || (item.itemCode && pendingQCMap.get(item.itemCode.toLowerCase())) || 0;
      const pendingJW = (item.id && pendingJWMap.get(item.id)) || (item.itemCode && pendingJWMap.get(item.itemCode.toLowerCase())) || 0;

      // Calculations
      const totalRequired = pendingWO;
      const shortage = Math.max(0, totalRequired - currentStock);
      const minShortage = Math.max(0, (totalRequired + minStockLevel) - currentStock);

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
        minShortage,
        _searchStr: `${partCode} ${itemCode} ${name} ${item.category || ''}`.toLowerCase()
      };
    });
  }, [items, purchaseOrders, workOrders, jobCards, jobworks, boms, qcInspections, finishedGoods, itemProcessCards]);

  // Dedicated Local Search Term for Planning Module
  const [localSearch, setLocalSearch] = useState('');

  // Clean Search Term handling with useDeferredValue
  const deferredSearch = React.useDeferredValue(localSearch);
  const cleanSearchTerm = deferredSearch.replace(/@history|@deleted|@archived/gi, '').replace(/^@+/g, '').trim().toLowerCase();

  // Filtered & Sorted Records
  const filteredData = useMemo(() => {
    return planningData
      .filter(row => {
        // Fast pre-computed search filter
        const matchesSearch = !cleanSearchTerm || row._searchStr.includes(cleanSearchTerm);

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
              style={{ paddingLeft: '2.25rem', paddingRight: '2rem', fontSize: '0.82rem' }}
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
            />
            {localSearch && (
              <button
                type="button"
                onClick={() => setLocalSearch('')}
                style={{ position: 'absolute', right: '0.6rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.85rem' }}
              >
                ✕
              </button>
            )}
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
