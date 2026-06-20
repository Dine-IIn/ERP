import React, { useState, useEffect } from 'react';
import { MessageSquare, Save, Tag, Layers, RefreshCw, AlertCircle, FileText } from 'lucide-react';

interface Template {
  id: string;
  documentType: string;
  template: string;
  emailTemplate: string | null;
  useSameForEmail: boolean;
  isActive: boolean;
}

interface WhatsappSettingsProps {
  apiRequest: (url: string, method?: string, body?: any) => Promise<any>;
  companyDefaultCountryCode?: string;
  companyMaxLimitPerHour?: number;
  onSettingsUpdated: () => void;
}

const DOCUMENT_TYPES = [
  { value: 'SALES_INVOICE', label: 'Sales Invoice' },
  { value: 'PROFORMA_INVOICE', label: 'Proforma Invoice' },
  { value: 'DELIVERY_CHALLAN', label: 'Delivery Challan' },
  { value: 'PURCHASE_ORDER', label: 'Purchase Order' },
  { value: 'QUOTATION', label: 'Sales Quotation' },
  { value: 'PAYMENT_RECEIPT', label: 'Payment Receipt' }
];

const PLACEHOLDERS = [
  { key: '{{companyName}}', desc: 'The legal name of your workspace/company' },
  { key: '{{customerName}}', desc: 'The billing name of the client/vendor' },
  { key: '{{customerCode}}', desc: 'Unique database identifier for the client' },
  { key: '{{invoiceNumber}}', desc: 'Assigned invoice or proforma serial number' },
  { key: '{{invoiceDate}}', desc: 'Issue date formatted locally' },
  { key: '{{invoiceAmount}}', desc: 'Grand total due amount including currency symbol' },
  { key: '{{dueDate}}', desc: 'Payment collection deadline limit date' },
  { key: '{{quotationNumber}}', desc: 'Quotation quote identifier number' },
  { key: '{{poNumber}}', desc: 'Purchase Order serial number' },
  { key: '{{challanNumber}}', desc: 'Delivery Challan tracking code' },
  { key: '{{receiptNumber}}', desc: 'Voucher receipt tracking transaction code' }
];

export default function WhatsappSettings({
  apiRequest,
  companyDefaultCountryCode = '+91',
  companyMaxLimitPerHour = 100,
  onSettingsUpdated
}: WhatsappSettingsProps) {
  // Settings state
  const [countryCode, setCountryCode] = useState(companyDefaultCountryCode);
  const [saveLoading, setSaveLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Template states
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedDocType, setSelectedDocType] = useState('SALES_INVOICE');
  const [templateText, setTemplateText] = useState('');
  const [emailTemplateText, setEmailTemplateText] = useState('');
  const [useSameForEmail, setUseSameForEmail] = useState(true);
  const [activeEditorTab, setActiveEditorTab] = useState<'WHATSAPP' | 'EMAIL'>('WHATSAPP');
  const [templateLoading, setTemplateLoading] = useState(false);

  useEffect(() => {
    setCountryCode(companyDefaultCountryCode);
  }, [companyDefaultCountryCode]);

  // Load templates on mount
  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const res = await apiRequest('/api/whatsapp/templates', 'GET');
      if (res && res.templates) {
        setTemplates(res.templates);
        // Set initial text for selected type
        const match = res.templates.find((t: any) => t.documentType === selectedDocType);
        setTemplateText(match ? match.template : getDefaultTemplateText(selectedDocType, 'WHATSAPP'));
        setEmailTemplateText(match && match.emailTemplate ? match.emailTemplate : getDefaultTemplateText(selectedDocType, 'EMAIL'));
        setUseSameForEmail(match ? match.useSameForEmail : true);
      }
    } catch (e: any) {
      setErrorMsg(e.message || 'Failed to load templates.');
    }
  };

  // Keep editor synchronized when docType selector changes
  useEffect(() => {
    const match = templates.find((t) => t.documentType === selectedDocType);
    setTemplateText(match ? match.template : getDefaultTemplateText(selectedDocType, 'WHATSAPP'));
    setEmailTemplateText(match && match.emailTemplate ? match.emailTemplate : getDefaultTemplateText(selectedDocType, 'EMAIL'));
    setUseSameForEmail(match ? match.useSameForEmail : true);
  }, [selectedDocType, templates]);

  const getDefaultTemplateText = (type: string, channel: 'WHATSAPP' | 'EMAIL') => {
    if (channel === 'WHATSAPP') {
      switch (type) {
        case 'SALES_INVOICE':
          return "Hello {{customerName}},\n\nThank you for your business. Please find attached Sales Invoice {{invoiceNumber}}.\n\nDate: {{invoiceDate}}\nTotal: {{invoiceAmount}}\nDue: {{dueDate}}\n\nRegards,\n{{companyName}}";
        case 'PROFORMA_INVOICE':
          return "Hello {{customerName}},\n\nPlease find attached Proforma Invoice {{invoiceNumber}} for your confirmation.\n\nDate: {{invoiceDate}}\nTotal: {{invoiceAmount}}\nDue: {{dueDate}}\n\nRegards,\n{{companyName}}";
        case 'DELIVERY_CHALLAN':
          return "Hello {{customerName}},\n\nYour materials have been dispatched! Please find attached Delivery Challan {{challanNumber}} for transit details.\n\nRegards,\n{{companyName}}";
        case 'PURCHASE_ORDER':
          return "Hello {{customerName}},\n\nPlease find attached Purchase Order {{poNumber}} from our procurement division.\n\nRegards,\n{{companyName}}";
        case 'QUOTATION':
          return "Hello {{customerName}},\n\nPlease find attached price Quotation {{quotationNumber}} as requested.\n\nDate: {{invoiceDate}}\nTotal: {{invoiceAmount}}\n\nRegards,\n{{companyName}}";
        case 'PAYMENT_RECEIPT':
          return "Hello {{customerName}},\n\nWe have received your payment of {{invoiceAmount}}! Please find attached Receipt voucher {{receiptNumber}} for your records.\n\nRegards,\n{{companyName}}";
        default:
          return "Hello {{customerName}},\n\nPlease find attached document.\n\nRegards,\n{{companyName}}";
      }
    } else {
      switch (type) {
        case 'SALES_INVOICE':
          return "Dear {{customerName}},\n\nPlease find details for Sales Invoice {{invoiceNumber}}.\n\nInvoice Date: {{invoiceDate}}\nTotal Amount Due: {{invoiceAmount}}\nPayment Status: Pending\n\nThank you for your business!\n\nRegards,\n{{companyName}}";
        case 'PROFORMA_INVOICE':
          return "Dear {{customerName}},\n\nPlease find details for Proforma Invoice {{invoiceNumber}}.\n\nInvoice Date: {{invoiceDate}}\nTotal Amount Due: {{invoiceAmount}}\n\nThank you for doing business with us!\n\nRegards,\n{{companyName}}";
        case 'DELIVERY_CHALLAN':
          return "Dear {{customerName}},\n\nPlease find details for Delivery Challan {{challanNumber}}.\n\nChallan Date: {{invoiceDate}}\n\nThank you!\n\nRegards,\n{{companyName}}";
        case 'PURCHASE_ORDER':
          return "Dear {{customerName}},\n\nPlease find details for Purchase Order {{poNumber}}.\n\nOrder Date: {{invoiceDate}}\nTotal Amount: {{invoiceAmount}}\n\nThank you!\n\nRegards,\n{{companyName}}";
        case 'QUOTATION':
          return "Dear {{customerName}},\n\nPlease find details for Quotation {{quotationNumber}}.\n\nQuotation Date: {{invoiceDate}}\nTotal Amount: {{invoiceAmount}}\n\nThank you!\n\nRegards,\n{{companyName}}";
        case 'PAYMENT_RECEIPT':
          return "Dear {{customerName}},\n\nPlease find details for Payment Receipt {{receiptNumber}}.\n\nReceipt Date: {{invoiceDate}}\nReceived Amount: {{invoiceAmount}}\n\nThank you!\n\nRegards,\n{{companyName}}";
        default:
          return "Dear {{customerName}},\n\nPlease find details for the document.\n\nRegards,\n{{companyName}}";
      }
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await apiRequest('/api/whatsapp/settings', 'PUT', {
        defaultCountryCode: countryCode
      });
      setSuccessMsg(res.message || 'WhatsApp settings updated successfully.');
      onSettingsUpdated();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save settings.');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleSaveTemplate = async () => {
    setTemplateLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await apiRequest('/api/whatsapp/templates', 'POST', {
        documentType: selectedDocType,
        template: templateText,
        emailTemplate: emailTemplateText,
        useSameForEmail
      });
      setSuccessMsg('Template saved successfully!');
      await fetchTemplates();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save template.');
    } finally {
      setTemplateLoading(false);
    }
  };

  const insertPlaceholder = (key: string) => {
    if (activeEditorTab === 'WHATSAPP') {
      setTemplateText((prev) => prev + key);
    } else {
      setEmailTemplateText((prev) => prev + key);
    }
  };

  // Render a simulated live rendering preview of the template text
  const getSimulatedPreview = (text: string) => {
    const mockData: Record<string, string> = {
      companyName: 'Acme Corporates Ltd',
      customerName: 'Johnathan Doe Solutions',
      customerCode: 'CUST-802',
      invoiceNumber: 'INV-2026-902',
      invoiceDate: new Date().toLocaleDateString(),
      invoiceAmount: '₹4,520.00', // Simulator uses Indian Rupee ₹ symbol as mock currency representation
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString(),
      quotationNumber: 'QTN-892',
      poNumber: 'PO-7023',
      challanNumber: 'DC-8812',
      receiptNumber: 'REC-5021'
    };

    let result = text;
    for (const k in mockData) {
      result = result.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), mockData[k]);
    }
    return result;
  };

  return (
    <div className="animate-fade-in flex flex-col gap-6 text-left max-w-5xl mx-auto select-none">
      {/* Title */}
      <div className="border-b border-[var(--border-color)] pb-3">
        <h3 className="font-bold text-base text-[var(--text-primary)] font-display flex items-center gap-2 uppercase tracking-wide">
          <MessageSquare className="w-5 h-5 text-indigo-400" /> Document Message Templates
        </h3>
        <p className="text-[var(--text-secondary)] text-[10px] mt-0.5">
          Configure default country prefixes, rate limits, and custom prefilled WhatsApp and Email message templates.
        </p>
      </div>

      {/* Notifications overlay banner */}
      {(successMsg || errorMsg) && (
        <div className={`p-3.5 rounded-xl border flex items-start gap-2.5 text-xs transition-all ${
          successMsg 
            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
            : 'bg-red-500/10 text-red-400 border-red-500/20'
        }`}>
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{successMsg || errorMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Settings Configuration */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          <form onSubmit={handleSaveSettings} className="bg-[var(--bg-secondary)] border border-[var(--border-color)] p-5 rounded-2xl flex flex-col gap-4 text-left shadow-sm">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] border-b border-[var(--border-color)]/50 pb-2">
              WhatsApp Configuration
            </h4>

            {/* Country Code */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-extrabold uppercase tracking-widest text-[var(--text-secondary)]">Default Country Code Prefix</label>
              <input
                type="text"
                required
                placeholder="e.g. +91"
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-indigo-500/50 py-2 px-3.5 rounded-xl text-xs font-semibold text-[var(--text-primary)] outline-none transition-all"
              />
              <span className="text-[8.5px] text-[var(--text-muted)] mt-0.5 leading-relaxed">
                Appended automatically to 10-digit mobile numbers when recipient country codes are missing.
              </span>
            </div>

            {/* Rate limiting (View Only / Configurable by Super Admin) */}
            <div className="flex flex-col gap-1.5 bg-[var(--bg-primary)]/50 border border-[var(--border-color)]/30 p-3 rounded-xl">
              <label className="text-[9.5px] font-bold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-400" /> Hourly Limit Enforcement
              </label>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-[10px] text-[var(--text-muted)] font-medium">Max Limit:</span>
                <span className="text-xs font-black text-white font-mono">{companyMaxLimitPerHour} msgs / hr</span>
              </div>
              <span className="text-[8px] text-[var(--text-muted)] mt-1 block">
                Security policy limit. Rate throttle is set globally by the System Super Administrator to prevent SPAM flag risk.
              </span>
            </div>

            <button
              type="submit"
              disabled={saveLoading}
              className="mt-2 w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-extrabold uppercase tracking-wider rounded-xl transition-all cursor-pointer border-0 flex items-center justify-center gap-1.5 shadow-md shadow-indigo-500/10 active:scale-95"
            >
              {saveLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Save Config
            </button>
          </form>
        </div>

        {/* Right Column: Templates Configuration */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] p-5 rounded-2xl flex flex-col gap-4 text-left shadow-sm">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center border-b border-[var(--border-color)]/50 pb-2.5 gap-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                Document message templates
              </h4>
              
              <select
                value={selectedDocType}
                onChange={(e) => setSelectedDocType(e.target.value)}
                className="bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-indigo-500/50 py-1.5 px-3 rounded-lg text-[10px] font-bold text-[var(--text-primary)] cursor-pointer outline-none transition-all"
              >
                {DOCUMENT_TYPES.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 bg-[var(--bg-primary)]/50 border border-[var(--border-color)]/30 p-3.5 rounded-xl">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-[var(--text-primary)]">
                <input
                  type="checkbox"
                  checked={useSameForEmail}
                  onChange={(e) => {
                    setUseSameForEmail(e.target.checked);
                    if (e.target.checked) {
                      setActiveEditorTab('WHATSAPP');
                    }
                  }}
                  className="rounded border-[var(--border-color)] text-indigo-600 focus:ring-indigo-500"
                />
                Use same message template for Email
              </label>

              {!useSameForEmail && (
                <div className="flex rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] p-0.5">
                  <button
                    type="button"
                    onClick={() => setActiveEditorTab('WHATSAPP')}
                    className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all border-0 cursor-pointer ${
                      activeEditorTab === 'WHATSAPP' 
                        ? 'bg-indigo-600 text-white' 
                        : 'text-[var(--text-secondary)] hover:text-white bg-transparent'
                    }`}
                  >
                    WhatsApp
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveEditorTab('EMAIL')}
                    className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all border-0 cursor-pointer ${
                      activeEditorTab === 'EMAIL' 
                        ? 'bg-indigo-600 text-white' 
                        : 'text-[var(--text-secondary)] hover:text-white bg-transparent'
                    }`}
                  >
                    Email
                  </button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Placeholders palette */}
              <div className="md:col-span-1 border border-[var(--border-color)]/70 bg-[var(--bg-primary)]/45 p-3 rounded-xl flex flex-col gap-2">
                <span className="text-[9.5px] font-black uppercase text-[var(--text-secondary)] tracking-wider flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-indigo-400" /> Placeholders List
                </span>
                <span className="text-[8.5px] text-[var(--text-muted)] leading-tight mb-1">
                  Click a tag below to insert it at the cursor position in the template area.
                </span>
                <div className="flex flex-col gap-1.5 max-h-[260px] overflow-y-auto pr-1 font-sans">
                  {PLACEHOLDERS.map((pl) => (
                    <button
                      key={pl.key}
                      type="button"
                      onClick={() => insertPlaceholder(pl.key)}
                      className="text-left p-1.5 rounded-lg border border-[var(--border-color)] hover:border-indigo-500/30 bg-[var(--bg-primary)] hover:bg-indigo-500/5 text-[9px] font-mono text-indigo-400 transition-all cursor-pointer flex flex-col gap-0.5"
                    >
                      <strong className="block text-[9.5px] text-white font-mono">{pl.key}</strong>
                      <span className="text-[7.5px] text-[var(--text-muted)] leading-normal">{pl.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Template editor & preview */}
              <div className="md:col-span-2 flex flex-col gap-3.5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-extrabold uppercase tracking-widest text-[var(--text-secondary)]">
                    {activeEditorTab === 'WHATSAPP' ? 'WhatsApp Template Body' : 'Email Template Body'}
                  </label>
                  <textarea
                    rows={8}
                    value={activeEditorTab === 'WHATSAPP' ? templateText : emailTemplateText}
                    onChange={(e) => {
                      if (activeEditorTab === 'WHATSAPP') {
                        setTemplateText(e.target.value);
                      } else {
                        setEmailTemplateText(e.target.value);
                      }
                    }}
                    placeholder="Compose document message templates..."
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-indigo-500/50 p-3 rounded-xl text-xs font-medium text-[var(--text-primary)] outline-none resize-none transition-all leading-relaxed font-sans"
                  />
                </div>

                {/* Simulated live visual preview rendering */}
                <div className="flex flex-col gap-1 bg-indigo-500/5 border border-dashed border-indigo-500/25 p-4.5 rounded-xl text-left select-none relative">
                  <span className="absolute right-3.5 top-3 text-[7.5px] font-black uppercase text-indigo-400 tracking-widest bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                    Live Simulator Preview
                  </span>
                  <label className="text-[9.5px] font-extrabold uppercase tracking-wider text-indigo-300 flex items-center gap-1.5 mb-1.5">
                    <FileText className="w-3.5 h-3.5" /> Simulated Render Output ({activeEditorTab})
                  </label>
                  <div className="whitespace-pre-wrap text-[10.5px] font-medium text-[var(--text-primary)] leading-relaxed font-sans max-h-[120px] overflow-y-auto">
                    {getSimulatedPreview(activeEditorTab === 'WHATSAPP' ? templateText : emailTemplateText)}
                  </div>
                </div>

                <button
                  type="button"
                  disabled={templateLoading}
                  onClick={handleSaveTemplate}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-extrabold uppercase tracking-wider rounded-xl transition-all cursor-pointer border-0 flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/10 active:scale-95"
                >
                  {templateLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  Save Template
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
