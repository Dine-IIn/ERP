import React, { useState } from 'react';
import { Receipt, Search, Plus, Edit, Trash2, X, AlertCircle, Calendar, CheckCircle2, Mail, Download, Layers } from 'lucide-react';

interface SalesInvoiceProps {
  invoices: any[];
  customers: any[];
  products: any[];
  onCreateInvoice: (invoice: any) => Promise<void>;
  onUpdateInvoice: (id: string, invoice: any) => Promise<void>;
  onDeleteInvoice: (id: string) => Promise<void>;
  onEmailInvoice: (id: string) => Promise<void>;
  currencySymbol?: string;
}

interface InvoiceItemInput {
  productId: string;
  quantity: string;
  price: string;
  discount: string;
}

export default function SalesInvoice({
  invoices,
  customers,
  products,
  onCreateInvoice,
  onUpdateInvoice,
  onDeleteInvoice,
  onEmailInvoice,
  currencySymbol = '$'
}: SalesInvoiceProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [customerId, setCustomerId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [discount, setDiscount] = useState('0.00'); // Treated as %
  const [tax, setTax] = useState('18.00'); // Default tax (e.g. 18% GST)
  const [status, setStatus] = useState('UNPAID');

  // Partial Billing state
  const [billingMode, setBillingMode] = useState<'FULL' | 'PARTIAL'>('FULL');
  const [billingFactor, setBillingFactor] = useState('50.00'); // percentage of volume to bill

  const [items, setItems] = useState<InvoiceItemInput[]>([]);
  const [localErr, setLocalErr] = useState<string | null>(null);
  const [localSuccess, setLocalSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [emailingId, setEmailingId] = useState<string | null>(null);

  const openAddModal = () => {
    setCustomerId(customers[0]?.id || '');
    setDueDate('');
    setDiscount('0.00');
    setTax('18.00');
    setStatus('UNPAID');
    setBillingMode('FULL');
    setBillingFactor('50.00');
    setItems([{ productId: products[0]?.id || '', quantity: '1', price: String(products[0]?.pricing || 0), discount: '0.00' }]);
    setIsEditing(false);
    setEditingId(null);
    setLocalErr(null);
    setLocalSuccess(null);
    setShowModal(true);
  };

  const openEditModal = (inv: any) => {
    setCustomerId(inv.customerId);
    setDueDate(inv.dueDate ? inv.dueDate.substring(0, 10) : '');
    setDiscount(String(inv.discount || 0));
    // Estimate original tax percentage
    const taxVal = inv.tax || 0;
    const sub = inv.subtotal || 1;
    const estTaxPct = ((taxVal / sub) * 100).toFixed(1);
    setTax(estTaxPct);
    setStatus(inv.status || 'UNPAID');
    setBillingMode('FULL');
    setBillingFactor('100.00');

    const mappedItems = (inv.items || []).map((item: any) => ({
      productId: item.productId,
      quantity: String(item.quantity),
      price: String(item.price),
      discount: String(item.discount || 0)
    }));

    setItems(mappedItems.length > 0 ? mappedItems : [{ productId: products[0]?.id || '', quantity: '1', price: String(products[0]?.pricing || 0), discount: '0.00' }]);
    setIsEditing(true);
    setEditingId(inv.id);
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

  const handleItemChange = (index: number, field: keyof InvoiceItemInput, value: string) => {
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

  // Calculations
  const stdSubtotal = items.reduce((sum, item) => {
    const qty = parseFloat(item.quantity) || 0;
    const price = parseFloat(item.price) || 0;
    const itemDiscPercent = parseFloat(item.discount) || 0;
    const itemSub = qty * price;
    const itemDiscVal = itemSub * (itemDiscPercent / 100);
    return sum + (itemSub - itemDiscVal);
  }, 0);

  const billingPct = billingMode === 'PARTIAL' ? (parseFloat(billingFactor) || 50) : 100;
  const subtotal = stdSubtotal * (billingPct / 100);

  const discPct = parseFloat(discount) || 0;
  const discVal = subtotal * (discPct / 100); // overall discount absolute computed value
  
  const taxPct = parseFloat(tax) || 0;
  const taxVal = Math.max(0, subtotal - discVal) * (taxPct / 100);
  const totalVal = Math.max(0, subtotal - discVal) + taxVal;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId || items.length === 0) {
      setLocalErr("Customer and at least one billable stock item are required.");
      return;
    }

    setLocalErr(null);
    setLocalSuccess(null);
    setLoading(true);

    const payload = {
      customerId,
      dueDate: dueDate || null,
      discount: discPct, // Treat discount as percentage
      tax: taxVal,
      subtotal,
      total: totalVal,
      status,
      items: items.map(item => ({
        productId: item.productId,
        quantity: (parseFloat(item.quantity) || 1.0) * (billingPct / 100), // Scale quantity by partial billing factor
        price: parseFloat(item.price) || 0.0, // Locked to Product Master
        discount: parseFloat(item.discount) || 0.0 // Discount %
      }))
    };

    try {
      if (isEditing && editingId) {
        await onUpdateInvoice(editingId, payload);
        setLocalSuccess("Sales Invoice modified successfully!");
      } else {
        await onCreateInvoice(payload);
        setLocalSuccess("Sales Invoice generated successfully!");
      }
      setTimeout(() => {
        setShowModal(false);
      }, 1000);
    } catch (err: any) {
      setLocalErr(err.message || "Failed to process Sales Invoice.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, invoiceNo: string) => {
    if (window.confirm(`Are you sure you want to permanently delete and void Sales Invoice '${invoiceNo}'?`)) {
      try {
        await onDeleteInvoice(id);
      } catch (err: any) {
        alert(err.message || "Failed to delete Sales Invoice");
      }
    }
  };

  const handleEmail = async (id: string, invoiceNo: string) => {
    setEmailingId(id);
    try {
      await onEmailInvoice(id);
      alert(`Sales Invoice '${invoiceNo}' successfully dispatched to customer email address!`);
    } catch (err: any) {
      alert(err.message || "Failed to email Sales Invoice");
    } finally {
      setEmailingId(null);
    }
  };

  const handleDownloadPDF = (inv: any) => {
    const cust = customers.find(c => c.id === inv.customerId);
    const docHtml = `
      <html>
        <head>
          <title>Sales Invoice - ${inv.invoiceNo}</title>
          <style>
            body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #333; padding: 40px; background: #fff; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #10b981; padding-bottom: 20px; margin-bottom: 30px; }
            .title { font-size: 24px; font-weight: bold; color: #10b981; text-transform: uppercase; }
            .meta { font-size: 11px; text-align: right; color: #555; }
            .section { margin-bottom: 25px; }
            .section-title { font-size: 12px; font-weight: bold; text-transform: uppercase; color: #10b981; border-bottom: 1px solid #eee; padding-bottom: 4px; margin-bottom: 8px; }
            .client-details { font-size: 12px; line-height: 1.5; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th { background: #f8fafc; border-bottom: 2px solid #e2e8f0; color: #475569; font-weight: bold; font-size: 11px; text-transform: uppercase; padding: 10px; text-align: left; }
            td { padding: 10px; border-bottom: 1px solid #f1f5f9; font-size: 12px; color: #334155; }
            .total-table { width: 40%; margin-left: auto; margin-top: 20px; }
            .total-table td { border-bottom: none; padding: 6px 10px; }
            .grand-total { font-weight: bold; color: #10b981; font-size: 14px; border-top: 2px solid #10b981; }
            .footer { margin-top: 50px; border-top: 1px solid #eee; padding-top: 15px; font-size: 10px; text-align: center; color: #94a3b8; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="title">Tax Invoice</div>
              <div style="font-size: 12px; color: #64748b; font-weight: bold; margin-top: 5px;">${inv.invoiceNo}</div>
            </div>
            <div class="meta">
              <div>Invoice Date: ${new Date(inv.date).toLocaleDateString()}</div>
              <div>Due Date: ${inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : 'Immediate'}</div>
              <div>Collection Status: <strong>${inv.status}</strong></div>
            </div>
          </div>
          
          <div class="section">
            <div class="section-title">Billing Customer Profile</div>
            <div class="client-details">
              <strong>${cust?.name || 'Customer Profile'}</strong><br/>
              Classification: ${cust?.clientClassification || 'NATIONAL'}<br/>
              Email ID: ${cust?.email || 'N/A'}<br/>
              Mobile: ${cust?.mobileNo || 'N/A'}<br/>
              Billing Destination: ${cust?.billingAddress || 'N/A'}
            </div>
          </div>

          <div class="section">
            <div class="section-title">Invoiced Stock Items</div>
            <table>
              <thead>
                <tr>
                  <th>Stock Product</th>
                  <th style="text-align: right;">Quantity</th>
                  <th style="text-align: right;">Unit Price</th>
                  <th style="text-align: right;">Item Discount</th>
                  <th style="text-align: right;">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                ${(inv.items || []).map((it: any) => {
                  const prod = products.find(p => p.id === it.productId);
                  const sub = (it.quantity * it.price) * (1 - (it.discount || 0) / 100);
                  return `
                    <tr>
                      <td><strong>${prod?.name || 'Stock Item'}</strong></td>
                      <td style="text-align: right;">${it.quantity}</td>
                      <td style="text-align: right;">${currencySymbol}${it.price.toFixed(2)}</td>
                      <td style="text-align: right;">${(it.discount || 0).toFixed(1)}%</td>
                      <td style="text-align: right;">${currencySymbol}${sub.toFixed(2)}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>

          <table class="total-table">
            <tr>
              <td>Subtotal Value:</td>
              <td style="text-align: right;">${currencySymbol}${inv.subtotal.toFixed(2)}</td>
            </tr>
            ${inv.discount > 0 ? `
            <tr>
              <td style="color: #ef4444;">Overall Discount (${inv.discount}%):</td>
              <td style="text-align: right; color: #ef4444;">-${currencySymbol}${(inv.subtotal * (inv.discount / 100)).toFixed(2)}</td>
            </tr>` : ''}
            <tr>
              <td>Sales Tax / GST Charge:</td>
              <td style="text-align: right;">${currencySymbol}${(inv.tax || 0).toFixed(2)}</td>
            </tr>
            <tr class="grand-total">
              <td>Total Payable Amount:</td>
              <td style="text-align: right;">${currencySymbol}${inv.total.toFixed(2)}</td>
            </tr>
          </table>

          <div class="footer">
            Generated via Dine-IIn ERP Consolidated Sales Console. All financial disputes are governed under corporate guidelines. Thank you!
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

  const filtered = invoices.filter(inv =>
    inv.invoiceNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    getCustomerName(inv.customerId).toLowerCase().includes(searchTerm.toLowerCase()) ||
    inv.status.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="animate-fade-in flex flex-col gap-4 text-left select-none">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-[var(--border-color)] pb-3">
        <div>
          <h3 className="font-bold text-sm text-[var(--text-primary)] font-display flex items-center gap-1.5 uppercase tracking-wide">
            <Receipt className="w-4 h-4 text-emerald-400" /> Sales Tax Invoices
          </h3>
          <p className="text-[var(--text-secondary)] text-[10px] mt-0.5">Administer active billing collections, sales receipts, GST thresholds, and client dispatches</p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto shrink-0">
          <div className="relative flex-1 md:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Search invoices, clients..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-emerald-500/50 rounded-lg text-xs text-[var(--text-primary)] focus:outline-none"
            />
          </div>

          <button
            type="button"
            onClick={openAddModal}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs cursor-pointer flex items-center gap-1.5 border-0 bg-transparent transition-all shadow-md active:scale-95 shrink-0"
          >
            <Plus className="w-3.5 h-3.5" /> Generate Invoice
          </button>
        </div>
      </div>

      {/* Grid listing */}
      <div className="overflow-x-auto border border-[var(--border-color)] rounded-xl mt-2">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-[var(--bg-tertiary)] border-b border-[var(--border-color)] text-[var(--text-secondary)] font-bold">
              <th className="p-3 text-[10px] uppercase tracking-wider">Invoice No</th>
              <th className="p-3 text-[10px] uppercase tracking-wider">Customer / Company</th>
              <th className="p-3 text-[10px] uppercase tracking-wider">Items Summary</th>
              <th className="p-3 text-[10px] uppercase tracking-wider">Valuation & Taxes</th>
              <th className="p-3 text-[10px] uppercase tracking-wider">Due / Status</th>
              <th className="p-3 text-[10px] uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(inv => (
              <tr key={inv.id} className="border-b border-[var(--border-color)]/40 hover:bg-[var(--bg-tertiary)]/20 transition-colors last:border-b-0 text-left">
                <td className="p-3 shrink-0 font-bold font-mono text-emerald-400">{inv.invoiceNo}</td>
                <td className="p-3 shrink-0">
                  <span className="font-bold text-[var(--text-primary)] block">{getCustomerName(inv.customerId)}</span>
                  <span className="text-[9px] text-[var(--text-muted)] mt-0.5 block">Date: {new Date(inv.date).toLocaleDateString()}</span>
                </td>
                <td className="p-3 shrink-0">
                  <div className="flex flex-col gap-1 max-h-16 overflow-y-auto font-mono text-[10px] text-[var(--text-secondary)]">
                    {(inv.items || []).map((it: any) => (
                      <span key={it.id} className="block truncate max-w-xs">
                        {getProductName(it.productId)} × {it.quantity} (disc: {it.discount || 0}%)
                      </span>
                    ))}
                  </div>
                </td>
                <td className="p-3 shrink-0 font-bold font-mono text-[var(--text-primary)]">
                  <span className="flex items-center gap-0.5 text-xs text-emerald-400">
                    <span className="font-bold mr-0.5">{currencySymbol}</span> {inv.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-[9px] text-[var(--text-secondary)] block mt-0.5">Sub: {currencySymbol}{inv.subtotal}</span>
                  <span className="text-[9px] text-emerald-500/80 block">Tax: {currencySymbol}{inv.tax}</span>
                </td>
                <td className="p-3 shrink-0">
                  <span className={`px-2 py-0.5 rounded text-[8px] font-bold tracking-wider inline-block uppercase ${
                    inv.status === 'PAID' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                    inv.status === 'PARTIAL' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                    inv.status === 'CANCELLED' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                    'bg-red-500/10 text-red-400 border border-red-500/20'
                  }`}>
                    {inv.status}
                  </span>
                  <span className="text-[9px] text-[var(--text-secondary)] flex items-center gap-1 mt-1 font-mono">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" /> Due: {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : 'Upon receipt'}
                  </span>
                </td>
                <td className="p-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => handleDownloadPDF(inv)}
                      className="px-2 py-1 bg-emerald-600/10 hover:bg-emerald-600 text-emerald-400 hover:text-white rounded transition-all cursor-pointer border-0 bg-transparent flex items-center gap-1 text-[9px] uppercase font-bold"
                    >
                      <Download className="w-3 h-3" /> PDF
                    </button>
                    <button
                      type="button"
                      disabled={emailingId === inv.id}
                      onClick={() => handleEmail(inv.id, inv.invoiceNo)}
                      className="px-2 py-1 bg-indigo-600/10 hover:bg-indigo-600 text-indigo-400 hover:text-white rounded transition-all cursor-pointer border-0 bg-transparent flex items-center gap-1 text-[9px] uppercase font-bold"
                    >
                      <Mail className="w-3 h-3" /> {emailingId === inv.id ? 'Sending...' : 'Email'}
                    </button>
                    <button
                      type="button"
                      onClick={() => openEditModal(inv)}
                      className="px-1.5 py-1 bg-indigo-600/10 hover:bg-indigo-600 text-indigo-400 hover:text-white rounded transition-all cursor-pointer border-0 bg-transparent flex items-center text-[9px] uppercase font-bold"
                    >
                      <Edit className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(inv.id, inv.invoiceNo)}
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
                <td colSpan={6} className="text-center py-8 text-[var(--text-muted)] italic">No Sales Invoices recorded yet</td>
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
              <div className="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-500 border border-emerald-500/20">
                <Receipt className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base text-[var(--text-primary)] font-display">
                  {isEditing ? 'Modify Sales Tax Invoice' : 'Generate Real Sales Invoice'}
                </h3>
                <p className="text-[var(--text-secondary)] text-[10px]">Onboard legal tax invoices, configure discounts, capture tax liabilities and payment collection statuses</p>
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
                <label className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block mb-1">Target Customer *</label>
                <select
                  value={customerId}
                  required
                  onChange={e => setCustomerId(e.target.value)}
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-emerald-500/50 py-2 px-3 rounded-lg text-xs text-[var(--text-primary)] focus:outline-none cursor-pointer"
                >
                  <option value="">-- Choose Customer --</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.clientClassification || 'NATIONAL'})</option>
                  ))}
                </select>
              </div>

              {/* Due Date */}
              <div>
                <label className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block mb-1">Invoice Due Date (Optional)</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-emerald-500/50 py-2 px-3 rounded-lg text-xs text-[var(--text-primary)] focus:outline-none"
                />
              </div>

              {/* Overall Discount (%) */}
              <div>
                <label className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block mb-1">Overall Discount (%) (Optional)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={discount}
                  onChange={e => setDiscount(e.target.value)}
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-emerald-500/50 py-2 px-3 rounded-lg text-xs text-[var(--text-primary)] focus:outline-none font-mono"
                  placeholder="0.00"
                />
              </div>

              {/* Tax Percentage */}
              <div>
                <label className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block mb-1">Tax Percentage (%)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={tax}
                  onChange={e => setTax(e.target.value)}
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-emerald-500/50 py-2 px-3 rounded-lg text-xs text-[var(--text-primary)] focus:outline-none font-mono"
                />
              </div>

              {/* Billing Mode (Full vs Partial) */}
              <div>
                <label className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block mb-1">Billing Arrangement *</label>
                <select
                  value={billingMode}
                  onChange={e => setBillingMode(e.target.value as 'FULL' | 'PARTIAL')}
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-emerald-500/50 py-2 px-3 rounded-lg text-xs text-[var(--text-primary)] focus:outline-none cursor-pointer"
                >
                  <option value="FULL">FULL TAX BILLING (100% Volume)</option>
                  <option value="PARTIAL">PARTIAL TAX BILLING (Installments / Pro-Rata)</option>
                </select>
              </div>

              {/* Billed Percentage */}
              {billingMode === 'PARTIAL' && (
                <div>
                  <label className="text-[9px] font-bold text-emerald-400 tracking-wider uppercase block mb-1">Billed Factor Percentage (%) *</label>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    max="100"
                    required
                    value={billingFactor}
                    onChange={e => setBillingFactor(e.target.value)}
                    className="w-full bg-[var(--bg-primary)] border border-emerald-500/30 focus:border-emerald-500 py-2 px-3 rounded-lg text-xs text-[var(--text-primary)] focus:outline-none font-mono"
                  />
                </div>
              )}

              {/* Status */}
              <div>
                <label className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block mb-1">Collection Status</label>
                <select
                  value={status}
                  onChange={e => setStatus(e.target.value)}
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-emerald-500/50 py-2 px-3 rounded-lg text-xs text-[var(--text-primary)] focus:outline-none cursor-pointer"
                >
                  <option value="UNPAID">UNPAID (Pending)</option>
                  <option value="PARTIAL">PARTIAL (Split payment)</option>
                  <option value="PAID">PAID (Settled)</option>
                  <option value="CANCELLED">CANCELLED (Void / Bad debt)</option>
                </select>
              </div>

              {/* Total Card */}
              <div className="bg-[var(--bg-tertiary)]/30 border border-[var(--border-color)]/60 rounded-xl p-3 flex flex-col justify-center text-xs font-mono text-[var(--text-secondary)] gap-1">
                <span className="flex justify-between"><span>Std Subtotal (100%):</span> <span>{currencySymbol}{stdSubtotal.toFixed(2)}</span></span>
                {billingMode === 'PARTIAL' && (
                  <span className="flex justify-between text-amber-400"><span>Billed Subtotal ({billingPct}%):</span> <span>{currencySymbol}{subtotal.toFixed(2)}</span></span>
                )}
                <span className="flex justify-between text-rose-400"><span>Discount ({discPct}%):</span> <span>-{currencySymbol}{discVal.toFixed(2)}</span></span>
                <span className="flex justify-between text-emerald-400"><span>Tax ({taxPct}%):</span> <span>+{currencySymbol}{taxVal.toFixed(2)}</span></span>
                <span className="flex justify-between border-t border-[var(--border-color)]/60 pt-1 text-sm font-bold text-emerald-400"><span>Total Invoiced:</span> <span>{currencySymbol}{totalVal.toFixed(2)}</span></span>
              </div>

              {/* Items grid */}
              <div className="md:col-span-2 border-t border-[var(--border-color)] pt-4 mt-2">
                <div className="flex justify-between items-center mb-3">
                  <div>
                    <span className="text-[10px] font-bold text-emerald-400 tracking-wider uppercase block">Billable Items Grid (Standard Values)</span>
                    <span className="text-[8px] text-[var(--text-secondary)]">Products unit prices are locked to the Product Master catalog. Quantities will scale automatically for partial billing.</span>
                  </div>

                  <button
                    type="button"
                    onClick={addItemRow}
                    className="px-2.5 py-1.5 bg-emerald-600/10 hover:bg-emerald-600 text-emerald-400 hover:text-white rounded-lg text-[10px] font-bold border-0 bg-transparent flex items-center gap-1 transition-all cursor-pointer shadow-sm active:scale-95"
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

                      {/* Price */}
                      <div>
                        <label className="text-[7.5px] font-bold text-[var(--text-secondary)] block mb-0.5 uppercase">Unit Price ({currencySymbol}) [LOCKED]</label>
                        <input
                          type="number"
                          step="0.01"
                          required
                          readOnly
                          value={item.price}
                          onChange={e => handleItemChange(index, 'price', e.target.value)}
                          className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] py-1.5 px-2.5 rounded-md text-xs text-[var(--text-primary)] focus:outline-none font-mono opacity-70 cursor-not-allowed"
                        />
                      </div>

                      {/* Discount & Delete */}
                      <div className="flex gap-2 items-center justify-between">
                        <div>
                          <label className="text-[7px] font-bold text-[var(--text-secondary)] block mb-0.5 uppercase">Discount (%)</label>
                          <input
                            type="number"
                            step="0.1"
                            value={item.discount}
                            onChange={e => handleItemChange(index, 'discount', e.target.value)}
                            className="w-20 bg-[var(--bg-secondary)] border border-[var(--border-color)] py-1 px-1.5 rounded-md text-[10px] text-[var(--text-primary)] focus:outline-none font-mono"
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
                  className="w-1/2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 rounded-lg text-xs cursor-pointer transition-colors"
                >
                  {loading ? 'Processing...' : isEditing ? 'Apply Changes' : 'Generate Tax Invoice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
