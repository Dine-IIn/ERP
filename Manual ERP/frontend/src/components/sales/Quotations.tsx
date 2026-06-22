import React, { useState } from 'react';
import { FileText, Search, Plus, Edit, Trash2, X, AlertCircle, CheckCircle2, DollarSign, Calendar, Tag, Trash, Eye, Printer, MessageSquare, Mail, Loader2 } from 'lucide-react';
import WhatsappShareModal from './WhatsappShareModal';
import EmailShareModal from './EmailShareModal';

interface QuotationItem {
  id?: string;
  productId: string;
  quantity: number;
  price: number;
  discount: number;
  product?: { name: string; uom: string };
}

interface Quotation {
  id: string;
  quoteNo: string;
  customerId: string;
  customer: { id: string; name: string };
  date: string;
  expiryDate?: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  status: string;
  items: QuotationItem[];
  createdAt: string;
}

interface QuotationsProps {
  quotations: Quotation[];
  customers: any[];
  products: any[];
  onCreateQuotation: (quote: any) => Promise<void>;
  onUpdateQuotationStatus: (id: string, payload: { status: string }) => Promise<void>;
  onUpdateQuotation?: (id: string, payload: any) => Promise<void>;
  onDeleteQuotation: (id: string) => Promise<void>;
  currencySymbol?: string;
  exchangeRates?: Record<string, number>;
  companyCurrencyId?: string;
}

interface ItemInput {
  productId: string;
  quantity: string;
  price: string;
  discount: string;
}

export default function Quotations({
  quotations,
  customers,
  products,
  onCreateQuotation,
  onUpdateQuotationStatus,
  onUpdateQuotation,
  onDeleteQuotation,
  currencySymbol: currencySymbolProp = '$',
  exchangeRates = {},
  companyCurrencyId = 'USD'
}: QuotationsProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  React.useEffect(() => {
    const handleClose = (e: Event) => {
      if (showPreviewModal) {
        e.preventDefault();
        setShowPreviewModal(false);
      } else if (showAddModal) {
        e.preventDefault();
        setShowAddModal(false);
      }
    };
    window.addEventListener('close-active-modal', handleClose);
    return () => window.removeEventListener('close-active-modal', handleClose);
  }, [showAddModal, showPreviewModal]);
  const [previewQuote, setPreviewQuote] = useState<Quotation | null>(null);
  const [whatsappShareData, setWhatsappShareData] = useState<any>(null);
  const [emailShareData, setEmailShareData] = useState<any>(null);
  const [pdfGeneratingQuote, setPdfGeneratingQuote] = useState<any>(null);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [sharingLoadingId, setSharingLoadingId] = useState<string | null>(null);
  const [customerId, setCustomerId] = useState('');

  const getCurrencyCodeFromSymbol = (symbol: string): string => {
    if (symbol === "₹") return "INR";
    if (symbol === "€") return "EUR";
    if (symbol === "£") return "GBP";
    return "USD";
  };

  const convertAmount = (amount: number, from: string, to: string) => {
    const cleanFrom = (from || 'USD').toUpperCase().trim();
    const cleanTo = (to || 'USD').toUpperCase().trim();
    if (cleanFrom === cleanTo) return amount;
    const rateFrom = exchangeRates?.[cleanFrom] || (cleanFrom === 'INR' ? 83.5 : cleanFrom === 'EUR' ? 0.92 : cleanFrom === 'GBP' ? 0.80 : 1.0);
    const rateTo = exchangeRates?.[cleanTo] || (cleanTo === 'INR' ? 83.5 : cleanTo === 'EUR' ? 0.92 : cleanTo === 'GBP' ? 0.80 : 1.0);
    return (amount / rateFrom) * rateTo;
  };

  const cust = customers.find(c => c.id === customerId);
  const currencySymbol = cust?.currencySymbol || currencySymbolProp;
  const [date, setDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [discountPercent, setDiscountPercent] = useState('0.00'); // global discount in %
  const [taxPercent, setTaxPercent] = useState('18.00'); // global tax rate, e.g. 18%
  const [status, setStatus] = useState('DRAFT');

  const [items, setItems] = useState<ItemInput[]>([]);
  const [localErr, setLocalErr] = useState<string | null>(null);
  const [localSuccess, setLocalSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const openAddModal = () => {
    setIsEditing(false);
    setEditingId(null);
    const defaultCustId = customers[0]?.id || '';
    setCustomerId(defaultCustId);
    setDate(new Date().toISOString().substring(0, 10));
    setExpiryDate('');
    setDiscountPercent('0.00');
    setTaxPercent('18.00');
    setStatus('DRAFT');

    const defaultCust = customers.find(c => c.id === defaultCustId);
    const targetCurrency = getCurrencyCodeFromSymbol(defaultCust?.currencySymbol || '$');
    const basePrice = products[0]?.pricing || 0;
    const converted = convertAmount(basePrice, companyCurrencyId, targetCurrency);

    setItems([{ productId: products[0]?.id || '', quantity: '1', price: String(Number(converted.toFixed(2))), discount: '0.00' }]);
    setLocalErr(null);
    setLocalSuccess(null);
    setShowAddModal(true);
  };

  const openEditModal = (q: Quotation) => {
    setIsEditing(true);
    setEditingId(q.id);
    setCustomerId(q.customerId);
    setDate(q.date ? q.date.substring(0, 10) : '');
    setExpiryDate(q.expiryDate ? q.expiryDate.substring(0, 10) : '');
    setDiscountPercent(String(q.discount));
    setTaxPercent(String(q.tax));
    setStatus(q.status);
    setItems(q.items.map(it => ({
      productId: it.productId,
      quantity: String(it.quantity),
      price: String(it.price),
      discount: String(it.discount)
    })));
    setLocalErr(null);
    setLocalSuccess(null);
    setShowAddModal(true);
  };

  const addItemRow = () => {
    const basePrice = products[0]?.pricing || 0;
    const targetCurrency = getCurrencyCodeFromSymbol(currencySymbol);
    const converted = convertAmount(basePrice, companyCurrencyId, targetCurrency);
    setItems([...items, { productId: products[0]?.id || '', quantity: '1', price: String(Number(converted.toFixed(2))), discount: '0.00' }]);
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
        const basePrice = prod.pricing || 0;
        const targetCurrency = getCurrencyCodeFromSymbol(currencySymbol);
        const converted = convertAmount(basePrice, companyCurrencyId, targetCurrency);
        updated[index].price = String(Number(converted.toFixed(2)));
      }
    }
    setItems(updated);
  };

  // Compute values
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
    if (!customerId || items.length === 0) {
      setLocalErr("Customer reference and at least one item row are required.");
      return;
    }

    setLocalErr(null);
    setLocalSuccess(null);
    setLoading(true);

    const payload = {
      customerId,
      date: date || null,
      expiryDate: expiryDate || null,
      subtotal: subtotalVal,
      discount: parseFloat(discountPercent) || 0.0, // percentage
      tax: parseFloat(taxPercent) || 0.0, // tax rate percentage
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
      if (isEditing && editingId) {
        if (onUpdateQuotation) {
          await onUpdateQuotation(editingId, payload);
          setLocalSuccess("Quotation specifications updated successfully!");
        } else {
          throw new Error("Update quotation handler is not implemented.");
        }
      } else {
        await onCreateQuotation(payload);
        setLocalSuccess("Legal Price Quotation compiled and saved!");
      }
      setTimeout(() => {
        setShowAddModal(false);
      }, 1000);
    } catch (err: any) {
      setLocalErr(err.message || "Failed to save quotation sheet.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id: string, s: string) => {
    try {
      await onUpdateQuotationStatus(id, { status: s });
      if (previewQuote && previewQuote.id === id) {
        setPreviewQuote({ ...previewQuote, status: s });
      }
    } catch (err: any) {
      alert(err.message || "Failed to update quotation stage.");
    }
  };

  const handleDelete = async (id: string, quoteNo: string) => {
    if (window.confirm(`Are you sure you want to permanently discard price quote '${quoteNo}'?`)) {
      try {
        await onDeleteQuotation(id);
      } catch (err: any) {
        alert(err.message || "Failed to remove quotation.");
      }
    }
  };

  const filteredQuotes = (quotations || []).filter(q => {
    const quoteNo = q?.quoteNo || '';
    const customerName = q?.customer?.name || '';
    const term = (searchTerm || '').toLowerCase();
    return quoteNo.toLowerCase().includes(term) ||
      customerName.toLowerCase().includes(term);
  });

  const getStatusColor = (s: string) => {
    switch (s) {
      case 'DRAFT': return 'bg-slate-800 text-slate-400 border-slate-700';
      case 'SENT': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'ACCEPTED': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'REJECTED': return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'EXPIRED': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      default: return 'bg-slate-800 text-slate-300';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-900/40 p-6 rounded-2xl border border-slate-800/80 backdrop-blur-xl">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <FileText className="w-6 h-6 text-blue-400" />
            Quotations Master Hub
          </h1>
          <p className="text-slate-400 text-sm mt-1">Draft client proposals, calculate item margins, apply commercial terms, and download invoice-ready sheets.</p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-550 hover:bg-blue-600 active:scale-95 transition-all text-white font-semibold rounded-xl shadow-lg shadow-blue-500/20"
        >
          <Plus className="w-5 h-5" />
          Create Price Quote
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
              placeholder="Search quotation sheets by no or customer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-950/40 border border-slate-850/60 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl text-white text-sm outline-none transition-all"
            />
          </div>
        </div>

        {/* Table/List */}
        <div className="overflow-x-auto">
          {filteredQuotes.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400 font-medium">No quotations recorded</p>
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-medium uppercase tracking-wider text-xs bg-slate-950/40">
                  <th className="py-4 px-6">Quotation No</th>
                  <th className="py-4 px-6">Customer</th>
                  <th className="py-4 px-6">Date</th>
                  <th className="py-4 px-6">Expires</th>
                  <th className="py-4 px-6">Total Value</th>
                  <th className="py-4 px-6">Stage Status</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredQuotes.map((q) => {
                  const quoteCustomer = customers.find(c => c.id === q.customerId);
                  const quoteCurrencySymbol = quoteCustomer?.currencySymbol || currencySymbolProp;
                  return (
                    <tr key={q.id} className="hover:bg-slate-800/20 transition-colors">
                      <td className="py-4 px-6 font-bold text-white font-mono">{q.quoteNo}</td>
                      <td className="py-4 px-6 font-semibold text-slate-200">{q.customer.name}</td>
                      <td className="py-4 px-6 font-mono text-slate-350">{new Date(q.date).toLocaleDateString()}</td>
                      <td className="py-4 px-6 font-mono text-slate-400">
                        {q.expiryDate ? new Date(q.expiryDate).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="py-4 px-6 font-mono text-emerald-400 text-base font-bold">
                        {quoteCurrencySymbol}{q.total.toLocaleString()}
                      </td>
                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center px-2.5 py-0.5 text-xs font-semibold rounded-full border ${getStatusColor(q.status)}`}>
                          {q.status}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right space-x-2">
                        <button
                          onClick={() => {
                            setPreviewQuote(q);
                            setShowPreviewModal(true);
                          }}
                          className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-blue-450 transition-colors rounded-lg"
                          title="View preview & print"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          disabled={sharingLoadingId === q.id}
                          onClick={async () => {
                            setSharingLoadingId(q.id);
                            let base64 = '';
                            try {
                              setPdfGeneratingQuote({
                                quote: q,
                                quoteCustomer,
                                quoteCurrencySymbol
                              });

                              await new Promise(resolve => setTimeout(resolve, 350));
                              const element = document.getElementById('pdf-email-render-pane');
                              if (element) {
                                const { generatePdfFromHtmlElement } = await import('../../utils/pdfDocumentUtils');
                                base64 = await generatePdfFromHtmlElement(element);
                              }
                            } catch (e) {
                              console.error("Failed to generate PDF for Email:", e);
                            } finally {
                              setPdfGeneratingQuote(null);
                              setSharingLoadingId(null);
                            }

                            setEmailShareData({
                              recipientEmail: quoteCustomer?.email || '',
                              subject: `Quotation Proposal ${q.quoteNo} from ERP Console`,
                              body: `Dear ${quoteCustomer?.name || 'Client'},\n\nPlease find attached Price Quotation ${q.quoteNo}.\n\nTotal Valuation: ${quoteCurrencySymbol}${q.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}\n\nRegards,\nSales Division`,
                              pdfBase64: base64,
                              pdfFilename: `Quotation_${q.quoteNo}.pdf`
                            });
                          }}
                          className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-indigo-400 transition-colors rounded-lg inline-flex items-center justify-center disabled:opacity-50"
                          title="Email PDF to Customer"
                        >
                          {sharingLoadingId === q.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Mail className="w-4 h-4" />
                          )}
                        </button>

                        {(() => {
                          const features = JSON.parse(localStorage.getItem('erp_company_features') || '[]');
                          const showWhatsappBtn = features.includes('ADMIN_WHATSAPP');
                          if (!showWhatsappBtn) return null;
                          return (
                            <button
                              disabled={sharingLoadingId === q.id}
                              onClick={async () => {
                                setSharingLoadingId(q.id);
                                let base64 = '';
                                try {
                                  setPdfGeneratingQuote({
                                    quote: q,
                                    quoteCustomer,
                                    quoteCurrencySymbol
                                  });

                                  await new Promise(resolve => setTimeout(resolve, 350));
                                  const element = document.getElementById('pdf-email-render-pane');
                                  if (element) {
                                    const { generatePdfFromHtmlElement } = await import('../../utils/pdfDocumentUtils');
                                    base64 = await generatePdfFromHtmlElement(element);
                                  }
                                } catch (e) {
                                  console.error("Failed to generate PDF for WhatsApp:", e);
                                } finally {
                                  setPdfGeneratingQuote(null);
                                  setSharingLoadingId(null);
                                }

                                setWhatsappShareData({
                                  documentId: q.id,
                                  documentType: 'QUOTATION',
                                  documentNumber: q.quoteNo,
                                  customerName: quoteCustomer?.name || '',
                                  customerCode: quoteCustomer?.id || '',
                                  contactNo: quoteCustomer?.contactNo || '',
                                  amount: q.total,
                                  date: q.date,
                                  currencySymbol: quoteCurrencySymbol,
                                  pdfBase64: base64,
                                  pdfFilename: `Quotation_${q.quoteNo}.pdf`
                                });
                              }}
                              className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-emerald-455 transition-all rounded-lg inline-flex items-center justify-center disabled:opacity-50"
                              title="Share via WhatsApp"
                            >
                              {sharingLoadingId === q.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <MessageSquare className="w-4 h-4" />
                              )}
                            </button>
                          );
                        })()}
                        <button
                          onClick={() => openEditModal(q)}
                          className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-blue-450 transition-colors rounded-lg inline-flex items-center justify-center"
                          title="Modify Quotation Details"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(q.id, q.quoteNo)}
                          className="p-1.5 hover:bg-slate-855 text-slate-550 hover:text-red-450 transition-colors rounded-lg"
                          title="Permanently remove"
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
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden transform transition-all max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-950/20">
              <h3 className="text-lg font-bold text-white">{isEditing ? 'Modify Price Quotation Sheet' : 'Create Price Quotation Sheet'}</h3>
              <button
                onClick={() => setShowAddModal(false)}
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

              {/* Master selections */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-450 text-xs font-semibold uppercase tracking-wider">Customer Client</label>
                  <select
                    value={customerId}
                    onChange={(e) => {
                      const newCustId = e.target.value;
                      const prevCust = customers.find(c => c.id === customerId);
                      const oldCurrency = getCurrencyCodeFromSymbol(prevCust?.currencySymbol || '$');
                      setCustomerId(newCustId);
                      const newCust = customers.find(c => c.id === newCustId);
                      const targetCurrency = getCurrencyCodeFromSymbol(newCust?.currencySymbol || '$');
                      setItems(prev => prev.map(item => {
                        const currentPrice = parseFloat(item.price) || 0;
                        const converted = convertAmount(currentPrice, oldCurrency, targetCurrency);
                        return {
                          ...item,
                          price: String(Number(converted.toFixed(2)))
                        };
                      }));
                    }}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-blue-500 transition-all text-sm"
                    required
                  >
                    <option value="" disabled>Select target customer</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-450 text-xs font-semibold uppercase tracking-wider">Quotation Date</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-blue-500 transition-all text-sm font-mono"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-450 text-xs font-semibold uppercase tracking-wider">Valid Till Date</label>
                  <input
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-blue-500 transition-all text-sm font-mono"
                  />
                </div>
              </div>

              {/* Line Items Table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <h4 className="text-sm font-bold text-slate-200">Quotations Itemized Breakdown</h4>
                  <button
                    type="button"
                    onClick={addItemRow}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-850 hover:bg-slate-800 text-xs text-blue-400 font-semibold rounded-lg border border-slate-700 transition-all active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Insert Item Line
                  </button>
                </div>

                <div className="space-y-3">
                  {items.map((item, index) => (
                    <div key={index} className="grid grid-cols-12 gap-3 items-center bg-slate-950/20 p-3 rounded-xl border border-slate-800/40">
                      <div className="col-span-4 space-y-1">
                        <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Product Description</label>
                        <select
                          value={item.productId}
                          onChange={(e) => handleItemChange(index, 'productId', e.target.value)}
                          className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs outline-none focus:border-blue-500"
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
                          className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs font-mono outline-none focus:border-blue-500"
                          required
                        />
                      </div>

                      <div className="col-span-2 space-y-1">
                        <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Quantity Volume</label>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                          className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs font-mono outline-none focus:border-blue-500"
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
                          className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs font-mono outline-none focus:border-blue-500"
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

              {/* Summary and commercial terms */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-800">
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-slate-450 text-xs font-semibold uppercase tracking-wider">Document Status</label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="w-full max-w-xs px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-blue-500 transition-all text-sm"
                    >
                      <option value="DRAFT">DRAFT PROPOSAL</option>
                      <option value="SENT">DISPATCHED TO CLIENT</option>
                      <option value="ACCEPTED">OFFICIALLY ACCEPTED</option>
                      <option value="REJECTED">DECLINED / REJECTED</option>
                      <option value="EXPIRED">EXPIRED</option>
                    </select>
                  </div>
                </div>

                <div className="bg-slate-950/40 p-4.5 rounded-2xl border border-slate-800/80 font-mono text-xs space-y-2">
                  <div className="flex justify-between text-slate-400">
                    <span>Items Gross Value:</span>
                    <span>{currencySymbol}{subtotalVal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-slate-400 items-center gap-2">
                    <span className="flex items-center gap-1">Global commercial discount (%):</span>
                    <input
                      type="number"
                      value={discountPercent}
                      onChange={(e) => setDiscountPercent(e.target.value)}
                      className="w-16 bg-slate-950 border border-slate-850 px-1.5 py-0.5 rounded text-right text-emerald-450"
                    />
                  </div>
                  {globalDiscountVal > 0 && (
                    <div className="flex justify-between text-red-400/80">
                      <span>Commercial discount amount:</span>
                      <span>-{currencySymbol}{globalDiscountVal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-400 items-center gap-2 border-t border-slate-850/60 pt-2">
                    <span className="flex items-center gap-1">Tax Bracket (%):</span>
                    <input
                      type="number"
                      value={taxPercent}
                      onChange={(e) => setTaxPercent(e.target.value)}
                      className="w-16 bg-slate-950 border border-slate-850 px-1.5 py-0.5 rounded text-right text-slate-300"
                    />
                  </div>
                  <div className="flex justify-between text-slate-400 border-b border-slate-850/60 pb-2">
                    <span>Tax Bracket Amount:</span>
                    <span>{currencySymbol}{taxVal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-white text-sm font-bold pt-1.5">
                    <span>Forecast Total Value:</span>
                    <span className="text-emerald-400">{currencySymbol}{totalVal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-end gap-3 bg-slate-950/20 -mx-6 -mb-6 p-6">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4.5 py-2 text-slate-400 hover:text-white transition-all text-sm font-semibold hover:bg-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 bg-blue-550 hover:bg-blue-600 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg transition-all"
                >
                  {loading ? 'Processing...' : isEditing ? 'Save price changes' : 'Generate price sheet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Preview and Print Modal */}
      {showPreviewModal && previewQuote && (() => {
        const quoteCustomer = customers.find(c => c.id === previewQuote.customerId);
        const currencySymbol = quoteCustomer?.currencySymbol || currencySymbolProp;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
          <div className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden transform transition-all max-h-[95vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-950/20">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Printer className="w-5 h-5 text-blue-400" />
                Quotation Proposal Document
              </h3>
              <button
                onClick={() => setShowPreviewModal(false)}
                className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Document printable area */}
            <div className="p-8 overflow-y-auto flex-1 bg-white text-slate-900 font-sans border border-slate-350 mx-6 my-4 rounded-xl print:m-0 print:border-none shadow" id="printable-quotation-sheet">
              <div className="flex justify-between items-start border-b-2 border-slate-300 pb-6">
                <div>
                  <h2 className="text-2xl font-black uppercase text-slate-850 tracking-tight">Price Proposal</h2>
                  <div className="font-mono text-xs text-slate-500 mt-1">NO: <span className="font-bold text-slate-800">{previewQuote.quoteNo}</span></div>
                  <div className="font-mono text-xs text-slate-500">DATE: {new Date(previewQuote.date).toLocaleDateString()}</div>
                  {previewQuote.expiryDate && (
                    <div className="font-mono text-xs text-red-500 font-semibold mt-0.5">VALID UNTIL: {new Date(previewQuote.expiryDate).toLocaleDateString()}</div>
                  )}
                </div>
                <div className="text-right">
                  <h3 className="text-sm font-black uppercase text-indigo-700 tracking-wider">ERP Platform</h3>
                  <p className="text-xs text-slate-500 mt-1">Tenant Corporate Business Office</p>
                  <p className="text-xs text-slate-500">Sales Commercial Dept</p>
                </div>
              </div>

              {/* Customer reference */}
              <div className="my-6">
                <h4 className="text-[10px] text-slate-400 uppercase tracking-widest font-black">Recipient Client</h4>
                <p className="text-sm font-bold text-slate-800 mt-1">{previewQuote.customer.name}</p>
                <p className="text-xs text-slate-500">Corporate Customer Partner</p>
              </div>

              {/* Items grid */}
              <table className="w-full text-left text-xs border-collapse mt-8">
                <thead>
                  <tr className="border-b-2 border-slate-300 text-slate-550 font-bold uppercase tracking-wider bg-slate-50">
                    <th className="py-2.5 px-3">Item Description</th>
                    <th className="py-2.5 px-3 text-right">Base cost</th>
                    <th className="py-2.5 px-3 text-right">Volume Qty</th>
                    <th className="py-2.5 px-3 text-right">Margin Disc</th>
                    <th className="py-2.5 px-3 text-right">Total Net</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {previewQuote.items.map((it, idx) => {
                    const gross = it.quantity * it.price;
                    const disc = gross * (it.discount / 100);
                    return (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-3 px-3 font-semibold text-slate-800">
                          {it.product?.name || 'Commercial Line Item'}
                          {it.product?.uom && <span className="text-[10px] text-slate-500 font-mono ml-1">({it.product.uom})</span>}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-slate-700">{currencySymbol}{it.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        <td className="py-3 px-3 text-right font-mono text-slate-700">{it.quantity}</td>
                        <td className="py-3 px-3 text-right font-mono text-red-500">-{it.discount}%</td>
                        <td className="py-3 px-3 text-right font-mono text-slate-800 font-bold">
                          {currencySymbol}{(gross - disc).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Summaries */}
              <div className="flex justify-end mt-8 border-t-2 border-slate-200 pt-6">
                <div className="w-64 space-y-2 text-xs font-mono">
                  <div className="flex justify-between text-slate-500">
                    <span>Subtotal Gross:</span>
                    <span>{currencySymbol}{previewQuote.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  {previewQuote.discount > 0 && (
                    <div className="flex justify-between text-red-500">
                      <span>Global discount (-{previewQuote.discount}%):</span>
                      <span>-{currencySymbol}{(previewQuote.subtotal * (previewQuote.discount / 100)).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-500 border-b border-slate-200 pb-2">
                    <span>Tax Bracket ({previewQuote.tax}%):</span>
                    <span>{currencySymbol}{((previewQuote.subtotal * (1 - previewQuote.discount / 100)) * (previewQuote.tax / 100)).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-slate-850 font-black text-sm pt-2">
                    <span>Document Total:</span>
                    <span>{currencySymbol}{previewQuote.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions Footer */}
            <div className="pt-4 border-t border-slate-800 flex justify-between items-center bg-slate-950/20 p-6">
              <div className="flex gap-2">
                {previewQuote.status === 'DRAFT' && (
                  <button
                    onClick={() => handleUpdateStatus(previewQuote.id, 'SENT')}
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white transition-all text-xs font-bold rounded-xl"
                  >
                    Mark as Sent
                  </button>
                )}
                {previewQuote.status === 'SENT' && (
                  <>
                    <button
                      onClick={() => handleUpdateStatus(previewQuote.id, 'ACCEPTED')}
                      className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white transition-all text-xs font-bold rounded-xl"
                    >
                      Accept Proposal
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(previewQuote.id, 'REJECTED')}
                      className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white transition-all text-xs font-bold rounded-xl"
                    >
                      Decline Proposal
                    </button>
                  </>
                )}
              </div>
              
              <div className="flex gap-3">
                <button
                  type="button"
                  disabled={pdfBusy}
                  onClick={() => {
                    const printable = document.getElementById('printable-quotation-sheet');
                    if (!printable) return;
                    const originalContent = document.body.innerHTML;
                    const printContent = printable.outerHTML;
                    document.body.innerHTML = printContent;
                    window.print();
                    document.body.innerHTML = originalContent;
                    window.location.reload(); // Quick restore state
                  }}
                  className="flex items-center gap-1.5 px-4.5 py-2.5 bg-slate-850 hover:bg-slate-800 text-white transition-all text-sm font-semibold rounded-xl border border-slate-700 active:scale-95"
                >
                  <Printer className="w-4 h-4" />
                  Print Proposal
                </button>
                <button
                  type="button"
                  disabled={pdfBusy}
                  onClick={() => setShowPreviewModal(false)}
                  className="px-4.5 py-2 text-slate-400 hover:text-white transition-all text-sm font-semibold hover:bg-slate-800 rounded-xl"
                >
                  Close Preview
                </button>
              </div>
            </div>
          </div>
        </div>
        );
      })()}
      {whatsappShareData && (
        <WhatsappShareModal
          isOpen={!!whatsappShareData}
          onClose={() => setWhatsappShareData(null)}
          {...whatsappShareData}
        />
      )}

      {emailShareData && (
        <EmailShareModal
          isOpen={!!emailShareData}
          onClose={() => setEmailShareData(null)}
          {...emailShareData}
        />
      )}

      {pdfGeneratingQuote && (() => {
        const { quote, quoteCustomer, quoteCurrencySymbol } = pdfGeneratingQuote;
        const gross = quote.subtotal;
        const disc = gross * (quote.discount / 100);
        return (
          <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
            <div
              id="pdf-email-render-pane"
              className="bg-white text-slate-900 p-10"
              style={{
                width: '210mm',
                minHeight: '297mm',
                boxSizing: 'border-box',
                fontFamily: 'sans-serif',
                fontSize: `11px`
              }}
            >
              <div className="flex justify-between items-start border-b-2 border-slate-300 pb-6">
                <div>
                  <h2 className="text-2xl font-black uppercase text-slate-850 tracking-tight">Price Proposal</h2>
                  <div className="font-mono text-xs text-slate-500 mt-1">NO: <span className="font-bold text-slate-800">{quote.quoteNo}</span></div>
                  <div className="font-mono text-xs text-slate-500">DATE: {new Date(quote.date).toLocaleDateString()}</div>
                  {quote.expiryDate && (
                    <div className="font-mono text-xs text-red-500 font-semibold mt-0.5">VALID UNTIL: {new Date(quote.expiryDate).toLocaleDateString()}</div>
                  )}
                </div>
                <div className="text-right">
                  <h3 className="text-sm font-black uppercase text-indigo-700 tracking-wider">ERP Platform</h3>
                  <p className="text-xs text-slate-500 mt-1">Tenant Corporate Business Office</p>
                  <p className="text-xs text-slate-500">Sales Commercial Dept</p>
                </div>
              </div>

              {/* Customer reference */}
              <div className="my-6">
                <h4 className="text-[10px] text-slate-400 uppercase tracking-widest font-black">Recipient Client</h4>
                <p className="text-sm font-bold text-slate-800 mt-1">{quote.customer.name}</p>
                <p className="text-xs text-slate-500">Corporate Customer Partner</p>
              </div>

              {/* Items grid */}
              <table className="w-full text-left text-xs border-collapse mt-8">
                <thead>
                  <tr className="border-b-2 border-slate-300 text-slate-550 font-bold uppercase tracking-wider bg-slate-50">
                    <th className="py-2.5 px-3">Item Description</th>
                    <th className="py-2.5 px-3 text-right">Base cost</th>
                    <th className="py-2.5 px-3 text-right">Volume Qty</th>
                    <th className="py-2.5 px-3 text-right">Margin Disc</th>
                    <th className="py-2.5 px-3 text-right">Total Net</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {quote.items.map((it: any, idx: number) => {
                    const itemGross = it.quantity * it.price;
                    const itemDisc = itemGross * (it.discount / 100);
                    return (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-3 px-3 font-semibold text-slate-800">
                          {it.product?.name || 'Commercial Line Item'}
                          {it.product?.uom && <span className="text-[10px] text-slate-550 font-mono ml-1">({it.product.uom})</span>}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-slate-700">{quoteCurrencySymbol}{it.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        <td className="py-3 px-3 text-right font-mono text-slate-700">{it.quantity}</td>
                        <td className="py-3 px-3 text-right font-mono text-red-500">-{it.discount}%</td>
                        <td className="py-3 px-3 text-right font-mono text-slate-800 font-bold">
                          {quoteCurrencySymbol}{(itemGross - itemDisc).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Summaries */}
              <div className="flex justify-end mt-8 border-t-2 border-slate-200 pt-6">
                <div className="w-64 space-y-2 text-xs font-mono">
                  <div className="flex justify-between text-slate-550">
                    <span>Subtotal Gross:</span>
                    <span>{quoteCurrencySymbol}{quote.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  {quote.discount > 0 && (
                    <div className="flex justify-between text-red-500">
                      <span>Global discount (-{quote.discount}%):</span>
                      <span>-{quoteCurrencySymbol}{(quote.subtotal * (quote.discount / 100)).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-550 border-b border-slate-200 pb-2">
                    <span>Tax Bracket ({quote.tax}%):</span>
                    <span>{quoteCurrencySymbol}{((quote.subtotal * (1 - quote.discount / 100)) * (quote.tax / 100)).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-slate-850 font-black text-sm pt-2">
                    <span>Document Total:</span>
                    <span>{quoteCurrencySymbol}{quote.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
