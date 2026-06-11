import React, { useState } from 'react';
import { Package, Search, Plus, Trash2, X, AlertCircle, CheckCircle2, Clipboard, ShieldCheck, HelpCircle } from 'lucide-react';

interface GrnItem {
  id?: string;
  productId: string;
  qtyOrdered: number;
  qtyReceived: number;
  qtyAccepted: number;
  qtyRejected: number;
  product?: { name: string; uom: string };
}

interface Grn {
  id: string;
  grnNo: string;
  poId: string;
  purchaseOrder: { id: string; poNo: string };
  receivedDate: string;
  receivedBy?: string;
  gateEntryNo?: string;
  challanNo?: string;
  status: string;
  notes?: string;
  items: GrnItem[];
}

interface GrnProps {
  grns: Grn[];
  purchaseOrders: any[];
  onCreateGrn: (payload: any) => Promise<void>;
  onDeleteGrn: (id: string) => Promise<void>;
}

interface ItemChecklistInput {
  productId: string;
  productName: string;
  uom: string;
  qtyOrdered: string;
  qtyReceived: string;
  qtyAccepted: string;
  qtyRejected: string;
}

export default function Grn({
  grns,
  purchaseOrders,
  onCreateGrn,
  onDeleteGrn
}: GrnProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);

  const [poId, setPoId] = useState('');
  const [grnNo, setGrnNo] = useState('');
  const [receivedDate, setReceivedDate] = useState('');
  const [receivedBy, setReceivedBy] = useState('');
  const [gateEntryNo, setGateEntryNo] = useState('');
  const [challanNo, setChallanNo] = useState('');
  const [status, setStatus] = useState('RECEIVED');
  const [notes, setNotes] = useState('');

  const [itemsInput, setItemsInput] = useState<ItemChecklistInput[]>([]);
  const [localErr, setLocalErr] = useState<string | null>(null);
  const [localSuccess, setLocalSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Active POs filtered for selection
  const approvedPOs = purchaseOrders.filter(po => po.status === 'APPROVED' || po.status === 'SHIPPED');

  const openAddModal = () => {
    setPoId('');
    setGrnNo(`GRN-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`);
    setReceivedDate(new Date().toISOString().substring(0, 10));
    setReceivedBy('');
    setGateEntryNo('');
    setChallanNo('');
    setStatus('RECEIVED');
    setNotes('');
    setItemsInput([]);
    setLocalErr(null);
    setLocalSuccess(null);
    setShowModal(true);
  };

  const handlePoSelection = (selectedPoId: string) => {
    setPoId(selectedPoId);
    const selectedPo = purchaseOrders.find(po => po.id === selectedPoId);
    if (selectedPo && selectedPo.items) {
      const mapped = selectedPo.items.map((it: any) => ({
        productId: it.productId,
        productName: it.product?.name || 'Item catalog',
        uom: it.product?.uom || 'units',
        qtyOrdered: String(it.quantity),
        qtyReceived: String(it.quantity),
        qtyAccepted: String(it.quantity),
        qtyRejected: '0'
      }));
      setItemsInput(mapped);
    }
  };

  const handleQtyChange = (index: number, field: 'qtyReceived' | 'qtyAccepted' | 'qtyRejected', value: string) => {
    const updated = [...itemsInput];
    updated[index][field] = value;

    // Auto-calculate rejected volume or accepted volume based on received volumes
    if (field === 'qtyReceived') {
      updated[index].qtyAccepted = value;
      updated[index].qtyRejected = '0';
    } else if (field === 'qtyAccepted') {
      const rec = parseFloat(updated[index].qtyReceived) || 0;
      const acc = parseFloat(value) || 0;
      updated[index].qtyRejected = String(Math.max(0, rec - acc));
    } else if (field === 'qtyRejected') {
      const rec = parseFloat(updated[index].qtyReceived) || 0;
      const rej = parseFloat(value) || 0;
      updated[index].qtyAccepted = String(Math.max(0, rec - rej));
    }

    setItemsInput(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!poId || !grnNo.trim() || itemsInput.length === 0) {
      setLocalErr("Purchase Order reference, GRN No, and inward items checklist are required.");
      return;
    }

    setLocalErr(null);
    setLocalSuccess(null);
    setLoading(true);

    const payload = {
      poId,
      grnNo: grnNo.trim(),
      receivedDate: receivedDate || null,
      receivedBy: receivedBy.trim() || null,
      gateEntryNo: gateEntryNo.trim() || null,
      challanNo: challanNo.trim() || null,
      status,
      notes: notes.trim() || null,
      items: itemsInput.map(it => ({
        productId: it.productId,
        qtyOrdered: parseFloat(it.qtyOrdered) || 0.0,
        qtyReceived: parseFloat(it.qtyReceived) || 0.0,
        qtyAccepted: parseFloat(it.qtyAccepted) || 0.0,
        qtyRejected: parseFloat(it.qtyRejected) || 0.0
      }))
    };

    try {
      await onCreateGrn(payload);
      setLocalSuccess("Goods Receipt Note (GRN) logged! Inventory stocks in-warded.");
      setTimeout(() => {
        setShowModal(false);
      }, 1000);
    } catch (err: any) {
      setLocalErr(err.message || "Failed to inward Goods Receipt.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, grnNo: string) => {
    if (window.confirm(`Are you sure you want to permanently void and delete GRN '${grnNo}'? Physical stocks will be subtracted back.`)) {
      try {
        await onDeleteGrn(id);
      } catch (err: any) {
        alert(err.message || "Failed to void GRN.");
      }
    }
  };

  const filteredGrns = (grns || []).filter(g => {
    const grnNo = g?.grnNo || '';
    const poNo = g?.purchaseOrder?.poNo || '';
    const term = (searchTerm || '').toLowerCase();
    return grnNo.toLowerCase().includes(term) ||
      poNo.toLowerCase().includes(term);
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-900/40 p-6 rounded-2xl border border-slate-800/80 backdrop-blur-xl">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Clipboard className="w-6 h-6 text-emerald-400" />
            Goods Receipt Notes (GRN)
          </h1>
          <p className="text-slate-400 text-sm mt-1">Conduct inbound batch quality inspection, check supplier volumes against PO specifications, and register warehouse stock ins.</p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 active:scale-95 transition-all text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/20"
        >
          <Plus className="w-5 h-5" />
          Log Incoming GRN
        </button>
      </div>

      {/* Main Grid */}
      <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl backdrop-blur-xl overflow-hidden">
        {/* Search */}
        <div className="p-4 border-b border-slate-800/60 bg-slate-950/20">
          <div className="relative max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search GRNs by no or PO reference..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-950/40 border border-slate-850/60 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl text-white text-sm outline-none transition-all"
            />
          </div>
        </div>

        {/* Table/List */}
        <div className="overflow-x-auto">
          {filteredGrns.length === 0 ? (
            <div className="p-12 text-center">
              <Clipboard className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400 font-medium">No Goods Receipt Notes registered</p>
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-medium uppercase tracking-wider text-xs bg-slate-950/40">
                  <th className="py-4 px-6">GRN Document No</th>
                  <th className="py-4 px-6">Linked PO Ref</th>
                  <th className="py-4 px-6">Received Date</th>
                  <th className="py-4 px-6">Gate / Challan</th>
                  <th className="py-4 px-6">Inspector</th>
                  <th className="py-4 px-6">Quality Inspection</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredGrns.map((g) => (
                  <tr key={g.id} className="hover:bg-slate-800/20 transition-colors">
                    <td className="py-4 px-6 font-bold text-white font-mono">{g.grnNo}</td>
                    <td className="py-4 px-6 font-bold text-indigo-400 font-mono text-xs">{g.purchaseOrder.poNo}</td>
                    <td className="py-4 px-6 font-mono text-slate-350">{new Date(g.receivedDate).toLocaleDateString()}</td>
                    <td className="py-4 px-6 space-y-0.5 text-xs text-slate-400 font-mono">
                      {g.gateEntryNo && <div>Gate: {g.gateEntryNo}</div>}
                      {g.challanNo && <div>Challan: {g.challanNo}</div>}
                      {!g.gateEntryNo && !g.challanNo && <span className="text-slate-650 italic">None</span>}
                    </td>
                    <td className="py-4 px-6 text-slate-300 font-medium">{g.receivedBy || 'Staff'}</td>
                    <td className="py-4 px-6">
                      <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${
                        g.status === 'INSPECTED' ? 'bg-emerald-500/10 text-emerald-450 border-emerald-500/20' :
                        g.status === 'REJECTED' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                        'bg-blue-500/10 text-blue-400 border-blue-500/20'
                      }`}>
                        {g.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right space-x-2">
                      <button
                        onClick={() => handleDelete(g.id, g.grnNo)}
                        className="p-1.5 hover:bg-slate-850 text-slate-550 hover:text-red-400 transition-colors rounded-lg"
                        title="Void GRN (Deduct physical stock)"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Add Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden transform transition-all max-h-[90vh] flex flex-col animate-scaleUp">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-950/20">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                Goods Inward QC Quality Inspection Notes (GRN)
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto flex-1">
              {localErr && (
                <div className="flex items-center gap-2.5 p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <span>{localErr}</span>
                </div>
              )}

              {localSuccess && (
                <div className="flex items-center gap-2.5 p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-sm">
                  <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                  <span>{localSuccess}</span>
                </div>
              )}

              {/* Selections */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-450 text-xs font-semibold uppercase tracking-wider">Select Approved PO</label>
                  <select
                    value={poId}
                    onChange={(e) => handlePoSelection(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-emerald-500 transition-all text-sm"
                    required
                  >
                    <option value="">Choose approved Purchase Order</option>
                    {approvedPOs.map(po => (
                      <option key={po.id} value={po.id}>{po.poNo} ({po.vendor?.name})</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-450 text-xs font-semibold uppercase tracking-wider">GRN Sheet No</label>
                  <input
                    type="text"
                    value={grnNo}
                    onChange={(e) => setGrnNo(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-emerald-500 transition-all text-sm font-mono font-bold"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-450 text-xs font-semibold uppercase tracking-wider">Arrival Date</label>
                  <input
                    type="date"
                    value={receivedDate}
                    onChange={(e) => setReceivedDate(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-emerald-500 transition-all text-sm font-mono"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-450 text-xs font-semibold uppercase tracking-wider">Gate Entry Reference No</label>
                  <input
                    type="text"
                    placeholder="e.g. GATE-921-A"
                    value={gateEntryNo}
                    onChange={(e) => setGateEntryNo(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-emerald-500 transition-all text-sm font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-450 text-xs font-semibold uppercase tracking-wider">Supplier Challan Invoice No</label>
                  <input
                    type="text"
                    placeholder="e.g. CHAL-8211"
                    value={challanNo}
                    onChange={(e) => setChallanNo(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-emerald-500 transition-all text-sm font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-450 text-xs font-semibold uppercase tracking-wider">Quality Inspector Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Inspector John"
                    value={receivedBy}
                    onChange={(e) => setReceivedBy(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-emerald-500 transition-all text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-450 text-xs font-semibold uppercase tracking-wider">Inspection Stage</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-emerald-500 transition-all text-sm font-semibold"
                  >
                    <option value="RECEIVED">RECEIVED UNINSPECTED</option>
                    <option value="INSPECTED">INSPECTED & PASSED QC</option>
                    <option value="REJECTED">FAILED QC / REJECTED</option>
                  </select>
                </div>
              </div>

              {/* Items checklist */}
              <div className="space-y-3">
                <div className="border-b border-slate-800 pb-2 flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-200">Quality Check (QC) Quantities Registry</h4>
                  <span className="text-[10px] text-slate-500 flex items-center gap-1">
                    <HelpCircle className="w-3.5 h-3.5" />
                    Specify accepted/rejected volumes from actual received batches.
                  </span>
                </div>

                {itemsInput.length === 0 ? (
                  <div className="p-8 text-center text-slate-550 border border-dashed border-slate-800 rounded-xl">
                    Select a PO reference to checklist ordered parts.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {itemsInput.map((it, idx) => (
                      <div key={idx} className="grid grid-cols-12 gap-3 items-center bg-slate-950/20 p-4 rounded-xl border border-slate-800/40">
                        <div className="col-span-3">
                          <div className="font-semibold text-white text-xs">{it.productName}</div>
                          <div className="text-[10px] text-slate-500 font-mono mt-0.5">UOM: {it.uom}</div>
                        </div>

                        <div className="col-span-2">
                          <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">PO Ordered Qty</div>
                          <div className="font-mono text-xs text-slate-300 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">{it.qtyOrdered}</div>
                        </div>

                        <div className="col-span-2 space-y-1">
                          <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Qty Received</label>
                          <input
                            type="number"
                            value={it.qtyReceived}
                            onChange={(e) => handleQtyChange(idx, 'qtyReceived', e.target.value)}
                            className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs font-mono outline-none focus:border-emerald-500"
                            required
                          />
                        </div>

                        <div className="col-span-2 space-y-1">
                          <label className="text-[10px] text-emerald-500/80 font-bold uppercase tracking-wider">Passed QC (Acc)</label>
                          <input
                            type="number"
                            value={it.qtyAccepted}
                            onChange={(e) => handleQtyChange(idx, 'qtyAccepted', e.target.value)}
                            className="w-full px-3 py-1.5 bg-slate-950 border border-emerald-950/40 focus:border-emerald-500 rounded-lg text-white text-xs font-mono outline-none"
                            required
                          />
                        </div>

                        <div className="col-span-3 space-y-1">
                          <label className="text-[10px] text-red-500/85 font-bold uppercase tracking-wider">Failed QC (Rej)</label>
                          <input
                            type="number"
                            value={it.qtyRejected}
                            onChange={(e) => handleQtyChange(idx, 'qtyRejected', e.target.value)}
                            className="w-full px-3 py-1.5 bg-slate-950 border border-red-950/40 focus:border-red-500 rounded-lg text-red-400 text-xs font-mono outline-none"
                            required
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-slate-450 text-xs font-semibold uppercase tracking-wider">Batch Remarks & Inspection logs</label>
                <textarea
                  rows={2}
                  placeholder="Record summary of structural damages, packaging leaks, or quality status..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-emerald-500 transition-all text-sm resize-none"
                />
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-end gap-3 bg-slate-950/20 -mx-6 -mb-6 p-6">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4.5 py-2 text-slate-400 hover:text-white transition-all text-sm font-semibold hover:bg-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white transition-all text-sm font-bold rounded-xl shadow-lg shadow-emerald-500/20"
                >
                  {loading ? 'Processing...' : 'Complete & Stock Inward'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
