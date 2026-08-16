import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import { Modal } from '../common/Modal';
import { BulkUploadModal } from '../common/BulkUploadModal';
import { Plus, Edit2, Trash2, Upload, RefreshCw, Search, FileSpreadsheet, Settings } from 'lucide-react';
import { Item, ItemCategory, QCTrigger } from '../../types/erp';
import { parseItemsSheet } from '../../utils/csvParser';
import { openLiveModuleSheet } from '../../utils/sheetFolderManager';

export const ItemMasterModule: React.FC = () => {
  const { 
    items, itemCategories, addItem, updateItem, deleteItem, bulkAddItems, 
    addItemCategory, deleteItemCategory, searchTerm, setSearchTerm 
  } = useERP();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);

  const [newCatInput, setNewCatInput] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL');

  const [formData, setFormData] = useState({
    itemCode: '',
    name: '',
    category: 'Machined Component' as ItemCategory,
    drawingNo: '',
    unit: 'PCS',
    purchaseUOM: 'PCS',
    conversionFactor: 1,
    inHouseStock: 0,
    externalStock: 0,
    reorderLevel: 5,
    unitPrice: 0,
    location: '',
    specification: '',
    qcTrigger: 'ON_GRN' as QCTrigger
  });

  const filteredItems = items.filter(item => {
    const matchesSearch = 
      item.itemCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.drawingNo && item.drawingNo.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCategory = selectedCategoryFilter === 'ALL' || item.category === selectedCategoryFilter;

    return matchesSearch && matchesCategory;
  });

  const handleOpenAddModal = () => {
    setEditingItem(null);
    setFormData({
      itemCode: `GEC-MAT-${String(items.length + 1).padStart(3, '0')}`,
      name: '',
      category: (itemCategories[0] || 'Machined Component') as ItemCategory,
      drawingNo: '',
      unit: 'PCS',
      purchaseUOM: 'PCS',
      conversionFactor: 1,
      inHouseStock: 0,
      externalStock: 0,
      reorderLevel: 5,
      unitPrice: 0,
      location: 'Store Rack A',
      specification: '',
      qcTrigger: 'ON_GRN'
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: Item) => {
    setEditingItem(item);
    setFormData({
      itemCode: item.itemCode,
      name: item.name,
      category: item.category,
      drawingNo: item.drawingNo || '',
      unit: item.unit,
      purchaseUOM: item.purchaseUOM || item.unit,
      conversionFactor: item.conversionFactor || 1,
      inHouseStock: item.inHouseStock,
      externalStock: item.externalStock,
      reorderLevel: item.reorderLevel,
      unitPrice: item.unitPrice,
      location: item.location,
      specification: item.specification || '',
      qcTrigger: item.qcTrigger || 'ON_GRN'
    });
    setIsModalOpen(true);
  };

  const handleAddCategorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newCatInput.trim()) {
      addItemCategory(newCatInput.trim());
      setNewCatInput('');
    }
  };

  const handleOpenSheet = () => {
    openLiveModuleSheet('ItemMaster', 'GEC_Items_Live', items, [
      { key: 'itemCode', label: 'Item Code' },
      { key: 'name', label: 'Component Name' },
      { key: 'category', label: 'Category' },
      { key: 'drawingNo', label: 'Drawing No' },
      { key: 'unit', label: 'Base UOM' },
      { key: 'purchaseUOM', label: 'Purchase UOM' },
      { key: 'conversionFactor', label: 'C-Factor Ratio' },
      { key: 'reorderLevel', label: 'Reorder Level' },
      { key: 'unitPrice', label: 'Unit Price' },
      { key: 'location', label: 'Store Location' },
      { key: 'specification', label: 'Specification' }
    ]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingItem) {
      updateItem({ ...editingItem, ...formData });
    } else {
      addItem(formData);
    }
    setIsModalOpen(false);
  };

  const templateCSV = `Code,Name,Category,DrawingNo,BaseUOM,PurchaseUOM,CFactor,ReorderLevel,UnitPrice,Location,Specification\nGEC-MAT-099,Tie Bar Bolt 40mm,Machined Component,DWG-TB-40,PCS,BOX,100,4,1500,Rack Bay 2,EN19 Grade Hardened`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>Item & Component Master</h2>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button className="btn btn-outline" onClick={() => setIsCatModalOpen(true)}>
            <Settings size={16} /> Manage Categories
          </button>
          <button className="btn btn-outline" onClick={handleOpenSheet}>
            <FileSpreadsheet size={16} /> Open Sheet
          </button>
          <button className="btn btn-outline" onClick={() => setIsBulkModalOpen(true)}>
            <Upload size={16} /> Bulk Upload
          </button>
          <button className="btn btn-primary" onClick={handleOpenAddModal}>
            <Plus size={16} /> Add Component
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="card" style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', backgroundColor: 'var(--bg-card)' }}>
        <div style={{ position: 'relative', width: '320px', maxWidth: '100%' }}>
          <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search item code, component name, drawing no..."
            className="input-field"
            style={{ paddingLeft: '2.25rem' }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Category:</div>
          <select 
            className="input-field" 
            style={{ width: '220px' }}
            value={selectedCategoryFilter}
            onChange={(e) => setSelectedCategoryFilter(e.target.value)}
          >
            <option value="ALL">All Categories ({items.length})</option>
            {itemCategories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Clean Items Table */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Item Code</th>
              <th>Component Name</th>
              <th>Base UOM</th>
              <th>Purchase UOM</th>
              <th>QC Trigger</th>
              <th>Reorder Level</th>
              <th>Unit Price (₹)</th>
              <th>Location</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.map(item => {
              const pUOM = item.purchaseUOM || item.unit;
              const qcSetting = item.qcTrigger || 'ON_GRN';

              return (
                <tr key={item.id}>
                  <td style={{ fontWeight: 700, color: 'var(--accent-primary)', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                    {item.itemCode}
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{item.name}</div>
                    {item.drawingNo && (
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>Dwg: {item.drawingNo}</div>
                    )}
                  </td>
                  <td>
                    <span className="badge badge-info" style={{ fontWeight: 700 }}>{item.unit}</span>
                  </td>
                  <td>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{pUOM}</span>
                  </td>
                  <td>
                    <span className={`badge ${
                      qcSetting === 'ON_GRN' ? 'badge-success' :
                      qcSetting === 'DURING_ASSEMBLY' ? 'badge-warning' : 'badge-neutral'
                    }`}>
                      {qcSetting.replace('_', ' ')}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-secondary)' }}>
                    {item.reorderLevel} {item.unit}
                  </td>
                  <td style={{ fontWeight: 600 }}>
                    ₹{item.unitPrice.toLocaleString()}
                  </td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {item.location || '-'}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.35rem' }}>
                      <button 
                        className="btn btn-outline" 
                        style={{ padding: '0.3rem 0.55rem', color: 'var(--accent-primary)', borderColor: 'var(--accent-primary)' }}
                        title="Edit Item Master"
                        onClick={() => handleOpenEditModal(item)}
                      >
                        <Edit2 size={14} /> Edit
                      </button>
                      <button 
                        className="btn btn-outline" 
                        style={{ padding: '0.3rem 0.55rem', color: 'var(--danger)', borderColor: 'var(--danger)' }}
                        title="Delete Item Master"
                        onClick={() => deleteItem(item.id)}
                      >
                        <Trash2 size={14} /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal: Add / Remove Item Categories */}
      <Modal
        isOpen={isCatModalOpen}
        onClose={() => setIsCatModalOpen(false)}
        title="Manage Item Master Categories"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <form onSubmit={handleAddCategorySubmit} style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              required
              className="input-field"
              placeholder="Enter new category name (e.g. Pneumatics)"
              value={newCatInput}
              onChange={(e) => setNewCatInput(e.target.value)}
            />
            <button type="submit" className="btn btn-primary" style={{ whiteSpace: 'nowrap' }}>
              <Plus size={16} /> Add Category
            </button>
          </form>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '220px', overflowY: 'auto' }}>
            {itemCategories.map(cat => (
              <div key={cat} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.75rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: '0.375rem' }}>
                <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{cat}</span>
                <button
                  className="btn btn-outline"
                  style={{ padding: '0.2rem 0.4rem', color: 'var(--danger)' }}
                  onClick={() => deleteItemCategory(cat)}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
            <button className="btn btn-secondary" onClick={() => setIsCatModalOpen(false)}>Done</button>
          </div>
        </div>
      </Modal>

      {/* Add / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? `Edit Item Master (${editingItem.itemCode})` : 'Register New Item Master'}
      >
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-grid-3">
            <div>
              <label>Item Code</label>
              <input type="text" required className="input-field" value={formData.itemCode} onChange={(e) => setFormData({ ...formData, itemCode: e.target.value })} />
            </div>
            <div>
              <label>Category</label>
              <select className="input-field" value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value as ItemCategory })}>
                {itemCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div>
              <label>QC Trigger</label>
              <select className="input-field" value={formData.qcTrigger} onChange={(e) => setFormData({ ...formData, qcTrigger: e.target.value as QCTrigger })}>
                <option value="ON_GRN">ON_GRN (Auto QC on Goods Inward)</option>
                <option value="DURING_ASSEMBLY">DURING_ASSEMBLY (QC during Assembly)</option>
                <option value="NO_QC">NO_QC (Direct Stock / No QC needed)</option>
              </select>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.25rem' }}>Component Name</label>
            <input type="text" required className="input-field" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.25rem' }}>Drawing No.</label>
            <input type="text" className="input-field" value={formData.drawingNo} onChange={(e) => setFormData({ ...formData, drawingNo: e.target.value })} />
          </div>

          {/* UOM Conversion Section */}
          <div style={{ padding: '0.875rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: '0.5rem', border: '1px solid var(--accent-primary)' }}>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <RefreshCw size={14} /> Unit of Measurement (UOM) & C-Factor
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Base UOM</label>
                <input 
                  type="text" 
                  required 
                  className="input-field" 
                  placeholder="e.g. PCS, LTR" 
                  value={formData.unit} 
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value.toUpperCase() })} 
                />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Purchase UOM</label>
                <input 
                  type="text" 
                  required 
                  className="input-field" 
                  placeholder="e.g. BOX, BAR" 
                  value={formData.purchaseUOM} 
                  onChange={(e) => setFormData({ ...formData, purchaseUOM: e.target.value.toUpperCase() })} 
                />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>C-Factor Ratio</label>
                <input 
                  type="number" 
                  min="0.001" 
                  step="any"
                  required 
                  className="input-field" 
                  value={formData.conversionFactor} 
                  onChange={(e) => setFormData({ ...formData, conversionFactor: Number(e.target.value) })} 
                />
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.25rem' }}>Reorder Level ({formData.unit})</label>
              <input type="number" min="0" required className="input-field" value={formData.reorderLevel} onChange={(e) => setFormData({ ...formData, reorderLevel: Number(e.target.value) })} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.25rem' }}>Unit Price (₹ per {formData.unit})</label>
              <input type="number" min="0" required className="input-field" value={formData.unitPrice} onChange={(e) => setFormData({ ...formData, unitPrice: Number(e.target.value) })} />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.25rem' }}>Store Location</label>
            <input type="text" className="input-field" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.25rem' }}>Specification</label>
            <textarea className="input-field" rows={2} value={formData.specification} onChange={(e) => setFormData({ ...formData, specification: e.target.value })} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary">Save Item Master</button>
          </div>
        </form>
      </Modal>

      {/* Bulk Upload Modal */}
      <BulkUploadModal<Omit<Item, 'id'>>
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        title="Bulk Upload Item Master Sheet"
        templateCSV={templateCSV}
        templateFileName="gec_items_template.csv"
        onParse={(text) => parseItemsSheet(text, items)}
        onConfirmImport={(newRows) => bulkAddItems(newRows)}
      />

    </div>
  );
};
