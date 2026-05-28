import React, { useState } from 'react';
import { PackageX, Search, Plus, Trash2, X, AlertCircle, CheckCircle2, ClipboardSignature, ArrowLeftRight } from 'lucide-react';

interface PurchaseReturnItem {
  id?: string;
  productId: string;
  quantity: number;
  price: number;
  product?: { name: string; uom: string };
}

interface PurchaseReturn {
  id: string;
  returnNo: string;
  poId: string;
  purchaseOrder: { id: string; poNo: string };
  returnDate: string;
  reason: string;
  status: string;
  items: PurchaseReturnItem[];
}

interface PurchaseReturnsProps {
  returns: PurchaseReturn[];
  purchaseOrders: any[];
  onCreateReturn: (payload: any) => Promise<void>;
  onDeleteReturn: (id: string) => Promise<void>;
  currencySymbol?: string;
}

interface ItemInput {
  productId: string;
  productName: string;
  uom: string;
  quantity: string;
  price: string;
}

export default function PurchaseReturns({
  returns,
  purchaseOrders,
  onCreateReturn,
  onDeleteReturn,
  currencySymbol = '$'
}: PurchaseReturnsProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);

  const [poId, setPoId] = useState('');
  const [returnNo, setReturnNo] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [reason, setReason] = useState('');
  const [status, setStatus] = useState('PENDING');

  const [items, setItems] = useState<ItemInput[]>([]);
  const [localErr, setLocalErr] = useState<string | null>(null);
  const [localSuccess, setLocalSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Active POs filtered for selection (can return from approved/completed POs)
  const activePOs = purchaseOrders.filter(po => po.status === 'APPROVED' || po.status === 'SHIPPED' || po.status === 'COMPLETED');

  const openAddModal = () => {
    setPoId('');
    setReturnNo(`RET-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
    setReturnDate(new Date().toISOString().substring(0, 10));
    setReason('');
    setStatus('PENDING');
    setItems([]);
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
        quantity: String(it.quantity),
        price: String(it.price)
      }));
      setItems(mapped);
    }
  };

  const handleQtyChange = (index: number, value: string) => {
    const updated = [...items];
    updated[index].quantity = value;
    setItems(updated);
  };

  const computeTotalValue = () => {
    return items.reduce((sum, it) => {
      const q = parseFloat(it.quantity) || 0;
      const p = parseFloat(it.price) || 0;
      return sum + (q * p);
    }, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!poId || !returnNo.trim() || !reason.trim() || items.length === 0) {
      setLocalErr("PO Reference, Return No, Reason, and return quantities are required fields.");
      return;
    }

    // Check that we are returning at least something (qty > 0)
    const validItems = items.filter(it => (parseFloat(it.quantity) || 0) > 0);
    if (validItems.length === 0) {
      setLocalErr("At least one return item must have a quantity greater than zero.");
      return;
    }

    setLocalErr(null);
    setLocalSuccess(null);
    setLoading(true);

    const payload = {
      poId,
      returnNo: returnNo.trim(),
      returnDate: returnDate || null,
      reason: reason.trim(),
      status,
      items: validItems.map(it => ({
        productId: it.productId,
        quantity: parseFloat(it.quantity) || 1.0,
        price: parseFloat(it.price) || 0.0
      }))
    };

    try {
      await onCreateReturn(payload);
      setLocalSuccess("Supplier Return (Debit Note) compiled! Inventory stocks updated.");
      setTimeout(() => {
        setShowModal(false);
      }, 1000);
    } catch (err: any) {
      setLocalErr(err.message || "Failed to inward Sourcing Return.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, returnNo: string) => {
    if (window.confirm(`Are you sure you want to permanently delete Return Debit Note '${returnNo}'? Physical stocks will be returned/added back.`)) {
      try {
        await onDeleteReturn(id);
      } catch (err: any) {
        alert(err.message || "Failed to cancel return.");
      }
    }
  };

  const filteredReturns = returns.filter(r =>
    r.returnNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.purchaseOrder.poNo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-900/40 p-6 rounded-2xl border border-slate-800/80 backdrop-blur-xl">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <PackageX className="w-6 h-6 text-red-400" />
            Sourcing Returns (Debit Notes)
          </h1>
          <p className="text-slate-400 text-sm mt-1">Compile Supplier debit note vouchers for damaged goods, coordinate return logistics, and subtract physical inventory stocks.</p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-red-500 hover:bg-red-650 active:scale-95 transition-all text-white font-semibold rounded-xl shadow-lg shadow-red-500/20"
        >
          <Plus className="w-5 h-5" />
          Issue Debit Note Return
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
              placeholder="Search Debit notes by number or PO reference..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-950/40 border border-slate-850/60 focus:border-red-500 focus:ring-1 focus:ring-red-500 rounded-xl text-white text-sm outline-none transition-all"
            />
          </div>
        </div>

        {/* Table/List */}
        <div className="overflow-x-auto">
          {filteredReturns.length === 0 ? (
            <div className="p-12 text-center">
              <PackageX className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400 font-medium">No purchase return debit notes recorded</p>
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-medium uppercase tracking-wider text-xs bg-slate-950/40">
                  <th className="py-4 px-6">Debit Note Return No</th>
                  <th className="py-4 px-6">Linked PO Ref</th>
                  <th className="py-4 px-6">Return Date</th>
                  <th className="py-4 px-6">Reason for return</th>
                  <th className="py-4 px-6">Debit Value</th>
                  <th className="py-4 px-6">Return Status</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredReturns.map((r) => {
                  const debitVal = r.items.reduce((sum, it) => sum + (it.quantity * it.price), 0);
                  return (
                    <tr key={r.id} className="hover:bg-slate-800/20 transition-colors">
                      <td className="py-4 px-6 font-bold text-white font-mono">{r.returnNo}</td>
                      <td className="py-4 px-6 font-bold text-indigo-400 font-mono text-xs">{r.purchaseOrder.poNo}</td>
                      <td className="py-4 px-6 font-mono text-slate-350">{new Date(r.returnDate).toLocaleDateString()}</td>
                      <td className="py-4 px-6 max-w-xs truncate text-slate-405" title={r.reason}>{r.reason}</td>
                      <td className="py-4 px-6 font-mono text-red-405 text-base font-bold">
                        -{currencySymbol}{debitVal.toLocaleString()}
                      </td>
                      <td className="py-4 px-6">
                        <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${
                          r.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-450 border-emerald-500/20' :
                          r.status === 'SENT' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                          'bg-slate-800 border-slate-700 text-slate-400'
                        }`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right space-x-2">
                        <button
                          onClick={() => handleDelete(r.id, r.returnNo)}
                          className="p-1.5 hover:bg-slate-850 text-slate-550 hover:text-red-400 transition-colors rounded-lg"
                          title="Void return voucher (Re-add physical stock)"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Add Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden transform transition-all max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-950/20">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <ClipboardSignature className="w-5 h-5 text-red-400" />
                Issue Sourcing Return Debit Note Sheet
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
                  <label className="text-slate-450 text-xs font-semibold uppercase tracking-wider">Select Source PO Ref</label>
                  <select
                    value={poId}
                    onChange={(e) => handlePoSelection(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-red-500 transition-all text-sm"
                    required
                  >
                    <option value="">Choose active Purchase Order</option>
                    {activePOs.map(po => (
                      <option key={po.id} value={po.id}>{po.poNo} ({po.vendor?.name})</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-450 text-xs font-semibold uppercase tracking-wider">Debit Note Return No</label>
                  <input
                    type="text"
                    value={returnNo}
                    onChange={(e) => setReturnNo(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-red-500 transition-all text-sm font-mono font-bold"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-450 text-xs font-semibold uppercase tracking-wider">Return Date</label>
                  <input
                    type="date"
                    value={returnDate}
                    onChange={(e) => setReturnDate(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-red-500 transition-all text-sm font-mono"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1 col-span-2">
                  <label className="text-slate-450 text-xs font-semibold uppercase tracking-wider">Reason for Returning Supply</label>
                  <input
                    type="text"
                    placeholder="e.g. Quality defects found in structural fittings"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-red-500 transition-all text-sm"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-450 text-xs font-semibold uppercase tracking-wider">Logistics Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-red-500 transition-all text-sm font-semibold"
                  >
                    <option value="PENDING">PENDING IN TRANSIT</option>
                    <option value="SENT">DISPATCHED TO SUPPLIER</option>
                    <option value="COMPLETED">CREDIT ADJUSTED (COMPLETED)</option>
                  </select>
                </div>
              </div>

              {/* Items checklist */}
              <div className="space-y-3">
                <div className="border-b border-slate-800 pb-2 flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-200">Return Quantities Breakdown</h4>
                  <span className="text-[10px] text-slate-550 flex items-center gap-1">
                    <ArrowLeftRight className="w-3.5 h-3.5" />
                    Enter the exact volumes of products being shipped back.
                  </span>
                </div>

                {items.length === 0 ? (
                  <div className="p-8 text-center text-slate-550 border border-dashed border-slate-800 rounded-xl">
                    Select a PO reference to checklist ordered lines.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {items.map((it, idx) => (
                      <div key={idx} className="grid grid-cols-12 gap-3 items-center bg-slate-950/20 p-4 rounded-xl border border-slate-800/40">
                        <div className="col-span-5">
                          <div className="font-semibold text-white text-xs">{it.productName}</div>
                          <div className="text-[10px] text-slate-500 font-mono mt-0.5">UOM: {it.uom} | Price: {currencySymbol}{parseFloat(it.price).toLocaleString()}</div>
                        </div>

                        <div className="col-span-3">
                          <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Purchased Cost</div>
                          <div className="font-mono text-xs text-slate-350">{currencySymbol}{parseFloat(it.price).toLocaleString()}</div>
                        </div>

                        <div className="col-span-4 space-y-1">
                          <label className="text-[10px] text-red-405 font-bold uppercase tracking-wider">Returning Qty Volume</label>
                          <input
                            type="number"
                            min="0"
                            value={it.quantity}
                            onChange={(e) => handleQtyChange(idx, e.target.value)}
                            className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs font-mono outline-none focus:border-red-500"
                            required
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Summary */}
              <div className="flex justify-end pt-4 border-t border-slate-800">
                <div className="w-64 space-y-2 text-xs font-mono">
                  <div className="flex justify-between text-white text-sm font-bold pt-1.5">
                    <span>Debit Note Value:</span>
                    <span className="text-red-400">-{currencySymbol}{computeTotalValue().toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
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
                  className="px-5 py-2 bg-red-500 hover:bg-red-650 disabled:opacity-50 text-white transition-all text-sm font-bold rounded-xl shadow-lg shadow-red-500/20"
                >
                  {loading ? 'Processing...' : 'Issue Debit Note'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
