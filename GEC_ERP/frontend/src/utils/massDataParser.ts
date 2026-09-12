import { 
  Item, BOM, BOMComponent, Vendor, Customer, ProcessDefinition, 
  ItemProcessCard, ItemProcessStep, MaterialProcessSource, 
  MaterialProcessType, QCTrigger, ItemMappedVendor, generateNextVendorCode 
} from '../types/erp';

export type IngestionEntityType = 'ITEM_MASTER' | 'BOM_MASTER' | 'INVENTORY' | 'VENDORS' | 'CUSTOMERS' | 'PROCESS_MASTER';

export interface ParsedRowError {
  rowNumber: number;
  identifier: string;
  field?: string;
  message: string;
  rawLine?: string;
}

export interface ParsedResult<T> {
  entityType: IngestionEntityType;
  totalRows: number;
  validRecords: T[];
  skippedRecords: { rowNumber: number; identifier: string; reason: string }[];
  errors: ParsedRowError[];
}

export interface ParsedInventoryItem {
  itemId?: string;
  itemCode: string;
  inHouseStock: number;
  externalStock: number;
  location?: string;
  unitPrice?: number;
  minStockQty?: number;
}

export interface ParsedInventoryResult {
  entityType: 'INVENTORY';
  totalRows: number;
  updates: ParsedInventoryItem[];
  missingItemCodes: string[];
  errors: ParsedRowError[];
}

export interface ParsedSheetData {
  sheetName: string;
  text: string;
}

// Global declaration for SheetJS
declare const window: any;

// Universal Workbook Reader: Handles Excel (.xlsx, .xls) with multiple sheets & CSV/TSV
export async function parseWorkbookFile(file: File): Promise<ParsedSheetData[]> {
  const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.name.endsWith('.xlsm') || file.name.endsWith('.ods');

  if (isExcel && typeof window !== 'undefined' && window.XLSX) {
    try {
      const buffer = await file.arrayBuffer();
      const workbook = window.XLSX.read(buffer, { type: 'array' });
      const sheets: ParsedSheetData[] = [];

      workbook.SheetNames.forEach((sheetName: string) => {
        const worksheet = workbook.Sheets[sheetName];
        if (!worksheet) return;
        // Convert sheet to CSV format
        const csv = window.XLSX.utils.sheet_to_csv(worksheet, { blankrows: false, FS: ',', RS: '\n' });
        if (csv && csv.trim().length > 0) {
          sheets.push({
            sheetName: sheetName.trim(),
            text: csv
          });
        }
      });

      if (sheets.length > 0) return sheets;
    } catch (e) {
      console.warn('SheetJS workbook parsing fallback to text:', e);
    }
  }

  // Fallback / standard CSV & TSV reading
  const rawText = await file.text();
  return [
    {
      sheetName: file.name.replace(/\.[^/.]+$/, ''),
      text: rawText
    }
  ];
}

// Robust CSV & TSV Line and Token Parser
export function parseCSVTokens(rawText: string): string[][] {
  const cleanText = rawText.replace(/^\uFEFF/, '').trim(); // Remove UTF-8 BOM
  if (!cleanText) return [];

  const lines: string[][] = [];
  let currentRow: string[] = [];
  let currentToken = '';
  let insideQuotes = false;

  for (let i = 0; i < cleanText.length; i++) {
    const char = cleanText[i];
    const nextChar = cleanText[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentToken += '"';
        i++; // Skip escaped double quote
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if ((char === ',' || char === '\t') && !insideQuotes) {
      currentRow.push(currentToken.trim());
      currentToken = '';
    } else if ((char === '\r' || char === '\n') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') i++;
      currentRow.push(currentToken.trim());
      currentToken = '';
      if (currentRow.some(col => col.length > 0)) {
        lines.push(currentRow);
      }
      currentRow = [];
    } else {
      currentToken += char;
    }
  }

  if (currentToken.length > 0 || currentRow.length > 0) {
    currentRow.push(currentToken.trim());
    if (currentRow.some(col => col.length > 0)) {
      lines.push(currentRow);
    }
  }

  return lines;
}

// Normalized header key mapper
function getHeaderMap(headers: string[]): { [normalized: string]: number } {
  const map: { [normalized: string]: number } = {};
  headers.forEach((h, idx) => {
    const clean = h.toLowerCase().replace(/[^a-z0-9]/g, '');
    map[clean] = idx;
  });
  return map;
}

function getColValue(row: string[], headerMap: { [key: string]: number }, ...possibleKeys: string[]): string {
  for (const key of possibleKeys) {
    const cleanKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (headerMap[cleanKey] !== undefined && row[headerMap[cleanKey]] !== undefined) {
      return row[headerMap[cleanKey]].trim();
    }
  }
  return '';
}

// Auto-detect CSV type from header signatures
export function detectCSVType(rawText: string): IngestionEntityType | 'UNKNOWN' {
  const rows = parseCSVTokens(rawText);
  if (rows.length === 0) return 'UNKNOWN';
  const row0Str = (rows[0] || []).join(' ').toLowerCase();
  const row1Str = (rows[1] || []).join(' ').toLowerCase();
  const row2Str = (rows[2] || []).join(' ').toLowerCase();
  const combinedHeaderScan = `${row0Str} ${row1Str} ${row2Str}`;

  // Check Process Master / Routing signatures
  if (
    combinedHeaderScan.includes('finishedpart') || combinedHeaderScan.includes('finisheditem') || 
    combinedHeaderScan.includes('rawcasting') || combinedHeaderScan.includes('stepno') || 
    combinedHeaderScan.includes('processname') || combinedHeaderScan.includes('operationname') || 
    combinedHeaderScan.includes('processshortcode') || combinedHeaderScan.includes('defaultrate') || 
    combinedHeaderScan.includes('defaultuom') || combinedHeaderScan.includes('routing')
  ) {
    return 'PROCESS_MASTER';
  }

  // Check BOM signatures
  if (
    combinedHeaderScan.includes('subassembly') || combinedHeaderScan.includes('qtypermachine') || 
    combinedHeaderScan.includes('bomcode') || combinedHeaderScan.includes('machinemodel') || 
    combinedHeaderScan.includes('qtyperunit') ||
    (combinedHeaderScan.includes('qty') && (combinedHeaderScan.includes('part') || combinedHeaderScan.includes('code') || combinedHeaderScan.includes('version') || combinedHeaderScan.includes('item')))
  ) {
    return 'BOM_MASTER';
  }
  if (row0Str.includes('vendorcode') || row0Str.includes('vendorname') || (row0Str.includes('vendor') && (row0Str.includes('credit') || row0Str.includes('supplier')))) {
    return 'VENDORS';
  }
  if (row0Str.includes('customercode') || row0Str.includes('customername') || (row0Str.includes('customer') && row0Str.includes('gstin'))) {
    return 'CUSTOMERS';
  }
  if (row0Str.includes('inhousestock') && !row0Str.includes('materialprocess') && !row0Str.includes('category')) {
    return 'INVENTORY';
  }
  if (row0Str.includes('itemcode') || row0Str.includes('itemname') || row0Str.includes('partcode') || row0Str.includes('processsource') || row0Str.includes('materialprocess') || row0Str.includes('category') || row0Str.includes('class')) {
    return 'ITEM_MASTER';
  }

  return 'UNKNOWN';
}

// ============================================================
// 1. ITEM MASTER PARSER (Deduplicates by PartCode/Name & Auto-Generates GEC0000001)
// ============================================================
export function parseItemsCSV(rawText: string, existingItems: Item[], existingVendors: Vendor[] = []): ParsedResult<Item> {
  const rows = parseCSVTokens(rawText);
  if (rows.length <= 1) {
    return { entityType: 'ITEM_MASTER', totalRows: 0, validRecords: [], skippedRecords: [], errors: [{ rowNumber: 1, identifier: 'FILE', message: 'CSV file is empty or missing data rows.' }] };
  }

  // Scan top rows to find actual header row
  let headerRowIndex = 0;
  for (let r = 0; r < Math.min(rows.length, 5); r++) {
    const rowNorm = rows[r].map(c => c.toLowerCase().replace(/[^a-z0-9]/g, ''));
    if (rowNorm.some(c => c.includes('itemname') || c.includes('partcode') || c.includes('itemcode') || c.includes('category') || c.includes('class') || c.includes('sources'))) {
      headerRowIndex = r;
      break;
    }
  }

  const headerMap = getHeaderMap(rows[headerRowIndex]);
  const dataRows = rows.slice(headerRowIndex + 1);
  const validRecords: Item[] = [];
  const skippedRecords: { rowNumber: number; identifier: string; reason: string }[] = [];
  const errors: ParsedRowError[] = [];

  // Filter active items only (ignore blocked / history items)
  const activeExistingItems = existingItems.filter(i => !i.isBlocked);
  const existingCodes = new Set(existingItems.map(i => i.itemCode.trim().toUpperCase()));
  const batchCodes = new Set<string>();
  const batchPartCodes = new Set<string>();
  const batchItemIds = new Set<string>();

  // Determine starting auto-code index in format GEC0000001
  let maxSeqNum = 0;
  existingItems.forEach(item => {
    const match = item.itemCode.match(/GEC(\d+)/i);
    if (match && match[1]) {
      const n = parseInt(match[1], 10);
      if (!isNaN(n) && n > maxSeqNum) maxSeqNum = n;
    }
  });
  let autoCodeIndex = maxSeqNum + 1;

  dataRows.forEach((row, idx) => {
    const rowNum = headerRowIndex + idx + 2;
    if (!row || row.every(c => !c.trim())) return; // Skip blank rows

    const itemName = getColValue(row, headerMap, 'itemname', 'name', 'description', 'item_name');

    if (!itemName) {
      errors.push({
        rowNumber: rowNum,
        identifier: `Row #${rowNum}`,
        message: 'ItemName (Component / Part Description) is required.',
        rawLine: row.join(',')
      });
      return;
    }

    const category = getColValue(row, headerMap, 'category', 'class', 'itemclass', 'item_category') || 'MC';
    let itemCode = getColValue(row, headerMap, 'itemcode', 'code', 'item_code').trim().toUpperCase();
    const partCode = getColValue(row, headerMap, 'partcode', 'part_code', 'drawingno', 'drawing_no').trim();
    const oldItemCode = getColValue(row, headerMap, 'olditemcode', 'old_code', 'oldcode').trim();

    // 1. DEDUPLICATION: Match against active existing items
    let existingMatch: Item | undefined;
    if (partCode) {
      existingMatch = activeExistingItems.find(i => i.partCode && i.partCode.trim().toUpperCase() === partCode.toUpperCase());
    }
    if (!existingMatch && itemCode) {
      existingMatch = activeExistingItems.find(i => i.itemCode.trim().toUpperCase() === itemCode.toUpperCase());
    }
    if (!existingMatch && oldItemCode) {
      existingMatch = activeExistingItems.find(i => i.oldItemCode && i.oldItemCode.trim().toUpperCase() === oldItemCode.toUpperCase());
    }
    if (!existingMatch && itemName) {
      existingMatch = activeExistingItems.find(i => i.name.trim().toLowerCase() === itemName.toLowerCase());
    }

    let finalId = '';
    let finalItemCode = '';

    if (existingMatch) {
      // Duplicate found in active Item Master -> Merge/Update existing item!
      finalId = existingMatch.id;
      finalItemCode = existingMatch.itemCode;
    } else {
      // In-batch deduplication check (within the same uploaded file)
      if (partCode && batchPartCodes.has(partCode.toUpperCase())) {
        skippedRecords.push({
          rowNumber: rowNum,
          identifier: partCode,
          reason: `Duplicate Part Code "${partCode}" found within uploaded sheet. Skipped.`
        });
        return;
      }
      if (itemCode && batchCodes.has(itemCode)) {
        skippedRecords.push({
          rowNumber: rowNum,
          identifier: itemCode,
          reason: `Duplicate ItemCode "${itemCode}" found within uploaded sheet. Skipped.`
        });
        return;
      }

      // Auto-generate ItemCode in format GEC0000001
      if (!itemCode) {
        let candidate = `GEC${String(autoCodeIndex).padStart(7, '0')}`;
        while (existingCodes.has(candidate) || batchCodes.has(candidate)) {
          autoCodeIndex++;
          candidate = `GEC${String(autoCodeIndex).padStart(7, '0')}`;
        }
        itemCode = candidate;
        autoCodeIndex++;
      }

      finalId = `itm-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 5)}`;
      finalItemCode = itemCode;

      batchCodes.add(finalItemCode);
      if (partCode) batchPartCodes.add(partCode.toUpperCase());
    }

    // Check if this item ID was already processed in the current batch
    if (batchItemIds.has(finalId)) {
      skippedRecords.push({
        rowNumber: rowNum,
        identifier: partCode || finalItemCode,
        reason: `Item "${partCode || finalItemCode}" already processed in this batch. Skipped duplicate row.`
      });
      return;
    }
    batchItemIds.add(finalId);

    // Parse Process Sources
    const rawSourcesStr = getColValue(row, headerMap, 'materialprocesssources', 'processsources', 'sources', 'processtype');
    const parsedSources: MaterialProcessSource[] = [];
    if (rawSourcesStr) {
      const parts = rawSourcesStr.split(/[;,|/]/).map(s => s.trim().toLowerCase());
      if (parts.some(p => p.includes('in-house') || p.includes('inhouse'))) parsedSources.push('In-house');
      if (parts.some(p => p.includes('job work') || p.includes('jobwork') || p.includes('jw'))) parsedSources.push('Job work');
      if (parts.some(p => p.includes('bought out') || p.includes('boughtout') || p.includes('brought out') || p.includes('bo'))) parsedSources.push('Bought out');
    }
    if (parsedSources.length === 0) {
      parsedSources.push(category === 'BO' ? 'Bought out' : 'In-house');
    }

    let derivedType: MaterialProcessType = 'In-house';
    if (parsedSources.includes('Job work') && parsedSources.includes('Bought out')) {
      derivedType = 'Job work + Bought out';
    } else if (parsedSources.includes('Job work')) {
      derivedType = 'Job work';
    } else if (parsedSources.includes('Bought out')) {
      derivedType = 'Bought out';
    }

    // Parse Preferred Vendors with STRICT active Vendor Master validation
    const rawVendorsStr = getColValue(row, headerMap, 'preferredvendors', 'vendors', 'vendor', 'vendorcodes', 'vendorcode', 'mappedvendors', 'preferred_vendors');
    let mappedVendors: ItemMappedVendor[] = existingMatch?.mappedVendors ? [...existingMatch.mappedVendors] : [];
    if (rawVendorsStr) {
      const activeVendors = existingVendors.filter(v => !v.isBlocked);
      const vTokens = rawVendorsStr.split(/[;,|/]/).map(t => t.trim()).filter(Boolean);
      const parsedMapped: ItemMappedVendor[] = [];
      let hasInvalidVendor = false;

      for (let vIdx = 0; vIdx < vTokens.length; vIdx++) {
        const token = vTokens[vIdx];
        const cleanTok = token.toUpperCase();
        const vMatch = activeVendors.find(v => 
          v.vendorCode.toUpperCase() === cleanTok || 
          v.name.toLowerCase() === token.toLowerCase() ||
          v.id === token
        );

        if (!vMatch) {
          hasInvalidVendor = true;
          errors.push({
            rowNumber: rowNum,
            identifier: partCode || finalItemCode || itemName,
            message: `Vendor "${token}" specified in Preferred Vendors does not exist in active Vendor Master. You must add the vendor to Vendor Master first before uploading this item.`,
            rawLine: row.join(',')
          });
          break;
        }

        parsedMapped.push({
          vendorId: vMatch.id,
          vendorName: vMatch.name,
          priorityOrder: vIdx + 1,
          priority: vIdx + 1
        });
      }

      if (hasInvalidVendor) {
        return; // Reject entire item: do not create or update item if vendor is invalid
      }

      if (parsedMapped.length > 0) {
        mappedVendors = parsedMapped;
      }
    }

    const unit = getColValue(row, headerMap, 'unit', 'uom') || existingMatch?.unit || 'NOS';
    const purchaseUOM = getColValue(row, headerMap, 'purchaseuom', 'purchase_uom') || existingMatch?.purchaseUOM || unit;
    const conversionFactor = parseFloat(getColValue(row, headerMap, 'conversionfactor', 'conv_factor')) || existingMatch?.conversionFactor || 1;
    const inHouseStock = getColValue(row, headerMap, 'inhousestock', 'inhouse_stock', 'stock', 'qty') !== '' ? Math.max(0, parseFloat(getColValue(row, headerMap, 'inhousestock', 'inhouse_stock', 'stock', 'qty')) || 0) : (existingMatch?.inHouseStock ?? 0);
    const externalStock = getColValue(row, headerMap, 'externalstock', 'external_stock', 'vendorstock') !== '' ? Math.max(0, parseFloat(getColValue(row, headerMap, 'externalstock', 'external_stock', 'vendorstock')) || 0) : (existingMatch?.externalStock ?? 0);
    const minStockQty = getColValue(row, headerMap, 'minstockqty', 'min_stock', 'safety_stock', 'reorderlevel') !== '' ? Math.max(0, parseFloat(getColValue(row, headerMap, 'minstockqty', 'min_stock', 'safety_stock', 'reorderlevel')) || 5) : (existingMatch?.minStockQty ?? 5);
    const minOrderQty = getColValue(row, headerMap, 'minorderqty', 'moq', 'min_order') !== '' ? Math.max(0, parseFloat(getColValue(row, headerMap, 'minorderqty', 'moq', 'min_order')) || 1) : (existingMatch?.minOrderQty ?? 1);
    const unitPrice = getColValue(row, headerMap, 'unitprice', 'price', 'rate', 'cost') !== '' ? Math.max(0, parseFloat(getColValue(row, headerMap, 'unitprice', 'price', 'rate', 'cost')) || 0) : (existingMatch?.unitPrice ?? 0);
    const leadTimeDays = getColValue(row, headerMap, 'leadtimedays', 'leadtime', 'lead_time_days') !== '' ? Math.max(0, parseInt(getColValue(row, headerMap, 'leadtimedays', 'leadtime', 'lead_time_days'), 10) || 0) : (existingMatch?.leadTimeDays ?? 0);
    const location = getColValue(row, headerMap, 'location', 'rack', 'bin') || existingMatch?.location || 'Central Store';
    const qcTriggerStr = getColValue(row, headerMap, 'qctrigger', 'qc_trigger').toUpperCase();
    const qcTrigger: QCTrigger = 
      qcTriggerStr.includes('NO') || qcTriggerStr.includes('SKIP') ? 'NO_QC' : 
      qcTriggerStr.includes('ASSEMBLY') || qcTriggerStr.includes('DURING') ? 'DURING_ASSEMBLY' : 
      qcTriggerStr.includes('GRN') || qcTriggerStr.includes('INWARD') || qcTriggerStr.includes('MANDATORY') ? 'ON_GRN' : (existingMatch?.qcTrigger || '');
    const testReportRequired = getColValue(row, headerMap, 'testreportrequired', 'test_report', 'tc') !== '' ? getColValue(row, headerMap, 'testreportrequired', 'test_report', 'tc').toLowerCase() === 'true' : (existingMatch?.testReportRequired ?? false);
    const weightKg = parseFloat(getColValue(row, headerMap, 'weightkg', 'weight_kg', 'weight')) || existingMatch?.weightKg || 0;
    const specification = getColValue(row, headerMap, 'specification', 'spec', 'material_grade') || existingMatch?.specification;

    const newItem: Item = {
      id: finalId,
      itemCode: finalItemCode,
      partCode: partCode || existingMatch?.partCode || undefined,
      oldItemCode: oldItemCode || existingMatch?.oldItemCode || undefined,
      name: itemName,
      category,
      unit,
      purchaseUOM,
      conversionFactor,
      inHouseStock,
      externalStock,
      minStockQty,
      minOrderQty,
      unitPrice,
      leadTimeDays,
      location,
      qcTrigger,
      testReportRequired,
      weightKg: weightKg || undefined,
      specification: specification || undefined,
      materialProcessSources: parsedSources,
      processType: derivedType,
      mappedVendors: mappedVendors.length > 0 ? mappedVendors : undefined,
      isBlocked: false
    };

    validRecords.push(newItem);
  });

  return {
    entityType: 'ITEM_MASTER',
    totalRows: dataRows.length,
    validRecords,
    skippedRecords,
    errors
  };
}

// ============================================================
// 2. BOM MASTER PARSER (Strict Active Item Master Referential Integrity)
// ============================================================
export function parseBOMsCSV(rawText: string, existingBOMs: BOM[], allItems: Item[], defaultSheetModelName?: string): ParsedResult<BOM> {
  const rows = parseCSVTokens(rawText);
  if (rows.length <= 1) {
    return { entityType: 'BOM_MASTER', totalRows: 0, validRecords: [], skippedRecords: [], errors: [{ rowNumber: 1, identifier: 'FILE', message: 'BOM sheet is empty or missing data rows.' }] };
  }

  const errors: ParsedRowError[] = [];
  const skippedRecords: { rowNumber: number; identifier: string; reason: string }[] = [];

  // 1. Strict Requirement: Only check ACTIVE (non-blocked/non-history) items
  const activeItems = allItems.filter(i => !i.isBlocked);
  const activeBOMs = existingBOMs.filter(b => !(b as any).isBlocked && !(b as any).isDeleted);

  if (!activeItems || activeItems.length === 0) {
    return {
      entityType: 'BOM_MASTER',
      totalRows: rows.length,
      validRecords: [],
      skippedRecords: [],
      errors: [{
        rowNumber: 1,
        identifier: 'ITEM_MASTER_EMPTY',
        message: 'Active Item Master is completely empty. You must upload or register all active items in the Item Master before creating a BOM.'
      }]
    };
  }

  // 2. Detect if Row 0 is the Parent Item Header Title e.g. (old code) item name [part code]
  let headerRowIndex = 0;
  let parentOldCode = '';
  let parentPartCode = '';
  let parentItemName = '';
  let parentFullTitle = defaultSheetModelName || 'Standard Machine BOM';

  const row0Str = (rows[0] || []).join(' ').trim();
  const row1Headers = rows[1] ? rows[1].map(c => c.toLowerCase().replace(/[^a-z0-9]/g, '')) : [];
  const isRow1Columns = row1Headers.some(h => h.includes('partcode') || h.includes('itemname') || h.includes('code') || h.includes('qty') || h.includes('version') || h.includes('description'));

  if (rows.length >= 2 && isRow1Columns) {
    headerRowIndex = 1;
    parentFullTitle = row0Str || defaultSheetModelName || 'Standard Machine BOM';
    const mOld = row0Str.match(/\(([^)]+)\)/);
    const mPart = row0Str.match(/\[([^\]]+)\]/);
    if (mOld) parentOldCode = mOld[1].trim();
    if (mPart) parentPartCode = mPart[1].trim();

    parentItemName = row0Str.replace(/\(.*?\)/g, '').replace(/\[.*?\]/g, '').trim();
  }

  // 3. Strict Parent Item Validation against ACTIVE Item Master
  let matchedParentItem: Item | undefined;
  if (parentPartCode) {
    matchedParentItem = activeItems.find(i => i.partCode && i.partCode.trim().toUpperCase() === parentPartCode.toUpperCase());
  }
  if (!matchedParentItem && parentOldCode) {
    matchedParentItem = activeItems.find(i => i.oldItemCode && i.oldItemCode.trim().toUpperCase() === parentOldCode.toUpperCase());
  }
  if (!matchedParentItem && parentItemName) {
    matchedParentItem = activeItems.find(i => i.name.trim().toLowerCase() === parentItemName.toLowerCase());
  }
  if (!matchedParentItem && defaultSheetModelName) {
    matchedParentItem = activeItems.find(i => 
      i.name.trim().toLowerCase() === defaultSheetModelName.toLowerCase() ||
      (i.partCode && i.partCode.trim().toUpperCase() === defaultSheetModelName.toUpperCase()) ||
      (i.oldItemCode && i.oldItemCode.trim().toUpperCase() === defaultSheetModelName.toUpperCase())
    );
  }

  if (!matchedParentItem) {
    // Check if it exists but is blocked/in history
    const blockedParent = allItems.find(i => 
      i.isBlocked && (
        (parentPartCode && i.partCode && i.partCode.trim().toUpperCase() === parentPartCode.toUpperCase()) ||
        (parentOldCode && i.oldItemCode && i.oldItemCode.trim().toUpperCase() === parentOldCode.toUpperCase()) ||
        (parentItemName && i.name.trim().toLowerCase() === parentItemName.toLowerCase())
      )
    );

    errors.push({
      rowNumber: 1,
      identifier: parentPartCode || parentOldCode || parentItemName || defaultSheetModelName || 'PARENT_ASSEMBLY',
      message: blockedParent 
        ? `Parent Assembly "${parentFullTitle}" is currently BLOCKED / in history in Item Master. Please restore it before creating this BOM.`
        : `Parent Assembly "${parentFullTitle}" was not found in the Item Master. Please register this item in the Item Master first.`
    });
  }

  const defaultBOMCode = matchedParentItem?.partCode || matchedParentItem?.itemCode || parentPartCode || parentOldCode || (defaultSheetModelName ? `BOM-${defaultSheetModelName.replace(/[^a-zA-Z0-9]/g, '-').toUpperCase()}` : 'BOM-MAIN');
  const defaultModelName = matchedParentItem?.name || parentItemName || defaultSheetModelName || parentFullTitle;

  const headerMap = getHeaderMap(rows[headerRowIndex]);
  const dataRows = rows.slice(headerRowIndex + 1);

  const bomGroups: { [bomKey: string]: { bomCode: string; machineModel: string; version: string; components: BOMComponent[] } } = {};

  // 4. Strict Component Lines Validation (Every component must exist in ACTIVE Item Master)
  dataRows.forEach((row, idx) => {
    const rowNum = headerRowIndex + 1 + idx + 1;
    if (!row || row.every(cell => !cell.trim())) return; // Skip blank rows

    const machineModel = getColValue(row, headerMap, 'machinemodel', 'machine_model', 'model', 'assemblyname', 'bomname') || defaultModelName;
    let bomCode = getColValue(row, headerMap, 'bomcode', 'bom_code', 'bomno').toUpperCase() || defaultBOMCode;
    const version = getColValue(row, headerMap, 'version', 'rev', 'revision') || 'Rev 1.0';

    let codeFromRow = getColValue(row, headerMap, 'partcode', 'newpartcode', 'part_code', 'itemcode', 'componentcode', 'item_code', 'code').trim();
    let itemName = getColValue(row, headerMap, 'itemname', 'itemdecription', 'itemdescription', 'componentname', 'item_name', 'description', 'partname', 'name').trim();

    if (!codeFromRow && !itemName) {
      errors.push({
        rowNumber: rowNum,
        identifier: `Row #${rowNum}`,
        message: 'Missing Part Code or Item Name on component line.',
        rawLine: row.join(',')
      });
      return;
    }

    // Match Component against ACTIVE Item Master
    let matchedItem: Item | undefined;
    if (codeFromRow) {
      const cleanCode = codeFromRow.toUpperCase();
      matchedItem = activeItems.find(i => 
        (i.partCode && i.partCode.trim().toUpperCase() === cleanCode) ||
        (i.itemCode && i.itemCode.trim().toUpperCase() === cleanCode) ||
        (i.oldItemCode && i.oldItemCode.trim().toUpperCase() === cleanCode)
      );
    }
    if (!matchedItem && itemName) {
      const cleanName = itemName.toLowerCase();
      matchedItem = activeItems.find(i => i.name.trim().toLowerCase() === cleanName);
    }

    // STRICT VALIDATION: Reject if component not in active Item Master
    if (!matchedItem) {
      const blockedMatch = allItems.find(i => 
        i.isBlocked && (
          (codeFromRow && (
            (i.partCode && i.partCode.trim().toUpperCase() === codeFromRow.toUpperCase()) ||
            (i.itemCode && i.itemCode.trim().toUpperCase() === codeFromRow.toUpperCase()) ||
            (i.oldItemCode && i.oldItemCode.trim().toUpperCase() === codeFromRow.toUpperCase())
          )) ||
          (itemName && i.name.trim().toLowerCase() === itemName.toLowerCase())
        )
      );

      errors.push({
        rowNumber: rowNum,
        identifier: codeFromRow || itemName || `Row #${rowNum}`,
        message: blockedMatch
          ? `Component "${codeFromRow || itemName}" is BLOCKED / in history. Please unblock it in Item Master first.`
          : `Component "${codeFromRow || itemName}" not found in Item Master. You must add it to the Item Master before creating this BOM.`,
        rawLine: row.join(',')
      });
      return;
    }

    const finalItemCode = matchedItem.itemCode;
    const finalItemName = matchedItem.name || itemName;
    const subAssemblyTag = getColValue(row, headerMap, 'subassemblytag', 'subassembly', 'sub_assembly', 'section', 'class', 'category') || matchedItem.category || 'General';
    const qtyPerMachine = parseFloat(getColValue(row, headerMap, 'qty', 'bomqty', 'quantity', 'qtypermachine', 'qty_per_machine', 'qtyperunit')) || 1;
    const unit = getColValue(row, headerMap, 'unit', 'uom') || matchedItem.unit || 'NOS';
    const scrapPercent = parseFloat(getColValue(row, headerMap, 'scrappercent', 'scrap_percent', 'scrap')) || 0;
    const estimatedHours = parseFloat(getColValue(row, headerMap, 'esthoursperunit', 'estimatedhours', 'hours')) || 0;

    const groupKey = `${bomCode}__${machineModel}`.toUpperCase();
    if (!bomGroups[groupKey]) {
      bomGroups[groupKey] = {
        bomCode,
        machineModel,
        version,
        components: []
      };
    }

    bomGroups[groupKey].components.push({
      itemId: matchedItem.id,
      itemCode: finalItemCode,
      itemName: finalItemName,
      qtyPerMachine,
      unit,
      subAssemblyTag,
      scrapPercent,
      estimatedHours
    });
  });

  // 5. ALL-OR-NOTHING: If there are ANY errors (missing parent or missing components), do NOT create the BOM!
  if (errors.length > 0) {
    return {
      entityType: 'BOM_MASTER',
      totalRows: dataRows.length,
      validRecords: [], // Strict referential integrity: 0 records emitted if errors exist
      skippedRecords,
      errors
    };
  }

  const validRecords: BOM[] = [];

  Object.values(bomGroups).forEach((group, gIdx) => {
    if (group.components.length === 0) return;

    const existingMatch = activeBOMs.find(b => b.bomCode.toUpperCase() === group.bomCode.toUpperCase() || b.machineModel.toLowerCase() === group.machineModel.toLowerCase());

    const totalHours = group.components.reduce((sum, c) => sum + (c.qtyPerMachine * (c.estimatedHours || 0)), 0);

    validRecords.push({
      id: existingMatch?.id || `bom-${Date.now()}-${gIdx}-${Math.random().toString(36).substr(2, 5)}`,
      bomCode: group.bomCode,
      machineModel: group.machineModel,
      version: group.version,
      description: `BOM with ${group.components.length} verified components`,
      components: group.components,
      estimatedProductionHours: Math.round(totalHours * 10) / 10,
      lastUpdated: new Date().toISOString()
    });
  });

  return {
    entityType: 'BOM_MASTER',
    totalRows: dataRows.length,
    validRecords,
    skippedRecords,
    errors: []
  };
}

// ============================================================
// 3. INVENTORY STOCK PARSER
// ============================================================
export function parseInventoryCSV(rawText: string, existingItems: Item[]): ParsedInventoryResult {
  const rows = parseCSVTokens(rawText);
  if (rows.length <= 1) {
    return { entityType: 'INVENTORY', totalRows: 0, updates: [], missingItemCodes: [], errors: [{ rowNumber: 1, identifier: 'FILE', message: 'Inventory CSV file is empty or missing data rows.' }] };
  }

  const headerMap = getHeaderMap(rows[0]);
  const dataRows = rows.slice(1);
  const updates: ParsedInventoryItem[] = [];
  const missingItemCodes: string[] = [];
  const errors: ParsedRowError[] = [];

  const itemMap = new Map(existingItems.map(i => [i.itemCode.trim().toUpperCase(), i]));

  dataRows.forEach((row, idx) => {
    const rowNum = idx + 2;
    const itemCode = getColValue(row, headerMap, 'itemcode', 'code', 'item_code').toUpperCase();

    if (!itemCode) {
      errors.push({
        rowNumber: rowNum,
        identifier: `Row #${rowNum}`,
        message: 'ItemCode is required to identify stock records.',
        rawLine: row.join(',')
      });
      return;
    }

    const matched = itemMap.get(itemCode);
    if (!matched) {
      missingItemCodes.push(itemCode);
      return;
    }

    const inHouseStock = Math.max(0, parseFloat(getColValue(row, headerMap, 'inhousestock', 'inhouse_stock', 'stock', 'qty')) || matched.inHouseStock);
    const externalStock = Math.max(0, parseFloat(getColValue(row, headerMap, 'externalstock', 'external_stock', 'vendorstock')) || (matched.externalStock || 0));
    const location = getColValue(row, headerMap, 'location', 'rack', 'bin') || matched.location;
    const unitPriceStr = getColValue(row, headerMap, 'unitprice', 'price', 'rate');
    const unitPrice = unitPriceStr ? parseFloat(unitPriceStr) : matched.unitPrice;
    const minStockQtyStr = getColValue(row, headerMap, 'minstockqty', 'min_stock', 'safety_stock');
    const minStockQty = minStockQtyStr ? parseFloat(minStockQtyStr) : matched.minStockQty;

    updates.push({
      itemId: matched.id,
      itemCode,
      inHouseStock,
      externalStock,
      location,
      unitPrice,
      minStockQty
    });
  });

  return {
    entityType: 'INVENTORY',
    totalRows: dataRows.length,
    updates,
    missingItemCodes,
    errors
  };
}

// ============================================================
// 4. VENDOR MASTER PARSER (Auto-Generates VendorCode VEN0000001 if omitted)
// ============================================================
export function parseVendorsCSV(rawText: string, existingVendors: Vendor[]): ParsedResult<Vendor> {
  const rows = parseCSVTokens(rawText);
  if (rows.length <= 1) {
    return { entityType: 'VENDORS', totalRows: 0, validRecords: [], skippedRecords: [], errors: [{ rowNumber: 1, identifier: 'FILE', message: 'Vendors CSV file is empty or missing data rows.' }] };
  }

  const headerMap = getHeaderMap(rows[0]);
  const dataRows = rows.slice(1);
  const validRecords: Vendor[] = [];
  const skippedRecords: { rowNumber: number; identifier: string; reason: string }[] = [];
  const errors: ParsedRowError[] = [];
  const batchCodes = new Set<string>();

  // Determine starting auto-code index in format VEN0000001
  let maxSeqNum = 0;
  existingVendors.forEach(v => {
    const match = v.vendorCode.match(/VEN(\d+)/i) || v.vendorCode.match(/(\d+)/);
    if (match && match[1]) {
      const n = parseInt(match[1], 10);
      if (!isNaN(n) && n > maxSeqNum) maxSeqNum = n;
    }
  });
  let autoCodeIndex = maxSeqNum + 1;

  dataRows.forEach((row, idx) => {
    const rowNum = idx + 2;
    if (!row || row.every(c => !c.trim())) return;

    const name = getColValue(row, headerMap, 'vendorname', 'name', 'company', 'firm_name', 'vendor');

    if (!name) {
      errors.push({
        rowNumber: rowNum,
        identifier: `Row #${rowNum}`,
        message: 'VendorName (Firm / Business Name) is required.',
        rawLine: row.join(',')
      });
      return;
    }

    let vendorCode = getColValue(row, headerMap, 'vendorcode', 'code', 'vendor_code').trim().toUpperCase();
    if (!vendorCode) {
      let candidate = `VEN${String(autoCodeIndex).padStart(7, '0')}`;
      while (existingVendors.some(v => v.vendorCode.toUpperCase() === candidate.toUpperCase()) || batchCodes.has(candidate)) {
        autoCodeIndex++;
        candidate = `VEN${String(autoCodeIndex).padStart(7, '0')}`;
      }
      vendorCode = candidate;
      autoCodeIndex++;
    }

    if (batchCodes.has(vendorCode)) {
      skippedRecords.push({
        rowNumber: rowNum,
        identifier: vendorCode,
        reason: `Duplicate VendorCode "${vendorCode}" within sheet. Skipped.`
      });
      return;
    }

    batchCodes.add(vendorCode);

    const gstin = getColValue(row, headerMap, 'gstin', 'gst', 'gst_no').trim().toUpperCase();
    const existingMatch = existingVendors.find(v => 
      v.vendorCode.toUpperCase() === vendorCode ||
      (gstin && v.gstin && v.gstin.trim().toUpperCase() === gstin) ||
      v.name.trim().toLowerCase() === name.trim().toLowerCase()
    );

    const vendor: Vendor = {
      id: existingMatch?.id || `ven-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 5)}`,
      vendorCode,
      name,
      contactPerson: getColValue(row, headerMap, 'contactperson', 'contact', 'person') || '',
      phone: getColValue(row, headerMap, 'phone', 'phoneno', 'mobile', 'tel') || '',
      email: getColValue(row, headerMap, 'email', 'emailaddress', 'mail') || '',
      city: getColValue(row, headerMap, 'city') || '',
      state: getColValue(row, headerMap, 'state') || 'Gujarat',
      address: getColValue(row, headerMap, 'address', 'location') || '',
      gstin: gstin || '',
      pan: getColValue(row, headerMap, 'pan', 'pan_no') || undefined,
      creditDays: parseInt(getColValue(row, headerMap, 'creditdays', 'credit_days', 'terms'), 10) || 30,
      bankName: getColValue(row, headerMap, 'bankname', 'bank') || undefined,
      accountNumber: getColValue(row, headerMap, 'accountnumber', 'acc_no', 'bank_account') || undefined,
      ifscCode: getColValue(row, headerMap, 'ifsccode', 'ifsc') || undefined
    };

    validRecords.push(vendor);
  });

  return {
    entityType: 'VENDORS',
    totalRows: dataRows.length,
    validRecords,
    skippedRecords,
    errors
  };
}

// ============================================================
// 5. CUSTOMER MASTER PARSER (Auto-Generates CustomerCode if omitted)
// ============================================================
export function parseCustomersCSV(rawText: string, existingCustomers: Customer[]): ParsedResult<Customer> {
  const rows = parseCSVTokens(rawText);
  if (rows.length <= 1) {
    return { entityType: 'CUSTOMERS', totalRows: 0, validRecords: [], skippedRecords: [], errors: [{ rowNumber: 1, identifier: 'FILE', message: 'Customers CSV file is empty or missing data rows.' }] };
  }

  const headerMap = getHeaderMap(rows[0]);
  const dataRows = rows.slice(1);
  const validRecords: Customer[] = [];
  const skippedRecords: { rowNumber: number; identifier: string; reason: string }[] = [];
  const errors: ParsedRowError[] = [];
  const batchCodes = new Set<string>();

  let autoCodeIndex = existingCustomers.length + 1;

  dataRows.forEach((row, idx) => {
    const rowNum = idx + 2;
    const name = getColValue(row, headerMap, 'customername', 'name', 'client', 'company');

    if (!name) {
      errors.push({
        rowNumber: rowNum,
        identifier: `Row #${rowNum}`,
        message: 'CustomerName (Client / Business Name) is required.',
        rawLine: row.join(',')
      });
      return;
    }

    let customerCode = getColValue(row, headerMap, 'customercode', 'code', 'customer_code').toUpperCase();
    if (!customerCode) {
      let candidate = `CUST-GEC-${String(autoCodeIndex).padStart(3, '0')}`;
      while (existingCustomers.some(c => c.customerCode === candidate) || batchCodes.has(candidate)) {
        autoCodeIndex++;
        candidate = `CUST-GEC-${String(autoCodeIndex).padStart(3, '0')}`;
      }
      customerCode = candidate;
      autoCodeIndex++;
    }

    if (batchCodes.has(customerCode)) {
      skippedRecords.push({
        rowNumber: rowNum,
        identifier: customerCode,
        reason: `Duplicate CustomerCode "${customerCode}" within sheet. Skipped.`
      });
      return;
    }

    batchCodes.add(customerCode);

    const existingMatch = existingCustomers.find(c => c.customerCode.toUpperCase() === customerCode);

    const customer: Customer = {
      id: existingMatch?.id || `cust-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 5)}`,
      customerCode,
      name,
      contactPerson: getColValue(row, headerMap, 'contactperson', 'contact') || 'Purchaser',
      phone: getColValue(row, headerMap, 'phone', 'mobile') || '9879000000',
      email: getColValue(row, headerMap, 'email') || 'client@example.com',
      address: getColValue(row, headerMap, 'address') || 'Main Industrial Estate',
      city: getColValue(row, headerMap, 'city') || 'Ahmedabad',
      state: getColValue(row, headerMap, 'state') || 'Gujarat',
      gstin: getColValue(row, headerMap, 'gstin', 'gst') || '24AAACC0000A1Z5',
      pan: getColValue(row, headerMap, 'pan') || undefined,
      bankName: getColValue(row, headerMap, 'bankname', 'bank') || undefined,
      accountNumber: getColValue(row, headerMap, 'accountnumber', 'acc_no') || undefined,
      ifscCode: getColValue(row, headerMap, 'ifsccode', 'ifsc') || undefined
    };

    validRecords.push(customer);
  });

  return {
    entityType: 'CUSTOMERS',
    totalRows: dataRows.length,
    validRecords,
    skippedRecords,
    errors
  };
}

// ============================================================
// 6. PROCESS MASTER & ROUTING PARSER
// ============================================================
export interface ParsedProcessResult {
  entityType: 'PROCESS_MASTER';
  totalRows: number;
  validRecords: ProcessDefinition[];
  validCards: ItemProcessCard[];
  isRoutingSheet: boolean;
  skippedRecords: { rowNumber: number; identifier: string; reason: string }[];
  errors: ParsedRowError[];
}

export function parseProcessesCSV(
  rawText: string, 
  existingProcesses: ProcessDefinition[],
  allItems: Item[] = [],
  existingCards: ItemProcessCard[] = [],
  existingVendors: Vendor[] = []
): ParsedProcessResult {
  const rows = parseCSVTokens(rawText);
  if (rows.length <= 1) {
    return { 
      entityType: 'PROCESS_MASTER', 
      totalRows: 0, 
      validRecords: [], 
      validCards: [],
      isRoutingSheet: false,
      skippedRecords: [], 
      errors: [{ rowNumber: 1, identifier: 'FILE', message: 'Processes CSV file is empty or missing data rows.' }] 
    };
  }

  // Scan top rows to find actual header row
  let headerRowIndex = 0;
  for (let r = 0; r < Math.min(rows.length, 5); r++) {
    const rowNorm = rows[r].map(c => c.toLowerCase().replace(/[^a-z0-9]/g, ''));
    if (
      rowNorm.some(c => 
        c.includes('processname') || c.includes('operationname') || c.includes('operation') || 
        c.includes('shortcode') || c.includes('proccode') || c.includes('finishedpart') || 
        c.includes('rawcasting') || c.includes('stepno') || (c.includes('process') && (c.includes('name') || c.includes('code') || c.includes('short') || c.includes('route')))
      )
    ) {
      headerRowIndex = r;
      break;
    }
  }

  const headerMap = getHeaderMap(rows[headerRowIndex]);
  const dataRows = rows.slice(headerRowIndex + 1);
  const activeItems = allItems.filter(i => !i.isBlocked);

  // Check if this sheet has Process Routing columns (e.g. Finished item + Raw casting + Step No)
  const isRoutingSheet = Boolean(
    headerMap['finishedpartcode'] !== undefined ||
    headerMap['finpart'] !== undefined ||
    headerMap['finishedpart'] !== undefined ||
    headerMap['finisheditemname'] !== undefined ||
    headerMap['finname'] !== undefined ||
    headerMap['finisheditem'] !== undefined ||
    headerMap['rawcastingpartcode'] !== undefined ||
    headerMap['rawpart'] !== undefined ||
    headerMap['rawcastingname'] !== undefined ||
    headerMap['rawname'] !== undefined ||
    headerMap['stepno'] !== undefined ||
    headerMap['step'] !== undefined ||
    headerMap['operationno'] !== undefined
  );

  if (isRoutingSheet) {
    const cardMap: { [itemKey: string]: { 
      finItem: Item; 
      rawItem?: Item; 
      steps: ItemProcessStep[]; 
      notes?: string;
    } } = {};

    const extractedProcsMap = new Map<string, ProcessDefinition>();
    existingProcesses.forEach(p => extractedProcsMap.set(p.shortCode.toUpperCase(), p));

    const activeVendors = existingVendors.filter(v => !v.isBlocked);
    const invalidGroupKeys = new Set<string>();
    const errors: ParsedRowError[] = [];
    const skippedRecords: { rowNumber: number; identifier: string; reason: string }[] = [];

    dataRows.forEach((row, idx) => {
      const rowNum = headerRowIndex + idx + 2;
      if (!row || row.every(c => !c.trim())) return;

      const finPartCode = getColValue(row, headerMap, 'finishedpartcode', 'finpart', 'finishedpart', 'partcode', 'finishedcode', 'parentcode', 'fgcode').trim();
      const finOldCode = getColValue(row, headerMap, 'finishedoldcode', 'finold', 'oldcode', 'finishedolditemcode').trim();
      const finItemName = getColValue(row, headerMap, 'finisheditemname', 'finname', 'finisheditem', 'itemname', 'name', 'finishedname', 'parentname').trim();

      const rawPartCode = getColValue(row, headerMap, 'rawcastingpartcode', 'rawpart', 'rawpartcode', 'castingpartcode', 'rmcode', 'rawmaterialcode', 'sourcecode').trim();
      const rawOldCode = getColValue(row, headerMap, 'rawcastingoldcode', 'rawold', 'castingoldcode', 'rawmaterialoldcode').trim();
      const rawItemName = getColValue(row, headerMap, 'rawcastingname', 'rawname', 'castingname', 'rawitem', 'rawmaterialname', 'sourcename').trim();

      const stepNoStr = getColValue(row, headerMap, 'stepno', 'step', 'stepnumber', 'operationno', 'seq', 'sequenceno', 'step_no');
      const stepNo = parseInt(stepNoStr, 10) || 1;
      const procName = getColValue(row, headerMap, 'processname', 'operationname', 'operation', 'process', 'stepname', 'name', 'title', 'procname', 'procop', 'process_name', 'operation_name').trim();
      let shortCode = getColValue(row, headerMap, 'processshortcode', 'shortcode', 'code', 'proccode', 'processcode', 'opcode', 'short_code').trim().toUpperCase();
      const estDays = parseFloat(getColValue(row, headerMap, 'estimateddays', 'estdays', 'days', 'leadtime', 'esthours', 'duration')) || 1;
      const remarks = getColValue(row, headerMap, 'remarks', 'specs', 'notes', 'description', 'specification').trim();

      if (!finPartCode && !finItemName && !finOldCode) {
        errors.push({
          rowNumber: rowNum,
          identifier: `Row #${rowNum}`,
          message: 'Finished Item identifier (Part Code, Old Code, or Name) is required.',
          rawLine: row.join(',')
        });
        return;
      }

      if (!procName) {
        errors.push({
          rowNumber: rowNum,
          identifier: finPartCode || finItemName || `Row #${rowNum}`,
          message: 'Process / Operation Name is required.',
          rawLine: row.join(',')
        });
        return;
      }

      // Match Finished Item against active Item Master
      let matchedFinItem: Item | undefined;
      if (finPartCode) {
        matchedFinItem = activeItems.find(i => i.partCode && i.partCode.trim().toUpperCase() === finPartCode.toUpperCase());
      }
      if (!matchedFinItem && finOldCode) {
        matchedFinItem = activeItems.find(i => i.oldItemCode && i.oldItemCode.trim().toUpperCase() === finOldCode.toUpperCase());
      }
      if (!matchedFinItem && finItemName) {
        matchedFinItem = activeItems.find(i => i.name.trim().toLowerCase() === finItemName.toLowerCase());
      }

      if (!matchedFinItem) {
        errors.push({
          rowNumber: rowNum,
          identifier: finPartCode || finOldCode || finItemName,
          message: `Finished Item "${finPartCode || finItemName}" not found in active Item Master. Please create this item first.`,
          rawLine: row.join(',')
        });
        return;
      }

      // Match Raw Casting Item against active Item Master
      let matchedRawItem: Item | undefined;
      if (rawPartCode) {
        matchedRawItem = activeItems.find(i => i.partCode && i.partCode.trim().toUpperCase() === rawPartCode.toUpperCase());
      }
      if (!matchedRawItem && rawOldCode) {
        matchedRawItem = activeItems.find(i => i.oldItemCode && i.oldItemCode.trim().toUpperCase() === rawOldCode.toUpperCase());
      }
      if (!matchedRawItem && rawItemName) {
        matchedRawItem = activeItems.find(i => i.name.trim().toLowerCase() === rawItemName.toLowerCase());
      }

      // Generate ShortCode if missing
      if (!shortCode) {
        const words = procName.split(/\s+/);
        shortCode = words.length > 1 ? words.map(w => w[0]).join('').toUpperCase().slice(0, 4) : procName.slice(0, 4).toUpperCase();
      }

      // Register or update process definition
      if (!extractedProcsMap.has(shortCode)) {
        extractedProcsMap.set(shortCode, {
          id: `proc-${Date.now()}-${shortCode.toLowerCase()}`,
          shortCode,
          name: procName,
          description: remarks || undefined,
          defaultRate: 0,
          defaultUOM: 'PCS',
          createdAt: new Date().toISOString()
        });
      }

      const procObj = extractedProcsMap.get(shortCode)!;

      // Parse Assigned Vendors for this Step (STRICT ACTIVE VENDOR CHECK)
      const rawVendorsStr = getColValue(row, headerMap, 'vendors', 'vendor', 'assignedvendors', 'preferredvendors', 'vendorcodes', 'vendorcode', 'vendorname', 'vendor_name', 'suppliers', 'supplier', 'assigned_vendors');
      const vendorIds: string[] = [];
      let stepHasInvalidVendor = false;
      if (rawVendorsStr) {
        const tokens = rawVendorsStr.split(/[;,|/]/).map(t => t.trim()).filter(Boolean);
        tokens.forEach(tok => {
          const cleanTok = tok.toUpperCase();
          const vMatch = activeVendors.find(v => 
            v.vendorCode.toUpperCase() === cleanTok || 
            v.name.toLowerCase() === tok.toLowerCase() ||
            v.id === tok
          );
          if (!vMatch) {
            const blockedMatch = existingVendors.find(v =>
              v.isBlocked && (
                v.vendorCode.toUpperCase() === cleanTok ||
                v.name.toLowerCase() === tok.toLowerCase() ||
                v.id === tok
              )
            );
            errors.push({
              rowNumber: rowNum,
              identifier: finPartCode || finItemName || `Row #${rowNum}`,
              message: blockedMatch
                ? `Vendor "${tok}" on step "${procName}" is currently BLOCKED / in history in Vendor Master. Complete process routing for "${matchedFinItem?.name || finItemName}" will not be created.`
                : `Vendor "${tok}" on step "${procName}" does not exist in active Vendor Master. Complete process routing for "${matchedFinItem?.name || finItemName}" will not be created.`,
              rawLine: row.join(',')
            });
            stepHasInvalidVendor = true;
          } else {
            if (!vendorIds.includes(vMatch.id)) {
              vendorIds.push(vMatch.id);
            }
          }
        });
      }

      const groupKey = matchedFinItem.id;
      if (stepHasInvalidVendor) {
        invalidGroupKeys.add(groupKey);
      }

      if (!cardMap[groupKey]) {
        cardMap[groupKey] = {
          finItem: matchedFinItem,
          rawItem: matchedRawItem,
          steps: [],
          notes: `Manufactured from ${matchedRawItem?.name || rawItemName || 'Raw Material'}`
        };
      }

      // Update raw item if found in later row
      if (matchedRawItem && !cardMap[groupKey].rawItem) {
        cardMap[groupKey].rawItem = matchedRawItem;
      }

      cardMap[groupKey].steps.push({
        stepNumber: stepNo,
        processId: procObj.id,
        processName: procName,
        processShortCode: shortCode,
        vendorIds,
        estimatedDays: estDays,
        remarks: remarks || undefined
      });
    });

    // If there are errors in routing validation, return errors
    if (errors.length > 0) {
      return {
        entityType: 'PROCESS_MASTER',
        totalRows: dataRows.length,
        validRecords: [],
        validCards: [],
        isRoutingSheet: true,
        skippedRecords,
        errors
      };
    }

    const validCards: ItemProcessCard[] = [];
    Object.entries(cardMap).forEach(([groupKey, group], gIdx) => {
      if (invalidGroupKeys.has(groupKey)) return; // Exclude card completely if any vendor was invalid

      // Sort steps in order
      const sortedSteps = group.steps.sort((a, b) => a.stepNumber - b.stepNumber).map((s, sIdx) => ({
        ...s,
        stepNumber: sIdx + 1
      }));

      const existingCard = existingCards.find(c => c.itemId === group.finItem.id || c.itemCode === group.finItem.itemCode);

      validCards.push({
        id: existingCard?.id || `card-${Date.now()}-${gIdx}-${Math.random().toString(36).substr(2, 5)}`,
        itemId: group.finItem.id,
        itemCode: group.finItem.itemCode,
        itemName: group.finItem.name,
        rawItemId: group.rawItem?.id,
        rawItemCode: group.rawItem?.itemCode,
        rawItemName: group.rawItem?.name,
        steps: sortedSteps,
        notes: group.notes,
        lastUpdated: new Date().toISOString().split('T')[0]
      });
    });

    return {
      entityType: 'PROCESS_MASTER',
      totalRows: dataRows.length,
      validRecords: Array.from(extractedProcsMap.values()),
      validCards,
      isRoutingSheet: true,
      skippedRecords,
      errors: []
    };
  }

  // Fallback: Standard Flat Process Definition List
  const validRecords: ProcessDefinition[] = [];
  const skippedRecords: { rowNumber: number; identifier: string; reason: string }[] = [];
  const errors: ParsedRowError[] = [];
  const batchCodes = new Set<string>();

  dataRows.forEach((row, idx) => {
    const rowNum = headerRowIndex + idx + 2;
    if (!row || row.every(c => !c.trim())) return; // Skip blank lines

    let name = getColValue(row, headerMap, 'processname', 'operationname', 'operation', 'process', 'name', 'title', 'procname', 'processdescription', 'description');
    let shortCode = getColValue(row, headerMap, 'processshortcode', 'shortcode', 'code', 'proccode', 'processcode', 'opcode', 'short_code').toUpperCase();

    // Auto-resolve name if short code provided from standard processes
    if (!name && shortCode) {
      name = shortCode;
    }

    if (!name) {
      errors.push({
        rowNumber: rowNum,
        identifier: `Row #${rowNum}`,
        message: 'ProcessName (Operation Name) is required.',
        rawLine: row.join(',')
      });
      return;
    }

    if (!shortCode) {
      const words = name.trim().split(/\s+/);
      shortCode = words.length > 1 ? words.map(w => w[0]).join('').toUpperCase().slice(0, 4) : name.slice(0, 4).toUpperCase();
    }

    if (batchCodes.has(shortCode)) {
      skippedRecords.push({
        rowNumber: rowNum,
        identifier: shortCode,
        reason: `Duplicate ShortCode "${shortCode}" in sheet. Skipped.`
      });
      return;
    }

    batchCodes.add(shortCode);

    const existingMatch = existingProcesses.find(p => p.shortCode.toUpperCase() === shortCode);
    const defaultRate = parseFloat(getColValue(row, headerMap, 'defaultrate', 'cost', 'rate', 'price', 'estimatedcostperunit')) || 0;
    const defaultUOM = getColValue(row, headerMap, 'defaultuom', 'uom', 'unit') || 'PCS';

    const proc: ProcessDefinition = {
      id: existingMatch?.id || `proc-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 5)}`,
      shortCode,
      name,
      description: getColValue(row, headerMap, 'description', 'desc', 'remarks', 'specs') || undefined,
      defaultRate,
      defaultUOM,
      createdAt: existingMatch?.createdAt || new Date().toISOString()
    };

    validRecords.push(proc);
  });

  return {
    entityType: 'PROCESS_MASTER',
    totalRows: dataRows.length,
    validRecords,
    validCards: [],
    isRoutingSheet: false,
    skippedRecords,
    errors
  };
}

// ============================================================
// TEMPLATE DOWNLOADERS (Auto-Generated fields marked optional)
// ============================================================
export const CSV_TEMPLATES: { [key in IngestionEntityType]: { filename: string; content: string; description: string } } = {
  ITEM_MASTER: {
    filename: 'gec_item_master_template.csv',
    description: 'Item Master Template (ItemCode optional/auto-generated, Name & Class required)',
    content: `ItemCode,PartCode,OldItemCode,ItemName,Category,MaterialProcessSources,PreferredVendors,Unit,PurchaseUOM,ConversionFactor,InHouseStock,ExternalStock,MinStockQty,MinOrderQty,UnitPrice,LeadTimeDays,Location,QCTrigger,TestReportRequired,WeightKg,Specification
,DWG-TB-80,OLD-TB-01,Tie Bar Raw Rod 80mm EN8D,RM,Bought out,VEN0000003,PCS,PCS,1,50,0,10,20,2450.00,7,Raw Store A-01,ON_GRN,TRUE,45.2,EN8D Hard Round Bar
,DWG-TB-250,OLD-TB-02,Tie Bar 80mm Finished Machined,MC,In-house;Job work,,PCS,PCS,1,12,8,4,10,4850.00,12,WIP Rack B-03,ON_GRN,TRUE,42.0,Finished Ground & Hard Chrome Plated
,BO-PARKER-01,,Directional Control Valve D03,BO,Bought out,VEN0000008;VEN0000010,PCS,PCS,1,25,0,5,10,6500.00,15,Boughtout Store C-02,NO_QC,FALSE,3.5,Parker 24V DC Solenoid
,EL-SIEMENS-1200,,Siemens S7-1200 CPU 1214C PLC,EL,Bought out,VEN0000009,PCS,PCS,1,8,0,2,5,32000.00,20,Electronics Room E-01,ON_GRN,TRUE,1.2,24VDC 14DI/10DO/2AI
,HY-YUKEN-01,,Variable Displacement Hydraulic Piston Pump 50kW,HY,Bought out,VEN0000008,PCS,PCS,1,4,0,1,2,78000.00,25,Hydraulics Store H-01,ON_GRN,TRUE,38.0,Yuken A37 Series 250 Bar
,SA-INJ-250,,Injection Unit Sub-Assembly 250T,SA,In-house,,SET,SET,1,2,0,1,2,145000.00,14,Assembly Bay 01,DURING_ASSEMBLY,TRUE,280.0,Complete 250T Injection Carriage
,SA-CLP-250,,Clamping Unit Sub-Assembly 250T,SA,In-house,,SET,SET,1,2,0,1,2,185000.00,16,Assembly Bay 02,DURING_ASSEMBLY,TRUE,450.0,5-Point Double Toggle Clamping Unit
,FG-250T-STD,,GEC-250T Servo Hydraulic Plastic Injection Moulding Machine,FG,In-house,,SET,SET,1,1,0,0,1,1250000.00,30,Final Dispatch Bay,ON_GRN,TRUE,8500.0,250 Ton Clamping Force Servo Hydraulic`
  },
  BOM_MASTER: {
    filename: 'gec_bom_master_template.csv',
    description: 'BOM Template (BOMCode optional/auto-generated, Sheet Name used for Model if omitted)',
    content: `BOMCode,MachineModel,Version,ItemCode,ItemName,SubAssemblyTag,QtyPerMachine,Unit,ScrapPercent,EstHoursPerUnit
,GEC-250T Servo Hydraulic Plastic Injection Moulding Machine,Rev 1.0,GEC-SA-CLP-250T,Clamping Unit Sub-Assembly 250T,Clamping Unit,1,SET,0,16
,GEC-250T Servo Hydraulic Plastic Injection Moulding Machine,Rev 1.0,GEC-SA-INJ-250T,Injection Unit Sub-Assembly 250T,Injection Unit,1,SET,0,14
,GEC-250T Servo Hydraulic Plastic Injection Moulding Machine,Rev 1.0,GEC-HY-PUMP-50KW,Variable Displacement Hydraulic Piston Pump 50kW,Hydraulic Powerpack,1,PCS,0,4
,GEC-250T Servo Hydraulic Plastic Injection Moulding Machine,Rev 1.0,GEC-EL-PLC-S7,Siemens S7-1200 CPU 1214C PLC,Electrical Cabinet,1,PCS,0,6
,GEC-250T Servo Hydraulic Plastic Injection Moulding Machine,Rev 1.0,GEC-BO-VALVE-01,Directional Control Valve D03,Hydraulic Powerpack,4,PCS,0,2`
  },
  INVENTORY: {
    filename: 'gec_inventory_stock_template.csv',
    description: 'Physical Inventory & Stock Adjustment Template',
    content: `ItemCode,InHouseStock,ExternalStock,Location,UnitPrice,MinStockQty
GEC-RM-ROD80-EN8,150,0,Raw Store A-01,2450.00,15
GEC-MC-TB80-250T,20,15,WIP Rack B-03,4850.00,5
GEC-BO-VALVE-01,45,0,Boughtout Store C-02,6500.00,10
GEC-EL-PLC-S7,12,0,Electronics Room E-01,32000.00,3
GEC-HY-PUMP-50KW,6,0,Hydraulics Store H-01,78000.00,2`
  },
  VENDORS: {
    filename: 'gec_vendor_master_template.csv',
    description: 'Vendor Master Template (VendorCode auto-generated VEN0000001 if omitted)',
    content: `VendorCode,VendorName,ContactPerson,Phone,Email,City,GSTIN,PAN
,Aji Castings & Alloys Pvt Ltd,Kishorebhai Patel,9825112233,orders@ajicastings.com,Rajkot,24AABCA1234F1Z5,AABCA1234F
,Apex Precision VMC Machinists,Ramesh Joshi,9825223344,apex.vmc@gmail.com,Rajkot,24AADPA5678K1Z2,AADPA5678K
,Shapar Heavy Foundry & Forging,Mukesh Dave,9825334455,shaparfoundry@yahoo.co.in,Rajkot,24AAECS9988M1Z7,AAECS9988M
,Gujarat Heat Treaters & Nitriding,Haresh Shah,9825445566,gujarat.heattreat@gmail.com,Ahmedabad,24AABFG4433D1Z9,AABFG4433D
,Maruti Precision Gear Works,Dharmesh Panchal,9825556677,marutigears@rediffmail.com,Rajkot,24AAGFM2211L1Z4,AAGFM2211L
,Sardar Cylindrical & Surface Grinding,Pravinbhai Vora,9825667788,sardar.grinding@gmail.com,Rajkot,24AAHPS3344B1Z1,AAHPS3344B
,Hard Chrome Plating Corporation,Jignesh Mehta,9825778899,info@hardchromeplating.in,Vadodara,24AAIPC8877C1Z3,AAIPC8877C`
  },
  CUSTOMERS: {
    filename: 'gec_customer_master_template.csv',
    description: 'Customer Master Template (CustomerCode optional/auto-generated)',
    content: `CustomerCode,CustomerName,ContactPerson,Phone,Email,Address,City,State,GSTIN,PAN,BankName,AccountNumber,IFSCCode
,Supreme Polymers Private Limited,Ketan Dave,9879000001,purchase@supremepolymers.com,Survey 45 Shapar Industrial Zone,Rajkot,Gujarat,24AAACS7777E1Z5,AAACS7777E,Kotak Mahindra Bank,1234567890,KKBK0000123
,PlastoPack Moulding Solutions,Sunil Nair,9879000002,info@plastopack.com,Plot 88 GIDC Sanand,Ahmedabad,Gujarat,24AAACP8888F1Z6,AAACP8888F,Bank of Baroda,01230200001234,BARB0SANAND
,Delta Automotive Components,Harish Rao,9879000003,commercial@deltaauto.com,Bhosari Industrial Estate,Pune,Maharashtra,27AAACD9999G1Z7,AAACD9999G,HDFC Bank,50200098765432,HDFC0000456`
  },
  PROCESS_MASTER: {
    filename: 'gec_process_master_template.csv',
    description: 'Process Master & Routing Template (Finished Item -> Raw Casting -> Sequential Operations)',
    content: `FinishedPartCode,FinishedOldCode,FinishedItemName,RawCastingPartCode,RawCastingOldCode,RawCastingName,StepNo,ProcessName,ProcessShortCode,EstimatedDays,Vendors,Remarks
4110000100,A-10145,STATIONARY PLATE TOGGLE - 90 TON,4001000100,11201,STATIONARY PLATE TOGGLE - 90 TON (CASTING),1,VMC Heavy Face Milling & Edge Truing,MCH,2,VEN0000002,Rough & finish top/bottom platen face to 0.02mm flat
4110000100,A-10145,STATIONARY PLATE TOGGLE - 90 TON,4001000100,11201,STATIONARY PLATE TOGGLE - 90 TON (CASTING),2,Precision CNC Boring (Tie Bar Bores),BOR,3,VEN0000002,Bore 4x Tie bar holes to H7 tolerance
4110000100,A-10145,STATIONARY PLATE TOGGLE - 90 TON,4001000100,11201,STATIONARY PLATE TOGGLE - 90 TON (CASTING),3,CNC Drilling & Tapping (Mold Mounting PCD),DRL,1,VEN0000002,M16 mold clamp tapped holes as per drawing
4110000100,A-10145,STATIONARY PLATE TOGGLE - 90 TON,4001000100,11201,STATIONARY PLATE TOGGLE - 90 TON (CASTING),4,Stress Relieving & Heat Treatment,HT,2,VEN0000004,Normalize stress at 550°C
4110000100,A-10145,STATIONARY PLATE TOGGLE - 90 TON,4001000100,11201,STATIONARY PLATE TOGGLE - 90 TON (CASTING),5,Surface Grinding & Anti-Rust Coating,GRD,1,VEN0000006,Precision surface grind & rust preventive oil`
  }
};

export function downloadCSVTemplate(type: IngestionEntityType) {
  const tmpl = CSV_TEMPLATES[type];
  if (!tmpl) return;
  const blob = new Blob([tmpl.content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = tmpl.filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
