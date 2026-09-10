import React, { useState, useEffect } from 'react';
import { useERP } from '../../context/ERPContext';
import { Search, Wifi, WifiOff, Server, AlertCircle } from 'lucide-react';
export const Header: React.FC = () => {
  const { 
    activeModule, setActiveModule, searchTerm, setSearchTerm, currentUser,
    items, customers, vendors, salesOrders, workOrders, purchaseOrders, jobCards, boms, grns,
    openBOMInEditor, openWOInEditor
  } = useERP();
  
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // User Internet / Network Connection State
  const [isUserOnline, setIsUserOnline] = useState<boolean>(navigator.onLine);

  // Central Host PC Server Connection State
  const [isServerOnline, setIsServerOnline] = useState<boolean>(false);

  // Probe real internet reachability (even when hotspot is on without data)
  useEffect(() => {
    const checkInternetConnectivity = async () => {
      if (!navigator.onLine) {
        setIsUserOnline(false);
        return;
      }
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);
        // Probe internet with cache-busting
        await fetch(`https://www.google.com/favicon.ico?_=${Date.now()}`, {
          method: 'HEAD',
          mode: 'no-cors',
          cache: 'no-store',
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        setIsUserOnline(true);
      } catch {
        // Hotspot is active but mobile data is turned off / no real internet
        setIsUserOnline(false);
      }
    };

    const handleOnline = () => checkInternetConnectivity();
    const handleOffline = () => setIsUserOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    checkInternetConnectivity();
    const netInterval = setInterval(checkInternetConnectivity, 10000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(netInterval);
    };
  }, []);

  // Server health ping check every 6 seconds
  useEffect(() => {
    const checkServerHealth = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2500);
        // Ping Express host server endpoint
        const res = await fetch('http://localhost:5000/api/health', { 
          method: 'GET',
          signal: controller.signal 
        }).catch(() => null);
        clearTimeout(timeoutId);

        if (res && res.ok) {
          setIsServerOnline(true);
        } else {
          setIsServerOnline(false);
        }
      } catch {
        setIsServerOnline(false);
      }
    };

    checkServerHealth();
    const interval = setInterval(checkServerHealth, 6000);
    return () => clearInterval(interval);
  }, []);

  const getModuleTitle = () => {
    switch (activeModule) {
      case 'dashboard': return 'Operational Dashboard';
      case 'planning': return 'Integrated Material Planning Matrix';
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

  // Cross-module search results
  const isHistorySearch = searchTerm.includes('@');
  const cleanTerm = searchTerm.replace(/@history|@/gi, '').trim().toLowerCase();

  const matchingItems = cleanTerm || isHistorySearch ? items.filter(i => {
    if (isHistorySearch && !i.isBlocked) return false;
    if (!isHistorySearch && i.isBlocked) return false;
    if (!cleanTerm) return true;
    return i.itemCode.toLowerCase().includes(cleanTerm) || i.name.toLowerCase().includes(cleanTerm) || i.category.toLowerCase().includes(cleanTerm);
  }).slice(0, 5) : [];

  const matchingCustomers = cleanTerm ? customers.filter(c => 
    c.name.toLowerCase().includes(cleanTerm) || c.customerCode.toLowerCase().includes(cleanTerm) || (c.city && c.city.toLowerCase().includes(cleanTerm))
  ).slice(0, 4) : [];

  const matchingVendors = cleanTerm ? vendors.filter(v => 
    v.name.toLowerCase().includes(cleanTerm) || v.vendorCode.toLowerCase().includes(cleanTerm) || (v.city && v.city.toLowerCase().includes(cleanTerm))
  ).slice(0, 4) : [];

  const matchingSOs = cleanTerm ? salesOrders.filter(so => 
    so.soNumber.toLowerCase().includes(cleanTerm) || so.customerName.toLowerCase().includes(cleanTerm) || so.machineModel.toLowerCase().includes(cleanTerm)
  ).slice(0, 4) : [];

  const matchingPOs = cleanTerm ? purchaseOrders.filter(po => 
    po.poNumber.toLowerCase().includes(cleanTerm) || po.vendorName.toLowerCase().includes(cleanTerm)
  ).slice(0, 4) : [];

  const matchingWOs = cleanTerm ? workOrders.filter(wo => 
    (wo.workOrderNo || wo.woNumber).toLowerCase().includes(cleanTerm) || wo.machineModel.toLowerCase().includes(cleanTerm)
  ).slice(0, 4) : [];

  const matchingJCs = cleanTerm ? jobCards.filter(jc => 
    jc.jobCardNo.toLowerCase().includes(cleanTerm) || jc.itemName.toLowerCase().includes(cleanTerm)
  ).slice(0, 4) : [];

  const matchingBOMs = cleanTerm ? boms.filter(b => 
    b.bomCode.toLowerCase().includes(cleanTerm) || b.machineModel.toLowerCase().includes(cleanTerm)
  ).slice(0, 4) : [];

  const hasAnyResults = matchingItems.length > 0 || matchingCustomers.length > 0 || matchingVendors.length > 0 || 
    matchingSOs.length > 0 || matchingPOs.length > 0 || matchingWOs.length > 0 || matchingJCs.length > 0 || matchingBOMs.length > 0;

  return (
    <header className="top-header" style={{ position: 'relative' }}>
      {/* Active Page Title */}
      <div>
        <h1 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
          {getModuleTitle()}
        </h1>
      </div>

      {/* Center Omnipresent Search Bar */}
      <div style={{ position: 'relative', width: '380px', maxWidth: '100%' }}>
        <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: isHistorySearch ? '#7c3aed' : 'var(--text-muted)' }} />
        <input
          type="text"
          placeholder="Global Search items, WOs, POs, SOs... (@ for history)"
          className="input-field"
          style={{ 
            paddingLeft: '2.25rem', 
            height: '38px', 
            fontSize: '0.85rem',
            borderColor: isHistorySearch ? '#7c3aed' : undefined 
          }}
          value={searchTerm}
          onFocus={() => setIsSearchOpen(true)}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setIsSearchOpen(true);
          }}
        />

        {searchTerm && (
          <button 
            type="button" 
            onClick={() => { setSearchTerm(''); setIsSearchOpen(false); }}
            style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.8rem', padding: '0.2rem' }}
          >
            ✕
          </button>
        )}

        {/* Global Search Dropdown Overlay */}
        {isSearchOpen && (searchTerm.trim().length > 0 || isHistorySearch) && (
          <div 
            style={{ 
              position: 'absolute', 
              top: '44px', 
              left: 0, 
              width: '460px', 
              maxHeight: '440px', 
              overflowY: 'auto', 
              backgroundColor: 'var(--bg-card)', 
              border: '1px solid var(--border-color)', 
              borderRadius: '0.5rem', 
              boxShadow: 'var(--shadow-lg)', 
              zIndex: 9999,
              padding: '0.75rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.65rem'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.4rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: isHistorySearch ? '#7c3aed' : 'var(--text-muted)' }}>
                {isHistorySearch ? '📜 Filtered: @History Records & Blocked Items' : '🔍 Cross-Module Search Results'}
              </span>
              <button 
                type="button" 
                className="btn btn-outline" 
                style={{ padding: '0.15rem 0.4rem', fontSize: '0.7rem' }}
                onClick={() => setIsSearchOpen(false)}
              >
                Close (ESC)
              </button>
            </div>

            {!hasAnyResults ? (
              <div style={{ padding: '1rem', textAlign: 'center', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                No matching records found for "{searchTerm}".
              </div>
            ) : (
              <>
                {/* Items */}
                {matchingItems.length > 0 && (
                  <div>
                    <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--accent-primary)', marginBottom: '0.25rem' }}>📦 ITEMS ({matchingItems.length})</div>
                    {matchingItems.map(it => (
                      <div 
                        key={it.id} 
                        style={{ padding: '0.35rem 0.5rem', borderRadius: '0.25rem', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-tertiary)', marginBottom: '0.25rem' }}
                        onClick={() => { setActiveModule('item-master'); setIsSearchOpen(false); }}
                      >
                        <div>
                          <strong style={{ fontSize: '0.82rem' }}>{it.name}</strong>
                          <span style={{ fontSize: '0.72rem', color: 'var(--accent-primary)', fontFamily: 'monospace', marginLeft: '0.35rem' }}>({it.itemCode})</span>
                        </div>
                        <span className="badge badge-neutral" style={{ fontSize: '0.65rem' }}>{it.category}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Work Orders */}
                {matchingWOs.length > 0 && (
                  <div>
                    <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#10b981', marginBottom: '0.25rem' }}>⚙️ WORK ORDERS ({matchingWOs.length})</div>
                    {matchingWOs.map(wo => (
                      <div 
                        key={wo.id} 
                        style={{ padding: '0.35rem 0.5rem', borderRadius: '0.25rem', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-tertiary)', marginBottom: '0.25rem' }}
                        onClick={() => { setActiveModule('work-orders'); openWOInEditor(wo.id); setIsSearchOpen(false); }}
                      >
                        <div>
                          <strong style={{ fontSize: '0.82rem', fontFamily: 'monospace' }}>{wo.workOrderNo || wo.woNumber}</strong>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginLeft: '0.35rem' }}>{wo.machineModel}</span>
                        </div>
                        <span className="badge badge-info" style={{ fontSize: '0.65rem' }}>{wo.status}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Purchase Orders */}
                {matchingPOs.length > 0 && (
                  <div>
                    <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#f59e0b', marginBottom: '0.25rem' }}>📜 PURCHASE ORDERS ({matchingPOs.length})</div>
                    {matchingPOs.map(po => (
                      <div 
                        key={po.id} 
                        style={{ padding: '0.35rem 0.5rem', borderRadius: '0.25rem', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-tertiary)', marginBottom: '0.25rem' }}
                        onClick={() => { setActiveModule('purchase-orders'); setIsSearchOpen(false); }}
                      >
                        <div>
                          <strong style={{ fontSize: '0.82rem', fontFamily: 'monospace' }}>{po.poNumber}</strong>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginLeft: '0.35rem' }}>{po.vendorName}</span>
                        </div>
                        <span className="badge badge-warning" style={{ fontSize: '0.65rem' }}>{po.status}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Sales Orders */}
                {matchingSOs.length > 0 && (
                  <div>
                    <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#3b82f6', marginBottom: '0.25rem' }}>🛍️ SALES ORDERS ({matchingSOs.length})</div>
                    {matchingSOs.map(so => (
                      <div 
                        key={so.id} 
                        style={{ padding: '0.35rem 0.5rem', borderRadius: '0.25rem', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-tertiary)', marginBottom: '0.25rem' }}
                        onClick={() => { setActiveModule('sales-orders'); setIsSearchOpen(false); }}
                      >
                        <div>
                          <strong style={{ fontSize: '0.82rem', fontFamily: 'monospace' }}>{so.soNumber}</strong>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginLeft: '0.35rem' }}>{so.customerName}</span>
                        </div>
                        <span className="badge badge-neutral" style={{ fontSize: '0.65rem' }}>{so.machineModel}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* BOMs */}
                {matchingBOMs.length > 0 && (
                  <div>
                    <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#8b5cf6', marginBottom: '0.25rem' }}>📂 BILL OF MATERIALS ({matchingBOMs.length})</div>
                    {matchingBOMs.map(b => (
                      <div 
                        key={b.id} 
                        style={{ padding: '0.35rem 0.5rem', borderRadius: '0.25rem', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-tertiary)', marginBottom: '0.25rem' }}
                        onClick={() => { openBOMInEditor(b.id); setIsSearchOpen(false); }}
                      >
                        <div>
                          <strong style={{ fontSize: '0.82rem' }}>{b.machineModel}</strong>
                          <span style={{ fontSize: '0.72rem', color: 'var(--accent-primary)', fontFamily: 'monospace', marginLeft: '0.35rem' }}>({b.bomCode})</span>
                        </div>
                        <span className="badge badge-primary" style={{ fontSize: '0.65rem' }}>Inspect BOM</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Right Separate Indicators for User & Server */}
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
      </div>
    </header>
  );
};
