import React from 'react';
import { useERP } from '../../context/ERPContext';
import { StatCard } from '../common/StatCard';
import { 
  Warehouse, Truck, Wrench, ShoppingCart, 
  AlertTriangle, ArrowRight, ShieldCheck, Cpu 
} from 'lucide-react';

export const DashboardModule: React.FC = () => {
  const { 
    items, jobworks, purchaseOrders, workOrders, 
    qcInspections, setActiveModule 
  } = useERP();

  const totalInHouseItems = items.length;
  const lowStockItems = items.filter(i => i.inHouseStock <= i.reorderLevel);
  const activeJobworks = jobworks.filter(j => j.status !== 'COMPLETED');
  const totalPendingJobworkQty = activeJobworks.reduce((sum, j) => sum + j.pendingBalance, 0);
  const activeWOs = workOrders.filter(w => w.status === 'IN_PROGRESS');
  const pendingPOs = purchaseOrders.filter(p => p.status === 'ISSUED' || p.status === 'PARTIALLY_RECEIVED');

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
            padding: '1rem 1.25rem',
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
