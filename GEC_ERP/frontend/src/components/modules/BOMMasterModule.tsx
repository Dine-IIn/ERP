import React, { useState, useEffect } from 'react';
import { useERP } from '../../context/ERPContext';
import { PrintDocumentModal } from '../common/PrintDocumentModal';
import { BOMUploadModal } from '../common/BOMUploadModal';
import { Plus, Trash2, Edit2, Search, Printer, FileSpreadsheet, Upload, ArrowUpDown, ArrowUp, ArrowDown, Layers, Filter, Eye, Zap, ArrowLeft, X } from 'lucide-react';
import { BOM, BOMComponent, Item } from '../../types/erp';
import { openLiveModuleSheet } from '../../utils/sheetFolderManager';
import { useTableKeyboardNav } from '../../hooks/useTableKeyboardNav';
import { isCircularDependency, getExplodedBOMSummary } from '../../utils/nestedBOMHelper';

type SortField = 'bomCode' | 'machineModel' | 'version';

export const BOMMasterModule: React.FC = () => {
  const { boms, items, itemCategories, addBOM, updateBOM, deleteBOM, bulkAddBOMs, searchTerm, setSearchTerm } = useERP();
  
  // Navigation & Screen View State
  const [isFormOpen, setIsFormOpen] = useState(false); // Controls Inline Create/Edit Form Screen
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [editingBOM, setEditingBOM] = useState<BOM | null>(null);

  // Inline BOM Inspection View state (Opened directly on screen below search bar)
  const [selectedBOM, setSelectedBOM] = useState<BOM | null>(null);
  const [bomHistoryStack, setBomHistoryStack] = useState<BOM[]>([]); // Navigation History Stack for Nested BOMs
  const [isExplodedView, setIsExplodedView] = useState(false);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL');

  // Print Document state
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [printData, setPrintData] = useState<any>(null);

  // Single Column Sorting State
  const [sortField, setSortField] = useState<SortField>('bomCode');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Form State
  const [bomForm, setBomForm] = useState({
    bomCode: '',
    machineModel: '',
    version: 'Rev 1.0',
    description: ''
  });

  // Parent Item Search & Component Search State in Form Screen
  const [parentItemSearch, setParentItemSearch] = useState('');
  const [showParentDropdown, setShowParentDropdown] = useState(false);

  const [componentItemSearch, setComponentItemSearch] = useState('');
  const [componentSearchDisplay, setComponentSearchDisplay] = useState('');
  const [showComponentDropdown, setShowComponentDropdown] = useState(false);

  const [components, setComponents] = useState<BOMComponent[]>([]);
  const [selectedItemId, setSelectedItemId] = useState('');
  const [qtyPerMachine, setQtyPerMachine] = useState(1);
  const [subAssemblyTag, setSubAssemblyTag] = useState<BOMComponent['subAssemblyTag']>('Injection Unit');

  // Handle Multi-Level Back Navigation (ESC Key or Back Button)
  const handleGoBack = () => {
    if (isFormOpen) {
      setIsFormOpen(false);
      setEditingBOM(null);
    } else if (bomHistoryStack.length > 0) {
      const prevBOM = bomHistoryStack[bomHistoryStack.length - 1];
      setBomHistoryStack(prev => prev.slice(0, prev.length - 1));
      setSelectedBOM(prevBOM);
    } else {
      setSelectedBOM(null);
    }
  };

  // Open Top-Level BOM
  const handleOpenTopLevelBOM = (b: BOM) => {
    setSelectedBOM(b);
    setBomHistoryStack([]);
    setIsExplodedView(false);
  };

  // Open Child / Nested BOM (Pushes parent BOM to navigation stack)
  const handleOpenNestedBOM = (childBOM: BOM) => {
    if (selectedBOM) {
      setBomHistoryStack(prev => [...prev, selectedBOM]);
    }
    setSelectedBOM(childBOM);
    setIsExplodedView(false);
  };

  // Handle Global Keyboard Navigation (ESC to go back)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleGoBack();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFormOpen, selectedBOM, bomHistoryStack]);

  const handleSortToggle = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Price Calculation Helpers
  const calculateBOMTotalCost = (compList: BOMComponent[]): number => {
    return compList.reduce((sum, c) => {
      const itemObj = items.find(i => i.id === c.itemId || i.itemCode === c.itemCode);
      const price = itemObj ? itemObj.unitPrice : 0;
      return sum + (c.qtyPerMachine * price);
    }, 0);
  };

  const filteredBOMs = boms
    .filter(b => {
      const q = searchTerm.trim().toLowerCase();
      // Search term filter
      const matchesSearch = !q || (
        b.bomCode.toLowerCase().includes(q) ||
        b.machineModel.toLowerCase().includes(q) ||
        b.version.toLowerCase().includes(q) ||
        b.components.some(c => 
          c.itemCode.toLowerCase().includes(q) || 
          c.itemName.toLowerCase().includes(q)
        )
      );

      // Category filter
      const matchesCategory = selectedCategoryFilter === 'ALL' || b.components.some(c => {
        const itemObj = items.find(i => i.id === c.itemId || i.itemCode === c.itemCode);
        return itemObj?.category === selectedCategoryFilter;
      });

      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      let valA: any = a[sortField] || '';
      let valB: any = b[sortField] || '';

      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

  // Table Keyboard Navigation
  const { selectedIndex, setSelectedIndex } = useTableKeyboardNav(filteredBOMs, (b) => {
    handleOpenTopLevelBOM(b);
    setIsFormOpen(false);
  });

  const handleOpenAddFormScreen = () => {
    setEditingBOM(null);
    setSelectedBOM(null);
    setBomHistoryStack([]);
    setBomForm({
      bomCode: `BOM-GEC-2026-${String(boms.length + 1).padStart(2, '0')}`,
      machineModel: '', // Empty by default (compulsory)
      version: 'Rev 1.0',
      description: ''
    });
    setParentItemSearch('');
    setComponentItemSearch('');
    setComponentSearchDisplay('');
    setComponents([]);
    setSelectedItemId('');
    setIsFormOpen(true);
  };

  const handleOpenEditFormScreen = (b: BOM) => {
    setEditingBOM(b);
    setSelectedBOM(null);
    setBomHistoryStack([]);
    setBomForm({
      bomCode: b.bomCode,
      machineModel: b.machineModel,
      version: b.version,
      description: b.description || ''
    });
    setParentItemSearch(b.machineModel);
    setComponentItemSearch('');
    setComponentSearchDisplay('');
    setComponents(b.components);
    setSelectedItemId('');
    setIsFormOpen(true);
  };

  const handlePrintBOM = (b: BOM) => {
    setPrintData(b);
    setPrintModalOpen(true);
  };

  // Open Live Sheet for BOM
  const handleOpenIndividualBOMSheet = (b: BOM) => {
    const sanitizedModelName = b.machineModel.replace(/[^a-zA-Z0-9]/g, '_');
    const flatData = b.components.map(c => {
      const itemObj = items.find(i => i.id === c.itemId || i.itemCode === c.itemCode);
      const unitPrice = itemObj ? itemObj.unitPrice : 0;
      return {
        bomCode: b.bomCode,
        machineModel: b.machineModel,
        version: b.version,
        itemCode: c.itemCode,
        itemName: c.itemName,
        subAssemblyTag: c.subAssemblyTag,
        qtyPerMachine: c.qtyPerMachine,
        unit: c.unit,
        unitPrice,
        totalItemCost: c.qtyPerMachine * unitPrice,
        lastUpdated: b.lastUpdated
      };
    });

    openLiveModuleSheet('BOM', `BOM_${sanitizedModelName}_Live`, flatData, [
      { key: 'bomCode', label: 'BOM Code' },
      { key: 'machineModel', label: 'Machine Model' },
      { key: 'version', label: 'Version' },
      { key: 'itemCode', label: 'Component Code' },
      { key: 'itemName', label: 'Component Name' },
      { key: 'subAssemblyTag', label: 'Sub Assembly' },
      { key: 'qtyPerMachine', label: 'Qty Per Machine' },
      { key: 'unit', label: 'Unit' },
      { key: 'unitPrice', label: 'Unit Price (INR)' },
      { key: 'totalItemCost', label: 'Total Cost (INR)' },
      { key: 'lastUpdated', label: 'Last Updated' }
    ]);
  };

  const handleAddComponent = () => {
    const itemObj = items.find(i => i.id === selectedItemId);
    if (!itemObj) return;

    // Cycle detection & loop prevention
    if (isCircularDependency(bomForm.machineModel, itemObj.name, boms)) {
      alert(`🛑 Circular Dependency Blocked!\n\nCannot add "${itemObj.name}" into "${bomForm.machineModel}" because it creates an infinite nested loop cycle.`);
      return;
    }

    const existing = components.find(c => c.itemId === selectedItemId);
    if (existing) {
      setComponents(components.map(c => c.itemId === selectedItemId ? { 
        ...c, 
        qtyPerMachine: c.qtyPerMachine + Number(qtyPerMachine)
      } : c));
    } else {
      setComponents([...components, {
        itemId: itemObj.id,
        itemCode: itemObj.itemCode,
        itemName: itemObj.name,
        qtyPerMachine: Number(qtyPerMachine),
        unit: itemObj.unit,
        subAssemblyTag,
        scrapPercent: 0
      }]);
    }
  };

  const handleRemoveComponent = (itemId: string) => {
    setComponents(components.filter(c => c.itemId !== itemId));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (components.length === 0) {
      alert('Please add at least one component to the Bill of Materials!');
      return;
    }

    if (editingBOM) {
      updateBOM({
        ...editingBOM,
        ...bomForm,
        components
      });
    } else {
      addBOM({
        ...bomForm,
        components
      });
    }
    setIsFormOpen(false);
    setEditingBOM(null);
  };

  // Helper to check if a component has a sub-BOM in the system
  const getSubBOMForComponent = (compName: string): BOM | undefined => {
    return boms.find(b => b.machineModel.trim().toLowerCase() === compName.trim().toLowerCase());
  };

  // Filter items matching search (matches itemCode, partCode, oldItemCode, name)
  const filterItemsByMultiSearch = (itemList: Item[], query: string) => {
    const q = query.trim().toLowerCase();
    if (!q) return itemList;
    return itemList.filter(i => 
      i.itemCode.toLowerCase().includes(q) ||
      (i.partCode && i.partCode.toLowerCase().includes(q)) ||
      (i.oldItemCode && i.oldItemCode.toLowerCase().includes(q)) ||
      i.name.toLowerCase().includes(q) ||
      (i.partNo && i.partNo.toLowerCase().includes(q))
    );
  };

  return (
    <div className="module-layout-container">
      {/* Top Action Header */}
      <div className="sticky-module-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {(selectedBOM || isFormOpen) && (
            <button className="btn btn-outline" style={{ padding: '0.35rem 0.65rem', gap: '0.35rem', fontWeight: 600 }} onClick={handleGoBack}>
              <ArrowLeft size={16} /> {bomHistoryStack.length > 0 ? `Back to ${bomHistoryStack[bomHistoryStack.length - 1].bomCode}` : 'Back to All BOMs List'} <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>(ESC)</span>
            </button>
          )}
          <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
            {isFormOpen ? (editingBOM ? `Editing BOM: ${editingBOM.bomCode}` : `Creating New Machine BOM`) : (selectedBOM ? `Viewing BOM: ${selectedBOM.bomCode}` : `All Bills of Materials (${filteredBOMs.length})`)}
          </span>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button className="btn btn-outline" onClick={() => setIsUploadModalOpen(true)}>
            <Upload size={16} /> Import BOM Sheets (Bulk/Single)
          </button>
          {!isFormOpen && (
            <button className="btn btn-primary" onClick={handleOpenAddFormScreen}>
              <Plus size={16} /> Create New Machine BOM
            </button>
          )}
        </div>
      </div>

      {/* Render either INLINE CREATE/EDIT FORM SCREEN, INLINE INSPECTION VIEW, OR MAIN BOM TABLE */}
      {isFormOpen ? (
        /* INLINE CREATE / EDIT FORM SCREEN ON MAIN PAGE */
        <div className="card" style={{ padding: '1.25rem', backgroundColor: 'var(--bg-card)', overflowY: 'auto', flex: 1, minHeight: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
              {editingBOM ? `Edit Machine Bill of Materials (${editingBOM.bomCode})` : 'Create New Machine Bill of Materials'}
            </h3>
            <button className="btn btn-outline" style={{ padding: '0.25rem 0.5rem', fontSize: '0.78rem' }} onClick={handleGoBack}>
              <X size={15} /> Close (ESC)
            </button>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            
            <div className="form-grid-2">
              <div>
                <label>BOM Code</label>
                <input type="text" required className="input-field" value={bomForm.bomCode} onChange={(e) => setBomForm({ ...bomForm, bomCode: e.target.value })} />
              </div>
              <div>
                <label>Version / Revision</label>
                <input type="text" required className="input-field" value={bomForm.version} onChange={(e) => setBomForm({ ...bomForm, version: e.target.value })} />
              </div>
            </div>

            {/* Single Integrated Autocomplete Search Bar for Target Machine / Parent Item */}
            <div style={{ padding: '0.875rem 1rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: '0.5rem', border: '1px solid var(--border-color)', position: 'relative' }}>
              <label style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.4rem', display: 'block' }}>
                Target Machine / Parent Item:
              </label>

              <div style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  required
                  className="input-field"
                  style={{ paddingLeft: '2.25rem', height: '38px', fontSize: '0.85rem' }}
                  placeholder="Type to search parent item (e.g. GEC000001, GEC-TIE-80, Tie Bar)..."
                  value={bomForm.machineModel}
                  onFocus={() => setShowParentDropdown(true)}
                  onBlur={() => setTimeout(() => setShowParentDropdown(false), 200)}
                  onChange={(e) => {
                    setBomForm({ ...bomForm, machineModel: e.target.value });
                    setParentItemSearch(e.target.value);
                    setShowParentDropdown(true);
                  }}
                />

                {showParentDropdown && (
                  <div 
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 4px)',
                      left: 0,
                      right: 0,
                      maxHeight: '220px',
                      overflowY: 'auto',
                      backgroundColor: 'var(--bg-card)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '0.375rem',
                      zIndex: 100,
                      boxShadow: 'var(--shadow-md)'
                    }}
                  >
                    {filterItemsByMultiSearch(items, parentItemSearch || bomForm.machineModel).length === 0 ? (
                      <div style={{ padding: '0.65rem 0.875rem', fontSize: '0.82rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                        No matching parent items found.
                      </div>
                    ) : (
                      filterItemsByMultiSearch(items, parentItemSearch || bomForm.machineModel).map(i => {
                        const codeLabel = i.oldItemCode ? `${i.oldItemCode} - ` : `${i.itemCode} - `;
                        const isSelected = bomForm.machineModel === i.name;

                        return (
                          <div
                            key={i.id}
                            style={{
                              padding: '0.55rem 0.85rem',
                              cursor: 'pointer',
                              fontSize: '0.83rem',
                              borderBottom: '1px solid var(--border-color)',
                              backgroundColor: isSelected ? 'var(--accent-light)' : 'transparent',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between'
                            }}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setBomForm({ ...bomForm, machineModel: i.name });
                              setShowParentDropdown(false);
                            }}
                          >
                            <div>
                              <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--accent-primary)', marginRight: '0.5rem' }}>
                                {codeLabel}
                              </span>
                              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{i.name}</span>
                            </div>
                            <span style={{ fontSize: '0.78rem', color: 'var(--success)', fontWeight: 700, fontFamily: 'monospace' }}>
                              ₹{i.unitPrice.toLocaleString()}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Component Builder Panel */}
            <div style={{ padding: '1rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: '0.5rem', border: '1px solid var(--border-color)' }}>
              <h4 style={{ fontSize: '0.88rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text-primary)' }}>Add BOM Components & Quantities</h4>
              
              <div style={{ display: 'grid', gridTemplateColumns: '2.5fr 1fr 1.2fr auto', gap: '0.6rem', alignItems: 'flex-end', marginBottom: '0.75rem' }}>
                
                {/* Integrated Autocomplete Component Search Bar */}
                <div style={{ position: 'relative' }}>
                  <label style={{ fontSize: '0.75rem' }}>Component Item (Search Code, Part Code, Name, Old Code):</label>
                  <div style={{ position: 'relative' }}>
                    <Search size={15} style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                      type="text"
                      className="input-field"
                      style={{ paddingLeft: '2.1rem', height: '36px', fontSize: '0.83rem' }}
                      placeholder="Type to search component (e.g. GEC000001, GEC-TIE-80)..."
                      value={componentSearchDisplay || (() => {
                        const sel = items.find(i => i.id === selectedItemId);
                        if (!sel) return '';
                        return `${sel.oldItemCode ? sel.oldItemCode + ' - ' : sel.itemCode + ' - '}${sel.name}`;
                      })()}
                      onFocus={() => setShowComponentDropdown(true)}
                      onBlur={() => setTimeout(() => setShowComponentDropdown(false), 200)}
                      onChange={(e) => {
                        setComponentItemSearch(e.target.value);
                        setComponentSearchDisplay(e.target.value);
                        setShowComponentDropdown(true);
                      }}
                    />

                    {showComponentDropdown && (
                      <div 
                        style={{
                          position: 'absolute',
                          top: 'calc(100% + 4px)',
                          left: 0,
                          right: 0,
                          maxHeight: '220px',
                          overflowY: 'auto',
                          backgroundColor: 'var(--bg-card)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '0.375rem',
                          zIndex: 100,
                          boxShadow: 'var(--shadow-md)'
                        }}
                      >
                        {(() => {
                          const availableItems = items.filter(i => 
                            i.name.trim().toLowerCase() !== bomForm.machineModel.trim().toLowerCase()
                          );
                          const matches = filterItemsByMultiSearch(availableItems, componentItemSearch);

                          if (matches.length === 0) {
                            return (
                              <div style={{ padding: '0.65rem 0.875rem', fontSize: '0.82rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                                No matching component items found.
                              </div>
                            );
                          }

                          return matches.map(i => {
                            const codeLabel = i.oldItemCode ? `${i.oldItemCode} - ` : `${i.itemCode} - `;
                            const isSelected = selectedItemId === i.id;

                            return (
                              <div
                                key={i.id}
                                style={{
                                  padding: '0.55rem 0.85rem',
                                  cursor: 'pointer',
                                  fontSize: '0.83rem',
                                  borderBottom: '1px solid var(--border-color)',
                                  backgroundColor: isSelected ? 'var(--accent-light)' : 'transparent',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between'
                                }}
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  setSelectedItemId(i.id);
                                  setComponentSearchDisplay(`${codeLabel}${i.name}`);
                                  setShowComponentDropdown(false);
                                }}
                              >
                                <div>
                                  <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--accent-primary)', marginRight: '0.5rem' }}>
                                    {codeLabel}
                                  </span>
                                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{i.name}</span>
                                </div>
                                <span style={{ fontSize: '0.78rem', color: 'var(--success)', fontWeight: 700, fontFamily: 'monospace' }}>
                                  ₹{i.unitPrice.toLocaleString()}
                                </span>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem' }}>Qty / Unit</label>
                  <input type="number" min="1" className="input-field" style={{ height: '36px', fontSize: '0.85rem' }} value={qtyPerMachine} onChange={(e) => setQtyPerMachine(Number(e.target.value))} />
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem' }}>Sub-Assembly</label>
                  <select className="input-field" style={{ height: '36px', fontSize: '0.82rem' }} value={subAssemblyTag} onChange={(e) => setSubAssemblyTag(e.target.value as BOMComponent['subAssemblyTag'])}>
                    <option value="Injection Unit">Injection Unit</option>
                    <option value="Clamping Unit">Clamping Unit</option>
                    <option value="Hydraulic Powerpack">Hydraulic Powerpack</option>
                    <option value="Electrical Cabinet">Electrical Cabinet</option>
                    <option value="Base Frame">Base Frame</option>
                  </select>
                </div>

                <button type="button" className="btn btn-secondary" style={{ height: '36px' }} onClick={handleAddComponent}>
                  <Plus size={16} /> Add
                </button>
              </div>

              {/* Added Components List with Item Price & Total */}
              {components.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '220px', overflowY: 'auto' }}>
                  {components.map(c => {
                    const itemObj = items.find(i => i.id === c.itemId || i.itemCode === c.itemCode);
                    const unitPrice = itemObj ? itemObj.unitPrice : 0;
                    const totalCost = c.qtyPerMachine * unitPrice;

                    return (
                      <div key={c.itemId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-card)', padding: '0.45rem 0.65rem', borderRadius: '0.375rem' }}>
                        <div>
                          <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--accent-primary)', marginRight: '0.5rem' }}>{c.itemCode}</span>
                          <span style={{ fontWeight: 600, fontSize: '0.82rem' }}>{c.itemName}</span>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>[{c.subAssemblyTag}]</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>₹{unitPrice.toLocaleString()} / unit</span>
                          <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>{c.qtyPerMachine} {c.unit}</span>
                          <span style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--success)' }}>₹{totalCost.toLocaleString()}</span>
                          <button type="button" style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }} onClick={() => handleRemoveComponent(c.itemId)}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  <div style={{ marginTop: '0.4rem', paddingTop: '0.4rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '0.9rem' }}>
                    <span>Total Estimated BOM Material Cost:</span>
                    <span style={{ color: 'var(--success)' }}>₹{calculateBOMTotalCost(components).toLocaleString()}</span>
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button type="button" className="btn btn-secondary" onClick={handleGoBack}>
                Cancel (ESC)
              </button>
              <button type="submit" className="btn btn-primary">Save Machine BOM</button>
            </div>
          </form>
        </div>
      ) : (
        <>
          {/* Common Filter & Search Bar */}
          <div className="card" style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', backgroundColor: 'var(--bg-card)' }}>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', flexWrap: 'wrap', flex: 1 }}>
              {/* Search Input */}
              <div style={{ position: 'relative', width: '360px', maxWidth: '100%' }}>
                <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder={selectedBOM ? "Search components in this BOM (code, name, part)..." : "Search BOM code, machine model, component item code..."}
                  className="input-field"
                  style={{ paddingLeft: '2.25rem' }}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {/* Common Category Filter Dropdown */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Filter size={15} color="var(--text-muted)" />
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Category:</span>
                <select
                  className="input-field"
                  style={{ padding: '0.3rem 0.65rem', fontSize: '0.82rem', width: '200px' }}
                  value={selectedCategoryFilter}
                  onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                >
                  <option value="ALL">All Categories</option>
                  {itemCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* View Mode Toggle when a BOM is selected */}
            {selectedBOM && (
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <button
                  type="button"
                  className={`btn ${!isExplodedView ? 'btn-primary' : 'btn-outline'}`}
                  style={{ padding: '0.3rem 0.65rem', fontSize: '0.78rem' }}
                  onClick={() => setIsExplodedView(false)}
                >
                  Direct Components View
                </button>
                <button
                  type="button"
                  className={`btn ${isExplodedView ? 'btn-primary' : 'btn-outline'}`}
                  style={{ padding: '0.3rem 0.65rem', fontSize: '0.78rem', gap: '0.35rem' }}
                  onClick={() => setIsExplodedView(true)}
                  title="Flattens and displays all parts across all nested sub-BOM levels"
                >
                  <Zap size={14} /> ⚡ Explode BOM
                </button>
              </div>
            )}
          </div>

          {/* Either INLINE OPENED BOM DETAILS PANEL OR MAIN BOM TABLE */}
          {selectedBOM ? (
            /* INLINE BOM INSPECTION PANEL BELOW FILTER BAR */
            <div className="card" style={{ padding: '1.25rem', backgroundColor: 'var(--bg-card)', display: 'flex', flexDirection: 'column', gap: '0.85rem', flex: 1, minHeight: 0, overflow: 'hidden' }}>
              
              {/* Opened BOM Info Banner with Total Cost */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', padding: '0.875rem 1rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: '0.5rem', border: '1px solid var(--border-color)', flexShrink: 0 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-primary)', fontFamily: 'monospace' }}>
                      {selectedBOM.bomCode} ({selectedBOM.version})
                    </span>
                    <span className="badge badge-info" style={{ fontSize: '0.7rem' }}>Last Updated: {selectedBOM.lastUpdated}</span>
                    <span className="badge badge-primary" style={{ fontSize: '0.75rem', fontWeight: 700 }}>
                      {selectedBOM.components.length} Direct Components
                    </span>
                  </div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: '0.2rem 0 0 0', color: 'var(--text-primary)' }}>
                    {selectedBOM.machineModel}
                  </h3>
                </div>

                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                  <button className="btn btn-outline" style={{ color: 'var(--success)' }} title="Open Individual BOM Sheet" onClick={() => handleOpenIndividualBOMSheet(selectedBOM)}>
                    <FileSpreadsheet size={15} /> Open Live Sheet
                  </button>
                  <button className="btn btn-outline" title="Print BOM Document" onClick={() => handlePrintBOM(selectedBOM)}>
                    <Printer size={15} /> Print
                  </button>
                  <button className="btn btn-primary" title="Edit BOM" onClick={() => handleOpenEditFormScreen(selectedBOM)}>
                    <Edit2 size={15} /> Edit BOM
                  </button>
                </div>
              </div>

              {/* Components View Table (Filtered by Search Term & Category Filter) */}
              {!isExplodedView ? (
                /* DIRECT COMPONENTS VIEW */
                <div className="table-container" style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
                  <table>
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Item Code</th>
                        <th>Part Code</th>
                        <th>Old Code</th>
                        <th>Item Description</th>
                        <th>Class</th>
                        <th>Process Source</th>
                        <th>Qty Per Unit</th>
                        <th>UOM</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedBOM.components
                        .filter(c => {
                          const q = searchTerm.trim().toLowerCase();
                          const itemObj = items.find(i => i.id === c.itemId || i.itemCode === c.itemCode);

                          const matchesSearch = !q || (
                            c.itemCode.toLowerCase().includes(q) ||
                            c.itemName.toLowerCase().includes(q) ||
                            (itemObj?.partCode && itemObj.partCode.toLowerCase().includes(q)) ||
                            (itemObj?.oldItemCode && itemObj.oldItemCode.toLowerCase().includes(q))
                          );

                          const matchesCategory = selectedCategoryFilter === 'ALL' || itemObj?.category === selectedCategoryFilter;

                          return matchesSearch && matchesCategory;
                        })
                        .map((c, i) => {
                          const itemObj = items.find(it => it.id === c.itemId || it.itemCode === c.itemCode);
                          const subBOM = getSubBOMForComponent(c.itemName);

                          return (
                            <tr 
                              key={i}
                              onClick={() => {
                                if (subBOM) handleOpenNestedBOM(subBOM);
                              }}
                              style={{ 
                                cursor: subBOM ? 'pointer' : 'default',
                                backgroundColor: subBOM ? 'rgba(59, 130, 246, 0.05)' : 'transparent'
                              }}
                              title={subBOM ? `Sub-BOM: ${subBOM.bomCode}` : undefined}
                            >
                              <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{i + 1}</td>
                              <td style={{ fontWeight: 700, fontFamily: 'monospace', color: 'var(--accent-primary)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                  {c.itemCode}
                                  {subBOM && (
                                    <span className="badge badge-info" style={{ fontSize: '0.68rem', padding: '0.1rem 0.35rem', fontWeight: 800 }}>
                                      BOM ➔
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                                {itemObj?.partCode || '-'}
                              </td>
                              <td style={{ fontSize: '0.82rem', color: itemObj?.oldItemCode ? 'var(--warning)' : 'var(--text-muted)', fontFamily: 'monospace' }}>
                                {itemObj?.oldItemCode || '-'}
                              </td>
                              <td style={{ fontWeight: 600 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                  {c.itemName}
                                </div>
                              </td>
                              <td>
                                <span className="badge badge-info" style={{ fontSize: '0.72rem' }}>
                                  {itemObj?.category || 'MC'}
                                </span>
                              </td>
                              <td>
                                <span className={`badge ${
                                  itemObj?.processType === 'Brought out' ? 'badge-primary' :
                                  itemObj?.processType === 'In-house' ? 'badge-success' :
                                  itemObj?.processType === 'Job work' ? 'badge-warning' : 'badge-neutral'
                                }`} style={{ fontSize: '0.72rem' }}>
                                  {itemObj?.processType || '-'}
                                </span>
                              </td>
                              <td style={{ fontWeight: 800 }}>{c.qtyPerMachine}</td>
                              <td style={{ fontSize: '0.82rem' }}>{c.unit || itemObj?.unit || 'PCS'}</td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              ) : (
                /* EXPLODED BOM VIEW */
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.5rem', fontWeight: 600, flexShrink: 0 }}>
                    ⚡ Exploded View: Flattened raw parts requirement across all nested sub-BOM levels:
                  </div>
                  <div className="table-container" style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
                    <table>
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Item Code</th>
                          <th>Part Code</th>
                          <th>Old Code</th>
                          <th>Item Description</th>
                          <th>Class</th>
                          <th>Process Source</th>
                          <th>Total Exploded Qty</th>
                          <th>UOM</th>
                        </tr>
                      </thead>
                      <tbody>
                        {getExplodedBOMSummary(selectedBOM.components, boms)
                          .filter(c => {
                            const q = searchTerm.trim().toLowerCase();
                            const itemObj = items.find(i => i.id === c.itemId || i.itemCode === c.itemCode);

                            const matchesSearch = !q || (
                              c.itemCode.toLowerCase().includes(q) ||
                              c.itemName.toLowerCase().includes(q) ||
                              (itemObj?.partCode && itemObj.partCode.toLowerCase().includes(q)) ||
                              (itemObj?.oldItemCode && itemObj.oldItemCode.toLowerCase().includes(q))
                            );

                            const matchesCategory = selectedCategoryFilter === 'ALL' || itemObj?.category === selectedCategoryFilter;

                            return matchesSearch && matchesCategory;
                          })
                          .map((c, i) => {
                            const itemObj = items.find(it => it.id === c.itemId || it.itemCode === c.itemCode);

                            return (
                              <tr key={i}>
                                <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{i + 1}</td>
                                <td style={{ fontWeight: 700, fontFamily: 'monospace', color: 'var(--accent-primary)' }}>
                                  {c.itemCode}
                                </td>
                                <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                                  {itemObj?.partCode || '-'}
                                </td>
                                <td style={{ fontSize: '0.82rem', color: itemObj?.oldItemCode ? 'var(--warning)' : 'var(--text-muted)', fontFamily: 'monospace' }}>
                                  {itemObj?.oldItemCode || '-'}
                                </td>
                                <td style={{ fontWeight: 600 }}>{c.itemName}</td>
                                <td>
                                  <span className="badge badge-info" style={{ fontSize: '0.72rem' }}>
                                    {itemObj?.category || 'MC'}
                                  </span>
                                </td>
                                <td>
                                  <span className={`badge ${
                                    itemObj?.processType === 'Brought out' ? 'badge-primary' :
                                    itemObj?.processType === 'In-house' ? 'badge-success' :
                                    itemObj?.processType === 'Job work' ? 'badge-warning' : 'badge-neutral'
                                  }`} style={{ fontSize: '0.72rem' }}>
                                    {itemObj?.processType || '-'}
                                  </span>
                                </td>
                                <td style={{ fontWeight: 800 }}>{c.totalQty}</td>
                                <td style={{ fontSize: '0.82rem' }}>{c.unit || itemObj?.unit || 'PCS'}</td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            </div>
          ) : (
            /* MAIN ROW-WISE BOM TABLE VIEW */
            <div className="table-container" style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
              <table>
                <thead>
                  <tr>
                    <th onClick={() => handleSortToggle('bomCode')} style={{ cursor: 'pointer' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        BOM Code {sortField === 'bomCode' ? (sortOrder === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} />) : <ArrowUpDown size={12} color="var(--text-muted)" />}
                      </div>
                    </th>
                    <th onClick={() => handleSortToggle('machineModel')} style={{ cursor: 'pointer' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        Target Machine / Parent Item {sortField === 'machineModel' ? (sortOrder === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} />) : <ArrowUpDown size={12} color="var(--text-muted)" />}
                      </div>
                    </th>
                    <th onClick={() => handleSortToggle('version')} style={{ cursor: 'pointer' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        Version {sortField === 'version' ? (sortOrder === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} />) : <ArrowUpDown size={12} color="var(--text-muted)" />}
                      </div>
                    </th>
                    <th>Total Components</th>
                    <th>Last Updated</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBOMs.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                        No Bill of Materials found matching your search and category filter.
                      </td>
                    </tr>
                  ) : (
                    filteredBOMs.map((b, idx) => {
                      const isNavSelected = selectedIndex === idx;

                      return (
                        <tr
                          key={b.id}
                          onClick={() => {
                            setSelectedIndex(idx);
                            handleOpenTopLevelBOM(b);
                          }}
                          style={{
                            backgroundColor: isNavSelected ? 'rgba(59, 130, 246, 0.18)' : 'transparent',
                            cursor: 'pointer'
                          }}
                          title="Click row to open and inspect BOM components below filter bar"
                        >
                          <td style={{ fontWeight: 700, color: 'var(--accent-primary)', fontFamily: 'monospace' }}>
                            {b.bomCode}
                          </td>
                          <td style={{ fontWeight: 600 }}>{b.machineModel}</td>
                          <td>
                            <span className="badge badge-primary" style={{ fontSize: '0.72rem' }}>{b.version}</span>
                          </td>
                          <td style={{ fontWeight: 700 }}>{b.components.length} Items</td>
                          <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{b.lastUpdated || '2026-08-29'}</td>
                          <td onClick={(e) => e.stopPropagation()}>
                            <div style={{ display: 'flex', gap: '0.35rem' }}>
                              <button className="btn btn-outline" style={{ padding: '0.25rem 0.45rem' }} title="Edit BOM" onClick={() => handleOpenEditFormScreen(b)}>
                                <Edit2 size={14} />
                              </button>
                              <button className="btn btn-outline" style={{ padding: '0.25rem 0.45rem', color: 'var(--danger)' }} title="Delete BOM" onClick={() => deleteBOM(b.id)}>
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Upload BOM Modal */}
      <BOMUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onConfirmImport={(newBOMs) => bulkAddBOMs(newBOMs)}
      />

      {/* Print Document Modal */}
      <PrintDocumentModal
        isOpen={printModalOpen}
        onClose={() => setPrintModalOpen(false)}
        title="Print Bill of Materials (BOM)"
        documentType="BOM"
        data={printData}
      />

    </div>
  );
};
