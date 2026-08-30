import React, { useState } from 'react';
import { Modal } from './Modal';
import { Upload, FileSpreadsheet, AlertTriangle, CheckCircle, HelpCircle, Download } from 'lucide-react';
import { BulkUploadResult } from '../../types/erp';

interface BulkUploadModalProps<T> {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  templateCSV: string;
  templateFileName: string;
  onParse: (text: string) => BulkUploadResult<T>;
  onConfirmImport: (validRows: T[]) => void;
}

export function BulkUploadModal<T>({
  isOpen,
  onClose,
  title,
  templateCSV,
  templateFileName,
  onParse,
  onConfirmImport
}: BulkUploadModalProps<T>) {
  const [csvContent, setCsvContent] = useState<string>('');
  const [result, setResult] = useState<BulkUploadResult<T> | null>(null);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      if (text) {
        setCsvContent(text);
        const res = onParse(text);
        setResult(res);
      }
    };
    reader.readAsText(file);
  };

  const handleTextChange = (text: string) => {
    setCsvContent(text);
    if (text.trim().length > 0) {
      const res = onParse(text);
      setResult(res);
    } else {
      setResult(null);
    }
  };

  const handleDownloadTemplate = () => {
    const blob = new Blob([templateCSV], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', templateFileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleApply = () => {
    if (result && result.successRows.length > 0) {
      onConfirmImport(result.successRows);
      onClose();
      setCsvContent('');
      setResult(null);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        
        {/* Template Download & File Picker Row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-tertiary)', padding: '0.875rem 1.25rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)' }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Need standard template sheet?</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Download sample CSV formatted with all required columns</div>
          </div>
          <button className="btn btn-outline" style={{ fontSize: '0.8rem' }} onClick={handleDownloadTemplate}>
            <Download size={15} /> Sample CSV Template
          </button>
        </div>

        {/* Drag Drop or Paste Area */}
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>
            Upload CSV File or Paste Raw Sheet Data
          </label>
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <input 
              type="file" 
              accept=".csv,.txt,.tsv"
              onChange={handleFileUpload} 
              style={{ fontSize: '0.85rem' }} 
            />
          </div>
          <textarea
            rows={5}
            className="input-field"
            style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}
            placeholder="Or paste CSV content directly here...&#10;Code, Name, Category, DrawingNo, Unit, Stock, Reorder, Price&#10;GEC-MAT-099, Platen Bolt 40mm, Machined Component, DWG-PLT-40, PCS, 10, 4, 1200"
            value={csvContent}
            onChange={(e) => handleTextChange(e.target.value)}
          />
        </div>

        {/* Parsed Results Summary & Error Logs */}
        {result && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            
            {/* Stat Counters */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
              <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.12)', border: '1px solid var(--success)', borderRadius: '0.5rem', padding: '0.625rem', textAlign: 'center' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--success)', fontWeight: 600 }}>Ready to Import</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--success)' }}>{result.successRows.length} Rows</div>
              </div>
              <div style={{ backgroundColor: 'rgba(245, 158, 11, 0.12)', border: '1px solid var(--warning)', borderRadius: '0.5rem', padding: '0.625rem', textAlign: 'center' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--warning)', fontWeight: 600 }}>Skipped (Duplicates)</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--warning)' }}>{result.skippedRows.length} Rows</div>
              </div>
              <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.12)', border: '1px solid var(--danger)', borderRadius: '0.5rem', padding: '0.625rem', textAlign: 'center' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--danger)', fontWeight: 600 }}>Rejected (Errors)</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--danger)' }}>{result.rejectedRows.length} Rows</div>
              </div>
            </div>

            {/* Skipped Rows Log */}
            {result.skippedRows.length > 0 && (
              <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: '0.5rem', border: '1px solid var(--warning)' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--warning)', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <AlertTriangle size={14} /> Skipped Existing Records:
                </div>
                <div style={{ maxHeight: '90px', overflowY: 'auto', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  {result.skippedRows.map((s, i) => (
                    <div key={i}>Row {s.rowNumber}: <strong>{s.identifier}</strong> - {s.reason}</div>
                  ))}
                </div>
              </div>
            )}

            {/* Rejected Rows Log */}
            {result.rejectedRows.length > 0 && (
              <div style={{ padding: '0.75rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: '0.5rem', border: '1px solid var(--danger)' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--danger)', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <AlertTriangle size={14} /> Rejected Rows (Missing required fields):
                </div>
                <div style={{ maxHeight: '100px', overflowY: 'auto', fontSize: '0.75rem', color: 'var(--danger)' }}>
                  {result.rejectedRows.map((r, i) => (
                    <div key={i} style={{ marginBottom: '0.25rem' }}>
                      Row {r.rowNumber}: <code style={{ backgroundColor: 'rgba(0,0,0,0.2)', padding: '0.1rem 0.3rem' }}>{r.rawData}</code> - {r.reasons.join(', ')}
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button 
            type="button" 
            className="btn btn-primary" 
            disabled={!result || result.successRows.length === 0}
            onClick={handleApply}
          >
            Import {result?.successRows.length || 0} Valid Records
          </button>
        </div>

      </div>
    </Modal>
  );
}
