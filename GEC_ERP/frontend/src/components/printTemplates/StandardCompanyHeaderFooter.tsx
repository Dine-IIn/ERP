import React from 'react';
import { GEC_PRODUCTS_DATA } from '../../data/quotationProductsData';

export interface CompanyInfo {
  name?: string;
  shortName?: string;
  gstin?: string;
  pan?: string;
  address?: string;
  phone?: string;
  email?: string;
}

export const DEFAULT_COMPANY_INFO: CompanyInfo = {
  name: 'GHANSHYAM ENGINEERING CO.',
  shortName: 'GHANSHYAM ENG. CO.',
  gstin: '24AAEFG4976H1Z9',
  pan: 'AAEFG4976H',
  address: 'Plot–3, R.S. : 792–793–795, Nr. Anjney Ind Zone–1, Shapar, Vill.: Shapar, Taluka : Kotda Sangani, Dist.: Rajkot - 360024, Gujarat, India',
  phone: '+91 90339 80809 / +91 98252 93732 / +91 96018 23402',
  email: 'ghanshyamengco@gmail.com'
};

/**
 * Standard Modular Company Print Header
 * Reusable across PO, WO, Job Card, SO, Challan, Quotation
 */
export const StandardCompanyPrintHeader: React.FC<{
  docTitle: string;
  docNumber?: string;
  docDate?: string;
  extraSubtitle?: string;
  companyInfo?: CompanyInfo;
}> = ({ docTitle, docNumber, docDate, extraSubtitle, companyInfo = DEFAULT_COMPANY_INFO }) => {
  return (
    <div className="standard-print-header" style={{ width: '100%', marginBottom: '0.65rem', fontFamily: 'Arial, sans-serif', color: '#000000' }}>
      
      {/* Reconstructed Vector Branding Header Layout */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #000000', paddingBottom: '6px', marginBottom: '6px' }}>
        
        {/* Left: Logo & Company Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img 
            src="assets/images/gec_logo.png" 
            alt="GEC Logo" 
            style={{ height: '48px', width: 'auto', objectFit: 'contain', display: 'block' }}
            onError={(e: any) => {
              // Try fallback to gec_header or hide if not present yet
              if (!e.currentTarget.src.includes('gec_header.png')) {
                e.currentTarget.src = 'assets/images/gec_header.png';
              } else {
                e.currentTarget.style.display = 'none';
              }
            }}
          />
          <div>
            <div style={{ fontSize: '15pt', fontWeight: 900, color: '#000000', letterSpacing: '0.5px', textTransform: 'uppercase', lineHeight: 1.1 }}>
              {companyInfo.name || 'GHANSHYAM ENGINEERING CO.'}
            </div>
            <div style={{ display: 'inline-block', marginTop: '3px', padding: '1px 8px', border: '1px solid #000000', borderRadius: '3px', fontSize: '7.5pt', fontWeight: 700, color: '#000000', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
              Mfg : Plastic Injection Molding Machine
            </div>
          </div>
        </div>

        {/* Right: GSTIN, Email, Website with icons */}
        <div style={{ textAlign: 'right', fontSize: '8pt', lineHeight: 1.35, color: '#000000' }}>
          <div style={{ fontWeight: 800, fontSize: '8.5pt' }}>
            GST NO. : <span style={{ fontFamily: 'monospace', fontWeight: 900 }}>{companyInfo.gstin || '24AAEFG4976H1Z9'}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px', marginTop: '1px' }}>
            <span>info@ghanshyameng.com</span>
            <span style={{ fontSize: '9pt' }}>✉️</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
            <span style={{ fontWeight: 600 }}>ghanshyameng.com</span>
            <span style={{ fontSize: '9pt' }}>🌐</span>
          </div>
        </div>

      </div>

      {/* Document Title Center Badge */}
      <div style={{ textAlign: 'center', margin: '4px 0 6px 0' }}>
        <span style={{ 
          display: 'inline-block',
          backgroundColor: '#000000', 
          color: '#ffffff', 
          fontWeight: 900, 
          fontSize: '11pt', 
          padding: '3px 20px', 
          borderRadius: '3px', 
          letterSpacing: '1px',
          textTransform: 'uppercase'
        }}>
          {docTitle}
        </span>
        {extraSubtitle && (
          <div style={{ fontSize: '8pt', color: '#000000', marginTop: '2px', fontWeight: 700 }}>
            {extraSubtitle}
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Standard Modular Company Print Footer matching Quotation App
 * Reusable across PO, WO, Job Card, SO, Challan, Quotation
 */
export const StandardCompanyPrintFooter: React.FC<{
  pageNumber?: number;
  totalPages?: number;
  companyInfo?: CompanyInfo;
}> = ({ companyInfo = DEFAULT_COMPANY_INFO }) => {
  return (
    <div className="standard-print-footer" style={{ marginTop: '0.75rem', width: '100%', fontFamily: 'Arial, sans-serif', pageBreakInside: 'avoid' }}>
      {/* Contact & Address Strip exact match to Quotation App */}
      <div style={{ border: '1px solid #1b2762', borderRadius: '3px', overflow: 'hidden' }}>
        <div style={{ textAlign: 'center', padding: '3px 8px', fontSize: '7.5pt', fontWeight: 700, color: '#1b2762', backgroundColor: '#f1f5f9', borderBottom: '1px solid #1b2762' }}>
          📞 {companyInfo.phone || '+91 90339 80809 | +91 98252 93732 | +91 96018 23402'} &nbsp;|&nbsp; ✉️ {companyInfo.email || 'ghanshyamengco@gmail.com'}
        </div>
        <div style={{ backgroundColor: '#1b2762', color: '#ffffff', textAlign: 'center', padding: '3px 8px', fontSize: '7pt', fontWeight: 600, letterSpacing: '0.2px' }}>
          📍 {companyInfo.address}
        </div>
      </div>
    </div>
  );
};

/**
 * Number to Indian Currency Words helper
 */
export const formatAmountInWords = (amount: number): string => {
  if (!amount || isNaN(amount) || amount <= 0) return 'Rupees Zero Only';
  const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  
  const inWords = (n: number): string => {
    if ((n = n.toString() as any).length > 9) return 'overflow';
    const n_ = ('000000000' + n).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
    if (!n_) return '';
    let str = '';
    str += (Number(n_[1]) !== 0) ? (a[Number(n_[1])] || b[n_[1][0]] + ' ' + a[n_[1][1]]) + 'Crore ' : '';
    str += (Number(n_[2]) !== 0) ? (a[Number(n_[2])] || b[n_[2][0]] + ' ' + a[n_[2][1]]) + 'Lakh ' : '';
    str += (Number(n_[3]) !== 0) ? (a[Number(n_[3])] || b[n_[3][0]] + ' ' + a[n_[3][1]]) + 'Thousand ' : '';
    str += (Number(n_[4]) !== 0) ? (a[Number(n_[4])] || b[n_[4][0]] + ' ' + a[n_[4][1]]) + 'Hundred ' : '';
    str += (Number(n_[5]) !== 0) ? ((str !== '') ? 'and ' : '') + (a[Number(n_[5])] || b[n_[5][0]] + ' ' + a[n_[5][1]]) : '';
    return str.trim();
  };
  
  return `INR ${inWords(Math.round(amount))} Only`;
};
