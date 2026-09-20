import React, { useState, useEffect, useMemo } from 'react';
import { useERP } from '../../context/ERPContext';
import { Mail, Paperclip, Send, CheckCircle2, AlertCircle, X, FileText, CheckSquare, Square } from 'lucide-react';
import { EmailSendPayload, AdditionalFileVersion } from '../../types/erp';

export interface ShareViaEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentType: 'SALES_ORDER' | 'WORK_ORDER' | 'PURCHASE_ORDER' | 'JOB_CARD' | 'JOB_WORK' | 'QUOTATION';
  documentNumber: string;
  recipientEmail?: string;
  recipientName?: string;
  partyName?: string;
  documentAmount?: number;
  documentPdfBase64?: string;
  availableCadFiles?: Array<{
    name: string;
    version: string;
    type: string;
    data?: string;
    size?: number;
  }>;
}

export const ShareViaEmailModal: React.FC<ShareViaEmailModalProps> = ({
  isOpen,
  onClose,
  documentType,
  documentNumber,
  recipientEmail = '',
  recipientName = '',
  partyName = '',
  documentAmount = 0,
  documentPdfBase64,
  availableCadFiles = []
}) => {
  const { smtpConfigs, emailTemplates, sendEmail, currentUser } = useERP();

  const [to, setTo] = useState(recipientEmail);
  const [cc, setCc] = useState('');
  const [bcc, setBcc] = useState('');
  const [subject, setSubject] = useState('');
  const [bodyText, setBodyText] = useState('');
  const [selectedCadFileNames, setSelectedCadFileNames] = useState<string[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'danger' } | null>(null);

  // Derive active SMTP config and Template for this module
  const smtpConfig = smtpConfigs[documentType];
  const template = emailTemplates[documentType];

  const formatDocTypeLabel = (dt: string) => {
    switch (dt) {
      case 'SALES_ORDER': return 'Sales Order';
      case 'WORK_ORDER': return 'Work Order';
      case 'PURCHASE_ORDER': return 'Purchase Order';
      case 'JOB_CARD': return 'Job Card';
      case 'JOB_WORK': return 'Job Work Challan';
      case 'QUOTATION': return 'Machine Quotation';
      default: return dt;
    }
  };

  // Helper to replace template placeholders
  const replacePlaceholders = (text: string): string => {
    const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    return text
      .replace(/{docNumber}/g, documentNumber)
      .replace(/{docType}/g, formatDocTypeLabel(documentType))
      .replace(/{partyName}/g, partyName || recipientName || 'Valued Partner')
      .replace(/{recipientName}/g, recipientName || partyName || 'Sir/Madam')
      .replace(/{date}/g, today)
      .replace(/{amount}/g, documentAmount > 0 ? `₹${documentAmount.toLocaleString()}` : '')
      .replace(/{senderName}/g, currentUser?.fullName || 'Gujarat Enterprise')
      .replace(/{companyName}/g, 'Gujarat Enterprise (GEC)');
  };

  // Initialize fields upon opening
  useEffect(() => {
    if (isOpen) {
      setTo(recipientEmail);
      setStatusMessage(null);
      
      // Auto-select all available CAD files by default
      setSelectedCadFileNames(availableCadFiles.map(f => f.name));

      const defaultSubject = template?.subject 
        ? replacePlaceholders(template.subject)
        : `[GEC ERP] Official ${formatDocTypeLabel(documentType)}: ${documentNumber} - ${partyName || 'Gujarat Enterprise'}`;

      const defaultBody = template?.body
        ? replacePlaceholders(template.body)
        : `Dear ${recipientName || partyName || 'Sir/Madam'},\n\nPlease find attached the official ${formatDocTypeLabel(documentType)} document #${documentNumber} from Gujarat Enterprise.\n\nDocument Summary:\n• Document Reference: ${documentNumber}\n• Issued Date: ${new Date().toLocaleDateString('en-IN')}\n${documentAmount > 0 ? `• Value: ₹${documentAmount.toLocaleString()}\n` : ''}\nKindly acknowledge receipt of this email.\n\nBest Regards,\n${currentUser?.fullName || 'Gujarat Enterprise Team'}\nGujarat Enterprise (GEC Machines)\nRajkot, Gujarat, India\nWebsite: www.gecmachines.com`;

      setSubject(defaultSubject);
      setBodyText(defaultBody);
    }
  }, [isOpen, documentType, documentNumber, recipientEmail, recipientName, partyName, documentAmount, template]);

  if (!isOpen) return null;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!to.trim()) {
      setStatusMessage({ text: 'Please enter at least one valid recipient email address.', type: 'danger' });
      return;
    }

    setIsSending(true);
    setStatusMessage(null);

    // Build attachments
    const attachments: Array<{ filename: string; content?: string; path?: string; contentType?: string }> = [];

    // 1. Primary document PDF
    const primaryPdfName = `${documentType}_${documentNumber.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
    attachments.push({
      filename: primaryPdfName,
      content: documentPdfBase64 || 'UEZGIGZha2UgY29udGVudA==',
      contentType: 'application/pdf'
    });

    // 2. Selected CAD / Drawing files
    selectedCadFileNames.forEach(name => {
      const found = availableCadFiles.find(f => f.name === name);
      if (found) {
        attachments.push({
          filename: found.name,
          content: found.data || 'Q0FEIGZha2UgY29udGVudA==',
          contentType: found.type || 'application/octet-stream'
        });
      }
    });

    const payload: EmailSendPayload = {
      documentType,
      documentNumber,
      to: to.trim(),
      cc: cc.trim() || undefined,
      bcc: bcc.trim() || undefined,
      subject: subject.trim(),
      body: bodyText,
      attachments
    };

    try {
      const res = await sendEmail(payload);
      if (res.success) {
        setStatusMessage({
          text: `✓ Email successfully dispatched! Reference Message ID: ${res.messageId || 'SENT-OK'}`,
          type: 'success'
        });
        setTimeout(() => {
          onClose();
        }, 1800);
      } else {
        setStatusMessage({
          text: `❌ Email sending failed: ${res.error || 'Check SMTP configuration in Security & RBAC.'}`,
          type: 'danger'
        });
      }
    } catch (err: any) {
      setStatusMessage({
        text: `❌ Unexpected error: ${err.message}`,
        type: 'danger'
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1200 }}>
      <div 
        className="card" 
        style={{ 
          maxWidth: '680px', 
          width: '95%', 
          maxHeight: '90vh', 
          display: 'flex', 
          flexDirection: 'column', 
          padding: '1.25rem',
          backgroundColor: 'var(--bg-card)'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#0284c7', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Mail size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                Share {formatDocTypeLabel(documentType)} via Email
              </h3>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Direct SMTP Dispatch • Document #{documentNumber} • {partyName || 'Customer/Vendor'}
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <X size={18} />
          </button>
        </div>

        {/* Status Notification */}
        {statusMessage && (
          <div style={{
            padding: '0.65rem 0.85rem',
            borderRadius: '6px',
            fontSize: '0.82rem',
            fontWeight: 600,
            marginBottom: '0.85rem',
            backgroundColor: statusMessage.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            color: statusMessage.type === 'success' ? 'var(--success)' : 'var(--danger)',
            border: `1px solid ${statusMessage.type === 'success' ? 'var(--success)' : 'var(--danger)'}`
          }}>
            {statusMessage.text}
          </div>
        )}

        {/* SMTP Account Warning if not configured */}
        {!smtpConfig?.auth?.user && (
          <div style={{ padding: '0.5rem 0.75rem', backgroundColor: 'rgba(245, 158, 11, 0.1)', border: '1px solid #f59e0b', borderRadius: '6px', fontSize: '0.75rem', color: '#b45309', marginBottom: '0.85rem' }}>
            ℹ️ <strong>SMTP Notice:</strong> Using default system mailer. You can configure dedicated credentials for {formatDocTypeLabel(documentType)} in <em>Security & RBAC &gt; Email &amp; SMTP Settings</em>.
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSend} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', flex: 1, overflowY: 'auto' }}>
          
          <div className="form-grid-2">
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 700 }}>Recipient Email (To) *</label>
              <input 
                type="email" 
                required 
                className="input-field" 
                placeholder="client@company.com" 
                value={to} 
                onChange={(e) => setTo(e.target.value)} 
              />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 700 }}>CC (Comma Separated)</label>
              <input 
                type="text" 
                className="input-field" 
                placeholder="accounts@company.com, manager@gecmachines.com" 
                value={cc} 
                onChange={(e) => setCc(e.target.value)} 
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 700 }}>Email Subject *</label>
            <input 
              type="text" 
              required 
              className="input-field" 
              style={{ fontWeight: 600 }}
              value={subject} 
              onChange={(e) => setSubject(e.target.value)} 
            />
          </div>

          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 700 }}>Message Content / Cover Note</label>
            <textarea 
              rows={6} 
              className="input-field" 
              style={{ fontSize: '0.82rem', fontFamily: 'inherit', lineHeight: 1.5 }}
              value={bodyText} 
              onChange={(e) => setBodyText(e.target.value)} 
            />
          </div>

          {/* Attachments Section */}
          <div style={{ border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.75rem', backgroundColor: 'var(--bg-tertiary)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
              <Paperclip size={14} /> Attached Files ({1 + selectedCadFileNames.length})
            </div>

            {/* Document PDF Attachment */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.6rem', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '4px', marginBottom: '0.4rem' }}>
              <FileText size={16} color="#0284c7" />
              <div style={{ flex: 1, fontSize: '0.8rem', fontWeight: 600 }}>
                {documentType}_{documentNumber}.pdf
              </div>
              <span className="badge badge-primary" style={{ fontSize: '0.7rem' }}>Primary PDF</span>
            </div>

            {/* Additional CAD Drawings Checkboxes */}
            {availableCadFiles.length > 0 && (
              <div style={{ marginTop: '0.5rem' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  Select Additional Technical CAD Files to Attach:
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  {availableCadFiles.map((cad, idx) => {
                    const isChecked = selectedCadFileNames.includes(cad.name);
                    return (
                      <label 
                        key={idx}
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'space-between',
                          padding: '0.35rem 0.55rem', 
                          borderRadius: '4px',
                          backgroundColor: isChecked ? 'rgba(59, 130, 246, 0.08)' : 'var(--bg-card)',
                          border: `1px solid ${isChecked ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                          cursor: 'pointer',
                          fontSize: '0.78rem'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <input 
                            type="checkbox" 
                            checked={isChecked}
                            onChange={() => {
                              if (isChecked) {
                                setSelectedCadFileNames(prev => prev.filter(n => n !== cad.name));
                              } else {
                                setSelectedCadFileNames(prev => [...prev, cad.name]);
                              }
                            }}
                          />
                          <span style={{ fontWeight: 600 }}>{cad.name}</span>
                          <span className="badge badge-neutral" style={{ fontSize: '0.68rem' }}>{cad.version}</span>
                        </div>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          {cad.size ? `${(cad.size / 1024).toFixed(1)} KB` : 'CAD File'}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem', marginTop: '0.5rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSending}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSending} style={{ gap: '0.4rem', fontWeight: 700 }}>
              {isSending ? (
                <>Sending via SMTP...</>
              ) : (
                <>
                  <Send size={15} /> Send Email Now
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
