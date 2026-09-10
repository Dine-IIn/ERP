import React, { useState, useMemo } from 'react';
import { useERP } from '../../context/ERPContext';
import { 
  ShieldAlert, AlertTriangle, AlertCircle, CheckCircle2, TrendingUp, TrendingDown,
  Warehouse, ShoppingCart, Wrench, Truck, ShieldCheck, Activity, Users,
  ArrowRight, Search, RefreshCw, Filter, Layers, DollarSign, Clock, Zap, Check, Eye
} from 'lucide-react';
import { Item, WorkOrder, PurchaseOrder, JobworkChallan, JobCard, SalesOrder, UserActivityLog } from '../../types/erp';

export type AnomalySeverity = 'CRITICAL' | 'WARNING' | 'INFO';
export type AnomalyCategory = 'INVENTORY' | 'PRODUCTION' | 'PROCUREMENT' | 'QUALITY' | 'SECURITY';

export interface AnomalyItem {
  id: string;
  severity: AnomalySeverity;
  category: AnomalyCategory;
  title: string;
  description: string;
  moduleKey: string;
  metricValue?: string;
  timestamp: string;
  actionLabel: string;
  details?: Record<string, any>;
}

export const SuperAdminAnalyticsModule: React.FC = () => {
  const { 
    currentUser, items, workOrders, purchaseOrders, jobworks, jobCards, 
    salesOrders, boms, auditLogs, setActiveModule, vendors, customers 
  } = useERP();

  const [severityFilter, setSeverityFilter] = useState<'ALL' | AnomalySeverity>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | AnomalyCategory>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [dismissedAnomalyIds, setDismissedAnomalyIds] = useState<string[]>([]);
  const [selectedAnomaly, setSelectedAnomaly] = useState<AnomalyItem | null>(null);

  const todayStr = new Date().toISOString().split('T')[0];

  // -------------------------------------------------------------
  // 1. ANOMALY DETECTION ENGINE
  // -------------------------------------------------------------
  const detectedAnomalies = useMemo<AnomalyItem[]>(() => {
    const list: AnomalyItem[] = [];

    // A. Inventory Anomalies
    items.forEach(item => {
      // Negative Stock Discrepancy
      if ((item.inHouseStock || 0) < 0 || (item.externalStock || 0) < 0) {
        list.push({
          id: `inv-neg-${item.id}`,
          severity: 'CRITICAL',
          category: 'INVENTORY',
          title: `Negative Stock Balance: ${item.itemCode}`,
          description: `Item ${item.name} (${item.itemCode}) has invalid negative inventory balance (In-House: ${item.inHouseStock}, External: ${item.externalStock}). Immediate store physical audit required.`,
          moduleKey: 'inhouse-inventory',
          metricValue: `${item.inHouseStock} ${item.unit}`,
          timestamp: todayStr,
          actionLabel: 'Inspect Store Inventory',
          details: { itemCode: item.itemCode, inHouseStock: item.inHouseStock, externalStock: item.externalStock }
        });
      }

      // Zero Stock with Active WO Demand
      const minStock = item.minStockQty !== undefined ? item.minStockQty : (item.reorderLevel || 0);
      if ((item.inHouseStock || 0) <= 0 && minStock > 0 && !item.isBlocked) {
        list.push({
          id: `inv-zero-${item.id}`,
          severity: 'WARNING',
          category: 'INVENTORY',
          title: `Stock Depleted Below Safety Level: ${item.itemCode}`,
          description: `Item ${item.name} is completely out of stock with a safety threshold of ${minStock} ${item.unit}. Production line starvation risk.`,
          moduleKey: 'shortage',
          metricValue: `0 / ${minStock} ${item.unit}`,
          timestamp: todayStr,
          actionLabel: 'Open Shortage Workbench',
          details: { itemCode: item.itemCode, minStock }
        });
      }

      // Missing Unit Price
      if (!item.unitPrice || item.unitPrice <= 0) {
        list.push({
          id: `inv-price-${item.id}`,
          severity: 'INFO',
          category: 'INVENTORY',
          title: `Zero / Missing Standard Unit Price: ${item.itemCode}`,
          description: `Item ${item.name} has ₹0.00 standard unit price configured. This impacts accurate BOM costing and valuation metrics.`,
          moduleKey: 'item-master',
          metricValue: `₹0.00`,
          timestamp: todayStr,
          actionLabel: 'Update Item Master',
          details: { itemCode: item.itemCode, category: item.category }
        });
      }
    });

    // B. Production & Work Order Anomalies
    workOrders.forEach(wo => {
      // Overdue Work Order
      if (wo.status === 'IN_PROGRESS' || wo.status === 'PLANNED') {
        const targetDate = wo.targetCompletionDate || wo.startDate;
        if (targetDate && targetDate < todayStr) {
          list.push({
            id: `wo-overdue-${wo.id}`,
            severity: 'CRITICAL',
            category: 'PRODUCTION',
            title: `Overdue Work Order: ${wo.workOrderNo || wo.woNumber}`,
            description: `Work order for machine ${wo.machineModel} (Target Qty: ${wo.quantity || wo.targetQuantity}) exceeded planned build date (${targetDate}) and remains incomplete.`,
            moduleKey: 'work-orders',
            metricValue: `Overdue Target: ${targetDate}`,
            timestamp: targetDate,
            actionLabel: 'View Work Order Shopfloor',
            details: { workOrderNo: wo.workOrderNo || wo.woNumber, machineModel: wo.machineModel, completedQty: wo.completedQuantity }
          });
        }
      }
    });

    // C. External Job Work & Challan Anomalies
    jobworks.forEach(jw => {
      // Overdue Jobwork Challan with Vendor
      if (jw.status !== 'COMPLETED' && (jw.pendingBalance || 0) > 0) {
        if (jw.expectedReturnDate && jw.expectedReturnDate < todayStr) {
          list.push({
            id: `jw-overdue-${jw.id}`,
            severity: 'CRITICAL',
            category: 'PRODUCTION',
            title: `Delayed Jobwork Return: ${jw.challanNo}`,
            description: `Vendor "${jw.vendorName}" has ${jw.pendingBalance} PCS of ${jw.itemCode} (${jw.itemName}) past expected return date (${jw.expectedReturnDate}).`,
            moduleKey: 'external-inventory',
            metricValue: `${jw.pendingBalance} PCS Pending`,
            timestamp: jw.expectedReturnDate,
            actionLabel: 'Review Vendor Challan',
            details: { challanNo: jw.challanNo, vendor: jw.vendorName, pendingQty: jw.pendingBalance }
          });
        }
      }

      // High Scrap Rate Anomaly in Jobwork
      if (jw.sentQuantity > 0 && jw.scrapQuantity > 0) {
        const scrapPct = (jw.scrapQuantity / jw.sentQuantity) * 100;
        if (scrapPct >= 5) {
          list.push({
            id: `jw-scrap-${jw.id}`,
            severity: scrapPct >= 10 ? 'CRITICAL' : 'WARNING',
            category: 'QUALITY',
            title: `High Jobwork Scrap Rate (${scrapPct.toFixed(1)}%): ${jw.challanNo}`,
            description: `Vendor "${jw.vendorName}" reported ${jw.scrapQuantity} scrap units out of ${jw.sentQuantity} sent for ${jw.itemCode} (${jw.processRequired}).`,
            moduleKey: 'external-inventory',
            metricValue: `${scrapPct.toFixed(1)}% Scrap`,
            timestamp: jw.issueDate || todayStr,
            actionLabel: 'Audit Vendor Quality',
            details: { vendor: jw.vendorName, scrapQty: jw.scrapQuantity, sentQty: jw.sentQuantity }
          });
        }
      }
    });

    // D. Procurement & Purchase Order Anomalies
    purchaseOrders.forEach(po => {
      if (po.status !== 'GOODS_RECEIVED' && (po.status as string) !== 'RECEIVED' && po.status !== 'CANCELLED' && !po.isDeleted) {
        const targetDelivery = po.expectedDeliveryDate || po.deliveryDate;
        if (targetDelivery && targetDelivery < todayStr) {
          const totalVal = po.totalAmount || po.items.reduce((s, i) => s + ((i.quantity || 1) * (i.unitPrice || 0)), 0);
          list.push({
            id: `po-overdue-${po.id}`,
            severity: totalVal > 100000 ? 'CRITICAL' : 'WARNING',
            category: 'PROCUREMENT',
            title: `Overdue Purchase Order: ${po.poNumber}`,
            description: `PO ${po.poNumber} with vendor "${po.vendorName}" (Value: ₹${totalVal.toLocaleString('en-IN')}) was expected on ${targetDelivery}.`,
            moduleKey: 'purchase-orders',
            metricValue: `₹${totalVal.toLocaleString('en-IN')}`,
            timestamp: targetDelivery,
            actionLabel: 'Track Purchase Order',
            details: { poNumber: po.poNumber, vendorName: po.vendorName, totalAmount: totalVal }
          });
        }
      }
    });

    // E. Security & Audit Trail Alerts
    (auditLogs || []).slice(0, 50).forEach(log => {
      const action = (log.action || '').toUpperCase();
      if (action.includes('DELETE') || action.includes('ROLE_UPDATE') || action.includes('RESTORE') || action.includes('RESET')) {
        list.push({
          id: `sec-audit-${log.id}`,
          severity: action.includes('RESET') || action.includes('DELETE_USER') ? 'CRITICAL' : 'WARNING',
          category: 'SECURITY',
          title: `High-Impact Security Event: ${log.action}`,
          description: `User "${log.username || 'Admin'}" performed high-privilege action on ${log.module || 'System'}: ${log.details || ''}`,
          moduleKey: 'user-management',
          metricValue: log.username || 'Admin',
          timestamp: log.timestamp || todayStr,
          actionLabel: 'Audit Access Logs',
          details: { action: log.action, username: log.username, details: log.details }
        });
      }
    });

    return list;
  }, [items, workOrders, purchaseOrders, jobworks, auditLogs, todayStr]);

  // Filter active anomalies (excluding dismissed)
  const activeAnomalies = useMemo(() => {
    return detectedAnomalies.filter(a => {
      if (dismissedAnomalyIds.includes(a.id)) return false;
      if (severityFilter !== 'ALL' && a.severity !== severityFilter) return false;
      if (categoryFilter !== 'ALL' && a.category !== categoryFilter) return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        return (
          a.title.toLowerCase().includes(term) ||
          a.description.toLowerCase().includes(term) ||
          a.category.toLowerCase().includes(term)
        );
      }
      return true;
    });
  }, [detectedAnomalies, dismissedAnomalyIds, severityFilter, categoryFilter, searchTerm]);

  // -------------------------------------------------------------
  // 2. EXECUTIVE ANALYTICS KPIS
  // -------------------------------------------------------------
  const kpis = useMemo(() => {
    // Total Inventory Valuation
    const totalInHouseVal = items.reduce((sum, i) => sum + ((i.inHouseStock || 0) * (i.unitPrice || 0)), 0);
    const totalExternalVal = items.reduce((sum, i) => sum + ((i.externalStock || 0) * (i.unitPrice || 0)), 0);
    const totalInventoryValuation = totalInHouseVal + totalExternalVal;

    // Open Procurement Liability
    const openPOValue = purchaseOrders
      .filter(p => p.status !== 'GOODS_RECEIVED' && (p.status as string) !== 'RECEIVED' && p.status !== 'CANCELLED' && !p.isDeleted)
      .reduce((sum, p) => sum + (p.totalAmount || p.items.reduce((s, i) => s + ((i.quantity || 1) * (i.unitPrice || 0)), 0)), 0);

    // Confirmed Sales Pipeline
    const salesPipelineValue = salesOrders
      .filter(s => s.status !== 'CANCELLED' && s.status !== 'COMPLETED')
      .reduce((sum, s) => sum + (s.totalAmount || ((s.quantity || 1) * (s.unitPrice || 0))), 0);

    // Active Shopfloor Work Orders
    const activeWOCount = workOrders.filter(w => w.status === 'IN_PROGRESS').length;

    // Overall Enterprise Health Score (100 base, deducted by critical/warning anomalies)
    const criticalCount = detectedAnomalies.filter(a => a.severity === 'CRITICAL' && !dismissedAnomalyIds.includes(a.id)).length;
    const warningCount = detectedAnomalies.filter(a => a.severity === 'WARNING' && !dismissedAnomalyIds.includes(a.id)).length;
    const healthScore = Math.max(0, Math.min(100, Math.round(100 - (criticalCount * 7 + warningCount * 2))));

    return {
      totalInventoryValuation,
      totalInHouseVal,
      totalExternalVal,
      openPOValue,
      salesPipelineValue,
      activeWOCount,
      healthScore,
      criticalCount,
      warningCount,
      totalAnomalies: detectedAnomalies.length
    };
  }, [items, purchaseOrders, salesOrders, workOrders, detectedAnomalies, dismissedAnomalyIds]);

  const handleDismissAnomaly = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDismissedAnomalyIds(prev => [...prev, id]);
  };

  const handleNavigateToModule = (moduleKey: string) => {
    setActiveModule(moduleKey);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', paddingBottom: '2rem' }}>
      
      {/* Superadmin Executive Banner */}
      <div style={{
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: '0.75rem',
        padding: '1.25rem 1.5rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
        boxShadow: 'var(--shadow-sm)',
        background: 'linear-gradient(135deg, var(--bg-card) 0%, rgba(99, 102, 241, 0.05) 100%)'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.25rem' }}>
            <div style={{
              padding: '0.4rem',
              borderRadius: '0.5rem',
              backgroundColor: 'rgba(99, 102, 241, 0.15)',
              color: 'var(--accent-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <ShieldAlert size={22} />
            </div>
            <h1 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
              SuperAdmin Analytics & Anomaly Detection Hub
            </h1>
            <span className="badge" style={{ backgroundColor: '#7c3aed', color: '#fff', fontSize: '0.72rem', fontWeight: 700 }}>
              🛡️ SUPERADMIN EXCLUSIVE
            </span>
          </div>
          <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            Real-time enterprise intelligence, operational discrepancy surveillance, financial liability tracking, and shopfloor bottleneck detection.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.5rem 1rem',
            borderRadius: '0.5rem',
            backgroundColor: kpis.healthScore >= 80 ? 'rgba(34, 197, 94, 0.1)' : kpis.healthScore >= 50 ? 'rgba(234, 179, 8, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            border: `1px solid ${kpis.healthScore >= 80 ? 'var(--success)' : kpis.healthScore >= 50 ? 'var(--warning)' : 'var(--danger)'}`
          }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Enterprise Health</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 900, color: kpis.healthScore >= 80 ? 'var(--success)' : kpis.healthScore >= 50 ? 'var(--warning)' : 'var(--danger)' }}>
                {kpis.healthScore}%
              </div>
            </div>
            <Activity size={24} color={kpis.healthScore >= 80 ? 'var(--success)' : kpis.healthScore >= 50 ? 'var(--warning)' : 'var(--danger)'} />
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        
        {/* Total Inventory Valuation */}
        <div className="card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.35rem', position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Inventory Asset</span>
            <Warehouse size={16} color="var(--accent-primary)" />
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            ₹{kpis.totalInventoryValuation.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            In-House: ₹{kpis.totalInHouseVal.toLocaleString('en-IN')} | Vendor: ₹{kpis.totalExternalVal.toLocaleString('en-IN')}
          </div>
        </div>

        {/* Open Procurement Liability */}
        <div className="card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Open PO Liabilities</span>
            <ShoppingCart size={16} color="#d97706" />
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#d97706' }}>
            ₹{kpis.openPOValue.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            Across all pending vendor purchase orders
          </div>
        </div>

        {/* Confirmed Sales Orders Pipeline */}
        <div className="card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Active Order Pipeline</span>
            <TrendingUp size={16} color="var(--success)" />
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--success)' }}>
            ₹{kpis.salesPipelineValue.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            Confirmed commercial sales order commitments
          </div>
        </div>

        {/* Active Shopfloor Work Orders */}
        <div className="card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Active Machine Builds</span>
            <Wrench size={16} color="var(--accent-primary)" />
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent-primary)' }}>
            {kpis.activeWOCount} Machines
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            Currently staging & assembling on shopfloor
          </div>
        </div>

        {/* Active Anomalies Count */}
        <div className="card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.35rem', backgroundColor: kpis.criticalCount > 0 ? 'rgba(239, 68, 68, 0.05)' : 'var(--bg-card)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Active Anomalies</span>
            <AlertTriangle size={16} color={kpis.criticalCount > 0 ? 'var(--danger)' : 'var(--warning)'} />
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: kpis.criticalCount > 0 ? 'var(--danger)' : 'var(--text-primary)' }}>
            {activeAnomalies.length} Flagged
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            <span style={{ color: 'var(--danger)', fontWeight: 700 }}>{kpis.criticalCount} Critical</span> • <span style={{ color: '#d97706', fontWeight: 700 }}>{kpis.warningCount} Warnings</span>
          </div>
        </div>
      </div>

      {/* Main Anomaly Radar Section */}
      <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        
        {/* Radar Controls Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
              <Zap size={18} color="var(--warning)" />
              Automated Anomaly Radar & Risk Detection
            </h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Identifies inventory discrepancies, vendor delays, high scrap rates, and security anomalies in real-time.
            </span>
          </div>

          {dismissedAnomalyIds.length > 0 && (
            <button
              className="btn btn-outline"
              style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
              onClick={() => setDismissedAnomalyIds([])}
            >
              <RefreshCw size={13} /> Reset Dismissed ({dismissedAnomalyIds.length})
            </button>
          )}
        </div>

        {/* Filters & Search Toolbar */}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center', padding: '0.75rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: '0.5rem' }}>
          
          <div style={{ position: 'relative', width: '260px', maxWidth: '100%' }}>
            <Search size={14} style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search anomalies..."
              className="input-field"
              style={{ paddingLeft: '2rem', fontSize: '0.8rem', padding: '0.35rem 0.6rem 0.35rem 2rem' }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Severity Filters */}
          <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Severity:</span>
            {(['ALL', 'CRITICAL', 'WARNING', 'INFO'] as const).map(sev => (
              <button
                key={sev}
                className={`btn ${severityFilter === sev ? 'btn-primary' : 'btn-outline'}`}
                style={{ padding: '0.2rem 0.5rem', fontSize: '0.72rem', fontWeight: 600 }}
                onClick={() => setSeverityFilter(sev)}
              >
                {sev === 'CRITICAL' && '🔴 '}
                {sev === 'WARNING' && '🟡 '}
                {sev === 'INFO' && '🔵 '}
                {sev}
              </button>
            ))}
          </div>

          {/* Category Filters */}
          <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center', marginLeft: 'auto', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Domain:</span>
            {(['ALL', 'INVENTORY', 'PRODUCTION', 'PROCUREMENT', 'QUALITY', 'SECURITY'] as const).map(cat => (
              <button
                key={cat}
                className={`btn ${categoryFilter === cat ? 'btn-primary' : 'btn-outline'}`}
                style={{ padding: '0.2rem 0.5rem', fontSize: '0.72rem', fontWeight: 600 }}
                onClick={() => setCategoryFilter(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Anomalies List */}
        {activeAnomalies.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
            <CheckCircle2 size={42} color="var(--success)" style={{ margin: '0 auto 0.75rem' }} />
            <h4 style={{ fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 0.25rem' }}>All Systems Operating Normally</h4>
            <p style={{ fontSize: '0.82rem', margin: 0 }}>No critical discrepancies, negative stock anomalies, or stalled shopfloor workflows detected.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {activeAnomalies.map(anomaly => {
              const isCritical = anomaly.severity === 'CRITICAL';
              const isWarning = anomaly.severity === 'WARNING';

              return (
                <div
                  key={anomaly.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.85rem 1rem',
                    borderRadius: '0.5rem',
                    border: `1px solid ${isCritical ? 'rgba(239, 68, 68, 0.4)' : isWarning ? 'rgba(234, 179, 8, 0.4)' : 'var(--border-color)'}`,
                    backgroundColor: isCritical ? 'rgba(239, 68, 68, 0.04)' : isWarning ? 'rgba(234, 179, 8, 0.04)' : 'var(--bg-card)',
                    gap: '1rem',
                    flexWrap: 'wrap',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', flex: 1, minWidth: '280px' }}>
                    <div style={{ marginTop: '0.15rem' }}>
                      {isCritical ? (
                        <AlertCircle size={20} color="var(--danger)" />
                      ) : isWarning ? (
                        <AlertTriangle size={20} color="#d97706" />
                      ) : (
                        <Activity size={20} color="var(--accent-primary)" />
                      )}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.2rem' }}>
                        <span style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                          {anomaly.title}
                        </span>
                        <span className="badge" style={{
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          backgroundColor: isCritical ? 'rgba(239, 68, 68, 0.15)' : isWarning ? 'rgba(234, 179, 8, 0.15)' : 'rgba(99, 102, 241, 0.15)',
                          color: isCritical ? 'var(--danger)' : isWarning ? '#d97706' : 'var(--accent-primary)'
                        }}>
                          {anomaly.severity}
                        </span>
                        <span className="badge badge-neutral" style={{ fontSize: '0.68rem' }}>
                          {anomaly.category}
                        </span>
                        {anomaly.metricValue && (
                          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                            [{anomaly.metricValue}]
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.35 }}>
                        {anomaly.description}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <button
                      type="button"
                      className="btn btn-primary"
                      style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem', fontWeight: 700, gap: '0.35rem', display: 'flex', alignItems: 'center' }}
                      onClick={() => handleNavigateToModule(anomaly.moduleKey)}
                    >
                      <span>{anomaly.actionLabel}</span>
                      <ArrowRight size={14} />
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline"
                      style={{ padding: '0.35rem 0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}
                      title="Dismiss anomaly alert for this session"
                      onClick={(e) => handleDismissAnomaly(anomaly.id, e)}
                    >
                      <Check size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
