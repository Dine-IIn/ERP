import { Item, Vendor, Customer, BulkUploadResult, ItemCategory } from '../types/erp';

// Parse raw CSV or TSV text into lines and tokens
export const parseCSVLines = (text: string): string[][] => {
  const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
  return lines.map(line => {
    // Split by comma or tab
    if (line.includes('\t')) return line.split('\t').map(c => c.trim().replace(/^["']|["']$/g, ''));
    return line.split(',').map(c => c.trim().replace(/^["']|["']$/g, ''));
  });
};

// Bulk Item Sheet Parser
export const parseItemsSheet = (csvText: string, existingItems: Item[]): BulkUploadResult<Omit<Item, 'id'>> => {
  const rows = parseCSVLines(csvText);
  if (rows.length === 0) {
    return { successRows: [], skippedRows: [], rejectedRows: [] };
  }

  // Header detection or simple positional fallback
  const firstRow = rows[0].map(r => r.toLowerCase());
  const hasHeader = firstRow.some(col => col.includes('code') || col.includes('name') || col.includes('category'));
  const dataRows = hasHeader ? rows.slice(1) : rows;

  const successRows: Omit<Item, 'id'>[] = [];
  const skippedRows: { rowNumber: number; identifier: string; reason: string }[] = [];
  const rejectedRows: { rowNumber: number; rawData: string; reasons: string[] }[] = [];

  const existingCodes = new Set(existingItems.map(i => i.itemCode.toLowerCase()));

  dataRows.forEach((cols, idx) => {
    const rowNum = hasHeader ? idx + 2 : idx + 1;
    const rawData = cols.join(', ');

    if (cols.length < 2 || !cols[0] || !cols[1]) {
      rejectedRows.push({
        rowNumber: rowNum,
        rawData,
        reasons: ['Item Code and Component Name are mandatory fields']
      });
      return;
    }

    const itemCode = cols[0].toUpperCase();
    const name = cols[1];
    const category = cols[2] || 'BO';
    const unit = cols[3] || 'PCS';
    const purchaseUOM = cols[4] || unit;
    const conversionFactor = Number(cols[5]) || 1;
    const inHouseStock = Number(cols[6]) || 0;
    const reorderLevel = Number(cols[7]) || 5;
    const unitPrice = Number(cols[8]) || 0;
    const location = cols[9] || 'Central Store';
    const specification = cols[10] || '';

    // Check duplicate
    if (existingCodes.has(itemCode.toLowerCase()) || successRows.some(s => s.itemCode.toLowerCase() === itemCode.toLowerCase())) {
      skippedRows.push({
        rowNumber: rowNum,
        identifier: itemCode,
        reason: `Item code "${itemCode}" already exists in system. Skipped.`
      });
      return;
    }

    successRows.push({
      itemCode,
      name,
      category,
      processType: 'Bought out',
      unit,
      purchaseUOM,
      conversionFactor,
      inHouseStock,
      externalStock: 0,
      reorderLevel,
      unitPrice,
      location,
      specification
    });
  });

  return { successRows, skippedRows, rejectedRows };
};

// Bulk Vendor Sheet Parser
export const parseVendorsSheet = (csvText: string, existingVendors: Vendor[]): BulkUploadResult<Omit<Vendor, 'id'>> => {
  const rows = parseCSVLines(csvText);
  if (rows.length === 0) return { successRows: [], skippedRows: [], rejectedRows: [] };

  const firstRow = rows[0].map(r => r.toLowerCase());
  const hasHeader = firstRow.some(col => col.includes('code') || col.includes('vendor') || col.includes('name'));
  const dataRows = hasHeader ? rows.slice(1) : rows;

  const successRows: Omit<Vendor, 'id'>[] = [];
  const skippedRows: { rowNumber: number; identifier: string; reason: string }[] = [];
  const rejectedRows: { rowNumber: number; rawData: string; reasons: string[] }[] = [];

  const existingCodes = new Set(existingVendors.map(v => v.vendorCode.toLowerCase()));

  let maxSeq = 0;
  existingVendors.forEach(v => {
    const match = v.vendorCode.match(/VEN(\d+)/i) || v.vendorCode.match(/(\d+)/);
    if (match && match[1]) {
      const n = parseInt(match[1], 10);
      if (!isNaN(n) && n > maxSeq) maxSeq = n;
    }
  });
  let autoCodeIndex = maxSeq + 1;

  dataRows.forEach((cols, idx) => {
    const rowNum = hasHeader ? idx + 2 : idx + 1;
    const rawData = cols.join(', ');

    if (!cols || cols.length === 0 || cols.every(c => !c.trim())) return;

    let vendorCode = (cols[0] || '').trim().toUpperCase();
    let name = (cols[1] || '').trim();

    // If only name provided in col 0
    if (!name && vendorCode && !vendorCode.startsWith('VEN') && !vendorCode.startsWith('VEND')) {
      name = vendorCode;
      vendorCode = '';
    }

    if (!name) {
      rejectedRows.push({
        rowNumber: rowNum,
        rawData,
        reasons: ['Vendor Name is mandatory']
      });
      return;
    }

    if (!vendorCode) {
      vendorCode = `VEN${String(autoCodeIndex).padStart(7, '0')}`;
      autoCodeIndex++;
    }

    const contactPerson = cols[2] || '';
    const phone = cols[3] || '';
    const email = cols[4] || '';
    const city = cols[5] || '';
    const gstin = (cols[6] || '').trim().toUpperCase();
    const pan = (cols[7] || '').trim().toUpperCase() || undefined;

    if (existingCodes.has(vendorCode.toLowerCase())) {
      skippedRows.push({
        rowNumber: rowNum,
        identifier: vendorCode,
        reason: `Vendor code "${vendorCode}" already exists. Skipped.`
      });
      return;
    }

    existingCodes.add(vendorCode.toLowerCase());

    successRows.push({
      vendorCode,
      name,
      contactPerson,
      phone,
      email,
      city,
      gstin,
      pan
    });
  });

  return { successRows, skippedRows, rejectedRows };
};

// Bulk Customer Sheet Parser
export const parseCustomersSheet = (csvText: string, existingCustomers: Customer[]): BulkUploadResult<Omit<Customer, 'id'>> => {
  const rows = parseCSVLines(csvText);
  if (rows.length === 0) return { successRows: [], skippedRows: [], rejectedRows: [] };

  const firstRow = rows[0].map(r => r.toLowerCase());
  const hasHeader = firstRow.some(col => col.includes('code') || col.includes('customer') || col.includes('name'));
  const dataRows = hasHeader ? rows.slice(1) : rows;

  const successRows: Omit<Customer, 'id'>[] = [];
  const skippedRows: { rowNumber: number; identifier: string; reason: string }[] = [];
  const rejectedRows: { rowNumber: number; rawData: string; reasons: string[] }[] = [];

  const existingCodes = new Set(existingCustomers.map(c => c.customerCode.toLowerCase()));

  dataRows.forEach((cols, idx) => {
    const rowNum = hasHeader ? idx + 2 : idx + 1;
    const rawData = cols.join(', ');

    if (cols.length < 2 || !cols[0] || !cols[1]) {
      rejectedRows.push({
        rowNumber: rowNum,
        rawData,
        reasons: ['Customer Code and Customer Name are mandatory']
      });
      return;
    }

    const customerCode = cols[0].toUpperCase();
    const name = cols[1];
    const contactPerson = cols[2] || 'Purchase Manager';
    const phone = cols[3] || '';
    const email = cols[4] || '';
    const gstin = cols[5] || '';
    const address = cols[6] || '';
    const city = cols[7] || 'Ahmedabad';
    const state = cols[8] || 'Gujarat';
    const pan = cols[9] || '';
    const bankName = cols[10] || '';
    const accountNumber = cols[11] || '';
    const ifscCode = cols[12] || '';

    if (existingCodes.has(customerCode.toLowerCase())) {
      skippedRows.push({
        rowNumber: rowNum,
        identifier: customerCode,
        reason: `Customer code "${customerCode}" already exists. Skipped.`
      });
      return;
    }

    successRows.push({
      customerCode,
      name,
      contactPerson,
      phone,
      email,
      gstin,
      pan,
      bankName,
      accountNumber,
      ifscCode,
      address,
      city,
      state
    });
  });

  return { successRows, skippedRows, rejectedRows };
};
