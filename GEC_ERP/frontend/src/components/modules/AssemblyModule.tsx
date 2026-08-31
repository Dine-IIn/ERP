import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import { PrintManagerModal } from '../printTemplates/PrintManagerModal';
import { AssemblyListPrintView } from '../printTemplates/AssemblyPrintTemplates';
import { openLiveModuleSheet } from '../../utils/sheetFolderManager';
import { Layers, Plus, CheckCircle, Search, Settings, Trash2, ArrowLeft, X, Printer, RefreshCw } from 'lucide-react';
import { useTableKeyboardNav } from '../../hooks/useTableKeyboardNav';

export const AssemblyModule: React.FC = () => {
  const { 
    assemblies, workOrders, updateAssemblyProgress, addAssembly, 
    assemblyStages, addAssemblyStage, deleteAssemblyStage, searchTerm, setSearchTerm 
  } = useERP();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isStageModalOpen, setIsStageModalOpen] = useState(false);
  const [newStageInput, setNewStageInput] = useState('');
  const [printModalOpen, setPrintModalOpen] = useState(false);

  const [asmForm, setAsmForm] = useState({
    assemblyCode: '',
    machineModel: 'GEC-250T Servo Hydraulic Moulding Machine',
    subAssemblyType: 'Injection Unit',
    workOrderId: workOrders[0]?.id || '',
    progressPercentage: 50
  });

  const [selectedStationFilter, setSelectedStationFilter] = useState<string>('ALL');

  // Universal @history search handling
  const isHistorySearch = searchTerm.toLowerCase().includes('@history');
  const cleanSearchTerm = searchTerm.replace(/@history/gi, '').trim().toLowerCase();

  const filteredAssemblies = assemblies.filter(a => {
    const asmCode = a.assemblyCode || 'ASM-01';
    const model = a.machineModel || '';
    const subType = a.subAssemblyType || a.currentStage || '';
    const woNo = a.workOrderNo || a.woNumber || '';

    const matchesSearch = !cleanSearchTerm || (
      asmCode.toLowerCase().includes(cleanSearchTerm) ||
      model.toLowerCase().includes(cleanSearchTerm) ||
      subType.toLowerCase().includes(cleanSearchTerm) ||
      woNo.toLowerCase().includes(cleanSearchTerm)
    );

    const matchesStation = selectedStationFilter === 'ALL' || subType === selectedStationFilter;

    return matchesSearch && matchesStation;
  });

  const handleRefreshLiveSheet = () => {
    const data = filteredAssemblies.map(a => ({
      assemblyCode: a.assemblyCode || 'ASM-01',
      workOrderNo: a.workOrderNo || a.woNumber || 'WO-GEC-001',
      machineModel: a.machineModel || '',
      subAssemblyType: a.subAssemblyType || a.currentStage || '',
      progressPercentage: `${a.progressPercentage || 50}%`,
      status: a.status || (a.progressPercentage === 100 ? 'TESTED_READY' : 'IN_PROGRESS')
    }));

    const headers: { key: keyof typeof data[0]; label: string }[] = [
      { key: 'assemblyCode', label: 'Assembly Code' },
      { key: 'workOrderNo', label: 'Work Order Ref' },
      { key: 'machineModel', label: 'Machine Model' },
      { key: 'subAssemblyType', label: 'Station / Sub-Assembly' },
      { key: 'progressPercentage', label: 'Progress (%)' },
      { key: 'status', label: 'Assembly Status' }
    ];

    openLiveModuleSheet('Assembly', 'GEC_ERP_Assembly_Floor_Live', data, headers);
  };

  const { selectedIndex, setSelectedIndex } = useTableKeyboardNav(filteredAssemblies, (a) => {
    const nextProg = Math.min(100, (a.progressPercentage || 50) + 25);
    updateAssemblyProgress(a.id, nextProg, nextProg === 100 ? 'TESTED_READY' : 'IN_PROGRESS');
  });

  const handleOpenModal = () => {
    setAsmForm({
      assemblyCode: `ASM-250T-SUB-${String(assemblies.length + 1).padStart(2, '0')}`,
      machineModel: 'GEC-250T Servo Hydraulic Moulding Machine',
      subAssemblyType: 'Injection Unit',
      workOrderId: workOrders[0]?.id || '',
      progressPercentage: 50
    });
    setIsModalOpen(true);
    setIsStageModalOpen(false);
  };

  const handleAddStageSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newStageInput.trim()) {
      addAssemblyStage(newStageInput.trim());
      setNewStageInput('');
    }
  };

  const handleSubmitAssembly = (e: React.FormEvent) => {
    e.preventDefault();
    const woObj = workOrders.find(w => w.id === asmForm.workOrderId);

    addAssembly({
      assemblyCode: asmForm.assemblyCode,
      machineModel: asmForm.machineModel,
      subAssemblyType: asmForm.subAssemblyType,
      workOrderId: woObj ? woObj.id : 'wo-001',
      workOrderNo: woObj ? (woObj.workOrderNo || woObj.woNumber || 'WO-GEC-001') : 'WO-GEC-001',
      componentsConsumed: [
        { itemId: 'itm-1', itemCode: 'GEC-TIE-80', itemName: 'Tie Bar 80mm', qtyRequired: 4, qtyConsumed: 4 }
      ],
      progressPercentage: asmForm.progressPercentage,
      status: asmForm.progressPercentage === 100 ? 'TESTED_READY' : 'IN_PROGRESS'
    });

    setIsModalOpen(false);
  };

  const activePanelOpen = isModalOpen || isStageModalOpen;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {activePanelOpen && (
            <button className="btn btn-outline" style={{ padding: '0.35rem 0.65rem', gap: '0.35rem', fontWeight: 600 }} onClick={() => { setIsModalOpen(false); setIsStageModalOpen(false); }}>
              <ArrowLeft size={16} /> Back to Assembly Stations <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>(ESC)</span>
            </button>
          )}
          <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
            {isModalOpen ? 'Register New Machine Sub-Assembly Station' : (isStageModalOpen ? 'Manage Dynamic Assembly Stages' : `All Assembly Stations (${filteredAssemblies.length})`)}
          </span>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-outline" onClick={handleRefreshLiveSheet} title="Sync and maintain live CSV sheet">
            <RefreshCw size={14} /> Live Sheet
          </button>
          <button type="button" className="btn btn-outline" onClick={() => setPrintModalOpen(true)} title="Print assembly floor tracking report">
            <Printer size={14} /> Print Report
          </button>
          <button className="btn btn-outline" onClick={() => setIsStageModalOpen(!isStageModalOpen)}>
            <Settings size={16} /> Manage Assembly Stages
          </button>
          {!activePanelOpen && (
            <button className="btn btn-primary" onClick={handleOpenModal}>
              <Plus size={16} /> Register Sub-Assembly Station
            </button>
          )}
        </div>
      </div>

      {/* Main Content Table OR In-Screen Page Panels */}
      {isModalOpen ? (
        /* In-Screen Panel: Create Assembly */
        <div className="card" style={{ padding: '1.25rem', backgroundColor: 'var(--bg-card)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
              Register New Machine Sub-Assembly Task
            </h3>
            <button type="button" className="btn btn-outline" style={{ padding: '0.25rem 0.5rem', fontSize: '0.78rem' }} onClick={() => setIsModalOpen(false)}>
              <X size={15} /> Close (ESC)
            </button>
          </div>

          <form onSubmit={handleSubmitAssembly} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label>Assembly Code</label>
                <input type="text" required className="input-field" value={asmForm.assemblyCode} onChange={(e) => setAsmForm({ ...asmForm, assemblyCode: e.target.value })} />
              </div>
              <div>
                <label>Sub-Assembly Type</label>
                <select className="input-field" value={asmForm.subAssemblyType} onChange={(e) => setAsmForm({ ...asmForm, subAssemblyType: e.target.value })}>
                  <option value="Injection Unit">Injection Unit</option>
                  <option value="Clamping Unit">Clamping Unit</option>
                  <option value="Hydraulic Powerpack">Hydraulic Powerpack</option>
                  <option value="Electrical Cabinet">Electrical Cabinet</option>
                  <option value="Base Frame Structural">Base Frame Structural</option>
                </select>
              </div>
            </div>

            <div>
              <label>Target Work Order</label>
              <select className="input-field" value={asmForm.workOrderId} onChange={(e) => setAsmForm({ ...asmForm, workOrderId: e.target.value })}>
                {workOrders.map(w => (
                  <option key={w.id} value={w.id}>{w.workOrderNo || w.woNumber} - {w.machineModel}</option>
                ))}
              </select>
            </div>

            <div>
              <label>Initial Progress %</label>
              <input type="number" min="0" max="100" className="input-field" value={asmForm.progressPercentage} onChange={(e) => setAsmForm({ ...asmForm, progressPercentage: Number(e.target.value) })} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel (ESC)</button>
              <button type="submit" className="btn btn-primary">Create Assembly Record</button>
            </div>
          </form>
        </div>
      ) : isStageModalOpen ? (
        /* In-Screen Panel: Manage Stages */
        <div className="card" style={{ padding: '1.25rem', backgroundColor: 'var(--bg-card)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
              Manage Dynamic Machine Assembly Stages
            </h3>
            <button type="button" className="btn btn-outline" style={{ padding: '0.25rem 0.5rem', fontSize: '0.78rem' }} onClick={() => setIsStageModalOpen(false)}>
              <X size={15} /> Close (ESC)
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <form onSubmit={handleAddStageSubmit} style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                required
                className="input-field"
                placeholder="Enter stage (e.g. 7. PRE-COMMISSIONING TRIAL)"
                value={newStageInput}
                onChange={(e) => setNewStageInput(e.target.value)}
              />
              <button type="submit" className="btn btn-primary" style={{ whiteSpace: 'nowrap' }}>
                <Plus size={16} /> Add Stage
              </button>
            </form>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '250px', overflowY: 'auto' }}>
              {assemblyStages.map(stg => (
                <div key={stg} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.75rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: '0.375rem' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{stg}</span>
                  <button className="btn btn-outline" style={{ padding: '0.2rem 0.4rem', color: 'var(--danger)' }} onClick={() => deleteAssemblyStage(stg)}>
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <button className="btn btn-secondary" onClick={() => setIsStageModalOpen(false)}>Done (ESC)</button>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Filter Bar */}
          <div className="card" style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', backgroundColor: 'var(--bg-card)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', width: '380px', maxWidth: '100%' }}>
                <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="Search assembly code, model, station... (type @history)"
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

            <div>
              <label style={{ fontSize: '0.72rem', margin: 0 }}>Sub-Assembly Station</label>
              <select className="input-field" style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem' }} value={selectedStationFilter} onChange={(e) => setSelectedStationFilter(e.target.value)}>
                <option value="ALL">All Assembly Stations</option>
                {assemblyStages.map(stage => (
                  <option key={stage} value={stage}>{stage}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Assembly Code</th>
                  <th>Work Order Ref</th>
                  <th>Moulding Machine Model</th>
                  <th>Sub-Assembly Type</th>
                  <th>Progress Bar</th>
                  <th>Completion %</th>
                  <th>Assembly Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAssemblies.map((a, idx) => {
                  const isNavSelected = selectedIndex === idx;
                  const asmCode = a.assemblyCode || 'ASM-01';
                  const woNo = a.workOrderNo || a.woNumber || 'WO-GEC-001';
                  const subType = a.subAssemblyType || a.currentStage || 'Injection Unit';
                  const prog = a.progressPercentage || 50;
                  const statusText = a.status || (prog === 100 ? 'TESTED_READY' : 'IN_PROGRESS');

                  return (
                    <tr 
                      key={a.id}
                      onClick={() => setSelectedIndex(idx)}
                      style={{
                        backgroundColor: isNavSelected ? 'rgba(59, 130, 246, 0.18)' : 'transparent',
                        cursor: 'pointer'
                      }}
                    >
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <span style={{ fontWeight: 700, color: 'var(--accent-primary)', fontFamily: 'monospace' }}>
                            {asmCode}
                          </span>
                          {prog === 100 && (
                            <span className="badge" style={{ backgroundColor: '#7c3aed', color: '#fff', fontSize: '0.65rem', padding: '0.1rem 0.35rem' }}>
                              📜 READY
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ fontWeight: 600 }}>{woNo}</td>
                      <td>{a.machineModel}</td>
                      <td>
                        <span className="badge badge-info">{subType}</span>
                      </td>
                      <td style={{ width: '180px' }}>
                        <div style={{
                          width: '100%',
                          height: '8px',
                          backgroundColor: 'var(--bg-tertiary)',
                          borderRadius: '9999px',
                          overflow: 'hidden'
                        }}>
                          <div style={{
                            width: `${prog}%`,
                            height: '100%',
                            backgroundColor: prog === 100 ? 'var(--success)' : 'var(--accent-primary)',
                            borderRadius: '9999px',
                            transition: 'width 0.3s ease'
                          }} />
                        </div>
                      </td>
                      <td style={{ fontWeight: 800, color: 'var(--text-primary)' }}>
                        {prog}%
                      </td>
                      <td>
                        <span className={`badge ${statusText === 'TESTED_READY' ? 'badge-success' : 'badge-warning'}`}>
                          {String(statusText).replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <button 
                          className="btn btn-outline" 
                          style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                          onClick={() => {
                            const nextProg = Math.min(100, prog + 25);
                            updateAssemblyProgress(a.id, nextProg, nextProg === 100 ? 'TESTED_READY' : 'IN_PROGRESS');
                          }}
                        >
                          +25% Progress
                        </button>
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
        onClose={() => setPrintModalOpen(false)}
        title="Print Assembly Floor Station Tracking Report"
        documentRefNumber="ASM-FLOOR-REPORT"
      >
        <AssemblyListPrintView assemblies={filteredAssemblies} filterLabel={isHistorySearch ? 'All Active & Completed Assembly Stations' : 'Active Assembly Floor Stations'} />
      </PrintManagerModal>
    </div>
  );
};
