import { apiClient } from './apiService';

/**
 * Detect current client platform (Android / Tauri Desktop / Web Browser)
 */
export function getClientPlatform(): 'ANDROID' | 'TAURI' | 'WEB' {
  if (typeof window !== 'undefined' && (window as any).__TAURI__) {
    return 'TAURI';
  }
  if (typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent)) {
    return 'ANDROID';
  }
  return 'WEB';
}

/**
 * Get effective local directory path based on platform
 */
export function getEffectiveDirectoryPath(): string {
  const platform = getClientPlatform();

  if (platform === 'ANDROID') {
    return '/storage/emulated/0/Download/ERP_Sheets';
  }

  const saved = localStorage.getItem('erp_local_sheets_directory');
  if (saved && saved.trim()) {
    return saved.trim();
  }

  // Default directory fallbacks
  return platform === 'TAURI' ? 'C:\\ERP_Sheets' : 'C:\\Users\\Public\\ERP_Sheets';
}

/**
 * Browser fallback: Trigger direct browser download of CSV data
 */
export function downloadCsvInBrowser(fileName: string, data: any[]) {
  if (!data || data.length === 0) return;

  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.join(','),
    ...data.map(row =>
      headers
        .map(h => {
          const val = row[h] ?? '';
          const escaped = String(val).replace(/"/g, '""');
          return `"${escaped}"`;
        })
        .join(',')
    )
  ];

  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Trigger sync of a specific sheet template.
 */
export async function syncLocalSheet(fileName: string, data: any[]) {
  try {
    const directoryPath = getEffectiveDirectoryPath();

    await apiClient.post('/api/sheets/sync', {
      directoryPath,
      fileName,
      data
    });
  } catch (error) {
    console.warn(`[Local Sheets Sync] Backend write skipped for ${fileName}:`, error);
  }
}

/**
 * Trigger open command on the target sheet template.
 */
export async function openLocalSheet(fileName: string, fallbackData: any[]) {
  const platform = getClientPlatform();
  const directoryPath = getEffectiveDirectoryPath();

  try {
    // Sync latest data first
    if (fallbackData && fallbackData.length > 0) {
      await syncLocalSheet(fileName, fallbackData);
    }

    // Try backend silent open execution
    const res = await apiClient.post<any>('/api/sheets/open', {
      directoryPath,
      fileName
    });

    if (res && res.message) {
      return;
    }
  } catch (error: any) {
    console.warn('[Local Sheets Open] Backend silent open failed, triggering browser download:', error);
  }

  // Web Browser fallback if backend silent execution is unreachable/unsupported
  if (fallbackData && fallbackData.length > 0) {
    downloadCsvInBrowser(fileName, fallbackData);
  } else {
    alert(`File saved to ${directoryPath}\\${fileName}`);
  }
}
