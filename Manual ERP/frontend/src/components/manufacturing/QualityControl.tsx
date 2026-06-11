import React, { useState, useEffect } from 'react';
import { ShieldCheck, Plus, Search, HelpCircle, CheckCircle, AlertTriangle, AlertCircle, Wrench, FileText, Trash2, Edit2 } from 'lucide-react';
import { apiClient } from '../../utils/apiService';

interface QCRecord {
  id: string;
  batchNo: string;
  productId: string;
  productName: string;
  productCode: string;
  totalInspected: number;
  qtyPassed: number;
  qtyFailed: number;
  inspectorName: string;
  status: 'PASSED' | 'FAILED' | 'REWORK_REQUIRED';
  remarks: string;
  checkDate: string;
}

interface ReworkCard {
  id: string;
  qcRecordId: string;
  batchNo: string;
  productName: string;
  qtyToRepair: number;
  reworkOperation: string;
  assignedOperator: string;
  status: 'OPEN' | 'REPAIRED_PASSED' | 'SCRAPPED';
  notes: string;
}

interface QualityControlProps {
  products: any[];
  employees?: any[];
}

export default function QualityControl({ products = [], employees = [] }: QualityControlProps) {
  const [activeTab, setActiveTab] = useState<'inspections' | 'reworks'>('inspections');
  const [inspectionsSearch, setInspectionsSearch] = useState('');
  const [reworkSearch, setReworkSearch] = useState('');
  const [inspectionsStatus, setInspectionsStatus] = useState<string>('ALL');
  const [reworkStatus, setReworkStatus] = useState<string>('ALL');
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(false);

  // Mapped products & employees from props
  const productCatalog = products.length > 0 ? products : [];
  const employeeCatalog = employees.length > 0 ? employees : [
    { id: 'emp-static-1', username: 'Shop Technician' }
  ];

  // QC Records & Rework lists
  const [qcRecordsList, setQcRecordsList] = useState<QCRecord[]>([]);
  const [reworkCardsList, setReworkCardsList] = useState<ReworkCard[]>([]);

  // Modal inspection variables
  const [newBatchNo, setNewBatchNo] = useState('BAT-2026-001');
  const [newProductId, setNewProductId] = useState('');
  const [totalInspected, setTotalInspected] = useState(10);
  const [qtyPassed, setQtyPassed] = useState(9);
  const [inspectorRemarks, setInspectorRemarks] = useState('');

  // QC Edit modal states
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState<QCRecord | null>(null);
  const [editBatchNo, setEditBatchNo] = useState('');
  const [editTotalInspected, setEditTotalInspected] = useState(0);
  const [editQtyPassed, setEditQtyPassed] = useState(0);
  const [editRemarks, setEditRemarks] = useState('');

  // Rework Edit modal states
  const [showEditReworkModal, setShowEditReworkModal] = useState(false);
  const [editingRework, setEditingRework] = useState<ReworkCard | null>(null);
  const [editReworkNotes, setEditReworkNotes] = useState('');
  const [editReworkOperation, setEditReworkOperation] = useState('');
  const [editReworkOperatorId, setEditReworkOperatorId] = useState('');

  // Checklist states
  const [checks, setChecks] = useState({
    dimensions: true,
    weldIntegrity: true,
    loadStressTest: false,
    visualFinish: true
  });

  const fetchQCData = async () => {
    setLoading(true);
    try {
      const qcRes = await apiClient.get<{ qcRecords: any[] }>('/api/manufacturing/qc');
      setQcRecordsList((qcRes.qcRecords || []).map((rec: any) => ({
        id: rec.id,
        batchNo: rec.batchNo,
        productId: rec.productId,
        productName: rec.product?.name || 'Standard Product',
        productCode: rec.product?.code || 'PROD-S1',
        totalInspected: rec.totalInspected,
        qtyPassed: rec.qtyPassed,
        qtyFailed: rec.qtyFailed,
        inspectorName: rec.inspectorName,
        status: rec.status,
        remarks: rec.remarks,
        checkDate: rec.checkDate?.split('T')[0] || rec.createdAt?.split('T')[0] || ''
      })));

      const rewRes = await apiClient.get<{ reworkCards: any[] }>('/api/manufacturing/rework');
      setReworkCardsList((rewRes.reworkCards || []).map((card: any) => ({
        id: card.id,
        qcRecordId: card.qcRecordId,
        batchNo: card.batchNo,
        productName: card.product?.name || 'Standard Product',
        qtyToRepair: card.qtyToRepair,
        reworkOperation: card.reworkOperation,
        assignedOperator: card.assignedOperator?.username || card.assignedOperator?.name || 'Shop Technician',
        status: card.status,
        notes: card.notes || ''
      })));
    } catch (err: any) {
      console.error('Failed to load quality control data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQCData();
  }, [products]);

  // Set default dropdown selection when catalog loads
  useEffect(() => {
    if (productCatalog.length > 0 && !newProductId) {
      setNewProductId(productCatalog[0].id);
    }
  }, [productCatalog]);

  const handleCreateQCRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProductId) return;
    
    const failed = Math.max(0, totalInspected - qtyPassed);
    const status = failed === 0 ? 'PASSED' : (checks.weldIntegrity ? 'REWORK_REQUIRED' : 'FAILED');

    apiClient.post('/api/manufacturing/qc', {
      batchNo: newBatchNo,
      productId: newProductId,
      totalInspected: Number(totalInspected),
      qtyPassed: Number(qtyPassed),
      inspectorName: 'Rohan Sharma',
      status,
      remarks: inspectorRemarks || 'Standard checklists complete.'
    }).then(() => {
      fetchQCData();
      setShowAddModal(false);
      setInspectorRemarks('');
    }).catch((err: any) => {
      alert("Error creating QC record: " + (err.response?.data?.error || err.message));
    });
  };

  const handleResolveRework = async (rewId: string, status: 'REPAIRED_PASSED' | 'SCRAPPED') => {
    try {
      await apiClient.put(`/api/manufacturing/rework/${rewId}`, { status });
      fetchQCData();
    } catch (err: any) {
      alert("Error resolving rework status: " + (err.response?.data?.error || err.message));
    }
  };

  const handleDeleteQC = async (id: string) => {
    if (!confirm("Are you sure you want to delete this Quality Audit record? This will also remove any related rework cards.")) return;
    try {
      await apiClient.delete(`/api/manufacturing/qc/${id}`);
      fetchQCData();
    } catch (err: any) {
      alert("Error deleting QC record: " + (err.response?.data?.error || err.message));
    }
  };

  const handleDeleteRework = async (id: string) => {
    if (!confirm("Are you sure you want to delete this Rework repair card?")) return;
    try {
      await apiClient.delete(`/api/manufacturing/rework/${id}`);
      fetchQCData();
    } catch (err: any) {
      alert("Error deleting Rework card: " + (err.response?.data?.error || err.message));
    }
  };

  const openEditQC = (rec: QCRecord) => {
    setEditingRecord(rec);
    setEditBatchNo(rec.batchNo);
    setEditTotalInspected(rec.totalInspected);
    setEditQtyPassed(rec.qtyPassed);
    setEditRemarks(rec.remarks);
    setShowEditModal(true);
  };

  const handleUpdateQCRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord) return;

    const failed = Math.max(0, editTotalInspected - editQtyPassed);
    const status = failed === 0 ? 'PASSED' : 'REWORK_REQUIRED';

    apiClient.put(`/api/manufacturing/qc/${editingRecord.id}`, {
      batchNo: editBatchNo,
      totalInspected: Number(editTotalInspected),
      qtyPassed: Number(editQtyPassed),
      status,
      remarks: editRemarks
    }).then(() => {
      fetchQCData();
      setShowEditModal(false);
      setEditingRecord(null);
    }).catch((err: any) => {
      alert("Error updating QC record: " + (err.response?.data?.error || err.message));
    });
  };

  const openEditRework = (card: ReworkCard) => {
    setEditingRework(card);
    setEditReworkNotes(card.notes);
    setEditReworkOperation(card.reworkOperation);
    // Find operator id from catalog if name matching
    const matchingOp = employeeCatalog.find(e => e.username === card.assignedOperator || e.name === card.assignedOperator);
    setEditReworkOperatorId(matchingOp?.id || '');
    setShowEditReworkModal(true);
  };

  const handleUpdateReworkCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRework) return;

    apiClient.put(`/api/manufacturing/rework/${editingRework.id}`, {
      notes: editReworkNotes,
      reworkOperation: editReworkOperation,
      assignedOperatorId: editReworkOperatorId || null
    }).then(() => {
      fetchQCData();
      setShowEditReworkModal(false);
      setEditingRework(null);
    }).catch((err: any) => {
      alert("Error updating Rework card: " + (err.response?.data?.error || err.message));
    });
  };

  const filteredQC = (qcRecordsList || []).filter(rec => {
    const productName = rec?.productName || '';
    const batchNo = rec?.batchNo || '';
    const productCode = rec?.productCode || '';
    const inspectorName = rec?.inspectorName || '';
    const term = (inspectionsSearch || '').toLowerCase();
    const matchesSearch = productName.toLowerCase().includes(term) ||
      batchNo.toLowerCase().includes(term) ||
      productCode.toLowerCase().includes(term) ||
      inspectorName.toLowerCase().includes(term);
    const matchesStatus = inspectionsStatus === 'ALL' || rec.status === inspectionsStatus;
    return matchesSearch && matchesStatus;
  });

  const filteredRework = (reworkCardsList || []).filter(card => {
    const productName = card?.productName || '';
    const batchNo = card?.batchNo || '';
    const assignedOperator = card?.assignedOperator || '';
    const reworkOperation = card?.reworkOperation || '';
    const term = (reworkSearch || '').toLowerCase();
    const matchesSearch = productName.toLowerCase().includes(term) ||
      batchNo.toLowerCase().includes(term) ||
      assignedOperator.toLowerCase().includes(term) ||
      reworkOperation.toLowerCase().includes(term);
    const matchesStatus = reworkStatus === 'ALL' || card.status === reworkStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-900/40 p-6 rounded-2xl border border-slate-800/80 backdrop-blur-xl animate-fade-in">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-5.5 h-5.5 text-indigo-400" />
            Quality Control (QC) & Rejection Logs
          </h2>
          <p className="text-slate-400 text-xs mt-1">
            Conduct multi-point checklist audits, log stress test parameters, track passed yield, and route defective lots to repair lines.
          </p>
        </div>
        <div className="flex gap-2.5">
          <button
            onClick={() => setActiveTab(activeTab === 'inspections' ? 'reworks' : 'inspections')}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 hover:border-slate-600/85 text-slate-300 hover:text-white font-semibold text-xs rounded-xl transition-all cursor-pointer"
          >
            <Wrench className="w-4 h-4 text-indigo-400" />
            {activeTab === 'inspections' ? 'View Rework Repairs Logs' : 'Manage QC Inspections'}
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 active:scale-95 transition-all text-white font-bold text-xs rounded-xl shadow-lg cursor-pointer border-0"
          >
            <Plus className="w-4 h-4" /> Run Quality Audit
          </button>
        </div>
      </div>

      {activeTab === 'inspections' ? (
        <div className="space-y-4 animate-fade-in text-left">
          {/* Controls */}
          <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xl">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Search inspections by product, batch or inspector..."
                value={inspectionsSearch}
                onChange={e => setInspectionsSearch(e.target.value)}
                className="w-full bg-slate-900/40 border border-slate-800/80 focus:border-indigo-500/50 py-2 pl-10 pr-4 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none transition-all"
              />
            </div>
            <select
              value={inspectionsStatus}
              onChange={e => setInspectionsStatus(e.target.value)}
              className="bg-slate-900/40 border border-slate-800/80 text-xs text-slate-300 rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500/50 cursor-pointer"
            >
              <option value="ALL">All Inspection Statuses</option>
              <option value="PASSED">Passed</option>
              <option value="FAILED">Failed</option>
              <option value="REWORK_REQUIRED">Rework Required</option>
            </select>
          </div>

          {/* Cards list */}
          {filteredQC.length === 0 ? (
            <div className="p-16 text-center text-slate-500 border border-dashed border-slate-800 rounded-2xl bg-slate-900/10 flex flex-col items-center justify-center">
              <ShieldCheck className="w-12 h-12 text-slate-750 mb-3" />
              <p className="font-semibold text-sm">No Quality Inspections logged</p>
              <p className="text-slate-650 text-xs mt-1">Select "Run Quality Audit" above to post a checklist audit trail.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {filteredQC.map(rec => (
                <div key={rec.id} className="bg-slate-900/35 border border-slate-850 p-5 rounded-2xl flex flex-col gap-4 backdrop-blur-md relative overflow-hidden transition-all hover:border-slate-800">
                  <div className="flex items-start justify-between border-b border-slate-850 pb-3">
                    <div>
                      <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded border ${
                        rec.status === 'PASSED'
                          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20'
                          : rec.status === 'REWORK_REQUIRED'
                          ? 'bg-amber-500/15 text-amber-400 border-amber-500/20'
                          : 'bg-rose-500/15 text-rose-400 border-rose-500/20'
                      }`}>
                        Inspection: {rec.status.replace('_', ' ')}
                      </span>
                      <h4 className="font-bold text-sm text-white mt-2">{rec.productName}</h4>
                      <p className="text-[10px] text-slate-500 font-mono mt-0.5">Batch: {rec.batchNo} | Code: {rec.productCode}</p>
                    </div>
                    <div className="text-right flex flex-col items-end gap-1.5">
                      <div>
                        <span className="text-[9px] text-slate-500 block uppercase font-semibold">Passed Yield</span>
                        <span className="text-xs font-black text-white mt-0.5 block">{rec.qtyPassed} / {rec.totalInspected} Passed</span>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => openEditQC(rec)}
                          className="text-indigo-400 hover:text-indigo-300 p-1.5 hover:bg-slate-950/45 rounded transition-all cursor-pointer border-0 bg-transparent"
                          title="Edit QC Audit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteQC(rec.id)}
                          className="text-rose-455 hover:text-rose-400 p-1.5 hover:bg-slate-950/45 rounded transition-all cursor-pointer border-0 bg-transparent"
                          title="Delete QC Audit"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 text-[11px] text-slate-400">
                    <div className="flex justify-between items-center">
                      <span>Quality Inspector</span>
                      <span className="text-slate-200 font-medium">{rec.inspectorName}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Audit Date</span>
                      <span className="text-slate-200 font-semibold">{rec.checkDate}</span>
                    </div>
                    <div className="bg-slate-950/20 p-3 border border-slate-900 rounded-xl leading-relaxed mt-1">
                      <span className="text-[9px] text-slate-500 uppercase font-black block tracking-widest mb-1">Inspector Auditing Remarks</span>
                      <span className="text-[10.5px] text-slate-300 font-medium italic">"{rec.remarks}"</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Rework Repairs Console */
        <div className="bg-slate-900/35 border border-slate-800/80 p-6 rounded-2xl space-y-4 backdrop-blur-xl animate-fade-in text-left">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-855 pb-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5 uppercase tracking-wider">
                <Wrench className="w-4.5 h-4.5 text-indigo-400" />
                Corporate Rework routing & Scrap Logs
              </h3>
              <p className="text-slate-500 text-xs mt-1">
                Track lots routed for shop floor repairs and audit completion status rates.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xl shrink-0">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search reworks by product, batch or operator..."
                  value={reworkSearch}
                  onChange={e => setReworkSearch(e.target.value)}
                  className="w-full bg-slate-900/40 border border-slate-800/80 focus:border-indigo-500/50 py-2 pl-10 pr-4 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none transition-all"
                />
              </div>
              <select
                value={reworkStatus}
                onChange={e => setReworkStatus(e.target.value)}
                className="bg-slate-900/40 border border-slate-800/80 text-xs text-slate-300 rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500/50 cursor-pointer"
              >
                <option value="ALL">All Rework Statuses</option>
                <option value="OPEN">Open</option>
                <option value="REPAIRED_PASSED">Repaired Passed</option>
                <option value="SCRAPPED">Scrapped</option>
              </select>
            </div>
          </div>

          {filteredRework.length === 0 ? (
            <div className="p-16 text-center text-slate-500 border border-dashed border-slate-800 rounded-2xl bg-slate-900/10 flex flex-col items-center justify-center">
              <Wrench className="w-12 h-12 text-slate-750 mb-3" />
              <p className="font-semibold text-sm">No active Rework repairs</p>
              <p className="text-slate-650 text-xs mt-1">All batches are currently sufficient. Defective yields will spawn repair rosters automatically.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredRework.map(card => (
                <div key={card.id} className="p-5 bg-slate-950/30 border border-slate-850 rounded-2xl flex flex-col md:flex-row gap-5 items-start md:items-center justify-between">
                  <div className="space-y-2 text-left flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded border ${
                        card.status === 'OPEN' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : card.status === 'REPAIRED_PASSED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-slate-900 text-slate-500 border-slate-800'
                      }`}>{card.status.replace('_', ' ')}</span>
                      <span className="text-[10px] text-slate-500 font-mono">Batch Reference: {card.batchNo}</span>
                    </div>
                    <h4 className="font-extrabold text-sm text-white">{card.productName}</h4>
                    <p className="text-[11px] text-slate-400">
                      Rework Required: <strong className="text-indigo-400 font-semibold">{card.reworkOperation}</strong>
                    </p>
                    <div className="flex gap-4 text-[10px] text-slate-500 pt-1.5">
                      <span>Assigned Repair Technician: <strong className="text-slate-300">{card.assignedOperator}</strong></span>
                      <span>Qty to Fix: <strong className="text-slate-350">{card.qtyToRepair} units</strong></span>
                    </div>
                    {card.notes && <p className="text-[10px] text-slate-550 italic mt-1">"Notes: {card.notes}"</p>}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => openEditRework(card)}
                      className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-[10px] uppercase rounded-lg border-0 cursor-pointer transition-all active:scale-95 flex items-center gap-1"
                      title="Edit Rework Details"
                    >
                      <Edit2 className="w-3.5 h-3.5" /> Edit
                    </button>

                    {card.status === 'OPEN' && (
                      <>
                        <button
                          onClick={() => handleResolveRework(card.id, 'REPAIRED_PASSED')}
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] uppercase rounded-lg border-0 cursor-pointer transition-all active:scale-95 shadow-md shadow-emerald-600/10 flex items-center gap-1"
                        >
                          <CheckCircle className="w-3.5 h-3.5" /> Re-inspected Passed
                        </button>
                        <button
                          onClick={() => handleResolveRework(card.id, 'SCRAPPED')}
                          className="px-3.5 py-1.5 bg-rose-600/10 hover:bg-rose-600 text-rose-400 hover:text-white font-bold text-[10px] uppercase rounded-lg border border-rose-500/20 hover:border-0 cursor-pointer transition-all active:scale-95 flex items-center gap-1"
                        >
                          <AlertCircle className="w-3.5 h-3.5" /> Scrap Batch
                        </button>
                      </>
                    )}

                    <button
                      onClick={() => handleDeleteRework(card.id)}
                      className="text-rose-455 hover:text-rose-400 p-1.5 hover:bg-slate-950/45 rounded transition-all cursor-pointer border-0 bg-transparent"
                      title="Delete Rework Card"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* QC Audit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md text-left">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-scale-up">
            <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/20">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5 uppercase">
                <ShieldCheck className="w-4 h-4 text-indigo-400" />
                Conduct Quality Audit Checklist
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-500 hover:text-white p-1 hover:bg-slate-800 rounded-lg transition-all border-0 bg-transparent cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateQCRecord} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 block mb-1">Batch Number</label>
                  <input
                    type="text"
                    required
                    value={newBatchNo}
                    onChange={e => setNewBatchNo(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 p-2 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 block mb-1">Target Product</label>
                  <select
                    value={newProductId}
                    onChange={e => setNewProductId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 p-2.5 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    {productCatalog.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* QC Checklists */}
              <div className="p-4 bg-slate-950/40 border border-slate-850 rounded-xl space-y-3">
                <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest block">QC Parameters Audit Checklist</span>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checks.dimensions}
                      onChange={e => setChecks({ ...checks, dimensions: e.target.checked })}
                      className="rounded bg-slate-900 border-slate-800 text-indigo-650"
                    />
                    Dimensions Check
                  </label>
                  <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checks.weldIntegrity}
                      onChange={e => setChecks({ ...checks, weldIntegrity: e.target.checked })}
                      className="rounded bg-slate-900 border-slate-800 text-indigo-650"
                    />
                    Weld & Fit Integrity
                  </label>
                  <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checks.loadStressTest}
                      onChange={e => setChecks({ ...checks, loadStressTest: e.target.checked })}
                      className="rounded bg-slate-900 border-slate-800 text-indigo-650"
                    />
                    Stress / Torque Load
                  </label>
                  <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checks.visualFinish}
                      onChange={e => setChecks({ ...checks, visualFinish: e.target.checked })}
                      className="rounded bg-slate-900 border-slate-800 text-indigo-650"
                    />
                    Visual Finish Audit
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 block mb-1">Total Inspected</label>
                  <input
                    type="number"
                    required
                    value={totalInspected}
                    onChange={e => setTotalInspected(Number(e.target.value))}
                    min="1"
                    className="w-full bg-slate-950 border border-slate-850 p-2 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 block mb-1">Qty Passed Checklist</label>
                  <input
                    type="number"
                    required
                    value={qtyPassed}
                    onChange={e => setQtyPassed(Number(e.target.value))}
                    min="0"
                    className="w-full bg-slate-950 border border-slate-850 p-2 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 block mb-1">Inspector Remarks & Notes</label>
                <textarea
                  value={inspectorRemarks}
                  onChange={e => setInspectorRemarks(e.target.value)}
                  placeholder="Describe tolerances deviations or defects..."
                  className="w-full bg-slate-950 border border-slate-850 p-2 rounded-lg text-xs text-white h-20 focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              <div className="flex gap-3 justify-end pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl border-0 cursor-pointer transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl border-0 cursor-pointer transition-all shadow-lg shadow-indigo-600/10"
                >
                  Confirm QC Log
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QC Edit Modal */}
      {showEditModal && editingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md text-left animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-scale-up">
            <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/20">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5 uppercase">
                <ShieldCheck className="w-4 h-4 text-indigo-400" />
                Edit Quality Audit Record
              </h3>
              <button
                onClick={() => { setShowEditModal(false); setEditingRecord(null); }}
                className="text-slate-500 hover:text-white p-1 hover:bg-slate-800 rounded-lg transition-all border-0 bg-transparent cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateQCRecord} className="p-6 space-y-4">
              <div>
                <label className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 block mb-1">Batch Number</label>
                <input
                  type="text"
                  required
                  value={editBatchNo}
                  onChange={e => setEditBatchNo(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 p-2.5 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 block mb-1">Total Inspected</label>
                  <input
                    type="number"
                    required
                    value={editTotalInspected}
                    onChange={e => setEditTotalInspected(Number(e.target.value))}
                    min="1"
                    className="w-full bg-slate-950 border border-slate-850 p-2 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 block mb-1">Qty Passed</label>
                  <input
                    type="number"
                    required
                    value={editQtyPassed}
                    onChange={e => setEditQtyPassed(Number(e.target.value))}
                    min="0"
                    className="w-full bg-slate-950 border border-slate-850 p-2 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 block mb-1">Inspector Remarks</label>
                <textarea
                  value={editRemarks}
                  onChange={e => setEditRemarks(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 p-2.5 rounded-lg text-xs text-white h-20 focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              <div className="flex gap-3 justify-end pt-3">
                <button
                  type="button"
                  onClick={() => { setShowEditModal(false); setEditingRecord(null); }}
                  className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl border-0 cursor-pointer transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl border-0 cursor-pointer transition-all shadow-lg"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rework Edit Modal */}
      {showEditReworkModal && editingRework && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md text-left animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-scale-up">
            <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/20">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5 uppercase">
                <Wrench className="w-4 h-4 text-indigo-400" />
                Edit Rework Repair Details
              </h3>
              <button
                onClick={() => { setShowEditReworkModal(false); setEditingRework(null); }}
                className="text-slate-500 hover:text-white p-1 hover:bg-slate-800 rounded-lg transition-all border-0 bg-transparent cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateReworkCard} className="p-6 space-y-4">
              <div>
                <label className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 block mb-1">Rework Operation Required</label>
                <input
                  type="text"
                  required
                  value={editReworkOperation}
                  onChange={e => setEditReworkOperation(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 p-2.5 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 block mb-1">Assign Operator / Technician</label>
                <select
                  value={editReworkOperatorId}
                  onChange={e => setEditReworkOperatorId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 p-2.5 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="">-- Select Operator --</option>
                  {employeeCatalog.map(e => (
                    <option key={e.id} value={e.id}>{e.username || e.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 block mb-1">Rework Progress Notes</label>
                <textarea
                  value={editReworkNotes}
                  onChange={e => setEditReworkNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 p-2.5 rounded-lg text-xs text-white h-20 focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              <div className="flex gap-3 justify-end pt-3">
                <button
                  type="button"
                  onClick={() => { setShowEditReworkModal(false); setEditingRework(null); }}
                  className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl border-0 cursor-pointer transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl border-0 cursor-pointer transition-all shadow-lg"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
