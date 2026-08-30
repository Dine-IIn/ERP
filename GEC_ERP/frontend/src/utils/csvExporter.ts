// Utility for generating and downloading live CSV data sheets

export function exportToCSV<T extends Record<string, any>>(
  filename: string,
  data: T[],
  headers: { key: keyof T; label: string }[]
) {
  if (!data || data.length === 0) {
    alert('No data available to export!');
    return;
  }

  // Create header row
  const headerString = headers.map(h => `"${String(h.label).replace(/"/g, '""')}"`).join(',');

  // Create row strings
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

  const csvContent = [headerString, ...rowStrings].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
