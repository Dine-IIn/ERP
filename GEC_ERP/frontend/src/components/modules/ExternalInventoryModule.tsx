import React, { useState, useMemo, useDeferredValue, useEffect } from 'react';
import { useERP } from '../../context/ERPContext';
import { Modal } from '../common/Modal';
import { AutocompleteSelect, AutocompleteOption } from '../common/AutocompleteSelect';
import { PrintManagerModal } from '../printTemplates/PrintManagerModal';
import { SingleJobworkPrintView, JobworkListPrintView } from '../printTemplates/JobworkPrintTemplates';
import { TabularShortagePrintView } from '../printTemplates/ShortagePrintTemplates';
import { Truck, Plus, ArrowRightLeft, CheckCircle, Search, Printer, FileSpreadsheet, ArrowUp, ArrowDown, ArrowUpDown, RefreshCw, AlertTriangle, Layers, X, CheckCircle2, ClipboardList, ShoppingCart } from 'lucide-react';
import { JobworkChallan, Item, ItemProcessCard, VendorDebitChallan, generateNextJobworkNumber, BOM } from '../../types/erp';

type JWSortKey = 'challanNo' | 'vendorName' | 'itemName' | 'processRequired' | 'sentQuantity' | 'receivedQuantity' | 'scrapQuantity' | 'pendingBalance' | 'expectedReturnDate' | 'status';

export const ExternalInventoryModule: React.FC = () => {
  const { 
    jobworks, vendors, items, workOrders, boms, grns, addJobworkChallan, recordJobworkReturn, searchTerm, setSearchTerm,
    itemProcessCards, setActiveModule, jobCards, finishedGoods 
  } = useERP();

  const [activeMainTab, setActiveMainTab] = useState<'CHALLANS' | 'DEBIT_NOTES' | 'SHORTAGE'>('CHALLANS');
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [isShortageWizardOpen, setIsShortageWizardOpen] = useState(false);
  const [isExplodeShortage, setIsExplodeShortage] = useState(false);
  const [isShortagePrintOpen, setIsShortagePrintOpen] = useState(false);
  const [wizardSearchTerm, setWizardSearchTerm] = useState('');
  const [selectedChallan, setSelectedChallan] = useState<JobworkChallan | null>(null);

  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [printDocType, setPrintDocType] = useState<'SINGLE_CHALLAN' | 'CHALLAN_LIST'>('CHALLAN_LIST');
  const [selectedPrintChallan, setSelectedPrintChallan] = useState<JobworkChallan | null>(null);

  const [sortField, setSortField] = useState<JWSortKey>('challanNo');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Date Range Filters
  const [startDateFilter, setStartDateFilter] = useState<string>('');
  const [endDateFilter, setEndDateFilter] = useState<string>('');

  const [selectedStepNumber, setSelectedStepNumber] = useState<number>(1);
  const [issueData, setIssueData] = useState({
    challanNo: '',
    vendorId: '',
    itemId: '',
    producedItemId: '',
    sentQuantity: 1,
    processRequired: 'CNC Turning & Nitriding',
    issueDate: new Date().toISOString().split('T')[0],
    expectedReturnDate: '',
    notes: ''
  });

  const [returnData, setReturnData] = useState({
    receivedQuantity: 1,
    scrapQuantity: 0
  });

  const handleSort = (field: JWSortKey) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const selectedTargetItem = items.find(i => i.id === issueData.producedItemId) || items.find(i => i.id === issueData.itemId);
  
  // Find Process Card for the selected target/raw item from Process Master
  const selectedItemProcessCard = selectedTargetItem ? itemProcessCards.find(c => 
    c.itemId === selectedTargetItem.id || 
    c.itemCode.toLowerCase() === selectedTargetItem.itemCode.toLowerCase() ||
    (c.rawItemId && c.rawItemId === selectedTargetItem.id) ||
    (c.rawItemCode && c.rawItemCode.toLowerCase() === selectedTargetItem.itemCode.toLowerCase())
  ) : null;

  // Multi-step Process Card: Helper to detect the current process step stage from GRN/Jobwork records
  const getAutoDetectedStepNumber = (item: Item | undefined, card: typeof selectedItemProcessCard): number => {
    if (!item || !card || !card.steps || card.steps.length === 0) return 1;
    if (card.steps.length === 1) return card.steps[0].stepNumber || 1;

    // Check existing challans and completed returns for this item
    const itemJobworks = jobworks.filter(j => 
      (j.producedItemId && (j.producedItemId === item.id || j.producedItemId === card.itemId)) ||
      j.itemId === item.id || j.itemCode.toLowerCase() === item.itemCode.toLowerCase() ||
      (card.rawItemId && j.itemId === card.rawItemId)
    );

    // If there is an active pending challan, check its step
    const pendingJW = itemJobworks.find(j => j.status === 'PENDING' && (j.pendingBalance || 0) > 0);
    if (pendingJW) {
      const matchStep = card.steps.find(s => 
        s.processName.toLowerCase() === (pendingJW.processRequired || '').toLowerCase() ||
        (pendingJW as any).stepNumber === s.stepNumber
      );
      if (matchStep) return matchStep.stepNumber;
    }

    // Check completed challans to advance to next step
    const completedJWs = itemJobworks.filter(j => j.status === 'COMPLETED' || (j.receivedQuantity || 0) > 0);
    let highestCompletedStep = 0;
    completedJWs.forEach(cj => {
      const matchStep = card.steps.find(s => 
        s.processName.toLowerCase() === (cj.processRequired || '').toLowerCase() ||
        (cj as any).stepNumber === s.stepNumber
      );
      if (matchStep && matchStep.stepNumber > highestCompletedStep) {
        highestCompletedStep = matchStep.stepNumber;
      }
    });

    if (highestCompletedStep > 0 && highestCompletedStep < card.steps.length) {
      return highestCompletedStep + 1;
    }

    return card.steps[0].stepNumber || 1;
  };

  // Determine active step from multi-step Process Card
  const activeProcessStep = selectedItemProcessCard && selectedItemProcessCard.steps && selectedItemProcessCard.steps.length > 0
    ? (selectedItemProcessCard.steps.find(s => s.stepNumber === selectedStepNumber) || selectedItemProcessCard.steps[0])
    : null;

  // Extract authorized vendor keys for ONLY the current active process step
  const processVendorKeys = new Set<string>();
  if (activeProcessStep) {
    (activeProcessStep.vendorIds || (activeProcessStep as any).vendors || []).forEach((v: string) => {
      if (v) processVendorKeys.add(v.trim().toLowerCase());
    });
  }

  // Strictly filter vendors to only those listed in the current step of Process Master
  const availableVendors = (activeProcessStep && processVendorKeys.size > 0)
    ? vendors.filter(v => 
        processVendorKeys.has(v.id.toLowerCase()) || 
        (v.vendorCode && processVendorKeys.has(v.vendorCode.toLowerCase())) || 
        (v.name && processVendorKeys.has(v.name.toLowerCase()))
      )
    : [];

  const vendorOptions: AutocompleteOption[] = availableVendors.map((v, vIdx) => {
    const priorityTag = vIdx === 0 ? 'Priority #1 (Primary)' : vIdx === 1 ? 'Priority #2 (Secondary)' : `Priority #${vIdx + 1} (Fallback)`;
    return {
      value: v.id,
      label: `⭐ ${priorityTag}: ${v.name}`,
      sublabel: `${v.vendorCode} | Step ${activeProcessStep?.stepNumber || 1}: ${activeProcessStep?.processName || ''} | ${v.city}`
    };
  });

  const itemOptions: AutocompleteOption[] = items.map(i => ({
    value: i.id,
    label: `${i.itemCode} - ${i.name}`,
    sublabel: `In-House Stock: ${i.inHouseStock} ${i.unit}`,
    badge: i.category
  }));

  // Responsive Local Search Term with 120ms debounce to ERPContext
  const [localSearch, setLocalSearch] = useState(searchTerm);

  useEffect(() => {
    setLocalSearch(searchTerm);
  }, [searchTerm]);

  useEffect(() => {
    const handler = setTimeout(() => {
      if (localSearch !== searchTerm) {
        setSearchTerm(localSearch);
      }
    }, 40);
    return () => clearTimeout(handler);
  }, [localSearch, searchTerm, setSearchTerm]);

  // Universal @history search handling with useDeferredValue
  const deferredSearch = useDeferredValue(localSearch);
  const isDeletedSearch = deferredSearch.toLowerCase().includes('@deleted');
  const isHistorySearch = isDeletedSearch || deferredSearch.toLowerCase().includes('@history') || deferredSearch.toLowerCase().includes('@completed') || deferredSearch.trim().startsWith('@');
  const cleanSearchTerm = deferredSearch.replace(/@history|@deleted|@completed|@archived/gi, '').replace(/^@+/g, '').trim().toLowerCase();

  const indexedJobworks = useMemo(() => {
    return jobworks.map(j => ({
      j,
      _searchStr: `${j.challanNo} ${j.vendorName} ${j.itemName} ${j.itemCode} ${j.processRequired || ''}`.toLowerCase(),
      isCompleted: j.status === 'COMPLETED' || j.pendingBalance === 0 || !!(j as any).isDeleted,
      isDeleted: !!(j as any).isDeleted
    }));
  }, [jobworks]);

  const filteredJobworks = useMemo(() => {
    return indexedJobworks
      .filter(({ j, _searchStr, isCompleted, isDeleted }) => {
        if (isDeletedSearch) {
          if (!isDeleted) return false;
        } else if (isHistorySearch) {
          if (!isCompleted) return false;
        } else if (isCompleted) {
          return false;
        }

        const matchesSearch = !cleanSearchTerm || _searchStr.includes(cleanSearchTerm);
        if (!matchesSearch) return false;

        if (startDateFilter && j.issueDate && j.issueDate < startDateFilter) return false;
        if (endDateFilter && j.issueDate && j.issueDate > endDateFilter) return false;

        return true;
      })
      .map(({ j }) => j)
      .sort((a, b) => {
        let valA: any = (a as any)[sortField] ?? '';
        let valB: any = (b as any)[sortField] ?? '';

        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();

        if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
  }, [indexedJobworks, isDeletedSearch, isHistorySearch, cleanSearchTerm, startDateFilter, endDateFilter, sortField, sortOrder]);

  // Synchronized with Planning Module Tree-Pruning Demand Engine
  const jwPlanningMap = useMemo(() => {
    const activeWOs = (workOrders || []).filter(w => w.status === 'PLANNED' || w.status === 'IN_PROGRESS');
    const activeJCs = (jobCards || []).filter(jc => jc.status !== 'COMPLETED' && jc.status !== 'CANCELLED' && !(jc as any).isDeleted);
    const activeJWs = (jobworks || []).filter(jw => jw.status !== 'COMPLETED' && jw.status !== 'CANCELLED');

    const itemById = new Map<string, Item>();
    const itemByCode = new Map<string, Item>();
    const itemByName = new Map<string, Item>();
    (items || []).forEach(item => {
      if (item.id) itemById.set(item.id, item);
      if (item.itemCode) itemByCode.set(item.itemCode.toLowerCase(), item);
      if (item.name) itemByName.set(item.name.toLowerCase(), item);
    });

    const bomById = new Map<string, BOM>();
    const bomByCode = new Map<string, BOM>();
    const bomByModel = new Map<string, BOM>();
    (boms || []).forEach(bom => {
      if (bom.id) bomById.set(bom.id, bom);
      if (bom.bomCode) bomByCode.set(bom.bomCode.toLowerCase(), bom);
      if (bom.machineModel) bomByModel.set(bom.machineModel.toLowerCase(), bom);
    });

    // Active JC pending supply
    const pendingJCMap = new Map<string, number>();
    activeJCs.forEach(jc => {
      const remaining = Math.max(0, (jc.targetQuantity || 1) - (jc.completedQuantity || 0));
      if (remaining > 0) {
        if (jc.itemId) pendingJCMap.set(jc.itemId, (pendingJCMap.get(jc.itemId) || 0) + remaining);
        if (jc.itemCode) pendingJCMap.set(jc.itemCode.toLowerCase(), (pendingJCMap.get(jc.itemCode.toLowerCase()) || 0) + remaining);
      }
    });

    // Active JW pending supply
    const pendingJWMap = new Map<string, number>();
    activeJWs.forEach(jw => {
      const remaining = jw.pendingBalance !== undefined ? jw.pendingBalance : (jw.sentQuantity || 0);
      if (remaining > 0) {
        if (jw.itemId) pendingJWMap.set(jw.itemId, (pendingJWMap.get(jw.itemId) || 0) + remaining);
        if (jw.itemCode) pendingJWMap.set(jw.itemCode.toLowerCase(), (pendingJWMap.get(jw.itemCode.toLowerCase()) || 0) + remaining);
      }
    });

    // Multi-level BOM explosion with shortage pruning
    const demandMap = new Map<string, number>();
    const addDemand = (itemIdOrCode: string, qty: number) => {
      if (!itemIdOrCode || qty <= 0) return;
      const lower = itemIdOrCode.toLowerCase();
      demandMap.set(itemIdOrCode, (demandMap.get(itemIdOrCode) || 0) + qty);
      if (lower !== itemIdOrCode) {
        demandMap.set(lower, (demandMap.get(lower) || 0) + qty);
      }
    };

    // 1. Aggregate root demand across active WOs
    const rootDemandByItemKey = new Map<string, number>();
    activeWOs.forEach(wo => {
      const totalWOQty = wo.targetQuantity || wo.quantity || 1;

      // Calculate dispatched units for this WO
      const dispatchedQty = (finishedGoods || []).filter(fg => 
        fg.status === 'DISPATCHED' && (
          fg.woId === wo.id ||
          (wo.workOrderNo && fg.woNumber === wo.workOrderNo) ||
          (wo.woNumber && fg.woNumber === wo.woNumber)
        )
      ).length;

      const undispatchedWOQty = Math.max(0, totalWOQty - dispatchedQty);

      const matchedBOM = (wo.bomId && bomById.get(wo.bomId))
        || ((wo as any).bomCode && bomByCode.get(((wo as any).bomCode as string).toLowerCase()))
        || (wo.machineModel && bomByModel.get(wo.machineModel.toLowerCase()));

      // Finished Product X demand: If WO has undispatched machines, register demand for product X itself
      const topItem = (wo.itemId && itemById.get(wo.itemId))
        || (wo.machineModel && (itemByName.get(wo.machineModel.toLowerCase()) || itemByCode.get(wo.machineModel.toLowerCase())))
        || (matchedBOM && (itemById.get(matchedBOM.id) || itemByCode.get((matchedBOM.bomCode || '').toLowerCase()) || itemByName.get((matchedBOM.machineModel || '').toLowerCase())));

      if (topItem && undispatchedWOQty > 0) {
        addDemand(topItem.id, undispatchedWOQty);
        if (topItem.itemCode) addDemand(topItem.itemCode, undispatchedWOQty);
      }

      // Child components required for unfinished units to build
      const remWOQty = Math.max(0, totalWOQty - (wo.completedQuantity || 0));
      if (remWOQty <= 0) return;

      const components = (wo.woComponents && wo.woComponents.length > 0)
        ? wo.woComponents.map(c => ({
            itemId: c.itemId,
            itemCode: c.itemCode,
            qtyPerMachine: c.qtyRequired ? c.qtyRequired / (wo.quantity || wo.targetQuantity || 1) : 1
          }))
        : (matchedBOM?.components || []).map(c => ({
            itemId: c.itemId,
            itemCode: c.itemCode,
            qtyPerMachine: c.qtyPerMachine || 1
          }));

      components.forEach(c => {
        const key = c.itemId || c.itemCode || '';
        if (key) {
          const qty = (c.qtyPerMachine || 1) * remWOQty;
          rootDemandByItemKey.set(key, (rootDemandByItemKey.get(key) || 0) + qty);
        }
      });
    });

    // 2. Explode with pruning
    const explodeItemShortage = (itemKey: string, requiredQty: number, visited: Set<string>) => {
      const targetItem = itemById.get(itemKey) || itemByCode.get(itemKey.toLowerCase());
      const idKey = targetItem ? targetItem.id : itemKey;
      const codeKey = targetItem ? targetItem.itemCode : itemKey;

      addDemand(idKey, requiredQty);
      if (codeKey && codeKey !== idKey) {
        addDemand(codeKey, requiredQty);
      }

      if (!targetItem) return;

      const subBOM = (targetItem.id && bomById.get(targetItem.id))
        || (targetItem.itemCode && bomByCode.get(targetItem.itemCode.toLowerCase()))
        || (targetItem.name && bomByModel.get(targetItem.name.toLowerCase()));

      if (subBOM && subBOM.components && subBOM.components.length > 0 && !visited.has(subBOM.id)) {
        const inHouse = targetItem.inHouseStock || 0;
        const activeJCSupply = (targetItem.id && pendingJCMap.get(targetItem.id)) || (targetItem.itemCode && pendingJCMap.get(targetItem.itemCode.toLowerCase())) || 0;
        const activeJWSupply = (targetItem.id && pendingJWMap.get(targetItem.id)) || (targetItem.itemCode && pendingJWMap.get(targetItem.itemCode.toLowerCase())) || 0;

        const availableSupply = inHouse + activeJCSupply + activeJWSupply;
        const netShortage = Math.max(0, requiredQty - availableSupply);

        if (netShortage > 0) {
          const nextVisited = new Set(visited);
          nextVisited.add(subBOM.id);

          subBOM.components.forEach(comp => {
            const compKey = comp.itemId || comp.itemCode || '';
            const compQtyPer = comp.qtyPerMachine !== undefined ? comp.qtyPerMachine : 1;
            const childReqQty = compQtyPer * netShortage;
            if (compKey && childReqQty > 0) {
              explodeItemShortage(compKey, childReqQty, nextVisited);
            }
          });
        }
      }
    };

    rootDemandByItemKey.forEach((qty, key) => {
      explodeItemShortage(key, qty, new Set());
    });

    // Compute planning metrics for all items (MIN LEVEL SHORTAGE)
    const resultMap = new Map<string, { totalRequired: number; inHouseStock: number; shortage: number; minStockLevel: number }>();
    (items || []).forEach(item => {
      const totalRequired = (item.id && demandMap.get(item.id)) || (item.itemCode && demandMap.get(item.itemCode.toLowerCase())) || (item.itemCode && demandMap.get(item.itemCode)) || 0;
      const inHouseStock = item.inHouseStock || 0;
      const minStockLevel = item.minStockQty !== undefined ? item.minStockQty : (item.reorderLevel || 0);

      // Min Level Shortage Formula: (totalRequired + minStockLevel) - inHouseStock
      const shortage = Math.max(0, (totalRequired + minStockLevel) - inHouseStock);
      const data = { totalRequired, inHouseStock, shortage, minStockLevel };
      resultMap.set(item.id, data);
      if (item.itemCode) resultMap.set(item.itemCode.toLowerCase(), data);
    });

    return resultMap;
  }, [items, workOrders, boms, jobCards, jobworks, finishedGoods]);

  // Shortage Calculation for Jobwork Items
  const isJobworkItem = (item: Item) => {
    const p = (item.processType || (item as any).materialProcessType || '').toLowerCase();
    const sources = (item.materialProcessSources || []).map(s => s.toLowerCase());
    return p.includes('job work') || p.includes('jobwork') || sources.includes('job work') || sources.includes('jobwork');
  };

  const getJobworkItemShortage = (item: Item) => {
    const data = jwPlanningMap.get(item.id) || (item.itemCode && jwPlanningMap.get(item.itemCode.toLowerCase()));
    return data ? data.shortage : 0;
  };

  const getJobworkItemTotalRequired = (item: Item) => {
    const data = jwPlanningMap.get(item.id) || (item.itemCode && jwPlanningMap.get(item.itemCode.toLowerCase()));
    return data ? data.totalRequired : 0;
  };

  const jwShortageItems = useMemo(() => {
    return items.filter(i => isJobworkItem(i) && !i.isBlocked && getJobworkItemShortage(i) >= 1);
  }, [items, jwPlanningMap]);

  const handleOpenShortageJWModal = (item: Item) => {
    const shortage = getJobworkItemShortage(item);
    const matchingBOM = boms.find(b => b.id === item.id || b.bomCode === item.itemCode || b.machineModel?.toLowerCase() === item.name.toLowerCase());
    const rawItemId = matchingBOM?.components?.[0]?.itemId || item.id;

    const pCard = itemProcessCards.find(c => 
      c.itemId === item.id || 
      c.itemCode.toLowerCase() === item.itemCode.toLowerCase() ||
      (c.rawItemId && c.rawItemId === item.id) ||
      (c.rawItemCode && c.rawItemCode.toLowerCase() === item.itemCode.toLowerCase())
    );

    const autoStepNum = getAutoDetectedStepNumber(item, pCard);
    setSelectedStepNumber(autoStepNum);
    const activeStep = pCard?.steps?.find(s => s.stepNumber === autoStepNum) || pCard?.steps?.[0];

    const p1VendorId = (activeStep?.vendorIds && activeStep.vendorIds.length > 0) ? activeStep.vendorIds[0] : '';
    setIssueData({
      challanNo: generateNextJobworkNumber(jobworks),
      vendorId: p1VendorId,
      itemId: rawItemId,
      producedItemId: item.id,
      sentQuantity: Math.max(1, shortage),
      processRequired: activeStep ? (activeStep.processName || activeStep.processShortCode) : 'External Machining & Processing',
      issueDate: new Date().toISOString().split('T')[0],
      expectedReturnDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
      notes: `Jobwork issued directly from inventory shortage requirement for target item ${item.itemCode} (${shortage} ${item.unit}).`
    });
    setIsIssueModalOpen(true);
  };

  const handleOpenIssueModal = () => {
    setSelectedStepNumber(1);
    setIssueData({
      challanNo: generateNextJobworkNumber(jobworks),
      vendorId: '',
      itemId: '',
      producedItemId: '',
      sentQuantity: 1,
      processRequired: '',
      issueDate: new Date().toISOString().split('T')[0],
      expectedReturnDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
      notes: ''
    });
    setIsIssueModalOpen(true);
  };

  const handlePrintSingleChallan = (j: JobworkChallan) => {
    setSelectedPrintChallan(j);
    setPrintDocType('SINGLE_CHALLAN');
    setPrintModalOpen(true);
  };

  const handlePrintChallanList = () => {
    setPrintDocType('CHALLAN_LIST');
    setPrintModalOpen(true);
  };

  const handleOpenReturnModal = (challan: JobworkChallan) => {
    setSelectedChallan(challan);
    setReturnData({
      receivedQuantity: challan.pendingBalance,
      scrapQuantity: 0
    });
    setIsReturnModalOpen(true);
  };

  const handleIssueSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const vendor = vendors.find(v => v.id === issueData.vendorId);
    const item = items.find(i => i.id === issueData.itemId);

    if (!vendor) {
      alert('Please select a processing vendor.');
      return;
    }
    if (!item) {
      alert('Please select a component to send.');
      return;
    }

    if (issueData.sentQuantity > item.inHouseStock) {
      alert(`Cannot issue ${issueData.sentQuantity} ${item.unit}. Only ${item.inHouseStock} ${item.unit} available in house!`);
      return;
    }

    addJobworkChallan({
      challanNo: issueData.challanNo,
      vendorId: vendor.id,
      vendorName: vendor.name,
      itemId: item.id,
      itemCode: item.itemCode,
      itemName: item.name,
      processRequired: issueData.processRequired || 'Jobwork Processing',
      sentQuantity: Number(issueData.sentQuantity),
      receivedQuantity: 0,
      scrapQuantity: 0,
      issueDate: issueData.issueDate,
      expectedReturnDate: issueData.expectedReturnDate,
      notes: issueData.notes
    });

    setIsIssueModalOpen(false);
  };

  const handleReturnSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChallan) return;

    recordJobworkReturn(
      selectedChallan.id,
      Number(returnData.receivedQuantity),
      Number(returnData.scrapQuantity)
    );

    setIsReturnModalOpen(false);
  };

  const deferredWizardSearchTerm = useDeferredValue(wizardSearchTerm);

  const getWizardTableRows = () => {
    const term = deferredWizardSearchTerm.trim().toLowerCase();

    if (!isExplodeShortage) {
      return jwShortageItems
        .filter(item => {
          if (!term) return true;
          return (
            item.itemCode.toLowerCase().includes(term) ||
            item.name.toLowerCase().includes(term) ||
            (item.partCode && item.partCode.toLowerCase().includes(term)) ||
            (item.category && item.category.toLowerCase().includes(term))
          );
        })
        .map((item, idx) => {
          const reqQty = getJobworkItemTotalRequired(item);
          const inHouseStock = item.inHouseStock || 0;
          const externalStock = item.externalStock || 0;
          const shortage = getJobworkItemShortage(item);

          return {
            srNo: idx + 1,
            item,
            itemDescription: item.name,
            partCode: item.partCode || item.itemCode,
            requiredQty: reqQty,
            currentStock: inHouseStock,
            externalStock,
            shortage,
            unit: item.unit || 'PCS',
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
      externalStock: number;
      shortage: number;
      unit: string;
      extraInfo?: string;
    }> = [];

    let count = 1;
    const activeWOs = workOrders.filter(w => w.status === 'PLANNED' || w.status === 'IN_PROGRESS');

    activeWOs.forEach(wo => {
      const bom = boms.find(b => b.id === wo.bomId || b.bomCode === (wo as any).bomCode || b.machineModel?.toLowerCase() === wo.machineModel?.toLowerCase());
      if (!bom || !bom.components) return;

      bom.components.forEach(comp => {
        const it = items.find(i => i.id === comp.itemId || i.itemCode === comp.itemCode);
        if (!it || !isJobworkItem(it) || it.isBlocked) return;

        const shortage = getJobworkItemShortage(it);
        if (shortage < 1) return;

        const reqQty = (comp.qtyPerMachine || 1) * (wo.quantity || 1);
        const inHouseStock = it.inHouseStock || 0;
        const externalStock = it.externalStock || 0;

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
          currentStock: inHouseStock,
          externalStock,
          shortage,
          unit: it.unit || 'PCS',
          extraInfo: `WO: ${wo.workOrderNo || wo.woNumber} (${wo.machineModel}) - Target Qty: ${wo.quantity} units`
        });
      });
    });

    return explodedRows;
  };

  const wizardTableRows = useMemo(() => getWizardTableRows(), [
    isExplodeShortage, jwShortageItems, deferredWizardSearchTerm, workOrders, boms, items, jwPlanningMap
  ]);

  return (
    <div className="module-layout-container">
      <div className="sticky-module-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {isShortageWizardOpen && (
            <button className="btn btn-outline" style={{ padding: '0.35rem 0.65rem', gap: '0.35rem', fontWeight: 600 }} onClick={() => setIsShortageWizardOpen(false)}>
              <X size={16} /> Back to Jobwork List <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>(ESC)</span>
            </button>
          )}
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Truck size={20} color="var(--accent-primary)" />
              {isShortageWizardOpen ? 'External Jobwork Shortage Wizard' : 'External Jobwork Inventory'}
            </h2>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {isShortageWizardOpen ? 'Tabular view of components requiring external processing and direct challan generation' : 'Track components sent out for heat treatment, machining, and surface coating'}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <button type="button" className="btn btn-outline" onClick={handlePrintChallanList} title="Print filtered jobwork challans report">
            <Printer size={14} /> Print Report
          </button>
          {!isShortageWizardOpen && (
            <>
              <button 
                type="button" 
                className="btn btn-outline" 
                onClick={() => { setIsShortageWizardOpen(true); setWizardSearchTerm(''); }}
              >
                <AlertTriangle size={14} color="var(--warning)" /> Shortage Jobwork Wizard
              </button>
              <button id="btn-new-jw" className="btn btn-primary" onClick={handleOpenIssueModal}>
                <Plus size={16} /> Create Manual Job Work Challan
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tabular Shortage Jobwork Wizard View */}
      {isShortageWizardOpen ? (
        <div className="card" style={{ padding: '1rem 1.25rem', backgroundColor: 'var(--bg-card)', display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1, minHeight: 0, overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', flexWrap: 'wrap', gap: '0.75rem', flexShrink: 0 }}>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertTriangle size={18} color="var(--warning)" />
                Jobwork Shortage Matrix (Tabular View)
              </h3>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                Review external processing shortages and directly create Outward Jobwork Challans.
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
              placeholder="Search shortage jobwork component, code, class... (or filter exploded rows)"
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
              <div style={{ fontWeight: 800, fontSize: '1.05rem' }}>All external jobwork items have sufficient stock!</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                No active shortages currently require outward jobwork challan issuance.
              </div>
            </div>
          ) : (
            <div className="table-container" style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th style={{ width: '45px', textAlign: 'center' }}>Sr No</th>
                    <th>Item Description</th>
                    <th>Part Code</th>
                    <th style={{ textAlign: 'right' }}>Required Quantity</th>
                    <th style={{ textAlign: 'right' }}>In-House Stock</th>
                    <th style={{ textAlign: 'right' }}>Jobwork (Vendor) Stock</th>
                    <th style={{ textAlign: 'right' }}>Shortage</th>
                    <th style={{ minWidth: '200px', textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {wizardTableRows.map((row, idx) => {
                    const processCard = itemProcessCards.find(c => 
                      c.itemId === row.item.id || 
                      c.itemCode.toLowerCase() === row.item.itemCode.toLowerCase() ||
                      (c.rawItemId && c.rawItemId === row.item.id) ||
                      (c.rawItemCode && c.rawItemCode.toLowerCase() === row.item.itemCode.toLowerCase())
                    );
                    const hasProcessCard = Boolean(processCard && processCard.steps && processCard.steps.length > 0);
                    const sources = (row.item.materialProcessSources || []).map(s => s.toLowerCase());
                    const hasInHouse = sources.includes('in-house') || sources.includes('inhouse') || ['MF', 'AS', 'FAS', 'SA'].includes(row.item.category);
                    const hasBoughtOut = sources.includes('bought out') || sources.includes('brought out') || row.item.category === 'BO';

                    return (
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
                        <td style={{ textAlign: 'right', color: 'var(--accent-primary)', fontWeight: 600 }}>
                          {row.externalStock} {row.unit}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <span className="badge badge-danger" style={{ fontWeight: 800, fontSize: '0.8rem', padding: '0.2rem 0.5rem' }}>
                            {row.shortage} {row.unit}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center', minWidth: '200px' }}>
                          {hasProcessCard ? (
                            <button
                              type="button"
                              className="btn btn-primary"
                              style={{ padding: '0.3rem 0.65rem', fontSize: '0.78rem', fontWeight: 700, gap: '0.3rem', display: 'inline-flex', alignItems: 'center' }}
                              onClick={() => {
                                setIsShortageWizardOpen(false);
                                handleOpenShortageJWModal(row.item);
                              }}
                            >
                              <Plus size={13} /> Create Challan
                            </button>
                          ) : hasInHouse && hasBoughtOut ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', alignItems: 'center' }}>
                              <span style={{ fontSize: '0.7rem', color: '#d97706', fontWeight: 600, textAlign: 'center', lineHeight: '1.2' }}>
                                ⚠️ No process card exists (create it), or this part can also be produced <strong>In-House</strong> or <strong>Bought Out</strong>.
                              </span>
                              <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                                <button
                                  type="button"
                                  className="btn btn-warning"
                                  style={{ padding: '0.2rem 0.45rem', fontSize: '0.72rem', fontWeight: 700, color: '#fff', backgroundColor: '#d97706', borderColor: '#d97706' }}
                                  onClick={() => { setIsShortageWizardOpen(false); setActiveModule('job_cards'); }}
                                >
                                  In-House
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-primary"
                                  style={{ padding: '0.2rem 0.45rem', fontSize: '0.72rem', fontWeight: 700 }}
                                  onClick={() => { setIsShortageWizardOpen(false); setActiveModule('purchase_orders'); }}
                                >
                                  Bought Out (PO)
                                </button>
                              </div>
                            </div>
                          ) : hasInHouse ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', alignItems: 'center' }}>
                              <span style={{ fontSize: '0.7rem', color: '#d97706', fontWeight: 600, textAlign: 'center', lineHeight: '1.2' }}>
                                ⚠️ No process card exists (create it), or this part can also be produced <strong>In-House</strong>.
                              </span>
                              <button
                                type="button"
                                className="btn btn-warning"
                                style={{ padding: '0.25rem 0.55rem', fontSize: '0.74rem', fontWeight: 700, gap: '0.25rem', color: '#fff', backgroundColor: '#d97706', borderColor: '#d97706' }}
                                onClick={() => { setIsShortageWizardOpen(false); setActiveModule('job_cards'); }}
                              >
                                <ClipboardList size={12} /> Produce In-House (Job Card)
                              </button>
                            </div>
                          ) : hasBoughtOut ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', alignItems: 'center' }}>
                              <span style={{ fontSize: '0.7rem', color: '#d97706', fontWeight: 600, textAlign: 'center', lineHeight: '1.2' }}>
                                ⚠️ No process card exists (create it), or this part can also be <strong>Bought Out</strong>.
                              </span>
                              <button
                                type="button"
                                className="btn btn-primary"
                                style={{ padding: '0.25rem 0.55rem', fontSize: '0.74rem', fontWeight: 700, gap: '0.25rem' }}
                                onClick={() => { setIsShortageWizardOpen(false); setActiveModule('purchase_orders'); }}
                              >
                                <ShoppingCart size={12} /> Buy Out (Create PO)
                              </button>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', alignItems: 'center' }}>
                              <span className="badge badge-danger" style={{ fontSize: '0.7rem', whiteSpace: 'normal', textAlign: 'center', lineHeight: '1.2' }}>
                                ⚠️ No process card exists for this item
                              </span>
                              <button
                                type="button"
                                className="btn btn-outline"
                                style={{ padding: '0.2rem 0.45rem', fontSize: '0.68rem', color: 'var(--accent-primary)', borderColor: 'var(--accent-primary)' }}
                                onClick={() => { setIsShortageWizardOpen(false); setActiveModule('process_master'); }}
                              >
                                Create Process Card
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <>

      {/* Summary Stat Pill */}
      <div className="card" style={{ padding: '0.75rem 1rem', display: 'flex', gap: '2rem', alignItems: 'center', backgroundColor: 'var(--bg-card)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Truck size={24} style={{ color: 'var(--warning)' }} />
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Active External Challans</div>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--warning)' }}>
              {jobworks.filter(j => j.status !== 'COMPLETED').length}
            </div>
          </div>
        </div>
        <div style={{ borderLeft: '1px solid var(--border-color)', height: '30px' }} />
        <div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Pending Items at Vendor Premises</div>
          <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            {jobworks.reduce((sum, j) => sum + j.pendingBalance, 0)} Units
          </div>
        </div>
      </div>

      {/* Inline Search Bar & Date Filter */}
      <div className="card" style={{ padding: '0.65rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'var(--bg-card)', flexShrink: 0, gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', flex: 1 }}>
          <div style={{ position: 'relative', width: '360px', maxWidth: '100%' }}>
            <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search challan no, vendor, part... (type @history to search completed)"
              className="input-field"
              style={{ paddingLeft: '2.25rem' }}
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
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
              title="Filter challans issued on or after this date"
            />
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>To:</span>
            <input
              type="date"
              className="input-field"
              style={{ padding: '0.3rem 0.5rem', fontSize: '0.8rem', width: '135px' }}
              value={endDateFilter}
              onChange={(e) => setEndDateFilter(e.target.value)}
              title="Filter challans issued on or before this date"
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
      </div>

      {/* Jobwork Table with Sorting */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th onClick={() => handleSort('challanNo')} style={{ cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  Challan No {sortField === 'challanNo' ? (sortOrder === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} />) : <ArrowUpDown size={12} color="var(--text-muted)" />}
                </div>
              </th>
              <th onClick={() => handleSort('vendorName')} style={{ cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  Vendor Name {sortField === 'vendorName' ? (sortOrder === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} />) : <ArrowUpDown size={12} color="var(--text-muted)" />}
                </div>
              </th>
              <th onClick={() => handleSort('itemName')} style={{ cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  Item Description {sortField === 'itemName' ? (sortOrder === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} />) : <ArrowUpDown size={12} color="var(--text-muted)" />}
                </div>
              </th>
              <th onClick={() => handleSort('processRequired')} style={{ cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  Process Required {sortField === 'processRequired' ? (sortOrder === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} />) : <ArrowUpDown size={12} color="var(--text-muted)" />}
                </div>
              </th>
              <th onClick={() => handleSort('sentQuantity')} style={{ cursor: 'pointer', textAlign: 'right' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.35rem' }}>
                  Sent Qty {sortField === 'sentQuantity' ? (sortOrder === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} />) : <ArrowUpDown size={12} color="var(--text-muted)" />}
                </div>
              </th>
              <th onClick={() => handleSort('receivedQuantity')} style={{ cursor: 'pointer', textAlign: 'right' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.35rem' }}>
                  Received Qty {sortField === 'receivedQuantity' ? (sortOrder === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} />) : <ArrowUpDown size={12} color="var(--text-muted)" />}
                </div>
              </th>
              <th onClick={() => handleSort('pendingBalance')} style={{ cursor: 'pointer', textAlign: 'right' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.35rem' }}>
                  Pending Balance {sortField === 'pendingBalance' ? (sortOrder === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} />) : <ArrowUpDown size={12} color="var(--text-muted)" />}
                </div>
              </th>
              <th onClick={() => handleSort('expectedReturnDate')} style={{ cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  Exp. Return {sortField === 'expectedReturnDate' ? (sortOrder === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} />) : <ArrowUpDown size={12} color="var(--text-muted)" />}
                </div>
              </th>
              <th onClick={() => handleSort('status')} style={{ cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  Status {sortField === 'status' ? (sortOrder === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} />) : <ArrowUpDown size={12} color="var(--text-muted)" />}
                </div>
              </th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredJobworks.map(j => {
              const isOverdue = j.status === 'PENDING' && new Date(j.expectedReturnDate) < new Date();
              return (
                <tr key={j.id}>
                  <td style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>{j.challanNo}</td>
                  <td>{j.vendorName}</td>
                  <td>
                    <div>{j.itemName}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{j.itemCode}</div>
                  </td>
                  <td>
                    <span className="badge badge-neutral">{j.processRequired}</span>
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>{j.sentQuantity}</td>
                  <td style={{ textAlign: 'right', color: 'var(--success)' }}>{j.receivedQuantity}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: j.pendingBalance > 0 ? 'var(--warning)' : 'var(--text-muted)' }}>
                    {j.pendingBalance}
                  </td>
                  <td style={{ color: isOverdue ? 'var(--danger)' : 'inherit', fontWeight: isOverdue ? 700 : 'normal' }}>
                    {j.expectedReturnDate}
                    {isOverdue && <span style={{ display: 'block', fontSize: '0.7rem' }}>⚠️ OVERDUE</span>}
                  </td>
                  <td>
                    <span className={`badge ${j.status === 'COMPLETED' ? 'badge-success' : 'badge-warning'}`}>
                      {j.status}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button className="btn btn-outline" style={{ padding: '0.3rem 0.5rem' }} title="Print Outward Challan Gatepass" onClick={() => handlePrintSingleChallan(j)}>
                        <Printer size={14} />
                      </button>
                      {j.status === 'PENDING' ? (
                        <button className="btn btn-primary" style={{ padding: '0.3rem 0.5rem', fontSize: '0.75rem' }} onClick={() => handleOpenReturnModal(j)}>
                          <ArrowRightLeft size={14} /> Receive Return
                        </button>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                          <CheckCircle size={14} /> Complete
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
      </>
      )}

      {/* Modal: Issue Outward Jobwork */}
      <Modal
        isOpen={isIssueModalOpen}
        onClose={() => setIsIssueModalOpen(false)}
        title="Issue Outward Jobwork Challan"
      >
        <form onSubmit={handleIssueSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          {/* Missing Process Card Guidance Banner in Modal */}
          {selectedTargetItem && !selectedItemProcessCard && (() => {
            const sources = (selectedTargetItem.materialProcessSources || []).map(s => s.toLowerCase());
            const hasInHouse = sources.includes('in-house') || sources.includes('inhouse') || ['MF', 'AS', 'FAS', 'SA'].includes(selectedTargetItem.category);
            const hasBoughtOut = sources.includes('bought out') || sources.includes('brought out') || selectedTargetItem.category === 'BO';

            return (
              <div style={{ padding: '0.75rem 1rem', backgroundColor: 'rgba(239, 68, 68, 0.08)', borderRadius: '0.5rem', border: '1px solid rgba(239, 68, 68, 0.3)', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, color: 'var(--danger)', fontSize: '0.85rem' }}>
                  <AlertTriangle size={16} />
                  No process card exists for {selectedTargetItem.itemCode} in Process Master
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  Job work items require an active Process Card with authorized processing vendors. Please create this item routing in Process Master.
                </div>
                {(hasInHouse || hasBoughtOut) && (
                  <div style={{ fontSize: '0.78rem', color: '#d97706', fontWeight: 600, marginTop: '0.2rem' }}>
                    💡 Note: This item is also configured to be {hasInHouse && hasBoughtOut ? 'produced In-House or Bought Out' : hasInHouse ? 'produced In-House' : 'Bought Out'}.
                  </div>
                )}
              </div>
            );
          })()}

          {/* Raw Component to Send */}
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.25rem', color: 'var(--accent-primary)' }}>
              1. Raw Component / Material to Send *
            </label>
            <AutocompleteSelect
              options={itemOptions}
              value={issueData.itemId}
              onChange={(val) => setIssueData({ ...issueData, itemId: val })}
              placeholder="Type raw component code or name..."
              required
            />
          </div>

          {/* Item to Produce / Processed Output Item */}
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.25rem', color: 'var(--accent-primary)' }}>
              2. Target Item to Produce / Finished Processed Part *
            </label>
            <AutocompleteSelect
              options={itemOptions}
              value={issueData.producedItemId}
              onChange={(val) => {
                const targetIt = items.find(i => i.id === val);
                const pCard = itemProcessCards.find(c => 
                  c.itemId === val || 
                  (targetIt && c.itemCode.toLowerCase() === targetIt.itemCode.toLowerCase()) ||
                  (c.rawItemId && c.rawItemId === val) ||
                  (targetIt && c.rawItemCode && c.rawItemCode.toLowerCase() === targetIt.itemCode.toLowerCase())
                );
                const autoStepNum = getAutoDetectedStepNumber(targetIt, pCard);
                setSelectedStepNumber(autoStepNum);
                const autoStep = pCard?.steps?.find(s => s.stepNumber === autoStepNum) || pCard?.steps?.[0];

                const autoP1Vendor = (autoStep?.vendorIds && autoStep.vendorIds.length > 0) ? autoStep.vendorIds[0] : '';
                setIssueData(prev => ({
                  ...prev,
                  producedItemId: val,
                  vendorId: autoP1Vendor,
                  processRequired: autoStep ? (autoStep.processName || autoStep.processShortCode) : prev.processRequired
                }));
              }}
              placeholder="Search output / processed item to produce..."
              required
            />
          </div>

          {/* Multi-Step Process Card Stage Tracker & Step Selector */}
          {selectedItemProcessCard && selectedItemProcessCard.steps && selectedItemProcessCard.steps.length > 0 && (
            <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: '0.5rem', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span>🔄 Process Card Routing ({selectedItemProcessCard.steps.length} Steps):</span>
                </div>
                {activeProcessStep && (
                  <span className="badge badge-primary" style={{ fontSize: '0.75rem', fontWeight: 700 }}>
                    Active Step {activeProcessStep.stepNumber}: {activeProcessStep.processName} ({activeProcessStep.processShortCode})
                  </span>
                )}
              </div>

              {/* Step Sequence Pills */}
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                {selectedItemProcessCard.steps.map((st, sIdx) => {
                  const isSelected = (st.stepNumber === selectedStepNumber) || (!selectedStepNumber && sIdx === 0);
                  const stVendorCount = (st.vendorIds || (st as any).vendors || []).length;
                  return (
                    <button
                      key={st.stepNumber || sIdx}
                      type="button"
                      className={`btn ${isSelected ? 'btn-primary' : 'btn-outline'}`}
                      style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', borderRadius: '0.375rem', fontWeight: isSelected ? 800 : 500 }}
                      onClick={() => {
                        setSelectedStepNumber(st.stepNumber);
                        const p1VId = (st.vendorIds && st.vendorIds.length > 0) ? st.vendorIds[0] : '';
                        setIssueData(prev => ({
                          ...prev,
                          processRequired: st.processName || st.processShortCode,
                          vendorId: p1VId
                        }));
                      }}
                    >
                      Step {st.stepNumber}: {st.processShortCode || st.processName}
                      <span style={{ opacity: 0.8, fontSize: '0.68rem', marginLeft: '0.25rem' }}>
                        ({stVendorCount} v)
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Search Processing Vendor & Challan No */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 700 }}>
                  3. Processing Vendor *
                </label>
                {selectedItemProcessCard ? (
                  availableVendors.length > 0 ? (
                    <span style={{ fontSize: '0.72rem', color: 'var(--success)', fontWeight: 600 }}>
                      ✓ {availableVendors.length} Step {activeProcessStep?.stepNumber || 1} vendor(s)
                    </span>
                  ) : (
                    <span style={{ fontSize: '0.72rem', color: 'var(--danger)', fontWeight: 600 }}>
                      ⚠️ No vendors for Step {activeProcessStep?.stepNumber || 1} in Process Master
                    </span>
                  )
                ) : selectedTargetItem ? (
                  <span style={{ fontSize: '0.72rem', color: 'var(--danger)', fontWeight: 600 }}>
                    ⚠️ No Process Card for item
                  </span>
                ) : null}
              </div>
              <AutocompleteSelect
                options={vendorOptions}
                value={issueData.vendorId}
                onChange={(val) => setIssueData({ ...issueData, vendorId: val })}
                placeholder={availableVendors.length === 0 ? `No authorized vendor for Step ${activeProcessStep?.stepNumber || 1}...` : `Select Step ${activeProcessStep?.stepNumber || 1} vendor...`}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.25rem' }}>Challan No.</label>
              <input type="text" required className="input-field" value={issueData.challanNo} onChange={(e) => setIssueData({ ...issueData, challanNo: e.target.value })} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.25rem' }}>Quantity to Send *</label>
              <input type="number" min="1" required className="input-field" value={issueData.sentQuantity} onChange={(e) => setIssueData({ ...issueData, sentQuantity: Number(e.target.value) })} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.25rem' }}>Process Required *</label>
              <input type="text" required className="input-field" placeholder="e.g. CNC Turning, Nitriding 0.4mm, Grinding" value={issueData.processRequired} onChange={(e) => setIssueData({ ...issueData, processRequired: e.target.value })} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.25rem' }}>Issue Date</label>
              <input type="date" required className="input-field" value={issueData.issueDate} onChange={(e) => setIssueData({ ...issueData, issueDate: e.target.value })} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.25rem' }}>Expected Return Date</label>
              <input type="date" required className="input-field" value={issueData.expectedReturnDate} onChange={(e) => setIssueData({ ...issueData, expectedReturnDate: e.target.value })} />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.25rem' }}>Remarks</label>
            <textarea className="input-field" rows={2} value={issueData.notes} onChange={(e) => setIssueData({ ...issueData, notes: e.target.value })} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsIssueModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary">Dispatch Outward Challan</button>
          </div>
        </form>
      </Modal>

      {/* Modal: Record Inward Jobwork Return */}
      <Modal
        isOpen={isReturnModalOpen}
        onClose={() => setIsReturnModalOpen(false)}
        title={`Record Jobwork Receipt: ${selectedChallan?.challanNo || ''}`}
      >
        <form onSubmit={handleReturnSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ padding: '0.875rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: '0.5rem', border: '1px solid var(--border-color)' }}>
            <div style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>{selectedChallan?.itemName}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Vendor: {selectedChallan?.vendorName} &bull; Process: {selectedChallan?.processRequired}
            </div>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--warning)', marginTop: '0.25rem' }}>
              Pending Balance at Vendor: {selectedChallan?.pendingBalance} PCS
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.25rem' }}>Processed Quantity Received Back</label>
              <input type="number" min="0" max={selectedChallan?.pendingBalance || 99} required className="input-field" value={returnData.receivedQuantity} onChange={(e) => setReturnData({ ...returnData, receivedQuantity: Number(e.target.value) })} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.25rem' }}>Scrap / Rejected Qty</label>
              <input type="number" min="0" required className="input-field" value={returnData.scrapQuantity} onChange={(e) => setReturnData({ ...returnData, scrapQuantity: Number(e.target.value) })} />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsReturnModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary">Save Inward Receipt</button>
          </div>
        </form>
      </Modal>

      {/* Feature-Wise Modular Print Manager Modal */}
      <PrintManagerModal
        isOpen={printModalOpen}
        onClose={() => { setPrintModalOpen(false); setSelectedPrintChallan(null); }}
        title={printDocType === 'SINGLE_CHALLAN' ? `Print Jobwork Challan Gatepass (${selectedPrintChallan?.challanNo})` : 'Print Jobwork Challans Ledger'}
        documentRefNumber={printDocType === 'SINGLE_CHALLAN' ? selectedPrintChallan?.challanNo : 'JW-REPORT'}
      >
        {printDocType === 'SINGLE_CHALLAN' && selectedPrintChallan ? (
          <SingleJobworkPrintView challan={selectedPrintChallan} />
        ) : (
          <JobworkListPrintView challans={filteredJobworks} filterLabel={isHistorySearch ? 'All Active & Completed Jobwork Challans' : 'Active External Challans'} />
        )}
      </PrintManagerModal>

      {/* Shortage Wizard Table Print Modal */}
      <PrintManagerModal
        isOpen={isShortagePrintOpen}
        onClose={() => setIsShortagePrintOpen(false)}
        title="Print External Jobwork Shortage Matrix"
        documentRefNumber="JW-SHORTAGE-MATRIX"
      >
        <TabularShortagePrintView
          title="External Jobwork Shortage Matrix"
          filterLabel="Direct Jobwork Sourcing Requirement for Component Machining & Surface Treatment"
          rows={wizardTableRows.map(r => ({
            srNo: r.srNo,
            itemDescription: r.itemDescription,
            partCode: r.partCode,
            requiredQty: r.requiredQty,
            currentStock: r.currentStock,
            externalStock: r.externalStock,
            shortage: r.shortage,
            unit: r.unit,
            extraInfo: r.extraInfo
          }))}
        />
      </PrintManagerModal>

    </div>
  );
};
