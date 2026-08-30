import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import { Warehouse, AlertTriangle, Search, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';

type StockSortKey = 'itemCode' | 'name' | 'category' | 'location' | 'inHouseStock' | 'reorderLevel' | 'unitPrice' | 'totalValuation';

export const InHouseInventoryModule: React.FC = () => {
  const { items, searchTerm, setSearchTerm } = useERP();

  const [sortField, setSortField] = useState<StockSortKey>('itemCode');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const handleSort = (field: StockSortKey) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const filteredItems = items
    .filter(item =>
      item.itemCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.location.toLowerCase().includes(searchTerm.toLowerCase())
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

  return (
    <div className="module-layout-container">
      <div className="sticky-module-header">
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>In-House Store Inventory</h2>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Real-time stock ledger &bull; Reorder warnings &bull; Inventory valuation
          </span>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
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
        <div style={{ position: 'relative', width: '360px', maxWidth: '100%' }}>
          <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search item code, component name, store location..."
            className="input-field"
            style={{ paddingLeft: '2.25rem' }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
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
            </tr>
          </thead>
          <tbody>
            {filteredItems.map(item => {
              const isLow = item.inHouseStock <= item.reorderLevel;
              const val = item.inHouseStock * item.unitPrice;
              return (
                <tr key={item.id}>
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
                    {item.location}
                  </td>
                  <td style={{ fontSize: '1rem', fontWeight: 800, color: isLow ? 'var(--danger)' : 'var(--success)' }}>
                    {item.inHouseStock} {item.unit}
                  </td>
                  <td style={{ color: 'var(--text-muted)' }}>
                    {item.reorderLevel} {item.unit}
                  </td>
                  <td style={{ fontWeight: 500 }}>
                    ₹{item.unitPrice.toLocaleString()}
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
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

    </div>
  );
};
