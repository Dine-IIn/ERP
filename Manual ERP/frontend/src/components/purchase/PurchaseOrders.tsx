import React, { useState } from 'react';
import { ShoppingCart, Search, Plus, Trash2, X, AlertCircle, CheckCircle2, DollarSign, Calendar, Tag, Trash, Eye, Edit } from 'lucide-react';

interface PurchaseOrderItem {
  id?: string;
  productId: string;
  quantity: number;
  price: number;
  discount: number;
  product?: { name: string; uom: string };
}

interface PurchaseOrder {
  id: string;
  poNo: string;
  vendorId: string;
  vendor: { id: string; name: string; contactNo: string };
  date: string;
  deliveryDate?: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  status: string;
  items: PurchaseOrderItem[];
}

interface PurchaseOrdersProps {
  orders: PurchaseOrder[];
  vendors: any[];
  products: any[];
  onCreateOrder: (payload: any) => Promise<void>;
  onUpdateOrder: (id: string, payload: any) => Promise<void>;
  onUpdateOrderStatus: (id: string, payload: { status: string }) => Promise<void>;
  onDeleteOrder: (id: string) => Promise<void>;
  currencySymbol?: string;
}

interface ItemInput {
  productId: string;
  quantity: string;
  price: string;
  discount: string;
}

export default function PurchaseOrders({
  orders,
  vendors,
  products,
  onCreateOrder,
  onUpdateOrder,
  onUpdateOrderStatus,
  onDeleteOrder,
  currencySymbol = '$'
}: PurchaseOrdersProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editOrderId, setEditOrderId] = useState<string | null>(null);
  const [selectedDetailOrder, setSelectedDetailOrder] = useState<PurchaseOrder | null>(null);

  const [vendorId, setVendorId] = useState('');
  const [poNo, setPoNo] = useState('');
  const [date, setDate] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [discountPercent, setDiscountPercent] = useState('0.00'); // global PO discount %
  const [taxPercent, setTaxPercent] = useState('18.00'); // global sourcing tax rate %
  const [status, setStatus] = useState('PENDING');

  const [items, setItems] = useState<ItemInput[]>([]);
  const [localErr, setLocalErr] = useState<string | null>(null);
  const [localSuccess, setLocalSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const openAddModal = () => {
    setIsEditing(false);
    setEditOrderId(null);
    setVendorId(vendors[0]?.id || '');
    setPoNo(`PO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
    setDate(new Date().toISOString().substring(0, 10));
    setDeliveryDate('');
    setDiscountPercent('0.00');
    setTaxPercent('18.00');
    setStatus('PENDING');
    setItems([{ productId: products[0]?.id || '', quantity: '1', price: String(products[0]?.pricing || 0), discount: '0.00' }]);
    setLocalErr(null);
    setLocalSuccess(null);
    setShowModal(true);
  };

  const openEditModal = (po: PurchaseOrder) => {
    setIsEditing(true);
    setEditOrderId(po.id);
    setVendorId(po.vendorId);
    setPoNo(po.poNo);
    setDate(po.date ? po.date.substring(0, 10) : '');
    setDeliveryDate(po.deliveryDate ? po.deliveryDate.substring(0, 10) : '');
    setDiscountPercent(String(po.discount));
    setTaxPercent(String(po.tax));
    setStatus(po.status);
    setItems(po.items.map(it => ({
      productId: it.productId,
      quantity: String(it.quantity),
      price: String(it.price),
      discount: String(it.discount || 0)
    })));
    setLocalErr(null);
    setLocalSuccess(null);
    setShowModal(true);
  };

  const addItemRow = () => {
    setItems([...items, { productId: products[0]?.id || '', quantity: '1', price: String(products[0]?.pricing || 0), discount: '0.00' }]);
  };

  const removeItemRow = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof ItemInput, value: string) => {
    const updated = [...items];
    updated[index][field] = value;

    if (field === 'productId') {
      const prod = products.find(p => p.id === value);
      if (prod) {
        updated[index].price = String(prod.pricing || 0);
      }
    }
    setItems(updated);
  };

  const computeSubtotal = () => {
    return items.reduce((sum, item) => {
      const q = parseFloat(item.quantity) || 0;
      const p = parseFloat(item.price) || 0;
      const d = parseFloat(item.discount) || 0;
      const base = q * p;
      const discountAmt = base * (d / 100);
      return sum + (base - discountAmt);
    }, 0);
  };

  const subtotalVal = computeSubtotal();
  const globalDiscountVal = subtotalVal * ((parseFloat(discountPercent) || 0) / 100);
  const taxableBasis = subtotalVal - globalDiscountVal;
  const taxVal = taxableBasis * ((parseFloat(taxPercent) || 0) / 100);
  const totalVal = taxableBasis + taxVal;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorId || !poNo.trim() || items.length === 0) {
      setLocalErr("Vendor partner, PO number, and at least one order line are required.");
      return;
    }

    setLocalErr(null);
    setLocalSuccess(null);
    setLoading(true);

    const payload = {
      vendorId,
      poNo: poNo.trim(),
      date: date || null,
      deliveryDate: deliveryDate || null,
      subtotal: subtotalVal,
      discount: parseFloat(discountPercent) || 0.0,
      tax: parseFloat(taxPercent) || 0.0,
      total: totalVal,
      status,
      items: items.map(it => ({
        productId: it.productId,
        quantity: parseFloat(it.quantity) || 1.0,
        price: parseFloat(it.price) || 0.0,
        discount: parseFloat(it.discount) || 0.0
      }))
    };

    try {
      if (isEditing && editOrderId) {
        await onUpdateOrder(editOrderId, payload);
        setLocalSuccess("Corporate Purchase Order updated successfully!");
      } else {
        await onCreateOrder(payload);
        setLocalSuccess("Corporate Purchase Order created successfully!");
      }
      setTimeout(() => {
        setShowModal(false);
      }, 1000);
    } catch (err: any) {
      setLocalErr(err.message || "Failed to save Purchase Order sheet.");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (id: string, s: string) => {
    try {
      await onUpdateOrderStatus(id, { status: s });
    } catch (err: any) {
      alert(err.message || "Failed to update PO status.");
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to permanently void and delete this Purchase Order?")) {
      try {
        await onDeleteOrder(id);
      } catch (err: any) {
        alert(err.message || "Failed to void PO.");
      }
    }
  };

  const filteredOrders = orders.filter(o =>
    o.poNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.vendor.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-900/40 p-6 rounded-2xl border border-slate-800/80 backdrop-blur-xl">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-indigo-400" />
            Purchase Sourcing Orders (PO)
          </h1>
          <p className="text-slate-400 text-sm mt-1">Issue official procurement worksheets, specify contractual items, commercial discounts, and dispatch supplier requests.</p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-550 hover:bg-indigo-600 active:scale-95 transition-all text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/20"
        >
          <Plus className="w-5 h-5" />
          Issue Purchase Order
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
              placeholder="Search PO sheets by no or supplier name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-950/40 border border-slate-850/60 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl text-white text-sm outline-none transition-all"
            />
          </div>
        </div>

        {/* Table/List */}
        <div className="overflow-x-auto">
          {filteredOrders.length === 0 ? (
            <div className="p-12 text-center">
              <ShoppingCart className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400 font-medium">No purchase orders recorded</p>
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-medium uppercase tracking-wider text-xs bg-slate-950/40">
                  <th className="py-4 px-6">PO Document No</th>
                  <th className="py-4 px-6">Vendor Sourcing Partner</th>
                  <th className="py-4 px-6">PO Date</th>
                  <th className="py-4 px-6">Delivery Date</th>
                  <th className="py-4 px-6">Total Cost</th>
                  <th className="py-4 px-6">PO Status</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredOrders.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-800/20 transition-colors">
                    <td className="py-4 px-6 font-bold text-white font-mono">{o.poNo}</td>
                    <td className="py-4 px-6 font-semibold text-slate-200">
                      <div>{o.vendor.name}</div>
                      {o.vendor.contactNo && <div className="text-[10px] text-slate-500 font-mono mt-0.5">{o.vendor.contactNo}</div>}
                    </td>
                    <td className="py-4 px-6 font-mono text-slate-350">{new Date(o.date).toLocaleDateString()}</td>
                    <td className="py-4 px-6 font-mono text-slate-400">
                      {o.deliveryDate ? new Date(o.deliveryDate).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="py-4 px-6 font-mono text-emerald-400 text-base font-bold">
                      {currencySymbol}{o.total.toLocaleString()}
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${
                        o.status === 'APPROVED' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' :
                        o.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-450 border-emerald-500/20' :
                        o.status === 'SHIPPED' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                        'bg-slate-880 border-slate-700 text-slate-400'
                      }`}>
                        {o.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right space-x-2">
                      <button
                        onClick={() => setSelectedDetailOrder(o)}
                        className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-indigo-400 transition-all rounded-lg"
                        title="View PO Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      {o.status !== 'COMPLETED' && (
                        <button
                          onClick={() => openEditModal(o)}
                          className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-amber-500 transition-all rounded-lg"
                          title="Edit Purchase Order"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      )}

                      {o.status === 'PENDING' && (
                        <button
                          onClick={() => handleToggleStatus(o.id, 'APPROVED')}
                          className="px-2 py-1 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 text-indigo-455 text-xs font-bold rounded-lg transition-all"
                        >
                          Approve
                        </button>
                      )}
                      {o.status === 'APPROVED' && (
                        <button
                          onClick={() => handleToggleStatus(o.id, 'SHIPPED')}
                          className="px-2 py-1 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 text-blue-400 text-xs font-bold rounded-lg transition-all"
                        >
                          Ship
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(o.id)}
                        className="p-1.5 hover:bg-slate-850 text-slate-550 hover:text-red-400 transition-colors rounded-lg"
                        title="Void Purchase Order"
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

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden transform transition-all max-h-[95vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-950/20">
              <h3 className="text-lg font-bold text-white">
                {isEditing ? `Edit Purchase Order: ${poNo}` : 'Create Sourcing Purchase Order Sheet'}
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

              {/* Master Selections */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-1 col-span-2">
                  <label className="text-slate-450 text-xs font-semibold uppercase tracking-wider">Vendor Supplier</label>
                  <select
                    value={vendorId}
                    onChange={(e) => setVendorId(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-indigo-500 transition-all text-sm"
                    required
                  >
                    <option value="" disabled>Select target supplier</option>
                    {vendors.map(v => (
                      <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-450 text-xs font-semibold uppercase tracking-wider">PO Document No</label>
                  <input
                    type="text"
                    value={poNo}
                    onChange={(e) => setPoNo(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-indigo-500 transition-all text-sm font-mono"
                    required
                    disabled={isEditing}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-450 text-xs font-semibold uppercase tracking-wider">PO Issue Date</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-indigo-500 transition-all text-sm font-mono"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-450 text-xs font-semibold uppercase tracking-wider">Expected Delivery Date</label>
                  <input
                    type="date"
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-indigo-500 transition-all text-sm font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-450 text-xs font-semibold uppercase tracking-wider">PO Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-indigo-500 transition-all text-sm"
                  >
                    <option value="PENDING">PENDING APPROVAL</option>
                    <option value="APPROVED">APPROVED / ISSUED</option>
                    <option value="SHIPPED">SHIPPED IN TRANSIT</option>
                    <option value="COMPLETED">COMPLETED INWARD</option>
                  </select>
                </div>
              </div>

              {/* Line Items Table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <h4 className="text-sm font-bold text-slate-200">Sourcing Itemized Breakdown</h4>
                  <button
                    type="button"
                    onClick={addItemRow}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-850 hover:bg-slate-800 text-xs text-indigo-400 font-semibold rounded-lg border border-slate-700 transition-all active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Insert Sourcing Line
                  </button>
                </div>

                <div className="space-y-3">
                  {items.map((item, index) => (
                    <div key={index} className="grid grid-cols-12 gap-3 items-center bg-slate-950/20 p-3 rounded-xl border border-slate-800/40">
                      <div className="col-span-4 space-y-1">
                        <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Product Catalog</label>
                        <select
                          value={item.productId}
                          onChange={(e) => handleItemChange(index, 'productId', e.target.value)}
                          className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs outline-none focus:border-indigo-500"
                        >
                          {products.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="col-span-2 space-y-1">
                        <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Unit Cost ({currencySymbol})</label>
                        <input
                          type="number"
                          value={item.price}
                          onChange={(e) => handleItemChange(index, 'price', e.target.value)}
                          className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs font-mono outline-none focus:border-indigo-500"
                          required
                        />
                      </div>

                      <div className="col-span-2 space-y-1">
                        <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Order Qty</label>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                          className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs font-mono outline-none focus:border-indigo-500"
                          required
                        />
                      </div>

                      <div className="col-span-2 space-y-1">
                        <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Item Disc (%)</label>
                        <input
                          type="number"
                          placeholder="0.00"
                          value={item.discount}
                          onChange={(e) => handleItemChange(index, 'discount', e.target.value)}
                          className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs font-mono outline-none focus:border-indigo-500"
                        />
                      </div>

                      <div className="col-span-2 flex items-center justify-between pt-4">
                        <span className="font-mono text-xs font-bold text-slate-400">
                          {currencySymbol}
                          {((parseFloat(item.quantity) || 0) * (parseFloat(item.price) || 0) * (1 - (parseFloat(item.discount) || 0) / 100)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        {items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeItemRow(index)}
                            className="p-1 hover:bg-slate-800 text-red-500/80 hover:text-red-400 rounded transition-all ml-2"
                          >
                            <Trash className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals */}
              <div className="flex justify-end pt-4 border-t border-slate-800">
                <div className="w-64 space-y-2 text-xs font-mono">
                  <div className="flex justify-between text-slate-400">
                    <span>Gross items cost:</span>
                    <span>{currencySymbol}{subtotalVal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-slate-400 items-center gap-2">
                    <span>Sourcing discount (%):</span>
                    <input
                      type="number"
                      value={discountPercent}
                      onChange={(e) => setDiscountPercent(e.target.value)}
                      className="w-16 bg-slate-950 border border-slate-850 px-1.5 py-0.5 rounded text-right text-emerald-450"
                    />
                  </div>
                  {globalDiscountVal > 0 && (
                    <div className="flex justify-between text-red-400/80">
                      <span>Discount amount:</span>
                      <span>-{currencySymbol}{globalDiscountVal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-400 items-center gap-2 border-t border-slate-850 pt-2">
                    <span>Sourcing GST (%):</span>
                    <input
                      type="number"
                      value={taxPercent}
                      onChange={(e) => setTaxPercent(e.target.value)}
                      className="w-16 bg-slate-950 border border-slate-850 px-1.5 py-0.5 rounded text-right text-slate-350"
                    />
                  </div>
                  <div className="flex justify-between text-slate-400 border-b border-slate-850 pb-2">
                    <span>Tax Bracket amount:</span>
                    <span>{currencySymbol}{taxVal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-white text-sm font-bold pt-1.5">
                    <span>Total PO Valuation:</span>
                    <span className="text-indigo-400">{currencySymbol}{totalVal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
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
                  className="px-5 py-2 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white transition-all text-sm font-bold rounded-xl shadow-lg shadow-indigo-500/20"
                >
                  {loading ? 'Processing...' : isEditing ? 'Save Changes' : 'Confirm & Issue PO'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedDetailOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden transform transition-all max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-950/20">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-indigo-400" />
                <h3 className="text-lg font-bold text-white">
                  Purchase Order Details — <span className="font-mono text-indigo-300 font-extrabold">{selectedDetailOrder.poNo}</span>
                </h3>
              </div>
              <button
                onClick={() => setSelectedDetailOrder(null)}
                className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6 overflow-y-auto flex-1 text-left">
              {/* Header Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-950/20 p-4 rounded-xl border border-slate-800">
                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Vendor Supplier</span>
                  <span className="text-sm font-bold text-slate-200">{selectedDetailOrder.vendor.name}</span>
                  {selectedDetailOrder.vendor.contactNo && (
                    <span className="text-[10px] text-slate-500 block font-mono">{selectedDetailOrder.vendor.contactNo}</span>
                  )}
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">PO Issue Date</span>
                  <span className="text-sm font-semibold text-slate-200 font-mono">
                    {new Date(selectedDetailOrder.date).toLocaleDateString()}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Delivery Date</span>
                  <span className="text-sm font-semibold text-slate-200 font-mono">
                    {selectedDetailOrder.deliveryDate ? new Date(selectedDetailOrder.deliveryDate).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">PO Status</span>
                  <span className={`inline-block mt-1 px-2.5 py-0.5 text-xs font-bold rounded-full border ${
                    selectedDetailOrder.status === 'APPROVED' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' :
                    selectedDetailOrder.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-450 border-emerald-500/20' :
                    selectedDetailOrder.status === 'SHIPPED' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                    'bg-slate-850 border-slate-700 text-slate-400'
                  }`}>
                    {selectedDetailOrder.status}
                  </span>
                </div>
              </div>

              {/* Items Table */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Itemized Breakdown</h4>
                <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/20">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-950/40 border-b border-slate-800 text-slate-450 uppercase font-semibold">
                        <th className="py-2.5 px-4">Product Catalog Item</th>
                        <th className="py-2.5 px-4 text-right">Unit Price</th>
                        <th className="py-2.5 px-4 text-right">Quantity</th>
                        <th className="py-2.5 px-4 text-right">Discount</th>
                        <th className="py-2.5 px-4 text-right">Line Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {selectedDetailOrder.items.map((it, idx) => {
                        const base = it.quantity * it.price;
                        const disc = base * ((it.discount || 0) / 100);
                        const lineTotal = base - disc;
                        return (
                          <tr key={idx} className="hover:bg-slate-800/10">
                            <td className="py-2.5 px-4 font-bold text-slate-200">
                              {it.product?.name || "Unknown Product"}
                            </td>
                            <td className="py-2.5 px-4 text-right font-mono text-slate-300">
                              {currencySymbol}{it.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-2.5 px-4 text-right font-mono text-slate-350">
                              {it.quantity} {it.product?.uom || ""}
                            </td>
                            <td className="py-2.5 px-4 text-right font-mono text-amber-500">
                              {it.discount > 0 ? `${it.discount}%` : '-'}
                            </td>
                            <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-200">
                              {currencySymbol}{lineTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Totals */}
              <div className="flex justify-end">
                <div className="w-64 space-y-1.5 text-xs font-mono bg-slate-950/20 p-4 rounded-xl border border-slate-800">
                  <div className="flex justify-between text-slate-450">
                    <span>Gross items cost:</span>
                    <span>{currencySymbol}{selectedDetailOrder.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  {selectedDetailOrder.discount > 0 && (
                    <div className="flex justify-between text-red-400/80">
                      <span>Sourcing discount ({selectedDetailOrder.discount}%):</span>
                      <span>-{currencySymbol}{(selectedDetailOrder.subtotal * (selectedDetailOrder.discount / 100)).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}
                  {selectedDetailOrder.tax > 0 && (
                    <div className="flex justify-between text-slate-450">
                      <span>Sourcing GST ({selectedDetailOrder.tax}%):</span>
                      <span>{currencySymbol}{((selectedDetailOrder.subtotal * (1 - selectedDetailOrder.discount / 100)) * (selectedDetailOrder.tax / 100)).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-white text-sm font-bold border-t border-slate-800 pt-2 mt-2">
                    <span>Total PO Valuation:</span>
                    <span className="text-indigo-400">{currencySymbol}{selectedDetailOrder.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-950/40 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setSelectedDetailOrder(null)}
                className="px-5 py-2 bg-slate-850 hover:bg-slate-800 text-white transition-all text-xs font-bold rounded-xl"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
