import React from 'react';
import type { CustomerTaxBankFields, PdfCustomizerState } from '../../utils/pdfDocumentUtils';

type Props = {
  pdfCustomizer: Pick<
    PdfCustomizerState,
    'showCustomerGSTNumber' | 'showCustomerPANNumber' | 'showCustomerBankDetails'
  >;
  taxBank: CustomerTaxBankFields;
};

/** GSTIN, PAN, and bank details block for PDF billing address sections. */
export default function CustomerTaxBankPdfSection({ pdfCustomizer, taxBank }: Props) {
  const showGst = pdfCustomizer.showCustomerGSTNumber && taxBank.gstNumber;
  const showPan = pdfCustomizer.showCustomerPANNumber && taxBank.panNumber;
  const showBank =
    pdfCustomizer.showCustomerBankDetails &&
    (taxBank.bankName || taxBank.accountNumber || taxBank.ifscCode || taxBank.accountHolderName);

  if (!showGst && !showPan && !showBank) return null;

  return (
    <>
      {showGst && (
        <span>
          <br />
          <strong>GSTIN:</strong> {taxBank.gstNumber}
        </span>
      )}
      {showPan && (
        <span>
          <br />
          <strong>PAN:</strong> {taxBank.panNumber}
        </span>
      )}
      {showBank && (
        <div className="text-[9px] mt-2 pt-1 border-t border-slate-100 text-slate-550 leading-normal text-left">
          <strong>Customer Bank Details:</strong>
          <br />
          {taxBank.bankName && <span>Bank: {taxBank.bankName}<br /></span>}
          {taxBank.accountHolderName && <span>Holder: {taxBank.accountHolderName}<br /></span>}
          {taxBank.accountNumber && <span>A/C No: {taxBank.accountNumber}<br /></span>}
          {taxBank.ifscCode && <span>IFSC Code: {taxBank.ifscCode}</span>}
        </div>
      )}
    </>
  );
}
