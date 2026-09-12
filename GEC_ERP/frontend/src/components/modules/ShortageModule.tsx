import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import { PrintManagerModal } from '../printTemplates/PrintManagerModal';
import { 
  ItemWiseShortagePrintView, WOShortagePrintView, POShortagePrintView, TabularShortagePrintView 
} from '../printTemplates/ShortagePrintTemplates';
import { 
  AlertTriangle, Filter, Printer, ChevronRight, ChevronDown, 
  Layers, Package, Truck, ClipboardList, ShoppingCart, Search, RefreshCw, CheckCircle, Split, ArrowUpDown, ArrowUp, ArrowDown, X, Plus, Sparkles, CheckSquare, Square 
} from 'lucide-react';
import { WorkOrder, BOM, Item, PurchaseOrder, JobworkChallan, JobCard, FIXED_ITEM_CLASSES, generateNextPONumber } from '../../types/erp';

export const ShortageModule: React.FC = () => {
  const { 
    workOrders, boms, items, jobworks, jobCards, purchaseOrders, vendors,
    addPurchaseOrder, addJobworkChallan, addJobCard, setActiveModule 
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
      .filter(po => po.status !== 'GOODS_RECEIVED' && po.status !== 'CANCELLED' && po.status !== 'REJECTED')
      .reduce((sum, po) => {
        const line = po.items.find(pi => (item && pi.itemId === item.id) || pi.itemCode === itemCode);
        if (!line) return sum;
        const ordered = line.quantity || line.orderedQty || 0;
        const received = line.receivedQty || 0;
        return sum + Math.max(0, ordered - received);
      }, 0);
  };

  // --- ITEM-WISE SHORTAGE STATE ---
  const [itemWiseSearch, setItemWiseSearch] = useState('');
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [selectedClassFilters, setSelectedClassFilters] = useState<string[]>([]);
  const [itemTargetQuantities, setItemTargetQuantities] = useState<Record<string, number>>({});

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
    setSimulatedQuantities(prev => ({ ...prev, [key]: Math.max(1, qty) }));
  };

  const handleItemTargetQtyChange = (itemId: string, qty: number) => {
    setItemTargetQuantities(prev => ({ ...prev, [itemId]: Math.max(1, qty) }));
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
  // ITEM-WISE SHORTAGE CALCULATIONS
  // -------------------------------------------------------------
  const calculateItemShortageDetail = (item: Item) => {
    const targetQty = itemTargetQuantities[item.id] || 1;
    const matchingBOM = boms.find(b => 
      b.machineModel?.toLowerCase() === item.name.toLowerCase() || 
      b.bomCode?.toLowerCase() === item.itemCode.toLowerCase()
    );

    if (!matchingBOM || !matchingBOM.components || matchingBOM.components.length === 0) {
      // Standalone / Raw material item calculation
      const inHouse = item.inHouseStock || 0;
      const minStock = item.minStockQty !== undefined ? item.minStockQty : (item.reorderLevel || 0);
      const openPO = getOpenPOQuantity(item, item.itemCode);
      const pendingJW = jobworks
        .filter(jw => jw.status !== 'COMPLETED' && jw.status !== 'CANCELLED')
        .reduce((sum, jw) => (jw.itemId === item.id || jw.itemCode === item.itemCode) ? sum + (jw.pendingBalance ?? jw.sentQuantity ?? 0) : sum, 0);
      const pendingQC = item.pendingQCStock || 0;
      const totalPipelineSupply = inHouse + openPO + pendingJW + pendingQC;
      const netShortage = Math.max(0, (targetQty + minStock) - totalPipelineSupply);
      return {
        item,
        matchingBOM: null,
        targetQty,
        maxBuildable: inHouse,
        constrainingComponent: totalPipelineSupply < (targetQty + minStock) ? `${item.itemCode} (Direct Stock Shortage)` : undefined,
        components: [],
        hasShortage: netShortage > 0 || (totalPipelineSupply <= minStock)
      };
    }

    let minBuildable = Infinity;
    let bottleneckComp = '';

    // Collect components (support multi-level recursion if isExplodeAllBOMs is true)
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
        .filter(jw => jw.status !== 'COMPLETED' && jw.status !== 'CANCELLED')
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
      constrainingComponent: maxBuildable < targetQty ? bottleneckComp : undefined,
      components: compLines,
      hasShortage
    };
  };

  // Item-Wise: ONLY user-added items are rendered
  const plannedItemDetails = items
    .filter(i => selectedItemIds.includes(i.id))
    .map(calculateItemShortageDetail);

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

  // Multi-level recursive BOM explosion helper
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

      // Check if this component itself has a sub-assembly BOM
      const subBOM = boms.find(b => b.id === itemObj?.id || b.bomCode === itemObj?.itemCode || b.machineModel?.toLowerCase() === itemObj?.name?.toLowerCase());

      if (subBOM && isExplodeAllBOMs) {
        // Explode child BOM recursively (BOM inside BOM)
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
      .filter(jw => jw.status !== 'COMPLETED' && jw.status !== 'CANCELLED')
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
        .filter(jw => jw.status !== 'COMPLETED' && jw.status !== 'CANCELLED')
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

      alert(`✅ Successfully split & created:\n- PO: ${poQty} ${item.unit}\n- Job Work: ${jwQty} ${item.unit}!`);
    }

    setDualModalData(null);
  };

  return (
    <div className="module-layout-container" style={{ flex: 1, minHeight: 0, height: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingRight: '0.25rem' }}>
      
      {/* Header */}
      <div className="sticky-module-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', paddingBottom: '0.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
            <AlertTriangle size={20} color="var(--warning)" />
            Shortage Planning & Production Capacity Engine
          </h2>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Item-Wise BOM Explosion &bull; Suggested Max Buildable Count &bull; Dual Sourcing & Work Order Trees
          </span>
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
          <button type="button" className="btn btn-outline" onClick={() => setPrintModalOpen(true)} title="Print Shortage Analysis Report">
            <Printer size={14} /> Print Report
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
          <Package size={14} /> 📦 Item-Wise Shortage & Capacity
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
      {/* TAB 1: ITEM-WISE SHORTAGE & CAPACITY PLANNING             */}
      {/* ========================================================= */}
      {activeTab === 'ITEM_WISE_SHORTAGE' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1, minHeight: 0 }}>
          
          {/* Search & Add Item Bar */}
          <div className="card" style={{ padding: '0.875rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.65rem', flexShrink: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
              
              {/* Item Search & Add Input */}
              <div style={{ position: 'relative', width: '380px', maxWidth: '100%' }}>
                <Search size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="Search item code or name to add..."
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
                            setItemWiseSearch('');
                          }}
                        >
                          <div>
                            <strong style={{ fontFamily: 'monospace', color: 'var(--accent-primary)', marginRight: '0.5rem' }}>{it.itemCode}</strong>
                            <span>{it.name}</span>
                          </div>
                          <span className="badge badge-neutral" style={{ fontSize: '0.7rem' }}>{it.category}</span>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              {/* Quick Class Filters (Short Form Only) */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)' }}>Class:</span>
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
            </div>

            {/* Added Items Chips List */}
            {selectedItemIds.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', alignItems: 'center', paddingTop: '0.35rem', borderTop: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)' }}>Added Items ({selectedItemIds.length}):</span>
                {selectedItemIds.map(id => {
                  const it = items.find(i => i.id === id);
                  if (!it) return null;
                  return (
                    <span key={id} className="badge badge-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>
                      <strong style={{ fontFamily: 'monospace' }}>{it.itemCode}</strong> {it.name}
                      <button 
                        type="button" 
                        style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
                        onClick={() => setSelectedItemIds(selectedItemIds.filter(x => x !== id))}
                        title="Remove item"
                      >
                        <X size={12} />
                      </button>
                    </span>
                  );
                })}
                <button 
                  type="button" 
                  className="btn btn-outline" 
                  style={{ padding: '0.15rem 0.45rem', fontSize: '0.7rem', color: 'var(--danger)' }} 
                  onClick={() => setSelectedItemIds([])}
                >
                  Clear All
                </button>
              </div>
            )}
          </div>

          {/* Results: Item Breakdown with Suggested Max Buildable Quantity */}
          <div className="table-container" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem', padding: '0.75rem' }}>
            {plannedItemDetails.length === 0 ? (
              <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                <Package size={40} color="var(--accent-primary)" style={{ margin: '0 auto 0.75rem auto' }} />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Search and Add Items</h3>
                <p style={{ fontSize: '0.85rem', margin: '0.25rem 0 0 0' }}>
                  Use the search box above to add specific items or machines to analyze BOM component shortages and buildable capacity.
                </p>
              </div>
            ) : (
              plannedItemDetails
                .filter(plan => selectedClassFilters.length === 0 || selectedClassFilters.includes(plan.item.category))
                .map(plan => {
                  const targetQty = plan.targetQty;
                  const maxBuildable = plan.maxBuildable;
                  const canBuildTarget = maxBuildable >= targetQty;
                  const displayComponents = shortageFilterMode === 'SHORTAGE_ONLY'
                    ? plan.components.filter(c => c.isShortage)
                    : plan.components;

                  return (
                    <div 
                      key={plan.item.id}
                      className="card"
                      style={{ 
                        padding: '1rem', 
                        backgroundColor: 'var(--bg-card)', 
                        border: '1px solid var(--border-color)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.75rem'
                      }}
                    >
                      {/* Item Plan Header Banner */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', paddingBottom: '0.65rem', borderBottom: '1px solid var(--border-color)' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--accent-primary)', fontFamily: 'monospace' }}>
                              {plan.item.itemCode}
                            </span>
                            <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                              {plan.item.name}
                            </span>
                            <span className="badge badge-info" style={{ fontSize: '0.72rem' }}>
                              {plan.item.category}
                            </span>
                            {plan.matchingBOM && (
                              <span className="badge badge-secondary" style={{ fontSize: '0.72rem' }}>
                                BOM: {plan.matchingBOM.bomCode} (v{plan.matchingBOM.version})
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                            In-House Stock: <strong>{plan.item.inHouseStock} {plan.item.unit}</strong> &bull; Min Stock: <strong>{plan.item.minStockQty !== undefined ? plan.item.minStockQty : (plan.item.reorderLevel || 0)} {plan.item.unit}</strong>
                          </div>
                        </div>

                        {/* Quantity Adjuster & Suggested Max Buildable Quantity Display */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <label style={{ fontSize: '0.8rem', fontWeight: 700, margin: 0 }}>Planned Build Qty:</label>
                            <input 
                              type="number"
                              min="1"
                              style={{ width: '80px', padding: '0.3rem 0.5rem', fontWeight: 800, fontSize: '0.9rem' }}
                              className="input-field"
                              value={targetQty}
                              onChange={(e) => handleItemTargetQtyChange(plan.item.id, Number(e.target.value))}
                            />
                            <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{plan.item.unit}</span>
                          </div>

                          <div style={{ 
                            padding: '0.4rem 0.85rem', 
                            backgroundColor: canBuildTarget ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)', 
                            border: `1px solid ${canBuildTarget ? 'var(--success)' : 'var(--danger)'}`,
                            borderRadius: '0.5rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                          }}>
                            <Sparkles size={16} color={canBuildTarget ? 'var(--success)' : 'var(--danger)'} />
                            <div>
                              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                                Suggested Max Buildable
                              </div>
                              <div style={{ fontSize: '1.05rem', fontWeight: 900, color: canBuildTarget ? 'var(--success)' : 'var(--danger)' }}>
                                {maxBuildable} {plan.item.unit}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Bottleneck Warning */}
                      {plan.constrainingComponent && (
                        <div style={{ padding: '0.4rem 0.75rem', backgroundColor: 'rgba(245, 158, 11, 0.12)', border: '1px solid var(--warning)', borderRadius: '0.375rem', fontSize: '0.78rem', color: 'var(--warning)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <AlertTriangle size={14} />
                          <span>Constraining Bottleneck Component: <strong>{plan.constrainingComponent}</strong></span>
                        </div>
                      )}

                      {/* Child Components Shortage Breakdown Table */}
                      {displayComponents.length === 0 ? (
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '0.5rem' }}>
                          {shortageFilterMode === 'SHORTAGE_ONLY' 
                            ? 'No component shortages found for this planned quantity.' 
                            : 'No BOM sub-components defined for this item.'}
                        </div>
                      ) : (
                        <div className="table-container" style={{ maxHeight: '280px', overflowY: 'auto' }}>
                          <table>
                            <thead>
                              <tr>
                                <th style={{ width: '30px' }}>#</th>
                                <th>Component Code</th>
                                <th>Component Name</th>
                                <th>Class</th>
                                <th>Source / Process</th>
                                <th style={{ textAlign: 'right' }}>Qty / Item</th>
                                <th style={{ textAlign: 'right' }}>Total Req</th>
                                <th style={{ textAlign: 'right' }}>In-House Stock</th>
                                <th style={{ textAlign: 'right' }}>Min Stock Qty</th>
                                <th style={{ textAlign: 'right' }}>Net Shortage</th>
                              </tr>
                            </thead>
                            <tbody>
                              {displayComponents.map((comp, cIdx) => {
                                const isLineShortage = comp.netShortage > 0;
                                return (
                                  <tr key={cIdx} style={{ backgroundColor: isLineShortage ? 'rgba(239, 68, 68, 0.06)' : 'transparent' }}>
                                    <td>{cIdx + 1}</td>
                                    <td style={{ fontWeight: 700, color: 'var(--accent-primary)', fontFamily: 'monospace' }}>
                                      {comp.itemCode}
                                    </td>
                                    <td style={{ fontWeight: 600 }}>{comp.itemName}</td>
                                    <td><span className="badge badge-neutral" style={{ fontSize: '0.72rem' }}>{comp.category}</span></td>
                                    <td>
                                      <span className={`badge ${comp.processType === 'Bought out' || comp.processType === 'Job work + Bought out' ? 'badge-primary' : comp.processType === 'In-house' ? 'badge-success' : comp.processType === 'Job work' ? 'badge-purple' : 'badge-neutral'}`} style={{ fontSize: '0.72rem' }}>
                                        {comp.processType}
                                      </span>
                                    </td>
                                    <td style={{ textAlign: 'right', fontWeight: 600 }}>{comp.qtyPerItem}</td>
                                    <td style={{ textAlign: 'right', fontWeight: 700 }}>{comp.totalRequired} {comp.unit}</td>
                                    <td style={{ textAlign: 'right', fontWeight: 600 }}>{comp.inHouseStock} {comp.unit}</td>
                                    <td style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>{comp.minStockQty} {comp.unit}</td>
                                    <td style={{ textAlign: 'right', fontWeight: 800, color: isLineShortage ? 'var(--danger)' : 'var(--success)' }}>
                                      {isLineShortage ? `${comp.netShortage} ${comp.unit}` : 'OK (0)'}
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
                  const qty = wo.targetQuantity || wo.quantity || 1;

                  return (
                    <button
                      key={wo.id}
                      type="button"
                      className={`badge ${isIndividuallySelected ? 'badge-primary' : (selectedWOIds.length === 0 ? 'badge-info' : 'badge-neutral')}`}
                      style={{ 
                        cursor: 'pointer', 
                        border: isIndividuallySelected ? '1px solid var(--accent-primary)' : '1px solid var(--border-color)',
                        padding: '0.25rem 0.5rem',
                        fontSize: '0.75rem',
                        opacity: isSelected ? 1 : 0.45
                      }}
                      onClick={() => {
                        if (selectedWOIds.length === 0) {
                          setSelectedWOIds([wo.id]);
                        } else if (selectedWOIds.includes(wo.id)) {
                          const next = selectedWOIds.filter(id => id !== wo.id);
                          setSelectedWOIds(next);
                        } else {
                          setSelectedWOIds([...selectedWOIds, wo.id]);
                        }
                      }}
                    >
                      <input 
                        type="checkbox" 
                        checked={isSelected} 
                        readOnly 
                        style={{ marginRight: '0.35rem', pointerEvents: 'none' }} 
                      />
                      {wo.workOrderNo || wo.woNumber} ({wo.machineModel}) - Qty: {qty}
                    </button>
                  );
                })}
            </div>
          </div>

          {/* Search Bar for Shortage Items Table */}
          <div style={{ position: 'relative', width: '100%' }}>
            <Search size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search component code, item description, part code... in table"
              className="input-field"
              style={{ paddingLeft: '2.25rem', fontSize: '0.82rem' }}
              value={tableSearchTerm}
              onChange={(e) => setTableSearchTerm(e.target.value)}
            />
          </div>

          {/* Consolidated Combined Shortage Table (Matches PO Shortage Table) */}
          {(() => {
            const rawList = activeTabConsolidatedShortages;
            const term = tableSearchTerm.trim().toLowerCase();
            const displayRows = rawList.filter(comp => 
              !term || 
              comp.itemCode.toLowerCase().includes(term) || 
              comp.itemName.toLowerCase().includes(term) || 
              ((comp.itemObj?.partCode || '').toLowerCase().includes(term))
            );

            return (
              <div className="table-container" style={{ flex: 1, overflowY: 'auto', padding: '0.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {displayRows.length === 0 ? (
                  <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <CheckCircle size={40} color="var(--success)" style={{ margin: '0 auto 0.75rem auto' }} />
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                      {isExplodeAllBOMs ? 'No Components Found' : 'No Shortage Found!'}
                    </h3>
                    <p style={{ fontSize: '0.85rem', margin: '0.25rem 0 0 0' }}>
                      {isExplodeAllBOMs ? 'No component records match the current filter.' : `Current store inventory is sufficient for all ${relevantWOs.length} selected Work Order build requirements.`}
                    </p>
                  </div>
                ) : (
                  <div className="card" style={{ padding: '0.875rem', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                      <div>
                        <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <AlertTriangle size={16} color={isExplodeAllBOMs ? 'var(--accent-primary)' : 'var(--danger)'} />
                          {isExplodeAllBOMs 
                            ? `💥 Complete Exploded BOM Components List (${relevantWOs.length} Selected Work Orders - ${displayRows.length} Items)`
                            : `Combined Consolidated Shortage (${relevantWOs.length} Selected Work Orders - ${displayRows.length} Shortage Items)`}
                        </h3>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                          {isExplodeAllBOMs 
                            ? 'Complete list of all parts and components required to build selected Work Orders.' 
                            : 'Total combined requirements calculated from actual Work Order demand.'}
                        </div>
                      </div>
                      <span className={`badge ${isExplodeAllBOMs ? 'badge-primary' : 'badge-warning'}`} style={{ fontSize: '0.75rem' }}>
                        {displayRows.length} {isExplodeAllBOMs ? 'Total Component(s)' : 'Shortage Item(s)'}
                      </span>
                    </div>

                    <div className="table-container" style={{ maxHeight: '520px', overflowY: 'auto' }}>
                      <table>
                        <thead>
                          <tr>
                            <th style={{ width: '45px', textAlign: 'center' }}>Sr No</th>
                            <th>Item Code</th>
                            <th>Item Description</th>
                            <th>Part Code</th>
                            <th style={{ textAlign: 'right' }}>Required Qty</th>
                            <th style={{ textAlign: 'right' }}>Current Stock</th>
                            <th style={{ textAlign: 'right' }}>Min Stock Qty</th>
                            <th style={{ textAlign: 'right' }}>MOQ</th>
                            <th style={{ textAlign: 'right' }}>In PO</th>
                            <th style={{ textAlign: 'right' }}>Shortage</th>
                          </tr>
                        </thead>
                        <tbody>
                          {displayRows.map((comp, idx) => {
                            const inPOQty = getOpenPOQuantity(comp.itemObj, comp.itemCode);
                            const moq = comp.itemObj?.minOrderQty || 1;
                            const partCode = comp.itemObj?.partCode || comp.itemCode;

                            return (
                              <tr key={idx} style={{ backgroundColor: comp.netShortage > 0 ? 'rgba(239, 68, 68, 0.04)' : 'transparent' }}>
                                <td style={{ textAlign: 'center', fontWeight: 600 }}>{idx + 1}</td>
                                <td>
                                  <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--accent-primary)' }}>
                                    {comp.itemCode}
                                  </span>
                                </td>
                                <td>
                                  <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{comp.itemName}</div>
                                </td>
                                <td>
                                  <span style={{ fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                                    {partCode}
                                  </span>
                                </td>
                                <td style={{ textAlign: 'right', fontWeight: 600 }}>
                                  {comp.totalRequired} {comp.unit}
                                </td>
                                <td style={{ textAlign: 'right', color: comp.inHouseStock <= 0 ? 'var(--danger)' : 'var(--text-primary)' }}>
                                  {comp.inHouseStock} {comp.unit}
                                </td>
                                <td style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>
                                  {comp.minStockQty} {comp.unit}
                                </td>
                                <td style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>
                                  {moq} {comp.unit}
                                </td>
                                <td style={{ textAlign: 'right', color: inPOQty > 0 ? 'var(--accent-primary)' : 'var(--text-muted)', fontWeight: inPOQty > 0 ? 700 : 400 }}>
                                  {inPOQty} {comp.unit}
                                </td>
                                <td style={{ textAlign: 'right' }}>
                                  {comp.netShortage > 0 ? (
                                    <span className="badge badge-danger" style={{ fontWeight: 800, fontSize: '0.8rem', padding: '0.2rem 0.5rem' }}>
                                      {comp.netShortage} {comp.unit}
                                    </span>
                                  ) : (
                                    <span className="badge badge-success" style={{ fontWeight: 700, fontSize: '0.75rem', padding: '0.15rem 0.4rem' }}>
                                      OK (0)
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* Dual Source Resolution & Split Modal */}
      {dualModalData && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div className="card" style={{ maxWidth: '560px', width: '100%', padding: '1.5rem', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-lg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Split size={18} color="var(--accent-primary)" />
                  Dual Source Resolution: {dualModalData.item.itemCode}
                </h3>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Total Net Shortage: <strong>{dualModalData.netShortage} {dualModalData.item.unit}</strong> | Item MOQ: <strong>{dualModalData.item.minOrderQty || 1} {dualModalData.item.unit}</strong>
                </span>
              </div>
              <button type="button" className="btn btn-outline" style={{ padding: '0.2rem 0.45rem' }} onClick={() => setDualModalData(null)}>
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleConfirmDualModal} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontWeight: 700, marginBottom: '0.4rem' }}>Select Procurement / Sourcing Strategy:</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 0.8rem', backgroundColor: dualModalData.processTypeChoice === 'PO_ONLY' ? 'var(--accent-light)' : 'var(--bg-tertiary)', borderRadius: '0.375rem', cursor: 'pointer', border: '1px solid var(--border-color)' }}>
                    <input 
                      type="radio" 
                      name="dualChoice" 
                      checked={dualModalData.processTypeChoice === 'PO_ONLY'} 
                      onChange={() => setDualModalData({ ...dualModalData, processTypeChoice: 'PO_ONLY' })} 
                    />
                    <div>
                      <strong style={{ fontSize: '0.85rem' }}>Procure 100% via Purchase Order (PO)</strong>
                      <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)' }}>Order {dualModalData.netShortage} {dualModalData.item.unit} from vendor for direct store supply</span>
                    </div>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 0.8rem', backgroundColor: dualModalData.processTypeChoice === 'JW_ONLY' ? 'var(--accent-light)' : 'var(--bg-tertiary)', borderRadius: '0.375rem', cursor: 'pointer', border: '1px solid var(--border-color)' }}>
                    <input 
                      type="radio" 
                      name="dualChoice" 
                      checked={dualModalData.processTypeChoice === 'JW_ONLY'} 
                      onChange={() => setDualModalData({ ...dualModalData, processTypeChoice: 'JW_ONLY' })} 
                    />
                    <div>
                      <strong style={{ fontSize: '0.85rem' }}>Outsource 100% via Job Work Challan</strong>
                      <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)' }}>Send {dualModalData.netShortage} {dualModalData.item.unit} to external partner for processing</span>
                    </div>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 0.8rem', backgroundColor: dualModalData.processTypeChoice === 'SPLIT' ? 'var(--accent-light)' : 'var(--bg-tertiary)', borderRadius: '0.375rem', cursor: 'pointer', border: '1px solid var(--border-color)' }}>
                    <input 
                      type="radio" 
                      name="dualChoice" 
                      checked={dualModalData.processTypeChoice === 'SPLIT'} 
                      onChange={() => setDualModalData({ ...dualModalData, processTypeChoice: 'SPLIT' })} 
                    />
                    <div>
                      <strong style={{ fontSize: '0.85rem' }}>Split between PO & Job Work (Subject to MOQ)</strong>
                      <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)' }}>Both split portions must meet or exceed MOQ ({dualModalData.item.minOrderQty || 1})</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Split Quantity Inputs */}
              {dualModalData.processTypeChoice === 'SPLIT' && (
                <div style={{ padding: '0.875rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: '0.5rem', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
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

      {/* Feature-Wise Modular Print Manager Modal */}
      <PrintManagerModal
        isOpen={printModalOpen}
        onClose={() => setPrintModalOpen(false)}
        title={activeTab === 'ITEM_WISE_SHORTAGE' ? 'Print Item-Wise Capacity & Shortage Report' : 'Print Manufacturing Shortage Report'}
        documentRefNumber="SHORTAGE-REPORT"
      >
        {activeTab === 'ITEM_WISE_SHORTAGE' ? (
          <ItemWiseShortagePrintView
            selectedItemsData={plannedItemDetails.map(plan => ({
              itemId: plan.item.id,
              itemCode: plan.item.itemCode,
              itemName: plan.item.name,
              category: plan.item.category,
              targetQuantity: plan.targetQty,
              maxBuildableQty: plan.maxBuildable,
              constrainingComponent: plan.constrainingComponent,
              components: plan.components.map(c => ({
                itemCode: c.itemCode,
                itemName: c.itemName,
                category: c.category,
                processType: c.processType,
                qtyPerItem: c.qtyPerItem,
                totalRequired: c.totalRequired,
                inHouseStock: c.inHouseStock,
                netShortage: c.netShortage,
                unit: c.unit
              }))
            }))}
            filterLabel="Selected Items Shortage & Max Buildable Planning"
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
              inPO: purchaseOrders.filter(po => po.status !== 'GOODS_RECEIVED' && po.status !== 'CANCELLED').reduce((sum, po) => {
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

    </div>
  );
};
