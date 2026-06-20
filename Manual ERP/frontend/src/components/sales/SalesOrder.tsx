import React, { useState } from 'react';
import { ShoppingCart, Search, Plus, Edit, Trash2, X, AlertCircle, DollarSign, Calendar, Tag, Layers, CheckCircle2, Download, MessageSquare, Mail, Loader2 } from 'lucide-react';
import { apiClient } from '../../utils/apiService';
import { useQuery } from '@tanstack/react-query';
import { CreateSalesOrderBodySchema } from '../../utils/schemas';
import CustomerTaxBankPdfSection from './CustomerTaxBankPdfSection';
import WhatsappShareModal from './WhatsappShareModal';
import EmailShareModal from './EmailShareModal';
import {
  DEFAULT_PDF_CUSTOMIZER,
  mergePdfCustomizerFromTemplate,
  parseTemplatesFromApi,
  pickDefaultTemplate,
  resolveCustomerForPdf,
  resolveCustomerTaxBank,
} from '../../utils/pdfDocumentUtils';

interface SalesOrderProps {
  orders: any[];
  customers: any[];
  products: any[];
  onCreateOrder: (order: any) => Promise<void>;
  onUpdateOrder: (id: string, order: any) => Promise<void>;
  onDeleteOrder: (id: string) => Promise<void>;
  currencySymbol?: string;
  exchangeRates?: Record<string, number>;
  companyCurrencyId?: string;
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
  currencySymbol: currencySymbolProp = '$',
  exchangeRates = {},
  companyCurrencyId = 'USD'
}: SalesOrderProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

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
  const [deliveryDate, setDeliveryDate] = useState('');
  const [discount, setDiscount] = useState('0.00');
  const [discountType, setDiscountType] = useState<'PERCENTAGE' | 'AMOUNT'>('PERCENTAGE');
  const [status, setStatus] = useState('PENDING');

  const [items, setItems] = useState<OrderItemInput[]>([]);
  const [localErr, setLocalErr] = useState<string | null>(null);
  const [localSuccess, setLocalSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // States for print templates, company details, and preview customization
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [customizingOrder, setCustomizingOrder] = useState<any>(null);
  const [activePrintOrder, setActivePrintOrder] = useState<any>(null);
  const [whatsappShareData, setWhatsappShareData] = useState<any>(null);
  const [emailShareData, setEmailShareData] = useState<any>(null);
  const [pdfGeneratingInv, setPdfGeneratingInv] = useState<any>(null);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [sharingLoadingId, setSharingLoadingId] = useState<string | null>(null);

  const { data: profileData } = useQuery({ queryKey: ['companyProfile'], queryFn: () => apiClient.get<any>('/api/admin/company/profile') });
  const companyProfile = profileData?.company || null;

  const { data: bankData } = useQuery({ queryKey: ['bankAccounts'], queryFn: () => apiClient.get<{ bankAccounts: any[] }>('/api/finance/bank-accounts') });
  const bankAccounts = bankData?.bankAccounts || [];

  const { data: templatesData } = useQuery({ queryKey: ['templates', 'SALES_ORDER'], queryFn: () => apiClient.get<{ templates: any[] }>('/api/sales/templates?docType=SALES_ORDER') });
  const templates = React.useMemo(
    () => parseTemplatesFromApi(templatesData?.templates || []),
    [templatesData]
  );
  const [customTitle, setCustomTitle] = useState('Sales Order');
  const [customNotes, setCustomNotes] = useState('All orders are subject to final acceptance. Thank you!');
  const [pdfCustomizer, setPdfCustomizer] = useState({ ...DEFAULT_PDF_CUSTOMIZER });
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



  const applyTemplateSettings = (tpl: any) => {
    setCustomTitle(tpl.title || 'Sales Order');
    setCustomNotes(tpl.terms || '');
    setThemeColor(tpl.themeColor || 'indigo');
    setPdfCustomizer(mergePdfCustomizerFromTemplate(tpl));
  };

  React.useEffect(() => {
    if (!customizingOrder || templates.length === 0) return;
    const defaultTpl = pickDefaultTemplate(templates);
    if (defaultTpl) {
      setSelectedTemplateId(defaultTpl.id);
      applyTemplateSettings(defaultTpl);
    }
  }, [customizingOrder, templates]);

  React.useEffect(() => {
    if (activePrintOrder) {
      const timer = setTimeout(() => {
        window.print();
        setActivePrintOrder(null);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [activePrintOrder]);

  const openAddModal = () => {
    const defaultCustId = customers[0]?.id || '';
    setCustomerId(defaultCustId);
    setDeliveryDate('');
    setDiscount('0.00');
    setDiscountType('PERCENTAGE');
    setStatus('PENDING');

    const defaultCust = customers.find(c => c.id === defaultCustId);
    const targetCurrency = getCurrencyCodeFromSymbol(defaultCust?.currencySymbol || '$');
    const basePrice = products[0]?.pricing || 0;
    const converted = convertAmount(basePrice, companyCurrencyId, targetCurrency);

    setItems([{ productId: products[0]?.id || '', quantity: '1', price: String(Number(converted.toFixed(2))), deliveryDate: '', discount: '0.00' }]);
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
    setDiscountType((order.discountType as any) || 'PERCENTAGE');
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
    const basePrice = products[0]?.pricing || 0;
    const targetCurrency = getCurrencyCodeFromSymbol(currencySymbol);
    const converted = convertAmount(basePrice, companyCurrencyId, targetCurrency);
    setItems([...items, { productId: products[0]?.id || '', quantity: '1', price: String(Number(converted.toFixed(2))), deliveryDate: '', discount: '0.00' }]);
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
        const basePrice = selectedProd.pricing || 0;
        const targetCurrency = getCurrencyCodeFromSymbol(currencySymbol);
        const converted = convertAmount(basePrice, companyCurrencyId, targetCurrency);
        updated[index].price = String(Number(converted.toFixed(2)));
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
      discount: discountType === 'AMOUNT' ? (parseFloat(discount) || 0) : (parseFloat(discount) || 0.0),
      discountType,
      status,
      items: items.map(item => ({
        productId: item.productId,
        quantity: parseFloat(item.quantity) || 1.0,
        price: parseFloat(item.price) || 0.0,
        deliveryDate: item.deliveryDate || null,
        discount: parseFloat(item.discount) || 0.0
      }))
    };

    const parsed = CreateSalesOrderBodySchema.safeParse(payload);
    if (!parsed.success) {
      setLocalErr("Validation error: " + parsed.error.issues[0].message);
      setLoading(false);
      return;
    }

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

  const getCustomerName = (id: string) => (customers || []).find(c => c?.id === id)?.name || 'colleague';
  const getProductName = (id: string) => (products || []).find(p => p?.id === id)?.name || 'Item';

  const calculateTotal = (order: any) => {
    const subtotal = (order?.items || []).reduce((acc: number, item: any) => {
      const itemSub = (item?.quantity || 0) * (item?.price || 0);
      const itemDiscPercent = item?.discount || 0;
      const itemDiscVal = itemSub * (itemDiscPercent / 100);
      return acc + (itemSub - itemDiscVal);
    }, 0);
    const overallDiscPercent = order?.discount || 0;
    const overallDiscVal = order?.discountType === 'AMOUNT' ? (order?.discount || 0) : subtotal * (overallDiscPercent / 100);
    return Math.max(0, subtotal - overallDiscVal);
  };

  const filtered = (orders || []).filter(o => {
    const orderNo = o?.orderNo || '';
    const customerName = getCustomerName(o?.customerId || '');
    const status = o?.status || '';
    const term = (searchTerm || '').toLowerCase();
    return orderNo.toLowerCase().includes(term) ||
      customerName.toLowerCase().includes(term) ||
      status.toLowerCase().includes(term);
  });

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
            {filtered.map(order => {
              const orderCustomer = customers.find(c => c.id === order.customerId);
              const orderCurrencySymbol = orderCustomer?.currencySymbol || currencySymbolProp;
              return (
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
                      <span className="font-bold mr-0.5">{orderCurrencySymbol}</span> {calculateTotal(order).toLocaleString(undefined, { minimumFractionDigits: 2 })}
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
                        onClick={() => setCustomizingOrder(order)}
                        className="px-2 py-1 bg-emerald-600/10 hover:bg-emerald-600 text-emerald-400 hover:text-white rounded transition-all cursor-pointer border-0 bg-transparent flex items-center gap-1 text-[9px] uppercase font-bold"
                      >
                        <Download className="w-3 h-3" /> PDF
                      </button>
                      <button
                        type="button"
                        disabled={sharingLoadingId === order.id}
                        onClick={async () => {
                          setSharingLoadingId(order.id);
                          let base64 = '';
                          try {
                            let currentSettings = { ...DEFAULT_PDF_CUSTOMIZER };
                            let customTitleVal = 'Sales Order';
                            let customNotesVal = 'All orders are subject to final acceptance. Thank you!';
                            let themeColorVal = 'indigo';

                            const savedSettings = order.templateSettings ? JSON.parse(order.templateSettings) : null;
                            if (savedSettings) {
                              currentSettings = { ...DEFAULT_PDF_CUSTOMIZER, ...savedSettings };
                              customTitleVal = savedSettings.title || 'Sales Order';
                              customNotesVal = savedSettings.terms || '';
                              themeColorVal = savedSettings.themeColor || 'indigo';
                            } else if (templates.length > 0) {
                              const defaultTpl = pickDefaultTemplate(templates);
                              if (defaultTpl) {
                                currentSettings = mergePdfCustomizerFromTemplate(defaultTpl);
                                customTitleVal = defaultTpl.title || 'Sales Order';
                                customNotesVal = defaultTpl.terms || '';
                                themeColorVal = defaultTpl.themeColor || 'indigo';
                              }
                            }

                            setPdfGeneratingInv({
                              order,
                              pdfCustomizer: currentSettings,
                              customTitle: customTitleVal,
                              customNotes: customNotesVal,
                              themeColor: themeColorVal
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
                            setPdfGeneratingInv(null);
                            setSharingLoadingId(null);
                          }

                          const custObj = customers.find(c => c.id === order.customerId);
                          setEmailShareData({
                            recipientEmail: custObj?.email || '',
                            subject: `Sales Order ${order.orderNo} from ERP Console`,
                            body: `Dear ${custObj?.name || 'Client'},\n\nPlease find details for Sales Order ${order.orderNo}.\n\nOrder Date: ${new Date(order.date).toLocaleDateString()}\nTotal Amount: ${custObj?.currencySymbol || currencySymbolProp}${order.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}\n\nThank you for doing business with us!`,
                            pdfBase64: base64,
                            pdfFilename: `Order_${order.orderNo}.pdf`
                          });
                        }}
                        className="px-2 py-1 bg-indigo-600/10 hover:bg-indigo-600 text-indigo-400 hover:text-white rounded transition-all cursor-pointer border-0 bg-transparent flex items-center gap-1 text-[9px] uppercase font-bold"
                        title="Email PDF to Customer"
                      >
                        {sharingLoadingId === order.id ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Sending...
                          </>
                        ) : (
                          <>
                            <Mail className="w-3 h-3" /> Email
                          </>
                        )}
                      </button>
                      {(() => {
                        const features = JSON.parse(localStorage.getItem('erp_company_features') || '[]');
                        const showWhatsappBtn = features.includes('ADMIN_WHATSAPP');
                        if (!showWhatsappBtn) return null;
                        return (
                          <button
                            type="button"
                            disabled={sharingLoadingId === order.id}
                            onClick={async () => {
                              setSharingLoadingId(order.id);
                              let base64 = '';
                              try {
                                let currentSettings = { ...DEFAULT_PDF_CUSTOMIZER };
                                let customTitleVal = 'Sales Order';
                                let customNotesVal = 'All orders are subject to final acceptance. Thank you!';
                                let themeColorVal = 'indigo';

                                const savedSettings = order.templateSettings ? JSON.parse(order.templateSettings) : null;
                                if (savedSettings) {
                                  currentSettings = { ...DEFAULT_PDF_CUSTOMIZER, ...savedSettings };
                                  customTitleVal = savedSettings.title || 'Sales Order';
                                  customNotesVal = savedSettings.terms || '';
                                  themeColorVal = savedSettings.themeColor || 'indigo';
                                } else if (templates.length > 0) {
                                  const defaultTpl = pickDefaultTemplate(templates);
                                  if (defaultTpl) {
                                    currentSettings = mergePdfCustomizerFromTemplate(defaultTpl);
                                    customTitleVal = defaultTpl.title || 'Sales Order';
                                    customNotesVal = defaultTpl.terms || '';
                                    themeColorVal = defaultTpl.themeColor || 'indigo';
                                  }
                                }

                                setPdfGeneratingInv({
                                  order,
                                  pdfCustomizer: currentSettings,
                                  customTitle: customTitleVal,
                                  customNotes: customNotesVal,
                                  themeColor: themeColorVal
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
                                setPdfGeneratingInv(null);
                                setSharingLoadingId(null);
                              }

                              const custObj = customers.find(c => c.id === order.customerId);
                              setWhatsappShareData({
                                documentId: order.id,
                                documentType: 'SALES_ORDER',
                                documentNumber: order.orderNo,
                                customerName: custObj?.name || '',
                                customerCode: custObj?.id || '',
                                contactNo: custObj?.contactNo || '',
                                amount: order.total,
                                date: order.date,
                                currencySymbol: custObj?.currencySymbol || currencySymbolProp,
                                pdfBase64: base64,
                                pdfFilename: `Order_${order.orderNo}.pdf`
                              });
                            }}
                            className="px-2 py-1 bg-emerald-600/10 hover:bg-emerald-600 text-emerald-400 hover:text-white rounded transition-all cursor-pointer border-0 bg-transparent flex items-center gap-1 text-[9px] uppercase font-bold"
                            title="Share via WhatsApp"
                          >
                            {sharingLoadingId === order.id ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Preparing...
                              </>
                            ) : (
                              <>
                                <MessageSquare className="w-3 h-3" /> Share
                              </>
                            )}
                          </button>
                        );
                      })()}
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
              );
            })}
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
                  onChange={e => {
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
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider uppercase">Overall Order Discount ({discountType === 'PERCENTAGE' ? '%' : currencySymbol})</label>
                  <div className="flex rounded-lg overflow-hidden border border-[var(--border-primary)]">
                    <button type="button" onClick={() => setDiscountType('PERCENTAGE')} className={`px-2 py-0.5 text-[8px] font-bold border-0 cursor-pointer transition-all ${discountType === 'PERCENTAGE' ? 'bg-indigo-600 text-white' : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)]'}`}>%</button>
                    <button type="button" onClick={() => setDiscountType('AMOUNT')} className={`px-2 py-0.5 text-[8px] font-bold border-0 cursor-pointer transition-all ${discountType === 'AMOUNT' ? 'bg-indigo-600 text-white' : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)]'}`}>{currencySymbol}</button>
                  </div>
                </div>
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
                            <option key={p.id} value={p.id}>{p.name} ({currencySymbolProp}{p.pricing || 0})</option>
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

      {/* ==========================================
          MODAL: PDF TEMPLATE CUSTOMIZER & PRINT HUB
          ========================================== */}
      {customizingOrder && (() => {
        const order = customizingOrder;
        const cust = resolveCustomerForPdf(customers, order.customerId, order);
        const taxBank = resolveCustomerTaxBank(cust, order);
        const currencySymbol = cust?.currencySymbol || currencySymbolProp;
        
        const sub = (order?.items || []).reduce((acc: number, item: any) => {
          const itemSub = (item?.quantity || 0) * (item?.price || 0);
          const itemDiscPercent = item?.discount || 0;
          const itemDiscVal = itemSub * (itemDiscPercent / 100);
          return acc + (itemSub - itemDiscVal);
        }, 0);
        const discountVal = order.discountType === 'AMOUNT' ? (order.discount || 0) : sub * ((order.discount || 0) / 100);
        const isInternational = cust?.clientClassification === 'INTERNATIONAL';
        const isSameState = companyProfile && cust?.state === companyProfile.state;
        const taxPct = isInternational ? 0.0 : 18.0;
        const taxVal = isInternational ? 0.0 : (sub - discountVal) * (taxPct / 100);
        const totalVal = (sub - discountVal) + taxVal;

        return (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in text-left">
            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl w-full max-w-5xl h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-scale-up">
              {/* Header */}
              <div className="flex items-center justify-between p-5 border-b border-[var(--border-color)] shrink-0">
                <div>
                  <h3 className="font-bold text-base text-[var(--text-primary)]">Custom Print Template Studio</h3>
                  <p className="text-[var(--text-secondary)] text-[10px]">Toggle order columns, sections, headers, and click print to trigger a direct print stream.</p>
                </div>
                <button
                  onClick={() => setCustomizingOrder(null)}
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
                    <label className="text-[9px] font-bold text-slate-450 uppercase block mb-1">Select Print Template *</label>
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
                  <div className="w-[210mm] min-h-[297mm] bg-white text-black p-10 shadow-2xl text-[11px] relative flex flex-col justify-between font-sans leading-relaxed select-text">
                    <div className="space-y-6">
                      {/* Document Header */}
                      <div className="flex justify-between items-start border-b-2 pb-5" style={{ borderColor: currentThemeHex }}>
                        <div>
                          {pdfCustomizer.showLogo && companyProfile?.logoUrl && (
                            <img src={companyProfile.logoUrl} alt="Logo" className="max-h-12 object-contain mb-3" />
                          )}
                          <div className="text-xl font-extrabold uppercase" style={{ color: currentThemeHex }}>{customTitle}</div>
                          <div className="font-mono text-[10px] text-slate-650 mt-1">Order No: {order.orderNo}</div>
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
                          <div className="text-[9px] uppercase font-bold text-slate-450">Order Metadata</div>
                          <div>Order Date: <span className="font-semibold text-slate-900">{new Date(order.orderDate).toLocaleDateString()}</span></div>
                          <div>Expected Delivery: <span className="font-semibold text-slate-900">{order.deliveryDate ? new Date(order.deliveryDate).toLocaleDateString() : 'Immediate'}</span></div>
                          <div>Status: <span className="font-semibold text-slate-900">{order.status}</span></div>
                        </div>
                        <div className="space-y-1 text-right">
                          <div className="text-[9px] uppercase font-bold text-slate-450">Customer Classification</div>
                          <div className="font-semibold text-slate-900">{order.customerName || cust?.name || 'Client Name'}</div>
                          <div>Type: {cust?.customerType || 'INDIVIDUAL'}</div>
                          <div>Category: {cust?.customerGroup || 'Standard Group'}</div>
                          {(order.customerContactNo || cust?.contactNo) && <div>Tel: {order.customerContactNo || cust?.contactNo}</div>}
                        </div>
                      </div>

                      {/* Addresses Row */}
                      <div className="grid grid-cols-2 gap-6 border-t border-slate-200 pt-4">
                        {/* Bill To */}
                        {pdfCustomizer.showBillingAddress && (
                          <div className="text-[10px] text-slate-700 leading-relaxed">
                            <span className="text-[9px] uppercase font-bold block mb-1" style={{ color: currentThemeHex }}>Billing Address</span>
                            <strong className="text-slate-900">{order.customerName || cust?.name || 'Client Name'}</strong><br/>
                            {order.billingAddress || cust?.billingAddress || 'Billing address pending'}
                            <CustomerTaxBankPdfSection pdfCustomizer={pdfCustomizer} taxBank={taxBank} />
                          </div>
                        )}
                        
                        {/* Ship To */}
                        {pdfCustomizer.showShippingAddress && (
                          <div className="text-[10px] text-slate-700 leading-relaxed text-right">
                            <span className="text-[9px] uppercase font-bold block mb-1" style={{ color: currentThemeHex }}>Shipping Address</span>
                            <strong className="text-slate-900">{order.shippingName || order.customerName || cust?.name || 'Client Name'}</strong><br/>
                            {order.shippingAddress || cust?.shippingAddress || order.billingAddress || cust?.billingAddress || 'Shipping address pending'}
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
                            {(order.items || []).map((it: any) => {
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
                                    <td className="py-2.5 px-2 text-right font-mono">{currencySymbol}{it.price.toFixed(2)}</td>
                                  )}
                                  {pdfCustomizer.colDiscount && (
                                    <td className="py-2.5 px-2 text-right font-mono">{it.discount || 0}%</td>
                                  )}
                                  <td className="py-2.5 px-2 text-right font-mono font-semibold text-slate-900">{currencySymbol}{(itemSub - itemDisc).toFixed(2)}</td>
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
                              <td className="py-1.5 text-right font-mono text-slate-900">{currencySymbol}{sub.toFixed(2)}</td>
                            </tr>
                            {order.discount > 0 && (
                              <tr className="border-b border-slate-100">
                                <td className="py-1.5 text-left text-red-500">Discount ({order.discountType === 'AMOUNT' ? currencySymbol : `${order.discount}%`}):</td>
                                <td className="py-1.5 text-right font-mono text-red-500">-{currencySymbol}{discountVal.toFixed(2)}</td>
                              </tr>
                            )}

                            {/* Tax split layout */}
                            {pdfCustomizer.colTax && (
                              <>
                                {isInternational ? (
                                  <tr className="border-b border-slate-100">
                                    <td className="py-1.5 text-left italic">Zero-rated Export (0%):</td>
                                    <td className="py-1.5 text-right font-mono text-slate-900">{currencySymbol}0.00</td>
                                  </tr>
                                ) : isSameState ? (
                                  <>
                                    <tr className="border-b border-slate-100">
                                      <td className="py-1.5 text-left">CGST (9.0%):</td>
                                      <td className="py-1.5 text-right font-mono text-slate-900">{currencySymbol}{(taxVal / 2).toFixed(2)}</td>
                                    </tr>
                                    <tr className="border-b border-slate-100">
                                      <td className="py-1.5 text-left">SGST (9.0%):</td>
                                      <td className="py-1.5 text-right font-mono text-slate-900">{currencySymbol}{(taxVal / 2).toFixed(2)}</td>
                                    </tr>
                                  </>
                                ) : (
                                  <tr className="border-b border-slate-100">
                                    <td className="py-1.5 text-left">IGST (18.0%):</td>
                                    <td className="py-1.5 text-right font-mono text-slate-900">{currencySymbol}{taxVal.toFixed(2)}</td>
                                  </tr>
                                )}
                              </>
                            )}

                            {!pdfCustomizer.colTax && (
                              <tr className="border-b border-slate-100">
                                <td className="py-1.5 text-left">Sales Tax / GST (18%):</td>
                                <td className="py-1.5 text-right font-mono text-slate-900">{currencySymbol}{taxVal.toFixed(2)}</td>
                              </tr>
                            )}

                            <tr className="border-t-2 font-extrabold text-[12px]" style={{ color: currentThemeHex, borderTopColor: currentThemeHex }}>
                              <td className="py-2.5 text-left">Grand Total:</td>
                              <td className="py-2.5 text-right font-mono">{currencySymbol}{totalVal.toFixed(2)}</td>
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
                      <div className="border-t border-slate-200 pt-4 mt-12 text-[9px] text-slate-550 text-center leading-normal whitespace-pre-line">
                        {customNotes}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              {/* Footer Buttons */}
              <div className="p-4 border-t border-[var(--border-color)] shrink-0 flex justify-end gap-3 bg-slate-950/20">
                <button
                  disabled={pdfBusy}
                  onClick={() => setCustomizingOrder(null)}
                  className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-350 font-bold text-xs rounded-xl border-0 cursor-pointer transition-all"
                >
                  Cancel
                </button>
                <button
                  disabled={pdfBusy}
                  onClick={async () => {
                    const settingsToSave = {
                      title: customTitle,
                      terms: customNotes,
                      themeColor: themeColor,
                      ...pdfCustomizer
                    };
                    try {
                      await onUpdateOrder(order.id, {
                        templateSettings: JSON.stringify(settingsToSave)
                      });
                      order.templateSettings = JSON.stringify(settingsToSave);
                    } catch (e) {
                      console.error("Failed to save template settings to sales order:", e);
                    }
                    setActivePrintOrder(order);
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
      {activePrintOrder && (() => {
        const order = activePrintOrder;
        const cust = resolveCustomerForPdf(customers, order.customerId, order);
        const taxBank = resolveCustomerTaxBank(cust, order);
        const currencySymbol = cust?.currencySymbol || currencySymbolProp;
        
        const sub = (order?.items || []).reduce((acc: number, item: any) => {
          const itemSub = (item?.quantity || 0) * (item?.price || 0);
          const itemDiscPercent = item?.discount || 0;
          const itemDiscVal = itemSub * (itemDiscPercent / 100);
          return acc + (itemSub - itemDiscVal);
        }, 0);
        const discountVal = order.discountType === 'AMOUNT' ? (order.discount || 0) : sub * ((order.discount || 0) / 100);
        const isInternational = cust?.clientClassification === 'INTERNATIONAL';
        const isSameState = companyProfile && cust?.state === companyProfile.state;
        const taxPct = isInternational ? 0.0 : 18.0;
        const taxVal = isInternational ? 0.0 : (sub - discountVal) * (taxPct / 100);
        const totalVal = (sub - discountVal) + taxVal;

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
                  <div className="font-mono text-[10px] text-slate-650 mt-1">Order No: {order.orderNo}</div>
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
                  <div className="text-[9px] uppercase font-bold text-slate-450">Order Metadata</div>
                  <div>Order Date: <span className="font-semibold text-slate-900">{new Date(order.orderDate).toLocaleDateString()}</span></div>
                  <div>Expected Delivery: <span className="font-semibold text-slate-900">{order.deliveryDate ? new Date(order.deliveryDate).toLocaleDateString() : 'Immediate'}</span></div>
                  <div>Status: <span className="font-semibold text-slate-900">{order.status}</span></div>
                </div>
                <div className="space-y-1 text-right">
                  <div className="text-[9px] uppercase font-bold text-slate-455">Customer Classification</div>
                  <div className="font-semibold text-slate-900">{order.customerName || cust?.name || 'Client Name'}</div>
                  <div>Type: {cust?.customerType || 'INDIVIDUAL'}</div>
                  <div>Category: {cust?.customerGroup || 'Standard Group'}</div>
                  {(order.customerContactNo || cust?.contactNo) && <div>Tel: {order.customerContactNo || cust?.contactNo}</div>}
                </div>
              </div>

              {/* Addresses Row */}
              <div className="grid grid-cols-2 gap-6 border-t border-slate-200 pt-4">
                {pdfCustomizer.showBillingAddress && (
                  <div className="text-[10px] text-slate-700 leading-relaxed">
                    <span className="text-[9px] uppercase font-bold block mb-1" style={{ color: currentThemeHex }}>Billing Address</span>
                    <strong className="text-slate-900">{order.customerName || cust?.name || 'Client Name'}</strong><br/>
                    {order.billingAddress || cust?.billingAddress || 'Billing address pending'}
                    <CustomerTaxBankPdfSection pdfCustomizer={pdfCustomizer} taxBank={taxBank} />
                  </div>
                )}
                
                {pdfCustomizer.showShippingAddress && (
                  <div className="text-[10px] text-slate-700 leading-relaxed text-right">
                    <span className="text-[9px] uppercase font-bold block mb-1" style={{ color: currentThemeHex }}>Shipping Address</span>
                    <strong className="text-slate-900">{order.shippingName || order.customerName || cust?.name || 'Client Name'}</strong><br/>
                    {order.shippingAddress || cust?.shippingAddress || order.billingAddress || cust?.billingAddress || 'Shipping address pending'}
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
                    {(order.items || []).map((it: any) => {
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
                            <td className="py-2.5 px-2 text-right font-mono">{currencySymbol}{it.price.toFixed(2)}</td>
                          )}
                          {pdfCustomizer.colDiscount && (
                            <td className="py-2.5 px-2 text-right font-mono">{it.discount || 0}%</td>
                          )}
                          <td className="py-2.5 px-2 text-right font-mono font-semibold text-slate-900">{currencySymbol}{(itemSub - itemDisc).toFixed(2)}</td>
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
                      <td className="py-1.5 text-right font-mono text-slate-900">{currencySymbol}{sub.toFixed(2)}</td>
                    </tr>
                    {order.discount > 0 && (
                      <tr className="border-b border-slate-100">
                        <td className="py-1.5 text-left text-red-500">Discount ({order.discountType === 'AMOUNT' ? currencySymbol : `${order.discount}%`}):</td>
                        <td className="py-1.5 text-right font-mono text-red-550">-{currencySymbol}{discountVal.toFixed(2)}</td>
                      </tr>
                    )}

                    {pdfCustomizer.colTax && (
                      <>
                        {isInternational ? (
                          <tr className="border-b border-slate-100">
                            <td className="py-1.5 text-left italic">Zero-rated Export (0%):</td>
                            <td className="py-1.5 text-right font-mono text-slate-900">{currencySymbol}0.00</td>
                          </tr>
                        ) : isSameState ? (
                          <>
                            <tr className="border-b border-slate-100">
                              <td className="py-1.5 text-left">CGST (9.0%):</td>
                              <td className="py-1.5 text-right font-mono text-slate-900">{currencySymbol}{(taxVal / 2).toFixed(2)}</td>
                            </tr>
                            <tr className="border-b border-slate-100">
                              <td className="py-1.5 text-left">SGST (9.0%):</td>
                              <td className="py-1.5 text-right font-mono text-slate-900">{currencySymbol}{(taxVal / 2).toFixed(2)}</td>
                            </tr>
                          </>
                        ) : (
                          <tr className="border-b border-slate-100">
                            <td className="py-1.5 text-left">IGST (18.0%):</td>
                            <td className="py-1.5 text-right font-mono text-slate-900">{currencySymbol}{taxVal.toFixed(2)}</td>
                          </tr>
                        )}
                      </>
                    )}

                    {!pdfCustomizer.colTax && (
                      <tr className="border-b border-slate-100">
                        <td className="py-1.5 text-left">Sales Tax / GST (18%):</td>
                        <td className="py-1.5 text-right font-mono text-slate-900">{currencySymbol}{taxVal.toFixed(2)}</td>
                      </tr>
                    )}

                    <tr className="border-t-2 font-extrabold text-[12px]" style={{ color: currentThemeHex, borderTopColor: currentThemeHex }}>
                      <td className="py-2.5 text-left">Grand Total:</td>
                      <td className="py-2.5 text-right font-mono">{currencySymbol}{totalVal.toFixed(2)}</td>
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
              <div className="border-t border-slate-200 pt-4 mt-12 text-[9px] text-slate-550 text-center leading-normal whitespace-pre-line">
                {customNotes}
              </div>
            )}
          </div>
        );
      })()}

      {pdfGeneratingInv && (() => {
        const order = pdfGeneratingInv.order;
        const pdfCustomizer = pdfGeneratingInv.pdfCustomizer;
        const customTitle = pdfGeneratingInv.customTitle;
        const customNotes = pdfGeneratingInv.customNotes;
        const themeColor = pdfGeneratingInv.themeColor;
        const cust = resolveCustomerForPdf(customers, order.customerId, order);
        const taxBank = resolveCustomerTaxBank(cust, order);
        const currencySymbol = cust?.currencySymbol || currencySymbolProp;
        const currentThemeHex = getThemeHex(themeColor);
        
        const sub = (order?.items || []).reduce((acc: number, item: any) => {
          return acc + (item.quantity * item.price);
        }, 0);
        const discountVal = order.discountType === 'AMOUNT' ? (order.discount || 0) : sub * ((order.discount || 0) / 100);
        const taxableAmount = sub - discountVal;
        const taxRate = taxableAmount > 0 ? (order.tax / taxableAmount) * 100 : 0.0;
        
        const taxVal = order.tax || 0;
        const totalVal = order.total || (taxableAmount + taxVal);

        return (
          <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
            <div
              id="pdf-email-render-pane"
              className="bg-white text-black p-10 animate-fade-in"
              style={{
                width: '210mm',
                minHeight: '297mm',
                boxSizing: 'border-box',
                fontFamily: 'sans-serif',
                fontSize: `${pdfCustomizer.bodyFontSize}px`
              }}
            >
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
                  <div>
                    {pdfCustomizer.showLogo && companyProfile?.logoUrl && (
                      <img src={companyProfile.logoUrl} alt="Logo" className="max-h-12 object-contain mb-3" />
                    )}
                    <div className="text-xl font-extrabold uppercase" style={{ color: currentThemeHex }}>{customTitle}</div>
                    <div className="font-mono text-[10px] text-slate-650 mt-1">Order No: {order.orderNo}</div>
                  </div>

                  {pdfCustomizer.showCompanyDetails && companyProfile && (
                    <div
                      style={{
                        textAlign: pdfCustomizer.headerAlign === 'center' ? 'center' : pdfCustomizer.headerAlign === 'right' ? 'left' : 'right',
                        fontSize: `${pdfCustomizer.bodyFontSize}px`
                      }}
                      className="text-slate-700 leading-normal max-w-xs whitespace-pre-line"
                    >
                      <div className="font-extrabold text-slate-900" style={{ fontSize: `${pdfCustomizer.headerFontSize}px` }}>{companyProfile.name}</div>
                      <div className="text-slate-500 font-medium mt-0.5" style={{ fontSize: `${pdfCustomizer.headerFontSize * 0.7}px` }}>
                        {companyProfile.addressLine1 && `${companyProfile.addressLine1}, `}
                        {companyProfile.addressLine2 && `${companyProfile.addressLine2}, `}<br/>
                        {companyProfile.city && `${companyProfile.city}, `}
                        {companyProfile.state && `${companyProfile.state} - `}
                        {companyProfile.pincode && companyProfile.pincode}<br/>
                        {companyProfile.gstNumber && <strong>GSTIN: {companyProfile.gstNumber}</strong>}
                      </div>
                    </div>
                  )}
                </div>

                {/* Meta */}
                {pdfCustomizer.showMetadata && (
                  <div className="grid grid-cols-2 gap-6 text-[10px] text-slate-700" style={{ fontSize: `${pdfCustomizer.bodyFontSize - 0.5}px` }}>
                    <div className="space-y-1">
                      <div className="text-[9px] uppercase font-bold text-slate-455">Order Metadata</div>
                      <div>Document Date: <span className="font-semibold text-slate-900">{new Date(order.date).toLocaleDateString()}</span></div>
                      <div>Delivery Expected: <span className="font-semibold text-slate-900">{order.deliveryDate ? new Date(order.deliveryDate).toLocaleDateString() : 'Immediate'}</span></div>
                      <div>Status: <span className="font-semibold text-slate-900">{order.status}</span></div>
                    </div>
                    <div className="space-y-1 text-right">
                      <div className="text-[9px] uppercase font-bold text-slate-455">Customer Details</div>
                      <div className="font-semibold text-slate-900">{cust?.name || 'Client Name'}</div>
                      <div>Type: {cust?.customerType || 'INDIVIDUAL'}</div>
                      <div>Category: {cust?.customerGroup || 'Standard Group'}</div>
                    </div>
                  </div>
                )}

                {/* Addresses Row */}
                <div className="grid grid-cols-2 gap-6 border-t border-slate-200 pt-4" style={{ textAlign: pdfCustomizer.addressAlign }}>
                  {pdfCustomizer.showBillingAddress && (
                    <div className="text-slate-700 leading-relaxed" style={{ textAlign: pdfCustomizer.addressAlign }}>
                      <span className="text-[9px] uppercase font-bold block mb-1" style={{ color: currentThemeHex }}>Billing Destination (Bill To)</span>
                      <strong className="text-slate-900">{cust?.name || 'Client Name'}</strong><br/>
                      {order.billingAddress || cust?.billingAddress || 'Billing address pending'}
                      <CustomerTaxBankPdfSection pdfCustomizer={pdfCustomizer} taxBank={taxBank} />
                    </div>
                  )}
                  {pdfCustomizer.showShippingAddress && (
                    <div className="text-slate-700 leading-relaxed text-right" style={{ textAlign: pdfCustomizer.addressAlign === 'left' ? 'left' : pdfCustomizer.addressAlign === 'center' ? 'center' : 'right' }}>
                      <span className="text-[9px] uppercase font-bold block mb-1" style={{ color: currentThemeHex }}>Shipping Destination (Ship To)</span>
                      <strong className="text-slate-900">{order.shippingName || cust?.name}</strong><br/>
                      {order.shippingAddress || cust?.shippingAddress || order.billingAddress || cust?.billingAddress || 'Shipping address pending'}<br/>
                      {order.shippingState && <span>State: {order.shippingState}</span>}
                    </div>
                  )}
                </div>

                {/* Items Table */}
                <div className="pt-2">
                  <table
                    className="w-full text-left border-collapse"
                    style={{
                      fontSize: `${pdfCustomizer.bodyFontSize}px`,
                      borderWidth: pdfCustomizer.borderWidth > 0 ? `${pdfCustomizer.borderWidth}px` : '0px',
                      borderStyle: 'solid',
                      borderColor: (currentThemeHex as string) === '#000000' ? '#ddd' : currentThemeHex
                    }}
                  >
                    <thead>
                      <tr className="border-b-2 font-bold bg-slate-50" style={{ borderBottomColor: currentThemeHex, borderBottomWidth: `${pdfCustomizer.borderWidth}px` }}>
                        <th style={{ padding: `${pdfCustomizer.tablePadding}px`, width: `${pdfCustomizer.colWidthProduct}%` }} className="text-slate-800">Description</th>
                        {pdfCustomizer.colProductCode && <th style={{ padding: `${pdfCustomizer.tablePadding}px`, width: `${pdfCustomizer.colWidthCode}%` }}>SKU / Code</th>}
                        <th style={{ padding: `${pdfCustomizer.tablePadding}px`, width: `${pdfCustomizer.colWidthQty}%` }} className="text-right">Qty</th>
                        {pdfCustomizer.colUnitPrice && <th style={{ padding: `${pdfCustomizer.tablePadding}px`, width: `${pdfCustomizer.colWidthPrice}%` }} className="text-right">Price</th>}
                        {pdfCustomizer.colDiscount && <th style={{ padding: `${pdfCustomizer.tablePadding}px`, width: `${pdfCustomizer.colWidthDiscount}%` }} className="text-right">Discount</th>}
                        <th style={{ padding: `${pdfCustomizer.tablePadding}px`, width: `${pdfCustomizer.colWidthSubtotal}%` }} className="text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(order.items || []).map((it: any) => {
                        const prod = products.find(p => p.id === it.productId);
                        const itemSub = it.quantity * it.price;
                        const itemDisc = itemSub * ((it.discount || 0) / 100);
                        return (
                          <tr key={it.id} className="border-b border-slate-100">
                            <td style={{ padding: `${pdfCustomizer.tablePadding}px` }} className="font-medium text-slate-900">
                              {prod?.name || 'Item'}
                            </td>
                            {pdfCustomizer.colProductCode && (
                              <td style={{ padding: `${pdfCustomizer.tablePadding}px` }} className="font-mono text-slate-650">{prod?.sku || 'N/A'}</td>
                            )}
                            <td style={{ padding: `${pdfCustomizer.tablePadding}px` }} className="text-right font-mono">{it.quantity} {prod?.uom || 'PCS'}</td>
                            {pdfCustomizer.colUnitPrice && (
                              <td style={{ padding: `${pdfCustomizer.tablePadding}px` }} className="text-right font-mono">{currencySymbol}{it.price.toFixed(2)}</td>
                            )}
                            {pdfCustomizer.colDiscount && (
                              <td style={{ padding: `${pdfCustomizer.tablePadding}px` }} className="text-right font-mono">{it.discount || 0}%</td>
                            )}
                            <td style={{ padding: `${pdfCustomizer.tablePadding}px` }} className="text-right font-mono font-semibold text-slate-900">{currencySymbol}{(itemSub - itemDisc).toFixed(2)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Totals */}
                <div className={`flex ${pdfCustomizer.totalsAlign === 'left' ? 'justify-start' : pdfCustomizer.totalsAlign === 'center' ? 'justify-center' : 'justify-end'} pt-2`}>
                  <table className="w-[50%] text-slate-700" style={{ fontSize: `${pdfCustomizer.bodyFontSize}px` }}>
                    <tbody>
                      <tr className="border-b border-slate-100">
                        <td className="py-1 px-2 font-medium">Subtotal</td>
                        <td className="py-1 px-2 text-right font-semibold text-slate-900">{currencySymbol}{sub.toFixed(2)}</td>
                      </tr>
                      {discountVal > 0 && (
                        <tr className="border-b border-slate-100 text-emerald-600">
                          <td className="py-1 px-2 font-medium">Discount</td>
                          <td className="py-1 px-2 text-right font-semibold">-{currencySymbol}{discountVal.toFixed(2)}</td>
                        </tr>
                      )}
                      {pdfCustomizer.colTax && (
                        <tr className="border-b border-slate-100 text-slate-650">
                          <td className="py-1 px-2 font-medium">Estimated Tax (GST {taxRate.toFixed(1)}%)</td>
                          <td className="py-1 px-2 text-right font-semibold">{currencySymbol}{taxVal.toFixed(2)}</td>
                        </tr>
                      )}
                      <tr className="font-bold text-[12px] bg-slate-50" style={{ color: currentThemeHex }}>
                        <td className="py-2 px-2">Estimated Grand Total</td>
                        <td className="py-2 px-2 text-right">{currencySymbol}{totalVal.toFixed(2)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Bank Details */}
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

                {/* Footer Terms */}
                {pdfCustomizer.showTerms && (
                  <div className="border-t border-slate-200 pt-4 mt-12 text-[9px] text-slate-550 text-center leading-normal whitespace-pre-line">
                    {customNotes}
                  </div>
                )}
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
    </div>
  );
}
