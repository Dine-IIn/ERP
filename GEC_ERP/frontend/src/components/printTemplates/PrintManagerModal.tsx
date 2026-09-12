import React from 'react';
import { Modal } from '../common/Modal';
import { Printer } from 'lucide-react';
import './printStyles.css';

interface PrintManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  documentRefNumber?: string;
  orientation?: 'portrait' | 'landscape';
}

export const PrintManagerModal: React.FC<PrintManagerModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  documentRefNumber,
  orientation = 'portrait'
}) => {
  if (!isOpen) return null;

  const handlePrint = () => {
    let styleTag: HTMLStyleElement | null = null;
    if (orientation === 'landscape') {
      styleTag = document.createElement('style');
      styleTag.id = 'print-orientation-override';
      styleTag.innerHTML = '@page { size: A4 landscape !important; margin: 6mm 8mm !important; }';
      document.head.appendChild(styleTag);
      document.body.classList.add('print-landscape');
    }

    window.print();

    const cleanup = () => {
      if (styleTag) styleTag.remove();
      document.body.classList.remove('print-landscape');
      window.removeEventListener('afterprint', cleanup);
    };
    window.addEventListener('afterprint', cleanup);
    setTimeout(cleanup, 2000);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* Toolbar with print button and ref */}
        <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-tertiary)', padding: '0.6rem 1rem', borderRadius: '0.375rem', border: '1px solid var(--border-color)' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Document Preview {documentRefNumber && <strong>• Ref: {documentRefNumber}</strong>}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Close (ESC)
            </button>
            <button type="button" className="btn btn-primary" onClick={handlePrint} style={{ gap: '0.35rem' }}>
              <Printer size={15} /> Print / Save PDF
            </button>
          </div>
        </div>

        {/* Printable Area Container */}
        <div id="printable-area" style={{ backgroundColor: '#ffffff', color: '#111827', padding: '1.5rem', borderRadius: '0.5rem', border: '1px solid #e5e7eb', maxHeight: '72vh', overflowY: 'auto' }}>
          {children}
        </div>
      </div>
    </Modal>
  );
};
