import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import { Modal } from '../common/Modal';
import { PrintManagerModal } from '../printTemplates/PrintManagerModal';
import { SingleJobCardPrintView, JobCardListPrintView } from '../printTemplates/JobCardPrintTemplates';
import { openLiveModuleSheet } from '../../utils/sheetFolderManager';
import { 
  ClipboardList, Plus, CheckCircle, Search, ArrowUp, ArrowDown, ArrowUpDown, Package, Printer, RefreshCw 
} from 'lucide-react';
import { JobCard, Item } from '../../types/erp';

type JCSortKey = 'jobCardNo' | 'itemType' | 'itemName' | 'woNumber' | 'targetQuantity' | 'completedQuantity' | 'assignedOperator' | 'status';

export const JobCardModule: React.FC = () => {
  const { 
    jobCards, items, workOrders, boms, addJobCard, updateJobCardProgress, closeJobCard 
  } = useERP();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedJC, setSelectedJC] = useState<JobCard | null>(null);
  const [progressQtyInput, setProgressQtyInput] = useState<number>(1);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [printDocType, setPrintDocType] = useState<'SINGLE_JC' | 'JC_LIST'>('JC_LIST');
  const [selectedPrintJC, setSelectedPrintJC] = useState<JobCard | null>(null);

  const [sortField, setSortField] = useState<JCSortKey>('jobCardNo');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Form State
  const [selectedItemId, setSelectedItemId] = useState('');
  const [selectedWOId, setSelectedWOId] = useState('');
  const [targetQuantity, setTargetQuantity] = useState(1);
  const [assignedOperator, setAssignedOperator] = useState('');
  const [remarks, setRemarks] = useState('');

  // Filter items that are In-house or Sub-Assembly
  const buildableItems = items.filter(i => 
    i.processType === 'In-house' || 
    i.category.includes('Assembly') || 
    i.category.includes('Machined') ||
    i.category === 'SA' ||
    i.category === 'FG'
  );

  const selectedItemObj = items.find(i => i.id === selectedItemId);

  const handleSort = (field: JCSortKey) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Compute maximum buildable units from stock
  const calculateMaxBuildable = (item: Item | undefined): number => {
    if (!item) return 0;
    const matchingBOM = boms.find(b => b.machineModel.includes(item.name) || b.bomCode.includes(item.itemCode) || b.components.some(c => c.itemId === item.id));
    if (!matchingBOM || matchingBOM.components.length === 0) {
      return 10;
    }

    let minBuildable = Infinity;
    matchingBOM.components.forEach(comp => {
      const partItem = items.find(i => i.id === comp.itemId || i.itemCode === comp.itemCode);
      const stock = partItem ? partItem.inHouseStock : 0;
      const possible = Math.floor(stock / (comp.qtyPerMachine || 1));
      if (possible < minBuildable) minBuildable = possible;
    });

    return minBuildable === Infinity ? 0 : minBuildable;
  };

  const maxPossible = selectedItemObj ? calculateMaxBuildable(selectedItemObj) : 0;

  const handleOpenCreateModal = () => {
    setSelectedItemId('');
    setSelectedWOId('');
    setTargetQuantity(1);
    setAssignedOperator('');
    setRemarks('');
    setIsModalOpen(true);
  };

  const handleCreateJobCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemObj) {
      alert('Please select an assembly or sub-assembly item.');
      return;
    }

    const linkedWO = workOrders.find(w => w.id === selectedWOId);
    const matchingBOM = boms.find(b => b.machineModel.includes(selectedItemObj.name) || b.bomCode.includes(selectedItemObj.itemCode));

    const components = matchingBOM ? matchingBOM.components.map(c => ({
      itemId: c.itemId || '',
      itemCode: c.itemCode || '',
      itemName: c.itemName || '',
      qtyPerUnit: c.qtyPerMachine || 1,
      totalRequiredQty: (c.qtyPerMachine || 1) * targetQuantity,
      issuedQty: (c.qtyPerMachine || 1) * targetQuantity,
      unit: c.unit || 'PCS'
    })) : [
      {
        itemId: selectedItemObj.id,
        itemCode: selectedItemObj.itemCode,
        itemName: selectedItemObj.name,
        qtyPerUnit: 1,
        totalRequiredQty: targetQuantity,
        issuedQty: targetQuantity,
        unit: selectedItemObj.unit
      }
    ];

    addJobCard({
      woId: linkedWO?.id,
      woNumber: linkedWO?.workOrderNo || linkedWO?.woNumber,
      itemId: selectedItemObj.id,
      itemCode: selectedItemObj.itemCode,
      itemName: selectedItemObj.name,
      itemType: selectedItemObj.category === 'FG' ? 'ASSEMBLY' : 'SUB_ASSEMBLY',
      targetQuantity: Number(targetQuantity),
      completedQuantity: 0,
      maxBuildableQuantity: maxPossible,
      assignedOperator,
      stationName: 'Main Assembly Bay',
      status: 'OPEN',
      type: 'PRODUCTION',
      startDate: new Date().toISOString().split('T')[0],
      remarks,
      components
    });

    setIsModalOpen(false);
  };

  const handleLogProgress = (jc: JobCard) => {
    if (progressQtyInput <= 0) return;
    updateJobCardProgress(jc.id, progressQtyInput);
    setSelectedJC(null);
  };

  const handleCloseAndStore = (jc: JobCard) => {
    if (!window.confirm(`Are you sure you want to close Job Card ${jc.jobCardNo}? Consumed components will be deducted from store and ${jc.targetQuantity} finished units will be credited to In-House Stock.`)) return;
    closeJobCard(jc.id);
  };
  // Universal @history search handling
  const isHistorySearch = searchQuery.toLowerCase().includes('@history');
  const cleanSearchTerm = searchQuery.replace(/@history/gi, '').trim().toLowerCase();

  const filteredJobCards = jobCards
    .filter(jc => {
      const matchesStatus = statusFilter === 'ALL' || jc.status === statusFilter;
      const matchesSearch = !cleanSearchTerm || 
        jc.jobCardNo.toLowerCase().includes(cleanSearchTerm) ||
        jc.itemName.toLowerCase().includes(cleanSearchTerm) ||
        (jc.woNumber && jc.woNumber.toLowerCase().includes(cleanSearchTerm)) ||
        (jc.assignedOperator && jc.assignedOperator.toLowerCase().includes(cleanSearchTerm));

      return matchesStatus && matchesSearch;
    })
    .sort((a, b) => {
      let valA: any = (a as any)[sortField] ?? '';
      let valB: any = (b as any)[sortField] ?? '';

      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

  const handlePrintSingleJC = (jc: JobCard) => {
    setSelectedPrintJC(jc);
    setPrintDocType('SINGLE_JC');
    setPrintModalOpen(true);
  };

  const handlePrintJCList = () => {
    setPrintDocType('JC_LIST');
    setPrintModalOpen(true);
  };

  const handleRefreshLiveSheet = () => {
    const data = filteredJobCards.map(jc => ({
      jobCardNo: jc.jobCardNo,
      woNumber: jc.woNumber || '-',
      itemCode: jc.itemCode,
      itemName: jc.itemName,
      targetQuantity: jc.targetQuantity,
      completedQuantity: jc.completedQuantity,
      assignedOperator: jc.assignedOperator || 'Technician',
      stationName: jc.stationName || 'Assembly Bay',
      status: jc.status
    }));

    const headers: { key: keyof typeof data[0]; label: string }[] = [
      { key: 'jobCardNo', label: 'Job Card No' },
      { key: 'woNumber', label: 'Work Order Ref' },
      { key: 'itemCode', label: 'Item Code' },
      { key: 'itemName', label: 'Component / Machine' },
      { key: 'targetQuantity', label: 'Target Qty' },
      { key: 'completedQuantity', label: 'Completed Qty' },
      { key: 'assignedOperator', label: 'Operator / Lead' },
      { key: 'stationName', label: 'Station Bay' },
      { key: 'status', label: 'Status' }
    ];

    openLiveModuleSheet('JobCards', 'GEC_ERP_Job_Cards_Live', data, headers);
  };

  return (
    <div className="module-layout-container">
      
      {/* Header */}
      <div className="sticky-module-header">
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
            <ClipboardList size={20} color="var(--accent-primary)" />
            Shopfloor Job Card & Sub-Assembly Execution
          </h2>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Stock-based buildability calculation &bull; Staged progress tracking &bull; Inventory deduction on close
          </span>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-outline" onClick={handleRefreshLiveSheet} title="Sync and maintain live CSV sheet">
            <RefreshCw size={14} /> Live Sheet
          </button>
          <button type="button" className="btn btn-outline" onClick={handlePrintJCList} title="Print filtered job cards report">
            <Printer size={14} /> Print Report
          </button>
          <button className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.45rem 1rem' }} onClick={handleOpenCreateModal}>
            <Plus size={16} />
            <span>Create Manual Job Card</span>
          </button>
        </div>
      </div>

      {/* Toolbar & Filters */}
      <div className="card" style={{ padding: '0.65rem 1rem', backgroundColor: 'var(--bg-card)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', width: '340px', maxWidth: '100%' }}>
            <Search size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              placeholder="Search Job Card No, item, WO... (type @history)"
              className="input-field"
              style={{ paddingLeft: '2.25rem', fontSize: '0.82rem' }}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {isHistorySearch && (
            <span className="badge" style={{ backgroundColor: '#7c3aed', color: '#ffffff', fontSize: '0.75rem', fontWeight: 700 }}>
              📜 History Search Active
            </span>
          )}
        </div>

        <div style={{ display: 'flex', gap: '0.35rem' }}>
          {['ALL', 'OPEN', 'IN_PROGRESS', 'COMPLETED'].map(status => (
            <button 
              key={status}
              className={`btn ${statusFilter === status ? 'btn-primary' : 'btn-outline'}`}
              style={{ padding: '0.25rem 0.6rem', fontSize: '0.78rem' }}
              onClick={() => setStatusFilter(status)}
            >
              {status.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Job Cards Table */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th onClick={() => handleSort('jobCardNo')} style={{ cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  Job Card No {sortField === 'jobCardNo' ? (sortOrder === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} />) : <ArrowUpDown size={12} color="var(--text-muted)" />}
                </div>
              </th>
              <th onClick={() => handleSort('itemType')} style={{ cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  Type {sortField === 'itemType' ? (sortOrder === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} />) : <ArrowUpDown size={12} color="var(--text-muted)" />}
                </div>
              </th>
              <th onClick={() => handleSort('itemName')} style={{ cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  Assembly / Item {sortField === 'itemName' ? (sortOrder === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} />) : <ArrowUpDown size={12} color="var(--text-muted)" />}
                </div>
              </th>
              <th onClick={() => handleSort('woNumber')} style={{ cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  Linked Work Order {sortField === 'woNumber' ? (sortOrder === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} />) : <ArrowUpDown size={12} color="var(--text-muted)" />}
                </div>
              </th>
              <th onClick={() => handleSort('targetQuantity')} style={{ cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  Target Qty {sortField === 'targetQuantity' ? (sortOrder === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} />) : <ArrowUpDown size={12} color="var(--text-muted)" />}
                </div>
              </th>
              <th onClick={() => handleSort('completedQuantity')} style={{ cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  Completed Progress {sortField === 'completedQuantity' ? (sortOrder === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} />) : <ArrowUpDown size={12} color="var(--text-muted)" />}
                </div>
              </th>
              <th onClick={() => handleSort('assignedOperator')} style={{ cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  Assigned Operator {sortField === 'assignedOperator' ? (sortOrder === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} />) : <ArrowUpDown size={12} color="var(--text-muted)" />}
                </div>
              </th>
              <th onClick={() => handleSort('status')} style={{ cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  Status {sortField === 'status' ? (sortOrder === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} />) : <ArrowUpDown size={12} color="var(--text-muted)" />}
                </div>
              </th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredJobCards.map(jc => {
              const isExchange = jc.type === 'EXCHANGE';
              const isComplete = jc.status === 'COMPLETED';

              return (
                <tr key={jc.id} style={{ backgroundColor: isExchange ? 'rgba(245, 158, 11, 0.05)' : 'transparent' }}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <span style={{ fontWeight: 700, fontFamily: 'monospace', color: 'var(--accent-primary)' }}>
                        {jc.jobCardNo}
                      </span>
                      {isExchange && (
                        <span className="badge badge-warning" style={{ fontSize: '0.65rem' }}>
                          EXCHANGE
                        </span>
                      )}
                      {isComplete && (
                        <span className="badge" style={{ backgroundColor: '#7c3aed', color: '#fff', fontSize: '0.65rem', padding: '0.1rem 0.35rem' }}>
                          📜 HISTORY
                        </span>
                      )}
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${jc.itemType === 'ASSEMBLY' ? 'badge-success' : 'badge-info'}`}>
                      {jc.itemType === 'ASSEMBLY' ? 'Assembly' : 'Sub-Assembly'}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{jc.itemName}</div>
                    <div style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--text-muted)' }}>{jc.itemCode}</div>
                  </td>
                  <td style={{ fontWeight: 600, fontFamily: 'monospace', color: 'var(--accent-primary)' }}>
                    {jc.woNumber || '-'}
                  </td>
                  <td style={{ fontWeight: 700 }}>
                    {jc.targetQuantity} Units
                    {jc.maxBuildableQuantity !== undefined && (
                      <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                        (Max from stock: {jc.maxBuildableQuantity})
                      </span>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{ flex: 1, height: '6px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '3px', overflow: 'hidden', minWidth: '60px' }}>
                        <div 
                          style={{ 
                            width: `${Math.min(100, Math.round((jc.completedQuantity / jc.targetQuantity) * 100))}%`, 
                            height: '100%', 
                            backgroundColor: isComplete ? 'var(--success)' : 'var(--accent-primary)' 
                          }} 
                        />
                      </div>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>
                        {jc.completedQuantity} / {jc.targetQuantity}
                      </span>
                    </div>
                  </td>
                  <td style={{ fontSize: '0.82rem' }}>
                    <div>{jc.assignedOperator || 'Floor Technician'}</div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{jc.stationName || 'Assembly Bay'}</span>
                  </td>
                  <td>
                    <span className={`badge ${
                      jc.status === 'COMPLETED' ? 'badge-success' :
                      jc.status === 'IN_PROGRESS' ? 'badge-primary' : 'badge-warning'
                    }`}>
                      {jc.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                      <button 
                        className="btn btn-outline" 
                        style={{ padding: '0.2rem 0.45rem' }} 
                        title="Print Single Job Card Traveller" 
                        onClick={() => handlePrintSingleJC(jc)}
                      >
                        <Printer size={14} />
                      </button>
                      {!isComplete && (
                        <>
                          <button 
                            className="btn btn-outline" 
                            style={{ padding: '0.2rem 0.45rem', fontSize: '0.75rem' }}
                            title="Update progress"
                            onClick={() => { setSelectedJC(jc); setProgressQtyInput(jc.completedQuantity + 1); }}
                          >
                            Update Qty
                          </button>
                          <button 
                            className="btn btn-primary" 
                            style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                            title="Close and credit to inventory"
                            onClick={() => handleCloseAndStore(jc)}
                          >
                            <CheckCircle size={13} /> Close
                          </button>
                        </>
                      )}
                      {isComplete && (
                        <span style={{ fontSize: '0.75rem', color: 'var(--success)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                          <CheckCircle size={14} /> In Stock
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal: Create Job Card */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Issue New Assembly Job Card">
        <form onSubmit={handleCreateJobCard} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          <div>
            <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--accent-primary)' }}>Select Assembly / Sub-Assembly Item *</label>
            <select 
              className="input-field" 
              required
              value={selectedItemId} 
              onChange={(e) => setSelectedItemId(e.target.value)}
            >
              <option value="" disabled>-- Select Assembly / Sub-Assembly Item --</option>
              {buildableItems.map(item => (
                <option key={item.id} value={item.id}>
                  {item.itemCode} - {item.name} ({item.processType || item.category})
                </option>
              ))}
            </select>
          </div>

          {/* Stock Suggestion Banner */}
          {selectedItemObj && (
            <div style={{ padding: '0.75rem 1rem', backgroundColor: 'rgba(59, 130, 246, 0.1)', borderRadius: '0.5rem', border: '1px solid rgba(59, 130, 246, 0.3)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Package size={20} color="var(--accent-primary)" />
              <div style={{ fontSize: '0.82rem' }}>
                <strong style={{ color: 'var(--text-primary)' }}>Stock Buildability Calculation:</strong>
                <span style={{ display: 'block', color: 'var(--accent-primary)', fontWeight: 700 }}>
                  💡 Maximum {maxPossible} unit(s) can be completely assembled from current in-house stock.
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  (You can create a Job Card for a higher quantity; missing parts will route to shortage planning).
                </span>
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: '0.82rem', fontWeight: 700 }}>Target Assembly Quantity</label>
              <input 
                type="number" 
                min="1" 
                required 
                className="input-field" 
                value={targetQuantity} 
                onChange={(e) => setTargetQuantity(Number(e.target.value))} 
              />
            </div>
            <div>
              <label style={{ fontSize: '0.82rem', fontWeight: 700 }}>Linked Work Order (Optional)</label>
              <select className="input-field" value={selectedWOId} onChange={(e) => setSelectedWOId(e.target.value)}>
                <option value="">-- No Direct WO (General Sub-Assembly Batch) --</option>
                {workOrders.map(w => (
                  <option key={w.id} value={w.id}>{w.workOrderNo || w.woNumber} ({w.machineModel})</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: '0.82rem', fontWeight: 700 }}>Assigned Lead Operator</label>
              <input 
                type="text" 
                required 
                className="input-field" 
                value={assignedOperator} 
                onChange={(e) => setAssignedOperator(e.target.value)} 
              />
            </div>
            <div>
              <label style={{ fontSize: '0.82rem', fontWeight: 700 }}>Special Instructions / Remarks</label>
              <input 
                type="text" 
                className="input-field" 
                placeholder="e.g. Test heating band resistance" 
                value={remarks} 
                onChange={(e) => setRemarks(e.target.value)} 
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary">
              <ClipboardList size={15} /> Issue Job Card
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Update Progress */}
      {selectedJC && (
        <Modal isOpen={!!selectedJC} onClose={() => setSelectedJC(null)} title={`Update Progress for ${selectedJC.jobCardNo}`}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <p style={{ fontSize: '0.85rem', margin: 0 }}>
              Enter updated completed quantity for <strong>{selectedJC.itemName}</strong>:
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input 
                type="number" 
                min="0" 
                max={selectedJC.targetQuantity} 
                className="input-field" 
                style={{ width: '120px', fontSize: '1rem', fontWeight: 700, textAlign: 'center' }}
                value={progressQtyInput}
                onChange={(e) => setProgressQtyInput(Number(e.target.value))}
              />
              <span style={{ fontWeight: 600 }}>/ {selectedJC.targetQuantity} Units</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button className="btn btn-secondary" onClick={() => setSelectedJC(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={() => handleLogProgress(selectedJC)}>
                Save Progress
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Feature-Wise Modular Print Manager Modal */}
      <PrintManagerModal
        isOpen={printModalOpen}
        onClose={() => { setPrintModalOpen(false); setSelectedPrintJC(null); }}
        title={printDocType === 'SINGLE_JC' ? `Print Job Card Traveller (${selectedPrintJC?.jobCardNo})` : 'Print Shopfloor Job Cards Report'}
        documentRefNumber={printDocType === 'SINGLE_JC' ? selectedPrintJC?.jobCardNo : 'JC-REPORT'}
      >
        {printDocType === 'SINGLE_JC' && selectedPrintJC ? (
          <SingleJobCardPrintView jobCard={selectedPrintJC} />
        ) : (
          <JobCardListPrintView jobCards={filteredJobCards} filterLabel={isHistorySearch ? 'All Active & Completed Job Cards' : 'Active Shopfloor Job Cards'} />
        )}
      </PrintManagerModal>
    </div>
  );
};
