import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import { Modal } from '../common/Modal';
import { PrintManagerModal } from '../printTemplates/PrintManagerModal';
import { SingleJobCardPrintView, JobCardListPrintView } from '../printTemplates/JobCardPrintTemplates';
import { TabularShortagePrintView } from '../printTemplates/ShortagePrintTemplates';
import { openLiveModuleSheet } from '../../utils/sheetFolderManager';
import { 
  ClipboardList, Plus, CheckCircle, Search, ArrowUp, ArrowDown, ArrowUpDown, Package, Printer, RefreshCw, AlertTriangle, Layers, X, CheckCircle2 
} from 'lucide-react';
import { JobCard, Item } from '../../types/erp';

type JCSortKey = 'jobCardNo' | 'itemType' | 'itemName' | 'woNumber' | 'targetQuantity' | 'completedQuantity' | 'assignedOperator' | 'status';

export const JobCardModule: React.FC = () => {
  const { 
    jobCards, items, workOrders, boms, addJobCard, updateJobCardProgress, closeJobCard,
    jobCardMaterialReissues, addJobCardMaterialReissue, currentUser 
  } = useERP();

  const [activeMainTab, setActiveMainTab] = useState<'JOB_CARDS' | 'REISSUES'>('JOB_CARDS');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isReissueModalOpen, setIsReissueModalOpen] = useState(false);
  const [isShortageWizardOpen, setIsShortageWizardOpen] = useState(false);
  const [isExplodeShortage, setIsExplodeShortage] = useState(false);
  const [isShortagePrintOpen, setIsShortagePrintOpen] = useState(false);
  const [wizardSearchTerm, setWizardSearchTerm] = useState('');
  const [selectedJC, setSelectedJC] = useState<JobCard | null>(null);
  const [progressQtyInput, setProgressQtyInput] = useState<number>(1);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [startDateFilter, setStartDateFilter] = useState<string>('');
  const [endDateFilter, setEndDateFilter] = useState<string>('');

  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [printDocType, setPrintDocType] = useState<'SINGLE_JC' | 'JC_LIST'>('JC_LIST');
  const [selectedPrintJC, setSelectedPrintJC] = useState<JobCard | null>(null);

  const [sortField, setSortField] = useState<JCSortKey>('jobCardNo');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Form State for Job Card
  const [selectedItemId, setSelectedItemId] = useState('');
  const [selectedWOId, setSelectedWOId] = useState('');
  const [targetQuantity, setTargetQuantity] = useState(1);
  const [assignedOperator, setAssignedOperator] = useState('');
  const [remarks, setRemarks] = useState('');

  // Material Re-Issue Form State
  const [reissueForm, setReissueForm] = useState({
    workerName: '',
    supervisorName: '',
    reason: 'Damaged during machining / assembly',
    itemId: '',
    quantity: 1,
    jobCardId: '',
    notes: ''
  });
  const [reissueItemSearch, setReissueItemSearch] = useState('');

  // Helper: Item Work Order Demand (Multi-Level Exploded & woComponents supported)
  const getItemWorkOrderDemand = (itemId: string, itemCode: string) => {
    let demand = 0;
    const activeWOs = workOrders.filter(w => w.status !== 'COMPLETED' && w.status !== 'CANCELLED');

    const explodeDemand = (
      components: Array<{ itemId?: string; itemCode?: string; qtyPerMachine?: number; qtyRequired?: number }>,
      multiplier: number,
      visited = new Set<string>()
    ) => {
      components.forEach(comp => {
        const cItemId = comp.itemId || '';
        const cItemCode = comp.itemCode || '';
        const qtyPer = comp.qtyPerMachine !== undefined ? comp.qtyPerMachine : (comp.qtyRequired || 1);
        const totalCompQty = qtyPer * multiplier;

        if (
          (itemId && cItemId && cItemId === itemId) ||
          (itemCode && cItemCode && cItemCode.toLowerCase() === itemCode.toLowerCase())
        ) {
          demand += totalCompQty;
        }

        const childItem = items.find(i => (cItemId && i.id === cItemId) || (cItemCode && i.itemCode.toLowerCase() === cItemCode.toLowerCase()));
        if (childItem) {
          const subBOM = boms.find(b => b.id === childItem.id || b.bomCode?.toLowerCase() === childItem.itemCode.toLowerCase() || b.machineModel?.toLowerCase() === childItem.name?.toLowerCase());
          if (subBOM && subBOM.components && subBOM.components.length > 0 && !visited.has(subBOM.id)) {
            const nextVisited = new Set(visited);
            nextVisited.add(subBOM.id);
            explodeDemand(subBOM.components, totalCompQty, nextVisited);
          }
        }
      });
    };

    activeWOs.forEach(wo => {
      const remainingQty = Math.max(0, (wo.targetQuantity || wo.quantity || 1) - (wo.completedQuantity || 0));
      if (remainingQty <= 0) return;

      if (wo.woComponents && wo.woComponents.length > 0) {
        explodeDemand(wo.woComponents.map(c => ({
          itemId: c.itemId,
          itemCode: c.itemCode,
          qtyPerMachine: c.qtyRequired ? c.qtyRequired / (wo.quantity || wo.targetQuantity || 1) : 1
        })), remainingQty);
      } else {
        const bom = boms.find(b => b.id === wo.bomId || b.bomCode === (wo as any).bomCode || b.machineModel?.toLowerCase() === wo.machineModel?.toLowerCase());
        if (bom && bom.components) {
          explodeDemand(bom.components, remainingQty, new Set([bom.id]));
        }
      }
    });

    return demand;
  };

  // Shortage Calculation for In-House manufactured & Final Product components
  const isInHouseItem = (item: Item) => {
    const p = (item.processType || (item as any).materialProcessType || '').toLowerCase();
    const cat = (item.category || '').toUpperCase();
    return p.includes('in-house') || p.includes('inhouse') || cat === 'MF' || cat === 'AS' || cat === 'FAS' || cat === 'SA' || cat === 'LC' || cat === 'FP' || cat === 'FG' || cat.includes('FINAL') || cat.includes('ASSEMBLY');
  };

  const getInHouseItemShortage = (item: Item) => {
    const currentStock = item.inHouseStock || 0;
    const minReq = item.minStockQty !== undefined ? item.minStockQty : (item.reorderLevel || 0);

    // Check WO demand for this machine / final product model
    let woDemand = getItemWorkOrderDemand(item.id, item.itemCode);
    workOrders.filter(w => w.status === 'PLANNED' || w.status === 'IN_PROGRESS').forEach(wo => {
      if (wo.machineModel === item.name || wo.machineModel === item.itemCode || wo.bomId === item.id) {
        woDemand += (wo.quantity || 1);
      }
    });

    const pendingJCQty = jobCards
      .filter(jc => jc.status !== 'COMPLETED' && jc.status !== 'CANCELLED')
      .reduce((sum, jc) => {
        if (jc.itemId === item.id || jc.itemCode === item.itemCode) {
          return sum + Math.max(0, (jc.targetQuantity || 1) - (jc.completedQuantity || 0));
        }
        return sum;
      }, 0);

    const totalRequired = woDemand + minReq;
    return Math.max(0, totalRequired - (currentStock + pendingJCQty));
  };

  // Helper to check if item has BOM or Process defined
  const hasBOMorProcess = (item: Item) => {
    const hasBOM = boms.some(b => 
      b.id === item.id || 
      b.bomCode === item.itemCode || 
      b.machineModel?.toLowerCase() === item.name.toLowerCase() ||
      b.machineModel?.toLowerCase() === item.itemCode.toLowerCase()
    );
    const p = (item.processType || (item as any).materialProcessType || (item as any).process || '').toLowerCase();
    const hasProcess = p.includes('in-house') || p.includes('inhouse') || p.includes('manufactur') || p.includes('assembly') || !!(item as any).processSteps || !!(item as any).processes;
    return hasBOM || hasProcess;
  };

  const inHouseShortageItems = items.filter(i => isInHouseItem(i) && !i.isBlocked && hasBOMorProcess(i) && getInHouseItemShortage(i) > 0);

  const handleOpenShortageJCModal = (item: Item) => {
    const shortage = getInHouseItemShortage(item);
    setSelectedItemId(item.id);
    setSelectedWOId('');
    setTargetQuantity(Math.max(1, shortage));
    setAssignedOperator('In-House Assembly Lead');
    setRemarks(`Job card generated directly from in-house shortage requirement (${shortage} ${item.unit}).`);
    setIsModalOpen(true);
  };

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

  const handleSaveMaterialReissue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reissueForm.workerName.trim()) {
      alert('Please enter worker / operator name.');
      return;
    }
    if (!reissueForm.itemId) {
      alert('Please select an item to re-issue.');
      return;
    }
    const itemObj = items.find(i => i.id === reissueForm.itemId);
    if (!itemObj) return;

    if (itemObj.inHouseStock < reissueForm.quantity) {
      alert(`⚠️ Insufficient store stock! Available: ${itemObj.inHouseStock} ${itemObj.unit}, Requested: ${reissueForm.quantity} ${itemObj.unit}.`);
      return;
    }

    const matchingJC = jobCards.find(j => j.id === reissueForm.jobCardId);

    addJobCardMaterialReissue({
      jobCardId: matchingJC?.id || 'DIRECT',
      jobCardNo: matchingJC?.jobCardNo || '-',
      workerName: reissueForm.workerName,
      supervisorName: reissueForm.supervisorName || currentUser?.fullName || 'Supervisor',
      itemId: itemObj.id,
      itemCode: itemObj.itemCode,
      itemName: itemObj.name,
      quantity: Number(reissueForm.quantity),
      unit: itemObj.unit,
      reason: reissueForm.reason,
      issuedDate: new Date().toISOString().split('T')[0],
      status: 'ISSUED',
      notes: reissueForm.notes
    });

    setIsReissueModalOpen(false);
    setReissueForm({
      workerName: '',
      supervisorName: '',
      reason: 'Damaged during machining / assembly',
      itemId: '',
      quantity: 1,
      jobCardId: '',
      notes: ''
    });
    setReissueItemSearch('');
    alert(`✅ Material Re-Issue logged successfully! ${reissueForm.quantity} ${itemObj.unit} of ${itemObj.itemCode} deducted from in-house stock.`);
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

      if (!matchesStatus || !matchesSearch) return false;

      if (startDateFilter && jc.startDate && jc.startDate < startDateFilter) return false;
      if (endDateFilter && jc.startDate && jc.startDate > endDateFilter) return false;

      return true;
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

  const getWizardTableRows = () => {
    const term = wizardSearchTerm.trim().toLowerCase();

    if (!isExplodeShortage) {
      return inHouseShortageItems
        .filter(item => {
          if (!term) return true;
          return item.itemCode.toLowerCase().includes(term) || item.name.toLowerCase().includes(term) || item.category.toLowerCase().includes(term);
        })
        .map((item, idx) => {
          const reqQty = getItemWorkOrderDemand(item.id, item.itemCode) || (item.minStockQty || 5);
          const currentStock = item.inHouseStock || 0;
          const shortage = getInHouseItemShortage(item);
          const maxBuildable = calculateMaxBuildable(item);

          return {
            srNo: idx + 1,
            item,
            itemDescription: item.name,
            partCode: item.itemCode,
            requiredQty: reqQty,
            currentStock,
            shortage,
            maxBuildable,
            unit: item.unit,
            extraInfo: item.category ? `Class: ${item.category}` : undefined
          };
        });
    }

    // Exploded View across active WOs
    const explodedRows: Array<{
      srNo: number;
      item: Item;
      itemDescription: string;
      partCode: string;
      requiredQty: number;
      currentStock: number;
      shortage: number;
      maxBuildable: number;
      unit: string;
      extraInfo?: string;
    }> = [];

    let count = 1;
    const activeWOs = workOrders.filter(w => w.status !== 'COMPLETED' && w.status !== 'CANCELLED');

    activeWOs.forEach(wo => {
      const bom = boms.find(b => b.id === wo.bomId || b.bomCode === (wo as any).bomCode || b.machineModel?.toLowerCase() === wo.machineModel?.toLowerCase());
      if (!bom || !bom.components) return;

      bom.components.forEach(comp => {
        const it = items.find(i => i.id === comp.itemId || i.itemCode === comp.itemCode);
        if (!it || !isInHouseItem(it) || it.isBlocked) return;

        const reqQty = (comp.qtyPerMachine || 1) * (wo.quantity || 1);
        const currentStock = it.inHouseStock || 0;
        const shortage = getInHouseItemShortage(it);
        const maxBuildable = calculateMaxBuildable(it);

        if (shortage <= 0 && currentStock >= reqQty) return;

        if (term) {
          const matches = it.itemCode.toLowerCase().includes(term) ||
            it.name.toLowerCase().includes(term) ||
            (wo.workOrderNo && wo.workOrderNo.toLowerCase().includes(term)) ||
            (wo.machineModel && wo.machineModel.toLowerCase().includes(term));
          if (!matches) return;
        }

        explodedRows.push({
          srNo: count++,
          item: it,
          itemDescription: it.name,
          partCode: it.itemCode,
          requiredQty: reqQty,
          currentStock,
          shortage,
          maxBuildable,
          unit: it.unit,
          extraInfo: `WO: ${wo.workOrderNo || wo.woNumber} (${wo.machineModel}) - Target Qty: ${wo.quantity} units`
        });
      });
    });

    return explodedRows;
  };

  const wizardTableRows = getWizardTableRows();

  return (
    <div className="module-layout-container">
      
      {/* Header */}
      <div className="sticky-module-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {isShortageWizardOpen ? (
            <>
              <button className="btn btn-outline" style={{ padding: '0.35rem 0.65rem', gap: '0.35rem', fontWeight: 600 }} onClick={() => setIsShortageWizardOpen(false)}>
                <X size={16} /> Back to Job Cards <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>(ESC)</span>
              </button>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
                <ClipboardList size={20} color="var(--accent-primary)" />
                In-House Shortage Job Card Wizard
              </h2>
            </>
          ) : (
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <button 
                className={`btn ${activeMainTab === 'JOB_CARDS' ? 'btn-primary' : 'btn-outline'}`}
                style={{ fontWeight: 700, padding: '0.45rem 1rem', fontSize: '0.88rem' }}
                onClick={() => setActiveMainTab('JOB_CARDS')}
              >
                📋 Job Cards ({jobCards.length})
              </button>
              <button 
                className={`btn ${activeMainTab === 'REISSUES' ? 'btn-primary' : 'btn-outline'}`}
                style={{ fontWeight: 700, padding: '0.45rem 1rem', fontSize: '0.88rem' }}
                onClick={() => setActiveMainTab('REISSUES')}
              >
                🛠️ Material Re-Issue ({(jobCardMaterialReissues || []).length})
              </button>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <button type="button" className="btn btn-outline" onClick={handleRefreshLiveSheet} title="Sync and maintain live CSV sheet">
            <RefreshCw size={14} /> Live Sheet
          </button>
          <button type="button" className="btn btn-outline" onClick={handlePrintJCList} title="Print filtered job cards report">
            <Printer size={14} /> Print Report
          </button>
          {activeMainTab === 'REISSUES' && !isShortageWizardOpen && (
            <button 
              type="button"
              className="btn btn-warning" 
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.45rem 0.9rem', color: '#fff', backgroundColor: '#d97706', borderColor: '#d97706', fontWeight: 700 }} 
              onClick={() => setIsReissueModalOpen(true)}
            >
              <Package size={15} />
              <span>🛠️ Material Re-Issue</span>
            </button>
          )}
          {activeMainTab === 'JOB_CARDS' && !isShortageWizardOpen && (
            <>
              <button 
                type="button"
                className="btn btn-outline" 
                onClick={() => { setIsShortageWizardOpen(true); setWizardSearchTerm(''); }}
              >
                <AlertTriangle size={14} color="var(--warning)" /> Shortage Job Card Wizard
              </button>
              <button className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.45rem 1rem' }} onClick={handleOpenCreateModal}>
                <Plus size={16} />
                <span>Create Manual Job Card</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tabular Shortage Job Card Wizard View */}
      {isShortageWizardOpen ? (
        <div className="card" style={{ padding: '1.25rem', backgroundColor: 'var(--bg-card)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertTriangle size={18} color="var(--warning)" />
                In-House Shortage Job Card Wizard (Tabular Matrix)
              </h3>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                Review in-house manufactured parts below minimum requirement and generate Job Cards directly.
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <button 
                type="button" 
                className="btn btn-outline" 
                style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
                onClick={() => setIsShortagePrintOpen(true)}
              >
                <Printer size={14} /> Print Shortage Table
              </button>
              <button type="button" className="btn btn-outline" style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem' }} onClick={() => setIsShortageWizardOpen(false)}>
                <X size={15} /> Close (ESC)
              </button>
            </div>
          </div>

          {/* Search Bar for Shortage Items */}
          <div style={{ position: 'relative', width: '100%' }}>
            <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search shortage component, code, class... (or filter exploded rows)"
              className="input-field"
              style={{ paddingLeft: '2.25rem' }}
              value={wizardSearchTerm}
              onChange={(e) => setWizardSearchTerm(e.target.value)}
            />
          </div>

          {/* Tabular Shortage Matrix */}
          {wizardTableRows.length === 0 ? (
            <div style={{ padding: '2.5rem', textAlign: 'center', backgroundColor: 'var(--bg-tertiary)', borderRadius: '0.5rem', color: 'var(--success)' }}>
              <CheckCircle2 size={36} style={{ marginBottom: '0.5rem' }} />
              <div style={{ fontWeight: 800, fontSize: '1.05rem' }}>All in-house assemblies have sufficient stock levels!</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                No component shortages currently require shopfloor Job Card creation.
              </div>
            </div>
          ) : (
            <div className="table-container" style={{ maxHeight: '500px', overflowY: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th style={{ width: '45px', textAlign: 'center' }}>Sr No</th>
                    <th>Assembly / Item Description</th>
                    <th>Part Code</th>
                    <th style={{ textAlign: 'right' }}>Required Quantity</th>
                    <th style={{ textAlign: 'right' }}>Current In-House Stock</th>
                    <th style={{ textAlign: 'right' }}>Shortage</th>
                    <th style={{ textAlign: 'right' }}>Max Buildable</th>
                    <th style={{ width: '150px', textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {wizardTableRows.map((row, idx) => (
                    <tr key={idx} style={{ backgroundColor: row.shortage > 0 ? 'rgba(239, 68, 68, 0.04)' : 'transparent' }}>
                      <td style={{ textAlign: 'center', fontWeight: 600 }}>{idx + 1}</td>
                      <td>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{row.itemDescription}</div>
                        {row.extraInfo && (
                          <div style={{ fontSize: '0.72rem', color: 'var(--accent-primary)', fontWeight: 600, marginTop: '0.15rem' }}>
                            {row.extraInfo}
                          </div>
                        )}
                      </td>
                      <td>
                        <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--accent-primary)' }}>
                          {row.partCode}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>
                        {row.requiredQty} {row.unit}
                      </td>
                      <td style={{ textAlign: 'right', color: row.currentStock <= 0 ? 'var(--danger)' : 'var(--text-primary)' }}>
                        {row.currentStock} {row.unit}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <span className="badge badge-danger" style={{ fontWeight: 800, fontSize: '0.8rem', padding: '0.2rem 0.5rem' }}>
                          {row.shortage} {row.unit}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: row.maxBuildable >= row.shortage ? 'var(--success)' : 'var(--warning)' }}>
                        {row.maxBuildable} {row.unit}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          className="btn btn-primary"
                          style={{ padding: '0.3rem 0.65rem', fontSize: '0.78rem', fontWeight: 700, gap: '0.3rem', display: 'inline-flex', alignItems: 'center' }}
                          onClick={() => {
                            setIsShortageWizardOpen(false);
                            handleOpenShortageJCModal(row.item);
                          }}
                        >
                          <Plus size={13} /> Create Job Card
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <>

      {/* Toolbar & Filters */}
      <div className="card" style={{ padding: '0.65rem 1rem', backgroundColor: 'var(--bg-card)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', flex: 1 }}>
          <div style={{ position: 'relative', width: '320px', maxWidth: '100%' }}>
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

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>From:</span>
            <input
              type="date"
              className="input-field"
              style={{ padding: '0.3rem 0.5rem', fontSize: '0.8rem', width: '135px' }}
              value={startDateFilter}
              onChange={(e) => setStartDateFilter(e.target.value)}
              title="Filter by start date"
            />
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>To:</span>
            <input
              type="date"
              className="input-field"
              style={{ padding: '0.3rem 0.5rem', fontSize: '0.8rem', width: '135px' }}
              value={endDateFilter}
              onChange={(e) => setEndDateFilter(e.target.value)}
              title="Filter by start date"
            />
            {(startDateFilter || endDateFilter) && (
              <button
                className="btn btn-outline"
                style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', color: 'var(--danger)' }}
                onClick={() => {
                  setStartDateFilter('');
                  setEndDateFilter('');
                }}
                title="Clear Date Filters"
              >
                Clear Dates
              </button>
            )}
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

      {/* Main Table Views */}
      {activeMainTab === 'REISSUES' ? (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Re-Issue ID</th>
                <th>Date & Time</th>
                <th>Worker / Operator</th>
                <th>Supervisor / Allocator</th>
                <th>Item Re-Issued</th>
                <th>Quantity</th>
                <th>Reason / Root Cause</th>
                <th>Linked Job Card</th>
                <th>Audit Notes</th>
              </tr>
            </thead>
            <tbody>
              {(!jobCardMaterialReissues || jobCardMaterialReissues.length === 0) ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                    No Material Re-Issues recorded yet. Click "🛠️ Material Re-Issue (Lost/Damaged Goods)" to log replacement items for damaged or lost shopfloor components.
                  </td>
                </tr>
              ) : (
                jobCardMaterialReissues
                  .filter(r => {
                    if (!cleanSearchTerm) return true;
                    return (
                      r.reissueNo.toLowerCase().includes(cleanSearchTerm) ||
                      r.workerName.toLowerCase().includes(cleanSearchTerm) ||
                      r.itemCode.toLowerCase().includes(cleanSearchTerm) ||
                      r.itemName.toLowerCase().includes(cleanSearchTerm) ||
                      r.reason.toLowerCase().includes(cleanSearchTerm) ||
                      (r.jobCardNo && r.jobCardNo.toLowerCase().includes(cleanSearchTerm))
                    );
                  })
                  .map(reissue => (
                    <tr key={reissue.id}>
                      <td style={{ fontWeight: 700, fontFamily: 'monospace', color: 'var(--warning)' }}>
                        {reissue.reissueNo}
                      </td>
                      <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                        {reissue.issuedDate}
                      </td>
                      <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                        👤 {reissue.workerName}
                      </td>
                      <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        {reissue.supervisorName}
                      </td>
                      <td>
                        <strong>{reissue.itemName}</strong>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                          {reissue.itemCode}
                        </div>
                      </td>
                      <td style={{ fontWeight: 800, color: 'var(--danger)', fontSize: '0.95rem' }}>
                        {reissue.quantity} {reissue.unit}
                      </td>
                      <td>
                        <span className="badge badge-warning" style={{ fontSize: '0.75rem' }}>
                          {reissue.reason}
                        </span>
                      </td>
                      <td style={{ fontFamily: 'monospace', color: 'var(--accent-primary)', fontWeight: 600 }}>
                        {reissue.jobCardNo || '-'}
                      </td>
                      <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                        {reissue.notes || '-'}
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th onClick={() => handleSort('jobCardNo')} style={{ cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    Job Card No {sortField === 'jobCardNo' ? (sortOrder === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} />) : <ArrowUpDown size={12} color="var(--text-muted)" />}
                  </div>
                </th>
                <th>Type</th>
                <th onClick={() => handleSort('itemName')} style={{ cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    Item Code & Name {sortField === 'itemName' ? (sortOrder === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} />) : <ArrowUpDown size={12} color="var(--text-muted)" />}
                  </div>
                </th>
                <th onClick={() => handleSort('woNumber')} style={{ cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    Work Order {sortField === 'woNumber' ? (sortOrder === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} />) : <ArrowUpDown size={12} color="var(--text-muted)" />}
                  </div>
                </th>
                <th onClick={() => handleSort('targetQuantity')} style={{ cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    Target Qty {sortField === 'targetQuantity' ? (sortOrder === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} />) : <ArrowUpDown size={12} color="var(--text-muted)" />}
                  </div>
                </th>
                <th onClick={() => handleSort('completedQuantity')} style={{ cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    Progress {sortField === 'completedQuantity' ? (sortOrder === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} />) : <ArrowUpDown size={12} color="var(--text-muted)" />}
                  </div>
                </th>
                <th onClick={() => handleSort('assignedOperator')} style={{ cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    Operator {sortField === 'assignedOperator' ? (sortOrder === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} />) : <ArrowUpDown size={12} color="var(--text-muted)" />}
                  </div>
                </th>
                <th>Status</th>
                <th style={{ width: '160px', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredJobCards.map(jc => {
                const progressPct = Math.round(((jc.completedQuantity || 0) / (jc.targetQuantity || 1)) * 100);
                const isComplete = jc.status === 'COMPLETED';

                return (
                  <tr key={jc.id} onDoubleClick={() => handlePrintSingleJC(jc)} style={{ cursor: 'pointer' }} title="Double click to print Job Card Traveller">
                    <td style={{ fontWeight: 700, color: 'var(--accent-primary)', fontFamily: 'monospace' }}>
                      {jc.jobCardNo}
                    </td>
                    <td>
                      <span className={`badge ${jc.itemType === 'ASSEMBLY' ? 'badge-primary' : 'badge-neutral'}`} style={{ fontSize: '0.72rem' }}>
                        {jc.itemType || 'SUB_ASSEMBLY'}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{jc.itemName}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                        {jc.itemCode}
                      </div>
                    </td>
                    <td>
                      {jc.woNumber ? (
                        <span className="badge badge-info" style={{ fontSize: '0.72rem' }}>{jc.woNumber}</span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>Stock Batch</span>
                      )}
                    </td>
                    <td style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                      {jc.targetQuantity}
                    </td>
                    <td style={{ minWidth: '130px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.2rem' }}>
                        <span style={{ fontWeight: 600 }}>{jc.completedQuantity} / {jc.targetQuantity}</span>
                        <span style={{ color: 'var(--text-muted)' }}>{progressPct}%</span>
                      </div>
                      <div style={{ height: '6px', backgroundColor: 'var(--border-color)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div 
                          style={{ 
                            height: '100%', 
                            width: `${progressPct}%`, 
                            backgroundColor: isComplete ? 'var(--success)' : 'var(--accent-primary)',
                            borderRadius: '3px'
                          }} 
                        />
                      </div>
                    </td>
                    <td style={{ fontSize: '0.85rem' }}>
                      {jc.assignedOperator || 'Unassigned'}
                    </td>
                    <td>
                      <span className={`badge ${
                        jc.status === 'COMPLETED' ? 'badge-success' : 
                        jc.status === 'IN_PROGRESS' ? 'badge-warning' : 'badge-neutral'
                      }`}>
                        {jc.status}
                      </span>
                    </td>
                    <td onClick={(e) => e.stopPropagation()} style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'center', alignItems: 'center' }}>
                        <button 
                          className="btn btn-outline" 
                          style={{ padding: '0.2rem 0.4rem', fontSize: '0.75rem' }} 
                          title="Print Job Card Traveller"
                          onClick={() => handlePrintSingleJC(jc)}
                        >
                          <Printer size={13} />
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
      )}
      </>
      )}

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
                value={targetQuantity === 0 ? '' : targetQuantity} 
                onChange={(e) => setTargetQuantity(e.target.value === '' ? 0 : Number(e.target.value))} 
                onBlur={(e) => { if (!e.target.value || Number(e.target.value) < 1) setTargetQuantity(1); }}
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
                value={progressQtyInput === 0 ? '' : progressQtyInput}
                onChange={(e) => setProgressQtyInput(e.target.value === '' ? 0 : Number(e.target.value))}
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

      {/* Modal: Material Re-Issue / Damaged Goods Replacement */}
      {isReissueModalOpen && (
        <Modal 
          isOpen={isReissueModalOpen} 
          onClose={() => setIsReissueModalOpen(false)} 
          title="🛠️ Re-Issue Shopfloor Material (Lost / Damaged Goods Replacement)"
        >
          <form onSubmit={handleSaveMaterialReissue} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ padding: '0.65rem 0.85rem', backgroundColor: 'rgba(217, 119, 6, 0.1)', border: '1px solid #d97706', borderRadius: '0.375rem', fontSize: '0.8rem', color: '#d97706' }}>
              <strong>📋 Material Re-Issue System:</strong> This will register an audit record and automatically deduct the replacement components from physical In-House Store inventory.
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 700 }}>Worker / Operator Name *</label>
                <input 
                  type="text" 
                  required 
                  className="input-field" 
                  placeholder="e.g. Ramesh Patel / Assembly Lead"
                  value={reissueForm.workerName} 
                  onChange={(e) => setReissueForm({ ...reissueForm, workerName: e.target.value })} 
                />
              </div>
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 700 }}>Supervisor / Allocator</label>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="e.g. Production Manager"
                  value={reissueForm.supervisorName} 
                  onChange={(e) => setReissueForm({ ...reissueForm, supervisorName: e.target.value })} 
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.82rem', fontWeight: 700 }}>Reason / Cause for Re-Issue *</label>
              <input 
                type="text" 
                required
                className="input-field" 
                placeholder="Enter reason / cause for re-issue (e.g. Broken in transport, damaged during machining)..."
                value={reissueForm.reason} 
                onChange={(e) => setReissueForm({ ...reissueForm, reason: e.target.value })}
              />
            </div>

            {/* Item Selection with Search Bar */}
            <div>
              <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--accent-primary)' }}>Select Replacement Item *</label>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.35rem' }}>
                <input 
                  type="text" 
                  placeholder="🔍 Search items by code, name, category..." 
                  className="input-field"
                  style={{ fontSize: '0.8rem', padding: '0.35rem 0.6rem' }}
                  value={reissueItemSearch}
                  onChange={(e) => setReissueItemSearch(e.target.value)}
                />
              </div>
              <select 
                className="input-field" 
                required 
                value={reissueForm.itemId} 
                onChange={(e) => setReissueForm({ ...reissueForm, itemId: e.target.value })}
              >
                <option value="" disabled>-- Select Replacement Component from Store --</option>
                {items
                  .filter(it => !it.isBlocked)
                  .filter(it => {
                    if (!reissueItemSearch.trim()) return true;
                    const term = reissueItemSearch.toLowerCase();
                    return it.itemCode.toLowerCase().includes(term) || it.name.toLowerCase().includes(term) || it.category.toLowerCase().includes(term);
                  })
                  .map(it => (
                    <option key={it.id} value={it.id}>
                      {it.itemCode} - {it.name} [{it.category}] (Stock: {it.inHouseStock} {it.unit})
                    </option>
                  ))}
              </select>
            </div>

            {/* Item Stock and Quantity */}
            {(() => {
              const selItem = items.find(i => i.id === reissueForm.itemId);
              return (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ fontSize: '0.82rem', fontWeight: 700 }}>
                      Quantity to Re-Issue {selItem ? `(${selItem.unit})` : ''} *
                    </label>
                    <input 
                      type="number" 
                      min="1" 
                      max={selItem?.inHouseStock || 9999}
                      required 
                      className="input-field" 
                      value={reissueForm.quantity === 0 ? '' : reissueForm.quantity} 
                      onChange={(e) => setReissueForm({ ...reissueForm, quantity: e.target.value === '' ? 0 : Number(e.target.value) })}
                      onBlur={(e) => { if (!e.target.value || Number(e.target.value) < 1) setReissueForm({ ...reissueForm, quantity: 1 }); }} 
                    />
                    {selItem && (
                      <div style={{ fontSize: '0.72rem', color: selItem.inHouseStock < reissueForm.quantity ? 'var(--danger)' : 'var(--text-muted)', marginTop: '0.2rem' }}>
                        In-House Stock Available: <strong>{selItem.inHouseStock} {selItem.unit}</strong>
                      </div>
                    )}
                  </div>
                  <div>
                    <label style={{ fontSize: '0.82rem', fontWeight: 700 }}>Linked Job Card (Optional)</label>
                    <select 
                      className="input-field" 
                      value={reissueForm.jobCardId} 
                      onChange={(e) => setReissueForm({ ...reissueForm, jobCardId: e.target.value })}
                    >
                      <option value="">-- No Direct Job Card Linked --</option>
                      {jobCards.filter(j => j.status !== 'COMPLETED').map(jc => (
                        <option key={jc.id} value={jc.id}>
                          {jc.jobCardNo} - {jc.itemName} ({jc.assignedOperator})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              );
            })()}

            <div>
              <label style={{ fontSize: '0.82rem', fontWeight: 700 }}>Investigation Notes / Remarks</label>
              <input 
                type="text" 
                className="input-field" 
                placeholder="e.g. Dropped from crane assembly clamp during alignment"
                value={reissueForm.notes} 
                onChange={(e) => setReissueForm({ ...reissueForm, notes: e.target.value })} 
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setIsReissueModalOpen(false)}>Cancel</button>
              <button type="submit" className="btn btn-warning" style={{ backgroundColor: '#d97706', borderColor: '#d97706', color: '#fff', fontWeight: 700 }}>
                ✓ Approve & Deduct From In-House Store
              </button>
            </div>
          </form>
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

      {/* Shortage Wizard Table Print Modal */}
      <PrintManagerModal
        isOpen={isShortagePrintOpen}
        onClose={() => setIsShortagePrintOpen(false)}
        title="Print In-House Component Shortage Matrix"
        documentRefNumber="JC-SHORTAGE-MATRIX"
      >
        <TabularShortagePrintView 
          title="IN-HOUSE MANUFACTURED SHORTAGE REPORT" 
          rows={wizardTableRows} 
          filterLabel={isExplodeShortage ? "Exploded Active Work Orders Sub-Assembly Shortages" : "In-House Component Stock Shortages"}
          showMOQAndInPO={false}
        />
      </PrintManagerModal>
    </div>
  );
};
