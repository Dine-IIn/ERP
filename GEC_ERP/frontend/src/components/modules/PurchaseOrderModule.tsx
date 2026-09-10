import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import { Modal } from '../common/Modal';
import { PrintManagerModal } from '../printTemplates/PrintManagerModal';
import { SinglePOPrintView, POListPrintView } from '../printTemplates/POPrintTemplates';
import { TabularShortagePrintView, TabularShortageRow } from '../printTemplates/ShortagePrintTemplates';
import { ShoppingCart, Plus, Trash2, Edit2, Search, Printer, FileSpreadsheet, Send, AlertTriangle, CheckCircle2, XCircle, FileText, ArrowRight, ShieldCheck, ArrowUpDown, ArrowUp, ArrowDown, Percent, Hash, ArrowLeft, X, AlertCircle, RefreshCw, Layers } from 'lucide-react';
import { POLineItem, PurchaseOrder, Item, POStatus, ItemMappedVendor, generateNextPONumber } from '../../types/erp';
import { useTableKeyboardNav } from '../../hooks/useTableKeyboardNav';

type POSortField = 'poNumber' | 'vendorName' | 'orderDate' | 'deliveryDate' | 'poCreateDateTime' | 'totalAmount';

export const PurchaseOrderModule: React.FC = () => {
  const { 
    purchaseOrders, vendors, items, workOrders, boms, addPurchaseOrder, updatePurchaseOrder, deletePurchaseOrder, 
    updatePOStatus, sendPODraftsForApproval, resubmitPOForApproval, currentUser, searchTerm, setSearchTerm 
  } = useERP();
  
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isShortageModalOpen, setIsShortageModalOpen] = useState(false);
  const [selectedShortageItem, setSelectedShortageItem] = useState<Item | null>(null);
  const [isExplodeShortage, setIsExplodeShortage] = useState(false);
  const [isShortagePrintOpen, setIsShortagePrintOpen] = useState(false);

    const [printModalOpen, setPrintModalOpen] = useState(false);
  const [printDocType, setPrintDocType] = useState<'SINGLE_PO' | 'PO_LIST'>('PO_LIST');
  const [selectedPrintPO, setSelectedPrintPO] = useState<PurchaseOrder | null>(null);

  // Edit PO state
  const [editingPO, setEditingPO] = useState<PurchaseOrder | null>(null);
  const [isEditPOModalOpen, setIsEditPOModalOpen] = useState(false);

  // Cancellation Challan state (for POs sent to vendor)
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancellingPO, setCancellingPO] = useState<PurchaseOrder | null>(null);
  const [cancellationReason, setCancellationReason] = useState('');

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

  // Helper: Open PO Quantity
  const getOpenPOQuantity = (item: Item) => {
    return purchaseOrders
      .filter(po => po.status !== 'GOODS_RECEIVED' && po.status !== 'CANCELLED' && po.status !== 'REJECTED')
      .reduce((sum, po) => {
        const line = po.items.find(pi => pi.itemId === item.id || pi.itemCode === item.itemCode);
        if (!line) return sum;
        const ordered = line.quantity || line.orderedQty || 0;
        const received = line.receivedQty || 0;
        return sum + Math.max(0, ordered - received);
      }, 0);
  };

  // Helper: Item Work Order Demand (Multi-Level Exploded & woComponents supported)
  const getItemWorkOrderDemand = (itemId: string, itemCode: string) => {
    let demand = 0;
    const activeWOs = workOrders.filter(w => w.status !== 'COMPLETED' && w.status !== 'CANCELLED');

    const explodeDemand = (
      components: Array<{ itemId?: string; itemCode?: string; qtyPerMachine?: number; qtyRequired?: number }>,
      multiplier: number,
      visited = new Set<string>()
    ) => {
      components.forEach(comp => {
        const cItemId = comp.itemId || '';
        const cItemCode = comp.itemCode || '';
        const qtyPer = comp.qtyPerMachine !== undefined ? comp.qtyPerMachine : (comp.qtyRequired || 1);
        const totalCompQty = qtyPer * multiplier;

        if (
          (itemId && cItemId && cItemId === itemId) ||
          (itemCode && cItemCode && cItemCode.toLowerCase() === itemCode.toLowerCase())
        ) {
          demand += totalCompQty;
        }

        // Check if child component has its own BOM (Multi-level Sub-Assembly)
        const childItem = items.find(i => (cItemId && i.id === cItemId) || (cItemCode && i.itemCode.toLowerCase() === cItemCode.toLowerCase()));
        if (childItem) {
          const subBOM = boms.find(b => b.id === childItem.id || b.bomCode?.toLowerCase() === childItem.itemCode.toLowerCase() || b.machineModel?.toLowerCase() === childItem.name?.toLowerCase());
          if (subBOM && subBOM.components && subBOM.components.length > 0 && !visited.has(subBOM.id)) {
            const nextVisited = new Set(visited);
            nextVisited.add(subBOM.id);
            explodeDemand(subBOM.components, totalCompQty, nextVisited);
          }
        }
      });
    };

    activeWOs.forEach(wo => {
      const remainingQty = Math.max(0, (wo.targetQuantity || wo.quantity || 1) - (wo.completedQuantity || 0));
      if (remainingQty <= 0) return;

      if (wo.woComponents && wo.woComponents.length > 0) {
        explodeDemand(wo.woComponents.map(c => ({
          itemId: c.itemId,
          itemCode: c.itemCode,
          qtyPerMachine: c.qtyRequired ? c.qtyRequired / (wo.quantity || wo.targetQuantity || 1) : 1
        })), remainingQty);
      } else {
        const bom = boms.find(b => b.id === wo.bomId || b.bomCode === (wo as any).bomCode || b.machineModel?.toLowerCase() === wo.machineModel?.toLowerCase());
        if (bom && bom.components) {
          explodeDemand(bom.components, remainingQty, new Set([bom.id]));
        }
      }
    });

    return demand;
  };

  // Calculate Net Effective Item Shortage: z + shortage = x + y  =>  shortage = (x + y) - z
  const getItemEffectiveShortage = (item: Item) => {
    const totalCurrentStock = (item.inHouseStock || 0) + (item.externalStock || 0);
    const demandQty = getItemWorkOrderDemand(item.id, item.itemCode);
    const minStock = item.minStockQty !== undefined ? item.minStockQty : (item.reorderLevel || 0);

    const pendingPOQty = getOpenPOQuantity(item);

    const totalRequirement = demandQty + minStock;
    const totalAvailable = totalCurrentStock + pendingPOQty;
    const netShortage = Math.max(0, totalRequirement - totalAvailable);
    return netShortage;
  };

  // Helper to test if item is Bought-Out
  const isBoughtOutItem = (item: Item) => {
    const p = (item.processType || (item as any).materialProcessType || '').toLowerCase();
    const cat = (item.category || '').toUpperCase();
    return p.includes('brought out') || p.includes('bought out') || p.includes('brought_out') || cat === 'BO';
  };

  // ONLY Bought-Out items with net shortage > 0 can have PO created
  const shortageItems = items.filter(i => isBoughtOutItem(i) && !i.isBlocked && getItemEffectiveShortage(i) > 0);

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

  // Universal @history & @deleted search handling
  const isHistorySearch = searchTerm.toLowerCase().includes('@history') || searchTerm.toLowerCase().includes('@deleted') || searchTerm.trim().startsWith('@');
  const cleanSearchTerm = searchTerm.replace(/@history|@deleted/gi, '').replace(/^@/g, '').trim().toLowerCase();

  const filteredPOs = purchaseOrders
    .filter(po => {
      const isCompleted = po.status === 'GOODS_RECEIVED' || (po.status as string) === 'RECEIVED' || po.status === 'CANCELLED' || (po as any).isArchived || po.isDeleted;

      // By default show active unless @history or @deleted is typed
      if (!isHistorySearch && (po.isDeleted || isCompleted)) {
        return false;
      }

      const matchesSearch = !cleanSearchTerm || (
        po.poNumber.toLowerCase().includes(cleanSearchTerm) ||
        po.vendorName.toLowerCase().includes(cleanSearchTerm) ||
        po.items.some(i => (i.itemName || '').toLowerCase().includes(cleanSearchTerm) || (i.itemCode || '').toLowerCase().includes(cleanSearchTerm))
      );

      let matchesStatus = true;
      if (isHistorySearch || selectedPOStatusFilter === 'ALL' || selectedPOStatusFilter === 'ACTIVE_ONLY') {
        matchesStatus = true;
      } else {
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

  const handlePrintSinglePO = (po: PurchaseOrder) => {
    setSelectedPrintPO(po);
    setPrintDocType('SINGLE_PO');
    setPrintModalOpen(true);
  };

  const handlePrintPOList = () => {
    setPrintDocType('PO_LIST');
    setPrintModalOpen(true);
  };

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
      const poNo = generateNextPONumber(purchaseOrders);
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
    const nextNo = generateNextPONumber(purchaseOrders);
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

  // Save edits on PO (Enforces MOQ constraint)
  const handleSaveEditPO = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPO) return;

    // Validate MOQ for each line item
    for (const it of editingPO.items) {
      const itemObj = items.find(i => i.id === it.itemId || i.itemCode === it.itemCode);
      const moq = itemObj?.minOrderQty || 1;
      const qty = it.quantity || it.orderedQty || 0;
      if (qty < moq) {
        alert(`⚠️ Item "${it.itemCode}" has a Minimum Order Quantity (MOQ) of ${moq} ${it.unit || 'units'}. Quantity cannot be less than ${moq}.`);
        return;
      }
    }

    const subtotal = editingPO.items.reduce((sum, item) => sum + ((item.quantity || item.orderedQty || 1) * (item.unitPrice || 0)), 0);
    const taxAmount = Math.round(subtotal * 0.18);
    const totalAmount = subtotal + taxAmount;

    // Check if PO was approved or rejected
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

  const handleResubmitPO = () => {
    if (!editingPO) return;

    for (const it of editingPO.items) {
      const itemObj = items.find(i => i.id === it.itemId || i.itemCode === it.itemCode);
      const moq = itemObj?.minOrderQty || 1;
      const qty = it.quantity || it.orderedQty || 0;
      if (qty < moq) {
        alert(`⚠️ Item "${it.itemCode}" has a Minimum Order Quantity (MOQ) of ${moq} ${it.unit || 'units'}. Quantity cannot be less than ${moq}.`);
        return;
      }
    }

    resubmitPOForApproval(editingPO.id, editingPO.items, editingPO.notes);
    setIsEditPOModalOpen(false);
    setEditingPO(null);
    alert(`✅ PO ${editingPO.poNumber} has been updated and resubmitted for approval.`);
  };

  const handleOpenCancelChallan = (po: PurchaseOrder) => {
    setCancellingPO(po);
    setCancellationReason('');
    setIsCancelModalOpen(true);
  };

  const handleIssueCancelChallan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancellingPO || !cancellationReason.trim()) {
      alert('Please provide a reason for cancelling this Purchase Order.');
      return;
    }

    const challanNo = `PO-CNCL-${Date.now().toString().slice(-4)}`;
    updatePurchaseOrder({
      ...cancellingPO,
      status: 'CANCELLED',
      cancellationChallanNo: challanNo,
      cancellationReason: cancellationReason.trim(),
      cancelledBy: currentUser?.fullName || 'Procurement Officer',
      cancelledAt: new Date().toISOString()
    });

    alert(`✅ Cancellation Challan ${challanNo} issued. PO ${cancellingPO.poNumber} has been voided.`);
    setIsCancelModalOpen(false);
    setCancellingPO(null);
  };

  const handlePrintPO = (po: PurchaseOrder) => {
    handlePrintSinglePO(po);
  };

  const { selectedIndex, setSelectedIndex } = useTableKeyboardNav(filteredPOs, handlePrintPO);

  
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

  // Build rows for Tabular Shortage Matrix
  const getWizardTableRows = () => {
    const term = wizardSearchTerm.trim().toLowerCase();

    return wizardShortageItemsFiltered.map((item, idx) => {
      const reqQty = getItemWorkOrderDemand(item.id, item.itemCode);
      const minStock = item.minStockQty !== undefined ? item.minStockQty : (item.reorderLevel || 0);
      const currentStock = (item.inHouseStock || 0) + (item.externalStock || 0);
      const inPO = getOpenPOQuantity(item);
      const shortage = getItemEffectiveShortage(item);

      return {
        srNo: idx + 1,
        item,
        itemCode: item.itemCode,
        itemDescription: item.name,
        partCode: item.partCode || item.itemCode,
        requiredQty: reqQty,
        currentStock,
        minStockQty: minStock,
        moq: item.minOrderQty || 1,
        inPO,
        shortage,
        unit: item.unit
      };
    });
  };

  const wizardTableRows = getWizardTableRows();

  return (
    <div className="module-layout-container">
      
      {/* Top Action Header */}
      <div className="sticky-module-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {isWizardOpen && (
            <button className="btn btn-outline" style={{ padding: '0.35rem 0.65rem', gap: '0.35rem', fontWeight: 600 }} onClick={() => setIsWizardOpen(false)}>
              <X size={16} /> Back to POs <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>(ESC)</span>
            </button>
          )}
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
            <ShoppingCart size={20} color="var(--accent-primary)" />
            {isWizardOpen ? 'Shortage PO Wizard (Tabular Matrix)' : 'Purchase Order Ledger & Procurement Control'}
          </h2>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <button type="button" className="btn btn-outline" onClick={handlePrintPOList} title="Print Filtered PO Ledger">
            <Printer size={14} /> Print Report
          </button>
          {draftPOs.length > 0 && !isWizardOpen && (
            <button 
              type="button" 
              className="btn btn-warning" 
              style={{ color: '#fff', backgroundColor: '#d97706', borderColor: '#d97706', fontWeight: 700 }} 
              onClick={() => {
                const ids = draftPOs.map(p => p.id);
                sendPODraftsForApproval(ids);
                alert(`✅ Successfully sent ${ids.length} Draft Purchase Order(s) for Approval!`);
              }}
            >
              <Send size={14} /> Submit ({draftPOs.length}) Drafts for Approval
            </button>
          )}
          {!isWizardOpen && (
            <>
              <button 
                type="button" 
                className="btn btn-outline" 
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600 }}
                onClick={() => { setIsWizardOpen(true); setWizardSearchTerm(''); }}
              >
                <AlertTriangle size={14} color="var(--warning)" /> Shortage PO Wizard ({shortageItems.length})
              </button>
              <button className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }} onClick={handleOpenManualPOModal}>
                <Plus size={16} /> Create PO
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tabular Shortage PO Wizard View */}
      {isWizardOpen ? (
        <div className="card" style={{ padding: '1.25rem', backgroundColor: 'var(--bg-card)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertTriangle size={18} color="var(--warning)" />
                Bought-Out Shortage Procurement Wizard (Tabular Matrix)
              </h3>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                Review required demand, current stock, MOQ, open POs, and generate vendor POs directly.
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <button 
                type="button" 
                className="btn btn-outline" 
                style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
                onClick={() => setIsShortagePrintOpen(true)}
              >
                <Printer size={14} /> Print Shortage Table
              </button>
              <button type="button" className="btn btn-outline" style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem' }} onClick={() => setIsWizardOpen(false)}>
                <X size={15} /> Close (ESC)
              </button>
            </div>
          </div>

          {/* Search Bar for Shortage Items */}
          <div style={{ position: 'relative', width: '100%' }}>
            <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search shortage item description, part code... (or filter rows)"
              className="input-field"
              style={{ paddingLeft: '2.25rem' }}
              value={wizardSearchTerm}
              onChange={(e) => setWizardSearchTerm(e.target.value)}
            />
          </div>

          {/* Tabular Shortage Matrix */}
          {wizardTableRows.length === 0 ? (
            <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--success)' }}>
              <CheckCircle2 size={44} style={{ marginBottom: '0.5rem', opacity: 0.8 }} />
              <div style={{ fontWeight: 800, fontSize: '1.05rem' }}>All items have sufficient stock levels!</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                No active material shortages exist currently.
              </div>
            </div>
          ) : (
            <div className="table-container" style={{ maxHeight: '500px', overflowY: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th style={{ width: '45px', textAlign: 'center' }}>Sr No</th>
                    <th>Item Code</th>
                    <th>Item Description</th>
                    <th>Part Code</th>
                    <th style={{ textAlign: 'right' }}>Required Qty</th>
                    <th style={{ textAlign: 'right' }}>Current Stock</th>
                    <th style={{ textAlign: 'right' }}>Min Stock Qty</th>
                    <th style={{ textAlign: 'right' }}>MOQ</th>
                    <th style={{ textAlign: 'right' }}>In PO</th>
                    <th style={{ textAlign: 'right' }}>Shortage</th>
                    <th style={{ width: '130px', textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {wizardTableRows.map((row, idx) => (
                    <tr key={idx} style={{ backgroundColor: row.shortage > 0 ? 'rgba(239, 68, 68, 0.04)' : 'transparent' }}>
                      <td style={{ textAlign: 'center', fontWeight: 600 }}>{idx + 1}</td>
                      <td>
                        <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--accent-primary)' }}>
                          {row.itemCode}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{row.itemDescription}</div>
                      </td>
                      <td>
                        <span style={{ fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                          {row.partCode}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>
                        {row.requiredQty} {row.unit}
                      </td>
                      <td style={{ textAlign: 'right', color: row.currentStock <= 0 ? 'var(--danger)' : 'var(--text-primary)' }}>
                        {row.currentStock} {row.unit}
                      </td>
                      <td style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>
                        {row.minStockQty} {row.unit}
                      </td>
                      <td style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>
                        {row.moq} {row.unit}
                      </td>
                      <td style={{ textAlign: 'right', color: row.inPO > 0 ? 'var(--accent-primary)' : 'var(--text-muted)', fontWeight: row.inPO > 0 ? 700 : 400 }}>
                        {row.inPO} {row.unit}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <span className="badge badge-danger" style={{ fontWeight: 800, fontSize: '0.8rem', padding: '0.2rem 0.5rem' }}>
                          {row.shortage} {row.unit}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          className="btn btn-primary"
                          style={{ padding: '0.3rem 0.65rem', fontSize: '0.78rem', fontWeight: 700, gap: '0.3rem', display: 'inline-flex', alignItems: 'center' }}
                          onClick={() => handleOpenShortagePOModal(row.item)}
                        >
                          <Plus size={13} /> Create PO
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <>

          {/* Filter Bar with Lifecycle Status Filter */}
          <div className="card" style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', backgroundColor: 'var(--bg-card)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', width: '340px', maxWidth: '100%' }}>
                <Search size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="Search PO Number, Vendor, Item, Ref... (type @history)"
                  className="input-field"
                  style={{ paddingLeft: '2.25rem', fontSize: '0.82rem' }}
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

            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <div>
                <label style={{ fontSize: '0.72rem', margin: 0 }}>Lifecycle Status</label>
                <select className="input-field" style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem', fontWeight: 600 }} value={selectedPOStatusFilter} onChange={(e) => setSelectedPOStatusFilter(e.target.value)}>
                  <option value="ALL">All Active Lifecycle</option>
                  <option value="DRAFT">Draft</option>
                  <option value="WAITING_FOR_APPROVAL">Waiting Approval</option>
                  <option value="APPROVED">Approved</option>
                  <option value="REJECTED">Rejected</option>
                  <option value="SENT">Sent to Vendor</option>
                  <option value="GOODS_RECEIVED">Goods Received (History)</option>
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
                  <th>Item Code(s)</th>
                  <th>Item Description</th>
                  <th style={{ minWidth: '150px' }}>Received / Total Qty</th>
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
                    po.status === 'REJECTED' ? 'badge-danger' :
                    po.status === 'DRAFT' ? 'badge-neutral' :
                    po.status === 'CANCELLED' ? 'badge-danger' : 'badge-neutral';

                  const createdDisplay = po.poCreateDateTime 
                    ? new Date(po.poCreateDateTime).toLocaleString('en-IN', { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' })
                    : po.orderDate;

                  return (
                    <tr 
                      key={po.id}
                      onDoubleClick={() => handlePrintSinglePO(po)}
                      onClick={() => setSelectedIndex(idx)}
                      style={{
                        backgroundColor: isNavSelected ? 'rgba(59, 130, 246, 0.18)' : 'transparent',
                        cursor: 'pointer'
                      }}
                      title="Double click or press Enter to view PO document"
                    >
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 700, color: po.isDeleted ? 'var(--text-muted)' : 'var(--accent-primary)', fontFamily: 'monospace', textDecoration: po.isDeleted ? 'line-through' : 'none' }}>
                            {po.poNumber}
                          </span>
                          {po.isDeleted && (
                            <span className="badge" style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', color: 'var(--danger)', fontSize: '0.65rem', border: '1px solid var(--danger)' }}>
                              🗑️ {po.splitFromPoNumber ? 'SPLIT CANCELLED' : 'DELETED (HIDDEN)'}
                            </span>
                          )}
                          {po.isSplitFulfilled && (
                            <span className="badge" style={{ backgroundColor: '#059669', color: '#fff', fontSize: '0.65rem' }}>
                              ✅ PARTIAL FULFILLED
                            </span>
                          )}
                          {po.status === 'DRAFT' && !po.isDeleted && <span className="badge badge-warning" style={{ fontSize: '0.65rem' }}>DRAFT</span>}
                          {po.cancellationChallanNo && (
                            <span className="badge badge-danger" style={{ fontSize: '0.65rem' }}>
                              CNCL ({po.cancellationChallanNo})
                            </span>
                          )}
                          {!po.isDeleted && (po.status === 'GOODS_RECEIVED' || (po.status as string) === 'RECEIVED' || po.status === 'CANCELLED') && (
                            <span className="badge" style={{ backgroundColor: '#7c3aed', color: '#fff', fontSize: '0.65rem', padding: '0.1rem 0.35rem' }}>
                              📜 HISTORY
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ fontWeight: 600 }}>{po.vendorName}</td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                          {po.items.map((pi, piIdx) => (
                            <span key={piIdx} style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--accent-primary)', fontSize: '0.78rem' }}>
                              {pi.itemCode}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', maxWidth: '240px' }}>
                          {po.items.map((pi, piIdx) => (
                            <span key={piIdx} style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>
                              {pi.itemName}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          {po.items.map((pi, piIdx) => {
                            const totalOrdered = pi.originalOrderedQty || pi.orderedQty || pi.quantity || 1;
                            const received = pi.receivedQty || 0;
                            const isComplete = received >= totalOrdered;
                            const isPartial = received > 0 && received < totalOrdered;
                            const isDeletedSplit = po.isDeleted && pi.cancelledQty && pi.cancelledQty > 0;

                            return (
                              <div key={piIdx} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem' }}>
                                {isDeletedSplit ? (
                                  <span className="badge" style={{ backgroundColor: 'rgba(239, 68, 68, 0.12)', color: 'var(--danger)', fontWeight: 700, padding: '0.12rem 0.4rem' }}>
                                    ❌ {pi.cancelledQty} / {totalOrdered} {pi.unit || 'PCS'} (Cancelled)
                                  </span>
                                ) : isComplete ? (
                                  <span className="badge badge-success" style={{ fontWeight: 700, padding: '0.12rem 0.4rem' }}>
                                    ✓ {received} / {totalOrdered} {pi.unit || 'PCS'}
                                  </span>
                                ) : isPartial ? (
                                  <span className="badge badge-warning" style={{ fontWeight: 700, padding: '0.12rem 0.4rem' }}>
                                    ⏳ {received} / {totalOrdered} {pi.unit || 'PCS'}
                                  </span>
                                ) : (
                                  <span className="badge badge-neutral" style={{ fontWeight: 600, padding: '0.12rem 0.4rem' }}>
                                    0 / {totalOrdered} {pi.unit || 'PCS'}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </td>
                      <td>{po.orderDate}</td>
                      <td>{po.deliveryDate || po.expectedDeliveryDate}</td>
                      <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{createdDisplay}</td>
                      <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{po.preparedBy || 'System User'}</td>
                      <td style={{ fontWeight: 800, color: 'var(--text-primary)' }}>
                        ₹{(po.totalAmount || 0).toLocaleString()}
                      </td>
                      <td>
                        <span className={`badge ${statusClass}`}>
                          {po.isDeleted ? 'CANCELLED / DELETED' : po.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                          <button className="btn btn-outline" style={{ padding: '0.3rem 0.5rem' }} title="Print Vendor Purchase Order" onClick={() => handlePrintSinglePO(po)}>
                            <Printer size={14} />
                          </button>
                          {!po.isDeleted && ['DRAFT', 'WAITING_FOR_APPROVAL', 'APPROVED', 'REJECTED'].includes(po.status) && (
                            <button 
                              className="btn btn-outline" 
                              style={{ padding: '0.3rem 0.5rem' }} 
                              title="Edit PO (Will require re-approval)" 
                              onClick={() => { setEditingPO({ ...po }); setIsEditPOModalOpen(true); }}
                            >
                              <Edit2 size={14} />
                            </button>
                          )}
                          {!po.isDeleted && ['ISSUED', 'SENT', 'PARTIALLY_RECEIVED'].includes(po.status) && (
                            <button 
                              className="btn btn-outline" 
                              style={{ padding: '0.2rem 0.45rem', fontSize: '0.72rem', color: 'var(--danger)', borderColor: 'var(--danger)' }} 
                              title="Issue PO Cancellation Challan" 
                              onClick={() => handleOpenCancelChallan(po)}
                            >
                              Cancel Challan
                            </button>
                          )}
                          {!po.isDeleted && (
                            <button className="btn btn-outline" style={{ padding: '0.3rem 0.5rem', color: 'var(--danger)' }} title="Delete / Cancel PO" onClick={() => {
                              const totalOrd = po.items.reduce((s, i) => s + (i.quantity || i.orderedQty || 0), 0);
                              const totalRec = po.items.reduce((s, i) => s + (i.receivedQty || 0), 0);
                              let confirmMsg = `Are you sure you want to delete PO ${po.poNumber}?\n\nIt will be safely archived (soft-deleted) and can be searched via @history or @deleted.`;
                              if (totalRec > 0 && totalRec < totalOrd) {
                                confirmMsg = `⚠️ Notice: PO ${po.poNumber} has partial goods receipt (${totalRec} of ${totalOrd} units received).\n\nDeleting will:\n1. Keep received ${totalRec} units in ${po.poNumber} as Completed (${totalRec}/${totalOrd} received).\n2. Split and cancel remaining ${totalOrd - totalRec} units into ${po.poNumber}-deleted (${totalOrd - totalRec}/${totalOrd} cancelled & archived).\n\nProceed with split deletion?`;
                              }
                              if (window.confirm(confirmMsg)) {
                                deletePurchaseOrder(po.id);
                              }
                            }}>
                              <Trash2 size={14} />
                            </button>
                          )}
                          {po.status === 'REJECTED' && (
                            <button 
                              className="btn btn-primary" 
                              style={{ fontSize: '0.75rem', padding: '0.2rem 0.45rem', backgroundColor: 'var(--accent-primary)', borderColor: 'var(--accent-primary)' }}
                              title={`Rejected: ${po.rejectionReason || 'Requires modifications'}. Click to edit and resubmit.`}
                              onClick={() => { setEditingPO({ ...po }); setIsEditPOModalOpen(true); }}
                            >
                              Edit & Resubmit
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
                                  const reason = window.prompt(`Enter rejection reason for PO ${po.poNumber}:`, 'Price discrepancy / quantity revision required');
                                  if (reason !== null) {
                                    updatePOStatus(po.id, 'REJECTED', reason);
                                    alert(`❌ PO ${po.poNumber} Rejected.`);
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
                  <option value="REJECTED">REJECTED</option>
                  <option value="SENT">SENT TO VENDOR</option>
                  <option value="GOODS_RECEIVED">GOODS RECEIVED</option>
                  <option value="CANCELLED">CANCELLED</option>
                </select>
              </div>
            </div>

            {editingPO.rejectionReason && (
              <div style={{ padding: '0.65rem 0.85rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--danger)', borderRadius: '0.375rem', fontSize: '0.8rem', color: 'var(--danger)' }}>
                <strong>🚫 Rejection Remarks:</strong> {editingPO.rejectionReason}
                {editingPO.rejectedBy && <span style={{ marginLeft: '0.5rem', color: 'var(--text-muted)' }}>— {editingPO.rejectedBy}</span>}
              </div>
            )}

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
                  const itemObj = items.find(i => i.id === item.itemId || i.itemCode === item.itemCode);
                  const moq = itemObj?.minOrderQty || 1;
                  const qty = item.quantity || item.orderedQty || 1;
                  const price = item.unitPrice || 0;
                  const itemTotal = qty * price;

                  return (
                    <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr 1fr 1fr', gap: '0.5rem', alignItems: 'center', backgroundColor: 'var(--bg-tertiary)', padding: '0.5rem', borderRadius: '0.375rem' }}>
                      <div>
                        <strong>{item.itemName}</strong>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          Code: {item.itemCode} &bull; <span style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>MOQ: {moq} {item.unit || 'PCS'}</span>
                        </div>
                      </div>
                      <div>
                        <label style={{ fontSize: '0.7rem', display: 'flex', justifyContent: 'space-between' }}>
                          <span>Quantity</span>
                          <span style={{ color: 'var(--text-muted)' }}>(Min: {moq})</span>
                        </label>
                        <input 
                          type="number" 
                          min={moq} 
                          className="input-field" 
                          value={qty === 0 ? '' : qty} 
                          onChange={(e) => {
                            const val = e.target.value;
                            const newQty = val === '' ? 0 : Number(val);
                            const updatedItems = [...editingPO.items];
                            updatedItems[idx] = { ...item, quantity: newQty, orderedQty: newQty, amount: newQty * price, totalAmount: newQty * price };
                            setEditingPO({ ...editingPO, items: updatedItems });
                          }} 
                        />
                        {qty < moq && qty > 0 && (
                          <span style={{ fontSize: '0.68rem', color: 'var(--danger)', fontWeight: 700 }}>
                            ⚠️ Min MOQ is {moq}
                          </span>
                        )}
                      </div>
                      <div>
                        <label style={{ fontSize: '0.7rem' }}>Unit Price (₹)</label>
                        <input 
                          type="number" 
                          min="0" 
                          className="input-field" 
                          value={price === 0 ? '' : price} 
                          onChange={(e) => {
                            const val = e.target.value;
                            const newPrice = val === '' ? 0 : Number(val);
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
              {editingPO.status === 'REJECTED' ? (
                <button type="button" className="btn btn-primary" style={{ backgroundColor: 'var(--success)', borderColor: 'var(--success)' }} onClick={handleResubmitPO}>
                  ✓ Resubmit for Approval
                </button>
              ) : (
                <button type="submit" className="btn btn-primary">Save PO Changes</button>
              )}
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
                    value={manualItemQty === 0 ? '' : manualItemQty} 
                    onChange={(e) => {
                      const val = e.target.value;
                      setManualItemQty(val === '' ? 0 : Number(val));
                    }} 
                  />
                  {manualItemQty < moq && manualItemQty > 0 && (
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
                    value={manualItemPrice === 0 ? '' : manualItemPrice} 
                    onChange={(e) => {
                      const val = e.target.value;
                      setManualItemPrice(val === '' ? 0 : Number(val));
                    }} 
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

      {/* Feature-Wise Modular Print Manager Modal */}
      <PrintManagerModal
        isOpen={printModalOpen}
        onClose={() => { setPrintModalOpen(false); setSelectedPrintPO(null); }}
        title={printDocType === 'SINGLE_PO' ? `Print Purchase Order (${selectedPrintPO?.poNumber})` : 'Print Purchase Orders Report'}
        documentRefNumber={printDocType === 'SINGLE_PO' ? selectedPrintPO?.poNumber : 'PO-REPORT'}
      >
        {printDocType === 'SINGLE_PO' && selectedPrintPO ? (
          <SinglePOPrintView po={selectedPrintPO} vendorDetails={vendors.find(v => v.id === selectedPrintPO.vendorId)} />
        ) : (
          <POListPrintView purchaseOrders={filteredPOs} filterLabel={isHistorySearch ? 'All Active & Historical Purchase Orders' : 'Active Purchase Orders'} />
        )}
      </PrintManagerModal>

      {/* Shortage Wizard Table Print Modal */}
      <PrintManagerModal
        isOpen={isShortagePrintOpen}
        onClose={() => setIsShortagePrintOpen(false)}
        title="Print Shortage Purchase Order Matrix"
        documentRefNumber="PO-SHORTAGE-MATRIX"
      >
        <TabularShortagePrintView 
          title="PURCHASE ORDER SHORTAGE REPORT" 
          rows={wizardTableRows} 
          filterLabel={isExplodeShortage ? "Exploded Active Work Orders BOM Shortages" : "Active Material Stock Shortages"}
          showMOQAndInPO={true}
        />
      </PrintManagerModal>

      {/* Cancellation Challan Modal (For Sent POs) */}
      {isCancelModalOpen && cancellingPO && (
        <Modal
          isOpen={isCancelModalOpen}
          onClose={() => { setIsCancelModalOpen(false); setCancellingPO(null); }}
          title={`Issue PO Cancellation Challan (${cancellingPO.poNumber})`}
        >
          <form onSubmit={handleIssueCancelChallan} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ padding: '0.75rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--danger)', borderRadius: '0.375rem', fontSize: '0.82rem', color: 'var(--danger)' }}>
              <strong>⚠️ Formal Cancellation Notice:</strong> This Purchase Order was previously dispatched to vendor <strong>{cancellingPO.vendorName}</strong>. Issuing this challan will formally void the order and record a cancellation audit trail.
            </div>

            <div>
              <label style={{ fontWeight: 700 }}>PO Reference</label>
              <input type="text" className="input-field" readOnly value={`${cancellingPO.poNumber} - ${cancellingPO.vendorName}`} />
            </div>

            <div>
              <label style={{ fontWeight: 700 }}>Cancellation Reason / Justification *</label>
              <textarea
                required
                className="input-field"
                rows={3}
                placeholder="e.g. Design revision, vendor delayed lead time, alternative supplier chosen..."
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button type="button" className="btn btn-secondary" onClick={() => { setIsCancelModalOpen(false); setCancellingPO(null); }}>
                Close
              </button>
              <button type="submit" className="btn btn-danger" style={{ backgroundColor: 'var(--danger)', color: '#fff' }}>
                Issue Cancellation Challan
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Export Field Selector Modal */}
          </div>
  );
};
