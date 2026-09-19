import React from 'react';
import { GEC_PRODUCTS_DATA } from '../../data/quotationProductsData';

export interface QuotationPrintData {
  id?: string;
  quoteNo: string;
  date: string;
  customerCompany: string;
  customerName: string;
  customerMobile: string;
  customerCity: string;
  customerState: string;
  customerAddress: string;
  reference?: string;
  model: any;
  basePrice: number;
  discountPercent: number;
  selectedOptions: Array<{ name: string; price: number }>;
  customDescription?: string | null;
  extraDemand?: string;
  extraAmount?: number;
  totalAmount?: number;
  createdBy?: {
    userId?: string;
    username?: string;
    fullName?: string;
    role?: string;
  };
}

const customRound = (val: number): number => {
  if (!val || isNaN(val)) return 0;
  const num = Number(val);
  const floor = Math.floor(num);
  const frac = Math.round((num - floor) * 10000) / 10000;
  return frac > 0.5 ? Math.ceil(num) : Math.floor(num);
};

const formatCurrency = (num: number): string => {
  if (!num || isNaN(num)) return '0';
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(customRound(num));
};

const numberToWords = (num: number): string => {
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
  return inWords(Math.round(num)) + ' Only';
};

export const GECQuotationPrintView: React.FC<{ quotation: QuotationPrintData }> = ({ quotation }) => {
  const model = quotation.model || {};
  const company = GEC_PRODUCTS_DATA.company || {};
  const basePrice = quotation.basePrice || model.base_price || 0;
  const discountPercent = quotation.discountPercent !== undefined ? quotation.discountPercent : 10;
  const discountAmt = customRound(basePrice * (discountPercent / 100));
  const discountedMachinePrice = customRound(basePrice - discountAmt);

  let optionsTotal = 0;
  (quotation.selectedOptions || []).forEach(opt => {
    optionsTotal += customRound(opt.price || 0);
  });

  const extraAmount = customRound(Number(quotation.extraAmount) || 0);
  const totalAmount = customRound(discountedMachinePrice + optionsTotal + extraAmount);

  const headerImg = (
    <div style={{ width: '100%', margin: '0 0 8px 0', padding: 0 }}>
      <img 
        src="assets/images/gec_header.png" 
        alt="Ghanshyam Engineering Co." 
        style={{ width: '100%', height: 'auto', display: 'block', borderRadius: '4px' }}
        onError={(e: any) => { e.currentTarget.style.display = 'none'; }}
      />
    </div>
  );

  const footerBanner = (
    <div style={{ marginTop: '12px', fontFamily: 'Arial, sans-serif', pageBreakInside: 'avoid' }}>
      <div style={{ border: '1px solid #cbd5e1', borderRadius: '6px', overflow: 'hidden', backgroundColor: '#e2e8f0' }}>
        <div style={{ textAlign: 'center', padding: '4px 8px', fontSize: '8pt', fontWeight: 'bold', color: '#1b2762' }}>
          📞 +91 90339 80809 &nbsp;|&nbsp; +91 98252 93732 &nbsp;|&nbsp; +91 96018 23402
        </div>
        <div style={{ backgroundColor: '#1b2762', color: '#ffffff', textAlign: 'center', padding: '4px 8px', fontSize: '7pt', fontWeight: 'bold' }}>
          📍 Plot–3, R.S. : 792–793–795, Nr.Anjney Ind Zone–1, Shapar, Vill.: Shapar, Taluka : Kotda Sangani, Dist.: Rajkot.
        </div>
      </div>
    </div>
  );

  return (
    <div className="quotation-print-container" style={{ fontFamily: 'Arial, sans-serif', color: '#111827', fontSize: '9.5pt', lineHeight: 1.35 }}>
      
      {/* PAGE 1: COMMERCIAL QUOTATION SUMMARY */}
      <div className="quotation-page" style={{ pageBreakAfter: 'always', marginBottom: '2rem' }}>
        {headerImg}
        
        <div style={{ fontSize: '10pt', fontWeight: 'bold', marginBottom: '4px' }}>
          GST Number: {company.gstin || '24AAEFG4976H1Z9'}
        </div>

        <div style={{ textAlign: 'center', fontSize: '15pt', fontWeight: 'bold', textDecoration: 'underline', margin: '4px 0 10px 0', letterSpacing: '0.5px', color: '#1e3a8a' }}>
          OFFICIAL COMMERCIAL QUOTATION
        </div>

        {/* Customer & Quote Meta Grid */}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9.5pt', marginBottom: '10px' }}>
          <tbody>
            <tr>
              <td style={{ width: '58%', verticalAlign: 'top', padding: '4px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc' }}>
                <strong style={{ color: '#1e3a8a' }}>Customer Company:</strong> {quotation.customerCompany || '-'}<br />
                <strong>Contact Person:</strong> {quotation.customerName || '-'}<br />
                <strong>Address:</strong> {quotation.customerAddress || '-'}<br />
                <strong>City / State:</strong> {quotation.customerCity || '-'}, {quotation.customerState || '-'}<br />
                <strong>Mobile:</strong> {quotation.customerMobile ? '+91 ' + quotation.customerMobile : '-'}
              </td>
              <td style={{ width: '42%', verticalAlign: 'top', padding: '4px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc' }}>
                <strong>Quote Ref No:</strong> <span style={{ fontFamily: 'monospace', fontWeight: 'bold', color: '#2563eb' }}>{quotation.quoteNo}</span><br />
                <strong>Quotation Date:</strong> {quotation.date}<br />
                <strong>Sales Executive:</strong> {quotation.createdBy?.fullName || 'Sales Team'}<br />
                <strong>Reference / Source:</strong> {quotation.reference || 'Direct Inquiry'}<br />
                <strong>Validity:</strong> 30 Days
              </td>
            </tr>
          </tbody>
        </table>

        {/* Machine Specification & Pricing Breakdown */}
        <div style={{ fontWeight: 'bold', fontSize: '10.5pt', margin: '8px 0 4px 0', color: '#1e3a8a' }}>
          1. Machine Model & Pricing Schedule
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9pt', marginBottom: '10px' }}>
          <thead>
            <tr style={{ backgroundColor: '#1e3a8a', color: '#ffffff' }}>
              <th style={{ padding: '6px', border: '1px solid #1e3a8a', textAlign: 'center', width: '35px' }}>#</th>
              <th style={{ padding: '6px', border: '1px solid #1e3a8a', textAlign: 'left' }}>Item Description</th>
              <th style={{ padding: '6px', border: '1px solid #1e3a8a', textAlign: 'center', width: '45px' }}>Qty</th>
              <th style={{ padding: '6px', border: '1px solid #1e3a8a', textAlign: 'right', width: '120px' }}>Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ padding: '6px', border: '1px solid #cbd5e1', textAlign: 'center', verticalAlign: 'top' }}>1</td>
              <td style={{ padding: '6px', border: '1px solid #cbd5e1' }}>
                <strong style={{ fontSize: '10pt', color: '#1e3a8a' }}>GEC Plastic Injection Moulding Machine (Model: {model.sheet_name || model.display_name || 'NEO PRIME'})</strong>
                <p style={{ margin: '4px 0 0 0', fontSize: '8.5pt', color: '#475569' }}>
                  {quotation.customDescription || model.description || 'Microprocessor controlled high-speed injection moulding machine with 5-point toggle mechanism and servo drive system.'}
                </p>
              </td>
              <td style={{ padding: '6px', border: '1px solid #cbd5e1', textAlign: 'center', verticalAlign: 'top', fontWeight: 'bold' }}>1 SET</td>
              <td style={{ padding: '6px', border: '1px solid #cbd5e1', textAlign: 'right', verticalAlign: 'top', fontWeight: 'bold' }}>
                ₹{formatCurrency(discountedMachinePrice)}
                {discountPercent > 0 && (
                  <div style={{ fontSize: '7.5pt', color: '#16a34a', fontWeight: 'normal' }}>
                    (List: ₹{formatCurrency(basePrice)} - {discountPercent}% Disc)
                  </div>
                )}
              </td>
            </tr>

            {/* Optional Attachments */}
            {quotation.selectedOptions && quotation.selectedOptions.length > 0 && (
              <tr>
                <td style={{ padding: '6px', border: '1px solid #cbd5e1', textAlign: 'center', verticalAlign: 'top' }}>2</td>
                <td style={{ padding: '6px', border: '1px solid #cbd5e1' }}>
                  <strong>Optional Accessories & Upgrades Selected:</strong>
                  <ul style={{ margin: '4px 0 0 16px', padding: 0, fontSize: '8.5pt' }}>
                    {quotation.selectedOptions.map((opt, oIdx) => (
                      <li key={oIdx} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                        <span>• {opt.name}</span>
                        <span style={{ fontWeight: 'bold' }}>₹{formatCurrency(opt.price)}</span>
                      </li>
                    ))}
                  </ul>
                </td>
                <td style={{ padding: '6px', border: '1px solid #cbd5e1', textAlign: 'center', verticalAlign: 'top' }}>-</td>
                <td style={{ padding: '6px', border: '1px solid #cbd5e1', textAlign: 'right', verticalAlign: 'top', fontWeight: 'bold' }}>
                  ₹{formatCurrency(optionsTotal)}
                </td>
              </tr>
            )}

            {/* Custom Extra Demand */}
            {extraAmount > 0 && (
              <tr>
                <td style={{ padding: '6px', border: '1px solid #cbd5e1', textAlign: 'center', verticalAlign: 'top' }}>3</td>
                <td style={{ padding: '6px', border: '1px solid #cbd5e1' }}>
                  <strong>Special Customization / Additional Demand:</strong>
                  <p style={{ margin: '2px 0 0 0', fontSize: '8.5pt' }}>{quotation.extraDemand || 'Custom tooling / auxiliary fixture'}</p>
                </td>
                <td style={{ padding: '6px', border: '1px solid #cbd5e1', textAlign: 'center', verticalAlign: 'top' }}>-</td>
                <td style={{ padding: '6px', border: '1px solid #cbd5e1', textAlign: 'right', verticalAlign: 'top', fontWeight: 'bold' }}>
                  ₹{formatCurrency(extraAmount)}
                </td>
              </tr>
            )}

            {/* Total Row */}
            <tr style={{ backgroundColor: '#f1f5f9', fontWeight: 'bold', fontSize: '10pt' }}>
              <td colSpan={3} style={{ padding: '8px', border: '1px solid #cbd5e1', textAlign: 'right' }}>
                TOTAL EX-FACTORY MACHINE VALUE (Excl. GST):
              </td>
              <td style={{ padding: '8px', border: '1px solid #cbd5e1', textAlign: 'right', color: '#1e3a8a', fontSize: '11pt' }}>
                ₹{formatCurrency(totalAmount)}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Amount in words */}
        <div style={{ padding: '6px 10px', backgroundColor: '#f8fafc', border: '1px dashed #94a3b8', borderRadius: '4px', marginBottom: '14px', fontSize: '9pt' }}>
          <strong>Amount in Words:</strong> <span style={{ textTransform: 'capitalize' }}>INR {numberToWords(totalAmount)}</span>
        </div>

        {/* Authorized Signatory Block */}
        <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: '10px' }}>
          <div>
            <div style={{ fontSize: '8pt', color: '#64748b' }}>Customer Acceptance & Stamp:</div>
            <div style={{ marginTop: '36px', borderTop: '1px solid #94a3b8', width: '200px', textAlign: 'center', fontSize: '8.5pt' }}>
              Authorized Signatory
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontWeight: 'bold', color: '#1e3a8a', fontSize: '9.5pt' }}>For, GHANSHYAM ENGINEERING CO.</div>
            <div style={{ marginTop: '36px', borderTop: '1px solid #1e3a8a', width: '220px', textAlign: 'center', fontSize: '8.5pt', fontWeight: 'bold', marginLeft: 'auto' }}>
              {quotation.createdBy?.fullName || 'Authorized Representative'}
            </div>
          </div>
        </div>

        {footerBanner}
      </div>

      {/* PAGE 2: SALIENT FEATURES & STANDARD ACCESSORIES */}
      <div className="quotation-page" style={{ pageBreakAfter: 'always', marginBottom: '2rem' }}>
        {headerImg}

        <div style={{ textAlign: 'center', fontSize: '14pt', fontWeight: 'bold', textDecoration: 'underline', margin: '4px 0 10px 0', color: '#1e3a8a' }}>
          SALIENT FEATURES & STANDARD INCLUSIONS
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '8.5pt', marginBottom: '12px' }}>
          {(model.salient_features || [
            "Energy Efficient Servo Drive saves power up to 30% - 80%",
            "High Rigidity 5-Point Double Toggle Clamping Mechanism",
            "Advanced Microprocessor Controller with multi-language support",
            "Shorter dry cycle time for maximum production output",
            "High precision linear transducers on clamping, injection & ejector",
            "Multi-stage injection speed, pressure and holding control",
            "Automatic mould height adjustment via planetary sun gear mechanism",
            "Proportional back pressure control through PLC screen",
            "Automatic volumetric lubrication system with alarm monitoring",
            "Hydraulic core pulling and air ejector standard interfaces",
            "Hardened chrome plated tie bars with high tensile strength alloy",
            "Twin cylinder balanced injection unit for uniform melt pressure",
            "High plasticizing nitrided screw & bimetallic barrel options",
            "Ceramic heater bands with insulated heat shield jackets",
            "Low noise internal gear pump and high response proportional valves",
            "Separate isolated electrical control cabinet for high reliability"
          ]).map((feat: string, fIdx: number) => (
            <div key={fIdx} style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', padding: '3px 0' }}>
              <span style={{ color: '#2563eb', fontWeight: 'bold' }}>✔</span>
              <span>{feat}</span>
            </div>
          ))}
        </div>

        {/* Standard Supplied Free Accessories */}
        <div style={{ border: '1px solid #93c5fd', backgroundColor: '#eff6ff', borderRadius: '6px', padding: '8px 12px', marginBottom: '12px' }}>
          <strong style={{ color: '#1e3a8a', fontSize: '9.5pt' }}>Standard Inclusions Supplied with Machine:</strong>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', fontSize: '8.5pt', marginTop: '4px' }}>
            <div>• Anti-Vibration Levelling Pads (Complete Set)</div>
            <div>• Standard Machine Tool Kit & Grease Gun</div>
            <div>• Heavy Duty Mould Clamping Bolts & Washers</div>
            <div>• Water Manifold & Flow Indicators (Inlet/Outlet)</div>
          </div>
        </div>

        {/* Company Bank Account Details */}
        <div style={{ border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', borderRadius: '6px', padding: '8px 12px', fontSize: '9pt' }}>
          <strong style={{ color: '#1e3a8a' }}>Company Banking & RTGS / NEFT Details:</strong>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '4px', fontSize: '8.5pt' }}>
            <tbody>
              <tr>
                <td style={{ width: '25%' }}><strong>Beneficiary Name:</strong></td>
                <td>{company.name || 'GHANSHYAM ENGINEERING CO.'}</td>
              </tr>
              <tr>
                <td><strong>Bank Name:</strong></td>
                <td>{company.bank?.name || 'CENTRAL BANK OF INDIA'}</td>
              </tr>
              <tr>
                <td><strong>Branch:</strong></td>
                <td>{company.bank?.branch || 'BHUPENDRA ROAD, RAJKOT'}</td>
              </tr>
              <tr>
                <td><strong>Current A/C No:</strong></td>
                <td style={{ fontFamily: 'monospace', fontWeight: 'bold', color: '#1e3a8a' }}>{company.bank?.account_no || '3085665239'}</td>
              </tr>
              <tr>
                <td><strong>IFSC Code:</strong></td>
                <td style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{company.bank?.ifsc || 'CBIN0280569'}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {footerBanner}
      </div>

      {/* PAGE 3: TECHNICAL SPECIFICATIONS */}
      <div className="quotation-page" style={{ pageBreakAfter: 'always', marginBottom: '2rem' }}>
        {headerImg}

        <div style={{ textAlign: 'center', fontSize: '14pt', fontWeight: 'bold', textDecoration: 'underline', margin: '4px 0 10px 0', color: '#1e3a8a' }}>
          TECHNICAL SPECIFICATIONS ({model.sheet_name || 'NEO PRIME'})
        </div>

        {model.specs && Array.isArray(model.specs) && model.specs.length > 0 ? (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8.5pt', marginBottom: '10px' }}>
            <thead>
              <tr style={{ backgroundColor: '#1e3a8a', color: '#ffffff' }}>
                <th style={{ padding: '4px 6px', border: '1px solid #1e3a8a', textAlign: 'center', width: '35px' }}>#</th>
                <th style={{ padding: '4px 6px', border: '1px solid #1e3a8a', textAlign: 'left' }}>Parameter</th>
                <th style={{ padding: '4px 6px', border: '1px solid #1e3a8a', textAlign: 'center', width: '60px' }}>Unit</th>
                <th style={{ padding: '4px 6px', border: '1px solid #1e3a8a', textAlign: 'right', width: '120px' }}>Specification</th>
              </tr>
            </thead>
            <tbody>
              {model.specs.map((sp: any, sIdx: number) => {
                if (sp.type === 'header') {
                  return (
                    <tr key={sIdx} style={{ backgroundColor: '#e2e8f0', fontWeight: 'bold', color: '#1e3a8a' }}>
                      <td colSpan={4} style={{ padding: '4px 6px', border: '1px solid #cbd5e1' }}>
                        {sp.title}
                      </td>
                    </tr>
                  );
                }
                return (
                  <tr key={sIdx} style={{ backgroundColor: sIdx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                    <td style={{ padding: '3px 6px', border: '1px solid #cbd5e1', textAlign: 'center' }}>{sp.sr_no || sIdx + 1}</td>
                    <td style={{ padding: '3px 6px', border: '1px solid #cbd5e1' }}>{sp.param}</td>
                    <td style={{ padding: '3px 6px', border: '1px solid #cbd5e1', textAlign: 'center', color: '#64748b' }}>{sp.unit || '-'}</td>
                    <td style={{ padding: '3px 6px', border: '1px solid #cbd5e1', textAlign: 'right', fontWeight: 'bold' }}>{sp.meas || '-'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div style={{ padding: '12px', border: '1px solid #cbd5e1', textAlign: 'center', color: '#64748b' }}>
            Standard technical specifications sheet attached with final drawing.
          </div>
        )}

        {footerBanner}
      </div>

      {/* PAGE 4: COMMERCIAL TERMS & CONDITIONS */}
      <div className="quotation-page">
        {headerImg}

        <div style={{ textAlign: 'center', fontSize: '14pt', fontWeight: 'bold', textDecoration: 'underline', margin: '4px 0 10px 0', color: '#1e3a8a' }}>
          COMMERCIAL TERMS & CONDITIONS
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9pt', marginBottom: '14px' }}>
          <tbody>
            <tr>
              <td style={{ width: '22%', padding: '6px', border: '1px solid #cbd5e1', fontWeight: 'bold', backgroundColor: '#f8fafc' }}>
                1. Prices & Taxes:
              </td>
              <td style={{ padding: '6px', border: '1px solid #cbd5e1' }}>
                Prices quoted are Ex-works, Rajkot. GST (18%) and other statutory levies will be charged extra as applicable at the time of dispatch.
              </td>
            </tr>
            <tr>
              <td style={{ padding: '6px', border: '1px solid #cbd5e1', fontWeight: 'bold', backgroundColor: '#f8fafc' }}>
                2. Payment Terms:
              </td>
              <td style={{ padding: '6px', border: '1px solid #cbd5e1' }}>
                {company.terms?.payment || '30% advance along with written purchase order & balance 70% against proforma invoice before machine dispatch.'}
              </td>
            </tr>
            <tr>
              <td style={{ padding: '6px', border: '1px solid #cbd5e1', fontWeight: 'bold', backgroundColor: '#f8fafc' }}>
                3. Delivery Period:
              </td>
              <td style={{ padding: '6px', border: '1px solid #cbd5e1' }}>
                {company.terms?.delivery || 'Within 2.5 to 3 months from the date of confirmed order with advance payment.'}
              </td>
            </tr>
            <tr>
              <td style={{ padding: '6px', border: '1px solid #cbd5e1', fontWeight: 'bold', backgroundColor: '#f8fafc' }}>
                4. Transit & Freight:
              </td>
              <td style={{ padding: '6px', border: '1px solid #cbd5e1' }}>
                Transportation, freight charges and transit insurance will be arranged on to-pay basis by the purchaser.
              </td>
            </tr>
            <tr>
              <td style={{ padding: '6px', border: '1px solid #cbd5e1', fontWeight: 'bold', backgroundColor: '#f8fafc' }}>
                5. Commissioning:
              </td>
              <td style={{ padding: '6px', border: '1px solid #cbd5e1' }}>
                Our service engineer will visit your site for installation and start-up. Boarding, lodging and local travel of the technician to be provided by the customer.
              </td>
            </tr>
            <tr>
              <td style={{ padding: '6px', border: '1px solid #cbd5e1', fontWeight: 'bold', backgroundColor: '#f8fafc' }}>
                6. Warranty:
              </td>
              <td style={{ padding: '6px', border: '1px solid #cbd5e1' }}>
                {company.terms?.warranty || 'One Year standard mechanical warranty against manufacturing defects from the date of dispatch (excluding wear & tear parts and electrical burnouts).'}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Final Acceptance Block */}
        <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <div style={{ fontSize: '8.5pt', color: '#64748b' }}>We accept the quotation on the above terms:</div>
            <div style={{ marginTop: '40px', borderTop: '1px solid #94a3b8', width: '220px', textAlign: 'center', fontSize: '8.5pt' }}>
              Customer Authorized Signatory & Seal
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontWeight: 'bold', color: '#1e3a8a', fontSize: '9.5pt' }}>For, GHANSHYAM ENGINEERING CO.</div>
            <div style={{ marginTop: '40px', borderTop: '1px solid #1e3a8a', width: '220px', textAlign: 'center', fontSize: '8.5pt', fontWeight: 'bold', marginLeft: 'auto' }}>
              Authorized Signatory
            </div>
          </div>
        </div>

        {footerBanner}
      </div>

    </div>
  );
};
