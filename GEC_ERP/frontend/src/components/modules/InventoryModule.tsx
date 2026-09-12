import React, { useState, useMemo } from 'react';
import { useERP } from '../../context/ERPContext';
import { Modal } from '../common/Modal';
import { PrintManagerModal } from '../printTemplates/PrintManagerModal';
import { ItemMasterListPrintView } from '../printTemplates/ItemMasterPrintTemplates';
import { 
  Warehouse, Truck, Search, Printer, ArrowUpDown, ArrowUp, ArrowDown,
  AlertTriangle, Package, Users, Building, ChevronRight, Edit2
} from 'lucide-react';
import { Item } from '../../types/erp';

type InventoryTab = 'IN_HOUSE' | 'EXTERNAL';
type InHouseSortKey = 'itemCode' | 'name' | 'category' | 'location' | 'inHouseStock' | 'reorderLevel' | 'unitPrice' | 'totalValuation';
type ExternalSortKey = 'itemCode' | 'name' | 'category' | 'inHouseStock' | 'externalStock';

export const InventoryModule: React.FC = () => {
  const { 
    items, allInventoryItems, vendors, jobworks,
    searchTerm, setSearchTerm, adjustItemStock
  } = useERP();

  const inventoryList = allInventoryItems && allInventoryItems.length > 0 ? allInventoryItems : items;

  // Active top-level Tab: In-House vs External
  const [activeTab, setActiveTab] = useState<InventoryTab>('IN_HOUSE');

  // In-House Sort State
  const [inHouseSortField, setInHouseSortField] = useState<InHouseSortKey>('itemCode');
  const [inHouseSortOrder, setInHouseSortOrder] = useState<'asc' | 'desc'>('asc');

  // External Sort State
  const [extSortField, setExtSortField] = useState<ExternalSortKey>('itemCode');
  const [extSortOrder, setExtSortOrder] = useState<'asc' | 'desc'>('asc');

  // Stock Adjustment Modal State
  const [adjustingItem, setAdjustingItem] = useState<Item | null>(null);
  const [adjustedStock, setAdjustedStock] = useState<number>(0);
  const [adjustReason, setAdjustReason] = useState<string>('Physical Count Audit');
  const [adjustLocation, setAdjustLocation] = useState<string>('');
  const [adjustPrice, setAdjustPrice] = useState<number>(0);

  // Vendor Breakdown Modal State (When double clicking an external item)
  const [selectedBreakdownItem, setSelectedBreakdownItem] = useState<Item | null>(null);

  // Print Modals
  const [printModalOpen, setPrintModalOpen] = useState(false);

  // Search cleanup
  const cleanSearchTerm = searchTerm.replace(/@history|@deleted/gi, '').replace(/^@/g, '').trim().toLowerCase();

  // -------------------------------------------------------------
  // IN-HOUSE INVENTORY DATA
  // -------------------------------------------------------------
  const filteredInHouseItems = useMemo(() => {
    return inventoryList
      .filter(item =>
        !cleanSearchTerm ||
        item.itemCode.toLowerCase().includes(cleanSearchTerm) ||
        item.name.toLowerCase().includes(cleanSearchTerm) ||
        (item.partCode && item.partCode.toLowerCase().includes(cleanSearchTerm)) ||
        item.category.toLowerCase().includes(cleanSearchTerm) ||
        (item.location && item.location.toLowerCase().includes(cleanSearchTerm))
      )
      .sort((a, b) => {
        let valA: any = (a as any)[inHouseSortField] ?? '';
        let valB: any = (b as any)[inHouseSortField] ?? '';

        if (inHouseSortField === 'totalValuation') {
          valA = (a.inHouseStock || 0) * (a.unitPrice || 0);
          valB = (b.inHouseStock || 0) * (b.unitPrice || 0);
        } else if (typeof valA === 'string') {
          valA = valA.toLowerCase();
          valB = valB.toLowerCase();
        }

        if (valA < valB) return inHouseSortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return inHouseSortOrder === 'asc' ? 1 : -1;
        return 0;
      });
  }, [inventoryList, cleanSearchTerm, inHouseSortField, inHouseSortOrder]);

  const totalStockValue = inventoryList.reduce((sum, item) => sum + ((item.inHouseStock || 0) * (item.unitPrice || 0)), 0);
  const lowStockCount = inventoryList.filter(i => !i.isProcessItem && (i.inHouseStock || 0) <= (i.minStockQty || i.reorderLevel || 0)).length;

  // -------------------------------------------------------------
  // EXTERNAL INVENTORY ITEM-WISE SUMMARY
  // -------------------------------------------------------------
  const externalItemSummary = useMemo(() => {
    const activeChallans = jobworks.filter(j => j.status !== 'COMPLETED' && (j.pendingBalance || 0) > 0);

    return items.map(item => {
      const matchingChallans = activeChallans.filter(j => j.itemId === item.id || j.itemCode === item.itemCode);
      const totalPendingWithVendors = matchingChallans.reduce((sum, j) => sum + (j.pendingBalance || 0), 0);

      // Group by vendor
      const vendorMap = new Map<string, { vendorId: string; vendorName: string; pendingQty: number; challanCount: number }>();
      matchingChallans.forEach(j => {
        const vKey = j.vendorId || j.vendorName;
        if (!vendorMap.has(vKey)) {
          vendorMap.set(vKey, {
            vendorId: j.vendorId,
            vendorName: j.vendorName,
            pendingQty: j.pendingBalance || 0,
            challanCount: 1
          });
        } else {
          const entry = vendorMap.get(vKey)!;
          entry.pendingQty += (j.pendingBalance || 0);
          entry.challanCount += 1;
        }
      });

      return {
        item,
        partCode: item.partCode || '-',
        itemCode: item.itemCode,
        name: item.name,
        category: item.category,
        unit: item.unit || 'PCS',
        inHouseStock: item.inHouseStock || 0,
        externalStock: totalPendingWithVendors,
        activeChallansCount: matchingChallans.length,
        vendorsBreakdown: Array.from(vendorMap.values())
      };
    }).filter(row => {
      if (!cleanSearchTerm) return row.externalStock > 0 || (row.item.externalStock || 0) > 0;
      return (
        row.itemCode.toLowerCase().includes(cleanSearchTerm) ||
        row.name.toLowerCase().includes(cleanSearchTerm) ||
        row.partCode.toLowerCase().includes(cleanSearchTerm) ||
        row.category.toLowerCase().includes(cleanSearchTerm) ||
        row.vendorsBreakdown.some(v => v.vendorName.toLowerCase().includes(cleanSearchTerm))
      );
    }).sort((a, b) => {
      let valA: any = (a as any)[extSortField] ?? '';
      let valB: any = (b as any)[extSortField] ?? '';

      if (typeof valA === 'string') {
        valA = valA.toLowerCase();
        valB = valB.toLowerCase();
      }

      if (valA < valB) return extSortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return extSortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [items, jobworks, cleanSearchTerm, extSortField, extSortOrder]);

  const totalExternalUnits = externalItemSummary.reduce((sum, row) => sum + row.externalStock, 0);

  // Active challans for the selected breakdown item
  const selectedItemChallans = useMemo(() => {
    if (!selectedBreakdownItem) return [];
    return jobworks.filter(j => 
      (j.itemId === selectedBreakdownItem.id || j.itemCode === selectedBreakdownItem.itemCode) &&
      j.status !== 'COMPLETED' &&
      (j.pendingBalance || 0) > 0
    );
  }, [selectedBreakdownItem, jobworks]);

  const handleOpenAdjustModal = (item: Item) => {
    setAdjustingItem(item);
    setAdjustedStock(item.inHouseStock || 0);
    setAdjustLocation(item.location || '');
    setAdjustPrice(item.unitPrice || 0);
    setAdjustReason('Physical Count Audit');
  };

  const handleSaveAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingItem) return;
    adjustItemStock(
      adjustingItem.id,
      Number(adjustedStock),
      adjustReason,
      adjustLocation,
      Number(adjustPrice)
    );
    setAdjustingItem(null);
  };

  const handleOpenBreakdown = (item: Item) => {
    setSelectedBreakdownItem(item);
  };

  return (
    <div className="module-layout-container" style={{ flex: 1, minHeight: 0, height: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingRight: '0.25rem' }}>
      {/* Top Header */}
      <div className="sticky-module-header">
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Warehouse size={22} color="var(--accent-primary)" /> Inventory Master & Stock Ledger
          </h2>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            In-House Store Stock &bull; External Jobwork Vendor Locations &bull; Real-time Ledger
          </span>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-outline" onClick={() => setPrintModalOpen(true)} title="Print inventory ledger">
            <Printer size={14} /> Print Stock Ledger
          </button>
        </div>
      </div>

      {/* 2-Section Tab Selector: In-House vs External */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '2px solid var(--border-color)', paddingBottom: '0.25rem' }}>
        <button
          className={`btn ${activeTab === 'IN_HOUSE' ? 'btn-primary' : 'btn-outline'}`}
          style={{ padding: '0.45rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, fontSize: '0.85rem' }}
          onClick={() => setActiveTab('IN_HOUSE')}
        >
          <Warehouse size={16} />
          In-House Store Inventory ({inventoryList.length} Items)
        </button>

        <button
          className={`btn ${activeTab === 'EXTERNAL' ? 'btn-primary' : 'btn-outline'}`}
          style={{ padding: '0.45rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, fontSize: '0.85rem' }}
          onClick={() => setActiveTab('EXTERNAL')}
        >
          <Truck size={16} />
          External Vendor Inventory ({totalExternalUnits} Units with Vendors)
        </button>
      </div>

      {/* VIEW 1: IN-HOUSE STORE INVENTORY */}
      {activeTab === 'IN_HOUSE' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1, minHeight: 0 }}>
          {/* Summary Metric Badges */}
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <div className="badge badge-info" style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}>
              Total SKUs: <strong>{inventoryList.length}</strong>
            </div>
            <div className="badge badge-success" style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}>
              Total Valuation: <strong>₹{totalStockValue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</strong>
            </div>
            {lowStockCount > 0 && (
              <div className="badge badge-danger" style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <AlertTriangle size={14} /> <strong>{lowStockCount}</strong> Items Below Reorder Level
              </div>
            )}
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>
              💡 <em>Double-click any row to audit adjust stock</em>
            </div>
          </div>

          {/* In-House Inventory Table */}
          <div className="table-container" style={{ flex: 1, minHeight: '350px', backgroundColor: 'var(--bg-card)' }}>
            <table>
              <thead>
                <tr>
                  <th onClick={() => { setInHouseSortField('itemCode'); setInHouseSortOrder(prev => prev === 'asc' ? 'desc' : 'asc'); }} style={{ cursor: 'pointer' }}>Item Code</th>
                  <th onClick={() => { setInHouseSortField('name'); setInHouseSortOrder(prev => prev === 'asc' ? 'desc' : 'asc'); }} style={{ cursor: 'pointer' }}>Item Name / Description</th>
                  <th onClick={() => { setInHouseSortField('category'); setInHouseSortOrder(prev => prev === 'asc' ? 'desc' : 'asc'); }} style={{ cursor: 'pointer' }}>Category</th>
                  <th onClick={() => { setInHouseSortField('location'); setInHouseSortOrder(prev => prev === 'asc' ? 'desc' : 'asc'); }} style={{ cursor: 'pointer' }}>Store Location</th>
                  <th onClick={() => { setInHouseSortField('inHouseStock'); setInHouseSortOrder(prev => prev === 'asc' ? 'desc' : 'asc'); }} style={{ cursor: 'pointer', textAlign: 'right' }}>In-House Stock</th>
                  <th onClick={() => { setInHouseSortField('reorderLevel'); setInHouseSortOrder(prev => prev === 'asc' ? 'desc' : 'asc'); }} style={{ cursor: 'pointer', textAlign: 'right' }}>Min Level</th>
                  <th onClick={() => { setInHouseSortField('unitPrice'); setInHouseSortOrder(prev => prev === 'asc' ? 'desc' : 'asc'); }} style={{ cursor: 'pointer', textAlign: 'right' }}>Unit Price (₹)</th>
                  <th onClick={() => { setInHouseSortField('totalValuation'); setInHouseSortOrder(prev => prev === 'asc' ? 'desc' : 'asc'); }} style={{ cursor: 'pointer', textAlign: 'right' }}>Total Valuation (₹)</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredInHouseItems.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                      No inventory items found.
                    </td>
                  </tr>
                ) : (
                  filteredInHouseItems.map(item => {
                    const isLow = (item.inHouseStock || 0) <= (item.minStockQty || item.reorderLevel || 0);
                    return (
                      <tr 
                        key={item.id} 
                        style={{ backgroundColor: isLow ? 'rgba(239, 68, 68, 0.04)' : undefined }}
                        onDoubleClick={() => handleOpenAdjustModal(item)}
                      >
                        <td style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--accent-primary)' }}>{item.itemCode}</td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{item.name}</div>
                          {item.partCode && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Part Code: {item.partCode}</div>}
                        </td>
                        <td><span className="badge badge-info">{item.category}</span></td>
                        <td>{item.location || <span style={{ color: 'var(--text-muted)' }}>Store Bay</span>}</td>
                        <td style={{ textAlign: 'right', fontWeight: 800, color: isLow ? 'var(--danger)' : 'var(--text-primary)' }}>
                          {item.inHouseStock} {item.unit}
                        </td>
                        <td style={{ textAlign: 'right' }}>{item.minStockQty || item.reorderLevel || 0}</td>
                        <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>₹{(item.unitPrice || 0).toLocaleString()}</td>
                        <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 700 }}>
                          ₹{((item.inHouseStock || 0) * (item.unitPrice || 0)).toLocaleString()}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button 
                            type="button" 
                            className="btn btn-outline" 
                            style={{ padding: '0.2rem 0.5rem', fontSize: '0.72rem' }}
                            onClick={() => handleOpenAdjustModal(item)}
                            title="Physical count adjustment"
                          >
                            <Edit2 size={12} /> Audit Adjust
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 2: EXTERNAL VENDOR INVENTORY */}
      {activeTab === 'EXTERNAL' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1, minHeight: 0 }}>
          {/* Header Info Banner */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', padding: '0.6rem 0.85rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: '0.5rem', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div className="badge badge-warning" style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem', fontWeight: 700 }}>
                <Truck size={14} style={{ marginRight: '0.35rem' }} /> {externalItemSummary.length} Items with Vendors
              </div>
              <div className="badge badge-info" style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem', fontWeight: 700 }}>
                Total External Stock: {totalExternalUnits} Units
              </div>
            </div>

            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              💡 <strong>Tip:</strong> Double-click any item row to view which vendor has what quantity.
            </div>
          </div>

          {/* External Inventory Item Table */}
          <div className="table-container" style={{ flex: 1, minHeight: '350px', backgroundColor: 'var(--bg-card)' }}>
            <table>
              <thead>
                <tr>
                  <th onClick={() => { setExtSortField('itemCode'); setExtSortOrder(prev => prev === 'asc' ? 'desc' : 'asc'); }} style={{ cursor: 'pointer' }}>Item Code</th>
                  <th onClick={() => { setExtSortField('name'); setExtSortOrder(prev => prev === 'asc' ? 'desc' : 'asc'); }} style={{ cursor: 'pointer' }}>Item Description</th>
                  <th onClick={() => { setExtSortField('category'); setExtSortOrder(prev => prev === 'asc' ? 'desc' : 'asc'); }} style={{ cursor: 'pointer' }}>Category</th>
                  <th onClick={() => { setExtSortField('inHouseStock'); setExtSortOrder(prev => prev === 'asc' ? 'desc' : 'asc'); }} style={{ textAlign: 'right', cursor: 'pointer' }}>In-House Store</th>
                  <th onClick={() => { setExtSortField('externalStock'); setExtSortOrder(prev => prev === 'asc' ? 'desc' : 'asc'); }} style={{ textAlign: 'right', cursor: 'pointer' }}>External Stock (Vendors)</th>
                  <th>Vendors Holding Stock</th>
                  <th style={{ textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {externalItemSummary.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                      No external vendor inventory records found.
                    </td>
                  </tr>
                ) : (
                  externalItemSummary.map(row => (
                    <tr
                      key={row.item.id}
                      style={{ cursor: 'pointer' }}
                      onDoubleClick={() => handleOpenBreakdown(row.item)}
                      title="Double-click to view detailed vendor quantity breakdown"
                    >
                      <td style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--accent-primary)' }}>{row.itemCode}</td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{row.name}</div>
                        {row.partCode !== '-' && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Part Code: {row.partCode}</div>}
                      </td>
                      <td><span className="badge badge-info">{row.category}</span></td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>{row.inHouseStock} {row.unit}</td>
                      <td style={{ textAlign: 'right', fontWeight: 800, color: '#d97706', fontSize: '0.92rem' }}>
                        {row.externalStock} {row.unit}
                      </td>
                      <td>
                        {row.vendorsBreakdown.length === 0 ? (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No active vendor balance</span>
                        ) : (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                            {row.vendorsBreakdown.map(v => (
                              <span key={v.vendorId} className="badge badge-secondary" style={{ fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                                <Building size={11} />
                                <strong>{v.vendorName}:</strong> {v.pendingQty} {row.unit}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          className="btn btn-outline"
                          style={{ padding: '0.2rem 0.6rem', fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                          onClick={() => handleOpenBreakdown(row.item)}
                        >
                          <Users size={12} /> View Vendor Breakdown <ChevronRight size={12} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: VENDOR INVENTORY BREAKDOWN ON DOUBLE CLICK */}
      {selectedBreakdownItem && (
        <Modal
          isOpen={!!selectedBreakdownItem}
          onClose={() => setSelectedBreakdownItem(null)}
          title={`External Vendor Inventory Breakdown: ${selectedBreakdownItem.itemCode} - ${selectedBreakdownItem.name}`}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '75vh', overflowY: 'auto' }}>
            {/* Header Summary */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', padding: '0.75rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: '0.5rem' }}>
              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Item Code / Part</span>
                <div style={{ fontWeight: 800, color: 'var(--accent-primary)' }}>{selectedBreakdownItem.itemCode} {selectedBreakdownItem.partCode ? `[${selectedBreakdownItem.partCode}]` : ''}</div>
              </div>
              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>In-House Store Stock</span>
                <div style={{ fontWeight: 800, color: 'var(--success)' }}>{selectedBreakdownItem.inHouseStock} {selectedBreakdownItem.unit}</div>
              </div>
              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Total Stock with Vendors</span>
                <div style={{ fontWeight: 800, color: '#d97706' }}>
                  {selectedItemChallans.reduce((sum, j) => sum + (j.pendingBalance || 0), 0)} {selectedBreakdownItem.unit}
                </div>
              </div>
            </div>

            {/* Vendor-Wise Breakdown Table */}
            <h4 style={{ fontSize: '0.9rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Users size={16} color="var(--accent-primary)" /> Vendors Holding this Item
            </h4>

            <div className="table-container" style={{ backgroundColor: 'var(--bg-card)' }}>
              <table>
                <thead>
                  <tr>
                    <th>Vendor Name</th>
                    <th>Challan No</th>
                    <th>Process Required</th>
                    <th>Issue Date</th>
                    <th style={{ textAlign: 'right' }}>Sent Qty</th>
                    <th style={{ textAlign: 'right' }}>Received Qty</th>
                    <th style={{ textAlign: 'right' }}>Pending Balance</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedItemChallans.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)' }}>
                        No active vendor challans found for this component.
                      </td>
                    </tr>
                  ) : (
                    selectedItemChallans.map(j => (
                      <tr key={j.id}>
                        <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{j.vendorName}</td>
                        <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{j.challanNo}</td>
                        <td><span className="badge badge-info">{j.processRequired}</span></td>
                        <td>{j.issueDate}</td>
                        <td style={{ textAlign: 'right' }}>{j.sentQuantity}</td>
                        <td style={{ textAlign: 'right', color: 'var(--success)' }}>{j.receivedQuantity || 0}</td>
                        <td style={{ textAlign: 'right', fontWeight: 800, color: '#d97706' }}>{j.pendingBalance} {selectedBreakdownItem.unit}</td>
                        <td><span className="badge badge-warning">{j.status}</span></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setSelectedBreakdownItem(null)}>
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL: PHYSICAL STOCK AUDIT ADJUSTMENT */}
      {adjustingItem && (
        <Modal
          isOpen={!!adjustingItem}
          onClose={() => setAdjustingItem(null)}
          title={`Physical Stock Audit Adjustment: ${adjustingItem.itemCode} - ${adjustingItem.name}`}
        >
          <form onSubmit={handleSaveAdjustment} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', backgroundColor: 'var(--bg-tertiary)', padding: '0.75rem', borderRadius: '0.375rem' }}>
              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Current System Stock</span>
                <div style={{ fontWeight: 800, fontSize: '1rem' }}>{adjustingItem.inHouseStock} {adjustingItem.unit}</div>
              </div>
              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Unit Price</span>
                <div style={{ fontWeight: 800, fontSize: '1rem' }}>₹{adjustingItem.unitPrice || 0}</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700 }}>Actual Counted Stock ({adjustingItem.unit}) *</label>
                <input
                  type="number"
                  min="0"
                  required
                  className="input-field"
                  value={adjustedStock}
                  onChange={(e) => setAdjustedStock(Number(e.target.value))}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700 }}>Updated Unit Valuation (₹)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  className="input-field"
                  value={adjustPrice}
                  onChange={(e) => setAdjustPrice(Number(e.target.value))}
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 700 }}>Store Location / Shelf</label>
              <input
                type="text"
                className="input-field"
                value={adjustLocation}
                onChange={(e) => setAdjustLocation(e.target.value)}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 700 }}>Reason for Stock Adjustment</label>
              <input
                type="text"
                required
                className="input-field"
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setAdjustingItem(null)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Save Physical Adjustment</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Print Manager Modal */}
      <PrintManagerModal
        isOpen={printModalOpen}
        onClose={() => setPrintModalOpen(false)}
        title="Print Inventory Stock Ledger"
        documentRefNumber="INV-STOCK-LEDGER"
      >
        <ItemMasterListPrintView items={filteredInHouseItems} filterLabel="In-House Stock Valuation Register" />
      </PrintManagerModal>
    </div>
  );
};
