import React, { useEffect } from 'react';
import './printStyles.css';

interface PrintManagerModalProps {
  isOpen?: boolean;
  onClose: () => void;
  title?: string;
  documentTitle?: string;
  children: React.ReactNode;
  documentRefNumber?: string;
  orientation?: 'portrait' | 'landscape';
}

export const PrintManagerModal: React.FC<PrintManagerModalProps> = ({
  isOpen = true,
  onClose,
  children,
  orientation = 'portrait'
}) => {
  useEffect(() => {
    if (!isOpen) return;

    // 1. Inject page orientation style tag
    let styleTag: HTMLStyleElement | null = null;
    if (orientation === 'landscape') {
      styleTag = document.createElement('style');
      styleTag.id = 'print-orientation-override';
      styleTag.innerHTML = '@page { size: A4 landscape !important; margin: 6mm 6mm !important; }';
      document.head.appendChild(styleTag);
      document.body.classList.add('print-landscape');
    } else {
      styleTag = document.createElement('style');
      styleTag.id = 'print-orientation-override';
      styleTag.innerHTML = '@page { size: A4 portrait !important; margin: 8mm 6mm !important; }';
      document.head.appendChild(styleTag);
      document.body.classList.remove('print-landscape');
    }

    // 2. Direct print trigger (immediate execution)
    const printTimer = setTimeout(() => {
      window.print();
    }, 40);

    const cleanup = () => {
      if (styleTag) {
        styleTag.remove();
      }
      document.body.classList.remove('print-landscape');
      window.removeEventListener('afterprint', cleanup);
      onClose();
    };

    window.addEventListener('afterprint', cleanup);

    return () => {
      clearTimeout(printTimer);
      if (styleTag) {
        styleTag.remove();
      }
      document.body.classList.remove('print-landscape');
      window.removeEventListener('afterprint', cleanup);
    };
  }, [isOpen, orientation, onClose]);

  if (!isOpen) return null;

  // Direct print container - completely invisible on screen, visible during print
  return (
    <div id="direct-print-area">
      {children}
    </div>
  );
};
