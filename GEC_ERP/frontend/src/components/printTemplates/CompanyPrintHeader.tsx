import React from 'react';

export interface CompanyInfo {
  name?: string;
  shortName?: string;
  tagline?: string;
  gstin?: string;
  pan?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  logoUrl?: string;
}

export const DEFAULT_COMPANY_INFO: CompanyInfo = {
  name: 'GHANSHYAM ENGINEERING CO.',
  shortName: 'GHANSHYAM ENG. CO.',
  tagline: 'Mfg : Plastic Injection Molding Machine',
  gstin: '24AAEFG4976H1Z9',
  pan: 'AAEFG4976H',
  address: 'Plot–3, R.S. : 792–793–795, Nr. Anjney Ind Zone–1, Shapar, Vill.: Shapar, Taluka : Kotda Sangani, Dist.: Rajkot - 360024, Gujarat, India',
  phone: '+91 90339 80809 | +91 98252 93732 | +91 96018 23402',
  email: 'info@ghanshyameng.com',
  website: 'ghanshyameng.com',
  logoUrl: 'assets/images/gec_logo.png'
};

export interface CompanyPrintHeaderProps {
  docTitle: string;
  docNumber?: string;
  docDate?: string;
  extraSubtitle?: string;
  companyInfo?: CompanyInfo;
  showLogo?: boolean;
}

/**
 * Pure Code / Vector Company Print Header
 * Location: frontend/src/components/printTemplates/CompanyPrintHeader.tsx
 * Reusable across PO, WO, Job Card, SO, Challan, Quotation, Assembly, GRN, QC
 */
export const CompanyPrintHeader: React.FC<CompanyPrintHeaderProps> = ({
  docTitle,
  docNumber,
  docDate,
  extraSubtitle,
  companyInfo = DEFAULT_COMPANY_INFO,
  showLogo = true
}) => {
  const info = { ...DEFAULT_COMPANY_INFO, ...companyInfo };

  return (
    <div 
      className="standard-print-header company-print-header" 
      style={{ 
        width: '100%', 
        marginBottom: '0.65rem', 
        fontFamily: 'Arial, Helvetica, sans-serif', 
        color: '#000000',
        pageBreakInside: 'avoid'
      }}
    >
      {/* Reconstructed Pure Code Branding Header Layout */}
      <div 
        style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          borderBottom: '2px solid #000000', 
          paddingBottom: '6px', 
          marginBottom: '6px' 
        }}
      >
        {/* Left: Pure Code Logo Emblem & Company Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {showLogo && (
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <img 
                src={info.logoUrl || 'assets/images/gec_logo.png'} 
                alt="GEC Logo" 
                style={{ height: '46px', width: 'auto', objectFit: 'contain', display: 'block' }}
                onError={(e: any) => {
                  // If image is missing, replace with Pure Code SVG GEC Emblem
                  e.currentTarget.style.display = 'none';
                  const fallback = e.currentTarget.nextElementSibling;
                  if (fallback) fallback.style.display = 'flex';
                }}
              />
              {/* Pure Code Vector Emblem Fallback */}
              <div 
                style={{ 
                  display: 'none', 
                  width: '46px', 
                  height: '46px', 
                  border: '2px solid #000000', 
                  borderRadius: '6px', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  flexDirection: 'column',
                  backgroundColor: '#000000',
                  color: '#ffffff',
                  fontWeight: 900,
                  fontSize: '11pt',
                  lineHeight: 1
                }}
              >
                <span>GEC</span>
              </div>
            </div>
          )}
          <div>
            <div 
              style={{ 
                fontSize: '15pt', 
                fontWeight: 900, 
                color: '#000000', 
                letterSpacing: '0.5px', 
                textTransform: 'uppercase', 
                lineHeight: 1.1 
              }}
            >
              {info.name}
            </div>
            <div 
              style={{ 
                display: 'inline-block', 
                marginTop: '3px', 
                padding: '1px 8px', 
                border: '1px solid #000000', 
                borderRadius: '3px', 
                fontSize: '7.5pt', 
                fontWeight: 700, 
                color: '#000000', 
                textTransform: 'uppercase', 
                letterSpacing: '0.4px' 
              }}
            >
              {info.tagline}
            </div>
          </div>
        </div>

        {/* Right: Pure Code GSTIN, Email, Website */}
        <div style={{ textAlign: 'right', fontSize: '8pt', lineHeight: 1.35, color: '#000000' }}>
          <div style={{ fontWeight: 800, fontSize: '8.5pt' }}>
            GST NO. : <span style={{ fontFamily: 'monospace', fontWeight: 900 }}>{info.gstin}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px', marginTop: '1px' }}>
            <span>{info.email}</span>
            <span style={{ fontSize: '9pt' }}>✉️</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
            <span style={{ fontWeight: 600 }}>{info.website}</span>
            <span style={{ fontSize: '9pt' }}>🌐</span>
          </div>
        </div>
      </div>

      {/* Document Title Center Badge */}
      <div style={{ textAlign: 'center', margin: '4px 0 6px 0' }}>
        <span 
          style={{ 
            display: 'inline-block',
            backgroundColor: '#000000', 
            color: '#ffffff', 
            fontWeight: 900, 
            fontSize: '11pt', 
            padding: '3px 20px', 
            borderRadius: '3px', 
            letterSpacing: '1px',
            textTransform: 'uppercase'
          }}
        >
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

export default CompanyPrintHeader;
