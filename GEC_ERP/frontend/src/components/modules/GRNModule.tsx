import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import { AutocompleteSelect, AutocompleteOption } from '../common/AutocompleteSelect';
import { PrintManagerModal } from '../printTemplates/PrintManagerModal';
import { SingleGRNPrintView, GRNListPrintView } from '../printTemplates/GRNPrintTemplates';
import { FileCheck, Plus, CheckCircle, Search, Printer, FileSpreadsheet, Truck, ShoppingCart, ArrowLeft, X, ArrowUpDown, ArrowUp, ArrowDown, RefreshCw, Edit2 } from 'lucide-react';
import { GRNLineItem, GoodsReceivedNotice } from '../../types/erp';
import { useTableKeyboardNav } from '../../hooks/useTableKeyboardNav';

type SortField = 'grnNumber' | 'poNumber' | 'vendorName' | 'invoiceNo' | 'receivedDate';

export const GRNModule: React.FC = () => {
  const { grns, purchaseOrders, jobworks, items, vendors, setActiveModule, currentUser, addGRN, updateGRN, approveGRN, searchTerm, setSearchTerm } = useERP();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGRN, setEditingGRN] = useState<GoodsReceivedNotice | null>(null);
    const [printModalOpen, setPrintModalOpen] = useState(false);
  const [printDocType, setPrintDocType] = useState<'SINGLE_GRN' | 'GRN_LIST'>('GRN_LIST');
  const [selectedPrintGRN, setSelectedPrintGRN] = useState<GoodsReceivedNotice | null>(null);

  // Direct Jobwork Warning Item State
  const [directJobworkBlockedItem, setDirectJobworkBlockedItem] = useState<{ itemCode: string; itemName: string } | null>(null);

  // Single Column Sorting State
  const [sortField, setSortField] = useState<SortField>('grnNumber');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Date Range Filters
  const [startDateFilter, setStartDateFilter] = useState<string>('');
  const [endDateFilter, setEndDateFilter] = useState<string>('');

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

  const filteredGRNs = grns
    .filter(g => {
      const isHistory = g.status === 'STORED' || g.status === 'QC_APPROVED';
      if (!isHistorySearch && isHistory) {
        // default show active unless @history
      }
      const matchesSearch = !cleanSearchTerm || (
        g.grnNumber.toLowerCase().includes(cleanSearchTerm) ||
        g.poNumber.toLowerCase().includes(cleanSearchTerm) ||
        g.vendorName.toLowerCase().includes(cleanSearchTerm) ||
        (g.invoiceNo && g.invoiceNo.toLowerCase().includes(cleanSearchTerm)) ||
        (g.items && g.items.some(i => (i.itemCode || '').toLowerCase().includes(cleanSearchTerm) || (i.itemName || '').toLowerCase().includes(cleanSearchTerm)))
      );
      if (!matchesSearch) return false;

      if (startDateFilter && g.receivedDate < startDateFilter) return false;
      if (endDateFilter && g.receivedDate > endDateFilter) return false;

      return true;
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

  const handlePrintSingleGRN = (grn: GoodsReceivedNotice) => {
    setSelectedPrintGRN(grn);
    setPrintDocType('SINGLE_GRN');
    setPrintModalOpen(true);
  };

  const handlePrintGRNList = () => {
    setPrintDocType('GRN_LIST');
    setPrintModalOpen(true);
  };

  // Source Type: 'PO' (Vendor PO) or 'JOBWORK' (Jobwork Challan Return)
  const [inwardSourceType, setInwardSourceType] = useState<'PO' | 'JOBWORK'>('PO');
  const [selectedSourceId, setSelectedSourceId] = useState('');

  const [grnForm, setGrnForm] = useState({
    grnNumber: '',
    invoiceNo: '',
    invoiceDate: new Date().toISOString().split('T')[0],
    receivedDate: new Date().toISOString().split('T')[0]
  });

  const [grnItems, setGrnItems] = useState<any[]>([]);

  // Autocomplete options
  const poOptions: AutocompleteOption[] = purchaseOrders
    .filter(po => po.status !== 'GOODS_RECEIVED' && po.status !== 'CANCELLED')
    .map(po => ({
      value: po.id,
      label: `${po.poNumber} (${po.vendorName})`,
      sublabel: `Date: ${po.orderDate} | Status: ${po.status}`
    }));

  const jobworkOptions: AutocompleteOption[] = jobworks
    .filter(j => j.status !== 'COMPLETED' && j.status !== 'CANCELLED')
    .map(j => ({
      value: j.id,
      label: `${j.challanNo} (${j.vendorName})`,
      sublabel: `Issue Date: ${j.issueDate} | Pending: ${j.pendingBalance || j.sentQuantity}`
    }));

  const handleOpenModal = () => {
    setEditingGRN(null);
    setGrnForm({
      grnNumber: `GRN-GEC-${String(grns.length + 1).padStart(3, '0')}`,
      invoiceNo: '',
      invoiceDate: new Date().toISOString().split('T')[0],
      receivedDate: new Date().toISOString().split('T')[0]
    });
    setSelectedSourceId('');
    setDirectJobworkBlockedItem(null);
    setGrnItems([]);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (grn: GoodsReceivedNotice) => {
    setEditingGRN(grn);
    setGrnForm({
      grnNumber: grn.grnNumber,
      invoiceNo: grn.invoiceNo || '',
      invoiceDate: grn.invoiceDate || grn.receivedDate,
      receivedDate: grn.receivedDate
    });
    setGrnItems(grn.items ? JSON.parse(JSON.stringify(grn.items)) : []);
    setIsModalOpen(true);
  };

  const handleSourceSelect = (id: string) => {
    setSelectedSourceId(id);
    setDirectJobworkBlockedItem(null);

    if (inwardSourceType === 'PO') {
      const targetPO = purchaseOrders.find(po => po.id === id);
      if (targetPO) {
        setGrnItems(targetPO.items.map(item => {
          const matchedItem = items.find(i => i.id === item.itemId || i.itemCode === item.itemCode);
          
          // Calculate historical receipts for this PO item
          const prevReceived = grns.reduce((sum, g) => {
            if (g.poId === targetPO.id || g.poNumber === targetPO.poNumber) {
              const matchedLine = g.items?.find(it => it.itemId === item.itemId || it.itemCode === item.itemCode);
              return sum + (matchedLine?.acceptedQty || 0);
            }
            return sum;
          }, 0);

          const orderedQty = item.quantity || item.orderedQty || 1;
          const maxCanReceiveNow = Math.max(0, orderedQty - prevReceived);
          const defaultReceive = maxCanReceiveNow;

          return {
            itemId: item.itemId,
            itemCode: item.itemCode,
            itemName: item.itemName,
            orderedQty,
            prevReceived,
            maxCanReceiveNow,
            receivedQty: defaultReceive,
            acceptedQty: defaultReceive,
            rejectedQty: 0,
            rejectionDisposition: 'SCRAP',
            rejectionReason: '',
            purchaseUOM: matchedItem?.purchaseUOM,
            conversionFactor: matchedItem?.conversionFactor,
            unit: matchedItem?.unit || 'PCS',
            isDirectJobwork: false,
            directJWQty: 0,
            directJWProduceItemId: '',
            directJWProduceItemCode: '',
            directJWProduceItemName: '',
            directJWVendorId: '',
            directJWVendorName: '',
            remarks: 'Inspected OK at store receiving bay'
          };
        }));
      }
    } else {
      const targetJob = jobworks.find(j => j.id === id);
      if (targetJob) {
        const pendingQty = targetJob.pendingBalance || targetJob.sentQuantity || 1;
        setGrnItems([{
          itemId: targetJob.itemId || 'item-jobwork',
          itemCode: targetJob.itemCode || 'JOBWORK-RET',
          itemName: targetJob.itemName || `Jobwork Machining Return (${targetJob.processRequired || 'External Machining'})`,
          orderedQty: targetJob.sentQuantity || 1,
          prevReceived: (targetJob.sentQuantity || 1) - pendingQty,
          maxCanReceiveNow: pendingQty,
          receivedQty: pendingQty,
          acceptedQty: pendingQty,
          rejectedQty: 0,
          rejectionDisposition: 'SCRAP',
          rejectionReason: '',
          remarks: 'Jobwork physical dimensions verified against drawing specs'
        }]);
      }
    }
  };

  const handleItemQtyChange = (itemId: string, field: string, val: number) => {
    setGrnItems(prev => prev.map(item => {
      if (item.itemId === itemId) {
        let safeVal = Math.max(0, val);
        if (field === 'receivedQty' && item.maxCanReceiveNow !== undefined) {
          if (safeVal > item.maxCanReceiveNow) {
            safeVal = item.maxCanReceiveNow;
            alert(`⚠️ Cannot receive more than remaining balance: ${item.maxCanReceiveNow} (Ordered/Sent: ${item.orderedQty}, Already Received: ${item.prevReceived}).`);
          }
        }

        const updated = { ...item, [field]: safeVal };
        if (field === 'receivedQty') {
          updated.acceptedQty = safeVal;
          updated.rejectedQty = 0;
          if (updated.isDirectJobwork && (updated.directJWQty || 0) > safeVal) {
            updated.directJWQty = safeVal;
          }
        } else if (field === 'acceptedQty') {
          updated.rejectedQty = Math.max(0, updated.receivedQty - safeVal);
        } else if (field === 'rejectedQty') {
          updated.acceptedQty = Math.max(0, updated.receivedQty - safeVal);
        }
        return updated;
      }
      return item;
    }));
  };

  const handlePrintGRN = (grn: GoodsReceivedNotice) => {
    handlePrintSingleGRN(grn);
  };

  const handlePrintGRNDoc = (grn: GoodsReceivedNotice) => {
    handlePrintSingleGRN(grn);
  };

  const handleSubmitGRN = (e: React.FormEvent) => {
    e.preventDefault();

    if (editingGRN) {
      updateGRN({
        ...editingGRN,
        invoiceNo: grnForm.invoiceNo,
        invoiceDate: grnForm.invoiceDate,
        receivedDate: grnForm.receivedDate,
        items: grnItems
      });
      setIsModalOpen(false);
      setEditingGRN(null);
      return;
    }

    const selectedItemsToReceive = grnItems.filter(i => i.isSelected !== false && (i.receivedQty || 0) > 0);
    if (selectedItemsToReceive.length === 0) {
      alert('Please select at least one item line to receive with a received quantity greater than 0.');
      return;
    }

    const invalidDirectJW = selectedItemsToReceive.find(i => i.isDirectJobwork && (i.directJWQty || 0) > 0 && (!i.directJWProduceItemId || !i.directJWVendorId));
    if (invalidDirectJW) {
      alert(`Please select both the "Item to Create" and "Job Work Vendor" for direct job work item: ${invalidDirectJW.itemName}`);
      return;
    }

    let poNumberRef = 'DIRECT-INWARD';
    let poIdRef: string | undefined = undefined;
    let challanIdRef: string | undefined = undefined;
    let challanNoRef: string | undefined = undefined;
    let vendorId = 'vend-gen';
    let vendorName = 'General Vendor';

    if (inwardSourceType === 'PO') {
      const poObj = purchaseOrders.find(po => po.id === selectedSourceId);
      if (poObj) {
        poIdRef = poObj.id;
        poNumberRef = poObj.poNumber;
        vendorId = poObj.vendorId;
        vendorName = poObj.vendorName;
      }
    } else {
      const jobObj = jobworks.find(j => j.id === selectedSourceId);
      if (jobObj) {
        challanIdRef = jobObj.id;
        challanNoRef = jobObj.challanNo;
        poNumberRef = jobObj.challanNo;
        vendorId = jobObj.vendorId;
        vendorName = jobObj.vendorName;
      }
    }

    addGRN({
      grnNumber: grnForm.grnNumber,
      poId: poIdRef,
      poNumber: poNumberRef,
      challanId: challanIdRef,
      challanNo: challanNoRef,
      vendorId,
      vendorName,
      invoiceNo: grnForm.invoiceNo,
      invoiceDate: grnForm.invoiceDate,
      receivedDate: grnForm.receivedDate,
      items: selectedItemsToReceive,
      receivedBy: currentUser?.fullName || 'Store Manager'
    });

    setIsModalOpen(false);
  };

  const { selectedIndex, setSelectedIndex } = useTableKeyboardNav(filteredGRNs, handlePrintGRNDoc);

  
  return (
    <div className="module-layout-container" style={{ flex: 1, minHeight: 0, height: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingRight: '0.25rem' }}>
      {/* Top Header */}
      <div className="sticky-module-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {isModalOpen && (
            <button className="btn btn-outline" style={{ padding: '0.35rem 0.65rem', gap: '0.35rem', fontWeight: 600 }} onClick={() => setIsModalOpen(false)}>
              <ArrowLeft size={16} /> Back to GRN List <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>(ESC)</span>
            </button>
          )}
          <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
            {isModalOpen ? (editingGRN ? `Editing ${editingGRN.grnNumber}` : 'Creating Goods Received Note (GRN)') : `All Goods Inward GRN Slips (${filteredGRNs.length})`}
          </span>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-outline" onClick={handlePrintGRNList} title="Print filtered GRN inward report">
            <Printer size={14} /> Print Report
          </button>
                    {!isModalOpen && (
            <button className="btn btn-primary" onClick={handleOpenModal}>
              <Plus size={16} /> Create Goods Inward GRN
            </button>
          )}
        </div>
      </div>

      {/* Main Content Table OR In-Screen Page Panel */}
      {isModalOpen ? (
        /* In-Screen Page Panel */
        <div className="card" style={{ padding: '1.25rem', backgroundColor: 'var(--bg-card)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
              {editingGRN ? `Edit Goods Received Note (${editingGRN.grnNumber})` : 'Create Goods Inward GRN Slip (PO or External Jobwork Return)'}
            </h3>
            <button type="button" className="btn btn-outline" style={{ padding: '0.25rem 0.5rem', fontSize: '0.78rem' }} onClick={() => setIsModalOpen(false)}>
              <X size={15} /> Close (ESC)
            </button>
          </div>

          <form onSubmit={handleSubmitGRN} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Source Selection Checkboxes (hidden when editing existing GRN) */}
            {!editingGRN && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', padding: '0.75rem', backgroundColor: 'var(--bg-subtle, rgba(0,0,0,0.02))', borderRadius: '0.5rem', border: '1px solid var(--border-color)' }}>
                <label 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.65rem', 
                    padding: '0.65rem 0.85rem', 
                    borderRadius: '0.375rem', 
                    cursor: 'pointer',
                    backgroundColor: inwardSourceType === 'PO' ? 'var(--accent-light, rgba(37,99,235,0.08))' : 'var(--bg-card)',
                    border: inwardSourceType === 'PO' ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)',
                    fontWeight: 700,
                    fontSize: '0.88rem',
                    color: inwardSourceType === 'PO' ? 'var(--accent-primary)' : 'var(--text-primary)'
                  }}
                  onClick={() => {
                    if (inwardSourceType !== 'PO') {
                      setInwardSourceType('PO');
                      setSelectedSourceId('');
                      setGrnItems([]);
                    }
                  }}
                >
                  <input 
                    type="checkbox" 
                    checked={inwardSourceType === 'PO'} 
                    onChange={() => {
                      setInwardSourceType('PO');
                      setSelectedSourceId('');
                      setGrnItems([]);
                    }}
                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                  <ShoppingCart size={17} />
                  <span>Against Purchase Order (PO)</span>
                </label>

                <label 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.65rem', 
                    padding: '0.65rem 0.85rem', 
                    borderRadius: '0.375rem', 
                    cursor: 'pointer',
                    backgroundColor: inwardSourceType === 'JOBWORK' ? 'var(--accent-light, rgba(37,99,235,0.08))' : 'var(--bg-card)',
                    border: inwardSourceType === 'JOBWORK' ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)',
                    fontWeight: 700,
                    fontSize: '0.88rem',
                    color: inwardSourceType === 'JOBWORK' ? 'var(--accent-primary)' : 'var(--text-primary)'
                  }}
                  onClick={() => {
                    if (inwardSourceType !== 'JOBWORK') {
                      setInwardSourceType('JOBWORK');
                      setSelectedSourceId('');
                      setGrnItems([]);
                    }
                  }}
                >
                  <input 
                    type="checkbox" 
                    checked={inwardSourceType === 'JOBWORK'} 
                    onChange={() => {
                      setInwardSourceType('JOBWORK');
                      setSelectedSourceId('');
                      setGrnItems([]);
                    }}
                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                  <Truck size={17} />
                  <span>Against Job Work Challan</span>
                </label>
              </div>
            )}

            {/* Select Target Document */}
            {!editingGRN && (
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.25rem', color: 'var(--text-primary)' }}>
                  {inwardSourceType === 'PO' ? 'Choose Purchase Order (PO) *' : 'Choose Outward Job Work Challan *'}
                </label>
                <AutocompleteSelect
                  options={inwardSourceType === 'PO' ? poOptions : jobworkOptions}
                  value={selectedSourceId}
                  onChange={handleSourceSelect}
                  placeholder={inwardSourceType === 'PO' ? 'Search & select Purchase Order by PO Number or Vendor...' : 'Search & select Job Work Challan by Number or Vendor...'}
                />
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.25rem' }}>Auto-Generated GRN Number</label>
                <input type="text" required className="input-field" value={grnForm.grnNumber} readOnly={!!editingGRN} onChange={(e) => setGrnForm({ ...grnForm, grnNumber: e.target.value })} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.25rem' }}>Vendor Invoice No / DC No *</label>
                <input type="text" required className="input-field" placeholder="e.g. INV-2026-981 / DC-0442" value={grnForm.invoiceNo} onChange={(e) => setGrnForm({ ...grnForm, invoiceNo: e.target.value })} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.25rem' }}>Received Date (Default: Today)</label>
                <input type="date" required className="input-field" value={grnForm.receivedDate} onChange={(e) => setGrnForm({ ...grnForm, receivedDate: e.target.value })} />
              </div>
            </div>

            {/* Line Items for Receiving */}
            {grnItems.length > 0 && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <label style={{ fontSize: '0.9rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                    Choose Items to Receive & Verify Quantities
                  </label>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {grnItems.length} item(s) found on selected {inwardSourceType === 'PO' ? 'PO' : 'Job Work Challan'}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  {grnItems.map(item => {
                    const isFullyReceived = item.maxCanReceiveNow <= 0;
                    const isSelected = item.isSelected !== false && !isFullyReceived;
                    const itemObj = items.find(i => i.id === item.itemId || i.itemCode === item.itemCode);
                    const requiresQC = itemObj?.qcTrigger === 'ON_GRN' || itemObj?.testReportRequired;
                    const directJWQty = item.isDirectJobwork ? (item.directJWQty || 0) : 0;
                    const remainingInwardQty = Math.max(0, (item.acceptedQty || item.receivedQty || 0) - directJWQty);

                    return (
                      <div 
                        key={item.itemId || item.id} 
                        style={{ 
                          backgroundColor: 'var(--bg-card)', 
                          padding: '0.85rem', 
                          borderRadius: '0.5rem', 
                          border: isSelected ? '1.5px solid var(--accent-primary)' : '1px solid var(--border-color)',
                          opacity: isFullyReceived ? 0.6 : 1
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              disabled={isFullyReceived}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setGrnItems(prev => prev.map(it => it.itemId === item.itemId ? {
                                  ...it,
                                  isSelected: checked,
                                  receivedQty: checked ? (it.receivedQty || it.maxCanReceiveNow) : 0,
                                  acceptedQty: checked ? (it.acceptedQty || it.maxCanReceiveNow) : 0
                                } : it));
                              }}
                              style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                            />
                            <div>
                              <span style={{ fontWeight: 800, fontSize: '0.92rem', color: 'var(--text-primary)' }}>{item.itemName}</span>
                              <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--accent-primary)', marginLeft: '0.5rem' }}>({item.itemCode})</span>
                              {item.partCode && <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '0.4rem' }}>[Part: {item.partCode}]</span>}
                            </div>
                          </div>

                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                            Ordered/Sent: <strong>{item.orderedQty} {item.unit}</strong> &bull; Prev Received: <strong>{item.prevReceived || 0} {item.unit}</strong> &bull; Remaining Allowed: <strong style={{ color: isFullyReceived ? 'var(--danger)' : 'var(--accent-primary)', fontSize: '0.85rem' }}>{item.maxCanReceiveNow} {item.unit}</strong>
                          </div>
                        </div>

                        {isFullyReceived && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--danger)', marginTop: '0.35rem', fontWeight: 600 }}>
                            ⚠️ This line item is already fully received. No remaining quantity to inward.
                          </div>
                        )}

                        {isSelected && (
                          <>
                            {item.conversionFactor && item.conversionFactor > 1 && (
                              <div style={{ fontSize: '0.75rem', color: '#2563eb', backgroundColor: 'rgba(37, 99, 235, 0.08)', padding: '0.35rem 0.6rem', borderRadius: '0.25rem', marginTop: '0.45rem' }}>
                                📦 <strong>Purchase UOM:</strong> {item.purchaseUOM || 'PACK'} &bull; <strong>Conversion:</strong> 1 {item.purchaseUOM || 'PACK'} = {item.conversionFactor} {item.unit}. Receiving {item.acceptedQty} will credit <strong>{item.acceptedQty * item.conversionFactor} {item.unit}</strong> to physical in-house stock.
                              </div>
                            )}

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginTop: '0.65rem' }}>
                              <div>
                                <label style={{ fontSize: '0.72rem', fontWeight: 700, display: 'flex', justifyContent: 'space-between' }}>
                                  <span>Received Qty *</span>
                                  <span style={{ color: 'var(--text-muted)' }}>(Max Allowed: {item.maxCanReceiveNow})</span>
                                </label>
                                <input 
                                  type="number" 
                                  min="0" 
                                  max={item.maxCanReceiveNow} 
                                  className="input-field" 
                                  style={{ fontWeight: 700, fontSize: '0.85rem' }}
                                  value={item.receivedQty === 0 ? '' : item.receivedQty} 
                                  onChange={(e) => handleItemQtyChange(item.itemId, 'receivedQty', e.target.value === '' ? 0 : Number(e.target.value))} 
                                />
                              </div>
                              <div>
                                <label style={{ fontSize: '0.72rem', fontWeight: 700 }}>Accepted Qty</label>
                                <input 
                                  type="number" 
                                  min="0" 
                                  max={item.receivedQty} 
                                  className="input-field" 
                                  value={item.acceptedQty === 0 ? '' : item.acceptedQty} 
                                  onChange={(e) => handleItemQtyChange(item.itemId, 'acceptedQty', e.target.value === '' ? 0 : Number(e.target.value))} 
                                />
                              </div>
                              <div>
                                <label style={{ fontSize: '0.72rem', fontWeight: 700 }}>Rejected Qty</label>
                                <input 
                                  type="number" 
                                  min="0" 
                                  max={item.receivedQty} 
                                  className="input-field" 
                                  value={item.rejectedQty === 0 ? '' : item.rejectedQty} 
                                  onChange={(e) => handleItemQtyChange(item.itemId, 'rejectedQty', e.target.value === '' ? 0 : Number(e.target.value))} 
                                />
                              </div>
                            </div>

                            {/* Checkbox: Send Direct to Job Work */}
                            <div style={{ marginTop: '0.75rem', padding: '0.65rem 0.85rem', backgroundColor: 'var(--bg-subtle, rgba(0,0,0,0.02))', borderRadius: '0.375rem', border: '1px solid var(--border-color)' }}>
                              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 700, fontSize: '0.82rem', color: 'var(--accent-primary)' }}>
                                <input 
                                  type="checkbox"
                                  checked={!!item.isDirectJobwork}
                                  onChange={(e) => {
                                    const isDirect = e.target.checked;
                                    setGrnItems(prev => prev.map(it => it.itemId === item.itemId ? {
                                      ...it,
                                      isDirectJobwork: isDirect,
                                      directJWQty: isDirect ? (it.directJWQty || it.acceptedQty || it.receivedQty || 0) : 0
                                    } : it));
                                  }}
                                  style={{ width: '15px', height: '15px', cursor: 'pointer' }}
                                />
                                <span>🚀 Send direct to Job Work (Auto-generate & Merge Job Work Challan)</span>
                              </label>

                              {item.isDirectJobwork && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginTop: '0.65rem' }}>
                                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr 2fr', gap: '0.75rem' }}>
                                    <div>
                                      <label style={{ fontSize: '0.72rem', fontWeight: 700, display: 'block', marginBottom: '0.2rem' }}>
                                        Direct JW Qty (Max: {item.acceptedQty || item.receivedQty}) *
                                      </label>
                                      <input 
                                        type="number" 
                                        min="1" 
                                        max={item.acceptedQty || item.receivedQty} 
                                        className="input-field" 
                                        style={{ fontSize: '0.82rem', padding: '0.35rem', fontWeight: 700 }} 
                                        value={item.directJWQty === 0 ? '' : item.directJWQty} 
                                        onChange={(e) => {
                                          const maxAllowed = Number(item.acceptedQty || item.receivedQty || 0);
                                          const dQty = Math.min(maxAllowed, Math.max(0, Number(e.target.value)));
                                          setGrnItems(prev => prev.map(it => it.itemId === item.itemId ? { ...it, directJWQty: dQty } : it));
                                        }} 
                                      />
                                    </div>

                                    <div>
                                      <label style={{ fontSize: '0.72rem', fontWeight: 700, display: 'block', marginBottom: '0.2rem' }}>
                                        Item to Create / Produce (Output Item) *
                                      </label>
                                      <select
                                        className="input-field"
                                        required
                                        style={{ fontSize: '0.82rem', padding: '0.35rem' }}
                                        value={item.directJWProduceItemId || ''}
                                        onChange={(e) => {
                                          const pId = e.target.value;
                                          const pItem = items.find(i => i.id === pId);
                                          setGrnItems(prev => prev.map(it => it.itemId === item.itemId ? {
                                            ...it,
                                            directJWProduceItemId: pId,
                                            directJWProduceItemCode: pItem?.itemCode,
                                            directJWProduceItemName: pItem?.name
                                          } : it));
                                        }}
                                      >
                                        <option value="">-- Choose Item to Create --</option>
                                        {items.map(it => (
                                          <option key={it.id} value={it.id}>
                                            {it.itemCode} - {it.name} {it.partCode ? `[Part: ${it.partCode}]` : ''}
                                          </option>
                                        ))}
                                      </select>
                                    </div>

                                    <div>
                                      <label style={{ fontSize: '0.72rem', fontWeight: 700, display: 'block', marginBottom: '0.2rem' }}>
                                        Job Work Vendor (Mapped to Item Master) *
                                      </label>
                                      <select
                                        className="input-field"
                                        required
                                        style={{ fontSize: '0.82rem', padding: '0.35rem' }}
                                        value={item.directJWVendorId || ''}
                                        onChange={(e) => {
                                          const vId = e.target.value;
                                          const vObj = vendors.find(v => v.id === vId);
                                          setGrnItems(prev => prev.map(it => it.itemId === item.itemId ? {
                                            ...it,
                                            directJWVendorId: vId,
                                            directJWVendorName: vObj?.name
                                          } : it));
                                        }}
                                      >
                                        <option value="">-- Choose Job Work Vendor --</option>
                                        {vendors.map(v => (
                                          <option key={v.id} value={v.id}>{v.name} ({v.vendorCode})</option>
                                        ))}
                                      </select>
                                    </div>
                                  </div>

                                  {/* Route Breakdown Summary Badge */}
                                  <div style={{ fontSize: '0.72rem', backgroundColor: 'var(--bg-card)', padding: '0.4rem 0.6rem', borderRadius: '0.25rem', border: '1px dashed var(--accent-primary)', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                    <span>
                                      🚀 <strong>Direct Job Work:</strong> {directJWQty} {item.unit} &rarr; Outward Challan (Merged for same vendor)
                                    </span>
                                    <span>
                                      📦 <strong>Remaining Inward:</strong> {remainingInwardQty} {item.unit} &rarr; {requiresQC ? '⚠️ Pending QC Inspection Quarantine' : '✅ Store Inventory Credit'}
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Rejection Disposition Options */}
                            {item.rejectedQty > 0 && (
                              <div style={{ marginTop: '0.65rem', padding: '0.6rem', backgroundColor: 'rgba(239, 68, 68, 0.08)', borderRadius: '0.375rem', border: '1px solid rgba(239, 68, 68, 0.25)', display: 'grid', gridTemplateColumns: '1.5fr 2fr', gap: '0.65rem', alignItems: 'center' }}>
                                <div>
                                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--danger)', display: 'block', marginBottom: '0.2rem' }}>
                                    ⚠️ Rejection Action / Disposition:
                                  </label>
                                  <select 
                                    className="input-field" 
                                    style={{ fontSize: '0.78rem', padding: '0.3rem', borderColor: 'var(--danger)', fontWeight: 600 }}
                                    value={item.rejectionDisposition || 'SCRAP'}
                                    onChange={(e) => {
                                      const disp = e.target.value;
                                      setGrnItems(prev => prev.map(it => it.itemId === item.itemId ? { ...it, rejectionDisposition: disp } : it));
                                    }}
                                  >
                                    <option value="SCRAP">🔴 Damaged / Scrap (Write-Off)</option>
                                    <option value="IN_HOUSE_REWORK">🟡 Send for In-House Shop Floor Rework</option>
                                    <option value="VENDOR_REWORK">🔵 Send Back to Vendor for Rework (PO Kept Open)</option>
                                    <option value="VENDOR_RETURN">🟣 Return to Vendor (Debit Note / Return)</option>
                                  </select>
                                </div>
                                <div>
                                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.2rem' }}>
                                    Rejection Reason / Notes:
                                  </label>
                                  <input 
                                    type="text" 
                                    placeholder="e.g. Thread damage, dimension off by 0.5mm, transport breakage"
                                    className="input-field"
                                    style={{ fontSize: '0.78rem', padding: '0.3rem' }}
                                    value={item.rejectionReason || ''}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setGrnItems(prev => prev.map(it => it.itemId === item.itemId ? { ...it, rejectionReason: val } : it));
                                    }}
                                  />
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel (ESC)</button>
              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={grnItems.length === 0 || !grnItems.some(i => i.isSelected !== false && (i.receivedQty || 0) > 0)}
              >
                {editingGRN ? 'Save & Update GRN Slip' : 'Approve Goods Receipt & Process Inward Stock'}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <>
          {/* Inline Search Bar & Date Filter */}
          <div className="card" style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'var(--bg-card)', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', flex: 1 }}>
              <div style={{ position: 'relative', width: '380px', maxWidth: '100%' }}>
                <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="Search GRN number, PO/challan, vendor... (type @history to search completed)"
                  className="input-field"
                  style={{ paddingLeft: '2.25rem' }}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>From:</span>
                <input
                  type="date"
                  className="input-field"
                  style={{ padding: '0.3rem 0.5rem', fontSize: '0.8rem', width: '135px' }}
                  value={startDateFilter}
                  onChange={(e) => setStartDateFilter(e.target.value)}
                  title="Filter GRNs received on or after this date"
                />
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>To:</span>
                <input
                  type="date"
                  className="input-field"
                  style={{ padding: '0.3rem 0.5rem', fontSize: '0.8rem', width: '135px' }}
                  value={endDateFilter}
                  onChange={(e) => setEndDateFilter(e.target.value)}
                  title="Filter GRNs received on or before this date"
                />
                {(startDateFilter || endDateFilter) && (
                  <button
                    className="btn btn-outline"
                    style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', color: 'var(--danger)' }}
                    onClick={() => {
                      setStartDateFilter('');
                      setEndDateFilter('');
                    }}
                    title="Clear Date Filters"
                  >
                    Clear Dates
                  </button>
                )}
              </div>

              {isHistorySearch && (
                <span className="badge" style={{ backgroundColor: '#7c3aed', color: '#ffffff', fontSize: '0.75rem', fontWeight: 700 }}>
                  📜 History Search Active
                </span>
              )}
            </div>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th onClick={() => handleSortToggle('grnNumber')} style={{ cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      GRN Number {sortField === 'grnNumber' ? (sortOrder === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} />) : <ArrowUpDown size={12} color="var(--text-muted)" />}
                    </div>
                  </th>
                  <th onClick={() => handleSortToggle('poNumber')} style={{ cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      PO / Job Challan Ref {sortField === 'poNumber' ? (sortOrder === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} />) : <ArrowUpDown size={12} color="var(--text-muted)" />}
                    </div>
                  </th>
                  <th onClick={() => handleSortToggle('vendorName')} style={{ cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      Vendor Name {sortField === 'vendorName' ? (sortOrder === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} />) : <ArrowUpDown size={12} color="var(--text-muted)" />}
                    </div>
                  </th>
                  <th>Item Code(s)</th>
                  <th>Item Description</th>
                  <th>Invoice Ref</th>
                  <th onClick={() => handleSortToggle('receivedDate')} style={{ cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      Received Date {sortField === 'receivedDate' ? (sortOrder === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} />) : <ArrowUpDown size={12} color="var(--text-muted)" />}
                    </div>
                  </th>
                  <th>Received By</th>
                  <th>QC Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredGRNs.map((grn, idx) => {
                  const isNavSelected = selectedIndex === idx;

                  return (
                    <tr 
                      key={grn.id}
                      onDoubleClick={() => handlePrintSingleGRN(grn)}
                      onClick={() => setSelectedIndex(idx)}
                      style={{
                        backgroundColor: isNavSelected ? 'rgba(59, 130, 246, 0.18)' : 'transparent',
                        cursor: 'pointer'
                      }}
                      title="Double click or press Enter to view GRN slip"
                    >
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <span style={{ fontWeight: 700, color: 'var(--success)', fontFamily: 'monospace' }}>
                          {grn.grnNumber}
                        </span>
                      </div>
                    </td>
                    <td style={{ fontWeight: 600, color: 'var(--accent-primary)', fontFamily: 'monospace' }}>{grn.poNumber}</td>
                    <td style={{ fontWeight: 600 }}>{grn.vendorName}</td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                        {grn.items && grn.items.length > 0 ? (
                          grn.items.map((it, itIdx) => (
                            <span key={itIdx} style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--accent-primary)', fontSize: '0.78rem' }}>
                              {it.itemCode || 'ITEM'}
                            </span>
                          ))
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>—</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', maxWidth: '250px' }}>
                        {grn.items && grn.items.length > 0 ? (
                          grn.items.map((it, itIdx) => (
                            <span key={itIdx} style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>
                              {it.itemName || it.itemCode} <strong style={{ color: 'var(--text-primary)' }}>({it.receivedQty ?? it.acceptedQty ?? 0} {it.unit || 'PCS'})</strong>
                            </span>
                          ))
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>—</span>
                        )}
                      </div>
                    </td>
                    <td style={{ fontSize: '0.85rem' }}>{grn.invoiceNo || '—'}</td>
                    <td>{grn.receivedDate}</td>
                    <td style={{ fontSize: '0.85rem' }}>{grn.receivedBy || 'Store'}</td>
                    <td>
                      {grn.status === 'NO_QC' ? (
                        <span className="badge" style={{ backgroundColor: 'var(--bg-subtle, rgba(0,0,0,0.05))', color: 'var(--text-secondary)', border: '1px solid var(--border-color)', fontWeight: 600 }}>
                          No QC
                        </span>
                      ) : grn.status === 'QC_APPROVED' ? (
                        <span className="badge badge-success" style={{ fontWeight: 700 }}>
                          QC Approved
                        </span>
                      ) : grn.status === 'PARTIALLY_QC' ? (
                        <span className="badge" style={{ backgroundColor: '#dbeafe', color: '#1e40af', fontWeight: 700, border: '1px solid #bfdbfe' }}>
                          Partially Inspected
                        </span>
                      ) : grn.status === 'PENDING_QC' ? (
                        <span className="badge badge-warning" style={{ fontWeight: 700 }}>
                          Pending QC
                        </span>
                      ) : (
                        <span className="badge">
                          {String(grn.status).replace('_', ' ')}
                        </span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                        <button className="btn btn-outline" style={{ padding: '0.3rem 0.5rem' }} title="Print GRN Inward Slip" onClick={() => handlePrintSingleGRN(grn)}>
                          <Printer size={14} />
                        </button>
                        <button className="btn btn-outline" style={{ padding: '0.3rem 0.5rem' }} title="Edit GRN Slip" onClick={() => handleOpenEditModal(grn)}>
                          <Edit2 size={14} />
                        </button>
                        {grn.status === 'PENDING_QC' && (
                          <button 
                            className="btn btn-outline" 
                            style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', color: 'var(--success)' }}
                            onClick={() => approveGRN(grn.id)}
                          >
                            Approve QC
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

      {/* Feature-Wise Modular Print Manager Modal */}
      <PrintManagerModal
        isOpen={printModalOpen}
        onClose={() => { setPrintModalOpen(false); setSelectedPrintGRN(null); }}
        title={printDocType === 'SINGLE_GRN' ? `Print Goods Inward GRN Slip (${selectedPrintGRN?.grnNumber})` : 'Print GRN Ledger Report'}
        documentRefNumber={printDocType === 'SINGLE_GRN' ? selectedPrintGRN?.grnNumber : 'GRN-REPORT'}
      >
        {printDocType === 'SINGLE_GRN' && selectedPrintGRN ? (
          <SingleGRNPrintView grn={selectedPrintGRN} />
        ) : (
          <GRNListPrintView grns={filteredGRNs} filterLabel={isHistorySearch ? 'All Active & Historical GRN Slips' : 'Active GRN Inward Ledger'} />
        )}
      </PrintManagerModal>

      {/* Export Field Selector Modal */}
          </div>
  );
};
