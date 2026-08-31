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
}

export const PrintManagerModal: React.FC<PrintManagerModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  documentRefNumber
}) => {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
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
