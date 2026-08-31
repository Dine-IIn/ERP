// Dedicated ERP Central Storage & High-Fidelity Live Sheet Manager

export function openLiveModuleSheet<T extends Record<string, any>>(
  subfolder: string,
  fileName: string,
  data: T[],
  headers: { key: keyof T; label: string }[]
) {
  if (!data || data.length === 0) {
    alert('No data available to sync into Live Sheet!');
    return;
  }

  // Format header row with live sync timestamp header line
  const timestampHeader = `"SYNC_TIMESTAMP","${new Date().toLocaleString()}"`;
  const headerString = headers.map(h => `"${String(h.label).replace(/"/g, '""')}"`).join(',');

  // Format data rows with clean column separation and proper escaping
  const rowStrings = data.map(row => {
    return headers
      .map(h => {
        const val = row[h.key];
        if (val === null || val === undefined) return '""';
        if (typeof val === 'number') return `${val}`;
        if (typeof val === 'boolean') return `"${val ? 'YES' : 'NO'}"`;
        if (typeof val === 'object') return `"${JSON.stringify(val).replace(/"/g, '""')}"`;
        
        // Escape quotes and ensure clean multi-column separation
        const strVal = String(val).replace(/"/g, '""');
        return `"${strVal}"`;
      })
      .join(',');
  });

  const folderPath = `ERP/${subfolder}`;
  const fullFilePath = `${folderPath}/${fileName}.csv`;
  // Add BOM (Byte Order Mark) \uFEFF so Excel & Spreadsheet tools open UTF-8 columns with proper widths & encoding
  const csvContent = '\uFEFF' + [timestampHeader, headerString, ...rowStrings].join('\r\n');

  // Trigger live sheet blob open/download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${fileName}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  console.log(`[ERP Folder Manager] Live sheet synced: ${fullFilePath} (${data.length} rows)`);
}
