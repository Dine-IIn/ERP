import React, { useState, useEffect } from 'react';
import { FileText, Plus, Trash2, Palette, Eye, Check, AlignLeft, AlignCenter, AlignRight, Upload, X } from 'lucide-react';
import { apiClient } from '../../utils/apiService';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CreateDocumentTemplateBodySchema, UpdateDocumentTemplateBodySchema } from '../../utils/schemas';

export interface PdfTemplateConfig {
  id: string;
  name: string;
  type: 'INVOICE' | 'PROFORMA' | 'CHALLAN' | 'SALES_ORDER' | 'PURCHASE_ORDER';
  title: string;
  headerName: string;
  headerSubtitle: string;
  terms: string;
  themeColor: string; // 'indigo' | 'emerald' | 'rose' | 'amber' | 'slate'
  showLogo: boolean;
  showCompanyDetails: boolean;
  showBillingAddress: boolean;
  showShippingAddress: boolean;
  showBankDetails: boolean;
  showTerms: boolean;
  colProductCode: boolean;
  colUnitPrice: boolean;
  colDiscount: boolean;
  colTax: boolean;
  isDefault?: boolean;
  showMetadata?: boolean;
  showCustomerDetails?: boolean;
  showInvoiceDate?: boolean;
  showDueDate?: boolean;
  showStatus?: boolean;
  showCustomerName?: boolean;
  showCustomerType?: boolean;
  showCustomerCategory?: boolean;
  showCustomerTel?: boolean;
  showPaymentTerms?: boolean;
  showCustomerBankDetails?: boolean;
  showCustomerGSTNumber?: boolean;
  showCustomerPANNumber?: boolean;
  showAmountInWords?: boolean;
  showTaxableAmount?: boolean;
  showTaxBreakup?: boolean;
  // Advanced styling overrides:
  logoBase64?: string | null;
  headerAlign?: 'left' | 'center' | 'right';
  titleAlign?: 'left' | 'center' | 'right';
  addressAlign?: 'left' | 'center' | 'right';
  totalsAlign?: 'left' | 'center' | 'right';
  termsAlign?: 'left' | 'center' | 'right';
  headerFontSize?: number;
  titleFontSize?: number;
  bodyFontSize?: number;
  headerPadding?: number;
  sectionSpacing?: number;
  logoSize?: number;
  // Spacing & Width overrides
  tablePadding?: number;
  colWidthProduct?: number;
  colWidthCode?: number;
  colWidthQty?: number;
  colWidthPrice?: number;
  colWidthDiscount?: number;
  colWidthSubtotal?: number;
  // Signature block overrides
  showSignature?: boolean;
  signatureBase64?: string | null;
  signatureLabel?: string;
  signatureSize?: number;
  borderWidth?: number;
  footerPadding?: number;
}

export default function PdfTemplateEditor() {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string>('');

  // Form states
  const [name, setName] = useState('');
  const [type, setType] = useState<'INVOICE' | 'PROFORMA' | 'CHALLAN' | 'SALES_ORDER' | 'PURCHASE_ORDER'>('INVOICE');
  const [title, setTitle] = useState('');
  const [headerName, setHeaderName] = useState('');
  const [headerSubtitle, setHeaderSubtitle] = useState('');
  const [terms, setTerms] = useState('');
  const [themeColor, setThemeColor] = useState('indigo');
  const [showLogo, setShowLogo] = useState(true);
  const [showCompanyDetails, setShowCompanyDetails] = useState(true);
  const [showBillingAddress, setShowBillingAddress] = useState(true);
  const [showShippingAddress, setShowShippingAddress] = useState(true);
  const [showBankDetails, setShowBankDetails] = useState(true);
  const [showTerms, setShowTerms] = useState(true);
  const [colProductCode, setColProductCode] = useState(true);
  const [colUnitPrice, setColUnitPrice] = useState(true);
  const [colDiscount, setColDiscount] = useState(true);
  const [colTax, setColTax] = useState(true);
  const [isDefault, setIsDefault] = useState(false);
  const [showMetadata, setShowMetadata] = useState(true);
  const [showCustomerDetails, setShowCustomerDetails] = useState(true);
  const [showInvoiceDate, setShowInvoiceDate] = useState(true);
  const [showDueDate, setShowDueDate] = useState(true);
  const [showStatus, setShowStatus] = useState(true);
  const [showCustomerName, setShowCustomerName] = useState(true);
  const [showCustomerType, setShowCustomerType] = useState(true);
  const [showCustomerCategory, setShowCustomerCategory] = useState(true);
  const [showCustomerTel, setShowCustomerTel] = useState(true);
  const [showPaymentTerms, setShowPaymentTerms] = useState(true);
  const [showCustomerBankDetails, setShowCustomerBankDetails] = useState(true);
  const [showCustomerGSTNumber, setShowCustomerGSTNumber] = useState(true);
  const [showCustomerPANNumber, setShowCustomerPANNumber] = useState(true);
  const [showAmountInWords, setShowAmountInWords] = useState(true);
  const [showTaxableAmount, setShowTaxableAmount] = useState(true);
  const [showTaxBreakup, setShowTaxBreakup] = useState(true);

  // New styling form states
  const [logoBase64, setLogoBase64] = useState<string | null>(null);
  const [headerAlign, setHeaderAlign] = useState<'left' | 'center' | 'right'>('left');
  const [titleAlign, setTitleAlign] = useState<'left' | 'center' | 'right'>('left');
  const [addressAlign, setAddressAlign] = useState<'left' | 'center' | 'right'>('left');
  const [totalsAlign, setTotalsAlign] = useState<'left' | 'center' | 'right'>('right');
  const [termsAlign, setTermsAlign] = useState<'left' | 'center' | 'right'>('center');
  const [headerFontSize, setHeaderFontSize] = useState<number>(14);
  const [titleFontSize, setTitleFontSize] = useState<number>(16);
  const [bodyFontSize, setBodyFontSize] = useState<number>(10);
  const [headerPadding, setHeaderPadding] = useState<number>(16);
  const [sectionSpacing, setSectionSpacing] = useState<number>(24);
  const [logoSize, setLogoSize] = useState<number>(48);

  // Spacing & Width overrides states
  const [tablePadding, setTablePadding] = useState<number>(8);
  const [colWidthProduct, setColWidthProduct] = useState<number>(40);
  const [colWidthCode, setColWidthCode] = useState<number>(15);
  const [colWidthQty, setColWidthQty] = useState<number>(10);
  const [colWidthPrice, setColWidthPrice] = useState<number>(15);
  const [colWidthDiscount, setColWidthDiscount] = useState<number>(10);
  const [colWidthSubtotal, setColWidthSubtotal] = useState<number>(10);

  // Signature block overrides states
  const [showSignature, setShowSignature] = useState(true);
  const [signatureBase64, setSignatureBase64] = useState<string | null>(null);
  const [signatureLabel, setSignatureLabel] = useState('Authorized Signatory');
  const [signatureSize, setSignatureSize] = useState<number>(45);
  const [borderWidth, setBorderWidth] = useState<number>(1);
  const [footerPadding, setFooterPadding] = useState<number>(16);

  const [hasInitialLoaded, setHasInitialLoaded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [localSuccess, setLocalSuccess] = useState<string | null>(null);

  const { data: res, isLoading: loading } = useQuery({
    queryKey: ['templates'],
    queryFn: () => apiClient.get<{ templates: any[] }>('/api/sales/templates')
  });

  const templates = React.useMemo(() => {
    return (res?.templates || []).map((t: any) => {
      let settingsParsed: any = {};
      try {
        settingsParsed = typeof t.settings === 'string' ? JSON.parse(t.settings) : t.settings;
      } catch (e) {
        console.error(e);
      }
      return {
        id: t.id,
        name: t.name,
        type: t.docType as any,
        title: t.title,
        isDefault: t.isDefault,
        terms: t.terms || '',
        ...settingsParsed
      } as PdfTemplateConfig;
    });
  }, [res]);

  useEffect(() => {
    if (!loading && !hasInitialLoaded) {
      if (templates.length > 0) {
        loadTemplate(templates[0]);
      } else {
        handleCreateNew();
      }
      setHasInitialLoaded(true);
    }
  }, [templates, loading, hasInitialLoaded]);

  const loadTemplate = (tpl: PdfTemplateConfig) => {
    setSelectedId(tpl.id);
    setName(tpl.name);
    setType(tpl.type);
    setTitle(tpl.title);
    setHeaderName(tpl.headerName || '');
    setHeaderSubtitle(tpl.headerSubtitle || '');
    setTerms(tpl.terms || '');
    setThemeColor(tpl.themeColor || 'indigo');
    setShowLogo(tpl.showLogo ?? true);
    setShowCompanyDetails(tpl.showCompanyDetails ?? true);
    setShowBillingAddress(tpl.showBillingAddress ?? true);
    setShowShippingAddress(tpl.showShippingAddress ?? true);
    setShowBankDetails(tpl.showBankDetails ?? true);
    setShowTerms(tpl.showTerms ?? true);
    setColProductCode(tpl.colProductCode ?? true);
    setColUnitPrice(tpl.colUnitPrice ?? true);
    setColDiscount(tpl.colDiscount ?? true);
    setColTax(tpl.colTax ?? true);
    setIsDefault(tpl.isDefault ?? false);
    setShowMetadata(tpl.showMetadata ?? true);
    setShowCustomerDetails(tpl.showCustomerDetails ?? true);
    setShowInvoiceDate(tpl.showInvoiceDate ?? true);
    setShowDueDate(tpl.showDueDate ?? true);
    setShowStatus(tpl.showStatus ?? true);
    setShowCustomerName(tpl.showCustomerName ?? true);
    setShowCustomerType(tpl.showCustomerType ?? true);
    setShowCustomerCategory(tpl.showCustomerCategory ?? true);
    setShowCustomerTel(tpl.showCustomerTel ?? true);
    setShowPaymentTerms(tpl.showPaymentTerms ?? true);
    setShowCustomerBankDetails(tpl.showCustomerBankDetails ?? true);
    setShowCustomerGSTNumber(tpl.showCustomerGSTNumber ?? true);
    setShowCustomerPANNumber(tpl.showCustomerPANNumber ?? true);
    setShowAmountInWords(tpl.showAmountInWords ?? true);
    setShowTaxableAmount(tpl.showTaxableAmount ?? true);
    setShowTaxBreakup(tpl.showTaxBreakup ?? true);
    setIsEditing(true);

    // Load styling config fields
    setLogoBase64(tpl.logoBase64 || null);
    setHeaderAlign(tpl.headerAlign || 'left');
    setTitleAlign(tpl.titleAlign || 'left');
    setAddressAlign(tpl.addressAlign || 'left');
    setTotalsAlign(tpl.totalsAlign || 'right');
    setTermsAlign(tpl.termsAlign || 'center');
    setHeaderFontSize(tpl.headerFontSize || 14);
    setTitleFontSize(tpl.titleFontSize || 16);
    setBodyFontSize(tpl.bodyFontSize || 10);
    setHeaderPadding(tpl.headerPadding || 16);
    setSectionSpacing(tpl.sectionSpacing || 24);
    setLogoSize(tpl.logoSize || 48);

    // Load spacing & widths
    setTablePadding(tpl.tablePadding ?? 8);
    setColWidthProduct(tpl.colWidthProduct ?? 40);
    setColWidthCode(tpl.colWidthCode ?? 15);
    setColWidthQty(tpl.colWidthQty ?? 10);
    setColWidthPrice(tpl.colWidthPrice ?? 15);
    setColWidthDiscount(tpl.colWidthDiscount ?? 10);
    setColWidthSubtotal(tpl.colWidthSubtotal ?? 10);

    // Load signature
    setShowSignature(tpl.showSignature ?? true);
    setSignatureBase64(tpl.signatureBase64 || null);
    setSignatureLabel(tpl.signatureLabel || 'Authorized Signatory');
    setSignatureSize(tpl.signatureSize || 45);
    setBorderWidth(tpl.borderWidth ?? 1);
    setFooterPadding(tpl.footerPadding ?? 16);
  };

  const handleCreateNew = () => {
    setSelectedId('');
    setName('New Custom Print Template');
    setType('INVOICE');
    setTitle('TAX INVOICE');
    setHeaderName('ANB INDUSTRIES PRIVATE LIMITED');
    setHeaderSubtitle('Corporate Office Address & Details');
    setTerms('1. Goods once sold will not be taken back.\n2. Payment terms: Net 30 days from dispatch.\n3. All disputes subject to local jurisdiction.');
    setThemeColor('indigo');
    setShowLogo(true);
    setShowCompanyDetails(true);
    setShowBillingAddress(true);
    setShowShippingAddress(true);
    setShowBankDetails(true);
    setShowTerms(true);
    setColProductCode(true);
    setColUnitPrice(true);
    setColDiscount(true);
    setColTax(true);
    setShowMetadata(true);
    setShowCustomerDetails(true);
    setShowInvoiceDate(true);
    setShowDueDate(true);
    setShowStatus(true);
    setShowCustomerName(true);
    setShowCustomerBankDetails(true);
    setShowCustomerGSTNumber(true);
    setShowCustomerPANNumber(true);
    setShowAmountInWords(true);
    setShowTaxableAmount(true);
    setShowTaxBreakup(true);
    setShowCustomerType(true);
    setShowCustomerCategory(true);
    setShowCustomerTel(true);
    setShowPaymentTerms(true);
    setIsEditing(false);

    // Reset layout fields to default values
    setLogoBase64(null);
    setHeaderAlign('left');
    setTitleAlign('left');
    setAddressAlign('left');
    setTotalsAlign('right');
    setTermsAlign('center');
    setHeaderFontSize(14);
    setTitleFontSize(16);
    setBodyFontSize(10);
    setHeaderPadding(16);
    setSectionSpacing(24);
    setLogoSize(48);

    // Reset spacing & widths
    setTablePadding(8);
    setColWidthProduct(40);
    setColWidthCode(15);
    setColWidthQty(10);
    setColWidthPrice(15);
    setColWidthDiscount(10);
    setColWidthSubtotal(10);

    // Reset signature
    setShowSignature(true);
    setSignatureBase64(null);
    setSignatureLabel('Authorized Signatory');
    setSignatureSize(45);
    setBorderWidth(1);
    setFooterPadding(16);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 200 * 1024) {
      alert("Image is too large! Please upload a file smaller than 200 KB to optimize template storage.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setLogoBase64(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 150 * 1024) {
      alert("Signature image is too large! Please upload a file smaller than 150 KB.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setSignatureBase64(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const createMutation = useMutation({
    mutationFn: (payload: any) => apiClient.post<{ template: any }>('/api/sales/templates', payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      setLocalSuccess("New template layout configured and saved successfully!");
      setTimeout(() => setLocalSuccess(null), 2500);
      setSelectedId(data.template.id);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: any) => apiClient.patch(`/api/sales/templates/${id}`, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      setLocalSuccess("Template layout configured and saved successfully!");
      setTimeout(() => setLocalSuccess(null), 2500);
      setSelectedId(variables.id);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/sales/templates/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      setHasInitialLoaded(false);
      setSelectedId('');
      setIsEditing(false);
    }
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalSuccess(null);

    const settings = {
      headerName: headerName.trim(),
      headerSubtitle: headerSubtitle.trim(),
      themeColor,
      showLogo,
      showCompanyDetails,
      showBillingAddress,
      showShippingAddress,
      showBankDetails,
      showTerms,
      colProductCode,
      colUnitPrice,
      colDiscount,
      colTax,
      showMetadata,
      showCustomerDetails,
      showInvoiceDate,
      showDueDate,
      showStatus,
      showCustomerName,
      showCustomerType,
      showCustomerCategory,
      showCustomerTel,
      showPaymentTerms,
      showCustomerBankDetails,
      showCustomerGSTNumber,
      showCustomerPANNumber,
      showAmountInWords,
      showTaxableAmount,
      showTaxBreakup,
      // Advanced styling parameters
      logoBase64,
      headerAlign,
      titleAlign,
      addressAlign,
      totalsAlign,
      termsAlign,
      headerFontSize,
      titleFontSize,
      bodyFontSize,
      headerPadding,
      sectionSpacing,
      logoSize,
      // Spacing & width overrides
      tablePadding,
      colWidthProduct,
      colWidthCode,
      colWidthQty,
      colWidthPrice,
      colWidthDiscount,
      colWidthSubtotal,
      // Signature overrides
      showSignature,
      signatureBase64,
      signatureLabel,
      signatureSize,
      borderWidth,
      footerPadding,
    };

    const payload = {
      name: name.trim() || 'Unnamed Template',
      docType: type,
      title: title.trim() || 'INVOICE',
      isDefault,
      settings,
      terms: terms.trim()
    };

    const schema = selectedId ? UpdateDocumentTemplateBodySchema : CreateDocumentTemplateBodySchema;
    const parsed = schema.safeParse(payload);
    if (!parsed.success) {
      alert("Validation error: " + parsed.error.issues[0].message);
      return;
    }

    if (selectedId) {
      updateMutation.mutate({ id: selectedId, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleDelete = async (idToDelete: string) => {
    if (window.confirm("Are you sure you want to permanently delete this print template layout?")) {
      deleteMutation.mutate(idToDelete);
    }
  };

  // Theme helper
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

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-900/40 p-6 rounded-2xl border border-slate-800/80 backdrop-blur-xl">
        <div className="text-left">
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <FileText className="w-5.5 h-5.5 text-indigo-400" />
            PDF Print Layout Studio
          </h2>
          <p className="text-slate-400 text-xs mt-1">
            Create, brand, and configure custom document templates for Sales Invoices, Proformas, and Delivery Challans.
          </p>
        </div>
        <button
          onClick={handleCreateNew}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 active:scale-95 transition-all text-white font-semibold rounded-xl border-0 cursor-pointer shadow-lg shrink-0"
        >
          <Plus className="w-4 h-4" />
          Create Layout Template
        </button>
      </div>

      {loading && templates.length === 0 ? (
        <div className="text-center py-12 text-slate-400 text-xs">Loading document layout settings...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left column: Templates List & Settings Editor (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Templates list card */}
            <div className="bg-slate-900/35 border border-slate-800/80 rounded-2xl p-5 space-y-3.5 backdrop-blur-md">
              <span className="text-[10px] font-extrabold text-indigo-400 uppercase tracking-widest block text-left">Saved Print Templates</span>
              <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
                {templates.map(t => (
                  <div
                    key={t.id}
                    onClick={() => loadTemplate(t)}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                      selectedId === t.id
                        ? 'bg-indigo-600/10 border-indigo-500/40 text-white'
                        : 'bg-slate-950/40 border-slate-850/60 text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <FileText className={`w-4 h-4 ${t.themeColor === 'amber' ? 'text-amber-400' : t.themeColor === 'emerald' ? 'text-emerald-400' : t.themeColor === 'rose' ? 'text-rose-400' : 'text-indigo-400'}`} />
                      <div className="text-left">
                        <div className="text-xs font-bold flex items-center gap-1.5">
                          {t.name}
                          {t.isDefault && (
                            <span className="px-1.5 py-0.25 rounded text-[8px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 uppercase font-bold tracking-wider scale-90">
                              Default
                            </span>
                          )}
                        </div>
                        <div className="text-[9px] uppercase tracking-wider text-slate-500 font-bold mt-0.5">{t.type}</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleDelete(t.id); }}
                      className="p-1 hover:bg-slate-800 text-slate-500 hover:text-rose-400 rounded-lg cursor-pointer bg-transparent border-0"
                      title="Delete layout template"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {templates.length === 0 && (
                  <div className="text-center py-6 text-slate-500 text-xs italic">No templates created. Click above to create one.</div>
                )}
              </div>
            </div>

            {/* Configuration Settings Editor */}
            <div className="bg-slate-900/35 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-md">
              <span className="text-[10px] font-extrabold text-indigo-400 uppercase tracking-widest block border-b border-slate-850 pb-2 mb-4 text-left">Template Parameters</span>
              
              {localSuccess && (
                <div className="mb-4 flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/25 rounded-xl text-emerald-400 text-xs">
                  <Check className="w-4.5 h-4.5" />
                  <span>{localSuccess}</span>
                </div>
              )}

              <form onSubmit={handleSave} className="space-y-4 text-left">
                {/* Template Name */}
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-450 uppercase tracking-wider">Template Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-indigo-500/60 rounded-xl text-white outline-none text-xs"
                    placeholder="e.g. Amber Proforma Compact"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Doc Type */}
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-455 uppercase tracking-wider">Template Type</label>
                    <select
                      value={type}
                      onChange={e => setType(e.target.value as any)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-indigo-500/60 rounded-xl text-white outline-none text-xs cursor-pointer"
                    >
                      <option value="INVOICE">INVOICE</option>
                      <option value="PROFORMA">PROFORMA</option>
                      <option value="CHALLAN">CHALLAN</option>
                      <option value="SALES_ORDER">SALES ORDER</option>
                      <option value="PURCHASE_ORDER">PURCHASE ORDER</option>
                    </select>
                  </div>

                  {/* Print Title */}
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-455 uppercase tracking-wider">Document Title</label>
                    <input
                      type="text"
                      required
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-indigo-500/60 rounded-xl text-white outline-none text-xs"
                      placeholder="e.g. TAX INVOICE"
                    />
                  </div>
                </div>

                {/* Default checkbox */}
                <div className="flex items-center gap-2 py-1">
                  <input
                    type="checkbox"
                    id="isDefault"
                    checked={isDefault}
                    onChange={e => setIsDefault(e.target.checked)}
                    className="accent-indigo-500 w-4 h-4 cursor-pointer"
                  />
                  <label htmlFor="isDefault" className="text-[11px] font-bold text-slate-350 cursor-pointer select-none">
                    Set as Default Layout for this document type
                  </label>
                </div>

                {/* Header Company Details */}
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-455 uppercase tracking-wider">Corporate Header Name</label>
                  <input
                    type="text"
                    required
                    value={headerName}
                    onChange={e => setHeaderName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-indigo-500/60 rounded-xl text-white outline-none text-xs font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-455 uppercase tracking-wider">Corporate Header Subtitle</label>
                  <input
                    type="text"
                    value={headerSubtitle}
                    onChange={e => setHeaderSubtitle(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-indigo-500/60 rounded-xl text-white outline-none text-xs"
                    placeholder="e.g. Factory Office Address & Contact details"
                  />
                </div>

                {/* Color Theme Selector */}
                <div className="space-y-2">
                  <label className="text-[9px] font-bold text-slate-455 uppercase tracking-wider flex items-center gap-1">
                    <Palette className="w-3.5 h-3.5" /> Branding Theme Color
                  </label>
                  <div className="flex gap-2">
                    {['indigo', 'emerald', 'rose', 'amber', 'slate'].map(color => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setThemeColor(color)}
                        style={{ backgroundColor: getThemeHex(color) }}
                        className={`w-6 h-6 rounded-full border-2 cursor-pointer transition-all active:scale-90 ${
                          themeColor === color ? 'border-white ring-2 ring-indigo-500/30' : 'border-slate-900 hover:border-slate-700'
                        }`}
                        title={color}
                      />
                    ))}
                  </div>
                </div>

                {/* Layout Blocks Checklist */}
                <div className="space-y-2 border-t border-slate-850 pt-3">
                  <span className="text-[9px] font-bold text-slate-450 uppercase block tracking-wider">Layout Blocks</span>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <label className="flex items-center gap-2 text-slate-350 cursor-pointer select-none">
                      <input type="checkbox" checked={showLogo} onChange={e => setShowLogo(e.target.checked)} className="accent-indigo-500" />
                      Corporate Logo
                    </label>
                    <label className="flex items-center gap-2 text-slate-350 cursor-pointer select-none">
                      <input type="checkbox" checked={showCompanyDetails} onChange={e => setShowCompanyDetails(e.target.checked)} className="accent-indigo-500" />
                      Company details
                    </label>
                    <label className="flex items-center gap-2 text-slate-350 cursor-pointer select-none">
                      <input type="checkbox" checked={showBillingAddress} onChange={e => setShowBillingAddress(e.target.checked)} className="accent-indigo-500" />
                      Billing Address
                    </label>
                    <label className="flex items-center gap-2 text-slate-350 cursor-pointer select-none">
                      <input type="checkbox" checked={showShippingAddress} onChange={e => setShowShippingAddress(e.target.checked)} className="accent-indigo-500" />
                      Shipping Address
                    </label>
                    <label className="flex items-center gap-2 text-slate-350 cursor-pointer select-none">
                      <input type="checkbox" checked={showBankDetails} onChange={e => setShowBankDetails(e.target.checked)} className="accent-indigo-500" />
                      Bank Payout Details
                    </label>
                    <label className="flex items-center gap-2 text-slate-350 cursor-pointer select-none">
                      <input type="checkbox" checked={showTerms} onChange={e => setShowTerms(e.target.checked)} className="accent-indigo-500" />
                      Terms block
                    </label>
                    <label className="flex items-center gap-2 text-slate-350 cursor-pointer select-none">
                      <input type="checkbox" checked={showMetadata} onChange={e => setShowMetadata(e.target.checked)} className="accent-indigo-500" />
                      Document Metadata
                    </label>
                    <label className="flex items-center gap-2 text-slate-350 cursor-pointer select-none">
                      <input type="checkbox" checked={showCustomerDetails} onChange={e => setShowCustomerDetails(e.target.checked)} className="accent-indigo-500" />
                      Customer Details
                    </label>
                  </div>
                </div>

                {/* Metadata Fields Checklist */}
                <div className="space-y-2 border-t border-slate-850 pt-3">
                  <span className="text-[9px] font-bold text-slate-450 uppercase block tracking-wider">Metadata Fields Visibility</span>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <label className="flex items-center gap-2 text-slate-350 cursor-pointer select-none">
                      <input type="checkbox" checked={showInvoiceDate} onChange={e => setShowInvoiceDate(e.target.checked)} className="accent-indigo-500" />
                      Invoice/Issue Date
                    </label>
                    <label className="flex items-center gap-2 text-slate-350 cursor-pointer select-none">
                      <input type="checkbox" checked={showDueDate} onChange={e => setShowDueDate(e.target.checked)} className="accent-indigo-500" />
                      Due/Expiry Date
                    </label>
                    <label className="flex items-center gap-2 text-slate-350 cursor-pointer select-none">
                      <input type="checkbox" checked={showStatus} onChange={e => setShowStatus(e.target.checked)} className="accent-indigo-500" />
                      Status
                    </label>
                    <label className="flex items-center gap-2 text-slate-350 cursor-pointer select-none">
                      <input type="checkbox" checked={showCustomerName} onChange={e => setShowCustomerName(e.target.checked)} className="accent-indigo-500" />
                      Customer (Name)
                    </label>
                    <label className="flex items-center gap-2 text-slate-350 cursor-pointer select-none">
                      <input type="checkbox" checked={showCustomerType} onChange={e => setShowCustomerType(e.target.checked)} className="accent-indigo-500" />
                      Customer Type
                    </label>
                    <label className="flex items-center gap-2 text-slate-350 cursor-pointer select-none">
                      <input type="checkbox" checked={showCustomerCategory} onChange={e => setShowCustomerCategory(e.target.checked)} className="accent-indigo-500" />
                      Customer Category
                    </label>
                    <label className="flex items-center gap-2 text-slate-350 cursor-pointer select-none">
                      <input type="checkbox" checked={showCustomerTel} onChange={e => setShowCustomerTel(e.target.checked)} className="accent-indigo-500" />
                      Customer Tel
                    </label>
                    <label className="flex items-center gap-2 text-slate-350 cursor-pointer select-none">
                      <input type="checkbox" checked={showPaymentTerms} onChange={e => setShowPaymentTerms(e.target.checked)} className="accent-indigo-500" />
                      Payment Terms
                    </label>
                  </div>
                </div>

                {/* Tax & Bank Details Checklist */}
                <div className="space-y-2 border-t border-slate-850 pt-3">
                  <span className="text-[9px] font-bold text-slate-450 uppercase block tracking-wider">Tax & Customer Details Toggles</span>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <label className="flex items-center gap-2 text-slate-350 cursor-pointer select-none">
                      <input type="checkbox" checked={showCustomerBankDetails} onChange={e => setShowCustomerBankDetails(e.target.checked)} className="accent-indigo-500" />
                      Cust Bank Info
                    </label>
                    <label className="flex items-center gap-2 text-slate-350 cursor-pointer select-none">
                      <input type="checkbox" checked={showCustomerGSTNumber} onChange={e => setShowCustomerGSTNumber(e.target.checked)} className="accent-indigo-500" />
                      Cust GSTIN
                    </label>
                    <label className="flex items-center gap-2 text-slate-350 cursor-pointer select-none">
                      <input type="checkbox" checked={showCustomerPANNumber} onChange={e => setShowCustomerPANNumber(e.target.checked)} className="accent-indigo-500" />
                      Cust PAN
                    </label>
                    <label className="flex items-center gap-2 text-slate-350 cursor-pointer select-none">
                      <input type="checkbox" checked={showAmountInWords} onChange={e => setShowAmountInWords(e.target.checked)} className="accent-indigo-500" />
                      Amt In Words
                    </label>
                    <label className="flex items-center gap-2 text-slate-350 cursor-pointer select-none">
                      <input type="checkbox" checked={showTaxableAmount} onChange={e => setShowTaxableAmount(e.target.checked)} className="accent-indigo-500" />
                      Taxable Amount
                    </label>
                    <label className="flex items-center gap-2 text-slate-350 cursor-pointer select-none">
                      <input type="checkbox" checked={showTaxBreakup} onChange={e => setShowTaxBreakup(e.target.checked)} className="accent-indigo-500" />
                      GST Tax Breakup
                    </label>
                  </div>
                </div>

                {/* Columns checklist */}
                <div className="space-y-2 border-t border-slate-850 pt-3">
                  <span className="text-[9px] font-bold text-slate-450 uppercase block tracking-wider">Stock Items Table Columns</span>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <label className="flex items-center gap-2 text-slate-350 cursor-pointer select-none">
                      <input type="checkbox" checked={colProductCode} onChange={e => setColProductCode(e.target.checked)} className="accent-indigo-500" />
                      SKU / HSN Code
                    </label>
                    <label className="flex items-center gap-2 text-slate-350 cursor-pointer select-none">
                      <input type="checkbox" checked={colUnitPrice} onChange={e => setColUnitPrice(e.target.checked)} className="accent-indigo-500" />
                      Unit Price Column
                    </label>
                    <label className="flex items-center gap-2 text-slate-350 cursor-pointer select-none">
                      <input type="checkbox" checked={colDiscount} onChange={e => setColDiscount(e.target.checked)} className="accent-indigo-500" />
                      Item Discount (%)
                    </label>
                    <label className="flex items-center gap-2 text-slate-350 cursor-pointer select-none">
                      <input type="checkbox" checked={colTax} onChange={e => setColTax(e.target.checked)} className="accent-indigo-500" />
                      CGST/SGST/IGST breakdown
                    </label>
                  </div>
                </div>

                {/* Logo Upload Section */}
                <div className="space-y-2 border-t border-slate-850 pt-3">
                  <label className="text-[9px] font-bold text-slate-455 uppercase tracking-wider block">Template Logo Override</label>
                  <div className="flex items-center gap-3">
                    {logoBase64 ? (
                      <div className="relative group border border-slate-800 rounded-xl overflow-hidden bg-slate-950 p-2 flex items-center justify-center h-16 w-24">
                        <img src={logoBase64} alt="Template Logo" className="max-h-full max-w-full object-contain" />
                        <button
                          type="button"
                          onClick={() => setLogoBase64(null)}
                          className="absolute inset-0 bg-rose-950/80 text-rose-200 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all font-bold text-[10px] cursor-pointer border-0"
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <label className="border border-dashed border-slate-800 hover:border-indigo-500/50 rounded-xl px-4 py-3 text-center cursor-pointer block w-full bg-slate-950 transition-all">
                        <span className="text-[10px] text-slate-400 block font-semibold">Click to upload logo image</span>
                        <span className="text-[8px] text-slate-600 block mt-0.5">PNG, JPG, SVG up to 200KB</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                </div>

                {/* Block Alignments */}
                <div className="space-y-3 border-t border-slate-850 pt-3">
                  <span className="text-[9px] font-bold text-indigo-400 uppercase block tracking-wider">Block Alignments</span>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="space-y-1">
                      <label className="text-[8px] text-slate-500 font-bold uppercase block">Header</label>
                      <div className="flex bg-slate-950 p-0.5 rounded-lg border border-slate-850">
                        {['left', 'center', 'right'].map(align => (
                          <button
                            key={align}
                            type="button"
                            onClick={() => setHeaderAlign(align as any)}
                            className={`flex-1 py-1 rounded text-[9px] font-extrabold uppercase transition-all border-0 cursor-pointer ${
                              headerAlign === align ? 'bg-indigo-600 text-white shadow' : 'text-slate-500 hover:text-slate-300 bg-transparent'
                            }`}
                          >
                            {align}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] text-slate-500 font-bold uppercase block">Title</label>
                      <div className="flex bg-slate-950 p-0.5 rounded-lg border border-slate-850">
                        {['left', 'center', 'right'].map(align => (
                          <button
                            key={align}
                            type="button"
                            onClick={() => setTitleAlign(align as any)}
                            className={`flex-1 py-1 rounded text-[9px] font-extrabold uppercase transition-all border-0 cursor-pointer ${
                              titleAlign === align ? 'bg-indigo-600 text-white shadow' : 'text-slate-500 hover:text-slate-300 bg-transparent'
                            }`}
                          >
                            {align}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] text-slate-500 font-bold uppercase block">Addresses</label>
                      <div className="flex bg-slate-950 p-0.5 rounded-lg border border-slate-850">
                        {['left', 'center', 'right'].map(align => (
                          <button
                            key={align}
                            type="button"
                            onClick={() => setAddressAlign(align as any)}
                            className={`flex-1 py-1 rounded text-[9px] font-extrabold uppercase transition-all border-0 cursor-pointer ${
                              addressAlign === align ? 'bg-indigo-600 text-white shadow' : 'text-slate-500 hover:text-slate-300 bg-transparent'
                            }`}
                          >
                            {align}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] text-slate-500 font-bold uppercase block">Totals</label>
                      <div className="flex bg-slate-950 p-0.5 rounded-lg border border-slate-850">
                        {['left', 'center', 'right'].map(align => (
                          <button
                            key={align}
                            type="button"
                            onClick={() => setTotalsAlign(align as any)}
                            className={`flex-1 py-1 rounded text-[9px] font-extrabold uppercase transition-all border-0 cursor-pointer ${
                              totalsAlign === align ? 'bg-indigo-600 text-white shadow' : 'text-slate-500 hover:text-slate-300 bg-transparent'
                            }`}
                          >
                            {align}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-1 col-span-2">
                      <label className="text-[8px] text-slate-500 font-bold uppercase block">Terms & Declarations</label>
                      <div className="flex bg-slate-950 p-0.5 rounded-lg border border-slate-850">
                        {['left', 'center', 'right'].map(align => (
                          <button
                            key={align}
                            type="button"
                            onClick={() => setTermsAlign(align as any)}
                            className={`flex-1 py-1 rounded text-[9px] font-extrabold uppercase transition-all border-0 cursor-pointer ${
                              termsAlign === align ? 'bg-indigo-600 text-white shadow' : 'text-slate-500 hover:text-slate-300 bg-transparent'
                            }`}
                          >
                            {align}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sizing & Spacing */}
                <div className="space-y-3 border-t border-slate-850 pt-3">
                  <span className="text-[9px] font-bold text-indigo-400 uppercase block tracking-wider">Font Sizing & Spacing</span>
                  <div className="grid grid-cols-2 gap-3 text-[10px]">
                    <div className="space-y-1">
                      <div className="flex justify-between text-slate-500 font-bold uppercase">
                        <span>Header Font</span>
                        <span className="font-mono text-indigo-400">{headerFontSize}px</span>
                      </div>
                      <input
                        type="range"
                        min="10"
                        max="24"
                        value={headerFontSize}
                        onChange={e => setHeaderFontSize(Number(e.target.value))}
                        className="w-full accent-indigo-500 cursor-pointer"
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-slate-500 font-bold uppercase">
                        <span>Title Font</span>
                        <span className="font-mono text-indigo-400">{titleFontSize}px</span>
                      </div>
                      <input
                        type="range"
                        min="12"
                        max="28"
                        value={titleFontSize}
                        onChange={e => setTitleFontSize(Number(e.target.value))}
                        className="w-full accent-indigo-500 cursor-pointer"
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-slate-500 font-bold uppercase">
                        <span>Body Font</span>
                        <span className="font-mono text-indigo-400">{bodyFontSize}px</span>
                      </div>
                      <input
                        type="range"
                        min="8"
                        max="14"
                        value={bodyFontSize}
                        onChange={e => setBodyFontSize(Number(e.target.value))}
                        className="w-full accent-indigo-500 cursor-pointer"
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-slate-500 font-bold uppercase">
                        <span>Logo Max H</span>
                        <span className="font-mono text-indigo-400">{logoSize}px</span>
                      </div>
                      <input
                        type="range"
                        min="20"
                        max="120"
                        value={logoSize}
                        onChange={e => setLogoSize(Number(e.target.value))}
                        className="w-full accent-indigo-500 cursor-pointer"
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-slate-500 font-bold uppercase">
                        <span>Header Pad</span>
                        <span className="font-mono text-indigo-400">{headerPadding}px</span>
                      </div>
                      <input
                        type="range"
                        min="4"
                        max="40"
                        value={headerPadding}
                        onChange={e => setHeaderPadding(Number(e.target.value))}
                        className="w-full accent-indigo-500 cursor-pointer"
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-slate-500 font-bold uppercase">
                        <span>Sec Spacing</span>
                        <span className="font-mono text-indigo-400">{sectionSpacing}px</span>
                      </div>
                      <input
                        type="range"
                        min="8"
                        max="48"
                        value={sectionSpacing}
                        onChange={e => setSectionSpacing(Number(e.target.value))}
                        className="w-full accent-indigo-500 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                {/* Table Spacing & Column Widths */}
                <div className="space-y-3 border-t border-slate-850 pt-3">
                  <span className="text-[9px] font-bold text-indigo-400 uppercase block tracking-wider">Table Spacing & Columns (%)</span>
                  <div className="grid grid-cols-2 gap-3 text-[10px]">
                    <div className="space-y-1 col-span-2">
                      <div className="flex justify-between text-slate-500 font-bold uppercase">
                        <span>Table Cell Padding</span>
                        <span className="font-mono text-indigo-400">{tablePadding}px</span>
                      </div>
                      <input
                        type="range"
                        min="2"
                        max="20"
                        value={tablePadding}
                        onChange={e => setTablePadding(Number(e.target.value))}
                        className="w-full accent-indigo-500 cursor-pointer"
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-slate-500 font-bold uppercase">
                        <span>Product Name Width</span>
                        <span className="font-mono text-indigo-400">{colWidthProduct}%</span>
                      </div>
                      <input
                        type="range"
                        min="5"
                        max="80"
                        value={colWidthProduct}
                        onChange={e => setColWidthProduct(Number(e.target.value))}
                        className="w-full accent-indigo-500 cursor-pointer"
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-slate-500 font-bold uppercase">
                        <span>SKU/Code Width</span>
                        <span className="font-mono text-indigo-400">{colWidthCode}%</span>
                      </div>
                      <input
                        type="range"
                        min="5"
                        max="50"
                        value={colWidthCode}
                        onChange={e => setColWidthCode(Number(e.target.value))}
                        className="w-full accent-indigo-500 cursor-pointer"
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-slate-500 font-bold uppercase">
                        <span>Qty Width</span>
                        <span className="font-mono text-indigo-400">{colWidthQty}%</span>
                      </div>
                      <input
                        type="range"
                        min="5"
                        max="40"
                        value={colWidthQty}
                        onChange={e => setColWidthQty(Number(e.target.value))}
                        className="w-full accent-indigo-500 cursor-pointer"
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-slate-500 font-bold uppercase">
                        <span>UnitPrice Width</span>
                        <span className="font-mono text-indigo-400">{colWidthPrice}%</span>
                      </div>
                      <input
                        type="range"
                        min="5"
                        max="40"
                        value={colWidthPrice}
                        onChange={e => setColWidthPrice(Number(e.target.value))}
                        className="w-full accent-indigo-500 cursor-pointer"
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-slate-500 font-bold uppercase">
                        <span>Discount Width</span>
                        <span className="font-mono text-indigo-400">{colWidthDiscount}%</span>
                      </div>
                      <input
                        type="range"
                        min="5"
                        max="40"
                        value={colWidthDiscount}
                        onChange={e => setColWidthDiscount(Number(e.target.value))}
                        className="w-full accent-indigo-500 cursor-pointer"
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-slate-500 font-bold uppercase">
                        <span>Subtotal Width</span>
                        <span className="font-mono text-indigo-400">{colWidthSubtotal}%</span>
                      </div>
                      <input
                        type="range"
                        min="5"
                        max="40"
                        value={colWidthSubtotal}
                        onChange={e => setColWidthSubtotal(Number(e.target.value))}
                        className="w-full accent-indigo-500 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                {/* Footer & Signature Customizer */}
                <div className="space-y-3 border-t border-slate-850 pt-3">
                  <span className="text-[9px] font-bold text-indigo-400 uppercase block tracking-wider">Footer & Signature Sign-off</span>
                  
                  <div className="flex items-center gap-2 py-1">
                    <input
                      type="checkbox"
                      id="showSignature"
                      checked={showSignature}
                      onChange={e => setShowSignature(e.target.checked)}
                      className="accent-indigo-500 w-4 h-4 cursor-pointer"
                    />
                    <label htmlFor="showSignature" className="text-xs text-slate-350 cursor-pointer select-none">
                      Show Signature sign-off block
                    </label>
                  </div>

                  {showSignature && (
                    <div className="space-y-3 pl-2 border-l border-slate-800">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-455 uppercase tracking-wider">Signature Block Title</label>
                        <input
                          type="text"
                          value={signatureLabel}
                          onChange={e => setSignatureLabel(e.target.value)}
                          className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 focus:border-indigo-500/60 rounded-xl text-white outline-none text-xs"
                          placeholder="e.g. Authorized Signatory"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-[10px]">
                        <div className="space-y-1">
                          <div className="flex justify-between text-slate-500 font-bold uppercase">
                            <span>Signature Size</span>
                            <span className="font-mono text-indigo-400">{signatureSize}px</span>
                          </div>
                          <input
                            type="range"
                            min="20"
                            max="120"
                            value={signatureSize}
                            onChange={e => setSignatureSize(Number(e.target.value))}
                            className="w-full accent-indigo-500 cursor-pointer"
                          />
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between text-slate-500 font-bold uppercase">
                            <span>Footer Padding</span>
                            <span className="font-mono text-indigo-400">{footerPadding}px</span>
                          </div>
                          <input
                            type="range"
                            min="4"
                            max="40"
                            value={footerPadding}
                            onChange={e => setFooterPadding(Number(e.target.value))}
                            className="w-full accent-indigo-500 cursor-pointer"
                          />
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between text-slate-500 font-bold uppercase">
                            <span>Border Width</span>
                            <span className="font-mono text-indigo-400">{borderWidth}px</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="6"
                            value={borderWidth}
                            onChange={e => setBorderWidth(Number(e.target.value))}
                            className="w-full accent-indigo-500 cursor-pointer"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[9px] font-bold text-slate-455 uppercase tracking-wider block">Signature Image Override</label>
                        <div className="flex items-center gap-3">
                          {signatureBase64 ? (
                            <div className="relative group border border-slate-800 rounded-xl overflow-hidden bg-slate-950 p-2 flex items-center justify-center h-16 w-24">
                              <img src={signatureBase64} alt="Signature Preview" className="max-h-full max-w-full object-contain" />
                              <button
                                type="button"
                                onClick={() => setSignatureBase64(null)}
                                className="absolute inset-0 bg-rose-950/80 text-rose-200 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all font-bold text-[10px] cursor-pointer border-0"
                              >
                                Remove
                              </button>
                            </div>
                          ) : (
                            <label className="border border-dashed border-slate-800 hover:border-indigo-500/50 rounded-xl px-4 py-3 text-center cursor-pointer block w-full bg-slate-950 transition-all">
                              <span className="text-[10px] text-slate-400 block font-semibold">Click to upload signature</span>
                              <span className="text-[8px] text-slate-600 block mt-0.5">PNG or JPG up to 150KB</span>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={handleSignatureUpload}
                                className="hidden"
                              />
                            </label>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Terms and Conditions */}
                <div className="space-y-1 border-t border-slate-850 pt-3">
                  <label className="text-[9px] font-bold text-slate-455 uppercase tracking-wider block">Standard Terms & Conditions</label>
                  <textarea
                    rows={3}
                    value={terms}
                    onChange={e => setTerms(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-indigo-500/60 rounded-xl text-white outline-none text-xs"
                    placeholder="Terms and conditions to display in footer..."
                  />
                </div>

                {/* Submit Buttons */}
                <div className="pt-2 flex gap-3">
                  <button
                    type="submit"
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 rounded-xl text-xs cursor-pointer shadow-md shadow-indigo-600/10 border-0 transition-colors"
                  >
                    {selectedId ? 'Save Configuration' : 'Save New Layout'}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Right column: Interactive Live Preview (7 cols) */}
          <div className="lg:col-span-7 space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400 font-semibold px-2">
              <span className="flex items-center gap-1"><Eye className="w-4 h-4 text-indigo-400" /> Live Print Layout Preview</span>
              <span className="text-[9px] uppercase tracking-wider text-slate-500 bg-slate-950 px-2 py-0.5 rounded-md font-bold">A4 Page Grid Mock</span>
            </div>

            {/* Preview canvas - simulated print sheet */}
            <div className="bg-white border border-slate-300 shadow-2xl p-8 text-black min-h-[700px] text-left select-none relative font-sans rounded-xl overflow-hidden flex flex-col justify-between">
              <div>
                {/* Header logo/name bar */}
                <div 
                  className={`flex ${
                    headerAlign === 'center' ? 'flex-col items-center text-center' :
                    headerAlign === 'right' ? 'flex-row-reverse justify-between items-start text-right' :
                    'flex-row justify-between items-start text-left'
                  } border-b-2 mb-5`} 
                  style={{ 
                    borderColor: currentThemeHex,
                    paddingBottom: `${headerPadding}px`,
                    textAlign: headerAlign 
                  }}
                >
                  <div className={headerAlign === 'right' ? 'text-right' : headerAlign === 'center' ? 'text-center' : 'text-left'}>
                    <div className="font-black tracking-tight" style={{ color: currentThemeHex, fontSize: `${headerFontSize}px` }}>{headerName || 'COMPANY NAME'}</div>
                    <div className="text-slate-500 font-medium mt-0.5" style={{ fontSize: `${headerFontSize * 0.7}px` }}>{headerSubtitle || 'Company Motto / Address Lines'}</div>
                  </div>
                  
                  {showLogo && (
                    logoBase64 ? (
                      <div className="shrink-0 mb-2 mt-1 flex items-center justify-center bg-slate-50/50 p-1 rounded border border-slate-100">
                        <img src={logoBase64} alt="Logo" style={{ maxHeight: `${logoSize}px`, maxWidth: '140px', objectFit: 'contain' }} />
                      </div>
                    ) : (
                      <div 
                        className="bg-slate-200 border border-slate-300 rounded flex items-center justify-center shrink-0 text-[8px] font-bold text-slate-500 uppercase tracking-widest"
                        style={{ height: `${logoSize * 0.8}px`, width: `${logoSize * 1.2}px` }}
                      >
                        Logo
                      </div>
                    )
                  )}
                </div>

                {/* Document Title Meta */}
                <div 
                  className={`flex ${
                    titleAlign === 'center' ? 'flex-col items-center text-center gap-2' :
                    titleAlign === 'right' ? 'flex-row-reverse text-right' :
                    'flex-row text-left'
                  } justify-between items-center`}
                  style={{ marginBottom: `${sectionSpacing}px` }}
                >
                  <div className={titleAlign === 'right' ? 'text-right' : titleAlign === 'center' ? 'text-center' : 'text-left'}>
                    <h4 className="font-black tracking-wider" style={{ color: currentThemeHex, fontSize: `${titleFontSize}px` }}>{title || 'TAX INVOICE'}</h4>
                    <span className="text-[9px] font-mono text-slate-600 block mt-0.5">Reference No: SI-2026-80942</span>
                  </div>
                  <div className={`text-[9px] text-slate-650 space-y-0.25 ${titleAlign === 'left' ? 'text-right' : 'text-left'}`}>
                    {showInvoiceDate && <div>Date: {new Date().toLocaleDateString()}</div>}
                    {showPaymentTerms && <div>Payment terms: Net 30 days</div>}
                  </div>
                </div>

                {/* Meta Columns */}
                {(showMetadata || showCustomerDetails) && (
                  <div className="grid grid-cols-2 gap-6 text-[10px] text-slate-650 border-t border-slate-100 pt-3" style={{ marginBottom: `${sectionSpacing}px` }}>
                    {showMetadata ? (
                      <div className="space-y-1">
                        <div className="text-[9px] uppercase font-bold text-slate-450">Invoice Metadata</div>
                        {showInvoiceDate && <div>Invoice Date: <span className="font-semibold text-slate-900">{new Date().toLocaleDateString()}</span></div>}
                        {showDueDate && <div>Due Date: <span className="font-semibold text-slate-900">{new Date().toLocaleDateString()}</span></div>}
                        {showStatus && <div>Status: <span className="font-semibold text-slate-900">UNPAID</span></div>}
                      </div>
                    ) : <div />}
                    {showCustomerDetails ? (
                      <div className="space-y-1 text-right">
                        <div className="text-[9px] uppercase font-bold text-slate-450">Customer Classification</div>
                        {showCustomerName && <div className="font-semibold text-slate-900">Acme Heavy Materials Pvt Ltd</div>}
                        {showCustomerType && <div>Type: COMPANY</div>}
                        {showCustomerCategory && <div>Category: wholesaler</div>}
                        {showCustomerTel && <div>Tel: 8460603033</div>}
                      </div>
                    ) : <div />}
                  </div>
                )}

                {/* Customer / Company Address grid */}
                {(showBillingAddress || showShippingAddress) && (
                  <div 
                    className={`grid ${showBillingAddress && showShippingAddress ? 'grid-cols-2' : 'grid-cols-1'} gap-4 border-b border-slate-100 pb-5`}
                    style={{ 
                      marginBottom: `${sectionSpacing}px`,
                      textAlign: addressAlign
                    }}
                  >
                    {showBillingAddress && (
                      <div className="leading-relaxed text-slate-700" style={{ fontSize: `${bodyFontSize}px` }}>
                        <span className="font-extrabold uppercase block tracking-wider mb-1" style={{ color: currentThemeHex, fontSize: `${bodyFontSize * 0.85}px` }}>Bill To Consignee</span>
                        <strong>Acme Heavy Materials Pvt Ltd</strong><br/>
                        {showCustomerGSTNumber && <span>GSTIN: 24AAACA1294F1Z0<br/></span>}
                        {showCustomerPANNumber && <span>PAN: AAACA1294F<br/></span>}
                        Billing State: Gujarat (CGST + SGST apply)<br/>
                        Address: Plot No 12-A, GIDC Industrial Zone, Vadodara, Gujarat - 390010
                        {showCustomerBankDetails && (
                          <div className="text-[9px] mt-2 pt-1 border-t border-slate-100 text-slate-500 leading-normal">
                            <strong>Customer Bank Details:</strong><br/>
                            Bank: State Bank of India | Holder: Acme Heavy Materials<br/>
                            A/C No: 40921005671094 | IFSC Code: SBIN0001094
                          </div>
                        )}
                      </div>
                    )}

                    {showShippingAddress && (
                      <div className="leading-relaxed text-slate-700" style={{ fontSize: `${bodyFontSize}px` }}>
                        <span className="font-extrabold uppercase block tracking-wider mb-1" style={{ color: currentThemeHex, fontSize: `${bodyFontSize * 0.85}px` }}>Ship To Destination</span>
                        <strong>Acme Logistics Hub - Rack #3</strong><br/>
                        State: Gujarat (Same State)<br/>
                        Address: Warehouse Gate 2, GIDC Industrial Zone, Vadodara, Gujarat - 390010
                      </div>
                    )}
                  </div>
                )}

                {/* Table items layout */}
                <table 
                  className="w-full border-collapse" 
                  style={{ 
                    fontSize: `${bodyFontSize}px`, 
                    marginBottom: `${sectionSpacing}px`,
                    borderWidth: borderWidth > 0 ? `${borderWidth}px` : '0px',
                    borderStyle: 'solid',
                    borderColor: (currentThemeHex as string) === '#000000' ? '#ddd' : currentThemeHex
                  }}
                >
                  <thead>
                    <tr className="bg-slate-50 border-b-2" style={{ borderBottomColor: currentThemeHex, borderBottomWidth: `${borderWidth}px` }}>
                      <th style={{ padding: `${tablePadding}px`, width: `${colWidthProduct}%` }} className="text-left font-bold text-slate-700">Stock Item Description</th>
                      {colProductCode && <th style={{ padding: `${tablePadding}px`, width: `${colWidthCode}%` }} className="text-left font-bold text-slate-700">SKU / Code</th>}
                      <th style={{ padding: `${tablePadding}px`, width: `${colWidthQty}%` }} className="text-right font-bold text-slate-700">Qty</th>
                      {colUnitPrice && <th style={{ padding: `${tablePadding}px`, width: `${colWidthPrice}%` }} className="text-right font-bold text-slate-700">Price</th>}
                      {colDiscount && <th style={{ padding: `${tablePadding}px`, width: `${colWidthDiscount}%` }} className="text-right font-bold text-slate-700">Discount</th>}
                      <th style={{ padding: `${tablePadding}px`, width: `${colWidthSubtotal}%` }} className="text-right font-bold text-slate-700">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td style={{ padding: `${tablePadding}px` }} className="font-bold text-slate-800">ANB copper armored Cable 4 Core</td>
                      {colProductCode && <td style={{ padding: `${tablePadding}px` }} className="text-slate-500 font-mono">COP-ARM-4C</td>}
                      <td style={{ padding: `${tablePadding}px` }} className="text-right font-mono">100 meters</td>
                      {colUnitPrice && <td style={{ padding: `${tablePadding}px` }} className="text-right font-mono">$25.00</td>}
                      {colDiscount && <td style={{ padding: `${tablePadding}px` }} className="text-right font-mono">5.0%</td>}
                      <td style={{ padding: `${tablePadding}px` }} className="text-right font-bold font-mono">$2,375.00</td>
                    </tr>
                    <tr>
                      <td style={{ padding: `${tablePadding}px` }} className="font-bold text-slate-800">Standard Brass Connectors 12mm</td>
                      {colProductCode && <td style={{ padding: `${tablePadding}px` }} className="text-slate-500 font-mono">BR-CONN-12</td>}
                      <td style={{ padding: `${tablePadding}px` }} className="text-right font-mono">40 units</td>
                      {colUnitPrice && <td style={{ padding: `${tablePadding}px` }} className="text-right font-mono">$8.00</td>}
                      {colDiscount && <td style={{ padding: `${tablePadding}px` }} className="text-right font-mono">0.0%</td>}
                      <td style={{ padding: `${tablePadding}px` }} className="text-right font-bold font-mono">$320.00</td>
                    </tr>
                  </tbody>
                </table>

                {/* Totals Summary */}
                <div 
                  className={`flex ${
                    totalsAlign === 'left' ? 'flex-col items-start gap-4' :
                    totalsAlign === 'center' ? 'flex-col items-center gap-4 text-center' :
                    'flex-row justify-between items-start'
                  } mt-4`}
                  style={{ textAlign: totalsAlign }}
                >
                  {/* Bank Details section */}
                  {showBankDetails ? (
                    <div 
                      className="leading-relaxed text-slate-500 max-w-xs border border-slate-100 p-2.5 rounded-lg bg-slate-50/50"
                      style={{ fontSize: `${bodyFontSize * 0.85}px`, textAlign: 'left' }}
                    >
                      <strong className="block uppercase tracking-wider mb-0.5 text-slate-700 font-extrabold" style={{ fontSize: `${bodyFontSize * 0.9}px` }}>Corporate Payout Accounts</strong>
                      Banker: <strong>State Bank of India</strong><br/>
                      A/C Name: ANB Industries Private Limited<br/>
                      A/C No: 40921005671094<br/>
                      IFS Code: SBIN0001094
                    </div>
                  ) : <div />}

                  {/* Right totals */}
                  <table className="text-slate-650 space-y-1.5 w-60" style={{ fontSize: `${bodyFontSize}px`, textAlign: totalsAlign }}>
                    <tbody>
                      {showTaxableAmount && (
                        <tr className="flex justify-between py-0.5">
                          <td>Taxable Amount:</td>
                          <td className="font-bold text-slate-800">$2,695.00</td>
                        </tr>
                      )}
                      {colDiscount && (
                        <tr className="flex justify-between py-0.5 text-rose-500">
                          <td>Overall Discount (0%):</td>
                          <td className="font-bold font-mono">-$0.00</td>
                        </tr>
                      )}
                      {showTaxBreakup ? (
                        <>
                          <tr className="flex justify-between py-0.5 text-emerald-600">
                            <td>CGST (9.0%):</td>
                            <td className="font-bold font-mono">+$242.55</td>
                          </tr>
                          <tr className="flex justify-between py-0.5 text-emerald-600">
                            <td>SGST (9.0%):</td>
                            <td className="font-bold font-mono">+$242.55</td>
                          </tr>
                        </>
                      ) : colTax ? (
                        <tr className="flex justify-between py-0.5">
                          <td>Sales Tax (18%):</td>
                          <td className="font-bold font-mono">+$485.10</td>
                        </tr>
                      ) : null}
                      <tr className="flex justify-between font-black border-t pt-2 text-[11px]" style={{ color: currentThemeHex, borderTopColor: currentThemeHex }}>
                        <td>Grand Total Due:</td>
                        <td className="font-mono">$3,180.10</td>
                      </tr>
                      {showAmountInWords && (
                        <tr className="flex flex-col border-t border-dashed mt-2 pt-2 text-[9px] text-slate-500 leading-normal text-left font-sans">
                          <td className="font-bold uppercase text-[8px] tracking-wide">Amount in words:</td>
                          <td className="italic">Indian Rupees Three Thousand One Hundred Eighty And Ten Paisa Only</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 6. Footer (Terms Left, Signature Right) */}
              {(showSignature || (showTerms && terms)) && (
                <div
                  className="flex justify-between items-end mt-6 gap-6 pt-3 border-t"
                  style={{
                    borderTopWidth: `${borderWidth}px`,
                    borderColor: themeColor === '#000000' ? '#ddd' : `${themeColor}40`,
                    paddingBottom: `${footerPadding}px`,
                    marginTop: `${sectionSpacing}px`
                  }}
                >
                  {/* Terms & Declarations on the Left */}
                  {showTerms && terms ? (
                    <div
                      className="text-left leading-relaxed text-slate-400 flex-1 max-w-[65%]"
                      style={{
                        fontSize: `${bodyFontSize * 0.8}px`
                      }}
                    >
                      <strong className="block uppercase text-[8px] text-slate-500 font-bold mb-1" style={{ fontSize: `${bodyFontSize * 0.85}px` }}>Terms & Declarations</strong>
                      {terms.split('\n').map((line, idx) => (
                        <div key={idx}>{line}</div>
                      ))}
                    </div>
                  ) : <div />}

                  {/* Signature Signoff Block on the Right */}
                  {showSignature ? (
                    <div className="text-center w-40 flex flex-col items-center shrink-0">
                      {signatureBase64 ? (
                        <div className="h-10 flex items-center justify-center p-0.5 mb-1 bg-slate-50/50 rounded max-w-full">
                          <img src={signatureBase64} alt="Signature" style={{ maxHeight: `${signatureSize}px`, objectFit: 'contain' }} />
                        </div>
                      ) : (
                        <div className="h-10 w-full border-b border-slate-300 border-dashed mb-1" />
                      )}
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wide block">{signatureLabel}</span>
                    </div>
                  ) : <div />}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
