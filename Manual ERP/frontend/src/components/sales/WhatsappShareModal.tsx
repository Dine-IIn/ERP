import React, { useState, useEffect } from 'react';
import { X, Send, MessageSquare, AlertCircle, CheckCircle2, Loader2, Info } from 'lucide-react';
import { apiClient } from '../../utils/apiService';

interface WhatsappShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentId: string;
  documentType: string;
  documentNumber: string;
  customerName: string;
  customerCode?: string;
  contactNo?: string;
  amount?: number | string;
  date?: string;
  dueDate?: string;
  currencySymbol?: string;
  pdfBase64?: string;
  pdfFilename?: string;
}

export default function WhatsappShareModal({
  isOpen,
  onClose,
  documentId,
  documentType,
  documentNumber,
  customerName,
  customerCode = '',
  contactNo = '',
  amount = '',
  date = '',
  dueDate = '',
  currencySymbol = '$',
  pdfBase64,
  pdfFilename
}: WhatsappShareModalProps) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Features list from localStorage
  const features = JSON.parse(localStorage.getItem('erp_company_features') || '[]');
  const hasShareLink = features.includes('WHATSAPP_SHARE_LINK');
  const hasLinkedDevice = features.includes('WHATSAPP_LINKED_DEVICE');

  useEffect(() => {
    if (isOpen) {
      setPhoneNumber(contactNo || '');
      setSuccessMsg(null);
      setErrorMsg(null);
      fetchTemplateAndCompile();
    }
  }, [isOpen, documentId, documentType]);

  const getDefaultTemplateText = (type: string) => {
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
  };

  const compileTemplate = (rawTemplate: string, companyName: string) => {
    const formattedAmount = typeof amount === 'number' 
      ? `${currencySymbol}${amount.toFixed(2)}` 
      : amount 
        ? `${currencySymbol}${amount}` 
        : '';

    const formattedDate = date ? new Date(date).toLocaleDateString() : '';
    const formattedDueDate = dueDate ? new Date(dueDate).toLocaleDateString() : '';

    const mappings: Record<string, string> = {
      companyName,
      customerName,
      customerCode,
      invoiceNumber: documentNumber,
      invoiceDate: formattedDate,
      invoiceAmount: formattedAmount,
      dueDate: formattedDueDate,
      quotationNumber: documentNumber,
      poNumber: documentNumber,
      challanNumber: documentNumber,
      receiptNumber: documentNumber
    };

    let result = rawTemplate;
    for (const key in mappings) {
      result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), mappings[key] || '');
    }
    return result;
  };

  const fetchTemplateAndCompile = async () => {
    setFetchLoading(true);
    setErrorMsg(null);
    try {
      // Fetch company profile to get legalCompanyName
      const profileRes = await apiClient.get<any>('/api/admin/company/profile');
      const companyName = profileRes?.company?.legalCompanyName || profileRes?.company?.name || 'Our Company';
      const defaultPrefix = profileRes?.company?.whatsappDefaultCountryCode || '+91';

      // Prefill prefix if phone doesn't have one
      if (contactNo) {
        let clean = contactNo.trim();
        if (!clean.startsWith('+') && clean.length === 10) {
          setPhoneNumber(defaultPrefix + clean);
        } else {
          setPhoneNumber(clean);
        }
      }

      // Fetch template
      const res = await apiClient.get<{ templates: any[] }>('/api/whatsapp/templates');
      const activeTemplate = res.templates?.find((t: any) => t.documentType === documentType && t.isActive);

      const templateBody = activeTemplate ? activeTemplate.template : getDefaultTemplateText(documentType);
      setMessageText(compileTemplate(templateBody, companyName));
    } catch (e: any) {
      console.error('Failed to load sharing template:', e);
      // Fallback
      setMessageText(compileTemplate(getDefaultTemplateText(documentType), 'Our Company'));
    } finally {
      setFetchLoading(false);
    }
  };

  const getCleanPhoneNumber = () => {
    // Remove all non-numeric characters except +
    let clean = phoneNumber.replace(/[^\d+]/g, '');
    if (clean.startsWith('+')) {
      clean = clean.substring(1);
    }
    return clean;
  };
  // Mode 1: Open WhatsApp Link
  const handleOpenLinkShare = async () => {
    const cleanPhone = getCleanPhoneNumber();
    if (!cleanPhone) {
      setErrorMsg('Please specify a valid recipient phone number.');
      return;
    }

    const encodedText = encodeURIComponent(messageText);
    const desktopUrl = `whatsapp://send?phone=${cleanPhone}&text=${encodedText}`;
    const webUrl = `https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`;

    // Try desktop protocol via custom iframe to prevent blank pages on unsupported systems
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = desktopUrl;
    document.body.appendChild(iframe);

    setTimeout(() => {
      document.body.removeChild(iframe);
      // If document still has focus, custom protocol failed to take focus (app not installed) -> fallback to web
      if (document.hasFocus()) {
        window.open(webUrl, '_blank');
      }
    }, 1500);
  };

  // Mode 2: Send Automatically
  const handleAutoSend = async () => {
    const cleanPhone = getCleanPhoneNumber();
    if (!cleanPhone) {
      setErrorMsg('Please specify a valid recipient phone number.');
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await apiClient.post<any>('/api/whatsapp/send', {
        recipientPhone: cleanPhone,
        customMessage: messageText,
        documentType,
        documentId,
        mode: 'AUTOMATED',
        pdfBase64,
        pdfFilename
      });
      setSuccessMsg(res.message || 'WhatsApp message successfully queued and sent in background!');
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (e: any) {
      setErrorMsg(e.message || 'Failed to dispatch automatic WhatsApp message. Verify server device is connected.');
    } finally {
      setLoading(false);
    }
  };
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in">
      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl w-full max-w-lg p-6 relative shadow-2xl text-left select-none animate-scale-up">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer bg-transparent border-0"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 pb-3 border-b border-[var(--border-color)]">
          <div className="p-2.5 bg-indigo-500/10 rounded-xl text-indigo-400 border border-indigo-500/20">
            <MessageSquare className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <h3 className="font-bold text-base text-[var(--text-primary)] font-display">
              Share via WhatsApp
            </h3>
            <p className="text-[var(--text-secondary)] text-[10px]">
              Document: {documentNumber} ({documentType.replace('_', ' ')})
            </p>
          </div>
        </div>

        {/* Alerts Banner */}
        {errorMsg && (
          <div className="p-3 mt-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 mt-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg text-xs flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Content Body */}
        <div className="mt-4 flex flex-col gap-4">
          {/* Recipient Phone */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider uppercase">Recipient Phone Number</label>
            <input
              type="text"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="e.g. +919999999999"
              className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-indigo-500/50 py-2 px-3 rounded-lg text-xs text-[var(--text-primary)] focus:outline-none"
            />
            <span className="text-[8px] text-[var(--text-muted)]">
              Specify full international format with country code prefix (e.g., +91 for India, +1 for US).
            </span>
          </div>

          {/* Message Content */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider uppercase">Prefilled Message Body</label>
            {fetchLoading ? (
              <div className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] h-32 flex items-center justify-center rounded-lg text-[10px] text-[var(--text-muted)] uppercase tracking-wider">
                <Loader2 className="w-4 h-4 animate-spin mr-1.5 text-indigo-400" /> Loading Template...
              </div>
            ) : (
              <textarea
                rows={6}
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Message details..."
                className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-indigo-500/50 p-3 rounded-lg text-xs text-[var(--text-primary)] focus:outline-none resize-none leading-relaxed"
              />
            )}
          </div>

          {/* Mode Warning if disconnected / not setup */}
          {!hasShareLink && !hasLinkedDevice && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-lg text-[10px] flex items-start gap-2.5">
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                WhatsApp communication features are currently disabled for your workspace by the administrator.
              </span>
            </div>
          )}

          {/* Action Footer Buttons */}
          <div className="flex gap-3 mt-2 border-t border-[var(--border-color)]/50 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-[var(--bg-tertiary)] border border-[var(--border-color)] hover:text-white font-bold py-2 rounded-lg text-xs cursor-pointer text-center transition-all"
            >
              Cancel
            </button>

            {hasShareLink && (
              <button
                type="button"
                onClick={handleOpenLinkShare}
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 rounded-lg text-xs cursor-pointer transition-all flex items-center justify-center gap-1 shadow-md shadow-indigo-600/10"
              >
                Open WhatsApp
              </button>
            )}

            {hasLinkedDevice && (
              <button
                type="button"
                disabled={loading || fetchLoading}
                onClick={handleAutoSend}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-600/50 text-white font-bold py-2 rounded-lg text-xs cursor-pointer transition-all flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/10"
              >
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3 h-3" />}
                Send Automatically
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
