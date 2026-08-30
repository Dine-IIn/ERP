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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top Banner Alert if low stock */}
      {lowStockItems.length > 0 && (
        <div style={{
          backgroundColor: 'rgba(245, 158, 11, 0.15)',
          border: '1px solid var(--warning)',
          borderRadius: '0.75rem',
          padding: '1rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
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
            onClick={() => setActiveModule('purchase-orders')}
          >
            <span>View PO Shortages</span>
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
        />
        <StatCard 
          title="Active Jobwork Challans" 
          value={activeJobworks.length} 
          subtitle={`${totalPendingJobworkQty} pcs pending at vendors`}
          icon={<Truck size={24} />}
          color="amber"
        />
        <StatCard 
          title="Machine Work Orders" 
          value={activeWOs.length} 
          subtitle="In active assembly & testing"
          icon={<Wrench size={24} />}
          color="green"
        />
        <StatCard 
          title="Open Purchase Orders" 
          value={pendingPOs.length} 
          subtitle="Awaiting vendor deliveries"
          icon={<ShoppingCart size={24} />}
          color="purple"
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
            {workOrders.map(wo => (
              <div 
                key={wo.id}
                style={{
                  padding: '0.875rem',
                  borderRadius: '0.5rem',
                  backgroundColor: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-color)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
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
            ))}
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
            {jobworks.map(jw => (
              <div 
                key={jw.id}
                style={{
                  padding: '0.875rem',
                  borderRadius: '0.5rem',
                  backgroundColor: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-color)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.35rem'
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
            ))}
          </div>
        </div>

      </div>

      {/* Quick Access Action Grid */}
      <div className="card" style={{ padding: '1.25rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-primary)' }}>
          Quick Operational Workflows
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
          <button 
            className="btn btn-secondary" 
            style={{ justifyContent: 'flex-start', padding: '0.75rem' }}
            onClick={() => setActiveModule('external-inventory')}
          >
            <Truck size={18} style={{ color: 'var(--warning)' }} />
            <span>Issue Outward Jobwork</span>
          </button>
          <button 
            className="btn btn-secondary" 
            style={{ justifyContent: 'flex-start', padding: '0.75rem' }}
            onClick={() => setActiveModule('purchase-orders')}
          >
            <ShoppingCart size={18} style={{ color: 'var(--accent-primary)' }} />
            <span>Create Purchase Order</span>
          </button>
          <button 
            className="btn btn-secondary" 
            style={{ justifyContent: 'flex-start', padding: '0.75rem' }}
            onClick={() => setActiveModule('quality-control')}
          >
            <ShieldCheck size={18} style={{ color: 'var(--success)' }} />
            <span>Log Quality Inspection</span>
          </button>
          <button 
            className="btn btn-secondary" 
            style={{ justifyContent: 'flex-start', padding: '0.75rem' }}
            onClick={() => setActiveModule('mrp-planning')}
          >
            <Cpu size={18} style={{ color: '#a855f7' }} />
            <span>Calculate Machine MRP</span>
          </button>
        </div>
      </div>

    </div>
  );
};
