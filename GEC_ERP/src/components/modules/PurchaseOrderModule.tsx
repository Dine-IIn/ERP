import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import { Modal } from '../common/Modal';
import { AutocompleteSelect, AutocompleteOption } from '../common/AutocompleteSelect';
import { PrintDocumentModal } from '../common/PrintDocumentModal';
import { ShoppingCart, Plus, Trash2, Edit2, Search, Printer, FileSpreadsheet, Send, AlertTriangle, CheckCircle2, XCircle, FileText, ArrowRight, ShieldCheck, ArrowUpDown, ArrowUp, ArrowDown, Percent, Hash, X } from 'lucide-react';
import { POLineItem, PurchaseOrder, Item, POStatus, ItemMappedVendor } from '../../types/erp';
import { ExportFieldSelectorModal, FieldOption } from '../common/ExportFieldSelectorModal';
import { useTableKeyboardNav } from '../../hooks/useTableKeyboardNav';

type POSortField = 'poNumber' | 'vendorName' | 'orderDate' | 'deliveryDate' | 'poCreateDateTime' | 'totalAmount';

export const PurchaseOrderModule: React.FC = () => {
  const { 
    purchaseOrders, vendors, items, addPurchaseOrder, updatePurchaseOrder, deletePurchaseOrder, 
    updatePOStatus, sendPODraftsForApproval, currentUser, searchTerm, setSearchTerm 
  } = useERP();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [printData, setPrintData] = useState<any>(null);

  // Edit PO Modal state
  const [editingPO, setEditingPO] = useState<PurchaseOrder | null>(null);
  const [isEditPOModalOpen, setIsEditPOModalOpen] = useState(false);

  // Single Column Sorting state
  const [sortField, setSortField] = useState<POSortField>('poNumber');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Smart PO Creation Wizard State
  const [wizardStep, setWizardStep] = useState<'SELECT_ITEM' | 'CONFIGURE_DISTRIBUTION'>('SELECT_ITEM');
  const [selectedItemForPO, setSelectedItemForPO] = useState<Item | null>(null);
  
  // Selected Vendor IDs and distribution mapping
  const [selectedVendorIds, setSelectedVendorIds] = useState<string[]>([]);
  const [vendorQtyMap, setVendorQtyMap] = useState<Record<string, number>>({});
  const [vendorDistributions, setVendorDistributions] = useState<Record<string, number>>({});

  // Calculate Net Effective Item Shortage
  const getItemEffectiveShortage = (item: Item) => {
    const totalCurrentStock = item.inHouseStock + item.externalStock;

    const pendingPOQty = purchaseOrders
      .filter(po => po.status !== 'GOODS_RECEIVED' && po.status !== 'CANCELLED')
      .reduce((sum, po) => {
        const poLine = po.items.find(l => l.itemId === item.id);
        if (poLine) {
          const qty = poLine.quantity || poLine.orderedQty || 0;
          const recd = poLine.receivedQty || 0;
          return sum + Math.max(0, qty - recd);
        }
        return sum;
      }, 0);

    const minReq = item.minStockQty || item.reorderLevel || 0;
    const netShortage = Math.max(0, minReq - (totalCurrentStock + pendingPOQty));
    return netShortage;
  };

  const shortageItems = items.filter(i => getItemEffectiveShortage(i) > 0);

  // Inline Status & Date Filters
  const [selectedPOStatusFilter, setSelectedPOStatusFilter] = useState<string>('ACTIVE_ONLY');
  const [startDateFilter, setStartDateFilter] = useState<string>('');
  const [endDateFilter, setEndDateFilter] = useState<string>('');

  const handleSortToggle = (field: POSortField) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const filteredPOs = purchaseOrders
    .filter(po => {
      const isSearchTermHistory = searchTerm.trim().startsWith('@');
      const cleanSearchTerm = isSearchTermHistory ? searchTerm.trim().substring(1).trim().toLowerCase() : searchTerm.trim().toLowerCase();

      const matchesSearch = 
        po.poNumber.toLowerCase().includes(cleanSearchTerm) ||
        po.vendorName.toLowerCase().includes(cleanSearchTerm) ||
        po.items.some(i => (i.itemName || '').toLowerCase().includes(cleanSearchTerm) || (i.itemCode || '').toLowerCase().includes(cleanSearchTerm));

      let matchesStatus = true;
      if (isSearchTermHistory) {
        matchesStatus = true;
      } else if (selectedPOStatusFilter === 'ACTIVE_ONLY') {
        matchesStatus = po.status !== 'GOODS_RECEIVED';
      } else if (selectedPOStatusFilter !== 'ALL') {
        matchesStatus = po.status === selectedPOStatusFilter;
      }

      const poDate = po.orderDate;
      const matchesStart = !startDateFilter || poDate >= startDateFilter;
      const matchesEnd = !endDateFilter || poDate <= endDateFilter;

      return matchesSearch && matchesStatus && matchesStart && matchesEnd;
    })
    .sort((a, b) => {
      let valA: any = a[sortField] || '';
      let valB: any = b[sortField] || '';

      if (sortField === 'totalAmount') {
        valA = Number(valA || 0);
        valB = Number(valB || 0);
      } else if (typeof valA === 'string') {
        valA = valA.toLowerCase();
        valB = valB.toLowerCase();
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

  const handleOpenModal = () => {
    setWizardStep('SELECT_ITEM');
    setSelectedItemForPO(null);
    setSelectedVendorIds([]);
    setVendorQtyMap({});
    setVendorDistributions({});
    setIsModalOpen(true);
  };

  const handleSelectItemForPO = (item: Item) => {
    setSelectedItemForPO(item);

    const baseShortage = getItemEffectiveShortage(item);
    const minOrder = item.minOrderQty || item.reorderLevel || 1;
    const targetBaseQty = Math.max(baseShortage, minOrder);

    const mapped = item.mappedVendors || [];
    let initialVendorId = '';
    if (mapped.length > 0) {
      const sortedMapped = [...mapped].sort((a, b) => ((a.priorityOrder || a.priority || 0) - (b.priorityOrder || b.priority || 0)));
      initialVendorId = sortedMapped[0].vendorId;
    } else if (vendors.length > 0) {
      initialVendorId = vendors[0].id;
    }

    setSelectedVendorIds(initialVendorId ? [initialVendorId] : []);
    setVendorQtyMap(initialVendorId ? { [initialVendorId]: targetBaseQty } : {});

    setWizardStep('CONFIGURE_DISTRIBUTION');
    setIsModalOpen(true);
  };

  const rebalanceVendorAllocations = (vendorIds: string[], baseItem: Item) => {
    if (vendorIds.length === 0) {
      setVendorQtyMap({});
      setVendorDistributions({});
      return;
    }

    const baseShortage = getItemEffectiveShortage(baseItem);
    const minOrder = baseItem.minOrderQty || baseItem.reorderLevel || 1;
    const totalTargetQty = Math.max(baseShortage, minOrder);

    const equalQty = Math.max(1, Math.floor(totalTargetQty / vendorIds.length));
    const equalPct = Number((100 / vendorIds.length).toFixed(1));

    const newQtyMap: Record<string, number> = {};
    const newDistMap: Record<string, number> = {};

    vendorIds.forEach((vid, idx) => {
      if (idx === vendorIds.length - 1) {
        const sumPrevious = Object.values(newQtyMap).reduce((s, q) => s + q, 0);
        newQtyMap[vid] = Math.max(1, totalTargetQty - sumPrevious);

        const sumPreviousPct = Object.values(newDistMap).reduce((s, p) => s + p, 0);
        newDistMap[vid] = Number((100 - sumPreviousPct).toFixed(1));
      } else {
        newQtyMap[vid] = equalQty;
        newDistMap[vid] = equalPct;
      }
    });

    setVendorQtyMap(newQtyMap);
    setVendorDistributions(newDistMap);
  };

  const handleGenerateDraftPOsFromWizard = () => {
    if (!selectedItemForPO || selectedVendorIds.length === 0) {
      alert('Please select at least one vendor to create Purchase Orders.');
      return;
    }

    let createdCount = 0;
    selectedVendorIds.forEach(vendorId => {
      const vendorObj = vendors.find(v => v.id === vendorId);
      if (!vendorObj) return;

      const orderQty = Math.max(1, vendorQtyMap[vendorId] || selectedItemForPO.minOrderQty || 1);
      const unitPrice = selectedItemForPO.unitPrice || 100;
      const amount = orderQty * unitPrice;

      const poNo = `PO-GEC-${String(purchaseOrders.length + createdCount + 1).padStart(3, '0')}`;
      const createDateTime = new Date().toISOString();

      addPurchaseOrder({
        poNumber: poNo,
        vendorId: vendorObj.id,
        vendorName: vendorObj.name,
        orderDate: new Date().toISOString().split('T')[0],
        expectedDeliveryDate: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
        deliveryDate: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
        poCreateDateTime: createDateTime,
        preparedBy: currentUser?.fullName || 'Store Manager',
        items: [{
          itemId: selectedItemForPO.id,
          itemCode: selectedItemForPO.itemCode,
          itemName: selectedItemForPO.name,
          quantity: orderQty,
          orderedQty: orderQty,
          receivedQty: 0,
          unit: selectedItemForPO.unit,
          unitPrice: unitPrice,
          totalAmount: amount,
          amount: amount
        }],
        notes: `System generated PO via Smart Wizard for ${selectedItemForPO.itemCode}.`
      });

      createdCount++;
    });

    setIsModalOpen(false);
    alert(`Successfully generated ${createdCount} Purchase Order(s)!`);
  };

  const handleSaveEditPO = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPO) return;

    const subtotal = editingPO.items.reduce((sum, item) => sum + ((item.quantity || item.orderedQty || 1) * (item.unitPrice || 0)), 0);
    const taxAmount = Math.round(subtotal * 0.18);
    const totalAmount = subtotal + taxAmount;

    updatePurchaseOrder({
      ...editingPO,
      subtotal,
      taxAmount,
      totalAmount
    });

    setIsEditPOModalOpen(false);
    setEditingPO(null);
  };

  const handlePrintPO = (po: PurchaseOrder) => {
    const v = vendors.find(v => v.id === po.vendorId) || {
      name: po.vendorName,
      address: 'Plot 45, GIDC Vatva Phase II',
      city: 'Ahmedabad',
      gstin: '24AAAPV9876K1Z3',
      contactPerson: 'Sales Manager',
      phone: '+91 98250 99887'
    };

    setPrintData({
      poNumber: po.poNumber,
      orderDate: po.orderDate,
      deliveryDate: po.deliveryDate || po.expectedDeliveryDate,
      vendorName: v.name,
      vendorAddress: v.address,
      vendorCity: v.city,
      vendorGstin: v.gstin,
      contactPerson: v.contactPerson,
      phone: v.phone,
      items: po.items.map(i => ({
        itemCode: i.itemCode || '',
        itemName: i.itemName || '',
        quantity: i.quantity || i.orderedQty || 1,
        unit: i.unit || 'PCS',
        unitPrice: i.unitPrice || 0,
        amount: (i.quantity || i.orderedQty || 1) * (i.unitPrice || 0)
      })),
      subtotal: po.subtotal || 0,
      taxAmount: po.taxAmount || 0,
      totalAmount: po.totalAmount || 0,
      notes: po.notes || 'Please acknowledge receipt of PO. Quality parameters strictly as per drawing specs.'
    });
    setPrintModalOpen(true);
  };

  // Keyboard Navigation Hook
  const { selectedIndex, setSelectedIndex } = useTableKeyboardNav(filteredPOs, handlePrintPO);

  const availablePOExportFields: FieldOption<PurchaseOrder>[] = [
    { key: 'poNumber', label: 'PO Number' },
    { key: 'vendorName', label: 'Vendor Name' },
    { key: 'orderDate', label: 'Order Date' },
    { key: 'deliveryDate', label: 'Expected Delivery Date' },
    { key: 'poCreateDateTime', label: 'Created Date & Time' },
    { key: 'preparedBy', label: 'Prepared By' },
    { key: 'totalAmount', label: 'Total Amount (₹)' },
    { key: 'status', label: 'PO Status' }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
        <button className="btn btn-outline" onClick={() => setIsExportModalOpen(true)}>
          <FileSpreadsheet size={16} /> Open Sheet ({filteredPOs.length} filtered)
        </button>
        <button id="btn-new-po" className="btn btn-primary" onClick={handleOpenModal}>
          <Plus size={16} /> Create New PO (Smart Wizard)
        </button>
      </div>

      {/* Shortage Items Alert Banner at Top */}
      {shortageItems.length > 0 && (
        <div className="card" style={{ padding: '0.875rem 1.25rem', backgroundColor: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <AlertTriangle size={20} color="var(--danger)" />
              <div>
                <span style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--danger)' }}>
                  Shortage Alert: {shortageItems.length} Item(s) Below Minimum Stock Requirement!
                </span>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Click "Order Shortage" on any item below to trigger instant smart PO wizard popup.
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              {shortageItems.slice(0, 3).map(item => {
                const shortage = getItemEffectiveShortage(item);

                return (
                  <button
                    key={item.id}
                    className="btn btn-outline"
                    style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem', color: 'var(--danger)', borderColor: 'var(--danger)' }}
                    onClick={() => handleSelectItemForPO(item)}
                  >
                    {item.itemCode}: Order {shortage} {item.unit}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Filter Bar with Lifecycle Status Filter */}
      <div className="card" style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', backgroundColor: 'var(--bg-card)' }}>
        <div style={{ position: 'relative', width: '340px', maxWidth: '100%' }}>
          <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search PO number, vendor... (use @ for history)"
            className="input-field"
            style={{ paddingLeft: '2.25rem' }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div>
            <label style={{ fontSize: '0.72rem', margin: 0 }}>PO Lifecycle View</label>
            <select className="input-field" style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem' }} value={selectedPOStatusFilter} onChange={(e) => setSelectedPOStatusFilter(e.target.value)}>
              <option value="ACTIVE_ONLY">Active POs (Hides Goods Received)</option>
              <option value="ALL">All Statuses (Including Goods Received)</option>
              <option value="DRAFT">Drafts</option>
              <option value="WAITING_FOR_APPROVAL">Waiting for Approval</option>
              <option value="APPROVED">Approved</option>
              <option value="SENT">Sent to Vendor</option>
              <option value="GOODS_RECEIVED">Goods Received (History)</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: '0.72rem', margin: 0 }}>Start Date</label>
            <input type="date" className="input-field" style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem' }} value={startDateFilter} onChange={(e) => setStartDateFilter(e.target.value)} />
          </div>
          <div>
            <label style={{ fontSize: '0.72rem', margin: 0 }}>End Date</label>
            <input type="date" className="input-field" style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem' }} value={endDateFilter} onChange={(e) => setEndDateFilter(e.target.value)} />
          </div>
        </div>
      </div>

      {/* PO Table */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th onClick={() => handleSortToggle('poNumber')} style={{ cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  PO Number {sortField === 'poNumber' ? (sortOrder === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} />) : <ArrowUpDown size={12} color="var(--text-muted)" />}
                </div>
              </th>
              <th onClick={() => handleSortToggle('vendorName')} style={{ cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  Vendor Name {sortField === 'vendorName' ? (sortOrder === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} />) : <ArrowUpDown size={12} color="var(--text-muted)" />}
                </div>
              </th>
              <th onClick={() => handleSortToggle('orderDate')} style={{ cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  Order Date {sortField === 'orderDate' ? (sortOrder === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} />) : <ArrowUpDown size={12} color="var(--text-muted)" />}
                </div>
              </th>
              <th onClick={() => handleSortToggle('deliveryDate')} style={{ cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  Expected Delivery {sortField === 'deliveryDate' ? (sortOrder === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} />) : <ArrowUpDown size={12} color="var(--text-muted)" />}
                </div>
              </th>
              <th onClick={() => handleSortToggle('poCreateDateTime')} style={{ cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  Created Date & Time {sortField === 'poCreateDateTime' ? (sortOrder === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} />) : <ArrowUpDown size={12} color="var(--text-muted)" />}
                </div>
              </th>
              <th>Prepared By</th>
              <th onClick={() => handleSortToggle('totalAmount')} style={{ cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  Total Amount {sortField === 'totalAmount' ? (sortOrder === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} />) : <ArrowUpDown size={12} color="var(--text-muted)" />}
                </div>
              </th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredPOs.map((po, idx) => {
              const isNavSelected = selectedIndex === idx;
              const statusClass = 
                po.status === 'GOODS_RECEIVED' ? 'badge-success' :
                po.status === 'APPROVED' ? 'badge-info' :
                po.status === 'WAITING_FOR_APPROVAL' ? 'badge-warning' :
                po.status === 'CANCELLED' ? 'badge-danger' : 'badge-neutral';

              const createdDisplay = po.poCreateDateTime 
                ? new Date(po.poCreateDateTime).toLocaleString('en-IN', { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' })
                : po.orderDate;

              return (
                <tr 
                  key={po.id}
                  onDoubleClick={() => handlePrintPO(po)}
                  onClick={() => setSelectedIndex(idx)}
                  style={{
                    backgroundColor: isNavSelected ? 'rgba(59, 130, 246, 0.18)' : 'transparent',
                    cursor: 'pointer'
                  }}
                  title="Double click or press Enter to view PO document"
                >
                  <td style={{ fontWeight: 700, color: 'var(--accent-primary)', fontFamily: 'monospace' }}>
                    {po.poNumber}
                  </td>
                  <td style={{ fontWeight: 600 }}>{po.vendorName}</td>
                  <td>{po.orderDate}</td>
                  <td>{po.deliveryDate || po.expectedDeliveryDate}</td>
                  <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{createdDisplay}</td>
                  <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{po.preparedBy || 'System User'}</td>
                  <td style={{ fontWeight: 800, color: 'var(--text-primary)' }}>
                    ₹{(po.totalAmount || 0).toLocaleString()}
                  </td>
                  <td>
                    <span className={`badge ${statusClass}`}>
                      {po.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                      <button className="btn btn-outline" style={{ padding: '0.3rem 0.5rem' }} title="Print PO Document" onClick={() => handlePrintPO(po)}>
                        <Printer size={14} />
                      </button>
                      <button className="btn btn-outline" style={{ padding: '0.3rem 0.5rem' }} title="Edit PO" onClick={() => { setEditingPO({ ...po }); setIsEditPOModalOpen(true); }}>
                        <Edit2 size={14} />
                      </button>
                      <button className="btn btn-outline" style={{ padding: '0.3rem 0.5rem', color: 'var(--danger)' }} title="Delete PO" onClick={() => {
                        if (window.confirm(`Are you sure you want to delete PO ${po.poNumber}? Any associated item shortage will reappear.`)) {
                          deletePurchaseOrder(po.id);
                        }
                      }}>
                        <Trash2 size={14} />
                      </button>
                      {po.status === 'DRAFT' && (
                        <button 
                          className="btn btn-outline" 
                          style={{ fontSize: '0.75rem', padding: '0.2rem 0.4rem', color: 'var(--warning)', borderColor: 'var(--warning)' }}
                          onClick={() => {
                            updatePOStatus(po.id, 'WAITING_FOR_APPROVAL');
                            alert(`PO ${po.poNumber} sent for approval!`);
                          }}
                        >
                          Send for Approval
                        </button>
                      )}
                      {po.status === 'WAITING_FOR_APPROVAL' && (
                        <button 
                          className="btn btn-primary" 
                          style={{ fontSize: '0.75rem', padding: '0.2rem 0.45rem' }}
                          onClick={() => {
                            updatePOStatus(po.id, 'APPROVED');
                            alert(`PO ${po.poNumber} Approved!`);
                          }}
                        >
                          Approve
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

      {/* Modal: Smart PO Creation Wizard Popup */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={wizardStep === 'SELECT_ITEM' ? 'Smart PO Creation Wizard - Step 1: Select Item' : `Smart PO Wizard - Step 2: Order Split & Vendor Allocation (${selectedItemForPO?.itemCode})`}
      >
        {wizardStep === 'SELECT_ITEM' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Select an item below to view Min Stock, Min Order Qty, Net Effective Shortage, and vendor priority allocation options:
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '360px', overflowY: 'auto' }}>
              {items.map(item => {
                const shortage = getItemEffectiveShortage(item);

                return (
                  <button
                    key={item.id}
                    type="button"
                    className="btn btn-outline"
                    style={{ justifyContent: 'space-between', padding: '0.75rem 1rem', textAlign: 'left', display: 'flex', alignItems: 'center' }}
                    onClick={() => handleSelectItemForPO(item)}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                        {item.itemCode} - {item.name}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        In-House: {item.inHouseStock} | External: {item.externalStock} | Min Stock: {item.minStockQty || item.reorderLevel} {item.unit}
                      </div>
                    </div>
                    <span className={`badge ${shortage > 0 ? 'badge-danger' : 'badge-neutral'}`} style={{ fontSize: '0.75rem' }}>
                      Shortage: {shortage} {item.unit}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          selectedItemForPO && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800 }}>{selectedItemForPO.name} ({selectedItemForPO.itemCode})</h4>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Unit Price: ₹{selectedItemForPO.unitPrice} | Unit: {selectedItemForPO.unit}</span>
                </div>
                <button type="button" className="btn btn-outline" style={{ fontSize: '0.75rem' }} onClick={() => setWizardStep('SELECT_ITEM')}>
                  Change Item
                </button>
              </div>

              {/* Vendor Allocation Selection */}
              <div>
                <label style={{ fontWeight: 700, fontSize: '0.85rem' }}>Select Target Vendor(s)</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem', maxHeight: '250px', overflowY: 'auto' }}>
                  {vendors.map(v => {
                    const isSelected = selectedVendorIds.includes(v.id);
                    return (
                      <div
                        key={v.id}
                        style={{
                          padding: '0.625rem 0.875rem',
                          borderRadius: '0.375rem',
                          border: `1px solid ${isSelected ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                          backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.1)' : 'var(--bg-card)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          cursor: 'pointer'
                        }}
                        onClick={() => {
                          const newIds = isSelected ? selectedVendorIds.filter(id => id !== v.id) : [...selectedVendorIds, v.id];
                          setSelectedVendorIds(newIds);
                          rebalanceVendorAllocations(newIds, selectedItemForPO);
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{v.name} ({v.vendorCode})</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{v.city} | GSTIN: {v.gstin}</div>
                        </div>
                        <input type="checkbox" checked={isSelected} onChange={() => {}} />
                      </div>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setWizardStep('SELECT_ITEM')}>Back</button>
                <button type="button" className="btn btn-primary" onClick={handleGenerateDraftPOsFromWizard}>
                  Generate Draft Purchase Order(s)
                </button>
              </div>
            </div>
          )
        )}
      </Modal>

      {/* Modal: Edit Existing PO Popup */}
      {editingPO && (
        <Modal
          isOpen={isEditPOModalOpen}
          onClose={() => { setIsEditPOModalOpen(false); setEditingPO(null); }}
          title={`Edit Purchase Order (${editingPO.poNumber})`}
        >
          <form onSubmit={handleSaveEditPO} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label>Vendor Name</label>
                <input type="text" disabled className="input-field" value={editingPO.vendorName} />
              </div>
              <div>
                <label>PO Status</label>
                <select 
                  className="input-field" 
                  value={editingPO.status} 
                  onChange={(e) => setEditingPO({ ...editingPO, status: e.target.value as POStatus })}
                >
                  <option value="DRAFT">DRAFT</option>
                  <option value="WAITING_FOR_APPROVAL">WAITING FOR APPROVAL</option>
                  <option value="APPROVED">APPROVED</option>
                  <option value="SENT">SENT TO VENDOR</option>
                  <option value="GOODS_RECEIVED">GOODS RECEIVED</option>
                  <option value="CANCELLED">CANCELLED</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label>Order Date</label>
                <input type="date" required className="input-field" value={editingPO.orderDate} onChange={(e) => setEditingPO({ ...editingPO, orderDate: e.target.value })} />
              </div>
              <div>
                <label>Expected Delivery Date</label>
                <input type="date" required className="input-field" value={editingPO.deliveryDate || editingPO.expectedDeliveryDate || ''} onChange={(e) => setEditingPO({ ...editingPO, deliveryDate: e.target.value })} />
              </div>
            </div>

            <div>
              <label style={{ fontWeight: 700, fontSize: '0.85rem' }}>PO Line Items</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.35rem' }}>
                {editingPO.items.map((item, idx) => {
                  const qty = item.quantity || item.orderedQty || 1;
                  const price = item.unitPrice || 0;
                  const itemTotal = qty * price;

                  return (
                    <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '0.5rem', alignItems: 'center', backgroundColor: 'var(--bg-tertiary)', padding: '0.5rem', borderRadius: '0.375rem' }}>
                      <div>
                        <strong>{item.itemName}</strong>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Code: {item.itemCode}</div>
                      </div>
                      <div>
                        <label style={{ fontSize: '0.7rem' }}>Quantity</label>
                        <input 
                          type="number" 
                          min="1" 
                          className="input-field" 
                          value={qty} 
                          onChange={(e) => {
                            const newQty = Number(e.target.value);
                            const updatedItems = [...editingPO.items];
                            updatedItems[idx] = { ...item, quantity: newQty, orderedQty: newQty, amount: newQty * price, totalAmount: newQty * price };
                            setEditingPO({ ...editingPO, items: updatedItems });
                          }} 
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.7rem' }}>Unit Price (₹)</label>
                        <input 
                          type="number" 
                          min="0" 
                          className="input-field" 
                          value={price} 
                          onChange={(e) => {
                            const newPrice = Number(e.target.value);
                            const updatedItems = [...editingPO.items];
                            updatedItems[idx] = { ...item, unitPrice: newPrice, amount: qty * newPrice, totalAmount: qty * newPrice };
                            setEditingPO({ ...editingPO, items: updatedItems });
                          }} 
                        />
                      </div>
                      <div style={{ textAlign: 'right', fontWeight: 700 }}>
                        ₹{itemTotal.toLocaleString()}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
              <button type="button" className="btn btn-secondary" onClick={() => { setIsEditPOModalOpen(false); setEditingPO(null); }}>Cancel</button>
              <button type="submit" className="btn btn-primary">Save PO Changes</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Print Document Modal */}
      {printData && (
        <PrintDocumentModal
          isOpen={printModalOpen}
          onClose={() => setPrintModalOpen(false)}
          title="Print Vendor Purchase Order"
          documentType="PO"
          data={printData}
        />
      )}

      {/* Export Field Selector Modal */}
      <ExportFieldSelectorModal<PurchaseOrder>
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        title="Custom Export Purchase Orders Live Sheet"
        subfolder="PurchaseOrders"
        fileName="GEC_Filtered_Purchase_Orders_Live"
        data={filteredPOs}
        availableFields={availablePOExportFields}
      />
    </div>
  );
};
