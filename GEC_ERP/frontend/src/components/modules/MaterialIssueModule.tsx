import React, { useState, useMemo, useDeferredValue } from 'react';
import { useERP } from '../../context/ERPContext';
import { 
  ClipboardList, Package, CheckCircle2, History, AlertTriangle, 
  Search, RefreshCw, Send, CheckSquare, Layers, Truck, ShieldAlert,
  ArrowRight, Check, X, FileText, ChevronDown, ChevronRight, Sparkles, Printer
} from 'lucide-react';
import { JobCard, WorkOrder, Item } from '../../types/erp';
import { PrintManagerModal } from '../printTemplates/PrintManagerModal';
import { SingleMaterialIssuePrintView, MaterialIssueListPrintView } from '../printTemplates/MaterialIssuePrintTemplates';

export const MaterialIssueModule: React.FC = () => {
  const { 
    jobCards, workOrders, items, materialIssueRecords, 
    issueMaterialForJobCard, issueMaterialForWorkOrder, issueAllAvailableForCard,
    jobCardMaterialReissues, addJobCardMaterialReissue, currentUser, setActiveModule
  } = useERP();

  // Print Document state
  const [printRecord, setPrintRecord] = useState<any | null>(null);
  const [isPrintListOpen, setIsPrintListOpen] = useState(false);

  // Top Tabs
  const [activeTab, setActiveTab] = useState<'ACTIVE_CARDS' | 'ISSUE_HISTORY' | 'REISSUES'>('ACTIVE_CARDS');

  // Sub-filter for Active Cards: 'ALL' | 'JOB_CARDS' | 'WORK_ORDERS'
  const [sourceTypeFilter, setSourceTypeFilter] = useState<'ALL' | 'JOB_CARDS' | 'WORK_ORDERS'>('ALL');

  // Search terms
  const [searchTerm, setSearchTerm] = useState('');
  const deferredSearchTerm = useDeferredValue(searchTerm);

  const [historySearchTerm, setHistorySearchTerm] = useState('');
  const deferredHistorySearchTerm = useDeferredValue(historySearchTerm);

  const [reissueSearchTerm, setReissueSearchTerm] = useState('');
  const deferredReissueSearchTerm = useDeferredValue(reissueSearchTerm);

  // Reissue Modal State
  const [isReissueModalOpen, setIsReissueModalOpen] = useState(false);
  const [reissueTargetType, setReissueTargetType] = useState<'JOB_CARD' | 'WORK_ORDER'>('JOB_CARD');
  const [reissueTargetId, setReissueTargetId] = useState('');
  const [reissueItemId, setReissueItemId] = useState('');
  const [reissueQty, setReissueQty] = useState(1);
  const [reissueReason, setReissueReason] = useState<'SCRAP' | 'IN_HOUSE_REWORK' | 'VENDOR_REWORK' | 'OTHER'>('SCRAP');
  const [reissueNotes, setReissueNotes] = useState('');

  // Single Item Issue Inline Quantities state: key = `${cardId}_${itemId}` -> qty
  const [customIssueQtys, setCustomIssueQtys] = useState<Record<string, number>>({});
  const [issuedToInputs, setIssuedToInputs] = useState<Record<string, string>>({});

  // Expanded cards state
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});

  const toggleCardExpanded = (id: string) => {
    setExpandedCards(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Pre-index items for fast O(1) lookups
  const itemMap = useMemo(() => {
    const map = new Map<string, Item>();
    items.forEach(it => {
      if (it.id) map.set(it.id, it);
      if (it.itemCode) map.set(it.itemCode.toLowerCase(), it);
    });
    return map;
  }, [items]);

  // 1. Unified Active Cards List (Job Cards + Work Orders that require components)
  const activeCardsList = useMemo(() => {
    const list: Array<{
      id: string;
      cardType: 'JOB_CARD' | 'WORK_ORDER';
      refNumber: string;
      title: string;
      itemCode: string;
      targetQuantity: number;
      date: string;
      assignedTo?: string;
      rawObject: JobCard | WorkOrder;
      components: Array<{
        itemId: string;
        itemCode: string;
        itemName: string;
        totalRequiredQty: number;
        issuedQty: number;
        unissuedQty: number;
        unit: string;
        inHouseStock: number;
      }>;
      totalItemsCount: number;
      fullyIssuedItemsCount: number;
      isFullyIssued: boolean;
      headerSearchStr: string;
      componentSearchList: string[];
    }> = [];

    // Process Active Job Cards
    jobCards
      .filter(jc => jc.status !== 'COMPLETED' && jc.status !== 'CANCELLED' && !(jc as any).isDeleted)
      .forEach(jc => {
        const comps = (jc.components || []).map(c => {
          const itemObj = itemMap.get(c.itemId) || itemMap.get((c.itemCode || '').toLowerCase());
          const req = c.totalRequiredQty || 0;
          const issued = c.issuedQty || 0;
          const unissued = Math.max(0, req - issued);
          const stock = itemObj ? (itemObj.inHouseStock || 0) : 0;
          return {
            itemId: c.itemId || itemObj?.id || '',
            itemCode: c.itemCode || itemObj?.itemCode || '',
            itemName: c.itemName || itemObj?.name || '',
            totalRequiredQty: req,
            issuedQty: issued,
            unissuedQty: unissued,
            unit: c.unit || itemObj?.unit || 'PCS',
            inHouseStock: stock
          };
        });

        const totalItemsCount = comps.length;
        const fullyIssuedItemsCount = comps.filter(c => c.unissuedQty === 0).length;
        const isFullyIssued = totalItemsCount > 0 && fullyIssuedItemsCount === totalItemsCount;

        const headerSearchStr = `${jc.jobCardNo} ${jc.woNumber || ''} ${jc.itemCode} ${jc.itemName} ${jc.assignedOperator || ''}`.toLowerCase();
        const componentSearchList = comps.map(c => `${c.itemCode} ${c.itemName}`.toLowerCase());

        list.push({
          id: jc.id,
          cardType: 'JOB_CARD',
          refNumber: jc.jobCardNo,
          title: jc.itemName || jc.itemCode,
          itemCode: jc.itemCode,
          targetQuantity: jc.targetQuantity || 1,
          date: jc.startDate || '',
          assignedTo: jc.assignedOperator,
          rawObject: jc,
          components: comps,
          totalItemsCount,
          fullyIssuedItemsCount,
          isFullyIssued,
          headerSearchStr,
          componentSearchList
        });
      });

    // Process Active Work Orders
    workOrders
      .filter(wo => wo.status !== 'COMPLETED' && wo.status !== 'CANCELLED' && !(wo as any).isDeleted)
      .forEach(wo => {
        if (!wo.woComponents || wo.woComponents.length === 0) return;

        const comps = wo.woComponents.map(c => {
          const itemObj = itemMap.get(c.itemId) || itemMap.get((c.itemCode || '').toLowerCase());
          const req = c.qtyRequired !== undefined ? c.qtyRequired : ((c.qtyPerMachine || 1) * (wo.quantity || 1));
          const issued = c.issuedQty || 0;
          const unissued = Math.max(0, req - issued);
          const stock = itemObj ? (itemObj.inHouseStock || 0) : 0;
          return {
            itemId: c.itemId || itemObj?.id || '',
            itemCode: c.itemCode || itemObj?.itemCode || '',
            itemName: c.itemName || itemObj?.name || '',
            totalRequiredQty: req,
            issuedQty: issued,
            unissuedQty: unissued,
            unit: c.unit || itemObj?.unit || 'PCS',
            inHouseStock: stock
          };
        });

        const totalItemsCount = comps.length;
        const fullyIssuedItemsCount = comps.filter(c => c.unissuedQty === 0).length;
        const isFullyIssued = totalItemsCount > 0 && fullyIssuedItemsCount === totalItemsCount;

        const refNo = wo.workOrderNo || (wo as any).woNumber || wo.id;
        const headerSearchStr = `${refNo} ${wo.machineModel} ${wo.customerName || ''} ${wo.assignedLead || ''}`.toLowerCase();
        const componentSearchList = comps.map(c => `${c.itemCode} ${c.itemName}`.toLowerCase());

        list.push({
          id: wo.id,
          cardType: 'WORK_ORDER',
          refNumber: refNo,
          title: wo.machineModel,
          itemCode: wo.machineModel,
          targetQuantity: wo.quantity || wo.targetQuantity || 1,
          date: wo.orderDate || wo.startDate || '',
          assignedTo: wo.assignedLead,
          rawObject: wo,
          components: comps,
          totalItemsCount,
          fullyIssuedItemsCount,
          isFullyIssued,
          headerSearchStr,
          componentSearchList
        });
      });

    return list;
  }, [jobCards, workOrders, itemMap]);

  // Filtered Active Cards (excluding already fully issued cards, which move to history!)
  const filteredActiveCards = useMemo(() => {
    const cleanSearch = deferredSearchTerm.trim().toLowerCase();
    const tokens = cleanSearch ? cleanSearch.split(/\s+/).filter(Boolean) : [];

    return activeCardsList.filter(card => {
      // Auto-move fully issued cards to History tab
      if (card.isFullyIssued) return false;

      if (sourceTypeFilter === 'JOB_CARDS' && card.cardType !== 'JOB_CARD') return false;
      if (sourceTypeFilter === 'WORK_ORDERS' && card.cardType !== 'WORK_ORDER') return false;

      if (tokens.length > 0) {
        // 1. Matches card header (WO number, Machine Model, Item Code, Lead, Customer)
        const matchesHeader = tokens.every(t => card.headerSearchStr.includes(t));
        if (matchesHeader) return true;

        // 2. Matches any individual child component completely
        const matchesAnyComponent = card.componentSearchList.some(compStr => 
          tokens.every(t => compStr.includes(t))
        );
        if (matchesAnyComponent) return true;

        return false;
      }
      return true;
    });
  }, [activeCardsList, sourceTypeFilter, deferredSearchTerm]);

  // Completed / Fully Issued Cards for History
  const fullyIssuedCards = useMemo(() => {
    return activeCardsList.filter(card => card.isFullyIssued);
  }, [activeCardsList]);

  // Filtered Material Issue Records for History Tab
  const filteredHistoryRecords = useMemo(() => {
    const term = deferredHistorySearchTerm.trim().toLowerCase();
    if (!term) return materialIssueRecords;
    const tokens = term.split(/\s+/).filter(Boolean);

    return materialIssueRecords.filter(rec => {
      const str = `${rec.issueNo} ${rec.referenceNo} ${rec.itemCode} ${rec.itemName} ${rec.issuedTo || ''} ${rec.issuedBy || ''} ${rec.notes || ''}`.toLowerCase();
      return tokens.every(t => str.includes(t));
    });
  }, [materialIssueRecords, deferredHistorySearchTerm]);

  // Filtered Reissues for Tab 3
  const filteredReissues = useMemo(() => {
    const term = deferredReissueSearchTerm.trim().toLowerCase();
    if (!term) return jobCardMaterialReissues;
    const tokens = term.split(/\s+/).filter(Boolean);

    return jobCardMaterialReissues.filter(rei => {
      const str = `${rei.reissueNo} ${rei.jobCardNo || ''} ${rei.woNumber || ''} ${rei.itemCode} ${rei.itemName} ${rei.reason} ${rei.workerName || ''} ${rei.supervisorName || ''} ${rei.notes || ''}`.toLowerCase();
      return tokens.every(t => str.includes(t));
    });
  }, [jobCardMaterialReissues, deferredReissueSearchTerm]);

  // Single Item Issue Handler
  const handleIssueSingleItem = (cardId: string, cardType: 'JOB_CARD' | 'WORK_ORDER', comp: any) => {
    const key = `${cardId}_${comp.itemId || comp.itemCode}`;
    const qtyToIssue = customIssueQtys[key] !== undefined ? customIssueQtys[key] : Math.min(comp.unissuedQty, comp.inHouseStock);
    const issuedTo = issuedToInputs[key] || currentUser?.fullName || 'Production Floor';

    if (qtyToIssue <= 0) {
      alert('Please enter a valid quantity greater than 0 to issue.');
      return;
    }

    if (qtyToIssue > comp.inHouseStock) {
      alert(`❌ Cannot issue ${qtyToIssue} ${comp.unit}. Available in-house stock is only ${comp.inHouseStock} ${comp.unit}.`);
      return;
    }

    if (qtyToIssue > comp.unissuedQty) {
      alert(`❌ Cannot issue ${qtyToIssue} ${comp.unit}. Only ${comp.unissuedQty} ${comp.unit} remaining unissued.`);
      return;
    }

    let ok = false;
    if (cardType === 'JOB_CARD') {
      ok = issueMaterialForJobCard(cardId, comp.itemId || comp.itemCode, qtyToIssue, issuedTo);
    } else {
      ok = issueMaterialForWorkOrder(cardId, comp.itemId || comp.itemCode, qtyToIssue, issuedTo);
    }

    if (ok) {
      // Clear inline inputs
      setCustomIssueQtys(prev => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      setIssuedToInputs(prev => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  // Issue All Available for a Card Handler
  const handleIssueAllAvailable = (cardId: string, cardType: 'JOB_CARD' | 'WORK_ORDER', refNumber: string) => {
    const userDisplay = currentUser?.fullName || 'Production Team';
    const count = issueAllAvailableForCard(cardType, cardId, userDisplay);
    if (count > 0) {
      alert(`✅ Successfully issued ${count} components from store for ${refNumber}!`);
    } else {
      alert(`⚠️ No available components could be issued. All items may already be issued, or stock is 0 in store.`);
    }
  };

  // Submit Re-Issue
  const handleCreateReissue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reissueTargetId || !reissueItemId || reissueQty <= 0) {
      alert('Please fill in all required fields and enter a quantity > 0.');
      return;
    }

    const itemObj = itemMap.get(reissueItemId);
    if (!itemObj) {
      alert('Selected item not found.');
      return;
    }

    if (reissueQty > (itemObj.inHouseStock || 0)) {
      alert(`❌ Cannot re-issue ${reissueQty} ${itemObj.unit}. Available in-house stock is only ${itemObj.inHouseStock || 0} ${itemObj.unit}.`);
      return;
    }

    let jcNo: string | undefined;
    let woNo: string | undefined;

    if (reissueTargetType === 'JOB_CARD') {
      const jc = jobCards.find(j => j.id === reissueTargetId);
      jcNo = jc?.jobCardNo;
      woNo = jc?.woNumber;
    } else {
      const wo = workOrders.find(w => w.id === reissueTargetId);
      woNo = wo?.workOrderNo || (wo as any)?.woNumber;
    }

    addJobCardMaterialReissue({
      jobCardId: reissueTargetType === 'JOB_CARD' ? reissueTargetId : undefined,
      jobCardNo: jcNo,
      woId: reissueTargetType === 'WORK_ORDER' ? reissueTargetId : undefined,
      woNumber: woNo,
      itemId: itemObj.id,
      itemCode: itemObj.itemCode,
      itemName: itemObj.name,
      quantity: reissueQty,
      unit: itemObj.unit || 'PCS',
      reason: reissueReason,
      notes: reissueNotes,
      status: 'ISSUED',
      workerName: currentUser?.fullName || 'Production Floor',
      supervisorName: currentUser?.fullName || 'Store Supervisor',
      issuedDate: new Date().toISOString().split('T')[0]
    });

    setIsReissueModalOpen(false);
    setReissueTargetId('');
    setReissueItemId('');
    setReissueQty(1);
    setReissueNotes('');
    alert('✅ Material Re-Issue logged and inventory stock deducted successfully!');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', height: '100%', minHeight: 0 }}>
      {/* Top Header & Routing Tabs */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', flexShrink: 0 }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Package size={22} color="var(--accent-primary)" />
            Store Material Issue & Re-Issue
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
            Issue raw materials & components from Store for active Job Cards and Work Orders without premature stock deduction.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button 
            type="button" 
            className="btn btn-outline" 
            onClick={() => setIsPrintListOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.82rem' }}
            title="Print store material issuance report"
          >
            <Printer size={14} /> Print Issue Register
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', gap: '0.35rem', backgroundColor: 'var(--bg-tertiary)', padding: '0.35rem', borderRadius: '0.5rem', flexWrap: 'wrap', flexShrink: 0 }}>
        <button
          className={`btn ${activeTab === 'ACTIVE_CARDS' ? 'btn-primary' : 'btn-outline'}`}
          style={{ padding: '0.4rem 0.9rem', fontSize: '0.82rem', border: 'none' }}
          onClick={() => setActiveTab('ACTIVE_CARDS')}
        >
          <ClipboardList size={14} /> Active Issuance Cards ({filteredActiveCards.length})
        </button>

        <button
          className={`btn ${activeTab === 'ISSUE_HISTORY' ? 'btn-primary' : 'btn-outline'}`}
          style={{ padding: '0.4rem 0.9rem', fontSize: '0.82rem', border: 'none' }}
          onClick={() => setActiveTab('ISSUE_HISTORY')}
        >
          <History size={14} /> Issue History & Vouchers ({materialIssueRecords.length})
        </button>

        <button
          className={`btn ${activeTab === 'REISSUES' ? 'btn-primary' : 'btn-outline'}`}
          style={{ padding: '0.4rem 0.9rem', fontSize: '0.82rem', border: 'none' }}
          onClick={() => setActiveTab('REISSUES')}
        >
          <ShieldAlert size={14} /> Material Re-Issues ({jobCardMaterialReissues.length})
        </button>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: ACTIVE ISSUANCE CARDS                              */}
      {/* ========================================================= */}
      {activeTab === 'ACTIVE_CARDS' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1, minHeight: 0 }}>
          {/* Filter Toolbar */}
          <div className="card" style={{ padding: '0.65rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.65rem', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, marginRight: '0.25rem' }}>Source:</span>
              <button
                type="button"
                className={`btn ${sourceTypeFilter === 'ALL' ? 'btn-primary' : 'btn-outline'}`}
                style={{ padding: '0.25rem 0.65rem', fontSize: '0.78rem' }}
                onClick={() => setSourceTypeFilter('ALL')}
              >
                All Cards
              </button>
              <button
                type="button"
                className={`btn ${sourceTypeFilter === 'JOB_CARDS' ? 'btn-primary' : 'btn-outline'}`}
                style={{ padding: '0.25rem 0.65rem', fontSize: '0.78rem' }}
                onClick={() => setSourceTypeFilter('JOB_CARDS')}
              >
                Job Cards Only
              </button>
              <button
                type="button"
                className={`btn ${sourceTypeFilter === 'WORK_ORDERS' ? 'btn-primary' : 'btn-outline'}`}
                style={{ padding: '0.25rem 0.65rem', fontSize: '0.78rem' }}
                onClick={() => setSourceTypeFilter('WORK_ORDERS')}
              >
                Work Orders Only
              </button>
            </div>

            <div style={{ position: 'relative', width: '280px', maxWidth: '100%' }}>
              <Search size={14} style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search Cards or Components..."
                className="input-field"
                style={{ paddingLeft: '2rem', paddingRight: '0.5rem', paddingTop: '0.25rem', paddingBottom: '0.25rem', fontSize: '0.78rem', width: '100%' }}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Cards List Container */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {filteredActiveCards.length === 0 ? (
              <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                <CheckCircle2 size={42} color="var(--success)" style={{ opacity: 0.8, marginBottom: '0.75rem' }} />
                <h3 style={{ fontWeight: 800, margin: '0 0 0.4rem 0' }}>All Materials Fully Issued!</h3>
                <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', maxWidth: '460px', margin: '0 auto' }}>
                  No pending active cards require store materials. As soon as a Job Card or Work Order has all its materials issued, it automatically moves to History.
                </p>
              </div>
            ) : (
              filteredActiveCards.map(card => {
                const isExpanded = !!expandedCards[card.id]; // default collapsed
                const pct = card.totalItemsCount > 0 ? Math.round((card.fullyIssuedItemsCount / card.totalItemsCount) * 100) : 100;

                return (
                  <div key={card.id} className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                    {/* Card Header Banner */}
                    <div 
                      style={{ 
                        padding: '0.65rem 1rem', 
                        backgroundColor: 'var(--bg-tertiary)', 
                        borderBottom: isExpanded ? '1px solid var(--border-color)' : 'none',
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '0.75rem',
                        cursor: 'pointer'
                      }}
                      onClick={() => toggleCardExpanded(card.id)}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span style={{ color: 'var(--text-muted)' }}>
                          {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                        </span>

                        <span className={`badge ${card.cardType === 'JOB_CARD' ? 'badge-success' : 'badge-primary'}`} style={{ fontSize: '0.72rem', fontWeight: 800 }}>
                          {card.cardType === 'JOB_CARD' ? 'JOB CARD' : 'WORK ORDER'}
                        </span>

                        <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '0.92rem', color: 'var(--accent-primary)' }}>
                          {card.refNumber}
                        </span>

                        <span style={{ fontWeight: 700, fontSize: '0.86rem' }}>
                          {card.title}
                        </span>

                        <span style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                          • Target Qty: <strong>{card.targetQuantity}</strong>
                        </span>

                        {card.assignedTo && (
                          <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                            • Lead: {card.assignedTo}
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }} onClick={(e) => e.stopPropagation()}>
                        {/* Progress Badge */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <div style={{ width: '80px', height: '8px', backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                            <div style={{ width: `${pct}%`, height: '100%', backgroundColor: pct === 100 ? 'var(--success)' : 'var(--accent-primary)' }} />
                          </div>
                          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: pct === 100 ? 'var(--success)' : 'var(--text-secondary)' }}>
                            {card.fullyIssuedItemsCount}/{card.totalItemsCount} Issued ({pct}%)
                          </span>
                        </div>

                        {/* Issue All Available Button */}
                        <button
                          type="button"
                          className="btn btn-primary"
                          style={{ padding: '0.25rem 0.65rem', fontSize: '0.74rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                          onClick={() => handleIssueAllAvailable(card.id, card.cardType, card.refNumber)}
                          title="Instantly issue all materials that have sufficient in-house stock in Store"
                        >
                          <Sparkles size={13} /> Issue All Available
                        </button>
                      </div>
                    </div>

                    {/* Card Body - Components Table */}
                    {isExpanded && (
                      <div className="table-container" style={{ margin: 0, border: 'none', borderRadius: 0 }}>
                        <table>
                          <thead>
                            <tr>
                              <th style={{ width: '30px' }}>#</th>
                              <th>Item Code</th>
                              <th>Description</th>
                              <th style={{ textAlign: 'right' }}>Total Req</th>
                              <th style={{ textAlign: 'right' }}>Issued</th>
                              <th style={{ textAlign: 'right' }}>Pending</th>
                              <th style={{ textAlign: 'right' }}>Store Stock</th>
                              <th style={{ width: '130px', textAlign: 'center' }}>Issue Qty</th>
                              <th style={{ width: '150px' }}>Issued To</th>
                              <th style={{ textAlign: 'center', width: '100px' }}>Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {card.components.map((comp, cIdx) => {
                              const key = `${card.id}_${comp.itemId || comp.itemCode}`;
                              const isLineDone = comp.unissuedQty === 0;
                              const currentInputQty = customIssueQtys[key] !== undefined ? customIssueQtys[key] : Math.min(comp.unissuedQty, comp.inHouseStock);
                              const currentIssuedTo = issuedToInputs[key] || '';

                              return (
                                <tr key={cIdx} style={{ backgroundColor: isLineDone ? 'rgba(34, 197, 94, 0.04)' : comp.inHouseStock < comp.unissuedQty ? 'rgba(239, 68, 68, 0.04)' : 'transparent' }}>
                                  <td>{cIdx + 1}</td>
                                  <td style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--accent-primary)' }}>
                                    {comp.itemCode}
                                  </td>
                                  <td style={{ fontWeight: 600 }}>{comp.itemName}</td>
                                  <td style={{ textAlign: 'right', fontWeight: 700 }}>
                                    {comp.totalRequiredQty} {comp.unit}
                                  </td>
                                  <td style={{ textAlign: 'right', color: comp.issuedQty > 0 ? 'var(--success)' : 'var(--text-muted)', fontWeight: 600 }}>
                                    {comp.issuedQty} {comp.unit}
                                  </td>
                                  <td style={{ textAlign: 'right', fontWeight: 800, color: isLineDone ? 'var(--success)' : 'var(--danger)' }}>
                                    {comp.unissuedQty} {comp.unit}
                                  </td>
                                  <td style={{ textAlign: 'right', fontWeight: 700, color: comp.inHouseStock >= comp.unissuedQty ? 'var(--success)' : comp.inHouseStock > 0 ? '#d97706' : 'var(--danger)' }}>
                                    {comp.inHouseStock} {comp.unit}
                                    {comp.inHouseStock < comp.unissuedQty && (
                                      <span style={{ display: 'block', fontSize: '0.65rem', color: 'var(--danger)' }}>
                                        Short: {comp.unissuedQty - comp.inHouseStock}
                                      </span>
                                    )}
                                  </td>
                                  <td style={{ textAlign: 'center' }}>
                                    {!isLineDone ? (
                                      <input
                                        type="number"
                                        min="1"
                                        max={Math.min(comp.unissuedQty, comp.inHouseStock)}
                                        className="input-field"
                                        style={{ width: '85px', textAlign: 'right', padding: '0.15rem 0.4rem', fontSize: '0.78rem' }}
                                        value={currentInputQty}
                                        title={`Max allowed: ${Math.min(comp.unissuedQty, comp.inHouseStock)} ${comp.unit} (Cannot exceed required: ${comp.totalRequiredQty} ${comp.unit})`}
                                        onChange={(e) => {
                                          const val = Number(e.target.value);
                                          const maxLimit = Math.min(comp.unissuedQty, comp.inHouseStock);
                                          const clamped = isNaN(val) ? 0 : Math.max(0, Math.min(val, maxLimit));
                                          setCustomIssueQtys(prev => ({ ...prev, [key]: clamped }));
                                        }}
                                        disabled={comp.inHouseStock === 0}
                                      />
                                    ) : (
                                      <span style={{ fontSize: '0.74rem', color: 'var(--success)', fontWeight: 700 }}>
                                        ✓ Completed
                                      </span>
                                    )}
                                  </td>
                                  <td>
                                    {!isLineDone && (
                                      <input
                                        type="text"
                                        placeholder="Operator/Floor..."
                                        className="input-field"
                                        style={{ width: '100%', padding: '0.15rem 0.4rem', fontSize: '0.74rem' }}
                                        value={currentIssuedTo}
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          setIssuedToInputs(prev => ({ ...prev, [key]: val }));
                                        }}
                                        disabled={comp.inHouseStock === 0}
                                      />
                                    )}
                                  </td>
                                  <td style={{ textAlign: 'center' }}>
                                    {!isLineDone ? (
                                      <button
                                        type="button"
                                        className="btn btn-success"
                                        style={{ padding: '0.2rem 0.55rem', fontSize: '0.72rem', fontWeight: 700 }}
                                        onClick={() => handleIssueSingleItem(card.id, card.cardType, comp)}
                                        disabled={comp.inHouseStock === 0 || currentInputQty <= 0}
                                        title={comp.inHouseStock === 0 ? 'No stock available in store' : 'Issue material from store'}
                                      >
                                        Issue
                                      </button>
                                    ) : (
                                      <span className="badge badge-success" style={{ fontSize: '0.68rem' }}>
                                        Fully Issued
                                      </span>
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
      {/* TAB 2: ISSUE HISTORY & VOUCHERS                           */}
      {/* ========================================================= */}
      {activeTab === 'ISSUE_HISTORY' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1, minHeight: 0 }}>
          {/* Search & Stats Bar */}
          <div className="card" style={{ padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.84rem', fontWeight: 800 }}>
                Material Issuance Ledger ({materialIssueRecords.length} Transactions)
              </span>
              <span className="badge badge-primary" style={{ fontSize: '0.74rem' }}>
                {fullyIssuedCards.length} Fully Issued Cards in History
              </span>
            </div>

            <div style={{ position: 'relative', width: '280px', maxWidth: '100%' }}>
              <Search size={14} style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search Voucher, Item, Card No..."
                className="input-field"
                style={{ paddingLeft: '2rem', paddingRight: '0.5rem', paddingTop: '0.25rem', paddingBottom: '0.25rem', fontSize: '0.78rem', width: '100%' }}
                value={historySearchTerm}
                onChange={(e) => setHistorySearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Records Table */}
          <div className="table-container" style={{ flex: 1, overflowY: 'auto' }}>
            {filteredHistoryRecords.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                <History size={38} style={{ opacity: 0.3, marginBottom: '0.75rem' }} />
                <h4 style={{ fontWeight: 700, margin: '0 0 0.4rem 0' }}>No Material Issue Records Found</h4>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  As materials are issued to Job Cards or Work Orders, issue vouchers and inventory audit logs will appear here.
                </p>
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th style={{ width: '30px' }}>#</th>
                    <th>Voucher No</th>
                    <th>Date</th>
                    <th>Target Type</th>
                    <th>Card Ref No</th>
                    <th>Item Code</th>
                    <th>Item Description</th>
                    <th style={{ textAlign: 'right' }}>Issued Qty</th>
                    <th>Issued To</th>
                    <th>Issued By</th>
                    <th>Notes</th>
                    <th style={{ textAlign: 'center', width: '70px' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHistoryRecords.map((rec, idx) => (
                    <tr key={rec.id}>
                      <td>{idx + 1}</td>
                      <td style={{ fontFamily: 'monospace', fontWeight: 800, color: 'var(--accent-primary)' }}>
                        {rec.issueNo}
                      </td>
                      <td style={{ fontSize: '0.76rem', whiteSpace: 'nowrap' }}>
                        {rec.issuedDate}
                      </td>
                      <td>
                        <span className={`badge ${rec.type === 'JOB_CARD' ? 'badge-success' : 'badge-primary'}`} style={{ fontSize: '0.68rem' }}>
                          {rec.type === 'JOB_CARD' ? 'Job Card' : 'Work Order'}
                        </span>
                      </td>
                      <td style={{ fontFamily: 'monospace', fontWeight: 700 }}>
                        {rec.referenceNo}
                      </td>
                      <td style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {rec.itemCode}
                      </td>
                      <td style={{ fontWeight: 600 }}>{rec.itemName}</td>
                      <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--success)' }}>
                        {rec.issuedQty} {rec.unit}
                      </td>
                      <td>{rec.issuedTo || '-'}</td>
                      <td style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>{rec.issuedBy}</td>
                      <td style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>{rec.notes || '-'}</td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          className="btn btn-outline"
                          style={{ padding: '0.2rem 0.45rem', fontSize: '0.72rem' }}
                          title="Print Material Issue Slip (A4 Portrait)"
                          onClick={() => setPrintRecord(rec)}
                        >
                          <Printer size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: CENTRALIZED MATERIAL RE-ISSUE                      */}
      {/* ========================================================= */}
      {activeTab === 'REISSUES' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1, minHeight: 0 }}>
          <div className="card" style={{ padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', flexShrink: 0 }}>
            <div>
              <span style={{ fontSize: '0.84rem', fontWeight: 800 }}>
                Material Re-Issue Log ({jobCardMaterialReissues.length} Re-Issues)
              </span>
              <p style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
                Re-issues for replacement parts due to scrap, machine damage, or shop-floor rework across all Job Cards and Work Orders.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', width: '260px', maxWidth: '100%' }}>
                <Search size={14} style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="Search Re-Issues (No, Item, Reason)..."
                  className="input-field"
                  style={{ paddingLeft: '2rem', paddingRight: '0.5rem', paddingTop: '0.25rem', paddingBottom: '0.25rem', fontSize: '0.78rem', width: '100%' }}
                  value={reissueSearchTerm}
                  onChange={(e) => setReissueSearchTerm(e.target.value)}
                />
              </div>

              <button
                type="button"
                className="btn btn-warning"
                onClick={() => setIsReissueModalOpen(true)}
                style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
              >
                <ShieldAlert size={14} /> + New Material Re-Issue
              </button>
            </div>
          </div>

          <div className="table-container" style={{ flex: 1, overflowY: 'auto' }}>
            {filteredReissues.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                <ShieldAlert size={38} style={{ opacity: 0.3, marginBottom: '0.75rem' }} />
                <h4 style={{ fontWeight: 700, margin: '0 0 0.4rem 0' }}>
                  {reissueSearchTerm ? 'No Matching Re-Issues Found' : 'No Material Re-Issues Logged'}
                </h4>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  {reissueSearchTerm 
                    ? 'Try adjusting your search keywords.' 
                    : 'Use the "+ New Material Re-Issue" button to log replacement parts issued for damaged, lost, or reworked materials.'}
                </p>
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th style={{ width: '30px' }}>#</th>
                    <th>Reissue No</th>
                    <th>Date</th>
                    <th>Card / WO Reference</th>
                    <th>Item Code</th>
                    <th>Item Description</th>
                    <th style={{ textAlign: 'right' }}>Qty</th>
                    <th>Reason</th>
                    <th>Worker / Floor</th>
                    <th>Supervisor</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReissues.map((rei, idx) => (
                    <tr key={rei.id}>
                      <td>{idx + 1}</td>
                      <td style={{ fontFamily: 'monospace', fontWeight: 800, color: 'var(--danger)' }}>
                        {rei.reissueNo}
                      </td>
                      <td style={{ fontSize: '0.76rem' }}>{rei.issuedDate}</td>
                      <td style={{ fontWeight: 700 }}>
                        {rei.jobCardNo ? `JC: ${rei.jobCardNo}` : rei.woNumber ? `WO: ${rei.woNumber}` : '-'}
                      </td>
                      <td style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--accent-primary)' }}>
                        {rei.itemCode}
                      </td>
                      <td style={{ fontWeight: 600 }}>{rei.itemName}</td>
                      <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--danger)' }}>
                        {rei.quantity} {rei.unit}
                      </td>
                      <td>
                        <span className={`badge ${rei.reason === 'SCRAP' ? 'badge-danger' : rei.reason === 'IN_HOUSE_REWORK' ? 'badge-warning' : 'badge-neutral'}`} style={{ fontSize: '0.68rem' }}>
                          {rei.reason}
                        </span>
                      </td>
                      <td>{rei.workerName || '-'}</td>
                      <td>{rei.supervisorName || '-'}</td>
                      <td style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>{rei.notes || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: NEW MATERIAL RE-ISSUE                              */}
      {/* ========================================================= */}
      {isReissueModalOpen && (
        <div className="modal-overlay" style={{ zIndex: 100 }}>
          <div className="modal-content" style={{ maxWidth: '520px', padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShieldAlert size={18} color="var(--warning)" />
                Issue Replacement / Re-Issue Material
              </h3>
              <button type="button" style={{ background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => setIsReissueModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateReissue} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, display: 'block', marginBottom: '0.25rem' }}>Target Type:</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    className={`btn ${reissueTargetType === 'JOB_CARD' ? 'btn-primary' : 'btn-outline'}`}
                    style={{ flex: 1, fontSize: '0.78rem', padding: '0.35rem' }}
                    onClick={() => { setReissueTargetType('JOB_CARD'); setReissueTargetId(''); }}
                  >
                    Job Card
                  </button>
                  <button
                    type="button"
                    className={`btn ${reissueTargetType === 'WORK_ORDER' ? 'btn-primary' : 'btn-outline'}`}
                    style={{ flex: 1, fontSize: '0.78rem', padding: '0.35rem' }}
                    onClick={() => { setReissueTargetType('WORK_ORDER'); setReissueTargetId(''); }}
                  >
                    Work Order
                  </button>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, display: 'block', marginBottom: '0.25rem' }}>
                  Select {reissueTargetType === 'JOB_CARD' ? 'Job Card' : 'Work Order'} *:
                </label>
                <select
                  className="input-field"
                  style={{ width: '100%', fontSize: '0.8rem' }}
                  value={reissueTargetId}
                  onChange={(e) => setReissueTargetId(e.target.value)}
                  required
                >
                  <option value="">-- Choose {reissueTargetType === 'JOB_CARD' ? 'Job Card' : 'Work Order'} --</option>
                  {reissueTargetType === 'JOB_CARD' ? (
                    jobCards.filter(jc => !jc.isDeleted).map(jc => (
                      <option key={jc.id} value={jc.id}>
                        {jc.jobCardNo} - {jc.itemName || jc.itemCode} (Qty: {jc.targetQuantity})
                      </option>
                    ))
                  ) : (
                    workOrders.filter(w => !w.isDeleted).map(wo => (
                      <option key={wo.id} value={wo.id}>
                        {wo.workOrderNo || (wo as any).woNumber} - {wo.machineModel} (Qty: {wo.quantity || wo.targetQuantity || 1})
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, display: 'block', marginBottom: '0.25rem' }}>Select Component to Re-Issue *:</label>
                <select
                  className="input-field"
                  style={{ width: '100%', fontSize: '0.8rem' }}
                  value={reissueItemId}
                  onChange={(e) => setReissueItemId(e.target.value)}
                  required
                >
                  <option value="">-- Choose Item from Inventory --</option>
                  {items.map(it => (
                    <option key={it.id} value={it.id}>
                      {it.itemCode} - {it.name} (Stock: {it.inHouseStock || 0} {it.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, display: 'block', marginBottom: '0.25rem' }}>Quantity to Re-Issue *:</label>
                  <input
                    type="number"
                    min="1"
                    className="input-field"
                    style={{ width: '100%', fontSize: '0.8rem' }}
                    value={reissueQty}
                    onChange={(e) => setReissueQty(Number(e.target.value))}
                    required
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, display: 'block', marginBottom: '0.25rem' }}>Reason for Re-Issue *:</label>
                  <select
                    className="input-field"
                    style={{ width: '100%', fontSize: '0.8rem' }}
                    value={reissueReason}
                    onChange={(e) => setReissueReason(e.target.value as any)}
                  >
                    <option value="SCRAP">Scrap / Machining Damage</option>
                    <option value="IN_HOUSE_REWORK">In-House Rework</option>
                    <option value="VENDOR_REWORK">Vendor Rework</option>
                    <option value="OTHER">Other Floor Loss</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, display: 'block', marginBottom: '0.25rem' }}>Notes / Root Cause Description:</label>
                <textarea
                  className="input-field"
                  rows={2}
                  style={{ width: '100%', fontSize: '0.8rem' }}
                  placeholder="e.g., Part cracked during pressing operation..."
                  value={reissueNotes}
                  onChange={(e) => setReissueNotes(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setIsReissueModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-warning"
                  style={{ fontWeight: 700 }}
                >
                  Confirm & Issue Material
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PRINT PREVIEW MODAL - SINGLE ISSUE SLIP */}
      {printRecord && (
        <PrintManagerModal
          documentTitle={`Material_Issue_${printRecord.issueNo || printRecord.id}`}
          onClose={() => setPrintRecord(null)}
          orientation="portrait"
        >
          <SingleMaterialIssuePrintView record={printRecord} />
        </PrintManagerModal>
      )}

      {/* PRINT PREVIEW MODAL - ISSUE HISTORY REGISTER */}
      {isPrintListOpen && (
        <PrintManagerModal
          documentTitle="Material_Issue_Register"
          onClose={() => setIsPrintListOpen(false)}
          orientation="portrait"
        >
          <MaterialIssueListPrintView records={filteredHistoryRecords} />
        </PrintManagerModal>
      )}
    </div>
  );
};
