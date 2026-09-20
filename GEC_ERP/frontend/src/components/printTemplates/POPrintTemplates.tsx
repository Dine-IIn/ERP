import React from 'react';
import { PurchaseOrder } from '../../types/erp';
import { 
  StandardCompanyPrintHeader, 
  StandardCompanyPrintFooter, 
  DEFAULT_COMPANY_INFO, 
  formatAmountInWords 
} from './StandardCompanyHeaderFooter';

// 1. Single Vendor Purchase Order Document
export const SinglePOPrintView: React.FC<{ 
  po: PurchaseOrder; 
  vendorDetails?: any;
  itemsMasterList?: any[];
  quotationRefNo?: string;
  quotationRefDate?: string;
  preparedByName?: string;
  authorizedByName?: string;
}> = ({
  po,
  vendorDetails,
  itemsMasterList = [],
  quotationRefNo,
  quotationRefDate,
  preparedByName = po.preparedBy || 'Purchase Executive',
  authorizedByName = 'Authorized Signatory'
}) => {
  const vendorCode = vendorDetails?.vendorCode || (po as any).vendorCode || 'VEN-DIRECT';
  const vendorGst = vendorDetails?.gstin || (po as any).vendorGst || '-';
  const vendorAddress = vendorDetails?.address 
    ? `${vendorDetails.address}, ${vendorDetails.city || ''}, ${vendorDetails.state || 'Gujarat'} - ${vendorDetails.pincode || ''}`
    : (po as any).vendorAddress || 'Industrial Area, Rajkot, Gujarat';
  
  const qtnNo = quotationRefNo || (po as any).quotationNo || (po as any).qtnNo || '-';
  const qtnDate = quotationRefDate || (po as any).quotationDate || (po as any).qtnDate || '-';

  // Calculate item line breakdown
  const items = po.items || [];
  let totalQty = 0;
  let subtotal = 0;

  const lines = items.map((item, idx) => {
    const qty = item.quantity || item.orderedQty || 1;
    const rate = item.unitPrice || 0;
    const amount = item.totalAmount || item.amount || (qty * rate);
    totalQty += qty;
    subtotal += amount;

    // Find master record for Part Code & Old Item Code
    const itemMaster = itemsMasterList.find(i => i.id === item.itemId || i.itemCode === item.itemCode);
    const partCode = (item as any).partCode || itemMaster?.partCode || '-';
    const oldCode = (item as any).oldItemCode || itemMaster?.oldItemCode || '-';
    const uom = item.unit || item.purchaseUOM || itemMaster?.unit || 'PCS';

    return {
      srNo: idx + 1,
      itemCode: item.itemCode || '-',
      partCode,
      itemName: item.itemName || '-',
      oldCode,
      uom,
      qty,
      rate,
      amount
    };
  });

  // Calculate Taxes
  // Standard Gujarat State GST: CGST 9% + SGST 9% (or IGST 18% for out of state)
  const isInterstate = vendorDetails?.state && vendorDetails.state.toLowerCase() !== 'gujarat';
  const cgstRate = isInterstate ? 0 : 9;
  const sgstRate = isInterstate ? 0 : 9;
  const igstRate = isInterstate ? 18 : 0;

  const cgstAmount = subtotal * (cgstRate / 100);
  const sgstAmount = subtotal * (sgstRate / 100);
  const igstAmount = subtotal * (igstRate / 100);
  const taxTotal = cgstAmount + sgstAmount + igstAmount;
  const grandTotal = po.totalAmount !== undefined && po.totalAmount > 0 
    ? po.totalAmount 
    : (subtotal + taxTotal);

  return (
    <div className="po-print-document" style={{ fontFamily: 'Arial, sans-serif', color: '#000000', fontSize: '8.5pt', lineHeight: 1.35, backgroundColor: '#ffffff' }}>
      
      {/* 1. Official Standard Header */}
      <StandardCompanyPrintHeader 
        docTitle="PURCHASE ORDER" 
        docNumber={po.poNumber} 
        docDate={po.orderDate} 
        companyInfo={DEFAULT_COMPANY_INFO}
      />

      {/* 2. Vendor & PO Information (Borderless 2-Column Layout, PO shifted right) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.15fr 1fr', gap: '0.75rem', fontSize: '8.5pt', marginBottom: '0.65rem', color: '#000000' }}>
        {/* Left Column: Vendor Details */}
        <div style={{ display: 'grid', gridTemplateColumns: '95px 1fr', rowGap: '3px', columnGap: '6px', alignItems: 'baseline' }}>
          <span>Vendor Code:</span>
          <span style={{ fontWeight: 800 }}>{vendorCode}</span>
          
          <span>Vendor Name:</span>
          <span style={{ fontWeight: 800 }}>{po.vendorName}</span>
          
          <span>Vendor GSTIN:</span>
          <span>{vendorGst}</span>
          
          <span>Address:</span>
          <span>{vendorAddress}</span>
        </div>

        {/* Right Column: PO Details (Shifted slightly right) */}
        <div style={{ display: 'grid', gridTemplateColumns: '105px 1fr', rowGap: '3px', columnGap: '6px', paddingLeft: '24px', alignItems: 'baseline' }}>
          <span>PO Number:</span>
          <span style={{ fontWeight: 800 }}>{po.poNumber}</span>
          
          <span>PO Date:</span>
          <span>{po.orderDate}</span>
          
          <span>Qtn No:</span>
          <span>{qtnNo}</span>
          
          <span>Qtn Date:</span>
          <span>{qtnDate}</span>

          <span>Delivery Target:</span>
          <span>{po.expectedDeliveryDate || po.deliveryDate || '-'}</span>
        </div>
      </div>

      {/* 3. Main PO Line Items Table (Uniform 1px Black Border, Crisp Typography) */}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8.5pt', marginBottom: '0.5rem', border: '1px solid #000000', color: '#000000' }}>
        <thead>
          <tr style={{ backgroundColor: '#000000', color: '#ffffff', textAlign: 'center', fontWeight: 800 }}>
            <th style={{ padding: '5px 4px', border: '1px solid #000000', width: '30px' }}>#</th>
            <th style={{ padding: '5px 6px', border: '1px solid #000000', width: '110px', textAlign: 'left' }}>Part Code</th>
            <th style={{ padding: '5px 6px', border: '1px solid #000000', textAlign: 'left' }}>Item Description</th>
            <th style={{ padding: '5px 6px', border: '1px solid #000000', width: '90px', textAlign: 'left' }}>Old Code</th>
            <th style={{ padding: '5px 4px', border: '1px solid #000000', width: '45px' }}>UOM</th>
            <th style={{ padding: '5px 6px', border: '1px solid #000000', width: '55px', textAlign: 'right' }}>Quantity</th>
            <th style={{ padding: '5px 6px', border: '1px solid #000000', width: '95px', textAlign: 'right' }}>Rate (₹)</th>
            <th style={{ padding: '5px 6px', border: '1px solid #000000', width: '105px', textAlign: 'right' }}>Amount (₹)</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((row, idx) => (
            <tr key={idx} style={{ color: '#000000' }}>
              <td style={{ padding: '5px 4px', border: '1px solid #000000', textAlign: 'center' }}>{row.srNo}</td>
              <td style={{ padding: '5px 6px', border: '1px solid #000000', fontFamily: 'monospace' }}>
                {row.partCode !== '-' ? row.partCode : row.itemCode}
              </td>
              <td style={{ padding: '5px 6px', border: '1px solid #000000' }}>
                <div>{row.itemName}</div>
              </td>
              <td style={{ padding: '5px 6px', border: '1px solid #000000', fontFamily: 'monospace' }}>
                {row.oldCode}
              </td>
              <td style={{ padding: '5px 4px', border: '1px solid #000000', textAlign: 'center' }}>
                {row.uom}
              </td>
              <td style={{ padding: '5px 6px', border: '1px solid #000000', textAlign: 'right' }}>
                {row.qty}
              </td>
              <td style={{ padding: '5px 6px', border: '1px solid #000000', textAlign: 'right' }}>
                {row.rate.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </td>
              <td style={{ padding: '5px 6px', border: '1px solid #000000', textAlign: 'right' }}>
                {row.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </td>
            </tr>
          ))}
        </tbody>
        
        {/* 4. Table Summary Footer */}
        <tfoot>
          <tr style={{ fontWeight: 700, borderTop: '1px solid #000000' }}>
            <td colSpan={5} style={{ padding: '5px 6px', border: '1px solid #000000', textAlign: 'right' }}>
              Total Quantity:
            </td>
            <td style={{ padding: '5px 6px', border: '1px solid #000000', textAlign: 'right', fontWeight: 800 }}>
              {totalQty}
            </td>
            <td style={{ padding: '5px 6px', border: '1px solid #000000', textAlign: 'right' }}>
              Subtotal:
            </td>
            <td style={{ padding: '5px 6px', border: '1px solid #000000', textAlign: 'right', fontWeight: 800 }}>
              {subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </td>
          </tr>

          {isInterstate ? (
            <tr style={{ fontSize: '8pt' }}>
              <td colSpan={6} style={{ border: '1px solid #000000' }}></td>
              <td style={{ padding: '4px 6px', border: '1px solid #000000', textAlign: 'right' }}>
                IGST ({igstRate}%):
              </td>
              <td style={{ padding: '4px 6px', border: '1px solid #000000', textAlign: 'right' }}>
                {igstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </td>
            </tr>
          ) : (
            <>
              <tr style={{ fontSize: '8pt' }}>
                <td colSpan={6} style={{ border: '1px solid #000000' }}></td>
                <td style={{ padding: '4px 6px', border: '1px solid #000000', textAlign: 'right' }}>
                  CGST ({cgstRate}%):
                </td>
                <td style={{ padding: '4px 6px', border: '1px solid #000000', textAlign: 'right' }}>
                  {cgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
              </tr>
              <tr style={{ fontSize: '8pt' }}>
                <td colSpan={6} style={{ border: '1px solid #000000' }}></td>
                <td style={{ padding: '4px 6px', border: '1px solid #000000', textAlign: 'right' }}>
                  SGST ({sgstRate}%):
                </td>
                <td style={{ padding: '4px 6px', border: '1px solid #000000', textAlign: 'right' }}>
                  {sgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
              </tr>
            </>
          )}

          {/* Grand Total Row - Strictly Single Line */}
          <tr style={{ backgroundColor: '#000000', color: '#ffffff', fontWeight: 800, fontSize: '9pt' }}>
            <td colSpan={5} style={{ padding: '6px 8px', textAlign: 'left', border: '1px solid #000000', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Amount in Words: <span style={{ fontWeight: 600 }}>{formatAmountInWords(grandTotal)}</span>
            </td>
            <td colSpan={2} style={{ padding: '6px 6px', textAlign: 'right', border: '1px solid #000000', whiteSpace: 'nowrap' }}>
              Grand Total:
            </td>
            <td style={{ padding: '6px 6px', textAlign: 'right', border: '1px solid #000000', whiteSpace: 'nowrap' }}>
              {grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </td>
          </tr>
        </tfoot>
      </table>

      {/* 5. Terms & Conditions + Company Signatures Block (page-break-inside: avoid) */}
      <div style={{ pageBreakInside: 'avoid', marginTop: '0.65rem' }}>
        
        {/* Terms & Conditions Box */}
        <div style={{ border: '1px solid #000000', borderRadius: '3px', padding: '6px 8px', marginBottom: '0.5rem', color: '#000000' }}>
          <div style={{ fontWeight: 800, fontSize: '8pt', marginBottom: '2px', textTransform: 'uppercase' }}>
            Terms & Conditions:
          </div>
          <ol style={{ margin: 0, paddingLeft: '14px', fontSize: '7.5pt', lineHeight: 1.3, color: '#000000' }}>
            <li>Material supplied must strictly adhere to the approved engineering drawings, chemical composition and dimensional tolerances.</li>
            <li>Inspection and Acceptance: Goods are subject to strict QC inspection at our works. Rejected items will be returned at vendor's cost.</li>
            <li>Test Certificate & MTC: Original Test Certificate/MTC must accompany each dispatch consignment.</li>
            <li>Delivery Schedule: Delivery dates agreed upon are binding. Any delay in supply must be communicated in writing immediately.</li>
            <li>Payment Terms: As mutually agreed upon receipt and verification of goods along with original Tax Invoice.</li>
          </ol>
        </div>

        {/* For Company, Legal Details & Signatures Box */}
        <div style={{ border: '1px solid #000000', borderRadius: '3px', padding: '8px 10px', backgroundColor: '#ffffff', color: '#000000' }}>
          
          {/* Company Legal Reference Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #000000', paddingBottom: '4px', marginBottom: '6px' }}>
            <div style={{ fontSize: '9pt', fontWeight: 800 }}>
              For {DEFAULT_COMPANY_INFO.name}
            </div>
            <div style={{ fontSize: '8pt' }}>
              <strong>GSTIN:</strong> {DEFAULT_COMPANY_INFO.gstin} &nbsp;|&nbsp; <strong>PAN:</strong> {DEFAULT_COMPANY_INFO.pan}
            </div>
          </div>

          <div style={{ fontSize: '7.5pt', marginBottom: '8px' }}>
            <strong>Address:</strong> {DEFAULT_COMPANY_INFO.address}
          </div>

          {/* Dual Signatures with expanded vertical signing/stamping space */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginTop: '55px', paddingTop: '6px' }}>
            {/* Prepared By Signature */}
            <div style={{ textAlign: 'center' }}>
              <div style={{ borderTop: '1px solid #000000', width: '80%', margin: '0 auto 4px auto' }}></div>
              <div style={{ fontWeight: 800, fontSize: '8.5pt' }}>Prepared By</div>
              <div style={{ fontSize: '8pt' }}>{preparedByName}</div>
            </div>

            {/* Authorized By Signature */}
            <div style={{ textAlign: 'center' }}>
              <div style={{ borderTop: '1px solid #000000', width: '80%', margin: '0 auto 4px auto' }}></div>
              <div style={{ fontWeight: 800, fontSize: '8.5pt' }}>Authorized By</div>
              <div style={{ fontSize: '8pt' }}>{authorizedByName}</div>
            </div>
          </div>
        </div>

      </div>

      {/* 6. Standard Modular Footer */}
      <StandardCompanyPrintFooter companyInfo={DEFAULT_COMPANY_INFO} />

    </div>
  );
};

// 2. Purchase Orders List Report
export const POListPrintView: React.FC<{ 
  purchaseOrders: PurchaseOrder[]; 
  filterLabel?: string 
}> = ({
  purchaseOrders,
  filterLabel = 'Active Purchase Orders'
}) => (
  <div style={{ fontFamily: 'Arial, sans-serif', color: '#000000', fontSize: '8.5pt' }}>
    <StandardCompanyPrintHeader 
      docTitle="PURCHASE ORDERS STATUS REPORT" 
      extraSubtitle={`Scope: ${filterLabel} (${purchaseOrders.length} orders)`}
      companyInfo={DEFAULT_COMPANY_INFO}
    />

    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8.5pt', margin: '0.5rem 0', border: '1px solid #000000', color: '#000000' }}>
      <thead>
        <tr style={{ backgroundColor: '#000000', color: '#ffffff', fontWeight: 800 }}>
          <th style={{ width: '30px', padding: '5px 4px', border: '1px solid #000000' }}>#</th>
          <th style={{ padding: '5px 6px', border: '1px solid #000000', textAlign: 'left' }}>PO Number</th>
          <th style={{ padding: '5px 6px', border: '1px solid #000000', textAlign: 'left' }}>Vendor Name</th>
          <th style={{ padding: '5px 6px', border: '1px solid #000000', textAlign: 'center' }}>PO Date</th>
          <th style={{ padding: '5px 6px', border: '1px solid #000000', textAlign: 'center' }}>Delivery Date</th>
          <th style={{ width: '50px', padding: '5px 6px', border: '1px solid #000000', textAlign: 'center' }}>Items</th>
          <th style={{ padding: '5px 6px', border: '1px solid #000000', textAlign: 'right' }}>Total Value (₹)</th>
          <th style={{ padding: '5px 6px', border: '1px solid #000000', textAlign: 'center' }}>Status</th>
        </tr>
      </thead>
      <tbody>
        {purchaseOrders.map((po, i) => (
          <tr key={i} style={{ color: '#000000' }}>
            <td style={{ textAlign: 'center', padding: '5px 4px', border: '1px solid #000000' }}>{i + 1}</td>
            <td style={{ fontFamily: 'monospace', fontWeight: 700, padding: '5px 6px', border: '1px solid #000000' }}>
              {po.poNumber}
            </td>
            <td style={{ fontWeight: 700, padding: '5px 6px', border: '1px solid #000000' }}>{po.vendorName}</td>
            <td style={{ textAlign: 'center', padding: '5px 6px', border: '1px solid #000000' }}>{po.orderDate}</td>
            <td style={{ textAlign: 'center', padding: '5px 6px', border: '1px solid #000000' }}>{po.expectedDeliveryDate || po.deliveryDate || '-'}</td>
            <td style={{ textAlign: 'center', padding: '5px 6px', border: '1px solid #000000' }}>{po.items?.length || 0}</td>
            <td style={{ textAlign: 'right', fontWeight: 700, padding: '5px 6px', border: '1px solid #000000' }}>
              {(po.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </td>
            <td style={{ textAlign: 'center', padding: '5px 6px', border: '1px solid #000000' }}>
              <span style={{ fontWeight: 700, fontSize: '7.5pt' }}>
                {po.status}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr style={{ fontWeight: 800, borderTop: '1px solid #000000' }}>
          <td colSpan={6} style={{ padding: '6px 8px', textAlign: 'right', border: '1px solid #000000' }}>
            Total Procurement Portfolio:
          </td>
          <td style={{ padding: '6px 8px', textAlign: 'right', border: '1px solid #000000', fontSize: '9pt' }}>
            {purchaseOrders.reduce((sum, p) => sum + (p.totalAmount || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </td>
          <td style={{ border: '1px solid #000000' }}></td>
        </tr>
      </tfoot>
    </table>

    <StandardCompanyPrintFooter companyInfo={DEFAULT_COMPANY_INFO} />
  </div>
);
