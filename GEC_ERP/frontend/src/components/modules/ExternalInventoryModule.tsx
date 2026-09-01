import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import { Modal } from '../common/Modal';
import { AutocompleteSelect, AutocompleteOption } from '../common/AutocompleteSelect';
import { PrintManagerModal } from '../printTemplates/PrintManagerModal';
import { SingleJobworkPrintView, JobworkListPrintView } from '../printTemplates/JobworkPrintTemplates';
import { Truck, Plus, ArrowRightLeft, CheckCircle, Search, Printer, FileSpreadsheet, ArrowUp, ArrowDown, ArrowUpDown, RefreshCw, AlertTriangle } from 'lucide-react';
import { JobworkChallan, Item } from '../../types/erp';
import { openLiveModuleSheet } from '../../utils/sheetFolderManager';

type JWSortKey = 'challanNo' | 'vendorName' | 'itemName' | 'processRequired' | 'sentQuantity' | 'receivedQuantity' | 'scrapQuantity' | 'pendingBalance' | 'expectedReturnDate' | 'status';

export const ExternalInventoryModule: React.FC = () => {
  const { 
    jobworks, vendors, items, grns, addJobworkChallan, recordJobworkReturn, searchTerm, setSearchTerm 
  } = useERP();

  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [selectedChallan, setSelectedChallan] = useState<JobworkChallan | null>(null);

  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [printDocType, setPrintDocType] = useState<'SINGLE_CHALLAN' | 'CHALLAN_LIST'>('CHALLAN_LIST');
  const [selectedPrintChallan, setSelectedPrintChallan] = useState<JobworkChallan | null>(null);

  const [sortField, setSortField] = useState<JWSortKey>('challanNo');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const [issueData, setIssueData] = useState({
    challanNo: '',
    vendorId: '',
    itemId: '',
    sentQuantity: 1,
    processRequired: 'CNC Turning & Nitriding',
    issueDate: new Date().toISOString().split('T')[0],
    expectedReturnDate: '',
    notes: ''
  });

  const [returnData, setReturnData] = useState({
    receivedQuantity: 1,
    scrapQuantity: 0
  });

  const handleSort = (field: JWSortKey) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const vendorOptions: AutocompleteOption[] = vendors.map(v => ({
    value: v.id,
    label: v.name,
    sublabel: `${v.vendorCode} | ${v.category} | ${v.city}`
  }));

  const itemOptions: AutocompleteOption[] = items.map(i => ({
    value: i.id,
    label: `${i.itemCode} - ${i.name}`,
    sublabel: `In-House Stock: ${i.inHouseStock} ${i.unit}`,
    badge: i.category
  }));

  // Universal @history search handling
  const isHistorySearch = searchTerm.toLowerCase().includes('@history');
  const cleanSearchTerm = searchTerm.replace(/@history/gi, '').trim().toLowerCase();

  const filteredJobworks = jobworks
    .filter(j => {
      const isCompleted = j.status === 'COMPLETED' || j.pendingBalance === 0;
      if (!isHistorySearch && isCompleted) {
        return false;
      }
      return !cleanSearchTerm || (
        j.challanNo.toLowerCase().includes(cleanSearchTerm) ||
        j.vendorName.toLowerCase().includes(cleanSearchTerm) ||
        j.itemName.toLowerCase().includes(cleanSearchTerm) ||
        j.itemCode.toLowerCase().includes(cleanSearchTerm) ||
        j.processRequired.toLowerCase().includes(cleanSearchTerm)
      );
    })
    .sort((a, b) => {
      let valA: any = (a as any)[sortField] ?? '';
      let valB: any = (b as any)[sortField] ?? '';

      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

  const [isDirectGRNShip, setIsDirectGRNShip] = useState(false);
  const [selectedGRNId, setSelectedGRNId] = useState('');
  const [selectedGRNItemId, setSelectedGRNItemId] = useState('');

  // Shortage Calculation for Jobwork Items
  const isJobworkItem = (item: Item) => {
    const p = (item.processType || (item as any).materialProcessType || '').toLowerCase();
    return p.includes('job work') || p.includes('jobwork');
  };

  const getJobworkItemShortage = (item: Item) => {
    const currentStock = (item.inHouseStock || 0) + (item.externalStock || 0);
    const minReq = item.minStockQty || item.reorderLevel || 0;
    const pendingJWQty = jobworks
      .filter(jw => jw.status !== 'COMPLETED' && jw.status !== 'CANCELLED')
      .reduce((sum, jw) => {
        if (jw.itemId === item.id || jw.itemCode === item.itemCode) {
          return sum + (jw.pendingBalance || 0);
        }
        return sum;
      }, 0);
    return Math.max(0, minReq - (currentStock + pendingJWQty));
  };

  const jwShortageItems = items.filter(i => isJobworkItem(i) && !i.isBlocked && getJobworkItemShortage(i) > 0);

  const handleOpenShortageJWModal = (item: Item) => {
    const shortage = getJobworkItemShortage(item);
    const preferredVendorId = item.mappedVendors?.[0]?.vendorId || vendors[0]?.id || '';
    setIssueData({
      challanNo: `JW-GEC-2026-${String(jobworks.length + 1).padStart(3, '0')}`,
      vendorId: preferredVendorId,
      itemId: item.id,
      sentQuantity: Math.max(1, shortage),
      processRequired: 'External Machining & Heat Treatment',
      issueDate: new Date().toISOString().split('T')[0],
      expectedReturnDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
      notes: `Jobwork issued directly from inventory shortage requirement (${shortage} ${item.unit}).`
    });
    setIsDirectGRNShip(false);
    setSelectedGRNId('');
    setSelectedGRNItemId('');
    setIsIssueModalOpen(true);
  };

  const handleOpenIssueModal = () => {
    setIssueData({
      challanNo: `JW-GEC-2026-${String(jobworks.length + 1).padStart(3, '0')}`,
      vendorId: '',
      itemId: '',
      sentQuantity: 1,
      processRequired: '',
      issueDate: new Date().toISOString().split('T')[0],
      expectedReturnDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
      notes: ''
    });
    setIsDirectGRNShip(false);
    setSelectedGRNId('');
    setSelectedGRNItemId('');
    setIsIssueModalOpen(true);
  };

  const handlePrintSingleChallan = (j: JobworkChallan) => {
    setSelectedPrintChallan(j);
    setPrintDocType('SINGLE_CHALLAN');
    setPrintModalOpen(true);
  };

  const handlePrintChallanList = () => {
    setPrintDocType('CHALLAN_LIST');
    setPrintModalOpen(true);
  };

  const handleRefreshLiveSheet = () => {
    const data = filteredJobworks.map(j => ({
      challanNo: j.challanNo,
      vendorName: j.vendorName,
      itemCode: j.itemCode,
      itemName: j.itemName,
      processRequired: j.processRequired,
      sentQuantity: j.sentQuantity,
      receivedQuantity: j.receivedQuantity,
      scrapQuantity: j.scrapQuantity,
      pendingBalance: j.pendingBalance,
      issueDate: j.issueDate,
      expectedReturnDate: j.expectedReturnDate,
      status: j.status
    }));

    const headers: { key: keyof typeof data[0]; label: string }[] = [
      { key: 'challanNo', label: 'Challan No' },
      { key: 'vendorName', label: 'Processing Vendor' },
      { key: 'itemCode', label: 'Component Code' },
      { key: 'itemName', label: 'Component Name' },
      { key: 'processRequired', label: 'Process Required' },
      { key: 'sentQuantity', label: 'Sent Quantity' },
      { key: 'receivedQuantity', label: 'Received Quantity' },
      { key: 'scrapQuantity', label: 'Scrap Quantity' },
      { key: 'pendingBalance', label: 'Pending Balance' },
      { key: 'issueDate', label: 'Issue Date' },
      { key: 'expectedReturnDate', label: 'Expected Return Date' },
      { key: 'status', label: 'Challan Status' }
    ];

    openLiveModuleSheet('Jobwork', 'GEC_Jobwork_Challans_Live', data, headers);
  };

  const handleOpenReturnModal = (challan: JobworkChallan) => {
    setSelectedChallan(challan);
    setReturnData({
      receivedQuantity: challan.pendingBalance,
      scrapQuantity: 0
    });
    setIsReturnModalOpen(true);
  };

  const handleIssueSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const vendor = vendors.find(v => v.id === issueData.vendorId);
    const item = items.find(i => i.id === issueData.itemId);

    if (!vendor) {
      alert('Please select a processing vendor.');
      return;
    }
    if (!item) {
      alert('Please select a component to send.');
      return;
    }

    if (!isDirectGRNShip && issueData.sentQuantity > item.inHouseStock) {
      alert(`Cannot issue ${issueData.sentQuantity} ${item.unit}. Only ${item.inHouseStock} ${item.unit} available in house!`);
      return;
    }

    addJobworkChallan({
      challanNo: issueData.challanNo,
      vendorId: vendor.id,
      vendorName: vendor.name,
      itemId: item.id,
      itemCode: item.itemCode,
      itemName: item.name,
      processRequired: issueData.processRequired || 'Jobwork Processing',
      sentQuantity: Number(issueData.sentQuantity),
      receivedQuantity: 0,
      scrapQuantity: 0,
      issueDate: issueData.issueDate,
      expectedReturnDate: issueData.expectedReturnDate,
      notes: issueData.notes
    });

    setIsIssueModalOpen(false);
  };

  const handleReturnSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChallan) return;

    recordJobworkReturn(
      selectedChallan.id,
      Number(returnData.receivedQuantity),
      Number(returnData.scrapQuantity)
    );

    setIsReturnModalOpen(false);
  };

  return (
    <div className="module-layout-container">
      <div className="sticky-module-header">
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>External Jobwork Inventory</h2>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Track components sent out for heat treatment, machining, and surface coating
          </span>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-outline" onClick={handleRefreshLiveSheet} title="Sync and maintain live CSV sheet">
            <RefreshCw size={14} /> Live Sheet
          </button>
          <button type="button" className="btn btn-outline" onClick={handlePrintChallanList} title="Print filtered jobwork challans report">
            <Printer size={14} /> Print Report
          </button>
          <button id="btn-new-jw" className="btn btn-primary" onClick={handleOpenIssueModal}>
            <Plus size={16} /> Create Manual Job Work Challan
          </button>
        </div>
      </div>

      {/* Shortage Alert Banner */}
      {jwShortageItems.length > 0 && (
        <div className="card" style={{ padding: '0.875rem 1.25rem', backgroundColor: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '0.5rem', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <AlertTriangle size={20} color="var(--danger)" />
              <div>
                <span style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--danger)' }}>
                  Jobwork Shortage Alert: {jwShortageItems.length} Item(s) Below Minimum Stock Requirement!
                </span>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Click on any item button below to directly open pre-filled Job Work Challan issue modal.
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              {jwShortageItems.map(item => {
                const shortage = getJobworkItemShortage(item);
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
                    onClick={() => handleOpenShortageJWModal(item)}
                  >
                    {item.itemCode}: Send {shortage} {item.unit}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Summary Stat Pill */}
      <div className="card" style={{ padding: '0.75rem 1rem', display: 'flex', gap: '2rem', alignItems: 'center', backgroundColor: 'var(--bg-card)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Truck size={24} style={{ color: 'var(--warning)' }} />
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Active External Challans</div>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--warning)' }}>
              {jobworks.filter(j => j.status !== 'COMPLETED').length}
            </div>
          </div>
        </div>
        <div style={{ borderLeft: '1px solid var(--border-color)', height: '30px' }} />
        <div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Pending Items at Vendor Premises</div>
          <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            {jobworks.reduce((sum, j) => sum + j.pendingBalance, 0)} Units
          </div>
        </div>
      </div>

      {/* Inline Search Bar */}
      <div className="card" style={{ padding: '0.65rem 1rem', display: 'flex', alignItems: 'center', backgroundColor: 'var(--bg-card)', flexShrink: 0, gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', width: '380px', maxWidth: '100%' }}>
          <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search challan no, vendor, part... (type @history to search completed)"
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

      {/* Jobwork Table with Sorting */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th onClick={() => handleSort('challanNo')} style={{ cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  Challan No. {sortField === 'challanNo' ? (sortOrder === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} />) : <ArrowUpDown size={12} color="var(--text-muted)" />}
                </div>
              </th>
              <th onClick={() => handleSort('vendorName')} style={{ cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  Vendor Name {sortField === 'vendorName' ? (sortOrder === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} />) : <ArrowUpDown size={12} color="var(--text-muted)" />}
                </div>
              </th>
              <th onClick={() => handleSort('itemName')} style={{ cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  Component Sent {sortField === 'itemName' ? (sortOrder === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} />) : <ArrowUpDown size={12} color="var(--text-muted)" />}
                </div>
              </th>
              <th onClick={() => handleSort('processRequired')} style={{ cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  Process Required {sortField === 'processRequired' ? (sortOrder === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} />) : <ArrowUpDown size={12} color="var(--text-muted)" />}
                </div>
              </th>
              <th onClick={() => handleSort('sentQuantity')} style={{ cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  Sent Qty {sortField === 'sentQuantity' ? (sortOrder === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} />) : <ArrowUpDown size={12} color="var(--text-muted)" />}
                </div>
              </th>
              <th onClick={() => handleSort('receivedQuantity')} style={{ cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  Recd Qty {sortField === 'receivedQuantity' ? (sortOrder === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} />) : <ArrowUpDown size={12} color="var(--text-muted)" />}
                </div>
              </th>
              <th onClick={() => handleSort('scrapQuantity')} style={{ cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  Scrap {sortField === 'scrapQuantity' ? (sortOrder === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} />) : <ArrowUpDown size={12} color="var(--text-muted)" />}
                </div>
              </th>
              <th onClick={() => handleSort('pendingBalance')} style={{ cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  Pending at Vendor {sortField === 'pendingBalance' ? (sortOrder === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} />) : <ArrowUpDown size={12} color="var(--text-muted)" />}
                </div>
              </th>
              <th onClick={() => handleSort('expectedReturnDate')} style={{ cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  Expected Return {sortField === 'expectedReturnDate' ? (sortOrder === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} />) : <ArrowUpDown size={12} color="var(--text-muted)" />}
                </div>
              </th>
              <th onClick={() => handleSort('status')} style={{ cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  Status {sortField === 'status' ? (sortOrder === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} />) : <ArrowUpDown size={12} color="var(--text-muted)" />}
                </div>
              </th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredJobworks.map(j => {
              const isHistory = j.status === 'COMPLETED' || j.pendingBalance === 0;

              return (
                <tr key={j.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <span style={{ fontWeight: 700, color: 'var(--warning)', fontFamily: 'monospace' }}>
                        {j.challanNo}
                      </span>
                      {isHistory && (
                        <span className="badge" style={{ backgroundColor: '#7c3aed', color: '#fff', fontSize: '0.65rem', padding: '0.1rem 0.35rem' }}>
                          📜 HISTORY
                        </span>
                      )}
                    </div>
                  </td>
                  <td style={{ fontWeight: 600 }}>{j.vendorName}</td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{j.itemName}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{j.itemCode}</div>
                  </td>
                  <td style={{ fontSize: '0.85rem', color: 'var(--accent-primary)', fontWeight: 500 }}>
                    {j.processRequired}
                  </td>
                  <td style={{ fontWeight: 700 }}>{j.sentQuantity} PCS</td>
                  <td style={{ color: 'var(--success)', fontWeight: 600 }}>{j.receivedQuantity} PCS</td>
                  <td style={{ color: j.scrapQuantity > 0 ? 'var(--danger)' : 'var(--text-muted)' }}>{j.scrapQuantity} PCS</td>
                  <td>
                    <span style={{ fontSize: '0.95rem', fontWeight: 800, color: j.pendingBalance > 0 ? 'var(--warning)' : 'var(--success)' }}>
                      {j.pendingBalance} PCS
                    </span>
                  </td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{j.expectedReturnDate}</td>
                  <td>
                    <span className={`badge ${j.status === 'COMPLETED' ? 'badge-success' : 'badge-warning'}`}>
                      {j.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                      <button className="btn btn-outline" style={{ padding: '0.3rem 0.5rem' }} title="Print Challan Gatepass" onClick={() => handlePrintSingleChallan(j)}>
                        <Printer size={14} />
                      </button>
                      {j.pendingBalance > 0 ? (
                        <button 
                          className="btn btn-outline" 
                          style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem', color: 'var(--success)', borderColor: 'var(--success)' }}
                          onClick={() => handleOpenReturnModal(j)}
                        >
                          <ArrowRightLeft size={14} /> Record Receipt
                        </button>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: 'var(--success)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                          <CheckCircle size={14} /> Complete
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

      {/* Modal: Issue Outward Jobwork */}
      <Modal
        isOpen={isIssueModalOpen}
        onClose={() => setIsIssueModalOpen(false)}
        title="Issue Outward Jobwork Challan"
      >
        <form onSubmit={handleIssueSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          {/* Direct GRN Source Checkbox */}
          <div style={{ padding: '0.65rem 0.85rem', backgroundColor: 'rgba(59, 130, 246, 0.08)', borderRadius: '0.5rem', border: '1px solid rgba(59, 130, 246, 0.25)' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem', color: 'var(--accent-primary)', marginBottom: isDirectGRNShip ? '0.5rem' : '0' }}>
              <input 
                type="checkbox" 
                checked={isDirectGRNShip} 
                onChange={(e) => {
                  const checked = e.target.checked;
                  setIsDirectGRNShip(checked);
                  if (!checked) {
                    setSelectedGRNId('');
                    setSelectedGRNItemId('');
                  }
                }} 
              />
              Direct Ship Received Goods from Source GRN to External Jobwork
            </label>

            {isDirectGRNShip && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: '0.5rem' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Select Source GRN *</label>
                  <select 
                    className="input-field" 
                    required={isDirectGRNShip}
                    value={selectedGRNId}
                    style={{ fontSize: '0.82rem' }}
                    onChange={(e) => {
                      const grnId = e.target.value;
                      setSelectedGRNId(grnId);
                      const grnObj = grns.find(g => g.id === grnId);
                      if (grnObj && grnObj.items.length > 0) {
                        const firstItem = grnObj.items[0];
                        setSelectedGRNItemId(firstItem.itemId || '');
                        const matchingItem = items.find(i => i.id === firstItem.itemId || i.itemCode === firstItem.itemCode);
                        setIssueData(prev => ({
                          ...prev,
                          itemId: matchingItem?.id || firstItem.itemId || '',
                          sentQuantity: firstItem.acceptedQty || firstItem.receivedQty || 1,
                          notes: `Direct dispatch from GRN ${grnObj.grnNumber} (PO: ${grnObj.poNumber})`
                        }));
                      }
                    }}
                  >
                    <option value="">-- Select Source GRN --</option>
                    {grns.map(g => (
                      <option key={g.id} value={g.id}>
                        {g.grnNumber} - Vendor: {g.vendorName} ({g.items.length} items on {g.receivedDate})
                      </option>
                    ))}
                  </select>
                </div>

                {selectedGRNId && (() => {
                  const currentGRN = grns.find(g => g.id === selectedGRNId);
                  return (
                    <div>
                      <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Select Item from this GRN *</label>
                      <select 
                        className="input-field" 
                        required={isDirectGRNShip}
                        value={selectedGRNItemId}
                        style={{ fontSize: '0.82rem' }}
                        onChange={(e) => {
                          const itId = e.target.value;
                          setSelectedGRNItemId(itId);
                          const grnItem = currentGRN?.items.find(it => (it.itemId || it.itemCode) === itId);
                          const matchingItem = items.find(i => i.id === itId || i.itemCode === itId);
                          if (grnItem) {
                            setIssueData(prev => ({
                              ...prev,
                              itemId: matchingItem?.id || grnItem.itemId || '',
                              sentQuantity: grnItem.acceptedQty || grnItem.receivedQty || 1
                            }));
                          }
                        }}
                      >
                        <option value="">-- Select Item from GRN --</option>
                        {currentGRN?.items.map((grnIt, idx) => (
                          <option key={idx} value={grnIt.itemId || grnIt.itemCode}>
                            {grnIt.itemCode} - {grnIt.itemName} (Available in GRN: {grnIt.acceptedQty || grnIt.receivedQty || 0} {grnIt.unit || 'PCS'})
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>

          {/* If NOT Direct GRN Ship, Choose Component Item First */}
          {!isDirectGRNShip && (
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.25rem', color: 'var(--accent-primary)' }}>
                1. Search Component to Send *
              </label>
              <AutocompleteSelect
                options={itemOptions}
                value={issueData.itemId}
                onChange={(val) => setIssueData({ ...issueData, itemId: val })}
                placeholder="Type component code or name..."
              />
            </div>
          )}

          {/* Search Processing Vendor Second */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.25rem' }}>
                2. Search Processing Vendor *
              </label>
              <AutocompleteSelect
                options={vendorOptions}
                value={issueData.vendorId}
                onChange={(val) => setIssueData({ ...issueData, vendorId: val })}
                placeholder="Type vendor name..."
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.25rem' }}>Challan No.</label>
              <input type="text" required className="input-field" value={issueData.challanNo} onChange={(e) => setIssueData({ ...issueData, challanNo: e.target.value })} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.25rem' }}>Quantity to Send *</label>
              <input type="number" min="1" required className="input-field" value={issueData.sentQuantity} onChange={(e) => setIssueData({ ...issueData, sentQuantity: Number(e.target.value) })} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.25rem' }}>Process Required *</label>
              <input type="text" required className="input-field" placeholder="e.g. CNC Turning, Nitriding 0.4mm, Grinding" value={issueData.processRequired} onChange={(e) => setIssueData({ ...issueData, processRequired: e.target.value })} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.25rem' }}>Issue Date</label>
              <input type="date" required className="input-field" value={issueData.issueDate} onChange={(e) => setIssueData({ ...issueData, issueDate: e.target.value })} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.25rem' }}>Expected Return Date</label>
              <input type="date" required className="input-field" value={issueData.expectedReturnDate} onChange={(e) => setIssueData({ ...issueData, expectedReturnDate: e.target.value })} />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.25rem' }}>Remarks</label>
            <textarea className="input-field" rows={2} value={issueData.notes} onChange={(e) => setIssueData({ ...issueData, notes: e.target.value })} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsIssueModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary">Dispatch Outward Challan</button>
          </div>
        </form>
      </Modal>

      {/* Modal: Record Inward Jobwork Return */}
      <Modal
        isOpen={isReturnModalOpen}
        onClose={() => setIsReturnModalOpen(false)}
        title={`Record Jobwork Receipt: ${selectedChallan?.challanNo || ''}`}
      >
        <form onSubmit={handleReturnSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ padding: '0.875rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: '0.5rem', border: '1px solid var(--border-color)' }}>
            <div style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>{selectedChallan?.itemName}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Vendor: {selectedChallan?.vendorName} &bull; Process: {selectedChallan?.processRequired}
            </div>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--warning)', marginTop: '0.25rem' }}>
              Pending Balance at Vendor: {selectedChallan?.pendingBalance} PCS
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.25rem' }}>Processed Quantity Received Back</label>
              <input type="number" min="0" max={selectedChallan?.pendingBalance || 99} required className="input-field" value={returnData.receivedQuantity} onChange={(e) => setReturnData({ ...returnData, receivedQuantity: Number(e.target.value) })} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.25rem' }}>Scrap / Rejected Qty</label>
              <input type="number" min="0" required className="input-field" value={returnData.scrapQuantity} onChange={(e) => setReturnData({ ...returnData, scrapQuantity: Number(e.target.value) })} />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsReturnModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary">Save Inward Receipt</button>
          </div>
        </form>
      </Modal>

      {/* Feature-Wise Modular Print Manager Modal */}
      <PrintManagerModal
        isOpen={printModalOpen}
        onClose={() => { setPrintModalOpen(false); setSelectedPrintChallan(null); }}
        title={printDocType === 'SINGLE_CHALLAN' ? `Print Jobwork Challan Gatepass (${selectedPrintChallan?.challanNo})` : 'Print Jobwork Challans Ledger'}
        documentRefNumber={printDocType === 'SINGLE_CHALLAN' ? selectedPrintChallan?.challanNo : 'JW-REPORT'}
      >
        {printDocType === 'SINGLE_CHALLAN' && selectedPrintChallan ? (
          <SingleJobworkPrintView challan={selectedPrintChallan} />
        ) : (
          <JobworkListPrintView challans={filteredJobworks} filterLabel={isHistorySearch ? 'All Active & Completed Jobwork Challans' : 'Active External Challans'} />
        )}
      </PrintManagerModal>
    </div>
  );
};
