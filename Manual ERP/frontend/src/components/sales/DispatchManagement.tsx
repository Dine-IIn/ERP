import React, { useState } from 'react';
import { Truck, Search, Plus, Edit, Trash2, X, AlertCircle, Calendar, CheckCircle2, DollarSign, MapPin, Navigation } from 'lucide-react';

interface DispatchProps {
  dispatches: any[];
  orders: any[];
  onCreateDispatch: (dispatch: any) => Promise<void>;
  onUpdateDispatch: (id: string, dispatch: any) => Promise<void>;
  onDeleteDispatch: (id: string) => Promise<void>;
}

export default function DispatchManagement({
  dispatches,
  orders,
  onCreateDispatch,
  onUpdateDispatch,
  onDeleteDispatch
}: DispatchProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [orderId, setOrderId] = useState('');
  const [carrier, setCarrier] = useState('');
  const [trackingNo, setTrackingNo] = useState('');
  const [vehicleNo, setVehicleNo] = useState('');
  const [shippingCost, setShippingCost] = useState('0.00');
  const [status, setStatus] = useState('SHIPPED');
  const [notes, setNotes] = useState('');

  const [localErr, setLocalErr] = useState<string | null>(null);
  const [localSuccess, setLocalSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const openAddModal = () => {
    setOrderId(orders[0]?.id || '');
    setCarrier('');
    setTrackingNo('');
    setVehicleNo('');
    setShippingCost('0.00');
    setStatus('SHIPPED');
    setNotes('');
    setIsEditing(false);
    setEditingId(null);
    setLocalErr(null);
    setLocalSuccess(null);
    setShowModal(true);
  };

  const openEditModal = (disp: any) => {
    setOrderId(disp.orderId);
    setCarrier(disp.carrier || '');
    setTrackingNo(disp.trackingNo || '');
    setVehicleNo(disp.vehicleNo || '');
    setShippingCost(String(disp.shippingCost || 0));
    setStatus(disp.status || 'SHIPPED');
    setNotes(disp.notes || '');
    setIsEditing(true);
    setEditingId(disp.id);
    setLocalErr(null);
    setLocalSuccess(null);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderId) {
      setLocalErr("Sales Order association is required.");
      return;
    }

    setLocalErr(null);
    setLocalSuccess(null);
    setLoading(true);

    const payload = {
      orderId,
      carrier: carrier || null,
      trackingNo: trackingNo || null,
      vehicleNo: vehicleNo || null,
      shippingCost: parseFloat(shippingCost) || 0.0,
      status,
      notes: notes || null
    };

    try {
      if (isEditing && editingId) {
        await onUpdateDispatch(editingId, payload);
        setLocalSuccess("Dispatch details modified successfully!");
      } else {
        await onCreateDispatch(payload);
        setLocalSuccess("Dispatch logistics recorded successfully!");
      }
      setTimeout(() => {
        setShowModal(false);
      }, 1000);
    } catch (err: any) {
      setLocalErr(err.message || "Failed to process Dispatch logistics.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, dispatchNo: string) => {
    if (window.confirm(`Are you sure you want to permanently cancel and remove Dispatch record '${dispatchNo}'?`)) {
      try {
        await onDeleteDispatch(id);
      } catch (err: any) {
        alert(err.message || "Failed to delete Dispatch record");
      }
    }
  };

  const filtered = (dispatches || []).filter(disp => {
    const dispatchNo = disp?.dispatchNo || '';
    const orderNo = disp?.order?.orderNo || '';
    const customerName = disp?.order?.customer?.name || '';
    const carrierName = disp?.carrier || '';
    const statusVal = disp?.status || '';
    const term = (searchTerm || '').toLowerCase();
    
    return dispatchNo.toLowerCase().includes(term) ||
      orderNo.toLowerCase().includes(term) ||
      customerName.toLowerCase().includes(term) ||
      carrierName.toLowerCase().includes(term) ||
      statusVal.toLowerCase().includes(term);
  });

  return (
    <div className="animate-fade-in flex flex-col gap-4 text-left select-none">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-[var(--border-color)] pb-3">
        <div>
          <h3 className="font-bold text-sm text-[var(--text-primary)] font-display flex items-center gap-1.5 uppercase tracking-wide">
            <Truck className="w-4 h-4 text-amber-400" /> Dispatch & Shipping Logistics
          </h3>
          <p className="text-[var(--text-secondary)] text-[10px] mt-0.5">Track shipment states, carrier courier tracking codes, vehicle assignments, and transportation costs</p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto shrink-0">
          <div className="relative flex-1 md:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Search dispatches, orders, carriers..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-amber-500/50 rounded-lg text-xs text-[var(--text-primary)] focus:outline-none"
            />
          </div>

          <button
            type="button"
            onClick={openAddModal}
            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg text-xs cursor-pointer flex items-center gap-1.5 border-0 bg-transparent transition-all shadow-md active:scale-95 shrink-0"
          >
            <Plus className="w-3.5 h-3.5" /> Book Dispatch
          </button>
        </div>
      </div>

      {/* Grid listing */}
      <div className="overflow-x-auto border border-[var(--border-color)] rounded-xl mt-2">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-[var(--bg-tertiary)] border-b border-[var(--border-color)] text-[var(--text-secondary)] font-bold">
              <th className="p-3 text-[10px] uppercase tracking-wider">Dispatch No</th>
              <th className="p-3 text-[10px] uppercase tracking-wider">Sales Order Ref</th>
              <th className="p-3 text-[10px] uppercase tracking-wider">Carrier / Tracking</th>
              <th className="p-3 text-[10px] uppercase tracking-wider">Transit vehicle</th>
              <th className="p-3 text-[10px] uppercase tracking-wider">Cost / Notes</th>
              <th className="p-3 text-[10px] uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(disp => (
              <tr key={disp.id} className="border-b border-[var(--border-color)]/40 hover:bg-[var(--bg-tertiary)]/20 transition-colors last:border-b-0 text-left">
                <td className="p-3 shrink-0 font-bold font-mono text-amber-400">{disp.dispatchNo}</td>
                <td className="p-3 shrink-0">
                  <span className="font-bold text-indigo-400 font-mono block">{disp.order?.orderNo || 'Sales Order'}</span>
                  <span className="text-[10px] text-[var(--text-primary)] font-bold block">{disp.order?.customer?.name || 'Customer'}</span>
                </td>
                <td className="p-3 shrink-0">
                  <span className="font-bold text-[var(--text-primary)] block">{disp.carrier || 'Direct Delivery'}</span>
                  <span className="text-[9px] text-[var(--text-muted)] font-mono block">Tracking: {disp.trackingNo || 'N/A'}</span>
                </td>
                <td className="p-3 shrink-0">
                  <span className="font-bold font-mono text-[var(--text-primary)] block">{disp.vehicleNo || 'N/A'}</span>
                  <span className="text-[9px] text-[var(--text-muted)] block">Date: {new Date(disp.dispatchDate).toLocaleDateString()}</span>
                </td>
                <td className="p-3 shrink-0">
                  <span className="font-bold font-mono text-emerald-400 flex items-center gap-0.5">
                    <DollarSign className="w-3 h-3" />{disp.shippingCost.toFixed(2)}
                  </span>
                  <span className="text-[9px] text-[var(--text-secondary)] italic truncate max-w-[120px] block mt-0.5">{disp.notes || ''}</span>
                </td>
                <td className="p-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <span className={`px-2 py-0.5 rounded text-[8px] font-bold tracking-wider inline-block uppercase mr-2 ${
                      disp.status === 'DELIVERED' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                      disp.status === 'IN_TRANSIT' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' :
                      disp.status === 'CANCELLED' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                      'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}>
                      {disp.status}
                    </span>
                    <button
                      type="button"
                      onClick={() => openEditModal(disp)}
                      className="px-2 py-1 bg-indigo-600/10 hover:bg-indigo-600 text-indigo-400 hover:text-white rounded transition-all cursor-pointer border-0 bg-transparent flex items-center gap-1 text-[9px] uppercase font-bold"
                    >
                      <Edit className="w-3.5 h-3.5" /> edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(disp.id, disp.dispatchNo)}
                      className="px-2 py-1 bg-rose-600/10 hover:bg-rose-600 text-rose-400 hover:text-white rounded transition-all cursor-pointer border-0 bg-transparent flex items-center gap-1 text-[9px] uppercase font-bold"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> wipe
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-8 text-[var(--text-muted)] italic">No Dispatch shipments logged yet</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Dialog */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in">
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl w-full max-w-xl p-6 relative shadow-2xl text-left select-none animate-scale-up max-h-[90vh] overflow-y-auto">
            <button 
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer bg-transparent border-0"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 pb-3 border-b border-[var(--border-color)]">
              <div className="p-2.5 bg-amber-500/10 rounded-xl text-amber-500 border border-amber-500/20">
                <Truck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base text-[var(--text-primary)] font-display">
                  {isEditing ? 'Modify Shipment Dispatch Settings' : 'Book New Shipment Dispatch'}
                </h3>
                <p className="text-[var(--text-secondary)] text-[10px]">Record shipping carrier metrics, track parcel numbers, set vehicle parameters, and link orders</p>
              </div>
            </div>

            {localErr && (
              <div className="p-3 mt-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{localErr}</span>
              </div>
            )}

            {localSuccess && (
              <div className="p-3 mt-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{localSuccess}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Sales Order Ref */}
              <div className="md:col-span-2">
                <label className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block mb-1">Target Sales Order *</label>
                <select
                  value={orderId}
                  required
                  disabled={isEditing}
                  onChange={e => setOrderId(e.target.value)}
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-amber-500/50 py-2 px-3 rounded-lg text-xs text-[var(--text-primary)] focus:outline-none cursor-pointer disabled:opacity-60"
                >
                  <option value="">-- Select Sales Order --</option>
                  {orders.map(o => (
                    <option key={o.id} value={o.id}>{o.orderNo} - {o.customer?.name} ({o.status})</option>
                  ))}
                </select>
              </div>

              {/* Carrier */}
              <div>
                <label className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block mb-1">Shipping Carrier (e.g. FedEx, DHL)</label>
                <input
                  type="text"
                  placeholder="e.g. DHL Express"
                  value={carrier}
                  onChange={e => setCarrier(e.target.value)}
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-amber-500/50 py-2 px-3 rounded-lg text-xs text-[var(--text-primary)] focus:outline-none"
                />
              </div>

              {/* Tracking No */}
              <div>
                <label className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block mb-1">Carrier Courier Tracking Code</label>
                <input
                  type="text"
                  placeholder="e.g. TRK491023901"
                  value={trackingNo}
                  onChange={e => setTrackingNo(e.target.value)}
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-amber-500/50 py-2 px-3 rounded-lg text-xs text-[var(--text-primary)] focus:outline-none font-mono"
                />
              </div>

              {/* Vehicle No */}
              <div>
                <label className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block mb-1">Delivery Vehicle Number Plate</label>
                <input
                  type="text"
                  placeholder="e.g. MH-12-PQ-9000"
                  value={vehicleNo}
                  onChange={e => setVehicleNo(e.target.value)}
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-amber-500/50 py-2 px-3 rounded-lg text-xs text-[var(--text-primary)] focus:outline-none font-mono"
                />
              </div>

              {/* Shipping Cost */}
              <div>
                <label className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block mb-1">Logistics / Shipping Cost ($)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={shippingCost}
                  onChange={e => setShippingCost(e.target.value)}
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-amber-500/50 py-2 px-3 rounded-lg text-xs text-[var(--text-primary)] focus:outline-none font-mono"
                />
              </div>

              {/* Status */}
              <div>
                <label className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block mb-1">Logistics Status</label>
                <select
                  value={status}
                  onChange={e => setStatus(e.target.value)}
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-amber-500/50 py-2 px-3 rounded-lg text-xs text-[var(--text-primary)] focus:outline-none cursor-pointer"
                >
                  <option value="SHIPPED">SHIPPED (Booked / Packed)</option>
                  <option value="IN_TRANSIT">IN_TRANSIT (Dispatched)</option>
                  <option value="DELIVERED">DELIVERED (Handed over)</option>
                  <option value="CANCELLED">CANCELLED (Returned)</option>
                </select>
              </div>

              {/* Notes */}
              <div className="md:col-span-2">
                <label className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block mb-1">Transit Notes / Delivery Instructions</label>
                <textarea
                  placeholder="Add any gate passes or specific shipping requirements..."
                  value={notes}
                  rows={2}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-amber-500/50 py-2 px-3 rounded-lg text-xs text-[var(--text-primary)] focus:outline-none font-sans"
                />
              </div>

              {/* Buttons */}
              <div className="md:col-span-2 flex gap-3 mt-4 border-t border-[var(--border-color)] pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="w-1/2 bg-[var(--bg-tertiary)] border border-[var(--border-color)] hover:text-[var(--text-primary)] font-bold py-2 rounded-lg text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-1/2 bg-amber-600 hover:bg-amber-500 text-white font-bold py-2 rounded-lg text-xs cursor-pointer transition-colors"
                >
                  {loading ? 'Processing...' : isEditing ? 'Apply Changes' : 'Book Dispatch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
