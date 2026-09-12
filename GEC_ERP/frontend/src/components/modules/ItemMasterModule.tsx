import React, { useState, useEffect, useRef } from 'react';
import { useERP } from '../../context/ERPContext';
import { Modal } from '../common/Modal';
import { BulkUploadModal } from '../common/BulkUploadModal';
import { PrintManagerModal } from '../printTemplates/PrintManagerModal';
import { ItemMasterListPrintView } from '../printTemplates/ItemMasterPrintTemplates';
import { useTableKeyboardNav } from '../../hooks/useTableKeyboardNav';
import { Plus, Edit2, Trash2, Upload, Search, FileSpreadsheet, Settings, Filter, Edit3, ArrowUp, ArrowDown, ArrowUpDown, ArrowLeft, X, Printer, RefreshCw, Layers, RotateCcw, ShieldAlert } from 'lucide-react';
import { Item, ItemCategory, QCTrigger, MaterialProcessType, MaterialProcessSource, ItemMappedVendor, FIXED_ITEM_CLASSES } from '../../types/erp';
import { parseItemsSheet } from '../../utils/csvParser';

type ItemSortKey = 'itemCode' | 'partCode' | 'oldItemCode' | 'name' | 'category' | 'location' | 'processType' | 'leadTimeDays' | 'unit' | 'inHouseStock' | 'externalStock' | 'unitPrice';

export const ItemMasterModule: React.FC = () => {
  const { 
    items, itemCategories, vendors, boms, currentUser, addItem, updateItem, deleteItem, recoverItem, bulkDeleteItems, bulkRecoverItems, bulkAddItems, 
    addItemCategory, updateItemCategory, deleteItemCategory, removeAllOldItemCodes, searchTerm, setSearchTerm, setActiveModule, openBOMInEditor 
  } = useERP();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
    const [printModalOpen, setPrintModalOpen] = useState(false);
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

  // Single-Column Active Sorting State - All Columns
  const [sortColumn, setSortColumn] = useState<ItemSortKey>('itemCode');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Vendor Mapping Search state for modal
  const [selectedVendorToAdd, setSelectedVendorToAdd] = useState<string>('');
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    itemCode: '',
    partCode: '',
    oldItemCode: '',
    name: '',
    category: '', // Compulsory & empty by default (Item Class Code)
    partNo: '',
    unit: 'PCS',
    purchaseUOM: 'PCS',
    conversionFactor: 1,
    inHouseStock: 0,
    externalStock: 0,
    minStockQty: 5,
    minOrderQty: 5,
    mappedVendors: [] as ItemMappedVendor[],
    unitPrice: 0,
    location: '',
    note: '',
    processType: '' as MaterialProcessType,
    materialProcessSources: [] as MaterialProcessSource[],
    leadTimeDays: 10,
    weightKg: 0,
    testReportRequired: false,
    qcTrigger: '' as QCTrigger, // Compulsory & empty by default
    isDirectJobworkShipment: false
  });

  const handleSortColumnClick = (col: ItemSortKey) => {
    if (sortColumn === col) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(col);
      setSortDirection('asc');
    }
  };

  const isHistorySearch = searchTerm.trim().startsWith('@') || searchTerm.toLowerCase().includes('@history');
  const queryClean = searchTerm.replace(/@history/gi, '').replace(/^@/g, '').trim().toLowerCase();

  const filteredItems = items.filter(item => {
    // If not in @ history search, exclude blocked items
    if (!isHistorySearch && item.isBlocked) {
      return false;
    }

    const matchesSearch = !queryClean ||
      item.itemCode.toLowerCase().includes(queryClean) ||
      (item.partCode && item.partCode.toLowerCase().includes(queryClean)) ||
      (item.oldItemCode && item.oldItemCode.toLowerCase().includes(queryClean)) ||
      item.name.toLowerCase().includes(queryClean) ||
      (item.category && item.category.toLowerCase().includes(queryClean)) ||
      (item.partNo && item.partNo.toLowerCase().includes(queryClean)) ||
      (item.location && item.location.toLowerCase().includes(queryClean)) ||
      (item.note && item.note.toLowerCase().includes(queryClean));

    const matchesCategory = selectedCategoriesFilter.length === 0 || selectedCategoriesFilter.includes(item.category);
    const matchesProcess = selectedProcessFilter === 'ALL' || (
      item.materialProcessSources && item.materialProcessSources.length > 0
        ? item.materialProcessSources.includes(selectedProcessFilter as MaterialProcessSource)
        : item.processType === selectedProcessFilter || (item.processType === 'Job work + Bought out' && (selectedProcessFilter === 'Bought out' || selectedProcessFilter === 'Job work'))
    );
    
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
    let valA: any = a[sortColumn] ?? '';
    let valB: any = b[sortColumn] ?? '';

    if (typeof valA === 'string') valA = valA.toLowerCase();
    if (typeof valB === 'string') valB = valB.toLowerCase();

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
      category: item.category || '',
      partNo: item.partNo || '',
      unit: item.unit,
      purchaseUOM: item.purchaseUOM || item.unit,
      conversionFactor: item.conversionFactor !== undefined ? item.conversionFactor : 1,
      inHouseStock: item.inHouseStock !== undefined ? item.inHouseStock : 0,
      externalStock: item.externalStock !== undefined ? item.externalStock : 0,
      minStockQty: item.minStockQty !== undefined ? item.minStockQty : 0,
      minOrderQty: item.minOrderQty !== undefined ? item.minOrderQty : 1,
      mappedVendors: item.mappedVendors || [],
      unitPrice: item.unitPrice !== undefined ? item.unitPrice : 0,
      location: item.location || '',
      note: item.note || '',
      processType: (item.processType === ('Brought out' as any) ? 'Bought out' : (item.processType || '')) as MaterialProcessType,
      materialProcessSources: Array.from(new Set(
        (item.materialProcessSources || (item.processType ? (item.processType === 'Job work + Bought out' ? ['Job work', 'Bought out'] : [item.processType as MaterialProcessSource]) : []))
          .map(s => ((s as string) === 'Brought out' ? 'Bought out' : s) as MaterialProcessSource)
      )),
      leadTimeDays: item.leadTimeDays !== undefined ? item.leadTimeDays : 10,
      weightKg: item.weightKg !== undefined ? item.weightKg : 0,
      testReportRequired: item.testReportRequired || false,
      qcTrigger: (item.qcTrigger || '') as QCTrigger,
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
      category: '', // Empty by default (compulsory)
      partNo: '',
      unit: 'PCS',
      purchaseUOM: 'PCS',
      conversionFactor: 1,
      inHouseStock: 0,
      externalStock: 0,
      minStockQty: 0,
      minOrderQty: 1,
      mappedVendors: [],
      unitPrice: 0,
      location: 'Store Rack A',
      note: '',
      processType: '' as MaterialProcessType,
      materialProcessSources: [],
      leadTimeDays: 10,
      weightKg: 0,
      testReportRequired: false,
      qcTrigger: '' as QCTrigger, // Compulsory & empty by default
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

  const formRef = useRef<HTMLFormElement>(null);

  // Ctrl + S (or Cmd + S) shortcut to save item form
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (isModalOpen && formRef.current) {
          formRef.current.requestSubmit();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...formData,
      minStockQty: formData.minStockQty !== undefined && formData.minStockQty !== ('' as any) ? Number(formData.minStockQty) : 0,
      minOrderQty: formData.minOrderQty !== undefined && formData.minOrderQty !== ('' as any) ? Number(formData.minOrderQty) : 0,
      unitPrice: Number(formData.unitPrice) || 0,
      conversionFactor: Number(formData.conversionFactor) || 1,
      weightKg: Number(formData.weightKg) || 0,
      leadTimeDays: Number(formData.leadTimeDays) || 0
    };

    const derivedProcessType: MaterialProcessType = (payload.materialProcessSources && payload.materialProcessSources.length > 0)
      ? (payload.materialProcessSources.includes('Job work') && payload.materialProcessSources.includes('Bought out')
          ? 'Job work + Bought out'
          : payload.materialProcessSources.includes('Bought out')
          ? 'Bought out'
          : payload.materialProcessSources.includes('Job work')
          ? 'Job work'
          : 'In-house')
      : 'In-house';

    const cleanPayload = {
      ...payload,
      processType: derivedProcessType,
      materialProcessSources: payload.materialProcessSources || [derivedProcessType as MaterialProcessSource]
    };

    if (editingItem) {
      updateItem({
        ...editingItem,
        ...cleanPayload
      });
    } else {
      addItem({
        ...cleanPayload
      });
    }
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      deleteItem(id);
    }
  };

  
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
    <div className="module-layout-container">
      {/* Top Header Actions Bar */}
      <div className="sticky-module-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {isModalOpen && (
            <button className="btn btn-outline" style={{ padding: '0.35rem 0.65rem', gap: '0.35rem', fontWeight: 600 }} onClick={() => setIsModalOpen(false)}>
              <ArrowLeft size={16} /> Back to Item Master <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>(ESC)</span>
            </button>
          )}
          <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
            {isModalOpen ? (editingItem ? 'Edit Item Details' : 'Register New Item') : `Item Master Catalog (${filteredItems.length})`}
          </span>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-outline" onClick={() => setPrintModalOpen(true)} title="Print filtered items catalog report">
            <Printer size={14} /> Print Report
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
        <div className="card" style={{ padding: '1.25rem', backgroundColor: 'var(--bg-card)', overflowY: 'auto', flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
              {editingItem ? `Edit Item Master (${editingItem.itemCode})` : 'Register New Item Master'}
            </h3>
            <button type="button" className="btn btn-outline" style={{ padding: '0.25rem 0.5rem', fontSize: '0.78rem' }} onClick={() => setIsModalOpen(false)}>
              <X size={15} /> Close (ESC)
            </button>
          </div>

          <form ref={formRef} onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-grid-3">
              <div>
                <label>Item Code (Auto-generated)</label>
                <input type="text" required readOnly className="input-field" style={{ fontWeight: 700, color: 'var(--accent-primary)', backgroundColor: 'var(--bg-tertiary)' }} value={formData.itemCode} />
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

            <div>
              <label>Item Name / Description</label>
              <input type="text" required className="input-field" placeholder="Full descriptive name of the item" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
            </div>

            <div className="form-grid-4">
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ fontWeight: 700, marginBottom: '0.35rem' }}>
                  Material Process Source * (Multi-Select)
                </label>
                <div style={{ 
                  display: 'flex', 
                  flexDirection: 'row', 
                  alignItems: 'center', 
                  gap: '1.25rem', 
                  flexWrap: 'wrap',
                  padding: '0.45rem 0.75rem', 
                  backgroundColor: 'var(--bg-tertiary)', 
                  borderRadius: '0.375rem', 
                  border: '1px solid var(--border-color)',
                  minHeight: '38px'
                }}>
                  {(['In-house', 'Job work', 'Bought out'] as MaterialProcessSource[]).map(src => {
                    const isChecked = formData.materialProcessSources?.includes(src);
                    return (
                      <label key={src} style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.82rem', cursor: 'pointer', margin: 0, fontWeight: isChecked ? 700 : 400, color: 'var(--text-primary)' }}>
                        <input
                          type="checkbox"
                          checked={isChecked || false}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            const current = formData.materialProcessSources || [];
                            const updated = checked ? [...current, src] : current.filter(s => s !== src);
                            const derivedType: MaterialProcessType = updated.includes('Job work') && updated.includes('Bought out')
                              ? 'Job work + Bought out'
                              : updated.includes('Bought out')
                              ? 'Bought out'
                              : updated.includes('Job work')
                              ? 'Job work'
                              : updated.includes('In-house')
                              ? 'In-house'
                              : '';
                            setFormData({ ...formData, materialProcessSources: updated, processType: derivedType });
                          }}
                          style={{ width: '15px', height: '15px', cursor: 'pointer' }}
                        />
                        <span>{src}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
              <div>
                <label style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>Item Class *</label>
                <select 
                  className="input-field" 
                  required
                  style={{ border: '2px solid var(--accent-primary)', fontWeight: 600 }}
                  value={formData.category} 
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                >
                  <option value="" disabled>-- Select Item Class --</option>
                  {FIXED_ITEM_CLASSES.map(cls => (
                    <option key={cls.code} value={cls.code}>
                      {cls.code} - {cls.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontWeight: 700 }}>QC Quality Inspection Trigger *</label>
                <select 
                  className="input-field" 
                  required
                  value={formData.qcTrigger} 
                  onChange={(e) => setFormData({ ...formData, qcTrigger: e.target.value as QCTrigger })}
                >
                  <option value="" disabled>-- Select QC Trigger --</option>
                  <option value="NO_QC">NO_QC (Direct Store Entry)</option>
                  <option value="ON_GRN">ON_GRN (Hold on GRN Receipt)</option>
                  <option value="DURING_ASSEMBLY">DURING_ASSEMBLY (Inspection on Line)</option>
                </select>
              </div>
              <div>
                <label>Supply Lead Time (Days)</label>
                <input 
                  type="number" 
                  min="0" 
                  required 
                  className="input-field" 
                  placeholder="e.g. 10" 
                  value={formData.leadTimeDays === 0 ? '' : formData.leadTimeDays} 
                  onChange={(e) => setFormData({ ...formData, leadTimeDays: e.target.value === '' ? 0 : Number(e.target.value) })} 
                />
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
                <input 
                  type="number" 
                  step="0.01" 
                  className="input-field" 
                  value={formData.conversionFactor === 0 ? '' : formData.conversionFactor} 
                  onChange={(e) => setFormData({ ...formData, conversionFactor: e.target.value === '' ? 0 : Number(e.target.value) })} 
                />
              </div>
            </div>

            {/* Stock Levels & Store Location Row */}
            <div className="form-grid-2">
              <div>
                <label>Min Required Stock Level (Reorder Trigger)</label>
                <input 
                  type="number" 
                  min="0"
                  required 
                  className="input-field" 
                  placeholder="0" 
                  value={formData.minStockQty ?? ''} 
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormData({ ...formData, minStockQty: val === '' ? ('' as any) : Number(val) });
                  }} 
                  onBlur={(e) => {
                    if (e.target.value === '' || isNaN(Number(e.target.value))) {
                      setFormData({ ...formData, minStockQty: 0 });
                    }
                  }}
                />
              </div>
              <div>
                <label style={{ fontWeight: 700 }}>Store Location (Rack / Shelf / Bin)</label>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="e.g. Rack A-04, Shelf 2, Bin 12" 
                  value={formData.location || ''} 
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })} 
                />
              </div>
            </div>

            {/* Dynamic Purchasing & Pricing Row */}
            {(formData.processType === 'Bought out' || formData.processType === 'Job work + Bought out' || formData.processType === 'Job work') && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', padding: '0.875rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: '0.5rem', border: '1px solid var(--border-color)' }}>
                {(formData.processType === 'Bought out' || formData.processType === 'Job work + Bought out' || formData.processType === 'Job work') && (
                  <div>
                    <label style={{ fontWeight: 700 }}>Min Purchase Order Qty (MOQ)</label>
                    <input 
                      type="number" 
                      min="0"
                      required 
                      className="input-field" 
                      placeholder="1"
                      value={formData.minOrderQty ?? ''} 
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormData({ ...formData, minOrderQty: val === '' ? ('' as any) : Number(val) });
                      }} 
                      onBlur={(e) => {
                        if (e.target.value === '' || isNaN(Number(e.target.value))) {
                          setFormData({ ...formData, minOrderQty: 0 });
                        }
                      }}
                    />
                  </div>
                )}
                {(formData.processType === 'Bought out' || formData.processType === 'Job work + Bought out') && (
                  <div>
                    <label style={{ fontWeight: 700 }}>Unit Purchase Price (₹)</label>
                    <input 
                      type="number" 
                      min="0"
                      step="0.01"
                      required 
                      className="input-field" 
                      placeholder="0.00"
                      value={formData.unitPrice ?? ''} 
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormData({ ...formData, unitPrice: val === '' ? ('' as any) : Number(val) });
                      }} 
                      onBlur={(e) => {
                        if (e.target.value === '' || isNaN(Number(e.target.value))) {
                          setFormData({ ...formData, unitPrice: 0 });
                        }
                      }}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Vendor Priority Mapping (Only available if 'Bought out' is selected in Material Process Source) */}
            {formData.materialProcessSources?.includes('Bought out') && (
              <div style={{ padding: '0.875rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: '0.5rem', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 700, margin: 0, color: 'var(--text-secondary)' }}>
                    Preferred Vendors & Priority Sequence (Bought Out Supply)
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
            )}

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
          {/* Search & Filter Bar - Fixed */}
          <div className="card" style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', backgroundColor: 'var(--bg-card)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', width: '380px', maxWidth: '100%' }}>
                <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="Search item code, description, part code... (type @history)"
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

          {/* Clean Items Table with Sorting on ALL Columns */}
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th onClick={() => handleSortColumnClick('itemCode')} style={{ cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      Item Code {sortColumn === 'itemCode' ? (sortDirection === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} />) : <ArrowUpDown size={12} color="var(--text-muted)" />}
                    </div>
                  </th>
                  <th onClick={() => handleSortColumnClick('partCode')} style={{ cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      Part Code {sortColumn === 'partCode' ? (sortDirection === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} />) : <ArrowUpDown size={12} color="var(--text-muted)" />}
                    </div>
                  </th>
                  <th onClick={() => handleSortColumnClick('oldItemCode')} style={{ cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      Old Code {sortColumn === 'oldItemCode' ? (sortDirection === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} />) : <ArrowUpDown size={12} color="var(--text-muted)" />}
                    </div>
                  </th>
                  <th onClick={() => handleSortColumnClick('name')} style={{ cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      Item Description {sortColumn === 'name' ? (sortDirection === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} />) : <ArrowUpDown size={12} color="var(--text-muted)" />}
                    </div>
                  </th>
                  <th onClick={() => handleSortColumnClick('category')} style={{ cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      Class {sortColumn === 'category' ? (sortDirection === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} />) : <ArrowUpDown size={12} color="var(--text-muted)" />}
                    </div>
                  </th>
                  <th onClick={() => handleSortColumnClick('location')} style={{ cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      Store Location {sortColumn === 'location' ? (sortDirection === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} />) : <ArrowUpDown size={12} color="var(--text-muted)" />}
                    </div>
                  </th>
                  <th onClick={() => handleSortColumnClick('processType')} style={{ cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      Process Source {sortColumn === 'processType' ? (sortDirection === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} />) : <ArrowUpDown size={12} color="var(--text-muted)" />}
                    </div>
                  </th>
                  <th onClick={() => handleSortColumnClick('leadTimeDays')} style={{ cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      Lead Time {sortColumn === 'leadTimeDays' ? (sortDirection === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} />) : <ArrowUpDown size={12} color="var(--text-muted)" />}
                    </div>
                  </th>
                  <th onClick={() => handleSortColumnClick('unit')} style={{ cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      UOM {sortColumn === 'unit' ? (sortDirection === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} />) : <ArrowUpDown size={12} color="var(--text-muted)" />}
                    </div>
                  </th>
                  <th onClick={() => handleSortColumnClick('inHouseStock')} style={{ cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      In-House Stock {sortColumn === 'inHouseStock' ? (sortDirection === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} />) : <ArrowUpDown size={12} color="var(--text-muted)" />}
                    </div>
                  </th>
                  <th onClick={() => handleSortColumnClick('externalStock')} style={{ cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      Jobwork Stock {sortColumn === 'externalStock' ? (sortDirection === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} />) : <ArrowUpDown size={12} color="var(--text-muted)" />}
                    </div>
                  </th>
                  <th onClick={() => handleSortColumnClick('unitPrice')} style={{ cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      Price (₹) {sortColumn === 'unitPrice' ? (sortDirection === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} />) : <ArrowUpDown size={12} color="var(--text-muted)" />}
                    </div>
                  </th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item, idx) => {
                  const isNavSelected = selectedIndex === idx;
                  const isLow = item.inHouseStock <= (item.minStockQty || 5);
                  const classObj = FIXED_ITEM_CLASSES.find(c => c.code === item.category);

                    const matchingBOM = boms.find(b => 
                      b.machineModel?.toLowerCase() === item.name.toLowerCase() || 
                      b.bomCode?.toLowerCase() === item.itemCode.toLowerCase()
                    );

                    return (
                      <tr 
                        key={item.id} 
                        onDoubleClick={() => handleOpenEditModal(item)}
                        onClick={() => setSelectedIndex(idx)}
                        style={{ 
                          backgroundColor: isNavSelected 
                            ? 'rgba(59, 130, 246, 0.18)' 
                            : item.isBlocked 
                              ? 'rgba(239, 68, 68, 0.08)' 
                              : 'transparent',
                          cursor: 'pointer',
                          opacity: item.isBlocked ? 0.85 : 1
                        }}
                        title="Double click or press Enter to edit item"
                      >
                        <td style={{ fontWeight: 700, color: 'var(--accent-primary)', fontFamily: 'monospace' }}>
                          {item.itemCode}
                        </td>
                        <td style={{ fontFamily: 'monospace', fontSize: '0.82rem' }}>{item.partCode || '-'}</td>
                        <td style={{ fontFamily: 'monospace', fontSize: '0.82rem', color: item.oldItemCode ? 'var(--warning)' : 'var(--text-muted)' }}>{item.oldItemCode || '-'}</td>
                        <td>
                          <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                            {item.name}
                            {item.isBlocked && (
                              <span className="badge badge-danger" style={{ fontSize: '0.68rem', padding: '0.15rem 0.4rem' }}>
                                🚫 BLOCKED / HISTORY
                              </span>
                            )}
                            {item.isDirectJobworkShipment && (
                              <span className="badge badge-warning" style={{ fontSize: '0.68rem', padding: '0.15rem 0.4rem' }}>
                                Direct Jobwork
                              </span>
                            )}
                          </div>
                        </td>
                        <td>
                          <span 
                            className="badge badge-info" 
                            style={{ cursor: 'help', fontWeight: 800 }}
                            title={classObj ? `${classObj.code} - ${classObj.name}: ${classObj.description}` : item.category || 'Class'}
                          >
                            {item.category || '-'}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                          {item.location || '-'}
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                            {(() => {
                              const rawSources = (item.materialProcessSources && item.materialProcessSources.length > 0)
                                ? item.materialProcessSources
                                : item.processType === 'Job work + Bought out'
                                ? ['Job work', 'Bought out']
                                : item.processType
                                ? [item.processType as MaterialProcessSource]
                                : [];
                              const sources: MaterialProcessSource[] = Array.from(new Set(
                                rawSources.map(s => ((s as string) === 'Brought out' ? 'Bought out' : s) as MaterialProcessSource)
                              ));
                              if (sources.length === 0 && (!item.mappedVendors || item.mappedVendors.length === 0)) {
                                return <span className="badge badge-neutral" style={{ fontSize: '0.68rem' }}>-</span>;
                              }
                              return (
                                <>
                                  {sources.map(src => (
                                    <span key={src} className={`badge ${
                                      src === 'Bought out' ? 'badge-primary' :
                                      src === 'In-house' ? 'badge-success' :
                                      src === 'Job work' ? 'badge-purple' : 'badge-neutral'
                                    }`} style={{ fontSize: '0.68rem', padding: '0.15rem 0.35rem' }}>
                                      {src}
                                    </span>
                                  ))}
                                  {item.mappedVendors && item.mappedVendors.length > 0 && (
                                    <div style={{ width: '100%', marginTop: '0.2rem', display: 'flex', gap: '0.2rem', flexWrap: 'wrap' }}>
                                      {item.mappedVendors.map((mv, mIdx) => (
                                        <span 
                                          key={mIdx} 
                                          className="badge badge-info" 
                                          style={{ fontSize: '0.62rem', padding: '0.08rem 0.3rem', cursor: 'help' }}
                                          title={`Assigned Vendor (Priority #${mIdx + 1}): ${mv.vendorName} (${mv.vendorId})`}
                                        >
                                          🏢 {mv.vendorName.length > 16 ? mv.vendorName.slice(0, 15) + '…' : mv.vendorName}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </>
                              );
                            })()}
                          </div>
                        </td>
                        <td style={{ fontSize: '0.82rem', fontWeight: 600 }}>{item.leadTimeDays || 10} Days</td>
                        <td>{item.unit}</td>
                        <td style={{ fontWeight: 800, color: isLow ? 'var(--danger)' : 'var(--success)' }}>
                          {item.inHouseStock} {item.unit}
                        </td>
                        <td style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
                          {item.externalStock || 0} {item.unit}
                        </td>
                        <td style={{ fontWeight: 700 }}>₹{(item.unitPrice || 0).toLocaleString()}</td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                            {matchingBOM && (
                              <button 
                                className="btn btn-outline" 
                                style={{ padding: '0.25rem 0.45rem', color: '#2563eb', borderColor: '#2563eb' }} 
                                title={`Open Bill of Materials (BOM) for ${item.name}`}
                                onClick={() => openBOMInEditor(matchingBOM.id)}
                              >
                                <Layers size={13} />
                              </button>
                            )}
                            <button className="btn btn-outline" style={{ padding: '0.25rem 0.45rem' }} title="Edit Item" onClick={() => handleOpenEditModal(item)}>
                              <Edit2 size={13} />
                            </button>
                            {item.isBlocked ? (
                              <button 
                                className="btn btn-outline" 
                                style={{ padding: '0.25rem 0.45rem', color: 'var(--success)', borderColor: 'var(--success)' }} 
                                title="Recover / Restore this item to active inventory"
                                onClick={() => recoverItem(item.id)}
                              >
                                <RotateCcw size={13} />
                              </button>
                            ) : (
                              <button 
                                className="btn btn-outline" 
                                style={{ padding: '0.25rem 0.45rem', color: 'var(--danger)' }} 
                                title="Move to Blocked / History (Soft-Delete)"
                                onClick={() => handleDelete(item.id)}
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
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

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '280px', overflowY: 'auto' }}>
            {itemCategories.map(cat => {
              const isEditing = editingCategoryName === cat;

              return (
                <div key={cat} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.45rem 0.75rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: '0.375rem', gap: '0.5rem' }}>
                  {isEditing ? (
                    <div style={{ display: 'flex', gap: '0.35rem', flex: 1 }}>
                      <input 
                        type="text" 
                        className="input-field" 
                        style={{ padding: '0.2rem 0.5rem', fontSize: '0.82rem' }}
                        value={editedCategoryVal} 
                        onChange={(e) => setEditedCategoryVal(e.target.value)} 
                        autoFocus
                      />
                      <button 
                        type="button" 
                        className="btn btn-primary" 
                        style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }} 
                        onClick={() => handleSaveEditCategory(cat)}
                      >
                        Save
                      </button>
                      <button 
                        type="button" 
                        className="btn btn-secondary" 
                        style={{ padding: '0.2rem 0.4rem', fontSize: '0.75rem' }} 
                        onClick={() => setEditingCategoryName(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <>
                      <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{cat}</span>
                      <div style={{ display: 'flex', gap: '0.3rem' }}>
                        <button 
                          type="button"
                          className="btn btn-outline" 
                          style={{ padding: '0.2rem 0.4rem' }} 
                          title="Rename Category"
                          onClick={() => {
                            setEditingCategoryName(cat);
                            setEditedCategoryVal(cat);
                          }}
                        >
                          <Edit2 size={13} />
                        </button>
                        <button 
                          type="button"
                          className="btn btn-outline" 
                          style={{ padding: '0.2rem 0.4rem', color: 'var(--danger)' }} 
                          title="Delete Category"
                          onClick={() => deleteItemCategory(cat)}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
            <button className="btn btn-secondary" onClick={() => setIsCatModalOpen(false)}>Done</button>
          </div>
        </div>
      </Modal>

      {/* Export Field Selector Modal */}
      
      {/* Feature-Wise Modular Print Manager Modal */}
      <PrintManagerModal
        isOpen={printModalOpen}
        onClose={() => setPrintModalOpen(false)}
        title="Print Items & Raw Materials Catalog"
        documentRefNumber="ITEM-CATALOG"
      >
        <ItemMasterListPrintView items={filteredItems} filterLabel={isHistorySearch ? 'All Active & Historical Master Catalog Items' : 'Active Master Catalog Items'} />
      </PrintManagerModal>
    </div>
  );
};
