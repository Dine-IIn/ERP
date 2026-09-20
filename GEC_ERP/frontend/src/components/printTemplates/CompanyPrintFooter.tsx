import React from 'react';
import { CompanyInfo, DEFAULT_COMPANY_INFO } from './CompanyPrintHeader';

export interface CompanyPrintFooterProps {
  pageNumber?: number;
  totalPages?: number;
  companyInfo?: CompanyInfo;
  showPageNumbers?: boolean;
}

/**
 * Standard Modular Company Print Footer matching Quotation App
 * Reusable across PO, WO, Job Card, SO, Challan, Quotation, Assembly, GRN
 */
export const CompanyPrintFooter: React.FC<CompanyPrintFooterProps> = ({
  companyInfo = DEFAULT_COMPANY_INFO,
  pageNumber,
  totalPages,
  showPageNumbers = false
}) => {
  const info = { ...DEFAULT_COMPANY_INFO, ...companyInfo };

  return (
    <div 
      className="standard-print-footer company-print-footer" 
      style={{ 
        marginTop: '0.75rem', 
        width: '100%', 
        fontFamily: 'Arial, Helvetica, sans-serif', 
        pageBreakInside: 'avoid' 
      }}
    >
      {/* Contact & Address Strip exact match to Quotation App */}
      <div 
        style={{ 
          border: '1px solid #1b2762', 
          borderRadius: '3px', 
          overflow: 'hidden' 
        }}
      >
        <div 
          style={{ 
            textAlign: 'center', 
            padding: '3px 8px', 
            fontSize: '7.5pt', 
            fontWeight: 700, 
            color: '#1b2762', 
            backgroundColor: '#f1f5f9', 
            borderBottom: '1px solid #1b2762' 
          }}
        >
          📞 {info.phone} &nbsp;|&nbsp; ✉️ {info.email}
        </div>
        <div 
          style={{ 
            backgroundColor: '#1b2762', 
            color: '#ffffff', 
            textAlign: 'center', 
            padding: '3px 8px', 
            fontSize: '7pt', 
            fontWeight: 600, 
            letterSpacing: '0.2px' 
          }}
        >
          📍 {info.address}
        </div>
      </div>

      {showPageNumbers && pageNumber !== undefined && (
        <div 
          style={{ 
            textAlign: 'right', 
            fontSize: '6.5pt', 
            color: '#000000', 
            marginTop: '2px', 
            fontFamily: 'Arial, sans-serif' 
          }}
        >
          Page {pageNumber} {totalPages ? `of ${totalPages}` : ''}
        </div>
      )}
    </div>
  );
};

export default CompanyPrintFooter;
