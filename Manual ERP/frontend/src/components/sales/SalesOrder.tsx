import React, { useState } from 'react';
import { ShoppingCart, Search, Plus, Edit, Trash2, X, AlertCircle, DollarSign, Calendar, Tag, Layers, CheckCircle2 } from 'lucide-react';

interface SalesOrderProps {
  orders: any[];
  customers: any[];
  products: any[];
  onCreateOrder: (order: any) => Promise<void>;
  onUpdateOrder: (id: string, order: any) => Promise<void>;
  onDeleteOrder: (id: string) => Promise<void>;
  currencySymbol?: string;
}

interface OrderItemInput {
  productId: string;
  quantity: string;
  price: string;
  deliveryDate: string;
  discount: string;
}

export default function SalesOrder({
  orders,
  customers,
  products,
  onCreateOrder,
  onUpdateOrder,
  onDeleteOrder,
  currencySymbol = '$'
}: SalesOrderProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [customerId, setCustomerId] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [discount, setDiscount] = useState('0.00');
  const [status, setStatus] = useState('PENDING');

  const [items, setItems] = useState<OrderItemInput[]>([]);
  const [localErr, setLocalErr] = useState<string | null>(null);
  const [localSuccess, setLocalSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const openAddModal = () => {
    setCustomerId(customers[0]?.id || '');
    setDeliveryDate('');
    setDiscount('0.00');
    setStatus('PENDING');
    setItems([{ productId: products[0]?.id || '', quantity: '1', price: String(products[0]?.pricing || 0), deliveryDate: '', discount: '0.00' }]);
    setIsEditing(false);
    setEditingId(null);
    setLocalErr(null);
    setLocalSuccess(null);
    setShowModal(true);
  };

  const openEditModal = (order: any) => {
    setCustomerId(order.customerId);
    setDeliveryDate(order.deliveryDate ? order.deliveryDate.substring(0, 10) : '');
    setDiscount(String(order.discount || 0));
    setStatus(order.status || 'PENDING');

    const mappedItems = (order.items || []).map((item: any) => ({
      productId: item.productId,
      quantity: String(item.quantity),
      price: String(item.price),
      deliveryDate: item.deliveryDate ? item.deliveryDate.substring(0, 10) : '',
      discount: String(item.discount || 0)
    }));

    setItems(mappedItems.length > 0 ? mappedItems : [{ productId: products[0]?.id || '', quantity: '1', price: String(products[0]?.pricing || 0), deliveryDate: '', discount: '0.00' }]);
    setIsEditing(true);
    setEditingId(order.id);
    setLocalErr(null);
    setLocalSuccess(null);
    setShowModal(true);
  };

  const addItemRow = () => {
    setItems([...items, { productId: products[0]?.id || '', quantity: '1', price: String(products[0]?.pricing || 0), deliveryDate: '', discount: '0.00' }]);
  };

  const removeItemRow = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof OrderItemInput, value: string) => {
    const updated = [...items];
    updated[index][field] = value;

    // Auto-update price when product changes
    if (field === 'productId') {
      const selectedProd = products.find(p => p.id === value);
      if (selectedProd) {
        updated[index].price = String(selectedProd.pricing || 0);
      }
    }

    setItems(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId || items.length === 0) {
      setLocalErr("Customer and at least one ordered item are required.");
      return;
    }

    setLocalErr(null);
    setLocalSuccess(null);
    setLoading(true);

    const payload = {
      customerId,
      deliveryDate: deliveryDate || null,
      discount: parseFloat(discount) || 0.0,
      status,
      items: items.map(item => ({
        productId: item.productId,
        quantity: parseFloat(item.quantity) || 1.0,
        price: parseFloat(item.price) || 0.0,
        deliveryDate: item.deliveryDate || null,
        discount: parseFloat(item.discount) || 0.0
      }))
    };

    try {
      if (isEditing && editingId) {
        await onUpdateOrder(editingId, payload);
        setLocalSuccess("Sales Order specifications modified successfully!");
      } else {
        await onCreateOrder(payload);
        setLocalSuccess("Sales Order registered successfully!");
      }
      setTimeout(() => {
        setShowModal(false);
      }, 1000);
    } catch (err: any) {
      setLocalErr(err.message || "Failed to process Sales Order master entry.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, orderNo: string) => {
    if (window.confirm(`Are you sure you want to permanently cancel and delete Sales Order '${orderNo}'?`)) {
      try {
        await onDeleteOrder(id);
      } catch (err: any) {
        alert(err.message || "Failed to delete Sales Order");
      }
    }
  };

  const getCustomerName = (id: string) => customers.find(c => c.id === id)?.name || 'colleague';
  const getProductName = (id: string) => products.find(p => p.id === id)?.name || 'Item';

  const calculateTotal = (order: any) => {
    const subtotal = (order.items || []).reduce((acc: number, item: any) => {
      const itemSub = item.quantity * item.price;
      const itemDiscPercent = item.discount || 0;
      const itemDiscVal = itemSub * (itemDiscPercent / 100);
      return acc + (itemSub - itemDiscVal);
    }, 0);
    const overallDiscPercent = order.discount || 0;
    const overallDiscVal = subtotal * (overallDiscPercent / 100);
    return Math.max(0, subtotal - overallDiscVal);
  };

  const filtered = orders.filter(o =>
    o.orderNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    getCustomerName(o.customerId).toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.status.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="animate-fade-in flex flex-col gap-4 text-left select-none">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-[var(--border-color)] pb-3">
        <div>
          <h3 className="font-bold text-sm text-[var(--text-primary)] font-display flex items-center gap-1.5 uppercase tracking-wide">
            <ShoppingCart className="w-4 h-4 text-indigo-400" /> Sales Orders Hub
          </h3>
          <p className="text-[var(--text-secondary)] text-[10px] mt-0.5">Administer sales pipelines, customer requests, expectations dates, and pricing contracts</p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto shrink-0">
          <div className="relative flex-1 md:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Search orders, customers..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-indigo-500/50 rounded-lg text-xs text-[var(--text-primary)] focus:outline-none"
            />
          </div>

          <button
            type="button"
            onClick={openAddModal}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-xs cursor-pointer flex items-center gap-1.5 border-0 bg-transparent transition-all shadow-md active:scale-95 shrink-0"
          >
            <Plus className="w-3.5 h-3.5" /> New Sales Order
          </button>
        </div>
      </div>

      {/* Grid listing */}
      <div className="overflow-x-auto border border-[var(--border-color)] rounded-xl mt-2">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-[var(--bg-tertiary)] border-b border-[var(--border-color)] text-[var(--text-secondary)] font-bold">
              <th className="p-3 text-[10px] uppercase tracking-wider">Order No</th>
              <th className="p-3 text-[10px] uppercase tracking-wider">Customer / Company</th>
              <th className="p-3 text-[10px] uppercase tracking-wider">Items summary</th>
              <th className="p-3 text-[10px] uppercase tracking-wider">Overall Valuation</th>
              <th className="p-3 text-[10px] uppercase tracking-wider">Status / Deliveries</th>
              <th className="p-3 text-[10px] uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(order => (
              <tr key={order.id} className="border-b border-[var(--border-color)]/40 hover:bg-[var(--bg-tertiary)]/20 transition-colors last:border-b-0 text-left">
                <td className="p-3 shrink-0 font-bold font-mono text-indigo-400">{order.orderNo}</td>
                <td className="p-3 shrink-0">
                  <span className="font-bold text-[var(--text-primary)] block">{getCustomerName(order.customerId)}</span>
                  <span className="text-[9px] text-[var(--text-muted)] mt-0.5 block">Date: {new Date(order.orderDate).toLocaleDateString()}</span>
                </td>
                <td className="p-3 shrink-0">
                  <div className="flex flex-col gap-1 max-h-16 overflow-y-auto font-mono text-[10px] text-[var(--text-secondary)]">
                    {(order.items || []).map((it: any) => (
                      <span key={it.id} className="block truncate max-w-xs">
                        {getProductName(it.productId)} × {it.quantity} (disc: {it.discount || 0}%)
                      </span>
                    ))}
                  </div>
                </td>
                <td className="p-3 shrink-0 font-bold font-mono text-[var(--text-primary)] flex-col">
                  <span className="flex items-center gap-0.5 text-xs text-indigo-400">
                    <span className="font-bold mr-0.5">{currencySymbol}</span> {calculateTotal(order).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                  {order.discount > 0 && (
                    <span className="text-[9px] text-rose-400 font-medium block">Overall Disc: {order.discount}%</span>
                  )}
                </td>
                <td className="p-3 shrink-0">
                  <span className={`px-2 py-0.5 rounded text-[8px] font-bold tracking-wider inline-block uppercase ${
                    order.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                    order.status === 'DISPATCHED' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' :
                    order.status === 'CANCELLED' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                    'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  }`}>
                    {order.status}
                  </span>
                  <span className="text-[9px] text-[var(--text-secondary)] flex items-center gap-1 mt-1 font-mono">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" /> Delivery: {order.deliveryDate ? new Date(order.deliveryDate).toLocaleDateString() : 'Immediate'}
                  </span>
                </td>
                <td className="p-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => openEditModal(order)}
                      className="px-2 py-1 bg-indigo-600/10 hover:bg-indigo-600 text-indigo-400 hover:text-white rounded transition-all cursor-pointer border-0 bg-transparent flex items-center gap-1 text-[9px] uppercase font-bold"
                    >
                      <Edit className="w-3.5 h-3.5" /> Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(order.id, order.orderNo)}
                      className="px-2 py-1 bg-rose-600/10 hover:bg-rose-600 text-rose-400 hover:text-white rounded transition-all cursor-pointer border-0 bg-transparent flex items-center gap-1 text-[9px] uppercase font-bold"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> WIPE
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-8 text-[var(--text-muted)] italic">No Sales Orders onboarded yet</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ==========================================
          MODAL: CREATOR & MODIFIER FORM
          ========================================== */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in">
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl w-full max-w-2xl p-6 relative shadow-2xl text-left select-none animate-scale-up max-h-[90vh] overflow-y-auto">
            <button 
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer bg-transparent border-0"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 pb-3 border-b border-[var(--border-color)]">
              <div className="p-2.5 bg-indigo-500/10 rounded-xl text-indigo-400 border border-indigo-500/20">
                <ShoppingCart className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base text-[var(--text-primary)] font-display">
                  {isEditing ? 'Modify Sales Order Specifications' : 'Onboard New Sales Order'}
                </h3>
                <p className="text-[var(--text-secondary)] text-[10px]">Setup sales order configurations, billing options, discounts, and dispatch requirements</p>
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
              
              {/* Customer Selector */}
              <div>
                <label className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block mb-1">Target Customer / Client *</label>
                <select
                  value={customerId}
                  required
                  onChange={e => setCustomerId(e.target.value)}
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-indigo-500/50 py-2 px-3 rounded-lg text-xs text-[var(--text-primary)] focus:outline-none cursor-pointer"
                >
                  <option value="">-- Choose Customer --</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.clientClassification || 'NATIONAL'})</option>
                  ))}
                </select>
              </div>

              {/* Delivery Date */}
              <div>
                <label className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block mb-1">Overall Expected Delivery Date (Optional)</label>
                <input
                  type="date"
                  value={deliveryDate}
                  onChange={e => setDeliveryDate(e.target.value)}
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-indigo-500/50 py-2 px-3 rounded-lg text-xs text-[var(--text-primary)] focus:outline-none"
                />
              </div>

              {/* Discount Overall */}
              <div>
                <label className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block mb-1">Overall Order Discount (%) (Optional)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={discount}
                  onChange={e => setDiscount(e.target.value)}
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-indigo-500/50 py-2 px-3 rounded-lg text-xs text-[var(--text-primary)] focus:outline-none font-mono"
                  placeholder="0.00"
                />
              </div>

              {/* Status Selector */}
              <div>
                <label className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block mb-1">Sales Order Status</label>
                <select
                  value={status}
                  onChange={e => setStatus(e.target.value)}
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-indigo-500/50 py-2 px-3 rounded-lg text-xs text-[var(--text-primary)] focus:outline-none cursor-pointer"
                >
                  <option value="PENDING">PENDING (Awaiting Dispatch)</option>
                  <option value="DISPATCHED">DISPATCHED (In Transit)</option>
                  <option value="COMPLETED">COMPLETED (Delivered)</option>
                  <option value="CANCELLED">CANCELLED (Void)</option>
                </select>
              </div>

              {/* Ordered Items rows */}
              <div className="md:col-span-2 border-t border-[var(--border-color)] pt-4 mt-2">
                <div className="flex justify-between items-center mb-3">
                  <div>
                    <span className="text-[10px] font-bold text-indigo-400 tracking-wider uppercase block">Ordered Stock Items</span>
                    <span className="text-[8px] text-[var(--text-secondary)]">Choose inventory products, add quantity thresholds, discounts and custom expected dates</span>
                  </div>

                  <button
                    type="button"
                    onClick={addItemRow}
                    className="px-2.5 py-1.5 bg-indigo-600/10 hover:bg-indigo-600 text-indigo-400 hover:text-white rounded-lg text-[10px] font-bold border-0 bg-transparent flex items-center gap-1 transition-all cursor-pointer shadow-sm active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5" /> Append Product Row
                  </button>
                </div>

                <div className="flex flex-col gap-2 max-h-56 overflow-y-auto border border-[var(--border-color)]/60 rounded-xl p-3 bg-[var(--bg-tertiary)]/10">
                  {items.map((item, index) => (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-5 gap-3 bg-[var(--bg-primary)] p-2.5 rounded-lg border border-[var(--border-color)]/40 items-end relative">
                      {/* Product select */}
                      <div className="md:col-span-2">
                        <label className="text-[7.5px] font-bold text-[var(--text-secondary)] block mb-0.5 uppercase">Product Item *</label>
                        <select
                          required
                          value={item.productId}
                          onChange={e => handleItemChange(index, 'productId', e.target.value)}
                          className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] py-1.5 px-2.5 rounded-md text-xs text-[var(--text-primary)] focus:outline-none cursor-pointer"
                        >
                          {products.map(p => (
                            <option key={p.id} value={p.id}>{p.name} ({currencySymbol}{p.pricing || 0})</option>
                          ))}
                        </select>
                      </div>

                      {/* Quantity */}
                      <div>
                        <label className="text-[7.5px] font-bold text-[var(--text-secondary)] block mb-0.5 uppercase">Qty *</label>
                        <input
                          type="number"
                          min="0.1"
                          step="any"
                          required
                          value={item.quantity}
                          onChange={e => handleItemChange(index, 'quantity', e.target.value)}
                          className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] py-1.5 px-2.5 rounded-md text-xs text-[var(--text-primary)] focus:outline-none font-mono"
                        />
                      </div>

                      {/* Price */}
                      <div>
                        <label className="text-[7.5px] font-bold text-[var(--text-secondary)] block mb-0.5 uppercase">Price ({currencySymbol}) *</label>
                        <input
                          type="number"
                          step="0.01"
                          required
                          value={item.price}
                          onChange={e => handleItemChange(index, 'price', e.target.value)}
                          className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] py-1.5 px-2.5 rounded-md text-xs text-[var(--text-primary)] focus:outline-none font-mono"
                        />
                      </div>

                      {/* Item Actions */}
                      <div className="flex gap-2 items-center justify-end">
                        <button
                          type="button"
                          onClick={() => removeItemRow(index)}
                          className="p-1.5 bg-rose-600/10 hover:bg-rose-600 text-rose-400 hover:text-white rounded-lg transition-all cursor-pointer border-0 bg-transparent"
                          title="Remove item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Expected Date & Discount */}
                      <div className="md:col-span-3 grid grid-cols-2 gap-3 mt-1.5">
                        <div>
                          <label className="text-[7px] font-bold text-[var(--text-secondary)] block mb-0.5 uppercase">Exp Delivery Date (Optional)</label>
                          <input
                            type="date"
                            value={item.deliveryDate}
                            onChange={e => handleItemChange(index, 'deliveryDate', e.target.value)}
                            className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] py-1 px-2 rounded-md text-[10px] text-[var(--text-primary)] focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[7px] font-bold text-[var(--text-secondary)] block mb-0.5 uppercase">Item Discount (%) (Optional)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={item.discount}
                            onChange={e => handleItemChange(index, 'discount', e.target.value)}
                            className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] py-1 px-2 rounded-md text-[10px] text-[var(--text-primary)] focus:outline-none font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  {items.length === 0 && (
                    <div className="text-center py-6 text-[var(--text-muted)] italic text-[10px]">No items added. Click above to add products.</div>
                  )}
                </div>
              </div>

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
                  className="w-1/2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 rounded-lg text-xs cursor-pointer transition-colors"
                >
                  {loading ? 'Processing...' : isEditing ? 'Apply Changes' : 'Complete Sales Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
