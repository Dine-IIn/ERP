import React, { useState, useMemo } from 'react';
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
  const [isExplodeAllBOMs, setIsExplodeAllBOMs] = useState(false);
  const [shortageFilterMode, setShortageFilterMode] = useState<'SHORTAGE_ONLY' | 'ALL_ITEMS'>('SHORTAGE_ONLY');
  const [woSearchTerm, setWoSearchTerm] = useState('');
  const [tableSearchTerm, setTableSearchTerm] = useState('');
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});

  // Simulation Quantities (key: woId -> simulated qty)
  const [simulatedQuantities, setSimulatedQuantities] = useState<Record<string, number>>({});

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
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [componentSearchTerm, setComponentSearchTerm] = useState('');
  const [selectedClassFilters, setSelectedClassFilters] = useState<string[]>([]);
  const [selectedProcessFilter, setSelectedProcessFilter] = useState<string>('ALL');
  const [itemTargetQuantities, setItemTargetQuantities] = useState<Record<string, number>>({});
  const [itemWiseSortField, setItemWiseSortField] = useState<ItemWiseSortField>('shortage');
  const [itemWiseSortOrder, setItemWiseSortOrder] = useState<'asc' | 'desc'>('desc');

  const handleItemWiseSortToggle = (field: ItemWiseSortField) => {
    if (itemWiseSortField === field) {
      setItemWiseSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setItemWiseSortField(field);
      setItemWiseSortOrder('desc');
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
    window.print();
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

    const collectedComps: Array<{
      itemId: string;
      itemCode: string;
      itemName: string;
      qtyPerMachine: number;
      unit: string;
    }> = [];

    const collectComponents = (bom: BOM, multiplier: number, visited = new Set<string>()) => {
      if (visited.has(bom.id)) return;
      visited.add(bom.id);

      bom.components.forEach(comp => {
        const childIt = items.find(i => i.id === comp.itemId || i.itemCode === comp.itemCode);
        const qtyPer = (comp.qtyPerMachine || 1) * multiplier;
        
        const childBOM = isExplodeAllBOMs ? boms.find(b => b.id === childIt?.id || b.bomCode === childIt?.itemCode || b.machineModel?.toLowerCase() === childIt?.name?.toLowerCase()) : null;
        if (childBOM && isExplodeAllBOMs) {
          collectComponents(childBOM, qtyPer, new Set(visited));
        }

        collectedComps.push({
          itemId: comp.itemId || childIt?.id || '',
          itemCode: comp.itemCode || childIt?.itemCode || '',
          itemName: comp.itemName || childIt?.name || '',
          qtyPerMachine: qtyPer,
          unit: comp.unit || childIt?.unit || 'PCS'
        });
      });
    };

    collectComponents(matchingBOM, 1);

    const compLines = collectedComps.map(comp => {
      const childItem = items.find(i => i.id === comp.itemId || i.itemCode === comp.itemCode);
      const qtyPer = comp.qtyPerMachine;
      const totalReq = qtyPer * targetQty;
      const inHouse = childItem ? (childItem.inHouseStock || 0) : 0;
      const external = childItem ? (childItem.externalStock || 0) : 0;
      const minStock = childItem ? (childItem.minStockQty !== undefined ? childItem.minStockQty : (childItem.reorderLevel || 0)) : 0;
      const openPO = getOpenPOQuantity(childItem, comp.itemCode);
      const pendingJW = jobworks
        .filter(jw => jw.status !== 'COMPLETED' && jw.status !== 'CANCELLED' && !(jw as any).isDeleted)
        .reduce((sum, jw) => (jw.itemId === comp.itemId || jw.itemCode === comp.itemCode) ? sum + (jw.pendingBalance ?? jw.sentQuantity ?? 0) : sum, 0);
      const pendingQC = childItem?.pendingQCStock || 0;
      const totalPipelineSupply = inHouse + openPO + pendingJW + pendingQC;
      const netShortage = Math.max(0, (totalReq + minStock) - totalPipelineSupply);
      const pSource = childItem?.processType || 'In-house';

      const buildableUnits = Math.floor(inHouse / Math.max(1, qtyPer));
      if (buildableUnits < minBuildable) {
        minBuildable = buildableUnits;
        bottleneckComp = `${comp.itemCode} (${comp.itemName}) - Stock: ${inHouse} ${comp.unit || 'PCS'}, Needs ${qtyPer} per unit`;
      }

      return {
        ...comp,
        childItem,
        itemCode: comp.itemCode || childItem?.itemCode || '',
        itemName: comp.itemName || childItem?.name || '',
        category: childItem?.category || 'Component',
        processType: pSource,
        qtyPerItem: qtyPer,
        totalRequired: totalReq,
        inHouseStock: inHouse,
        externalStock: external,
        minStockQty: minStock,
        netShortage,
        isShortage: netShortage > 0,
        unit: comp.unit || childItem?.unit || 'PCS'
      };
    });

    const maxBuildable = minBuildable === Infinity ? 0 : minBuildable;
    const hasShortage = compLines.some(c => c.isShortage);

    return {
      item,
      matchingBOM,
      targetQty,
      maxBuildable,
      constrainingComponent: targetQty > 0 && maxBuildable < targetQty ? bottleneckComp : undefined,
      components: compLines,
      hasShortage
    };
  };

  const plannedItemDetails = items
    .filter(i => selectedItemIds.includes(i.id))
    .map(calculateItemShortageDetail);

  // -------------------------------------------------------------
  // CONSOLIDATED MULTI-ITEM SHORTAGE ($X + Y$) AGGREGATION
  // -------------------------------------------------------------
  const consolidatedItemWiseData = useMemo(() => {
    const itemMap = new Map<string, any>();

    const explodeItemBOMRecursively = (
      bomIdOrModel: string,
      multiplier: number,
      parentContext: { itemId: string; itemCode: string; itemName: string; targetQty: number },
      targetMap: Map<string, any>,
      visitedBOMs = new Set<string>()
    ) => {
      const bom = boms.find(b => b.id === bomIdOrModel || b.bomCode === bomIdOrModel || b.machineModel?.toLowerCase() === bomIdOrModel?.toLowerCase());
      if (!bom || !bom.components || visitedBOMs.has(bom.id)) return;
      visitedBOMs.add(bom.id);

      bom.components.forEach(comp => {
        const childIt = items.find(i => i.id === comp.itemId || i.itemCode === comp.itemCode);
        const qtyPer = comp.qtyPerMachine || 1;
        const totalReq = qtyPer * multiplier;
        const key = comp.itemCode || comp.itemId || 'unknown';

        const subBOM = boms.find(b => b.id === childIt?.id || b.bomCode === childIt?.itemCode || b.machineModel?.toLowerCase() === childIt?.name?.toLowerCase());
        if (subBOM && isExplodeAllBOMs) {
          explodeItemBOMRecursively(subBOM.id, totalReq, parentContext, targetMap, new Set(visitedBOMs));
        }

        if (!targetMap.has(key)) {
          targetMap.set(key, {
            itemId: childIt?.id || comp.itemId || '',
            itemCode: comp.itemCode || childIt?.itemCode || '',
            partCode: childIt?.partCode || '',
            itemName: comp.itemName || childIt?.name || '',
            category: childIt?.category || 'Component',
            processType: childIt?.processType || 'In-house',
            unit: comp.unit || childIt?.unit || 'PCS',
            totalRequired: totalReq,
            itemObj: childIt,
            requiredByItems: [{
              itemId: parentContext.itemId,
              itemCode: parentContext.itemCode,
              itemName: parentContext.itemName,
              targetQty: parentContext.targetQty,
              requiredQty: totalReq
            }]
          });
        } else {
          const existing = targetMap.get(key)!;
          existing.totalRequired += totalReq;
          const found = existing.requiredByItems.find((r: any) => r.itemId === parentContext.itemId);
          if (found) {
            found.requiredQty += totalReq;
          } else {
            existing.requiredByItems.push({
              itemId: parentContext.itemId,
              itemCode: parentContext.itemCode,
              itemName: parentContext.itemName,
              targetQty: parentContext.targetQty,
              requiredQty: totalReq
            });
          }
        }
      });
    };

    selectedItemIds.forEach(itemId => {
      const parentItem = items.find(i => i.id === itemId);
      if (!parentItem) return;
      const targetQty = itemTargetQuantities[itemId] !== undefined ? itemTargetQuantities[itemId] : 0;
      const parentContext = {
        itemId: parentItem.id,
        itemCode: parentItem.itemCode,
        itemName: parentItem.name,
        targetQty
      };

      const matchingBOM = boms.find(b => 
        b.id === parentItem.id ||
        b.bomCode?.toLowerCase() === parentItem.itemCode.toLowerCase() || 
        b.machineModel?.toLowerCase() === parentItem.name.toLowerCase()
      );

      if (matchingBOM && matchingBOM.components && matchingBOM.components.length > 0) {
        if (isExplodeAllBOMs) {
          explodeItemBOMRecursively(matchingBOM.id, targetQty, parentContext, itemMap);
        } else {
          matchingBOM.components.forEach(comp => {
            const childIt = items.find(i => i.id === comp.itemId || i.itemCode === comp.itemCode);
            const qtyPer = comp.qtyPerMachine || 1;
            const totalReq = qtyPer * targetQty;
            const key = comp.itemCode || comp.itemId || 'unknown';

            if (!itemMap.has(key)) {
              itemMap.set(key, {
                itemId: childIt?.id || comp.itemId || '',
                itemCode: comp.itemCode || childIt?.itemCode || '',
                partCode: childIt?.partCode || '',
                itemName: comp.itemName || childIt?.name || '',
                category: childIt?.category || 'Component',
                processType: childIt?.processType || 'In-house',
                unit: comp.unit || childIt?.unit || 'PCS',
                totalRequired: totalReq,
                itemObj: childIt,
                requiredByItems: [{
                  itemId: parentItem.id,
                  itemCode: parentItem.itemCode,
                  itemName: parentItem.name,
                  targetQty,
                  requiredQty: totalReq
                }]
              });
            } else {
              const existing = itemMap.get(key)!;
              existing.totalRequired += totalReq;
              const found = existing.requiredByItems.find((r: any) => r.itemId === parentItem.id);
              if (found) {
                found.requiredQty += totalReq;
              } else {
                existing.requiredByItems.push({
                  itemId: parentItem.id,
                  itemCode: parentItem.itemCode,
                  itemName: parentItem.name,
                  targetQty,
                  requiredQty: totalReq
                });
              }
            }
          });
        }
      } else {
        const key = parentItem.itemCode || parentItem.id;
        if (!itemMap.has(key)) {
          itemMap.set(key, {
            itemId: parentItem.id,
            itemCode: parentItem.itemCode,
            partCode: parentItem.partCode || '',
            itemName: parentItem.name,
            category: parentItem.category || 'Component',
            processType: parentItem.processType || 'In-house',
            unit: parentItem.unit || 'PCS',
            totalRequired: targetQty,
            itemObj: parentItem,
            requiredByItems: [{
              itemId: parentItem.id,
              itemCode: parentItem.itemCode,
              itemName: parentItem.name,
              targetQty,
              requiredQty: targetQty
            }]
          });
        } else {
          const existing = itemMap.get(key)!;
          existing.totalRequired += targetQty;
          const found = existing.requiredByItems.find((r: any) => r.itemId === parentItem.id);
          if (found) {
            found.requiredQty += targetQty;
          } else {
            existing.requiredByItems.push({
              itemId: parentItem.id,
              itemCode: parentItem.itemCode,
              itemName: parentItem.name,
              targetQty,
              requiredQty: targetQty
            });
          }
        }
      }
    });

    return Array.from(itemMap.values()).map((c, idx) => {
      const childItem = c.itemObj || items.find(i => i.id === c.itemId || i.itemCode === c.itemCode);
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
        isShortage
      };
    });
  }, [selectedItemIds, itemTargetQuantities, items, boms, jobworks, purchaseOrders, isExplodeAllBOMs]);

  // Filtered Consolidated Components ($X + Y$)
  const filteredConsolidatedItems = useMemo(() => {
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
      if (componentSearchTerm.trim()) {
        const term = componentSearchTerm.trim().toLowerCase();
        const matchPart = (c.partCode || '').toLowerCase().includes(term);
        const matchCode = (c.itemCode || '').toLowerCase().includes(term);
        const matchName = (c.itemName || '').toLowerCase().includes(term);
        const matchCat = (c.category || '').toLowerCase().includes(term);
        const matchProcess = (c.processType || '').toLowerCase().includes(term);
        const demandText = (c.requiredByItems || []).map((r: any) => `${r.itemCode} ${r.itemName}`).join(' ').toLowerCase();
        const matchDemand = demandText.includes(term);
        if (!matchPart && !matchCode && !matchName && !matchCat && !matchProcess && !matchDemand) {
          return false;
        }
      }
      return true;
    });

    return list.sort((a, b) => {
      let valA: any = a[itemWiseSortField as keyof typeof a];
      let valB: any = b[itemWiseSortField as keyof typeof b];

      if (itemWiseSortField === 'demandFrom') {
        valA = (a.requiredByItems || []).map((r: any) => r.itemCode).join(', ');
        valB = (b.requiredByItems || []).map((r: any) => r.itemCode).join(', ');
      }

      if (typeof valA === 'string') {
        valA = valA.toLowerCase();
        valB = (valB || '').toString().toLowerCase();
      }

      if (valA < valB) return itemWiseSortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return itemWiseSortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [consolidatedItemWiseData, selectedClassFilters, selectedProcessFilter, shortageFilterMode, componentSearchTerm, itemWiseSortField, itemWiseSortOrder]);

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
    <div className="module-layout-container" style={{ flex: 1, minHeight: 0, height: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingRight: '0.25rem' }}>
      
      {/* Header */}
      <div className="sticky-module-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', paddingBottom: '0.5rem' }}>
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

      {/* Top 5 Routing Tabs */}
      <div style={{ display: 'flex', gap: '0.35rem', backgroundColor: 'var(--bg-tertiary)', padding: '0.35rem', borderRadius: '0.5rem', flexWrap: 'wrap', flexShrink: 0 }}>
        <button 
          className={`btn ${activeTab === 'ITEM_WISE_SHORTAGE' ? 'btn-primary' : 'btn-outline'}`}
          style={{ padding: '0.4rem 0.9rem', fontSize: '0.82rem', border: 'none' }}
          onClick={() => setActiveTab('ITEM_WISE_SHORTAGE')}
        >
          <Package size={14} /> Item-Wise
        </button>
        <button 
          className={`btn ${activeTab === 'WO_SHORTAGE' ? 'btn-primary' : 'btn-outline'}`}
          style={{ padding: '0.4rem 0.9rem', fontSize: '0.82rem', border: 'none' }}
          onClick={() => setActiveTab('WO_SHORTAGE')}
        >
          <Layers size={14} /> Work Order Shortage Tree
        </button>
        <button 
          className={`btn ${activeTab === 'PO_SHORTAGE' ? 'btn-primary' : 'btn-outline'}`}
          style={{ padding: '0.4rem 0.9rem', fontSize: '0.82rem', border: 'none' }}
          onClick={() => setActiveTab('PO_SHORTAGE')}
        >
          <ShoppingCart size={14} /> PO / Bought-Out Shortage
        </button>
        <button 
          className={`btn ${activeTab === 'JOBWORK_SHORTAGE' ? 'btn-primary' : 'btn-outline'}`}
          style={{ padding: '0.4rem 0.9rem', fontSize: '0.82rem', border: 'none' }}
          onClick={() => setActiveTab('JOBWORK_SHORTAGE')}
        >
          <Truck size={14} /> Job Work Shortage
        </button>
        <button 
          className={`btn ${activeTab === 'JOBCARD_SHORTAGE' ? 'btn-primary' : 'btn-outline'}`}
          style={{ padding: '0.4rem 0.9rem', fontSize: '0.82rem', border: 'none' }}
          onClick={() => setActiveTab('JOBCARD_SHORTAGE')}
        >
          <ClipboardList size={14} /> In-House Job Card Shortage
        </button>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: ITEM-WISE SHORTAGE & CONSOLIDATED CAPACITY ($X+Y$) */}
      {/* ========================================================= */}
      {activeTab === 'ITEM_WISE_SHORTAGE' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1, minHeight: 0 }}>
          
          {/* Top Panel: Search & Add Parent Finished Items / Assemblies */}
          <div className="card" style={{ padding: '0.75rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.65rem', flexShrink: 0 }}>
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
                    boxShadow: 'var(--shadow-md)',
                    maxHeight: '220px',
                    overflowY: 'auto',
                    zIndex: 20
                  }}>
                    {items
                      .filter(i => !i.isBlocked && !selectedItemIds.includes(i.id) && (
                        i.itemCode.toLowerCase().includes(itemWiseSearch.toLowerCase()) ||
                        i.name.toLowerCase().includes(itemWiseSearch.toLowerCase()) ||
                        (i.partCode && i.partCode.toLowerCase().includes(itemWiseSearch.toLowerCase())) ||
                        (i.category && i.category.toLowerCase().includes(itemWiseSearch.toLowerCase()))
                      ))
                      .slice(0, 10)
                      .map(it => (
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
                      ))}
                  </div>
                )}
              </div>
            </div>

            {/* Added Planned Items in Compact Single Rows */}
            {selectedItemIds.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', paddingTop: '0.4rem', borderTop: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    Planned Items ({selectedItemIds.length}):
                  </span>
                  <button 
                    type="button" 
                    className="btn btn-outline" 
                    style={{ padding: '0.15rem 0.45rem', fontSize: '0.7rem', color: 'var(--danger)' }} 
                    onClick={() => setSelectedItemIds([])}
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

          {/* Consolidated Component Table Filter & Search Controls */}
          {selectedItemIds.length > 0 && (
            <div className="card" style={{ padding: '0.75rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.65rem', flexShrink: 0 }}>
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

          {/* Consolidated Component Table ($X + Y$) */}
          <div className="table-container" style={{ flex: 1, overflowY: 'auto', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '0.5rem' }}>
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
              <table>
                <thead>
                  <tr>
                    {/* 1. # */}
                    <th onClick={() => handleItemWiseSortToggle('srNo')} style={{ width: '40px', textAlign: 'center', cursor: 'pointer', userSelect: 'none' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.2rem' }}>
                        # {itemWiseSortField === 'srNo' ? (itemWiseSortOrder === 'asc' ? <ArrowUp size={11} /> : <ArrowDown size={11} />) : <ArrowUpDown size={10} color="var(--text-muted)" />}
                      </div>
                    </th>

                    {/* 2. Part Code */}
                    <th onClick={() => handleItemWiseSortToggle('partCode')} style={{ width: '115px', cursor: 'pointer', userSelect: 'none' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                        Part Code {itemWiseSortField === 'partCode' ? (itemWiseSortOrder === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={11} color="var(--text-muted)" />}
                      </div>
                    </th>

                    {/* 3. Item Code */}
                    <th onClick={() => handleItemWiseSortToggle('itemCode')} style={{ width: '120px', cursor: 'pointer', userSelect: 'none' }}>
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
                    <th onClick={() => handleItemWiseSortToggle('category')} style={{ width: '70px', textAlign: 'center', cursor: 'pointer', userSelect: 'none' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.2rem' }}>
                        Class {itemWiseSortField === 'category' ? (itemWiseSortOrder === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={11} color="var(--text-muted)" />}
                      </div>
                    </th>

                    {/* 6. Source */}
                    <th onClick={() => handleItemWiseSortToggle('processType')} style={{ width: '95px', textAlign: 'center', cursor: 'pointer', userSelect: 'none' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.2rem' }}>
                        Source {itemWiseSortField === 'processType' ? (itemWiseSortOrder === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={11} color="var(--text-muted)" />}
                      </div>
                    </th>

                    {/* 7. Demand From */}
                    <th onClick={() => handleItemWiseSortToggle('demandFrom')} style={{ width: '135px', cursor: 'pointer', userSelect: 'none' }}>
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
                    <th onClick={() => handleItemWiseSortToggle('inHouseStock')} style={{ textAlign: 'right', width: '85px', cursor: 'pointer', userSelect: 'none' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.2rem' }}>
                        In Stock {itemWiseSortField === 'inHouseStock' ? (itemWiseSortOrder === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={11} color="var(--text-muted)" />}
                      </div>
                    </th>

                    {/* 10. Pend PO */}
                    <th onClick={() => handleItemWiseSortToggle('pendingPO')} style={{ textAlign: 'right', width: '75px', cursor: 'pointer', userSelect: 'none' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.2rem' }}>
                        Pend PO {itemWiseSortField === 'pendingPO' ? (itemWiseSortOrder === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={11} color="var(--text-muted)" />}
                      </div>
                    </th>

                    {/* 11. Pend JW */}
                    <th onClick={() => handleItemWiseSortToggle('pendingJW')} style={{ textAlign: 'right', width: '75px', cursor: 'pointer', userSelect: 'none' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.2rem' }}>
                        Pend JW {itemWiseSortField === 'pendingJW' ? (itemWiseSortOrder === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={11} color="var(--text-muted)" />}
                      </div>
                    </th>

                    {/* 12. Pend QC */}
                    <th onClick={() => handleItemWiseSortToggle('pendingQC')} style={{ textAlign: 'right', width: '75px', cursor: 'pointer', userSelect: 'none' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.2rem' }}>
                        Pend QC {itemWiseSortField === 'pendingQC' ? (itemWiseSortOrder === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={11} color="var(--text-muted)" />}
                      </div>
                    </th>

                    {/* 13. Shortage */}
                    <th onClick={() => handleItemWiseSortToggle('shortage')} style={{ textAlign: 'right', width: '90px', cursor: 'pointer', userSelect: 'none' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.2rem' }}>
                        Shortage {itemWiseSortField === 'shortage' ? (itemWiseSortOrder === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={11} color="var(--text-muted)" />}
                      </div>
                    </th>

                    {/* 14. Min Stock */}
                    <th onClick={() => handleItemWiseSortToggle('minStockLevel')} style={{ textAlign: 'right', width: '85px', cursor: 'pointer', userSelect: 'none' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.2rem' }}>
                        Min Stock {itemWiseSortField === 'minStockLevel' ? (itemWiseSortOrder === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={11} color="var(--text-muted)" />}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredConsolidatedItems.map((comp, idx) => {
                    const isLineShortage = comp.shortage > 0 || comp.minShortage > 0;
                    const childItem = comp.itemObj;

                    return (
                      <tr 
                        key={idx} 
                        style={{ backgroundColor: isLineShortage ? 'rgba(239, 68, 68, 0.06)' : 'transparent' }}
                      >
                        <td style={{ textAlign: 'center', color: 'var(--text-muted)' }}>{idx + 1}</td>
                        <td style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {comp.partCode || '-'}
                        </td>
                        <td style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--accent-primary)' }}>
                          {comp.itemCode}
                        </td>
                        <td style={{ fontWeight: 600 }}>
                          {comp.itemName}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span className="badge badge-neutral" style={{ fontSize: '0.72rem' }}>
                            {comp.category}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span className={`badge ${comp.processType === 'Bought out' || comp.processType === 'Job work + Bought out' ? 'badge-primary' : comp.processType === 'In-house' ? 'badge-success' : comp.processType === 'Job work' ? 'badge-purple' : 'badge-neutral'}`} style={{ fontSize: '0.72rem' }}>
                            {comp.processType || 'In-house'}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '0.72rem' }}>
                            {(comp.requiredByItems || []).map((req: any, rIdx: number) => (
                              <span key={rIdx} style={{ color: 'var(--text-secondary)' }}>
                                <strong>{req.itemCode}</strong>: {req.requiredQty} {comp.unit}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--text-primary)' }}>
                          {comp.totalRequired} {comp.unit}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 700 }}>
                          {comp.inHouseStock} {comp.unit}
                        </td>
                        <td style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>
                          {comp.pendingPO || 0}
                        </td>
                        <td style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>
                          {comp.pendingJW || 0}
                        </td>
                        <td style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>
                          {comp.pendingQC || 0}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 900, color: comp.shortage > 0 ? 'var(--danger)' : 'var(--success)' }}>
                          {comp.shortage > 0 ? `${comp.shortage} ${comp.unit}` : 'OK (0)'}
                        </td>
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
      )}

      {/* ========================================================= */}
      {/* TAB 2-5: WORK ORDER SHORTAGE & COMBINED AGGREGATION       */}
      {/* ========================================================= */}
      {activeTab !== 'ITEM_WISE_SHORTAGE' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1, minHeight: 0 }}>
          
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
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', maxHeight: '95px', overflowY: 'auto', padding: '0.4rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: '0.375rem', border: '1px solid var(--border-color)' }}>
              {workOrders
                .filter(w => (w.status === 'IN_PROGRESS' || w.status === 'PLANNED') && (
                  !woSearchTerm || 
                  (w.workOrderNo || '').toLowerCase().includes(woSearchTerm.toLowerCase()) || 
                  (w.machineModel || '').toLowerCase().includes(woSearchTerm.toLowerCase()) || 
                  ((w as any).woNumber || '').toLowerCase().includes(woSearchTerm.toLowerCase())
                ))
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
            <div className="table-container" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
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
                        <div className="table-container" style={{ marginTop: '0.65rem', maxHeight: '250px', overflowY: 'auto' }}>
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

          {/* Tab 3-5: Process-Specific Consolidated Tables (PO, JW, JC) */}
          {(activeTab === 'PO_SHORTAGE' || activeTab === 'JOBWORK_SHORTAGE' || activeTab === 'JOBCARD_SHORTAGE') && (
            <div className="table-container" style={{ flex: 1, overflowY: 'auto' }}>
              <div style={{ padding: '0.5rem 0.75rem', backgroundColor: 'var(--bg-card)', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 700 }}>
                  Combined Shortage Breakdown ({activeTabConsolidatedShortages.length} items from {relevantWOs.length} Work Orders):
                </span>
                <input
                  type="text"
                  placeholder="Filter table..."
                  className="input-field"
                  style={{ width: '220px', padding: '0.2rem 0.5rem', fontSize: '0.78rem' }}
                  value={tableSearchTerm}
                  onChange={(e) => setTableSearchTerm(e.target.value)}
                />
              </div>

              <table>
                <thead>
                  <tr>
                    <th style={{ width: '30px' }}>#</th>
                    <th>Item Code</th>
                    <th>Item Description</th>
                    <th>Class</th>
                    <th>Source Process</th>
                    <th style={{ textAlign: 'right' }}>Total Req</th>
                    <th style={{ textAlign: 'right' }}>Current Stock</th>
                    <th style={{ textAlign: 'right' }}>Open PO</th>
                    <th style={{ textAlign: 'right' }}>Pend JW</th>
                    <th style={{ textAlign: 'right' }}>Shortage</th>
                    <th style={{ textAlign: 'center', minWidth: '180px' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {activeTabConsolidatedShortages
                    .filter(c => !tableSearchTerm || c.itemCode.toLowerCase().includes(tableSearchTerm.toLowerCase()) || c.itemName.toLowerCase().includes(tableSearchTerm.toLowerCase()))
                    .map((c, idx) => {
                      const childItem = c.itemObj || items.find(i => i.id === c.itemId || i.itemCode === c.itemCode);
                      return (
                        <tr key={idx} style={{ backgroundColor: c.isShortage ? 'rgba(239, 68, 68, 0.06)' : 'transparent' }}>
                          <td>{idx + 1}</td>
                          <td style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--accent-primary)' }}>{c.itemCode}</td>
                          <td style={{ fontWeight: 600 }}>{c.itemName}</td>
                          <td><span className="badge badge-neutral" style={{ fontSize: '0.7rem' }}>{c.category}</span></td>
                          <td><span className="badge badge-outline" style={{ fontSize: '0.7rem' }}>{c.processType}</span></td>
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
                                {activeTab === 'JOBCARD_SHORTAGE' && (
                                  <button type="button" className="btn btn-outline" style={{ padding: '0.2rem 0.4rem', fontSize: '0.7rem', color: 'var(--success)' }} onClick={() => handleIssueJobCard(childItem, c.netShortage)}>
                                    Issue JC
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

      {/* Hidden Direct Print Area (Used by Quick Direct Print) */}
      <div id="direct-print-area">
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
      </div>

    </div>
  );
};
