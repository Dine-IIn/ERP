import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import { AutocompleteSelect, AutocompleteOption } from '../common/AutocompleteSelect';
import { PrintDocumentModal } from '../common/PrintDocumentModal';
import { Wrench, Plus, Trash2, Sliders, CheckCircle, Search, Printer, FileSpreadsheet, ArrowLeft, X } from 'lucide-react';
import { WorkOrder, WOStage, WOStatus, WOCustomComponent } from '../../types/erp';
import { ExportFieldSelectorModal, FieldOption } from '../common/ExportFieldSelectorModal';
import { useTableKeyboardNav } from '../../hooks/useTableKeyboardNav';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

type SortField = 'workOrderNo' | 'machineModel' | 'quantity' | 'targetCompletionDate' | 'stage';

export const WorkOrderModule: React.FC = () => {
  const { workOrders, boms, items, addWorkOrder, updateWorkOrderStage, updateWorkOrderComponents, searchTerm, setSearchTerm } = useERP();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [isStageModalOpen, setIsStageModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [selectedWO, setSelectedWO] = useState<WorkOrder | null>(null);
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [printData, setPrintData] = useState<any>(null);

  // Single Column Sorting State
  const [sortField, setSortField] = useState<SortField>('workOrderNo');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Inline Filter States
  const [selectedStageFilter, setSelectedStageFilter] = useState<string>('ALL');
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

  const filteredWOs = workOrders
    .filter(wo => {
      const woNo = wo.workOrderNo || wo.woNumber || '';
      const lead = wo.assignedLead || wo.assignedSupervisor || '';
      const woStage = wo.stage || 'PLANNED';
      const start = wo.startDate || '';
      const targetDate = wo.targetCompletionDate || '';

      const matchesSearch = 
        woNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        wo.machineModel.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStage = selectedStageFilter === 'ALL' || woStage === selectedStageFilter;
      const matchesStart = !startDateFilter || start >= startDateFilter;
      const matchesEnd = !endDateFilter || targetDate <= endDateFilter;

      return matchesSearch && matchesStage && matchesStart && matchesEnd;
    })
    .sort((a, b) => {
      let valA: any = (a as any)[sortField] || (a as any).woNumber || '';
      let valB: any = (b as any)[sortField] || (b as any).woNumber || '';

      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

  // Customize modal search filter
  const [compSearchTerm, setCompSearchTerm] = useState('');

  const [selectedBomId, setSelectedBomId] = useState(boms[0]?.id || '');
  const [woForm, setWoForm] = useState({
    workOrderNo: '',
    machineModel: boms[0]?.machineModel || 'GEC-250T Servo Hydraulic Injection Moulding Machine',
    quantity: 1,
    targetCompletionDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    startDate: new Date().toISOString().split('T')[0],
    assignedLead: 'Suresh Patel (Production Lead)',
    stage: 'PLANNED' as WOStage,
    status: 'IN_PROGRESS' as WOStatus,
    remarks: ''
  });

  const [newStage, setNewStage] = useState<string>('BASE_FABRICATION');
  const [customComponents, setCustomComponents] = useState<WOCustomComponent[]>([]);
  const [selectedItemId, setSelectedItemId] = useState('');
  const [extraQty, setExtraQty] = useState(1);
  const [subAssemblyTag, setSubAssemblyTag] = useState('Injection Unit');

  // Items which have a BOM options
  const bomOptions: AutocompleteOption[] = boms.map(b => {
    const itemObj = items.find(i => i.name === b.machineModel || i.itemCode === b.bomCode || i.id === b.id);
    const code = itemObj ? itemObj.itemCode : b.bomCode;
    const name = itemObj ? itemObj.name : b.machineModel;
    return {
      value: b.id,
      label: `${code} - ${name} (${b.components.length} components)`,
      sublabel: `BOM Code: ${b.bomCode} | Version: ${b.version} | Est: ${b.estimatedProductionHours || 120} hrs`
    };
  });

  const itemOptions: AutocompleteOption[] = items.map(i => ({
    value: i.id,
    label: `${i.itemCode} - ${i.name}`,
    sublabel: `Stock: ${i.inHouseStock} ${i.unit} | Location: ${i.location}`
  }));

  const handleOpenModal = () => {
    const defaultBOM = boms[0];
    setSelectedBomId(defaultBOM?.id || '');
    setWoForm({
      workOrderNo: `WO-GEC-${String(workOrders.length + 1).padStart(3, '0')}`,
      machineModel: defaultBOM?.machineModel || 'GEC-250T Servo Hydraulic Injection Moulding Machine',
      quantity: 1,
      targetCompletionDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      startDate: new Date().toISOString().split('T')[0],
      assignedLead: 'Suresh Patel (Production Lead)',
      stage: 'PLANNED',
      status: 'IN_PROGRESS',
      remarks: ''
    });

    if (defaultBOM) {
      setCustomComponents(defaultBOM.components.map(c => ({
        itemId: c.itemId || '',
        itemCode: c.itemCode || '',
        itemName: c.itemName || '',
        qtyRequired: c.qtyPerMachine,
        unit: c.unit,
        subAssemblyTag: c.subAssemblyTag,
        isCustomExtra: false
      })));
    } else {
      setCustomComponents([]);
    }

    setIsModalOpen(true);
    setIsCustomModalOpen(false);
    setIsStageModalOpen(false);
  };

  const handleBOMChange = (bomId: string) => {
    setSelectedBomId(bomId);
    const linkedBOM = boms.find(b => b.id === bomId);
    if (linkedBOM) {
      setWoForm(prev => ({ ...prev, machineModel: linkedBOM.machineModel }));
      setCustomComponents(linkedBOM.components.map(c => ({
        itemId: c.itemId || '',
        itemCode: c.itemCode || '',
        itemName: c.itemName || '',
        qtyRequired: c.qtyPerMachine,
        unit: c.unit,
        subAssemblyTag: c.subAssemblyTag,
        isCustomExtra: false
      })));
    }
  };

  const handleOpenCustomModal = (wo: WorkOrder) => {
    setSelectedWO(wo);
    let initialComps: WOCustomComponent[] = [];
    if (wo.woComponents && wo.woComponents.length > 0) {
      initialComps = wo.woComponents.map(c => ({
        itemId: c.itemId || '',
        itemCode: c.itemCode || '',
        itemName: c.itemName || '',
        qtyRequired: c.qtyRequired || c.qty || 1,
        unit: c.unit || 'Pcs',
        subAssemblyTag: c.subAssemblyTag || 'Base Frame',
        isCustomExtra: c.isCustomExtra || false
      }));
    } else {
      const linkedBOM = boms.find(b => b.machineModel === wo.machineModel);
      if (linkedBOM) {
        initialComps = linkedBOM.components.map(c => ({
          itemId: c.itemId || '',
          itemCode: c.itemCode || '',
          itemName: c.itemName || '',
          qtyRequired: c.qtyPerMachine * (wo.quantity || wo.targetQuantity || 1),
          unit: c.unit,
          subAssemblyTag: c.subAssemblyTag,
          isCustomExtra: false
        }));
      }
    }
    setCustomComponents(initialComps);
    setIsCustomModalOpen(true);
    setIsModalOpen(false);
    setIsStageModalOpen(false);
  };

  const handleAddItemToWO = () => {
    const itemObj = items.find(i => i.id === selectedItemId);
    if (!itemObj) return;

    const linkedBOM = selectedWO ? boms.find(b => b.machineModel === selectedWO.machineModel) : null;
    const isInMasterBOM = linkedBOM?.components.some(c => c.itemId === itemObj.id);
    const existingIndex = customComponents.findIndex(c => c.itemId === itemObj.id);

    if (existingIndex >= 0) {
      const updated = [...customComponents];
      updated[existingIndex].qtyRequired = (updated[existingIndex].qtyRequired || 1) + Number(extraQty);
      setCustomComponents(updated);
    } else {
      setCustomComponents([
        ...customComponents,
        {
          itemId: itemObj.id,
          itemCode: itemObj.itemCode,
          itemName: isInMasterBOM ? itemObj.name : `${itemObj.name} (Custom Extra Non-BOM Item)`,
          qtyRequired: Number(extraQty),
          unit: itemObj.unit,
          subAssemblyTag,
          isCustomExtra: !isInMasterBOM
        }
      ]);
    }
  };

  const handleRemoveCustomComp = (index: number) => {
    setCustomComponents(customComponents.filter((_, i) => i !== index));
  };

  const handleUpdateQty = (index: number, newQty: number) => {
    const updated = [...customComponents];
    updated[index].qtyRequired = Math.max(1, newQty);
    setCustomComponents(updated);
  };

  const handleSubmitWO = (e: React.FormEvent) => {
    e.preventDefault();
    const linkedBOM = boms.find(b => b.id === selectedBomId) || boms.find(b => b.machineModel === woForm.machineModel);

    addWorkOrder({
      ...woForm,
      bomId: linkedBOM?.id || 'bom-001',
      machineModel: linkedBOM?.machineModel || woForm.machineModel,
      woComponents: customComponents
    });

    setIsModalOpen(false);
  };

  const handleSaveCustomBOMSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWO) return;
    updateWorkOrderComponents(selectedWO.id, customComponents, selectedWO.woComponents);
    setIsCustomModalOpen(false);
  };

  const handleOpenStageModal = (wo: WorkOrder) => {
    setSelectedWO(wo);
    setNewStage(wo.stage || 'BASE_FABRICATION');
    setIsStageModalOpen(true);
    setIsModalOpen(false);
    setIsCustomModalOpen(false);
  };

  const handleUpdateStageSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWO) return;
    updateWorkOrderStage(selectedWO.id, newStage);
    setIsStageModalOpen(false);
  };

  const handlePrintWO = (wo: WorkOrder) => {
    const woNo = wo.workOrderNo || wo.woNumber || 'WO-GEC-001';
    const linkedBOM = boms.find(b => b.machineModel === wo.machineModel);
    const buildQty = wo.quantity || wo.targetQuantity || 1;

    let componentsList = wo.woComponents && wo.woComponents.length > 0
      ? wo.woComponents.map(c => ({
          itemCode: c.itemCode || '',
          itemName: c.itemName || '',
          subAssemblyTag: c.subAssemblyTag || 'Assembly',
          qtyRequired: (c.qtyRequired || c.qty || 1) * buildQty,
          unit: c.unit || 'Pcs'
        }))
      : (linkedBOM ? linkedBOM.components.map(c => ({
          itemCode: c.itemCode || '',
          itemName: c.itemName || '',
          subAssemblyTag: c.subAssemblyTag || 'Assembly',
          qtyRequired: c.qtyPerMachine * buildQty,
          unit: c.unit
        })) : []);

    setPrintData({
      workOrderNo: woNo,
      soNumber: wo.soNumber || 'SO-DIRECT-PROD',
      customerName: 'Internal Production',
      machineModel: wo.machineModel,
      quantity: buildQty,
      startDate: wo.startDate || new Date().toISOString().split('T')[0],
      targetCompletionDate: wo.targetCompletionDate || new Date().toISOString().split('T')[0],
      assignedLead: wo.assignedLead || wo.assignedSupervisor || 'Suresh Patel',
      stage: wo.stage || 'PLANNING',
      status: wo.status,
      remarks: wo.remarks || wo.notes || 'Strict adherence to QC parameters required.',
      components: componentsList
    });
    setPrintModalOpen(true);
  };

  const filteredCustomComponents = customComponents.filter(c =>
    (c.itemCode || '').toLowerCase().includes(compSearchTerm.toLowerCase()) ||
    (c.itemName || '').toLowerCase().includes(compSearchTerm.toLowerCase()) ||
    (c.subAssemblyTag || '').toLowerCase().includes(compSearchTerm.toLowerCase())
  );

  const availableWOExportFields: FieldOption<WorkOrder>[] = [
    { key: 'workOrderNo', label: 'Work Order No' },
    { key: 'soNumber', label: 'SO Number' },
    { key: 'machineModel', label: 'Item / Machine Model' },
    { key: 'quantity', label: 'Build Quantity' },
    { key: 'startDate', label: 'Start Date' },
    { key: 'targetCompletionDate', label: 'Target Completion' },
    { key: 'stage', label: 'Assembly Stage' },
    { key: 'status', label: 'Status' }
  ];

  // Table Keyboard Navigation
  const { selectedIndex, setSelectedIndex } = useTableKeyboardNav(
    filteredWOs,
    (wo) => handlePrintWO(wo)
  );

  const activePanelOpen = isModalOpen || isCustomModalOpen || isStageModalOpen;

  return (
    <div className="module-layout-container">
      {/* Top Header */}
      <div className="sticky-module-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {activePanelOpen && (
            <button className="btn btn-outline" style={{ padding: '0.35rem 0.65rem', gap: '0.35rem', fontWeight: 600 }} onClick={() => { setIsModalOpen(false); setIsCustomModalOpen(false); setIsStageModalOpen(false); }}>
              <ArrowLeft size={16} /> Back to Work Orders <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>(ESC)</span>
            </button>
          )}
          <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
            {isModalOpen ? 'Create Machine Production Work Order' : (isCustomModalOpen ? `Customize Assembly Components: ${selectedWO?.workOrderNo || selectedWO?.woNumber}` : (isStageModalOpen ? `Update Production Stage: ${selectedWO?.workOrderNo || selectedWO?.woNumber}` : `All Production Work Orders (${filteredWOs.length})`))}
          </span>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button className="btn btn-outline" onClick={() => setIsExportModalOpen(true)}>
            <FileSpreadsheet size={16} /> Open Sheet ({filteredWOs.length} filtered)
          </button>
          {!activePanelOpen && (
            <button className="btn btn-primary" onClick={handleOpenModal}>
              <Plus size={16} /> Create Machine Work Order
            </button>
          )}
        </div>
      </div>

      {/* Main Table OR In-Screen Page Panel */}
      {isModalOpen ? (
        /* In-Screen Panel: Create Work Order */
        <div className="card" style={{ padding: '1.25rem', backgroundColor: 'var(--bg-card)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>Create Production Work Order</h3>
            <button type="button" className="btn btn-outline" style={{ padding: '0.25rem 0.5rem', fontSize: '0.78rem' }} onClick={() => setIsModalOpen(false)}>
              <X size={15} /> Close (ESC)
            </button>
          </div>

          <form onSubmit={handleSubmitWO} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr', gap: '1rem' }}>
              <div>
                <label>Work Order No</label>
                <input type="text" required className="input-field" value={woForm.workOrderNo} onChange={(e) => setWoForm({ ...woForm, workOrderNo: e.target.value })} />
              </div>
              <div>
                <label>Select Item (with BOM)</label>
                <AutocompleteSelect options={bomOptions} value={selectedBomId} onChange={handleBOMChange} placeholder="Search item / machine model with BOM..." />
              </div>
              <div>
                <label>Build Quantity</label>
                <input type="number" min="1" required className="input-field" value={woForm.quantity} onChange={(e) => setWoForm({ ...woForm, quantity: Number(e.target.value) })} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
              <div>
                <label>Production Lead</label>
                <input type="text" required className="input-field" value={woForm.assignedLead} onChange={(e) => setWoForm({ ...woForm, assignedLead: e.target.value })} />
              </div>
              <div>
                <label>Start Date</label>
                <input type="date" required className="input-field" value={woForm.startDate} onChange={(e) => setWoForm({ ...woForm, startDate: e.target.value })} />
              </div>
              <div>
                <label>Target Completion Date</label>
                <input type="date" required className="input-field" value={woForm.targetCompletionDate} onChange={(e) => setWoForm({ ...woForm, targetCompletionDate: e.target.value })} />
              </div>
            </div>

            <div>
              <label>Production Notes & Instructions</label>
              <input type="text" className="input-field" placeholder="e.g. Expedite assembly for scheduled batch delivery" value={woForm.remarks} onChange={(e) => setWoForm({ ...woForm, remarks: e.target.value })} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel (ESC)</button>
              <button type="submit" className="btn btn-primary">Create Work Order</button>
            </div>
          </form>
        </div>
      ) : isCustomModalOpen ? (
        /* In-Screen Panel: Customize Assembly Components */
        <div className="card" style={{ padding: '1.25rem', backgroundColor: 'var(--bg-card)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
              Customize Components for WO ({selectedWO?.workOrderNo || selectedWO?.woNumber})
            </h3>
            <button type="button" className="btn btn-outline" style={{ padding: '0.25rem 0.5rem', fontSize: '0.78rem' }} onClick={() => setIsCustomModalOpen(false)}>
              <X size={15} /> Close (ESC)
            </button>
          </div>

          {/* Add extra component picker */}
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end', marginBottom: '1rem', backgroundColor: 'var(--bg-tertiary)', padding: '0.75rem', borderRadius: '0.5rem' }}>
            <div style={{ flex: 2 }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>Select Component Item</label>
              <AutocompleteSelect options={itemOptions} value={selectedItemId} onChange={setSelectedItemId} placeholder="Search item by code or name..." />
            </div>
            <div style={{ width: '120px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>Sub-Assembly</label>
              <select className="input-field" value={subAssemblyTag} onChange={(e) => setSubAssemblyTag(e.target.value)}>
                <option value="Injection Unit">Injection Unit</option>
                <option value="Clamping Unit">Clamping Unit</option>
                <option value="Hydraulic Powerpack">Hydraulic Powerpack</option>
                <option value="Electrical Cabinet">Electrical Cabinet</option>
                <option value="Base Frame">Base Frame</option>
              </select>
            </div>
            <div style={{ width: '90px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>Qty / Unit</label>
              <input type="number" min="1" className="input-field" value={extraQty} onChange={(e) => setExtraQty(Number(e.target.value))} />
            </div>
            <button type="button" className="btn btn-primary" onClick={handleAddItemToWO}>
              <Plus size={14} /> Add Item
            </button>
          </div>

          {/* Search in Custom Components List */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <input type="text" placeholder="Filter component items..." className="input-field" style={{ width: '280px' }} value={compSearchTerm} onChange={(e) => setCompSearchTerm(e.target.value)} />
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Total Items: {filteredCustomComponents.length}</span>
          </div>

          <div className="table-container" style={{ maxHeight: '350px', overflowY: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Item Code</th>
                  <th>Item Name</th>
                  <th>Sub-Assembly</th>
                  <th>Qty Required</th>
                  <th>Unit</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomComponents.map((comp, idx) => (
                  <tr key={idx} style={{ backgroundColor: comp.isCustomExtra ? 'rgba(234, 179, 8, 0.08)' : 'transparent' }}>
                    <td style={{ fontFamily: 'monospace', fontWeight: 700 }}>{comp.itemCode}</td>
                    <td>{comp.itemName}</td>
                    <td><span className="badge badge-secondary">{comp.subAssemblyTag}</span></td>
                    <td>
                      <input type="number" min="1" className="input-field" style={{ width: '70px', padding: '0.2rem' }} value={comp.qtyRequired || 1} onChange={(e) => handleUpdateQty(idx, Number(e.target.value))} />
                    </td>
                    <td>{comp.unit}</td>
                    <td>
                      <button type="button" className="btn btn-outline" style={{ color: 'var(--danger)', padding: '0.2rem 0.4rem' }} onClick={() => handleRemoveCustomComp(idx)}>
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsCustomModalOpen(false)}>Cancel (ESC)</button>
            <button type="button" className="btn btn-primary" onClick={handleSaveCustomBOMSubmit}>Save Custom Work Order BOM</button>
          </div>
        </div>
      ) : isStageModalOpen ? (
        /* In-Screen Panel: Update Assembly Stage */
        <div className="card" style={{ padding: '1.25rem', backgroundColor: 'var(--bg-card)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
              Update Production Stage: {selectedWO?.workOrderNo || selectedWO?.woNumber}
            </h3>
            <button type="button" className="btn btn-outline" style={{ padding: '0.25rem 0.5rem', fontSize: '0.78rem' }} onClick={() => setIsStageModalOpen(false)}>
              <X size={15} /> Close (ESC)
            </button>
          </div>

          <form onSubmit={handleUpdateStageSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label>Current Production Stage</label>
              <select className="input-field" value={newStage} onChange={(e) => setNewStage(e.target.value)}>
                <option value="PLANNED">PLANNED (Material Pre-allocation)</option>
                <option value="BASE_FABRICATION">Stage 1: Base Fabrication & Machining</option>
                <option value="CLAMPING_ASSEMBLY">Stage 2: Clamping Unit & Platen Fitment</option>
                <option value="INJECTION_UNIT_BUILD">Stage 3: Injection Unit & Screw Assembly</option>
                <option value="HYDRAULIC_POWERPACK">Stage 4: Hydraulic Manifold & Valve Piping</option>
                <option value="ELECTRICAL_CABINET">Stage 5: Electrical PLC & Wiring Harness</option>
                <option value="FINAL_TESTING">Stage 6: Dry Run & Pressure Calibration</option>
                <option value="QUALITY_PASSED">Stage 7: Final Quality Inspection Passed</option>
              </select>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setIsStageModalOpen(false)}>Cancel (ESC)</button>
              <button type="submit" className="btn btn-primary">Update Stage</button>
            </div>
          </form>
        </div>
      ) : (
        <>
          {/* Module Filter Toolbar */}
          <div className="card" style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '1rem', backgroundColor: 'var(--bg-card)', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', width: '320px', maxWidth: '100%' }}>
              <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search WO no, item model, production lead..."
                className="input-field"
                style={{ paddingLeft: '2.25rem' }}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Stage:</span>
              <select className="input-field" style={{ padding: '0.35rem 0.6rem', fontSize: '0.85rem' }} value={selectedStageFilter} onChange={(e) => setSelectedStageFilter(e.target.value)}>
                <option value="ALL">All Production Stages</option>
                <option value="PLANNED">PLANNED</option>
                <option value="BASE_FABRICATION">Base Fabrication</option>
                <option value="CLAMPING_ASSEMBLY">Clamping Assembly</option>
                <option value="INJECTION_UNIT_BUILD">Injection Unit Build</option>
                <option value="HYDRAULIC_POWERPACK">Hydraulic Powerpack</option>
                <option value="ELECTRICAL_CABINET">Electrical Cabinet</option>
                <option value="FINAL_TESTING">Final Testing</option>
                <option value="QUALITY_PASSED">Quality Passed</option>
              </select>
            </div>
          </div>

          {/* Work Orders Table */}
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th onClick={() => handleSortToggle('workOrderNo')} style={{ cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      WO Number {sortField === 'workOrderNo' ? (sortOrder === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} />) : <ArrowUpDown size={12} color="var(--text-muted)" />}
                    </div>
                  </th>
                  <th onClick={() => handleSortToggle('machineModel')} style={{ cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      Item / Model (BOM) {sortField === 'machineModel' ? (sortOrder === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} />) : <ArrowUpDown size={12} color="var(--text-muted)" />}
                    </div>
                  </th>
                  <th onClick={() => handleSortToggle('quantity')} style={{ cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      Build Qty {sortField === 'quantity' ? (sortOrder === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} />) : <ArrowUpDown size={12} color="var(--text-muted)" />}
                    </div>
                  </th>
                  <th onClick={() => handleSortToggle('stage')} style={{ cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      Production Stage {sortField === 'stage' ? (sortOrder === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} />) : <ArrowUpDown size={12} color="var(--text-muted)" />}
                    </div>
                  </th>
                  <th onClick={() => handleSortToggle('targetCompletionDate')} style={{ cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      Target Date {sortField === 'targetCompletionDate' ? (sortOrder === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} />) : <ArrowUpDown size={12} color="var(--text-muted)" />}
                    </div>
                  </th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredWOs.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                      No work orders found matching search criteria.
                    </td>
                  </tr>
                ) : (
                  filteredWOs.map((wo, idx) => {
                    const isNavSelected = selectedIndex === idx;
                    const woNo = wo.workOrderNo || wo.woNumber || 'WO-GEC-001';
                    const buildQty = wo.quantity || wo.targetQuantity || 1;
                    const stageText = wo.stage || 'PLANNED';

                    return (
                      <tr
                        key={wo.id}
                        onDoubleClick={() => handlePrintWO(wo)}
                        onClick={() => setSelectedIndex(idx)}
                        style={{
                          backgroundColor: isNavSelected ? 'rgba(59, 130, 246, 0.18)' : 'transparent',
                          cursor: 'pointer'
                        }}
                      >
                        <td style={{ fontWeight: 700, color: 'var(--accent-primary)', fontFamily: 'monospace' }}>
                          {woNo}
                        </td>
                        <td style={{ fontWeight: 600 }}>{wo.machineModel}</td>
                        <td style={{ fontWeight: 700 }}>{buildQty} Unit(s)</td>
                        <td>
                          <span className="badge badge-info" style={{ fontSize: '0.72rem' }}>
                            {stageText.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.85rem' }}>{wo.targetCompletionDate || wo.startDate}</td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <div style={{ display: 'flex', gap: '0.35rem' }}>
                            <button className="btn btn-outline" style={{ padding: '0.25rem 0.45rem' }} title="Print WO Sheet" onClick={() => handlePrintWO(wo)}>
                              <Printer size={13} />
                            </button>
                            <button className="btn btn-outline" style={{ padding: '0.25rem 0.45rem' }} title="Customize Components" onClick={() => handleOpenCustomModal(wo)}>
                              <Sliders size={13} />
                            </button>
                            <button className="btn btn-outline" style={{ padding: '0.25rem 0.45rem' }} title="Update Stage" onClick={() => handleOpenStageModal(wo)}>
                              <CheckCircle size={13} />
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

      {/* Print WO Document Modal */}
      {printData && (
        <PrintDocumentModal
          isOpen={printModalOpen}
          onClose={() => setPrintModalOpen(false)}
          title="Print Machine Production Work Order"
          documentType="WO"
          data={printData}
        />
      )}

      {/* Custom Export Field Modal */}
      <ExportFieldSelectorModal<WorkOrder>
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        title="Custom Export Work Orders Live Sheet"
        subfolder="WorkOrders"
        fileName="GEC_Filtered_Work_Orders_Live"
        data={filteredWOs}
        availableFields={availableWOExportFields}
      />
    </div>
  );
};
