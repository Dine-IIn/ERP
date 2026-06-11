import React, { useState } from 'react';
import { Receipt, Search, Plus, Edit, Trash2, X, AlertCircle, Calendar, CheckCircle2, Mail, Download, Layers } from 'lucide-react';

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand",
  "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
  "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
  "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
  "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry"
];

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

  // --- NEW STATES FOR ADVANCED INVOICING, MERGING, SHIPPING & PRINTING ---
  const [companyProfile, setCompanyProfile] = useState<any>(null);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [salesOrders, setSalesOrders] = useState<any[]>([]);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  
  const [billingAddress, setBillingAddress] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [shippingState, setShippingState] = useState('Gujarat');
  const [shippingName, setShippingName] = useState('');
  const [diffShipping, setDiffShipping] = useState(false);

  // Customizer dialog & print stream states
  const [customizingInvoice, setCustomizingInvoice] = useState<any>(null);
  const [activePrintInvoice, setActivePrintInvoice] = useState<any>(null);
  const [customTitle, setCustomTitle] = useState('Tax Invoice');
  const [customNotes, setCustomNotes] = useState('All financial disputes are governed under corporate guidelines. Thank you!');
  const [pdfCustomizer, setPdfCustomizer] = useState({
    showLogo: true,
    showCompanyDetails: true,
    showBillingAddress: true,
    showShippingAddress: true,
    showBankDetails: true,
    showTerms: true,
    colProductCode: true,
    colUnitPrice: true,
    colDiscount: true,
    colTax: true,
  });

  const [themeColor, setThemeColor] = useState('indigo');
  const getThemeHex = (colorName: string) => {
    switch (colorName) {
      case 'emerald': return '#10b981';
      case 'rose': return '#f43f5e';
      case 'amber': return '#f59e0b';
      case 'slate': return '#64748b';
      default: return '#6366f1'; // indigo
    }
  };
  const currentThemeHex = getThemeHex(themeColor);

  React.useEffect(() => {
    if (activePrintInvoice) {
      const timer = setTimeout(() => {
        window.print();
        setActivePrintInvoice(null);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [activePrintInvoice]);

  // Load backend profiles, bank accounts, and sales orders
  React.useEffect(() => {
    const fetchProfileData = async () => {
      try {
        const profileData = await apiClient.get<any>('/api/admin/company/profile');
        setCompanyProfile(profileData.company || null);
      } catch (err) {
        console.error('Failed to load company profile:', err);
      }
    };
    const fetchBankData = async () => {
      try {
        const bankData = await apiClient.get<{ bankAccounts: any[] }>('/api/finance/bank-accounts');
        setBankAccounts(bankData.bankAccounts || []);
      } catch (err) {
        console.error('Failed to load bank accounts:', err);
      }
    };
    const fetchOrdersData = async () => {
      try {
        const ordersData = await apiClient.get<{ orders: any[] }>('/api/sales/orders');
        setSalesOrders(ordersData.orders || []);
      } catch (err) {
        console.error('Failed to load Sales Orders:', err);
      }
    };

    fetchProfileData();
    fetchBankData();
    fetchOrdersData();
  }, [showModal, customizingInvoice]);

  // Sync customer state and default shipping addresses
  React.useEffect(() => {
    if (!customerId) return;
    const cust = customers.find(c => c.id === customerId);
    if (!cust) return;

    setBillingAddress(cust.billingAddress || '');
    if (!diffShipping) {
      setShippingAddress(cust.shippingAddress || cust.billingAddress || '');
      setShippingState(cust.state || 'Gujarat');
      setShippingName(cust.name || '');
    }

    // Auto Tax Bracket Calculation
    if (cust.clientClassification === 'INTERNATIONAL') {
      setTax('0.00');
    } else if (companyProfile) {
      if (cust.state === companyProfile.state) {
        setTax('18.00'); // CGST + SGST (standard 18%)
      } else {
        setTax('18.00'); // IGST (standard 18%)
      }
    }
  }, [customerId, companyProfile, diffShipping]);

  // Toggle order in list & merge its items
  const handleToggleSalesOrder = (soId: string) => {
    let updatedIds = [...selectedOrderIds];
    if (updatedIds.includes(soId)) {
      updatedIds = updatedIds.filter(id => id !== soId);
    } else {
      updatedIds.push(soId);
    }
    setSelectedOrderIds(updatedIds);

    const selectedOrders = salesOrders.filter(so => updatedIds.includes(so.id));
    const mergedItems: Record<string, { productId: string; quantity: number; price: number; discount: number }> = {};

    for (const order of selectedOrders) {
      for (const item of order.items) {
        const remaining = item.remainingQuantity !== undefined ? item.remainingQuantity : item.quantity;
        if (remaining <= 0) continue;

        if (mergedItems[item.productId]) {
          mergedItems[item.productId].quantity += remaining;
        } else {
          mergedItems[item.productId] = {
            productId: item.productId,
            quantity: remaining,
            price: item.price,
            discount: item.discount || 0
          };
        }
      }
    }

    const newItemsList = Object.values(mergedItems).map(item => ({
      productId: item.productId,
      quantity: String(item.quantity),
      price: String(item.price),
      discount: String(item.discount)
    }));

    setItems(newItemsList.length > 0 ? newItemsList : [{ productId: products[0]?.id || '', quantity: '1', price: String(products[0]?.pricing || 0), discount: '0.00' }]);
  };

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
    
    // Reset new states
    setSelectedOrderIds([]);
    setBillingAddress('');
    setShippingAddress('');
    setShippingState('Gujarat');
    setShippingName('');
    setDiffShipping(false);
    
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

    // Load new states
    setBillingAddress(inv.billingAddress || '');
    setShippingAddress(inv.shippingAddress || '');
    setShippingState(inv.shippingState || 'Gujarat');
    setShippingName(inv.shippingName || '');
    setDiffShipping(!!inv.shippingAddress && inv.shippingAddress !== inv.billingAddress);
    
    let resolvedOrderIds: string[] = [];
    if (inv.salesOrderId) {
      resolvedOrderIds.push(inv.salesOrderId);
    }
    if (inv.salesOrderIds) {
      try {
        const parsed = JSON.parse(inv.salesOrderIds);
        if (Array.isArray(parsed)) {
          resolvedOrderIds = Array.from(new Set([...resolvedOrderIds, ...parsed]));
        }
      } catch (e) {
        console.error("Failed to parse salesOrderIds", e);
      }
    }
    setSelectedOrderIds(resolvedOrderIds);

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

    // Validate remaining quantity limits
    if (selectedOrderIds.length > 0) {
      const selectedOrders = salesOrders.filter(so => selectedOrderIds.includes(so.id));
      for (const item of items) {
        let limit = 0;
        for (const order of selectedOrders) {
          for (const oItem of order.items) {
            if (oItem.productId === item.productId) {
              limit += (oItem.remainingQuantity !== undefined ? oItem.remainingQuantity : oItem.quantity);
            }
          }
        }
        const inputQty = parseFloat(item.quantity) || 0;
        if (inputQty > limit) {
          const prod = products.find(p => p.id === item.productId);
          setLocalErr(`Quantity for product '${prod?.name || item.productId}' exceeds the total remaining limit of ${limit} in the selected Sales Order(s).`);
          return;
        }
      }
    }

    setLoading(true);

    const payload = {
      customerId,
      dueDate: dueDate || null,
      discount: discPct, // Treat discount as percentage
      tax: taxVal,
      subtotal,
      total: totalVal,
      status,
      billingAddress: billingAddress || null,
      shippingAddress: shippingAddress || null,
      shippingState: shippingState || null,
      shippingName: shippingName || null,
      salesOrderId: selectedOrderIds.length === 1 ? selectedOrderIds[0] : null,
      salesOrderIds: selectedOrderIds.length > 1 ? JSON.stringify(selectedOrderIds) : null,
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
    setCustomizingInvoice(inv);
    setCustomTitle('Tax Invoice');
    setCustomNotes('All financial disputes are governed under corporate guidelines. Thank you!');
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

              {/* Sales Orders merge selector */}
              {customerId && salesOrders.filter(so => so.customerId === customerId && so.status !== 'COMPLETED' && so.status !== 'CANCELLED').length > 0 && (
                <div className="md:col-span-2 bg-slate-950/20 p-3.5 border border-slate-800 rounded-xl space-y-2">
                  <label className="text-[9px] font-bold text-indigo-400 tracking-wider uppercase block">Link Sales Orders (Check multiple to merge same company)</label>
                  <div className="flex flex-wrap gap-2">
                    {salesOrders
                      .filter(so => so.customerId === customerId && so.status !== 'COMPLETED' && so.status !== 'CANCELLED')
                      .map(so => {
                        const isChecked = selectedOrderIds.includes(so.id);
                        return (
                          <button
                            key={so.id}
                            type="button"
                            onClick={() => handleToggleSalesOrder(so.id)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                              isChecked
                                ? 'bg-indigo-650/20 border-indigo-500/60 text-indigo-400 font-bold'
                                : 'bg-slate-900 border-slate-800 text-slate-455 hover:text-slate-200'
                            }`}
                          >
                            {so.orderNo} ({so.status})
                          </button>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* Billing Destination Address */}
              <div className="md:col-span-2">
                <label className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block mb-1">Billing Address *</label>
                <textarea
                  required
                  rows={2}
                  value={billingAddress}
                  onChange={e => setBillingAddress(e.target.value)}
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-emerald-500/50 py-2 px-3 rounded-lg text-xs text-[var(--text-primary)] focus:outline-none"
                  placeholder="Company billing destination address"
                />
              </div>

              {/* Shipping address toggle */}
              <div className="md:col-span-2 flex items-center gap-2.5 py-1">
                <input
                  type="checkbox"
                  id="diffShipping"
                  checked={diffShipping}
                  onChange={e => setDiffShipping(e.target.checked)}
                  className="w-4.5 h-4.5 accent-emerald-500 rounded border-slate-800 focus:ring-0 focus:ring-offset-0 bg-slate-950"
                />
                <label htmlFor="diffShipping" className="text-xs text-[var(--text-secondary)] font-semibold cursor-pointer select-none">
                  Ship to a different destination name or address (Bill-to / Ship-to Invoice)
                </label>
              </div>

              {/* Shipping fields */}
              {diffShipping && (
                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-950/10 p-4 border border-slate-850 rounded-xl">
                  <div className="md:col-span-2">
                    <label className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block mb-1">Shipping Consignee / Name *</label>
                    <input
                      type="text"
                      required={diffShipping}
                      value={shippingName}
                      onChange={e => setShippingName(e.target.value)}
                      className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-emerald-500/50 py-2 px-3 rounded-lg text-xs text-[var(--text-primary)] focus:outline-none"
                      placeholder="e.g. Acme Warehouses, John Doe"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block mb-1">Shipping Destination Address *</label>
                    <textarea
                      required={diffShipping}
                      rows={2}
                      value={shippingAddress}
                      onChange={e => setShippingAddress(e.target.value)}
                      className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-emerald-500/50 py-2 px-3 rounded-lg text-xs text-[var(--text-primary)] focus:outline-none"
                      placeholder="Delivery street address, pincode"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block mb-1">Shipping State (Compulsory) *</label>
                    <select
                      required={diffShipping}
                      value={shippingState}
                      onChange={e => setShippingState(e.target.value)}
                      className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-emerald-500/50 py-2.5 px-3 rounded-lg text-xs text-[var(--text-primary)] focus:outline-none cursor-pointer"
                    >
                      {INDIAN_STATES.map(st => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

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
                {(() => {
                  const cust = customers.find(c => c.id === customerId);
                  const isInternational = cust?.clientClassification === 'INTERNATIONAL';
                  const isSameState = companyProfile && cust?.state === companyProfile.state;
                  if (isInternational) {
                    return (
                      <span className="flex justify-between text-emerald-400 italic">
                        <span>Zero-rated Export (0%):</span>
                        <span>+{currencySymbol}0.00</span>
                      </span>
                    );
                  } else if (isSameState) {
                    const halfTax = taxVal / 2;
                    const halfPct = taxPct / 2;
                    return (
                      <>
                        <span className="flex justify-between text-emerald-400">
                          <span>CGST ({halfPct.toFixed(1)}%):</span>
                          <span>+{currencySymbol}{halfTax.toFixed(2)}</span>
                        </span>
                        <span className="flex justify-between text-emerald-400">
                          <span>SGST ({halfPct.toFixed(1)}%):</span>
                          <span>+{currencySymbol}{halfTax.toFixed(2)}</span>
                        </span>
                      </>
                    );
                  } else {
                    return (
                      <span className="flex justify-between text-emerald-400">
                        <span>IGST ({taxPct}%):</span>
                        <span>+{currencySymbol}{taxVal.toFixed(2)}</span>
                      </span>
                    );
                  }
                })()}
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
                        {selectedOrderIds.length > 0 && (() => {
                          let limit = 0;
                          const selectedOrders = salesOrders.filter(so => selectedOrderIds.includes(so.id));
                          for (const order of selectedOrders) {
                            for (const oItem of order.items) {
                              if (oItem.productId === item.productId) {
                                limit += (oItem.remainingQuantity !== undefined ? oItem.remainingQuantity : oItem.quantity);
                              }
                            }
                          }
                          return (
                            <div className="mt-1 text-[9px] text-[var(--text-muted)] flex justify-between">
                              <span>Remaining limit:</span>
                              <span className={parseFloat(item.quantity) > limit ? "text-rose-400 font-bold" : "text-emerald-400 font-semibold"}>{limit}</span>
                            </div>
                          );
                        })()}
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

      {/* ==========================================
          MODAL: PDF TEMPLATE CUSTOMIZER & PRINT HUB
          ========================================== */}
      {customizingInvoice && (() => {
        const inv = customizingInvoice;
        const cust = customers.find(c => c.id === inv.customerId);
        
        const discountVal = inv.subtotal * ((inv.discount || 0) / 100);
        const isInternational = cust?.clientClassification === 'INTERNATIONAL';
        const isSameState = companyProfile && cust?.state === companyProfile.state;
        
        return (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in text-left">
            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl w-full max-w-5xl h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-scale-up">
              {/* Header */}
              <div className="flex items-center justify-between p-5 border-b border-[var(--border-color)] shrink-0">
                <div>
                  <h3 className="font-bold text-base text-[var(--text-primary)]">Custom Print Template Studio</h3>
                  <p className="text-[var(--text-secondary)] text-[10px]">Toggle invoice columns, sections, headers, and click print to trigger a direct print stream.</p>
                </div>
                <button
                  onClick={() => setCustomizingInvoice(null)}
                  className="text-[var(--text-muted)] hover:text-white cursor-pointer bg-transparent border-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 flex overflow-hidden min-h-0">
                {/* Left Side: Controls */}
                <div className="w-80 border-r border-[var(--border-color)] p-5 overflow-y-auto space-y-5 shrink-0 bg-slate-950/20">
                  <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest block border-b border-[var(--border-color)] pb-2 mb-3">Template Options</span>

                  {/* Load Custom Template Selection */}
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase">Load Custom Template Preset</label>
                    <select
                      onChange={(e) => {
                        const tplId = e.target.value;
                        if (!tplId) return;
                        const saved = localStorage.getItem('erp_pdf_templates');
                        if (saved) {
                          try {
                            const templates = JSON.parse(saved);
                            const tpl = templates.find((t: any) => t.id === tplId);
                            if (tpl) {
                              setCustomTitle(tpl.title || 'Tax Invoice');
                              setCustomNotes(tpl.terms || '');
                              setThemeColor(tpl.themeColor || 'indigo');
                              setPdfCustomizer({
                                showLogo: tpl.showLogo ?? true,
                                showCompanyDetails: tpl.showCompanyDetails ?? true,
                                showBillingAddress: tpl.showBillingAddress ?? true,
                                showShippingAddress: tpl.showShippingAddress ?? true,
                                showBankDetails: tpl.showBankDetails ?? true,
                                showTerms: tpl.showTerms ?? true,
                                colProductCode: tpl.colProductCode ?? true,
                                colUnitPrice: tpl.colUnitPrice ?? true,
                                colDiscount: tpl.colDiscount ?? true,
                                colTax: tpl.colTax ?? true,
                              });
                            }
                          } catch (err) {
                            console.error(err);
                          }
                        }
                      }}
                      className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] py-1.5 px-3 rounded-lg text-xs text-white focus:outline-none cursor-pointer"
                    >
                      <option value="">-- Choose custom template --</option>
                      {(() => {
                        const saved = localStorage.getItem('erp_pdf_templates');
                        if (!saved) return null;
                        try {
                          const templates = JSON.parse(saved);
                          return templates
                            .filter((t: any) => t.type === 'INVOICE')
                            .map((t: any) => (
                              <option key={t.id} value={t.id}>{t.name}</option>
                            ));
                        } catch (err) {
                          return null;
                        }
                      })()}
                    </select>
                  </div>
                  
                  {/* Title Customizer */}
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase">Document Title</label>
                    <input
                      type="text"
                      value={customTitle}
                      onChange={e => setCustomTitle(e.target.value)}
                      className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] py-1.5 px-3 rounded-lg text-xs text-white focus:outline-none"
                    />
                  </div>

                  {/* Theme Color Selector */}
                  <div className="space-y-2">
                    <label className="text-[9px] font-bold text-slate-400 uppercase block">Theme Accent Color</label>
                    <div className="flex gap-2.5">
                      {['indigo', 'emerald', 'rose', 'amber', 'slate'].map(color => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setThemeColor(color)}
                          style={{ backgroundColor: getThemeHex(color) }}
                          className={`w-5.5 h-5.5 rounded-full border border-black cursor-pointer transition-all active:scale-90 ${
                            themeColor === color ? 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-slate-950' : 'opacity-70 hover:opacity-100'
                          }`}
                          title={color}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Toggles */}
                  <div className="space-y-3">
                    <span className="text-[8.5px] font-extrabold text-slate-505 uppercase block tracking-wider">Layout Blocks</span>
                    <div className="flex flex-col gap-2">
                      <label className="flex items-center gap-2 text-xs text-slate-350 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={pdfCustomizer.showLogo}
                          onChange={e => setPdfCustomizer({ ...pdfCustomizer, showLogo: e.target.checked })}
                          className="accent-indigo-500"
                        />
                        Include Corporate Logo
                      </label>
                      <label className="flex items-center gap-2 text-xs text-slate-350 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={pdfCustomizer.showCompanyDetails}
                          onChange={e => setPdfCustomizer({ ...pdfCustomizer, showCompanyDetails: e.target.checked })}
                          className="accent-indigo-500"
                        />
                        Show Company Info
                      </label>
                      <label className="flex items-center gap-2 text-xs text-slate-350 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={pdfCustomizer.showBillingAddress}
                          onChange={e => setPdfCustomizer({ ...pdfCustomizer, showBillingAddress: e.target.checked })}
                          className="accent-indigo-500"
                        />
                        Show Billing Address
                      </label>
                      <label className="flex items-center gap-2 text-xs text-slate-350 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={pdfCustomizer.showShippingAddress}
                          onChange={e => setPdfCustomizer({ ...pdfCustomizer, showShippingAddress: e.target.checked })}
                          className="accent-indigo-500"
                        />
                        Show Shipping Address
                      </label>
                      <label className="flex items-center gap-2 text-xs text-slate-350 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={pdfCustomizer.showBankDetails}
                          onChange={e => setPdfCustomizer({ ...pdfCustomizer, showBankDetails: e.target.checked })}
                          className="accent-indigo-500"
                        />
                        Include Bank Details
                      </label>
                      <label className="flex items-center gap-2 text-xs text-slate-350 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={pdfCustomizer.showTerms}
                          onChange={e => setPdfCustomizer({ ...pdfCustomizer, showTerms: e.target.checked })}
                          className="accent-indigo-500"
                        />
                        Include T&C Notes
                      </label>
                    </div>
                  </div>

                  {/* Columns */}
                  <div className="space-y-3">
                    <span className="text-[8.5px] font-extrabold text-slate-505 uppercase block tracking-wider">Item Table Columns</span>
                    <div className="flex flex-col gap-2">
                      <label className="flex items-center gap-2 text-xs text-slate-350 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={pdfCustomizer.colProductCode}
                          onChange={e => setPdfCustomizer({ ...pdfCustomizer, colProductCode: e.target.checked })}
                          className="accent-indigo-500"
                        />
                        Show Product Code/SKU
                      </label>
                      <label className="flex items-center gap-2 text-xs text-slate-350 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={pdfCustomizer.colUnitPrice}
                          onChange={e => setPdfCustomizer({ ...pdfCustomizer, colUnitPrice: e.target.checked })}
                          className="accent-indigo-500"
                        />
                        Show Unit Pricing
                      </label>
                      <label className="flex items-center gap-2 text-xs text-slate-350 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={pdfCustomizer.colDiscount}
                          onChange={e => setPdfCustomizer({ ...pdfCustomizer, colDiscount: e.target.checked })}
                          className="accent-indigo-500"
                        />
                        Show Item Discounts %
                      </label>
                      <label className="flex items-center gap-2 text-xs text-slate-350 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={pdfCustomizer.colTax}
                          onChange={e => setPdfCustomizer({ ...pdfCustomizer, colTax: e.target.checked })}
                          className="accent-indigo-500"
                        />
                        Show GST / Tax breakdown
                      </label>
                    </div>
                  </div>

                  {/* Terms text */}
                  {pdfCustomizer.showTerms && (
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase">Custom Terms / Notes</label>
                      <textarea
                        rows={3}
                        value={customNotes}
                        onChange={e => setCustomNotes(e.target.value)}
                        className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] py-1.5 px-3 rounded-lg text-xs text-white focus:outline-none"
                      />
                    </div>
                  )}
                </div>

                {/* Right Side: Visual Preview */}
                <div className="flex-1 bg-slate-950 p-8 overflow-y-auto flex justify-center">
                  {/* Paper sheet */}
                  <div className="w-[210mm] min-h-[297mm] bg-white text-black p-10 shadow-2xl text-[11px] relative flex flex-col justify-between font-sans leading-relaxed select-text">
                    <div className="space-y-6">
                      {/* Document Header */}
                      <div className="flex justify-between items-start border-b-2 pb-5" style={{ borderColor: currentThemeHex }}>
                        <div>
                          {pdfCustomizer.showLogo && companyProfile?.logoUrl && (
                            <img src={companyProfile.logoUrl} alt="Logo" className="max-h-12 object-contain mb-3" />
                          )}
                          <div className="text-xl font-extrabold uppercase" style={{ color: currentThemeHex }}>{customTitle}</div>
                          <div className="font-mono text-[10px] text-slate-650 mt-1">Invoice No: {inv.invoiceNo}</div>
                        </div>

                        {pdfCustomizer.showCompanyDetails && companyProfile && (
                          <div className="text-right text-[10px] text-slate-700 leading-normal max-w-xs">
                            <strong className="text-slate-900 text-[11px]">{companyProfile.name}</strong><br/>
                            {companyProfile.addressLine1 && `${companyProfile.addressLine1}, `}
                            {companyProfile.addressLine2 && `${companyProfile.addressLine2}, `}<br/>
                            {companyProfile.city && `${companyProfile.city}, `}
                            {companyProfile.state && `${companyProfile.state} - `}
                            {companyProfile.pincode && companyProfile.pincode}<br/>
                            {companyProfile.gstNumber && <strong>GSTIN: {companyProfile.gstNumber}</strong>}
                          </div>
                        )}
                      </div>

                      {/* Meta Columns */}
                      <div className="grid grid-cols-2 gap-6 text-[10px] text-slate-700">
                        <div className="space-y-1">
                          <div className="text-[9px] uppercase font-bold text-slate-450">Invoice Metadata</div>
                          <div>Invoice Date: <span className="font-semibold text-slate-900">{new Date(inv.date).toLocaleDateString()}</span></div>
                          <div>Due Date: <span className="font-semibold text-slate-900">{inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : 'Immediate'}</span></div>
                          <div>Status: <span className="font-semibold text-slate-900">{inv.status}</span></div>
                        </div>
                        <div className="space-y-1 text-right">
                          <div className="text-[9px] uppercase font-bold text-slate-450">Customer Classification</div>
                          <div className="font-semibold text-slate-900">{cust?.name || 'Client Name'}</div>
                          <div>Type: {cust?.customerType || 'INDIVIDUAL'}</div>
                          <div>Category: {cust?.customerGroup || 'Standard Group'}</div>
                          {cust?.contactNo && <div>Tel: {cust.contactNo}</div>}
                        </div>
                      </div>

                      {/* Addresses Row */}
                      <div className="grid grid-cols-2 gap-6 border-t border-slate-200 pt-4">
                        {/* Bill To */}
                        {pdfCustomizer.showBillingAddress && (
                          <div className="text-[10px] text-slate-700 leading-relaxed">
                            <span className="text-[9px] uppercase font-bold block mb-1" style={{ color: currentThemeHex }}>Billing Destination (Bill To)</span>
                            <strong className="text-slate-900">{cust?.name}</strong><br/>
                            {inv.billingAddress || cust?.billingAddress || 'Billing address pending'}
                          </div>
                        )}
                        
                        {/* Ship To */}
                        {pdfCustomizer.showShippingAddress && (
                          <div className="text-[10px] text-slate-700 leading-relaxed text-right">
                            <span className="text-[9px] uppercase font-bold block mb-1" style={{ color: currentThemeHex }}>Shipping Destination (Ship To)</span>
                            <strong className="text-slate-900">{inv.shippingName || cust?.name}</strong><br/>
                            {inv.shippingAddress || cust?.shippingAddress || inv.billingAddress || cust?.billingAddress || 'Shipping address pending'}<br/>
                            {inv.shippingState && <span>State: {inv.shippingState}</span>}
                          </div>
                        )}
                      </div>

                      {/* Items Table */}
                      <div className="pt-2">
                        <table className="w-full text-left text-[10px] border-collapse">
                          <thead>
                            <tr className="border-b-2 font-bold bg-slate-50" style={{ borderBottomColor: currentThemeHex }}>
                              <th className="py-2.5 px-2 text-slate-800">Description</th>
                              {pdfCustomizer.colProductCode && <th className="py-2.5 px-2">SKU / Code</th>}
                              <th className="py-2.5 px-2 text-right">Qty</th>
                              {pdfCustomizer.colUnitPrice && <th className="py-2.5 px-2 text-right">Price</th>}
                              {pdfCustomizer.colDiscount && <th className="py-2.5 px-2 text-right">Discount</th>}
                              <th className="py-2.5 px-2 text-right">Subtotal</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(inv.items || []).map((it: any) => {
                              const prod = products.find(p => p.id === it.productId);
                              const itemSub = it.quantity * it.price;
                              const itemDisc = itemSub * ((it.discount || 0) / 100);
                              return (
                                <tr key={it.id} className="border-b border-slate-100">
                                  <td className="py-2.5 px-2">
                                    <strong className="text-slate-900">{prod?.name || 'Stock Item'}</strong>
                                    {prod?.hsnSacCode && <span className="text-[9px] text-slate-550 block mt-0.5">HSN Code: {prod.hsnSacCode}</span>}
                                  </td>
                                  {pdfCustomizer.colProductCode && (
                                    <td className="py-2.5 px-2 font-mono text-slate-650">{prod?.sku || 'N/A'}</td>
                                  )}
                                  <td className="py-2.5 px-2 text-right font-mono">{it.quantity} {prod?.uom || 'PCS'}</td>
                                  {pdfCustomizer.colUnitPrice && (
                                    <td className="py-2.5 px-2 text-right font-mono">₹{it.price.toFixed(2)}</td>
                                  )}
                                  {pdfCustomizer.colDiscount && (
                                    <td className="py-2.5 px-2 text-right font-mono">{it.discount || 0}%</td>
                                  )}
                                  <td className="py-2.5 px-2 text-right font-mono font-semibold text-slate-900">₹{(itemSub - itemDisc).toFixed(2)}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* Calculations Table */}
                      <div className="flex justify-end pt-2">
                        <table className="w-[50%] text-[10px] text-slate-700">
                          <tbody>
                            <tr className="border-b border-slate-100">
                              <td className="py-1.5 text-left">Subtotal:</td>
                              <td className="py-1.5 text-right font-mono text-slate-900">₹{inv.subtotal.toFixed(2)}</td>
                            </tr>
                            {inv.discount > 0 && (
                              <tr className="border-b border-slate-100">
                                <td className="py-1.5 text-left text-red-500">Discount ({inv.discount}%):</td>
                                <td className="py-1.5 text-right font-mono text-red-500">-₹{discountVal.toFixed(2)}</td>
                              </tr>
                            )}

                            {/* Tax split layout */}
                            {pdfCustomizer.colTax && (
                              <>
                                {isInternational ? (
                                  <tr className="border-b border-slate-100">
                                    <td className="py-1.5 text-left italic">Zero-rated Export (0%):</td>
                                    <td className="py-1.5 text-right font-mono text-slate-900">₹0.00</td>
                                  </tr>
                                ) : isSameState ? (
                                  <>
                                    <tr className="border-b border-slate-100">
                                      <td className="py-1.5 text-left">CGST (9.0%):</td>
                                      <td className="py-1.5 text-right font-mono text-slate-900">₹{(inv.tax / 2).toFixed(2)}</td>
                                    </tr>
                                    <tr className="border-b border-slate-100">
                                      <td className="py-1.5 text-left">SGST (9.0%):</td>
                                      <td className="py-1.5 text-right font-mono text-slate-900">₹{(inv.tax / 2).toFixed(2)}</td>
                                    </tr>
                                  </>
                                ) : (
                                  <tr className="border-b border-slate-100">
                                    <td className="py-1.5 text-left">IGST (18.0%):</td>
                                    <td className="py-1.5 text-right font-mono text-slate-900">₹{inv.tax.toFixed(2)}</td>
                                  </tr>
                                )}
                              </>
                            )}

                            {!pdfCustomizer.colTax && (
                              <tr className="border-b border-slate-100">
                                <td className="py-1.5 text-left">Sales Tax / GST:</td>
                                <td className="py-1.5 text-right font-mono text-slate-900">₹{inv.tax.toFixed(2)}</td>
                              </tr>
                            )}

                            <tr className="border-t-2 font-extrabold text-[12px]" style={{ color: currentThemeHex, borderTopColor: currentThemeHex }}>
                              <td className="py-2.5 text-left">Grand Total:</td>
                              <td className="py-2.5 text-right font-mono">₹{inv.total.toFixed(2)}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      {/* Bank Accounts details */}
                      {pdfCustomizer.showBankDetails && bankAccounts.length > 0 && (
                        <div className="border border-slate-200 bg-slate-50 p-3.5 rounded-lg text-[9px] text-slate-700 leading-normal space-y-1.5 mt-8">
                          <span className="font-extrabold text-slate-900 uppercase block tracking-wider">Payment Bank Destination</span>
                          <div className="grid grid-cols-3 gap-4">
                            <div><strong>Bank Name:</strong> {bankAccounts[0].bankName}</div>
                            <div><strong>Account Number:</strong> {bankAccounts[0].accountNo}</div>
                            <div><strong>IFSC Code:</strong> {bankAccounts[0].ifscCode}</div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Footer */}
                    {pdfCustomizer.showTerms && (
                      <div className="border-t border-slate-200 pt-4 mt-12 text-[9px] text-slate-550 text-center leading-normal">
                        {customNotes}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer Buttons */}
              <div className="p-4 border-t border-[var(--border-color)] shrink-0 flex justify-end gap-3 bg-slate-950/20">
                <button
                  onClick={() => setCustomizingInvoice(null)}
                  className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-350 font-bold text-xs rounded-xl border-0 cursor-pointer transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setActivePrintInvoice(inv);
                  }}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl border-0 cursor-pointer transition-all shadow-lg shadow-emerald-600/10"
                >
                  Print PDF Directly
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ==========================================
          HIDDEN PRINT CONTAINER FOR MEDIA PRINT STREAMS
          ========================================== */}
      {activePrintInvoice && (() => {
        const inv = activePrintInvoice;
        const cust = customers.find(c => c.id === inv.customerId);
        const discountVal = inv.subtotal * ((inv.discount || 0) / 100);
        const isInternational = cust?.clientClassification === 'INTERNATIONAL';
        const isSameState = companyProfile && cust?.state === companyProfile.state;

        return (
          <div id="print-section" className="hidden print:block fixed inset-0 z-[99999] bg-white text-black p-10">
            <style dangerouslySetInnerHTML={{__html: `
              @media print {
                body * {
                  visibility: hidden !important;
                }
                #print-section, #print-section * {
                  visibility: visible !important;
                }
                #print-section {
                  position: absolute !important;
                  left: 0 !important;
                  top: 0 !important;
                  width: 100% !important;
                  background: white !important;
                  color: black !important;
                }
              }
            `}} />
            <div className="space-y-6">
              {/* Header */}
              <div className="flex justify-between items-start border-b-2 pb-5" style={{ borderColor: currentThemeHex }}>
                <div>
                  {pdfCustomizer.showLogo && companyProfile?.logoUrl && (
                    <img src={companyProfile.logoUrl} alt="Logo" className="max-h-12 object-contain mb-3" />
                  )}
                  <div className="text-xl font-extrabold uppercase" style={{ color: currentThemeHex }}>{customTitle}</div>
                  <div className="font-mono text-[10px] text-slate-650 mt-1">Invoice No: {inv.invoiceNo}</div>
                </div>

                {pdfCustomizer.showCompanyDetails && companyProfile && (
                  <div className="text-right text-[10px] text-slate-700 leading-normal max-w-xs">
                    <strong className="text-slate-900 text-[11px]">{companyProfile.name}</strong><br/>
                    {companyProfile.addressLine1 && `${companyProfile.addressLine1}, `}
                    {companyProfile.addressLine2 && `${companyProfile.addressLine2}, `}<br/>
                    {companyProfile.city && `${companyProfile.city}, `}
                    {companyProfile.state && `${companyProfile.state} - `}
                    {companyProfile.pincode && companyProfile.pincode}<br/>
                    {companyProfile.gstNumber && <strong>GSTIN: {companyProfile.gstNumber}</strong>}
                  </div>
                )}
              </div>

              {/* Meta */}
              <div className="grid grid-cols-2 gap-6 text-[10px] text-slate-700">
                <div className="space-y-1">
                  <div className="text-[9px] uppercase font-bold text-slate-455">Invoice Metadata</div>
                  <div>Invoice Date: <span className="font-semibold text-slate-900">{new Date(inv.date).toLocaleDateString()}</span></div>
                  <div>Due Date: <span className="font-semibold text-slate-900">{inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : 'Immediate'}</span></div>
                  <div>Status: <span className="font-semibold text-slate-900">{inv.status}</span></div>
                </div>
                <div className="space-y-1 text-right">
                  <div className="text-[9px] uppercase font-bold text-slate-455">Customer Classification</div>
                  <div className="font-semibold text-slate-900">{cust?.name || 'Client Name'}</div>
                  <div>Type: {cust?.customerType || 'INDIVIDUAL'}</div>
                  <div>Category: {cust?.customerGroup || 'Standard Group'}</div>
                  {cust?.contactNo && <div>Tel: {cust.contactNo}</div>}
                </div>
              </div>

              {/* Addresses Row */}
              <div className="grid grid-cols-2 gap-6 border-t border-slate-200 pt-4">
                {pdfCustomizer.showBillingAddress && (
                  <div className="text-[10px] text-slate-700 leading-relaxed">
                    <span className="text-[9px] uppercase font-bold block mb-1" style={{ color: currentThemeHex }}>Billing Destination (Bill To)</span>
                    <strong className="text-slate-900">{cust?.name}</strong><br/>
                    {inv.billingAddress || cust?.billingAddress || 'Billing address pending'}
                  </div>
                )}
                
                {pdfCustomizer.showShippingAddress && (
                  <div className="text-[10px] text-slate-700 leading-relaxed text-right">
                    <span className="text-[9px] uppercase font-bold block mb-1" style={{ color: currentThemeHex }}>Shipping Destination (Ship To)</span>
                    <strong className="text-slate-900">{inv.shippingName || cust?.name}</strong><br/>
                    {inv.shippingAddress || cust?.shippingAddress || inv.billingAddress || cust?.billingAddress || 'Shipping address pending'}<br/>
                    {inv.shippingState && <span>State: {inv.shippingState}</span>}
                  </div>
                )}
              </div>

              {/* Items Table */}
              <div className="pt-2">
                <table className="w-full text-left text-[10px] border-collapse">
                  <thead>
                    <tr className="border-b-2 font-bold bg-slate-50" style={{ borderBottomColor: currentThemeHex }}>
                      <th className="py-2.5 px-2 text-slate-800">Description</th>
                      {pdfCustomizer.colProductCode && <th className="py-2.5 px-2">SKU / Code</th>}
                      <th className="py-2.5 px-2 text-right">Qty</th>
                      {pdfCustomizer.colUnitPrice && <th className="py-2.5 px-2 text-right">Price</th>}
                      {pdfCustomizer.colDiscount && <th className="py-2.5 px-2 text-right">Discount</th>}
                      <th className="py-2.5 px-2 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(inv.items || []).map((it: any) => {
                      const prod = products.find(p => p.id === it.productId);
                      const itemSub = it.quantity * it.price;
                      const itemDisc = itemSub * ((it.discount || 0) / 100);
                      return (
                        <tr key={it.id} className="border-b border-slate-100">
                          <td className="py-2.5 px-2">
                            <strong className="text-slate-900">{prod?.name || 'Stock Item'}</strong>
                            {prod?.hsnSacCode && <span className="text-[9px] text-slate-550 block mt-0.5">HSN Code: {prod.hsnSacCode}</span>}
                          </td>
                          {pdfCustomizer.colProductCode && (
                            <td className="py-2.5 px-2 font-mono text-slate-650">{prod?.sku || 'N/A'}</td>
                          )}
                          <td className="py-2.5 px-2 text-right font-mono">{it.quantity} {prod?.uom || 'PCS'}</td>
                          {pdfCustomizer.colUnitPrice && (
                            <td className="py-2.5 px-2 text-right font-mono">₹{it.price.toFixed(2)}</td>
                          )}
                          {pdfCustomizer.colDiscount && (
                            <td className="py-2.5 px-2 text-right font-mono">{it.discount || 0}%</td>
                          )}
                          <td className="py-2.5 px-2 text-right font-mono font-semibold text-slate-900">₹{(itemSub - itemDisc).toFixed(2)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Calculations Table */}
              <div className="flex justify-end pt-2">
                <table className="w-[50%] text-[10px] text-slate-700">
                  <tbody>
                    <tr className="border-b border-slate-100">
                      <td className="py-1.5 text-left">Subtotal:</td>
                      <td className="py-1.5 text-right font-mono text-slate-900">₹{inv.subtotal.toFixed(2)}</td>
                    </tr>
                    {inv.discount > 0 && (
                      <tr className="border-b border-slate-100">
                        <td className="py-1.5 text-left text-red-500">Discount ({inv.discount}%):</td>
                        <td className="py-1.5 text-right font-mono text-red-550">-₹{discountVal.toFixed(2)}</td>
                      </tr>
                    )}

                    {pdfCustomizer.colTax && (
                      <>
                        {isInternational ? (
                          <tr className="border-b border-slate-100">
                            <td className="py-1.5 text-left italic">Zero-rated Export (0%):</td>
                            <td className="py-1.5 text-right font-mono text-slate-900">₹0.00</td>
                          </tr>
                        ) : isSameState ? (
                          <>
                            <tr className="border-b border-slate-100">
                              <td className="py-1.5 text-left">CGST (9.0%):</td>
                              <td className="py-1.5 text-right font-mono text-slate-900">₹{(inv.tax / 2).toFixed(2)}</td>
                            </tr>
                            <tr className="border-b border-slate-100">
                              <td className="py-1.5 text-left">SGST (9.0%):</td>
                              <td className="py-1.5 text-right font-mono text-slate-900">₹{(inv.tax / 2).toFixed(2)}</td>
                            </tr>
                          </>
                        ) : (
                          <tr className="border-b border-slate-100">
                            <td className="py-1.5 text-left">IGST (18.0%):</td>
                            <td className="py-1.5 text-right font-mono text-slate-900">₹{inv.tax.toFixed(2)}</td>
                          </tr>
                        )}
                      </>
                    )}

                    {!pdfCustomizer.colTax && (
                      <tr className="border-b border-slate-100">
                        <td className="py-1.5 text-left">Sales Tax / GST:</td>
                        <td className="py-1.5 text-right font-mono text-slate-900">₹{inv.tax.toFixed(2)}</td>
                      </tr>
                    )}

                    <tr className="border-t-2 font-extrabold text-[12px]" style={{ color: currentThemeHex, borderTopColor: currentThemeHex }}>
                      <td className="py-2.5 text-left">Grand Total:</td>
                      <td className="py-2.5 text-right font-mono">₹{inv.total.toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Bank Accounts details */}
              {pdfCustomizer.showBankDetails && bankAccounts.length > 0 && (
                <div className="border border-slate-200 bg-slate-50 p-3.5 rounded-lg text-[9px] text-slate-700 leading-normal space-y-1.5 mt-8">
                  <span className="font-extrabold text-slate-900 uppercase block tracking-wider">Payment Bank Destination</span>
                  <div className="grid grid-cols-3 gap-4">
                    <div><strong>Bank Name:</strong> {bankAccounts[0].bankName}</div>
                    <div><strong>Account Number:</strong> {bankAccounts[0].accountNo}</div>
                    <div><strong>IFSC Code:</strong> {bankAccounts[0].ifscCode}</div>
                  </div>
                </div>
              )}
            </div>

            {pdfCustomizer.showTerms && (
              <div className="border-t border-slate-200 pt-4 mt-12 text-[9px] text-slate-550 text-center leading-normal">
                {customNotes}
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}
