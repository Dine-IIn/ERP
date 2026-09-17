import React, { useState, useMemo, useEffect, useLayoutEffect, useRef, useDeferredValue } from 'react';
import { useERP } from '../../context/ERPContext';
import { PrintManagerModal } from '../printTemplates/PrintManagerModal';
import { 
  ConsolidatedItemWiseShortagePrintReport,
  ItemWiseShortagePrintView, 
  WOShortagePrintView, 
  POShortagePrintView, 
  TabularShortagePrintView 
} from '../printTemplates/ShortagePrintTemplates';
import { 
  AlertTriangle, Filter, Printer, ChevronRight, ChevronDown, 
  Layers, Package, Truck, ClipboardList, ShoppingCart, Search, RefreshCw, CheckCircle, Split, ArrowUpDown, ArrowUp, ArrowDown, X, Plus, Sparkles, CheckSquare, Square 
} from 'lucide-react';
import { WorkOrder, BOM, Item, PurchaseOrder, JobworkChallan, JobCard, FIXED_ITEM_CLASSES, generateNextPONumber } from '../../types/erp';

export const ShortageModule: React.FC = () => {
  const { 
    workOrders, boms, items, jobworks, jobCards, purchaseOrders, vendors,
    addPurchaseOrder, addJobworkChallan, addJobCard, setActiveModule, itemProcessCards 
  } = useERP();

  // Top Tabs
  const [activeTab, setActiveTab] = useState<'ITEM_WISE_SHORTAGE' | 'WO_SHORTAGE' | 'PO_SHORTAGE' | 'JOBWORK_SHORTAGE' | 'JOBCARD_SHORTAGE'>('ITEM_WISE_SHORTAGE');

  // Selected WOs Filter
  const [selectedWOIds, setSelectedWOIds] = useState<string[]>([]);
  
  // Universal Shortage Controls
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isExplodeAllBOMs, setIsExplodeAllBOMs] = useState(false);
  const [shortageFilterMode, setShortageFilterMode] = useState<'SHORTAGE_ONLY' | 'ALL_ITEMS'>('SHORTAGE_ONLY');
  const [woSearchTerm, setWoSearchTerm] = useState('');
  const [tableSearchTerm, setTableSearchTerm] = useState('');
  const deferredWoSearchTerm = useDeferredValue(woSearchTerm);
  const deferredTableSearchTerm = useDeferredValue(tableSearchTerm);
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});

  // Simulation Quantities (key: woId -> simulated qty)
  const [simulatedQuantities, setSimulatedQuantities] = useState<Record<string, number>>({});

  // Dynamic Sticky Filter Bar Height for Tab 1
  const card2Ref = useRef<HTMLDivElement>(null);
  const [card2Height, setCard2Height] = useState<number>(82);

  useLayoutEffect(() => {
    if (card2Ref.current) {
      const updateHeight = () => {
        if (card2Ref.current) {
          setCard2Height(card2Ref.current.offsetHeight);
        }
      };
      updateHeight();
      const ro = new ResizeObserver(updateHeight);
      ro.observe(card2Ref.current);
      return () => ro.disconnect();
    }
  }, []);

  // Helper to get open PO quantity
  const getOpenPOQuantity = (item: Item | undefined, itemCode: string) => {
    return purchaseOrders
      .filter(po => po.status !== 'GOODS_RECEIVED' && po.status !== 'CANCELLED' && po.status !== 'REJECTED' && !(po as any).isDeleted)
      .reduce((sum, po) => {
        const line = po.items.find(pi => (item && pi.itemId === item.id) || pi.itemCode === itemCode);
        if (!line) return sum;
        const ordered = line.quantity || line.orderedQty || 0;
        const received = line.receivedQty || 0;
        return sum + Math.max(0, ordered - received);
      }, 0);
  };

  // --- ITEM-WISE SHORTAGE STATE ---
  type ItemWiseSortField = 
    | 'srNo'
    | 'priority'
    | 'leadTimeDays'
    | 'partCode' 
    | 'itemCode' 
    | 'itemName' 
    | 'category' 
    | 'processType' 
    | 'demandFrom'
    | 'totalRequired' 
    | 'inHouseStock' 
    | 'pendingPO' 
    | 'pendingJW' 
    | 'pendingQC' 
    | 'shortage' 
    | 'minStockLevel';

  const [itemWiseSearch, setItemWiseSearch] = useState('');
  const deferredItemWiseSearch = useDeferredValue(itemWiseSearch);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('gec_shortage_selected_item_ids');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [componentSearchTerm, setComponentSearchTerm] = useState('');
  const deferredComponentSearchTerm = useDeferredValue(componentSearchTerm);
  const [selectedClassFilters, setSelectedClassFilters] = useState<string[]>([]);
  const [selectedProcessFilter, setSelectedProcessFilter] = useState<string>('ALL');
  const [itemTargetQuantities, setItemTargetQuantities] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem('gec_shortage_item_target_quantities');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('gec_shortage_selected_item_ids', JSON.stringify(selectedItemIds));
    } catch {}
  }, [selectedItemIds]);

  useEffect(() => {
    try {
      localStorage.setItem('gec_shortage_item_target_quantities', JSON.stringify(itemTargetQuantities));
    } catch {}
  }, [itemTargetQuantities]);

  // Optimized Fast Item Suggestions for Item-Wise Search (Deferred + Tokenized)
  const itemSuggestions = useMemo(() => {
    const term = deferredItemWiseSearch.trim().toLowerCase();
    if (!term) return [];
    const tokens = term.split(/\s+/).filter(Boolean);
    const selectedSet = new Set(selectedItemIds);
    const matches: Item[] = [];

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (it.isBlocked || selectedSet.has(it.id)) continue;
      const str = `${it.itemCode} ${it.name} ${it.partCode || ''} ${it.category || ''}`.toLowerCase();
      if (tokens.every(t => str.includes(t))) {
        matches.push(it);
        if (matches.length >= 15) break; // Fast early exit
      }
    }
    return matches;
  }, [items, deferredItemWiseSearch, selectedItemIds]);

  // Fast Filtered Work Orders for Selection (Deferred + Tokenized)
  const filteredWorkOrdersForSelection = useMemo(() => {
    const term = deferredWoSearchTerm.trim().toLowerCase();
    const tokens = term ? term.split(/\s+/).filter(Boolean) : [];
    return workOrders.filter(w => {
      if (w.status !== 'IN_PROGRESS' && w.status !== 'PLANNED') return false;
      if (tokens.length === 0) return true;
      const str = `${w.workOrderNo || ''} ${(w as any).woNumber || ''} ${w.machineModel || ''} ${w.customerName || ''}`.toLowerCase();
      return tokens.every(t => str.includes(t));
    });
  }, [workOrders, deferredWoSearchTerm]);

  const [itemWiseSortField, setItemWiseSortField] = useState<ItemWiseSortField>('priority');
  const [itemWiseSortOrder, setItemWiseSortOrder] = useState<'asc' | 'desc'>('asc');

  // --- TAB 3-4 (PO / JOB WORK) SHORTAGE SORT STATE ---
  const [procSortField, setProcSortField] = useState<'priority' | 'leadTimeDays' | 'itemCode' | 'itemName' | 'category' | 'processType' | 'totalRequired' | 'inHouseStock' | 'openPO' | 'pendingJW' | 'netShortage'>('priority');
  const [procSortOrder, setProcSortOrder] = useState<'asc' | 'desc'>('asc');

  const handleProcSortToggle = (field: typeof procSortField) => {
    if (procSortField === field) {
      setProcSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setProcSortField(field);
      setProcSortOrder('asc');
    }
  };

  // --- IN-HOUSE JOB CARD SHORTAGE UPGRADE STATE ---
  const [jcFilterByWO, setJcFilterByWO] = useState<boolean>(false);
  const [selectedJCWOIds, setSelectedJCWOIds] = useState<string[]>([]);
  const [jcWOSearchTerm, setJcWOSearchTerm] = useState<string>('');
  const deferredJcWOSearchTerm = useDeferredValue(jcWOSearchTerm);
  const [selectedJCIds, setSelectedJCIds] = useState<string[]>([]);
  const [jcSearchTerm, setJcSearchTerm] = useState<string>('');
  const deferredJcSearchTerm = useDeferredValue(jcSearchTerm);
  const [jcTableSearchTerm, setJcTableSearchTerm] = useState<string>('');
  const deferredJcTableSearchTerm = useDeferredValue(jcTableSearchTerm);
  const [jcSortField, setJcSortField] = useState<'priority' | 'leadTimeDays' | 'itemCode' | 'itemName' | 'category' | 'processType' | 'totalRequired' | 'issuedQty' | 'netRemainingReq' | 'inHouseStock' | 'shortage'>('priority');
  const [jcSortOrder, setJcSortOrder] = useState<'asc' | 'desc'>('asc');

  const handleItemWiseSortToggle = (field: ItemWiseSortField) => {
    if (itemWiseSortField === field) {
      setItemWiseSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setItemWiseSortField(field);
      setItemWiseSortOrder(field === 'priority' ? 'asc' : 'desc');
    }
  };

  const handleJcSortToggle = (field: typeof jcSortField) => {
    if (jcSortField === field) {
      setJcSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setJcSortField(field);
      setJcSortOrder(field === 'priority' ? 'asc' : 'desc');
    }
  };

  // Print Modal State
  const [printModalOpen, setPrintModalOpen] = useState(false);

  // Dual Source Split Modal State
  const [dualModalData, setDualModalData] = useState<{
    item: Item;
    wo?: WorkOrder;
    netShortage: number;
    poQty: number;
    jwQty: number;
    vendorId: string;
    jwVendorId: string;
    processTypeChoice: 'PO_ONLY' | 'JW_ONLY' | 'SPLIT';
  } | null>(null);

  const toggleNode = (nodeKey: string) => {
    setExpandedNodes(prev => ({ ...prev, [nodeKey]: !prev[nodeKey] }));
  };

  const handleSimulatedQtyChange = (key: string, qty: number) => {
    setSimulatedQuantities(prev => ({ ...prev, [key]: Math.max(0, qty) }));
  };

  const handleItemTargetQtyChange = (itemId: string, qty: number) => {
    setItemTargetQuantities(prev => ({ ...prev, [itemId]: Math.max(0, qty) }));
  };

  const handleQuickPrint = () => {
    setIsPrintModalOpen(true);
  };

  // Helper to test if item is Bought-Out
  const isBoughtOutItem = (item: Item) => {
    const p = (item.processType || (item as any).materialProcessType || '').toLowerCase();
    const cat = (item.category || '').toUpperCase();
    const sources = (item.materialProcessSources || []).map(s => s.toLowerCase());
    return p.includes('bought out') || p.includes('brought out') || cat === 'BO' || sources.includes('bought out') || sources.includes('brought out');
  };

  // Helper to test if item is Job Work
  const isJobWorkItem = (item: Item) => {
    const p = (item.processType || (item as any).materialProcessType || '').toLowerCase();
    const sources = (item.materialProcessSources || []).map(s => s.toLowerCase());
    return p.includes('job work') || p.includes('jobwork') || sources.includes('job work') || sources.includes('jobwork');
  };

  // Helper to test if item is In-House
  const isInHouseItem = (item: Item) => {
    const p = (item.processType || (item as any).materialProcessType || '').toLowerCase();
    const cat = (item.category || '').toUpperCase();
    const sources = (item.materialProcessSources || []).map(s => s.toLowerCase());
    return p.includes('in-house') || p.includes('inhouse') || cat === 'MF' || cat === 'AS' || cat === 'FAS' || cat === 'SA' || cat === 'FP' || cat === 'FG' || sources.includes('in-house');
  };

  // -------------------------------------------------------------
  // INDIVIDUAL ITEM SUMMARY & BUILDABLE CAPACITY (FOR TOP ROWS)
  // -------------------------------------------------------------
  const calculateItemShortageDetail = (item: Item) => {
    const targetQty = itemTargetQuantities[item.id] !== undefined ? itemTargetQuantities[item.id] : 0;
    const matchingBOM = boms.find(b => 
      b.id === item.id ||
      b.machineModel?.toLowerCase() === item.name.toLowerCase() || 
      b.bomCode?.toLowerCase() === item.itemCode.toLowerCase()
    );

    if (!matchingBOM || !matchingBOM.components || matchingBOM.components.length === 0) {
      const inHouse = item.inHouseStock || 0;
      const minStock = item.minStockQty !== undefined ? item.minStockQty : (item.reorderLevel || 0);
      const openPO = getOpenPOQuantity(item, item.itemCode);
      const pendingJW = jobworks
        .filter(jw => jw.status !== 'COMPLETED' && jw.status !== 'CANCELLED' && !(jw as any).isDeleted)
        .reduce((sum, jw) => (jw.itemId === item.id || jw.itemCode === item.itemCode) ? sum + (jw.pendingBalance ?? jw.sentQuantity ?? 0) : sum, 0);
      const pendingQC = item.pendingQCStock || 0;
      const totalPipelineSupply = inHouse + openPO + pendingJW + pendingQC;
      const netShortage = Math.max(0, (targetQty + minStock) - totalPipelineSupply);
      return {
        item,
        matchingBOM: null,
        targetQty,
        maxBuildable: inHouse,
        constrainingComponent: targetQty > 0 && totalPipelineSupply < (targetQty + minStock) ? `${item.itemCode} (Direct Stock Shortage)` : undefined,
        components: [],
        hasShortage: netShortage > 0 || (targetQty > 0 && totalPipelineSupply <= minStock)
      };
    }

    let minBuildable = Infinity;
    let bottleneckComp = '';

    // Virtual stock map for this item's calculation simulation (Real inventory is never mutated!)
    const localVirtualStock = new Map<string, number>();
    items.forEach(it => {
      localVirtualStock.set(it.id, it.inHouseStock || 0);
      if (it.itemCode) localVirtualStock.set(it.itemCode.toLowerCase(), it.inHouseStock || 0);
    });

    const getLocalStock = (id: string, code?: string) => {
      if (id && localVirtualStock.has(id)) return localVirtualStock.get(id)!;
      if (code && localVirtualStock.has(code.toLowerCase())) return localVirtualStock.get(code.toLowerCase())!;
      return 0;
    };

    const allocateLocalStock = (id: string, code: string | undefined, req: number) => {
      const avail = getLocalStock(id, code);
      const alloc = Math.min(avail, req);
      const rem = avail - alloc;
      if (id) localVirtualStock.set(id, rem);
      if (code) localVirtualStock.set(code.toLowerCase(), rem);
      return alloc;
    };

    const compLinesMap = new Map<string, any>();

    const explodeCompTree = (
      bom: BOM,
      multiplier: number,
      visited = new Set<string>()
    ) => {
      if (visited.has(bom.id)) return;
      visited.add(bom.id);

      bom.components.forEach(comp => {
        const childIt = items.find(i => i.id === comp.itemId || (comp.itemCode && i.itemCode.toLowerCase() === comp.itemCode.toLowerCase()));
        const qtyPer = comp.qtyPerMachine || 1;
        const totalReq = qtyPer * multiplier;
        const key = comp.itemCode || comp.itemId || 'unknown';

        const inHouse = childIt ? (childIt.inHouseStock || 0) : 0;
        const external = childIt ? (childIt.externalStock || 0) : 0;
        const minStock = childIt ? (childIt.minStockQty !== undefined ? childIt.minStockQty : (childIt.reorderLevel || 0)) : 0;
        const openPO = getOpenPOQuantity(childIt, comp.itemCode);
        const pendingJW = jobworks
          .filter(jw => jw.status !== 'COMPLETED' && jw.status !== 'CANCELLED' && !(jw as any).isDeleted)
          .reduce((sum, jw) => (jw.itemId === comp.itemId || jw.itemCode === comp.itemCode) ? sum + (jw.pendingBalance ?? jw.sentQuantity ?? 0) : sum, 0);
        const pendingQC = childIt?.pendingQCStock || 0;

        // Virtual stock allocation for this requirement
        const allocated = targetQty > 0 ? allocateLocalStock(childIt?.id || comp.itemId, childIt?.itemCode || comp.itemCode, totalReq) : 0;
        const compNetShortage = targetQty > 0 ? Math.max(0, totalReq - allocated) : 0;

        if (!compLinesMap.has(key)) {
          compLinesMap.set(key, {
            itemId: comp.itemId || childIt?.id || '',
            itemCode: comp.itemCode || childIt?.itemCode || '',
            itemName: comp.itemName || childIt?.name || '',
            childItem: childIt,
            category: childIt?.category || 'Component',
            processType: childIt?.processType || 'In-house',
            qtyPerItem: qtyPer,
            totalRequired: totalReq,
            inHouseStock: inHouse,
            externalStock: external,
            minStockQty: minStock,
            netShortage: compNetShortage,
            isShortage: compNetShortage > 0,
            unit: comp.unit || childIt?.unit || 'PCS'
          });
        } else {
          const existing = compLinesMap.get(key)!;
          existing.totalRequired += totalReq;
          existing.netShortage += compNetShortage;
          existing.isShortage = existing.netShortage > 0;
        }

        // Buildable calculation
        const buildableUnits = Math.floor(inHouse / Math.max(1, qtyPer));
        if (buildableUnits < minBuildable) {
          minBuildable = buildableUnits;
          bottleneckComp = `${comp.itemCode} (${comp.itemName}) - Stock: ${inHouse} ${comp.unit || 'PCS'}, Needs ${qtyPer} per unit`;
        }

        // Tree Pruning: Only explode child sub-BOM if isExplodeAllBOMs is true AND compNetShortage > 0
        if (compNetShortage > 0) {
          if (isExplodeAllBOMs) {
            const childBOM = boms.find(b => 
              b.id === childIt?.id || 
              (childIt?.itemCode && b.bomCode?.toLowerCase() === childIt.itemCode.toLowerCase()) || 
              (childIt?.name && b.machineModel?.toLowerCase() === childIt.name.toLowerCase())
            );
            if (childBOM) {
              explodeCompTree(childBOM, compNetShortage, new Set(visited));
            }
          }

          // Process Card raw material link (direct material before process)
          const procCard = (itemProcessCards || []).find(pc => 
            (childIt?.id && pc.itemId === childIt.id) || 
            (childIt?.itemCode && (pc.itemCode?.toLowerCase() === childIt.itemCode.toLowerCase() || pc.itemId === childIt.itemCode))
          );
          if (procCard && (procCard.rawItemId || procCard.rawItemCode)) {
            const rawItem = items.find(i => 
              (procCard.rawItemId && i.id === procCard.rawItemId) || 
              (procCard.rawItemCode && i.itemCode.toLowerCase() === procCard.rawItemCode.toLowerCase())
            );
            if (rawItem) {
              const rawKey = rawItem.itemCode || rawItem.id;
              const rawReq = compNetShortage;
              const rawInHouse = rawItem.inHouseStock || 0;
              const rawExternal = rawItem.externalStock || 0;
              const rawMinStock = rawItem.minStockQty !== undefined ? rawItem.minStockQty : (rawItem.reorderLevel || 0);
              const rawAlloc = allocateLocalStock(rawItem.id, rawItem.itemCode, rawReq);
              const rawShortage = Math.max(0, rawReq - rawAlloc);

              if (!compLinesMap.has(rawKey)) {
                compLinesMap.set(rawKey, {
                  itemId: rawItem.id,
                  itemCode: rawItem.itemCode,
                  itemName: `${rawItem.name} [Material Before Process for ${comp.itemCode}]`,
                  childItem: rawItem,
                  category: rawItem.category || 'RM',
                  processType: (rawItem.processType || 'Bought out') as any,
                  qtyPerItem: qtyPer,
                  totalRequired: rawReq,
                  inHouseStock: rawInHouse,
                  externalStock: rawExternal,
                  minStockQty: rawMinStock,
                  netShortage: rawShortage,
                  isShortage: rawShortage > 0,
                  unit: rawItem.unit || 'PCS'
                });
              } else {
                const existingRaw = compLinesMap.get(rawKey)!;
                existingRaw.totalRequired += rawReq;
                existingRaw.netShortage += rawShortage;
                existingRaw.isShortage = existingRaw.netShortage > 0;
              }
            }
          }
        }
      });
    };

    explodeCompTree(matchingBOM, targetQty);
    const allCompLines = Array.from(compLinesMap.values());
    const maxBuildable = minBuildable === Infinity ? 0 : minBuildable;
    const hasShortage = allCompLines.some(c => c.isShortage);

    return {
      item,
      matchingBOM,
      targetQty,
      maxBuildable,
      constrainingComponent: targetQty > 0 && maxBuildable < targetQty ? bottleneckComp : undefined,
      components: allCompLines,
      hasShortage
    };
  };

  const plannedItemDetails = items
    .filter(i => selectedItemIds.includes(i.id))
    .map(calculateItemShortageDetail);

  // -------------------------------------------------------------
  // CONSOLIDATED MULTI-ITEM SHORTAGE ($X + Y$) TREE PRUNING AGGREGATION
  // -------------------------------------------------------------
  const consolidatedItemWiseData = useMemo(() => {
    // 1. Fast Maps for O(1) lookups
    const itemById = new Map<string, Item>();
    const itemByCode = new Map<string, Item>();
    items.forEach(it => {
      if (it.id) itemById.set(it.id, it);
      if (it.itemCode) itemByCode.set(it.itemCode.toLowerCase(), it);
    });

    const bomById = new Map<string, BOM>();
    const bomByCode = new Map<string, BOM>();
    const bomByModel = new Map<string, BOM>();
    boms.forEach(b => {
      if (b.id) bomById.set(b.id, b);
      if (b.bomCode) bomByCode.set(b.bomCode.toLowerCase(), b);
      if (b.machineModel) bomByModel.set(b.machineModel.toLowerCase(), b);
    });

    const procCardByItem = new Map<string, any>();
    (itemProcessCards || []).forEach(pc => {
      if (pc.itemId) procCardByItem.set(pc.itemId, pc);
      if (pc.itemCode) procCardByItem.set(pc.itemCode.toLowerCase(), pc);
    });

    // 2. Cloned Virtual Inventory Map - REAL INVENTORY IS NEVER MUTATED!
    const virtualStockMap = new Map<string, number>();
    items.forEach(it => {
      const stock = it.inHouseStock || 0;
      if (it.id) virtualStockMap.set(it.id, stock);
      if (it.itemCode) virtualStockMap.set(it.itemCode.toLowerCase(), stock);
    });

    const getVirtualStock = (itemId: string, itemCode?: string): number => {
      if (itemId && virtualStockMap.has(itemId)) return virtualStockMap.get(itemId)!;
      if (itemCode && virtualStockMap.has(itemCode.toLowerCase())) return virtualStockMap.get(itemCode.toLowerCase())!;
      return 0;
    };

    const allocateVirtualStock = (itemId: string, itemCode: string | undefined, qty: number): number => {
      const current = getVirtualStock(itemId, itemCode);
      const allocated = Math.min(current, qty);
      const remaining = current - allocated;
      if (itemId) virtualStockMap.set(itemId, remaining);
      if (itemCode) virtualStockMap.set(itemCode.toLowerCase(), remaining);
      return allocated;
    };

    // 3. Consolidated Output Item Map
    const itemMap = new Map<string, {
      itemId: string;
      itemCode: string;
      partCode: string;
      itemName: string;
      category: string;
      processType: string;
      unit: string;
      totalRequired: number;
      itemObj?: Item;
      requiredByItems: Array<{
        itemId: string;
        itemCode: string;
        itemName: string;
        targetQty: number;
        requiredQty: number;
        isShortageInduced?: boolean;
      }>;
    }>();

    const registerItemDemand = (
      childItem: Item | undefined,
      fallbackKey: string,
      reqQty: number,
      parentContext: { itemId: string; itemCode: string; itemName: string; targetQty: number; isShortageInduced?: boolean }
    ) => {
      if (reqQty < 0) return;
      const key = (childItem?.itemCode || fallbackKey || childItem?.id || 'unknown').toLowerCase();
      const displayKey = childItem?.itemCode || fallbackKey || childItem?.id || 'unknown';

      let entry = itemMap.get(key);
      if (!entry) {
        const pSource = (childItem?.materialProcessSources && childItem.materialProcessSources.length > 0)
          ? childItem.materialProcessSources.join(', ')
          : childItem?.processType || 'In-house';

        entry = {
          itemId: childItem?.id || fallbackKey || '',
          itemCode: childItem?.itemCode || displayKey,
          partCode: childItem?.partCode || '',
          itemName: childItem?.name || displayKey,
          category: childItem?.category || 'Component',
          processType: pSource,
          unit: childItem?.unit || 'PCS',
          totalRequired: 0,
          itemObj: childItem,
          requiredByItems: []
        };
        itemMap.set(key, entry);
      }

      entry.totalRequired += reqQty;
      const existingReq = entry.requiredByItems.find(r => r.itemId === parentContext.itemId);
      if (existingReq) {
        existingReq.requiredQty += reqQty;
      } else {
        entry.requiredByItems.push({
          itemId: parentContext.itemId,
          itemCode: parentContext.itemCode,
          itemName: parentContext.itemName,
          targetQty: parentContext.targetQty,
          requiredQty: reqQty,
          isShortageInduced: parentContext.isShortageInduced
        });
      }
    };

    // 4. Recursive Shortage Branch Explosion with Cycle Detection (Only active when isExplodeAllBOMs is true)
    const explodeShortageBranch = (
      targetItem: Item | undefined,
      itemKey: string,
      shortageQty: number,
      visited: Set<string>
    ) => {
      if (!targetItem || shortageQty <= 0) return;
      const targetId = targetItem.id;
      if (visited.has(targetId)) return;
      const nextVisited = new Set(visited);
      nextVisited.add(targetId);

      // (A) Check if targetItem has a sub-assembly BOM (Only explode if isExplodeAllBOMs is ON)
      if (isExplodeAllBOMs) {
        const subBOM = bomById.get(targetItem.id) ||
          bomByCode.get((targetItem.itemCode || '').toLowerCase()) ||
          bomByModel.get((targetItem.name || '').toLowerCase());

        if (subBOM && subBOM.components && subBOM.components.length > 0) {
          subBOM.components.forEach(subComp => {
            const subChild = itemById.get(subComp.itemId) || itemByCode.get((subComp.itemCode || '').toLowerCase());
            const subReq = (subComp.qtyPerMachine || 1) * shortageQty;
            const subContext = {
              itemId: targetItem.id,
              itemCode: targetItem.itemCode,
              itemName: `${targetItem.name} [Sub-assembly Shortage]`,
              targetQty: shortageQty,
              isShortageInduced: true
            };

            registerItemDemand(subChild, subComp.itemCode || subComp.itemId, subReq, subContext);
            const subAlloc = allocateVirtualStock(subChild?.id || subComp.itemId, subChild?.itemCode || subComp.itemCode, subReq);
            const subShortage = Math.max(0, subReq - subAlloc);

            // Tree Pruning: Only explode deeper into child sub-assemblies if subShortage > 0
            if (subShortage > 0) {
              explodeShortageBranch(subChild, subComp.itemCode || subComp.itemId, subShortage, nextVisited);
            }
          });
        }
      }

      // (B) Check if targetItem has a Process Card (casting / material before process)
      const procCard = procCardByItem.get(targetItem.id) || procCardByItem.get((targetItem.itemCode || '').toLowerCase());
      if (procCard && (procCard.rawItemId || procCard.rawItemCode)) {
        const rawKey = procCard.rawItemId || procCard.rawItemCode || '';
        if (rawKey && !visited.has(`proc_${rawKey}`)) {
          const rawItem = itemById.get(procCard.rawItemId) || itemByCode.get((procCard.rawItemCode || '').toLowerCase());
          const rawReq = shortageQty; // 1:1 input material
          const rawContext = {
            itemId: targetItem.id,
            itemCode: targetItem.itemCode,
            itemName: `${targetItem.name} [Material Before Process]`,
            targetQty: shortageQty,
            isShortageInduced: true
          };

          registerItemDemand(rawItem, rawKey, rawReq, rawContext);
          const rawAlloc = allocateVirtualStock(rawItem?.id || rawKey, rawItem?.itemCode || procCard.rawItemCode, rawReq);
          const rawShortage = Math.max(0, rawReq - rawAlloc);

          if (rawShortage > 0 && isExplodeAllBOMs) {
            const procVisited = new Set(nextVisited);
            procVisited.add(`proc_${rawKey}`);
            explodeShortageBranch(rawItem, rawKey, rawShortage, procVisited);
          }
        }
      }
    };

    // 5. Traverse user-selected parent items & explode demand with Tree Pruning
    selectedItemIds.forEach(itemId => {
      const parentItem = itemById.get(itemId);
      if (!parentItem) return;
      const targetQty = itemTargetQuantities[itemId] !== undefined ? itemTargetQuantities[itemId] : 0;
      if (targetQty <= 0) return;

      const matchingBOM = bomById.get(parentItem.id) ||
        bomByCode.get((parentItem.itemCode || '').toLowerCase()) ||
        bomByModel.get((parentItem.name || '').toLowerCase());

      if (matchingBOM && matchingBOM.components && matchingBOM.components.length > 0) {
        // Direct components of the planned finished item
        matchingBOM.components.forEach(comp => {
          const childIt = itemById.get(comp.itemId) || itemByCode.get((comp.itemCode || '').toLowerCase());
          const qtyPer = comp.qtyPerMachine || 1;
          const totalReq = qtyPer * targetQty;
          const parentContext = {
            itemId: parentItem.id,
            itemCode: parentItem.itemCode,
            itemName: parentItem.name,
            targetQty
          };

          registerItemDemand(childIt, comp.itemCode || comp.itemId, totalReq, parentContext);
          const allocated = allocateVirtualStock(childIt?.id || comp.itemId, childIt?.itemCode || comp.itemCode, totalReq);
          const childShortage = Math.max(0, totalReq - allocated);

          // Tree Pruning: Only explode child sub-assembly if isExplodeAllBOMs is true AND childShortage > 0
          if (childShortage > 0) {
            if (isExplodeAllBOMs) {
              explodeShortageBranch(childIt, comp.itemCode || comp.itemId, childShortage, new Set([parentItem.id]));
            } else {
              // If Explode is OFF, check only if this direct child component has a direct Process Card (raw casting)
              const childProcCard = procCardByItem.get(childIt?.id || '') || procCardByItem.get((childIt?.itemCode || '').toLowerCase());
              if (childProcCard && (childProcCard.rawItemId || childProcCard.rawItemCode)) {
                const rawKey = childProcCard.rawItemId || childProcCard.rawItemCode || '';
                const rawItem = itemById.get(childProcCard.rawItemId) || itemByCode.get((childProcCard.rawItemCode || '').toLowerCase());
                const rawReq = childShortage;
                const rawContext = {
                  itemId: childIt?.id || comp.itemId,
                  itemCode: childIt?.itemCode || comp.itemCode,
                  itemName: `${childIt?.name || comp.itemName} [Material Before Process]`,
                  targetQty: childShortage,
                  isShortageInduced: true
                };
                registerItemDemand(rawItem, rawKey, rawReq, rawContext);
                allocateVirtualStock(rawItem?.id || rawKey, rawItem?.itemCode || childProcCard.rawItemCode, rawReq);
              }
            }
          }
        });
      } else {
        // Parent item itself has no BOM (e.g. standalone raw material or single component)
        const parentContext = {
          itemId: parentItem.id,
          itemCode: parentItem.itemCode,
          itemName: parentItem.name,
          targetQty
        };
        registerItemDemand(parentItem, parentItem.id, targetQty, parentContext);
        const allocated = allocateVirtualStock(parentItem.id, parentItem.itemCode, targetQty);
        const parentShortage = Math.max(0, targetQty - allocated);

        if (parentShortage > 0) {
          explodeShortageBranch(parentItem, parentItem.itemCode || parentItem.id, parentShortage, new Set());
        }
      }
    });

    // 5b. Ensure structural BOM and Process Card components (especially Raw Castings) are registered so they appear in ALL_ITEMS mode
    const registerStructuralTree = (targetItem: Item | undefined, visited: Set<string>, isDirectLevel: boolean) => {
      if (!targetItem) return;
      const targetId = targetItem.id;
      if (visited.has(targetId)) return;
      const nextVisited = new Set(visited);
      nextVisited.add(targetId);

      // (A) Check if targetItem has a Process Card (Casting / Material Before Process)
      const procCard = procCardByItem.get(targetItem.id) || procCardByItem.get((targetItem.itemCode || '').toLowerCase());
      if (procCard && (procCard.rawItemId || procCard.rawItemCode)) {
        const rawKey = procCard.rawItemId || procCard.rawItemCode || '';
        const rawItem = itemById.get(procCard.rawItemId) || itemByCode.get((procCard.rawItemCode || '').toLowerCase());
        const rawContext = {
          itemId: targetItem.id,
          itemCode: targetItem.itemCode,
          itemName: `${targetItem.name} [Material Before Process]`,
          targetQty: 0,
          isShortageInduced: false
        };
        registerItemDemand(rawItem, rawKey, 0, rawContext);
        if (rawItem && !visited.has(`proc_${rawKey}`) && isExplodeAllBOMs) {
          const procVisited = new Set(nextVisited);
          procVisited.add(`proc_${rawKey}`);
          registerStructuralTree(rawItem, procVisited, false);
        }
      }

      // (B) Check if targetItem has a BOM
      if (isDirectLevel || isExplodeAllBOMs) {
        const subBOM = bomById.get(targetItem.id) ||
          bomByCode.get((targetItem.itemCode || '').toLowerCase()) ||
          bomByModel.get((targetItem.name || '').toLowerCase());

        if (subBOM && subBOM.components && subBOM.components.length > 0) {
          subBOM.components.forEach(subComp => {
            const subChild = itemById.get(subComp.itemId) || itemByCode.get((subComp.itemCode || '').toLowerCase());
            const subContext = {
              itemId: targetItem.id,
              itemCode: targetItem.itemCode,
              itemName: `${targetItem.name} [Sub-assembly]`,
              targetQty: 0,
              isShortageInduced: false
            };
            registerItemDemand(subChild, subComp.itemCode || subComp.itemId, 0, subContext);
            if (subChild) {
              // Also register direct process card raw castings for direct level components
              const childProcCard = procCardByItem.get(subChild.id) || procCardByItem.get((subChild.itemCode || '').toLowerCase());
              if (childProcCard && (childProcCard.rawItemId || childProcCard.rawItemCode)) {
                const cRawKey = childProcCard.rawItemId || childProcCard.rawItemCode || '';
                const cRawItem = itemById.get(childProcCard.rawItemId) || itemByCode.get((childProcCard.rawItemCode || '').toLowerCase());
                const cRawContext = {
                  itemId: subChild.id,
                  itemCode: subChild.itemCode,
                  itemName: `${subChild.name} [Material Before Process]`,
                  targetQty: 0,
                  isShortageInduced: false
                };
                registerItemDemand(cRawItem, cRawKey, 0, cRawContext);
              }

              // Recurse to lower levels only if isExplodeAllBOMs is true
              if (isExplodeAllBOMs) {
                registerStructuralTree(subChild, nextVisited, false);
              }
            }
          });
        }
      }
    };

    selectedItemIds.forEach(itemId => {
      const parentItem = itemById.get(itemId);
      if (parentItem) {
        registerStructuralTree(parentItem, new Set(), true);
      }
    });

    // 6. Build final table rows with real stock comparison and pre-indexed search strings
    return Array.from(itemMap.values()).map((c, idx) => {
      const childItem = c.itemObj || itemById.get(c.itemId) || itemByCode.get(c.itemCode.toLowerCase());
      const inHouse = childItem ? (childItem.inHouseStock || 0) : 0;
      const minStock = childItem ? (childItem.minStockQty !== undefined ? childItem.minStockQty : (childItem.reorderLevel || 0)) : 0;
      const openPO = getOpenPOQuantity(childItem, c.itemCode);
      const pendingJW = jobworks
        .filter(jw => jw.status !== 'COMPLETED' && jw.status !== 'CANCELLED' && !(jw as any).isDeleted)
        .reduce((sum, jw) => (jw.itemId === c.itemId || jw.itemCode === c.itemCode) ? sum + (jw.pendingBalance ?? jw.sentQuantity ?? 0) : sum, 0);
      const pendingQC = childItem?.pendingQCStock || 0;
      const totalPipelineSupply = inHouse + openPO + pendingJW + pendingQC;
      const shortage = Math.max(0, c.totalRequired - inHouse);
      const minShortage = Math.max(0, (c.totalRequired + minStock) - totalPipelineSupply);
      const isShortage = shortage > 0 || minShortage > 0;

      const demandText = (c.requiredByItems || []).map(r => `${r.itemCode} ${r.itemName}`).join(' ').toLowerCase();
      const _searchStr = `${c.partCode || ''} ${c.itemCode} ${c.itemName} ${c.category} ${c.processType} ${demandText}`.toLowerCase();

      return {
        ...c,
        srNo: idx + 1,
        partCode: childItem?.partCode || c.partCode || '',
        itemObj: childItem,
        inHouseStock: inHouse,
        pendingPO: openPO,
        pendingJW,
        pendingQC,
        minStockLevel: minStock,
        shortage,
        minShortage,
        isShortage,
        _searchStr
      };
    });
  }, [selectedItemIds, itemTargetQuantities, items, boms, jobworks, purchaseOrders, itemProcessCards, isExplodeAllBOMs]);

  // Filtered Consolidated Components ($X + Y$) with Tokenized Search
  const filteredConsolidatedItems = useMemo(() => {
    const cleanSearch = deferredComponentSearchTerm.trim().toLowerCase();
    const searchTokens = cleanSearch ? cleanSearch.split(/\s+/).filter(Boolean) : [];

    const list = consolidatedItemWiseData.filter(c => {
      if (selectedClassFilters.length > 0 && !selectedClassFilters.includes(c.category)) {
        return false;
      }
      if (selectedProcessFilter !== 'ALL') {
        if (selectedProcessFilter === 'BO' && !isBoughtOutItem(c.itemObj || c as any)) return false;
        if (selectedProcessFilter === 'JW' && !isJobWorkItem(c.itemObj || c as any)) return false;
        if (selectedProcessFilter === 'IH' && !isInHouseItem(c.itemObj || c as any)) return false;
      }
      if (shortageFilterMode === 'SHORTAGE_ONLY' && !c.isShortage) {
        return false;
      }
      if (searchTokens.length > 0) {
        if (!searchTokens.every(t => (c as any)._searchStr.includes(t))) {
          return false;
        }
      }
      return true;
    });

    // Attach leadTimeDays & dynamically assign priority based on filtered items sorted by lead time desc
    const withLeadTime = list.map(c => {
      const childItem = c.itemObj || items.find(i => i.id === c.itemId || i.itemCode === c.itemCode);
      const leadTime = childItem?.leadTimeDays !== undefined ? childItem.leadTimeDays : 10;
      return { ...c, childItem, leadTimeDays: leadTime };
    });

    const sortedByLeadTime = [...withLeadTime].sort((a, b) => {
      if (b.leadTimeDays !== a.leadTimeDays) return b.leadTimeDays - a.leadTimeDays;
      if (b.shortage !== a.shortage) return b.shortage - a.shortage;
      return (a.itemCode || '').localeCompare(b.itemCode || '');
    });

    const rankMap = new Map<string, number>();
    sortedByLeadTime.forEach((it, idx) => {
      rankMap.set(it.itemId || it.itemCode, idx + 1);
    });

    const withPriorities = withLeadTime.map(c => {
      const rank = rankMap.get(c.itemId || c.itemCode) || 1;
      return {
        ...c,
        priorityRank: `P${rank}`,
        priorityNum: rank
      };
    });

    return withPriorities.sort((a, b) => {
      if (itemWiseSortField === 'priority') {
        return itemWiseSortOrder === 'asc' ? a.priorityNum - b.priorityNum : b.priorityNum - a.priorityNum;
      }
      if (itemWiseSortField === 'leadTimeDays') {
        return itemWiseSortOrder === 'asc' ? a.leadTimeDays - b.leadTimeDays : b.leadTimeDays - a.leadTimeDays;
      }
      if (itemWiseSortField === 'demandFrom') {
        const valA = (a.requiredByItems || []).map((r: any) => r.itemCode).join(', ');
        const valB = (b.requiredByItems || []).map((r: any) => r.itemCode).join(', ');
        return itemWiseSortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }

      let valA: any = a[itemWiseSortField as keyof typeof a];
      let valB: any = b[itemWiseSortField as keyof typeof b];

      if (typeof valA === 'string') {
        valA = valA.toLowerCase();
        valB = (valB || '').toString().toLowerCase();
      }

      if (valA < valB) return itemWiseSortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return itemWiseSortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [consolidatedItemWiseData, selectedClassFilters, selectedProcessFilter, shortageFilterMode, deferredComponentSearchTerm, itemWiseSortField, itemWiseSortOrder, items]);

  // -------------------------------------------------------------
  // WORK ORDER SHORTAGE & COMBINED AGGREGATION CALCULATIONS
  // -------------------------------------------------------------
  const relevantWOs = workOrders.filter(wo => {
    if (selectedWOIds.length > 0 && !selectedWOIds.includes(wo.id)) return false;
    return wo.status === 'IN_PROGRESS' || wo.status === 'PLANNED';
  });

  // Calculate Consolidated Combined Shortage across ALL selected Work Orders
  const consolidatedMap = new Map<string, {
    itemId: string;
    itemCode: string;
    itemName: string;
    category: string;
    processType: string;
    unit: string;
    totalRequired: number;
    inHouseStock: number;
    externalStock: number;
    netShortage: number;
    isShortage: boolean;
    itemObj?: Item;
    requiredByWOs: { woId: string; woNumber: string; machineModel: string; requiredQty: number }[];
  }>();

  // Multi-level recursive BOM explosion helper for WOs
  const explodeBOMRecursively = (
    bomIdOrModel: string,
    multiplier: number,
    woContext: { woId: string; woNumber: string; machineModel: string },
    targetMap: Map<string, any>,
    visitedBOMs = new Set<string>()
  ) => {
    const bom = boms.find(b => b.id === bomIdOrModel || b.bomCode === bomIdOrModel || b.machineModel?.toLowerCase() === bomIdOrModel?.toLowerCase());
    if (!bom || !bom.components || visitedBOMs.has(bom.id)) return;
    visitedBOMs.add(bom.id);

    bom.components.forEach(comp => {
      const itemObj = items.find(i => i.id === comp.itemId || i.itemCode === comp.itemCode);
      const qtyPer = comp.qtyPerMachine || 1;
      const totalReq = qtyPer * multiplier;
      const key = comp.itemCode || comp.itemId || 'unknown';
      const inHouse = itemObj ? (itemObj.inHouseStock || 0) : 0;
      const external = itemObj ? (itemObj.externalStock || 0) : 0;
      const pSource = itemObj?.processType || 'In-house';
      const cat = itemObj?.category || 'Component';

      const subBOM = boms.find(b => b.id === itemObj?.id || b.bomCode === itemObj?.itemCode || b.machineModel?.toLowerCase() === itemObj?.name?.toLowerCase());
      if (subBOM && isExplodeAllBOMs) {
        explodeBOMRecursively(subBOM.id, totalReq, woContext, targetMap, new Set(visitedBOMs));
      }

      if (!targetMap.has(key)) {
        targetMap.set(key, {
          itemId: itemObj?.id || comp.itemId || '',
          itemCode: comp.itemCode || itemObj?.itemCode || '',
          itemName: comp.itemName || itemObj?.name || '',
          category: cat,
          processType: pSource,
          unit: comp.unit || itemObj?.unit || 'PCS',
          totalRequired: totalReq,
          inHouseStock: inHouse,
          externalStock: external,
          netShortage: 0,
          isShortage: false,
          itemObj,
          requiredByWOs: [{
            woId: woContext.woId,
            woNumber: woContext.woNumber,
            machineModel: woContext.machineModel,
            requiredQty: totalReq
          }]
        });
      } else {
        const existing = targetMap.get(key)!;
        existing.totalRequired += totalReq;
        existing.requiredByWOs.push({
          woId: woContext.woId,
          woNumber: woContext.woNumber,
          machineModel: woContext.machineModel,
          requiredQty: totalReq
        });
      }
    });
  };

  relevantWOs.forEach(wo => {
    const targetQty = wo.targetQuantity || wo.quantity || 1;
    const woContext = {
      woId: wo.id,
      woNumber: wo.workOrderNo || wo.woNumber || wo.id,
      machineModel: wo.machineModel
    };

    if (isExplodeAllBOMs) {
      explodeBOMRecursively(wo.bomId || wo.machineModel, targetQty, woContext, consolidatedMap);
    } else {
      const linkedBOM = boms.find(b => b.machineModel === wo.machineModel || b.id === wo.bomId);
      const components = wo.woComponents && wo.woComponents.length > 0
        ? wo.woComponents.map(c => ({
            itemId: c.itemId || '',
            itemCode: c.itemCode || '',
            itemName: c.itemName || '',
            qtyPerMachine: c.qtyRequired ? c.qtyRequired / (wo.quantity || 1) : 1,
            unit: c.unit || 'PCS',
            subAssemblyTag: c.subAssemblyTag || 'General Assembly'
          }))
        : (linkedBOM?.components || []);

      components.forEach(comp => {
        const itemObj = items.find(i => i.id === comp.itemId || i.itemCode === comp.itemCode);
        const totalReq = (comp.qtyPerMachine || 1) * targetQty;
        const key = comp.itemCode || comp.itemId || 'unknown';
        const inHouse = itemObj ? (itemObj.inHouseStock || 0) : 0;
        const external = itemObj ? (itemObj.externalStock || 0) : 0;
        const pSource = itemObj?.processType || 'In-house';
        const cat = itemObj?.category || 'Component';

        if (!consolidatedMap.has(key)) {
          consolidatedMap.set(key, {
            itemId: itemObj?.id || comp.itemId || '',
            itemCode: comp.itemCode || itemObj?.itemCode || '',
            itemName: comp.itemName || itemObj?.name || '',
            category: cat,
            processType: pSource,
            unit: comp.unit || itemObj?.unit || 'PCS',
            totalRequired: totalReq,
            inHouseStock: inHouse,
            externalStock: external,
            netShortage: 0,
            isShortage: false,
            itemObj,
            requiredByWOs: [{
              woId: wo.id,
              woNumber: wo.workOrderNo || wo.woNumber || wo.id,
              machineModel: wo.machineModel,
              requiredQty: totalReq
            }]
          });
        } else {
          const existing = consolidatedMap.get(key)!;
          existing.totalRequired += totalReq;
          existing.requiredByWOs.push({
            woId: wo.id,
            woNumber: wo.workOrderNo || wo.woNumber || wo.id,
            machineModel: wo.machineModel,
            requiredQty: totalReq
          });
        }
      });
    }
  });

  // Also include Job Card Demand in consolidated shortage
  const activeJCs = jobCards.filter(j => j.status !== 'COMPLETED' && j.status !== 'CANCELLED' && !(j as any).isDeleted);
  activeJCs.forEach(jc => {
    const remainingJCQty = Math.max(0, (jc.targetQuantity || 1) - (jc.completedQuantity || 0));
    if (remainingJCQty <= 0) return;
    const key = jc.itemCode || jc.itemId || 'unknown';
    const itemObj = items.find(i => i.id === jc.itemId || i.itemCode === jc.itemCode);
    const inHouse = itemObj ? (itemObj.inHouseStock || 0) : 0;
    const external = itemObj ? (itemObj.externalStock || 0) : 0;
    const pSource = itemObj?.processType || 'In-house';
    const cat = itemObj?.category || 'Component';

    if (!consolidatedMap.has(key)) {
      consolidatedMap.set(key, {
        itemId: itemObj?.id || jc.itemId || '',
        itemCode: jc.itemCode || itemObj?.itemCode || '',
        itemName: jc.itemName || itemObj?.name || '',
        category: cat,
        processType: pSource,
        unit: itemObj?.unit || 'PCS',
        totalRequired: remainingJCQty,
        inHouseStock: inHouse,
        externalStock: external,
        netShortage: 0,
        isShortage: false,
        itemObj,
        requiredByWOs: [{
          woId: jc.id,
          woNumber: jc.jobCardNo || jc.id,
          machineModel: `Job Card: ${jc.itemName || jc.itemCode}`,
          requiredQty: remainingJCQty
        }]
      });
    } else {
      const existing = consolidatedMap.get(key)!;
      existing.totalRequired += remainingJCQty;
      existing.requiredByWOs.push({
        woId: jc.id,
        woNumber: jc.jobCardNo || jc.id,
        machineModel: `Job Card: ${jc.itemName || jc.itemCode}`,
        requiredQty: remainingJCQty
      });
    }
  });

  // Process Card Indirect BOM Explosion for Work Orders & Job Cards:
  // If any item in consolidatedMap has a shortage (totalRequired > inHouseStock),
  // explode the required raw material / casting quantity into consolidatedMap!
  const woExplodeQueue = Array.from(consolidatedMap.values());
  woExplodeQueue.forEach(entry => {
    const itemObj = entry.itemObj || items.find(i => i.id === entry.itemId || i.itemCode === entry.itemCode);
    const inStock = entry.inHouseStock;
    const shortageQty = Math.max(0, entry.totalRequired - inStock);

    if (shortageQty > 0 && itemObj) {
      const procCard = (itemProcessCards || []).find(pc => 
        (itemObj.id && pc.itemId === itemObj.id) || 
        (itemObj.itemCode && (pc.itemCode?.toLowerCase() === itemObj.itemCode.toLowerCase() || pc.itemId === itemObj.itemCode))
      );
      if (procCard && (procCard.rawItemId || procCard.rawItemCode)) {
        const rawItem = items.find(i => 
          (procCard.rawItemId && i.id === procCard.rawItemId) || 
          (procCard.rawItemCode && i.itemCode.toLowerCase() === procCard.rawItemCode.toLowerCase())
        );
        if (rawItem) {
          const rawKey = rawItem.itemCode || rawItem.id;
          const inducedReq = shortageQty;
          const rawInHouse = rawItem.inHouseStock || 0;
          const rawExternal = rawItem.externalStock || 0;
          const pSource = (rawItem.processType || 'Bought out') as any;
          const cat = rawItem.category || 'RM';

          if (!consolidatedMap.has(rawKey)) {
            consolidatedMap.set(rawKey, {
              itemId: rawItem.id,
              itemCode: rawItem.itemCode,
              itemName: rawItem.name,
              category: cat,
              processType: pSource,
              unit: rawItem.unit || 'PCS',
              totalRequired: inducedReq,
              inHouseStock: rawInHouse,
              externalStock: rawExternal,
              netShortage: 0,
              isShortage: false,
              itemObj: rawItem,
              requiredByWOs: [{
                woId: entry.itemId,
                woNumber: `Process: ${entry.itemCode}`,
                machineModel: `Material Before Process for ${entry.itemName || entry.itemCode}`,
                requiredQty: inducedReq
              }]
            });
          } else {
            const existing = consolidatedMap.get(rawKey)!;
            existing.totalRequired += inducedReq;
            existing.requiredByWOs.push({
              woId: entry.itemId,
              woNumber: `Process: ${entry.itemCode}`,
              machineModel: `Material Before Process for ${entry.itemName || entry.itemCode}`,
              requiredQty: inducedReq
            });
          }
        }
      }
    }
  });

  const consolidatedShortageList = Array.from(consolidatedMap.values()).map(c => {
    const minStock = c.itemObj ? (c.itemObj.minStockQty !== undefined ? c.itemObj.minStockQty : (c.itemObj.reorderLevel || 0)) : 0;
    const openPO = getOpenPOQuantity(c.itemObj, c.itemCode);
    const pendingJW = jobworks
      .filter(jw => jw.status !== 'COMPLETED' && jw.status !== 'CANCELLED' && !(jw as any).isDeleted)
      .reduce((sum, jw) => (jw.itemId === c.itemId || jw.itemCode === c.itemCode) ? sum + (jw.pendingBalance ?? jw.sentQuantity ?? 0) : sum, 0);
    const pendingQC = c.itemObj?.pendingQCStock || 0;
    const totalPipelineSupply = c.inHouseStock + openPO + pendingJW + pendingQC;
    const netShortage = Math.max(0, (c.totalRequired + minStock) - totalPipelineSupply);
    return {
      ...c,
      minStockQty: minStock,
      netShortage,
      isShortage: netShortage > 0,
      openPO,
      pendingJW,
      pendingQC
    };
  });

  // Filtered lists for each tab based on process type and shortageFilterMode
  const activeTabConsolidatedShortages = consolidatedShortageList.filter(c => {
    let matchesTab = true;
    if (activeTab === 'PO_SHORTAGE') {
      matchesTab = isBoughtOutItem(c.itemObj || c as any) || c.processType === 'Bought out' || c.processType === 'Job work + Bought out' || c.category === 'BO';
    } else if (activeTab === 'JOBWORK_SHORTAGE') {
      matchesTab = isJobWorkItem(c.itemObj || c as any) || c.processType === 'Job work' || c.processType === 'Job work + Bought out';
    } else if (activeTab === 'JOBCARD_SHORTAGE') {
      matchesTab = isInHouseItem(c.itemObj || c as any) || c.processType === 'In-house' || c.category === 'MF' || c.category === 'AS' || c.category === 'FAS' || c.category === 'SA';
    }

    if (!matchesTab) return false;

    if (shortageFilterMode === 'SHORTAGE_ONLY') {
      return c.isShortage;
    }
    return true;
  });

  const filteredActiveTabShortages = useMemo(() => {
    const list = activeTabConsolidatedShortages.filter(c => {
      if (!deferredTableSearchTerm.trim()) return true;
      const tokens = deferredTableSearchTerm.trim().toLowerCase().split(/\s+/).filter(Boolean);
      const s = `${c.itemCode} ${c.itemName} ${c.category || ''} ${c.processType || ''}`.toLowerCase();
      return tokens.every(t => s.includes(t));
    });

    const withLeadTime = list.map(c => {
      const childItem = c.itemObj || items.find(i => i.id === c.itemId || i.itemCode === c.itemCode);
      const leadTime = childItem?.leadTimeDays !== undefined ? childItem.leadTimeDays : 10;
      return { ...c, childItem, leadTimeDays: leadTime };
    });

    const sortedByLeadTime = [...withLeadTime].sort((a, b) => {
      if (b.leadTimeDays !== a.leadTimeDays) return b.leadTimeDays - a.leadTimeDays;
      if (b.netShortage !== a.netShortage) return b.netShortage - a.netShortage;
      return (a.itemCode || '').localeCompare(b.itemCode || '');
    });

    const rankMap = new Map<string, number>();
    sortedByLeadTime.forEach((it, idx) => {
      rankMap.set(it.itemId || it.itemCode, idx + 1);
    });

    const withPriorities = withLeadTime.map(c => {
      const rank = rankMap.get(c.itemId || c.itemCode) || 1;
      return {
        ...c,
        priorityRank: `P${rank}`,
        priorityNum: rank
      };
    });

    return withPriorities.sort((a, b) => {
      if (procSortField === 'priority') {
        return procSortOrder === 'asc' ? a.priorityNum - b.priorityNum : b.priorityNum - a.priorityNum;
      }
      if (procSortField === 'leadTimeDays') {
        return procSortOrder === 'asc' ? a.leadTimeDays - b.leadTimeDays : b.leadTimeDays - a.leadTimeDays;
      }

      let valA: any = a[procSortField as keyof typeof a];
      let valB: any = b[procSortField as keyof typeof b];

      if (typeof valA === 'string') {
        valA = valA.toLowerCase();
        valB = (valB || '').toString().toLowerCase();
      }

      if (valA < valB) return procSortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return procSortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [activeTabConsolidatedShortages, deferredTableSearchTerm, procSortField, procSortOrder, items]);

  // -------------------------------------------------------------
  // IN-HOUSE JOB CARD SHORTAGE DEDICATED ENGINE
  // -------------------------------------------------------------
  const allActiveJobCards = useMemo(() => {
    return jobCards.filter(jc => jc.status !== 'CANCELLED' && jc.status !== 'COMPLETED' && !(jc as any).isDeleted);
  }, [jobCards]);

  const filteredActiveWOsForJC = useMemo(() => {
    const term = deferredJcWOSearchTerm.trim().toLowerCase();
    const tokens = term ? term.split(/\s+/).filter(Boolean) : [];
    return workOrders.filter(w => {
      if (w.status === 'COMPLETED' || w.status === 'CANCELLED' || (w as any).isDeleted) return false;
      if (tokens.length === 0) return true;
      const str = `${w.workOrderNo || ''} ${(w as any).woNumber || ''} ${w.machineModel || ''} ${w.customerName || ''}`.toLowerCase();
      return tokens.every(t => str.includes(t));
    });
  }, [workOrders, deferredJcWOSearchTerm]);

  const availableJCsForSelection = useMemo(() => {
    if (jcFilterByWO) {
      if (selectedJCWOIds.length === 0) return [];
      const woSet = new Set(selectedJCWOIds);
      const selectedWOObjs = workOrders.filter(w => woSet.has(w.id));
      const woNoSet = new Set<string>();
      selectedWOObjs.forEach(w => {
        if (w.workOrderNo) woNoSet.add(w.workOrderNo.toLowerCase());
        if ((w as any).woNumber) woNoSet.add((w as any).woNumber.toLowerCase());
      });
      return allActiveJobCards.filter(jc => 
        (jc.woId && woSet.has(jc.woId)) || 
        (jc.woNumber && woNoSet.has(jc.woNumber.toLowerCase()))
      );
    }
    return allActiveJobCards;
  }, [jcFilterByWO, selectedJCWOIds, allActiveJobCards, workOrders]);

  const filteredAvailableJCs = useMemo(() => {
    const term = deferredJcSearchTerm.trim().toLowerCase();
    if (!term) return availableJCsForSelection;
    const tokens = term.split(/\s+/).filter(Boolean);
    return availableJCsForSelection.filter(jc => {
      const str = `${jc.jobCardNo} ${jc.woNumber || ''} ${jc.itemCode} ${jc.itemName} ${jc.assignedOperator || ''}`.toLowerCase();
      return tokens.every(t => str.includes(t));
    });
  }, [availableJCsForSelection, deferredJcSearchTerm]);

  const consolidatedJCShortages = useMemo(() => {
    const set = new Set(selectedJCIds);
    const selectedJCs = allActiveJobCards.filter(jc => set.has(jc.id));
    if (selectedJCs.length === 0) return [];

    const compMap = new Map<string, {
      itemId: string;
      itemCode: string;
      itemName: string;
      partCode: string;
      category: string;
      processType: string;
      unit: string;
      totalRequired: number;
      issuedQty: number;
      netRemainingReq: number;
      inHouseStock: number;
      openPO: number;
      pendingJW: number;
      pendingQC: number;
      shortage: number;
      isShortage: boolean;
      itemObj?: Item;
      requiredByJCs: { jcId: string; jcNo: string; woNumber?: string; itemName: string; requiredQty: number; issuedQty: number }[];
      _searchStr: string;
    }>();

    selectedJCs.forEach(jc => {
      let comps = jc.components;
      if (!comps || comps.length === 0) {
        const linkedBOM = boms.find(b => b.id === jc.itemId || b.bomCode === jc.itemCode || b.machineModel?.toLowerCase() === jc.itemName?.toLowerCase());
        if (linkedBOM && linkedBOM.components) {
          comps = linkedBOM.components.map(c => ({
            itemId: c.itemId,
            itemCode: c.itemCode,
            itemName: c.itemName,
            qtyPerUnit: c.qtyPerMachine || 1,
            totalRequiredQty: (c.qtyPerMachine || 1) * (jc.targetQuantity || 1),
            issuedQty: 0,
            unit: c.unit || 'PCS'
          }));
        }
      }

      (comps || []).forEach(comp => {
        const itemObj = items.find(i => i.id === comp.itemId || i.itemCode === comp.itemCode);
        const key = (comp.itemCode || comp.itemId || 'unknown').toLowerCase();
        const req = comp.totalRequiredQty || 0;
        const issued = comp.issuedQty || 0;
        const remaining = Math.max(0, req - issued);

        let entry = compMap.get(key);
        if (!entry) {
          const inHouse = itemObj ? (itemObj.inHouseStock || 0) : 0;
          const openPO = getOpenPOQuantity(itemObj, comp.itemCode);
          const pendingJW = jobworks
            .filter(jw => jw.status !== 'COMPLETED' && jw.status !== 'CANCELLED' && !(jw as any).isDeleted)
            .reduce((sum, jw) => (jw.itemId === comp.itemId || jw.itemCode === comp.itemCode) ? sum + (jw.pendingBalance ?? jw.sentQuantity ?? 0) : sum, 0);
          const pendingQC = itemObj?.pendingQCStock || 0;
          const pSource = (itemObj?.materialProcessSources && itemObj.materialProcessSources.length > 0)
            ? itemObj.materialProcessSources.join(', ')
            : itemObj?.processType || 'In-house';
          const cat = itemObj?.category || 'Component';

          entry = {
            itemId: itemObj?.id || comp.itemId || '',
            itemCode: comp.itemCode || itemObj?.itemCode || '',
            itemName: comp.itemName || itemObj?.name || '',
            partCode: itemObj?.partCode || '',
            category: cat,
            processType: pSource,
            unit: comp.unit || itemObj?.unit || 'PCS',
            totalRequired: 0,
            issuedQty: 0,
            netRemainingReq: 0,
            inHouseStock: inHouse,
            openPO,
            pendingJW,
            pendingQC,
            shortage: 0,
            isShortage: false,
            itemObj,
            requiredByJCs: [],
            _searchStr: ''
          };
          compMap.set(key, entry);
        }

        entry.totalRequired += req;
        entry.issuedQty += issued;
        entry.netRemainingReq += remaining;
        entry.requiredByJCs.push({
          jcId: jc.id,
          jcNo: jc.jobCardNo,
          woNumber: jc.woNumber,
          itemName: jc.itemName,
          requiredQty: req,
          issuedQty: issued
        });
      });
    });

    return Array.from(compMap.values()).map(c => {
      const shortage = Math.max(0, c.netRemainingReq - c.inHouseStock);
      const isShortage = shortage > 0;
      const jcNames = c.requiredByJCs.map(r => `${r.jcNo} ${r.woNumber || ''} ${r.itemName}`).join(' ').toLowerCase();
      const _searchStr = `${c.partCode} ${c.itemCode} ${c.itemName} ${c.category} ${c.processType} ${jcNames}`.toLowerCase();
      return {
        ...c,
        shortage,
        isShortage,
        _searchStr
      };
    });
  }, [selectedJCIds, allActiveJobCards, items, boms, jobworks, purchaseOrders]);

  const filteredJCShortages = useMemo(() => {
    const term = deferredJcTableSearchTerm.trim().toLowerCase();
    const tokens = term ? term.split(/\s+/).filter(Boolean) : [];

    const list = consolidatedJCShortages.filter(c => {
      if (shortageFilterMode === 'SHORTAGE_ONLY' && !c.isShortage) return false;
      if (tokens.length > 0 && !tokens.every(t => c._searchStr.includes(t))) return false;
      return true;
    });

    const withLeadTime = list.map(c => {
      const childItem = c.itemObj || items.find(i => i.id === c.itemId || i.itemCode === c.itemCode);
      const leadTime = childItem?.leadTimeDays !== undefined ? childItem.leadTimeDays : 10;
      return { ...c, childItem, leadTimeDays: leadTime };
    });

    const sortedByLeadTime = [...withLeadTime].sort((a, b) => {
      if (b.leadTimeDays !== a.leadTimeDays) return b.leadTimeDays - a.leadTimeDays;
      if (b.shortage !== a.shortage) return b.shortage - a.shortage;
      return (a.itemCode || '').localeCompare(b.itemCode || '');
    });

    const rankMap = new Map<string, number>();
    sortedByLeadTime.forEach((it, idx) => {
      rankMap.set(it.itemId || it.itemCode, idx + 1);
    });

    const withPriorities = withLeadTime.map(c => {
      const rank = rankMap.get(c.itemId || c.itemCode) || 1;
      return {
        ...c,
        priorityRank: `P${rank}`,
        priorityNum: rank
      };
    });

    return withPriorities.sort((a, b) => {
      if (jcSortField === 'priority') {
        return jcSortOrder === 'asc' ? a.priorityNum - b.priorityNum : b.priorityNum - a.priorityNum;
      }
      if (jcSortField === 'leadTimeDays') {
        return jcSortOrder === 'asc' ? a.leadTimeDays - b.leadTimeDays : b.leadTimeDays - a.leadTimeDays;
      }

      let valA: any = a[jcSortField as keyof typeof a];
      let valB: any = b[jcSortField as keyof typeof b];
      if (typeof valA === 'string') {
        valA = valA.toLowerCase();
        valB = (valB || '').toString().toLowerCase();
      }
      if (valA < valB) return jcSortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return jcSortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [consolidatedJCShortages, shortageFilterMode, deferredJcTableSearchTerm, jcSortField, jcSortOrder, items]);

  const getWOShortageData = (wo: WorkOrder) => {
    const linkedBOM = boms.find(b => b.machineModel === wo.machineModel || b.id === wo.bomId);
    const targetQty = wo.targetQuantity || wo.quantity || 1;

    const components = wo.woComponents && wo.woComponents.length > 0
      ? wo.woComponents.map(c => ({
          itemId: c.itemId || '',
          itemCode: c.itemCode || '',
          itemName: c.itemName || '',
          qtyPerMachine: c.qtyRequired ? c.qtyRequired / (wo.quantity || 1) : 1,
          unit: c.unit || 'PCS',
          subAssemblyTag: c.subAssemblyTag || 'General Assembly'
        }))
      : (linkedBOM?.components || []);

    const shortageLines = components.map(comp => {
      const itemObj = items.find(i => i.id === comp.itemId || i.itemCode === comp.itemCode);
      const totalReq = comp.qtyPerMachine * targetQty;
      const inHouse = itemObj ? itemObj.inHouseStock : 0;
      const external = itemObj ? itemObj.externalStock : 0;
      const minStock = itemObj ? (itemObj.minStockQty !== undefined ? itemObj.minStockQty : (itemObj.reorderLevel || 0)) : 0;
      const openPO = getOpenPOQuantity(itemObj, comp.itemCode);
      const pendingJW = jobworks
        .filter(jw => jw.status !== 'COMPLETED' && jw.status !== 'CANCELLED' && !(jw as any).isDeleted)
        .reduce((sum, jw) => (jw.itemId === comp.itemId || jw.itemCode === comp.itemCode) ? sum + (jw.pendingBalance ?? jw.sentQuantity ?? 0) : sum, 0);
      const pendingQC = itemObj?.pendingQCStock || 0;
      const totalPipelineSupply = inHouse + openPO + pendingJW + pendingQC;
      const netShortage = Math.max(0, (totalReq + minStock) - totalPipelineSupply);
      const pSource = itemObj?.processType || 'In-house';

      return {
        ...comp,
        itemObj,
        totalRequired: totalReq,
        inHouseStock: inHouse,
        externalStock: external,
        minStockQty: minStock,
        netShortage,
        processType: pSource,
        isShortage: netShortage > 0
      };
    });

    return {
      wo,
      targetQty,
      components: shortageLines
    };
  };

  const filteredWOShortages = relevantWOs.map(wo => getWOShortageData(wo)).filter(data => {
    if (activeTab === 'PO_SHORTAGE') {
      return data.components.some(c => c.isShortage && (c.processType === 'Bought out' || c.processType === 'Job work + Bought out'));
    }
    if (activeTab === 'JOBWORK_SHORTAGE') {
      return data.components.some(c => c.isShortage && (c.processType === 'Job work' || c.processType === 'Job work + Bought out'));
    }
    if (activeTab === 'JOBCARD_SHORTAGE') {
      return data.components.some(c => c.isShortage && c.processType === 'In-house');
    }
    return data.components.some(c => c.isShortage);
  });

  // Shortage items for PO-only list
  const poShortageItems = items.filter(i => isBoughtOutItem(i) && !i.isBlocked && (i.inHouseStock <= (i.reorderLevel || i.minStockQty || 0)));

  // -------------------------------------------------------------
  // ACTION HANDLERS
  // -------------------------------------------------------------
  const handleRaisePO = (item: Item, netShortage: number, wo?: WorkOrder) => {
    if (item.processType === 'Job work + Bought out') {
      const moq = item.minOrderQty || 1;
      const half = Math.floor(netShortage / 2);
      setDualModalData({
        item,
        wo,
        netShortage,
        poQty: half >= moq ? half : netShortage,
        jwQty: half >= moq ? netShortage - half : 0,
        vendorId: item.mappedVendors?.[0]?.vendorId || vendors[0]?.id || '',
        jwVendorId: item.mappedVendors?.[0]?.vendorId || vendors[0]?.id || '',
        processTypeChoice: 'PO_ONLY'
      });
      return;
    }

    const vendorId = item.mappedVendors?.[0]?.vendorId || vendors[0]?.id || 'VEND-001';
    const vendorName = vendors.find(v => v.id === vendorId)?.name || 'Default Vendor';
    const targetQty = Math.max(netShortage, item.minOrderQty || 1);
    addPurchaseOrder({
      poNumber: generateNextPONumber(purchaseOrders),
      vendorId,
      vendorName,
      orderDate: new Date().toISOString().split('T')[0],
      expectedDeliveryDate: new Date(Date.now() + (item.leadTimeDays || 10) * 86400000).toISOString().split('T')[0],
      items: [{
        itemId: item.id,
        itemCode: item.itemCode,
        itemName: item.name,
        quantity: targetQty,
        orderedQty: targetQty,
        receivedQty: 0,
        unit: item.unit,
        unitPrice: item.unitPrice || 100,
        amount: targetQty * (item.unitPrice || 100),
        totalAmount: targetQty * (item.unitPrice || 100)
      }]
    });
    alert(`✅ Purchase Order raised successfully for ${item.itemCode} (Qty: ${targetQty})!`);
  };

  const handleIssueJobwork = (item: Item, netShortage: number, wo?: WorkOrder) => {
    if (item.processType === 'Job work + Bought out') {
      const moq = item.minOrderQty || 1;
      const half = Math.floor(netShortage / 2);
      setDualModalData({
        item,
        wo,
        netShortage,
        poQty: half >= moq ? half : 0,
        jwQty: half >= moq ? netShortage - half : netShortage,
        vendorId: item.mappedVendors?.[0]?.vendorId || vendors[0]?.id || '',
        jwVendorId: item.mappedVendors?.[0]?.vendorId || vendors[0]?.id || '',
        processTypeChoice: 'JW_ONLY'
      });
      return;
    }

    const vendorId = item.mappedVendors?.[0]?.vendorId || vendors[0]?.id || 'VEND-JW-01';
    const vendorName = vendors.find(v => v.id === vendorId)?.name || 'Precision Jobwork Partner';
    addJobworkChallan({
      challanNo: `JW-GEC-${Date.now().toString().slice(-4)}`,
      vendorId,
      vendorName,
      itemId: item.id,
      itemCode: item.itemCode,
      itemName: item.name,
      sentQuantity: netShortage,
      receivedQuantity: 0,
      scrapQuantity: 0,
      processRequired: 'CNC Machining & Surface Treatment',
      issueDate: new Date().toISOString().split('T')[0],
      expectedReturnDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]
    });
    alert(`✅ Job Work Challan created successfully for ${item.itemCode} (Qty: ${netShortage})!`);
  };

  const handleIssueJobCard = (item: Item, netShortage: number, wo?: WorkOrder) => {
    addJobCard({
      woId: wo?.id || `WO-STOCK-${Date.now().toString().slice(-4)}`,
      woNumber: wo ? (wo.workOrderNo || wo.woNumber) : 'STOCK_BUILD',
      itemId: item.id,
      itemCode: item.itemCode,
      itemName: item.name,
      itemType: item.category === 'FG' ? 'ASSEMBLY' : 'SUB_ASSEMBLY',
      targetQuantity: netShortage,
      completedQuantity: 0,
      assignedOperator: 'In-House Machining Operator',
      stationName: 'Sub-Assembly Bay',
      status: 'OPEN',
      type: 'PRODUCTION',
      startDate: new Date().toISOString().split('T')[0],
      components: [{
        itemId: item.id,
        itemCode: item.itemCode,
        itemName: item.name,
        qtyPerUnit: 1,
        totalRequiredQty: netShortage,
        issuedQty: netShortage,
        unit: item.unit
      }]
    });
    alert(`✅ In-house Job Card created for ${item.itemCode} (Qty: ${netShortage})!`);
  };

  const handleConfirmDualModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dualModalData) return;
    const { item, netShortage, poQty, jwQty, vendorId, jwVendorId, processTypeChoice } = dualModalData;
    const moq = item.minOrderQty || 1;

    if (processTypeChoice === 'PO_ONLY') {
      addPurchaseOrder({
        poNumber: generateNextPONumber(purchaseOrders),
        vendorId: vendorId || vendors[0]?.id || '',
        vendorName: vendors.find(v => v.id === vendorId)?.name || 'Default Vendor',
        orderDate: new Date().toISOString().split('T')[0],
        expectedDeliveryDate: new Date(Date.now() + 10 * 86400000).toISOString().split('T')[0],
        items: [{
          itemId: item.id,
          itemCode: item.itemCode,
          itemName: item.name,
          quantity: netShortage,
          orderedQty: netShortage,
          receivedQty: 0,
          unit: item.unit,
          unitPrice: item.unitPrice || 100,
          amount: netShortage * (item.unitPrice || 100),
          totalAmount: netShortage * (item.unitPrice || 100)
        }]
      });
      alert(`✅ 100% Purchase Order created for ${item.itemCode} (Qty: ${netShortage})!`);
    } else if (processTypeChoice === 'JW_ONLY') {
      addJobworkChallan({
        challanNo: `JW-GEC-${Date.now().toString().slice(-4)}`,
        vendorId: jwVendorId || vendors[0]?.id || '',
        vendorName: vendors.find(v => v.id === jwVendorId)?.name || 'Jobwork Partner',
        itemId: item.id,
        itemCode: item.itemCode,
        itemName: item.name,
        sentQuantity: netShortage,
        receivedQuantity: 0,
        scrapQuantity: 0,
        processRequired: 'Jobwork Processing',
        issueDate: new Date().toISOString().split('T')[0],
        expectedReturnDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]
      });
      alert(`✅ 100% Job Work Challan created for ${item.itemCode} (Qty: ${netShortage})!`);
    } else {
      if (poQty + jwQty !== netShortage) {
        alert(`❌ Split Error: Sum of PO Qty (${poQty}) and Job Work Qty (${jwQty}) must equal Total Shortage (${netShortage}).`);
        return;
      }
      if (poQty > 0 && poQty < moq) {
        alert(`❌ Split Error: PO Quantity (${poQty}) is below Minimum Order Quantity (MOQ: ${moq}).`);
        return;
      }
      if (jwQty > 0 && jwQty < moq) {
        alert(`❌ Split Error: Job Work Quantity (${jwQty}) is below Minimum Order Quantity (MOQ: ${moq}).`);
        return;
      }

      if (poQty > 0) {
        addPurchaseOrder({
          poNumber: generateNextPONumber(purchaseOrders),
          vendorId: vendorId || vendors[0]?.id || '',
          vendorName: vendors.find(v => v.id === vendorId)?.name || 'Default Vendor',
          orderDate: new Date().toISOString().split('T')[0],
          expectedDeliveryDate: new Date(Date.now() + 10 * 86400000).toISOString().split('T')[0],
          items: [{
            itemId: item.id,
            itemCode: item.itemCode,
            itemName: item.name,
            quantity: poQty,
            orderedQty: poQty,
            receivedQty: 0,
            unit: item.unit,
            unitPrice: item.unitPrice || 100,
            amount: poQty * (item.unitPrice || 100),
            totalAmount: poQty * (item.unitPrice || 100)
          }]
        });
      }

      if (jwQty > 0) {
        addJobworkChallan({
          challanNo: `JW-GEC-${Date.now().toString().slice(-4)}`,
          vendorId: jwVendorId || vendors[0]?.id || '',
          vendorName: vendors.find(v => v.id === jwVendorId)?.name || 'Jobwork Partner',
          itemId: item.id,
          itemCode: item.itemCode,
          itemName: item.name,
          sentQuantity: jwQty,
          receivedQuantity: 0,
          scrapQuantity: 0,
          processRequired: 'Dual Source Jobwork Processing',
          issueDate: new Date().toISOString().split('T')[0],
          expectedReturnDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]
        });
      }

      alert(`✅ Successfully split & created:
- PO: ${poQty} ${item.unit}
- Job Work: ${jwQty} ${item.unit}!`);
    }

    setDualModalData(null);
  };

  const selectedParentItemsMeta = plannedItemDetails.map(plan => ({
    itemId: plan.item.id,
    itemCode: plan.item.itemCode,
    itemName: plan.item.name,
    category: plan.item.category,
    targetQuantity: plan.targetQty,
    maxBuildableQty: plan.maxBuildable,
    constrainingComponent: plan.constrainingComponent
  }));

  const totalConsolidatedShortageCount = filteredConsolidatedItems.filter(c => c.isShortage).length;
  const totalPlannedUnitsCount = plannedItemDetails.reduce((sum, p) => sum + p.targetQty, 0);

  return (
    <div className="module-layout-container" style={{ flex: 1, minHeight: 0, height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      
      {/* Static Top Header & Tabs (Non-scrollable, always visible) */}
      <div className="sticky-module-header" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingBottom: '0.25rem', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', width: '100%' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
              <AlertTriangle size={20} color="var(--warning)" />
              Shortage Planning & Production Capacity Engine
            </h2>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <button 
              type="button" 
              className={`btn ${isExplodeAllBOMs ? 'btn-primary' : 'btn-outline'}`} 
              onClick={() => setIsExplodeAllBOMs(!isExplodeAllBOMs)} 
              title="Explode all components and sub-assemblies across multi-level BOMs"
              style={{ fontWeight: 700, fontSize: '0.82rem', gap: '0.35rem', display: 'inline-flex', alignItems: 'center' }}
            >
              <Layers size={14} />
              {isExplodeAllBOMs ? '💥 Multi-Level BOMs Exploded' : '💥 Explode All BOMs'}
            </button>

            {/* Universal Shortage vs All Items Mode Toggle */}
            <div style={{ display: 'inline-flex', borderRadius: '0.375rem', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
              <button
                type="button"
                className={`btn ${shortageFilterMode === 'SHORTAGE_ONLY' ? 'btn-warning' : 'btn-outline'}`}
                style={{ 
                  padding: '0.3rem 0.65rem', 
                  fontSize: '0.78rem', 
                  fontWeight: 700, 
                  border: 'none', 
                  borderRadius: 0,
                  backgroundColor: shortageFilterMode === 'SHORTAGE_ONLY' ? '#d97706' : undefined,
                  color: shortageFilterMode === 'SHORTAGE_ONLY' ? '#fff' : undefined
                }}
                onClick={() => setShortageFilterMode('SHORTAGE_ONLY')}
              >
                ⚠️ Shortage Only
              </button>
              <button
                type="button"
                className={`btn ${shortageFilterMode === 'ALL_ITEMS' ? 'btn-primary' : 'btn-outline'}`}
                style={{ padding: '0.3rem 0.65rem', fontSize: '0.78rem', fontWeight: 700, border: 'none', borderRadius: 0 }}
                onClick={() => setShortageFilterMode('ALL_ITEMS')}
              >
                📋 All Items (Full BOM)
              </button>
            </div>

            {/* Direct Print Button */}
            <button 
              type="button" 
              className="btn btn-primary" 
              onClick={handleQuickPrint} 
              title="Direct Print Shortage Report"
              style={{ fontSize: '0.8rem', padding: '0.45rem 0.85rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
            >
              <Printer size={15} /> Print Shortage Report
            </button>
          </div>
        </div>

        {/* Top 5 Routing Tabs - Static & Fixed below title */}
        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', flexShrink: 0, width: '100%', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.4rem' }}>
          <button 
            className={`btn ${activeTab === 'ITEM_WISE_SHORTAGE' ? 'btn-primary' : 'btn-outline'}`}
            style={{ padding: '0.38rem 0.85rem', fontSize: '0.82rem', border: 'none' }}
            onClick={() => setActiveTab('ITEM_WISE_SHORTAGE')}
          >
            <Package size={14} /> Item-Wise
          </button>
          <button 
            className={`btn ${activeTab === 'WO_SHORTAGE' ? 'btn-primary' : 'btn-outline'}`}
            style={{ padding: '0.38rem 0.85rem', fontSize: '0.82rem', border: 'none' }}
            onClick={() => setActiveTab('WO_SHORTAGE')}
          >
            <Layers size={14} /> Work Order Shortage Tree
          </button>
          <button 
            className={`btn ${activeTab === 'PO_SHORTAGE' ? 'btn-primary' : 'btn-outline'}`}
            style={{ padding: '0.38rem 0.85rem', fontSize: '0.82rem', border: 'none' }}
            onClick={() => setActiveTab('PO_SHORTAGE')}
          >
            <ShoppingCart size={14} /> PO / Bought-Out Shortage
          </button>
          <button 
            className={`btn ${activeTab === 'JOBWORK_SHORTAGE' ? 'btn-primary' : 'btn-outline'}`}
            style={{ padding: '0.38rem 0.85rem', fontSize: '0.82rem', border: 'none' }}
            onClick={() => setActiveTab('JOBWORK_SHORTAGE')}
          >
            <Truck size={14} /> Job Work Shortage
          </button>
          <button 
            className={`btn ${activeTab === 'JOBCARD_SHORTAGE' ? 'btn-primary' : 'btn-outline'}`}
            style={{ padding: '0.38rem 0.85rem', fontSize: '0.82rem', border: 'none' }}
            onClick={() => setActiveTab('JOBCARD_SHORTAGE')}
          >
            <ClipboardList size={14} /> In-House Job Card Shortage
          </button>
        </div>
      </div>

      {/* MAIN SHORTAGE CONTENT AREA - Single Vertical Scroll Container */}
      <div className="shortage-single-scroll-container" style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingRight: '0.25rem' }}>
        
        {/* ========================================================= */}
        {/* TAB 1: ITEM-WISE SHORTAGE & CONSOLIDATED CAPACITY ($X+Y$) */}
        {/* ========================================================= */}
        {activeTab === 'ITEM_WISE_SHORTAGE' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%' }}>
            
            {/* Top Panel: Search & Add Parent Finished Items / Assemblies */}
            <div className="card" style={{ padding: '0.65rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', flexShrink: 0, position: 'relative', zIndex: 50, overflow: 'visible' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div>
                  <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    1. Select Target Finished Items / Assemblies for Production Planning:
                  </span>
                </div>

              {/* Item Search & Add Input */}
              <div style={{ position: 'relative', width: '380px', maxWidth: '100%' }}>
                <Search size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="Search item code, model or name to add..."
                  className="input-field"
                  style={{ paddingLeft: '2.2rem', fontSize: '0.82rem' }}
                  value={itemWiseSearch}
                  onChange={(e) => setItemWiseSearch(e.target.value)}
                />

                {/* Dropdown for Search Suggestions */}
                {itemWiseSearch.trim() && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    marginTop: '4px',
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '0.375rem',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.3)',
                    maxHeight: '220px',
                    overflowY: 'auto',
                    zIndex: 100
                  }}>
                    {itemSuggestions.length > 0 ? (
                      itemSuggestions.map(it => (
                        <div
                          key={it.id}
                          style={{
                            padding: '0.5rem 0.75rem',
                            borderBottom: '1px solid var(--border-color)',
                            cursor: 'pointer',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}
                          className="hover-highlight"
                          onClick={() => {
                            setSelectedItemIds([...selectedItemIds, it.id]);
                            if (itemTargetQuantities[it.id] === undefined) {
                              setItemTargetQuantities(prev => ({ ...prev, [it.id]: 0 }));
                            }
                            setItemWiseSearch('');
                          }}
                        >
                          <div>
                            <strong style={{ fontFamily: 'monospace', color: 'var(--accent-primary)', marginRight: '0.5rem' }}>{it.itemCode}</strong>
                            {it.partCode && <span style={{ fontFamily: 'monospace', color: 'var(--text-muted)', marginRight: '0.5rem' }}>({it.partCode})</span>}
                            <span>{it.name}</span>
                          </div>
                          <span className="badge badge-neutral" style={{ fontSize: '0.7rem' }}>{it.category}</span>
                        </div>
                      ))
                    ) : (
                      <div style={{ padding: '0.65rem 0.75rem', fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                        No items matching "{itemWiseSearch}"
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Added Planned Items in Compact Single Rows */}
            {selectedItemIds.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', paddingTop: '0.35rem', borderTop: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    Planned Items ({selectedItemIds.length}):
                  </span>
                  <button 
                    type="button" 
                    className="btn btn-outline" 
                    style={{ padding: '0.15rem 0.45rem', fontSize: '0.7rem', color: 'var(--danger)' }} 
                    onClick={() => {
                      setSelectedItemIds([]);
                      setItemTargetQuantities({});
                      try {
                        localStorage.removeItem('gec_shortage_selected_item_ids');
                        localStorage.removeItem('gec_shortage_item_target_quantities');
                      } catch {}
                    }}
                  >
                    Clear All
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  {plannedItemDetails.map(plan => {
                    const targetQty = plan.targetQty;
                    const maxBuildable = plan.maxBuildable;
                    const canBuildTarget = maxBuildable >= targetQty;

                    return (
                      <div 
                        key={plan.item.id}
                        style={{
                          padding: '0.3rem 0.6rem',
                          backgroundColor: 'var(--bg-tertiary)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '0.375rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '0.75rem',
                          flexWrap: 'wrap'
                        }}
                      >
                        {/* Item Info Left */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', flex: 1, minWidth: '220px' }}>
                          <span style={{ fontFamily: 'monospace', fontWeight: 800, color: 'var(--accent-primary)', fontSize: '0.82rem' }}>
                            {plan.item.itemCode}
                          </span>
                          {plan.item.partCode && (
                            <span style={{ fontFamily: 'monospace', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                              ({plan.item.partCode})
                            </span>
                          )}
                          <span style={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--text-primary)' }}>
                            {plan.item.name}
                          </span>
                          <span className="badge badge-neutral" style={{ fontSize: '0.65rem', padding: '0.1rem 0.3rem' }}>
                            {plan.item.category}
                          </span>
                          {plan.constrainingComponent && (
                            <span style={{ fontSize: '0.7rem', color: '#b45309', fontWeight: 600, marginLeft: '0.25rem' }} title={plan.constrainingComponent}>
                              ⚠️ Bottleneck: {plan.constrainingComponent}
                            </span>
                          )}
                        </div>

                        {/* Target Qty + Max Buildable + Delete Right */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 700, margin: 0, color: 'var(--text-secondary)' }}>Target Qty:</label>
                            <input 
                              type="number"
                              min="0"
                              style={{ width: '60px', padding: '0.15rem 0.35rem', fontWeight: 800, fontSize: '0.8rem', textAlign: 'center' }}
                              className="input-field"
                              value={targetQty}
                              onChange={(e) => handleItemTargetQtyChange(plan.item.id, Math.max(0, Number(e.target.value)))}
                            />
                            <span style={{ fontSize: '0.72rem', fontWeight: 600 }}>{plan.item.unit}</span>
                          </div>

                          <div style={{ 
                            padding: '0.15rem 0.45rem', 
                            backgroundColor: canBuildTarget ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)', 
                            border: `1px solid ${canBuildTarget ? 'var(--success)' : 'var(--danger)'}`,
                            borderRadius: '0.25rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem'
                          }}>
                            <Sparkles size={11} color={canBuildTarget ? 'var(--success)' : 'var(--danger)'} />
                            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: canBuildTarget ? 'var(--success)' : 'var(--danger)' }}>
                              Max: {maxBuildable} {plan.item.unit}
                            </span>
                          </div>

                          <button 
                            type="button" 
                            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}
                            onClick={() => setSelectedItemIds(selectedItemIds.filter(x => x !== plan.item.id))}
                            title="Remove item"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div style={{ padding: '0.6rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: '0.375rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                💡 <em>No items selected yet. Use the search bar above to select items.</em>
              </div>
            )}
          </div>

          {/* Consolidated Component Table Filter & Table Section (Zero Gap for Clean Sticky Scroll) */}
          <div 
            style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: 0, 
              width: '100%',
              ['--shortage-filter-height' as any]: `${card2Height}px`
            }}
          >
            {/* Filter & Search Controls (Sticky at top: 0) */}
            {selectedItemIds.length > 0 && (
              <div 
                ref={card2Ref}
                className="card shortage-sticky-card2" 
                style={{ 
                  position: 'sticky',
                  top: 0,
                  zIndex: 30,
                  backgroundColor: 'var(--bg-card)', 
                  padding: '0.55rem 0.85rem', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '0.45rem', 
                  flexShrink: 0, 
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)', 
                  border: '1px solid var(--border-color)',
                  borderBottom: 'none',
                  borderRadius: '0.5rem 0.5rem 0 0',
                  margin: 0
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
                  
                  {/* Search Bar for Consolidated Component List */}
                  <div style={{ position: 'relative', width: '380px', maxWidth: '100%' }}>
                    <Search size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                      type="text"
                      placeholder="Search in combined list (Part Code, Item Code, Description)..."
                      className="input-field"
                      style={{ paddingLeft: '2.25rem', fontSize: '0.82rem' }}
                      value={componentSearchTerm}
                      onChange={(e) => setComponentSearchTerm(e.target.value)}
                    />
                    {componentSearchTerm && (
                      <button
                        type="button"
                        onClick={() => setComponentSearchTerm('')}
                        style={{ position: 'absolute', right: '0.65rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>

                  {/* Class Filters */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>Class:</span>
                    <button
                      type="button"
                      className={`badge ${selectedClassFilters.length === 0 ? 'badge-primary' : 'badge-neutral'}`}
                      style={{ cursor: 'pointer', padding: '0.2rem 0.45rem', fontSize: '0.72rem' }}
                      onClick={() => setSelectedClassFilters([])}
                    >
                      ALL
                    </button>
                    {FIXED_ITEM_CLASSES.map(cls => {
                      const isSelected = selectedClassFilters.includes(cls.code);
                      return (
                        <button
                          key={cls.code}
                          type="button"
                          className={`badge ${isSelected ? 'badge-primary' : 'badge-neutral'}`}
                          style={{ cursor: 'pointer', padding: '0.2rem 0.45rem', fontSize: '0.72rem' }}
                          title={cls.name}
                          onClick={() => {
                            if (isSelected) {
                              setSelectedClassFilters(selectedClassFilters.filter(c => c !== cls.code));
                            } else {
                              setSelectedClassFilters([...selectedClassFilters, cls.code]);
                            }
                          }}
                        >
                          {cls.code}
                        </button>
                      );
                    })}
                  </div>

                  {/* Process Type Filter */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Source:</span>
                    <select
                      className="input-field"
                      style={{ fontSize: '0.78rem', padding: '0.28rem 0.6rem', width: 'auto' }}
                      value={selectedProcessFilter}
                      onChange={(e) => setSelectedProcessFilter(e.target.value)}
                    >
                      <option value="ALL">All Sources</option>
                      <option value="BO">Bought Out (BO)</option>
                      <option value="JW">Job Work (JW)</option>
                      <option value="IH">In-House (IH)</option>
                    </select>
                  </div>
                </div>

                {/* KPI Badges */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', paddingTop: '0.35rem', borderTop: '1px solid var(--border-color)', fontSize: '0.8rem' }}>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <span>Consolidated Components: <strong>{filteredConsolidatedItems.length}</strong></span>
                    <span style={{ color: totalConsolidatedShortageCount > 0 ? 'var(--danger)' : 'var(--success)', fontWeight: 700 }}>
                      Shortage Components: <strong>{totalConsolidatedShortageCount}</strong>
                    </span>
                    <span>Total Planned Product Units: <strong>{totalPlannedUnitsCount}</strong></span>
                  </div>

                  {(selectedClassFilters.length > 0 || selectedProcessFilter !== 'ALL' || componentSearchTerm) && (
                    <button
                      type="button"
                      className="btn btn-outline"
                      style={{ padding: '0.15rem 0.45rem', fontSize: '0.72rem' }}
                      onClick={() => {
                        setSelectedClassFilters([]);
                        setSelectedProcessFilter('ALL');
                        setComponentSearchTerm('');
                      }}
                    >
                      Reset Component Filters
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Consolidated Component Table ($X + Y$) - Single-Scroll Table Flow */}
            <div 
              className="table-container-flow" 
              style={{ 
                backgroundColor: 'var(--bg-card)', 
                border: '1px solid var(--border-color)', 
                borderRadius: selectedItemIds.length > 0 ? '0 0 0.5rem 0.5rem' : '0.5rem', 
                overflow: 'auto',
                maxHeight: 'calc(100vh - 290px)',
                width: '100%', 
                maxWidth: '100%',
                margin: 0
              }}
            >
            {selectedItemIds.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                <Package size={40} color="var(--accent-primary)" style={{ margin: '0 auto 0.75rem auto' }} />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Search & Add Items Above</h3>
                <p style={{ fontSize: '0.85rem', margin: '0.25rem 0 0 0' }}>
                  Add assemblies or finished items to compute the total consolidated component requirement and shortage list.
                </p>
              </div>
            ) : filteredConsolidatedItems.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                {shortageFilterMode === 'SHORTAGE_ONLY' 
                  ? '✓ No active shortages found across selected items for this search/filter criteria!' 
                  : 'No components found matching the active search or filters.'}
              </div>
            ) : (
              <table className="shortage-itemwise-table">
                <thead>
                  <tr>
                    {/* 1. # */}
                    <th onClick={() => handleItemWiseSortToggle('srNo')} style={{ width: '38px', textAlign: 'center', cursor: 'pointer', userSelect: 'none' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.2rem' }}>
                        # {itemWiseSortField === 'srNo' ? (itemWiseSortOrder === 'asc' ? <ArrowUp size={11} /> : <ArrowDown size={11} />) : <ArrowUpDown size={10} color="var(--text-muted)" />}
                      </div>
                    </th>

                    {/* 1b. Priority */}
                    <th onClick={() => handleItemWiseSortToggle('priority')} style={{ width: '62px', textAlign: 'center', cursor: 'pointer', userSelect: 'none' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.2rem' }}>
                        Priority {itemWiseSortField === 'priority' ? (itemWiseSortOrder === 'asc' ? <ArrowUp size={11} /> : <ArrowDown size={11} />) : <ArrowUpDown size={10} color="var(--text-muted)" />}
                      </div>
                    </th>

                    {/* 1c. Lead Time */}
                    <th onClick={() => handleItemWiseSortToggle('leadTimeDays')} style={{ width: '78px', textAlign: 'center', cursor: 'pointer', userSelect: 'none' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.2rem' }}>
                        Lead Time {itemWiseSortField === 'leadTimeDays' ? (itemWiseSortOrder === 'asc' ? <ArrowUp size={11} /> : <ArrowDown size={11} />) : <ArrowUpDown size={10} color="var(--text-muted)" />}
                      </div>
                    </th>

                    {/* 2. Part Code */}
                    <th onClick={() => handleItemWiseSortToggle('partCode')} style={{ width: '110px', cursor: 'pointer', userSelect: 'none' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                        Part Code {itemWiseSortField === 'partCode' ? (itemWiseSortOrder === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={11} color="var(--text-muted)" />}
                      </div>
                    </th>

                    {/* 3. Item Code */}
                    <th onClick={() => handleItemWiseSortToggle('itemCode')} style={{ width: '115px', cursor: 'pointer', userSelect: 'none' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                        Item Code {itemWiseSortField === 'itemCode' ? (itemWiseSortOrder === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={11} color="var(--text-muted)" />}
                      </div>
                    </th>

                    {/* 4. Item Description */}
                    <th onClick={() => handleItemWiseSortToggle('itemName')} style={{ cursor: 'pointer', userSelect: 'none', minWidth: '160px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                        Item Description {itemWiseSortField === 'itemName' ? (itemWiseSortOrder === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={11} color="var(--text-muted)" />}
                      </div>
                    </th>

                    {/* 5. Class */}
                    <th onClick={() => handleItemWiseSortToggle('category')} style={{ width: '65px', textAlign: 'center', cursor: 'pointer', userSelect: 'none' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.2rem' }}>
                        Class {itemWiseSortField === 'category' ? (itemWiseSortOrder === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={11} color="var(--text-muted)" />}
                      </div>
                    </th>

                    {/* 6. Source */}
                    <th onClick={() => handleItemWiseSortToggle('processType')} style={{ width: '90px', textAlign: 'center', cursor: 'pointer', userSelect: 'none' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.2rem' }}>
                        Source {itemWiseSortField === 'processType' ? (itemWiseSortOrder === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={11} color="var(--text-muted)" />}
                      </div>
                    </th>

                    {/* 7. Demand From */}
                    <th onClick={() => handleItemWiseSortToggle('demandFrom')} style={{ width: '130px', cursor: 'pointer', userSelect: 'none' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                        Demand From {itemWiseSortField === 'demandFrom' ? (itemWiseSortOrder === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={11} color="var(--text-muted)" />}
                      </div>
                    </th>

                    {/* 8. Total Req */}
                    <th onClick={() => handleItemWiseSortToggle('totalRequired')} style={{ textAlign: 'right', width: '85px', cursor: 'pointer', userSelect: 'none' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.2rem' }}>
                        Total Req {itemWiseSortField === 'totalRequired' ? (itemWiseSortOrder === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={11} color="var(--text-muted)" />}
                      </div>
                    </th>

                    {/* 9. In Stock */}
                    <th onClick={() => handleItemWiseSortToggle('inHouseStock')} style={{ textAlign: 'right', width: '80px', cursor: 'pointer', userSelect: 'none' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.2rem' }}>
                        In Stock {itemWiseSortField === 'inHouseStock' ? (itemWiseSortOrder === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={11} color="var(--text-muted)" />}
                      </div>
                    </th>

                    {/* 10. Pend PO */}
                    <th onClick={() => handleItemWiseSortToggle('pendingPO')} style={{ textAlign: 'right', width: '70px', cursor: 'pointer', userSelect: 'none' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.2rem' }}>
                        Pend PO {itemWiseSortField === 'pendingPO' ? (itemWiseSortOrder === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={11} color="var(--text-muted)" />}
                      </div>
                    </th>

                    {/* 11. Pend JW */}
                    <th onClick={() => handleItemWiseSortToggle('pendingJW')} style={{ textAlign: 'right', width: '70px', cursor: 'pointer', userSelect: 'none' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.2rem' }}>
                        Pend JW {itemWiseSortField === 'pendingJW' ? (itemWiseSortOrder === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={11} color="var(--text-muted)" />}
                      </div>
                    </th>

                    {/* 12. Pend QC */}
                    <th onClick={() => handleItemWiseSortToggle('pendingQC')} style={{ textAlign: 'right', width: '70px', cursor: 'pointer', userSelect: 'none' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.2rem' }}>
                        Pend QC {itemWiseSortField === 'pendingQC' ? (itemWiseSortOrder === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={11} color="var(--text-muted)" />}
                      </div>
                    </th>

                    {/* 13. Shortage */}
                    <th onClick={() => handleItemWiseSortToggle('shortage')} style={{ textAlign: 'right', width: '85px', cursor: 'pointer', userSelect: 'none' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.2rem' }}>
                        Shortage {itemWiseSortField === 'shortage' ? (itemWiseSortOrder === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={11} color="var(--text-muted)" />}
                      </div>
                    </th>

                    {/* 14. Min Stock */}
                    <th onClick={() => handleItemWiseSortToggle('minStockLevel')} style={{ textAlign: 'right', width: '80px', cursor: 'pointer', userSelect: 'none' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.2rem' }}>
                        Min Stock {itemWiseSortField === 'minStockLevel' ? (itemWiseSortOrder === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={11} color="var(--text-muted)" />}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredConsolidatedItems.map((comp, idx) => {
                    const isLineShortage = comp.shortage > 0 || comp.minShortage > 0;

                    return (
                      <tr 
                        key={idx} 
                        style={{ backgroundColor: isLineShortage ? 'rgba(239, 68, 68, 0.06)' : 'transparent' }}
                      >
                        {/* 1. # */}
                        <td style={{ textAlign: 'center', color: 'var(--text-muted)' }}>{idx + 1}</td>

                        {/* 1b. Priority */}
                        <td style={{ textAlign: 'center' }}>
                          <span 
                            className={`badge ${comp.priorityNum <= 3 ? 'badge-p1' : comp.priorityNum <= 8 ? 'badge-p2' : 'badge-neutral'}`}
                            style={{ fontSize: '0.72rem', minWidth: '32px', justifyContent: 'center' }}
                            title={`Priority #${comp.priorityNum} (Lead Time: ${comp.leadTimeDays} Days)`}
                          >
                            {comp.priorityRank}
                          </span>
                        </td>

                        {/* 1c. Lead Time */}
                        <td style={{ textAlign: 'center', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                          {comp.leadTimeDays} D
                        </td>

                        {/* 2. Part Code */}
                        <td style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {comp.partCode || '-'}
                        </td>

                        {/* 3. Item Code */}
                        <td style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--accent-primary)' }}>
                          {comp.itemCode}
                        </td>

                        {/* 4. Description */}
                        <td style={{ fontWeight: 600 }}>
                          {comp.itemName}
                        </td>

                        {/* 5. Class */}
                        <td style={{ textAlign: 'center' }}>
                          <span className="badge badge-neutral" style={{ fontSize: '0.72rem' }}>
                            {comp.category}
                          </span>
                        </td>

                        {/* 6. Source */}
                        <td style={{ textAlign: 'center' }}>
                          <span className={`badge ${comp.processType === 'Bought out' || comp.processType === 'Job work + Bought out' ? 'badge-primary' : comp.processType === 'In-house' ? 'badge-success' : comp.processType === 'Job work' ? 'badge-purple' : 'badge-neutral'}`} style={{ fontSize: '0.72rem' }}>
                            {comp.processType || 'In-house'}
                          </span>
                        </td>

                        {/* 7. Demand From */}
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '0.72rem' }}>
                            {(comp.requiredByItems || []).map((req: any, rIdx: number) => (
                              <span key={rIdx} style={{ color: 'var(--text-secondary)' }}>
                                <strong>{req.itemCode}</strong>: {req.requiredQty} {comp.unit}
                              </span>
                            ))}
                          </div>
                        </td>

                        {/* 8. Total Req */}
                        <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--text-primary)' }}>
                          {comp.totalRequired} {comp.unit}
                        </td>

                        {/* 9. In Stock */}
                        <td style={{ textAlign: 'right', fontWeight: 700 }}>
                          {comp.inHouseStock} {comp.unit}
                        </td>

                        {/* 10. Pend PO */}
                        <td style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>
                          {comp.pendingPO || 0}
                        </td>

                        {/* 11. Pend JW */}
                        <td style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>
                          {comp.pendingJW || 0}
                        </td>

                        {/* 12. Pend QC */}
                        <td style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>
                          {comp.pendingQC || 0}
                        </td>

                        {/* 13. Shortage */}
                        <td style={{ textAlign: 'right', fontWeight: 900, color: comp.shortage > 0 ? 'var(--danger)' : 'var(--success)' }}>
                          {comp.shortage > 0 ? `${comp.shortage} ${comp.unit}` : 'OK (0)'}
                        </td>

                        {/* 14. Min Stock */}
                        <td style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>
                          {comp.minStockLevel || 0} {comp.unit}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2-4: WORK ORDER SHORTAGE & COMBINED AGGREGATION       */}
      {/* ========================================================= */}
      {activeTab !== 'ITEM_WISE_SHORTAGE' && activeTab !== 'JOBCARD_SHORTAGE' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%' }}>
          
          {/* WO Filter Bar with Search Bar */}
          <div className="card" style={{ padding: '0.75rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.65rem', flexShrink: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, margin: 0 }}>Select Work Orders for Combined Shortage:</label>
                <button 
                  type="button" 
                  className={`btn ${selectedWOIds.length === 0 ? 'btn-primary' : 'btn-outline'}`}
                  style={{ padding: '0.25rem 0.65rem', fontSize: '0.78rem' }}
                  onClick={() => setSelectedWOIds([])}
                >
                  All Active Work Orders ({workOrders.filter(w => w.status === 'IN_PROGRESS' || w.status === 'PLANNED').length})
                </button>
              </div>

              {/* WO Search Input */}
              <div style={{ position: 'relative', width: '280px', maxWidth: '100%' }}>
                <Search size={14} style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="Search Work Order / Model..."
                  className="input-field"
                  style={{ paddingLeft: '2rem', paddingRight: '0.5rem', paddingTop: '0.25rem', paddingBottom: '0.25rem', fontSize: '0.78rem' }}
                  value={woSearchTerm}
                  onChange={(e) => setWoSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {/* Multi-Select Work Order Badges */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', padding: '0.4rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: '0.375rem', border: '1px solid var(--border-color)' }}>
              {filteredWorkOrdersForSelection
                .map(wo => {
                  const isSelected = selectedWOIds.length === 0 || selectedWOIds.includes(wo.id);
                  const isIndividuallySelected = selectedWOIds.includes(wo.id);
                  return (
                    <button
                      key={wo.id}
                      type="button"
                      className={`btn ${isIndividuallySelected ? 'btn-primary' : isSelected ? 'btn-outline' : 'btn-ghost'}`}
                      style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', borderRadius: '0.25rem' }}
                      onClick={() => {
                        if (isIndividuallySelected) {
                          setSelectedWOIds(selectedWOIds.filter(id => id !== wo.id));
                        } else {
                          setSelectedWOIds([...selectedWOIds, wo.id]);
                        }
                      }}
                    >
                      {isIndividuallySelected ? '✓ ' : ''}{wo.workOrderNo || wo.woNumber} ({wo.machineModel})
                    </button>
                  );
                })}
            </div>
          </div>

          {/* Tab 2: Work Order Shortage Tree View */}
          {activeTab === 'WO_SHORTAGE' && (
            <div className="table-container-flow" style={{ border: 'none', background: 'none', boxShadow: 'none', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {filteredWOShortages.length === 0 ? (
                <div className="card" style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <CheckCircle size={36} color="var(--success)" style={{ margin: '0 auto 0.5rem auto' }} />
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>No Work Order Shortages</h3>
                  <p style={{ fontSize: '0.8rem', margin: '0.25rem 0 0 0' }}>All components are in-stock or covered for selected Work Orders!</p>
                </div>
              ) : (
                filteredWOShortages.map(woData => {
                  const wo = woData.wo;
                  const isExpanded = expandedNodes[wo.id] !== false;
                  const simQty = simulatedQuantities[wo.id] !== undefined ? simulatedQuantities[wo.id] : (wo.targetQuantity || wo.quantity || 1);

                  return (
                    <div key={wo.id} className="card" style={{ padding: '0.85rem', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
                      {/* Tree Parent Header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <div 
                          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}
                          onClick={() => toggleNode(wo.id)}
                        >
                          {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                          <span style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--accent-primary)', fontFamily: 'monospace' }}>
                            {wo.workOrderNo || wo.woNumber}
                          </span>
                          <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{wo.machineModel}</span>
                          <span className="badge badge-neutral" style={{ fontSize: '0.7rem' }}>Qty: {wo.targetQuantity || wo.quantity || 1}</span>
                          <span className={`badge ${woData.components.filter(c => c.isShortage).length > 0 ? 'badge-danger' : 'badge-success'}`} style={{ fontSize: '0.7rem' }}>
                            {woData.components.filter(c => c.isShortage).length} Shortages
                          </span>
                        </div>

                        {/* Capacity / What-If Simulation input */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <label style={{ fontSize: '0.75rem', fontWeight: 700, margin: 0 }}>Simulate Build Qty:</label>
                          <input
                            type="number"
                            min="0"
                            style={{ width: '70px', padding: '0.2rem 0.4rem', fontSize: '0.8rem', textAlign: 'center' }}
                            className="input-field"
                            value={simQty}
                            onChange={(e) => handleSimulatedQtyChange(wo.id, Number(e.target.value))}
                          />
                        </div>
                      </div>

                      {/* Tree Child Table */}
                      {isExpanded && (
                        <div style={{ marginTop: '0.65rem', border: '1px solid var(--border-color)', borderRadius: '0.375rem' }}>
                          <table>
                            <thead>
                              <tr>
                                <th style={{ width: '30px' }}>#</th>
                                <th>Component Code</th>
                                <th>Component Name</th>
                                <th>Source</th>
                                <th style={{ textAlign: 'right' }}>Total Req</th>
                                <th style={{ textAlign: 'right' }}>In Stock</th>
                                <th style={{ textAlign: 'right' }}>Net Shortage</th>
                                <th style={{ textAlign: 'center', minWidth: '180px' }}>Action</th>
                              </tr>
                            </thead>
                            <tbody>
                              {woData.components
                                .filter(c => shortageFilterMode === 'ALL_ITEMS' || c.isShortage)
                                .map((comp, cIdx) => {
                                  const childItem = comp.itemObj || items.find(i => i.id === comp.itemId || i.itemCode === comp.itemCode);
                                  const simulatedReq = (comp.qtyPerMachine || 1) * simQty;
                                  const simulatedShortage = Math.max(0, (simulatedReq + comp.minStockQty) - (comp.inHouseStock + comp.openPO + comp.pendingJW + comp.pendingQC));
                                  return (
                                    <tr key={cIdx} style={{ backgroundColor: simulatedShortage > 0 ? 'rgba(239, 68, 68, 0.06)' : 'transparent' }}>
                                      <td>{cIdx + 1}</td>
                                      <td style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--accent-primary)' }}>{comp.itemCode}</td>
                                      <td style={{ fontWeight: 600 }}>{comp.itemName}</td>
                                      <td>
                                        <span className={`badge ${comp.processType === 'Bought out' || comp.processType === 'Job work + Bought out' ? 'badge-primary' : comp.processType === 'In-house' ? 'badge-success' : 'badge-purple'}`} style={{ fontSize: '0.7rem' }}>
                                          {comp.processType}
                                        </span>
                                      </td>
                                      <td style={{ textAlign: 'right', fontWeight: 700 }}>{simulatedReq} {comp.unit}</td>
                                      <td style={{ textAlign: 'right' }}>{comp.inHouseStock} {comp.unit}</td>
                                      <td style={{ textAlign: 'right', fontWeight: 800, color: simulatedShortage > 0 ? 'var(--danger)' : 'var(--success)' }}>
                                        {simulatedShortage > 0 ? `${simulatedShortage} ${comp.unit}` : 'OK (0)'}
                                      </td>
                                      <td style={{ textAlign: 'center' }}>
                                        {simulatedShortage > 0 && childItem && (
                                          <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'center' }}>
                                            {(comp.processType === 'Bought out' || comp.processType === 'Job work + Bought out') && (
                                              <button type="button" className="btn btn-primary" style={{ padding: '0.15rem 0.35rem', fontSize: '0.68rem' }} onClick={() => handleRaisePO(childItem, simulatedShortage, wo)}>
                                                +PO
                                              </button>
                                            )}
                                            {(comp.processType === 'Job work' || comp.processType === 'Job work + Bought out') && (
                                              <button type="button" className="btn btn-outline" style={{ padding: '0.15rem 0.35rem', fontSize: '0.68rem' }} onClick={() => handleIssueJobwork(childItem, simulatedShortage, wo)}>
                                                +JW
                                              </button>
                                            )}
                                            {comp.processType === 'In-house' && (
                                              <button type="button" className="btn btn-outline" style={{ padding: '0.15rem 0.35rem', fontSize: '0.68rem', color: 'var(--success)' }} onClick={() => handleIssueJobCard(childItem, simulatedShortage, wo)}>
                                                +JC
                                              </button>
                                            )}
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
                  );
                })
              )}
            </div>
          )}

          {/* Tab 3-4: Process-Specific Consolidated Tables (PO, JW) */}
          {(activeTab === 'PO_SHORTAGE' || activeTab === 'JOBWORK_SHORTAGE') && (
            <div className="table-container-flow" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '0.5rem', overflow: 'auto', maxHeight: 'calc(100vh - 230px)', width: '100%', maxWidth: '100%' }}>
              <div style={{ padding: '0.5rem 0.75rem', backgroundColor: 'var(--bg-card)', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 25, boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 700 }}>
                  Combined Shortage Breakdown ({filteredActiveTabShortages.length} items from {relevantWOs.length} Work Orders):
                </span>
                <input
                  type="text"
                  placeholder="Filter table (code, name, class, source)..."
                  className="input-field"
                  style={{ width: '260px', padding: '0.2rem 0.5rem', fontSize: '0.78rem' }}
                  value={tableSearchTerm}
                  onChange={(e) => setTableSearchTerm(e.target.value)}
                />
              </div>

              <table className="shortage-proc-table">
                <thead>
                  <tr>
                    <th style={{ width: '30px' }}>#</th>
                    <th onClick={() => handleProcSortToggle('priority')} style={{ width: '60px', textAlign: 'center', cursor: 'pointer' }}>Priority</th>
                    <th onClick={() => handleProcSortToggle('leadTimeDays')} style={{ width: '75px', textAlign: 'center', cursor: 'pointer' }}>Lead Time</th>
                    <th onClick={() => handleProcSortToggle('itemCode')} style={{ cursor: 'pointer' }}>Item Code</th>
                    <th onClick={() => handleProcSortToggle('itemName')} style={{ cursor: 'pointer' }}>Item Description</th>
                    <th onClick={() => handleProcSortToggle('category')} style={{ textAlign: 'center', cursor: 'pointer' }}>Class</th>
                    <th onClick={() => handleProcSortToggle('processType')} style={{ textAlign: 'center', cursor: 'pointer' }}>Source Process</th>
                    <th onClick={() => handleProcSortToggle('totalRequired')} style={{ textAlign: 'right', cursor: 'pointer' }}>Total Req</th>
                    <th onClick={() => handleProcSortToggle('inHouseStock')} style={{ textAlign: 'right', cursor: 'pointer' }}>Current Stock</th>
                    <th onClick={() => handleProcSortToggle('openPO')} style={{ textAlign: 'right', cursor: 'pointer' }}>Open PO</th>
                    <th onClick={() => handleProcSortToggle('pendingJW')} style={{ textAlign: 'right', cursor: 'pointer' }}>Pend JW</th>
                    <th onClick={() => handleProcSortToggle('netShortage')} style={{ textAlign: 'right', cursor: 'pointer' }}>Shortage</th>
                    <th style={{ textAlign: 'center', minWidth: '180px' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredActiveTabShortages.map((c, idx) => {
                    const childItem = c.childItem || c.itemObj || items.find(i => i.id === c.itemId || i.itemCode === c.itemCode);
                    return (
                      <tr key={idx} style={{ backgroundColor: c.isShortage ? 'rgba(239, 68, 68, 0.06)' : 'transparent' }}>
                        <td>{idx + 1}</td>
                        <td style={{ textAlign: 'center' }}>
                          <span 
                            className={`badge ${c.priorityNum <= 3 ? 'badge-p1' : c.priorityNum <= 8 ? 'badge-p2' : 'badge-neutral'}`}
                            style={{ fontSize: '0.72rem', minWidth: '32px', justifyContent: 'center' }}
                            title={`Priority #${c.priorityNum} (Lead Time: ${c.leadTimeDays} Days)`}
                          >
                            {c.priorityRank}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                          {c.leadTimeDays} D
                        </td>
                        <td style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--accent-primary)' }}>{c.itemCode}</td>
                        <td style={{ fontWeight: 600 }}>{c.itemName}</td>
                        <td style={{ textAlign: 'center' }}><span className="badge badge-neutral" style={{ fontSize: '0.7rem' }}>{c.category}</span></td>
                        <td style={{ textAlign: 'center' }}><span className="badge badge-outline" style={{ fontSize: '0.7rem' }}>{c.processType}</span></td>
                        <td style={{ textAlign: 'right', fontWeight: 700 }}>{c.totalRequired} {c.unit}</td>
                        <td style={{ textAlign: 'right' }}>{c.inHouseStock} {c.unit}</td>
                        <td style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>{c.openPO || 0}</td>
                        <td style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>{c.pendingJW || 0}</td>
                        <td style={{ textAlign: 'right', fontWeight: 800, color: c.isShortage ? 'var(--danger)' : 'var(--success)' }}>
                          {c.isShortage ? `${c.netShortage} ${c.unit}` : 'OK (0)'}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                            {c.isShortage && childItem && (
                              <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'center' }}>
                                {activeTab === 'PO_SHORTAGE' && (
                                  <button type="button" className="btn btn-primary" style={{ padding: '0.2rem 0.4rem', fontSize: '0.7rem' }} onClick={() => handleRaisePO(childItem, c.netShortage)}>
                                    Raise PO
                                  </button>
                                )}
                                {activeTab === 'JOBWORK_SHORTAGE' && (() => {
                                  const processCard = itemProcessCards?.find(pc => 
                                    pc.itemId === childItem.id || 
                                    pc.itemCode?.toLowerCase() === childItem.itemCode?.toLowerCase() ||
                                    (pc.rawItemId && pc.rawItemId === childItem.id) ||
                                    (pc.rawItemCode && pc.rawItemCode.toLowerCase() === childItem.itemCode?.toLowerCase())
                                  );
                                  const hasProcessCard = Boolean(processCard && processCard.steps && processCard.steps.length > 0);
                                  const sources = (childItem.materialProcessSources || []).map(s => s.toLowerCase());
                                  const hasInHouse = sources.includes('in-house') || sources.includes('inhouse') || isInHouseItem(childItem);
                                  const hasBoughtOut = sources.includes('bought out') || sources.includes('brought out') || isBoughtOutItem(childItem);

                                  if (hasProcessCard) {
                                    return (
                                      <button type="button" className="btn btn-outline" style={{ padding: '0.2rem 0.4rem', fontSize: '0.7rem', color: 'var(--accent-primary)' }} onClick={() => handleIssueJobwork(childItem, c.netShortage)}>
                                        Issue JW
                                      </button>
                                    );
                                  }

                                  if (hasInHouse && hasBoughtOut) {
                                    return (
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', alignItems: 'center' }}>
                                        <span style={{ fontSize: '0.68rem', color: '#d97706', fontWeight: 600, textAlign: 'center', lineHeight: '1.2' }}>
                                          ⚠️ No process card exists (create it), or this part can also be produced <strong>In-house</strong> or <strong>Bought Out</strong>.
                                        </span>
                                        <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                                          <button type="button" className="btn btn-warning" style={{ padding: '0.15rem 0.35rem', fontSize: '0.68rem', fontWeight: 700, color: '#fff', backgroundColor: '#d97706', borderColor: '#d97706' }} onClick={() => handleIssueJobCard(childItem, c.netShortage)}>
                                            In-House (JC)
                                          </button>
                                          <button type="button" className="btn btn-primary" style={{ padding: '0.15rem 0.35rem', fontSize: '0.68rem', fontWeight: 700 }} onClick={() => handleRaisePO(childItem, c.netShortage)}>
                                            Bought Out (PO)
                                          </button>
                                          <button type="button" className="btn btn-outline" style={{ padding: '0.15rem 0.35rem', fontSize: '0.68rem' }} onClick={() => setActiveModule('process_master')}>
                                            + Create Card
                                          </button>
                                        </div>
                                      </div>
                                    );
                                  }

                                  if (hasInHouse) {
                                    return (
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', alignItems: 'center' }}>
                                        <span style={{ fontSize: '0.68rem', color: '#d97706', fontWeight: 600, textAlign: 'center', lineHeight: '1.2' }}>
                                          ⚠️ No process card exists (create it), or this part can also be produced <strong>In-house</strong>.
                                        </span>
                                        <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'center' }}>
                                          <button type="button" className="btn btn-warning" style={{ padding: '0.15rem 0.35rem', fontSize: '0.68rem', fontWeight: 700, color: '#fff', backgroundColor: '#d97706', borderColor: '#d97706' }} onClick={() => handleIssueJobCard(childItem, c.netShortage)}>
                                            In-House (JC)
                                          </button>
                                          <button type="button" className="btn btn-outline" style={{ padding: '0.15rem 0.35rem', fontSize: '0.68rem' }} onClick={() => setActiveModule('process_master')}>
                                            + Create Card
                                          </button>
                                        </div>
                                      </div>
                                    );
                                  }

                                  if (hasBoughtOut) {
                                    return (
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', alignItems: 'center' }}>
                                        <span style={{ fontSize: '0.68rem', color: '#d97706', fontWeight: 600, textAlign: 'center', lineHeight: '1.2' }}>
                                          ⚠️ No process card exists (create it), or this part can also be <strong>Bought Out</strong>.
                                        </span>
                                        <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'center' }}>
                                          <button type="button" className="btn btn-primary" style={{ padding: '0.15rem 0.35rem', fontSize: '0.68rem', fontWeight: 700 }} onClick={() => handleRaisePO(childItem, c.netShortage)}>
                                            Bought Out (PO)
                                          </button>
                                          <button type="button" className="btn btn-outline" style={{ padding: '0.15rem 0.35rem', fontSize: '0.68rem' }} onClick={() => setActiveModule('process_master')}>
                                            + Create Card
                                          </button>
                                        </div>
                                      </div>
                                    );
                                  }

                                  return (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', alignItems: 'center' }}>
                                      <span style={{ fontSize: '0.68rem', color: 'var(--danger)', fontWeight: 600, textAlign: 'center' }}>
                                        ⚠️ No process card exists for this item
                                      </span>
                                      <button type="button" className="btn btn-outline" style={{ padding: '0.15rem 0.35rem', fontSize: '0.68rem' }} onClick={() => setActiveModule('process_master')}>
                                        + Create Process Card
                                      </button>
                                    </div>
                                  );
                                })()}
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
      )}

      {/* ========================================================= */}
      {/* TAB 5: UPGRADED IN-HOUSE JOB CARD SHORTAGE                */}
      {/* ========================================================= */}
      {activeTab === 'JOBCARD_SHORTAGE' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%' }}>
          {/* Card 1: Selection & Filtering Control Panel */}
          <div className="card" style={{ padding: '0.75rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', flexShrink: 0 }}>
            {/* Header / Checkbox row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 700, fontSize: '0.84rem', margin: 0, userSelect: 'none' }}>
                  <input
                    type="checkbox"
                    checked={jcFilterByWO}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setJcFilterByWO(checked);
                      setSelectedJCIds([]);
                      setSelectedJCWOIds([]);
                      setJcWOSearchTerm('');
                    }}
                    style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                  />
                  <span>🔗 Filter against Work Order(s)</span>
                </label>
              </div>
            </div>

            {/* If Filter against WO is active: Multi-WO Selection Panel */}
            {jcFilterByWO && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '0.6rem 0.75rem', backgroundColor: 'var(--bg-secondary)', borderRadius: '0.375rem', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-primary)' }}>
                      1. Select Work Order(s) ({selectedJCWOIds.length} selected):
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                    <div style={{ position: 'relative', width: '220px', maxWidth: '100%' }}>
                      <Search size={13} style={{ position: 'absolute', left: '0.5rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                      <input
                        type="text"
                        placeholder="Search Work Orders..."
                        className="input-field"
                        style={{ paddingLeft: '1.75rem', paddingRight: '0.5rem', paddingTop: '0.2rem', paddingBottom: '0.2rem', fontSize: '0.76rem', width: '100%' }}
                        value={jcWOSearchTerm}
                        onChange={(e) => setJcWOSearchTerm(e.target.value)}
                      />
                    </div>

                    <button
                      type="button"
                      className="btn btn-outline"
                      style={{ padding: '0.2rem 0.5rem', fontSize: '0.74rem' }}
                      onClick={() => {
                        const allWOIds = filteredActiveWOsForJC.map(w => w.id);
                        setSelectedJCWOIds(allWOIds);
                        // Auto-select all JCs belonging to these WOs
                        const woSet = new Set(allWOIds);
                        const selectedWOObjs = workOrders.filter(w => woSet.has(w.id));
                        const woNoSet = new Set<string>();
                        selectedWOObjs.forEach(w => {
                          if (w.workOrderNo) woNoSet.add(w.workOrderNo.toLowerCase());
                          if ((w as any).woNumber) woNoSet.add((w as any).woNumber.toLowerCase());
                        });
                        const matchingJCs = allActiveJobCards.filter(jc => 
                          (jc.woId && woSet.has(jc.woId)) || 
                          (jc.woNumber && woNoSet.has(jc.woNumber.toLowerCase()))
                        );
                        setSelectedJCIds(matchingJCs.map(j => j.id));
                      }}
                      disabled={filteredActiveWOsForJC.length === 0}
                    >
                      <CheckSquare size={12} style={{ marginRight: '0.25rem' }} /> Select All WOs ({filteredActiveWOsForJC.length})
                    </button>

                    <button
                      type="button"
                      className="btn btn-outline"
                      style={{ padding: '0.2rem 0.5rem', fontSize: '0.74rem' }}
                      onClick={() => {
                        setSelectedJCWOIds([]);
                        setSelectedJCIds([]);
                      }}
                      disabled={selectedJCWOIds.length === 0}
                    >
                      <Square size={12} style={{ marginRight: '0.25rem' }} /> Clear WOs
                    </button>
                  </div>
                </div>

                {/* Multi-Select Work Order Badges */}
                <div style={{ 
                  display: 'flex', 
                  flexWrap: 'wrap', 
                  gap: '0.35rem', 
                  padding: '0.35rem', 
                  backgroundColor: 'var(--bg-tertiary)', 
                  borderRadius: '0.25rem', 
                  border: '1px solid var(--border-color)' 
                }}>
                  {filteredActiveWOsForJC.length === 0 ? (
                    <div style={{ padding: '0.3rem', fontSize: '0.76rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                      No active Work Orders match the search query.
                    </div>
                  ) : (
                    filteredActiveWOsForJC.map(wo => {
                      const isSelected = selectedJCWOIds.includes(wo.id);
                      return (
                        <button
                          key={wo.id}
                          type="button"
                          onClick={() => {
                            const newSelectedWOIds = isSelected 
                              ? selectedJCWOIds.filter(id => id !== wo.id)
                              : [...selectedJCWOIds, wo.id];
                            setSelectedJCWOIds(newSelectedWOIds);

                            // Auto-sync JCs
                            if (newSelectedWOIds.length === 0) {
                              setSelectedJCIds([]);
                            } else {
                              const woSet = new Set(newSelectedWOIds);
                              const selectedWOObjs = workOrders.filter(w => woSet.has(w.id));
                              const woNoSet = new Set<string>();
                              selectedWOObjs.forEach(w => {
                                if (w.workOrderNo) woNoSet.add(w.workOrderNo.toLowerCase());
                                if ((w as any).woNumber) woNoSet.add((w as any).woNumber.toLowerCase());
                              });
                              const matchingJCs = allActiveJobCards.filter(jc => 
                                (jc.woId && woSet.has(jc.woId)) || 
                                (jc.woNumber && woNoSet.has(jc.woNumber.toLowerCase()))
                              );
                              setSelectedJCIds(matchingJCs.map(j => j.id));
                            }
                          }}
                          className={`btn ${isSelected ? 'btn-primary' : 'btn-outline'}`}
                          style={{
                            padding: '0.18rem 0.45rem',
                            fontSize: '0.73rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            borderRadius: '0.25rem',
                            border: isSelected ? 'none' : '1px solid var(--border-color)'
                          }}
                        >
                          {isSelected ? <CheckSquare size={11} /> : <Square size={11} />}
                          <strong>{wo.workOrderNo || (wo as any).woNumber}</strong>
                          <span style={{ opacity: 0.85 }}>• {wo.machineModel}</span>
                          <span style={{ fontSize: '0.66rem', opacity: 0.8 }}>
                            (Qty: {wo.quantity || (wo as any).targetQuantity || 1})
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* Job Card Selection Toolbar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-primary)' }}>
                {jcFilterByWO ? `2. Select Job Cards under Selected WO(s)` : `Select Active Job Cards`} ({selectedJCIds.length} selected):
              </div>

              {/* Selection Actions & Search */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', width: '220px', maxWidth: '100%' }}>
                  <Search size={13} style={{ position: 'absolute', left: '0.5rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    placeholder="Search Job Cards..."
                    className="input-field"
                    style={{ paddingLeft: '1.75rem', paddingRight: '0.5rem', paddingTop: '0.2rem', paddingBottom: '0.2rem', fontSize: '0.76rem', width: '100%' }}
                    value={jcSearchTerm}
                    onChange={(e) => setJcSearchTerm(e.target.value)}
                  />
                </div>

                <button
                  type="button"
                  className="btn btn-outline"
                  style={{ padding: '0.2rem 0.5rem', fontSize: '0.74rem' }}
                  onClick={() => setSelectedJCIds(availableJCsForSelection.map(j => j.id))}
                  disabled={availableJCsForSelection.length === 0}
                >
                  <CheckSquare size={12} style={{ marginRight: '0.25rem' }} /> Select All JCs ({availableJCsForSelection.length})
                </button>

                <button
                  type="button"
                  className="btn btn-outline"
                  style={{ padding: '0.2rem 0.5rem', fontSize: '0.74rem' }}
                  onClick={() => setSelectedJCIds([])}
                  disabled={selectedJCIds.length === 0}
                >
                  <Square size={12} style={{ marginRight: '0.25rem' }} /> Clear JCs
                </button>
              </div>
            </div>

            {/* Multi-Select Job Card Badges */}
            <div style={{ 
              display: 'flex', 
              flexWrap: 'wrap', 
              gap: '0.35rem', 
              padding: '0.35rem', 
              backgroundColor: 'var(--bg-tertiary)', 
              borderRadius: '0.25rem', 
              border: '1px solid var(--border-color)' 
            }}>
              {filteredAvailableJCs.length === 0 ? (
                <div style={{ padding: '0.4rem', fontSize: '0.76rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  {jcFilterByWO && selectedJCWOIds.length === 0 
                    ? '👈 Please select one or more Work Orders above to view their associated Job Cards.' 
                    : 'No active Job Cards match the current filter.'}
                </div>
              ) : (
                filteredAvailableJCs.map(jc => {
                  const isSelected = selectedJCIds.includes(jc.id);
                  return (
                    <button
                      key={jc.id}
                      type="button"
                      onClick={() => {
                        setSelectedJCIds(prev => 
                          prev.includes(jc.id) ? prev.filter(id => id !== jc.id) : [...prev, jc.id]
                        );
                      }}
                      className={`btn ${isSelected ? 'btn-primary' : 'btn-outline'}`}
                      style={{
                        padding: '0.18rem 0.45rem',
                        fontSize: '0.73rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        borderRadius: '0.25rem',
                        border: isSelected ? 'none' : '1px solid var(--border-color)'
                      }}
                    >
                      {isSelected ? <CheckSquare size={11} /> : <Square size={11} />}
                      <strong>{jc.jobCardNo}</strong>
                      <span style={{ opacity: 0.85 }}>• {jc.itemName || jc.itemCode}</span>
                      <span style={{ fontSize: '0.66rem', backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.06)', padding: '0.05rem 0.3rem', borderRadius: '4px' }}>
                        Qty: {jc.targetQuantity}
                      </span>
                      {jc.woNumber && (
                        <span style={{ fontSize: '0.66rem', opacity: 0.75 }}>
                          (WO: {jc.woNumber})
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Card 2: Consolidated Job Card Shortage Table */}
          <div className="table-container-flow" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '0.5rem', overflowX: 'auto', overflowY: 'visible', width: '100%', maxWidth: '100%' }}>
            <div style={{ padding: '0.5rem 0.75rem', backgroundColor: 'var(--bg-card)', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', position: 'sticky', top: 0, zIndex: 25, boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 700 }}>
                  Job Card Material Shortage ({consolidatedJCShortages.length} parts required for {selectedJCIds.length} Job Cards):
                </span>
                {selectedJCIds.length > 0 && (
                  <span className={`badge ${consolidatedJCShortages.some(c => c.isShortage) ? 'badge-danger' : 'badge-success'}`} style={{ fontSize: '0.72rem' }}>
                    {consolidatedJCShortages.filter(c => c.isShortage).length} Items with Shortage
                  </span>
                )}
              </div>

              <input
                type="text"
                placeholder="Filter table components..."
                className="input-field"
                style={{ width: '240px', padding: '0.2rem 0.5rem', fontSize: '0.78rem' }}
                value={jcTableSearchTerm}
                onChange={(e) => setJcTableSearchTerm(e.target.value)}
              />
            </div>

            {selectedJCIds.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                <ClipboardList size={38} style={{ opacity: 0.3, marginBottom: '0.75rem' }} />
                <h4 style={{ fontWeight: 700, margin: '0 0 0.4rem 0' }}>No Job Cards Selected</h4>
                <p style={{ fontSize: '0.82rem', maxWidth: '440px', margin: '0 auto', color: 'var(--text-muted)' }}>
                  {jcFilterByWO
                    ? 'Select a Work Order above and choose one or more Job Cards to calculate component shortages.'
                    : 'Select one or more active Job Cards above to calculate required materials and store stock shortages.'}
                </p>
              </div>
            ) : filteredJCShortages.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                <CheckCircle size={38} color="var(--success)" style={{ opacity: 0.8, marginBottom: '0.75rem' }} />
                <h4 style={{ fontWeight: 700, margin: '0 0 0.4rem 0' }}>All Materials Available!</h4>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  {shortageFilterMode === 'SHORTAGE_ONLY'
                    ? 'None of the components required by the selected Job Cards have a shortage in store.'
                    : 'No matching components found for the current search filter.'}
                </p>
              </div>
            ) : (
              <div className="table-container-flow" style={{ overflow: 'auto', maxHeight: 'calc(100vh - 230px)', width: '100%', border: '1px solid var(--border-color)', borderRadius: '0.375rem' }}>
                <table className="shortage-proc-table" style={{ width: '100%', minWidth: '1300px' }}>
                  <thead>
                    <tr>
                      <th style={{ width: '30px' }}>#</th>
                      <th onClick={() => { setJcSortField('priority'); setJcSortOrder(prev => prev === 'asc' ? 'desc' : 'asc'); }} style={{ textAlign: 'center', cursor: 'pointer', minWidth: '70px' }}>Priority</th>
                      <th onClick={() => { setJcSortField('leadTimeDays'); setJcSortOrder(prev => prev === 'asc' ? 'desc' : 'asc'); }} style={{ textAlign: 'center', cursor: 'pointer', minWidth: '75px' }}>Lead Time</th>
                      <th onClick={() => { setJcSortField('itemCode'); setJcSortOrder(prev => prev === 'asc' ? 'desc' : 'asc'); }} style={{ cursor: 'pointer' }}>Item Code</th>
                      <th onClick={() => { setJcSortField('itemName'); setJcSortOrder(prev => prev === 'asc' ? 'desc' : 'asc'); }} style={{ cursor: 'pointer' }}>Item Description</th>
                      <th onClick={() => { setJcSortField('category'); setJcSortOrder(prev => prev === 'asc' ? 'desc' : 'asc'); }} style={{ textAlign: 'center', cursor: 'pointer' }}>Class</th>
                      <th onClick={() => { setJcSortField('processType'); setJcSortOrder(prev => prev === 'asc' ? 'desc' : 'asc'); }} style={{ textAlign: 'center', cursor: 'pointer' }}>Source</th>
                      <th style={{ minWidth: '150px' }}>Required By Job Cards</th>
                      <th onClick={() => { setJcSortField('totalRequired'); setJcSortOrder(prev => prev === 'asc' ? 'desc' : 'asc'); }} style={{ textAlign: 'right', cursor: 'pointer' }}>Total Req</th>
                      <th onClick={() => { setJcSortField('issuedQty'); setJcSortOrder(prev => prev === 'asc' ? 'desc' : 'asc'); }} style={{ textAlign: 'right', cursor: 'pointer' }}>Issued</th>
                      <th onClick={() => { setJcSortField('netRemainingReq'); setJcSortOrder(prev => prev === 'asc' ? 'desc' : 'asc'); }} style={{ textAlign: 'right', cursor: 'pointer' }}>Net Req</th>
                      <th onClick={() => { setJcSortField('inHouseStock'); setJcSortOrder(prev => prev === 'asc' ? 'desc' : 'asc'); }} style={{ textAlign: 'right', cursor: 'pointer' }}>In Stock</th>
                      <th style={{ textAlign: 'right' }}>Open PO</th>
                      <th style={{ textAlign: 'right' }}>Pend JW</th>
                      <th onClick={() => { setJcSortField('shortage'); setJcSortOrder(prev => prev === 'asc' ? 'desc' : 'asc'); }} style={{ textAlign: 'right', cursor: 'pointer' }}>Shortage</th>
                      <th style={{ textAlign: 'center', minWidth: '160px' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredJCShortages.map((c, idx) => {
                      const childItem = c.itemObj || items.find(i => i.id === c.itemId || i.itemCode === c.itemCode);
                      return (
                        <tr key={idx} style={{ backgroundColor: c.isShortage ? 'rgba(239, 68, 68, 0.06)' : 'transparent' }}>
                          <td>{idx + 1}</td>
                          <td style={{ textAlign: 'center' }}>
                            <span className={`badge ${c.priorityRank === 'P1' ? 'badge-p1' : c.priorityRank === 'P2' ? 'badge-p2' : 'badge-neutral'}`} style={{ fontWeight: 800, fontSize: '0.72rem' }}>
                              {c.priorityRank || 'P3'}
                            </span>
                          </td>
                          <td style={{ textAlign: 'center', fontWeight: 600, fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                            {c.leadTimeDays ? `${c.leadTimeDays} D` : '-'}
                          </td>
                          <td style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--accent-primary)' }}>
                            {c.itemCode}
                            {c.partCode && <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{c.partCode}</div>}
                          </td>
                          <td style={{ fontWeight: 600 }}>{c.itemName}</td>
                          <td style={{ textAlign: 'center' }}>
                            <span className="badge badge-neutral" style={{ fontSize: '0.7rem' }}>{c.category}</span>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <span className={`badge ${c.processType === 'Bought out' || c.processType === 'Job work + Bought out' ? 'badge-primary' : c.processType === 'In-house' ? 'badge-success' : 'badge-outline'}`} style={{ fontSize: '0.7rem' }}>
                              {c.processType}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '0.72rem' }}>
                              {(c.requiredByJCs || []).map((req, rIdx) => (
                                <span key={rIdx} style={{ color: 'var(--text-secondary)' }}>
                                  <strong>{req.jcNo}</strong>: {req.requiredQty} {c.unit}
                                  {req.issuedQty > 0 && <span style={{ color: 'var(--success)', marginLeft: '4px' }}>(Issued: {req.issuedQty})</span>}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 700 }}>{c.totalRequired} {c.unit}</td>
                          <td style={{ textAlign: 'right', color: c.issuedQty > 0 ? 'var(--success)' : 'var(--text-muted)', fontWeight: 600 }}>
                            {c.issuedQty} {c.unit}
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--text-primary)' }}>
                            {c.netRemainingReq} {c.unit}
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 700 }}>{c.inHouseStock} {c.unit}</td>
                          <td style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>{c.openPO || 0}</td>
                          <td style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>{c.pendingJW || 0}</td>
                          <td style={{ textAlign: 'right', fontWeight: 800, color: c.isShortage ? 'var(--danger)' : 'var(--success)' }}>
                            {c.isShortage ? `${c.shortage} ${c.unit}` : 'OK (0)'}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                              {c.isShortage && childItem && (
                                <>
                                  {(c.processType === 'Bought out' || c.processType === 'Job work + Bought out') && (
                                    <button type="button" className="btn btn-primary" style={{ padding: '0.15rem 0.35rem', fontSize: '0.68rem' }} onClick={() => handleRaisePO(childItem, c.shortage)}>
                                      +PO
                                    </button>
                                  )}
                                  {(c.processType === 'Job work' || c.processType === 'Job work + Bought out') && (
                                    <button type="button" className="btn btn-outline" style={{ padding: '0.15rem 0.35rem', fontSize: '0.68rem', color: 'var(--accent-primary)' }} onClick={() => handleIssueJobwork(childItem, c.shortage)}>
                                      +JW
                                    </button>
                                  )}
                                  {c.processType === 'In-house' && (
                                    <button type="button" className="btn btn-outline" style={{ padding: '0.15rem 0.35rem', fontSize: '0.68rem', color: 'var(--success)' }} onClick={() => handleIssueJobCard(childItem, c.shortage)}>
                                      +JC
                                    </button>
                                  )}
                                </>
                              )}
                              {c.inHouseStock > 0 && c.netRemainingReq > 0 && (
                                <button
                                  type="button"
                                  className="btn btn-success"
                                  style={{ padding: '0.15rem 0.4rem', fontSize: '0.68rem', fontWeight: 700 }}
                                  onClick={() => setActiveModule('material-issue')}
                                  title="Go to Material Issue & Store to issue available items"
                                >
                                  Store Issue
                                </button>
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
          </div>
        </div>
      )}

      {/* Dual Sourcing Allocation Modal */}
      {dualModalData && (
        <div className="modal-overlay" style={{ zIndex: 100 }}>
          <div className="modal-content" style={{ maxWidth: '520px', padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Split size={18} color="var(--accent-primary)" />
                Dual Source Allocation: {dualModalData.item.itemCode}
              </h3>
              <button type="button" style={{ background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => setDualModalData(null)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleConfirmDualModal} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div style={{ padding: '0.5rem 0.75rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: '0.375rem', fontSize: '0.82rem' }}>
                <div>Item: <strong>{dualModalData.item.name}</strong></div>
                <div>Total Shortage: <strong style={{ color: 'var(--danger)' }}>{dualModalData.netShortage} {dualModalData.item.unit}</strong></div>
                <div>MOQ (Min Order Qty): <strong>{dualModalData.item.minOrderQty || 1} {dualModalData.item.unit}</strong></div>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700 }}>Choose Fulfillment Strategy:</label>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.35rem' }}>
                  <button 
                    type="button" 
                    className={`btn ${dualModalData.processTypeChoice === 'PO_ONLY' ? 'btn-primary' : 'btn-outline'}`}
                    style={{ flex: 1, padding: '0.35rem', fontSize: '0.78rem' }}
                    onClick={() => setDualModalData({ ...dualModalData, processTypeChoice: 'PO_ONLY', poQty: dualModalData.netShortage, jwQty: 0 })}
                  >
                    100% Purchase (PO)
                  </button>
                  <button 
                    type="button" 
                    className={`btn ${dualModalData.processTypeChoice === 'JW_ONLY' ? 'btn-primary' : 'btn-outline'}`}
                    style={{ flex: 1, padding: '0.35rem', fontSize: '0.78rem' }}
                    onClick={() => setDualModalData({ ...dualModalData, processTypeChoice: 'JW_ONLY', jwQty: dualModalData.netShortage, poQty: 0 })}
                  >
                    100% Job Work (JW)
                  </button>
                  <button 
                    type="button" 
                    className={`btn ${dualModalData.processTypeChoice === 'SPLIT' ? 'btn-primary' : 'btn-outline'}`}
                    style={{ flex: 1, padding: '0.35rem', fontSize: '0.78rem' }}
                    onClick={() => setDualModalData({ ...dualModalData, processTypeChoice: 'SPLIT' })}
                  >
                    Custom Split (PO + JW)
                  </button>
                </div>
              </div>

              {dualModalData.processTypeChoice === 'SPLIT' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', padding: '0.75rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: '0.375rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div>
                      <label style={{ fontSize: '0.78rem', fontWeight: 700 }}>PO Split Quantity ({dualModalData.item.unit})</label>
                      <input 
                        type="number" 
                        min="0" 
                        max={dualModalData.netShortage} 
                        className="input-field" 
                        value={dualModalData.poQty} 
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setDualModalData({
                            ...dualModalData,
                            poQty: val,
                            jwQty: Math.max(0, dualModalData.netShortage - val)
                          });
                        }} 
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.78rem', fontWeight: 700 }}>Job Work Split Quantity ({dualModalData.item.unit})</label>
                      <input 
                        type="number" 
                        min="0" 
                        max={dualModalData.netShortage} 
                        className="input-field" 
                        value={dualModalData.jwQty} 
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setDualModalData({
                            ...dualModalData,
                            jwQty: val,
                            poQty: Math.max(0, dualModalData.netShortage - val)
                          });
                        }} 
                      />
                    </div>
                  </div>

                  {((dualModalData.poQty > 0 && dualModalData.poQty < (dualModalData.item.minOrderQty || 1)) || 
                    (dualModalData.jwQty > 0 && dualModalData.jwQty < (dualModalData.item.minOrderQty || 1))) && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--danger)', fontWeight: 700 }}>
                      ⚠️ Warning: Both split portions must be at least Minimum Order Quantity (MOQ: {dualModalData.item.minOrderQty || 1}).
                    </div>
                  )}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setDualModalData(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Confirm & Generate</button>
              </div>
            </form>
          </div>
        </div>
      )}

      </div>

      {/* Print Preview Modal - Landscape */}
      {isPrintModalOpen && (
        <PrintManagerModal
          documentTitle={`Shortage_Report_${activeTab}`}
          onClose={() => setIsPrintModalOpen(false)}
          orientation="landscape"
        >
          {activeTab === 'ITEM_WISE_SHORTAGE' ? (
            <ConsolidatedItemWiseShortagePrintReport
              data={filteredConsolidatedItems}
              selectedItems={selectedParentItemsMeta}
              filterLabel="Consolidated Item-Wise Shortage Report"
            />
          ) : (activeTab === 'PO_SHORTAGE' || activeTab === 'JOBWORK_SHORTAGE' || activeTab === 'JOBCARD_SHORTAGE') ? (
            <TabularShortagePrintView
              title={activeTab === 'PO_SHORTAGE' ? "BOUGHT-OUT PURCHASE SHORTAGE REPORT" : activeTab === 'JOBWORK_SHORTAGE' ? "EXTERNAL JOBWORK SHORTAGE REPORT" : "IN-HOUSE JOB CARD SHORTAGE REPORT"}
              rows={activeTabConsolidatedShortages.map((c, idx) => ({
                srNo: idx + 1,
                itemDescription: c.itemName,
                partCode: c.itemCode,
                requiredQty: c.totalRequired,
                currentStock: c.inHouseStock,
                moq: c.itemObj?.minOrderQty || 1,
                inPO: purchaseOrders.filter(po => po.status !== 'GOODS_RECEIVED' && po.status !== 'CANCELLED' && !(po as any).isDeleted).reduce((sum, po) => {
                  const line = po.items.find(pi => pi.itemId === c.itemId || pi.itemCode === c.itemCode);
                  return sum + (line ? (line.quantity || line.orderedQty || 0) : 0);
                }, 0),
                shortage: c.netShortage,
                unit: c.unit,
                extraInfo: `Class: ${c.category} | Source: ${c.processType}`
              }))}
              filterLabel={`Combined Shortage from ${relevantWOs.length} Selected Work Orders`}
              showMOQAndInPO={activeTab === 'PO_SHORTAGE'}
            />
          ) : (
            <WOShortagePrintView
              shortageData={filteredWOShortages}
              filterLabel="Active Work Order Shortage Trees"
            />
          )}
        </PrintManagerModal>
      )}
    </div>
  );
};
