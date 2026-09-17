import React, { useState, useMemo } from 'react';
import { useERP } from '../../context/ERPContext';
import { StatCard } from '../common/StatCard';
import { 
  Warehouse, Truck, Wrench, ShoppingCart, 
  AlertTriangle, ArrowRight, ShieldCheck, Cpu,
  Clock, Calendar, CheckCircle2, AlertCircle, Plus, Search, Filter, Layers, Package
} from 'lucide-react';
import { Item } from '../../types/erp';

export const DashboardModule: React.FC = () => {
  const { 
    items, jobworks, purchaseOrders, workOrders, boms,
    qcInspections, setActiveModule 
  } = useERP();

  const totalInHouseItems = items.length;
  const lowStockItems = items.filter(i => i.inHouseStock <= (i.reorderLevel || 0));
  const activeJobworks = jobworks.filter(j => j.status !== 'COMPLETED');
  const totalPendingJobworkQty = activeJobworks.reduce((sum, j) => sum + j.pendingBalance, 0);
  const activeWOs = workOrders.filter(w => w.status === 'IN_PROGRESS' || w.status === 'PLANNED');
  const pendingPOs = purchaseOrders.filter(p => p.status === 'ISSUED' || p.status === 'PARTIALLY_RECEIVED');

  // JIT Staggered PO Procurement Reminders Logic
  const [reminderFilter, setReminderFilter] = useState<'DUE_ONLY' | 'UPCOMING' | 'ALL'>('DUE_ONLY');
  const [reminderSearch, setReminderSearch] = useState('');

  const poReminders = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const activeWorkOrders = workOrders.filter(w => 
      w.status !== 'COMPLETED' && w.status !== 'CANCELLED' && !(w as any).isDeleted
    );

    const results: Array<{
      id: string;
      woId: string;
      woNumber: string;
      machineModel: string;
      woQuantity: number;
      woStartDateStr: string;
      item: Item;
      itemId: string;
      itemCode: string;
      partCode?: string;
      itemName: string;
      category: string;
      unit: string;
      leadTimeDays: number;
      maxLeadTimeInWO: number;
      offsetDays: number;
      scheduledDate: Date;
      scheduledDateStr: string;
      diffDays: number; // >0: overdue, 0: due today, <0: upcoming
      status: 'OVERDUE' | 'DUE_TODAY' | 'UPCOMING';
      totalRequired: number;
      inHouseStock: number;
      openPOQty: number;
      shortage: number;
    }> = [];

    activeWorkOrders.forEach(wo => {
      const woTargetQty = wo.targetQuantity || wo.quantity || 1;
      const woNo = wo.workOrderNo || (wo as any).woNumber || wo.id;
      const woDateStr = wo.startDate || wo.orderDate || (wo as any).createdAt || new Date().toISOString().split('T')[0];
      let woStartDate = new Date(woDateStr);
      if (isNaN(woStartDate.getTime())) woStartDate = new Date();

      // Collect raw components with correct total required quantities
      const compList: Array<{ itemId?: string; itemCode?: string; totalRequired: number }> = [];

      if (wo.woComponents && wo.woComponents.length > 0) {
        wo.woComponents.forEach(c => {
          const totReq = c.qtyRequired !== undefined 
            ? Number(c.qtyRequired) 
            : (Number(c.qtyPerMachine) || 1) * woTargetQty;
          compList.push({
            itemId: c.itemId,
            itemCode: c.itemCode,
            totalRequired: totReq
          });
        });
      } else {
        const bom = boms.find(b => b.id === wo.bomId || b.machineModel === wo.machineModel);
        if (bom && bom.components) {
          const explode = (comps: typeof bom.components, mult: number, visited = new Set<string>()) => {
            comps.forEach(c => {
              const req = (Number(c.qtyPerMachine) || 1) * mult;
              compList.push({ itemId: c.itemId, itemCode: c.itemCode, totalRequired: req });
              const subBOM = boms.find(b => 
                (c.itemId && b.id === c.itemId) || 
                (c.itemCode && (b.bomCode?.toLowerCase() === c.itemCode.toLowerCase() || b.machineModel?.toLowerCase() === c.itemCode.toLowerCase()))
              );
              if (subBOM && subBOM.components && subBOM.components.length > 0 && !visited.has(subBOM.id)) {
                const nextVis = new Set(visited);
                nextVis.add(subBOM.id);
                explode(subBOM.components, req, nextVis);
              }
            });
          };
          explode(bom.components, woTargetQty, new Set([bom.id]));
        }
      }

      if (compList.length === 0) return;

      // Aggregate components by item to avoid duplicates and compute lead times
      const aggregatedMap = new Map<string, { item: Item; totalRequired: number; leadTime: number; isBO: boolean }>();

      compList.forEach(c => {
        const it = items.find(i => (c.itemId && i.id === c.itemId) || (c.itemCode && i.itemCode === c.itemCode));
        if (!it) return;
        const key = it.id || it.itemCode;
        const leadTime = it.leadTimeDays !== undefined ? it.leadTimeDays : 10;
        const pType = (it.processType || (it as any).materialProcessType || '').toLowerCase();
        const cat = (it.category || '').toUpperCase();
        const sources = (it.materialProcessSources || []).map(s => s.toLowerCase());
        const isBO = cat === 'BO' || pType.includes('bought out') || pType.includes('brought out') || sources.includes('bought out') || sources.includes('brought out');

        if (!aggregatedMap.has(key)) {
          aggregatedMap.set(key, { item: it, totalRequired: c.totalRequired, leadTime, isBO });
        } else {
          aggregatedMap.get(key)!.totalRequired += c.totalRequired;
        }
      });

      const resolvedList = Array.from(aggregatedMap.values());
      if (resolvedList.length === 0) return;

      // Maximum lead time in this WO for staggered JIT scheduling
      const maxLeadTimeInWO = resolvedList.reduce((max, r) => Math.max(max, r.leadTime), 10);

      // Evaluate Bought-Out items for PO reminders
      resolvedList.filter(r => r.isBO).forEach(r => {
        const it = r.item;
        const totalRequired = r.totalRequired;

        // Check Open POs for this item
        const openPOQty = purchaseOrders
          .filter(po => po.status !== 'GOODS_RECEIVED' && po.status !== 'CANCELLED' && po.status !== 'REJECTED' && !(po as any).isDeleted)
          .reduce((sum, po) => {
            const line = po.items.find(pi => (pi.itemId && pi.itemId === it.id) || (pi.itemCode && pi.itemCode === it.itemCode));
            if (!line) return sum;
            const ord = line.quantity || line.orderedQty || 0;
            const rec = line.receivedQty || 0;
            return sum + Math.max(0, ord - rec);
          }, 0);

        const currentStock = it.inHouseStock || 0;
        const shortage = Math.max(0, totalRequired - currentStock - openPOQty);

        // Calculate scheduled order date based on staggered lead time offset:
        // Item with max lead time is ordered at Day 0; items with lower lead times are staggered by (maxLead - itemLead)
        const offsetDays = Math.max(0, maxLeadTimeInWO - r.leadTime);
        const scheduledDate = new Date(woStartDate.getTime() + offsetDays * 24 * 60 * 60 * 1000);
        scheduledDate.setHours(0, 0, 0, 0);

        const diffTime = today.getTime() - scheduledDate.getTime();
        const diffDays = Math.round(diffTime / (24 * 60 * 60 * 1000));

        let status: 'OVERDUE' | 'DUE_TODAY' | 'UPCOMING' = 'UPCOMING';
        if (diffDays > 0) status = 'OVERDUE';
        else if (diffDays === 0) status = 'DUE_TODAY';

        results.push({
          id: `${wo.id}_${it.id}`,
          woId: wo.id,
          woNumber: woNo,
          machineModel: wo.machineModel,
          woQuantity: woTargetQty,
          woStartDateStr: woDateStr,
          item: it,
          itemId: it.id,
          itemCode: it.itemCode,
          partCode: it.partCode,
          itemName: it.name,
          category: it.category,
          unit: it.unit || 'PCS',
          leadTimeDays: r.leadTime,
          maxLeadTimeInWO,
          offsetDays,
          scheduledDate,
          scheduledDateStr: scheduledDate.toISOString().split('T')[0],
          diffDays,
          status,
          totalRequired,
          inHouseStock: currentStock,
          openPOQty,
          shortage
        });
      });
    });

    return results;
  }, [workOrders, boms, items, purchaseOrders]);

  const duePOList = useMemo(() => {
    return poReminders.filter(r => (r.status === 'OVERDUE' || r.status === 'DUE_TODAY') && r.shortage > 0);
  }, [poReminders]);

  const filteredReminders = useMemo(() => {
    let list = poReminders;
    if (reminderFilter === 'DUE_ONLY') {
      list = list.filter(r => (r.status === 'OVERDUE' || r.status === 'DUE_TODAY') && r.shortage > 0);
    } else if (reminderFilter === 'UPCOMING') {
      list = list.filter(r => r.status === 'UPCOMING');
    }

    if (reminderSearch.trim()) {
      const q = reminderSearch.trim().toLowerCase();
      list = list.filter(r => 
        r.itemCode.toLowerCase().includes(q) ||
        (r.partCode && r.partCode.toLowerCase().includes(q)) ||
        r.itemName.toLowerCase().includes(q) ||
        r.woNumber.toLowerCase().includes(q) ||
        r.machineModel.toLowerCase().includes(q)
      );
    }

    // Sort by: Overdue/Due first (diffDays desc), then higher lead time desc, then itemCode
    return [...list].sort((a, b) => {
      if (b.diffDays !== a.diffDays) return b.diffDays - a.diffDays;
      if (b.leadTimeDays !== a.leadTimeDays) return b.leadTimeDays - a.leadTimeDays;
      return (a.itemCode || '').localeCompare(b.itemCode || '');
    });
  }, [poReminders, reminderFilter, reminderSearch]);

  return (
    <div 
      className="module-layout-container" 
      style={{ 
        flex: 1, 
        minHeight: 0, 
        height: '100%', 
        overflowY: 'auto', 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '1.25rem', 
        paddingRight: '0.35rem',
        paddingBottom: '2rem'
      }}
    >
      {/* Top Banner Alert if low stock */}
      {lowStockItems.length > 0 && (
        <div 
          onDoubleClick={() => setActiveModule('shortage')}
          title="Double-click to open Shortage & Reorder Workbench"
          style={{
            backgroundColor: 'rgba(245, 158, 11, 0.15)',
            border: '1px solid var(--warning)',
            borderRadius: '0.75rem',
            padding: '0.85rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            transition: 'transform 0.15s ease, box-shadow 0.15s ease'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <AlertTriangle size={20} style={{ color: 'var(--warning)' }} />
            <div>
              <strong style={{ color: 'var(--warning)', fontSize: '0.9rem' }}>
                {lowStockItems.length} Moulding Machine Component(s) Below Reorder Safety Level!
              </strong>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                {lowStockItems.map(i => `${i.itemCode} (${i.inHouseStock} ${i.unit})`).join(', ')}
              </div>
            </div>
          </div>
          <button 
            className="btn btn-outline"
            style={{ borderColor: 'var(--warning)', color: 'var(--warning)' }}
            onClick={(e) => { e.stopPropagation(); setActiveModule('shortage'); }}
          >
            <span>View Shortages (Double-Click)</span>
            <ArrowRight size={14} />
          </button>
        </div>
      )}

      {/* Top Banner Alert for JIT Due Purchase Orders */}
      {duePOList.length > 0 && (
        <div 
          onClick={() => {
            const el = document.getElementById('jit-po-reminders-section');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }}
          style={{
            backgroundColor: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid var(--danger)',
            borderRadius: '0.75rem',
            padding: '0.85rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            transition: 'transform 0.15s ease, box-shadow 0.15s ease'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <AlertCircle size={22} style={{ color: 'var(--danger)', flexShrink: 0 }} />
            <div>
              <strong style={{ color: 'var(--danger)', fontSize: '0.9rem' }}>
                🚨 {duePOList.length} Bought-Out Component(s) Due / Overdue for Purchase Order Release!
              </strong>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Staggered lead-time procurement triggers reached for active Work Orders. Immediate action required.
              </div>
            </div>
          </div>
          <button 
            className="btn btn-outline"
            style={{ borderColor: 'var(--danger)', color: 'var(--danger)', fontSize: '0.78rem' }}
            onClick={(e) => {
              e.stopPropagation();
              const el = document.getElementById('jit-po-reminders-section');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            <span>Review Due POs</span>
            <ArrowRight size={14} />
          </button>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '1rem' }}>
        <StatCard 
          title="In-House Items Catalog" 
          value={totalInHouseItems} 
          subtitle={`${lowStockItems.length} require reordering`}
          icon={<Warehouse size={24} />}
          color="blue"
          onClick={() => setActiveModule('inhouse-inventory')}
          onDoubleClick={() => setActiveModule('inhouse-inventory')}
        />
        <StatCard 
          title="Active Jobwork Challans" 
          value={activeJobworks.length} 
          subtitle={`${totalPendingJobworkQty} pcs pending at vendors`}
          icon={<Truck size={24} />}
          color="amber"
          onClick={() => setActiveModule('external-inventory')}
          onDoubleClick={() => setActiveModule('external-inventory')}
        />
        <StatCard 
          title="Machine Work Orders" 
          value={activeWOs.length} 
          subtitle="In active assembly & testing"
          icon={<Wrench size={24} />}
          color="green"
          onClick={() => setActiveModule('work-orders')}
          onDoubleClick={() => setActiveModule('work-orders')}
        />
        <StatCard 
          title="Open Purchase Orders" 
          value={pendingPOs.length} 
          subtitle="Awaiting vendor deliveries"
          icon={<ShoppingCart size={24} />}
          color="purple"
          onClick={() => setActiveModule('purchase-orders')}
          onDoubleClick={() => setActiveModule('purchase-orders')}
        />
      </div>

      {/* JIT Lead-Time Staggered PO Procurement Reminders Section */}
      <div id="jit-po-reminders-section" className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
              <Clock size={20} style={{ color: 'var(--accent-primary)' }} />
              Just-In-Time (JIT) PO Procurement Reminders
              <span className="badge badge-neutral" style={{ fontSize: '0.72rem' }}>
                Lead-Time Staggered
              </span>
            </h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}>
              Procurement dates scheduled by component lead-time offset relative to Work Order start date.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            {/* Filter Buttons */}
            <div style={{ display: 'inline-flex', borderRadius: '0.375rem', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
              <button 
                type="button" 
                className={`btn ${reminderFilter === 'DUE_ONLY' ? 'btn-primary' : 'btn-outline'}`}
                style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem', border: 'none', borderRadius: 0 }}
                onClick={() => setReminderFilter('DUE_ONLY')}
              >
                🚨 Due / Overdue ({duePOList.length})
              </button>
              <button 
                type="button" 
                className={`btn ${reminderFilter === 'UPCOMING' ? 'btn-primary' : 'btn-outline'}`}
                style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem', border: 'none', borderRadius: 0 }}
                onClick={() => setReminderFilter('UPCOMING')}
              >
                📅 Upcoming ({poReminders.filter(r => r.status === 'UPCOMING').length})
              </button>
              <button 
                type="button" 
                className={`btn ${reminderFilter === 'ALL' ? 'btn-primary' : 'btn-outline'}`}
                style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem', border: 'none', borderRadius: 0 }}
                onClick={() => setReminderFilter('ALL')}
              >
                All Active ({poReminders.length})
              </button>
            </div>

            {/* Search Input */}
            <div style={{ position: 'relative', width: '220px' }}>
              <Search size={13} style={{ position: 'absolute', left: '0.5rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input 
                type="text"
                placeholder="Search Item or WO..."
                className="input-field"
                style={{ paddingLeft: '1.75rem', paddingRight: '0.5rem', paddingTop: '0.2rem', paddingBottom: '0.2rem', fontSize: '0.75rem' }}
                value={reminderSearch}
                onChange={(e) => setReminderSearch(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Reminders Table / Empty View */}
        {filteredReminders.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <CheckCircle2 size={32} color="var(--success)" style={{ margin: '0 auto 0.5rem auto' }} />
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {reminderFilter === 'DUE_ONLY' ? '✓ All Purchase Orders are on schedule! No pending POs due today.' : 'No items match the selected filter criteria.'}
            </div>
            <p style={{ fontSize: '0.78rem', margin: '0.25rem 0 0 0' }}>
              Purchase order reminders will appear automatically when an item\'s staggered lead time trigger date arrives.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto', maxHeight: '380px', overflowY: 'auto' }}>
            <table style={{ width: '100%', fontSize: '0.78rem', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-color)', position: 'sticky', top: 0, zIndex: 10 }}>
                  <th style={{ padding: '0.45rem 0.6rem', textAlign: 'center', width: '110px' }}>Status</th>
                  <th style={{ padding: '0.45rem 0.6rem', textAlign: 'left' }}>Work Order / Product</th>
                  <th style={{ padding: '0.45rem 0.6rem', textAlign: 'left' }}>Item Details</th>
                  <th style={{ padding: '0.45rem 0.6rem', textAlign: 'center', width: '90px' }}>Lead Time</th>
                  <th style={{ padding: '0.45rem 0.6rem', textAlign: 'left', width: '170px' }}>Procurement Timeline</th>
                  <th style={{ padding: '0.45rem 0.6rem', textAlign: 'right', width: '90px' }}>Shortage</th>
                  <th style={{ padding: '0.45rem 0.6rem', textAlign: 'center', width: '120px' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredReminders.map(rem => {
                  const isOverdue = rem.status === 'OVERDUE';
                  const isDueToday = rem.status === 'DUE_TODAY';

                  return (
                    <tr 
                      key={rem.id}
                      style={{ 
                        backgroundColor: isOverdue ? 'rgba(239, 68, 68, 0.07)' : isDueToday ? 'rgba(245, 158, 11, 0.08)' : 'transparent',
                        borderBottom: '1px solid var(--border-color)'
                      }}
                    >
                      {/* Status */}
                      <td style={{ padding: '0.5rem 0.6rem', textAlign: 'center' }}>
                        {isOverdue ? (
                          <span className="badge badge-danger" style={{ fontSize: '0.7rem', fontWeight: 800, padding: '0.15rem 0.4rem', whiteSpace: 'nowrap' }}>
                            🔴 Overdue (+{rem.diffDays}d)
                          </span>
                        ) : isDueToday ? (
                          <span className="badge badge-warning" style={{ fontSize: '0.7rem', fontWeight: 800, padding: '0.15rem 0.4rem', whiteSpace: 'nowrap' }}>
                            🟠 Due Today
                          </span>
                        ) : (
                          <span className="badge badge-neutral" style={{ fontSize: '0.7rem', fontWeight: 700, padding: '0.15rem 0.4rem', whiteSpace: 'nowrap' }}>
                            🟡 In {Math.abs(rem.diffDays)} Days
                          </span>
                        )}
                      </td>

                      {/* Work Order */}
                      <td style={{ padding: '0.5rem 0.6rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontFamily: 'monospace', fontWeight: 800, color: 'var(--accent-primary)', fontSize: '0.82rem' }}>
                            {rem.woNumber}
                          </span>
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.78rem' }}>
                            {rem.machineModel} ({rem.woQuantity} Units)
                          </span>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                            WO Start: {rem.woStartDateStr}
                          </span>
                        </div>
                      </td>

                      {/* Item Details */}
                      <td style={{ padding: '0.5rem 0.6rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                            <strong style={{ fontFamily: 'monospace', color: 'var(--accent-primary)', fontSize: '0.82rem' }}>{rem.itemCode}</strong>
                            {rem.partCode && (
                              <span style={{ fontFamily: 'monospace', color: 'var(--text-muted)', fontSize: '0.72rem' }}>({rem.partCode})</span>
                            )}
                            <span className="badge badge-neutral" style={{ fontSize: '0.65rem', padding: '0.05rem 0.25rem' }}>{rem.category}</span>
                          </div>
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{rem.itemName}</span>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                            Stock: {rem.inHouseStock} {rem.unit} &bull; Req: {rem.totalRequired} {rem.unit}
                          </span>
                        </div>
                      </td>

                      {/* Lead Time */}
                      <td style={{ padding: '0.5rem 0.6rem', textAlign: 'center' }}>
                        <span className="badge badge-primary" style={{ fontSize: '0.74rem', fontWeight: 700 }}>
                          {rem.leadTimeDays} Days
                        </span>
                      </td>

                      {/* Procurement Timeline */}
                      <td style={{ padding: '0.5rem 0.6rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem', fontSize: '0.74rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <Calendar size={12} color="var(--text-muted)" />
                            <strong>Target Order: {rem.scheduledDateStr}</strong>
                          </div>
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>
                            {rem.offsetDays === 0 ? 'Day 0 (Highest WO Lead Time)' : `Offset: Day +${rem.offsetDays} (Max: ${rem.maxLeadTimeInWO}d)`}
                          </span>
                        </div>
                      </td>

                      {/* Shortage */}
                      <td style={{ padding: '0.5rem 0.6rem', textAlign: 'right' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                          <span style={{ fontWeight: 900, fontSize: '0.85rem', color: rem.shortage > 0 ? 'var(--danger)' : 'var(--success)' }}>
                            {rem.shortage > 0 ? `${rem.shortage} ${rem.unit}` : '0 (Covered)'}
                          </span>
                          {rem.openPOQty > 0 && (
                            <span style={{ fontSize: '0.68rem', color: 'var(--accent-primary)' }}>
                              Open PO: {rem.openPOQty}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Action */}
                      <td style={{ padding: '0.5rem 0.6rem', textAlign: 'center' }}>
                        <button 
                          type="button"
                          className="btn btn-primary"
                          style={{ padding: '0.22rem 0.55rem', fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                          onClick={() => setActiveModule('purchase-orders')}
                          title="Open Purchase Orders module to issue PO"
                        >
                          <ShoppingCart size={13} />
                          <span>+ Raise PO</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Main Two-Column Summary Sections */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        
        {/* Active Machine Manufacturing Work Orders */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Wrench size={18} style={{ color: 'var(--accent-primary)' }} />
              Active Moulding Machine Build Orders
            </h3>
            <button className="btn btn-outline" style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem' }} onClick={() => setActiveModule('work-orders')}>
              View All
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {workOrders.length === 0 ? (
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1rem' }}>
                No active work orders.
              </div>
            ) : (
              workOrders.map(wo => (
                <div 
                  key={wo.id}
                  onClick={() => setActiveModule('work-orders')}
                  onDoubleClick={() => setActiveModule('work-orders')}
                  title={`Double-click to open Work Order ${wo.workOrderNo}`}
                  style={{
                    padding: '0.875rem',
                    borderRadius: '0.5rem',
                    backgroundColor: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-color)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    transition: 'transform 0.12s ease, border-color 0.15s ease'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--accent-primary)' }}>
                      {wo.workOrderNo}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                      {wo.machineModel} ({wo.quantity} Units)
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                      Target: {wo.targetCompletionDate} &bull; Lead: {wo.assignedLead}
                    </div>
                  </div>
                  <span className={`badge ${wo.status === 'IN_PROGRESS' ? 'badge-warning' : 'badge-success'}`}>
                    {wo.stage.replace('_', ' ')}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Active External Jobwork Stock at Vendors */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Truck size={18} style={{ color: 'var(--warning)' }} />
              External Jobwork Stock at Vendors
            </h3>
            <button className="btn btn-outline" style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem' }} onClick={() => setActiveModule('external-inventory')}>
              Track All Challans
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {jobworks.length === 0 ? (
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1rem' }}>
                No pending vendor challans.
              </div>
            ) : (
              jobworks.map(jw => (
                <div 
                  key={jw.id}
                  onClick={() => setActiveModule('external-inventory')}
                  onDoubleClick={() => setActiveModule('external-inventory')}
                  title={`Double-click to track Challan ${jw.challanNo}`}
                  style={{
                    padding: '0.875rem',
                    borderRadius: '0.5rem',
                    backgroundColor: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-color)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.35rem',
                    cursor: 'pointer',
                    transition: 'transform 0.12s ease, border-color 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--warning)' }}>
                      {jw.challanNo}
                    </span>
                    <span className={`badge ${jw.status === 'COMPLETED' ? 'badge-success' : 'badge-warning'}`}>
                      {jw.pendingBalance} PCS Pending
                    </span>
                  </div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {jw.itemName}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    Vendor: <strong>{jw.vendorName}</strong> &bull; Process: {jw.processRequired}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Quick Access Action Grid */}
      <div className="card" style={{ padding: '1.25rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-primary)' }}>
          Quick Operational Workflows (Double-Click to Launch)
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
          <button 
            className="btn btn-secondary" 
            style={{ justifyContent: 'flex-start', padding: '0.75rem' }}
            onClick={() => setActiveModule('external-inventory')}
            onDoubleClick={() => setActiveModule('external-inventory')}
          >
            <Truck size={18} style={{ color: 'var(--warning)' }} />
            <span>Issue Outward Jobwork</span>
          </button>
          <button 
            className="btn btn-secondary" 
            style={{ justifyContent: 'flex-start', padding: '0.75rem' }}
            onClick={() => setActiveModule('purchase-orders')}
            onDoubleClick={() => setActiveModule('purchase-orders')}
          >
            <ShoppingCart size={18} style={{ color: 'var(--accent-primary)' }} />
            <span>Create Purchase Order</span>
          </button>
          <button 
            className="btn btn-secondary" 
            style={{ justifyContent: 'flex-start', padding: '0.75rem' }}
            onClick={() => setActiveModule('quality-control')}
            onDoubleClick={() => setActiveModule('quality-control')}
          >
            <ShieldCheck size={18} style={{ color: 'var(--success)' }} />
            <span>Log Quality Inspection</span>
          </button>
          <button 
            className="btn btn-secondary" 
            style={{ justifyContent: 'flex-start', padding: '0.75rem' }}
            onClick={() => setActiveModule('shortage')}
            onDoubleClick={() => setActiveModule('shortage')}
          >
            <Cpu size={18} style={{ color: '#a855f7' }} />
            <span>Moulding Machine Shortage</span>
          </button>
        </div>
      </div>

    </div>
  );
};
