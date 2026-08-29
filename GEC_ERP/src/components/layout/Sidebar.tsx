import React from 'react';
import { useERP } from '../../context/ERPContext';
import { 
  LayoutDashboard, Package, Users, Contact, Warehouse, Truck, 
  ShoppingCart, FileCheck, Wrench, ShieldCheck, Layers, Shield, Cpu, LogOut, Sun, Moon, FileText, ShoppingBag 
} from 'lucide-react';

interface NavItem {
  key: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
  adminOnly?: boolean;
}

export const Sidebar: React.FC = () => {
  const { 
    activeModule, setActiveModule, currentUser, logout, theme, toggleTheme,
    items, jobworks, purchaseOrders, workOrders, salesOrders
  } = useERP();

  const lowStockCount = items.filter(i => i.inHouseStock <= (i.reorderLevel || i.minStockQty || 5)).length;
  const activeJobworkCount = jobworks.filter(j => j.status !== 'COMPLETED').length;
  const pendingPOCount = purchaseOrders.filter(p => p.status === 'ISSUED' || p.status === 'PARTIALLY_RECEIVED').length;
  const activeWOCount = workOrders.filter(w => w.status === 'IN_PROGRESS').length;
  const activeSOCount = salesOrders.filter(s => s.status === 'CONFIRMED').length;

  const navItems: NavItem[] = [
    { key: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={16} /> },
    { key: 'item-master', label: 'Item Master', icon: <Package size={16} />, badge: lowStockCount > 0 ? lowStockCount : undefined },
    { key: 'customer-master', label: 'Customer Master', icon: <Contact size={16} /> },
    { key: 'vendor-master', label: 'Vendor / Supplier', icon: <Users size={16} /> },
    { key: 'bom-master', label: 'BOM Master', icon: <FileText size={16} /> },
    { key: 'sales-orders', label: 'Sales Orders (SO)', icon: <ShoppingBag size={16} />, badge: activeSOCount > 0 ? activeSOCount : undefined },
    { key: 'work-orders', label: 'Work Orders (WO)', icon: <Wrench size={16} />, badge: activeWOCount > 0 ? activeWOCount : undefined },
    { key: 'inhouse-inventory', label: 'In-House Inventory', icon: <Warehouse size={16} /> },
    { key: 'external-inventory', label: 'External Jobwork', icon: <Truck size={16} />, badge: activeJobworkCount > 0 ? activeJobworkCount : undefined },
    { key: 'purchase-orders', label: 'Purchase Orders (PO)', icon: <ShoppingCart size={16} />, badge: pendingPOCount > 0 ? pendingPOCount : undefined },
    { key: 'grn', label: 'Goods Received (GRN)', icon: <FileCheck size={16} /> },
    { key: 'quality-control', label: 'Quality Control (QC)', icon: <ShieldCheck size={16} /> },
    { key: 'assembly', label: 'Machine Assembly', icon: <Layers size={16} /> },
    ...(currentUser?.role === 'Admin' ? [{ key: 'user-management', label: 'Security & RBAC', icon: <Shield size={16} /> }] : [])
  ];

  return (
    <aside className="sidebar-fixed">
      {/* Sidebar Header Logo - Perfectly Aligned 64px Header */}
      <div style={{
        height: '64px',
        maxHeight: '64px',
        minHeight: '64px',
        padding: '0 1.25rem',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        gap: '0.65rem',
        boxSizing: 'border-box'
      }}>
        <div style={{
          width: '36px',
          height: '36px',
          borderRadius: '0.5rem',
          backgroundColor: 'var(--accent-primary)',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 800,
          fontSize: '1rem',
          letterSpacing: '-0.02em',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.2)'
        }}>
          GEC
        </div>
        <div>
          <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, lineHeight: 1.1 }}>
            GEC ERP
          </h2>
          <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 500, letterSpacing: '0.02em' }}>
            Moulding Machines
          </span>
        </div>
      </div>

      {/* Navigation List - Ultra Compact Vertical Padding (Fits 100vh No Scroll) */}
      <nav style={{ flex: 1, padding: '0.4rem 0.5rem', display: 'flex', flexDirection: 'column', gap: '0.1rem', overflow: 'hidden' }}>
        <div style={{ 
          fontSize: '0.65rem', 
          fontWeight: 700, 
          color: 'var(--text-muted)', 
          textTransform: 'uppercase', 
          letterSpacing: '0.08em', 
          padding: '0.15rem 0.5rem' 
        }}>
          ERP Modules
        </div>

        {navItems.map(item => {
          const isActive = activeModule === item.key;
          return (
            <button
              key={item.key}
              onClick={() => setActiveModule(item.key)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.32rem 0.6rem',
                borderRadius: '0.375rem',
                border: 'none',
                backgroundColor: isActive ? 'var(--accent-primary)' : 'transparent',
                color: isActive ? '#ffffff' : 'var(--text-secondary)',
                fontWeight: isActive ? 600 : 400,
                fontSize: '0.8rem',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'var(--accent-light)';
                  e.currentTarget.style.color = 'var(--accent-primary)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = 'var(--text-secondary)';
                }
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                <span style={{ color: isActive ? '#ffffff' : 'inherit' }}>{item.icon}</span>
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && (
                <span style={{
                  padding: '0.1rem 0.35rem',
                  borderRadius: '9999px',
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  backgroundColor: isActive ? 'rgba(255, 255, 255, 0.25)' : 'var(--accent-light)',
                  color: isActive ? '#ffffff' : 'var(--accent-primary)'
                }}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Ultra Compact Footer Controls */}
      <div style={{
        padding: '0.5rem 0.75rem',
        borderTop: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'rgba(0, 0, 0, 0.05)',
        gap: '0.5rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', overflow: 'hidden', flex: 1 }}>
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: '9999px',
            backgroundColor: 'var(--accent-light)',
            color: 'var(--accent-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: '0.78rem',
            flexShrink: 0
          }}>
            {currentUser?.fullName.charAt(0) || 'U'}
          </div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
              {currentUser?.fullName}
            </div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
              {currentUser?.role}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.35rem', flexShrink: 0 }}>
          <button
            onClick={toggleTheme}
            className="btn btn-secondary"
            style={{ padding: '0.25rem 0.4rem', fontSize: '0.7rem' }}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? <Sun size={13} /> : <Moon size={13} />}
          </button>
          <button
            onClick={logout}
            className="btn btn-outline"
            style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem', color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.3)' }}
            title="Log Out"
          >
            <LogOut size={13} />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </aside>
  );
};
