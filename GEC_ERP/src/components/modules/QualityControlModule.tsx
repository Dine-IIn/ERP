import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import { ShieldCheck, Plus, Edit2, CheckCircle, XCircle, AlertCircle, Search, ArrowLeft, X } from 'lucide-react';
import { QCDisposition, QCInspection, QCType } from '../../types/erp';
import { useTableKeyboardNav } from '../../hooks/useTableKeyboardNav';

export const QualityControlModule: React.FC = () => {
  const { qcInspections, items, currentUser, addQCInspection, updateQCInspection, searchTerm, setSearchTerm } = useERP();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingQC, setEditingQC] = useState<QCInspection | null>(null);

  const [qcForm, setQcForm] = useState({
    qcNumber: '',
    type: 'INCOMING_PO' as QCType,
    referenceNo: 'GRN-GEC-2026-035',
    itemId: '',
    inspectedQuantity: 1,
    passedQuantity: 1,
    failedQuantity: 0,
    disposition: 'PASSED' as QCDisposition,
    defectReason: ''
  });

  const [selectedQCDispositionFilter, setSelectedQCDispositionFilter] = useState<string>('ALL');

  const filteredQCs = qcInspections.filter(q => {
    const reportNo = q.qcNumber || q.inspectionNo || '';
    const itemCode = q.itemCode || '';
    const itemName = q.itemName || '';
    const refNo = q.referenceNo || '';
    const inspector = q.inspectorName || '';
    const disp = q.disposition || q.status || 'PASSED';

    const matchesSearch = 
      reportNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      itemCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      refNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inspector.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesDisposition = selectedQCDispositionFilter === 'ALL' || disp === selectedQCDispositionFilter;

    return matchesSearch && matchesDisposition;
  });

  const { selectedIndex, setSelectedIndex } = useTableKeyboardNav(filteredQCs, (q) => handleOpenEditModal(q));

  const handleOpenAddModal = () => {
    setEditingQC(null);
    setQcForm({
      qcNumber: `QC-GEC-2026-${String(qcInspections.length + 1).padStart(3, '0')}`,
      type: 'INCOMING_PO',
      referenceNo: 'GRN-GEC-2026-035',
      itemId: items[0]?.id || '',
      inspectedQuantity: 1,
      passedQuantity: 1,
      failedQuantity: 0,
      disposition: 'PASSED',
      defectReason: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (q: QCInspection) => {
    setEditingQC(q);
    setQcForm({
      qcNumber: q.qcNumber || q.inspectionNo || 'QC-001',
      type: q.type || 'INCOMING_PO',
      referenceNo: q.referenceNo || '',
      itemId: q.itemId || '',
      inspectedQuantity: q.inspectedQuantity || q.inspectedQty || 1,
      passedQuantity: q.passedQuantity || q.approvedQty || 1,
      failedQuantity: q.failedQuantity || q.rejectedQty || 0,
      disposition: (q.disposition || q.status || 'PASSED') as QCDisposition,
      defectReason: q.defectReason || q.remarks || ''
    });
    setIsModalOpen(true);
  };

  const handleSubmitQC = (e: React.FormEvent) => {
    e.preventDefault();
    const itemObj = items.find(i => i.id === qcForm.itemId);

    if (editingQC) {
      updateQCInspection({
        ...editingQC,
        qcNumber: qcForm.qcNumber,
        type: qcForm.type,
        referenceNo: qcForm.referenceNo,
        itemId: itemObj ? itemObj.id : editingQC.itemId || '',
        itemCode: itemObj ? itemObj.itemCode : editingQC.itemCode || '',
        itemName: itemObj ? itemObj.name : editingQC.itemName || '',
        inspectedQuantity: Number(qcForm.inspectedQuantity),
        passedQuantity: Number(qcForm.passedQuantity),
        failedQuantity: Number(qcForm.failedQuantity),
        approvedQty: Number(qcForm.passedQuantity),
        rejectedQty: Number(qcForm.failedQuantity),
        disposition: qcForm.disposition,
        defectReason: qcForm.defectReason,
        inspectorName: currentUser?.fullName || editingQC.inspectorName || 'QC Officer'
      });
    } else {
      addQCInspection({
        qcNumber: qcForm.qcNumber,
        inspectionNo: qcForm.qcNumber,
        type: qcForm.type,
        referenceType: 'GRN',
        referenceNo: qcForm.referenceNo,
        itemId: itemObj ? itemObj.id : 'item-gen',
        itemCode: itemObj ? itemObj.itemCode : 'ITEM-GEN',
        itemName: itemObj ? itemObj.name : 'General Item',
        inspectedQuantity: Number(qcForm.inspectedQuantity),
        inspectedQty: Number(qcForm.inspectedQuantity),
        passedQuantity: Number(qcForm.passedQuantity),
        approvedQty: Number(qcForm.passedQuantity),
        failedQuantity: Number(qcForm.failedQuantity),
        rejectedQty: Number(qcForm.failedQuantity),
        reworkQty: 0,
        disposition: qcForm.disposition,
        defectReason: qcForm.defectReason,
        inspectionDate: new Date().toISOString().split('T')[0],
        inspectorName: currentUser?.fullName || 'Anit Shah (QC Engineer)'
      });
    }

    setIsModalOpen(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Top Action Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {isModalOpen && (
            <button className="btn btn-outline" style={{ padding: '0.35rem 0.65rem', gap: '0.35rem', fontWeight: 600 }} onClick={() => setIsModalOpen(false)}>
              <ArrowLeft size={16} /> Back to QC List <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>(ESC)</span>
            </button>
          )}
          <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
            {isModalOpen ? (editingQC ? `Editing QC Report: ${editingQC.qcNumber || editingQC.inspectionNo}` : 'Log Quality Inspection Result') : `All Quality Control Logs (${filteredQCs.length})`}
          </span>
        </div>

        <div>
          {!isModalOpen && (
            <button className="btn btn-primary" onClick={handleOpenAddModal}>
              <Plus size={16} /> Log Quality Inspection
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
              {editingQC ? `Edit Quality Inspection (${editingQC.qcNumber || editingQC.inspectionNo})` : 'Log Quality Inspection Station Result'}
            </h3>
            <button type="button" className="btn btn-outline" style={{ padding: '0.25rem 0.5rem', fontSize: '0.78rem' }} onClick={() => setIsModalOpen(false)}>
              <X size={15} /> Close (ESC)
            </button>
          </div>

          <form onSubmit={handleSubmitQC} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label>Inspection Report No.</label>
                <input type="text" required className="input-field" value={qcForm.qcNumber} onChange={(e) => setQcForm({ ...qcForm, qcNumber: e.target.value })} />
              </div>
              <div>
                <label>Inspection Stage / Type</label>
                <select className="input-field" value={qcForm.type} onChange={(e) => setQcForm({ ...qcForm, type: e.target.value as QCType })}>
                  <option value="INCOMING_PO">INCOMING_PO (Vendor PO Receipt)</option>
                  <option value="JOBWORK_RETURN">JOBWORK_RETURN (Nitriding / Machining Return)</option>
                  <option value="IN_PROCESS_ASSEMBLY">IN_PROCESS_ASSEMBLY (Sub-assembly Inspection)</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label>Reference GRN / Job Challan No.</label>
                <input type="text" required className="input-field" value={qcForm.referenceNo} onChange={(e) => setQcForm({ ...qcForm, referenceNo: e.target.value })} />
              </div>
              <div>
                <label>Select Inspected Component</label>
                <select className="input-field" value={qcForm.itemId} onChange={(e) => setQcForm({ ...qcForm, itemId: e.target.value })}>
                  {items.map(i => (
                    <option key={i.id} value={i.id}>{i.itemCode} - {i.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
              <div>
                <label>Total Inspected Qty</label>
                <input type="number" min="1" required className="input-field" value={qcForm.inspectedQuantity} onChange={(e) => setQcForm({ ...qcForm, inspectedQuantity: Number(e.target.value) })} />
              </div>
              <div>
                <label>Passed Qty</label>
                <input type="number" min="0" required className="input-field" value={qcForm.passedQuantity} onChange={(e) => setQcForm({ ...qcForm, passedQuantity: Number(e.target.value) })} />
              </div>
              <div>
                <label>Failed / Defect Qty</label>
                <input type="number" min="0" required className="input-field" value={qcForm.failedQuantity} onChange={(e) => setQcForm({ ...qcForm, failedQuantity: Number(e.target.value) })} />
              </div>
            </div>

            <div>
              <label>QC Disposition Status</label>
              <select className="input-field" value={qcForm.disposition} onChange={(e) => setQcForm({ ...qcForm, disposition: e.target.value as QCDisposition })}>
                <option value="PASSED">PASSED (Approved for Assembly / Store)</option>
                <option value="REJECTED">REJECTED (Return to Vendor)</option>
                <option value="REWORK_REQUIRED">REWORK REQUIRED (Send back for In-house touchup)</option>
              </select>
            </div>

            <div>
              <label>Inspection Notes & Hardness / Dimension Parameters</label>
              <textarea className="input-field" rows={2} placeholder="e.g. Hardness test verified 62 HRC. Hardness report attached." value={qcForm.defectReason} onChange={(e) => setQcForm({ ...qcForm, defectReason: e.target.value })} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel (ESC)</button>
              <button type="submit" className="btn btn-primary">Save Inspection Report</button>
            </div>
          </form>
        </div>
      ) : (
        <>
          {/* Filter Bar */}
          <div className="card" style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', backgroundColor: 'var(--bg-card)' }}>
            <div style={{ position: 'relative', width: '340px', maxWidth: '100%' }}>
              <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search QC number, ref no, component, inspector..."
                className="input-field"
                style={{ paddingLeft: '2.25rem' }}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.72rem', margin: 0 }}>QC Result Status</label>
              <select className="input-field" style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem' }} value={selectedQCDispositionFilter} onChange={(e) => setSelectedQCDispositionFilter(e.target.value)}>
                <option value="ALL">All Inspection Results</option>
                <option value="PASSED">Approved / Passed</option>
                <option value="FAILED">Rejected / Failed</option>
                <option value="REWORK">Rework Required</option>
              </select>
            </div>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>QC Report No.</th>
                  <th>Inspection Type</th>
                  <th>Ref Challan / GRN</th>
                  <th>Component Inspected</th>
                  <th>Inspected Qty</th>
                  <th>Passed Qty</th>
                  <th>Failed Qty</th>
                  <th>Disposition</th>
                  <th>Inspector</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredQCs.map((q, idx) => {
                  const isNavSelected = selectedIndex === idx;
                  const reportNo = q.qcNumber || q.inspectionNo || 'QC-001';
                  const qcType = q.type || q.referenceType || 'INCOMING_PO';
                  const refNo = q.referenceNo || '-';
                  const inspQty = q.inspectedQuantity || q.inspectedQty || 1;
                  const passQty = q.passedQuantity || q.approvedQty || 1;
                  const failQty = q.failedQuantity || q.rejectedQty || 0;
                  const disp = q.disposition || q.status || 'PASSED';
                  const inspector = q.inspectorName || 'QC Officer';

                  return (
                    <tr
                      key={q.id}
                      onClick={() => {
                        setSelectedIndex(idx);
                        handleOpenEditModal(q);
                      }}
                      style={{
                        backgroundColor: isNavSelected ? 'rgba(59, 130, 246, 0.18)' : 'transparent',
                        cursor: 'pointer'
                      }}
                    >
                      <td style={{ fontWeight: 700, color: 'var(--accent-primary)', fontFamily: 'monospace' }}>
                        {reportNo}
                      </td>
                      <td>
                        <span className="badge badge-neutral">{String(qcType).replace(/_/g, ' ')}</span>
                      </td>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{refNo}</td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{q.itemName}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{q.itemCode}</div>
                      </td>
                      <td style={{ fontWeight: 700 }}>{inspQty} PCS</td>
                      <td style={{ color: 'var(--success)', fontWeight: 700 }}>{passQty} PCS</td>
                      <td style={{ color: failQty > 0 ? 'var(--danger)' : 'var(--text-muted)' }}>{failQty} PCS</td>
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
                        <button 
                          className="btn btn-outline" 
                          style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                          onClick={() => handleOpenEditModal(q)}
                        >
                          <Edit2 size={14} /> Edit QC
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
    </div>
  );
};
