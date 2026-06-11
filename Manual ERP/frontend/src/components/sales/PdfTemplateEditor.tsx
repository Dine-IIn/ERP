import React, { useState, useEffect } from 'react';
import { FileText, Plus, Trash2, Edit3, Settings, Eye, Check, RefreshCw, Palette } from 'lucide-react';

export interface PdfTemplateConfig {
  id: string;
  name: string;
  type: 'INVOICE' | 'PROFORMA' | 'CHALLAN';
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
}

const DEFAULT_TEMPLATES: PdfTemplateConfig[] = [
  {
    id: 'tpl-invoice-std',
    name: 'Standard Tax Invoice',
    type: 'INVOICE',
    title: 'TAX INVOICE',
    headerName: 'ANB INDUSTRIES PRIVATE LIMITED',
    headerSubtitle: 'Premium Cable & Conductor Manufacturers',
    terms: '1. Goods once sold will not be taken back.\n2. Payment terms: Net 30 days from dispatch.\n3. All disputes subject to local jurisdiction.',
    themeColor: 'indigo',
    showLogo: true,
    showCompanyDetails: true,
    showBillingAddress: true,
    showShippingAddress: true,
    showBankDetails: true,
    showTerms: true,
    colProductCode: true,
    colUnitPrice: true,
    colDiscount: true,
    colTax: true
  },
  {
    id: 'tpl-proforma-std',
    name: 'Modern Proforma Estimate',
    type: 'PROFORMA',
    title: 'PROFORMA INVOICE',
    headerName: 'ANB INDUSTRIES PRIVATE LIMITED',
    headerSubtitle: 'Pre-shipment Valuation Estimate',
    terms: '1. This is a proforma estimate and not a tax declaration invoice.\n2. Material dispatch only after advance payment confirmation.',
    themeColor: 'amber',
    showLogo: true,
    showCompanyDetails: true,
    showBillingAddress: true,
    showShippingAddress: false,
    showBankDetails: true,
    showTerms: true,
    colProductCode: true,
    colUnitPrice: true,
    colDiscount: true,
    colTax: true
  },
  {
    id: 'tpl-challan-std',
    name: 'Direct Delivery Challan',
    type: 'CHALLAN',
    title: 'DELIVERY CHALLAN',
    headerName: 'ANB INDUSTRIES PRIVATE LIMITED',
    headerSubtitle: 'Consignment Gate Pass & Delivery Memo',
    terms: '1. Please receive the goods in sound physical condition.\n2. Return duplicate copy duly signed and stamped.',
    themeColor: 'emerald',
    showLogo: true,
    showCompanyDetails: true,
    showBillingAddress: true,
    showShippingAddress: true,
    showBankDetails: false,
    showTerms: true,
    colProductCode: true,
    colUnitPrice: false,
    colDiscount: false,
    colTax: false
  }
];

export default function PdfTemplateEditor() {
  const [templates, setTemplates] = useState<PdfTemplateConfig[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  
  // Form states
  const [name, setName] = useState('');
  const [type, setType] = useState<'INVOICE' | 'PROFORMA' | 'CHALLAN'>('INVOICE');
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

  const [isEditing, setIsEditing] = useState(false);
  const [localSuccess, setLocalSuccess] = useState<string | null>(null);

  // Load from local storage
  useEffect(() => {
    const saved = localStorage.getItem('erp_pdf_templates');
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as PdfTemplateConfig[];
        setTemplates(parsed);
        if (parsed.length > 0) {
          loadTemplate(parsed[0]);
        }
      } catch (e) {
        setTemplates(DEFAULT_TEMPLATES);
        localStorage.setItem('erp_pdf_templates', JSON.stringify(DEFAULT_TEMPLATES));
        loadTemplate(DEFAULT_TEMPLATES[0]);
      }
    } else {
      setTemplates(DEFAULT_TEMPLATES);
      localStorage.setItem('erp_pdf_templates', JSON.stringify(DEFAULT_TEMPLATES));
      loadTemplate(DEFAULT_TEMPLATES[0]);
    }
  }, []);

  const loadTemplate = (tpl: PdfTemplateConfig) => {
    setSelectedId(tpl.id);
    setName(tpl.name);
    setType(tpl.type);
    setTitle(tpl.title);
    setHeaderName(tpl.headerName);
    setHeaderSubtitle(tpl.headerSubtitle);
    setTerms(tpl.terms);
    setThemeColor(tpl.themeColor);
    setShowLogo(tpl.showLogo);
    setShowCompanyDetails(tpl.showCompanyDetails);
    setShowBillingAddress(tpl.showBillingAddress);
    setShowShippingAddress(tpl.showShippingAddress);
    setShowBankDetails(tpl.showBankDetails);
    setShowTerms(tpl.showTerms);
    setColProductCode(tpl.colProductCode);
    setColUnitPrice(tpl.colUnitPrice);
    setColDiscount(tpl.colDiscount);
    setColTax(tpl.colTax);
    setIsEditing(true);
  };

  const handleCreateNew = () => {
    setSelectedId('');
    setName('New Custom Print Template');
    setType('INVOICE');
    setTitle('TAX INVOICE');
    setHeaderName('ANB INDUSTRIES PRIVATE LIMITED');
    setHeaderSubtitle('Corporate Office Address & Details');
    setTerms('1. Payment terms: 100% advance.\n2. Subject to local jurisdiction.');
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
    setIsEditing(false);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setLocalSuccess(null);

    const tplConfig: PdfTemplateConfig = {
      id: selectedId || `tpl-${Date.now()}`,
      name: name.trim() || 'Unnamed Template',
      type,
      title: title.trim() || 'INVOICE',
      headerName: headerName.trim(),
      headerSubtitle: headerSubtitle.trim(),
      terms: terms.trim(),
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
      colTax
    };

    let updatedList: PdfTemplateConfig[] = [];
    if (selectedId) {
      updatedList = templates.map(t => t.id === selectedId ? tplConfig : t);
    } else {
      updatedList = [...templates, tplConfig];
      setSelectedId(tplConfig.id);
    }

    setTemplates(updatedList);
    localStorage.setItem('erp_pdf_templates', JSON.stringify(updatedList));
    setLocalSuccess("Template layout configured and saved successfully!");
    setIsEditing(true);
    setTimeout(() => setLocalSuccess(null), 2000);
  };

  const handleDelete = (idToDelete: string) => {
    if (window.confirm("Are you sure you want to permanently delete this print template layout?")) {
      const updated = templates.filter(t => t.id !== idToDelete);
      setTemplates(updated);
      localStorage.setItem('erp_pdf_templates', JSON.stringify(updated));
      if (updated.length > 0) {
        loadTemplate(updated[0]);
      } else {
        handleCreateNew();
      }
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
        <div>
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
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 active:scale-95 transition-all text-white font-semibold rounded-xl shadow-lg"
        >
          <Plus className="w-4 h-4" />
          Create Layout Template
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left column: Templates List & Settings Editor (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Templates list card */}
          <div className="bg-slate-900/35 border border-slate-800/80 rounded-2xl p-5 space-y-3.5 backdrop-blur-md">
            <span className="text-[10px] font-extrabold text-indigo-400 uppercase tracking-widest block">Saved Print Templates</span>
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
                      <div className="text-xs font-bold">{t.name}</div>
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
            </div>
          </div>

          {/* Configuration Settings Editor */}
          <div className="bg-slate-900/35 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-md">
            <span className="text-[10px] font-extrabold text-indigo-400 uppercase tracking-widest block border-b border-slate-850 pb-2 mb-4">Template Parameters</span>
            
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
              <div className="pt-4 flex gap-3">
                <button
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 rounded-xl text-xs cursor-pointer shadow-md shadow-indigo-600/10 transition-colors"
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
              <div className="flex justify-between items-start border-b-2 pb-4 mb-5" style={{ borderColor: currentThemeHex }}>
                <div>
                  <div className="text-sm font-black tracking-tight" style={{ color: currentThemeHex }}>{headerName || 'COMPANY NAME'}</div>
                  <div className="text-[9.5px] text-slate-500 font-medium mt-0.5">{headerSubtitle || 'Company Motto / Address Lines'}</div>
                </div>
                
                {showLogo && (
                  <div className="w-14 h-10 bg-slate-200 border border-slate-300 rounded flex items-center justify-center shrink-0 text-[8px] font-bold text-slate-500 uppercase tracking-widest">
                    Logo
                  </div>
                )}
              </div>

              {/* Document Title Meta */}
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h4 className="text-base font-black tracking-wider" style={{ color: currentThemeHex }}>{title || 'TAX INVOICE'}</h4>
                  <span className="text-[9px] font-mono text-slate-600 block mt-0.5">Reference No: SI-2026-80942</span>
                </div>
                <div className="text-right text-[9px] text-slate-600 space-y-0.25">
                  <div>Date: {new Date().toLocaleDateString()}</div>
                  <div>Payment terms: Net 30 days</div>
                </div>
              </div>

              {/* Customer / Company Address grid */}
              {(showBillingAddress || showShippingAddress) && (
                <div className="grid grid-cols-2 gap-4 mb-6 border-b border-slate-100 pb-5">
                  {showBillingAddress ? (
                    <div className="text-[9.5px] leading-relaxed">
                      <span className="font-extrabold uppercase block tracking-wider text-[8.5px] mb-1" style={{ color: currentThemeHex }}>Bill To Consignee</span>
                      <strong>Acme Heavy Materials Pvt Ltd</strong><br/>
                      GSTIN: 24AAACA1294F1Z0<br/>
                      Billing State: Gujarat (CGST + SGST apply)<br/>
                      Address: Plot No 12-A, GIDC Industrial Zone, Vadodara, Gujarat - 390010
                    </div>
                  ) : <div />}

                  {showShippingAddress ? (
                    <div className="text-[9.5px] leading-relaxed">
                      <span className="font-extrabold uppercase block tracking-wider text-[8.5px] mb-1" style={{ color: currentThemeHex }}>Ship To Destination</span>
                      <strong>Acme Logistics Hub - Rack #3</strong><br/>
                      State: Gujarat (Same State)<br/>
                      Address: Warehouse Gate 2, GIDC Industrial Zone, Vadodara, Gujarat - 390010
                    </div>
                  ) : <div />}
                </div>
              )}

              {/* Table items layout */}
              <table className="w-full border-collapse text-[9.5px] mb-6">
                <thead>
                  <tr className="bg-slate-50 border-b-2" style={{ borderBottomColor: currentThemeHex }}>
                    <th className="py-2 px-1 text-left font-bold text-slate-700">Stock Item Description</th>
                    {colProductCode && <th className="py-2 px-1 text-left font-bold text-slate-700">SKU / Code</th>}
                    <th className="py-2 px-1 text-right font-bold text-slate-700">Qty</th>
                    {colUnitPrice && <th className="py-2 px-1 text-right font-bold text-slate-700">Price</th>}
                    {colDiscount && <th className="py-2 px-1 text-right font-bold text-slate-700">Discount</th>}
                    <th className="py-2 px-1 text-right font-bold text-slate-700">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="py-2 px-1 font-bold text-slate-800">ANB copper armored Cable 4 Core</td>
                    {colProductCode && <td className="py-2 px-1 text-slate-500 font-mono">COP-ARM-4C</td>}
                    <td className="py-2 px-1 text-right font-mono">100 meters</td>
                    {colUnitPrice && <td className="py-2 px-1 text-right font-mono">$25.00</td>}
                    {colDiscount && <td className="py-2 px-1 text-right font-mono">5.0%</td>}
                    <td className="py-2 px-1 text-right font-bold font-mono">$2,375.00</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-1 font-bold text-slate-800">Standard Brass Connectors 12mm</td>
                    {colProductCode && <td className="py-2 px-1 text-slate-500 font-mono">BR-CONN-12</td>}
                    <td className="py-2 px-1 text-right font-mono">40 units</td>
                    {colUnitPrice && <td className="py-2 px-1 text-right font-mono">$8.00</td>}
                    {colDiscount && <td className="py-2 px-1 text-right font-mono">0.0%</td>}
                    <td className="py-2 px-1 text-right font-bold font-mono">$320.00</td>
                  </tr>
                </tbody>
              </table>

              {/* Totals Summary */}
              <div className="flex justify-between items-start mt-4">
                {/* Bank Details section */}
                {showBankDetails ? (
                  <div className="text-[8.5px] leading-relaxed text-slate-500 max-w-xs border border-slate-100 p-2.5 rounded-lg bg-slate-50/50">
                    <strong className="block text-[9px] uppercase tracking-wider mb-0.5 text-slate-700 font-extrabold">Corporate Payout Accounts</strong>
                    Banker: <strong>State Bank of India</strong><br/>
                    A/C Name: ANB Industries Private Limited<br/>
                    A/C No: 40921005671094<br/>
                    IFS Code: SBIN0001094
                  </div>
                ) : <div />}

                {/* Right totals */}
                <table className="text-[9.5px] text-slate-600 space-y-1.5 w-60">
                  <tbody>
                    <tr className="flex justify-between py-0.5">
                      <td>Subtotal Billed Value:</td>
                      <td className="font-bold text-slate-800">$2,695.00</td>
                    </tr>
                    {colDiscount && (
                      <tr className="flex justify-between py-0.5 text-rose-500">
                        <td>Overall Discount (0%):</td>
                        <td className="font-bold font-mono">-$0.00</td>
                      </tr>
                    )}
                    {colTax ? (
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
                    ) : (
                      <tr className="flex justify-between py-0.5">
                        <td>Sales Tax (18%):</td>
                        <td className="font-bold font-mono">+$485.10</td>
                      </tr>
                    )}
                    <tr className="flex justify-between font-black border-t pt-2 text-[11px]" style={{ color: currentThemeHex, borderTopColor: currentThemeHex }}>
                      <td>Grand Total Due:</td>
                      <td className="font-mono">$3,180.10</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Terms Footer */}
            {showTerms && terms && (
              <div className="border-t pt-3 mt-8 text-[8px] text-slate-400 leading-relaxed text-center">
                <strong className="block uppercase text-[8.5px] text-slate-500 font-bold mb-1">Declarations, Terms & Sign-off Details</strong>
                {terms.split('\n').map((line, idx) => (
                  <div key={idx}>{line}</div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
