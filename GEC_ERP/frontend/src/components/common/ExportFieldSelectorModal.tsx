import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { FileSpreadsheet, CheckSquare, Square } from 'lucide-react';
import { openLiveModuleSheet } from '../../utils/sheetFolderManager';

export interface FieldOption<T> {
  key: keyof T;
  label: string;
  defaultSelected?: boolean;
}

interface ExportFieldSelectorModalProps<T extends Record<string, any>> {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subfolder: string;
  fileName: string;
  data: T[];
  availableFields: FieldOption<T>[];
}

export function ExportFieldSelectorModal<T extends Record<string, any>>({
  isOpen,
  onClose,
  title,
  subfolder,
  fileName,
  data,
  availableFields
}: ExportFieldSelectorModalProps<T>) {
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      const defaults = availableFields
        .filter(f => f.defaultSelected !== false)
        .map(f => String(f.key));
      setSelectedKeys(defaults);
    }
  }, [isOpen, availableFields]);

  if (!isOpen) return null;

  const handleToggleKey = (keyStr: string) => {
    setSelectedKeys(prev =>
      prev.includes(keyStr) ? prev.filter(k => k !== keyStr) : [...prev, keyStr]
    );
  };

  const handleSelectAll = () => {
    setSelectedKeys(availableFields.map(f => String(f.key)));
  };

  const handleDeselectAll = () => {
    setSelectedKeys([]);
  };

  const handleGenerateSheet = () => {
    const selectedHeaders = availableFields.filter(f => selectedKeys.includes(String(f.key)));
    if (selectedHeaders.length === 0) {
      alert('Please select at least one field to export in the sheet!');
      return;
    }
    openLiveModuleSheet(subfolder, fileName, data, selectedHeaders);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-tertiary)', padding: '0.75rem 1rem', borderRadius: '0.5rem' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>Select Columns to Include in Live Sheet ({data.length} records)</div>
            <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>By default, columns visible in the table are pre-selected.</div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-outline" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }} onClick={handleSelectAll}>
              <CheckSquare size={13} /> Select All
            </button>
            <button className="btn btn-outline" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }} onClick={handleDeselectAll}>
              <Square size={13} /> Clear
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.625rem', maxHeight: '280px', overflowY: 'auto', padding: '0.5rem' }}>
          {availableFields.map(field => {
            const isChecked = selectedKeys.includes(String(field.key));
            return (
              <label
                key={String(field.key)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.45rem 0.65rem',
                  borderRadius: '0.375rem',
                  backgroundColor: isChecked ? 'var(--accent-light)' : 'var(--bg-tertiary)',
                  border: `1px solid ${isChecked ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  fontWeight: isChecked ? 600 : 400
                }}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => handleToggleKey(String(field.key))}
                />
                <span>{field.label}</span>
              </label>
            );
          })}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button type="button" className="btn btn-primary" onClick={handleGenerateSheet}>
            <FileSpreadsheet size={16} /> Export Sheet ({selectedKeys.length} Fields)
          </button>
        </div>
      </div>
    </Modal>
  );
}
