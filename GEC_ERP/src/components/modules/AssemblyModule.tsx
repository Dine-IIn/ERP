import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import { Modal } from '../common/Modal';
import { Layers, Plus, CheckCircle, Search, Settings, Trash2 } from 'lucide-react';
import { SubAssemblyCategory } from '../../types/erp';

export const AssemblyModule: React.FC = () => {
  const { 
    assemblies, workOrders, updateAssemblyProgress, addAssembly, 
    assemblyStages, addAssemblyStage, deleteAssemblyStage, searchTerm, setSearchTerm 
  } = useERP();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isStageModalOpen, setIsStageModalOpen] = useState(false);
  const [newStageInput, setNewStageInput] = useState('');

  const [asmForm, setAsmForm] = useState({
    assemblyCode: '',
    machineModel: 'GEC-250T Servo Hydraulic Moulding Machine',
    subAssemblyType: 'Injection Unit' as SubAssemblyCategory,
    workOrderId: workOrders[0]?.id || '',
    progressPercentage: 50
  });

  const filteredAssemblies = assemblies.filter(a =>
    a.assemblyCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.machineModel.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.subAssemblyType.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.workOrderNo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenModal = () => {
    setAsmForm({
      assemblyCode: `ASM-250T-SUB-${String(assemblies.length + 1).padStart(2, '0')}`,
      machineModel: 'GEC-250T Servo Hydraulic Moulding Machine',
      subAssemblyType: 'Injection Unit',
      workOrderId: workOrders[0]?.id || '',
      progressPercentage: 50
    });
    setIsModalOpen(true);
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
    if (!woObj) return;

    addAssembly({
      assemblyCode: asmForm.assemblyCode,
      machineModel: asmForm.machineModel,
      subAssemblyType: asmForm.subAssemblyType,
      workOrderId: woObj.id,
      workOrderNo: woObj.workOrderNo,
      componentsConsumed: [
        { itemId: 'itm-1', itemCode: 'GEC-TIE-80', itemName: 'Tie Bar 80mm', qtyRequired: 4, qtyConsumed: 4 }
      ],
      progressPercentage: asmForm.progressPercentage,
      status: asmForm.progressPercentage === 100 ? 'TESTED_READY' : 'IN_PROGRESS'
    });

    setIsModalOpen(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>Sub-Assembly & Machine Assembly</h2>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button className="btn btn-outline" onClick={() => setIsStageModalOpen(true)}>
            <Settings size={16} /> Manage Assembly Stages
          </button>
          <button className="btn btn-primary" onClick={handleOpenModal}>
            <Plus size={16} /> Register Sub-Assembly Station
          </button>
        </div>
      </div>

      {/* Inline Search Bar */}
      <div className="card" style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', backgroundColor: 'var(--bg-card)' }}>
        <div style={{ position: 'relative', width: '360px', maxWidth: '100%' }}>
          <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search assembly code, model, sub-assembly..."
            className="input-field"
            style={{ paddingLeft: '2.25rem' }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
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
            {filteredAssemblies.map(a => (
              <tr key={a.id}>
                <td style={{ fontWeight: 700, color: 'var(--accent-primary)', fontFamily: 'monospace' }}>
                  {a.assemblyCode}
                </td>
                <td style={{ fontWeight: 600 }}>{a.workOrderNo}</td>
                <td>{a.machineModel}</td>
                <td>
                  <span className="badge badge-info">{a.subAssemblyType}</span>
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
                      width: `${a.progressPercentage}%`,
                      height: '100%',
                      backgroundColor: a.progressPercentage === 100 ? 'var(--success)' : 'var(--accent-primary)',
                      borderRadius: '9999px',
                      transition: 'width 0.3s ease'
                    }} />
                  </div>
                </td>
                <td style={{ fontWeight: 800, color: 'var(--text-primary)' }}>
                  {a.progressPercentage}%
                </td>
                <td>
                  <span className={`badge ${a.status === 'TESTED_READY' ? 'badge-success' : 'badge-warning'}`}>
                    {a.status.replace('_', ' ')}
                  </span>
                </td>
                <td>
                  <button 
                    className="btn btn-outline" 
                    style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                    onClick={() => {
                      const nextProg = Math.min(100, a.progressPercentage + 25);
                      updateAssemblyProgress(a.id, nextProg, nextProg === 100 ? 'TESTED_READY' : 'IN_PROGRESS');
                    }}
                  >
                    +25% Progress
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal: Manage Assembly Stages */}
      <Modal
        isOpen={isStageModalOpen}
        onClose={() => setIsStageModalOpen(false)}
        title="Manage Dynamic Machine Assembly Stages"
      >
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

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '220px', overflowY: 'auto' }}>
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
            <button className="btn btn-secondary" onClick={() => setIsStageModalOpen(false)}>Done</button>
          </div>
        </div>
      </Modal>

      {/* Modal: Create Assembly */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Register New Machine Sub-Assembly Task"
      >
        <form onSubmit={handleSubmitAssembly} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-grid-2">
            <div>
              <label>Assembly Code</label>
              <input type="text" required className="input-field" value={asmForm.assemblyCode} onChange={(e) => setAsmForm({ ...asmForm, assemblyCode: e.target.value })} />
            </div>
            <div>
              <label>Sub-Assembly Type</label>
              <select className="input-field" value={asmForm.subAssemblyType} onChange={(e) => setAsmForm({ ...asmForm, subAssemblyType: e.target.value as SubAssemblyCategory })}>
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
                <option key={w.id} value={w.id}>{w.workOrderNo} - {w.machineModel}</option>
              ))}
            </select>
          </div>

          <div>
            <label>Initial Progress %</label>
            <input type="number" min="0" max="100" className="input-field" value={asmForm.progressPercentage} onChange={(e) => setAsmForm({ ...asmForm, progressPercentage: Number(e.target.value) })} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary">Create Assembly Record</button>
          </div>
        </form>
      </Modal>

    </div>
  );
};
