import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import { Modal } from '../common/Modal';
import { PrintDocumentModal } from '../common/PrintDocumentModal';
import { BOMUploadModal } from '../common/BOMUploadModal';
import { Plus, Trash2, Edit2, Search, Printer, FileSpreadsheet, Clock, Upload } from 'lucide-react';
import { BOM, BOMComponent } from '../../types/erp';
import { openLiveModuleSheet } from '../../utils/sheetFolderManager';

export const BOMMasterModule: React.FC = () => {
  const { boms, items, addBOM, updateBOM, deleteBOM, bulkAddBOMs, searchTerm, setSearchTerm } = useERP();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [editingBOM, setEditingBOM] = useState<BOM | null>(null);

  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [printData, setPrintData] = useState<any>(null);

  const [bomForm, setBomForm] = useState({
    bomCode: '',
    machineModel: 'GEC-250T Servo Hydraulic Injection Moulding Machine',
    version: 'Rev 1.0',
    description: ''
  });

  const [components, setComponents] = useState<BOMComponent[]>([]);
  const [selectedItemId, setSelectedItemId] = useState('');
  const [qtyPerMachine, setQtyPerMachine] = useState(1);
  const [estimatedHours, setEstimatedHours] = useState(4);
  const [subAssemblyTag, setSubAssemblyTag] = useState<BOMComponent['subAssemblyTag']>('Injection Unit');

  const filteredBOMs = boms.filter(b =>
    b.bomCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.machineModel.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.version.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Helper to calculate total dynamic production time from child components & nested BOMs
  const calculateSmartBOMProductionHours = (compList: BOMComponent[]): number => {
    return compList.reduce((sum, c) => {
      // Check if this component has its own child BOM (Nested BOM calculation!)
      const childBOM = boms.find(b => b.machineModel.toLowerCase() === c.itemName.toLowerCase());
      const childTime = childBOM ? calculateSmartBOMProductionHours(childBOM.components) : (c.estimatedHours || 4);
      return sum + (c.qtyPerMachine * childTime);
    }, 0);
  };

  const handleOpenAddModal = () => {
    setEditingBOM(null);
    setBomForm({
      bomCode: `BOM-GEC-2026-${String(boms.length + 1).padStart(2, '0')}`,
      machineModel: 'GEC-250T Servo Hydraulic Injection Moulding Machine',
      version: 'Rev 1.0',
      description: ''
    });
    setComponents([]);
    if (items.length > 0) setSelectedItemId(items[0].id);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (b: BOM) => {
    setEditingBOM(b);
    setBomForm({
      bomCode: b.bomCode,
      machineModel: b.machineModel,
      version: b.version,
      description: b.description || ''
    });
    setComponents(b.components);
    if (items.length > 0) setSelectedItemId(items[0].id);
    setIsModalOpen(true);
  };

  const handlePrintBOM = (b: BOM) => {
    setPrintData(b);
    setPrintModalOpen(true);
  };

  // Open Live Sheet for INDIVIDUAL BOM Card!
  const handleOpenIndividualBOMSheet = (b: BOM) => {
    const sanitizedModelName = b.machineModel.replace(/[^a-zA-Z0-9]/g, '_');
    const flatData = b.components.map(c => ({
      bomCode: b.bomCode,
      machineModel: b.machineModel,
      version: b.version,
      itemCode: c.itemCode,
      itemName: c.itemName,
      subAssemblyTag: c.subAssemblyTag,
      qtyPerMachine: c.qtyPerMachine,
      unit: c.unit,
      estimatedHours: c.estimatedHours || 4,
      totalHoursForQty: c.qtyPerMachine * (c.estimatedHours || 4),
      lastUpdated: b.lastUpdated
    }));

    openLiveModuleSheet('BOM', `BOM_${sanitizedModelName}_Live`, flatData, [
      { key: 'bomCode', label: 'BOM Code' },
      { key: 'machineModel', label: 'Machine Model' },
      { key: 'version', label: 'Version' },
      { key: 'itemCode', label: 'Component Code' },
      { key: 'itemName', label: 'Component Name' },
      { key: 'subAssemblyTag', label: 'Sub Assembly' },
      { key: 'qtyPerMachine', label: 'Qty Per Machine' },
      { key: 'unit', label: 'Unit' },
      { key: 'estimatedHours', label: 'Est Production Hours / Unit' },
      { key: 'totalHoursForQty', label: 'Total Component Hours' },
      { key: 'lastUpdated', label: 'Last Updated' }
    ]);
  };

  const handleAddComponent = () => {
    const itemObj = items.find(i => i.id === selectedItemId);
    if (!itemObj) return;

    const existing = components.find(c => c.itemId === selectedItemId);
    if (existing) {
      setComponents(components.map(c => c.itemId === selectedItemId ? { 
        ...c, 
        qtyPerMachine: c.qtyPerMachine + Number(qtyPerMachine),
        estimatedHours: Number(estimatedHours)
      } : c));
    } else {
      setComponents([...components, {
        itemId: itemObj.id,
        itemCode: itemObj.itemCode,
        itemName: itemObj.name,
        qtyPerMachine: Number(qtyPerMachine),
        unit: itemObj.unit,
        subAssemblyTag,
        scrapPercent: 0,
        estimatedHours: Number(estimatedHours)
      }]);
    }
  };

  const handleRemoveComponent = (itemId: string) => {
    setComponents(components.filter(c => c.itemId !== itemId));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (components.length === 0) {
      alert('Please add at least one component to the Bill of Materials!');
      return;
    }

    const calculatedHours = calculateSmartBOMProductionHours(components);

    if (editingBOM) {
      updateBOM({
        ...editingBOM,
        ...bomForm,
        components,
        estimatedProductionHours: calculatedHours
      });
    } else {
      addBOM({
        ...bomForm,
        components,
        estimatedProductionHours: calculatedHours
      });
    }

    setIsModalOpen(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>Bill of Materials (BOM) Master</h2>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button className="btn btn-outline" onClick={() => setIsUploadModalOpen(true)}>
            <Upload size={16} /> Import BOM Sheets (Bulk/Single)
          </button>
          <button className="btn btn-primary" onClick={handleOpenAddModal}>
            <Plus size={16} /> Create New Machine BOM
          </button>
        </div>
      </div>

      {/* Inline Search Bar */}
      <div className="card" style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', backgroundColor: 'var(--bg-card)' }}>
        <div style={{ position: 'relative', width: '360px', maxWidth: '100%' }}>
          <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search BOM code, machine model, version, revision..."
            className="input-field"
            style={{ paddingLeft: '2.25rem' }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* BOM Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.25rem' }}>
        {filteredBOMs.map(b => {
          const smartTotalHours = calculateSmartBOMProductionHours(b.components);
          const estimatedDays = Math.ceil(smartTotalHours / 8);

          return (
            <div key={b.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.875rem', gap: '0.5rem' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-primary)', fontFamily: 'monospace' }}>
                      {b.bomCode} ({b.version})
                    </span>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                      {b.machineModel}
                    </h3>
                  </div>
                  <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                    <button className="btn btn-outline" style={{ padding: '0.3rem 0.5rem', color: 'var(--success)' }} title="Open Individual BOM Live Sheet" onClick={() => handleOpenIndividualBOMSheet(b)}>
                      <FileSpreadsheet size={14} /> Open Sheet
                    </button>
                    <button className="btn btn-outline" style={{ padding: '0.3rem 0.5rem' }} title="Print BOM Sheet" onClick={() => handlePrintBOM(b)}>
                      <Printer size={14} />
                    </button>
                    <button className="btn btn-outline" style={{ padding: '0.3rem 0.5rem' }} title="Edit BOM" onClick={() => handleOpenEditModal(b)}>
                      <Edit2 size={14} />
                    </button>
                    <button className="btn btn-outline" style={{ padding: '0.3rem 0.5rem', color: 'var(--danger)' }} title="Delete BOM" onClick={() => deleteBOM(b.id)}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Smart Production Time Banner */}
                <div style={{ padding: '0.5rem 0.75rem', backgroundColor: 'var(--accent-light)', border: '1px solid var(--accent-primary)', borderRadius: '0.375rem', marginBottom: '0.875rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-primary)' }}>
                    <Clock size={15} /> Smart Suggested Build Time:
                  </div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    {smartTotalHours} Hours <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>({estimatedDays} Shifts/Days)</span>
                  </div>
                </div>

                {/* Component breakdown list */}
                <div style={{ backgroundColor: 'var(--bg-tertiary)', borderRadius: '0.5rem', padding: '0.625rem', marginBottom: '0.875rem' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                    BOM Components & Sub-Assemblies ({b.components.length}):
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', maxHeight: '160px', overflowY: 'auto' }}>
                    {b.components.map((c, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', padding: '0.25rem 0.4rem', backgroundColor: 'var(--bg-card)', borderRadius: '0.25rem' }}>
                        <span>{c.itemName} ({c.subAssemblyTag})</span>
                        <div style={{ display: 'flex', gap: '0.6rem' }}>
                          <strong>{c.qtyPerMachine} {c.unit}</strong>
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>{c.estimatedHours || 4}h/unit</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div style={{ paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Updated: {b.lastUpdated}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit BOM Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingBOM ? 'Edit Machine Bill of Materials' : 'Create New Machine BOM'}
      >
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-grid-2">
            <div>
              <label>BOM Code</label>
              <input type="text" required className="input-field" value={bomForm.bomCode} onChange={(e) => setBomForm({ ...bomForm, bomCode: e.target.value })} />
            </div>
            <div>
              <label>Version / Revision</label>
              <input type="text" required className="input-field" value={bomForm.version} onChange={(e) => setBomForm({ ...bomForm, version: e.target.value })} />
            </div>
          </div>

          <div>
            <label>Target Moulding Machine Model</label>
            <input type="text" required className="input-field" placeholder="e.g. GEC-250T Servo Hydraulic Injection Moulding Machine" value={bomForm.machineModel} onChange={(e) => setBomForm({ ...bomForm, machineModel: e.target.value })} />
          </div>

          {/* Component Builder Panel */}
          <div style={{ padding: '1rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: '0.5rem', border: '1px solid var(--border-color)' }}>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text-primary)' }}>Add BOM Components & Estimated Production Hours</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.5rem', alignItems: 'flex-end', marginBottom: '0.75rem' }}>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ fontSize: '0.75rem' }}>Component</label>
                <select className="input-field" value={selectedItemId} onChange={(e) => setSelectedItemId(e.target.value)}>
                  {items.map(i => (
                    <option key={i.id} value={i.id}>{i.itemCode} - {i.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.75rem' }}>Qty Per Machine</label>
                <input type="number" min="1" className="input-field" value={qtyPerMachine} onChange={(e) => setQtyPerMachine(Number(e.target.value))} />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem' }}>Est Hours / Unit</label>
                <input type="number" min="0.5" step="any" className="input-field" value={estimatedHours} onChange={(e) => setEstimatedHours(Number(e.target.value))} />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem' }}>Sub-Assembly</label>
                <select className="input-field" value={subAssemblyTag} onChange={(e) => setSubAssemblyTag(e.target.value as BOMComponent['subAssemblyTag'])}>
                  <option value="Injection Unit">Injection Unit</option>
                  <option value="Clamping Unit">Clamping Unit</option>
                  <option value="Hydraulic Powerpack">Hydraulic Powerpack</option>
                  <option value="Electrical Cabinet">Electrical Cabinet</option>
                  <option value="Base Frame">Base Frame</option>
                </select>
              </div>
              <button type="button" className="btn btn-secondary" onClick={handleAddComponent}>
                <Plus size={16} /> Add
              </button>
            </div>

            {/* Added List */}
            {components.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {components.map(c => (
                  <div key={c.itemId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-card)', padding: '0.45rem 0.65rem', borderRadius: '0.375rem' }}>
                    <div>
                      <span style={{ fontWeight: 600, fontSize: '0.82rem' }}>{c.itemName}</span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>[{c.subAssemblyTag}]</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--accent-primary)', fontWeight: 600 }}>{c.estimatedHours || 4} hrs/unit</span>
                      <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>{c.qtyPerMachine} {c.unit}</span>
                      <button type="button" style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }} onClick={() => handleRemoveComponent(c.itemId)}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
                
                {/* Total Calculated Banner */}
                <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '0.85rem', color: 'var(--accent-primary)' }}>
                  <span>Dynamic Total Suggested Production Time:</span>
                  <span>{calculateSmartBOMProductionHours(components)} Hours</span>
                </div>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary">Save Machine BOM</button>
          </div>
        </form>
      </Modal>

      {/* Upload BOM Modal */}
      <BOMUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onConfirmImport={(newBOMs) => bulkAddBOMs(newBOMs)}
      />

      {/* Print Document Modal */}
      <PrintDocumentModal
        isOpen={printModalOpen}
        onClose={() => setPrintModalOpen(false)}
        title="Print Bill of Materials (BOM)"
        documentType="BOM"
        data={printData}
      />

    </div>
  );
};
