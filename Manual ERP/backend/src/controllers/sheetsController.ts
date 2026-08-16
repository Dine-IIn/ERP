import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';

interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    username: string;
    role: string;
    companyId: string;
  };
}

/**
 * Helper to ensure directory exists.
 */
function ensureDirectoryExists(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Convert JSON array to CSV string.
 */
function convertToCSV(data: any[]): string {
  if (data.length === 0) return '';

  // If this is raw lines passed from frontend
  if (data[0].Line !== undefined && Object.keys(data[0]).length === 1) {
    return data.map(row => row.Line).join('\n');
  }

  const headers = Object.keys(data[0]);
  const csvRows = [headers.join(',')];

  for (const row of data) {
    const values = headers.map(header => {
      const val = row[header];
      // Standard CSV escaping (quotes escaped as double-quotes)
      const escaped = ('' + (val ?? '')).replace(/"/g, '""');
      return `"${escaped}"`;
    });
    csvRows.push(values.join(','));
  }
  return csvRows.join('\n');
}

/**
 * Synchronize a local sheet.
 */
export async function syncLocalSheet(req: AuthenticatedRequest, res: Response) {
  try {
    const { directoryPath, fileName, data } = req.body;

    if (!directoryPath || !fileName || !Array.isArray(data)) {
      return res.status(400).json({ error: 'Missing required parameters: directoryPath, fileName, or data' });
    }

    // Ensure directory exists
    ensureDirectoryExists(directoryPath);

    const filePath = path.join(directoryPath, fileName);
    const csvContent = convertToCSV(data);

    fs.writeFileSync(filePath, csvContent, 'utf8');

    return res.json({ message: `Successfully synchronized ${fileName}`, filePath });
  } catch (error: any) {
    console.error('[Sheets Controller Error] Sync failed:', error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * Open a local sheet silently in the OS-default sheet editor (Excel, LibreOffice, Sheets, etc.).
 */
export async function openLocalSheet(req: AuthenticatedRequest, res: Response) {
  try {
    const { directoryPath, fileName } = req.body;

    if (!directoryPath || !fileName) {
      return res.status(400).json({ error: 'Missing required parameters: directoryPath or fileName' });
    }

    const filePath = path.join(directoryPath, fileName);

    if (!fs.existsSync(filePath)) {
      // Create empty/template file if it doesn't exist
      ensureDirectoryExists(directoryPath);
      fs.writeFileSync(filePath, 'Header1,Header2\nData1,Data2', 'utf8');
    }

    // Launch using system command (Windows specific shell execution)
    // start "" "file_path" opens it via the default shell program association, windowsHide: true hides the black cmd window
    const command = `start "" "${filePath}"`;
    exec(command, { windowsHide: true }, (error) => {
      if (error) {
        console.error(`[Sheets Controller Error] Failed to open file: ${error}`);
      }
    });

    return res.json({ message: `Triggered opening of ${fileName}`, filePath });
  } catch (error: any) {
    console.error('[Sheets Controller Error] Open failed:', error);
    return res.status(500).json({ error: error.message });
  }
}
