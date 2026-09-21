import React from 'react';

// ─────────────────────────────────────────────────────────────
// Types & Defaults
// ─────────────────────────────────────────────────────────────

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
  headerImageUrl?: string;
}

export const DEFAULT_COMPANY_INFO: CompanyInfo = {
  name: 'GHANSHYAM ENGINEERING CO.',
  shortName: 'GHANSHYAM ENG. CO.',
  tagline: 'Mfg : Plastic Injection Molding Machine',
  gstin: '24AAEFG4976H1Z9',
  pan: 'AAEFG4976H',
  address:
    'Plot–3, R.S. : 792–793–795, Nr. Anjney Ind Zone–1, Shapar, Vill.: Shapar, Taluka : Kotda Sangani, Dist.: Rajkot - 360024, Gujarat, India',
  phone: '+91 90339 80809 | +91 98252 93732 | +91 96018 23402',
  email: 'info@ghanshyameng.com',
  website: 'ghanshyameng.com',
  logoUrl: 'assets/images/gec_logo.png',
  headerImageUrl: 'assets/images/gec_header.png',
};

export interface CompanyPrintHeaderProps {
  docTitle: string;
  docNumber?: string;
  docDate?: string;
  extraSubtitle?: string;
  companyInfo?: CompanyInfo;
  showLogo?: boolean;
}

// ─────────────────────────────────────────────────────────────
// Brand colour constant & Print Fix
// ─────────────────────────────────────────────────────────────

const NAVY = '#2e2d6b';

const printColorFix: React.CSSProperties = {
  WebkitPrintColorAdjust: 'exact',
  printColorAdjust: 'exact',
};

/*
// ─────────────────────────────────────────────────────────────
// PRESERVED VECTOR HEADER COMPONENTS (Commented out for now as requested)
// ─────────────────────────────────────────────────────────────

const EnvelopeIcon: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <span
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: size,
      height: size,
      borderRadius: '50%',
      border: `1.5px solid ${NAVY}`,
      flexShrink: 0,
    }}
  >
    <svg
      viewBox="0 0 20 20"
      width={size * 0.55}
      height={size * 0.55}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="2" y="4" width="16" height="12" rx="1.5" stroke={NAVY} strokeWidth="1.6" fill="none" />
      <path d="M2 5.5L10 11L18 5.5" stroke={NAVY} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  </span>
);

const GlobeIcon: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <span
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: size,
      height: size,
      borderRadius: '50%',
      border: `1.5px solid ${NAVY}`,
      flexShrink: 0,
    }}
  >
    <svg
      viewBox="0 0 20 20"
      width={size * 0.6}
      height={size * 0.6}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="10" cy="10" r="7.5" stroke={NAVY} strokeWidth="1.4" />
      <ellipse cx="10" cy="10" rx="3.2" ry="7.5" stroke={NAVY} strokeWidth="1.2" />
      <line x1="2.5" y1="10" x2="17.5" y2="10" stroke={NAVY} strokeWidth="1.2" />
      <line x1="4" y1="5.5" x2="16" y2="5.5" stroke={NAVY} strokeWidth="0.8" />
      <line x1="4" y1="14.5" x2="16" y2="14.5" stroke={NAVY} strokeWidth="0.8" />
    </svg>
  </span>
);

const GECLogoFallback: React.FC<{ size?: number }> = ({ size = 54 }) => (
  <svg
    viewBox="0 0 56 56"
    width={size}
    height={size}
    xmlns="http://www.w3.org/2000/svg"
    aria-label="GEC Logo"
  >
    <rect x="1" y="1" width="54" height="54" rx="8" ry="8" fill="#4a4867" />
    <polygon points="28,12 44,21 28,30 12,21" fill="#6e6c8e" />
    <polygon points="12,21 28,30 28,44 12,35" fill="#35355a" />
    <polygon points="28,30 44,21 44,35 28,44" fill="#55557a" />
    <polygon points="28,16 37,22 28,28 19,22" fill="#8886a6" opacity="0.4" />
  </svg>
);
*/

// ─────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────

export const CompanyPrintHeader: React.FC<CompanyPrintHeaderProps> = ({
  docTitle,
  docNumber,
  docDate,
  extraSubtitle,
  companyInfo = DEFAULT_COMPANY_INFO,
  showLogo = true,
}) => {
  const info = { ...DEFAULT_COMPANY_INFO, ...companyInfo };

  return (
    <div
      className="standard-print-header company-print-header"
      style={{
        width: '100%',
        marginBottom: '0.35rem',
        fontFamily: 'Arial, Helvetica, sans-serif',
        color: '#000000',
        pageBreakInside: 'avoid',
        ...printColorFix,
      }}
    >
      {/* Official Header Image (Active) */}
      <div style={{ width: '100%', marginBottom: '4px' }}>
        <img
          src={info.headerImageUrl || 'assets/images/gec_header.png'}
          alt="Ghanshyam Engineering Co."
          style={{
            width: '100%',
            height: 'auto',
            display: 'block',
            maxHeight: '82px',
            objectFit: 'contain',
          }}
        />
      </div>

      {/* 
      ═══════════════════════════════════════════════════════
      VECTOR HEADER LAYOUT (COMMENTED OUT AS REQUESTED)
      ═══════════════════════════════════════════════════════
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          paddingBottom: '4px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
          {showLogo && (
            <div style={{ flexShrink: 0, paddingTop: '2px' }}>
              <img
                src={info.logoUrl || 'assets/images/gec_logo.png'}
                alt="GEC"
                style={{
                  height: '54px',
                  width: 'auto',
                  objectFit: 'contain',
                  display: 'block',
                }}
              />
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div
              style={{
                fontFamily: "'Arial Black', 'Impact', Arial, sans-serif",
                fontSize: '28pt',
                fontWeight: 900,
                color: NAVY,
                letterSpacing: '-0.3px',
                lineHeight: 1,
              }}
            >
              GEC
              <sup
                style={{
                  fontSize: '9pt',
                  fontWeight: 700,
                  verticalAlign: 'super',
                  marginLeft: '1px',
                }}
              >
                ™
              </sup>
            </div>

            <div
              style={{
                fontSize: '9pt',
                fontWeight: 700,
                fontStyle: 'italic',
                color: NAVY,
                marginTop: '1px',
                letterSpacing: '0.15px',
              }}
            >
              Excellence assured.
            </div>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: '2px',
          }}
        >
          <div
            style={{
              backgroundColor: NAVY,
              color: '#ffffff',
              fontSize: '10.5pt',
              fontWeight: 700,
              fontStyle: 'italic',
              padding: '3px 16px 3px 20px',
              borderRadius: '14px 0 0 14px',
              letterSpacing: '0.15px',
              lineHeight: 1.3,
              whiteSpace: 'nowrap',
              ...printColorFix,
            }}
          >
            Ghanshyam Engineering Co.
          </div>

          <div
            style={{
              fontSize: '10pt',
              fontWeight: 800,
              color: NAVY,
              letterSpacing: '0.15px',
              marginTop: '2px',
              paddingRight: '4px',
              whiteSpace: 'nowrap',
            }}
          >
            GST NO. :{' '}
            <span
              style={{
                fontFamily: "'Arial Black', Arial, sans-serif",
                fontWeight: 900,
              }}
            >
              {info.gstin}
            </span>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              fontSize: '9pt',
              fontWeight: 700,
              fontStyle: 'italic',
              color: NAVY,
              paddingRight: '4px',
              whiteSpace: 'nowrap',
            }}
          >
            <span>Info@ghanshyameng.com</span>
            <EnvelopeIcon size={15} />
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              fontSize: '9pt',
              fontWeight: 700,
              fontStyle: 'italic',
              color: NAVY,
              paddingRight: '4px',
              whiteSpace: 'nowrap',
            }}
          >
            <span>ghanshyameng.com</span>
            <GlobeIcon size={15} />
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          width: '100%',
        }}
      >
        <div
          style={{
            backgroundColor: NAVY,
            color: '#ffffff',
            fontSize: '8.5pt',
            fontWeight: 700,
            fontStyle: 'italic',
            padding: '3px 16px 3px 6px',
            borderRadius: '0 10px 0 0',
            whiteSpace: 'nowrap',
            lineHeight: 1.35,
            ...printColorFix,
          }}
        >
          {info.tagline}
        </div>

        <div
          style={{
            flex: 1,
            height: '2.5px',
            backgroundColor: NAVY,
            ...printColorFix,
          }}
        />
      </div>
      */}

      {/* Document Title (Bold Black Centered Text) */}
      <div style={{ textAlign: 'center', margin: '6px 0 4px 0' }}>
        <div
          style={{
            color: '#000000',
            fontWeight: 800,
            fontSize: '12.5pt',
            letterSpacing: '0.8px',
            textTransform: 'uppercase',
            fontFamily: 'Arial, Helvetica, sans-serif',
          }}
        >
          {docTitle}
        </div>
        {extraSubtitle && (
          <div
            style={{
              fontSize: '8pt',
              color: '#000000',
              marginTop: '1px',
              fontWeight: 700,
            }}
          >
            {extraSubtitle}
          </div>
        )}
      </div>
    </div>
  );
};

export default CompanyPrintHeader;
