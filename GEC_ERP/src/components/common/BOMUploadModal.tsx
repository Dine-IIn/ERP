import React, { useState, useRef } from 'react';
import { Modal } from './Modal';
import { Upload, FolderOpen, FileText, Download, CheckCircle2, AlertTriangle, Layers } from 'lucide-react';
import { BOM, BOMComponent } from '../../types/erp';

interface BOMUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmImport: (bomsList: Omit<BOM, 'id' | 'lastUpdated'>[]) => void;
}

export const BOMUploadModal: React.FC<BOMUploadModalProps> = ({
  isOpen,
  onClose,
  onConfirmImport
}) => {
  const [uploadMode, setUploadMode] = useState<'INDIVIDUAL' | 'BULK_FOLDER'>('INDIVIDUAL');
  const [parsedBOMs, setParsedBOMs] = useState<Omit<BOM, 'id' | 'lastUpdated'>[]>([]);
  const [logMessages, setLogMessages] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const singleFileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const templateCSV = `BOMCode,MachineModel,Version,ItemCode,ItemName,SubAssembly,QtyPerMachine,Unit,EstHoursPerUnit\nBOM-GEC-250T,GEC-250T Servo Hydraulic Moulding Machine,Rev 1.0,GEC-TIE-80,Tie Bar 80mm Dia,Injection Unit,4,PCS,4\nBOM-GEC-250T,GEC-250T Servo Hydraulic Moulding Machine,Rev 1.0,GEC-HYD-50,Hydraulic Pump 50kW,Hydraulic Powerpack,1,NOS,8`;

  const parseBOMCSVContent = (text: string, filename: string): Omit<BOM, 'id' | 'lastUpdated'> | null => {
    const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length <= 1) return null;

    let bomCode = '';
    let machineModel = '';
    let version = 'Rev 1.0';
    const components: BOMComponent[] = [];

    // Skip header line
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(',').map(p => p.trim().replace(/^"|"$/g, ''));
      if (parts.length < 5) continue;

      const code = parts[0] || `BOM-${filename.replace('.csv', '')}`;
      const model = parts[1] || filename.replace('.csv', '');
      const ver = parts[2] || 'Rev 1.0';
      const itemCode = parts[3];
      const itemName = parts[4];
      const subTag = (parts[5] || 'Injection Unit') as BOMComponent['subAssemblyTag'];
      const qty = parseFloat(parts[6]) || 1;
      const unit = parts[7] || 'PCS';
      const estHrs = parseFloat(parts[8]) || 4;

      if (!itemCode || !itemName) continue;

      bomCode = code;
      machineModel = model;
      version = ver;

      components.push({
        itemId: `itm-${itemCode.toLowerCase()}`,
        itemCode,
        itemName,
        qtyPerMachine: qty,
        unit,
        subAssemblyTag: subTag,
        scrapPercent: 0,
        estimatedHours: estHrs
      });
    }

    if (components.length === 0) return null;

    const totalHours = components.reduce((sum, c) => sum + (c.qtyPerMachine * (c.estimatedHours || 4)), 0);

    return {
      bomCode: bomCode || `BOM-GEC-${Date.now()}`,
      machineModel: machineModel || 'Standard Moulding Machine',
      version: version || 'Rev 1.0',
      description: `Uploaded from ${filename}`,
      components,
      estimatedProductionHours: totalHours
    };
  };

  const handleSingleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsProcessing(true);
    const file = files[0];
    const text = await file.text();
    const parsed = parseBOMCSVContent(text, file.name);

    if (parsed) {
      setParsedBOMs([parsed]);
      setLogMessages([`Successfully parsed 1 BOM: ${parsed.machineModel} (${parsed.components.length} components)`]);
    } else {
      setParsedBOMs([]);
      setLogMessages([`Error: Could not parse valid BOM data from ${file.name}`]);
    }
    setIsProcessing(false);
  };

  const handleFolderChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsProcessing(true);
    const logs: string[] = [];
    const bomsList: Omit<BOM, 'id' | 'lastUpdated'>[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.name.endsWith('.csv')) continue;

      try {
        const text = await file.text();
        const parsed = parseBOMCSVContent(text, file.name);
        if (parsed) {
          bomsList.push(parsed);
          logs.push(`Parsed ${file.name}: ${parsed.machineModel} (${parsed.components.length} items)`);
        }
      } catch (err) {
        logs.push(`Failed to read ${file.name}`);
      }
    }

    setParsedBOMs(bomsList);
    setLogMessages([`Found ${bomsList.length} valid BOM sheets in folder`, ...logs]);
    setIsProcessing(false);
  };

  const handleConfirm = () => {
    if (parsedBOMs.length > 0) {
      onConfirmImport(parsedBOMs);
      onClose();
    }
  };

  const downloadTemplate = () => {
    const blob = new Blob([templateCSV], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'gec_bom_template.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Import Machine BOM Sheets (Individual or Bulk Folder)">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* Upload Mode Selector */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <button
            className={`btn ${uploadMode === 'INDIVIDUAL' ? 'btn-primary' : 'btn-outline'}`}
            style={{ padding: '0.75rem', justifyContent: 'center' }}
            onClick={() => { setUploadMode('INDIVIDUAL'); setParsedBOMs([]); setLogMessages([]); }}
          >
            <FileText size={18} /> Individual BOM Upload (1 File)
          </button>

          <button
            className={`btn ${uploadMode === 'BULK_FOLDER' ? 'btn-primary' : 'btn-outline'}`}
            style={{ padding: '0.75rem', justifyContent: 'center' }}
            onClick={() => { setUploadMode('BULK_FOLDER'); setParsedBOMs([]); setLogMessages([]); }}
          >
            <FolderOpen size={18} /> Bulk Folder Upload (Multiple Files)
          </button>
        </div>

        {/* Template Download Banner */}
        <div style={{ padding: '0.75rem 1rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            Need a standard BOM CSV structure before uploading?
          </div>
          <button className="btn btn-outline" style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }} onClick={downloadTemplate}>
            <Download size={14} /> Download Sample CSV
          </button>
        </div>

        {/* Mode A: Individual File Input */}
        {uploadMode === 'INDIVIDUAL' && (
          <div style={{ padding: '1.5rem', border: '2px dashed var(--border-color)', borderRadius: '0.5rem', textAlign: 'center', backgroundColor: 'var(--bg-tertiary)' }}>
            <FileText size={32} style={{ color: 'var(--accent-primary)', marginBottom: '0.5rem' }} />
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.25rem' }}>Select Individual BOM CSV File</h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>Choose 1 CSV sheet for a specific machine model BOM</p>
            <input
              ref={singleFileInputRef}
              type="file"
              accept=".csv"
              style={{ display: 'none' }}
              onChange={handleSingleFileChange}
            />
            <button className="btn btn-primary" onClick={() => singleFileInputRef.current?.click()}>
              Choose CSV File
            </button>
          </div>
        )}

        {/* Mode B: Bulk Folder Input */}
        {uploadMode === 'BULK_FOLDER' && (
          <div style={{ padding: '1.5rem', border: '2px dashed var(--accent-primary)', borderRadius: '0.5rem', textAlign: 'center', backgroundColor: 'var(--bg-tertiary)' }}>
            <FolderOpen size={32} style={{ color: 'var(--warning)', marginBottom: '0.5rem' }} />
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.25rem' }}>Select Storage Folder Containing BOM Sheets</h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>Choose a folder directory. All `.csv` files inside will be parsed into machine BOMs automatically!</p>
            <input
              ref={folderInputRef}
              type="file"
              /* @ts-ignore */
              webkitdirectory=""
              directory=""
              multiple
              style={{ display: 'none' }}
              onChange={handleFolderChange}
            />
            <button className="btn btn-primary" onClick={() => folderInputRef.current?.click()}>
              Select BOM Folder
            </button>
          </div>
        )}

        {/* Parsing Logs & Preview */}
        {logMessages.length > 0 && (
          <div style={{ padding: '0.875rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: '0.5rem', maxHeight: '180px', overflowY: 'auto' }}>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.4rem', color: 'var(--text-secondary)' }}>Parsing Status:</h4>
            {logMessages.map((msg, i) => (
              <div key={i} style={{ fontSize: '0.78rem', fontFamily: 'monospace', color: msg.startsWith('Error') ? 'var(--danger)' : 'var(--success)' }}>
                {msg}
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-primary"
            disabled={parsedBOMs.length === 0 || isProcessing}
            onClick={handleConfirm}
          >
            Confirm & Import ({parsedBOMs.length} BOMs)
          </button>
        </div>
      </div>
    </Modal>
  );
};
