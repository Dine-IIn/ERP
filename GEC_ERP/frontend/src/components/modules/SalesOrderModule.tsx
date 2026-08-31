import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import { AutocompleteSelect, AutocompleteOption } from '../common/AutocompleteSelect';
import { PrintManagerModal } from '../printTemplates/PrintManagerModal';
import { SingleSOPrintView, SOListPrintView } from '../printTemplates/SOPrintTemplates';
import { openLiveModuleSheet } from '../../utils/sheetFolderManager';
import { ShoppingBag, Plus, ArrowRight, CheckCircle2, Search, Printer, FileSpreadsheet, ArrowLeft, X, Edit2, Trash2, RefreshCw } from 'lucide-react';
import { SalesOrder } from '../../types/erp';
import { ExportFieldSelectorModal, FieldOption } from '../common/ExportFieldSelectorModal';
import { useTableKeyboardNav } from '../../hooks/useTableKeyboardNav';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Modal } from '../common/Modal';

type SortField = 'soNumber' | 'customerName' | 'machineModel' | 'quantity' | 'orderDate';

export const SalesOrderModule: React.FC = () => {
  const { 
    salesOrders, customers, boms, items, workOrders, setActiveModule, openWOInEditor,
    addSalesOrder, updateSalesOrder, deleteSalesOrder, generateWOFromSO, searchTerm, setSearchTerm 
  } = useERP();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [printDocType, setPrintDocType] = useState<'SINGLE_SO' | 'SO_LIST'>('SO_LIST');
  const [selectedPrintSO, setSelectedPrintSO] = useState<SalesOrder | null>(null);
  
  // Single Column Sorting State - Default sort by Order Date (latest first)
  const [sortField, setSortField] = useState<SortField>('orderDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const [editingSO, setEditingSO] = useState<SalesOrder | null>(null);

  const [soForm, setSoForm] = useState({
    soNumber: '',
    customerId: '',
    customerName: '',
    machineModel: '',
    quantity: 1,
    orderDate: new Date().toISOString().split('T')[0],
    deliveryDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    customNotes: ''
  });

  const customerOptions: AutocompleteOption[] = customers.map(c => ({
    value: c.id,
    label: c.name,
    sublabel: `${c.customerCode} | ${c.city}`
  }));

  // Any Item from Item Master (Full Catalog) + Registered Finished Good BOMs
  const machineModelOptions: AutocompleteOption[] = [
    ...items.map(i => ({
      value: `${i.itemCode} - ${i.name}`,
      label: `${i.itemCode} - ${i.name}`,
      sublabel: `Class: ${i.category} | In-House Stock: ${i.inHouseStock} ${i.unit} | ₹${(i.unitPrice || 0).toLocaleString()}`
    })),
    ...boms
      .filter(b => !items.some(i => `${i.itemCode} - ${i.name}` === b.machineModel || i.name === b.machineModel || i.itemCode === b.bomCode))
      .map(b => ({
        value: b.machineModel,
        label: `${b.bomCode} - ${b.machineModel}`,
        sublabel: `Registered BOM | Version: ${b.version} | ${b.components.length} components`
      }))
  ];

  const handleOpenModal = () => {
    setSoForm({
      soNumber: `SO-GEC-${String(salesOrders.length + 1).padStart(3, '0')}`,
      customerId: '',
      customerName: '',
      machineModel: '',
      quantity: 1,
      orderDate: new Date().toISOString().split('T')[0],
      deliveryDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      customNotes: ''
    });
    setIsModalOpen(true);
  };

  const handleCustomerChange = (customerId: string) => {
    const selected = customers.find(c => c.id === customerId);
    setSoForm(prev => ({
      ...prev,
      customerId,
      customerName: selected ? selected.name : ''
    }));
  };

  const handleSubmitSO = (e: React.FormEvent) => {
    e.preventDefault();
    addSalesOrder(soForm);
    setIsModalOpen(false);
  };

  const handlePrintSingleSO = (so: SalesOrder) => {
    setSelectedPrintSO(so);
    setPrintDocType('SINGLE_SO');
    setPrintModalOpen(true);
  };

  const handlePrintSOList = () => {
    setPrintDocType('SO_LIST');
    setPrintModalOpen(true);
  };

  const handleRefreshLiveSheet = () => {
    const data = filteredSOs.map(so => ({
      soNumber: so.soNumber,
      customerName: so.customerName,
      machineModel: so.machineModel,
      quantity: so.quantity || 1,
      orderDate: so.orderDate,
      deliveryDate: so.deliveryDate,
      status: so.status,
      customNotes: so.customNotes || ''
    }));

    const headers: { key: keyof typeof data[0]; label: string }[] = [
      { key: 'soNumber', label: 'SO Number' },
      { key: 'customerName', label: 'Customer Name' },
      { key: 'machineModel', label: 'Item Description' },
      { key: 'quantity', label: 'Order Quantity' },
      { key: 'orderDate', label: 'Order Date' },
      { key: 'deliveryDate', label: 'Target Delivery' },
      { key: 'status', label: 'Order Status' },
      { key: 'customNotes', label: 'Custom Notes' }
    ];

    openLiveModuleSheet('SalesOrders', 'GEC_ERP_Sales_Orders_Live', data, headers);
  };

  const handleSortToggle = (field: SortField) => {
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

  const filteredSOs = salesOrders
    .filter(so => {
      const isCompleted = so.status === 'COMPLETED' || (so.status as string) === 'DELIVERED' || so.status === 'CANCELLED' || (so as any).isArchived;

      // By default show only active unless @history is typed
      if (!isHistorySearch && isCompleted) {
        return false;
      }

      return !cleanSearchTerm || (
        so.soNumber.toLowerCase().includes(cleanSearchTerm) ||
        so.customerName.toLowerCase().includes(cleanSearchTerm) ||
        so.machineModel.toLowerCase().includes(cleanSearchTerm)
      );
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

  // Keyboard navigation hook for live table row focus
  const { selectedIndex, setSelectedIndex } = useTableKeyboardNav(
    filteredSOs, 
    (so) => handlePrintSingleSO(so)
  );

  // Custom Export Field Definitions
  const availableExportFields: FieldOption<SalesOrder>[] = [
    { key: 'soNumber', label: 'SO Number' },
    { key: 'customerName', label: 'Customer Name' },
    { key: 'machineModel', label: 'Machine Model' },
    { key: 'quantity', label: 'Order Quantity' },
    { key: 'orderDate', label: 'Order Date' },
    { key: 'deliveryDate', label: 'Target Delivery' },
    { key: 'status', label: 'SO Status' }
  ];

  return (
    <div className="module-layout-container">
      {/* Top Header */}
      <div className="sticky-module-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {isModalOpen && (
            <button className="btn btn-outline" style={{ padding: '0.35rem 0.65rem', gap: '0.35rem', fontWeight: 600 }} onClick={() => setIsModalOpen(false)}>
              <ArrowLeft size={16} /> Back to Sales Orders <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>(ESC)</span>
            </button>
          )}
          <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
            {isModalOpen ? 'Creating Client Sales Order' : `All Sales Orders (${filteredSOs.length})`}
          </span>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-outline" onClick={handleRefreshLiveSheet} title="Sync and maintain live CSV sheet">
            <RefreshCw size={14} /> Live Sheet
          </button>
          <button type="button" className="btn btn-outline" onClick={handlePrintSOList} title="Print filtered sales orders report">
            <Printer size={14} /> Print Report
          </button>
          <button className="btn btn-outline" onClick={() => setIsExportModalOpen(true)}>
            <FileSpreadsheet size={14} /> Export Custom
          </button>
          {!isModalOpen && (
            <button className="btn btn-primary" onClick={handleOpenModal}>
              <Plus size={16} /> Create Sales Order
            </button>
          )}
        </div>
      </div>

      {/* Main Search & Table OR In-Screen Page Form Panel */}
      {isModalOpen ? (
        <div className="card" style={{ padding: '1.25rem', backgroundColor: 'var(--bg-card)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
              Create New Client Sales Order
            </h3>
            <button type="button" className="btn btn-outline" style={{ padding: '0.25rem 0.5rem', fontSize: '0.78rem' }} onClick={() => setIsModalOpen(false)}>
              <X size={15} /> Close (ESC)
            </button>
          </div>

          <form onSubmit={handleSubmitSO} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.25rem' }}>SO Number</label>
                <input type="text" required className="input-field" value={soForm.soNumber} onChange={(e) => setSoForm({ ...soForm, soNumber: e.target.value })} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.25rem' }}>Search Customer</label>
                <AutocompleteSelect
                  options={customerOptions}
                  value={soForm.customerId}
                  onChange={handleCustomerChange}
                  placeholder="Type customer name..."
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.25rem' }}>Ordered Item *</label>
              <AutocompleteSelect
                options={machineModelOptions}
                value={soForm.machineModel}
                onChange={(val) => setSoForm({ ...soForm, machineModel: val })}
                placeholder="Search item from Item Master..."
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.25rem' }}>Order Quantity</label>
                <input type="number" min="1" required className="input-field" value={soForm.quantity} onChange={(e) => setSoForm({ ...soForm, quantity: Number(e.target.value) })} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.25rem' }}>Target Delivery Date</label>
                <input type="date" required className="input-field" value={soForm.deliveryDate} onChange={(e) => setSoForm({ ...soForm, deliveryDate: e.target.value })} />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.25rem' }}>Client Customization Requests / Extra Tool Demands</label>
              <textarea className="input-field" rows={2} placeholder="e.g. Client requested extra set of Bimetallic Injection Screws & special clamping kit" value={soForm.customNotes} onChange={(e) => setSoForm({ ...soForm, customNotes: e.target.value })} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel (ESC)</button>
              <button type="submit" className="btn btn-primary">Confirm & Create Sales Order</button>
            </div>
          </form>
        </div>
      ) : (
        <>
          {/* Inline Search Bar */}
          <div className="card" style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '1rem', backgroundColor: 'var(--bg-card)', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', width: '360px', maxWidth: '100%' }}>
              <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search SO, customer, model... (type @history to search completed)"
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

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th onClick={() => handleSortToggle('soNumber')} style={{ cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      SO Number {sortField === 'soNumber' ? (sortOrder === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} />) : <ArrowUpDown size={12} color="var(--text-muted)" />}
                    </div>
                  </th>
                  <th onClick={() => handleSortToggle('customerName')} style={{ cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      Customer Name {sortField === 'customerName' ? (sortOrder === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} />) : <ArrowUpDown size={12} color="var(--text-muted)" />}
                    </div>
                  </th>
                  <th onClick={() => handleSortToggle('machineModel')} style={{ cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      Item {sortField === 'machineModel' ? (sortOrder === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} />) : <ArrowUpDown size={12} color="var(--text-muted)" />}
                    </div>
                  </th>
                  <th onClick={() => handleSortToggle('quantity')} style={{ cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      Order Qty {sortField === 'quantity' ? (sortOrder === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} />) : <ArrowUpDown size={12} color="var(--text-muted)" />}
                    </div>
                  </th>
                  <th onClick={() => handleSortToggle('orderDate')} style={{ cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      Order Date {sortField === 'orderDate' ? (sortOrder === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} />) : <ArrowUpDown size={12} color="var(--text-muted)" />}
                    </div>
                  </th>
                  <th>Delivery Target</th>
                  <th>SO Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSOs.map((so, idx) => {
                  const isNavSelected = selectedIndex === idx;
                  const isCompleted = so.status === 'COMPLETED' || (so.status as string) === 'DELIVERED' || so.status === 'CANCELLED' || (so as any).isArchived;

                  return (
                    <tr 
                      key={so.id}
                      onDoubleClick={() => handlePrintSingleSO(so)}
                      onClick={() => setSelectedIndex(idx)}
                      style={{
                        backgroundColor: isNavSelected ? 'rgba(59, 130, 246, 0.18)' : 'transparent',
                        cursor: 'pointer'
                      }}
                      title="Double click or press Enter to view SO document"
                    >
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span style={{ fontWeight: 700, color: 'var(--accent-primary)', fontFamily: 'monospace' }}>
                          {so.soNumber}
                        </span>
                        {isCompleted && (
                          <span className="badge" style={{ backgroundColor: '#7c3aed', color: '#fff', fontSize: '0.65rem', padding: '0.1rem 0.35rem' }}>
                            📜 HISTORY
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ fontWeight: 600 }}>{so.customerName}</td>
                    <td>{so.machineModel}</td>
                    <td style={{ fontWeight: 700 }}>{so.quantity} Machine(s)</td>
                    <td style={{ fontSize: '0.85rem' }}>{so.orderDate}</td>
                    <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{so.deliveryDate}</td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        <span className={`badge ${
                          so.status === 'WO_GENERATED' ? 'badge-success' : 
                          so.status === 'COMPLETED' ? 'badge-primary' : 'badge-info'
                        }`}>
                          {so.status.replace('_', ' ')}
                        </span>

                        {(() => {
                          const soItemSpec = so.machineModel.trim().toLowerCase();
                          const soBOM = boms.find(b => 
                            soItemSpec.includes(b.machineModel.toLowerCase().trim()) || 
                            soItemSpec.includes(b.bomCode.toLowerCase().trim()) ||
                            b.machineModel.toLowerCase().trim() === soItemSpec
                          );

                          const originalWO = workOrders.find(w => w.soId === so.id || (so.soNumber && w.soNumber === so.soNumber));
                          const soComponents = (originalWO?.woComponents && originalWO.woComponents.length > 0)
                            ? originalWO.woComponents
                            : (soBOM ? soBOM.components : []);

                          const exactMatchWOs = workOrders.filter(w => {
                            if (originalWO && w.id === originalWO.id) return false;
                            const isWOActive = w.status !== 'COMPLETED' && w.stage !== 'COMPLETED' && w.stage !== 'QUALITY_PASSED';
                            if (!isWOActive) return false;

                            const woModel = (w.machineModel || '').toLowerCase().trim();
                            if (woModel !== soItemSpec && !(soBOM && woModel.includes(soBOM.machineModel.toLowerCase().trim()))) {
                              return false;
                            }

                            const woComponents = w.woComponents || [];
                            if (soComponents.length > 0 && woComponents.length !== soComponents.length) return false;

                            for (const sc of soComponents) {
                              const found = woComponents.find(wc => 
                                (wc.itemCode && wc.itemCode === sc.itemCode) ||
                                (wc.itemId && wc.itemId === sc.itemId) ||
                                (wc.itemName && wc.itemName.toLowerCase().trim() === sc.itemName.toLowerCase().trim())
                              );
                              if (!found) return false;
                            }
                            return true;
                          });

                          if (!originalWO && exactMatchWOs.length === 0) return null;

                          return (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '0.25rem' }}>
                              {originalWO && (
                                <button
                                  className="badge badge-primary"
                                  style={{ 
                                    cursor: 'pointer', 
                                    border: 'none', 
                                    padding: '0.22rem 0.5rem', 
                                    fontSize: '0.74rem',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    textAlign: 'center',
                                    fontWeight: 700,
                                    borderRadius: '0.25rem'
                                  }}
                                  title={`Directly Generated Work Order (Click to open): ${originalWO.workOrderNo || originalWO.woNumber}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openWOInEditor(originalWO.id);
                                  }}
                                >
                                  {originalWO.workOrderNo || originalWO.woNumber} (Direct WO)
                                </button>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: '0.35rem' }}>
                        <button 
                          className="btn btn-outline" 
                          style={{ padding: '0.3rem 0.5rem' }} 
                          title="Print Sales Order Confirmation" 
                          onClick={() => handlePrintSingleSO(so)}
                        >
                          <Printer size={14} />
                        </button>
                        {so.status === 'DRAFT' || so.status === 'CONFIRMED' ? (
                          <>
                            <button 
                              className="btn btn-outline" 
                              style={{ padding: '0.3rem 0.5rem' }} 
                              title="Edit Sales Order" 
                              onClick={() => setEditingSO({ ...so })}
                            >
                              <Edit2 size={14} />
                            </button>
                            <button 
                              className="btn btn-outline" 
                              style={{ padding: '0.3rem 0.5rem', color: 'var(--danger)' }} 
                              title="Delete Sales Order" 
                              onClick={() => {
                                if (window.confirm(`Are you sure you want to delete Sales Order ${so.soNumber}?`)) {
                                  deleteSalesOrder(so.id);
                                }
                              }}
                            >
                              <Trash2 size={14} />
                            </button>
                            <button 
                              className="btn btn-primary" 
                              style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
                              onClick={() => {
                                generateWOFromSO(so.id);
                                setActiveModule('work-orders');
                              }}
                            >
                              <span>Generate WO</span>
                              <ArrowRight size={14} />
                            </button>
                          </>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: 'var(--success)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                            <CheckCircle2 size={14} /> WO Active (Locked)
                          </span>
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

      {/* Modal: Edit Sales Order */}
      {editingSO && (
        <Modal
          isOpen={true}
          onClose={() => setEditingSO(null)}
          title={`Edit Sales Order: ${editingSO.soNumber}`}
        >
          <form onSubmit={(e) => {
            e.preventDefault();
            updateSalesOrder(editingSO);
            setEditingSO(null);
          }} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.25rem' }}>SO Number</label>
                <input type="text" disabled className="input-field" value={editingSO.soNumber} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.25rem' }}>Customer</label>
                <AutocompleteSelect
                  options={customerOptions}
                  value={editingSO.customerId}
                  onChange={(val) => {
                    const cust = customers.find(c => c.id === val);
                    setEditingSO({ ...editingSO, customerId: val, customerName: cust ? cust.name : '' });
                  }}
                  placeholder="Select customer..."
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.25rem' }}>Ordered Machine Model</label>
              <AutocompleteSelect
                options={machineModelOptions}
                value={editingSO.machineModel}
                onChange={(val) => setEditingSO({ ...editingSO, machineModel: val })}
                placeholder="Type machine model..."
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.25rem' }}>Order Quantity</label>
                <input type="number" min="1" required className="input-field" value={editingSO.quantity} onChange={(e) => setEditingSO({ ...editingSO, quantity: Number(e.target.value) })} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.25rem' }}>Target Delivery Date</label>
                <input type="date" required className="input-field" value={editingSO.deliveryDate} onChange={(e) => setEditingSO({ ...editingSO, deliveryDate: e.target.value })} />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.25rem' }}>Client Customization Requests / Notes</label>
              <textarea className="input-field" rows={2} value={editingSO.customNotes || ''} onChange={(e) => setEditingSO({ ...editingSO, customNotes: e.target.value })} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setEditingSO(null)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Save Changes</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Export Field Selector Modal */}
      <ExportFieldSelectorModal<SalesOrder>
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        title="Custom Export Live Sheet Options"
        subfolder="SalesOrders"
        fileName="GEC_Filtered_SalesOrders_Live"
        data={filteredSOs}
        availableFields={availableExportFields}
      />

      {/* Feature-Wise Modular Print Manager Modal */}
      <PrintManagerModal
        isOpen={printModalOpen}
        onClose={() => { setPrintModalOpen(false); setSelectedPrintSO(null); }}
        title={printDocType === 'SINGLE_SO' ? `Print Sales Order Confirmation (${selectedPrintSO?.soNumber})` : `Print Sales Orders Report`}
        documentRefNumber={printDocType === 'SINGLE_SO' ? selectedPrintSO?.soNumber : 'SO-REPORT'}
      >
        {printDocType === 'SINGLE_SO' && selectedPrintSO ? (
          <SingleSOPrintView so={selectedPrintSO} customerDetails={customers.find(c => c.id === selectedPrintSO.customerId)} />
        ) : (
          <SOListPrintView salesOrders={filteredSOs} filterLabel={isHistorySearch ? 'All Active & Historical Sales Orders' : 'Active Sales Orders'} />
        )}
      </PrintManagerModal>
    </div>
  );
};
