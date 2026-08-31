import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import { AutocompleteSelect, AutocompleteOption } from '../common/AutocompleteSelect';
import { PrintManagerModal } from '../printTemplates/PrintManagerModal';
import { SingleGRNPrintView, GRNListPrintView } from '../printTemplates/GRNPrintTemplates';
import { openLiveModuleSheet } from '../../utils/sheetFolderManager';
import { FileCheck, Plus, CheckCircle, Search, Printer, FileSpreadsheet, Truck, ShoppingCart, ArrowLeft, X, ArrowUpDown, ArrowUp, ArrowDown, RefreshCw } from 'lucide-react';
import { GRNLineItem, GoodsReceivedNotice } from '../../types/erp';
import { ExportFieldSelectorModal, FieldOption } from '../common/ExportFieldSelectorModal';
import { useTableKeyboardNav } from '../../hooks/useTableKeyboardNav';

type SortField = 'grnNumber' | 'poNumber' | 'vendorName' | 'invoiceNo' | 'receivedDate';

export const GRNModule: React.FC = () => {
  const { grns, purchaseOrders, jobworks, items, setActiveModule, currentUser, addGRN, approveGRN, searchTerm, setSearchTerm } = useERP();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [printDocType, setPrintDocType] = useState<'SINGLE_GRN' | 'GRN_LIST'>('GRN_LIST');
  const [selectedPrintGRN, setSelectedPrintGRN] = useState<GoodsReceivedNotice | null>(null);

  // Direct Jobwork Warning Item State
  const [directJobworkBlockedItem, setDirectJobworkBlockedItem] = useState<{ itemCode: string; itemName: string } | null>(null);

  // Single Column Sorting State
  const [sortField, setSortField] = useState<SortField>('grnNumber');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

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
      return !cleanSearchTerm || (
        g.grnNumber.toLowerCase().includes(cleanSearchTerm) ||
        g.poNumber.toLowerCase().includes(cleanSearchTerm) ||
        g.vendorName.toLowerCase().includes(cleanSearchTerm) ||
        (g.invoiceNo && g.invoiceNo.toLowerCase().includes(cleanSearchTerm))
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

  const handlePrintSingleGRN = (grn: GoodsReceivedNotice) => {
    setSelectedPrintGRN(grn);
    setPrintDocType('SINGLE_GRN');
    setPrintModalOpen(true);
  };

  const handlePrintGRNList = () => {
    setPrintDocType('GRN_LIST');
    setPrintModalOpen(true);
  };

  const handleRefreshLiveSheet = () => {
    const data = filteredGRNs.map(g => ({
      grnNumber: g.grnNumber,
      poNumber: g.poNumber,
      vendorName: g.vendorName,
      invoiceNo: g.invoiceNo || g.challanNo || '',
      receivedDate: g.receivedDate,
      receivedBy: g.receivedBy || 'Store',
      linesCount: g.items?.length || 0,
      status: g.status
    }));

    const headers: { key: keyof typeof data[0]; label: string }[] = [
      { key: 'grnNumber', label: 'GRN Number' },
      { key: 'poNumber', label: 'PO / Challan Ref' },
      { key: 'vendorName', label: 'Vendor Name' },
      { key: 'invoiceNo', label: 'Invoice / Challan No' },
      { key: 'receivedDate', label: 'Received Date' },
      { key: 'receivedBy', label: 'Received By' },
      { key: 'linesCount', label: 'Item Lines' },
      { key: 'status', label: 'GRN Status' }
    ];

    openLiveModuleSheet('GRN', 'GEC_ERP_GRN_Ledger_Live', data, headers);
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

  const handleSourceSelect = (id: string) => {
    setSelectedSourceId(id);
    setDirectJobworkBlockedItem(null);

    if (inwardSourceType === 'PO') {
      const targetPO = purchaseOrders.find(po => po.id === id);
      if (targetPO) {
        // Check for direct jobwork shipment items
        const directJobItem = targetPO.items.find(pi => {
          const matchedItem = items.find(i => i.id === pi.itemId || i.itemCode === pi.itemCode);
          return matchedItem?.isDirectJobworkShipment;
        });

        if (directJobItem) {
          setDirectJobworkBlockedItem({
            itemCode: directJobItem.itemCode || 'Direct Item',
            itemName: directJobItem.itemName || 'Direct Jobwork Item'
          });
        }

        setGrnItems(targetPO.items.map(item => {
          const matchedItem = items.find(i => i.id === item.itemId || i.itemCode === item.itemCode);
          const isDirect = !!matchedItem?.isDirectJobworkShipment;
          return {
            itemId: item.itemId,
            itemCode: item.itemCode,
            itemName: item.itemName,
            orderedQty: item.quantity || item.orderedQty || 1,
            receivedQty: item.quantity || item.orderedQty || 1,
            acceptedQty: isDirect ? 0 : (item.quantity || item.orderedQty || 1),
            rejectedQty: 0,
            isDirectJobwork: isDirect,
            remarks: isDirect ? 'Direct Jobwork Shipment - In-house GRN Bypassed' : 'Inspected OK at store receiving bay'
          };
        }));
      }
    } else {
      const targetJob = jobworks.find(j => j.id === id);
      if (targetJob) {
        setGrnItems([{
          itemId: targetJob.itemId || 'item-jobwork',
          itemCode: targetJob.itemCode || 'JOBWORK-RET',
          itemName: targetJob.itemName || `Jobwork Machining Return (${targetJob.processRequired || 'External Machining'})`,
          orderedQty: targetJob.sentQuantity || 1,
          receivedQty: targetJob.pendingBalance || targetJob.sentQuantity || 1,
          acceptedQty: targetJob.pendingBalance || targetJob.sentQuantity || 1,
          rejectedQty: 0,
          remarks: 'Jobwork physical dimensions verified against drawing specs'
        }]);
      }
    }
  };

  const handleItemQtyChange = (itemId: string, field: string, val: number) => {
    setGrnItems(prev => prev.map(item => {
      if (item.itemId === itemId) {
        const updated = { ...item, [field]: val };
        if (field === 'receivedQty') {
          updated.acceptedQty = val;
          updated.rejectedQty = 0;
        } else if (field === 'acceptedQty') {
          updated.rejectedQty = Math.max(0, updated.receivedQty - val);
        } else if (field === 'rejectedQty') {
          updated.acceptedQty = Math.max(0, updated.receivedQty - val);
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

    let poNumberRef = 'DIRECT-INWARD';
    let vendorId = 'vend-gen';
    let vendorName = 'General Vendor';

    if (inwardSourceType === 'PO') {
      const poObj = purchaseOrders.find(po => po.id === selectedSourceId);
      if (poObj) {
        poNumberRef = poObj.poNumber;
        vendorId = poObj.vendorId;
        vendorName = poObj.vendorName;
      }
    } else {
      const jobObj = jobworks.find(j => j.id === selectedSourceId);
      if (jobObj) {
        poNumberRef = jobObj.challanNo;
        vendorId = jobObj.vendorId;
        vendorName = jobObj.vendorName;
      }
    }

    addGRN({
      grnNumber: grnForm.grnNumber,
      poNumber: poNumberRef,
      vendorId,
      vendorName,
      invoiceNo: grnForm.invoiceNo,
      invoiceDate: grnForm.invoiceDate,
      receivedDate: grnForm.receivedDate,
      items: grnItems,
      receivedBy: currentUser?.fullName || 'Store Manager'
    });

    setIsModalOpen(false);
  };

  const { selectedIndex, setSelectedIndex } = useTableKeyboardNav(filteredGRNs, handlePrintGRNDoc);

  const availableExportFields: FieldOption<GoodsReceivedNotice>[] = [
    { key: 'grnNumber', label: 'GRN Number' },
    { key: 'poNumber', label: 'PO Ref Number' },
    { key: 'vendorName', label: 'Vendor Name' },
    { key: 'invoiceNo', label: 'Invoice No' },
    { key: 'receivedDate', label: 'Received Date' },
    { key: 'status', label: 'QC Status' }
  ];

  return (
    <div className="module-layout-container">
      {/* Top Header */}
      <div className="sticky-module-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {isModalOpen && (
            <button className="btn btn-outline" style={{ padding: '0.35rem 0.65rem', gap: '0.35rem', fontWeight: 600 }} onClick={() => setIsModalOpen(false)}>
              <ArrowLeft size={16} /> Back to GRN List <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>(ESC)</span>
            </button>
          )}
          <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
            {isModalOpen ? 'Creating Goods Received Note (GRN)' : `All Goods Inward GRN Slips (${filteredGRNs.length})`}
          </span>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-outline" onClick={handleRefreshLiveSheet} title="Sync and maintain live CSV sheet">
            <RefreshCw size={14} /> Live Sheet
          </button>
          <button type="button" className="btn btn-outline" onClick={handlePrintGRNList} title="Print filtered GRN inward report">
            <Printer size={14} /> Print Report
          </button>
          <button className="btn btn-outline" onClick={() => setIsExportModalOpen(true)}>
            <FileSpreadsheet size={14} /> Export Custom
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
              Create Goods Inward GRN Slip (PO or External Jobwork Return)
            </h3>
            <button type="button" className="btn btn-outline" style={{ padding: '0.25rem 0.5rem', fontSize: '0.78rem' }} onClick={() => setIsModalOpen(false)}>
              <X size={15} /> Close (ESC)
            </button>
          </div>

          <form onSubmit={handleSubmitGRN} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Source Selection Buttons */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <button
                type="button"
                className={`btn ${inwardSourceType === 'PO' ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => { setInwardSourceType('PO'); setSelectedSourceId(''); setGrnItems([]); }}
              >
                <ShoppingCart size={16} /> Inward from Vendor PO
              </button>
              <button
                type="button"
                className={`btn ${inwardSourceType === 'JOBWORK' ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => { setInwardSourceType('JOBWORK'); setSelectedSourceId(''); setGrnItems([]); }}
              >
                <Truck size={16} /> Inward from External Jobwork Return
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label>GRN Number</label>
                <input type="text" required className="input-field" value={grnForm.grnNumber} onChange={(e) => setGrnForm({ ...grnForm, grnNumber: e.target.value })} />
              </div>

              <div>
                <label>{inwardSourceType === 'PO' ? 'Select Target Purchase Order (PO)' : 'Select External Jobwork Challan'}</label>
                <AutocompleteSelect
                  options={inwardSourceType === 'PO' ? poOptions : jobworkOptions}
                  value={selectedSourceId}
                  onChange={handleSourceSelect}
                  placeholder={inwardSourceType === 'PO' ? 'Type PO number or vendor...' : 'Type challan no or vendor...'}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label>Invoice / Delivery Challan No.</label>
                <input type="text" required className="input-field" value={grnForm.invoiceNo} onChange={(e) => setGrnForm({ ...grnForm, invoiceNo: e.target.value })} />
              </div>
              <div>
                <label>Inward Received Date</label>
                <input type="date" required className="input-field" value={grnForm.receivedDate} onChange={(e) => setGrnForm({ ...grnForm, receivedDate: e.target.value })} />
              </div>
            </div>

            {/* Received Goods Table */}
            {grnItems.length > 0 && (
              <div style={{ padding: '0.875rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: '0.5rem', border: '1px solid var(--border-color)' }}>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--success)' }}>
                  Physical Inward Quantity & Quality Verification
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                  {grnItems.map(item => (
                    <div key={item.itemId} style={{ backgroundColor: 'var(--bg-card)', padding: '0.625rem', borderRadius: '0.375rem' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{item.itemName} ({item.itemCode})</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Ordered / Sent Qty: {item.orderedQty} Units</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                        <div>
                          <label style={{ fontSize: '0.7rem' }}>Recd Qty</label>
                          <input type="number" min="1" className="input-field" value={item.receivedQty} onChange={(e) => handleItemQtyChange(item.itemId, 'receivedQty', Number(e.target.value))} />
                        </div>
                        <div>
                          <label style={{ fontSize: '0.7rem' }}>Accepted Qty</label>
                          <input type="number" min="0" className="input-field" value={item.acceptedQty} onChange={(e) => handleItemQtyChange(item.itemId, 'acceptedQty', Number(e.target.value))} />
                        </div>
                        <div>
                          <label style={{ fontSize: '0.7rem' }}>Rejected Qty</label>
                          <input type="number" min="0" className="input-field" value={item.rejectedQty} onChange={(e) => handleItemQtyChange(item.itemId, 'rejectedQty', Number(e.target.value))} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Direct Jobwork Warning & Redirection Action */}
            {directJobworkBlockedItem && (
              <div style={{ padding: '0.875rem 1rem', backgroundColor: 'rgba(239, 68, 68, 0.12)', border: '1.5px solid var(--danger)', borderRadius: '0.5rem', color: 'var(--danger)' }}>
                <div style={{ fontWeight: 800, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  ⚠️ Item Direct Jobwork Shipment Notification
                </div>
                <div style={{ fontSize: '0.82rem', marginTop: '0.35rem', color: 'var(--text-primary)', lineHeight: 1.4 }}>
                  Item <strong>{directJobworkBlockedItem.itemCode}</strong> ({directJobworkBlockedItem.itemName}) is configured as <em>Direct Shipped for External Jobwork</em>. Standard in-house store GRN is blocked for this item. You must create an <strong>External Jobwork Challan</strong> to ship it directly to the vendor for processing.
                </div>
                <button 
                  type="button" 
                  className="btn btn-warning" 
                  style={{ marginTop: '0.65rem', fontWeight: 700, fontSize: '0.8rem', padding: '0.35rem 0.75rem', gap: '0.35rem', color: '#ffffff', backgroundColor: 'var(--warning)', border: 'none' }}
                  onClick={() => {
                    setIsModalOpen(false);
                    setActiveModule('external-inventory');
                  }}
                >
                  <Truck size={14} /> Go to External Jobwork to Create Challan
                </button>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel (ESC)</button>
              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={grnItems.every(i => i.isDirectJobwork)}
              >
                Approve Goods Receipt & Credit In-House Stock
              </button>
            </div>
          </form>
        </div>
      ) : (
        <>
          {/* Inline Search Bar */}
          <div className="card" style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', backgroundColor: 'var(--bg-card)', gap: '1rem', flexWrap: 'wrap' }}>
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
                  <th>Invoice Ref</th>
                  <th onClick={() => handleSortToggle('receivedDate')} style={{ cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      Received Date {sortField === 'receivedDate' ? (sortOrder === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} />) : <ArrowUpDown size={12} color="var(--text-muted)" />}
                    </div>
                  </th>
                  <th>Received By</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredGRNs.map((grn, idx) => {
                  const isNavSelected = selectedIndex === idx;
                  const isHistory = grn.status === 'STORED' || grn.status === 'QC_APPROVED';

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
                        {isHistory && (
                          <span className="badge" style={{ backgroundColor: '#7c3aed', color: '#fff', fontSize: '0.65rem', padding: '0.1rem 0.35rem' }}>
                            📜 HISTORY
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ fontWeight: 600, color: 'var(--accent-primary)', fontFamily: 'monospace' }}>{grn.poNumber}</td>
                    <td style={{ fontWeight: 600 }}>{grn.vendorName}</td>
                    <td style={{ fontSize: '0.85rem' }}>{grn.invoiceNo}</td>
                    <td>{grn.receivedDate}</td>
                    <td style={{ fontSize: '0.85rem' }}>{grn.receivedBy || 'Store'}</td>
                    <td>
                      <span className={`badge ${grn.status === 'QC_APPROVED' ? 'badge-success' : 'badge-warning'}`}>
                        {grn.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                        <button className="btn btn-outline" style={{ padding: '0.3rem 0.5rem' }} title="Print GRN Inward Slip" onClick={() => handlePrintSingleGRN(grn)}>
                          <Printer size={14} />
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
      <ExportFieldSelectorModal<GoodsReceivedNotice>
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        title="Custom Export Goods Received Notices Live Sheet"
        subfolder="GRN"
        fileName="GEC_GRN_Inward_Live"
        data={filteredGRNs}
        availableFields={availableExportFields}
      />
    </div>
  );
};
