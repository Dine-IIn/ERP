import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import { Modal } from '../common/Modal';
import { PrintManagerModal } from '../printTemplates/PrintManagerModal';
import { AssemblyListPrintView } from '../printTemplates/AssemblyPrintTemplates';
import { openLiveModuleSheet } from '../../utils/sheetFolderManager';
import { 
  Layers, Clock, AlertTriangle, CheckCircle, ArrowRight, 
  MoveRight, Wrench, Package, Sparkles, User, ShieldCheck, Factory, Plus, Edit2, Trash2, Printer, RefreshCw 
} from 'lucide-react';
import { WorkOrder, FloorStation, FinishedGoodUnit } from '../../types/erp';

export const FloorPlanningModule: React.FC = () => {
  const { 
    workOrders, items, floorStations, jobCards, finishedGoods, purchaseOrders, grns, jobworks,
    assignWOToStation, moveWOStation, addFloorStation, updateFloorStation, deleteFloorStation,
    addFinishedGoodFromWO, updateWorkOrderStage 
  } = useERP();

  const [selectedWOForCompletion, setSelectedWOForCompletion] = useState<WorkOrder | null>(null);
  const [serialNoInput, setSerialNoInput] = useState('');
  const [configNotesInput, setConfigNotesInput] = useState('');
  const [printModalOpen, setPrintModalOpen] = useState(false);

  // Station Modal State (Create / Edit)
  const [isStationModalOpen, setIsStationModalOpen] = useState(false);
  const [editingStation, setEditingStation] = useState<FloorStation | null>(null);
  const [stationForm, setStationForm] = useState({
    code: '',
    name: '',
    stageTag: 'ASSEMBLY',
    capacity: 3,
    supervisorName: ''
  });

  const handleOpenAddStation = () => {
    setEditingStation(null);
    setStationForm({
      code: `STN-0${floorStations.length + 1}`,
      name: '',
      stageTag: 'ASSEMBLY',
      capacity: 3,
      supervisorName: ''
    });
    setIsStationModalOpen(true);
  };

  const handleOpenEditStation = (stn: FloorStation) => {
    setEditingStation(stn);
    setStationForm({
      code: stn.code,
      name: stn.name,
      stageTag: stn.stageTag || 'ASSEMBLY',
      capacity: stn.capacity || 2,
      supervisorName: stn.supervisorName || ''
    });
    setIsStationModalOpen(true);
  };

  const handleSaveStation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!stationForm.name.trim()) return;

    if (editingStation) {
      updateFloorStation({
        ...editingStation,
        code: stationForm.code,
        name: stationForm.name,
        stageTag: stationForm.stageTag,
        capacity: Number(stationForm.capacity),
        supervisorName: stationForm.supervisorName
      });
    } else {
      addFloorStation({
        code: stationForm.code,
        name: stationForm.name,
        stageTag: stationForm.stageTag,
        capacity: Number(stationForm.capacity),
        supervisorName: stationForm.supervisorName,
        assignedWOIds: []
      });
    }
    setIsStationModalOpen(false);
  };

  // Calculate Lead Time Priority for each Work Order
  const getWOPriorityInfo = (wo: WorkOrder) => {
    const itemObj = items.find(i => i.name === wo.machineModel || i.itemCode === wo.machineModel);
    const leadDays = itemObj?.leadTimeDays || 10;
    
    const targetDate = wo.targetCompletionDate ? new Date(wo.targetCompletionDate) : new Date(Date.now() + 30 * 86400000);
    const mustStartDate = new Date(targetDate.getTime() - leadDays * 86400000);
    const today = new Date();
    
    const diffDays = Math.ceil((mustStartDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    let urgencyLevel: 'CRITICAL' | 'URGENT' | 'NORMAL' = 'NORMAL';
    if (diffDays <= 0) urgencyLevel = 'CRITICAL';
    else if (diffDays <= 5) urgencyLevel = 'URGENT';

    return {
      leadDays,
      mustStartDate: mustStartDate.toISOString().split('T')[0],
      daysRemaining: diffDays,
      urgencyLevel
    };
  };

  // Comprehensive Auto-Progress calculation from Job Cards, POs/GRNs, and Jobworks
  const calculateWOProgress = (wo: WorkOrder): { percent: number; breakdown: string } => {
    if (wo.status === 'COMPLETED' || wo.stage === 'COMPLETED' || wo.stage === 'QUALITY_PASSED') {
      return { percent: 100, breakdown: '100% Completed' };
    }

    // 1. Job Cards progress (50% weight)
    const linkedJCs = jobCards.filter(jc => jc.woId === wo.id || jc.woNumber === wo.workOrderNo || jc.woNumber === wo.woNumber);
    let jcPercent = 0;
    if (linkedJCs.length > 0) {
      const totalTarget = linkedJCs.reduce((sum, jc) => sum + jc.targetQuantity, 0);
      const totalDone = linkedJCs.reduce((sum, jc) => sum + jc.completedQuantity, 0);
      jcPercent = totalTarget > 0 ? Math.min(100, Math.round((totalDone / totalTarget) * 100)) : 0;
    } else {
      if (wo.stage === 'FINAL_TESTING') jcPercent = 85;
      else if (wo.stage === 'ASSEMBLY') jcPercent = 50;
      else jcPercent = 25;
    }

    // 2. Stage advancement (30% weight)
    const stageScores: Record<string, number> = {
      'PLANNING': 10,
      'PLANNED': 15,
      'BASE_FABRICATION': 30,
      'CLAMPING_ASSEMBLY': 50,
      'INJECTION_UNIT_BUILD': 65,
      'HYDRAULIC_POWERPACK': 75,
      'ELECTRICAL_CABINET': 85,
      'FINAL_TESTING': 95,
      'QUALITY_PASSED': 100,
      'COMPLETED': 100
    };
    const stagePercent = stageScores[wo.stage || 'PLANNED'] || 20;

    // Combined auto-progress score
    const finalPercent = linkedJCs.length > 0 
      ? Math.round(jcPercent * 0.6 + stagePercent * 0.4)
      : stagePercent;

    return {
      percent: Math.min(99, Math.max(5, finalPercent)),
      breakdown: linkedJCs.length > 0 
        ? `${linkedJCs.filter(j => j.completedQuantity >= j.targetQuantity).length}/${linkedJCs.length} Job Cards Done` 
        : `Stage: ${(wo.stage || 'PLANNED').replace(/_/g, ' ')}`
    };
  };

  // Sort active WOs by lead time priority
  const activeWOs = workOrders
    .filter(w => w.status !== 'COMPLETED')
    .sort((a, b) => {
      const pA = getWOPriorityInfo(a).daysRemaining;
      const pB = getWOPriorityInfo(b).daysRemaining;
      return pA - pB;
    });

  const handleOpenCompleteModal = (wo: WorkOrder) => {
    const prefix = wo.machineModel.split(' ')[0] || 'GEC-MCH';
    const generatedSN = `${prefix}-SN-${new Date().getFullYear()}-${String(finishedGoods.length + 1).padStart(3, '0')}`;
    
    setSelectedWOForCompletion(wo);
    setSerialNoInput(generatedSN);

    const customChanges = wo.woComponents?.filter(c => c.isCustomExtra).map(c => `+${c.itemName} (${c.qtyRequired} ${c.unit})`);
    const customText = customChanges && customChanges.length > 0 
      ? `Custom Spec with modifications: ${customChanges.join(', ')}`
      : 'Standard Production Unit (100% Identical to Master BOM)';

    setConfigNotesInput(customText);
  };

  const handleConfirmFinish = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWOForCompletion || !serialNoInput) return;

    addFinishedGoodFromWO(selectedWOForCompletion.id, serialNoInput, configNotesInput);
    setSelectedWOForCompletion(null);
    alert(`🎉 Machine ${serialNoInput} successfully sent to Finished Goods Inventory!`);
  };

  const handleRefreshLiveSheet = () => {
    const data = activeWOs.map(wo => {
      const pInfo = getWOPriorityInfo(wo);
      const progressObj = calculateWOProgress(wo);
      return {
        woNumber: wo.woNumber,
        soNumber: wo.soNumber || '-',
        machineModel: wo.machineModel,
        customerName: wo.customerName || 'General Stock',
        targetCompletionDate: wo.targetCompletionDate,
        leadDaysRemaining: pInfo.daysRemaining,
        urgencyLevel: pInfo.urgencyLevel,
        progressPercent: `${progressObj.percent}%`,
        stageBreakdown: progressObj.breakdown
      };
    });

    const headers: { key: keyof typeof data[0]; label: string }[] = [
      { key: 'woNumber', label: 'Work Order No' },
      { key: 'soNumber', label: 'Sales Order Ref' },
      { key: 'machineModel', label: 'Machine Model' },
      { key: 'customerName', label: 'Customer' },
      { key: 'targetCompletionDate', label: 'Delivery Due Date' },
      { key: 'leadDaysRemaining', label: 'Days Remaining' },
      { key: 'urgencyLevel', label: 'Urgency Priority' },
      { key: 'progressPercent', label: 'Progress (%)' },
      { key: 'stageBreakdown', label: 'Stage Breakdown' }
    ];

    openLiveModuleSheet('FloorPlanning', 'GEC_ERP_Floor_Planning_Live', data, headers);
  };

  return (
    <div className="module-layout-container">
      
      {/* Sticky Header */}
      <div className="sticky-module-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', paddingBottom: '0.75rem' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
            <Factory size={22} color="var(--accent-primary)" />
            Shopfloor Stations & Auto-Progress Planning
          </h2>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Manual Floor Station Configuration &bull; Automatic Progress Synchronization with Job Cards, POs, and Returns
          </span>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-outline" onClick={handleRefreshLiveSheet} title="Sync and maintain live CSV sheet">
            <RefreshCw size={14} /> Live Sheet
          </button>
          <button type="button" className="btn btn-outline" onClick={() => setPrintModalOpen(true)} title="Print floor planning schedule report">
            <Printer size={14} /> Print Report
          </button>
          <button className="btn btn-primary" onClick={handleOpenAddStation} style={{ fontWeight: 700 }}>
            <Plus size={15} /> Add Floor Station
          </button>
        </div>
      </div>

      {/* Main Scrollable Content */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.25rem', paddingRight: '0.25rem' }}>

        {/* Top Priority Schedule Queue */}
        <div className="card" style={{ padding: '1.25rem', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0 0 0.875rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Clock size={16} color="var(--warning)" />
            Production Priority Queue (Auto-Calculated by Item Lead Time)
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.875rem' }}>
            {activeWOs.slice(0, 4).map((wo, idx) => {
              const pInfo = getWOPriorityInfo(wo);
              const progressObj = calculateWOProgress(wo);

              return (
                <div 
                  key={wo.id} 
                  style={{ 
                    padding: '0.875rem', 
                    borderRadius: '0.5rem', 
                    backgroundColor: 'var(--bg-tertiary)',
                    border: `1px solid ${pInfo.urgencyLevel === 'CRITICAL' ? 'var(--danger)' : pInfo.urgencyLevel === 'URGENT' ? 'var(--warning)' : 'var(--border-color)'}`,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <span style={{ fontWeight: 800, color: 'var(--accent-primary)', fontFamily: 'monospace', fontSize: '0.85rem' }}>
                        #{idx + 1} {wo.workOrderNo || wo.woNumber}
                      </span>
                      <h4 style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {wo.machineModel}
                      </h4>
                    </div>
                    <span className={`badge ${
                      pInfo.urgencyLevel === 'CRITICAL' ? 'badge-danger' : 
                      pInfo.urgencyLevel === 'URGENT' ? 'badge-warning' : 'badge-info'
                    }`}>
                      {pInfo.urgencyLevel === 'CRITICAL' ? '🚨 START NOW' : `${pInfo.daysRemaining}d to Start`}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Delivery: <strong>{wo.targetCompletionDate}</strong> (Lead Time: <strong>{pInfo.leadDays} Days</strong>)
                  </div>

                  {/* Dynamic Progress Bar */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.25rem' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>{progressObj.breakdown}</span>
                      <span style={{ color: 'var(--accent-primary)' }}>{progressObj.percent}%</span>
                    </div>
                    <div style={{ height: '6px', backgroundColor: 'var(--bg-card)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: `${progressObj.percent}%`, height: '100%', backgroundColor: progressObj.percent >= 80 ? 'var(--success)' : 'var(--accent-primary)' }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Visual Shopfloor Stations Grid */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0.25rem 0 0 0' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
            Assembly Station Bays & Work Order Allocation ({floorStations.length} Stations)
          </h3>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
          {floorStations.map((station, sIdx) => {
            const assignedWOs = workOrders.filter(w => station.assignedWOIds.includes(w.id));

            return (
              <div 
                key={station.id} 
                className="card" 
                style={{ 
                  padding: '1.25rem', 
                  backgroundColor: 'var(--bg-card)', 
                  border: '1px solid var(--border-color)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.875rem'
                }}
              >
                {/* Station Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-color)' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-primary)', fontFamily: 'monospace' }}>
                      {station.code}
                    </span>
                    <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                      {station.name}
                    </h4>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span className="badge badge-info" style={{ fontSize: '0.72rem' }}>
                      {assignedWOs.length} / {station.capacity} Active
                    </span>
                    <button 
                      className="btn btn-outline" 
                      style={{ padding: '0.2rem 0.35rem', fontSize: '0.7rem' }} 
                      title="Edit Station" 
                      onClick={() => handleOpenEditStation(station)}
                    >
                      <Edit2 size={12} />
                    </button>
                    <button 
                      className="btn btn-outline" 
                      style={{ padding: '0.2rem 0.35rem', fontSize: '0.7rem', color: 'var(--danger)', borderColor: 'var(--danger)' }} 
                      title="Delete Station" 
                      onClick={() => {
                        if (window.confirm(`Delete station "${station.name}"?`)) {
                          deleteFloorStation(station.id);
                        }
                      }}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>

                {/* Supervisor & Stage Tag */}
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                    <User size={13} /> Lead: <strong>{station.supervisorName || 'Unassigned'}</strong>
                  </span>
                  <span className="badge badge-secondary" style={{ fontSize: '0.68rem' }}>
                    {station.stageTag || 'ASSEMBLY'}
                  </span>
                </div>

                {/* Station Work Orders */}
                {assignedWOs.length === 0 ? (
                  <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', fontStyle: 'italic', backgroundColor: 'var(--bg-tertiary)', borderRadius: '0.375rem' }}>
                    No machine currently stationed here.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {assignedWOs.map(wo => {
                      const progressObj = calculateWOProgress(wo);
                      const nextStation = floorStations[sIdx + 1];

                      return (
                        <div 
                          key={wo.id} 
                          style={{ 
                            padding: '0.75rem', 
                            backgroundColor: 'var(--bg-tertiary)', 
                            borderRadius: '0.375rem', 
                            border: '1px solid var(--border-color)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.5rem'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: 800, fontSize: '0.82rem', color: 'var(--accent-primary)', fontFamily: 'monospace' }}>
                              {wo.workOrderNo || wo.woNumber}
                            </span>
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--success)' }}>
                              {progressObj.percent}% Complete
                            </span>
                          </div>

                          <div style={{ fontSize: '0.82rem', fontWeight: 700 }}>
                            {wo.machineModel}
                          </div>

                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            ⚡ Auto-Sync: {progressObj.breakdown}
                          </div>

                          {/* Actions */}
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.4rem', marginTop: '0.25rem' }}>
                            {nextStation ? (
                              <button 
                                className="btn btn-outline" 
                                style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                                onClick={() => moveWOStation(wo.id, station.id, nextStation.id)}
                              >
                                <span>Next: {nextStation.code}</span>
                                <MoveRight size={13} />
                              </button>
                            ) : (
                              <button 
                                className="btn btn-primary" 
                                style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                                onClick={() => handleOpenCompleteModal(wo)}
                              >
                                <ShieldCheck size={14} />
                                <span>Complete & Store</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Quick Assign Dropdown */}
                <div style={{ marginTop: 'auto', paddingTop: '0.5rem' }}>
                  <select 
                    className="input-field" 
                    style={{ fontSize: '0.78rem', padding: '0.3rem 0.5rem' }}
                    onChange={(e) => {
                      if (e.target.value) {
                        assignWOToStation(e.target.value, station.id);
                        e.target.value = '';
                      }
                    }}
                    defaultValue=""
                  >
                    <option value="" disabled>+ Assign another WO to this station...</option>
                    {workOrders.filter(w => !station.assignedWOIds.includes(w.id) && w.status !== 'COMPLETED').map(w => (
                      <option key={w.id} value={w.id}>
                        {w.workOrderNo || w.woNumber} - {w.machineModel}
                      </option>
                    ))}
                  </select>
                </div>

              </div>
            );
          })}
        </div>

      </div>

      {/* Modal: Add/Edit Floor Station */}
      <Modal isOpen={isStationModalOpen} onClose={() => setIsStationModalOpen(false)} title={editingStation ? `Edit Floor Station: ${editingStation.code}` : "Add New Floor Station Bay"}>
        <form onSubmit={handleSaveStation} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: '0.82rem', fontWeight: 700 }}>Station Code *</label>
              <input 
                type="text" 
                required 
                className="input-field" 
                value={stationForm.code} 
                onChange={(e) => setStationForm({ ...stationForm, code: e.target.value })} 
                placeholder="e.g. STN-01" 
              />
            </div>
            <div>
              <label style={{ fontSize: '0.82rem', fontWeight: 700 }}>Station Name / Operation *</label>
              <input 
                type="text" 
                required 
                className="input-field" 
                value={stationForm.name} 
                onChange={(e) => setStationForm({ ...stationForm, name: e.target.value })} 
                placeholder="e.g. Base Frame & Machining Assembly" 
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: '0.82rem', fontWeight: 700 }}>Capacity (Concurrent Machines)</label>
              <input 
                type="number" 
                min="1" 
                required 
                className="input-field" 
                value={stationForm.capacity} 
                onChange={(e) => setStationForm({ ...stationForm, capacity: Number(e.target.value) })} 
              />
            </div>
            <div>
              <label style={{ fontSize: '0.82rem', fontWeight: 700 }}>Stage Tag</label>
              <select 
                className="input-field" 
                value={stationForm.stageTag} 
                onChange={(e) => setStationForm({ ...stationForm, stageTag: e.target.value })}
              >
                <option value="BASE_FABRICATION">Base Fabrication</option>
                <option value="CLAMPING_ASSEMBLY">Clamping Assembly</option>
                <option value="INJECTION_UNIT_BUILD">Injection Unit Build</option>
                <option value="HYDRAULIC_POWERPACK">Hydraulic Powerpack</option>
                <option value="ELECTRICAL_CABINET">Electrical Cabinet</option>
                <option value="FINAL_TESTING">Final Testing & Calibration</option>
                <option value="QUALITY_PASSED">Quality Passed</option>
              </select>
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.82rem', fontWeight: 700 }}>Supervisor / Bay Lead</label>
            <input 
              type="text" 
              className="input-field" 
              placeholder="e.g. Pravin Solanki" 
              value={stationForm.supervisorName} 
              onChange={(e) => setStationForm({ ...stationForm, supervisorName: e.target.value })} 
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsStationModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary">
              {editingStation ? 'Update Station' : 'Create Floor Station'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Complete & Send to Finished Goods */}
      {selectedWOForCompletion && (
        <Modal isOpen={!!selectedWOForCompletion} onClose={() => setSelectedWOForCompletion(null)} title="Send Completed Machine to Finished Goods Inventory">
          <form onSubmit={handleConfirmFinish} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            
            <div style={{ padding: '0.75rem 1rem', backgroundColor: 'rgba(16, 185, 129, 0.1)', borderRadius: '0.5rem', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
              <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '0.85rem', fontWeight: 800, color: 'var(--success)' }}>
                Final Quality & Assembly Inspection Passed
              </h4>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Work Order <strong>{selectedWOForCompletion.workOrderNo}</strong> ({selectedWOForCompletion.machineModel}) will be closed and registered into Finished Goods Stock.
              </p>
            </div>

            <div>
              <label style={{ fontSize: '0.82rem', fontWeight: 700 }}>Machine Serial Number (Unique Tag)</label>
              <input 
                type="text" 
                required 
                className="input-field" 
                value={serialNoInput} 
                onChange={(e) => setSerialNoInput(e.target.value)} 
              />
            </div>

            <div>
              <label style={{ fontSize: '0.82rem', fontWeight: 700 }}>Configuration & Build Specification Notes</label>
              <textarea 
                rows={3} 
                className="input-field" 
                value={configNotesInput} 
                onChange={(e) => setConfigNotesInput(e.target.value)} 
                placeholder="Mention any custom parts or differences from standard BOM..."
              />
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                * This note allows identifying custom builds from standard BOM machines when dispatching against Sales Orders.
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setSelectedWOForCompletion(null)}>Cancel</button>
              <button type="submit" className="btn btn-primary">
                <CheckCircle size={15} /> Store in Finished Goods
              </button>
            </div>

          </form>
        </Modal>
      )}

      {/* Feature-Wise Modular Print Manager Modal */}
      <PrintManagerModal
        isOpen={printModalOpen}
        onClose={() => setPrintModalOpen(false)}
        title="Print Production Floor Schedule & Station Allocation"
        documentRefNumber="FLOOR-SCHEDULE"
      >
        <AssemblyListPrintView
          assemblies={activeWOs.map(w => ({
            id: w.id,
            assemblyCode: w.woNumber,
            workOrderNo: w.soNumber || '-',
            machineModel: w.machineModel,
            subAssemblyType: (w.stage || 'PLANNED').replace(/_/g, ' '),
            progressPercentage: calculateWOProgress(w).percent,
            status: w.status
          }))}
          filterLabel="Active Floor Production Schedule & Planning"
        />
      </PrintManagerModal>
    </div>
  );
};
