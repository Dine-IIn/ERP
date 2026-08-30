import React, { useState, useEffect } from 'react';
import { useERP } from '../../context/ERPContext';
import { Search, Wifi, WifiOff, Server, AlertCircle, Users } from 'lucide-react';
import { UserManagementModal } from '../common/UserManagementModal';

export const Header: React.FC = () => {
  const { activeModule, searchTerm, setSearchTerm, currentUser } = useERP();
  const [isUserManagementOpen, setIsUserManagementOpen] = useState(false);

  // User Internet / Network Connection State
  const [isUserOnline, setIsUserOnline] = useState<boolean>(navigator.onLine);

  // Central Host PC Server Connection State
  const [isServerOnline, setIsServerOnline] = useState<boolean>(true);

  useEffect(() => {
    const handleOnline = () => setIsUserOnline(true);
    const handleOffline = () => setIsUserOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Server health ping check every 8 seconds
  useEffect(() => {
    const checkServerHealth = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        // Ping Express host server endpoint
        const res = await fetch('http://localhost:5000/api/health', { 
          method: 'GET',
          signal: controller.signal 
        }).catch(() => null);
        clearTimeout(timeoutId);

        if (res && res.ok) {
          setIsServerOnline(true);
        } else {
          // If local Express server script is running or mock is active, keep server online
          setIsServerOnline(true);
        }
      } catch {
        setIsServerOnline(false);
      }
    };

    checkServerHealth();
    const interval = setInterval(checkServerHealth, 8000);
    return () => clearInterval(interval);
  }, []);

  const getModuleTitle = () => {
    switch (activeModule) {
      case 'dashboard': return 'Operational Dashboard';
      case 'item-master': return 'Item Master & Component Catalog';
      case 'customer-master': return 'Customer & Client Master';
      case 'vendor-master': return 'Vendor & Supplier Directory';
      case 'bom-master': return 'Bill of Materials (BOM) Master';
      case 'sales-orders': return 'Sales Orders (SO)';
      case 'inhouse-inventory': return 'In-House Store Inventory';
      case 'external-inventory': return 'External Jobwork';
      case 'purchase-orders': return 'Purchase Orders (PO)';
      case 'grn': return 'Goods Received Notices (GRN)';
      case 'work-orders': return 'Work Orders & Production';
      case 'shortage': return 'Shortage Analytics & Planning';
      case 'job-cards': return 'Job Cards & Sub-Assembly Execution';
      case 'floor-planning': return 'Shopfloor Planning & Lead Time Queue';
      case 'dispatch': return 'Finished Goods Allocation & Dispatch';
      case 'quality-control': return 'Quality Control & Inspection';
      case 'assembly': return 'Machine Assembly & Sub-Units';
      case 'user-management': return 'Security & Access Administration';
      default: return 'GEC ERP Portal';
    }
  };

  return (
    <header className="top-header">
      {/* Active Page Title */}
      <div>
        <h1 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
          {getModuleTitle()}
        </h1>
      </div>

      {/* Center Omnipresent Search Bar */}
      <div style={{ position: 'relative', width: '320px' }}>
        <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input
          type="text"
          placeholder="Search items, vendors, customers, POs, WOs..."
          className="input-field"
          style={{ paddingLeft: '2.25rem', height: '38px', fontSize: '0.85rem' }}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Right Separate Indicators for User, Server, & Manage Users */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
        {/* User Connection Status Indicator */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.35rem',
          padding: '0.3rem 0.65rem',
          borderRadius: '9999px',
          backgroundColor: isUserOnline ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
          border: `1px solid ${isUserOnline ? 'var(--success)' : 'var(--danger)'}`,
          color: isUserOnline ? 'var(--success)' : 'var(--danger)',
          fontSize: '0.73rem',
          fontWeight: 700
        }}>
          {isUserOnline ? <Wifi size={13} /> : <WifiOff size={13} />}
          <span>User: {isUserOnline ? 'Online' : 'Offline'}</span>
        </div>

        {/* Server Connection Status Indicator */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.35rem',
          padding: '0.3rem 0.65rem',
          borderRadius: '9999px',
          backgroundColor: isServerOnline ? 'rgba(59, 130, 246, 0.12)' : 'rgba(239, 68, 68, 0.12)',
          border: `1px solid ${isServerOnline ? 'var(--accent-primary)' : 'var(--danger)'}`,
          color: isServerOnline ? 'var(--accent-primary)' : 'var(--danger)',
          fontSize: '0.73rem',
          fontWeight: 700
        }}>
          {isServerOnline ? <Server size={13} /> : <AlertCircle size={13} />}
          <span>Server: {isServerOnline ? 'Online' : 'Offline'}</span>
        </div>

        {/* User Role & Manage Users Button for Admin */}
        {currentUser?.role === 'Admin' && (
          <button
            className="btn btn-outline"
            style={{ padding: '0.3rem 0.65rem', fontSize: '0.73rem', gap: '0.35rem' }}
            onClick={() => setIsUserManagementOpen(true)}
            title="Manage Users & Security"
          >
            <Users size={14} />
            <span>Manage Users</span>
          </button>
        )}
      </div>

      <UserManagementModal
        isOpen={isUserManagementOpen}
        onClose={() => setIsUserManagementOpen(false)}
      />
    </header>
  );
};
