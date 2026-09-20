import React, { useState, useMemo, useRef } from 'react';
import { useERP } from '../../context/ERPContext';
import { 
  FileText, Upload, Download, Printer, Eye, CheckCircle2, 
  AlertTriangle, ShieldCheck, Search, Plus, Trash2, Layers, 
  Clock, User, RefreshCw, FileArchive, X, CheckSquare, Square
} from 'lucide-react';
import { ItemDrawingRecord, DrawingVersion, AdditionalFileVersion, Item } from '../../types/erp';

export const DrawingsModule: React.FC = () => {
  const { items, drawings, saveDrawing, acknowledgeDrawingVersion, isDrawingAcknowledged, currentUser } = useERP();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItemId, setSelectedItemId] = useState<string>(() => items[0]?.id || '');
  const [previewVersion, setPreviewVersion] = useState<{ type: 'DWG' | 'CAD'; item: Item; version: any } | null>(null);

  // Upload Modals State
  const [isUploadDwgModalOpen, setIsUploadDwgModalOpen] = useState(false);
  const [isUploadCadModalOpen, setIsUploadCadModalOpen] = useState(false);
  const [changeNotes, setChangeNotes] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [customVersionLabel, setCustomVersionLabel] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ text: string; type: 'success' | 'danger' } | null>(null);

  // Filtered items list
  const filteredItems = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return items;
    return items.filter(it => 
      it.itemCode.toLowerCase().includes(term) ||
      it.name.toLowerCase().includes(term) ||
      (it.partCode && it.partCode.toLowerCase().includes(term)) ||
      (it.category && it.category.toLowerCase().includes(term))
    );
  }, [items, searchTerm]);

  // Selected Item and its Drawing Record
  const selectedItem = useMemo(() => {
    return items.find(i => i.id === selectedItemId) || items[0] || null;
  }, [items, selectedItemId]);

  const selectedDrawingRecord = useMemo<ItemDrawingRecord | null>(() => {
    if (!selectedItem) return null;
    return drawings.find(d => d.itemId === selectedItem.id || d.itemCode === selectedItem.itemCode) || {
      id: `dwg-rec-${selectedItem.id}`,
      itemId: selectedItem.id,
      itemCode: selectedItem.itemCode,
      itemName: selectedItem.name,
      partCode: selectedItem.partCode,
      category: selectedItem.category || 'Component',
      drawingVersions: [],
      additionalFileVersions: [],
      readReceipts: [],
      lastUpdated: new Date().toISOString()
    };
  }, [drawings, selectedItem]);

  // Handle file reading to base64
  const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
      reader.readAsDataURL(file);
    });
  };

  // Upload Drawing Version (PDF/2D)
  const handleSaveDrawingVersion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem || !selectedDrawingRecord) return;
    if (!selectedFile) {
      alert('Please select a drawing file (.pdf, .png, .jpg)');
      return;
    }

    try {
      setIsSaving(true);
      const fileData = await readFileAsBase64(selectedFile);
      const currentVersions = selectedDrawingRecord.drawingVersions || [];
      const nextNum = currentVersions.length + 1;
      const verLabel = customVersionLabel.trim() || `DWG-${nextNum}`;

      // Mark previous versions as not latest
      const updatedPrevVersions = currentVersions.map(v => ({ ...v, isLatest: false }));

      const newVersion: DrawingVersion = {
        versionId: `ver-${Date.now()}`,
        versionNumber: verLabel,
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
        uploadedBy: currentUser?.fullName || currentUser?.username || 'Engineering Team',
        uploadedAt: new Date().toISOString(),
        fileData,
        changeNotes: changeNotes.trim() || 'Engineering release',
        isLatest: true
      };

      const updatedRecord: ItemDrawingRecord = {
        ...selectedDrawingRecord,
        itemId: selectedItem.id,
        itemCode: selectedItem.itemCode,
        itemName: selectedItem.name,
        partCode: selectedItem.partCode,
        drawingVersions: [...updatedPrevVersions, newVersion],
        lastUpdated: new Date().toISOString()
      };

      const res = await saveDrawing(updatedRecord);
      if (res.success) {
        setFeedbackMessage({ text: `✓ Drawing revision ${verLabel} uploaded successfully for ${selectedItem.itemCode}!`, type: 'success' });
        setIsUploadDwgModalOpen(false);
        setSelectedFile(null);
        setChangeNotes('');
        setCustomVersionLabel('');
      } else {
        setFeedbackMessage({ text: `Failed to save drawing: ${res.error}`, type: 'danger' });
      }
    } catch (err: any) {
      alert('Error uploading file: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Upload CAD / Additional File Version (.dwg/.dxf/.step)
  const handleSaveCadVersion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem || !selectedDrawingRecord) return;
    if (!selectedFile) {
      alert('Please select a CAD file (.dwg, .dxf, .step, .zip)');
      return;
    }

    try {
      setIsSaving(true);
      const fileData = await readFileAsBase64(selectedFile);
      const currentCadVersions = selectedDrawingRecord.additionalFileVersions || [];
      const nextNum = currentCadVersions.length + 1;
      const verLabel = customVersionLabel.trim() || `CAD-${nextNum}`;

      const updatedPrev = currentCadVersions.map(v => ({ ...v, isLatest: false }));

      const newCadVersion: AdditionalFileVersion = {
        versionId: `cad-${Date.now()}`,
        versionNumber: verLabel,
        fileName: selectedFile.name,
        fileType: selectedFile.name.split('.').pop() || 'dwg',
        fileSize: selectedFile.size,
        uploadedBy: currentUser?.fullName || currentUser?.username || 'CAD Design Team',
        uploadedAt: new Date().toISOString(),
        fileData,
        changeNotes: changeNotes.trim() || 'CAD Model update',
        isLatest: true
      };

      const updatedRecord: ItemDrawingRecord = {
        ...selectedDrawingRecord,
        itemId: selectedItem.id,
        itemCode: selectedItem.itemCode,
        itemName: selectedItem.name,
        partCode: selectedItem.partCode,
        additionalFileVersions: [...updatedPrev, newCadVersion],
        lastUpdated: new Date().toISOString()
      };

      const res = await saveDrawing(updatedRecord);
      if (res.success) {
        setFeedbackMessage({ text: `✓ CAD revision ${verLabel} uploaded successfully for ${selectedItem.itemCode}!`, type: 'success' });
        setIsUploadCadModalOpen(false);
        setSelectedFile(null);
        setChangeNotes('');
        setCustomVersionLabel('');
      } else {
        setFeedbackMessage({ text: `Failed to save CAD file: ${res.error}`, type: 'danger' });
      }
    } catch (err: any) {
      alert('Error uploading CAD file: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Mark as Read / Acknowledgment
  const handleAcknowledge = async (versionId: string) => {
    if (!selectedItem) return;
    const res = await acknowledgeDrawingVersion(selectedItem.id, versionId);
    if (res.success) {
      setFeedbackMessage({ text: '✓ Drawing revision acknowledged successfully.', type: 'success' });
    }
  };

  // Download File Helper
  const handleDownload = (fileName: string, fileData?: string) => {
    if (!fileData) {
      alert('File content not available for download in demo preview.');
      return;
    }
    const link = document.createElement('a');
    link.href = fileData;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print Drawing Helper
  const handlePrint = (fileData?: string) => {
    if (!fileData) {
      alert('No drawing data available to print.');
      return;
    }
    const printWindow = window.open(fileData, '_blank');
    if (printWindow) {
      printWindow.focus();
      printWindow.print();
    }
  };

  return (
    <div className="module-layout-container" style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '1rem' }}>
      
      {/* Module Header */}
      <div className="card" style={{ padding: '1rem 1.25rem', borderLeft: '4px solid #8b5cf6', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: '#8b5cf6', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileText size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                Engineering Drawings & CAD Revision Library
              </h2>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                Independent 2D PDF Drawing & 3D CAD (.DWG/.DXF/.STEP) Version Streams • Read Receipts & Purchase/Jobwork Gates
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button 
              className="btn btn-outline" 
              onClick={() => alert(`Bulk Export: Packaged ${drawings.length} item drawing archives into ZIP package.`)}
              style={{ fontSize: '0.8rem', padding: '0.45rem 0.85rem' }}
            >
              <FileArchive size={15} /> Export All Drawings (ZIP)
            </button>
          </div>
        </div>
      </div>

      {/* Notification */}
      {feedbackMessage && (
        <div style={{
          padding: '0.65rem 0.95rem',
          borderRadius: '6px',
          fontSize: '0.82rem',
          fontWeight: 600,
          backgroundColor: feedbackMessage.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
          color: feedbackMessage.type === 'success' ? 'var(--success)' : 'var(--danger)',
          border: `1px solid ${feedbackMessage.type === 'success' ? 'var(--success)' : 'var(--danger)'}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>{feedbackMessage.text}</span>
          <button onClick={() => setFeedbackMessage(null)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* Main 2-Column Split Workspace */}
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '1rem', flex: 1, minHeight: 0 }}>
        
        {/* Left Column: Item Master Directory */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', padding: '0.85rem', gap: '0.65rem', overflow: 'hidden' }}>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              className="input-field" 
              placeholder="Search items, part codes..."
              style={{ paddingLeft: '2rem', fontSize: '0.8rem', paddingTop: '0.3rem', paddingBottom: '0.3rem' }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Registered Items ({filteredItems.length})
          </div>

          {/* Item List Scroll Area */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            {filteredItems.map(item => {
              const isSelected = selectedItemId === item.id;
              const hasDrawing = drawings.some(d => (d.itemId === item.id || d.itemCode === item.itemCode) && d.drawingVersions?.length > 0);
              const hasCad = drawings.some(d => (d.itemId === item.id || d.itemCode === item.itemCode) && d.additionalFileVersions?.length > 0);
              const isAck = isDrawingAcknowledged(item.id);

              return (
                <div 
                  key={item.id}
                  onClick={() => setSelectedItemId(item.id)}
                  style={{
                    padding: '0.55rem 0.75rem',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    backgroundColor: isSelected ? 'rgba(139, 92, 246, 0.12)' : 'var(--bg-tertiary)',
                    border: isSelected ? '1px solid #8b5cf6' : '1px solid var(--border-color)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '0.82rem', color: isSelected ? '#8b5cf6' : 'var(--text-primary)' }}>
                      {item.itemCode}
                    </span>
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                      {hasDrawing && <span className="badge badge-primary" style={{ fontSize: '0.62rem', padding: '0.05rem 0.3rem' }}>2D</span>}
                      {hasCad && <span className="badge badge-success" style={{ fontSize: '0.62rem', padding: '0.05rem 0.3rem' }}>CAD</span>}
                      {!isAck && <span className="badge badge-warning" style={{ fontSize: '0.62rem', padding: '0.05rem 0.3rem' }}>Unread</span>}
                    </div>
                  </div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.15rem' }}>
                    {item.name}
                  </div>
                  {item.partCode && (
                    <div style={{ fontSize: '0.72rem', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                      Part: {item.partCode}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Selected Item Drawing & CAD Workspace */}
        {selectedItem && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto' }}>
            
            {/* Item Card Banner */}
            <div className="card" style={{ padding: '1rem 1.25rem', backgroundColor: 'var(--bg-card)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontFamily: 'monospace', fontSize: '1.1rem', fontWeight: 800, color: '#8b5cf6' }}>
                      {selectedItem.itemCode}
                    </span>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                      {selectedItem.name}
                    </h3>
                    <span className="badge badge-neutral" style={{ fontSize: '0.72rem' }}>
                      {selectedItem.category}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                    {selectedItem.partCode ? `Part Code: ${selectedItem.partCode} • ` : ''}Process Type: {selectedItem.processType || 'Standard'} • UOM: {selectedItem.unit}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button 
                    onClick={() => setIsUploadDwgModalOpen(true)}
                    className="btn btn-primary" 
                    style={{ fontSize: '0.8rem', padding: '0.45rem 0.85rem', backgroundColor: '#8b5cf6', borderColor: '#8b5cf6' }}
                  >
                    <Plus size={14} /> Upload 2D Drawing
                  </button>
                  <button 
                    onClick={() => setIsUploadCadModalOpen(true)}
                    className="btn btn-outline" 
                    style={{ fontSize: '0.8rem', padding: '0.45rem 0.85rem', color: '#16a34a', borderColor: '#16a34a' }}
                  >
                    <Plus size={14} /> Upload 3D CAD File
                  </button>
                </div>
              </div>
            </div>

            {/* Version Stream Panels (Side-by-Side) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              
              {/* PANEL A: 2D TECHNICAL DRAWINGS (PDF) */}
              <div className="card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <FileText size={16} color="#8b5cf6" />
                    <h4 style={{ fontSize: '0.92rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                      2D Technical Drawings (.PDF)
                    </h4>
                  </div>
                  <span className="badge badge-neutral" style={{ fontSize: '0.72rem' }}>
                    {selectedDrawingRecord?.drawingVersions?.length || 0} Versions
                  </span>
                </div>

                {(!selectedDrawingRecord?.drawingVersions || selectedDrawingRecord.drawingVersions.length === 0) ? (
                  <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                    No 2D drawings uploaded yet. Click "Upload 2D Drawing" above to add release.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {selectedDrawingRecord.drawingVersions.map((ver, vIdx) => {
                      const isAck = selectedDrawingRecord.readReceipts?.some(r => r.versionId === ver.versionId);

                      return (
                        <div 
                          key={ver.versionId || vIdx}
                          style={{
                            padding: '0.65rem 0.85rem',
                            backgroundColor: ver.isLatest ? 'rgba(139, 92, 246, 0.06)' : 'var(--bg-tertiary)',
                            border: ver.isLatest ? '1px solid #8b5cf6' : '1px solid var(--border-color)',
                            borderRadius: '6px'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <span style={{ fontWeight: 800, fontSize: '0.85rem', color: '#8b5cf6' }}>
                                {ver.versionNumber}
                              </span>
                              {ver.isLatest && <span className="badge badge-primary" style={{ fontSize: '0.65rem' }}>LATEST</span>}
                              {isAck ? (
                                <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>✓ Acknowledged</span>
                              ) : (
                                <span className="badge badge-warning" style={{ fontSize: '0.65rem' }}>⚠️ Unread</span>
                              )}
                            </div>
                            
                            <div style={{ display: 'flex', gap: '0.3rem' }}>
                              <button 
                                className="btn btn-outline" 
                                style={{ padding: '0.2rem 0.45rem', fontSize: '0.72rem' }}
                                onClick={() => setPreviewVersion({ type: 'DWG', item: selectedItem, version: ver })}
                                title="Preview Drawing"
                              >
                                <Eye size={12} /> Preview
                              </button>
                              <button 
                                className="btn btn-outline" 
                                style={{ padding: '0.2rem 0.45rem', fontSize: '0.72rem' }}
                                onClick={() => handleDownload(ver.fileName, ver.fileData)}
                                title="Download File"
                              >
                                <Download size={12} />
                              </button>
                              <button 
                                className="btn btn-outline" 
                                style={{ padding: '0.2rem 0.45rem', fontSize: '0.72rem' }}
                                onClick={() => handlePrint(ver.fileData)}
                                title="Print Drawing"
                              >
                                <Printer size={12} />
                              </button>
                            </div>
                          </div>

                          <div style={{ fontSize: '0.78rem', fontWeight: 600, marginTop: '0.25rem' }}>
                            {ver.fileName} <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>({(ver.fileSize / 1024).toFixed(1)} KB)</span>
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                            {ver.changeNotes || 'No change notes provided.'}
                          </div>
                          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>Uploaded by {ver.uploadedBy} on {new Date(ver.uploadedAt).toLocaleDateString('en-IN')}</span>
                            {!isAck && (
                              <button 
                                onClick={() => handleAcknowledge(ver.versionId)}
                                style={{ background: 'none', border: 'none', color: '#16a34a', fontWeight: 700, cursor: 'pointer', fontSize: '0.72rem', textDecoration: 'underline' }}
                              >
                                Mark as Read
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* PANEL B: 3D CAD & ADDITIONAL VECTOR FILES */}
              <div className="card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Layers size={16} color="#16a34a" />
                    <h4 style={{ fontSize: '0.92rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                      3D CAD / Additional Files (.DWG/.DXF/.STEP)
                    </h4>
                  </div>
                  <span className="badge badge-neutral" style={{ fontSize: '0.72rem' }}>
                    {selectedDrawingRecord?.additionalFileVersions?.length || 0} CAD Releases
                  </span>
                </div>

                {(!selectedDrawingRecord?.additionalFileVersions || selectedDrawingRecord.additionalFileVersions.length === 0) ? (
                  <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                    No 3D CAD or vector files attached yet. Click "Upload 3D CAD File" to add SolidWorks/AutoCAD release.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {selectedDrawingRecord.additionalFileVersions.map((cad, cIdx) => (
                      <div 
                        key={cad.versionId || cIdx}
                        style={{
                          padding: '0.65rem 0.85rem',
                          backgroundColor: cad.isLatest ? 'rgba(22, 163, 74, 0.06)' : 'var(--bg-tertiary)',
                          border: cad.isLatest ? '1px solid #16a34a' : '1px solid var(--border-color)',
                          borderRadius: '6px'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <span style={{ fontWeight: 800, fontSize: '0.85rem', color: '#16a34a' }}>
                              {cad.versionNumber}
                            </span>
                            {cad.isLatest && <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>LATEST CAD</span>}
                            <span className="badge badge-neutral" style={{ fontSize: '0.65rem', textTransform: 'uppercase' }}>
                              {cad.fileType || 'DWG'}
                            </span>
                          </div>

                          <div style={{ display: 'flex', gap: '0.3rem' }}>
                            <button 
                              className="btn btn-outline" 
                              style={{ padding: '0.2rem 0.5rem', fontSize: '0.72rem', color: '#16a34a', borderColor: '#16a34a' }}
                              onClick={() => handleDownload(cad.fileName, cad.fileData)}
                              title="Download CAD File"
                            >
                              <Download size={12} /> Download {cad.fileType?.toUpperCase()}
                            </button>
                          </div>
                        </div>

                        <div style={{ fontSize: '0.78rem', fontWeight: 600, marginTop: '0.25rem' }}>
                          {cad.fileName} <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>({(cad.fileSize / 1024).toFixed(1)} KB)</span>
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                          {cad.changeNotes || 'CAD Solid Model release.'}
                        </div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                          Uploaded by {cad.uploadedBy} on {new Date(cad.uploadedAt).toLocaleDateString('en-IN')}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Read Receipts Audit History */}
            {selectedDrawingRecord && selectedDrawingRecord.readReceipts && selectedDrawingRecord.readReceipts.length > 0 && (
              <div className="card" style={{ padding: '1rem' }}>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 700, margin: '0 0 0.5rem 0', color: 'var(--text-primary)' }}>
                  Drawing Acknowledgment & Read Receipts Audit Log
                </h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {selectedDrawingRecord.readReceipts.map((rcpt, idx) => (
                    <div key={idx} style={{ padding: '0.35rem 0.65rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: '4px', fontSize: '0.75rem', border: '1px solid var(--border-color)' }}>
                      <strong>{rcpt.userName}</strong> ({rcpt.userRole}) acknowledged <em>{rcpt.versionId}</em> on {new Date(rcpt.acknowledgedAt).toLocaleString('en-IN')}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* PREVIEW MODAL */}
      {previewVersion && (
        <div className="modal-overlay" style={{ zIndex: 1300 }}>
          <div className="card" style={{ maxWidth: '900px', width: '95%', height: '85vh', display: 'flex', flexDirection: 'column', padding: '1.25rem', backgroundColor: 'var(--bg-card)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>
                  Drawing Preview: {previewVersion.version.fileName} ({previewVersion.version.versionNumber})
                </h3>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {previewVersion.item.itemCode} - {previewVersion.item.name}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <button className="btn btn-outline" onClick={() => handlePrint(previewVersion.version.fileData)}>
                  <Printer size={15} /> Print
                </button>
                <button className="btn btn-outline" onClick={() => handleDownload(previewVersion.version.fileName, previewVersion.version.fileData)}>
                  <Download size={15} /> Download
                </button>
                <button onClick={() => setPreviewVersion(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                  <X size={20} />
                </button>
              </div>
            </div>

            <div style={{ flex: 1, marginTop: '1rem', backgroundColor: '#1e293b', borderRadius: '6px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {previewVersion.version.fileData?.startsWith('data:application/pdf') ? (
                <iframe src={previewVersion.version.fileData} style={{ width: '100%', height: '100%', border: 'none' }} title="PDF Preview" />
              ) : previewVersion.version.fileData?.startsWith('data:image/') ? (
                <img src={previewVersion.version.fileData} alt="Drawing Preview" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
              ) : (
                <div style={{ textAlign: 'center', color: '#94a3b8', padding: '2rem' }}>
                  <FileText size={48} style={{ margin: '0 auto 1rem auto', display: 'block' }} />
                  <p>Direct browser render not available for this binary file format ({previewVersion.version.fileName}).</p>
                  <button className="btn btn-primary" onClick={() => handleDownload(previewVersion.version.fileName, previewVersion.version.fileData)}>
                    Download File to Open in AutoCAD / SolidWorks
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* UPLOAD 2D DRAWING MODAL */}
      {isUploadDwgModalOpen && (
        <div className="modal-overlay" style={{ zIndex: 1250 }}>
          <div className="card" style={{ maxWidth: '500px', width: '95%', padding: '1.25rem', backgroundColor: 'var(--bg-card)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0 }}>Upload 2D Engineering Drawing</h3>
              <button onClick={() => setIsUploadDwgModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={16} /></button>
            </div>

            <form onSubmit={handleSaveDrawingVersion} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700 }}>Version Label (Optional)</label>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder={`e.g. DWG-${(selectedDrawingRecord?.drawingVersions?.length || 0) + 1}`} 
                  value={customVersionLabel}
                  onChange={(e) => setCustomVersionLabel(e.target.value)}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700 }}>Select File (.PDF, .PNG, .JPG) *</label>
                <input 
                  type="file" 
                  required
                  accept=".pdf,.png,.jpg,.jpeg"
                  className="input-field" 
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700 }}>Revision / Change Notes</label>
                <textarea 
                  rows={3} 
                  className="input-field" 
                  placeholder="e.g. Tolerances updated for bore diameter to 45mm H7"
                  value={changeNotes}
                  onChange={(e) => setChangeNotes(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsUploadDwgModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={isSaving} style={{ backgroundColor: '#8b5cf6', borderColor: '#8b5cf6' }}>
                  {isSaving ? 'Saving...' : 'Upload 2D Drawing'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* UPLOAD 3D CAD FILE MODAL */}
      {isUploadCadModalOpen && (
        <div className="modal-overlay" style={{ zIndex: 1250 }}>
          <div className="card" style={{ maxWidth: '500px', width: '95%', padding: '1.25rem', backgroundColor: 'var(--bg-card)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0 }}>Upload 3D CAD Model / Vector File</h3>
              <button onClick={() => setIsUploadCadModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={16} /></button>
            </div>

            <form onSubmit={handleSaveCadVersion} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700 }}>CAD Release Label (Optional)</label>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder={`e.g. CAD-${(selectedDrawingRecord?.additionalFileVersions?.length || 0) + 1}`} 
                  value={customVersionLabel}
                  onChange={(e) => setCustomVersionLabel(e.target.value)}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700 }}>Select CAD File (.DWG, .DXF, .STEP, .ZIP) *</label>
                <input 
                  type="file" 
                  required
                  accept=".dwg,.dxf,.step,.stp,.iges,.igs,.sldprt,.sldasm,.zip"
                  className="input-field" 
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700 }}>Change Notes / Release Description</label>
                <textarea 
                  rows={3} 
                  className="input-field" 
                  placeholder="e.g. 3D solid model export with chamfers added for CNC machining"
                  value={changeNotes}
                  onChange={(e) => setChangeNotes(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsUploadCadModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={isSaving} style={{ backgroundColor: '#16a34a', borderColor: '#16a34a' }}>
                  {isSaving ? 'Saving...' : 'Upload CAD File'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
