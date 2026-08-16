import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import { Modal } from '../common/Modal';
import { ShieldCheck, Plus, Edit2, CheckCircle, XCircle, AlertCircle, Search } from 'lucide-react';
import { QCDisposition, QCInspection, QCType } from '../../types/erp';

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

  const filteredQCs = qcInspections.filter(q =>
    q.qcNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    q.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    q.referenceNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    q.inspectorName.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
      qcNumber: q.qcNumber,
      type: q.type,
      referenceNo: q.referenceNo,
      itemId: q.itemId,
      inspectedQuantity: q.inspectedQuantity,
      passedQuantity: q.passedQuantity,
      failedQuantity: q.failedQuantity,
      disposition: q.disposition,
      defectReason: q.defectReason || ''
    });
    setIsModalOpen(true);
  };

  const handleSubmitQC = (e: React.FormEvent) => {
    e.preventDefault();
    const itemObj = items.find(i => i.id === qcForm.itemId);
    if (!itemObj) return;

    if (editingQC) {
      updateQCInspection({
        ...editingQC,
        type: qcForm.type,
        referenceNo: qcForm.referenceNo,
        itemId: itemObj.id,
        itemCode: itemObj.itemCode,
        itemName: itemObj.name,
        inspectedQuantity: Number(qcForm.inspectedQuantity),
        passedQuantity: Number(qcForm.passedQuantity),
        failedQuantity: Number(qcForm.failedQuantity),
        disposition: qcForm.disposition,
        defectReason: qcForm.defectReason,
        inspectorName: currentUser?.fullName || editingQC.inspectorName
      });
    } else {
      addQCInspection({
        qcNumber: qcForm.qcNumber,
        type: qcForm.type,
        referenceNo: qcForm.referenceNo,
        itemId: itemObj.id,
        itemCode: itemObj.itemCode,
        itemName: itemObj.name,
        inspectedQuantity: Number(qcForm.inspectedQuantity),
        passedQuantity: Number(qcForm.passedQuantity),
        failedQuantity: Number(qcForm.failedQuantity),
        disposition: qcForm.disposition,
        defectReason: qcForm.defectReason,
        inspectorName: currentUser?.fullName || 'Anit Shah (QC Engineer)'
      });
    }

    setIsModalOpen(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>Quality Control Inspection Logs</h2>
        </div>
        <button className="btn btn-primary" onClick={handleOpenAddModal}>
          <Plus size={16} /> Log Quality Inspection
        </button>
      </div>

      {/* Inline Search Bar */}
      <div className="card" style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', backgroundColor: 'var(--bg-card)' }}>
        <div style={{ position: 'relative', width: '360px', maxWidth: '100%' }}>
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
            {filteredQCs.map(q => (
              <tr key={q.id}>
                <td style={{ fontWeight: 700, color: 'var(--accent-primary)', fontFamily: 'monospace' }}>
                  {q.qcNumber}
                </td>
                <td>
                  <span className="badge badge-neutral">{q.type.replace('_', ' ')}</span>
                </td>
                <td style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{q.referenceNo}</td>
                <td>
                  <div style={{ fontWeight: 600 }}>{q.itemName}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{q.itemCode}</div>
                </td>
                <td style={{ fontWeight: 700 }}>{q.inspectedQuantity} PCS</td>
                <td style={{ color: 'var(--success)', fontWeight: 700 }}>{q.passedQuantity} PCS</td>
                <td style={{ color: q.failedQuantity > 0 ? 'var(--danger)' : 'var(--text-muted)' }}>{q.failedQuantity} PCS</td>
                <td>
                  <span className={`badge ${
                    q.disposition === 'PASSED' ? 'badge-success' :
                    q.disposition === 'REJECTED' ? 'badge-danger' : 'badge-warning'
                  }`}>
                    {q.disposition.replace('_', ' ')}
                  </span>
                </td>
                <td style={{ fontSize: '0.85rem' }}>{q.inspectorName}</td>
                <td>
                  <button 
                    className="btn btn-outline" 
                    style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                    onClick={() => handleOpenEditModal(q)}
                  >
                    <Edit2 size={14} /> Edit QC
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal: Add / Edit QC Inspection */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingQC ? `Edit Quality Inspection (${editingQC.qcNumber})` : 'Log Quality Inspection Station Result'}
      >
        <form onSubmit={handleSubmitQC} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-grid-2">
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

          <div className="form-grid-2">
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

          <div className="form-grid-3">
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
            <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary">Save Inspection Report</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
