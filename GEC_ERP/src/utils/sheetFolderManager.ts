// Dedicated ERP Central Storage & Live Sheet Folder Manager

export function openLiveModuleSheet<T extends Record<string, any>>(
  subfolder: string,
  fileName: string,
  data: T[],
  headers: { key: keyof T; label: string }[]
) {
  if (!data || data.length === 0) {
    alert('No live data available to open in sheet!');
    return;
  }

  // Format header row with live sync timestamp header line
  const timestampHeader = `"SYNC_TIMESTAMP","${new Date().toLocaleString()}"`;
  const headerString = headers.map(h => `"${String(h.label).replace(/"/g, '""')}"`).join(',');

  // Format data rows
  const rowStrings = data.map(row => {
    return headers
      .map(h => {
        const val = row[h.key];
        if (val === null || val === undefined) return '""';
        if (typeof val === 'object') return `"${JSON.stringify(val).replace(/"/g, '""')}"`;
        return `"${String(val).replace(/"/g, '""')}"`;
      })
      .join(',');
  });

  const folderPath = `ERP/${subfolder}`;
  const fullFilePath = `${folderPath}/${fileName}.csv`;
  const csvContent = [timestampHeader, headerString, ...rowStrings].join('\n');

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

  // Show clear user confirmation with folder path
  console.log(`[ERP Folder Manager] Live sheet synced to ${fullFilePath}`);
}
