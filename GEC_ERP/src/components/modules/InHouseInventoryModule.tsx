import React from 'react';
import { useERP } from '../../context/ERPContext';
import { Warehouse, AlertTriangle, ArrowUpRight, ArrowDownRight, Layers, Search } from 'lucide-react';

export const InHouseInventoryModule: React.FC = () => {
  const { items, searchTerm, setSearchTerm } = useERP();

  const filteredItems = items.filter(item =>
    item.itemCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalStockValue = items.reduce((sum, item) => sum + (item.inHouseStock * item.unitPrice), 0);
  const lowStockCount = items.filter(i => i.inHouseStock <= i.reorderLevel).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>In-House Store Inventory</h2>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div className="card" style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Warehouse size={18} style={{ color: 'var(--accent-primary)' }} />
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Total Stock Value</div>
              <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>₹{totalStockValue.toLocaleString()}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Inline Search Bar */}
      <div className="card" style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', backgroundColor: 'var(--bg-card)' }}>
        <div style={{ position: 'relative', width: '360px' }}>
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
              <th>Item Code</th>
              <th>Component & Specification</th>
              <th>Category</th>
              <th>Location Rack</th>
              <th>In-House Stock</th>
              <th>Safety Level</th>
              <th>Unit Valuation</th>
              <th>Total Stock Value</th>
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
                    {item.drawingNo && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                        Dwg: {item.drawingNo}
                      </div>
                    )}
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
