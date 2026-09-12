import React, { useState, useMemo } from 'react';
import { useERP } from '../../context/ERPContext';
import { 
  Workflow, Plus, Edit2, Trash2, Search, Check, AlertCircle, ArrowRight, 
  Layers, Factory, Users, ShieldCheck, FileText, CheckCircle2,
  X, ChevronRight, CornerDownRight, ShieldAlert, Cpu, Upload, Download, FileSpreadsheet
} from 'lucide-react';
import { ProcessDefinition, ItemProcessCard, ItemProcessStep, getProcessTooltip } from '../../types/erp';
import { Modal } from '../common/Modal';
import { parseWorkbookFile, parseProcessesCSV, downloadCSVTemplate, ParsedProcessResult } from '../../utils/massDataParser';

export const ProcessMasterModule: React.FC = () => {
  const { 
    processDefinitions, addProcessDefinition, updateProcessDefinition, deleteProcessDefinition,
    itemProcessCards, saveItemProcessCard, deleteItemProcessCard,
    items, vendors, massUpsertProcesses, massUpsertItemProcessCards
  } = useERP();

  const [activeTab, setActiveTab] = useState<'DEFINITIONS' | 'PROCESS_CARDS'>('PROCESS_CARDS');
  const [searchTerm, setSearchTerm] = useState('');
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'danger' } | null>(null);

  // -------------------------------------------------------------
  // 0. BULK UPLOAD STATE
  // -------------------------------------------------------------
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkParsedResult, setBulkParsedResult] = useState<{
    totalRows: number;
    validCards: ItemProcessCard[];
    validRecords: ProcessDefinition[];
    errors: any[];
  } | null>(null);
  const [isParsingBulk, setIsParsingBulk] = useState(false);
  const [bulkFileName, setBulkFileName] = useState('');

  // -------------------------------------------------------------
  // 1. PROCESS DEFINITIONS (MASTER) STATE
  // -------------------------------------------------------------
  const [isProcessModalOpen, setIsProcessModalOpen] = useState(false);
  const [editingProcess, setEditingProcess] = useState<ProcessDefinition | null>(null);
  const [procName, setProcName] = useState('');
  const [procShortCode, setProcShortCode] = useState('');
  const [procDescription, setProcDescription] = useState('');

  // -------------------------------------------------------------
  // 2. ITEM PROCESS CARD STATE
  // -------------------------------------------------------------
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<ItemProcessCard | null>(null);
  const [selectedItemId, setSelectedItemId] = useState(''); // Finished Item
  const [selectedRawItemId, setSelectedRawItemId] = useState(''); // Raw Item
  const [cardNotes, setCardNotes] = useState('');
  const [steps, setSteps] = useState<ItemProcessStep[]>([]);
  const [stepVendorSearch, setStepVendorSearch] = useState<Record<number, string>>({});

  // Selected item object for card builder
  const selectedItemObj = items.find(i => i.id === selectedItemId);
  const selectedRawItemObj = items.find(i => i.id === selectedRawItemId);

  // Filtered Process Definitions
  const filteredProcesses = useMemo(() => {
    return processDefinitions.filter(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      p.shortCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [processDefinitions, searchTerm]);

  // Filtered Item Process Cards
  const filteredCards = useMemo(() => {
    return itemProcessCards.filter(c => 
      c.itemCode.toLowerCase().includes(searchTerm.toLowerCase()) || 
      c.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.rawItemCode && c.rawItemCode.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.rawItemName && c.rawItemName.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [itemProcessCards, searchTerm]);

  // -------------------------------------------------------------
  // PROCESS DEFINITION HANDLERS
  // -------------------------------------------------------------
  const handleOpenAddProcess = () => {
    setEditingProcess(null);
    setProcName('');
    setProcShortCode('');
    setProcDescription('');
    setIsProcessModalOpen(true);
  };

  const handleOpenEditProcess = (proc: ProcessDefinition) => {
    setEditingProcess(proc);
    setProcName(proc.name);
    setProcShortCode(proc.shortCode);
    setProcDescription(proc.description || '');
    setIsProcessModalOpen(true);
  };

  const handleSaveProcess = (e: React.FormEvent) => {
    e.preventDefault();
    if (!procName.trim() || !procShortCode.trim()) {
      setMessage({ text: 'Process Name and Short Code are required.', type: 'danger' });
      return;
    }

    if (editingProcess) {
      const res = updateProcessDefinition({
        ...editingProcess,
        name: procName.trim(),
        shortCode: procShortCode.trim().toUpperCase(),
        description: procDescription.trim()
      });
      if (res.success) {
        setMessage({ text: res.message, type: 'success' });
        setIsProcessModalOpen(false);
      } else {
        setMessage({ text: res.message, type: 'danger' });
      }
    } else {
      const res = addProcessDefinition({
        name: procName.trim(),
        shortCode: procShortCode.trim().toUpperCase(),
        description: procDescription.trim()
      });
      if (res.success) {
        setMessage({ text: res.message, type: 'success' });
        setIsProcessModalOpen(false);
      } else {
        setMessage({ text: res.message, type: 'danger' });
      }
    }
  };

  const handleDeleteProcess = (id: string) => {
    const res = deleteProcessDefinition(id);
    if (res.success) {
      setMessage({ text: res.message, type: 'success' });
    } else {
      alert(res.message);
    }
  };

  // -------------------------------------------------------------
  // ITEM PROCESS CARD HANDLERS
  // -------------------------------------------------------------
  const handleOpenAddCard = (preselectedItemId?: string) => {
    setEditingCard(null);
    setSelectedItemId(preselectedItemId || '');
    setSelectedRawItemId('');
    setCardNotes('');
    setSteps([
      {
        stepNumber: 1,
        processId: processDefinitions[0]?.id || 'proc-1',
        processName: processDefinitions[0]?.name || 'Laser Cutting',
        processShortCode: processDefinitions[0]?.shortCode || 'LC',
        vendorIds: []
      }
    ]);
    setStepVendorSearch({});
    setIsCardModalOpen(true);
  };

  const handleOpenEditCard = (card: ItemProcessCard) => {
    setEditingCard(card);
    setSelectedItemId(card.itemId);
    setSelectedRawItemId(card.rawItemId || '');
    setCardNotes(card.notes || '');
    setSteps(card.steps || []);
    setStepVendorSearch({});
    setIsCardModalOpen(true);
  };

  const handleAddStepToCard = () => {
    const nextStepNum = steps.length + 1;
    const defaultProc = processDefinitions[0];
    setSteps(prev => [
      ...prev,
      {
        stepNumber: nextStepNum,
        processId: defaultProc ? defaultProc.id : `proc-${nextStepNum}`,
        processName: defaultProc ? defaultProc.name : 'Machining',
        processShortCode: defaultProc ? defaultProc.shortCode : 'MCH',
        vendorIds: []
      }
    ]);
  };

  const handleRemoveStep = (index: number) => {
    if (steps.length <= 1) {
      alert('A process card must contain at least 1 process step.');
      return;
    }
    const updated = steps.filter((_, i) => i !== index).map((s, idx) => ({ ...s, stepNumber: idx + 1 }));
    setSteps(updated);
  };

  const handleStepProcessChange = (index: number, processId: string) => {
    const procObj = processDefinitions.find(p => p.id === processId);
    if (!procObj) return;
    setSteps(prev => prev.map((s, i) => i === index ? {
      ...s,
      processId: procObj.id,
      processName: procObj.name,
      processShortCode: procObj.shortCode
    } : s));
  };

  const handleAddVendorToStep = (stepIndex: number, vendorId: string) => {
    if (!vendorId) return;
    setSteps(prev => prev.map((s, i) => {
      if (i !== stepIndex) return s;
      const current = s.vendorIds || [];
      if (current.includes(vendorId)) return s;
      return { ...s, vendorIds: [...current, vendorId] };
    }));
  };

  const handleMoveStepVendorPriority = (stepIndex: number, vendorIndex: number, direction: 'up' | 'down') => {
    setSteps(prev => prev.map((s, i) => {
      if (i !== stepIndex) return s;
      const list = [...(s.vendorIds || [])];
      const targetIdx = direction === 'up' ? vendorIndex - 1 : vendorIndex + 1;
      if (targetIdx < 0 || targetIdx >= list.length) return s;
      const temp = list[vendorIndex];
      list[vendorIndex] = list[targetIdx];
      list[targetIdx] = temp;
      return { ...s, vendorIds: list };
    }));
  };

  const handleRemoveVendorFromStep = (stepIndex: number, vendorId: string) => {
    setSteps(prev => prev.map((s, i) => {
      if (i !== stepIndex) return s;
      const current = s.vendorIds || [];
      return { ...s, vendorIds: current.filter(id => id !== vendorId) };
    }));
  };

  const handleSaveCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemId) {
      setMessage({ text: 'Please select a Finished Item from Item Master.', type: 'danger' });
      return;
    }
    const itemObj = items.find(i => i.id === selectedItemId);
    if (!itemObj) return;

    if (!selectedRawItemId) {
      setMessage({ text: 'Please select a Raw Item (Source Material) from Item Master.', type: 'danger' });
      return;
    }
    const rawItemObj = items.find(i => i.id === selectedRawItemId);

    if (steps.length === 0) {
      setMessage({ text: 'Please add at least one process step.', type: 'danger' });
      return;
    }

    const res = saveItemProcessCard({
      id: editingCard?.id,
      itemId: itemObj.id,
      itemCode: itemObj.itemCode,
      itemName: itemObj.name,
      rawItemId: rawItemObj?.id,
      rawItemCode: rawItemObj?.itemCode,
      rawItemName: rawItemObj?.name,
      steps: steps.map((s, idx) => ({ ...s, stepNumber: idx + 1 })),
      notes: cardNotes.trim() || undefined
    });

    if (res.success) {
      setMessage({ text: res.message, type: 'success' });
      setIsCardModalOpen(false);
    } else {
      setMessage({ text: res.message, type: 'danger' });
    }
  };

  const handleDeleteCard = (id: string) => {
    if (!window.confirm('Are you sure you want to remove this Item Process Card?')) return;
    deleteItemProcessCard(id);
    setMessage({ text: 'Process Card removed successfully.', type: 'success' });
  };

  // -------------------------------------------------------------
  // BULK PROCESS / ROUTING UPLOAD HANDLERS
  // -------------------------------------------------------------
  const handleBulkProcessUpload = async (file: File) => {
    setIsParsingBulk(true);
    setBulkFileName(file.name);
    try {
      const sheets = await parseWorkbookFile(file);
      const allCards: ItemProcessCard[] = [];
      const allProcs: ProcessDefinition[] = [];
      const allErrors: any[] = [];
      let totalRows = 0;
      for (const sheet of sheets) {
        const res = parseProcessesCSV(sheet.text, processDefinitions, items, itemProcessCards, vendors);
        totalRows += res.totalRows;
        allCards.push(...res.validCards);
        allProcs.push(...res.validRecords);
        allErrors.push(...res.errors);
      }
      setBulkParsedResult({
        totalRows,
        validCards: allCards,
        validRecords: allProcs,
        errors: allErrors
      });
      setIsBulkModalOpen(true);
    } catch (e: any) {
      alert('Failed to read process file: ' + e.message);
    } finally {
      setIsParsingBulk(false);
    }
  };

  const handleConfirmBulkImport = () => {
    if (!bulkParsedResult) return;
    if (bulkParsedResult.validCards.length > 0) {
      massUpsertItemProcessCards(bulkParsedResult.validCards, 'APPEND');
    }
    if (bulkParsedResult.validRecords.length > 0) {
      massUpsertProcesses(bulkParsedResult.validRecords, 'APPEND');
    }
    setMessage({
      text: `Successfully imported ${bulkParsedResult.validCards.length} Process Routing Cards and ${bulkParsedResult.validRecords.length} Operations.`,
      type: 'success'
    });
    setIsBulkModalOpen(false);
    setBulkParsedResult(null);
  };

  return (
    <div 
      className="module-layout-container"
      style={{ 
        height: '100%', 
        minHeight: 0, 
        overflow: 'hidden', 
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem'
      }}
    >
      {/* ------------------------------------------------------------- */}
      {/* HEADER TOOLBAR */}
      {/* ------------------------------------------------------------- */}
      <div className="card" style={{ padding: '1rem 1.25rem', borderLeft: '4px solid var(--accent-primary)', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
              <div style={{ padding: '0.4rem', backgroundColor: 'var(--accent-light)', borderRadius: '0.5rem', color: 'var(--accent-primary)' }}>
                <Workflow size={22} />
              </div>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
                Process Master & Component Routing Workbench
              </h2>
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Standard processes • Sequential Item Process Cards • Step-wise authorized vendors • Single-step intermediate codes
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <label className="btn btn-outline" style={{ fontSize: '0.8rem', padding: '0.45rem 0.85rem', cursor: 'pointer', margin: 0 }}>
              <Upload size={15} style={{ marginRight: '0.3rem', display: 'inline' }} />
              <span>{isParsingBulk ? 'Reading File...' : 'Bulk Upload Process Routes'}</span>
              <input
                type="file"
                accept=".xlsx,.xls,.csv,.tsv,.txt"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleBulkProcessUpload(file);
                    e.target.value = '';
                  }
                }}
              />
            </label>

            <button 
              className="btn btn-outline" 
              style={{ fontSize: '0.8rem', padding: '0.45rem 0.85rem' }}
              onClick={() => downloadCSVTemplate('PROCESS_MASTER')}
              title="Download Process Routing Template"
            >
              <Download size={15} /> Template
            </button>

            {activeTab === 'DEFINITIONS' ? (
              <button onClick={handleOpenAddProcess} className="btn btn-primary" style={{ fontSize: '0.8rem', padding: '0.45rem 0.9rem' }}>
                <Plus size={15} /> Add Process Definition
              </button>
            ) : (
              <button onClick={() => handleOpenAddCard()} className="btn btn-primary" style={{ fontSize: '0.8rem', padding: '0.45rem 0.9rem' }}>
                <Plus size={15} /> Create Item Process Card
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Notification Message */}
      {message && (
        <div style={{
          padding: '0.75rem 1rem',
          borderRadius: '0.5rem',
          fontSize: '0.82rem',
          fontWeight: 600,
          backgroundColor: message.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
          color: message.type === 'success' ? 'var(--success)' : 'var(--danger)',
          border: `1px solid ${message.type === 'success' ? 'var(--success)' : 'var(--danger)'}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexShrink: 0
        }}>
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TABS & SEARCH */}
      {/* ------------------------------------------------------------- */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => { setActiveTab('PROCESS_CARDS'); setSearchTerm(''); }}
            className={`btn ${activeTab === 'PROCESS_CARDS' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.8rem', padding: '0.45rem 0.95rem' }}
          >
            <Layers size={14} />
            <span>Item Process Cards ({itemProcessCards.length})</span>
          </button>
          <button
            onClick={() => { setActiveTab('DEFINITIONS'); setSearchTerm(''); }}
            className={`btn ${activeTab === 'DEFINITIONS' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.8rem', padding: '0.45rem 0.95rem' }}
          >
            <Workflow size={14} />
            <span>Process Library / Master ({processDefinitions.length})</span>
          </button>
        </div>

        <div style={{ position: 'relative', minWidth: '260px' }}>
          <Search size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder={activeTab === 'PROCESS_CARDS' ? 'Search by Finished Item or Raw Item...' : 'Search processes or short codes...'}
            className="input-field"
            style={{ paddingLeft: '2.25rem', fontSize: '0.8rem' }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* TAB 1: ITEM PROCESS CARDS (SEQUENTIAL ROUTING TABLE) */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'PROCESS_CARDS' && (
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {filteredCards.length === 0 ? (
            <div className="card" style={{ padding: '3.5rem 1rem', textAlign: 'center', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
              <Layers size={36} color="var(--accent-primary)" style={{ margin: '0 auto 0.75rem', opacity: 0.6 }} />
              <h4 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>No Item Process Cards Configured</h4>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', maxWidth: '460px', margin: '0.35rem auto 1rem' }}>
                Define sequential manufacturing steps (e.g. Laser Cutting &rarr; Turning &rarr; VMC &rarr; Plating) and assign step-wise vendors for your components.
              </p>
              <button onClick={() => handleOpenAddCard()} className="btn btn-primary" style={{ fontSize: '0.8rem', margin: '0 auto' }}>
                <Plus size={15} /> Create First Process Card
              </button>
            </div>
          ) : (
            <div className="table-container" style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'auto', border: '1px solid var(--border-color)', borderRadius: '0.5rem' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: 'var(--bg-secondary)' }}>
                  <tr>
                    <th style={{ width: '45px', textAlign: 'center' }}>#</th>
                    <th style={{ minWidth: '190px' }}>Finished Item (A)</th>
                    <th style={{ minWidth: '190px' }}>Raw Material / Casting (B)</th>
                    <th style={{ minWidth: '320px' }}>Process Route Sequence</th>
                    <th style={{ minWidth: '240px' }}>Assigned Step Vendors</th>
                    <th style={{ width: '110px', textAlign: 'center' }}>Steps / Lead Time</th>
                    <th style={{ width: '110px', textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCards.map((card, cIdx) => {
                    const totalDays = card.steps.reduce((sum, s) => sum + (s.estimatedDays || 0), 0);
                    return (
                      <tr key={card.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ textAlign: 'center', fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                          {cIdx + 1}
                        </td>
                        <td>
                          <div style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '0.86rem' }}>
                            {card.itemName}
                          </div>
                          <div style={{ fontSize: '0.74rem', fontFamily: 'monospace', color: 'var(--accent-primary)', fontWeight: 700 }}>
                            {card.itemCode}
                          </div>
                        </td>
                        <td>
                          {card.rawItemName || card.rawItemCode ? (
                            <div>
                              <div style={{ fontWeight: 700, color: '#d97706', fontSize: '0.82rem' }}>
                                {card.rawItemName || 'Raw Material'}
                              </div>
                              <div style={{ fontSize: '0.74rem', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                                {card.rawItemCode || '-'}
                              </div>
                            </div>
                          ) : (
                            <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Direct / None</span>
                          )}
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.35rem' }}>
                            {card.steps.map((step, sIdx) => (
                              <React.Fragment key={sIdx}>
                                <div 
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.3rem',
                                    padding: '0.2rem 0.45rem',
                                    backgroundColor: 'var(--bg-tertiary)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '0.35rem',
                                    fontSize: '0.72rem'
                                  }}
                                  title={getProcessTooltip(step.processShortCode, step.processName, processDefinitions)}
                                >
                                  <span style={{ 
                                    width: '16px', 
                                    height: '16px', 
                                    borderRadius: '50%', 
                                    backgroundColor: 'var(--accent-light)', 
                                    color: 'var(--accent-primary)', 
                                    fontSize: '0.65rem', 
                                    fontWeight: 800,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                  }}>
                                    {step.stepNumber}
                                  </span>
                                  <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{step.processName}</span>
                                  <span 
                                    className="badge badge-primary" 
                                    style={{ fontSize: '0.62rem', padding: '0.05rem 0.3rem', cursor: 'help' }}
                                    title={getProcessTooltip(step.processShortCode, step.processName, processDefinitions)}
                                  >
                                    {step.processShortCode}
                                  </span>
                                </div>
                                {sIdx < card.steps.length - 1 && (
                                  <ArrowRight size={12} color="var(--text-muted)" style={{ flexShrink: 0 }} />
                                )}
                              </React.Fragment>
                            ))}
                          </div>
                          {card.notes && (
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                              <em>{card.notes}</em>
                            </div>
                          )}
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            {card.steps.map((step, sIdx) => {
                              const stepVendors = vendors.filter(v => step.vendorIds?.includes(v.id));
                              return (
                                <div key={sIdx} style={{ fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '0.3rem', flexWrap: 'wrap' }}>
                                  <span style={{ color: 'var(--text-muted)', fontWeight: 600, minWidth: '45px' }}>
                                    Step {step.stepNumber}:
                                  </span>
                                  {stepVendors.length > 0 ? (
                                    stepVendors.map(v => (
                                      <span 
                                        key={v.id} 
                                        style={{ 
                                          padding: '0.1rem 0.4rem', 
                                          backgroundColor: 'var(--bg-tertiary)', 
                                          borderRadius: '0.25rem', 
                                          border: '1px solid var(--border-color)', 
                                          fontSize: '0.68rem', 
                                          fontWeight: 600,
                                          color: 'var(--text-primary)'
                                        }}
                                        title={`${v.vendorCode} - ${v.name} (${v.city || 'Vendor'})`}
                                      >
                                        {v.name}
                                      </span>
                                    ))
                                  ) : (
                                    <span style={{ color: '#f59e0b', fontSize: '0.68rem', fontStyle: 'italic' }}>
                                      In-House / Unassigned
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span className="badge badge-purple" style={{ fontSize: '0.72rem', fontWeight: 700 }}>
                            {card.steps.length} Steps
                          </span>
                          {totalDays > 0 && (
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                              ~{totalDays} Days
                            </div>
                          )}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                            <button
                              onClick={() => handleOpenEditCard(card)}
                              className="btn btn-outline"
                              style={{ padding: '0.25rem 0.5rem', fontSize: '0.72rem' }}
                              title="Edit Process Steps"
                            >
                              <Edit2 size={13} /> Edit
                            </button>
                            <button
                              onClick={() => handleDeleteCard(card.id)}
                              className="btn btn-outline"
                              style={{ padding: '0.25rem 0.5rem', fontSize: '0.72rem', color: 'var(--danger)' }}
                              title="Remove Process Card"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 2: PROCESS DEFINITIONS (MASTER LIBRARY) */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'DEFINITIONS' && (
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div className="table-container" style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'auto', border: '1px solid var(--border-color)', borderRadius: '0.5rem' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: 'var(--bg-secondary)' }}>
                <tr>
                  <th style={{ width: '220px' }}>Process Name</th>
                  <th style={{ width: '120px' }}>Short Code</th>
                  <th>Description / Specification</th>
                  <th style={{ width: '140px', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProcesses.map(proc => {
                  return (
                    <tr key={proc.id}>
                      <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                        {proc.name}
                      </td>
                      <td>
                        <span 
                          className="badge badge-primary" 
                          style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '0.78rem', cursor: 'help' }}
                          title={getProcessTooltip(proc.shortCode, proc.name, processDefinitions)}
                        >
                          {proc.shortCode}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {proc.description || '-'}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                          <button
                            onClick={() => handleOpenEditProcess(proc)}
                            className="btn btn-outline"
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.72rem' }}
                          >
                            <Edit2 size={13} /> Edit
                          </button>
                          
                          <button
                            onClick={() => handleDeleteProcess(proc.id)}
                            className="btn btn-outline"
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.72rem', color: 'var(--danger)' }}
                          >
                            <Trash2 size={13} /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 1: ADD / EDIT PROCESS DEFINITION */}
      {/* ------------------------------------------------------------- */}
      <Modal
        isOpen={isProcessModalOpen}
        onClose={() => setIsProcessModalOpen(false)}
        title={editingProcess ? `Edit Process: ${editingProcess.name}` : 'Define New Manufacturing Process'}
      >
        <form onSubmit={handleSaveProcess} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 700 }}>Process Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Laser Cutting, CNC Turning, Hard Chrome Plating"
                className="input-field"
                value={procName}
                onChange={(e) => setProcName(e.target.value)}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 700 }}>Short Form Code *</label>
              <input
                type="text"
                required
                maxLength={6}
                placeholder="e.g. LC, TRN, VMC"
                className="input-field"
                style={{ textTransform: 'uppercase', fontFamily: 'monospace', fontWeight: 700 }}
                value={procShortCode}
                onChange={(e) => setProcShortCode(e.target.value.toUpperCase())}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 700 }}>Process Description / Machine Spec</label>
            <textarea
              rows={3}
              placeholder="Describe machine capability, tolerance standards, or special processing guidelines..."
              className="input-field"
              value={procDescription}
              onChange={(e) => setProcDescription(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsProcessModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              <Check size={14} /> {editingProcess ? 'Update Process' : 'Create Process'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ------------------------------------------------------------- */}
      {/* MODAL 2: ADD / EDIT ITEM PROCESS CARD */}
      {/* ------------------------------------------------------------- */}
      <Modal
        isOpen={isCardModalOpen}
        onClose={() => setIsCardModalOpen(false)}
        title={editingCard ? `Edit Process Card: ${editingCard.itemCode}` : 'Configure Item Process Routing Card'}
      >
        <form onSubmit={handleSaveCard} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxHeight: '78vh', overflowY: 'auto', paddingRight: '0.35rem' }}>
          {/* Finished Item & Raw Item Selection */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 700 }}>Finished Item (Item to Produce) *</label>
              <select
                className="input-field"
                required
                disabled={!!editingCard}
                value={selectedItemId}
                onChange={(e) => setSelectedItemId(e.target.value)}
              >
                <option value="">-- Choose Finished Item --</option>
                {items.map(it => (
                  <option key={it.id} value={it.id}>
                    {it.itemCode} - {it.name} ({it.category})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 700 }}>Raw Item (Source Raw Material) *</label>
              <select
                className="input-field"
                required
                value={selectedRawItemId}
                onChange={(e) => setSelectedRawItemId(e.target.value)}
              >
                <option value="">-- Choose Raw Item / Material --</option>
                {items.filter(i => i.id !== selectedItemId).map(it => (
                  <option key={it.id} value={it.id}>
                    {it.itemCode} - {it.name} ({it.category})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Sequential Process Steps Builder */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
              <div>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Workflow size={16} color="var(--accent-primary)" /> Sequential Manufacturing Steps
                </h4>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  Steps will be executed strictly in order from Step 1 to Step {steps.length}
                </div>
              </div>

              <button
                type="button"
                onClick={handleAddStepToCard}
                className="btn btn-secondary"
                style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
              >
                <Plus size={13} /> Add Step {steps.length + 1}
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {steps.map((step, idx) => {
                const previewCode = selectedItemObj ? `${selectedItemObj.itemCode}-${step.processShortCode}` : `ITEM-${step.processShortCode}`;
                const unselectedVendors = vendors.filter(v => !(step.vendorIds || []).includes(v.id));

                return (
                  <div key={idx} style={{ padding: '0.85rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: '0.5rem', border: '1px solid var(--border-color)', position: 'relative' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ 
                          width: '24px', 
                          height: '24px', 
                          borderRadius: '9999px', 
                          backgroundColor: 'var(--accent-primary)', 
                          color: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.75rem',
                          fontWeight: 800
                        }}>
                          {step.stepNumber}
                        </span>
                        <strong style={{ fontSize: '0.85rem' }}>Stage {step.stepNumber}: {step.processName}</strong>
                        <span 
                          className="badge badge-primary" 
                          style={{ fontSize: '0.68rem', fontFamily: 'monospace', cursor: 'help' }}
                          title={getProcessTooltip(step.processShortCode, step.processName, processDefinitions)}
                        >
                          {step.processShortCode}
                        </span>
                      </div>

                      {steps.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveStep(idx)}
                          className="btn btn-outline"
                          style={{ padding: '0.2rem 0.4rem', fontSize: '0.7rem', color: 'var(--danger)' }}
                        >
                          <X size={13} /> Remove
                        </button>
                      )}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.75rem', marginBottom: '0.65rem' }}>
                      <div>
                        <label style={{ fontSize: '0.72rem', fontWeight: 700 }}>Select Process *</label>
                        <select
                          className="input-field"
                          style={{ fontSize: '0.8rem', padding: '0.35rem' }}
                          value={step.processId}
                          onChange={(e) => handleStepProcessChange(idx, e.target.value)}
                        >
                          {processDefinitions.map(p => (
                            <option key={p.id} value={p.id}>{p.name} ({p.shortCode})</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Search & Add Authorized Vendors for this Step */}
                    <div style={{ marginTop: '0.35rem' }}>
                      <label style={{ fontSize: '0.72rem', fontWeight: 700, marginBottom: '0.3rem', display: 'block' }}>
                        Authorized Vendors for this Step (Jobwork Selection Filter) *
                      </label>

                      {/* Search & Add Vendor Row */}
                      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <select
                          className="input-field"
                          style={{ fontSize: '0.78rem', padding: '0.35rem', flex: 1 }}
                          value=""
                          onChange={(e) => {
                            if (e.target.value) {
                              handleAddVendorToStep(idx, e.target.value);
                            }
                          }}
                        >
                          <option value="">🔍 Search / Choose Vendor to Authorize ({unselectedVendors.length} available)...</option>
                          {unselectedVendors.map(v => (
                            <option key={v.id} value={v.id}>
                              {v.name} ({v.vendorCode})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Selected Authorized Vendor Tags with Priority Sequencing */}
                      <div style={{ 
                        display: 'flex', 
                        flexDirection: 'column', 
                        gap: '0.35rem', 
                        padding: '0.5rem', 
                        backgroundColor: 'var(--bg-card)', 
                        borderRadius: '0.375rem', 
                        border: '1px solid var(--border-color)',
                        minHeight: '36px'
                      }}>
                        {(!step.vendorIds || step.vendorIds.length === 0) ? (
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            No vendors authorized yet for this step. Select from dropdown above to establish Priority #1, #2 sequence.
                          </span>
                        ) : (
                          step.vendorIds.map((vId, vIdx) => {
                            const vObj = vendors.find(v => v.id === vId);
                            return (
                              <div 
                                key={vId} 
                                style={{ 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  justifyContent: 'space-between',
                                  gap: '0.5rem', 
                                  padding: '0.25rem 0.5rem', 
                                  backgroundColor: 'var(--bg-tertiary)', 
                                  borderRadius: '0.3rem', 
                                  border: '1px solid var(--border-color)',
                                  fontSize: '0.78rem'
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                                  <span className="badge badge-info" style={{ fontSize: '0.68rem', fontWeight: 700 }}>
                                    Priority #{vIdx + 1} {vIdx === 0 ? '(Primary)' : ''}
                                  </span>
                                  <strong style={{ color: 'var(--text-primary)' }}>{vObj?.name || vId}</strong>
                                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>({vObj?.vendorCode})</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                  <button
                                    type="button"
                                    className="btn btn-outline"
                                    style={{ padding: '0.1rem 0.35rem', fontSize: '0.68rem' }}
                                    disabled={vIdx === 0}
                                    onClick={() => handleMoveStepVendorPriority(idx, vIdx, 'up')}
                                    title="Move priority up"
                                  >
                                    ▲
                                  </button>
                                  <button
                                    type="button"
                                    className="btn btn-outline"
                                    style={{ padding: '0.1rem 0.35rem', fontSize: '0.68rem' }}
                                    disabled={vIdx === step.vendorIds.length - 1}
                                    onClick={() => handleMoveStepVendorPriority(idx, vIdx, 'down')}
                                    title="Move priority down"
                                  >
                                    ▼
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveVendorFromStep(idx, vId)}
                                    style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '0.1rem 0.25rem', display: 'flex', alignItems: 'center' }}
                                    title="Remove vendor"
                                  >
                                    <X size={13} />
                                  </button>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>

                    {/* Step Output Code Badge (Single latest process short code) */}
                    <div style={{ marginTop: '0.5rem', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      Intermediate Inventory SKU: <strong style={{ fontFamily: 'monospace', color: 'var(--accent-primary)' }}>{previewCode}</strong>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 700 }}>Routing Notes & Quality Directives</label>
            <textarea
              rows={2}
              placeholder="Special handling instructions, tolerance specs, or packaging requirements..."
              className="input-field"
              value={cardNotes}
              onChange={(e) => setCardNotes(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsCardModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              <Check size={14} /> {editingCard ? 'Update Process Card' : 'Save Process Card'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Bulk Upload Process Routes Modal */}
      {isBulkModalOpen && bulkParsedResult && (
        <Modal
          isOpen={isBulkModalOpen}
          onClose={() => {
            setIsBulkModalOpen(false);
            setBulkParsedResult(null);
          }}
          title={`Mass Process Route Ingestion Preview: ${bulkFileName}`}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '75vh', overflow: 'hidden' }}>
            {/* KPI Summary Banner */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
              <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: '0.5rem', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total Sheet Rows</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>{bulkParsedResult.totalRows}</div>
              </div>
              <div style={{ padding: '0.75rem', backgroundColor: 'rgba(16, 185, 129, 0.1)', borderRadius: '0.5rem', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                <div style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: 600 }}>Valid Routing Cards</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#10b981' }}>{bulkParsedResult.validCards.length} Cards</div>
              </div>
              <div style={{ padding: '0.75rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: '0.5rem', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                <div style={{ fontSize: '0.72rem', color: '#ef4444', fontWeight: 600 }}>Validation Errors</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ef4444' }}>{bulkParsedResult.errors.length}</div>
              </div>
            </div>

            {/* Error alerts if any */}
            {bulkParsedResult.errors.length > 0 && (
              <div style={{ padding: '0.75rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: '0.5rem', maxHeight: '100px', overflowY: 'auto' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#ef4444', marginBottom: '0.25rem' }}>
                  ⚠️ The following errors prevented routing creation:
                </div>
                {bulkParsedResult.errors.map((err, eIdx) => (
                  <div key={eIdx} style={{ fontSize: '0.72rem', color: '#fca5a5' }}>
                    • Row {err.rowNumber} [{err.identifier}]: {err.message}
                  </div>
                ))}
              </div>
            )}

            {/* Routing Cards Preview Table */}
            <div className="table-container" style={{ maxHeight: '340px', overflowY: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Finished Product (A)</th>
                    <th>Raw Casting (B)</th>
                    <th>Process Steps Sequence</th>
                    <th>Total Steps</th>
                  </tr>
                </thead>
                <tbody>
                  {bulkParsedResult.validCards.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                        No valid routing cards to preview.
                      </td>
                    </tr>
                  ) : (
                    bulkParsedResult.validCards.map((card, cIdx) => (
                      <tr key={cIdx}>
                        <td style={{ color: 'var(--text-muted)' }}>{cIdx + 1}</td>
                        <td>
                          <div style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>{card.itemName}</div>
                          <div style={{ fontSize: '0.72rem', fontFamily: 'monospace', color: 'var(--text-muted)' }}>{card.itemCode}</div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, color: '#d97706' }}>{card.rawItemName || 'Raw Material'}</div>
                          <div style={{ fontSize: '0.72rem', fontFamily: 'monospace', color: 'var(--text-muted)' }}>{card.rawItemCode || '-'}</div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', alignItems: 'center' }}>
                            {card.steps.map((st, sIdx) => (
                              <React.Fragment key={sIdx}>
                                <span 
                                  className="badge badge-purple" 
                                  style={{ fontSize: '0.68rem', padding: '0.2rem 0.45rem', cursor: 'help' }}
                                  title={getProcessTooltip(st.processShortCode, st.processName, processDefinitions)}
                                >
                                  {st.stepNumber}. {st.processName} ({st.processShortCode})
                                </span>
                                {sIdx < card.steps.length - 1 && <ArrowRight size={11} color="var(--text-muted)" />}
                              </React.Fragment>
                            ))}
                          </div>
                        </td>
                        <td style={{ fontWeight: 700 }}>{card.steps.length} Steps</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => {
                  setIsBulkModalOpen(false);
                  setBulkParsedResult(null);
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={bulkParsedResult.validCards.length === 0}
                onClick={handleConfirmBulkImport}
              >
                <Check size={14} /> Commit & Ingest {bulkParsedResult.validCards.length} Process Routes
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

