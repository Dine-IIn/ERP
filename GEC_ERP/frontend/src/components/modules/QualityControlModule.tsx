import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import { PrintManagerModal } from '../printTemplates/PrintManagerModal';
import { SingleQCPrintView, QCListPrintView } from '../printTemplates/QCPrintTemplates';
import { openLiveModuleSheet } from '../../utils/sheetFolderManager';
import { ShieldCheck, Plus, Edit2, CheckCircle, XCircle, AlertCircle, Search, ArrowLeft, X, Printer, RefreshCw, ClipboardList, History, Check, AlertTriangle } from 'lucide-react';
import { QCDisposition, QCInspection, QCType } from '../../types/erp';
import { useTableKeyboardNav } from '../../hooks/useTableKeyboardNav';

interface PendingQCItem {
  grnId: string;
  grnNumber: string;
  grnDate: string;
  poNumber: string;
  vendorId?: string;
  vendorName: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  partCode?: string;
  unit: string;
  totalInwardQty: number;
  alreadyInspected: number;
  remainingQty: number;
}

export const QualityControlModule: React.FC = () => {
  const { 
    qcInspections, 
    grns, 
    items, 
    currentUser, 
    addQCInspection, 
    updateQCInspection, 
    reportQCInspection, 
    searchTerm, 
    setSearchTerm 
  } = useERP();

  // Active Section: 'PENDING_QUEUE' or 'QC_LOGS'
  const [activeSection, setActiveSection] = useState<'PENDING_QUEUE' | 'QC_LOGS'>('PENDING_QUEUE');

  // Report QC Modal State
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportingItem, setReportingItem] = useState<PendingQCItem | null>(null);
  const [reportForm, setReportForm] = useState({
    inspectedQty: 0,
    approvedQty: 0,
    rejectedQty: 0,
    disposition: 'PASSED' as QCDisposition,
    defectReason: '',
    inspectionDate: new Date().toISOString().split('T')[0],
    inspectorName: currentUser?.fullName || 'QC Engineer'
  });

  // Manual/Edit QC Modal State
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [editingQC, setEditingQC] = useState<QCInspection | null>(null);
  const [manualQcForm, setManualQcForm] = useState({
    qcNumber: '',
    type: 'INCOMING_PO' as QCType,
    referenceNo: '',
    itemId: '',
    inspectedQuantity: 1,
    passedQuantity: 1,
    failedQuantity: 0,
    disposition: 'PASSED' as QCDisposition,
    defectReason: ''
  });

  // Print Modal
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [printDocType, setPrintDocType] = useState<'SINGLE_QC' | 'QC_LIST'>('QC_LIST');
  const [selectedPrintQC, setSelectedPrintQC] = useState<QCInspection | null>(null);

  // Filters
  const [selectedQCDispositionFilter, setSelectedQCDispositionFilter] = useState<string>('ALL');
  const [startDateFilter, setStartDateFilter] = useState<string>('');
  const [endDateFilter, setEndDateFilter] = useState<string>('');

  // 1. Calculate Pending QC Items from GRNs
  const pendingQCItems: PendingQCItem[] = [];
  grns.forEach(grn => {
    // Only inspect GRNs that are not 'NO_QC'
    if (grn.status === 'NO_QC') return;

    (grn.items || []).forEach(lineItem => {
      const itemObj = items.find(i => i.id === lineItem.itemId || i.itemCode === lineItem.itemCode);
      // Skip if item has NO_QC configured
      if (itemObj?.qcTrigger === 'NO_QC') return;

      const received = Number(lineItem.acceptedQty ?? lineItem.receivedQty ?? 0);
      const directJobwork = Number((lineItem as any).directJobworkQty ?? 0);
      const totalInwardQty = Math.max(0, received - directJobwork);
      if (totalInwardQty <= 0) return;

      // Sum of all inspections already done for this GRN and item
      const alreadyInspected = qcInspections
        .filter(q => (q.grnId === grn.id || q.referenceNo === grn.grnNumber) && (q.itemId === lineItem.itemId || q.itemCode === lineItem.itemCode))
        .reduce((sum, q) => sum + Number(q.inspectedQuantity || q.inspectedQty || 0), 0);

      const remainingQty = Math.max(0, totalInwardQty - alreadyInspected);

      if (remainingQty > 0) {
        pendingQCItems.push({
          grnId: grn.id,
          grnNumber: grn.grnNumber,
          grnDate: grn.receivedDate,
          poNumber: grn.poNumber,
          vendorId: grn.vendorId,
          vendorName: grn.vendorName,
          itemId: lineItem.itemId,
          itemCode: lineItem.itemCode,
          itemName: lineItem.itemName || itemObj?.name || 'Item',
          partCode: itemObj?.partCode || '',
          unit: lineItem.unit || itemObj?.unit || 'PCS',
          totalInwardQty,
          alreadyInspected,
          remainingQty
        });
      }
    });
  });

  // Universal @history search handling
  const isHistorySearch = searchTerm.toLowerCase().includes('@history');
  const cleanSearchTerm = searchTerm.replace(/@history/gi, '').trim().toLowerCase();

  // Filtered Pending QC Items
  const filteredPendingItems = pendingQCItems.filter(p => {
    if (!cleanSearchTerm) return true;
    return (
      p.vendorName.toLowerCase().includes(cleanSearchTerm) ||
      p.itemCode.toLowerCase().includes(cleanSearchTerm) ||
      p.itemName.toLowerCase().includes(cleanSearchTerm) ||
      (p.partCode && p.partCode.toLowerCase().includes(cleanSearchTerm)) ||
      p.grnNumber.toLowerCase().includes(cleanSearchTerm) ||
      p.poNumber.toLowerCase().includes(cleanSearchTerm)
    );
  });

  // Filtered QC Logs
  const filteredQCs = qcInspections.filter(q => {
    const reportNo = q.qcNumber || q.inspectionNo || '';
    const itemCode = q.itemCode || '';
    const itemName = q.itemName || '';
    const vendor = q.vendorName || '';
    const refNo = q.referenceNo || q.grnNumber || '';
    const inspector = q.inspectorName || '';
    const disp = q.disposition || q.status || 'PASSED';
    const inspDate = q.inspectionDate || '';

    const matchesSearch = !cleanSearchTerm || (
      reportNo.toLowerCase().includes(cleanSearchTerm) ||
      itemName.toLowerCase().includes(cleanSearchTerm) ||
      itemCode.toLowerCase().includes(cleanSearchTerm) ||
      vendor.toLowerCase().includes(cleanSearchTerm) ||
      refNo.toLowerCase().includes(cleanSearchTerm) ||
      inspector.toLowerCase().includes(cleanSearchTerm)
    );

    const matchesDisposition = selectedQCDispositionFilter === 'ALL' || disp === selectedQCDispositionFilter;

    let matchesDate = true;
    if (startDateFilter && inspDate && inspDate < startDateFilter) matchesDate = false;
    if (endDateFilter && inspDate && inspDate > endDateFilter) matchesDate = false;

    return matchesSearch && matchesDisposition && matchesDate;
  });

  // Open "Report QC" Modal for a pending item
  const handleOpenReportModal = (item: PendingQCItem) => {
    setReportingItem(item);
    setReportForm({
      inspectedQty: item.remainingQty,
      approvedQty: 0,
      rejectedQty: 0,
      disposition: 'PASSED',
      defectReason: '',
      inspectionDate: new Date().toISOString().split('T')[0],
      inspectorName: currentUser?.fullName || 'QC Engineer'
    });
    setReportModalOpen(true);
  };

  // Submit "Report QC"
  const handleSubmitReportQC = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportingItem) return;

    const inspected = Number(reportForm.inspectedQty);
    const approved = Number(reportForm.approvedQty);
    const rejected = Number(reportForm.rejectedQty);

    if (inspected <= 0) {
      alert('Inspected quantity must be greater than 0.');
      return;
    }

    if (inspected > reportingItem.remainingQty) {
      alert(`Inspected quantity (${inspected}) cannot exceed remaining uninspected quantity (${reportingItem.remainingQty}).`);
      return;
    }

    if (approved + rejected !== inspected) {
      alert(`Validation error: Approved quantity (${approved}) + Rejected quantity (${rejected}) must equal Inspected quantity (${inspected}).`);
      return;
    }

    let finalDisp: QCDisposition = reportForm.disposition;
    if (rejected === 0) {
      finalDisp = 'PASSED';
    } else if (approved === 0) {
      finalDisp = 'REJECTED';
    } else {
      finalDisp = 'PASSED';
    }

    reportQCInspection({
      grnId: reportingItem.grnId,
      grnNumber: reportingItem.grnNumber,
      itemId: reportingItem.itemId,
      itemCode: reportingItem.itemCode,
      itemName: reportingItem.itemName,
      vendorId: reportingItem.vendorId,
      vendorName: reportingItem.vendorName,
      inspectedQty: inspected,
      approvedQty: approved,
      rejectedQty: rejected,
      disposition: finalDisp,
      defectReason: reportForm.defectReason,
      inspectorName: reportForm.inspectorName,
      inspectionDate: reportForm.inspectionDate
    });

    setReportModalOpen(false);
    setReportingItem(null);
  };

  const handlePrintSingleQC = (q: QCInspection) => {
    setSelectedPrintQC(q);
    setPrintDocType('SINGLE_QC');
    setPrintModalOpen(true);
  };

  const handlePrintQCList = () => {
    setPrintDocType('QC_LIST');
    setPrintModalOpen(true);
  };

  const handleRefreshLiveSheet = () => {
    const data = filteredQCs.map(q => ({
      qcNumber: q.qcNumber || q.inspectionNo || '',
      inspectionDate: q.inspectionDate || '',
      type: q.type || q.referenceType || 'INCOMING_PO',
      grnNumber: q.grnNumber || q.referenceNo || '',
      vendorName: q.vendorName || '',
      itemCode: q.itemCode || '',
      itemName: q.itemName || '',
      inspectedQty: q.inspectedQuantity || q.inspectedQty || 1,
      approvedQty: q.passedQuantity || q.approvedQty || 0,
      rejectedQty: q.failedQuantity || q.rejectedQty || 0,
      disposition: q.disposition || q.status || 'PASSED',
      inspectorName: q.inspectorName || 'QC Officer',
      defectReason: q.defectReason || q.remarks || ''
    }));

    const headers: { key: keyof typeof data[0]; label: string }[] = [
      { key: 'qcNumber', label: 'QC Report No' },
      { key: 'inspectionDate', label: 'Inspection Date' },
      { key: 'type', label: 'Type' },
      { key: 'grnNumber', label: 'GRN Number' },
      { key: 'vendorName', label: 'Vendor' },
      { key: 'itemCode', label: 'Item Code' },
      { key: 'itemName', label: 'Component Name' },
      { key: 'inspectedQty', label: 'Inspected Qty' },
      { key: 'approvedQty', label: 'Approved Qty' },
      { key: 'rejectedQty', label: 'Rejected Qty' },
      { key: 'disposition', label: 'Disposition' },
      { key: 'inspectorName', label: 'Inspector' },
      { key: 'defectReason', label: 'Notes / Reasons' }
    ];

    openLiveModuleSheet('QC', 'GEC_ERP_QC_Audits_Live', data, headers);
  };

  // Manual/Adhoc Modal functions
  const handleOpenManualModal = () => {
    setEditingQC(null);
    setManualQcForm({
      qcNumber: `QC-GEC-2026-${String(qcInspections.length + 1).padStart(3, '0')}`,
      type: 'INCOMING_PO',
      referenceNo: 'GRN-GEC-2026-001',
      itemId: items[0]?.id || '',
      inspectedQuantity: 1,
      passedQuantity: 1,
      failedQuantity: 0,
      disposition: 'PASSED',
      defectReason: ''
    });
    setIsManualModalOpen(true);
  };

  const handleOpenEditManualModal = (q: QCInspection) => {
    setEditingQC(q);
    setManualQcForm({
      qcNumber: q.qcNumber || q.inspectionNo || 'QC-001',
      type: q.type || 'INCOMING_PO',
      referenceNo: q.referenceNo || q.grnNumber || '',
      itemId: q.itemId || '',
      inspectedQuantity: q.inspectedQuantity || q.inspectedQty || 1,
      passedQuantity: q.passedQuantity || q.approvedQty || 1,
      failedQuantity: q.failedQuantity || q.rejectedQty || 0,
      disposition: (q.disposition || q.status || 'PASSED') as QCDisposition,
      defectReason: q.defectReason || q.remarks || ''
    });
    setIsManualModalOpen(true);
  };

  const handleSubmitManualQC = (e: React.FormEvent) => {
    e.preventDefault();
    const itemObj = items.find(i => i.id === manualQcForm.itemId);

    if (editingQC) {
      updateQCInspection({
        ...editingQC,
        qcNumber: manualQcForm.qcNumber,
        type: manualQcForm.type,
        referenceNo: manualQcForm.referenceNo,
        itemId: itemObj ? itemObj.id : editingQC.itemId || '',
        itemCode: itemObj ? itemObj.itemCode : editingQC.itemCode || '',
        itemName: itemObj ? itemObj.name : editingQC.itemName || '',
        inspectedQuantity: Number(manualQcForm.inspectedQuantity),
        inspectedQty: Number(manualQcForm.inspectedQuantity),
        passedQuantity: Number(manualQcForm.passedQuantity),
        approvedQty: Number(manualQcForm.passedQuantity),
        failedQuantity: Number(manualQcForm.failedQuantity),
        rejectedQty: Number(manualQcForm.failedQuantity),
        disposition: manualQcForm.disposition,
        defectReason: manualQcForm.defectReason,
        inspectorName: currentUser?.fullName || editingQC.inspectorName || 'QC Officer'
      });
    } else {
      addQCInspection({
        qcNumber: manualQcForm.qcNumber,
        inspectionNo: manualQcForm.qcNumber,
        type: manualQcForm.type,
        referenceType: 'GRN',
        referenceNo: manualQcForm.referenceNo,
        itemId: itemObj ? itemObj.id : 'item-gen',
        itemCode: itemObj ? itemObj.itemCode : 'ITEM-GEN',
        itemName: itemObj ? itemObj.name : 'General Item',
        inspectedQuantity: Number(manualQcForm.inspectedQuantity),
        inspectedQty: Number(manualQcForm.inspectedQuantity),
        passedQuantity: Number(manualQcForm.passedQuantity),
        approvedQty: Number(manualQcForm.passedQuantity),
        failedQuantity: Number(manualQcForm.failedQuantity),
        rejectedQty: Number(manualQcForm.failedQuantity),
        reworkQty: 0,
        disposition: manualQcForm.disposition,
        defectReason: manualQcForm.defectReason,
        inspectionDate: new Date().toISOString().split('T')[0],
        inspectorName: currentUser?.fullName || 'QC Engineer'
      });
    }

    setIsManualModalOpen(false);
  };

  const currentNavItems = activeSection === 'PENDING_QUEUE' ? (filteredPendingItems as any[]) : (filteredQCs as any[]);
  const { selectedIndex, setSelectedIndex } = useTableKeyboardNav<any>(
    currentNavItems,
    (row) => {
      if (activeSection === 'PENDING_QUEUE') {
        handleOpenReportModal(row as PendingQCItem);
      } else {
        handleOpenEditManualModal(row as QCInspection);
      }
    }
  );

  return (
    <div className="module-layout-container" style={{ flex: 1, minHeight: 0, height: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingRight: '0.25rem' }}>
      {/* Top Header */}
      <div className="sticky-module-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ShieldCheck size={20} style={{ color: 'var(--accent-primary)' }} />
          <span style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            Quality Control & Inspection (QC)
          </span>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-outline" onClick={handleRefreshLiveSheet} title="Sync and maintain live CSV sheet">
            <RefreshCw size={14} /> Live Sheet
          </button>
          <button type="button" className="btn btn-outline" onClick={handlePrintQCList} title="Print filtered QC inspection report">
            <Printer size={14} /> Print Report
          </button>
          <button className="btn btn-outline" onClick={handleOpenManualModal} title="Record ad-hoc quality inspection">
            <Plus size={15} /> Ad-hoc Inspection
          </button>
        </div>
      </div>

      {/* 2-Section Tab Selector */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '2px solid var(--border-color)', paddingBottom: '0.25rem' }}>
        <button
          className={`btn ${activeSection === 'PENDING_QUEUE' ? 'btn-primary' : 'btn-outline'}`}
          style={{ padding: '0.45rem 1rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, fontSize: '0.85rem' }}
          onClick={() => setActiveSection('PENDING_QUEUE')}
        >
          <ClipboardList size={16} />
          Pending QC Inspection Queue ({pendingQCItems.length})
        </button>

        <button
          className={`btn ${activeSection === 'QC_LOGS' ? 'btn-primary' : 'btn-outline'}`}
          style={{ padding: '0.45rem 1rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, fontSize: '0.85rem' }}
          onClick={() => setActiveSection('QC_LOGS')}
        >
          <History size={16} />
          QC Inspection History & Audit Logs ({qcInspections.length})
        </button>
      </div>

      {/* SECTION 1: PENDING QC QUEUE */}
      {activeSection === 'PENDING_QUEUE' && (
        <>
          {/* Search Bar for Pending Items */}
          <div className="card" style={{ padding: '0.65rem 1rem', display: 'flex', alignItems: 'center', backgroundColor: 'var(--bg-card)', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', width: '380px', maxWidth: '100%' }}>
              <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search vendor, item code, description, GRN..."
                className="input-field"
                style={{ paddingLeft: '2.25rem' }}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Showing <strong>{filteredPendingItems.length}</strong> items awaiting quality inspection from Goods Inward
            </div>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Vendor Name</th>
                  <th>Item Code & Description</th>
                  <th>GRN Ref / PO Ref</th>
                  <th>GRN Date</th>
                  <th style={{ textAlign: 'center' }}>Total Inward Qty</th>
                  <th style={{ textAlign: 'center' }}>Already Inspected</th>
                  <th style={{ textAlign: 'center' }}>Remaining to Inspect</th>
                  <th style={{ textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredPendingItems.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                        <CheckCircle size={32} style={{ color: 'var(--success)' }} />
                        <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>All Goods Inward Items Inspected!</span>
                        <span style={{ fontSize: '0.8rem' }}>No pending QC items in quarantine. New inward items from GRN will appear here.</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredPendingItems.map((item, idx) => {
                    const isNavSelected = selectedIndex === idx;

                    return (
                      <tr
                        key={`${item.grnId}-${item.itemId}`}
                        onClick={() => setSelectedIndex(idx)}
                        onDoubleClick={() => handleOpenReportModal(item)}
                        style={{
                          backgroundColor: isNavSelected ? 'rgba(59, 130, 246, 0.18)' : 'transparent',
                          cursor: 'pointer'
                        }}
                      >
                        <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                          {item.vendorName}
                        </td>
                        <td>
                          <div style={{ fontWeight: 700, color: 'var(--accent-primary)', fontFamily: 'monospace' }}>
                            {item.itemCode}
                          </div>
                          <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                            {item.itemName} {item.partCode ? `[${item.partCode}]` : ''}
                          </div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 700, fontFamily: 'monospace', color: 'var(--success)' }}>
                            {item.grnNumber}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            PO: {item.poNumber}
                          </div>
                        </td>
                        <td style={{ fontSize: '0.85rem' }}>
                          {item.grnDate}
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: 600 }}>
                          {item.totalInwardQty} {item.unit}
                        </td>
                        <td style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                          {item.alreadyInspected} {item.unit}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span className="badge badge-warning" style={{ fontWeight: 800, fontSize: '0.82rem' }}>
                            {item.remainingQty} {item.unit}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                          <button
                            className="btn btn-primary"
                            style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', fontWeight: 700, gap: '0.3rem' }}
                            onClick={() => handleOpenReportModal(item)}
                          >
                            <ShieldCheck size={14} /> Report QC
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* SECTION 2: QC INSPECTION LOGS */}
      {activeSection === 'QC_LOGS' && (
        <>
          {/* Filters Bar */}
          <div className="card" style={{ padding: '0.65rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', backgroundColor: 'var(--bg-card)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', flex: 1 }}>
              <div style={{ position: 'relative', width: '300px', maxWidth: '100%' }}>
                <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="Search report #, GRN, item, vendor, inspector..."
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
                  title="Filter QC logs from this date"
                />
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>To:</span>
                <input
                  type="date"
                  className="input-field"
                  style={{ padding: '0.3rem 0.5rem', fontSize: '0.8rem', width: '135px' }}
                  value={endDateFilter}
                  onChange={(e) => setEndDateFilter(e.target.value)}
                  title="Filter QC logs until this date"
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

              <div>
                <select 
                  className="input-field" 
                  style={{ padding: '0.3rem 0.5rem', fontSize: '0.8rem' }} 
                  value={selectedQCDispositionFilter} 
                  onChange={(e) => setSelectedQCDispositionFilter(e.target.value)}
                >
                  <option value="ALL">All Dispositions</option>
                  <option value="PASSED">Approved / Passed</option>
                  <option value="REJECTED">Rejected / Failed</option>
                  <option value="REWORK_REQUIRED">Rework Required</option>
                  <option value="DESTROYED">Destroyed / Scrapped</option>
                </select>
              </div>
            </div>

            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Total Logs: <strong>{filteredQCs.length}</strong>
            </div>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Date & QC Report #</th>
                  <th>GRN Ref</th>
                  <th>Vendor</th>
                  <th>Component Inspected</th>
                  <th style={{ textAlign: 'center' }}>Inspected</th>
                  <th style={{ textAlign: 'center' }}>Approved</th>
                  <th style={{ textAlign: 'center' }}>Rejected</th>
                  <th>Disposition</th>
                  <th>Inspector</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredQCs.length === 0 ? (
                  <tr>
                    <td colSpan={10} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                      No QC inspection logs found for the selected filters.
                    </td>
                  </tr>
                ) : (
                  filteredQCs.map((q, idx) => {
                    const isNavSelected = selectedIndex === idx;
                    const reportNo = q.qcNumber || q.inspectionNo || 'QC-001';
                    const refNo = q.referenceNo || q.grnNumber || '-';
                    const inspQty = q.inspectedQuantity || q.inspectedQty || 1;
                    const passQty = q.passedQuantity ?? q.approvedQty ?? 0;
                    const failQty = q.failedQuantity ?? q.rejectedQty ?? 0;
                    const disp = q.disposition || q.status || 'PASSED';
                    const inspector = q.inspectorName || 'QC Officer';
                    const inspDate = q.inspectionDate || '-';

                    return (
                      <tr
                        key={q.id}
                        onClick={() => setSelectedIndex(idx)}
                        onDoubleClick={() => handleOpenEditManualModal(q)}
                        style={{
                          backgroundColor: isNavSelected ? 'rgba(59, 130, 246, 0.18)' : 'transparent',
                          cursor: 'pointer'
                        }}
                      >
                        <td>
                          <div style={{ fontWeight: 700, color: 'var(--accent-primary)', fontFamily: 'monospace' }}>
                            {reportNo}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {inspDate}
                          </div>
                        </td>
                        <td style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--success)' }}>
                          {refNo}
                        </td>
                        <td style={{ fontWeight: 600 }}>
                          {q.vendorName || '-'}
                        </td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{q.itemName}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{q.itemCode}</div>
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: 700 }}>
                          {inspQty}
                        </td>
                        <td style={{ textAlign: 'center', color: 'var(--success)', fontWeight: 700 }}>
                          {passQty}
                        </td>
                        <td style={{ textAlign: 'center', color: failQty > 0 ? 'var(--danger)' : 'var(--text-muted)', fontWeight: 700 }}>
                          {failQty}
                        </td>
                        <td>
                          <span className={`badge ${
                            disp === 'PASSED' || disp === 'APPROVED' ? 'badge-success' :
                            disp === 'REJECTED' || disp === 'FAILED' ? 'badge-danger' : 'badge-warning'
                          }`}>
                            {String(disp).replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.85rem' }}>{inspector}</td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                            <button 
                              className="btn btn-outline" 
                              style={{ padding: '0.25rem 0.45rem' }}
                              title="Print QC Certificate"
                              onClick={() => handlePrintSingleQC(q)}
                            >
                              <Printer size={14} />
                            </button>
                            <button 
                              className="btn btn-outline" 
                              style={{ padding: '0.25rem 0.45rem' }}
                              title="Edit / View Details"
                              onClick={() => handleOpenEditManualModal(q)}
                            >
                              <Edit2 size={14} />
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
        </>
      )}

      {/* REPORT QC MODAL DIALOG */}
      {reportModalOpen && reportingItem && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="card" style={{ maxWidth: '580px', width: '100%', padding: '1.25rem', backgroundColor: 'var(--bg-card)', borderRadius: '0.5rem', boxShadow: '0 10px 25px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <ShieldCheck size={20} style={{ color: 'var(--accent-primary)' }} />
                  Report Quality Inspection Result
                </h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  GRN: {reportingItem.grnNumber} | Date: {reportingItem.grnDate}
                </span>
              </div>
              <button type="button" className="btn btn-outline" style={{ padding: '0.25rem 0.5rem' }} onClick={() => setReportModalOpen(false)}>
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleSubmitReportQC} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Item & Vendor Details Banner */}
              <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-subtle, rgba(0,0,0,0.03))', borderRadius: '0.375rem', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Vendor:</span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>{reportingItem.vendorName}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Component:</span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-primary)', fontFamily: 'monospace' }}>
                    {reportingItem.itemCode} - {reportingItem.itemName} {reportingItem.partCode ? `[${reportingItem.partCode}]` : ''}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px dashed var(--border-color)', paddingTop: '0.35rem', marginTop: '0.2rem' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Total Inward Qty: <strong>{reportingItem.totalInwardQty} {reportingItem.unit}</strong></span>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Already Inspected: <strong>{reportingItem.alreadyInspected} {reportingItem.unit}</strong></span>
                  <span style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--accent-primary)' }}>
                    Remaining to Inspect: {reportingItem.remainingQty} {reportingItem.unit}
                  </span>
                </div>
              </div>

              {/* 3 Core Fields: Inspected, Approved, Rejected */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, display: 'block', marginBottom: '0.25rem' }}>
                    Inspected Qty * <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>(Max {reportingItem.remainingQty})</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={reportingItem.remainingQty}
                    required
                    className="input-field"
                    style={{ fontWeight: 700, fontSize: '0.95rem' }}
                    value={reportForm.inspectedQty === 0 ? '' : reportForm.inspectedQty}
                    onChange={(e) => {
                      const val = e.target.value === '' ? 0 : Number(e.target.value);
                      const safeVal = Math.min(reportingItem.remainingQty, Math.max(0, val));
                      setReportForm(prev => ({
                        ...prev,
                        inspectedQty: safeVal
                      }));
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, display: 'block', marginBottom: '0.25rem', color: 'var(--success)' }}>
                    Accepted / Approved *
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={reportForm.inspectedQty}
                    required
                    className="input-field"
                    style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--success)', borderColor: 'var(--success)' }}
                    value={reportForm.approvedQty === 0 ? '0' : reportForm.approvedQty}
                    onChange={(e) => {
                      const val = e.target.value === '' ? 0 : Number(e.target.value);
                      const approved = Math.min(reportForm.inspectedQty, Math.max(0, val));
                      const rejected = Math.max(0, reportForm.inspectedQty - approved);
                      setReportForm(prev => ({
                        ...prev,
                        approvedQty: approved,
                        rejectedQty: rejected
                      }));
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, display: 'block', marginBottom: '0.25rem', color: 'var(--danger)' }}>
                    Rejected / Defect *
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={reportForm.inspectedQty}
                    required
                    className="input-field"
                    style={{ fontWeight: 700, fontSize: '0.95rem', color: reportForm.rejectedQty > 0 ? 'var(--danger)' : 'var(--text-muted)', borderColor: reportForm.rejectedQty > 0 ? 'var(--danger)' : 'var(--border-color)' }}
                    value={reportForm.rejectedQty === 0 ? '0' : reportForm.rejectedQty}
                    onChange={(e) => {
                      const val = e.target.value === '' ? 0 : Number(e.target.value);
                      const rejected = Math.min(reportForm.inspectedQty, Math.max(0, val));
                      const approved = Math.max(0, reportForm.inspectedQty - rejected);
                      setReportForm(prev => ({
                        ...prev,
                        rejectedQty: rejected,
                        approvedQty: approved
                      }));
                    }}
                  />
                </div>
              </div>

              {/* Quick Helper Shortcut Buttons */}
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  style={{ flex: 1, padding: '0.3rem 0.5rem', fontSize: '0.75rem', color: 'var(--success)', fontWeight: 700 }}
                  onClick={() => {
                    setReportForm(prev => ({
                      ...prev,
                      approvedQty: prev.inspectedQty,
                      rejectedQty: 0
                    }));
                  }}
                >
                  <Check size={14} /> 100% Accepted ({reportForm.inspectedQty})
                </button>

                <button
                  type="button"
                  className="btn btn-outline"
                  style={{ flex: 1, padding: '0.3rem 0.5rem', fontSize: '0.75rem', color: 'var(--danger)', fontWeight: 700 }}
                  onClick={() => {
                    setReportForm(prev => ({
                      ...prev,
                      approvedQty: 0,
                      rejectedQty: prev.inspectedQty
                    }));
                  }}
                >
                  <AlertTriangle size={14} /> 100% Rejected ({reportForm.inspectedQty})
                </button>
              </div>

              {/* Formula & Balance Check Alert */}
              {Number(reportForm.approvedQty) + Number(reportForm.rejectedQty) !== Number(reportForm.inspectedQty) && (
                <div style={{ padding: '0.5rem 0.75rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', borderRadius: '0.375rem', fontSize: '0.78rem', fontWeight: 700 }}>
                  ⚠️ Inspected ({reportForm.inspectedQty}) must exactly equal Approved ({reportForm.approvedQty}) + Rejected ({reportForm.rejectedQty}).
                </div>
              )}

              {/* Rejection Notes (if any rejected) */}
              {Number(reportForm.rejectedQty) > 0 && (
                <div style={{ padding: '0.75rem', backgroundColor: 'rgba(239, 68, 68, 0.06)', borderRadius: '0.375rem', border: '1px solid rgba(239, 68, 68, 0.25)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--danger)', margin: 0 }}>
                    Rejection Reason & Defect Observation:
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Dimensions out of tolerance, thread damaged, visual crack..."
                    className="input-field"
                    style={{ fontSize: '0.82rem' }}
                    value={reportForm.defectReason}
                    onChange={(e) => setReportForm({ ...reportForm, defectReason: e.target.value })}
                  />
                </div>
              )}

              {/* Inspection Date & Inspector */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '0.2rem' }}>
                    Inspection Date:
                  </label>
                  <input
                    type="date"
                    required
                    className="input-field"
                    style={{ fontSize: '0.82rem' }}
                    value={reportForm.inspectionDate}
                    onChange={(e) => setReportForm({ ...reportForm, inspectionDate: e.target.value })}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '0.2rem' }}>
                    Inspector Name:
                  </label>
                  <input
                    type="text"
                    required
                    className="input-field"
                    style={{ fontSize: '0.82rem' }}
                    value={reportForm.inspectorName}
                    onChange={(e) => setReportForm({ ...reportForm, inspectorName: e.target.value })}
                  />
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setReportModalOpen(false)}>
                  Cancel (ESC)
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={
                    Number(reportForm.inspectedQty) <= 0 ||
                    Number(reportForm.inspectedQty) > reportingItem.remainingQty ||
                    Number(reportForm.approvedQty) + Number(reportForm.rejectedQty) !== Number(reportForm.inspectedQty)
                  }
                >
                  Confirm & Post QC Report
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AD-HOC / EDIT MANUAL MODAL */}
      {isManualModalOpen && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="card" style={{ maxWidth: '600px', width: '100%', padding: '1.25rem', backgroundColor: 'var(--bg-card)', borderRadius: '0.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                {editingQC ? `Edit QC Report (${editingQC.qcNumber || editingQC.inspectionNo})` : 'Record Ad-hoc Quality Inspection'}
              </h3>
              <button type="button" className="btn btn-outline" style={{ padding: '0.25rem 0.5rem' }} onClick={() => setIsManualModalOpen(false)}>
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleSubmitManualQC} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label>Inspection Report No.</label>
                  <input type="text" required className="input-field" value={manualQcForm.qcNumber} onChange={(e) => setManualQcForm({ ...manualQcForm, qcNumber: e.target.value })} />
                </div>
                <div>
                  <label>Inspection Stage / Type</label>
                  <select className="input-field" value={manualQcForm.type} onChange={(e) => setManualQcForm({ ...manualQcForm, type: e.target.value as QCType })}>
                    <option value="INCOMING_PO">INCOMING_PO (Vendor PO Receipt)</option>
                    <option value="JOBWORK_RETURN">JOBWORK_RETURN (Machining Return)</option>
                    <option value="IN_PROCESS_ASSEMBLY">IN_PROCESS_ASSEMBLY (Sub-assembly)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label>Reference GRN / Challan No.</label>
                  <input type="text" required className="input-field" value={manualQcForm.referenceNo} onChange={(e) => setManualQcForm({ ...manualQcForm, referenceNo: e.target.value })} />
                </div>
                <div>
                  <label>Select Component</label>
                  <select className="input-field" value={manualQcForm.itemId} onChange={(e) => setManualQcForm({ ...manualQcForm, itemId: e.target.value })}>
                    {items.map(i => (
                      <option key={i.id} value={i.id}>{i.itemCode} - {i.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label>Inspected Qty</label>
                  <input type="number" min="1" required className="input-field" value={manualQcForm.inspectedQuantity} onChange={(e) => setManualQcForm({ ...manualQcForm, inspectedQuantity: Number(e.target.value) })} />
                </div>
                <div>
                  <label>Approved Qty</label>
                  <input type="number" min="0" required className="input-field" value={manualQcForm.passedQuantity} onChange={(e) => setManualQcForm({ ...manualQcForm, passedQuantity: Number(e.target.value) })} />
                </div>
                <div>
                  <label>Rejected Qty</label>
                  <input type="number" min="0" required className="input-field" value={manualQcForm.failedQuantity} onChange={(e) => setManualQcForm({ ...manualQcForm, failedQuantity: Number(e.target.value) })} />
                </div>
              </div>

              <div>
                <label>Disposition</label>
                <select className="input-field" value={manualQcForm.disposition} onChange={(e) => setManualQcForm({ ...manualQcForm, disposition: e.target.value as QCDisposition })}>
                  <option value="PASSED">PASSED (Approved)</option>
                  <option value="REJECTED">REJECTED (Scrap / Return)</option>
                  <option value="REWORK_REQUIRED">REWORK REQUIRED</option>
                  <option value="DESTROYED">DESTROYED</option>
                </select>
              </div>

              <div>
                <label>Inspection Notes</label>
                <textarea className="input-field" rows={2} value={manualQcForm.defectReason} onChange={(e) => setManualQcForm({ ...manualQcForm, defectReason: e.target.value })} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsManualModalOpen(false)}>Cancel (ESC)</button>
                <button type="submit" className="btn btn-primary">Save Inspection Report</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Feature-Wise Modular Print Manager Modal */}
      <PrintManagerModal
        isOpen={printModalOpen}
        onClose={() => { setPrintModalOpen(false); setSelectedPrintQC(null); }}
        title={printDocType === 'SINGLE_QC' ? `Print QC Certificate (${selectedPrintQC?.qcNumber || selectedPrintQC?.inspectionNo})` : 'Print QC Audit Inspection Log'}
        documentRefNumber={printDocType === 'SINGLE_QC' ? (selectedPrintQC?.qcNumber || selectedPrintQC?.inspectionNo) : 'QC-REPORT'}
      >
        {printDocType === 'SINGLE_QC' && selectedPrintQC ? (
          <SingleQCPrintView inspection={selectedPrintQC} />
        ) : (
          <QCListPrintView inspections={filteredQCs} filterLabel={isHistorySearch ? 'All Active & Historical QC Inspections' : 'Active QC Inspections'} />
        )}
      </PrintManagerModal>
    </div>
  );
};
