import React, { useState, useEffect, useMemo, useDeferredValue } from 'react';
import { useERP } from '../../context/ERPContext';
import { Modal } from '../common/Modal';
import { PrintManagerModal } from '../printTemplates/PrintManagerModal';
import { SingleJobCardPrintView, JobCardListPrintView } from '../printTemplates/JobCardPrintTemplates';
import { TabularShortagePrintView } from '../printTemplates/ShortagePrintTemplates';
import { 
  ClipboardList, Plus, CheckCircle, Search, ArrowUp, ArrowDown, ArrowUpDown, Package, Printer, RefreshCw, AlertTriangle, Layers, X, CheckCircle2, Edit2, Trash2, RotateCcw
} from 'lucide-react';
import { JobCard, Item, BOM } from '../../types/erp';

type JCSortKey = 'jobCardNo' | 'itemType' | 'itemName' | 'woNumber' | 'targetQuantity' | 'completedQuantity' | 'assignedOperator' | 'status';

export const JobCardModule: React.FC = () => {
  const { 
    jobCards, items, workOrders, boms, addJobCard, updateJobCard, updateJobCardProgress, closeJobCard, reopenJobCard, deleteJobCard,
    jobCardMaterialReissues, addJobCardMaterialReissue, currentUser, finishedGoods,
    searchTerm, setSearchTerm 
  } = useERP();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingJC, setEditingJC] = useState<JobCard | null>(null);
  const [isShortageWizardOpen, setIsShortageWizardOpen] = useState(false);
  const [isExplodeShortage, setIsExplodeShortage] = useState(false);
  const [isShortagePrintOpen, setIsShortagePrintOpen] = useState(false);
  const [wizardSearchTerm, setWizardSearchTerm] = useState('');
  const [selectedJC, setSelectedJC] = useState<JobCard | null>(null);
  const [progressQtyInput, setProgressQtyInput] = useState<number>(1);
  const [statusFilter, setStatusFilter] = useState<string>('ACTIVE_ONLY');
  const [searchQuery, setSearchQuery] = useState(searchTerm || '');
  const [startDateFilter, setStartDateFilter] = useState<string>('');
  const [endDateFilter, setEndDateFilter] = useState<string>('');

  useEffect(() => {
    setSearchQuery(searchTerm);
  }, [searchTerm]);

  useEffect(() => {
    const handler = setTimeout(() => {
      if (searchQuery !== searchTerm) {
        setSearchTerm(searchQuery);
      }
    }, 40);
    return () => clearTimeout(handler);
  }, [searchQuery, searchTerm, setSearchTerm]);

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

  // Pre-indexed Single Pass Demand Map for O(1) Instant Shortage Lookups
  const woDemandMap = useMemo(() => {
    const demandMap = new Map<string, number>();

    const addDemand = (key: string | undefined, qty: number) => {
      if (!key || qty <= 0) return;
      const clean = key.trim().toLowerCase();
      demandMap.set(clean, (demandMap.get(clean) || 0) + qty);
    };

    const bomById = new Map<string, BOM>();
    const bomByCode = new Map<string, BOM>();
    const bomByModel = new Map<string, BOM>();
    boms.forEach(b => {
      if (b.id) bomById.set(b.id, b);
      if (b.bomCode) bomByCode.set(b.bomCode.toLowerCase(), b);
      if (b.machineModel) bomByModel.set(b.machineModel.toLowerCase(), b);
    });

    const itemByIdOrCode = new Map<string, Item>();
    items.forEach(i => {
      if (i.id) itemByIdOrCode.set(i.id, i);
      if (i.itemCode) itemByIdOrCode.set(i.itemCode.toLowerCase(), i);
    });

    const explodeDemand = (
      components: Array<{ itemId?: string; itemCode?: string; qtyPerMachine?: number; qtyRequired?: number }>,
      multiplier: number,
      visited = new Set<string>()
    ) => {
      for (let i = 0; i < components.length; i++) {
        const comp = components[i];
        const cItemId = comp.itemId;
        const cItemCode = comp.itemCode;
        const qtyPer = comp.qtyPerMachine !== undefined ? comp.qtyPerMachine : (comp.qtyRequired || 1);
        const totalCompQty = qtyPer * multiplier;

        if (cItemId) addDemand(cItemId, totalCompQty);
        if (cItemCode) addDemand(cItemCode, totalCompQty);

        const childItem = (cItemId && itemByIdOrCode.get(cItemId)) || (cItemCode && itemByIdOrCode.get(cItemCode.toLowerCase()));
        if (childItem) {
          const subBOM = (childItem.id && bomById.get(childItem.id)) || 
                         (childItem.itemCode && bomByCode.get(childItem.itemCode.toLowerCase())) || 
                         (childItem.name && bomByModel.get(childItem.name.toLowerCase()));
          if (subBOM && subBOM.components && subBOM.components.length > 0 && !visited.has(subBOM.id)) {
            const nextVisited = new Set(visited);
            nextVisited.add(subBOM.id);
            explodeDemand(subBOM.components, totalCompQty, nextVisited);
          }
        }
      }
    };

    const activeWOs = workOrders.filter(w => w.status !== 'COMPLETED' && w.status !== 'CANCELLED');
    for (let w = 0; w < activeWOs.length; w++) {
      const wo = activeWOs[w];
      const dispatchedQty = (finishedGoods || [])
        .filter(fg => (fg.woId === wo.id || fg.woNumber === wo.workOrderNo) && fg.status === 'DISPATCHED')
        .length;
      const remainingQty = Math.max(0, (wo.targetQuantity || wo.quantity || 1) - Math.max(wo.completedQuantity || 0, dispatchedQty));
      if (remainingQty <= 0) continue;

      if (wo.machineModel) addDemand(wo.machineModel, remainingQty);
      if (wo.itemId) addDemand(wo.itemId, remainingQty);
      if (wo.itemCode) addDemand(wo.itemCode, remainingQty);

      if (wo.woComponents && wo.woComponents.length > 0) {
        explodeDemand(wo.woComponents.map(c => ({
          itemId: c.itemId,
          itemCode: c.itemCode,
          qtyPerMachine: c.qtyRequired ? c.qtyRequired / (wo.quantity || wo.targetQuantity || 1) : 1
        })), remainingQty);
      } else {
        const bom = (wo.bomId && bomById.get(wo.bomId)) || 
                    ((wo as any).bomCode && bomByCode.get((wo as any).bomCode.toLowerCase())) || 
                    (wo.machineModel && bomByModel.get(wo.machineModel.toLowerCase()));
        if (bom && bom.components) {
          explodeDemand(bom.components, remainingQty, new Set([bom.id]));
        }
      }
    }

    return demandMap;
  }, [workOrders, boms, items, finishedGoods]);

  // Fast O(1) demand lookup
  const getItemWorkOrderDemand = (itemId: string, itemCode: string) => {
    const idDemand = itemId ? (woDemandMap.get(itemId.toLowerCase()) || 0) : 0;
    const codeDemand = itemCode ? (woDemandMap.get(itemCode.toLowerCase()) || 0) : 0;
    return Math.max(idDemand, codeDemand);
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
    const woDemand = getItemWorkOrderDemand(item.id, item.itemCode);
    return Math.max(0, (woDemand + minReq) - currentStock);
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

  const inHouseShortageItems = useMemo(() => {
    return items.filter(i => isInHouseItem(i) && !i.isBlocked && hasBOMorProcess(i) && getInHouseItemShortage(i) >= 1);
  }, [items, woDemandMap, boms]);

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
  const buildableItems = useMemo(() => {
    return items.filter(i => 
      i.processType === 'In-house' || 
      i.category.includes('Assembly') || 
      i.category.includes('Machined') ||
      i.category === 'SA' ||
      i.category === 'FG'
    );
  }, [items]);

  // Helper to check if an item is used in a Work Order (top-level, woComponents, or sub-BOMs)
  const isItemUsedInWorkOrder = (targetItem: Item | undefined, wo: any): boolean => {
    if (!targetItem) return true;
    
    // Direct match on WO machine / item
    if (
      (wo.itemId && wo.itemId === targetItem.id) ||
      (wo.itemCode && targetItem.itemCode && wo.itemCode.toLowerCase() === targetItem.itemCode.toLowerCase()) ||
      (wo.machineModel && (
        wo.machineModel.toLowerCase() === targetItem.name.toLowerCase() ||
        wo.machineModel.toLowerCase() === targetItem.itemCode.toLowerCase()
      ))
    ) {
      return true;
    }

    const targetCode = (targetItem.itemCode || '').trim().toLowerCase();
    const targetId = targetItem.id;

    // Recursive search through component tree
    const searchInComponents = (
      components: Array<{ itemId?: string; itemCode?: string }>,
      visited = new Set<string>()
    ): boolean => {
      for (const comp of components) {
        const cId = comp.itemId || '';
        const cCode = (comp.itemCode || '').trim().toLowerCase();

        if ((targetId && cId && cId === targetId) || (targetCode && cCode && cCode === targetCode)) {
          return true;
        }

        const childItem = items.find(i => (cId && i.id === cId) || (cCode && i.itemCode.toLowerCase() === cCode));
        if (childItem) {
          const subBOM = boms.find(b => 
            b.id === childItem.id || 
            b.bomCode?.toLowerCase() === childItem.itemCode.toLowerCase() || 
            b.machineModel?.toLowerCase() === childItem.name?.toLowerCase() ||
            b.machineModel?.toLowerCase() === childItem.itemCode?.toLowerCase()
          );
          if (subBOM && subBOM.components && subBOM.components.length > 0 && !visited.has(subBOM.id)) {
            visited.add(subBOM.id);
            if (searchInComponents(subBOM.components, visited)) {
              return true;
            }
          }
        }
      }
      return false;
    };

    if (wo.woComponents && wo.woComponents.length > 0) {
      if (searchInComponents(wo.woComponents)) return true;
    }

    const bom = boms.find(b => 
      b.id === wo.bomId || 
      b.bomCode?.toLowerCase() === (wo.bomCode || '').toLowerCase() || 
      b.machineModel?.toLowerCase() === (wo.machineModel || '').toLowerCase()
    );
    if (bom && bom.components && bom.components.length > 0) {
      if (searchInComponents(bom.components, new Set([bom.id]))) return true;
    }

    return false;
  };

  const selectedItemObj = items.find(i => i.id === selectedItemId);

  // Filter Work Orders that specifically use the selected assembly / sub-assembly
  const relevantWorkOrders = workOrders
    .filter(w => w.status !== 'COMPLETED' && w.status !== 'CANCELLED')
    .filter(w => !selectedItemObj || isItemUsedInWorkOrder(selectedItemObj, w));


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

  // Handlers for Edit, Reopen, and Soft-Delete
  const handleOpenEditModal = (jc: JobCard) => {
    setEditingJC(JSON.parse(JSON.stringify(jc)));
    setIsEditModalOpen(true);
  };

  const handleSaveEditJobCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingJC) return;
    updateJobCard(editingJC);
    setIsEditModalOpen(false);
    setEditingJC(null);
    alert(`✅ Job Card ${editingJC.jobCardNo} updated successfully!`);
  };

  const handleReopenJobCard = (jc: JobCard) => {
    if (!window.confirm(`⚠️ Reopen Job Card ${jc.jobCardNo}?\n\nThis will:\n1. Revert the ${jc.targetQuantity} finished units from in-house stock.\n2. Restore the consumed components back to store inventory.\n3. Move this Job Card back to 'IN_PROGRESS'.\n\nProceed?`)) {
      return;
    }
    reopenJobCard(jc.id);
    alert(`✅ Job Card ${jc.jobCardNo} reopened successfully! Status is now IN_PROGRESS.`);
  };

  const handleDeleteJobCard = (jc: JobCard) => {
    if ((jc.completedQuantity || 0) > 0) {
      alert(`❌ Cannot delete Job Card ${jc.jobCardNo} because ${jc.completedQuantity} units have already been processed.`);
      return;
    }
    if (window.confirm(`Are you sure you want to delete Job Card ${jc.jobCardNo}?\n\nIt will be safely archived (soft-deleted) and can be viewed via @history or @deleted.`)) {
      deleteJobCard(jc.id);
    }
  };

  // Universal @history & @deleted search handling with useDeferredValue
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const isDeletedSearch = deferredSearchQuery.toLowerCase().includes('@deleted');
  const isHistorySearch = isDeletedSearch || deferredSearchQuery.toLowerCase().includes('@history') || deferredSearchQuery.trim().startsWith('@');
  const cleanSearchTerm = deferredSearchQuery.replace(/@history|@deleted|@archived/gi, '').replace(/^@+/g, '').trim().toLowerCase();

  const indexedJobCards = useMemo(() => {
    return jobCards.map(jc => ({
      jc,
      _searchStr: `${jc.jobCardNo} ${jc.itemName} ${jc.itemCode} ${jc.woNumber || ''} ${jc.assignedOperator || ''}`.toLowerCase()
    }));
  }, [jobCards]);

  const filteredJobCards = useMemo(() => {
    return indexedJobCards
      .filter(({ jc, _searchStr }) => {
        const isHistorical = jc.status === 'COMPLETED' || jc.status === 'CANCELLED' || jc.isDeleted;

        if (isDeletedSearch) {
          if (!jc.isDeleted) return false;
        } else if (isHistorySearch) {
          // If @ or @history, show completed, cancelled, or deleted job cards
          if (!isHistorical) return false;
        } else if (statusFilter === 'ACTIVE_ONLY') {
          if (isHistorical || jc.isDeleted) return false;
        } else if (statusFilter === 'ALL') {
          if (jc.status === 'COMPLETED' || jc.isDeleted) return false;
        } else if (statusFilter === 'DELETED') {
          if (!jc.isDeleted) return false;
        } else {
          if (jc.status !== statusFilter || jc.isDeleted) return false;
        }

        const matchesSearch = !cleanSearchTerm || _searchStr.includes(cleanSearchTerm);
        if (!matchesSearch) return false;

        if (startDateFilter && jc.startDate && jc.startDate < startDateFilter) return false;
        if (endDateFilter && jc.startDate && jc.startDate > endDateFilter) return false;

        return true;
      })
      .map(({ jc }) => jc)
      .sort((a, b) => {
        let valA: any = (a as any)[sortField] ?? '';
        let valB: any = (b as any)[sortField] ?? '';

        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();

        if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
  }, [indexedJobCards, isDeletedSearch, isHistorySearch, statusFilter, cleanSearchTerm, startDateFilter, endDateFilter, sortField, sortOrder]);

  const handlePrintSingleJC = (jc: JobCard) => {
    setSelectedPrintJC(jc);
    setPrintDocType('SINGLE_JC');
    setPrintModalOpen(true);
  };

  const handlePrintJCList = () => {
    setPrintDocType('JC_LIST');
    setPrintModalOpen(true);
  };

  const deferredWizardSearchTerm = useDeferredValue(wizardSearchTerm);

  const getWizardTableRows = () => {
    const term = deferredWizardSearchTerm.trim().toLowerCase();

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
            partCode: item.partCode || item.itemCode,
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
            (it.partCode && it.partCode.toLowerCase().includes(term)) ||
            (wo.workOrderNo && wo.workOrderNo.toLowerCase().includes(term)) ||
            (wo.machineModel && wo.machineModel.toLowerCase().includes(term));
          if (!matches) return;
        }

        explodedRows.push({
          srNo: count++,
          item: it,
          itemDescription: it.name,
          partCode: it.partCode || it.itemCode,
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

  const wizardTableRows = useMemo(() => getWizardTableRows(), [
    isExplodeShortage, inHouseShortageItems, deferredWizardSearchTerm, workOrders, boms, items
  ]);

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
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
                <ClipboardList size={22} color="var(--accent-primary)" />
                Job Cards (Assembly)
              </h2>
              <span className="badge badge-primary" style={{ fontSize: '0.74rem' }}>
                {jobCards.length} Cards
              </span>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <button type="button" className="btn btn-outline" onClick={handlePrintJCList} title="Print filtered job cards report">
            <Printer size={14} /> Print Report
          </button>
          {!isShortageWizardOpen && (
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
        <div className="card" style={{ padding: '1rem 1.25rem', backgroundColor: 'var(--bg-card)', display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1, minHeight: 0, overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', flexWrap: 'wrap', gap: '0.75rem', flexShrink: 0 }}>
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
          <div style={{ position: 'relative', width: '100%', flexShrink: 0 }}>
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
            <div className="table-container" style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
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

        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
          {[
            { key: 'ACTIVE_ONLY', label: 'Active Only' },
            { key: 'ALL', label: 'All Lifecycle' },
            { key: 'OPEN', label: 'Open' },
            { key: 'IN_PROGRESS', label: 'In Progress' },
            { key: 'COMPLETED', label: 'Completed (History)' },
            { key: 'DELETED', label: 'Deleted' }
          ].map(opt => (
            <button 
              key={opt.key}
              className={`btn ${statusFilter === opt.key ? 'btn-primary' : 'btn-outline'}`}
              style={{ padding: '0.25rem 0.6rem', fontSize: '0.78rem' }}
              onClick={() => setStatusFilter(opt.key)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Table Views */}
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
                      <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
                        <button 
                          className="btn btn-outline" 
                          style={{ padding: '0.2rem 0.4rem', fontSize: '0.75rem' }} 
                          title="Print Job Card Traveller"
                          onClick={() => handlePrintSingleJC(jc)}
                        >
                          <Printer size={13} />
                        </button>
                        
                        {jc.isDeleted ? null : isComplete ? (
                          <>
                            <span style={{ fontSize: '0.75rem', color: 'var(--success)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                              <CheckCircle size={14} /> Closed & In Stock
                            </span>
                            <button
                              className="btn btn-outline"
                              style={{ padding: '0.2rem 0.45rem', fontSize: '0.75rem', color: '#d97706', borderColor: '#d97706' }}
                              title="Reopen Job Card and reverse stock movements"
                              onClick={() => handleReopenJobCard(jc)}
                            >
                              <RotateCcw size={13} /> Reopen
                            </button>
                          </>
                        ) : (
                          <>
                            <button 
                              className="btn btn-outline" 
                              style={{ padding: '0.2rem 0.45rem', fontSize: '0.75rem', color: 'var(--accent-primary)' }}
                              title="Edit Job Card"
                              onClick={() => handleOpenEditModal(jc)}
                            >
                              <Edit2 size={13} />
                            </button>
                            <button 
                              className="btn btn-outline" 
                              style={{ padding: '0.2rem 0.45rem', fontSize: '0.75rem' }}
                              title="Update progress"
                              onClick={() => { setSelectedJC(jc); setProgressQtyInput(jc.completedQuantity + 1); }}
                            >
                              Progress
                            </button>
                            <button 
                              className="btn btn-primary" 
                              style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                              title="Close and credit to inventory"
                              onClick={() => handleCloseAndStore(jc)}
                            >
                              <CheckCircle size={13} /> Close
                            </button>
                            <button 
                              className="btn btn-outline" 
                              style={{ padding: '0.2rem 0.4rem', fontSize: '0.75rem', color: 'var(--danger)', borderColor: (jc.completedQuantity || 0) > 0 ? 'var(--border-color)' : 'var(--danger)', opacity: (jc.completedQuantity || 0) > 0 ? 0.4 : 1 }}
                              title={(jc.completedQuantity || 0) > 0 ? "Cannot delete: quantity already processed" : "Delete Job Card (Archived to History)"}
                              onClick={() => handleDeleteJobCard(jc)}
                              disabled={(jc.completedQuantity || 0) > 0}
                            >
                              <Trash2 size={13} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
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
              onChange={(e) => {
                const newId = e.target.value;
                setSelectedItemId(newId);
                const newItem = items.find(i => i.id === newId);
                if (selectedWOId && newItem) {
                  const selWO = workOrders.find(w => w.id === selectedWOId);
                  if (selWO && !isItemUsedInWorkOrder(newItem, selWO)) {
                    setSelectedWOId('');
                  }
                }
              }}
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
                {relevantWorkOrders.map(w => (
                  <option key={w.id} value={w.id}>{w.workOrderNo || w.woNumber} ({w.machineModel})</option>
                ))}
              </select>
              {selectedItemObj && relevantWorkOrders.length === 0 && (
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  ℹ️ No active Work Orders currently require this item.
                </div>
              )}
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

      {/* Modal: Edit Job Card */}
      {isEditModalOpen && editingJC && (
        <Modal isOpen={isEditModalOpen} onClose={() => { setIsEditModalOpen(false); setEditingJC(null); }} title={`✏️ Edit Job Card: ${editingJC.jobCardNo}`}>
          <form onSubmit={handleSaveEditJobCard} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ padding: '0.6rem 0.8rem', backgroundColor: 'var(--bg-secondary)', borderRadius: '6px', fontSize: '0.85rem' }}>
              <div><strong>Item:</strong> {editingJC.itemName} (<span style={{ fontFamily: 'monospace' }}>{editingJC.itemCode}</span>)</div>
              {editingJC.woNumber && <div><strong>Work Order:</strong> {editingJC.woNumber}</div>}
              <div><strong>Current Progress:</strong> {editingJC.completedQuantity} / {editingJC.targetQuantity} units</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 700 }}>Target Quantity *</label>
                <input 
                  type="number" 
                  min={Math.max(1, editingJC.completedQuantity || 1)} 
                  required 
                  className="input-field"
                  value={editingJC.targetQuantity}
                  onChange={(e) => setEditingJC({ ...editingJC, targetQuantity: Number(e.target.value) })}
                />
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Cannot be less than completed qty ({editingJC.completedQuantity || 0}).</span>
              </div>
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 700 }}>Assigned Operator / Shopfloor Lead</label>
                <input 
                  type="text" 
                  className="input-field" 
                  value={editingJC.assignedOperator || ''}
                  onChange={(e) => setEditingJC({ ...editingJC, assignedOperator: e.target.value })}
                  placeholder="e.g. Ramesh Patel / Assembly Lead"
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 700 }}>Station / Bay Name</label>
                <input 
                  type="text" 
                  className="input-field" 
                  value={editingJC.stationName || ''}
                  onChange={(e) => setEditingJC({ ...editingJC, stationName: e.target.value })}
                  placeholder="e.g. Sub-Assembly Line 2"
                />
              </div>
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 700 }}>Status</label>
                <select 
                  className="input-field"
                  value={editingJC.status}
                  onChange={(e) => setEditingJC({ ...editingJC, status: e.target.value as any })}
                >
                  <option value="OPEN">OPEN</option>
                  <option value="IN_PROGRESS">IN_PROGRESS</option>
                </select>
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.82rem', fontWeight: 700 }}>Remarks / Instructions</label>
              <textarea 
                className="input-field" 
                rows={3}
                value={editingJC.remarks || ''}
                onChange={(e) => setEditingJC({ ...editingJC, remarks: e.target.value })}
                placeholder="Enter shopfloor instructions or assembly notes..."
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
              <button type="button" className="btn btn-secondary" onClick={() => { setIsEditModalOpen(false); setEditingJC(null); }}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" style={{ fontWeight: 700 }}>
                💾 Save Job Card Changes
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
