import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import { Modal } from '../common/Modal';
import { PrintDocumentModal } from '../common/PrintDocumentModal';
import { ShoppingCart, Plus, Trash2, Edit2, Search, Printer, FileSpreadsheet, Send, AlertTriangle, CheckCircle2, XCircle, FileText, ArrowRight, ShieldCheck, ArrowUpDown, ArrowUp, ArrowDown, Percent, Hash, ArrowLeft, X, AlertCircle } from 'lucide-react';
import { POLineItem, PurchaseOrder, Item, POStatus, ItemMappedVendor } from '../../types/erp';
import { ExportFieldSelectorModal, FieldOption } from '../common/ExportFieldSelectorModal';
import { useTableKeyboardNav } from '../../hooks/useTableKeyboardNav';

type POSortField = 'poNumber' | 'vendorName' | 'orderDate' | 'deliveryDate' | 'poCreateDateTime' | 'totalAmount';

export const PurchaseOrderModule: React.FC = () => {
  const { 
    purchaseOrders, vendors, items, workOrders, boms, addPurchaseOrder, updatePurchaseOrder, deletePurchaseOrder, 
    updatePOStatus, sendPODraftsForApproval, currentUser, searchTerm, setSearchTerm 
  } = useERP();
  
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isShortageModalOpen, setIsShortageModalOpen] = useState(false);
  const [selectedShortageItem, setSelectedShortageItem] = useState<Item | null>(null);

  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [printData, setPrintData] = useState<any>(null);

  // Edit PO state
  const [editingPO, setEditingPO] = useState<PurchaseOrder | null>(null);
  const [isEditPOModalOpen, setIsEditPOModalOpen] = useState(false);

  // Manual PO Creation State (without shortage)
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [manualPOForm, setManualPOForm] = useState({
    poNumber: '',
    vendorId: '',
    orderDate: new Date().toISOString().split('T')[0],
    expectedDeliveryDate: new Date(Date.now() + 10 * 86400000).toISOString().split('T')[0],
    notes: '',
    items: [] as POLineItem[]
  });
  const [manualSelectedItemId, setManualSelectedItemId] = useState('');
  const [manualItemQty, setManualItemQty] = useState(1);
  const [manualItemPrice, setManualItemPrice] = useState(0);

  // Single Column Sorting state
  const [sortField, setSortField] = useState<POSortField>('poNumber');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Single Selected Vendor & Qty State for Shortage PO Popup
  const [selectedVendorId, setSelectedVendorId] = useState<string>('');
  const [selectedPOQty, setSelectedPOQty] = useState<number>(1);
  const [wizardSearchTerm, setWizardSearchTerm] = useState('');

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

  // ONLY items with net shortage > 0 can have PO created
  const shortageItems = items.filter(i => getItemEffectiveShortage(i) > 0);

  // Filter Draft POs
  const draftPOs = purchaseOrders.filter(po => po.status === 'DRAFT');

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

  // Open Shortage PO Creation Modal for specific Item
  const handleOpenShortagePOModal = (item: Item) => {
    setSelectedShortageItem(item);

    const shortage = getItemEffectiveShortage(item);
    const moq = item.minOrderQty || item.reorderLevel || 1;
    const targetQty = Math.max(moq, shortage);
    setSelectedPOQty(targetQty);

    const mapped = item.mappedVendors || [];
    if (mapped.length > 0) {
      const sortedMapped = [...mapped].sort((a, b) => ((a.priorityOrder || a.priority || 0) - (b.priorityOrder || b.priority || 0)));
      // Select 1st Priority vendor by default
      setSelectedVendorId(sortedMapped[0].vendorId);
    } else {
      setSelectedVendorId('');
    }

    setIsShortageModalOpen(true);
    setIsWizardOpen(false);
  };

  // Generate PO with Automatic Draft Merging for same vendor in Draft stage
  const handleGeneratePOFromShortageModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShortageItem || !selectedVendorId) return;

    const vendorObj = vendors.find(v => v.id === selectedVendorId);
    if (!vendorObj) {
      alert('Selected vendor was not found in system.');
      return;
    }

    const unitPrice = selectedShortageItem.unitPrice || 0;
    const amount = selectedPOQty * unitPrice;

    // Check if a DRAFT PO already exists for this vendor
    const existingDraftPO = purchaseOrders.find(po => po.status === 'DRAFT' && po.vendorId === selectedVendorId);

    if (existingDraftPO) {
      // Merge into existing DRAFT PO for this vendor
      const itemExistsIndex = existingDraftPO.items.findIndex(l => l.itemId === selectedShortageItem.id);
      let updatedItems = [...existingDraftPO.items];

      if (itemExistsIndex >= 0) {
        // Accumulate quantity if item is already in draft PO
        const existingLine = updatedItems[itemExistsIndex];
        const newQty = (existingLine.quantity || existingLine.orderedQty || 0) + selectedPOQty;
        const newAmt = newQty * unitPrice;

        updatedItems[itemExistsIndex] = {
          ...existingLine,
          quantity: newQty,
          orderedQty: newQty,
          unitPrice: unitPrice,
          amount: newAmt,
          totalAmount: newAmt
        };
      } else {
        // Add new line item to existing draft PO
        updatedItems.push({
          itemId: selectedShortageItem.id,
          itemCode: selectedShortageItem.itemCode,
          itemName: selectedShortageItem.name,
          quantity: selectedPOQty,
          orderedQty: selectedPOQty,
          receivedQty: 0,
          unit: selectedShortageItem.unit,
          unitPrice: unitPrice,
          totalAmount: amount,
          amount: amount
        });
      }

      const subtotal = updatedItems.reduce((sum, i) => sum + ((i.quantity || i.orderedQty || 1) * (i.unitPrice || 0)), 0);
      const taxAmount = Math.round(subtotal * 0.18);
      const totalAmount = subtotal + taxAmount;

      updatePurchaseOrder({
        ...existingDraftPO,
        items: updatedItems,
        subtotal,
        taxAmount,
        totalAmount,
        notes: `${existingDraftPO.notes || ''} | Merged ${selectedShortageItem.itemCode} (${selectedPOQty} ${selectedShortageItem.unit}).`
      });

      setIsShortageModalOpen(false);
      setSelectedShortageItem(null);
      alert(`✅ Merged ${selectedShortageItem.itemCode} (${selectedPOQty} ${selectedShortageItem.unit}) into existing Draft PO ${existingDraftPO.poNumber} for ${vendorObj.name}!`);
    } else {
      // Create new DRAFT PO for this vendor
      const poNo = `PO-GEC-${String(purchaseOrders.length + 1).padStart(3, '0')}`;
      const createDateTime = new Date().toISOString();

      const subtotal = amount;
      const taxAmount = Math.round(subtotal * 0.18);
      const totalAmount = subtotal + taxAmount;

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
          itemId: selectedShortageItem.id,
          itemCode: selectedShortageItem.itemCode,
          itemName: selectedShortageItem.name,
          quantity: selectedPOQty,
          orderedQty: selectedPOQty,
          receivedQty: 0,
          unit: selectedShortageItem.unit,
          unitPrice: unitPrice,
          totalAmount: amount,
          amount: amount
        }],
        notes: `Draft PO created for ${selectedShortageItem.itemCode} (${selectedPOQty} ${selectedShortageItem.unit}).`
      });

      setIsShortageModalOpen(false);
      setSelectedShortageItem(null);
      alert(`✅ Draft Purchase Order ${poNo} created successfully for ${vendorObj.name}!`);
    }
  };

  const getItemCurrentDemand = (itemId: string, itemCode: string) => {
    let demand = 0;
    const activeWOs = workOrders.filter(w => w.status === 'IN_PROGRESS' || w.status === 'PLANNED');
    activeWOs.forEach(wo => {
      if (wo.woComponents && wo.woComponents.length > 0) {
        wo.woComponents.forEach(comp => {
          if (comp.itemId === itemId || comp.itemCode === itemCode) {
            demand += (comp.qtyRequired || 1);
          }
        });
      } else {
        const b = boms.find(bm => bm.machineModel === wo.machineModel || bm.id === wo.bomId);
        b?.components.forEach(comp => {
          if (comp.itemId === itemId || comp.itemCode === itemCode) {
            demand += (comp.qtyPerMachine * (wo.quantity || 1));
          }
        });
      }
    });
    return demand;
  };

  const handleOpenManualPOModal = () => {
    const nextNo = `PO-GEC-${String(purchaseOrders.length + 1).padStart(3, '0')}`;
    setManualPOForm({
      poNumber: nextNo,
      vendorId: '',
      orderDate: new Date().toISOString().split('T')[0],
      expectedDeliveryDate: new Date(Date.now() + 10 * 86400000).toISOString().split('T')[0],
      notes: '',
      items: []
    });
    setManualSelectedItemId('');
    setManualItemQty(1);
    setManualItemPrice(0);
    setIsManualModalOpen(true);
  };

  const handleSaveManualPO = (e: React.FormEvent) => {
    e.preventDefault();
    const itemObj = items.find(i => i.id === manualSelectedItemId);
    if (!itemObj) {
      alert('Please select an item to create the Purchase Order.');
      return;
    }
    const moq = itemObj.minOrderQty || 1;
    if (manualItemQty < moq) {
      alert(`❌ Order Quantity (${manualItemQty}) cannot be less than Minimum Order Quantity (MOQ: ${moq}).`);
      return;
    }
    if (!manualPOForm.vendorId) {
      alert('Please select a vendor.');
      return;
    }

    const vendorObj = vendors.find(v => v.id === manualPOForm.vendorId);
    const amount = manualItemQty * manualItemPrice;

    addPurchaseOrder({
      poNumber: manualPOForm.poNumber,
      vendorId: manualPOForm.vendorId,
      vendorName: vendorObj?.name || 'Manual Vendor',
      orderDate: manualPOForm.orderDate,
      expectedDeliveryDate: manualPOForm.expectedDeliveryDate,
      deliveryDate: manualPOForm.expectedDeliveryDate,
      poCreateDateTime: new Date().toISOString(),
      preparedBy: currentUser?.fullName || 'Admin',
      items: [{
        itemId: itemObj.id,
        itemCode: itemObj.itemCode,
        itemName: itemObj.name,
        quantity: manualItemQty,
        orderedQty: manualItemQty,
        receivedQty: 0,
        unit: itemObj.unit,
        unitPrice: manualItemPrice,
        amount: amount,
        totalAmount: amount
      }],
      notes: manualPOForm.notes || 'Manually created Purchase Order.'
    });

    setIsManualModalOpen(false);
    alert(`✅ Manual Purchase Order ${manualPOForm.poNumber} created successfully for ${itemObj.itemCode}!`);
  };

  // Save edits on PO (If PO was APPROVED, require re-approval by setting status to WAITING_FOR_APPROVAL)
  const handleSaveEditPO = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPO) return;

    const subtotal = editingPO.items.reduce((sum, item) => sum + ((item.quantity || item.orderedQty || 1) * (item.unitPrice || 0)), 0);
    const taxAmount = Math.round(subtotal * 0.18);
    const totalAmount = subtotal + taxAmount;

    // Check if PO was approved
    const wasApproved = editingPO.status === 'APPROVED';
    const newStatus = wasApproved ? 'WAITING_FOR_APPROVAL' : editingPO.status;

    updatePurchaseOrder({
      ...editingPO,
      status: newStatus,
      subtotal,
      taxAmount,
      totalAmount
    });

    setIsEditPOModalOpen(false);
    setEditingPO(null);

    if (wasApproved) {
      alert(`⚠️ Approved PO ${editingPO.poNumber} was modified. It has been sent back for re-approval.`);
    } else {
      alert(`✅ PO ${editingPO.poNumber} updated successfully.`);
    }
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

  const wizardShortageItemsFiltered = shortageItems.filter(item => {
    const term = wizardSearchTerm.trim().toLowerCase();
    if (!term) return true;
    return (
      item.itemCode.toLowerCase().includes(term) ||
      item.name.toLowerCase().includes(term) ||
      item.category.toLowerCase().includes(term) ||
      (item.partCode && item.partCode.toLowerCase().includes(term))
    );
  });

  return (
    <div className="module-layout-container">
      
      {/* Top Action Header */}
      <div className="sticky-module-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {isWizardOpen && (
            <button className="btn btn-outline" style={{ padding: '0.35rem 0.65rem', gap: '0.35rem', fontWeight: 600 }} onClick={() => setIsWizardOpen(false)}>
              <ArrowLeft size={16} /> Back to PO List <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>(ESC)</span>
            </button>
          )}
          <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
            {isWizardOpen ? 'Select Shortage Item to Generate Purchase Order' : `All Purchase Orders (${filteredPOs.length})`}
          </span>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Send All Draft POs for Approval Button */}
          {draftPOs.length > 0 && !isWizardOpen && (
            <button 
              className="btn btn-warning" 
              style={{ fontWeight: 700, padding: '0.45rem 0.85rem', gap: '0.4rem', color: '#ffffff', backgroundColor: 'var(--warning)', border: 'none' }}
              onClick={() => {
                const ids = draftPOs.map(p => p.id);
                sendPODraftsForApproval(ids);
                alert(`✅ Successfully sent ${ids.length} Draft Purchase Order(s) for Approval!`);
              }}
            >
              <Send size={16} /> Send All Draft POs for Approval ({draftPOs.length})
            </button>
          )}

          <button className="btn btn-outline" onClick={() => setIsExportModalOpen(true)}>
            <FileSpreadsheet size={16} /> Open Sheet ({filteredPOs.length} filtered)
          </button>
          {!isWizardOpen && (
            <>
              <button className="btn btn-outline" onClick={() => { setIsWizardOpen(true); setWizardSearchTerm(''); }}>
                <AlertTriangle size={16} color="var(--warning)" /> Shortage PO Wizard
              </button>
              <button id="btn-new-po" className="btn btn-primary" onClick={handleOpenManualPOModal}>
                <Plus size={16} /> Create Manual PO
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main View: Wizard Page Panel OR Standard PO List */}
      {isWizardOpen ? (
        /* In-Screen Panel: Select Shortage Item (Only Shortage Items Listed) */
        <div className="card" style={{ padding: '1.25rem', backgroundColor: 'var(--bg-card)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
              Select Shortage Item to Generate PO
            </h3>
            <button type="button" className="btn btn-outline" style={{ padding: '0.25rem 0.5rem', fontSize: '0.78rem' }} onClick={() => setIsWizardOpen(false)}>
              <X size={15} /> Close (ESC)
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Search Bar for Shortage Items */}
            <div style={{ position: 'relative', width: '100%' }}>
              <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search shortage item code, description, category..."
                className="input-field"
                style={{ paddingLeft: '2.25rem' }}
                value={wizardSearchTerm}
                onChange={(e) => setWizardSearchTerm(e.target.value)}
              />
            </div>

            {shortageItems.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', backgroundColor: 'var(--bg-tertiary)', borderRadius: '0.5rem', color: 'var(--success)' }}>
                <CheckCircle2 size={32} style={{ marginBottom: '0.5rem' }} />
                <div style={{ fontWeight: 700, fontSize: '1rem' }}>All items have sufficient stock levels!</div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  No material shortages currently exist. PO creation is restricted to shortage items only.
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '420px', overflowY: 'auto' }}>
                {wizardShortageItemsFiltered.map(item => {
                  const shortage = getItemEffectiveShortage(item);

                  return (
                    <button
                      key={item.id}
                      type="button"
                      className="btn btn-outline"
                      style={{ justifyContent: 'space-between', padding: '0.875rem 1.25rem', textAlign: 'left', display: 'flex', alignItems: 'center' }}
                      onClick={() => handleOpenShortagePOModal(item)}
                    >
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                          {item.itemCode} - {item.name}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                          In-House: {item.inHouseStock} | External: {item.externalStock} | Min Stock: {item.minStockQty || 5} {item.unit} | MOQ: {item.minOrderQty || 5} {item.unit}
                        </div>
                      </div>
                      <span className="badge badge-danger" style={{ fontSize: '0.82rem', padding: '0.35rem 0.65rem', fontWeight: 800 }}>
                        Shortage: {shortage} {item.unit}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* Red Shortage Items Alert Banner at Top */}
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
                      Click on any red item button below to open shortage details and generate PO.
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                  {shortageItems.map(item => {
                    const shortage = getItemEffectiveShortage(item);

                    return (
                      <button
                        key={item.id}
                        type="button"
                        className="btn"
                        style={{ 
                          fontSize: '0.78rem', 
                          padding: '0.35rem 0.75rem', 
                          backgroundColor: 'var(--danger)', 
                          color: '#ffffff', 
                          fontWeight: 700,
                          border: 'none',
                          borderRadius: '0.375rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.35rem'
                        }}
                        onClick={() => handleOpenShortagePOModal(item)}
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
                  <option value="DRAFT">Drafts ({draftPOs.length})</option>
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
                  <th>Ordered / Received Qty</th>
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
                    po.status === 'DRAFT' ? 'badge-neutral' :
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
                        {po.status === 'DRAFT' && <span className="badge badge-warning" style={{ fontSize: '0.65rem', marginLeft: '0.4rem' }}>DRAFT</span>}
                      </td>
                      <td style={{ fontWeight: 600 }}>{po.vendorName}</td>
                      <td>{po.orderDate}</td>
                      <td>{po.deliveryDate || po.expectedDeliveryDate}</td>
                      <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{createdDisplay}</td>
                      <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{po.preparedBy || 'System User'}</td>
                      <td>
                        {(() => {
                          const totalOrdered = po.items.reduce((sum, it) => sum + (it.quantity || it.orderedQty || 1), 0);
                          const totalReceived = po.items.reduce((sum, it) => sum + (it.receivedQty || 0), 0);
                          const totalBalance = Math.max(0, totalOrdered - totalReceived);
                          const isComplete = totalReceived >= totalOrdered && totalOrdered > 0;

                          return (
                            <div>
                              <div style={{ fontWeight: 700, fontSize: '0.82rem', color: isComplete ? 'var(--success)' : totalReceived > 0 ? 'var(--warning)' : 'var(--text-primary)' }}>
                                {totalReceived} / {totalOrdered} Recd
                              </div>
                              {totalBalance > 0 && (
                                <span style={{ fontSize: '0.72rem', color: 'var(--danger)', fontWeight: 600 }}>
                                  ({totalBalance} Pending)
                                </span>
                              )}
                            </div>
                          );
                        })()}
                      </td>
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
                            <div style={{ display: 'flex', gap: '0.25rem' }}>
                              <button 
                                className="btn btn-primary" 
                                style={{ fontSize: '0.75rem', padding: '0.2rem 0.45rem', backgroundColor: 'var(--success)', borderColor: 'var(--success)' }}
                                title="Approve PO"
                                onClick={() => {
                                  updatePOStatus(po.id, 'APPROVED');
                                  alert(`✅ PO ${po.poNumber} Approved!`);
                                }}
                              >
                                Approve
                              </button>
                              <button 
                                className="btn btn-outline" 
                                style={{ fontSize: '0.75rem', padding: '0.2rem 0.45rem', color: 'var(--danger)', borderColor: 'var(--danger)' }}
                                title="Reject PO"
                                onClick={() => {
                                  if (window.confirm(`Reject PO ${po.poNumber}? It will be returned to Draft status for revisions.`)) {
                                    updatePOStatus(po.id, 'DRAFT');
                                    alert(`❌ PO ${po.poNumber} Rejected and returned to Draft.`);
                                  }
                                }}
                              >
                                Reject
                              </button>
                            </div>
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

      {/* POPUP MODAL: Shortage PO Generation & Vendor Priority Selector */}
      {selectedShortageItem && (
        <Modal
          isOpen={isShortageModalOpen}
          onClose={() => setIsShortageModalOpen(false)}
          title={`Generate Draft Purchase Order - ${selectedShortageItem.itemCode}`}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Grid of Item Shortage Details */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem', padding: '0.875rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: '0.5rem', border: '1px solid var(--border-color)' }}>
              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Item Name</span>
                <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{selectedShortageItem.name}</div>
              </div>
              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Min Stock</span>
                <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{selectedShortageItem.minStockQty || 5} {selectedShortageItem.unit}</div>
              </div>
              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>MOQ (Min Order Qty)</span>
                <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{selectedShortageItem.minOrderQty || 5} {selectedShortageItem.unit}</div>
              </div>
              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Current Inventory</span>
                <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{selectedShortageItem.inHouseStock + selectedShortageItem.externalStock} {selectedShortageItem.unit}</div>
              </div>
              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Net Shortage</span>
                <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--danger)' }}>{getItemEffectiveShortage(selectedShortageItem)} {selectedShortageItem.unit}</div>
              </div>
              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Unit Price</span>
                <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>₹{selectedShortageItem.unitPrice}</div>
              </div>
            </div>

            {/* Fixed PO Order Qty (Max of MOQ & Shortage) & PO Calculated Price */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', alignItems: 'center', padding: '0.75rem 1rem', backgroundColor: 'rgba(59, 130, 246, 0.08)', borderRadius: '0.5rem', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Fixed PO Order Quantity (Max of MOQ & Shortage)</span>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.15rem' }}>
                  {selectedPOQty} {selectedShortageItem.unit}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Calculated Total PO Price (excl GST)</span>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--accent-primary)', marginTop: '0.15rem' }}>
                  ₹{(selectedPOQty * (selectedShortageItem.unitPrice || 0)).toLocaleString()}
                </div>
              </div>
            </div>

            {/* Vendor Priority Selection Section */}
            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 800, display: 'block', marginBottom: '0.5rem' }}>
                Mapped Vendor Priority Selection
              </label>

              {(!selectedShortageItem.mappedVendors || selectedShortageItem.mappedVendors.length === 0) ? (
                /* WARNING IF NO VENDOR IS MAPPED IN ITEM MASTER */
                <div style={{ padding: '0.875rem 1rem', backgroundColor: 'rgba(239, 68, 68, 0.12)', border: '1.5px solid var(--danger)', borderRadius: '0.5rem', color: 'var(--danger)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800, fontSize: '0.9rem' }}>
                    <AlertTriangle size={18} /> ⚠️ Warning: No vendor is mapped for this item in Item Master!
                  </div>
                  <div style={{ fontSize: '0.8rem', marginTop: '0.35rem', color: 'var(--text-primary)' }}>
                    PO cannot be generated for <strong>{selectedShortageItem.itemCode}</strong> because no vendor is assigned to it. Please go to <strong>Item Master → Edit Item → Preferred Vendors</strong> to map a vendor first.
                  </div>
                </div>
              ) : (
                /* List Mapped Vendors Only (Single Vendor Select via Radio Button) */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {selectedShortageItem.mappedVendors
                    .sort((a, b) => ((a.priorityOrder || a.priority || 0) - (b.priorityOrder || b.priority || 0)))
                    .map((mv, idx) => {
                      const vendorObj = vendors.find(v => v.id === mv.vendorId);
                      const isSelected = selectedVendorId === mv.vendorId;

                      return (
                        <div
                          key={mv.vendorId}
                          style={{
                            padding: '0.75rem 1rem',
                            borderRadius: '0.5rem',
                            border: `2px solid ${isSelected ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                            backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.12)' : 'var(--bg-card)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            cursor: 'pointer'
                          }}
                          onClick={() => setSelectedVendorId(mv.vendorId)}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <input 
                              type="radio" 
                              name="selectedVendorRadio" 
                              checked={isSelected} 
                              onChange={() => setSelectedVendorId(mv.vendorId)} 
                              style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                            />
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span className="badge badge-info" style={{ fontWeight: 800, padding: '0.2rem 0.45rem' }}>
                                  Priority #{idx + 1}
                                </span>
                                <strong style={{ fontSize: '0.92rem' }}>{mv.vendorName || vendorObj?.name}</strong>
                              </div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                                GSTIN: {vendorObj?.gstin || 'N/A'} | City: {vendorObj?.city || 'Local'}
                              </div>
                            </div>
                          </div>

                          {isSelected && (
                            <span className="badge badge-success" style={{ fontWeight: 700 }}>
                              Selected
                            </span>
                          )}
                        </div>
                      );
                    })}
                </div>
              )}
            </div>

            {/* Modal Action Buttons - Completely Hide Generate PO button if no mapped vendor */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.875rem' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setIsShortageModalOpen(false)}>Cancel (ESC)</button>
              {selectedShortageItem.mappedVendors && selectedShortageItem.mappedVendors.length > 0 && selectedVendorId && (
                <button 
                  type="button" 
                  className="btn btn-primary"
                  onClick={handleGeneratePOFromShortageModal}
                  style={{ fontWeight: 700, padding: '0.5rem 1.25rem' }}
                >
                  Create Draft Purchase Order ({selectedPOQty} {selectedShortageItem.unit})
                </button>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Edit Existing PO Modal Overlay */}
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
              <button type="button" className="btn btn-secondary" onClick={() => { setIsEditPOModalOpen(false); setEditingPO(null); }}>Cancel (ESC)</button>
              <button type="submit" className="btn btn-primary">Save PO Changes</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Manual PO Creation Modal */}
      {isManualModalOpen && (() => {
        const selectedItemObj = items.find(i => i.id === manualSelectedItemId);
        const currentDemand = selectedItemObj ? getItemCurrentDemand(selectedItemObj.id, selectedItemObj.itemCode) : 0;
        const moq = selectedItemObj?.minOrderQty || 1;
        const totalEstimatedAmount = manualItemQty * manualItemPrice;

        return (
          <Modal
            isOpen={isManualModalOpen}
            onClose={() => setIsManualModalOpen(false)}
            title={`Create Manual Purchase Order (${manualPOForm.poNumber})`}
          >
            <form onSubmit={handleSaveManualPO} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              
              {/* 1. Item Selection First */}
              <div>
                <label style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>1. Select Item to Purchase *</label>
                <select 
                  className="input-field" 
                  required 
                  style={{ border: '2px solid var(--accent-primary)', fontWeight: 600 }}
                  value={manualSelectedItemId} 
                  onChange={(e) => {
                    const itId = e.target.value;
                    setManualSelectedItemId(itId);
                    const it = items.find(i => i.id === itId);
                    if (it) {
                      setManualItemQty(it.minOrderQty || 1);
                      setManualItemPrice(it.unitPrice || 0);
                      if (it.mappedVendors && it.mappedVendors.length > 0) {
                        setManualPOForm(prev => ({ ...prev, vendorId: it.mappedVendors![0].vendorId }));
                      }
                    }
                  }}
                >
                  <option value="" disabled>-- Select Item to Order --</option>
                  {items.map(it => (
                    <option key={it.id} value={it.id}>
                      {it.itemCode} - {it.name} [{it.category}] ({it.processType || 'Brought out'})
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. Stock & Demand Overview Banner */}
              {selectedItemObj && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', padding: '0.75rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: '0.5rem', border: '1px solid var(--border-color)' }}>
                  <div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block' }}>Current In-House Stock:</span>
                    <strong style={{ fontSize: '0.95rem', color: selectedItemObj.inHouseStock <= (selectedItemObj.reorderLevel || 0) ? 'var(--danger)' : 'var(--success)' }}>
                      {selectedItemObj.inHouseStock} {selectedItemObj.unit}
                    </strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block' }}>Current Demand (Active WOs):</span>
                    <strong style={{ fontSize: '0.95rem', color: 'var(--accent-primary)' }}>
                      {currentDemand} {selectedItemObj.unit}
                    </strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block' }}>Minimum Order Qty (MOQ):</span>
                    <strong style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                      {moq} {selectedItemObj.unit}
                    </strong>
                  </div>
                </div>
              )}

              {/* 3. Order Quantity (cannot be less than MOQ) & Unit Price */}
              <div className="form-grid-2">
                <div>
                  <label style={{ fontWeight: 700 }}>
                    2. Order Quantity * <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>(Min MOQ: {moq})</span>
                  </label>
                  <input 
                    type="number" 
                    required 
                    min={moq} 
                    className="input-field" 
                    value={manualItemQty} 
                    onChange={(e) => setManualItemQty(Number(e.target.value))} 
                  />
                  {manualItemQty < moq && (
                    <span style={{ fontSize: '0.72rem', color: 'var(--danger)', fontWeight: 600 }}>
                      ⚠️ Quantity cannot be less than MOQ ({moq} {selectedItemObj?.unit || 'PCS'})
                    </span>
                  )}
                </div>
                <div>
                  <label style={{ fontWeight: 700 }}>Unit Purchase Price (₹) *</label>
                  <input 
                    type="number" 
                    required 
                    min="0" 
                    step="0.01"
                    className="input-field" 
                    value={manualItemPrice} 
                    onChange={(e) => setManualItemPrice(Number(e.target.value))} 
                  />
                </div>
              </div>

              {/* 4. Select Vendor */}
              <div>
                <label style={{ fontWeight: 700 }}>3. Select Vendor *</label>
                <select 
                  className="input-field" 
                  required 
                  value={manualPOForm.vendorId} 
                  onChange={(e) => setManualPOForm({ ...manualPOForm, vendorId: e.target.value })}
                >
                  <option value="" disabled>-- Select Vendor --</option>
                  {vendors.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.name} ({v.vendorCode}) - {v.city || 'Vendor'}
                    </option>
                  ))}
                </select>
              </div>

              {/* 5. Expected Delivery Date & PO Number */}
              <div className="form-grid-2">
                <div>
                  <label style={{ fontWeight: 700 }}>4. Expected Delivery Date *</label>
                  <input 
                    type="date" 
                    required 
                    className="input-field" 
                    value={manualPOForm.expectedDeliveryDate} 
                    onChange={(e) => setManualPOForm({ ...manualPOForm, expectedDeliveryDate: e.target.value })} 
                  />
                </div>
                <div>
                  <label>PO Number Reference</label>
                  <input 
                    type="text" 
                    readOnly 
                    className="input-field" 
                    style={{ fontWeight: 700, color: 'var(--accent-primary)', backgroundColor: 'var(--bg-tertiary)' }} 
                    value={manualPOForm.poNumber} 
                  />
                </div>
              </div>

              {/* 6. Purchase Terms / Notes */}
              <div>
                <label>5. Purchase Terms / Notes</label>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="e.g. Expedited delivery requested by plant lead" 
                  value={manualPOForm.notes} 
                  onChange={(e) => setManualPOForm({ ...manualPOForm, notes: e.target.value })} 
                />
              </div>

              {/* Total Summary Row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.65rem 0.85rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: '0.375rem', fontWeight: 700 }}>
                <span>Estimated PO Value:</span>
                <span style={{ color: 'var(--success)', fontSize: '1.05rem', fontFamily: 'monospace' }}>
                  ₹{totalEstimatedAmount.toLocaleString()}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsManualModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create Purchase Order</button>
              </div>
            </form>
          </Modal>
        );
      })()}

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
