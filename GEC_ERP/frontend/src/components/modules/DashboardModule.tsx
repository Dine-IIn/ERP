import React, { useState, useMemo } from 'react';
import { useERP } from '../../context/ERPContext';
import { StatCard } from '../common/StatCard';
import { Modal } from '../common/Modal';
import { 
  Warehouse, Truck, Wrench, ShoppingCart, 
  AlertTriangle, ArrowRight, ShieldCheck, Cpu,
  Clock, Calendar, CheckCircle2, AlertCircle, Plus, Search, Filter, Layers, Package, PhoneCall, Check, ExternalLink, CalendarClock, User
} from 'lucide-react';
import { 
  Item, PurchaseOrder, JobworkChallan, JobCard, WorkOrder, 
  POLineItem, generateNextPONumber, generateNextJobworkNumber, generateNextJobCardNumber 
} from '../../types/erp';

export const DashboardModule: React.FC = () => {
  const { 
    items, jobworks, purchaseOrders, workOrders, boms, jobCards,
    vendors, qcInspections, setActiveModule,
    addPurchaseOrder, updatePurchaseOrder,
    addJobworkChallan, updateJobworkChallan,
    addJobCard, updateJobCard
  } = useERP();

  const totalInHouseItems = items.length;
  const lowStockItems = items.filter(i => i.inHouseStock <= (i.reorderLevel || 0));
  const activeJobworks = jobworks.filter(j => j.status !== 'COMPLETED');
  const totalPendingJobworkQty = activeJobworks.reduce((sum, j) => sum + j.pendingBalance, 0);
  const activeWOs = workOrders.filter(w => w.status === 'IN_PROGRESS' || w.status === 'PLANNED');
  const pendingPOs = purchaseOrders.filter(p => p.status === 'ISSUED' || p.status === 'PARTIALLY_RECEIVED' || p.status === 'WAITING_FOR_APPROVAL' || p.status === 'APPROVED');
  const activeJobCards = jobCards.filter(j => j.status !== 'COMPLETED' && j.status !== 'CANCELLED' && !j.isDeleted);

  // Filter & Search states for JIT Staggered Reminders
  const [jitStatusFilter, setJitStatusFilter] = useState<'DUE_ONLY' | 'UPCOMING' | 'ALL'>('DUE_ONLY');
  const [jitTypeFilter, setJitTypeFilter] = useState<'ALL' | 'PO' | 'JW' | 'JC'>('ALL');
  const [jitSearch, setJitSearch] = useState('');

  // Filter & Search states for Check-Back Reminders
  const [checkBackTypeFilter, setCheckBackTypeFilter] = useState<'ALL' | 'PO' | 'JW' | 'JC'>('ALL');
  const [checkBackSearch, setCheckBackSearch] = useState('');

  // Modal states for Quick Drafts
  const [draftPOModalOpen, setDraftPOModalOpen] = useState(false);
  const [selectedPOItem, setSelectedPOItem] = useState<{
    item: Item;
    woNumber: string;
    woId: string;
    targetQty: number;
    minShortage: number;
    shortage: number;
  } | null>(null);
  const [draftPOVendorId, setDraftPOVendorId] = useState('');
  const [draftPOQty, setDraftPOQty] = useState(1);
  const [draftPOUnitPrice, setDraftPOUnitPrice] = useState(0);
  const [draftPONotes, setDraftPONotes] = useState('');

  const [draftJWModalOpen, setDraftJWModalOpen] = useState(false);
  const [selectedJWItem, setSelectedJWItem] = useState<{
    item: Item;
    woNumber: string;
    woId: string;
    targetQty: number;
    minShortage: number;
    shortage: number;
  } | null>(null);
  const [draftJWVendorId, setDraftJWVendorId] = useState('');
  const [draftJWQty, setDraftJWQty] = useState(1);
  const [draftJWProcess, setDraftJWProcess] = useState('');
  const [draftJWNotes, setDraftJWNotes] = useState('');

  const [draftJCModalOpen, setDraftJCModalOpen] = useState(false);
  const [selectedJCItem, setSelectedJCItem] = useState<{
    item: Item;
    woNumber: string;
    woId: string;
    targetQty: number;
    minShortage: number;
    shortage: number;
  } | null>(null);
  const [draftJCQty, setDraftJCQty] = useState(1);
  const [draftJCOperator, setDraftJCOperator] = useState('Suresh Patel');
  const [draftJCTargetDate, setDraftJCTargetDate] = useState('');
  const [draftJCNotes, setDraftJCNotes] = useState('');

  // Promised Date Modal State for Check-Back Reminders
  const [promisedDateModalOpen, setPromisedDateModalOpen] = useState(false);
  const [activeCheckBackRecord, setActiveCheckBackRecord] = useState<{
    type: 'PO' | 'JW' | 'JC';
    id: string;
    refNo: string;
    partyName: string;
    itemName: string;
    pendingQty: number;
    unit: string;
    currentPromisedDate: string;
    notes: string;
  } | null>(null);
  const [newPromisedDate, setNewPromisedDate] = useState('');
  const [checkBackNote, setCheckBackNote] = useState('');

  // JIT Staggered Reminders for PO, Job Work, and Job Card
  const jitReminders = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const activeWorkOrders = workOrders.filter(w => 
      w.status !== 'COMPLETED' && w.status !== 'CANCELLED' && !(w as any).isDeleted
    );

    const results: Array<{
      id: string;
      orderType: 'PO' | 'JW' | 'JC';
      typeLabel: string;
      woId: string;
      woNumber: string;
      machineModel: string;
      woQuantity: number;
      woStartDateStr: string;
      item: Item;
      itemId: string;
      itemCode: string;
      partCode?: string;
      itemName: string;
      category: string;
      unit: string;
      leadTimeDays: number;
      maxLeadTimeInWO: number;
      offsetDays: number;
      scheduledDate: Date;
      scheduledDateStr: string;
      diffDays: number;
      status: 'OVERDUE' | 'DUE_TODAY' | 'UPCOMING';
      totalRequired: number;
      inHouseStock: number;
      openSupply: number;
      shortage: number;
      minStock: number;
      minShortage: number;
    }> = [];

    activeWorkOrders.forEach(wo => {
      const woTargetQty = wo.targetQuantity || wo.quantity || 1;
      const woNo = wo.workOrderNo || (wo as any).woNumber || wo.id;
      const woDateStr = wo.startDate || wo.orderDate || (wo as any).createdAt || new Date().toISOString().split('T')[0];
      let woStartDate = new Date(woDateStr);
      if (isNaN(woStartDate.getTime())) woStartDate = new Date();

      const compList: Array<{ itemId?: string; itemCode?: string; totalRequired: number }> = [];

      if (wo.woComponents && wo.woComponents.length > 0) {
        wo.woComponents.forEach(c => {
          const totReq = c.qtyRequired !== undefined 
            ? Number(c.qtyRequired) 
            : (Number(c.qtyPerMachine) || 1) * woTargetQty;
          compList.push({
            itemId: c.itemId,
            itemCode: c.itemCode,
            totalRequired: totReq
          });
        });
      } else {
        const bom = boms.find(b => b.id === wo.bomId || b.machineModel === wo.machineModel);
        if (bom && bom.components) {
          const explode = (comps: typeof bom.components, mult: number, visited = new Set<string>()) => {
            comps.forEach(c => {
              const req = (Number(c.qtyPerMachine) || 1) * mult;
              compList.push({ itemId: c.itemId, itemCode: c.itemCode, totalRequired: req });
              const subBOM = boms.find(b => 
                (c.itemId && b.id === c.itemId) || 
                (c.itemCode && (b.bomCode?.toLowerCase() === c.itemCode.toLowerCase() || b.machineModel?.toLowerCase() === c.itemCode.toLowerCase()))
              );
              if (subBOM && subBOM.components && subBOM.components.length > 0 && !visited.has(subBOM.id)) {
                const nextVis = new Set(visited);
                nextVis.add(subBOM.id);
                explode(subBOM.components, req, nextVis);
              }
            });
          };
          explode(bom.components, woTargetQty, new Set([bom.id]));
        }
      }

      if (compList.length === 0) return;

      const aggregatedMap = new Map<string, { 
        item: Item; 
        totalRequired: number; 
        leadTime: number; 
        orderType: 'PO' | 'JW' | 'JC';
        typeLabel: string;
      }>();

      compList.forEach(c => {
        const it = items.find(i => (c.itemId && i.id === c.itemId) || (c.itemCode && i.itemCode === c.itemCode));
        if (!it) return;
        const key = it.id || it.itemCode;
        const leadTime = it.leadTimeDays !== undefined ? it.leadTimeDays : 10;
        const pType = (it.processType || (it as any).materialProcessType || '').toLowerCase();
        const cat = (it.category || '').toUpperCase();
        const sources = (it.materialProcessSources || []).map(s => s.toLowerCase());

        let orderType: 'PO' | 'JW' | 'JC' = 'PO';
        let typeLabel = 'PO (Bought-Out)';

        if (pType.includes('job work') || sources.includes('job work') || sources.includes('jobwork')) {
          orderType = 'JW';
          typeLabel = 'JW (Job Work)';
        } else if (pType.includes('in-house') || sources.includes('in-house') || cat === 'AS' || cat === 'MF' || cat === 'FAS') {
          orderType = 'JC';
          typeLabel = 'JC (Job Card)';
        } else {
          orderType = 'PO';
          typeLabel = 'PO (Bought-Out)';
        }

        if (!aggregatedMap.has(key)) {
          aggregatedMap.set(key, { item: it, totalRequired: c.totalRequired, leadTime, orderType, typeLabel });
        } else {
          aggregatedMap.get(key)!.totalRequired += c.totalRequired;
        }
      });

      const resolvedList = Array.from(aggregatedMap.values());
      if (resolvedList.length === 0) return;

      const maxLeadTimeInWO = resolvedList.reduce((max, r) => Math.max(max, r.leadTime), 10);

      resolvedList.forEach(r => {
        const it = r.item;
        const totalRequired = r.totalRequired;
        const minStock = it.minStockQty || it.reorderLevel || 0;

        let openSupply = 0;
        if (r.orderType === 'PO') {
          openSupply = purchaseOrders
            .filter(po => po.status !== 'GOODS_RECEIVED' && po.status !== 'CANCELLED' && po.status !== 'REJECTED' && !(po as any).isDeleted)
            .reduce((sum, po) => {
              const line = po.items.find(pi => (pi.itemId && pi.itemId === it.id) || (pi.itemCode && pi.itemCode === it.itemCode));
              if (!line) return sum;
              const ord = line.quantity || line.orderedQty || 0;
              const rec = line.receivedQty || 0;
              return sum + Math.max(0, ord - rec);
            }, 0);
        } else if (r.orderType === 'JW') {
          openSupply = jobworks
            .filter(jw => jw.status !== 'COMPLETED' && (jw.itemId === it.id || jw.itemCode === it.itemCode))
            .reduce((sum, jw) => sum + (jw.pendingBalance || 0), 0);
        } else {
          openSupply = jobCards
            .filter(jc => jc.status !== 'COMPLETED' && jc.status !== 'CANCELLED' && !jc.isDeleted && (jc.itemId === it.id || jc.itemCode === it.itemCode))
            .reduce((sum, jc) => sum + Math.max(0, (jc.targetQuantity || 0) - (jc.completedQuantity || 0)), 0);
        }

        const currentStock = it.inHouseStock || 0;
        const shortage = Math.max(0, totalRequired - currentStock - openSupply);
        const minShortage = Math.max(0, (totalRequired + minStock) - currentStock - openSupply);

        const offsetDays = Math.max(0, maxLeadTimeInWO - r.leadTime);
        const scheduledDate = new Date(woStartDate.getTime() + offsetDays * 24 * 60 * 60 * 1000);
        scheduledDate.setHours(0, 0, 0, 0);

        const diffTime = today.getTime() - scheduledDate.getTime();
        const diffDays = Math.round(diffTime / (24 * 60 * 60 * 1000));

        let status: 'OVERDUE' | 'DUE_TODAY' | 'UPCOMING' = 'UPCOMING';
        if (diffDays > 0) status = 'OVERDUE';
        else if (diffDays === 0) status = 'DUE_TODAY';

        results.push({
          id: `${wo.id}_${it.id}_${r.orderType}`,
          orderType: r.orderType,
          typeLabel: r.typeLabel,
          woId: wo.id,
          woNumber: woNo,
          machineModel: wo.machineModel,
          woQuantity: woTargetQty,
          woStartDateStr: woDateStr,
          item: it,
          itemId: it.id,
          itemCode: it.itemCode,
          partCode: it.partCode,
          itemName: it.name,
          category: it.category,
          unit: it.unit || 'PCS',
          leadTimeDays: r.leadTime,
          maxLeadTimeInWO,
          offsetDays,
          scheduledDate,
          scheduledDateStr: scheduledDate.toISOString().split('T')[0],
          diffDays,
          status,
          totalRequired,
          inHouseStock: currentStock,
          openSupply,
          shortage,
          minStock,
          minShortage
        });
      });
    });

    return results;
  }, [workOrders, boms, items, purchaseOrders, jobworks, jobCards]);

  const dueJITList = useMemo(() => {
    return jitReminders.filter(r => (r.status === 'OVERDUE' || r.status === 'DUE_TODAY') && r.minShortage > 0);
  }, [jitReminders]);

  const filteredJITReminders = useMemo(() => {
    let list = jitReminders;

    if (jitTypeFilter !== 'ALL') {
      list = list.filter(r => r.orderType === jitTypeFilter);
    }

    if (jitStatusFilter === 'DUE_ONLY') {
      list = list.filter(r => (r.status === 'OVERDUE' || r.status === 'DUE_TODAY') && r.minShortage > 0);
    } else if (jitStatusFilter === 'UPCOMING') {
      list = list.filter(r => r.status === 'UPCOMING');
    }

    if (jitSearch.trim()) {
      const q = jitSearch.trim().toLowerCase();
      list = list.filter(r => 
        r.itemCode.toLowerCase().includes(q) ||
        (r.partCode && r.partCode.toLowerCase().includes(q)) ||
        r.itemName.toLowerCase().includes(q) ||
        r.woNumber.toLowerCase().includes(q) ||
        r.machineModel.toLowerCase().includes(q)
      );
    }

    return [...list].sort((a, b) => {
      if (b.diffDays !== a.diffDays) return b.diffDays - a.diffDays;
      if (b.leadTimeDays !== a.leadTimeDays) return b.leadTimeDays - a.leadTimeDays;
      return (a.itemCode || '').localeCompare(b.itemCode || '');
    });
  }, [jitReminders, jitStatusFilter, jitTypeFilter, jitSearch]);

  // Check-Back Reminders for Open POs, Job Works, and Job Cards
  const checkBackReminders = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const list: Array<{
      id: string;
      type: 'PO' | 'JW' | 'JC';
      typeBadge: string;
      refNo: string;
      partyName: string;
      itemsSummary: string;
      pendingQty: number;
      unit: string;
      createdDate: string;
      promisedDate: string;
      diffDays: number; // >0: overdue, 0: due today, <0: upcoming
      status: 'OVERDUE' | 'DUE_TODAY' | 'UPCOMING';
      notes: string;
      rawObject: any;
    }> = [];

    // 1. Open Purchase Orders
    purchaseOrders
      .filter(po => po.status !== 'GOODS_RECEIVED' && po.status !== 'CANCELLED' && po.status !== 'REJECTED' && !(po as any).isDeleted)
      .forEach(po => {
        const totalOrd = po.items.reduce((sum, pi) => sum + (pi.quantity || pi.orderedQty || 0), 0);
        const totalRec = po.items.reduce((sum, pi) => sum + (pi.receivedQty || 0), 0);
        const pending = Math.max(0, totalOrd - totalRec);
        if (pending <= 0) return;

        const targetDateStr = po.expectedDeliveryDate || po.deliveryDate || po.orderDate || new Date().toISOString().split('T')[0];
        let targetDate = new Date(targetDateStr);
        if (isNaN(targetDate.getTime())) targetDate = new Date();
        targetDate.setHours(0, 0, 0, 0);

        const diffTime = today.getTime() - targetDate.getTime();
        const diffDays = Math.round(diffTime / (24 * 60 * 60 * 1000));

        let status: 'OVERDUE' | 'DUE_TODAY' | 'UPCOMING' = 'UPCOMING';
        if (diffDays > 0) status = 'OVERDUE';
        else if (diffDays === 0) status = 'DUE_TODAY';

        const itemsSummary = po.items.map(pi => `${pi.itemCode || pi.itemName} (${(pi.quantity || pi.orderedQty || 0) - (pi.receivedQty || 0)} ${pi.unit || 'PCS'})`).join(', ');

        list.push({
          id: `po_cb_${po.id}`,
          type: 'PO',
          typeBadge: 'PO (Vendor)',
          refNo: po.poNumber,
          partyName: po.vendorName,
          itemsSummary,
          pendingQty: pending,
          unit: po.items[0]?.unit || 'PCS',
          createdDate: po.orderDate,
          promisedDate: targetDateStr,
          diffDays,
          status,
          notes: po.notes || '',
          rawObject: po
        });
      });

    // 2. Open Job Work Challans
    jobworks
      .filter(jw => jw.status !== 'COMPLETED' && (jw.pendingBalance || 0) > 0)
      .forEach(jw => {
        const targetDateStr = jw.expectedReturnDate || jw.issueDate || new Date().toISOString().split('T')[0];
        let targetDate = new Date(targetDateStr);
        if (isNaN(targetDate.getTime())) targetDate = new Date();
        targetDate.setHours(0, 0, 0, 0);

        const diffTime = today.getTime() - targetDate.getTime();
        const diffDays = Math.round(diffTime / (24 * 60 * 60 * 1000));

        let status: 'OVERDUE' | 'DUE_TODAY' | 'UPCOMING' = 'UPCOMING';
        if (diffDays > 0) status = 'OVERDUE';
        else if (diffDays === 0) status = 'DUE_TODAY';

        list.push({
          id: `jw_cb_${jw.id}`,
          type: 'JW',
          typeBadge: 'Job Work (Vendor)',
          refNo: jw.challanNo,
          partyName: jw.vendorName,
          itemsSummary: `${jw.itemCode || jw.itemName} (${jw.processRequired || 'Machining'})`,
          pendingQty: jw.pendingBalance,
          unit: 'PCS',
          createdDate: jw.issueDate,
          promisedDate: targetDateStr,
          diffDays,
          status,
          notes: jw.notes || '',
          rawObject: jw
        });
      });

    // 3. Open In-House Job Cards
    jobCards
      .filter(jc => jc.status !== 'COMPLETED' && jc.status !== 'CANCELLED' && !jc.isDeleted)
      .forEach(jc => {
        const pending = Math.max(0, (jc.targetQuantity || 0) - (jc.completedQuantity || 0));
        if (pending <= 0) return;

        const targetDateStr = jc.completionDate || jc.startDate || new Date().toISOString().split('T')[0];
        let targetDate = new Date(targetDateStr);
        if (isNaN(targetDate.getTime())) targetDate = new Date();
        targetDate.setHours(0, 0, 0, 0);

        const diffTime = today.getTime() - targetDate.getTime();
        const diffDays = Math.round(diffTime / (24 * 60 * 60 * 1000));

        let status: 'OVERDUE' | 'DUE_TODAY' | 'UPCOMING' = 'UPCOMING';
        if (diffDays > 0) status = 'OVERDUE';
        else if (diffDays === 0) status = 'DUE_TODAY';

        list.push({
          id: `jc_cb_${jc.id}`,
          type: 'JC',
          typeBadge: 'Job Card (In-House)',
          refNo: jc.jobCardNo,
          partyName: jc.assignedOperator || 'Production Line',
          itemsSummary: `${jc.itemCode} - ${jc.itemName}`,
          pendingQty: pending,
          unit: 'PCS',
          createdDate: jc.startDate,
          promisedDate: targetDateStr,
          diffDays,
          status,
          notes: jc.remarks || '',
          rawObject: jc
        });
      });

    return list;
  }, [purchaseOrders, jobworks, jobCards]);

  const filteredCheckBackReminders = useMemo(() => {
    let list = checkBackReminders;

    if (checkBackTypeFilter !== 'ALL') {
      list = list.filter(r => r.type === checkBackTypeFilter);
    }

    if (checkBackSearch.trim()) {
      const q = checkBackSearch.trim().toLowerCase();
      list = list.filter(r => 
        r.refNo.toLowerCase().includes(q) ||
        r.partyName.toLowerCase().includes(q) ||
        r.itemsSummary.toLowerCase().includes(q)
      );
    }

    return [...list].sort((a, b) => b.diffDays - a.diffDays);
  }, [checkBackReminders, checkBackTypeFilter, checkBackSearch]);

  const overdueCheckBackCount = useMemo(() => {
    return checkBackReminders.filter(r => r.status === 'OVERDUE' || r.status === 'DUE_TODAY').length;
  }, [checkBackReminders]);

  // Handler to launch PO Draft Modal
  const handleOpenDraftPO = (rem: typeof jitReminders[0]) => {
    setSelectedPOItem({
      item: rem.item,
      woNumber: rem.woNumber,
      woId: rem.woId,
      targetQty: rem.totalRequired,
      minShortage: rem.minShortage,
      shortage: rem.shortage
    });
    const preferredVendor = rem.item.mappedVendors?.[0]?.vendorId || vendors[0]?.id || '';
    setDraftPOVendorId(preferredVendor);
    setDraftPOQty(rem.minShortage > 0 ? rem.minShortage : (rem.shortage > 0 ? rem.shortage : (rem.item.minOrderQty || 1)));
    setDraftPOUnitPrice(rem.item.unitPrice || 0);
    setDraftPONotes(`Triggered via Dashboard JIT Reminder for Work Order ${rem.woNumber}`);
    setDraftPOModalOpen(true);
  };

  const handleSaveDraftPO = () => {
    if (!selectedPOItem || !draftPOVendorId || draftPOQty <= 0) {
      alert('Please select a vendor and valid quantity.');
      return;
    }
    const vendorObj = vendors.find(v => v.id === draftPOVendorId);
    const it = selectedPOItem.item;

    const newPOItem: POLineItem = {
      itemId: it.id,
      itemCode: it.itemCode,
      itemName: it.name,
      quantity: Number(draftPOQty),
      orderedQty: Number(draftPOQty),
      originalOrderedQty: Number(draftPOQty),
      receivedQty: 0,
      unit: it.unit || 'PCS',
      unitPrice: Number(draftPOUnitPrice) || 0,
      totalAmount: Number(draftPOQty) * (Number(draftPOUnitPrice) || 0),
      amount: Number(draftPOQty) * (Number(draftPOUnitPrice) || 0)
    };

    const nextPoNum = generateNextPONumber(purchaseOrders);

    addPurchaseOrder({
      poNumber: nextPoNum,
      vendorId: draftPOVendorId,
      vendorName: vendorObj?.name || 'Vendor',
      orderDate: new Date().toISOString().split('T')[0],
      expectedDeliveryDate: new Date(Date.now() + (it.leadTimeDays || 10) * 86400000).toISOString().split('T')[0],
      items: [newPOItem],
      notes: draftPONotes
    });

    setDraftPOModalOpen(false);
    alert(`✓ Draft Purchase Order ${nextPoNum} generated successfully!`);
  };

  // Handler to launch Job Work Draft Modal
  const handleOpenDraftJW = (rem: typeof jitReminders[0]) => {
    setSelectedJWItem({
      item: rem.item,
      woNumber: rem.woNumber,
      woId: rem.woId,
      targetQty: rem.totalRequired,
      minShortage: rem.minShortage,
      shortage: rem.shortage
    });
    setDraftJWVendorId(vendors[0]?.id || '');
    setDraftJWQty(rem.minShortage > 0 ? rem.minShortage : (rem.shortage > 0 ? rem.shortage : 1));
    setDraftJWProcess('Machining & Surface Treatment');
    setDraftJWNotes(`Issued via Dashboard JIT Reminder for Work Order ${rem.woNumber}`);
    setDraftJWModalOpen(true);
  };

  const handleSaveDraftJW = () => {
    if (!selectedJWItem || !draftJWVendorId || draftJWQty <= 0) {
      alert('Please select a vendor and valid quantity.');
      return;
    }
    const vendorObj = vendors.find(v => v.id === draftJWVendorId);
    const it = selectedJWItem.item;
    const nextJwNo = generateNextJobworkNumber(jobworks);

    addJobworkChallan({
      challanNo: nextJwNo,
      vendorId: draftJWVendorId,
      vendorName: vendorObj?.name || 'Vendor',
      issueDate: new Date().toISOString().split('T')[0],
      expectedReturnDate: new Date(Date.now() + (it.leadTimeDays || 7) * 86400000).toISOString().split('T')[0],
      itemId: it.id,
      itemCode: it.itemCode,
      itemName: it.name,
      sentQuantity: Number(draftJWQty),
      receivedQuantity: 0,
      scrapQuantity: 0,
      processRequired: draftJWProcess,
      notes: draftJWNotes
    });

    setDraftJWModalOpen(false);
    alert(`✓ Outward Job Work Challan ${nextJwNo} issued successfully!`);
  };

  // Handler to launch Job Card Modal
  const handleOpenDraftJC = (rem: typeof jitReminders[0]) => {
    setSelectedJCItem({
      item: rem.item,
      woNumber: rem.woNumber,
      woId: rem.woId,
      targetQty: rem.totalRequired,
      minShortage: rem.minShortage,
      shortage: rem.shortage
    });
    setDraftJCQty(rem.minShortage > 0 ? rem.minShortage : (rem.shortage > 0 ? rem.shortage : 1));
    setDraftJCOperator('Suresh Patel');
    setDraftJCTargetDate(new Date(Date.now() + (rem.item.leadTimeDays || 5) * 86400000).toISOString().split('T')[0]);
    setDraftJCNotes(`Generated via Dashboard JIT Reminder for Work Order ${rem.woNumber}`);
    setDraftJCModalOpen(true);
  };

  const handleSaveDraftJC = () => {
    if (!selectedJCItem || draftJCQty <= 0) {
      alert('Please enter a valid target quantity.');
      return;
    }
    const it = selectedJCItem.item;
    const nextJcNo = generateNextJobCardNumber(jobCards);

    addJobCard({
      woId: selectedJCItem.woId,
      woNumber: selectedJCItem.woNumber,
      itemId: it.id,
      itemCode: it.itemCode,
      itemName: it.name,
      itemType: (it.category === 'AS' || it.category === 'MF' || it.category === 'FAS') ? 'ASSEMBLY' : 'SUB_ASSEMBLY',
      targetQuantity: Number(draftJCQty),
      completedQuantity: 0,
      status: 'OPEN',
      type: 'PRODUCTION',
      assignedOperator: draftJCOperator,
      startDate: new Date().toISOString().split('T')[0],
      completionDate: draftJCTargetDate,
      remarks: draftJCNotes,
      components: [
        {
          itemId: it.id,
          itemCode: it.itemCode,
          itemName: it.name,
          qtyPerUnit: 1,
          totalRequiredQty: Number(draftJCQty),
          issuedQty: 0,
          unit: it.unit || 'PCS'
        }
      ]
    });

    setDraftJCModalOpen(false);
    alert(`✓ Production Job Card ${nextJcNo} created successfully!`);
  };

  // Handler for Vendor Promised Date Check-Back Modal
  const handleOpenPromisedDateModal = (cb: typeof checkBackReminders[0]) => {
    setActiveCheckBackRecord({
      type: cb.type,
      id: cb.rawObject.id,
      refNo: cb.refNo,
      partyName: cb.partyName,
      itemName: cb.itemsSummary,
      pendingQty: cb.pendingQty,
      unit: cb.unit,
      currentPromisedDate: cb.promisedDate,
      notes: cb.notes
    });
    setNewPromisedDate(cb.promisedDate || new Date().toISOString().split('T')[0]);
    setCheckBackNote(cb.notes || '');
    setPromisedDateModalOpen(true);
  };

  const handleSavePromisedDate = () => {
    if (!activeCheckBackRecord || !newPromisedDate) return;

    const timestampStr = `[Check-Back ${new Date().toLocaleDateString('en-GB')}]: Rescheduled to ${newPromisedDate}. ${checkBackNote ? `Note: ${checkBackNote}` : ''}`;

    if (activeCheckBackRecord.type === 'PO') {
      const targetPO = purchaseOrders.find(p => p.id === activeCheckBackRecord.id);
      if (targetPO) {
        updatePurchaseOrder({
          ...targetPO,
          expectedDeliveryDate: newPromisedDate,
          deliveryDate: newPromisedDate,
          notes: targetPO.notes ? `${targetPO.notes} | ${timestampStr}` : timestampStr
        });
      }
    } else if (activeCheckBackRecord.type === 'JW') {
      const targetJW = jobworks.find(j => j.id === activeCheckBackRecord.id);
      if (targetJW) {
        updateJobworkChallan({
          ...targetJW,
          expectedReturnDate: newPromisedDate,
          notes: targetJW.notes ? `${targetJW.notes} | ${timestampStr}` : timestampStr
        });
      }
    } else if (activeCheckBackRecord.type === 'JC') {
      const targetJC = jobCards.find(j => j.id === activeCheckBackRecord.id);
      if (targetJC) {
        updateJobCard({
          ...targetJC,
          completionDate: newPromisedDate,
          remarks: targetJC.remarks ? `${targetJC.remarks} | ${timestampStr}` : timestampStr
        });
      }
    }

    setPromisedDateModalOpen(false);
    alert(`✓ Promised Closing Date updated for ${activeCheckBackRecord.refNo}! Reminder rescheduled.`);
  };

  return (
    <div 
      className="module-layout-container" 
      style={{ 
        flex: 1, 
        minHeight: 0, 
        height: '100%', 
        overflowY: 'auto', 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '1.25rem', 
        paddingRight: '0.35rem',
        paddingBottom: '2.5rem'
      }}
    >
      {/* Top Banner: Low stock warning */}
      {lowStockItems.length > 0 && (
        <div 
          onDoubleClick={() => setActiveModule('shortage')}
          title="Double-click to open Shortage & Reorder Workbench"
          style={{
            backgroundColor: 'rgba(245, 158, 11, 0.15)',
            border: '1px solid var(--warning)',
            borderRadius: '0.75rem',
            padding: '0.85rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <AlertTriangle size={20} style={{ color: 'var(--warning)' }} />
            <div>
              <strong style={{ color: 'var(--warning)', fontSize: '0.9rem' }}>
                {lowStockItems.length} Moulding Machine Component(s) Below Safety Reorder Level!
              </strong>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                {lowStockItems.slice(0, 6).map(i => `${i.itemCode} (${i.inHouseStock} ${i.unit})`).join(', ')}
                {lowStockItems.length > 6 && ` and ${lowStockItems.length - 6} more...`}
              </div>
            </div>
          </div>
          <button 
            className="btn btn-outline"
            style={{ borderColor: 'var(--warning)', color: 'var(--warning)' }}
            onClick={(e) => { e.stopPropagation(); setActiveModule('shortage'); }}
          >
            <span>View Shortages (Double-Click)</span>
            <ArrowRight size={14} />
          </button>
        </div>
      )}

      {/* Top Banner: JIT Due Reminders */}
      {dueJITList.length > 0 && (
        <div 
          onClick={() => {
            const el = document.getElementById('jit-procurement-section');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }}
          style={{
            backgroundColor: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid var(--danger)',
            borderRadius: '0.75rem',
            padding: '0.85rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <AlertCircle size={22} style={{ color: 'var(--danger)', flexShrink: 0 }} />
            <div>
              <strong style={{ color: 'var(--danger)', fontSize: '0.9rem' }}>
                🚨 {dueJITList.length} Procurement & Production Orders Due / Overdue for Work Orders!
              </strong>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Staggered lead-time triggers reached for Bought-Out (PO), Job Work (JW), and In-House (JC) items.
              </div>
            </div>
          </div>
          <button 
            className="btn btn-outline"
            style={{ borderColor: 'var(--danger)', color: 'var(--danger)', fontSize: '0.78rem' }}
            onClick={(e) => {
              e.stopPropagation();
              const el = document.getElementById('jit-procurement-section');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            <span>Review JIT Triggers</span>
            <ArrowRight size={14} />
          </button>
        </div>
      )}

      {/* Top Banner: Vendor & Production Check-Back Reminders */}
      {overdueCheckBackCount > 0 && (
        <div 
          onClick={() => {
            const el = document.getElementById('checkback-reminders-section');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }}
          style={{
            backgroundColor: 'rgba(217, 119, 6, 0.12)',
            border: '1px solid #d97706',
            borderRadius: '0.75rem',
            padding: '0.85rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <PhoneCall size={22} style={{ color: '#d97706', flexShrink: 0 }} />
            <div>
              <strong style={{ color: '#d97706', fontSize: '0.9rem' }}>
                📞 {overdueCheckBackCount} Order(s) Awaiting Vendor / In-House Delivery Check-Back!
              </strong>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                GRN completion is pending past promised delivery date or lead-time offset. Follow up and set updated promised closing date.
              </div>
            </div>
          </div>
          <button 
            className="btn btn-outline"
            style={{ borderColor: '#d97706', color: '#d97706', fontSize: '0.78rem' }}
            onClick={(e) => {
              e.stopPropagation();
              const el = document.getElementById('checkback-reminders-section');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            <span>Track Follow-Ups</span>
            <ArrowRight size={14} />
          </button>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '1rem' }}>
        <StatCard 
          title="In-House Items Catalog" 
          value={totalInHouseItems} 
          subtitle={`${lowStockItems.length} require reordering`}
          icon={<Warehouse size={24} />}
          color="blue"
          onClick={() => setActiveModule('inhouse-inventory')}
          onDoubleClick={() => setActiveModule('inhouse-inventory')}
        />
        <StatCard 
          title="Active Jobwork Challans" 
          value={activeJobworks.length} 
          subtitle={`${totalPendingJobworkQty} pcs pending at vendors`}
          icon={<Truck size={24} />}
          color="amber"
          onClick={() => setActiveModule('external-inventory')}
          onDoubleClick={() => setActiveModule('external-inventory')}
        />
        <StatCard 
          title="Machine Work Orders" 
          value={activeWOs.length} 
          subtitle="In active assembly & testing"
          icon={<Wrench size={24} />}
          color="green"
          onClick={() => setActiveModule('work-orders')}
          onDoubleClick={() => setActiveModule('work-orders')}
        />
        <StatCard 
          title="Open Purchase Orders" 
          value={pendingPOs.length} 
          subtitle="Awaiting vendor deliveries"
          icon={<ShoppingCart size={24} />}
          color="purple"
          onClick={() => setActiveModule('purchase-orders')}
          onDoubleClick={() => setActiveModule('purchase-orders')}
        />
      </div>

      {/* SECTION 1: JIT Lead-Time Staggered Procurement & Production Reminders */}
      <div id="jit-procurement-section" className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
              <Clock size={20} style={{ color: 'var(--accent-primary)' }} />
              Just-In-Time (JIT) Procurement & Production Reminders
              <span className="badge badge-neutral" style={{ fontSize: '0.72rem' }}>
                Lead-Time Staggered
              </span>
            </h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}>
              Procurement & production scheduled by component lead-time offset (max lead time - item lead time) relative to Work Order start date.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            {/* Category Filter Tabs: All, PO, JW, JC */}
            <div style={{ display: 'inline-flex', borderRadius: '0.375rem', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
              <button 
                type="button" 
                className={`btn ${jitTypeFilter === 'ALL' ? 'btn-primary' : 'btn-outline'}`}
                style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem', border: 'none', borderRadius: 0 }}
                onClick={() => setJitTypeFilter('ALL')}
              >
                All Types ({jitReminders.length})
              </button>
              <button 
                type="button" 
                className={`btn ${jitTypeFilter === 'PO' ? 'btn-primary' : 'btn-outline'}`}
                style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem', border: 'none', borderRadius: 0 }}
                onClick={() => setJitTypeFilter('PO')}
              >
                🛒 Bought-Out PO ({jitReminders.filter(r => r.orderType === 'PO').length})
              </button>
              <button 
                type="button" 
                className={`btn ${jitTypeFilter === 'JW' ? 'btn-primary' : 'btn-outline'}`}
                style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem', border: 'none', borderRadius: 0 }}
                onClick={() => setJitTypeFilter('JW')}
              >
                🚚 Job Work JW ({jitReminders.filter(r => r.orderType === 'JW').length})
              </button>
              <button 
                type="button" 
                className={`btn ${jitTypeFilter === 'JC' ? 'btn-primary' : 'btn-outline'}`}
                style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem', border: 'none', borderRadius: 0 }}
                onClick={() => setJitTypeFilter('JC')}
              >
                ⚙️ In-House JC ({jitReminders.filter(r => r.orderType === 'JC').length})
              </button>
            </div>

            {/* Urgency Filter */}
            <div style={{ display: 'inline-flex', borderRadius: '0.375rem', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
              <button 
                type="button" 
                className={`btn ${jitStatusFilter === 'DUE_ONLY' ? 'btn-primary' : 'btn-outline'}`}
                style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem', border: 'none', borderRadius: 0 }}
                onClick={() => setJitStatusFilter('DUE_ONLY')}
              >
                🚨 Due / Overdue ({dueJITList.length})
              </button>
              <button 
                type="button" 
                className={`btn ${jitStatusFilter === 'UPCOMING' ? 'btn-primary' : 'btn-outline'}`}
                style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem', border: 'none', borderRadius: 0 }}
                onClick={() => setJitStatusFilter('UPCOMING')}
              >
                📅 Upcoming ({jitReminders.filter(r => r.status === 'UPCOMING').length})
              </button>
              <button 
                type="button" 
                className={`btn ${jitStatusFilter === 'ALL' ? 'btn-primary' : 'btn-outline'}`}
                style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem', border: 'none', borderRadius: 0 }}
                onClick={() => setJitStatusFilter('ALL')}
              >
                All Active ({jitReminders.length})
              </button>
            </div>

            {/* Search Input */}
            <div style={{ position: 'relative', width: '200px' }}>
              <Search size={13} style={{ position: 'absolute', left: '0.5rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input 
                type="text"
                placeholder="Search Item or WO..."
                className="input-field"
                style={{ paddingLeft: '1.75rem', paddingRight: '0.5rem', paddingTop: '0.2rem', paddingBottom: '0.2rem', fontSize: '0.75rem' }}
                value={jitSearch}
                onChange={(e) => setJitSearch(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* JIT Reminders Table */}
        {filteredJITReminders.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <CheckCircle2 size={32} color="var(--success)" style={{ margin: '0 auto 0.5rem auto' }} />
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {jitStatusFilter === 'DUE_ONLY' ? '✓ All orders are currently on schedule! No procurement or production triggers due today.' : 'No items match the selected filter criteria.'}
            </div>
            <p style={{ fontSize: '0.78rem', margin: '0.25rem 0 0 0' }}>
              Reminders appear automatically when an item\'s staggered lead time trigger date arrives.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto', maxHeight: '380px', overflowY: 'auto' }}>
            <table style={{ width: '100%', fontSize: '0.78rem', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-color)', position: 'sticky', top: 0, zIndex: 10 }}>
                  <th style={{ padding: '0.45rem 0.6rem', textAlign: 'center', width: '110px' }}>Status</th>
                  <th style={{ padding: '0.45rem 0.6rem', textAlign: 'center', width: '100px' }}>Type</th>
                  <th style={{ padding: '0.45rem 0.6rem', textAlign: 'left' }}>Work Order / Product</th>
                  <th style={{ padding: '0.45rem 0.6rem', textAlign: 'left' }}>Item Details</th>
                  <th style={{ padding: '0.45rem 0.6rem', textAlign: 'center', width: '90px' }}>Lead Time</th>
                  <th style={{ padding: '0.45rem 0.6rem', textAlign: 'left', width: '170px' }}>Trigger Timeline</th>
                  <th style={{ padding: '0.45rem 0.6rem', textAlign: 'center', width: '140px' }}>Shortage (Min Level)</th>
                  <th style={{ padding: '0.45rem 0.6rem', textAlign: 'center', width: '140px' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredJITReminders.map(rem => {
                  const isOverdue = rem.status === 'OVERDUE';
                  const isDueToday = rem.status === 'DUE_TODAY';

                  return (
                    <tr 
                      key={rem.id}
                      style={{ 
                        backgroundColor: isOverdue ? 'rgba(239, 68, 68, 0.07)' : isDueToday ? 'rgba(245, 158, 11, 0.08)' : 'transparent',
                        borderBottom: '1px solid var(--border-color)'
                      }}
                    >
                      {/* Status */}
                      <td style={{ padding: '0.5rem 0.6rem', textAlign: 'center' }}>
                        {isOverdue ? (
                          <span className="badge badge-danger" style={{ fontSize: '0.7rem', fontWeight: 800, padding: '0.15rem 0.4rem', whiteSpace: 'nowrap' }}>
                            🔴 Overdue (+{rem.diffDays}d)
                          </span>
                        ) : isDueToday ? (
                          <span className="badge badge-warning" style={{ fontSize: '0.7rem', fontWeight: 800, padding: '0.15rem 0.4rem', whiteSpace: 'nowrap' }}>
                            🟠 Due Today
                          </span>
                        ) : (
                          <span className="badge badge-neutral" style={{ fontSize: '0.7rem', fontWeight: 700, padding: '0.15rem 0.4rem', whiteSpace: 'nowrap' }}>
                            🟡 In {Math.abs(rem.diffDays)} Days
                          </span>
                        )}
                      </td>

                      {/* Type */}
                      <td style={{ padding: '0.5rem 0.6rem', textAlign: 'center' }}>
                        {rem.orderType === 'PO' ? (
                          <span className="badge badge-info" style={{ fontSize: '0.68rem', fontWeight: 800, padding: '0.15rem 0.35rem' }}>
                            🛒 PO
                          </span>
                        ) : rem.orderType === 'JW' ? (
                          <span className="badge badge-warning" style={{ fontSize: '0.68rem', fontWeight: 800, padding: '0.15rem 0.35rem' }}>
                            🚚 JW
                          </span>
                        ) : (
                          <span className="badge badge-success" style={{ fontSize: '0.68rem', fontWeight: 800, padding: '0.15rem 0.35rem' }}>
                            ⚙️ JC
                          </span>
                        )}
                      </td>

                      {/* Work Order */}
                      <td style={{ padding: '0.5rem 0.6rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontFamily: 'monospace', fontWeight: 800, color: 'var(--accent-primary)', fontSize: '0.82rem' }}>
                            {rem.woNumber}
                          </span>
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.78rem' }}>
                            {rem.machineModel} ({rem.woQuantity} Units)
                          </span>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                            WO Start: {rem.woStartDateStr}
                          </span>
                        </div>
                      </td>

                      {/* Item Details */}
                      <td style={{ padding: '0.5rem 0.6rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                            <strong style={{ fontFamily: 'monospace', color: 'var(--accent-primary)', fontSize: '0.82rem' }}>{rem.itemCode}</strong>
                            {rem.partCode && (
                              <span style={{ fontFamily: 'monospace', color: 'var(--text-muted)', fontSize: '0.72rem' }}>({rem.partCode})</span>
                            )}
                            <span className="badge badge-neutral" style={{ fontSize: '0.65rem', padding: '0.05rem 0.25rem' }}>{rem.category}</span>
                          </div>
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{rem.itemName}</span>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                            Stock: {rem.inHouseStock} {rem.unit} &bull; Req: {rem.totalRequired} {rem.unit} &bull; Min: {rem.minStock} {rem.unit}
                          </span>
                        </div>
                      </td>

                      {/* Lead Time */}
                      <td style={{ padding: '0.5rem 0.6rem', textAlign: 'center' }}>
                        <span className="badge badge-primary" style={{ fontSize: '0.74rem', fontWeight: 700 }}>
                          {rem.leadTimeDays} Days
                        </span>
                      </td>

                      {/* Timeline */}
                      <td style={{ padding: '0.5rem 0.6rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem', fontSize: '0.74rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <Calendar size={12} color="var(--text-muted)" />
                            <strong>Target: {rem.scheduledDateStr}</strong>
                          </div>
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>
                            {rem.offsetDays === 0 ? 'Day 0 (Max Lead Time)' : `Offset: Day +${rem.offsetDays} (Max: ${rem.maxLeadTimeInWO}d)`}
                          </span>
                        </div>
                      </td>

                      {/* Shortage */}
                      <td style={{ padding: '0.5rem 0.6rem', textAlign: 'center' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <span style={{ fontWeight: 900, fontSize: '0.85rem', color: rem.minShortage > 0 ? 'var(--danger)' : 'var(--success)' }}>
                            {rem.minShortage > 0 ? `${rem.minShortage} ${rem.unit}` : '0 (Covered)'}
                          </span>
                          <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                            Base: {rem.shortage} &bull; Open: {rem.openSupply}
                          </span>
                        </div>
                      </td>

                      {/* Action */}
                      <td style={{ padding: '0.5rem 0.6rem', textAlign: 'center' }}>
                        {rem.orderType === 'PO' ? (
                          <button 
                            type="button"
                            className="btn btn-primary"
                            style={{ padding: '0.22rem 0.55rem', fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                            onClick={() => handleOpenDraftPO(rem)}
                            title="Generate Draft Purchase Order"
                          >
                            <ShoppingCart size={13} />
                            <span>+ Raise PO</span>
                          </button>
                        ) : rem.orderType === 'JW' ? (
                          <button 
                            type="button"
                            className="btn btn-warning"
                            style={{ padding: '0.22rem 0.55rem', fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', color: '#fff' }}
                            onClick={() => handleOpenDraftJW(rem)}
                            title="Generate Outward Job Work Challan"
                          >
                            <Truck size={13} />
                            <span>+ Draft JW</span>
                          </button>
                        ) : (
                          <button 
                            type="button"
                            className="btn btn-success"
                            style={{ padding: '0.22rem 0.55rem', fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', color: '#fff' }}
                            onClick={() => handleOpenDraftJC(rem)}
                            title="Generate In-House Job Card"
                          >
                            <Wrench size={13} />
                            <span>+ Create JC</span>
                          </button>
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

      {/* SECTION 2: Vendor & Production Check-Back / Follow-Up Reminders */}
      <div id="checkback-reminders-section" className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
              <PhoneCall size={20} style={{ color: '#d97706' }} />
              Vendor & Production Delivery Check-Back Reminders
              <span className="badge badge-warning" style={{ fontSize: '0.72rem' }}>
                Follow-Up Tracking
              </span>
            </h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}>
              Pending Purchase Orders, Job Works, and In-House Job Cards approaching or past promised delivery dates without complete GRN receipt.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            {/* Category Filter */}
            <div style={{ display: 'inline-flex', borderRadius: '0.375rem', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
              <button 
                type="button" 
                className={`btn ${checkBackTypeFilter === 'ALL' ? 'btn-primary' : 'btn-outline'}`}
                style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem', border: 'none', borderRadius: 0 }}
                onClick={() => setCheckBackTypeFilter('ALL')}
              >
                All Open ({checkBackReminders.length})
              </button>
              <button 
                type="button" 
                className={`btn ${checkBackTypeFilter === 'PO' ? 'btn-primary' : 'btn-outline'}`}
                style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem', border: 'none', borderRadius: 0 }}
                onClick={() => setCheckBackTypeFilter('PO')}
              >
                POs ({checkBackReminders.filter(r => r.type === 'PO').length})
              </button>
              <button 
                type="button" 
                className={`btn ${checkBackTypeFilter === 'JW' ? 'btn-primary' : 'btn-outline'}`}
                style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem', border: 'none', borderRadius: 0 }}
                onClick={() => setCheckBackTypeFilter('JW')}
              >
                Job Works ({checkBackReminders.filter(r => r.type === 'JW').length})
              </button>
              <button 
                type="button" 
                className={`btn ${checkBackTypeFilter === 'JC' ? 'btn-primary' : 'btn-outline'}`}
                style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem', border: 'none', borderRadius: 0 }}
                onClick={() => setCheckBackTypeFilter('JC')}
              >
                Job Cards ({checkBackReminders.filter(r => r.type === 'JC').length})
              </button>
            </div>

            {/* Search Input */}
            <div style={{ position: 'relative', width: '200px' }}>
              <Search size={13} style={{ position: 'absolute', left: '0.5rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input 
                type="text"
                placeholder="Search Ref No or Vendor..."
                className="input-field"
                style={{ paddingLeft: '1.75rem', paddingRight: '0.5rem', paddingTop: '0.2rem', paddingBottom: '0.2rem', fontSize: '0.75rem' }}
                value={checkBackSearch}
                onChange={(e) => setCheckBackSearch(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Check-Back Reminders Table */}
        {filteredCheckBackReminders.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <CheckCircle2 size={32} color="var(--success)" style={{ margin: '0 auto 0.5rem auto' }} />
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              ✓ All open purchase and jobwork orders have active promised delivery commitments!
            </div>
            <p style={{ fontSize: '0.78rem', margin: '0.25rem 0 0 0' }}>
              Follow-up reminders trigger automatically when an order exceeds its lead-time offset or promised closing date without complete GRN receipt.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto', maxHeight: '380px', overflowY: 'auto' }}>
            <table style={{ width: '100%', fontSize: '0.78rem', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-color)', position: 'sticky', top: 0, zIndex: 10 }}>
                  <th style={{ padding: '0.45rem 0.6rem', textAlign: 'center', width: '110px' }}>Urgency</th>
                  <th style={{ padding: '0.45rem 0.6rem', textAlign: 'center', width: '100px' }}>Category</th>
                  <th style={{ padding: '0.45rem 0.6rem', textAlign: 'left' }}>Reference / Order No</th>
                  <th style={{ padding: '0.45rem 0.6rem', textAlign: 'left' }}>Vendor / Operator</th>
                  <th style={{ padding: '0.45rem 0.6rem', textAlign: 'left' }}>Item Summary</th>
                  <th style={{ padding: '0.45rem 0.6rem', textAlign: 'center', width: '110px' }}>Pending Qty</th>
                  <th style={{ padding: '0.45rem 0.6rem', textAlign: 'left', width: '130px' }}>Promised Date</th>
                  <th style={{ padding: '0.45rem 0.6rem', textAlign: 'center', width: '150px' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredCheckBackReminders.map(cb => {
                  const isOverdue = cb.status === 'OVERDUE';
                  const isDueToday = cb.status === 'DUE_TODAY';

                  return (
                    <tr 
                      key={cb.id}
                      style={{ 
                        backgroundColor: isOverdue ? 'rgba(239, 68, 68, 0.07)' : isDueToday ? 'rgba(245, 158, 11, 0.08)' : 'transparent',
                        borderBottom: '1px solid var(--border-color)'
                      }}
                    >
                      {/* Urgency */}
                      <td style={{ padding: '0.5rem 0.6rem', textAlign: 'center' }}>
                        {isOverdue ? (
                          <span className="badge badge-danger" style={{ fontSize: '0.7rem', fontWeight: 800, padding: '0.15rem 0.4rem', whiteSpace: 'nowrap' }}>
                            🔴 Overdue (+{cb.diffDays}d)
                          </span>
                        ) : isDueToday ? (
                          <span className="badge badge-warning" style={{ fontSize: '0.7rem', fontWeight: 800, padding: '0.15rem 0.4rem', whiteSpace: 'nowrap' }}>
                            🟠 Due Today
                          </span>
                        ) : (
                          <span className="badge badge-neutral" style={{ fontSize: '0.7rem', fontWeight: 700, padding: '0.15rem 0.4rem', whiteSpace: 'nowrap' }}>
                            🟡 In {Math.abs(cb.diffDays)} Days
                          </span>
                        )}
                      </td>

                      {/* Category */}
                      <td style={{ padding: '0.5rem 0.6rem', textAlign: 'center' }}>
                        <span className={`badge ${cb.type === 'PO' ? 'badge-info' : cb.type === 'JW' ? 'badge-warning' : 'badge-success'}`} style={{ fontSize: '0.68rem', fontWeight: 800 }}>
                          {cb.typeBadge}
                        </span>
                      </td>

                      {/* Ref No */}
                      <td style={{ padding: '0.5rem 0.6rem' }}>
                        <strong style={{ fontFamily: 'monospace', color: 'var(--accent-primary)', fontSize: '0.82rem' }}>
                          {cb.refNo}
                        </strong>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          Issued: {cb.createdDate}
                        </div>
                      </td>

                      {/* Vendor / Operator */}
                      <td style={{ padding: '0.5rem 0.6rem' }}>
                        <strong style={{ color: 'var(--text-primary)', fontSize: '0.8rem' }}>
                          {cb.partyName}
                        </strong>
                      </td>

                      {/* Item Summary */}
                      <td style={{ padding: '0.5rem 0.6rem' }}>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                          {cb.itemsSummary}
                        </span>
                        {cb.notes && (
                          <div style={{ fontSize: '0.68rem', color: 'var(--accent-primary)', fontStyle: 'italic', marginTop: '0.15rem' }}>
                            📝 {cb.notes}
                          </div>
                        )}
                      </td>

                      {/* Pending Qty */}
                      <td style={{ padding: '0.5rem 0.6rem', textAlign: 'center' }}>
                        <strong style={{ color: 'var(--danger)', fontSize: '0.82rem' }}>
                          {cb.pendingQty} {cb.unit}
                        </strong>
                      </td>

                      {/* Promised Date */}
                      <td style={{ padding: '0.5rem 0.6rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.76rem' }}>
                          <CalendarClock size={12} color="var(--text-muted)" />
                          <strong>{cb.promisedDate}</strong>
                        </div>
                      </td>

                      {/* Action */}
                      <td style={{ padding: '0.5rem 0.6rem', textAlign: 'center' }}>
                        <button 
                          type="button"
                          className="btn btn-outline"
                          style={{ padding: '0.22rem 0.55rem', fontSize: '0.72rem', borderColor: '#d97706', color: '#d97706', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                          onClick={() => handleOpenPromisedDateModal(cb)}
                          title="Set Vendor's Promised Closing Date to close this reminder"
                        >
                          <CalendarClock size={13} />
                          <span>Set Promised Date</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Main Two-Column Summary Sections */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        
        {/* Active Machine Manufacturing Work Orders */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Wrench size={18} style={{ color: 'var(--accent-primary)' }} />
              Active Moulding Machine Build Orders
            </h3>
            <button className="btn btn-outline" style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem' }} onClick={() => setActiveModule('work-orders')}>
              View All
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {workOrders.length === 0 ? (
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1rem' }}>
                No active work orders.
              </div>
            ) : (
              workOrders.slice(0, 5).map(wo => (
                <div 
                  key={wo.id}
                  onClick={() => setActiveModule('work-orders')}
                  onDoubleClick={() => setActiveModule('work-orders')}
                  title={`Double-click to open Work Order ${wo.workOrderNo || wo.woNumber}`}
                  style={{
                    padding: '0.875rem',
                    borderRadius: '0.5rem',
                    backgroundColor: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-color)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--accent-primary)' }}>
                      {wo.workOrderNo || wo.woNumber}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                      {wo.machineModel} ({wo.quantity} Units)
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                      Target: {wo.targetCompletionDate} &bull; Lead: {wo.assignedLead}
                    </div>
                  </div>
                  <span className={`badge ${wo.status === 'IN_PROGRESS' ? 'badge-warning' : 'badge-success'}`}>
                    {(wo.stage || 'PLANNED').replace('_', ' ')}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Active External Jobwork Stock at Vendors */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Truck size={18} style={{ color: 'var(--warning)' }} />
              External Jobwork Stock at Vendors
            </h3>
            <button className="btn btn-outline" style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem' }} onClick={() => setActiveModule('external-inventory')}>
              Track All Challans
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {jobworks.length === 0 ? (
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1rem' }}>
                No pending vendor challans.
              </div>
            ) : (
              jobworks.slice(0, 5).map(jw => (
                <div 
                  key={jw.id}
                  onClick={() => setActiveModule('external-inventory')}
                  onDoubleClick={() => setActiveModule('external-inventory')}
                  title={`Double-click to track Challan ${jw.challanNo}`}
                  style={{
                    padding: '0.875rem',
                    borderRadius: '0.5rem',
                    backgroundColor: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-color)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.35rem',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--warning)' }}>
                      {jw.challanNo}
                    </span>
                    <span className={`badge ${jw.status === 'COMPLETED' ? 'badge-success' : 'badge-warning'}`}>
                      {jw.pendingBalance} PCS Pending
                    </span>
                  </div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {jw.itemName}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    Vendor: <strong>{jw.vendorName}</strong> &bull; Process: {jw.processRequired}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Quick Access Action Grid */}
      <div className="card" style={{ padding: '1.25rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-primary)' }}>
          Quick Operational Workflows (Double-Click to Launch)
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
          <button 
            className="btn btn-secondary" 
            style={{ justifyContent: 'flex-start', padding: '0.75rem' }}
            onClick={() => setActiveModule('external-inventory')}
            onDoubleClick={() => setActiveModule('external-inventory')}
          >
            <Truck size={18} style={{ color: 'var(--warning)' }} />
            <span>Issue Outward Jobwork</span>
          </button>
          <button 
            className="btn btn-secondary" 
            style={{ justifyContent: 'flex-start', padding: '0.75rem' }}
            onClick={() => setActiveModule('purchase-orders')}
            onDoubleClick={() => setActiveModule('purchase-orders')}
          >
            <ShoppingCart size={18} style={{ color: 'var(--accent-primary)' }} />
            <span>Create Purchase Order</span>
          </button>
          <button 
            className="btn btn-secondary" 
            style={{ justifyContent: 'flex-start', padding: '0.75rem' }}
            onClick={() => setActiveModule('job-cards')}
            onDoubleClick={() => setActiveModule('job-cards')}
          >
            <Wrench size={18} style={{ color: 'var(--success)' }} />
            <span>Production Job Cards</span>
          </button>
          <button 
            className="btn btn-secondary" 
            style={{ justifyContent: 'flex-start', padding: '0.75rem' }}
            onClick={() => setActiveModule('shortage')}
            onDoubleClick={() => setActiveModule('shortage')}
          >
            <Cpu size={18} style={{ color: '#a855f7' }} />
            <span>Moulding Machine Shortage</span>
          </button>
        </div>
      </div>

      {/* MODAL 1: Generate Draft Purchase Order */}
      {draftPOModalOpen && selectedPOItem && (
        <Modal
          isOpen={draftPOModalOpen}
          onClose={() => setDraftPOModalOpen(false)}
          title={`Generate Draft Purchase Order - ${selectedPOItem.item.itemCode}`}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ padding: '0.75rem 1rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: '0.5rem', border: '1px solid var(--border-color)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Item Name</span>
                <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{selectedPOItem.item.name}</div>
              </div>
              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Work Order</span>
                <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--accent-primary)' }}>{selectedPOItem.woNumber}</div>
              </div>
              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>In-House Stock</span>
                <div style={{ fontWeight: 700 }}>{selectedPOItem.item.inHouseStock} {selectedPOItem.item.unit}</div>
              </div>
              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Min Level Shortage (Default)</span>
                <div style={{ fontWeight: 800, color: 'var(--danger)' }}>{selectedPOItem.minShortage} {selectedPOItem.item.unit}</div>
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.82rem', fontWeight: 700, display: 'block', marginBottom: '0.35rem' }}>Select Vendor</label>
              <select 
                className="input-field" 
                value={draftPOVendorId} 
                onChange={(e) => setDraftPOVendorId(e.target.value)}
              >
                <option value="">-- Choose Vendor --</option>
                {vendors.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.name} ({v.city || 'Vendor'}) {selectedPOItem.item.mappedVendors?.some(mv => mv.vendorId === v.id) ? '★ Preferred' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, display: 'block', marginBottom: '0.35rem' }}>PO Quantity ({selectedPOItem.item.unit})</label>
                <input 
                  type="number" 
                  className="input-field" 
                  min="1" 
                  value={draftPOQty} 
                  onChange={(e) => setDraftPOQty(Math.max(1, Number(e.target.value)))} 
                />
              </div>
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, display: 'block', marginBottom: '0.35rem' }}>Unit Price (₹)</label>
                <input 
                  type="number" 
                  className="input-field" 
                  min="0" 
                  step="0.01"
                  value={draftPOUnitPrice} 
                  onChange={(e) => setDraftPOUnitPrice(Math.max(0, Number(e.target.value)))} 
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.82rem', fontWeight: 700, display: 'block', marginBottom: '0.35rem' }}>Notes / Instructions</label>
              <textarea 
                className="input-field" 
                rows={2} 
                value={draftPONotes} 
                onChange={(e) => setDraftPONotes(e.target.value)} 
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setDraftPOModalOpen(false)}>Cancel</button>
              <button type="button" className="btn btn-primary" onClick={handleSaveDraftPO} style={{ fontWeight: 700 }}>
                Generate Draft PO ({draftPOQty} {selectedPOItem.item.unit})
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL 2: Generate Draft Job Work */}
      {draftJWModalOpen && selectedJWItem && (
        <Modal
          isOpen={draftJWModalOpen}
          onClose={() => setDraftJWModalOpen(false)}
          title={`Generate Outward Job Work Challan - ${selectedJWItem.item.itemCode}`}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ padding: '0.75rem 1rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: '0.5rem', border: '1px solid var(--border-color)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Item Name</span>
                <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{selectedJWItem.item.name}</div>
              </div>
              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Work Order</span>
                <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--accent-primary)' }}>{selectedJWItem.woNumber}</div>
              </div>
              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>In-House Stock Available</span>
                <div style={{ fontWeight: 700 }}>{selectedJWItem.item.inHouseStock} {selectedJWItem.item.unit}</div>
              </div>
              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Min Level Shortage</span>
                <div style={{ fontWeight: 800, color: 'var(--danger)' }}>{selectedJWItem.minShortage} {selectedJWItem.item.unit}</div>
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.82rem', fontWeight: 700, display: 'block', marginBottom: '0.35rem' }}>Select Job Work Vendor</label>
              <select 
                className="input-field" 
                value={draftJWVendorId} 
                onChange={(e) => setDraftJWVendorId(e.target.value)}
              >
                <option value="">-- Choose Vendor --</option>
                {vendors.map(v => (
                  <option key={v.id} value={v.id}>{v.name} ({v.city || 'Local'})</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, display: 'block', marginBottom: '0.35rem' }}>Sent Quantity ({selectedJWItem.item.unit})</label>
                <input 
                  type="number" 
                  className="input-field" 
                  min="1" 
                  value={draftJWQty} 
                  onChange={(e) => setDraftJWQty(Math.max(1, Number(e.target.value)))} 
                />
              </div>
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, display: 'block', marginBottom: '0.35rem' }}>Process Operation</label>
                <input 
                  type="text" 
                  className="input-field" 
                  value={draftJWProcess} 
                  onChange={(e) => setDraftJWProcess(e.target.value)} 
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.82rem', fontWeight: 700, display: 'block', marginBottom: '0.35rem' }}>Notes / Technical Requirements</label>
              <textarea 
                className="input-field" 
                rows={2} 
                value={draftJWNotes} 
                onChange={(e) => setDraftJWNotes(e.target.value)} 
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setDraftJWModalOpen(false)}>Cancel</button>
              <button type="button" className="btn btn-warning" onClick={handleSaveDraftJW} style={{ fontWeight: 700, color: '#fff' }}>
                Issue Job Work Challan ({draftJWQty} {selectedJWItem.item.unit})
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL 3: Create In-House Job Card */}
      {draftJCModalOpen && selectedJCItem && (
        <Modal
          isOpen={draftJCModalOpen}
          onClose={() => setDraftJCModalOpen(false)}
          title={`Generate In-House Job Card - ${selectedJCItem.item.itemCode}`}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ padding: '0.75rem 1rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: '0.5rem', border: '1px solid var(--border-color)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Component / Assembly</span>
                <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{selectedJCItem.item.name}</div>
              </div>
              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Target Work Order</span>
                <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--accent-primary)' }}>{selectedJCItem.woNumber}</div>
              </div>
              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Current In-House Stock</span>
                <div style={{ fontWeight: 700 }}>{selectedJCItem.item.inHouseStock} {selectedJCItem.item.unit}</div>
              </div>
              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Min Level Shortage</span>
                <div style={{ fontWeight: 800, color: 'var(--danger)' }}>{selectedJCItem.minShortage} {selectedJCItem.item.unit}</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, display: 'block', marginBottom: '0.35rem' }}>Target Build Quantity</label>
                <input 
                  type="number" 
                  className="input-field" 
                  min="1" 
                  value={draftJCQty} 
                  onChange={(e) => setDraftJCQty(Math.max(1, Number(e.target.value)))} 
                />
              </div>
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, display: 'block', marginBottom: '0.35rem' }}>Assigned Supervisor / Operator</label>
                <input 
                  type="text" 
                  className="input-field" 
                  value={draftJCOperator} 
                  onChange={(e) => setDraftJCOperator(e.target.value)} 
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.82rem', fontWeight: 700, display: 'block', marginBottom: '0.35rem' }}>Target Completion Date</label>
              <input 
                type="date" 
                className="input-field" 
                value={draftJCTargetDate} 
                onChange={(e) => setDraftJCTargetDate(e.target.value)} 
              />
            </div>

            <div>
              <label style={{ fontSize: '0.82rem', fontWeight: 700, display: 'block', marginBottom: '0.35rem' }}>Assembly Notes</label>
              <textarea 
                className="input-field" 
                rows={2} 
                value={draftJCNotes} 
                onChange={(e) => setDraftJCNotes(e.target.value)} 
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setDraftJCModalOpen(false)}>Cancel</button>
              <button type="button" className="btn btn-success" onClick={handleSaveDraftJC} style={{ fontWeight: 700, color: '#fff' }}>
                Create Production Job Card ({draftJCQty} {selectedJCItem.item.unit})
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL 4: Update Vendor Promised Closing Date */}
      {promisedDateModalOpen && activeCheckBackRecord && (
        <Modal
          isOpen={promisedDateModalOpen}
          onClose={() => setPromisedDateModalOpen(false)}
          title={`Set Promised Closing Date - ${activeCheckBackRecord.refNo}`}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ padding: '0.75rem 1rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: '0.5rem', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Vendor / Operator:</span>
                <strong>{activeCheckBackRecord.partyName}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Pending Quantity:</span>
                <strong style={{ color: 'var(--danger)' }}>{activeCheckBackRecord.pendingQty} {activeCheckBackRecord.unit}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Item Details:</span>
                <span>{activeCheckBackRecord.itemName}</span>
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.82rem', fontWeight: 800, display: 'block', marginBottom: '0.35rem' }}>
                Vendor\'s Confirmed Promised Delivery Date
              </label>
              <input 
                type="date" 
                className="input-field" 
                value={newPromisedDate} 
                onChange={(e) => setNewPromisedDate(e.target.value)} 
                required
              />
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
                Setting this promised date clears the immediate overdue reminder and reschedules the next check-back trigger.
              </span>
            </div>

            <div>
              <label style={{ fontSize: '0.82rem', fontWeight: 700, display: 'block', marginBottom: '0.35rem' }}>
                Follow-Up Conversation Notes
              </label>
              <textarea 
                className="input-field" 
                rows={3} 
                placeholder="e.g. Spoke with vendor GM Mr. Mehta. Raw casting is delayed 2 days; guaranteed dispatch on Friday morning."
                value={checkBackNote} 
                onChange={(e) => setCheckBackNote(e.target.value)} 
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setPromisedDateModalOpen(false)}>Cancel</button>
              <button type="button" className="btn btn-primary" onClick={handleSavePromisedDate} style={{ fontWeight: 700 }}>
                Save Promised Date & Reschedule Reminder
              </button>
            </div>
          </div>
        </Modal>
      )}

    </div>
  );
};

