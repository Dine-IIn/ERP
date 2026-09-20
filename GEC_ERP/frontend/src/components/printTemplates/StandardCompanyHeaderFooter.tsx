import React from 'react';
import { CompanyInfo, DEFAULT_COMPANY_INFO, CompanyPrintHeader, CompanyPrintHeaderProps } from './CompanyPrintHeader';
import { CompanyPrintFooter, CompanyPrintFooterProps } from './CompanyPrintFooter';

export type { CompanyInfo, CompanyPrintHeaderProps, CompanyPrintFooterProps };
export { DEFAULT_COMPANY_INFO, CompanyPrintHeader, CompanyPrintFooter };

// Backward compatibility alias exports
export const StandardCompanyPrintHeader: React.FC<CompanyPrintHeaderProps> = (props) => {
  return <CompanyPrintHeader {...props} />;
};

export const StandardCompanyPrintFooter: React.FC<CompanyPrintFooterProps> = (props) => {
  return <CompanyPrintFooter {...props} />;
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

export default {
  CompanyPrintHeader,
  CompanyPrintFooter,
  StandardCompanyPrintHeader,
  StandardCompanyPrintFooter,
  DEFAULT_COMPANY_INFO,
  formatAmountInWords
};
