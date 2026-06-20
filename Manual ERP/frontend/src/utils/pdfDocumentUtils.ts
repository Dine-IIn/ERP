export type PdfCustomizerState = {
  showLogo: boolean;
  showCompanyDetails: boolean;
  showBillingAddress: boolean;
  showShippingAddress: boolean;
  showBankDetails: boolean;
  showTerms: boolean;
  colProductCode: boolean;
  colUnitPrice: boolean;
  colDiscount: boolean;
  colTax: boolean;
  showCustomerBankDetails: boolean;
  showCustomerGSTNumber: boolean;
  showCustomerPANNumber: boolean;
  showAmountInWords: boolean;
  showTaxableAmount: boolean;
  showTaxBreakup: boolean;
  logoBase64: string | null;
  headerAlign: 'left' | 'center' | 'right';
  titleAlign: 'left' | 'center' | 'right';
  addressAlign: 'left' | 'center' | 'right';
  totalsAlign: 'left' | 'center' | 'right';
  termsAlign: 'left' | 'center' | 'right';
  headerFontSize: number;
  titleFontSize: number;
  bodyFontSize: number;
  headerPadding: number;
  sectionSpacing: number;
  logoSize: number;
  tablePadding: number;
  colWidthProduct: number;
  colWidthCode: number;
  colWidthQty: number;
  colWidthPrice: number;
  colWidthDiscount: number;
  colWidthSubtotal: number;
  showSignature: boolean;
  signatureBase64: string | null;
  signatureLabel: string;
  signatureSize: number;
  borderWidth: number;
  footerPadding: number;
  headerName: string;
  headerSubtitle: string;
  showMetadata: boolean;
  showCustomerDetails: boolean;
  showInvoiceDate: boolean;
  showDueDate: boolean;
  showStatus: boolean;
  showCustomerName: boolean;
  showCustomerType: boolean;
  showCustomerCategory: boolean;
  showCustomerTel: boolean;
  showPaymentTerms: boolean;
};

export const DEFAULT_PDF_CUSTOMIZER: PdfCustomizerState = {
  showLogo: true,
  showCompanyDetails: true,
  showBillingAddress: true,
  showShippingAddress: true,
  showBankDetails: true,
  showTerms: true,
  colProductCode: true,
  colUnitPrice: true,
  colDiscount: true,
  colTax: true,
  showCustomerBankDetails: true,
  showCustomerGSTNumber: true,
  showCustomerPANNumber: true,
  showAmountInWords: true,
  showTaxableAmount: true,
  showTaxBreakup: true,
  logoBase64: null,
  headerAlign: 'left',
  titleAlign: 'left',
  addressAlign: 'left',
  totalsAlign: 'right',
  termsAlign: 'center',
  headerFontSize: 14,
  titleFontSize: 16,
  bodyFontSize: 10,
  headerPadding: 16,
  sectionSpacing: 24,
  logoSize: 48,
  tablePadding: 8,
  colWidthProduct: 40,
  colWidthCode: 15,
  colWidthQty: 10,
  colWidthPrice: 15,
  colWidthDiscount: 10,
  colWidthSubtotal: 10,
  showSignature: true,
  signatureBase64: null,
  signatureLabel: 'Authorized Signatory',
  signatureSize: 45,
  borderWidth: 1,
  footerPadding: 16,
  headerName: '',
  headerSubtitle: '',
  showMetadata: true,
  showCustomerDetails: true,
  showInvoiceDate: true,
  showDueDate: true,
  showStatus: true,
  showCustomerName: true,
  showCustomerType: true,
  showCustomerCategory: true,
  showCustomerTel: true,
  showPaymentTerms: true,
};

export type CustomerTaxBankFields = {
  gstNumber: string | null;
  panNumber: string | null;
  bankName: string | null;
  accountHolderName: string | null;
  accountNumber: string | null;
  ifscCode: string | null;
};

/** Parse API template records — settings JSON merged onto the template row. */
export function parseTemplatesFromApi(templates: any[]): any[] {
  return (templates || []).map((t: any) => {
    let settingsParsed: Record<string, unknown> = {};
    try {
      settingsParsed =
        typeof t.settings === 'string' ? JSON.parse(t.settings) : t.settings || {};
    } catch {
      /* keep defaults */
    }
    return {
      ...t,
      ...settingsParsed,
      terms: t.terms || (settingsParsed.terms as string) || '',
    };
  });
}

/** Merge saved template layout onto defaults so every toggle is defined. */
export function mergePdfCustomizerFromTemplate(tpl: any): PdfCustomizerState {
  const merged = { ...DEFAULT_PDF_CUSTOMIZER };
  if (!tpl) return merged;

  for (const key of Object.keys(DEFAULT_PDF_CUSTOMIZER) as (keyof PdfCustomizerState)[]) {
    if (tpl[key] !== undefined && tpl[key] !== null) {
      (merged as any)[key] = tpl[key];
    }
  }
  return merged;
}

/** Customer master is the source of truth; document snapshot is fallback only. */
export function resolveCustomerForPdf(
  customers: any[],
  customerId: string,
  doc?: any
): any | null {
  return customers.find((c) => c.id === customerId) || doc?.customer || null;
}

export function resolveCustomerTaxBank(
  customer: any | null,
  doc?: any
): CustomerTaxBankFields {
  return {
    gstNumber: customer?.gstNumber ?? doc?.customerGstNumber ?? null,
    panNumber: customer?.panNumber ?? doc?.customerPanNumber ?? null,
    bankName: customer?.bankName ?? doc?.customerBankName ?? null,
    accountHolderName:
      customer?.accountHolderName ?? doc?.customerAccountHolderName ?? null,
    accountNumber: customer?.accountNumber ?? doc?.customerAccountNumber ?? null,
    ifscCode: customer?.ifscCode ?? doc?.customerIfscCode ?? null,
  };
}

export function pickDefaultTemplate(templates: any[]): any | null {
  if (!templates.length) return null;
  return templates.find((t) => t.isDefault) || templates[0];
}

export async function generatePdfFromHtmlElement(element: HTMLElement): Promise<string> {
  const html2canvas = (await import('html2canvas-pro')).default;
  const { jsPDF } = await import('jspdf');

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff'
  });
  
  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF('p', 'mm', 'a4');
  const imgWidth = 210;
  const pageHeight = 297;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;
  let heightLeft = imgHeight;
  let position = 0;

  pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
  heightLeft -= pageHeight;

  while (heightLeft >= 0) {
    position = heightLeft - imgHeight;
    pdf.addPage();
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
  }
  
  const dataUri = pdf.output('datauristring');
  const base64 = dataUri.split(',')[1];
  return base64;
}
