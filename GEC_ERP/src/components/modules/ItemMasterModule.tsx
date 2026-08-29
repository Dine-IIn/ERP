import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import { Modal } from '../common/Modal';
import { BulkUploadModal } from '../common/BulkUploadModal';
import { ExportFieldSelectorModal, FieldOption } from '../common/ExportFieldSelectorModal';
import { useTableKeyboardNav } from '../../hooks/useTableKeyboardNav';
import { Plus, Edit2, Trash2, Upload, Search, FileSpreadsheet, Settings, Filter, Edit3, ArrowUp, ArrowDown, ArrowUpDown, ArrowLeft, X } from 'lucide-react';
import { Item, ItemCategory, QCTrigger, MaterialProcessType, ItemMappedVendor } from '../../types/erp';
import { parseItemsSheet } from '../../utils/csvParser';
import { openLiveModuleSheet } from '../../utils/sheetFolderManager';

export const ItemMasterModule: React.FC = () => {
  const { 
    items, itemCategories, vendors, currentUser, addItem, updateItem, deleteItem, bulkDeleteItems, bulkAddItems, 
    addItemCategory, updateItemCategory, deleteItemCategory, removeAllOldItemCodes, searchTerm, setSearchTerm 
  } = useERP();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);

  const [editingCategoryName, setEditingCategoryName] = useState<string | null>(null);
  const [editedCategoryVal, setEditedCategoryVal] = useState<string>('');
  const [newCatInput, setNewCatInput] = useState('');

  // Filters & Price Range State
  const [selectedCategoriesFilter, setSelectedCategoriesFilter] = useState<string[]>([]);
  const [selectedProcessFilter, setSelectedProcessFilter] = useState<string>('ALL');
  const [selectedStockFilter, setSelectedStockFilter] = useState<string>('ALL');
  const [minPriceFilter, setMinPriceFilter] = useState<string>('');
  const [maxPriceFilter, setMaxPriceFilter] = useState<string>('');
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);

  // Single-Column Active Sorting State
  const [sortColumn, setSortColumn] = useState<'itemCode' | 'name' | 'partNo' | 'unitPrice' | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Vendor Mapping Search state for modal
  const [selectedVendorToAdd, setSelectedVendorToAdd] = useState<string>('');
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    itemCode: '',
    partCode: '',
    oldItemCode: '',
    name: '',
    drawingNo: '',
    category: 'Machined Component' as ItemCategory,
    partNo: '',
    unit: 'PCS',
    purchaseUOM: 'PCS',
    conversionFactor: 1,
    inHouseStock: 0,
    externalStock: 0,
    minStockQty: 5,
    minOrderQty: 5,
    grnAllowancePercent: 0,
    mappedVendors: [] as ItemMappedVendor[],
    unitPrice: 0,
    location: '',
    note: '',
    processType: 'In-house' as MaterialProcessType,
    weightKg: 0,
    testReportRequired: false,
    qcTrigger: 'ON_GRN' as QCTrigger,
    isDirectJobworkShipment: false
  });

  const handleSortColumnClick = (col: 'itemCode' | 'name' | 'partNo' | 'unitPrice') => {
    if (sortColumn === col) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else {
        setSortColumn(null);
        setSortDirection('asc');
      }
    } else {
      setSortColumn(col);
      setSortDirection('asc');
    }
  };

  const isHistorySearch = searchTerm.trim().startsWith('@');
  const queryClean = isHistorySearch ? searchTerm.trim().slice(1).toLowerCase() : searchTerm.trim().toLowerCase();

  const filteredItems = items.filter(item => {
    const matchesSearch = !queryClean ||
      item.itemCode.toLowerCase().includes(queryClean) ||
      (item.partCode && item.partCode.toLowerCase().includes(queryClean)) ||
      (item.oldItemCode && item.oldItemCode.toLowerCase().includes(queryClean)) ||
      item.name.toLowerCase().includes(queryClean) ||
      item.category.toLowerCase().includes(queryClean) ||
      (item.partNo && item.partNo.toLowerCase().includes(queryClean)) ||
      (item.location && item.location.toLowerCase().includes(queryClean)) ||
      (item.note && item.note.toLowerCase().includes(queryClean));

    const matchesCategory = selectedCategoriesFilter.length === 0 || selectedCategoriesFilter.includes(item.category);
    const matchesProcess = selectedProcessFilter === 'ALL' || item.processType === selectedProcessFilter;
    
    const minP = minPriceFilter ? Number(minPriceFilter) : 0;
    const maxP = maxPriceFilter ? Number(maxPriceFilter) : Infinity;
    const matchesPrice = item.unitPrice >= minP && item.unitPrice <= maxP;

    const isLow = item.inHouseStock <= (item.minStockQty || 5);
    const matchesStockStatus = 
      selectedStockFilter === 'ALL' ? true :
      selectedStockFilter === 'LOW_STOCK' ? isLow :
      selectedStockFilter === 'ZERO_STOCK' ? item.inHouseStock === 0 :
      selectedStockFilter === 'NORMAL_STOCK' ? item.inHouseStock > (item.minStockQty || 5) : true;

    return matchesSearch && matchesCategory && matchesProcess && matchesPrice && matchesStockStatus;
  }).sort((a, b) => {
    if (!sortColumn) return 0;
    let valA = a[sortColumn] || '';
    let valB = b[sortColumn] || '';

    if (typeof valA === 'string') valA = (valA as string).toLowerCase();
    if (typeof valB === 'string') valB = (valB as string).toLowerCase();

    if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
    if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const handleOpenEditModal = (item: Item) => {
    setEditingItem(item);
    setFormData({
      itemCode: item.itemCode,
      partCode: item.partCode || '',
      oldItemCode: item.oldItemCode || '',
      name: item.name,
      drawingNo: item.drawingNo || '',
      category: item.category,
      partNo: item.partNo || '',
      unit: item.unit,
      purchaseUOM: item.purchaseUOM || item.unit,
      conversionFactor: item.conversionFactor || 1,
      inHouseStock: item.inHouseStock,
      externalStock: item.externalStock,
      minStockQty: item.minStockQty || 5,
      minOrderQty: item.minOrderQty || 5,
      grnAllowancePercent: item.grnAllowancePercent || 0,
      mappedVendors: item.mappedVendors || [],
      unitPrice: item.unitPrice,
      location: item.location,
      note: item.note || '',
      processType: item.processType || 'In-house',
      weightKg: item.weightKg || 0,
      testReportRequired: item.testReportRequired || false,
      qcTrigger: item.qcTrigger || 'ON_GRN',
      isDirectJobworkShipment: item.isDirectJobworkShipment || false
    });
    setSelectedVendorToAdd('');
    setIsModalOpen(true);
  };

  const handleOpenAddModal = () => {
    setEditingItem(null);
    setFormData({
      itemCode: generateNextItemCode(items),
      partCode: '',
      oldItemCode: '',
      name: '',
      drawingNo: '',
      category: (itemCategories[0] || 'Machined Component') as ItemCategory,
      partNo: '',
      unit: 'PCS',
      purchaseUOM: 'PCS',
      conversionFactor: 1,
      inHouseStock: 0,
      externalStock: 0,
      minStockQty: 5,
      minOrderQty: 5,
      grnAllowancePercent: 0,
      mappedVendors: [],
      unitPrice: 0,
      location: 'Store Rack A',
      note: '',
      processType: 'In-house',
      weightKg: 0,
      testReportRequired: false,
      qcTrigger: 'ON_GRN',
      isDirectJobworkShipment: false
    });
    setSelectedVendorToAdd('');
    setIsModalOpen(true);
  };

  const generateNextItemCode = (itemList: Item[]): string => {
    let maxNum = 0;
    itemList.forEach(item => {
      const match = item.itemCode.match(/GEC(\d+)/i) || item.itemCode.match(/(\d+)/);
      if (match && match[1]) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    });
    const nextNum = maxNum + 1;
    return `GEC${String(nextNum).padStart(6, '0')}`;
  };

  const { selectedIndex, setSelectedIndex } = useTableKeyboardNav(filteredItems, handleOpenEditModal);

  const handleAddVendorToItem = () => {
    if (!selectedVendorToAdd) return;
    const vendorObj = vendors.find(v => v.id === selectedVendorToAdd);
    if (!vendorObj) return;

    if (formData.mappedVendors.some(v => v.vendorId === vendorObj.id)) {
      alert('This vendor is already mapped to this item.');
      return;
    }

    const newPriority = formData.mappedVendors.length + 1;
    const updated = [
      ...formData.mappedVendors,
      { vendorId: vendorObj.id, vendorName: vendorObj.name, priority: newPriority }
    ];
    setFormData({ ...formData, mappedVendors: updated });
    setSelectedVendorToAdd('');
  };

  const handleMoveVendorPriority = (index: number, direction: 'up' | 'down') => {
    const list = [...formData.mappedVendors];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= list.length) return;

    const temp = list[index];
    list[index] = list[targetIndex];
    list[targetIndex] = temp;

    const reindexed = list.map((v, i) => ({ ...v, priority: i + 1 }));
    setFormData({ ...formData, mappedVendors: reindexed });
  };

  const handleRemoveMappedVendor = (vendorId: string) => {
    const filtered = formData.mappedVendors.filter(v => v.vendorId !== vendorId);
    const reindexed = filtered.map((v, i) => ({ ...v, priority: i + 1 }));
    setFormData({ ...formData, mappedVendors: reindexed });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingItem) {
      updateItem({
        ...editingItem,
        ...formData
      });
    } else {
      addItem({
        ...formData
      });
    }
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      deleteItem(id);
    }
  };

  const availableExportFields: FieldOption<Item>[] = [
    { key: 'itemCode', label: 'Item Code', defaultSelected: true },
    { key: 'name', label: 'Item Description', defaultSelected: true },
    { key: 'partNo', label: 'Part No.', defaultSelected: true },
    { key: 'category', label: 'Category', defaultSelected: true },
    { key: 'processType', label: 'Material Process Type', defaultSelected: true },
    { key: 'unit', label: 'Base UOM', defaultSelected: true },
    { key: 'purchaseUOM', label: 'Purchase UOM', defaultSelected: true },
    { key: 'conversionFactor', label: 'Conversion Factor', defaultSelected: false },
    { key: 'inHouseStock', label: 'In-House Stock', defaultSelected: true },
    { key: 'minStockQty', label: 'Min Stock Qty', defaultSelected: false },
    { key: 'minOrderQty', label: 'Min Order Qty', defaultSelected: false },
    { key: 'grnAllowancePercent', label: 'GRN Allowance %', defaultSelected: false },
    { key: 'unitPrice', label: 'Unit Price (₹)', defaultSelected: true },
    { key: 'weightKg', label: 'Weight (KG)', defaultSelected: false },
    { key: 'testReportRequired', label: 'Test Report Required', defaultSelected: false },
    { key: 'location', label: 'Store Location', defaultSelected: true },
    { key: 'note', label: 'Note', defaultSelected: true }
  ];

  const handleAddCategorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newCatInput.trim()) {
      addItemCategory(newCatInput.trim());
      setNewCatInput('');
    }
  };

  const handleSaveEditCategory = (oldCat: string) => {
    if (editedCategoryVal.trim() && editedCategoryVal.trim() !== oldCat) {
      updateItemCategory(oldCat, editedCategoryVal.trim());
    }
    setEditingCategoryName(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Top Header Actions Bar */}
      <div className="sticky-module-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {isModalOpen && (
            <button className="btn btn-outline" style={{ padding: '0.35rem 0.65rem', gap: '0.35rem', fontWeight: 600 }} onClick={() => setIsModalOpen(false)}>
              <ArrowLeft size={16} /> Back to Items List <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>(ESC)</span>
            </button>
          )}
          <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
            {isModalOpen ? (editingItem ? `Editing Item Master (${editingItem.itemCode})` : 'Register New Item Master') : `All Items (${filteredItems.length})`}
          </span>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button 
            className="btn btn-outline" 
            style={{ color: 'var(--danger)', borderColor: 'var(--danger)', gap: '0.35rem' }} 
            onClick={() => {
              if (window.confirm('⚠️ Super Admin Confirmation: Are you sure you want to permanently remove all old item codes across the system? This action cannot be undone.')) {
                removeAllOldItemCodes();
                alert('All old item codes have been permanently removed.');
              }
            }}
            title="Super Admin tool to clear old legacy item codes"
          >
            <Trash2 size={16} /> Remove All Old Codes
          </button>
          <button className="btn btn-outline" onClick={() => setIsCatModalOpen(true)}>
            <Settings size={16} /> Manage Categories
          </button>
          <button className="btn btn-outline" onClick={() => setIsExportModalOpen(true)}>
            <FileSpreadsheet size={16} /> Open Sheet ({filteredItems.length} filtered)
          </button>
          <button className="btn btn-secondary" onClick={() => setIsBulkModalOpen(true)}>
            <Upload size={16} /> Bulk Create / Update
          </button>
          {!isModalOpen && (
            <button className="btn btn-primary" onClick={handleOpenAddModal}>
              <Plus size={16} /> Register New Item
            </button>
          )}
        </div>
      </div>

      {/* Main Content View OR In-Screen Page Panel */}
      {isModalOpen ? (
        /* In-Screen Page Panel: Add / Edit Item */
        <div className="card" style={{ padding: '1.25rem', backgroundColor: 'var(--bg-card)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
              {editingItem ? `Edit Item Master (${editingItem.itemCode})` : 'Register New Item Master'}
            </h3>
            <button type="button" className="btn btn-outline" style={{ padding: '0.25rem 0.5rem', fontSize: '0.78rem' }} onClick={() => setIsModalOpen(false)}>
              <X size={15} /> Close (ESC)
            </button>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-grid-3">
              <div>
                <label>Item Code (Auto-Generated)</label>
                <input 
                  type="text" 
                  readOnly 
                  disabled 
                  className="input-field" 
                  value={formData.itemCode} 
                  style={{ backgroundColor: 'var(--bg-tertiary)', cursor: 'not-allowed', fontWeight: 700, fontFamily: 'monospace' }} 
                />
              </div>
              <div>
                <label>Part Code</label>
                <input type="text" className="input-field" placeholder="e.g. PART-TB-80" value={formData.partCode} onChange={(e) => setFormData({ ...formData, partCode: e.target.value })} />
              </div>
              <div>
                <label>Old Item Code (Ref)</label>
                <input type="text" className="input-field" placeholder="e.g. OLD-80MM" value={formData.oldItemCode} onChange={(e) => setFormData({ ...formData, oldItemCode: e.target.value })} />
              </div>
            </div>

            <div className="form-grid-2">
              <div>
                <label>Item Name / Description</label>
                <input type="text" required className="input-field" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
              </div>
              <div>
                <label>Drawing Number</label>
                <input type="text" className="input-field" value={formData.drawingNo || ''} onChange={(e) => setFormData({ ...formData, drawingNo: e.target.value })} />
              </div>
            </div>

            <div className="form-grid-3">
              <div>
                <label>Item Category</label>
                <select className="input-field" value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value as ItemCategory })}>
                  {itemCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div>
                <label>Material Process Source</label>
                <select className="input-field" value={formData.processType} onChange={(e) => setFormData({ ...formData, processType: e.target.value as MaterialProcessType })}>
                  <option value="In-house">In-house (Manufactured in GEC Plant)</option>
                  <option value="Job work">Job work (Sent Out for Nitriding/Machining)</option>
                  <option value="Brought out">Brought out (Purchased Component)</option>
                </select>
              </div>
              <div>
                <label>QC Quality Inspection Trigger</label>
                <select className="input-field" value={formData.qcTrigger} onChange={(e) => setFormData({ ...formData, qcTrigger: e.target.value as QCTrigger })}>
                  <option value="NO_QC">NO_QC (Direct Store Entry)</option>
                  <option value="ON_GRN">ON_GRN (Mandatory QC Bay Hold on GRN Receipt)</option>
                  <option value="DURING_ASSEMBLY">DURING_ASSEMBLY (Inspection at Sub-Assembly Stage)</option>
                </select>
              </div>
            </div>

            <div className="form-grid-3">
              <div>
                <label>Unit of Measure (UOM)</label>
                <input type="text" required className="input-field" placeholder="e.g. PCS, MTR, KG, SET" value={formData.unit} onChange={(e) => setFormData({ ...formData, unit: e.target.value })} />
              </div>
              <div>
                <label>Purchase UOM</label>
                <input type="text" className="input-field" placeholder="e.g. BUNDLE, BOX, MTR" value={formData.purchaseUOM} onChange={(e) => setFormData({ ...formData, purchaseUOM: e.target.value })} />
              </div>
              <div>
                <label>UOM Conversion Factor</label>
                <input type="number" step="0.01" className="input-field" value={formData.conversionFactor} onChange={(e) => setFormData({ ...formData, conversionFactor: Number(e.target.value) })} />
              </div>
            </div>

            <div className="form-grid-3">
              <div>
                <label>Initial In-House Stock</label>
                <input type="number" required className="input-field" value={formData.inHouseStock} onChange={(e) => setFormData({ ...formData, inHouseStock: Number(e.target.value) })} />
              </div>
              <div>
                <label>External Jobwork Stock</label>
                <input type="number" required className="input-field" value={formData.externalStock} onChange={(e) => setFormData({ ...formData, externalStock: Number(e.target.value) })} />
              </div>
              <div>
                <label>Min Required Stock Level</label>
                <input type="number" required className="input-field" value={formData.minStockQty} onChange={(e) => setFormData({ ...formData, minStockQty: Number(e.target.value) })} />
              </div>
            </div>

            <div className="form-grid-3">
              <div>
                <label>Min Purchase Order Qty</label>
                <input type="number" required className="input-field" value={formData.minOrderQty} onChange={(e) => setFormData({ ...formData, minOrderQty: Number(e.target.value) })} />
              </div>
              <div>
                <label>GRN Receiving Allowance %</label>
                <input type="number" min="0" max="100" className="input-field" placeholder="e.g. 5 (Allows +5% extra receiving)" value={formData.grnAllowancePercent} onChange={(e) => setFormData({ ...formData, grnAllowancePercent: Number(e.target.value) })} />
              </div>
              <div>
                <label>Unit Purchase Price (₹)</label>
                <input type="number" required className="input-field" value={formData.unitPrice} onChange={(e) => setFormData({ ...formData, unitPrice: Number(e.target.value) })} />
              </div>
            </div>

            {/* Vendor Priority Mapping */}
            <div style={{ padding: '0.875rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: '0.5rem', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 700, margin: 0, color: 'var(--text-secondary)' }}>
                  Preferred Vendors & Priority Sequence
                </h4>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <select className="input-field" style={{ padding: '0.2rem 0.5rem', fontSize: '0.78rem' }} value={selectedVendorToAdd} onChange={(e) => setSelectedVendorToAdd(e.target.value)}>
                    <option value="">-- Select Vendor to Map --</option>
                    {vendors.map(v => (
                      <option key={v.id} value={v.id}>{v.name} ({v.vendorCode})</option>
                    ))}
                  </select>
                  <button type="button" className="btn btn-outline" style={{ padding: '0.2rem 0.5rem', fontSize: '0.78rem' }} onClick={handleAddVendorToItem}>
                    + Add Vendor
                  </button>
                </div>
              </div>

              {formData.mappedVendors.length === 0 ? (
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  No mapped vendors yet. Add vendors above to establish Priority #1, #2 auto-allocation.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  {formData.mappedVendors.map((mv, idx) => (
                    <div key={mv.vendorId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.35rem 0.6rem', backgroundColor: 'var(--bg-card)', borderRadius: '0.25rem' }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>
                        <span className="badge badge-info" style={{ marginRight: '0.5rem' }}>Priority #{idx + 1}</span>
                        {mv.vendorName}
                      </span>
                      <div style={{ display: 'flex', gap: '0.25rem' }}>
                        <button type="button" className="btn btn-outline" style={{ padding: '0.15rem 0.35rem', fontSize: '0.7rem' }} disabled={idx === 0} onClick={() => handleMoveVendorPriority(idx, 'up')}>▲</button>
                        <button type="button" className="btn btn-outline" style={{ padding: '0.15rem 0.35rem', fontSize: '0.7rem' }} disabled={idx === formData.mappedVendors.length - 1} onClick={() => handleMoveVendorPriority(idx, 'down')}>▼</button>
                        <button type="button" className="btn btn-outline" style={{ padding: '0.15rem 0.35rem', fontSize: '0.7rem', color: 'var(--danger)' }} onClick={() => handleRemoveMappedVendor(mv.vendorId)}>✕</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Direct Jobwork Shipment Option */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '0.75rem 1rem', backgroundColor: 'rgba(245, 158, 11, 0.08)', borderRadius: '0.5rem', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
              <input 
                type="checkbox" 
                id="directJobworkCheck" 
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                checked={formData.isDirectJobworkShipment || false} 
                onChange={(e) => setFormData({ ...formData, isDirectJobworkShipment: e.target.checked })} 
              />
              <label htmlFor="directJobworkCheck" style={{ margin: 0, cursor: 'pointer', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Direct Shipped for External Jobwork <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-muted)' }}>(Item bypasses in-house store GRN; requires direct Jobwork Challan upon arrival from vendor)</span>
              </label>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel (ESC)</button>
              <button type="submit" className="btn btn-primary">{editingItem ? 'Save Item Changes' : 'Register Item Master'}</button>
            </div>
          </form>
        </div>
      ) : (
        <>
          {/* Search & Filter Bar */}
          <div className="card" style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', backgroundColor: 'var(--bg-card)' }}>
            <div style={{ position: 'relative', width: '360px', maxWidth: '100%' }}>
              <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search item code, description, part code..."
                className="input-field"
                style={{ paddingLeft: '2.25rem' }}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Clean Items Table */}
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th onClick={() => handleSortColumnClick('itemCode')} style={{ cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      Item Code {sortColumn === 'itemCode' ? (sortDirection === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} />) : <ArrowUpDown size={12} color="var(--text-muted)" />}
                    </div>
                  </th>
                  <th>Part Code</th>
                  <th>Old Code</th>
                  <th onClick={() => handleSortColumnClick('name')} style={{ cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      Item Description {sortColumn === 'name' ? (sortDirection === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} />) : <ArrowUpDown size={12} color="var(--text-muted)" />}
                    </div>
                  </th>
                  <th>Process Type</th>
                  <th>Base UOM</th>
                  <th>In-House Stock</th>
                  <th onClick={() => handleSortColumnClick('unitPrice')} style={{ cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      Unit Price (₹) {sortColumn === 'unitPrice' ? (sortDirection === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} />) : <ArrowUpDown size={12} color="var(--text-muted)" />}
                    </div>
                  </th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item, idx) => {
                  const isNavSelected = selectedIndex === idx;
                  const isLow = item.inHouseStock <= (item.minStockQty || 5);

                  return (
                    <tr 
                      key={item.id} 
                      onDoubleClick={() => handleOpenEditModal(item)}
                      onClick={() => setSelectedIndex(idx)}
                      style={{ 
                        backgroundColor: isNavSelected ? 'rgba(59, 130, 246, 0.18)' : 'transparent',
                        cursor: 'pointer'
                      }}
                      title="Double click or press Enter to edit item"
                    >
                      <td style={{ fontWeight: 700, color: 'var(--accent-primary)', fontFamily: 'monospace' }}>
                        {item.itemCode}
                      </td>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.82rem' }}>{item.partCode || '-'}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.82rem', color: item.oldItemCode ? 'var(--warning)' : 'var(--text-muted)' }}>{item.oldItemCode || '-'}</td>
                      <td>
                        <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          {item.name}
                          {item.isDirectJobworkShipment && (
                            <span className="badge badge-warning" style={{ fontSize: '0.68rem', padding: '0.15rem 0.4rem' }}>
                              Direct Jobwork
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className="badge badge-info">{item.processType || 'In-house'}</span>
                      </td>
                      <td>{item.unit}</td>
                      <td style={{ fontWeight: 800, color: isLow ? 'var(--danger)' : 'var(--success)' }}>
                        {item.inHouseStock} {item.unit}
                      </td>
                      <td style={{ fontWeight: 700 }}>₹{item.unitPrice.toLocaleString()}</td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: '0.35rem' }}>
                          <button className="btn btn-outline" style={{ padding: '0.25rem 0.45rem' }} onClick={() => handleOpenEditModal(item)}>
                            <Edit2 size={14} />
                          </button>
                          <button className="btn btn-outline" style={{ padding: '0.25rem 0.45rem', color: 'var(--danger)' }} onClick={() => handleDelete(item.id)}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Modal: Category Tag Manager */}
      <Modal
        isOpen={isCatModalOpen}
        onClose={() => setIsCatModalOpen(false)}
        title="Dynamic Category Tag Manager"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <form onSubmit={handleAddCategorySubmit} style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              required
              className="input-field"
              placeholder="Enter new category name..."
              value={newCatInput}
              onChange={(e) => setNewCatInput(e.target.value)}
            />
            <button type="submit" className="btn btn-primary" style={{ whiteSpace: 'nowrap' }}>
              <Plus size={16} /> Add Category
            </button>
          </form>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '240px', overflowY: 'auto' }}>
            {itemCategories.map(cat => (
              <div key={cat} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.75rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: '0.375rem' }}>
                <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{cat}</span>
                <button className="btn btn-outline" style={{ padding: '0.2rem 0.4rem', color: 'var(--danger)' }} onClick={() => deleteItemCategory(cat)}>
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

      {/* Export Field Selector Modal */}
      <ExportFieldSelectorModal<Item>
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        title="Custom Export Live Sheet Options"
        subfolder="Inventory"
        fileName="GEC_Filtered_Items_Live"
        data={filteredItems}
        availableFields={availableExportFields}
      />
    </div>
  );
};
