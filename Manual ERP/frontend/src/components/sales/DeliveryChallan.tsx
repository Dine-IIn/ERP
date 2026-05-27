import React, { useState } from 'react';
import { Truck, Search, Plus, Edit, Trash2, X, AlertCircle, Calendar, CheckCircle2, Mail, Download, Package } from 'lucide-react';

interface DeliveryChallanProps {
  challans: any[];
  customers: any[];
  products: any[];
  onCreateChallan: (challan: any) => Promise<void>;
  onUpdateChallan: (id: string, challan: any) => Promise<void>;
  onDeleteChallan: (id: string) => Promise<void>;
  onEmailChallan: (id: string) => Promise<void>;
  currencySymbol?: string;
}

interface ChallanItemInput {
  productId: string;
  quantity: string;
  price: string;
}

export default function DeliveryChallan({
  challans,
  customers,
  products,
  onCreateChallan,
  onUpdateChallan,
  onDeleteChallan,
  onEmailChallan,
  currencySymbol = '$'
}: DeliveryChallanProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [customerId, setCustomerId] = useState('');
  const [status, setStatus] = useState('ISSUED');

  // Partial Transit state
  const [transitMode, setTransitMode] = useState<'FULL' | 'PARTIAL'>('FULL');
  const [transitFactor, setTransitFactor] = useState('50.00'); // % of volume to dispatch

  const [items, setItems] = useState<ChallanItemInput[]>([]);
  const [localErr, setLocalErr] = useState<string | null>(null);
  const [localSuccess, setLocalSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [emailingId, setEmailingId] = useState<string | null>(null);

  const openAddModal = () => {
    setCustomerId(customers[0]?.id || '');
    setStatus('ISSUED');
    setTransitMode('FULL');
    setTransitFactor('50.00');
    setItems([{ productId: products[0]?.id || '', quantity: '1', price: String(products[0]?.pricing || 0) }]);
    setIsEditing(false);
    setEditingId(null);
    setLocalErr(null);
    setLocalSuccess(null);
    setShowModal(true);
  };

  const openEditModal = (dc: any) => {
    setCustomerId(dc.customerId);
    setStatus(dc.status || 'ISSUED');
    setTransitMode('FULL');
    setTransitFactor('100.00');

    const mappedItems = (dc.items || []).map((item: any) => ({
      productId: item.productId,
      quantity: String(item.quantity),
      price: String(item.price || 0)
    }));

    setItems(mappedItems.length > 0 ? mappedItems : [{ productId: products[0]?.id || '', quantity: '1', price: String(products[0]?.pricing || 0) }]);
    setIsEditing(true);
    setEditingId(dc.id);
    setLocalErr(null);
    setLocalSuccess(null);
    setShowModal(true);
  };

  const addItemRow = () => {
    setItems([...items, { productId: products[0]?.id || '', quantity: '1', price: String(products[0]?.pricing || 0) }]);
  };

  const removeItemRow = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof ChallanItemInput, value: string) => {
    const updated = [...items];
    updated[index][field] = value;

    if (field === 'productId') {
      const selectedProd = products.find(p => p.id === value);
      if (selectedProd) {
        updated[index].price = String(selectedProd.pricing || 0);
      }
    }
    setItems(updated);
  };

  const transitPct = transitMode === 'PARTIAL' ? (parseFloat(transitFactor) || 50) : 100;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId || items.length === 0) {
      setLocalErr("Customer and at least one item are required.");
      return;
    }

    setLocalErr(null);
    setLocalSuccess(null);
    setLoading(true);

    const payload = {
      customerId,
      status,
      items: items.map(item => ({
        productId: item.productId,
        quantity: (parseFloat(item.quantity) || 1.0) * (transitPct / 100), // Scale quantity by transit factor
        price: parseFloat(item.price) || 0.0 // Locked to Product Master price
      }))
    };

    try {
      if (isEditing && editingId) {
        await onUpdateChallan(editingId, payload);
        setLocalSuccess("Delivery Challan updated successfully!");
      } else {
        await onCreateChallan(payload);
        setLocalSuccess("Delivery Challan issued successfully!");
      }
      setTimeout(() => {
        setShowModal(false);
      }, 1000);
    } catch (err: any) {
      setLocalErr(err.message || "Failed to process Delivery Challan.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, challanNo: string) => {
    if (window.confirm(`Are you sure you want to permanently delete Delivery Challan '${challanNo}'?`)) {
      try {
        await onDeleteChallan(id);
      } catch (err: any) {
        alert(err.message || "Failed to delete Delivery Challan");
      }
    }
  };

  const handleEmail = async (id: string, challanNo: string) => {
    setEmailingId(id);
    try {
      await onEmailChallan(id);
      alert(`Delivery Challan '${challanNo}' successfully dispatched to customer email!`);
    } catch (err: any) {
      alert(err.message || "Failed to email Delivery Challan");
    } finally {
      setEmailingId(null);
    }
  };

  const handleDownloadPDF = (dc: any) => {
    const cust = customers.find(c => c.id === dc.customerId);
    const docHtml = `
      <html>
        <head>
          <title>Delivery Challan - ${dc.challanNo}</title>
          <style>
            body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #333; padding: 40px; background: #fff; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #6366f1; padding-bottom: 20px; margin-bottom: 30px; }
            .title { font-size: 24px; font-weight: bold; color: #6366f1; text-transform: uppercase; }
            .meta { font-size: 11px; text-align: right; color: #555; }
            .section { margin-bottom: 25px; }
            .section-title { font-size: 12px; font-weight: bold; text-transform: uppercase; color: #6366f1; border-bottom: 1px solid #eee; padding-bottom: 4px; margin-bottom: 8px; }
            .client-details { font-size: 12px; line-height: 1.5; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th { background: #f8fafc; border-bottom: 2px solid #e2e8f0; color: #475569; font-weight: bold; font-size: 11px; text-transform: uppercase; padding: 10px; text-align: left; }
            td { padding: 10px; border-bottom: 1px solid #f1f5f9; font-size: 12px; color: #334155; }
            .footer { margin-top: 50px; border-top: 1px solid #eee; padding-top: 15px; font-size: 10px; text-align: center; color: #94a3b8; }
            .sign-box { display: flex; justify-content: space-between; margin-top: 80px; font-size: 11px; color: #475569; }
            .sign-line { width: 200px; border-top: 1px dashed #94a3b8; text-align: center; padding-top: 5px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="title">Delivery Challan</div>
              <div style="font-size: 12px; color: #64748b; font-weight: bold; margin-top: 5px;">${dc.challanNo}</div>
            </div>
            <div class="meta">
              <div>Challan Date: ${new Date(dc.date).toLocaleDateString()}</div>
              <div>Status: <strong>${dc.status}</strong></div>
            </div>
          </div>
          
          <div class="section">
            <div class="section-title">Shipping Recipient</div>
            <div class="client-details">
              <strong>${cust?.name || 'Customer Profile'}</strong><br/>
              Classification: ${cust?.clientClassification || 'NATIONAL'}<br/>
              Mobile No: ${cust?.mobileNo || 'N/A'}<br/>
              Shipping Destination Address:<br/>
              <strong>${cust?.shippingAddress || cust?.billingAddress || 'N/A'}</strong>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Transit Items Checklist</div>
            <table>
              <thead>
                <tr>
                  <th>Stock Product Item</th>
                  <th style="text-align: right;">Quantity Shipped</th>
                  <th style="text-align: right;">Assumed Unit Value</th>
                  <th style="text-align: right;">Declared Subtotal</th>
                </tr>
              </thead>
              <tbody>
                ${(dc.items || []).map((it: any) => {
                  const prod = products.find(p => p.id === it.productId);
                  const itemVal = (it.price || 0);
                  const sub = it.quantity * itemVal;
                  return `
                    <tr>
                      <td><strong>${prod?.name || 'Stock Item'}</strong></td>
                      <td style="text-align: right;">${it.quantity}</td>
                      <td style="text-align: right;">${currencySymbol}${itemVal.toFixed(2)}</td>
                      <td style="text-align: right;">${currencySymbol}${sub.toFixed(2)}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>

          <div class="sign-box">
            <div class="sign-line">Authorized Dispatch Signature</div>
            <div class="sign-line">Recipient / Customer Signature</div>
          </div>

          <div class="footer">
            Generated via Dine-IIn ERP Consolidated Sales Console. This Challan must accompany the stock materials during active transit.
          </div>
          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
      </html>
    `;

    const printWin = window.open('', '_blank');
    if (printWin) {
      printWin.document.write(docHtml);
      printWin.document.close();
    }
  };

  const getCustomerName = (id: string) => customers.find(c => c.id === id)?.name || 'Customer';
  const getProductName = (id: string) => products.find(p => p.id === id)?.name || 'Item';

  const filtered = challans.filter(dc =>
    dc.challanNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    getCustomerName(dc.customerId).toLowerCase().includes(searchTerm.toLowerCase()) ||
    dc.status.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="animate-fade-in flex flex-col gap-4 text-left select-none">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-[var(--border-color)] pb-3">
        <div>
          <h3 className="font-bold text-sm text-[var(--text-primary)] font-display flex items-center gap-1.5 uppercase tracking-wide">
            <Truck className="w-4 h-4 text-indigo-400" /> Delivery Challans Hub
          </h3>
          <p className="text-[var(--text-secondary)] text-[10px] mt-0.5">Administer transit declarations, shipping delivery checklists, product dispatch valuations, and recipient logs</p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto shrink-0">
          <div className="relative flex-1 md:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Search challans, customers..."
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
            <Plus className="w-3.5 h-3.5" /> Issue Challan
          </button>
        </div>
      </div>

      {/* Grid listing */}
      <div className="overflow-x-auto border border-[var(--border-color)] rounded-xl mt-2">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-[var(--bg-tertiary)] border-b border-[var(--border-color)] text-[var(--text-secondary)] font-bold">
              <th className="p-3 text-[10px] uppercase tracking-wider">Challan No</th>
              <th className="p-3 text-[10px] uppercase tracking-wider">Recipient Customer</th>
              <th className="p-3 text-[10px] uppercase tracking-wider">Transit Items</th>
              <th className="p-3 text-[10px] uppercase tracking-wider">Transit Valuation</th>
              <th className="p-3 text-[10px] uppercase tracking-wider">Status / Date</th>
              <th className="p-3 text-[10px] uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(dc => (
              <tr key={dc.id} className="border-b border-[var(--border-color)]/40 hover:bg-[var(--bg-tertiary)]/20 transition-colors last:border-b-0 text-left">
                <td className="p-3 shrink-0 font-bold font-mono text-indigo-400">{dc.challanNo}</td>
                <td className="p-3 shrink-0">
                  <span className="font-bold text-[var(--text-primary)] block">{getCustomerName(dc.customerId)}</span>
                  <span className="text-[9px] text-[var(--text-muted)] mt-0.5 block">Issued: {new Date(dc.date).toLocaleDateString()}</span>
                </td>
                <td className="p-3 shrink-0">
                  <div className="flex flex-col gap-1 max-h-16 overflow-y-auto font-mono text-[10px] text-[var(--text-secondary)]">
                    {(dc.items || []).map((it: any) => (
                      <span key={it.id} className="block truncate max-w-xs">
                        {getProductName(it.productId)} × {it.quantity}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="p-3 shrink-0 font-bold font-mono text-[var(--text-primary)]">
                  <span className="flex items-center gap-0.5 text-xs text-slate-400">
                    {currencySymbol} {(dc.items || []).reduce((sum: number, it: any) => sum + (it.quantity * (it.price || 0)), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </td>
                <td className="p-3 shrink-0">
                  <span className={`px-2 py-0.5 rounded text-[8px] font-bold tracking-wider inline-block uppercase ${
                    dc.status === 'DELIVERED' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                    dc.status === 'CANCELLED' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                    'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  }`}>
                    {dc.status}
                  </span>
                </td>
                <td className="p-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => handleDownloadPDF(dc)}
                      className="px-2 py-1 bg-indigo-600/10 hover:bg-indigo-600 text-indigo-400 hover:text-white rounded transition-all cursor-pointer border-0 bg-transparent flex items-center gap-1 text-[9px] uppercase font-bold"
                    >
                      <Download className="w-3 h-3" /> print
                    </button>
                    <button
                      type="button"
                      disabled={emailingId === dc.id}
                      onClick={() => handleEmail(dc.id, dc.challanNo)}
                      className="px-2 py-1 bg-indigo-600/10 hover:bg-indigo-600 text-indigo-400 hover:text-white rounded transition-all cursor-pointer border-0 bg-transparent flex items-center gap-1 text-[9px] uppercase font-bold"
                    >
                      <Mail className="w-3 h-3" /> {emailingId === dc.id ? 'Sending...' : 'Email'}
                    </button>
                    <button
                      type="button"
                      onClick={() => openEditModal(dc)}
                      className="px-1.5 py-1 bg-indigo-600/10 hover:bg-indigo-600 text-indigo-400 hover:text-white rounded transition-all cursor-pointer border-0 bg-transparent flex items-center text-[9px] uppercase font-bold"
                    >
                      <Edit className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(dc.id, dc.challanNo)}
                      className="px-1.5 py-1 bg-rose-600/10 hover:bg-rose-600 text-rose-400 hover:text-white rounded transition-all cursor-pointer border-0 bg-transparent flex items-center text-[9px] uppercase font-bold"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-8 text-[var(--text-muted)] italic">No Delivery Challans recorded yet</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Dialog */}
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
                <Truck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base text-[var(--text-primary)] font-display">
                  {isEditing ? 'Modify Delivery Challan' : 'Issue New Delivery Challan'}
                </h3>
                <p className="text-[var(--text-secondary)] text-[10px]">Setup material transit declarations, recipient destinations and transit valuations</p>
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
              
              {/* Customer */}
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

              {/* Status */}
              <div>
                <label className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block mb-1">Transit Status</label>
                <select
                  value={status}
                  onChange={e => setStatus(e.target.value)}
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-indigo-500/50 py-2 px-3 rounded-lg text-xs text-[var(--text-primary)] focus:outline-none cursor-pointer"
                >
                  <option value="ISSUED">ISSUED (In Transit)</option>
                  <option value="DELIVERED">DELIVERED (Acknowledged by Customer)</option>
                  <option value="CANCELLED">CANCELLED (Returned / Void)</option>
                </select>
              </div>

              {/* Transit Arrangement Mode */}
              <div>
                <label className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block mb-1">Transit Arrangement *</label>
                <select
                  value={transitMode}
                  onChange={e => setTransitMode(e.target.value as 'FULL' | 'PARTIAL')}
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-indigo-500/50 py-2 px-3 rounded-lg text-xs text-[var(--text-primary)] focus:outline-none cursor-pointer"
                >
                  <option value="FULL">FULL TRANSIT (100% Volume)</option>
                  <option value="PARTIAL">PARTIAL TRANSIT (Split Volumes / Partial Dispatch)</option>
                </select>
              </div>

              {/* Transit Percentage */}
              {transitMode === 'PARTIAL' && (
                <div>
                  <label className="text-[9px] font-bold text-indigo-400 tracking-wider uppercase block mb-1">Transit Factor Percentage (%) *</label>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    max="100"
                    required
                    value={transitFactor}
                    onChange={e => setTransitFactor(e.target.value)}
                    className="w-full bg-[var(--bg-primary)] border border-indigo-500/30 focus:border-indigo-500 py-2 px-3 rounded-lg text-xs text-[var(--text-primary)] focus:outline-none font-mono"
                  />
                </div>
              )}

              {/* Items grid */}
              <div className="md:col-span-2 border-t border-[var(--border-color)] pt-4 mt-2">
                <div className="flex justify-between items-center mb-3">
                  <div>
                    <span className="text-[10px] font-bold text-indigo-400 tracking-wider uppercase block">Material Items Checklist (Standard values)</span>
                    <span className="text-[8px] text-[var(--text-secondary)]">Assumed unit values are locked to the Product Master catalog. Shipped quantities scale automatically for partial transit dispatches.</span>
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
                    <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-[var(--bg-primary)] p-2.5 rounded-lg border border-[var(--border-color)]/40 items-end relative">
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
                        <label className="text-[7.5px] font-bold text-[var(--text-secondary)] block mb-0.5 uppercase">Std Qty *</label>
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

                      {/* Price (Valuation) */}
                      <div className="flex gap-2 items-center justify-between">
                        <div>
                          <label className="text-[7px] font-bold text-[var(--text-secondary)] block mb-0.5 uppercase">Unit Value ({currencySymbol}) [LOCKED]</label>
                          <input
                            type="number"
                            step="0.01"
                            readOnly
                            value={item.price}
                            onChange={e => handleItemChange(index, 'price', e.target.value)}
                            className="w-20 bg-[var(--bg-secondary)] border border-[var(--border-color)] py-1.5 px-2.5 rounded-md text-xs text-[var(--text-primary)] focus:outline-none font-mono opacity-70 cursor-not-allowed"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeItemRow(index)}
                          className="p-1.5 bg-rose-600/10 hover:bg-rose-600 text-rose-400 hover:text-white rounded-lg transition-all cursor-pointer border-0 bg-transparent mt-3"
                          title="Remove item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {items.length === 0 && (
                    <div className="text-center py-6 text-[var(--text-muted)] italic text-[10px]">No items added. Click above to add products.</div>
                  )}
                </div>
              </div>

              {/* Submit Buttons */}
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
                  {loading ? 'Processing...' : isEditing ? 'Apply Changes' : 'Issue Delivery Challan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
