import React, { useState, useEffect } from 'react';
import { useERP } from '../../context/ERPContext';
import { Search, Wifi, WifiOff, Server, AlertCircle, Globe } from 'lucide-react';
import { apiClient } from '../../services/apiClient';
export const Header: React.FC = () => {
  const { 
    activeModule, setActiveModule, currentUser,
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

  const [serverNetworkMode, setServerNetworkMode] = useState<'LAN' | 'CLOUD' | 'LOCALHOST' | 'OFFLINE'>('LAN');
  const [serverDbStatus, setServerDbStatus] = useState<string>('Checking...');

  // Dynamic server health & hybrid network mode check
  useEffect(() => {
    const checkServerHealth = async () => {
      try {
        const result = await apiClient.checkHealth();
        if (result.online) {
          setIsServerOnline(true);
          setServerNetworkMode(result.mode);
          setServerDbStatus(result.data?.isPostgresConnected ? 'PostgreSQL Live' : 'Hybrid Cache');
        } else {
          setIsServerOnline(false);
          setServerNetworkMode('OFFLINE');
          setServerDbStatus('Offline');
        }
      } catch {
        setIsServerOnline(false);
        setServerNetworkMode('OFFLINE');
        setServerDbStatus('Offline');
      }
    };

    checkServerHealth();
    const interval = setInterval(checkServerHealth, 5000);
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
      case 'inventory': return 'Inventory Master (In-House & External Store)';
      case 'inhouse-inventory': return 'In-House Store Inventory';
      case 'external-inventory': return 'External Vendor Inventory';
      case 'external-jobwork': return 'Job Work (Challans & Vendor Processing)';
      case 'jobwork': return 'Job Work (Challans & Vendor Processing)';
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

  // Omnipresent Global Search State (Completely independent of local module search bars)
  const [globalSearchTerm, setGlobalSearchTerm] = useState('');

  // Automatically close search dropdown when user switches modules
  useEffect(() => {
    setIsSearchOpen(false);
  }, [activeModule]);

  // Deferred search term for background dropdown processing without blocking keyboard
  const deferredSearchTerm = React.useDeferredValue(globalSearchTerm);

  // Pre-compiled search index for instantaneous sub-millisecond global search
  const searchIndex = React.useMemo(() => {
    return {
      items: items.map(i => ({
        data: i,
        searchStr: `${i.itemCode} ${i.name} ${i.category} ${i.partCode || ''}`.toLowerCase(),
        isHistorical: !!i.isBlocked
      })),
      customers: customers.map(c => ({
        data: c,
        searchStr: `${c.name} ${c.customerCode} ${c.city || ''} ${c.phone || ''}`.toLowerCase(),
        isHistorical: false
      })),
      vendors: vendors.map(v => ({
        data: v,
        searchStr: `${v.name} ${v.vendorCode} ${v.city || ''} ${v.phone || ''}`.toLowerCase(),
        isHistorical: false
      })),
      salesOrders: salesOrders.map(so => ({
        data: so,
        searchStr: `${so.soNumber} ${so.customerName} ${so.machineModel}`.toLowerCase(),
        isHistorical: so.status === 'COMPLETED' || (so.status as string) === 'DELIVERED' || so.status === 'CANCELLED' || !!(so as any).isArchived || !!(so as any).isDeleted
      })),
      purchaseOrders: purchaseOrders.map(po => {
        const itemsStr = po.items.map(it => `${it.itemName || ''} ${it.itemCode || ''}`).join(' ');
        return {
          data: po,
          searchStr: `${po.poNumber} ${po.vendorName} ${itemsStr}`.toLowerCase(),
          isHistorical: po.status === 'GOODS_RECEIVED' || (po.status as string) === 'RECEIVED' || po.status === 'CANCELLED' || !!po.isDeleted || !!(po as any).isArchived
        };
      }),
      workOrders: workOrders.map(wo => ({
        data: wo,
        searchStr: `${wo.workOrderNo || wo.woNumber || ''} ${wo.machineModel} ${wo.customerName || ''} ${wo.assignedLead || ''}`.toLowerCase(),
        isHistorical: wo.status === 'COMPLETED' || wo.status === 'CANCELLED' || wo.stage === 'DISPATCHED' || !!(wo as any).isDeleted
      })),
      jobCards: jobCards.map(jc => ({
        data: jc,
        searchStr: `${jc.jobCardNo} ${jc.itemName} ${jc.itemCode} ${jc.woNumber || ''} ${jc.assignedOperator || ''}`.toLowerCase(),
        isHistorical: jc.status === 'COMPLETED' || jc.status === 'CANCELLED' || !!jc.isDeleted
      })),
      boms: boms.map(b => ({
        data: b,
        searchStr: `${b.bomCode} ${b.machineModel}`.toLowerCase(),
        isHistorical: false
      }))
    };
  }, [items, customers, vendors, salesOrders, purchaseOrders, workOrders, jobCards, boms]);

  // Cross-module search results (Ultra-fast early exit loop)
  const isHistorySearch = deferredSearchTerm.includes('@');
  const cleanTerm = deferredSearchTerm.replace(/@history|@deleted|@archived/gi, '').replace(/^@+/g, '').trim().toLowerCase();

  const {
    matchingItems, matchingCustomers, matchingVendors, matchingSOs,
    matchingPOs, matchingWOs, matchingJCs, matchingBOMs, hasAnyResults
  } = React.useMemo(() => {
    if (!cleanTerm && !isHistorySearch) {
      return {
        matchingItems: [], matchingCustomers: [], matchingVendors: [], matchingSOs: [],
        matchingPOs: [], matchingWOs: [], matchingJCs: [], matchingBOMs: [], hasAnyResults: false
      };
    }

    const cleanTokens = cleanTerm ? cleanTerm.split(/\s+/).filter(Boolean) : [];

    const findMatches = <T,>(
      list: Array<{ data: T; searchStr: string; isHistorical: boolean }>,
      limit: number
    ): T[] => {
      const matched: T[] = [];
      for (let i = 0; i < list.length; i++) {
        const item = list[i];
        if (isHistorySearch) {
          if (!item.isHistorical) continue;
        } else {
          if (item.isHistorical) continue;
        }
        const matches = cleanTokens.length === 0 || cleanTokens.every(token => item.searchStr.includes(token));
        if (matches) {
          matched.push(item.data);
          if (matched.length >= limit) break;
        }
      }
      return matched;
    };

    const mItems = findMatches(searchIndex.items, 5);
    const mCustomers = !isHistorySearch ? findMatches(searchIndex.customers, 4) : [];
    const mVendors = !isHistorySearch ? findMatches(searchIndex.vendors, 4) : [];
    const mSOs = findMatches(searchIndex.salesOrders, 4);
    const mPOs = findMatches(searchIndex.purchaseOrders, 4);
    const mWOs = findMatches(searchIndex.workOrders, 4);
    const mJCs = findMatches(searchIndex.jobCards, 4);
    const mBOMs = !isHistorySearch ? findMatches(searchIndex.boms, 4) : [];

    const hasRes = mItems.length > 0 || mCustomers.length > 0 || mVendors.length > 0 || 
      mSOs.length > 0 || mPOs.length > 0 || mWOs.length > 0 || mJCs.length > 0 || mBOMs.length > 0;

    return {
      matchingItems: mItems,
      matchingCustomers: mCustomers,
      matchingVendors: mVendors,
      matchingSOs: mSOs,
      matchingPOs: mPOs,
      matchingWOs: mWOs,
      matchingJCs: mJCs,
      matchingBOMs: mBOMs,
      hasAnyResults: hasRes
    };
  }, [cleanTerm, isHistorySearch, searchIndex]);

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
          value={globalSearchTerm}
          onFocus={() => setIsSearchOpen(true)}
          onChange={(e) => {
            setGlobalSearchTerm(e.target.value);
            setIsSearchOpen(true);
          }}
        />

        {globalSearchTerm && (
          <button 
            type="button" 
            onClick={() => { setGlobalSearchTerm(''); setIsSearchOpen(false); }}
            style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.8rem', padding: '0.2rem' }}
          >
            ✕
          </button>
        )}

        {/* Global Search Dropdown Overlay */}
        {isSearchOpen && (globalSearchTerm.trim().length > 0 || isHistorySearch) && (
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
                onClick={() => { setGlobalSearchTerm(''); setIsSearchOpen(false); }}
              >
                Close (ESC)
              </button>
            </div>

            {!hasAnyResults ? (
              <div style={{ padding: '1rem', textAlign: 'center', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                No matching records found for "{globalSearchTerm}".
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
                        onClick={() => { setActiveModule('item-master'); setGlobalSearchTerm(''); setIsSearchOpen(false); }}
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
                        onClick={() => { setActiveModule('work-orders'); openWOInEditor(wo.id); setGlobalSearchTerm(''); setIsSearchOpen(false); }}
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
                        onClick={() => { setActiveModule('purchase-orders'); setGlobalSearchTerm(''); setIsSearchOpen(false); }}
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
                        onClick={() => { setActiveModule('sales-orders'); setGlobalSearchTerm(''); setIsSearchOpen(false); }}
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
                        onClick={() => { openBOMInEditor(b.id); setGlobalSearchTerm(''); setIsSearchOpen(false); }}
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

                {/* Job Cards */}
                {matchingJCs.length > 0 && (
                  <div>
                    <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#06b6d4', marginBottom: '0.25rem' }}>📋 JOB CARDS ({matchingJCs.length})</div>
                    {matchingJCs.map(jc => (
                      <div 
                        key={jc.id} 
                        style={{ padding: '0.35rem 0.5rem', borderRadius: '0.25rem', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-tertiary)', marginBottom: '0.25rem' }}
                        onClick={() => { setActiveModule('job-cards'); setGlobalSearchTerm(''); setIsSearchOpen(false); }}
                      >
                        <div>
                          <strong style={{ fontSize: '0.82rem', fontFamily: 'monospace' }}>{jc.jobCardNo}</strong>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginLeft: '0.35rem' }}>{jc.itemName}</span>
                        </div>
                        <span className={`badge ${jc.isDeleted ? 'badge-danger' : jc.status === 'COMPLETED' ? 'badge-success' : 'badge-neutral'}`} style={{ fontSize: '0.65rem' }}>
                          {jc.isDeleted ? 'DELETED' : jc.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Customers */}
                {matchingCustomers.length > 0 && (
                  <div>
                    <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#ec4899', marginBottom: '0.25rem' }}>👥 CUSTOMERS ({matchingCustomers.length})</div>
                    {matchingCustomers.map(c => (
                      <div 
                        key={c.id} 
                        style={{ padding: '0.35rem 0.5rem', borderRadius: '0.25rem', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-tertiary)', marginBottom: '0.25rem' }}
                        onClick={() => { setActiveModule('customers'); setGlobalSearchTerm(''); setIsSearchOpen(false); }}
                      >
                        <div>
                          <strong style={{ fontSize: '0.82rem' }}>{c.name}</strong>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginLeft: '0.35rem' }}>({c.customerCode} {c.city ? `• ${c.city}` : ''})</span>
                        </div>
                        <span className="badge badge-neutral" style={{ fontSize: '0.65rem' }}>Client</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Vendors */}
                {matchingVendors.length > 0 && (
                  <div>
                    <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#14b8a6', marginBottom: '0.25rem' }}>🏭 VENDORS ({matchingVendors.length})</div>
                    {matchingVendors.map(v => (
                      <div 
                        key={v.id} 
                        style={{ padding: '0.35rem 0.5rem', borderRadius: '0.25rem', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-tertiary)', marginBottom: '0.25rem' }}
                        onClick={() => { setActiveModule('vendors'); setGlobalSearchTerm(''); setIsSearchOpen(false); }}
                      >
                        <div>
                          <strong style={{ fontSize: '0.82rem' }}>{v.name}</strong>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginLeft: '0.35rem' }}>({v.vendorCode} {v.city ? `• ${v.city}` : ''})</span>
                        </div>
                        <span className="badge badge-neutral" style={{ fontSize: '0.65rem' }}>Vendor</span>
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
        {/* User Connection Status: Online | LAN | Offline */}
        {(() => {
          let userStatusText = 'Online';
          let userBg = 'rgba(16, 185, 129, 0.12)';
          let userBorder = 'var(--success)';
          let userColor = 'var(--success)';
          let userIcon = <Wifi size={13} />;

          if (!navigator.onLine) {
            userStatusText = 'Offline';
            userBg = 'rgba(239, 68, 68, 0.12)';
            userBorder = 'var(--danger)';
            userColor = 'var(--danger)';
            userIcon = <WifiOff size={13} />;
          } else if (!isUserOnline) {
            userStatusText = 'LAN';
            userBg = 'rgba(245, 158, 11, 0.12)';
            userBorder = '#f59e0b';
            userColor = '#f59e0b';
            userIcon = <Wifi size={13} />;
          }

          return (
            <div 
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.3rem 0.65rem',
                borderRadius: '9999px',
                backgroundColor: userBg,
                border: `1px solid ${userBorder}`,
                color: userColor,
                fontSize: '0.73rem',
                fontWeight: 700
              }} 
              title={`User Network: ${userStatusText} (${userStatusText === 'LAN' ? 'Local Network without external internet' : (userStatusText === 'Online' ? 'Active Internet Connection' : 'No Network Connection')})`}
            >
              {userIcon}
              <span>User: {userStatusText}</span>
            </div>
          );
        })()}

        {/* Server Connection Status: Online | LAN | Offline */}
        {(() => {
          let serverStatusText = 'Online';
          let serverBg = 'rgba(16, 185, 129, 0.12)';
          let serverBorder = 'var(--success)';
          let serverColor = 'var(--success)';
          let serverIcon = <Server size={13} />;

          if (!isServerOnline) {
            serverStatusText = 'Offline';
            serverBg = 'rgba(239, 68, 68, 0.12)';
            serverBorder = 'var(--danger)';
            serverColor = 'var(--danger)';
            serverIcon = <AlertCircle size={13} />;
          } else if (serverNetworkMode === 'LAN' || serverNetworkMode === 'LOCALHOST') {
            serverStatusText = 'LAN';
            serverBg = 'rgba(59, 130, 246, 0.12)';
            serverBorder = 'var(--accent-primary)';
            serverColor = 'var(--accent-primary)';
            serverIcon = <Server size={13} />;
          }

          return (
            <div 
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.3rem 0.65rem',
                borderRadius: '9999px',
                backgroundColor: serverBg,
                border: `1px solid ${serverBorder}`,
                color: serverColor,
                fontSize: '0.73rem',
                fontWeight: 700
              }} 
              title={isServerOnline ? `Central Server is LIVE in ${serverStatusText} Mode (${serverDbStatus})` : 'Server: Offline (Read-Only cached data access. Create, edit, delete is disabled until server reconnects)'}
            >
              {serverIcon}
              <span>Server: {serverStatusText}</span>
            </div>
          );
        })()}
      </div>
    </header>
  );
};
