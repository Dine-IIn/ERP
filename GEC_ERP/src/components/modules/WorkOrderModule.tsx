import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import { Modal } from '../common/Modal';
import { AutocompleteSelect, AutocompleteOption } from '../common/AutocompleteSelect';
import { PrintDocumentModal } from '../common/PrintDocumentModal';
import { Wrench, Plus, Trash2, Sliders, CheckCircle, Search, Printer, FileSpreadsheet } from 'lucide-react';
import { WorkOrder, WOStage, WOStatus, WOCustomComponent } from '../../types/erp';
import { openLiveModuleSheet } from '../../utils/sheetFolderManager';

export const WorkOrderModule: React.FC = () => {
  const { 
    workOrders, customers, boms, items, addWorkOrder, 
    updateWorkOrderComponents, updateWorkOrderStage, searchTerm, setSearchTerm 
  } = useERP();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedWO, setSelectedWO] = useState<WorkOrder | null>(null);
  const [isStageModalOpen, setIsStageModalOpen] = useState(false);
  const [isCustomBOMModalOpen, setIsCustomBOMModalOpen] = useState(false);

  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [printData, setPrintData] = useState<any>(null);

  // Customize modal search filter
  const [compSearchTerm, setCompSearchTerm] = useState('');

  const [woForm, setWoForm] = useState({
    workOrderNo: '',
    machineModel: 'GEC-250T Servo Hydraulic Injection Moulding Machine',
    quantity: 1,
    targetCompletionDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    startDate: new Date().toISOString().split('T')[0],
    assignedLead: 'Suresh Patel (Production Lead)',
    stage: 'PLANNED' as WOStage,
    status: 'IN_PROGRESS' as WOStatus,
    customerName: '',
    remarks: ''
  });

  const [newStage, setNewStage] = useState<WOStage>('BASE_FABRICATION');

  const [customComponents, setCustomComponents] = useState<WOCustomComponent[]>([]);
  const [selectedItemId, setSelectedItemId] = useState('');
  const [extraQty, setExtraQty] = useState(1);
  const [subAssemblyTag, setSubAssemblyTag] = useState('Injection Unit');

  const customerOptions: AutocompleteOption[] = customers.map(c => ({
    value: c.name,
    label: c.name,
    sublabel: `${c.customerCode} | ${c.city}`
  }));

  const machineModelOptions: AutocompleteOption[] = Array.from(
    new Set([
      'GEC-250T Servo Hydraulic Injection Moulding Machine',
      'GEC-180T Compact Servo Moulding Machine',
      'GEC-350T Heavy Duty Plastic Moulding Machine',
      ...boms.map(b => b.machineModel)
    ])
  ).map(m => ({
    value: m,
    label: m,
    sublabel: 'Standard BOM Model'
  }));

  // Options of ALL items in Item Master (Clean Item Name as label, item code & drawing no in search sublabel)
  const itemOptions: AutocompleteOption[] = items.map(i => ({
    value: i.id,
    label: i.name,
    sublabel: `Code: ${i.itemCode}${i.drawingNo ? ` | Dwg: ${i.drawingNo}` : ''} | Category: ${i.category}`,
    badge: i.unit
  }));

  const filteredWOs = workOrders.filter(w =>
    w.workOrderNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    w.machineModel.toLowerCase().includes(searchTerm.toLowerCase()) ||
    w.assignedLead.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (w.customerName && w.customerName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Helper to get total dynamic estimated production hours for a machine model BOM
  const getBOMTotalBuildHours = (modelName: string): number => {
    const linkedBOM = boms.find(b => b.machineModel === modelName);
    if (!linkedBOM) return 120;
    return linkedBOM.components.reduce((sum, c) => sum + (c.qtyPerMachine * (c.estimatedHours || 4)), 0);
  };

  const handleOpenAddModal = () => {
    setWoForm({
      workOrderNo: `WO-GEC-2026-${String(workOrders.length + 1).padStart(3, '0')}`,
      machineModel: '',
      quantity: 1,
      targetCompletionDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      startDate: new Date().toISOString().split('T')[0],
      assignedLead: 'Suresh Patel (Production Lead)',
      stage: 'PLANNED',
      status: 'IN_PROGRESS',
      customerName: '',
      remarks: ''
    });
    setCustomComponents([]);
    setSelectedItemId('');
    setIsModalOpen(true);
  };

  const handlePrintWO = (wo: WorkOrder) => {
    setPrintData(wo);
    setPrintModalOpen(true);
  };

  const handleOpenSheet = () => {
    openLiveModuleSheet('WorkOrders', 'GEC_Work_Orders_Live', workOrders, [
      { key: 'workOrderNo', label: 'Work Order No' },
      { key: 'soNumber', label: 'SO Number' },
      { key: 'customerName', label: 'Customer Name' },
      { key: 'machineModel', label: 'Moulding Machine Model' },
      { key: 'quantity', label: 'Build Quantity' },
      { key: 'assignedLead', label: 'Assigned Lead' },
      { key: 'stage', label: 'Current Stage' },
      { key: 'status', label: 'Build Status' },
      { key: 'targetCompletionDate', label: 'Target Completion' }
    ]);
  };

  const handleModelChange = (modelName: string) => {
    const linkedBOM = boms.find(b => b.machineModel === modelName);
    const updatedComponents: WOCustomComponent[] = linkedBOM ? linkedBOM.components.map(c => ({
      itemId: c.itemId,
      itemCode: c.itemCode,
      itemName: c.itemName,
      qtyRequired: c.qtyPerMachine * woForm.quantity,
      unit: c.unit,
      subAssemblyTag: c.subAssemblyTag,
      isCustomExtra: false,
      estimatedHours: c.estimatedHours || 4
    })) : [];

    setWoForm({ ...woForm, machineModel: modelName });
    setCustomComponents(updatedComponents);
  };

  const handleOpenCustomBOMModal = (wo: WorkOrder) => {
    setSelectedWO(wo);
    setCompSearchTerm('');
    setSelectedItemId('');
    
    // Pull current WO components, or populate from master BOM if empty
    let initialList = wo.woComponents && wo.woComponents.length > 0 ? wo.woComponents : [];
    if (initialList.length === 0) {
      const linkedBOM = boms.find(b => b.machineModel === wo.machineModel);
      if (linkedBOM) {
        initialList = linkedBOM.components.map(c => ({
          itemId: c.itemId,
          itemCode: c.itemCode,
          itemName: c.itemName,
          qtyRequired: c.qtyPerMachine * wo.quantity,
          unit: c.unit,
          subAssemblyTag: c.subAssemblyTag,
          isCustomExtra: false,
          estimatedHours: c.estimatedHours || 4
        }));
      }
    }

    setCustomComponents(initialList);
    if (items.length > 0) setSelectedItemId(items[0].id);
    setIsCustomBOMModalOpen(true);
  };

  // Add Item to Work Order (Can be item from master BOM or non-BOM item from Item Master!)
  const handleAddItemToWO = () => {
    const itemObj = items.find(i => i.id === selectedItemId);
    if (!itemObj) return;

    // Check if item is already in standard BOM
    const linkedBOM = selectedWO ? boms.find(b => b.machineModel === selectedWO.machineModel) : null;
    const isInMasterBOM = linkedBOM?.components.some(c => c.itemId === itemObj.id);

    const existingIndex = customComponents.findIndex(c => c.itemId === itemObj.id);

    if (existingIndex >= 0) {
      // Update quantity of existing component
      const updated = [...customComponents];
      updated[existingIndex].qtyRequired += Number(extraQty);
      setCustomComponents(updated);
    } else {
      // Add new component to Work Order
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
    const linkedBOM = boms.find(b => b.machineModel === woForm.machineModel);

    addWorkOrder({
      ...woForm,
      bomId: linkedBOM?.id,
      woComponents: customComponents
    });

    setIsModalOpen(false);
  };

  const handleSaveCustomBOMSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWO) return;
    updateWorkOrderComponents(selectedWO.id, customComponents);
    setIsCustomBOMModalOpen(false);
  };

  const handleOpenStageModal = (wo: WorkOrder) => {
    setSelectedWO(wo);
    setNewStage(wo.stage);
    setIsStageModalOpen(true);
  };

  const handleUpdateStageSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWO) return;
    updateWorkOrderStage(selectedWO.id, newStage);
    setIsStageModalOpen(false);
  };

  // Filtered components in customize modal
  const filteredCustomComponents = customComponents.filter(c =>
    c.itemCode.toLowerCase().includes(compSearchTerm.toLowerCase()) ||
    c.itemName.toLowerCase().includes(compSearchTerm.toLowerCase()) ||
    c.subAssemblyTag.toLowerCase().includes(compSearchTerm.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>Work Orders & Machine Production</h2>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button className="btn btn-outline" onClick={handleOpenSheet}>
            <FileSpreadsheet size={16} /> Open Sheet
          </button>
          <button id="btn-new-wo" className="btn btn-primary" onClick={handleOpenAddModal}>
            <Plus size={16} /> Create Work Order
          </button>
        </div>
      </div>

      {/* Inline Search Bar */}
      <div className="card" style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', backgroundColor: 'var(--bg-card)' }}>
        <div style={{ position: 'relative', width: '360px', maxWidth: '100%' }}>
          <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search WO number, customer, machine model, assigned lead..."
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
              <th>Work Order No.</th>
              <th>SO Link</th>
              <th>Moulding Machine Model</th>
              <th>Build Qty</th>
              <th>Customer</th>
              <th>Smart Est Build Time</th>
              <th>Customization</th>
              <th>Stage</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredWOs.map(wo => {
              const extraItemsCount = (wo.woComponents || []).filter(c => c.isCustomExtra).length;
              const estHours = getBOMTotalBuildHours(wo.machineModel) * wo.quantity;
              const estShifts = Math.ceil(estHours / 8);

              return (
                <tr key={wo.id}>
                  <td style={{ fontWeight: 700, color: 'var(--accent-primary)', fontFamily: 'monospace' }}>
                    {wo.workOrderNo}
                  </td>
                  <td style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
                    {wo.soNumber || 'Direct Build'}
                  </td>
                  <td style={{ fontWeight: 600 }}>{wo.machineModel}</td>
                  <td style={{ fontWeight: 700 }}>{wo.quantity} Machine(s)</td>
                  <td style={{ fontSize: '0.85rem' }}>{wo.customerName || 'Stock'}</td>
                  <td>
                    <span style={{ fontWeight: 700, color: 'var(--accent-primary)', fontSize: '0.82rem' }}>
                      {estHours} Hrs ({estShifts} Days)
                    </span>
                  </td>
                  <td>
                    <button 
                      className="btn btn-outline" 
                      style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', color: 'var(--accent-primary)', borderColor: 'var(--accent-primary)' }}
                      onClick={() => handleOpenCustomBOMModal(wo)}
                    >
                      <Sliders size={14} /> Customize ({wo.woComponents?.length || 0} items {extraItemsCount > 0 ? `+${extraItemsCount} extra` : ''})
                    </button>
                  </td>
                  <td>
                    <span className="badge badge-info" style={{ fontWeight: 700 }}>
                      {wo.stage.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${wo.status === 'COMPLETED' ? 'badge-success' : 'badge-warning'}`}>
                      {wo.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                      <button className="btn btn-outline" style={{ padding: '0.3rem 0.5rem' }} title="Print Job Card" onClick={() => handlePrintWO(wo)}>
                        <Printer size={14} />
                      </button>
                      <button 
                        className="btn btn-outline" 
                        style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                        onClick={() => handleOpenStageModal(wo)}
                      >
                        Advance Stage
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal: Create WO */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create Work Order with Complete BOM & Options"
      >
        <form onSubmit={handleSubmitWO} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-grid-2">
            <div>
              <label>Work Order No.</label>
              <input type="text" required className="input-field" value={woForm.workOrderNo} onChange={(e) => setWoForm({ ...woForm, workOrderNo: e.target.value })} />
            </div>

            <div>
              <label>Search Customer</label>
              <AutocompleteSelect
                options={customerOptions}
                value={woForm.customerName}
                onChange={(val) => setWoForm({ ...woForm, customerName: val })}
                placeholder="Type customer name..."
              />
            </div>
          </div>

          <div>
            <label>Machine Model (Pulls Complete Standard BOM)</label>
            <AutocompleteSelect
              options={machineModelOptions}
              value={woForm.machineModel}
              onChange={handleModelChange}
              placeholder="Select machine model..."
            />
          </div>

          <div className="form-grid-2">
            <div>
              <label>Quantity of Machines</label>
              <input type="number" min="1" required className="input-field" value={woForm.quantity} onChange={(e) => setWoForm({ ...woForm, quantity: Number(e.target.value) })} />
            </div>
            <div>
              <label>Assigned Production Lead</label>
              <input type="text" required className="input-field" value={woForm.assignedLead} onChange={(e) => setWoForm({ ...woForm, assignedLead: e.target.value })} />
            </div>
          </div>

          {/* Add Extra Items / Customizations Panel */}
          <div style={{ padding: '0.875rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: '0.5rem', border: '1px solid var(--border-color)' }}>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--accent-primary)' }}>
              Add Items (BOM or Non-BOM Extra Customizations for this WO)
            </h4>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end', flexWrap: 'nowrap', marginBottom: '0.5rem' }}>
              <div style={{ flex: '2', minWidth: '180px' }}>
                <label style={{ fontSize: '0.75rem' }}>Search Any Item in Master</label>
                <AutocompleteSelect
                  options={itemOptions}
                  value={selectedItemId}
                  onChange={(val) => setSelectedItemId(val)}
                  placeholder="Select item..."
                />
              </div>
              <div style={{ width: '70px' }}>
                <label style={{ fontSize: '0.75rem' }}>Qty</label>
                <input type="number" min="1" className="input-field" value={extraQty} onChange={(e) => setExtraQty(Number(e.target.value))} />
              </div>
              <div style={{ flex: '1.2', minWidth: '140px' }}>
                <label style={{ fontSize: '0.75rem' }}>Sub-Assembly</label>
                <select className="input-field" value={subAssemblyTag} onChange={(e) => setSubAssemblyTag(e.target.value)}>
                  <option value="Injection Unit">Injection Unit</option>
                  <option value="Clamping Unit">Clamping Unit</option>
                  <option value="Hydraulic Powerpack">Hydraulic Powerpack</option>
                  <option value="Electrical Cabinet">Electrical Cabinet</option>
                </select>
              </div>
              <button type="button" className="btn btn-secondary" style={{ whiteSpace: 'nowrap' }} onClick={handleAddItemToWO}>
                <Plus size={16} /> Add Item
              </button>
            </div>

            {/* List of WO components */}
            <div style={{ maxHeight: '160px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              {customComponents.map((c, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-card)', padding: '0.4rem 0.6rem', borderRadius: '0.25rem', borderLeft: c.isCustomExtra ? '3px solid var(--warning)' : '3px solid var(--accent-primary)' }}>
                  <div style={{ fontSize: '0.8rem' }}>
                    <span style={{ fontWeight: 600 }}>{c.itemName}</span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>[{c.subAssemblyTag}]</span>
                    {c.isCustomExtra && <span style={{ color: 'var(--warning)', fontWeight: 700, marginLeft: '0.5rem' }}>[Extra Custom Item]</span>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <strong style={{ fontSize: '0.82rem' }}>{c.qtyRequired} {c.unit}</strong>
                    <button type="button" style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }} onClick={() => handleRemoveCustomComp(idx)}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary">Create Work Order</button>
          </div>
        </form>
      </Modal>

      {/* Modal: Customize Complete WO BOM & Non-BOM Items */}
      <Modal
        isOpen={isCustomBOMModalOpen}
        onClose={() => setIsCustomBOMModalOpen(false)}
        title={`Customize Complete BOM for Work Order: ${selectedWO?.workOrderNo || ''}`}
      >
        <form onSubmit={handleSaveCustomBOMSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          <div style={{ padding: '0.75rem 1rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: '0.5rem', border: '1px solid var(--border-color)' }}>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--accent-primary)' }}>{selectedWO?.machineModel}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Customer: {selectedWO?.customerName || 'Stock Build'} &bull; Build Qty: {selectedWO?.quantity} Machine(s)</div>
          </div>

          {/* Add New Item Panel - Fixed 1-Row Layout (No Wrapping to Next Line) */}
          <div style={{ padding: '0.75rem 1rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: '0.5rem', border: '1px solid var(--accent-primary)' }}>
            <h4 style={{ fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.4rem', color: 'var(--accent-primary)' }}>
              Add New Item (From BOM or Any Extra Non-BOM Item in Item Master)
            </h4>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end', flexWrap: 'nowrap' }}>
              <div style={{ flex: '2', minWidth: '160px' }}>
                <label style={{ fontSize: '0.72rem' }}>Search Item in Master</label>
                <AutocompleteSelect
                  options={itemOptions}
                  value={selectedItemId}
                  onChange={(val) => setSelectedItemId(val)}
                  placeholder="Select item..."
                />
              </div>
              <div style={{ width: '65px' }}>
                <label style={{ fontSize: '0.72rem' }}>Qty</label>
                <input type="number" min="1" className="input-field" value={extraQty} onChange={(e) => setExtraQty(Number(e.target.value))} />
              </div>
              <div style={{ flex: '1.2', minWidth: '130px' }}>
                <label style={{ fontSize: '0.72rem' }}>Sub-Assembly</label>
                <select className="input-field" value={subAssemblyTag} onChange={(e) => setSubAssemblyTag(e.target.value)}>
                  <option value="Injection Unit">Injection Unit</option>
                  <option value="Clamping Unit">Clamping Unit</option>
                  <option value="Hydraulic Powerpack">Hydraulic Powerpack</option>
                  <option value="Electrical Cabinet">Electrical Cabinet</option>
                  <option value="Base Frame">Base Frame</option>
                </select>
              </div>
              <button type="button" className="btn btn-primary" style={{ whiteSpace: 'nowrap' }} onClick={handleAddItemToWO}>
                <Plus size={15} /> Add to WO
              </button>
            </div>
          </div>

          {/* Search Header inside Complete WO BOM list */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginTop: '0.2rem' }}>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              Complete WO Components List ({customComponents.length} items):
            </h4>
            <div style={{ position: 'relative', width: '240px' }}>
              <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                className="input-field"
                placeholder="Search components in WO..."
                style={{ paddingLeft: '2.25rem', padding: '0.35rem 0.75rem 0.35rem 2.25rem', fontSize: '0.8rem' }}
                value={compSearchTerm}
                onChange={(e) => setCompSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Flexible Scrollable List Container (Prevents Push & Overflow) */}
          <div style={{ maxHeight: '220px', minHeight: '120px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.4rem', paddingRight: '0.25rem', backgroundColor: 'var(--bg-input)', padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)' }}>
            {filteredCustomComponents.length > 0 ? (
              filteredCustomComponents.map((c) => {
                const originalIndex = customComponents.findIndex(item => item.itemId === c.itemId && item.subAssemblyTag === c.subAssemblyTag);
                const stableKey = `comp-${c.itemId}-${c.subAssemblyTag}`;
                
                return (
                  <div key={stableKey} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-card)', padding: '0.5rem 0.75rem', borderRadius: '0.375rem', borderLeft: c.isCustomExtra ? '4px solid var(--warning)' : '4px solid var(--accent-primary)', borderTop: '1px solid var(--border-color)', borderRight: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                        {c.itemName} <span style={{ fontFamily: 'monospace', color: 'var(--accent-primary)', fontSize: '0.75rem', marginLeft: '0.35rem' }}>({c.itemCode})</span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>
                        Sub-Assembly: <strong style={{ color: 'var(--text-primary)' }}>{c.subAssemblyTag}</strong> {c.isCustomExtra ? <span className="badge badge-warning" style={{ marginLeft: '0.4rem' }}>Extra Custom Item</span> : <span className="badge badge-info" style={{ marginLeft: '0.4rem' }}>Standard BOM Item</span>}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Qty:</span>
                        <input
                          type="number"
                          min="1"
                          className="input-field"
                          style={{ width: '70px', padding: '0.25rem 0.4rem', textAlign: 'center', fontWeight: 800, fontSize: '0.85rem' }}
                          value={c.qtyRequired}
                          onChange={(e) => handleUpdateQty(originalIndex, Number(e.target.value))}
                        />
                        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)' }}>{c.unit}</span>
                      </div>

                      <button
                        type="button"
                        className="btn btn-outline"
                        style={{ padding: '0.25rem 0.5rem', color: 'var(--danger)', borderColor: 'var(--danger)', fontSize: '0.75rem' }}
                        title="Remove Item from Work Order"
                        onClick={() => handleRemoveCustomComp(originalIndex)}
                      >
                        <Trash2 size={13} /> Remove
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ textAlign: 'center', padding: '1.5rem 1rem', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                No components matching "{compSearchTerm}"
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.25rem' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsCustomBOMModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary">Save Complete Work Order BOM</button>
          </div>
        </form>
      </Modal>

      {/* Modal: Advance Stage */}
      <Modal
        isOpen={isStageModalOpen}
        onClose={() => setIsStageModalOpen(false)}
        title={`Advance Stage: ${selectedWO?.workOrderNo || ''}`}
      >
        <form onSubmit={handleUpdateStageSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label>Select Assembly Stage</label>
            <select className="input-field" value={newStage} onChange={(e) => setNewStage(e.target.value as WOStage)}>
              <option value="PLANNED">1. PLANNED</option>
              <option value="BASE_FABRICATION">2. BASE FABRICATION</option>
              <option value="SUB_ASSEMBLY">3. SUB ASSEMBLY</option>
              <option value="HYDRAULIC_FITTING">4. HYDRAULIC FITTING</option>
              <option value="ELECTRICAL_PANEL">5. ELECTRICAL PANEL</option>
              <option value="TESTING_TRIAL">6. TESTING & TRIAL</option>
              <option value="DISPATCHED">7. DISPATCHED</option>
            </select>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsStageModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary">Update Stage</button>
          </div>
        </form>
      </Modal>

      {/* Print Document Modal */}
      <PrintDocumentModal
        isOpen={printModalOpen}
        onClose={() => setPrintModalOpen(false)}
        title="Print Production Work Order Job Card"
        documentType="WO"
        data={printData}
      />

    </div>
  );
};
