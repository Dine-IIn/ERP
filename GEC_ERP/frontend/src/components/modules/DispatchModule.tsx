import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import { Modal } from '../common/Modal';
import { PrintManagerModal } from '../printTemplates/PrintManagerModal';
import { SingleDispatchPrintView, DispatchListPrintView } from '../printTemplates/JobCardPrintTemplates';
import { openLiveModuleSheet } from '../../utils/sheetFolderManager';
import { 
  Truck, PackageCheck, Send, RotateCcw, AlertTriangle, 
  CheckCircle, Search, Printer, User, FileText, ArrowRight, ShieldCheck, RefreshCw 
} from 'lucide-react';
import { SalesOrder, FinishedGoodUnit, DispatchRecord } from '../../types/erp';

export const DispatchModule: React.FC = () => {
  const { 
    salesOrders, finishedGoods, dispatchRecords, workOrders, 
    reallocateFinishedGood, dispatchFinishedGood 
  } = useERP();

  const [isDispatchModalOpen, setIsDispatchModalOpen] = useState(false);
  const [selectedFG, setSelectedFG] = useState<FinishedGoodUnit | null>(null);
  const [targetSOId, setTargetSOId] = useState('');

  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [printDocType, setPrintDocType] = useState<'SINGLE_DISPATCH' | 'DISPATCH_LIST'>('DISPATCH_LIST');
  const [selectedPrintDispatch, setSelectedPrintDispatch] = useState<DispatchRecord | null>(null);

  // Dispatch Form
  const [transporterName, setTransporterName] = useState('V-Trans Express Logistics');
  const [vehicleNo, setVehicleNo] = useState('GJ-01-AX-9944');
  const [docketNo, setDocketNo] = useState(`VT-${Math.floor(10000000 + Math.random() * 90000000)}`);
  const [dispatchNotes, setDispatchNotes] = useState('Dispatched with operational manuals and toolkit.');

  const [searchQuery, setSearchQuery] = useState('');

  // Ready Finished Goods in Stock
  const inStockUnits = finishedGoods.filter(fg => fg.status === 'IN_STOCK' || fg.status === 'ALLOCATED');
  
  // Pending Sales Orders
  const pendingSOs: SalesOrder[] = salesOrders.filter(s => s.status !== 'COMPLETED');

  // Only match SOs that have exact machine model and identical WO custom configuration to this finished good
  const getMatchingSOsForFG = (fg: FinishedGoodUnit) => {
    return pendingSOs.filter((so: SalesOrder) => {
      const normalize = (s: string) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const soModelNorm = normalize(so.machineModel);
      const fgModelNorm = normalize(fg.machineModel);
      const isModelMatch = soModelNorm.includes(fgModelNorm) || fgModelNorm.includes(soModelNorm);
      if (!isModelMatch) return false;

      // Check linked WO configuration
      const linkedWO = workOrders.find(w => w.soId === so.id || (so.soNumber && w.soNumber === so.soNumber));
      const woCustomParts = (linkedWO?.woComponents || []).filter(c => c.isCustomExtra);
      const fgCustomParts = fg.customPartsDiff || [];

      // Both standard BOM units (no extra modifications)
      if (woCustomParts.length === 0 && fgCustomParts.length === 0) {
        return true;
      }

      // If custom parts exist, verify identical component codes
      if (woCustomParts.length !== fgCustomParts.length) return false;
      const woPartCodes = woCustomParts.map(c => c.itemCode).sort().join('|');
      const fgPartCodes = [...fgCustomParts].sort().join('|');
      return woPartCodes === fgPartCodes;
    });
  };

  const handleOpenDispatchModal = (fg: FinishedGoodUnit) => {
    setSelectedFG(fg);
    const matching = getMatchingSOsForFG(fg);
    const initialSO = matching.find(s => s.id === fg.allocatedSOId) || matching[0];

    setTargetSOId(initialSO?.id || '');
    setTransporterName('V-Trans Express Logistics');
    setVehicleNo('GJ-01-AX-9944');
    setDocketNo(`VT-${Math.floor(10000000 + Math.random() * 90000000)}`);
    setIsDispatchModalOpen(true);
  };

  const handleExecuteDispatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFG || !targetSOId) return;

    const targetSO = salesOrders.find(s => s.id === targetSOId);
    if (!targetSO) return;

    dispatchFinishedGood({
      soId: targetSO.id,
      soNumber: targetSO.soNumber,
      customerName: targetSO.customerName,
      finishedGoodId: selectedFG.id,
      serialNo: selectedFG.serialNo,
      machineModel: selectedFG.machineModel,
      dispatchDate: new Date().toISOString().split('T')[0],
      transporterName,
      vehicleNo,
      docketNo,
      notes: dispatchNotes
    });

    setIsDispatchModalOpen(false);
    setSelectedFG(null);
    alert(`🎉 Machine ${selectedFG.serialNo} dispatched successfully to ${targetSO.customerName}!`);
  };

  const handleReallocateSO = (fgId: string, soId: string) => {
    reallocateFinishedGood(fgId, soId);
  };

  // Universal @history search handling
  const isHistorySearch = searchQuery.toLowerCase().includes('@history');
  const cleanSearchTerm = searchQuery.replace(/@history/gi, '').trim().toLowerCase();

  const filteredDispatchHistory = dispatchRecords.filter(d =>
    !cleanSearchTerm ||
    d.dispatchNo.toLowerCase().includes(cleanSearchTerm) ||
    d.customerName.toLowerCase().includes(cleanSearchTerm) ||
    d.serialNo.toLowerCase().includes(cleanSearchTerm) ||
    d.soNumber.toLowerCase().includes(cleanSearchTerm)
  );

  const handlePrintSingleDispatch = (d: DispatchRecord) => {
    setSelectedPrintDispatch(d);
    setPrintDocType('SINGLE_DISPATCH');
    setPrintModalOpen(true);
  };

  const handlePrintDispatchList = () => {
    setPrintDocType('DISPATCH_LIST');
    setPrintModalOpen(true);
  };

  const handleRefreshLiveSheet = () => {
    const data = filteredDispatchHistory.map(d => ({
      dispatchNo: d.dispatchNo,
      serialNo: d.serialNo,
      machineModel: d.machineModel,
      customerName: d.customerName,
      soNumber: d.soNumber,
      transporterName: d.transporterName || '-',
      vehicleNo: d.vehicleNo || '-',
      docketNo: d.docketNo || '-',
      dispatchDate: d.dispatchDate,
      notes: d.notes || ''
    }));

    const headers: { key: keyof typeof data[0]; label: string }[] = [
      { key: 'dispatchNo', label: 'Dispatch No' },
      { key: 'serialNo', label: 'Machine Serial No' },
      { key: 'machineModel', label: 'Machine Model' },
      { key: 'customerName', label: 'Customer Name' },
      { key: 'soNumber', label: 'Sales Order Ref' },
      { key: 'transporterName', label: 'Transporter' },
      { key: 'vehicleNo', label: 'Vehicle No' },
      { key: 'docketNo', label: 'LR / Docket No' },
      { key: 'dispatchDate', label: 'Dispatch Date' },
      { key: 'notes', label: 'Dispatch Notes' }
    ];

    openLiveModuleSheet('Dispatch', 'GEC_ERP_Dispatch_Register_Live', data, headers);
  };

  return (
    <div className="module-layout-container">
      
      {/* Header */}
      <div className="sticky-module-header">
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
            <Truck size={20} color="var(--accent-primary)" />
            Finished Goods Allocation & Dispatch Panel
          </h2>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Automated BOM/spec comparison &bull; Urgent customer stock re-allocation &bull; Gate Pass & Logistics Tracking
          </span>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-outline" onClick={handleRefreshLiveSheet} title="Sync and maintain live CSV sheet">
            <RefreshCw size={14} /> Live Sheet
          </button>
          <button type="button" className="btn btn-outline" onClick={handlePrintDispatchList} title="Print filtered dispatch register report">
            <Printer size={14} /> Print Report
          </button>
        </div>
      </div>

      {/* 1. Finished Goods Ready in Stock Table */}
      <div className="card" style={{ padding: '1.25rem', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-primary)' }}>
            <PackageCheck size={18} color="var(--success)" />
            Ready Machines in Finished Goods Bay ({inStockUnits.length})
          </h3>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            Compare specs & swap priority between urgent customers
          </span>
        </div>

        {inStockUnits.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            No machines currently in Finished Goods stock. Complete active Work Orders in Floor Planning to add stock.
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Serial Number</th>
                  <th>Machine Model</th>
                  <th>Origin Work Order</th>
                  <th>Configuration Notes (BOM vs Custom)</th>
                  <th>Allocated Customer / SO</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {inStockUnits.map(fg => {
                  const isAllocated = fg.allocatedCustomerName && fg.allocatedSONumber;

                  return (
                    <tr key={fg.id}>
                      <td style={{ fontWeight: 800, fontFamily: 'monospace', color: 'var(--accent-primary)' }}>
                        {fg.serialNo}
                      </td>
                      <td style={{ fontWeight: 700 }}>{fg.machineModel}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.82rem' }}>{fg.woNumber}</td>
                      <td>
                        <div style={{ fontSize: '0.82rem', fontWeight: 600, color: fg.customPartsDiff && fg.customPartsDiff.length > 0 ? 'var(--warning)' : 'var(--text-primary)' }}>
                          {fg.configurationNote}
                        </div>
                      </td>
                      <td>
                        {isAllocated ? (
                          <div>
                            <strong style={{ fontSize: '0.85rem' }}>{fg.allocatedCustomerName}</strong>
                            <span style={{ display: 'block', fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--accent-primary)' }}>
                              {fg.allocatedSONumber}
                            </span>
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Unallocated Buffer Stock</span>
                        )}
                      </td>
                      <td>
                        <span className="badge badge-success">In Finished Bay</span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                          
                          {/* Urgent Swap / Reallocate Dropdown - Strict Configuration Matching */}
                          {(() => {
                            const matchingSOs = getMatchingSOsForFG(fg);

                            return (
                              <select 
                                className="input-field" 
                                style={{ fontSize: '0.75rem', padding: '0.25rem 0.4rem', width: '160px' }}
                                value={fg.allocatedSOId || ''}
                                onChange={(e) => handleReallocateSO(fg.id, e.target.value)}
                              >
                                <option value="" disabled>-- Reallocate to Matching SO --</option>
                                {matchingSOs.length === 0 ? (
                                  <option disabled value="">No identical build SO pending</option>
                                ) : (
                                  matchingSOs.map(s => (
                                    <option key={s.id} value={s.id}>
                                      {s.soNumber} ({s.customerName})
                                    </option>
                                  ))
                                )}
                              </select>
                            );
                          })()}

                          <button 
                            className="btn btn-primary" 
                            style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                            onClick={() => handleOpenDispatchModal(fg)}
                          >
                            <Send size={13} />
                            <span>Dispatch</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 2. Dispatch History Records */}
      <div className="card" style={{ padding: '1.25rem', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.875rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <FileText size={17} color="var(--accent-primary)" />
            Completed Dispatch Records & Gate Pass History
          </h3>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', width: '300px' }}>
              <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input 
                type="text" 
                placeholder="Search dispatch no, customer, serial... (type @history)" 
                className="input-field" 
                style={{ paddingLeft: '2.25rem', fontSize: '0.78rem' }}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {isHistorySearch && (
              <span className="badge" style={{ backgroundColor: '#7c3aed', color: '#ffffff', fontSize: '0.75rem', fontWeight: 700 }}>
                📜 History Active
              </span>
            )}
          </div>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Dispatch No</th>
                <th>Serial Number</th>
                <th>Machine Model</th>
                <th>Customer Name</th>
                <th>Sales Order</th>
                <th>Transporter & Vehicle</th>
                <th>Docket / LR No</th>
                <th>Dispatch Date</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredDispatchHistory.map(d => (
                <tr key={d.id}>
                  <td style={{ fontWeight: 700, fontFamily: 'monospace', color: 'var(--accent-primary)' }}>
                    {d.dispatchNo}
                  </td>
                  <td style={{ fontWeight: 800, fontFamily: 'monospace' }}>{d.serialNo}</td>
                  <td style={{ fontSize: '0.85rem' }}>{d.machineModel}</td>
                  <td style={{ fontWeight: 600 }}>{d.customerName}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.82rem' }}>{d.soNumber}</td>
                  <td style={{ fontSize: '0.82rem' }}>
                    <div>{d.transporterName || '-'}</div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{d.vehicleNo || '-'}</span>
                  </td>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.82rem' }}>{d.docketNo || '-'}</td>
                  <td style={{ fontSize: '0.85rem' }}>{d.dispatchDate}</td>
                  <td>
                    <button 
                      className="btn btn-outline" 
                      style={{ padding: '0.2rem 0.45rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                      title="Print Outward Gate Pass & Dispatch Challan"
                      onClick={() => handlePrintSingleDispatch(d)}
                    >
                      <Printer size={13} />
                      <span>Gate Pass</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Execute Dispatch */}
      {selectedFG && (
        <Modal isOpen={isDispatchModalOpen} onClose={() => setIsDispatchModalOpen(false)} title={`Dispatch Machine: ${selectedFG.serialNo}`}>
          <form onSubmit={handleExecuteDispatch} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            
            <div style={{ padding: '0.75rem 1rem', backgroundColor: 'rgba(59, 130, 246, 0.1)', borderRadius: '0.5rem', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
              <div style={{ fontWeight: 800, color: 'var(--accent-primary)' }}>{selectedFG.machineModel}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Configuration: <strong>{selectedFG.configurationNote}</strong>
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.82rem', fontWeight: 700 }}>Dispatch Against Sales Order (Target Customer)</label>
              {(() => {
                const matchingSOs = getMatchingSOsForFG(selectedFG);

                if (matchingSOs.length === 0) {
                  return (
                    <div style={{ padding: '0.5rem 0.75rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--danger)', borderRadius: '0.375rem', color: 'var(--danger)', fontSize: '0.82rem' }}>
                      ⚠️ No open Sales Order matches this exact Machine Model & WO Configuration. Only identical builds can be dispatched.
                    </div>
                  );
                }

                return (
                  <select 
                    className="input-field" 
                    required
                    value={targetSOId} 
                    onChange={(e) => setTargetSOId(e.target.value)}
                  >
                    <option value="" disabled>-- Select Compatible Sales Order --</option>
                    {matchingSOs.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.soNumber} - {s.customerName} ({s.machineModel})
                      </option>
                    ))}
                  </select>
                );
              })()}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 700 }}>Transporter / Logistics Partner</label>
                <input 
                  type="text" 
                  required 
                  className="input-field" 
                  value={transporterName} 
                  onChange={(e) => setTransporterName(e.target.value)} 
                />
              </div>
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 700 }}>Vehicle / Truck Number</label>
                <input 
                  type="text" 
                  required 
                  className="input-field" 
                  value={vehicleNo} 
                  onChange={(e) => setVehicleNo(e.target.value)} 
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 700 }}>Docket / Lorry Receipt (LR) No</label>
                <input 
                  type="text" 
                  required 
                  className="input-field" 
                  value={docketNo} 
                  onChange={(e) => setDocketNo(e.target.value)} 
                />
              </div>
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 700 }}>Dispatch Notes / Accessories Included</label>
                <input 
                  type="text" 
                  className="input-field" 
                  value={dispatchNotes} 
                  onChange={(e) => setDispatchNotes(e.target.value)} 
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setIsDispatchModalOpen(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary">
                <Send size={15} /> Confirm & Dispatch
              </button>
            </div>

          </form>
        </Modal>
      )}

      {/* Feature-Wise Modular Print Manager Modal */}
      <PrintManagerModal
        isOpen={printModalOpen}
        onClose={() => { setPrintModalOpen(false); setSelectedPrintDispatch(null); }}
        title={printDocType === 'SINGLE_DISPATCH' ? `Print Dispatch Gate Pass (${selectedPrintDispatch?.dispatchNo})` : 'Print Dispatch History Register'}
        documentRefNumber={printDocType === 'SINGLE_DISPATCH' ? selectedPrintDispatch?.dispatchNo : 'DISPATCH-REPORT'}
      >
        {printDocType === 'SINGLE_DISPATCH' && selectedPrintDispatch ? (
          <SingleDispatchPrintView dispatch={selectedPrintDispatch} />
        ) : (
          <DispatchListPrintView records={filteredDispatchHistory} filterLabel={isHistorySearch ? 'All Historical Dispatch Register' : 'Recent Dispatch Records'} />
        )}
      </PrintManagerModal>
    </div>
  );
};
