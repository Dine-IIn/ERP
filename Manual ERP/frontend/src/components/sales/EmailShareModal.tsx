import React, { useState, useEffect } from 'react';
import { X, Send, Mail, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { apiClient } from '../../utils/apiService';

interface EmailShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipientEmail?: string;
  subject: string;
  body: string;
  pdfBase64?: string;
  pdfFilename?: string;
  emailApiUrl?: string; // Optional custom endpoint
}

export default function EmailShareModal({
  isOpen,
  onClose,
  recipientEmail = '',
  subject,
  body,
  pdfBase64,
  pdfFilename,
  emailApiUrl
}: EmailShareModalProps) {
  const [emailAddress, setEmailAddress] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setEmailAddress(recipientEmail || '');
      setEmailSubject(subject || '');
      setEmailBody(body || '');
      setSuccessMsg(null);
      setErrorMsg(null);
    }
  }, [isOpen, recipientEmail, subject, body]);

  const handleSend = async () => {
    if (!emailAddress.trim()) {
      setErrorMsg('Please specify a valid recipient email address.');
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const endpoint = emailApiUrl || '/api/email/send';
      const payload = {
        to: emailAddress.trim(),
        subject: emailSubject,
        body: emailBody,
        pdfBase64,
        pdfFilename
      };

      const res = await apiClient.post<any>(endpoint, payload);
      setSuccessMsg(res.message || 'Email successfully dispatched with attachment!');
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (e: any) {
      setErrorMsg(e.message || 'Failed to send email. Verify SMTP configuration.');
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
            <Mail className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <h3 className="font-bold text-base text-[var(--text-primary)] font-display">
              Send via Email
            </h3>
            {pdfFilename && (
              <p className="text-[var(--text-secondary)] text-[10px]">
                Attachment: {pdfFilename}
              </p>
            )}
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
          {/* Recipient Email */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider uppercase">Recipient Email Address</label>
            <input
              type="email"
              value={emailAddress}
              onChange={(e) => setEmailAddress(e.target.value)}
              placeholder="e.g. client@example.com"
              className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-indigo-500/50 py-2 px-3 rounded-lg text-xs text-[var(--text-primary)] focus:outline-none"
            />
          </div>

          {/* Subject */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider uppercase">Subject</label>
            <input
              type="text"
              value={emailSubject}
              onChange={(e) => setEmailSubject(e.target.value)}
              placeholder="Email subject..."
              className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-indigo-500/50 py-2 px-3 rounded-lg text-xs text-[var(--text-primary)] focus:outline-none"
            />
          </div>

          {/* Email Body */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider uppercase">Message Body</label>
            <textarea
              rows={6}
              value={emailBody}
              onChange={(e) => setEmailBody(e.target.value)}
              placeholder="Email message..."
              className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-indigo-500/50 p-3 rounded-lg text-xs text-[var(--text-primary)] focus:outline-none resize-none leading-relaxed"
            />
          </div>

          {/* Action Footer Buttons */}
          <div className="flex gap-3 mt-2 border-t border-[var(--border-color)]/50 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-[var(--bg-tertiary)] border border-[var(--border-color)] hover:text-white font-bold py-2 rounded-lg text-xs cursor-pointer text-center transition-all"
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={loading}
              onClick={handleSend}
              className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 text-white font-bold py-2 rounded-lg text-xs cursor-pointer transition-all flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/10"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3 h-3" />}
              Send Email
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
