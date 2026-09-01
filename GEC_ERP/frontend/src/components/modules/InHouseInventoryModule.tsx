import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import { Modal } from '../common/Modal';
import { PrintManagerModal } from '../printTemplates/PrintManagerModal';
import { ItemMasterListPrintView } from '../printTemplates/ItemMasterPrintTemplates';
import { openLiveModuleSheet } from '../../utils/sheetFolderManager';
import { Warehouse, AlertTriangle, Search, ArrowUp, ArrowDown, ArrowUpDown, Printer, RefreshCw, Edit2, CheckCircle } from 'lucide-react';
import { Item } from '../../types/erp';

type StockSortKey = 'itemCode' | 'name' | 'category' | 'location' | 'inHouseStock' | 'reorderLevel' | 'unitPrice' | 'totalValuation';

export const InHouseInventoryModule: React.FC = () => {
  const { items, searchTerm, setSearchTerm, adjustItemStock } = useERP();

  const [sortField, setSortField] = useState<StockSortKey>('itemCode');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [printModalOpen, setPrintModalOpen] = useState(false);

  // Stock Adjustment Modal State
  const [adjustingItem, setAdjustingItem] = useState<Item | null>(null);
  const [adjustedStock, setAdjustedStock] = useState<number>(0);
  const [adjustReason, setAdjustReason] = useState<string>('Physical Count Audit');
  const [adjustLocation, setAdjustLocation] = useState<string>('');
  const [adjustReorder, setAdjustReorder] = useState<number>(0);
  const [adjustPrice, setAdjustPrice] = useState<number>(0);

  const handleOpenAdjustModal = (item: Item) => {
    setAdjustingItem(item);
    setAdjustedStock(item.inHouseStock);
    setAdjustReason('Physical Count Audit');
    setAdjustLocation(item.location || '');
    setAdjustReorder(item.reorderLevel || 0);
    setAdjustPrice(item.unitPrice || 0);
  };

  const handleSaveStockAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingItem) return;
    adjustItemStock(
      adjustingItem.id,
      Number(adjustedStock),
      adjustReason,
      adjustLocation,
      Number(adjustReorder),
      Number(adjustPrice)
    );
    setAdjustingItem(null);
  };

  const handleSort = (field: StockSortKey) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Universal @history search handling
  const isHistorySearch = searchTerm.toLowerCase().includes('@history');
  const cleanSearchTerm = searchTerm.replace(/@history/gi, '').trim().toLowerCase();

  const filteredItems = items
    .filter(item =>
      !cleanSearchTerm ||
      item.itemCode.toLowerCase().includes(cleanSearchTerm) ||
      item.name.toLowerCase().includes(cleanSearchTerm) ||
      item.category.toLowerCase().includes(cleanSearchTerm) ||
      (item.location && item.location.toLowerCase().includes(cleanSearchTerm))
    )
    .sort((a, b) => {
      let valA: any = (a as any)[sortField] ?? '';
      let valB: any = (b as any)[sortField] ?? '';

      if (sortField === 'totalValuation') {
        valA = a.inHouseStock * (a.unitPrice || 0);
        valB = b.inHouseStock * (b.unitPrice || 0);
      } else if (typeof valA === 'string') {
        valA = valA.toLowerCase();
        valB = valB.toLowerCase();
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

  const totalStockValue = items.reduce((sum, item) => sum + (item.inHouseStock * (item.unitPrice || 0)), 0);
  const lowStockCount = items.filter(i => i.inHouseStock <= (i.reorderLevel || 0)).length;

  const handleRefreshLiveSheet = () => {
    const data = filteredItems.map(item => ({
      itemCode: item.itemCode,
      name: item.name,
      category: item.category,
      location: item.location || '',
      inHouseStock: `${item.inHouseStock} ${item.unit}`,
      reorderLevel: `${item.reorderLevel || 0} ${item.unit}`,
      unitPrice: `₹${(item.unitPrice || 0).toLocaleString()}`,
      totalValuation: `₹${(item.inHouseStock * (item.unitPrice || 0)).toLocaleString()}`,
      status: item.inHouseStock <= (item.reorderLevel || 0) ? 'LOW_STOCK' : 'NORMAL'
    }));

    const headers: { key: keyof typeof data[0]; label: string }[] = [
      { key: 'itemCode', label: 'Item Code' },
      { key: 'name', label: 'Component & Spec' },
      { key: 'category', label: 'Category' },
      { key: 'location', label: 'Location Rack' },
      { key: 'inHouseStock', label: 'In-House Stock' },
      { key: 'reorderLevel', label: 'Safety Level' },
      { key: 'unitPrice', label: 'Unit Valuation' },
      { key: 'totalValuation', label: 'Total Valuation' },
      { key: 'status', label: 'Stock Status' }
    ];

    openLiveModuleSheet('InHouseStock', 'GEC_ERP_Store_Inventory_Live', data, headers);
  };

  return (
    <div className="module-layout-container">
      <div className="sticky-module-header">
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>In-House Store Inventory</h2>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Real-time stock ledger &bull; Reorder warnings &bull; Inventory valuation
          </span>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-outline" onClick={handleRefreshLiveSheet} title="Sync and maintain live CSV sheet">
            <RefreshCw size={14} /> Live Sheet
          </button>
          <button type="button" className="btn btn-outline" onClick={() => setPrintModalOpen(true)} title="Print filtered inventory valuation report">
            <Printer size={14} /> Print Report
          </button>
          <div className="card" style={{ padding: '0.4rem 0.85rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Warehouse size={18} style={{ color: 'var(--accent-primary)' }} />
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Total Stock Value</div>
              <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>₹{totalStockValue.toLocaleString()}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Inline Search Bar */}
      <div className="card" style={{ padding: '0.65rem 1rem', display: 'flex', alignItems: 'center', backgroundColor: 'var(--bg-card)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', width: '380px', maxWidth: '100%' }}>
            <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search item code, component, location... (type @history)"
              className="input-field"
              style={{ paddingLeft: '2.25rem' }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {isHistorySearch && (
            <span className="badge" style={{ backgroundColor: '#7c3aed', color: '#ffffff', fontSize: '0.75rem', fontWeight: 700 }}>
              📜 History Search Active
            </span>
          )}
        </div>
      </div>

      {/* Stock Table */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th onClick={() => handleSort('itemCode')} style={{ cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  Item Code {sortField === 'itemCode' ? (sortOrder === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} />) : <ArrowUpDown size={12} color="var(--text-muted)" />}
                </div>
              </th>
              <th onClick={() => handleSort('name')} style={{ cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  Component & Specification {sortField === 'name' ? (sortOrder === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} />) : <ArrowUpDown size={12} color="var(--text-muted)" />}
                </div>
              </th>
              <th onClick={() => handleSort('category')} style={{ cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  Category {sortField === 'category' ? (sortOrder === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} />) : <ArrowUpDown size={12} color="var(--text-muted)" />}
                </div>
              </th>
              <th onClick={() => handleSort('location')} style={{ cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  Location Rack {sortField === 'location' ? (sortOrder === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} />) : <ArrowUpDown size={12} color="var(--text-muted)" />}
                </div>
              </th>
              <th onClick={() => handleSort('inHouseStock')} style={{ cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  In-House Stock {sortField === 'inHouseStock' ? (sortOrder === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} />) : <ArrowUpDown size={12} color="var(--text-muted)" />}
                </div>
              </th>
              <th onClick={() => handleSort('reorderLevel')} style={{ cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  Safety Level {sortField === 'reorderLevel' ? (sortOrder === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} />) : <ArrowUpDown size={12} color="var(--text-muted)" />}
                </div>
              </th>
              <th onClick={() => handleSort('unitPrice')} style={{ cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  Unit Valuation {sortField === 'unitPrice' ? (sortOrder === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} />) : <ArrowUpDown size={12} color="var(--text-muted)" />}
                </div>
              </th>
              <th onClick={() => handleSort('totalValuation')} style={{ cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  Total Stock Value {sortField === 'totalValuation' ? (sortOrder === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} />) : <ArrowUpDown size={12} color="var(--text-muted)" />}
                </div>
              </th>
              <th>Stock Status</th>
              <th style={{ width: '80px', textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.map(item => {
              const isLow = item.inHouseStock <= (item.reorderLevel || 0);
              const val = item.inHouseStock * (item.unitPrice || 0);
              return (
                <tr key={item.id} onDoubleClick={() => handleOpenAdjustModal(item)} style={{ cursor: 'pointer' }} title="Double-click to adjust stock count">
                  <td style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>
                    {item.itemCode}
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{item.name}</div>
                  </td>
                  <td>
                    <span className="badge badge-neutral">{item.category}</span>
                  </td>
                  <td style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>
                    {item.location || '-'}
                  </td>
                  <td style={{ fontSize: '1rem', fontWeight: 800, color: isLow ? 'var(--danger)' : 'var(--success)' }}>
                    {item.inHouseStock} {item.unit}
                  </td>
                  <td style={{ color: 'var(--text-muted)' }}>
                    {item.reorderLevel || 0} {item.unit}
                  </td>
                  <td style={{ fontWeight: 500 }}>
                    ₹{(item.unitPrice || 0).toLocaleString()}
                  </td>
                  <td style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>
                    ₹{val.toLocaleString()}
                  </td>
                  <td>
                    {isLow ? (
                      <span className="badge badge-danger" style={{ display: 'inline-flex', gap: '0.25rem', alignItems: 'center' }}>
                        <AlertTriangle size={12} /> Low Stock
                      </span>
                    ) : (
                      <span className="badge badge-success">
                        Normal Stock
                      </span>
                    )}
                  </td>
                  <td onClick={(e) => e.stopPropagation()} style={{ textAlign: 'center' }}>
                    <button 
                      className="btn btn-outline" 
                      style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', gap: '0.25rem' }} 
                      title="Adjust Inventory Count / Physical Stock"
                      onClick={() => handleOpenAdjustModal(item)}
                    >
                      <Edit2 size={13} /> Edit Qty
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Stock Adjustment Modal */}
      {adjustingItem && (
        <Modal
          isOpen={Boolean(adjustingItem)}
          onClose={() => setAdjustingItem(null)}
          title={`Adjust Physical Stock: ${adjustingItem.itemCode} (${adjustingItem.name})`}
        >
          <form onSubmit={handleSaveStockAdjustment} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: '0.5rem', border: '1px solid var(--border-color)', fontSize: '0.85rem' }}>
              <div><strong>Component:</strong> {adjustingItem.name}</div>
              <div><strong>Item Code:</strong> <span style={{ color: 'var(--accent-primary)', fontFamily: 'monospace' }}>{adjustingItem.itemCode}</span> &bull; <strong>Class:</strong> {adjustingItem.category}</div>
              <div><strong>Current System Stock:</strong> <span style={{ fontWeight: 800 }}>{adjustingItem.inHouseStock} {adjustingItem.unit}</span></div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ fontWeight: 700 }}>New Physical In-House Stock ({adjustingItem.unit}) *</label>
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
                <label style={{ fontWeight: 700 }}>Safety / Reorder Level ({adjustingItem.unit})</label>
                <input 
                  type="number" 
                  min="0" 
                  className="input-field" 
                  value={adjustReorder} 
                  onChange={(e) => setAdjustReorder(Number(e.target.value))} 
                />
              </div>

              <div>
                <label style={{ fontWeight: 700 }}>Location Rack / Bin</label>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="e.g. Rack B-04"
                  value={adjustLocation} 
                  onChange={(e) => setAdjustLocation(e.target.value)} 
                />
              </div>

              <div>
                <label style={{ fontWeight: 700 }}>Unit Valuation (₹)</label>
                <input 
                  type="number" 
                  min="0" 
                  className="input-field" 
                  value={adjustPrice} 
                  onChange={(e) => setAdjustPrice(Number(e.target.value))} 
                />
              </div>
            </div>

            <div>
              <label style={{ fontWeight: 700 }}>Adjustment Reason / Physical Audit Note</label>
              <input 
                type="text" 
                className="input-field" 
                placeholder="e.g. Physical stock take audit, Damaged scrap write-off, Found extra in store"
                value={adjustReason} 
                onChange={(e) => setAdjustReason(e.target.value)} 
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setAdjustingItem(null)}>Cancel</button>
              <button type="submit" className="btn btn-primary">
                <CheckCircle size={15} /> Save Stock Adjustment
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Feature-Wise Modular Print Manager Modal */}
      <PrintManagerModal
        isOpen={printModalOpen}
        onClose={() => setPrintModalOpen(false)}
        title="Print Store Inventory Valuation Ledger"
        documentRefNumber="STORE-VALUATION"
      >
        <ItemMasterListPrintView items={filteredItems} filterLabel={isHistorySearch ? 'All Historical Store Inventory Ledgers' : 'Current In-House Store Inventory'} />
      </PrintManagerModal>
    </div>
  );
};
