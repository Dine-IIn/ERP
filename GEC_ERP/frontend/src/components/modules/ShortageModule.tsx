import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import { PrintManagerModal } from '../printTemplates/PrintManagerModal';
import { 
  ItemWiseShortagePrintView, WOShortagePrintView, POShortagePrintView 
} from '../printTemplates/ShortagePrintTemplates';
import { openLiveModuleSheet } from '../../utils/sheetFolderManager';
import { 
  AlertTriangle, Filter, Printer, ChevronRight, ChevronDown, 
  Layers, Package, Truck, ClipboardList, ShoppingCart, Search, RefreshCw, CheckCircle, Split, ArrowUpDown, ArrowUp, ArrowDown, X, Plus, Sparkles, CheckSquare, Square 
} from 'lucide-react';
import { WorkOrder, BOM, Item, PurchaseOrder, JobworkChallan, JobCard, FIXED_ITEM_CLASSES } from '../../types/erp';

export const ShortageModule: React.FC = () => {
  const { 
    workOrders, boms, items, jobworks, jobCards, purchaseOrders, vendors,
    addPurchaseOrder, addJobworkChallan, addJobCard, setActiveModule 
  } = useERP();

  // Top Tabs
  const [activeTab, setActiveTab] = useState<'ITEM_WISE_SHORTAGE' | 'WO_SHORTAGE' | 'PO_SHORTAGE' | 'JOBWORK_SHORTAGE' | 'JOBCARD_SHORTAGE'>('ITEM_WISE_SHORTAGE');

  // Selected WOs Filter
  const [selectedWOIds, setSelectedWOIds] = useState<string[]>([]);
  
  // Expanded Tree Node Keys
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});

  // Simulation Quantities (key: woId -> simulated qty)
  const [simulatedQuantities, setSimulatedQuantities] = useState<Record<string, number>>({});

  // --- ITEM-WISE SHORTAGE STATE ---
  const [itemWiseSearch, setItemWiseSearch] = useState('');
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [showAllItemsToggle, setShowAllItemsToggle] = useState(false);
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
    return p.includes('brought out') || p.includes('bought out') || p.includes('brought_out') || cat === 'BO';
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
      const reorder = item.reorderLevel || item.minStockQty || 0;
      const netShortage = Math.max(0, targetQty - inHouse);
      return {
        item,
        matchingBOM: null,
        targetQty,
        maxBuildable: inHouse,
        constrainingComponent: inHouse < targetQty ? `${item.itemCode} (Direct Stock Shortage)` : undefined,
        components: [],
        hasShortage: netShortage > 0 || (inHouse <= reorder)
      };
    }

    let minBuildable = Infinity;
    let bottleneckComp = '';

    const compLines = matchingBOM.components.map(comp => {
      const childItem = items.find(i => i.id === comp.itemId || i.itemCode === comp.itemCode);
      const qtyPer = comp.qtyPerMachine || 1;
      const totalReq = qtyPer * targetQty;
      const inHouse = childItem ? childItem.inHouseStock : 0;
      const external = childItem ? childItem.externalStock : 0;
      const netShortage = Math.max(0, totalReq - inHouse);
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

  // Eligible items for Item-Wise search
  const allItemShortageMap = items.filter(i => !i.isBlocked).map(calculateItemShortageDetail);

  const eligibleItemWiseItems = allItemShortageMap.filter(detail => {
    // Class filter
    if (selectedClassFilters.length > 0 && !selectedClassFilters.includes(detail.item.category)) {
      return false;
    }

    // Shortage vs All Items filter
    if (!showAllItemsToggle && !detail.hasShortage) {
      return false;
    }

    // Search query
    if (itemWiseSearch) {
      const q = itemWiseSearch.toLowerCase();
      const matches = detail.item.itemCode.toLowerCase().includes(q) ||
        detail.item.name.toLowerCase().includes(q) ||
        (detail.item.category && detail.item.category.toLowerCase().includes(q));
      if (!matches) return false;
    }

    return true;
  });

  // Selected item plans
  const plannedItemDetails = selectedItemIds.length > 0
    ? items.filter(i => selectedItemIds.includes(i.id)).map(calculateItemShortageDetail)
    : eligibleItemWiseItems.slice(0, 5); // Default to first 5 items if none explicitly selected

  // -------------------------------------------------------------
  // WORK ORDER SHORTAGE TREE CALCULATIONS
  // -------------------------------------------------------------
  const relevantWOs = workOrders.filter(wo => {
    if (selectedWOIds.length > 0 && !selectedWOIds.includes(wo.id)) return false;
    return wo.status === 'IN_PROGRESS' || wo.status === 'PLANNED';
  });

  const getWOShortageData = (wo: WorkOrder) => {
    const linkedBOM = boms.find(b => b.machineModel === wo.machineModel || b.id === wo.bomId);
    const targetQty = simulatedQuantities[wo.id] !== undefined ? simulatedQuantities[wo.id] : (wo.quantity || 1);

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
      const netShortage = Math.max(0, totalReq - inHouse);
      const pSource = itemObj?.processType || 'In-house';

      return {
        ...comp,
        itemObj,
        totalRequired: totalReq,
        inHouseStock: inHouse,
        externalStock: external,
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
      return data.components.some(c => c.isShortage && (c.processType === 'Brought out' || c.processType === 'Job work + Brought out'));
    }
    if (activeTab === 'JOBWORK_SHORTAGE') {
      return data.components.some(c => c.isShortage && (c.processType === 'Job work' || c.processType === 'Job work + Brought out'));
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
    if (item.processType === 'Job work + Brought out') {
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
      poNumber: `PO-GEC-${Date.now().toString().slice(-4)}`,
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
    if (item.processType === 'Job work + Brought out') {
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
        poNumber: `PO-GEC-${Date.now().toString().slice(-4)}`,
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
          poNumber: `PO-GEC-${Date.now().toString().slice(-4)}`,
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

  const handleRefreshLiveSheet = () => {
    if (activeTab === 'ITEM_WISE_SHORTAGE') {
      const flatData: any[] = [];
      plannedItemDetails.forEach(plan => {
        if (plan.components.length === 0) {
          flatData.push({
            plannedItemCode: plan.item.itemCode,
            plannedItemName: plan.item.name,
            itemClass: plan.item.category,
            targetBuildQty: plan.targetQty,
            maxBuildableQty: plan.maxBuildable,
            bottleneckComponent: plan.constrainingComponent || 'None',
            childComponentCode: '-',
            childComponentName: '-',
            childClass: '-',
            sourceProcess: '-',
            qtyPerItem: '-',
            totalRequired: '-',
            inHouseStock: plan.item.inHouseStock,
            netShortage: Math.max(0, plan.targetQty - plan.item.inHouseStock)
          });
        } else {
          plan.components.forEach(comp => {
            flatData.push({
              plannedItemCode: plan.item.itemCode,
              plannedItemName: plan.item.name,
              itemClass: plan.item.category,
              targetBuildQty: plan.targetQty,
              maxBuildableQty: plan.maxBuildable,
              bottleneckComponent: plan.constrainingComponent || 'None',
              childComponentCode: comp.itemCode,
              childComponentName: comp.itemName,
              childClass: comp.category,
              sourceProcess: comp.processType,
              qtyPerItem: comp.qtyPerItem,
              totalRequired: `${comp.totalRequired} ${comp.unit}`,
              inHouseStock: `${comp.inHouseStock} ${comp.unit}`,
              netShortage: `${comp.netShortage} ${comp.unit}`
            });
          });
        }
      });

      const headers: { key: keyof typeof flatData[0]; label: string }[] = [
        { key: 'plannedItemCode', label: 'Parent Item Code' },
        { key: 'plannedItemName', label: 'Parent Item Name' },
        { key: 'itemClass', label: 'Class' },
        { key: 'targetBuildQty', label: 'Target Build Qty' },
        { key: 'maxBuildableQty', label: 'Max Buildable Qty' },
        { key: 'bottleneckComponent', label: 'Bottleneck Component' },
        { key: 'childComponentCode', label: 'Child Component Code' },
        { key: 'childComponentName', label: 'Child Component Name' },
        { key: 'childClass', label: 'Child Class' },
        { key: 'sourceProcess', label: 'Source' },
        { key: 'qtyPerItem', label: 'Qty / Item' },
        { key: 'totalRequired', label: 'Total Required' },
        { key: 'inHouseStock', label: 'In-House Stock' },
        { key: 'netShortage', label: 'Net Shortage' }
      ];

      openLiveModuleSheet('Shortage', 'GEC_ERP_Item_Wise_Shortage_Live', flatData, headers);
    } else {
      const flatData = filteredWOShortages.flatMap(woData => 
        woData.components.filter(c => c.netShortage > 0).map(c => ({
          workOrderNo: woData.wo.workOrderNo || woData.wo.woNumber,
          machineModel: woData.wo.machineModel,
          targetBuildQty: woData.targetQty,
          componentCode: c.itemCode,
          componentName: c.itemName,
          sourceProcess: c.processType,
          totalRequired: `${c.totalRequired} ${c.unit}`,
          inHouseStock: `${c.inHouseStock} ${c.unit}`,
          netShortage: `${c.netShortage} ${c.unit}`
        }))
      );

      const headers: { key: keyof typeof flatData[0]; label: string }[] = [
        { key: 'workOrderNo', label: 'Work Order No' },
        { key: 'machineModel', label: 'Machine Model' },
        { key: 'targetBuildQty', label: 'Target Qty' },
        { key: 'componentCode', label: 'Component Code' },
        { key: 'componentName', label: 'Component Name' },
        { key: 'sourceProcess', label: 'Source' },
        { key: 'totalRequired', label: 'Total Required' },
        { key: 'inHouseStock', label: 'In-House Stock' },
        { key: 'netShortage', label: 'Shortage' }
      ];

      openLiveModuleSheet('Shortage', 'GEC_ERP_Work_Order_Shortage_Live', flatData, headers);
    }
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
          <button type="button" className="btn btn-outline" onClick={handleRefreshLiveSheet} title="Sync and maintain live CSV sheet">
            <RefreshCw size={14} /> Live Sheet
          </button>
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
          
          {/* Controls Card: Search, Class Filters, All Items Toggle */}
          <div className="card" style={{ padding: '0.875rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.65rem', flexShrink: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
              
              {/* Search & All Items Checkbox */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', width: '320px', maxWidth: '100%' }}>
                  <Search size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    placeholder="Search item code, description, class..."
                    className="input-field"
                    style={{ paddingLeft: '2.2rem' }}
                    value={itemWiseSearch}
                    onChange={(e) => setItemWiseSearch(e.target.value)}
                  />
                </div>

                {/* Option to Choose Items Not in Shortage Also */}
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', margin: 0, fontSize: '0.82rem', fontWeight: 700 }}>
                  <input
                    type="checkbox"
                    checked={showAllItemsToggle}
                    onChange={(e) => setShowAllItemsToggle(e.target.checked)}
                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                  <span>Include All Catalog Items (Even without Shortage)</span>
                </label>
              </div>

              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                  onClick={() => setSelectedItemIds(eligibleItemWiseItems.map(d => d.item.id))}
                >
                  Select All Filtered ({eligibleItemWiseItems.length})
                </button>
                {selectedItemIds.length > 0 && (
                  <button
                    type="button"
                    className="btn btn-outline"
                    style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', color: 'var(--danger)' }}
                    onClick={() => setSelectedItemIds([])}
                  >
                    Clear Selection
                  </button>
                )}
              </div>
            </div>

            {/* Class-Wise Multi-Select Filter Chips */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)' }}>Filter Classes:</span>
              <button
                type="button"
                className={`badge ${selectedClassFilters.length === 0 ? 'badge-primary' : 'badge-neutral'}`}
                style={{ cursor: 'pointer', padding: '0.2rem 0.5rem', fontSize: '0.72rem' }}
                onClick={() => setSelectedClassFilters([])}
              >
                All Classes
              </button>
              {FIXED_ITEM_CLASSES.map(cls => {
                const isSelected = selectedClassFilters.includes(cls.code);
                return (
                  <button
                    key={cls.code}
                    type="button"
                    className={`badge ${isSelected ? 'badge-primary' : 'badge-neutral'}`}
                    style={{ cursor: 'pointer', padding: '0.2rem 0.5rem', fontSize: '0.72rem' }}
                    onClick={() => {
                      if (isSelected) {
                        setSelectedClassFilters(selectedClassFilters.filter(c => c !== cls.code));
                      } else {
                        setSelectedClassFilters([...selectedClassFilters, cls.code]);
                      }
                    }}
                  >
                    {cls.code} - {cls.name}
                  </button>
                );
              })}
            </div>

            {/* Item Selection Pills */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', maxHeight: '100px', overflowY: 'auto', padding: '0.4rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: '0.375rem', border: '1px solid var(--border-color)' }}>
              {eligibleItemWiseItems.length === 0 ? (
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  No items found matching the current search / class criteria. Check "Include All Catalog Items" to view items with sufficient stock.
                </span>
              ) : (
                eligibleItemWiseItems.map(d => {
                  const isChecked = selectedItemIds.includes(d.item.id);
                  return (
                    <button
                      key={d.item.id}
                      type="button"
                      className={`badge ${isChecked ? 'badge-primary' : 'badge-neutral'}`}
                      style={{ 
                        cursor: 'pointer', 
                        padding: '0.25rem 0.5rem', 
                        fontSize: '0.75rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem'
                      }}
                      onClick={() => {
                        if (isChecked) {
                          setSelectedItemIds(selectedItemIds.filter(id => id !== d.item.id));
                        } else {
                          setSelectedItemIds([...selectedItemIds, d.item.id]);
                        }
                      }}
                    >
                      {isChecked ? <CheckSquare size={12} /> : <Square size={12} />}
                      <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{d.item.itemCode}</span>
                      <span>{d.item.name}</span>
                      {d.hasShortage && (
                        <span style={{ color: 'var(--danger)', fontWeight: 800, marginLeft: '2px' }}>⚠️ Shortage</span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Results: Item Breakdown with Suggested Max Buildable Quantity */}
          <div className="table-container" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem', padding: '0.75rem' }}>
            {plannedItemDetails.length === 0 ? (
              <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                <CheckCircle size={40} color="var(--success)" style={{ margin: '0 auto 0.75rem auto' }} />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>No Items Selected</h3>
                <p style={{ fontSize: '0.85rem', margin: '0.25rem 0 0 0' }}>
                  Select one or more items above to compute child component requirements, net shortages, and maximum buildable capacity.
                </p>
              </div>
            ) : (
              plannedItemDetails.map(plan => {
                const targetQty = plan.targetQty;
                const maxBuildable = plan.maxBuildable;
                const canBuildTarget = maxBuildable >= targetQty;

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
                            Class: {plan.item.category}
                          </span>
                          {plan.matchingBOM && (
                            <span className="badge badge-secondary" style={{ fontSize: '0.72rem' }}>
                              BOM: {plan.matchingBOM.bomCode} (v{plan.matchingBOM.version})
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                          In-House Stock: <strong>{plan.item.inHouseStock} {plan.item.unit}</strong> &bull; Reorder Level: <strong>{plan.item.reorderLevel || 0} {plan.item.unit}</strong>
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
                    {plan.components.length === 0 ? (
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '0.5rem' }}>
                        No BOM sub-components defined for this item. Raw stock shortage: {Math.max(0, targetQty - plan.item.inHouseStock)} {plan.item.unit}.
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
                              <th style={{ textAlign: 'right' }}>Net Shortage</th>
                              <th style={{ textAlign: 'center' }}>Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {plan.components.map((comp, cIdx) => {
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
                                    <span className={`badge ${comp.processType === 'Brought out' ? 'badge-primary' : comp.processType === 'In-house' ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: '0.72rem' }}>
                                      {comp.processType}
                                    </span>
                                  </td>
                                  <td style={{ textAlign: 'right', fontWeight: 600 }}>{comp.qtyPerItem}</td>
                                  <td style={{ textAlign: 'right', fontWeight: 700 }}>{comp.totalRequired} {comp.unit}</td>
                                  <td style={{ textAlign: 'right', fontWeight: 600 }}>{comp.inHouseStock} {comp.unit}</td>
                                  <td style={{ textAlign: 'right', fontWeight: 800, color: isLineShortage ? 'var(--danger)' : 'var(--success)' }}>
                                    {isLineShortage ? `${comp.netShortage} ${comp.unit}` : 'OK (0)'}
                                  </td>
                                  <td style={{ textAlign: 'center' }}>
                                    {isLineShortage && comp.childItem && (
                                      <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'center' }}>
                                        {isBoughtOutItem(comp.childItem) && (
                                          <button
                                            type="button"
                                            className="btn btn-outline"
                                            style={{ padding: '0.15rem 0.4rem', fontSize: '0.7rem', color: 'var(--accent-primary)' }}
                                            title="Create Purchase Order"
                                            onClick={() => handleRaisePO(comp.childItem!, comp.netShortage)}
                                          >
                                            <ShoppingCart size={11} /> +PO
                                          </button>
                                        )}
                                        {comp.processType === 'Job work' && (
                                          <button
                                            type="button"
                                            className="btn btn-outline"
                                            style={{ padding: '0.15rem 0.4rem', fontSize: '0.7rem', color: 'var(--warning)' }}
                                            title="Issue Job Work Challan"
                                            onClick={() => handleIssueJobwork(comp.childItem!, comp.netShortage)}
                                          >
                                            <Truck size={11} /> +Jobwork
                                          </button>
                                        )}
                                        {comp.processType === 'In-house' && (
                                          <button
                                            type="button"
                                            className="btn btn-outline"
                                            style={{ padding: '0.15rem 0.4rem', fontSize: '0.7rem', color: 'var(--success)' }}
                                            title="Create In-house Job Card"
                                            onClick={() => handleIssueJobCard(comp.childItem!, comp.netShortage)}
                                          >
                                            <ClipboardList size={11} /> +JobCard
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
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2-5: WORK ORDER SHORTAGE TREES & ROUTING              */}
      {/* ========================================================= */}
      {activeTab !== 'ITEM_WISE_SHORTAGE' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1, minHeight: 0 }}>
          
          {/* WO Filter Bar */}
          <div className="card" style={{ padding: '0.75rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', flexShrink: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, margin: 0 }}>Filter Work Orders:</label>
                <button 
                  type="button"
                  className={`btn ${selectedWOIds.length === 0 ? 'btn-primary' : 'btn-outline'}`}
                  style={{ padding: '0.25rem 0.65rem', fontSize: '0.78rem' }}
                  onClick={() => setSelectedWOIds([])}
                >
                  All Active Work Orders ({workOrders.length})
                </button>
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Showing <strong>{filteredWOShortages.length}</strong> Work Order build(s) with active shortages
              </div>
            </div>

            {/* Multi-Select Work Order Badges */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', maxHeight: '90px', overflowY: 'auto', padding: '0.4rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: '0.375rem', border: '1px solid var(--border-color)' }}>
              {workOrders.map(wo => {
                const isSelected = selectedWOIds.length === 0 || selectedWOIds.includes(wo.id);
                const isIndividuallySelected = selectedWOIds.includes(wo.id);

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
                    {wo.workOrderNo || wo.woNumber} - {wo.machineModel}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Shortage Tree Display */}
          <div className="table-container" style={{ flex: 1, overflowY: 'auto', padding: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {filteredWOShortages.length === 0 ? (
              <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                <CheckCircle size={40} color="var(--success)" style={{ margin: '0 auto 0.75rem auto' }} />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>No Shortage Found!</h3>
                <p style={{ fontSize: '0.85rem', margin: '0.25rem 0 0 0' }}>
                  Current store inventory is sufficient for selected build requirements under this tab.
                </p>
              </div>
            ) : (
              filteredWOShortages.map(({ wo, targetQty, components }) => {
                const nodeKey = `wo-${wo.id}`;
                const isExpanded = expandedNodes[nodeKey] !== false; // Default expanded

                const shortageItems = components.filter(c => c.isShortage);

                return (
                  <div 
                    key={wo.id}
                    className="card"
                    style={{ 
                      padding: '0.875rem', 
                      backgroundColor: 'var(--bg-card)', 
                      border: '1px solid var(--border-color)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem'
                    }}
                  >
                    {/* WO Header Bar */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }} onClick={() => toggleNode(nodeKey)}>
                        {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        <span style={{ fontWeight: 800, color: 'var(--accent-primary)', fontFamily: 'monospace' }}>
                          {wo.workOrderNo || wo.woNumber}
                        </span>
                        <span style={{ fontWeight: 700 }}>{wo.machineModel}</span>
                        <span className="badge badge-warning" style={{ fontSize: '0.75rem' }}>
                          {shortageItems.length} Shortage Component(s)
                        </span>
                      </div>

                      {/* Interactive Simulation Input */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Simulate Qty:</label>
                        <input 
                          type="number" 
                          min="1"
                          style={{ width: '70px', padding: '0.2rem 0.4rem', fontSize: '0.85rem', fontWeight: 700 }}
                          className="input-field"
                          value={targetQty}
                          onChange={(e) => handleSimulatedQtyChange(wo.id, Number(e.target.value))}
                        />
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Units</span>
                      </div>
                    </div>

                    {/* Shortage Components Table */}
                    {isExpanded && (
                      <div className="table-container" style={{ marginTop: '0.35rem' }}>
                        <table>
                          <thead>
                            <tr>
                              <th>Component Code</th>
                              <th>Component Name</th>
                              <th>Process Type</th>
                              <th>Qty / Machine</th>
                              <th>Total Req</th>
                              <th>In-House Stock</th>
                              <th>External Stock</th>
                              <th>Net Shortage</th>
                              <th>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {shortageItems.map((comp, idx) => (
                              <tr key={idx}>
                                <td style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--accent-primary)' }}>
                                  {comp.itemCode}
                                </td>
                                <td style={{ fontWeight: 600 }}>{comp.itemName}</td>
                                <td>
                                  <span className={`badge ${
                                    comp.processType === 'Brought out' ? 'badge-primary' :
                                    comp.processType === 'In-house' ? 'badge-success' :
                                    comp.processType === 'Job work' ? 'badge-warning' : 'badge-secondary'
                                  }`}>
                                    {comp.processType}
                                  </span>
                                </td>
                                <td>{comp.qtyPerMachine}</td>
                                <td style={{ fontWeight: 700 }}>{comp.totalRequired} {comp.unit}</td>
                                <td>{comp.inHouseStock} {comp.unit}</td>
                                <td style={{ color: 'var(--text-secondary)' }}>{comp.externalStock} {comp.unit}</td>
                                <td style={{ fontWeight: 800, color: 'var(--danger)' }}>
                                  {comp.netShortage} {comp.unit}
                                </td>
                                <td>
                                  <div style={{ display: 'flex', gap: '0.35rem' }}>
                                    {(comp.processType === 'Brought out' || comp.processType === 'Job work + Brought out') && comp.itemObj && (
                                      <button 
                                        className="btn btn-outline" 
                                        style={{ padding: '0.2rem 0.5rem', fontSize: '0.72rem', color: 'var(--accent-primary)' }}
                                        onClick={() => handleRaisePO(comp.itemObj!, comp.netShortage, wo)}
                                      >
                                        <ShoppingCart size={12} /> Raise PO
                                      </button>
                                    )}
                                    {(comp.processType === 'Job work' || comp.processType === 'Job work + Brought out') && comp.itemObj && (
                                      <button 
                                        className="btn btn-outline" 
                                        style={{ padding: '0.2rem 0.5rem', fontSize: '0.72rem', color: 'var(--warning)' }}
                                        onClick={() => handleIssueJobwork(comp.itemObj!, comp.netShortage, wo)}
                                      >
                                        <Truck size={12} /> Issue Job Work
                                      </button>
                                    )}
                                    {comp.processType === 'In-house' && comp.itemObj && (
                                      <button 
                                        className="btn btn-outline" 
                                        style={{ padding: '0.2rem 0.5rem', fontSize: '0.72rem', color: 'var(--success)' }}
                                        onClick={() => handleIssueJobCard(comp.itemObj!, comp.netShortage, wo)}
                                      >
                                        <ClipboardList size={12} /> Create Job Card
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))}
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
        ) : activeTab === 'PO_SHORTAGE' ? (
          <POShortagePrintView
            items={poShortageItems}
            filterLabel="Bought-Out Purchase Order Shortages"
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
