import React, { useState, useEffect, useRef } from 'react';
import { useERP } from '../../context/ERPContext';
import { Search, Wifi, WifiOff, Server, AlertCircle, Globe, Menu, Settings, RefreshCw, CheckCircle2, Lock, X, Bell, Package, ShoppingCart, Layers, ClipboardList, CheckCheck, Check } from 'lucide-react';
import { apiClient } from '../../services/apiClient';

export const Header: React.FC = () => {
  const { 
    activeModule, setActiveModule, currentUser,
    items, customers, vendors, salesOrders, workOrders, purchaseOrders, jobCards, boms, grns,
    openBOMInEditor, openWOInEditor, toggleMobileNav
  } = useERP();
  
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isServerModalOpen, setIsServerModalOpen] = useState(false);
  const [customLanInput, setCustomLanInput] = useState(apiClient.getLanUrl() || '');
  const [customCloudInput, setCustomCloudInput] = useState(apiClient.getCloudUrl() || '');
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [serverModalMsg, setServerModalMsg] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);
  
  // Read notification tracking
  const [readNotificationIds, setReadNotificationIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('gec_read_notifications');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const markSingleRead = (id: string) => {
    setReadNotificationIds(prev => {
      const updated = prev.includes(id) ? prev : [...prev, id];
      try {
        localStorage.setItem('gec_read_notifications', JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });
  };

  const markAllRead = () => {
    const allIds = [
      ...items.map(i => `low-stock-${i.id}`),
      ...purchaseOrders.map(p => `po-${p.id}`)
    ];
    setReadNotificationIds(allIds);
    try {
      localStorage.setItem('gec_read_notifications', JSON.stringify(allIds));
    } catch (e) {
      console.error(e);
    }
  };

  // Close notification popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
    };
    if (isNotificationsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isNotificationsOpen]);

  // User Internet / Network Connection State
  const [isUserOnline, setIsUserOnline] = useState<boolean>(navigator.onLine);

  // Central Host PC Server Connection State
  const [isServerOnline, setIsServerOnline] = useState<boolean>(false);
  const [serverNetworkMode, setServerNetworkMode] = useState<'LAN' | 'CLOUD' | 'LOCALHOST' | 'OFFLINE' | 'CHECKING'>('CHECKING');
  const [serverDbStatus, setServerDbStatus] = useState<string>('Checking...');
  const [detectedServerIps, setDetectedServerIps] = useState<string[]>([]);
  const [isLanReachable, setIsLanReachable] = useState<boolean>(false);

  const checkServerHealth = async () => {
    try {
      const result = await apiClient.checkHealth();
      setIsUserOnline(result.isInternetReachable);
      setIsLanReachable(result.isLanReachable);

      if (result.online) {
        setIsServerOnline(true);
        setServerNetworkMode(result.mode);
        setServerDbStatus(result.data?.isPostgresConnected ? 'PostgreSQL Live' : 'Hybrid Cache');
        if (result.data?.serverIps) {
          setDetectedServerIps(result.data.serverIps);
        }
      } else {
        setIsServerOnline(false);
        setServerNetworkMode('OFFLINE');
        setServerDbStatus('Offline');
      }
    } catch {
      setIsUserOnline(false);
      setIsLanReachable(false);
      setIsServerOnline(false);
      setServerNetworkMode('OFFLINE');
      setServerDbStatus('Offline');
    }
  };

  // Dynamic server health & user network status checks
  useEffect(() => {
    const handleOnline = () => checkServerHealth();
    const handleOffline = () => {
      setIsUserOnline(false);
      checkServerHealth();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    checkServerHealth();
    const interval = setInterval(checkServerHealth, 5000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  const handleSaveAndTestServerConfig = async (lanOverride?: string, cloudOverride?: string) => {
    const targetLan = lanOverride !== undefined ? lanOverride : customLanInput;
    const targetCloud = cloudOverride !== undefined ? cloudOverride : customCloudInput;
    
    setIsTestingConnection(true);
    setServerModalMsg({ text: 'Testing LAN & Cloud connections (Prioritizing LAN)...', type: 'info' });
    
    apiClient.setLanUrl(targetLan);
    apiClient.setCloudUrl(targetCloud);
    apiClient.setCustomServerUrl(''); // clear legacy single override to enable dual LAN/Cloud prioritization

    setCustomLanInput(apiClient.getLanUrl() || '');
    setCustomCloudInput(apiClient.getCloudUrl() || '');

    try {
      const result = await apiClient.checkHealth();
      if (result.online) {
        setIsServerOnline(true);
        setServerNetworkMode(result.mode);
        setServerDbStatus(result.data?.isPostgresConnected ? 'PostgreSQL Live' : 'Hybrid Cache');
        if (result.data?.serverIps) setDetectedServerIps(result.data.serverIps);
        setServerModalMsg({ 
          text: `Active on ${result.mode === 'LAN' || result.mode === 'LOCALHOST' ? '🚀 High-Speed LAN' : '🌐 Cloud Domain'} (${apiClient.getBaseUrl()})`, 
          type: 'success' 
        });
      } else {
        setIsServerOnline(false);
        setServerNetworkMode('OFFLINE');
        setServerDbStatus('Offline');
        setServerModalMsg({ text: `Could not reach server via LAN or Cloud. Make sure server is running.`, type: 'error' });
      }
    } catch (e: any) {
      setIsServerOnline(false);
      setServerModalMsg({ text: `Connection check failed: ${e?.message || 'Network error'}`, type: 'error' });
    } finally {
      setIsTestingConnection(false);
    }
  };

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
      {/* Active Page Title with Mobile Hamburger Toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0 }}>
        <button
          type="button"
          className="mobile-menu-toggle"
          onClick={toggleMobileNav}
          aria-label="Toggle navigation menu"
        >
          <Menu size={22} />
        </button>
        <h1 className="header-page-title" style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
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
        {/* Notification Bell Button & Popover (to the left of User status) */}
        {(() => {
          const unreadLowStockAlerts = items.filter(i => {
            const minStock = i.minStockQty || i.reorderLevel || 0;
            return minStock > 0 && (i.inHouseStock || 0) <= minStock && !readNotificationIds.includes(`low-stock-${i.id}`);
          });
          const unreadPendingPOs = purchaseOrders.filter(po => 
            (po.status === 'WAITING_FOR_APPROVAL' || po.status === 'PENDING_APPROVAL' || po.status === 'DRAFT') &&
            !readNotificationIds.includes(`po-${po.id}`)
          );
          const totalUnreadCount = unreadLowStockAlerts.length + unreadPendingPOs.length;

          return (
            <div ref={notificationRef} style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: isNotificationsOpen ? 'rgba(59, 130, 246, 0.15)' : 'var(--bg-tertiary)',
                  border: isNotificationsOpen ? '1px solid var(--accent-primary)' : '1px solid var(--border-color)',
                  color: isNotificationsOpen ? 'var(--accent-primary)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                title={`Notifications (${totalUnreadCount} unread alerts)`}
                aria-label="View notifications"
              >
                <Bell size={16} />
                {totalUnreadCount > 0 && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '-3px',
                      right: '-3px',
                      backgroundColor: '#ef4444',
                      color: '#ffffff',
                      fontSize: '0.65rem',
                      fontWeight: 800,
                      minWidth: '16px',
                      height: '16px',
                      borderRadius: '9999px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '0 3px',
                      boxShadow: '0 0 4px rgba(239, 68, 68, 0.6)'
                    }}
                  >
                    {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
                  </span>
                )}
              </button>

              {/* Notification Popover Dropdown */}
              {isNotificationsOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: '40px',
                    right: 0,
                    width: '360px',
                    maxHeight: '440px',
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '0.5rem',
                    boxShadow: 'var(--shadow-lg)',
                    zIndex: 1000,
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden'
                  }}
                >
                  <div
                    style={{
                      padding: '0.65rem 0.85rem',
                      borderBottom: '1px solid var(--border-color)',
                      backgroundColor: 'var(--bg-tertiary)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Bell size={14} style={{ color: 'var(--accent-primary)' }} />
                      <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-primary)' }}>Notifications</span>
                      {totalUnreadCount > 0 && (
                        <span className="badge badge-primary" style={{ fontSize: '0.68rem', padding: '0.15rem 0.45rem' }}>
                          {totalUnreadCount} New
                        </span>
                      )}
                    </div>
                    {totalUnreadCount > 0 && (
                      <button
                        type="button"
                        className="btn btn-outline"
                        style={{ padding: '0.2rem 0.5rem', fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                        onClick={markAllRead}
                        title="Mark all active notifications as read"
                      >
                        <CheckCheck size={13} color="var(--accent-primary)" /> Read All
                      </button>
                    )}
                  </div>

                  <div style={{ padding: '0.5rem', overflowY: 'auto', maxHeight: '340px', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                    {totalUnreadCount === 0 ? (
                      <div style={{ padding: '1.75rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                        <CheckCircle2 size={26} style={{ color: 'var(--success)', margin: '0 auto 0.5rem', display: 'block' }} />
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>All Caught Up!</div>
                        No unread alerts or shortage warnings.
                        {readNotificationIds.length > 0 && (
                          <div style={{ marginTop: '0.75rem' }}>
                            <button
                              type="button"
                              className="btn btn-outline"
                              style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem' }}
                              onClick={() => {
                                setReadNotificationIds([]);
                                localStorage.removeItem('gec_read_notifications');
                              }}
                            >
                              Reset Read Status
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <>
                        {/* Low Stock Shortage Alerts */}
                        {unreadLowStockAlerts.length > 0 && (
                          <div>
                            <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#f59e0b', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                              <Package size={12} /> LOW STOCK WARNINGS ({unreadLowStockAlerts.length})
                            </div>
                            {unreadLowStockAlerts.slice(0, 5).map(item => {
                              const minStock = item.minStockQty || item.reorderLevel || 0;
                              return (
                                <div
                                  key={item.id}
                                  style={{
                                    padding: '0.4rem 0.55rem',
                                    borderRadius: '0.3rem',
                                    backgroundColor: 'rgba(245, 158, 11, 0.08)',
                                    border: '1px solid rgba(245, 158, 11, 0.25)',
                                    marginBottom: '0.3rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: '0.5rem'
                                  }}
                                >
                                  <div 
                                    style={{ flex: 1, cursor: 'pointer' }}
                                    onClick={() => {
                                      setActiveModule('inventory');
                                      setIsNotificationsOpen(false);
                                    }}
                                  >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', fontWeight: 700 }}>
                                      <span>{item.name}</span>
                                      <span style={{ color: '#ef4444' }}>{item.inHouseStock || 0} / {minStock} {item.unit}</span>
                                    </div>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                                      {item.itemCode}
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      markSingleRead(`low-stock-${item.id}`);
                                    }}
                                    style={{
                                      background: 'none',
                                      border: '1px solid var(--border-color)',
                                      borderRadius: '4px',
                                      padding: '0.25rem 0.35rem',
                                      color: 'var(--text-muted)',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '0.2rem',
                                      fontSize: '0.68rem'
                                    }}
                                    title="Mark as read"
                                  >
                                    <Check size={12} color="var(--success)" /> Read
                                  </button>
                                </div>
                              );
                            })}
                            {unreadLowStockAlerts.length > 5 && (
                              <button
                                type="button"
                                className="btn btn-outline"
                                style={{ width: '100%', fontSize: '0.72rem', padding: '0.25rem', marginTop: '0.2rem' }}
                                onClick={() => {
                                  setActiveModule('inventory');
                                  setIsNotificationsOpen(false);
                                }}
                              >
                                View all {unreadLowStockAlerts.length} stock alerts
                              </button>
                            )}
                          </div>
                        )}

                        {/* Pending Purchase Orders */}
                        {unreadPendingPOs.length > 0 && (
                          <div style={{ marginTop: '0.4rem' }}>
                            <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#3b82f6', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                              <ShoppingCart size={12} /> PENDING PO APPROVALS ({unreadPendingPOs.length})
                            </div>
                            {unreadPendingPOs.slice(0, 4).map(po => (
                              <div
                                key={po.id}
                                style={{
                                  padding: '0.4rem 0.55rem',
                                  borderRadius: '0.3rem',
                                  backgroundColor: 'rgba(59, 130, 246, 0.08)',
                                  border: '1px solid rgba(59, 130, 246, 0.25)',
                                  marginBottom: '0.3rem',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  gap: '0.5rem'
                                }}
                              >
                                <div
                                  style={{ flex: 1, cursor: 'pointer' }}
                                  onClick={() => {
                                    setActiveModule('purchase-orders');
                                    setIsNotificationsOpen(false);
                                  }}
                                >
                                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', fontWeight: 700 }}>
                                    <span style={{ fontFamily: 'monospace' }}>{po.poNumber}</span>
                                    <span className="badge badge-warning" style={{ fontSize: '0.62rem' }}>{po.status}</span>
                                  </div>
                                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                    {po.vendorName} • {po.items?.length || 0} item(s)
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    markSingleRead(`po-${po.id}`);
                                  }}
                                  style={{
                                    background: 'none',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '4px',
                                    padding: '0.25rem 0.35rem',
                                    color: 'var(--text-muted)',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.2rem',
                                    fontSize: '0.68rem'
                                  }}
                                  title="Mark as read"
                                >
                                  <Check size={12} color="var(--success)" /> Read
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* User Connection Status: Online | LAN Only | Offline */}
        {(() => {
          let userStatusText = 'Online';
          let userBg = 'rgba(16, 185, 129, 0.12)';
          let userBorder = 'var(--success)';
          let userColor = 'var(--success)';
          let userIcon = <Wifi size={13} />;
          let userTitle = 'Active Internet Connection';

          if (isUserOnline) {
            userStatusText = 'Online';
            userBg = 'rgba(16, 185, 129, 0.12)';
            userBorder = 'var(--success)';
            userColor = 'var(--success)';
            userIcon = <Wifi size={13} />;
            userTitle = 'Active Internet Connection (Cloud & Web services accessible)';
          } else if (isLanReachable) {
            userStatusText = 'LAN Only';
            userBg = 'rgba(245, 158, 11, 0.12)';
            userBorder = '#f59e0b';
            userColor = '#f59e0b';
            userIcon = <Wifi size={13} />;
            userTitle = 'Connected to Local Office/Factory Wi-Fi (No external internet)';
          } else {
            userStatusText = 'Offline';
            userBg = 'rgba(239, 68, 68, 0.12)';
            userBorder = 'var(--danger)';
            userColor = 'var(--danger)';
            userIcon = <WifiOff size={13} />;
            userTitle = 'No Network or Internet Connection';
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
              title={`User Network: ${userStatusText} (${userTitle})`}
            >
              {userIcon}
              <span>User: {userStatusText}</span>
            </div>
          );
        })()}

        {/* Server Connection Status: LAN | Cloud | Offline (Clickable to configure for SuperAdmin) */}
        {(() => {
          let serverStatusText = 'Online';
          let serverBg = 'rgba(16, 185, 129, 0.12)';
          let serverBorder = 'var(--success)';
          let serverColor = 'var(--success)';
          let serverIcon = <Server size={13} />;
          let serverTitle = '';

          if (serverNetworkMode === 'CHECKING') {
            serverStatusText = 'Checking...';
            serverBg = 'rgba(148, 163, 184, 0.12)';
            serverBorder = '#94a3b8';
            serverColor = '#94a3b8';
            serverIcon = <Server size={13} />;
            serverTitle = 'Probing server routes...';
          } else if (!isServerOnline) {
            serverStatusText = 'Offline';
            serverBg = 'rgba(239, 68, 68, 0.12)';
            serverBorder = 'var(--danger)';
            serverColor = 'var(--danger)';
            serverIcon = <AlertCircle size={13} />;
            serverTitle = 'Central ERP Server is unreachable via LAN or Cloud';
          } else if (serverNetworkMode === 'LAN' || serverNetworkMode === 'LOCALHOST') {
            serverStatusText = 'LAN';
            serverBg = 'rgba(59, 130, 246, 0.12)';
            serverBorder = 'var(--accent-primary)';
            serverColor = 'var(--accent-primary)';
            serverIcon = <Server size={13} />;
            serverTitle = `Direct High-Speed Local Network (${apiClient.getBaseUrl()}) - ${serverDbStatus}`;
          } else if (serverNetworkMode === 'CLOUD') {
            serverStatusText = 'Cloud';
            serverBg = 'rgba(147, 51, 234, 0.12)';
            serverBorder = '#9333ea';
            serverColor = '#9333ea';
            serverIcon = <Globe size={13} />;
            serverTitle = `Remote Cloudflare Tunnel (${apiClient.getBaseUrl()}) - ${serverDbStatus}`;
          }

          const isSuperAdminUser = currentUser?.isSuperAdmin === true || currentUser?.username?.toLowerCase() === 'superadmin';

          if (isSuperAdminUser) {
            return (
              <button 
                type="button"
                onClick={() => {
                  setCustomLanInput(apiClient.getLanUrl() || '');
                  setCustomCloudInput(apiClient.getCloudUrl() || '');
                  setServerModalMsg(null);
                  setIsServerModalOpen(true);
                }}
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
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }} 
                title={isServerOnline ? `Central Server is LIVE in ${serverStatusText} Mode (${serverTitle}). Click to configure Server Network Address (SuperAdmin).` : 'Server: Offline (Click to configure Server Address - SuperAdmin)'}
              >
                {serverIcon}
                <span>Server: {serverStatusText}</span>
                <Settings size={11} style={{ opacity: 0.7, marginLeft: '0.15rem' }} />
              </button>
            );
          }

          // Regular User: Display Indicator Badge Only (Non-interactive)
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
              title={isServerOnline ? `Central Server is LIVE in ${serverStatusText} Mode (${serverTitle})` : 'Server: Offline (Read-Only cached data access)'}
            >
              {serverIcon}
              <span>Server: {serverStatusText}</span>
            </div>
          );
        })()}
      </div>

      {/* Server Connection & Hybrid Mode Modal (SuperAdmin Only) */}
      {(currentUser?.isSuperAdmin === true || currentUser?.username?.toLowerCase() === 'superadmin') && isServerModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: '0.75rem',
            width: '100%',
            maxWidth: '520px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)',
            overflow: 'hidden'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '1rem 1.25rem',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: 'var(--bg-tertiary)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Server size={18} style={{ color: 'var(--accent-primary)' }} />
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Central Server & Network Configuration</h3>
              </div>
              <button 
                type="button" 
                onClick={() => setIsServerModalOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0.25rem' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Notice regarding LAN priority */}
              <div style={{
                padding: '0.6rem 0.8rem',
                borderRadius: '0.375rem',
                backgroundColor: 'rgba(59, 130, 246, 0.08)',
                border: '1px solid rgba(59, 130, 246, 0.25)',
                fontSize: '0.74rem',
                color: 'var(--text-secondary)',
                lineHeight: 1.4
              }}>
                <strong style={{ color: 'var(--accent-primary)' }}>⚡ LAN-First Hybrid Priority:</strong> When inside the factory, GEC ERP connects over ultra-fast local LAN (no internet data used). When away, it automatically switches to your Cloud Domain.
              </div>

              {/* 1. LAN URL */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                  1. Factory LAN Server Address (High Priority):
                </label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="text"
                    value={customLanInput}
                    onChange={(e) => setCustomLanInput(e.target.value)}
                    placeholder="e.g. http://192.168.1.100:5000 or http://localhost:5000"
                    style={{
                      flex: 1,
                      padding: '0.55rem 0.75rem',
                      borderRadius: '0.375rem',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'var(--bg-primary)',
                      color: 'var(--text-primary)',
                      fontSize: '0.85rem',
                      fontFamily: 'monospace'
                    }}
                  />
                </div>
              </div>

              {/* 2. Cloud Domain URL */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                  2. Remote Cloud Domain (Fallback outside Factory):
                </label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="text"
                    value={customCloudInput}
                    onChange={(e) => setCustomCloudInput(e.target.value)}
                    placeholder="e.g. https://erp.yourcompany.com"
                    style={{
                      flex: 1,
                      padding: '0.55rem 0.75rem',
                      borderRadius: '0.375rem',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'var(--bg-primary)',
                      color: 'var(--text-primary)',
                      fontSize: '0.85rem',
                      fontFamily: 'monospace'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => handleSaveAndTestServerConfig()}
                    disabled={isTestingConnection}
                    className="btn btn-primary"
                    style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', whiteSpace: 'nowrap', padding: '0.55rem 1rem' }}
                  >
                    {isTestingConnection ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                    <span>Save & Test</span>
                  </button>
                </div>
              </div>

              {/* Quick Presets */}
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  Quick LAN Presets:
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                  <button
                    type="button"
                    onClick={() => { const u = `http://localhost:${apiClient.getLanUrl()?.includes('5001') ? '5001' : '5000'}`; setCustomLanInput(u); handleSaveAndTestServerConfig(u); }}
                    style={{
                      padding: '0.25rem 0.6rem',
                      borderRadius: '0.25rem',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'var(--bg-tertiary)',
                      color: 'var(--text-primary)',
                      fontSize: '0.72rem',
                      cursor: 'pointer'
                    }}
                  >
                    💻 Localhost ({apiClient.getLanUrl()?.includes('5001') ? '5001' : '5000'})
                  </button>
                  {detectedServerIps.map(ip => {
                    const port = apiClient.getLanUrl()?.includes('5001') ? '5001' : '5000';
                    const u = `http://${ip}:${port}`;
                    return (
                      <button
                        key={ip}
                        type="button"
                        onClick={() => { setCustomLanInput(u); handleSaveAndTestServerConfig(u); }}
                        style={{
                          padding: '0.25rem 0.6rem',
                          borderRadius: '0.25rem',
                          border: '1px solid var(--border-color)',
                          backgroundColor: 'var(--bg-tertiary)',
                          color: 'var(--text-primary)',
                          fontSize: '0.72rem',
                          cursor: 'pointer'
                        }}
                      >
                        📡 LAN ({ip}:{port})
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => { 
                      localStorage.removeItem('gec_erp_server_url');
                      localStorage.removeItem('gec_erp_lan_url');
                      localStorage.removeItem('gec_erp_cloud_url');
                      const lan = apiClient.getLanUrl() || '';
                      const cloud = apiClient.getCloudUrl() || '';
                      setCustomLanInput(lan); 
                      setCustomCloudInput(cloud); 
                      handleSaveAndTestServerConfig(lan, cloud); 
                    }}
                    style={{
                      padding: '0.25rem 0.6rem',
                      borderRadius: '0.25rem',
                      border: '1px dashed var(--border-color)',
                      backgroundColor: 'transparent',
                      color: 'var(--text-secondary)',
                      fontSize: '0.72rem',
                      cursor: 'pointer'
                    }}
                  >
                    🔄 Reset Defaults (.env)
                  </button>
                </div>
              </div>

              {/* Feedback Message */}
              {serverModalMsg && (
                <div style={{
                  padding: '0.65rem 0.85rem',
                  borderRadius: '0.375rem',
                  fontSize: '0.78rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  backgroundColor: serverModalMsg.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : serverModalMsg.type === 'error' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                  border: `1px solid ${serverModalMsg.type === 'success' ? 'var(--success)' : serverModalMsg.type === 'error' ? 'var(--danger)' : 'var(--accent-primary)'}`,
                  color: serverModalMsg.type === 'success' ? 'var(--success)' : serverModalMsg.type === 'error' ? 'var(--danger)' : 'var(--accent-primary)'
                }}>
                  {serverModalMsg.type === 'success' ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
                  <span>{serverModalMsg.text}</span>
                </div>
              )}

              {/* Live Info Box */}
              <div style={{
                padding: '0.75rem',
                borderRadius: '0.375rem',
                backgroundColor: 'var(--bg-tertiary)',
                fontSize: '0.75rem',
                lineHeight: 1.5,
                color: 'var(--text-secondary)'
              }}>
                <div><strong>Currently Active Route:</strong> <code style={{ color: 'var(--accent-primary)' }}>{apiClient.getBaseUrl()}</code></div>
                <div><strong>Live Connection Mode:</strong> {isServerOnline ? `🟢 Connected (${serverNetworkMode} Mode - ${serverDbStatus})` : '🔴 Unreachable (Offline Cache Mode)'}</div>
                {detectedServerIps.length > 0 && (
                  <div><strong>Server Host IPs:</strong> {detectedServerIps.join(', ')}</div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '0.75rem 1.25rem',
              borderTop: '1px solid var(--border-color)',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '0.5rem',
              backgroundColor: 'var(--bg-tertiary)'
            }}>
              <button
                type="button"
                onClick={() => setIsServerModalOpen(false)}
                className="btn btn-secondary"
                style={{ fontSize: '0.8rem', padding: '0.4rem 0.85rem' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
