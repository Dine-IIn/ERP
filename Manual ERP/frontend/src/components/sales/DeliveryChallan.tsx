import React, { useState } from 'react';
import { Truck, Search, Plus, Edit, Trash2, X, AlertCircle, Calendar, CheckCircle2, Mail, Download, Package } from 'lucide-react';
import { apiClient } from '../../utils/apiService';
import { useQuery } from '@tanstack/react-query';
import { CreateDeliveryChallanBodySchema } from '../../utils/schemas';
import CustomerTaxBankPdfSection from './CustomerTaxBankPdfSection';
import {
  DEFAULT_PDF_CUSTOMIZER,
  mergePdfCustomizerFromTemplate,
  parseTemplatesFromApi,
  pickDefaultTemplate,
  resolveCustomerForPdf,
  resolveCustomerTaxBank,
} from '../../utils/pdfDocumentUtils';

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

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);

  const { data: profileRes } = useQuery({
    queryKey: ['companyProfile'],
    queryFn: () => apiClient.get<any>('/api/admin/company/profile')
  });
  const companyProfile = profileRes?.company || null;

  const { data: ordersRes } = useQuery({
    queryKey: ['salesOrders'],
    queryFn: () => apiClient.get<{ orders: any[] }>('/api/sales/orders')
  });
  const salesOrders = ordersRes?.orders || [];

  const { data: templatesRes } = useQuery({
    queryKey: ['templates', 'CHALLAN'],
    queryFn: () => apiClient.get<{ templates: any[] }>('/api/sales/templates?docType=CHALLAN')
  });
  const templates = React.useMemo(
    () => parseTemplatesFromApi(templatesRes?.templates || []),
    [templatesRes]
  );

  // Print Preview States
  const [customizingInvoice, setCustomizingInvoice] = useState<any>(null);
  const [activePrintInvoice, setActivePrintInvoice] = useState<any>(null);
  const [customTitle, setCustomTitle] = useState('DELIVERY CHALLAN');
  const [customNotes, setCustomNotes] = useState('1. Please receive the goods in sound physical condition.\n2. Return duplicate copy duly signed and stamped.');
  const [themeColor, setThemeColor] = useState('emerald');
  const [pdfCustomizer, setPdfCustomizer] = useState({ ...DEFAULT_PDF_CUSTOMIZER, colDiscount: false, colTax: false });

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

  const applyTemplateSettings = (tpl: any) => {
    setCustomTitle(tpl.title || 'DELIVERY CHALLAN');
    setCustomNotes(tpl.terms || '');
    setThemeColor(tpl.themeColor || 'emerald');
    setPdfCustomizer({
      ...mergePdfCustomizerFromTemplate(tpl),
      colDiscount: tpl.colDiscount ?? false,
      colTax: tpl.colTax ?? false,
    });
  };

  React.useEffect(() => {
    if (!customizingInvoice || templates.length === 0) return;
    const defaultTpl = pickDefaultTemplate(templates);
    if (defaultTpl) {
      setSelectedTemplateId(defaultTpl.id);
      applyTemplateSettings(defaultTpl);
    }
  }, [customizingInvoice, templates]);

  React.useEffect(() => {
    if (activePrintInvoice) {
      const timer = setTimeout(() => {
        window.print();
        setActivePrintInvoice(null);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [activePrintInvoice]);

  const [customerId, setCustomerId] = useState('');
  const [status, setStatus] = useState('ISSUED');

  React.useEffect(() => {
    setSelectedOrderIds([]);
  }, [customerId]);

  const applySalesOrderTransit = (orderIds: string[]) => {
    const selectedOrders = salesOrders.filter(so => orderIds.includes(so.id));
    const mergedItems: Record<string, { productId: string; quantity: number; price: number }> = {};

    for (const order of selectedOrders) {
      for (const item of order.items) {
        const remaining = item.remainingChallanQuantity !== undefined ? item.remainingChallanQuantity : (item.quantity - (item.shippedQuantity || 0));
        if (remaining <= 0) continue;

        let qtyToShip = remaining;

        if (mergedItems[item.productId]) {
          mergedItems[item.productId].quantity += qtyToShip;
        } else {
          mergedItems[item.productId] = {
            productId: item.productId,
            quantity: qtyToShip,
            price: item.price
          };
        }
      }
    }

    const newItemsList = Object.values(mergedItems).map(item => ({
      productId: item.productId,
      quantity: String(Number(item.quantity.toFixed(4))),
      price: String(item.price)
    }));

    setItems(newItemsList.length > 0 ? newItemsList : [{ productId: products[0]?.id || '', quantity: '1', price: String(products[0]?.pricing || 0) }]);
  };

  const prevSelectedOrderIdsRef = React.useRef(selectedOrderIds);

  React.useEffect(() => {
    const ordersChanged = JSON.stringify(prevSelectedOrderIdsRef.current) !== JSON.stringify(selectedOrderIds);

    if (ordersChanged) {
      if (selectedOrderIds.length > 0) {
        applySalesOrderTransit(selectedOrderIds);
      }
    }

    prevSelectedOrderIdsRef.current = selectedOrderIds;
  }, [selectedOrderIds]);

  const handleToggleSalesOrder = (soId: string) => {
    let updatedIds = [...selectedOrderIds];
    if (updatedIds.includes(soId)) {
      updatedIds = updatedIds.filter(id => id !== soId);
    } else {
      updatedIds.push(soId);
    }
    setSelectedOrderIds(updatedIds);
  };

  const [items, setItems] = useState<ChallanItemInput[]>([]);
  const [localErr, setLocalErr] = useState<string | null>(null);
  const [localSuccess, setLocalSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [emailingId, setEmailingId] = useState<string | null>(null);

  const openAddModal = () => {
    setCustomerId(customers[0]?.id || '');
    setStatus('ISSUED');
    setSelectedOrderIds([]);
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

    let resolvedOrderIds: string[] = [];
    if (dc.salesOrderId) {
      resolvedOrderIds.push(dc.salesOrderId);
    }
    if (dc.salesOrderIds) {
      try {
        const parsed = JSON.parse(dc.salesOrderIds);
        if (Array.isArray(parsed)) {
          resolvedOrderIds = Array.from(new Set([...resolvedOrderIds, ...parsed]));
        }
      } catch (e) {
        console.error("Failed to parse salesOrderIds", e);
      }
    }
    setSelectedOrderIds(resolvedOrderIds);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId || items.length === 0) {
      setLocalErr("Customer and at least one item are required.");
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
              limit += oItem.remainingChallanQuantity !== undefined ? oItem.remainingChallanQuantity : (oItem.quantity - (oItem.shippedQuantity || 0));
            }
          }
        }
        const inputQty = parseFloat(item.quantity) || 0;
        if (inputQty > limit) {
          const prod = products.find(p => p.id === item.productId);
          setLocalErr(`Quantity for product '${prod?.name || item.productId}' exceeds the total remaining shipping limit of ${limit} in the selected Sales Order(s).`);
          return;
        }
      }
    }

    setLoading(true);

    const payload = {
      customerId,
      status,
      salesOrderId: selectedOrderIds.length === 1 ? selectedOrderIds[0] : null,
      salesOrderIds: selectedOrderIds.length > 1 ? JSON.stringify(selectedOrderIds) : null,
      items: items.map(item => ({
        productId: item.productId,
        quantity: parseFloat(item.quantity) || 1.0, // quantity is already scaled or custom in grid
        price: parseFloat(item.price) || 0.0 // Locked to Product Master price
      }))
    };

    const parsed = CreateDeliveryChallanBodySchema.safeParse(payload);
    if (!parsed.success) {
      setLocalErr("Validation error: " + parsed.error.issues[0].message);
      setLoading(false);
      return;
    }

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
    setCustomizingInvoice(dc);
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
                        {selectedOrderIds.length > 0 && (() => {
                          let limit = 0;
                          const selectedOrders = salesOrders.filter(so => selectedOrderIds.includes(so.id));
                          for (const order of selectedOrders) {
                            for (const oItem of order.items) {
                              if (oItem.productId === item.productId) {
                                limit += oItem.remainingChallanQuantity !== undefined ? oItem.remainingChallanQuantity : (oItem.quantity - (oItem.shippedQuantity || 0));
                              }
                            }
                          }
                          return (
                            <div className="mt-1 text-[9px] text-[var(--text-muted)] flex justify-between">
                              <span>Remaining:</span>
                              <span className={parseFloat(item.quantity) > limit ? "text-rose-400 font-bold" : "text-emerald-400 font-semibold"}>{limit}</span>
                            </div>
                          );
                        })()}
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

      {/* ==========================================
          MODAL: PDF TEMPLATE CUSTOMIZER & PRINT HUB
          ========================================== */}
      {customizingInvoice && (() => {
        const dc = customizingInvoice;
        const cust = resolveCustomerForPdf(customers, dc.customerId, dc);
        const taxBank = resolveCustomerTaxBank(cust);
        
        return (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in text-left">
            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl w-full max-w-5xl h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-scale-up">
              {/* Header */}
              <div className="flex items-center justify-between p-5 border-b border-[var(--border-color)] shrink-0">
                <div>
                  <h3 className="font-bold text-base text-[var(--text-primary)]">Custom Print Template Studio</h3>
                  <p className="text-[var(--text-secondary)] text-[10px]">Select layout configurations and click print to trigger a direct print stream.</p>
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
                    <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Select Print Template *</label>
                    <select
                      value={selectedTemplateId}
                      onChange={(e) => {
                        const tplId = e.target.value;
                        setSelectedTemplateId(tplId);
                        if (!tplId) return;
                        const tpl = templates.find((t: any) => t.id === tplId);
                        if (tpl) {
                          applyTemplateSettings(tpl);
                        }
                      }}
                      className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] py-1.5 px-3 rounded-lg text-xs text-white focus:outline-none cursor-pointer"
                    >
                      <option value="">-- Choose custom template --</option>
                      {templates.map((t: any) => (
                        <option key={t.id} value={t.id}>{t.name} {t.isDefault ? '(Default)' : ''}</option>
                      ))}
                    </select>
                    {templates.length === 0 && (
                      <p className="text-[10px] text-amber-400 mt-2 italic">
                        No database templates found. Configure layouts in the PDF Print Studio.
                      </p>
                    )}
                  </div>
                </div>

                {/* Right Side: Visual Preview */}
                <div className="flex-1 bg-slate-950 p-8 overflow-y-auto flex justify-center">
                  {/* Paper sheet */}
                  <div
                    className="w-[210mm] min-h-[297mm] bg-white text-black p-10 shadow-2xl relative flex flex-col justify-between font-sans leading-relaxed select-text"
                    style={{
                      fontSize: `${pdfCustomizer.bodyFontSize}px`
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: `${pdfCustomizer.sectionSpacing}px` }}>
                      {/* Document Header */}
                      <div
                        className="border-b-2"
                        style={{
                          borderColor: currentThemeHex,
                          paddingBottom: `${pdfCustomizer.headerPadding}px`,
                          marginBottom: `${pdfCustomizer.sectionSpacing}px`,
                          display: 'flex',
                          flexDirection: pdfCustomizer.headerAlign === 'center' ? 'column' : 'row',
                          alignItems: pdfCustomizer.headerAlign === 'center' ? 'center' : 'flex-start',
                          justifyContent: 'space-between',
                          textAlign: pdfCustomizer.headerAlign
                        }}
                      >
                        <div style={{ textAlign: pdfCustomizer.headerAlign }}>
                          {pdfCustomizer.showLogo && (pdfCustomizer.logoBase64 || companyProfile?.logoUrl) && (
                            <img
                              src={pdfCustomizer.logoBase64 || companyProfile?.logoUrl}
                              alt="Logo"
                              style={{ height: `${pdfCustomizer.logoSize}px`, objectFit: 'contain' }}
                              className="mb-3"
                            />
                          )}
                          <div
                            className="font-extrabold uppercase title-text"
                            style={{
                              color: currentThemeHex,
                              fontSize: `${pdfCustomizer.titleFontSize}px`,
                              textAlign: pdfCustomizer.titleAlign
                            }}
                          >
                            {customTitle}
                          </div>
                          <div className="font-mono text-[10px] text-slate-650 mt-1">Challan No: {dc.challanNo}</div>
                        </div>

                        {pdfCustomizer.showCompanyDetails && (pdfCustomizer.headerName || companyProfile) && (
                          <div
                            style={{
                              textAlign: pdfCustomizer.headerAlign === 'center' ? 'center' : pdfCustomizer.headerAlign === 'right' ? 'left' : 'right',
                            }}
                            className="text-slate-700 leading-normal max-w-xs whitespace-pre-line"
                          >
                            {pdfCustomizer.headerName ? (
                              <>
                                <div className="font-extrabold text-slate-900" style={{ fontSize: `${pdfCustomizer.headerFontSize}px` }}>{pdfCustomizer.headerName}</div>
                                <div className="text-slate-500 font-medium mt-0.5" style={{ fontSize: `${pdfCustomizer.headerFontSize * 0.7}px` }}>{pdfCustomizer.headerSubtitle}</div>
                              </>
                            ) : companyProfile ? (
                              <>
                                <div className="font-extrabold text-slate-900" style={{ fontSize: `${pdfCustomizer.headerFontSize}px` }}>{companyProfile.name}</div>
                                <div className="text-slate-500 font-medium mt-0.5" style={{ fontSize: `${pdfCustomizer.headerFontSize * 0.7}px` }}>
                                  {companyProfile.addressLine1 && `${companyProfile.addressLine1}, `}
                                  {companyProfile.addressLine2 && `${companyProfile.addressLine2}, `}<br/>
                                  {companyProfile.city && `${companyProfile.city}, `}
                                  {companyProfile.state && `${companyProfile.state} - `}
                                  {companyProfile.pincode && companyProfile.pincode}<br/>
                                  {companyProfile.gstNumber && <strong>GSTIN: {companyProfile.gstNumber}</strong>}
                                </div>
                              </>
                            ) : null}
                          </div>
                        )}
                      </div>

                      {/* Meta Columns */}
                      {(pdfCustomizer.showMetadata || pdfCustomizer.showCustomerDetails) && (
                        <div className="grid grid-cols-2 gap-6 text-[10px] text-slate-700">
                          {pdfCustomizer.showMetadata ? (
                            <div className="space-y-1">
                              <div className="text-[9px] uppercase font-bold text-slate-450">Document Metadata</div>
                              {pdfCustomizer.showInvoiceDate && <div>Issue Date: <span className="font-semibold text-slate-900">{new Date(dc.date).toLocaleDateString()}</span></div>}
                              {pdfCustomizer.showStatus && <div>Status: <span className="font-semibold text-slate-900">{dc.status}</span></div>}
                            </div>
                          ) : <div />}
                          {pdfCustomizer.showCustomerDetails ? (
                            <div className="space-y-1 text-right">
                              <div className="text-[9px] uppercase font-bold text-slate-450">Recipient Details</div>
                              {pdfCustomizer.showCustomerName && <div className="font-semibold text-slate-900">{cust?.name || 'Client Name'}</div>}
                              {pdfCustomizer.showCustomerType && <div>Type: {cust?.customerType || 'INDIVIDUAL'}</div>}
                              {pdfCustomizer.showCustomerTel && cust?.contactNo && <div>Tel: {cust.contactNo}</div>}
                            </div>
                          ) : <div />}
                        </div>
                      )}

                      {/* Addresses Row */}
                      <div className="grid grid-cols-2 gap-6 border-t border-slate-200 pt-4" style={{ textAlign: pdfCustomizer.addressAlign }}>
                        {/* Bill To */}
                        {pdfCustomizer.showBillingAddress && (
                          <div className="text-slate-700 leading-relaxed" style={{ textAlign: pdfCustomizer.addressAlign }}>
                            <span className="text-[9px] uppercase font-bold block mb-1" style={{ color: currentThemeHex }}>Billing Address</span>
                            <strong className="text-slate-900">{cust?.name}</strong><br/>
                            {cust?.billingAddress || 'Billing address pending'}
                            <CustomerTaxBankPdfSection pdfCustomizer={pdfCustomizer} taxBank={taxBank} />
                          </div>
                        )}
                        
                        {/* Ship To */}
                        {pdfCustomizer.showShippingAddress && (
                          <div className="text-slate-700 leading-relaxed text-right" style={{ textAlign: pdfCustomizer.addressAlign === 'left' ? 'left' : pdfCustomizer.addressAlign === 'center' ? 'center' : 'right' }}>
                            <span className="text-[9px] uppercase font-bold block mb-1" style={{ color: currentThemeHex }}>Shipping Destination (Ship To)</span>
                            <strong className="text-slate-900">{cust?.name}</strong><br/>
                            {cust?.shippingAddress || cust?.billingAddress || 'Shipping address pending'}
                          </div>
                        )}
                      </div>

                      {/* Items Table */}
                      <div className="pt-2">
                        <table className="w-full text-left border-collapse" style={{ fontSize: `${pdfCustomizer.bodyFontSize}px` }}>
                          <thead>
                            <tr className="border-b-2 font-bold bg-slate-50" style={{ borderBottomColor: currentThemeHex }}>
                              <th style={{ padding: `${pdfCustomizer.tablePadding}px`, width: `${pdfCustomizer.colWidthProduct}%` }} className="text-slate-800">Description</th>
                              {pdfCustomizer.colProductCode && <th style={{ padding: `${pdfCustomizer.tablePadding}px`, width: `${pdfCustomizer.colWidthCode}%` }}>SKU / Code</th>}
                              <th style={{ padding: `${pdfCustomizer.tablePadding}px`, width: `${pdfCustomizer.colWidthQty}%` }} className="text-right">Quantity</th>
                              {pdfCustomizer.colUnitPrice && <th style={{ padding: `${pdfCustomizer.tablePadding}px`, width: `${pdfCustomizer.colWidthPrice}%` }} className="text-right">Unit Value</th>}
                              <th style={{ padding: `${pdfCustomizer.tablePadding}px`, width: `${pdfCustomizer.colWidthSubtotal}%` }} className="text-right">Total Valuation</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(dc.items || []).map((it: any) => {
                              const prod = products.find(p => p.id === it.productId);
                              const itemSub = it.quantity * (it.price || 0);
                              return (
                                <tr key={it.id || it.productId} className="border-b border-slate-100">
                                  <td style={{ padding: `${pdfCustomizer.tablePadding}px` }} className="font-medium text-slate-900">
                                    {prod?.name || 'Unknown Product'}
                                    {prod?.description && <span className="block text-[8px] text-slate-500 font-normal mt-0.5">{prod.description}</span>}
                                  </td>
                                  {pdfCustomizer.colProductCode && (
                                    <td style={{ padding: `${pdfCustomizer.tablePadding}px` }} className="font-mono text-slate-650">{prod?.sku || 'N/A'}</td>
                                  )}
                                  <td style={{ padding: `${pdfCustomizer.tablePadding}px` }} className="text-right font-mono">{it.quantity} {prod?.uom || 'PCS'}</td>
                                  {pdfCustomizer.colUnitPrice && (
                                    <td style={{ padding: `${pdfCustomizer.tablePadding}px` }} className="text-right font-mono">{currencySymbol}{(it.price || 0).toFixed(2)}</td>
                                  )}
                                  <td style={{ padding: `${pdfCustomizer.tablePadding}px` }} className="text-right font-mono font-semibold text-slate-900">{currencySymbol}{itemSub.toFixed(2)}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* Calculations Table / Summary */}
                      <div className={`flex ${pdfCustomizer.totalsAlign === 'left' ? 'justify-start' : pdfCustomizer.totalsAlign === 'center' ? 'justify-center' : 'justify-end'} pt-2`}>
                        <table className="w-[50%] text-slate-700" style={{ fontSize: `${pdfCustomizer.bodyFontSize}px` }}>
                          <tbody>
                            <tr className="border-t-2 font-extrabold text-[12px]" style={{ color: currentThemeHex, borderTopColor: currentThemeHex }}>
                              <td className="py-2.5 text-left">Total Valuation:</td>
                              <td className="py-2.5 text-right font-mono">
                                {currencySymbol}{(dc.items || []).reduce((sum: number, it: any) => sum + (it.quantity * (it.price || 0)), 0).toFixed(2)}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Footer: Terms Left, Signature Right */}
                    {(pdfCustomizer.showSignature || (pdfCustomizer.showTerms && customNotes)) && (
                      <div
                        className="border-t border-slate-200 pt-4 mt-6 flex justify-between items-start gap-8"
                        style={{
                          borderTopWidth: pdfCustomizer.borderWidth > 0 ? `${pdfCustomizer.borderWidth}px` : '0px',
                          borderColor: (themeColor as string) === '#000000' ? '#ddd' : `${currentThemeHex}40`,
                          paddingBottom: `${pdfCustomizer.footerPadding}px`
                        }}
                      >
                        {/* Left block: Terms & Conditions */}
                        <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                          {pdfCustomizer.showTerms && customNotes && (
                            <div className="text-slate-500 leading-normal" style={{ fontSize: `${pdfCustomizer.bodyFontSize - 1}px` }}>
                              <strong className="block uppercase text-[8.5px] text-slate-700 font-bold mb-1">Terms & Conditions</strong>
                              <div className="whitespace-pre-wrap">{customNotes}</div>
                            </div>
                          )}
                        </div>

                        {/* Right block: Signature Signoff */}
                        {pdfCustomizer.showSignature && (
                          <div className="shrink-0 text-center w-40 flex flex-col items-center">
                            {pdfCustomizer.signatureBase64 ? (
                              <div className="h-12 flex items-center justify-center p-0.5 mb-1 bg-slate-50/50 rounded max-w-full">
                                <img src={pdfCustomizer.signatureBase64} alt="Signature" style={{ maxHeight: `${pdfCustomizer.signatureSize}px`, objectFit: 'contain' }} />
                              </div>
                            ) : (
                              <div className="h-12 w-full border-b border-slate-300 border-dashed mb-1" />
                            )}
                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wide block">{pdfCustomizer.signatureLabel}</span>
                          </div>
                        )}
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
                    setActivePrintInvoice(dc);
                  }}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl border-0 cursor-pointer transition-all shadow-lg shadow-emerald-600/10"
                >
                  Print Challan Directly
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
        const dc = activePrintInvoice;
        const cust = resolveCustomerForPdf(customers, dc.customerId, dc);
        const taxBank = resolveCustomerTaxBank(cust);
        const logoSrc = pdfCustomizer.logoBase64 || companyProfile?.logoUrl;

        return (
          <div
            id="print-section"
            className="hidden print:block fixed inset-0 z-[99999] bg-white text-black p-10"
            style={{
              fontSize: `${pdfCustomizer.bodyFontSize}px`
            }}
          >
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
                  font-size: ${pdfCustomizer.bodyFontSize}px !important;
                }
              }
            `}} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: `${pdfCustomizer.sectionSpacing}px` }}>
              {/* Header */}
              <div
                className="border-b-2"
                style={{
                  borderColor: currentThemeHex,
                  paddingBottom: `${pdfCustomizer.headerPadding}px`,
                  marginBottom: `${pdfCustomizer.sectionSpacing}px`,
                  display: 'flex',
                  flexDirection: pdfCustomizer.headerAlign === 'center' ? 'column' : 'row',
                  alignItems: pdfCustomizer.headerAlign === 'center' ? 'center' : 'flex-start',
                  justifyContent: 'space-between',
                  textAlign: pdfCustomizer.headerAlign
                }}
              >
                <div style={{ textAlign: pdfCustomizer.headerAlign }}>
                  {pdfCustomizer.showLogo && logoSrc && (
                    <img src={logoSrc} alt="Logo" style={{ height: `${pdfCustomizer.logoSize}px`, objectFit: 'contain' }} className="mb-3" />
                  )}
                  <div
                    className="font-extrabold uppercase title-text"
                    style={{
                      color: currentThemeHex,
                      fontSize: `${pdfCustomizer.titleFontSize}px`,
                      textAlign: pdfCustomizer.titleAlign
                    }}
                  >
                    {customTitle}
                  </div>
                  <div className="font-mono text-[10px] text-slate-650 mt-1">Challan No: {dc.challanNo}</div>
                </div>

                {pdfCustomizer.showCompanyDetails && (pdfCustomizer.headerName || companyProfile) && (
                  <div
                    style={{
                      textAlign: pdfCustomizer.headerAlign === 'center' ? 'center' : pdfCustomizer.headerAlign === 'right' ? 'left' : 'right',
                    }}
                    className="text-slate-700 leading-normal max-w-xs whitespace-pre-line"
                  >
                    {pdfCustomizer.headerName ? (
                      <>
                        <div className="font-extrabold text-slate-900" style={{ fontSize: `${pdfCustomizer.headerFontSize}px` }}>{pdfCustomizer.headerName}</div>
                        <div className="text-slate-500 font-medium mt-0.5" style={{ fontSize: `${pdfCustomizer.headerFontSize * 0.7}px` }}>{pdfCustomizer.headerSubtitle}</div>
                      </>
                    ) : companyProfile ? (
                      <>
                        <div className="font-extrabold text-slate-900" style={{ fontSize: `${pdfCustomizer.headerFontSize}px` }}>{companyProfile.name}</div>
                        <div className="text-slate-500 font-medium mt-0.5" style={{ fontSize: `${pdfCustomizer.headerFontSize * 0.7}px` }}>
                          {companyProfile.addressLine1 && `${companyProfile.addressLine1}, `}
                          {companyProfile.addressLine2 && `${companyProfile.addressLine2}, `}<br/>
                          {companyProfile.city && `${companyProfile.city}, `}
                          {companyProfile.state && `${companyProfile.state} - `}
                          {companyProfile.pincode && companyProfile.pincode}<br/>
                          {companyProfile.gstNumber && <strong>GSTIN: {companyProfile.gstNumber}</strong>}
                        </div>
                      </>
                    ) : null}
                  </div>
                )}
              </div>

              {/* Meta */}
              {(pdfCustomizer.showMetadata || pdfCustomizer.showCustomerDetails) && (
                <div className="grid grid-cols-2 gap-6 text-[10px] text-slate-700">
                  {pdfCustomizer.showMetadata ? (
                    <div className="space-y-1">
                      <div className="text-[9px] uppercase font-bold text-slate-455">Document Metadata</div>
                      {pdfCustomizer.showInvoiceDate && <div>Issue Date: <span className="font-semibold text-slate-900">{new Date(dc.date).toLocaleDateString()}</span></div>}
                      {pdfCustomizer.showStatus && <div>Status: <span className="font-semibold text-slate-900">{dc.status}</span></div>}
                    </div>
                  ) : <div />}
                  {pdfCustomizer.showCustomerDetails ? (
                    <div className="space-y-1 text-right">
                      <div className="text-[9px] uppercase font-bold text-slate-455">Recipient Details</div>
                      {pdfCustomizer.showCustomerName && <div className="font-semibold text-slate-900">{cust?.name || 'Client Name'}</div>}
                      {pdfCustomizer.showCustomerType && <div>Type: {cust?.customerType || 'INDIVIDUAL'}</div>}
                      {pdfCustomizer.showCustomerTel && cust?.contactNo && <div>Tel: {cust.contactNo}</div>}
                    </div>
                  ) : <div />}
                </div>
              )}

              {/* Addresses Row */}
              <div className="grid grid-cols-2 gap-6 border-t border-slate-200 pt-4" style={{ textAlign: pdfCustomizer.addressAlign }}>
                {pdfCustomizer.showBillingAddress && (
                  <div className="text-slate-700 leading-relaxed" style={{ textAlign: pdfCustomizer.addressAlign }}>
                    <span className="text-[9px] uppercase font-bold block mb-1" style={{ color: currentThemeHex }}>Billing Address</span>
                    <strong className="text-slate-900">{cust?.name}</strong><br/>
                    {cust?.billingAddress || 'Billing address pending'}
                    <CustomerTaxBankPdfSection pdfCustomizer={pdfCustomizer} taxBank={taxBank} />
                  </div>
                )}
                
                {pdfCustomizer.showShippingAddress && (
                  <div className="text-slate-700 leading-relaxed text-right" style={{ textAlign: pdfCustomizer.addressAlign === 'left' ? 'left' : pdfCustomizer.addressAlign === 'center' ? 'center' : 'right' }}>
                    <span className="text-[9px] uppercase font-bold block mb-1" style={{ color: currentThemeHex }}>Shipping Destination (Ship To)</span>
                    <strong className="text-slate-900">{cust?.name}</strong><br/>
                    {cust?.shippingAddress || cust?.billingAddress || 'Shipping address pending'}
                  </div>
                )}
              </div>

              {/* Items Table */}
              <div className="pt-2">
                <table className="w-full text-left border-collapse" style={{ fontSize: `${pdfCustomizer.bodyFontSize}px` }}>
                  <thead>
                    <tr className="border-b-2 font-bold bg-slate-50" style={{ borderBottomColor: currentThemeHex }}>
                      <th style={{ padding: `${pdfCustomizer.tablePadding}px`, width: `${pdfCustomizer.colWidthProduct}%` }} className="text-slate-800">Description</th>
                      {pdfCustomizer.colProductCode && <th style={{ padding: `${pdfCustomizer.tablePadding}px`, width: `${pdfCustomizer.colWidthCode}%` }}>SKU / Code</th>}
                      <th style={{ padding: `${pdfCustomizer.tablePadding}px`, width: `${pdfCustomizer.colWidthQty}%` }} className="text-right">Quantity</th>
                      {pdfCustomizer.colUnitPrice && <th style={{ padding: `${pdfCustomizer.tablePadding}px`, width: `${pdfCustomizer.colWidthPrice}%` }} className="text-right">Unit Value</th>}
                      <th style={{ padding: `${pdfCustomizer.tablePadding}px`, width: `${pdfCustomizer.colWidthSubtotal}%` }} className="text-right">Total Valuation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(dc.items || []).map((it: any) => {
                      const prod = products.find(p => p.id === it.productId);
                      const itemSub = it.quantity * (it.price || 0);
                      return (
                        <tr key={it.id || it.productId} className="border-b border-slate-100">
                          <td style={{ padding: `${pdfCustomizer.tablePadding}px` }} className="font-medium text-slate-900">
                            {prod?.name || 'Unknown Product'}
                            {prod?.description && <span className="block text-[8px] text-slate-500 font-normal mt-0.5">{prod.description}</span>}
                          </td>
                          {pdfCustomizer.colProductCode && (
                            <td style={{ padding: `${pdfCustomizer.tablePadding}px` }} className="font-mono text-slate-650">{prod?.sku || 'N/A'}</td>
                          )}
                          <td style={{ padding: `${pdfCustomizer.tablePadding}px` }} className="text-right font-mono">{it.quantity} {prod?.uom || 'PCS'}</td>
                          {pdfCustomizer.colUnitPrice && (
                            <td style={{ padding: `${pdfCustomizer.tablePadding}px` }} className="text-right font-mono">{currencySymbol}{(it.price || 0).toFixed(2)}</td>
                          )}
                          <td style={{ padding: `${pdfCustomizer.tablePadding}px` }} className="text-right font-mono font-semibold text-slate-900">{currencySymbol}{itemSub.toFixed(2)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Calculations Table */}
              <div className={`flex ${pdfCustomizer.totalsAlign === 'left' ? 'justify-start' : pdfCustomizer.totalsAlign === 'center' ? 'justify-center' : 'justify-end'} pt-2`}>
                <table className="w-[50%] text-slate-700" style={{ fontSize: `${pdfCustomizer.bodyFontSize}px` }}>
                  <tbody>
                    <tr className="border-t-2 font-extrabold text-[12px]" style={{ color: currentThemeHex, borderTopColor: currentThemeHex }}>
                      <td className="py-2.5 text-left">Total Valuation:</td>
                      <td className="py-2.5 text-right font-mono">
                        {currencySymbol}{(dc.items || []).reduce((sum: number, it: any) => sum + (it.quantity * (it.price || 0)), 0).toFixed(2)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Footer: Terms Left, Signature Right */}
            {(pdfCustomizer.showSignature || (pdfCustomizer.showTerms && customNotes)) && (
              <div
                className="border-t border-slate-200 pt-4 mt-6 flex justify-between items-start gap-8"
                style={{
                  borderTopWidth: pdfCustomizer.borderWidth > 0 ? `${pdfCustomizer.borderWidth}px` : '0px',
                  borderColor: (themeColor as string) === '#000000' ? '#ddd' : `${currentThemeHex}40`,
                  paddingBottom: `${pdfCustomizer.footerPadding}px`
                }}
              >
                {/* Left block: Terms & Conditions */}
                <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                  {pdfCustomizer.showTerms && customNotes && (
                    <div className="text-slate-550 leading-normal" style={{ fontSize: `${pdfCustomizer.bodyFontSize - 1}px` }}>
                      <strong className="block uppercase text-[8.5px] text-slate-700 font-bold mb-1">Terms & Conditions</strong>
                      <div className="whitespace-pre-wrap">{customNotes}</div>
                    </div>
                  )}
                </div>

                {/* Right block: Signature Signoff */}
                {pdfCustomizer.showSignature && (
                  <div className="shrink-0 text-center w-40 flex flex-col items-center">
                    {pdfCustomizer.signatureBase64 ? (
                      <div className="h-12 flex items-center justify-center p-0.5 mb-1 bg-slate-50/50 rounded max-w-full">
                        <img src={pdfCustomizer.signatureBase64} alt="Signature" style={{ maxHeight: `${pdfCustomizer.signatureSize}px`, objectFit: 'contain' }} />
                      </div>
                    ) : (
                      <div className="h-12 w-full border-b border-slate-300 border-dashed mb-1" />
                    )}
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wide block">{pdfCustomizer.signatureLabel}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}
