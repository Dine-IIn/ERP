import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import { 
  AlertTriangle, Filter, Printer, ChevronRight, ChevronDown, 
  Layers, Package, Truck, ClipboardList, ShoppingCart, Search, RefreshCw, CheckCircle, Split, ArrowUpDown, ArrowUp, ArrowDown, X 
} from 'lucide-react';
import { WorkOrder, BOM, Item, PurchaseOrder, JobworkChallan, JobCard } from '../../types/erp';

export const ShortageModule: React.FC = () => {
  const { 
    workOrders, boms, items, jobworks, jobCards, purchaseOrders, vendors,
    addPurchaseOrder, addJobworkChallan, addJobCard, setActiveModule 
  } = useERP();

  // Top Tabs
  const [activeTab, setActiveTab] = useState<'WO_SHORTAGE' | 'PO_SHORTAGE' | 'JOBCARD_SHORTAGE' | 'JOBWORK_SHORTAGE'>('WO_SHORTAGE');

  // Selected WOs Filter (empty means ALL)
  const [selectedWOIds, setSelectedWOIds] = useState<string[]>([]);
  
  // Expanded Tree Node Keys
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});

  // Simulation Quantities (key: woId or itemId -> simulated qty)
  const [simulatedQuantities, setSimulatedQuantities] = useState<Record<string, number>>({});

  // Dual Source Split Modal State
  const [dualModalData, setDualModalData] = useState<{
    item: Item;
    wo: WorkOrder;
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

  // Filtered WOs based on selection
  const relevantWOs = workOrders.filter(wo => {
    if (selectedWOIds.length > 0 && !selectedWOIds.includes(wo.id)) return false;
    return wo.status === 'IN_PROGRESS' || wo.status === 'PLANNED';
  });

  // Calculate Shortage Tree for a given WO
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

  // Filter based on active tab and processType
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

  // Action handlers from shortage
  const handleRaisePO = (item: Item, wo: WorkOrder, netShortage: number) => {
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
    alert(`✅ Purchase Order raised successfully for ${item.itemCode} (Qty: ${netShortage})!`);
  };

  const handleIssueJobwork = (item: Item, wo: WorkOrder, netShortage: number) => {
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
      processRequired: 'CNC Turning & Surface Hardening',
      issueDate: new Date().toISOString().split('T')[0],
      expectedReturnDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]
    });
    alert(`✅ Job Work Challan created successfully for ${item.itemCode} (Qty: ${netShortage})!`);
  };

  const handleIssueJobCard = (item: Item, wo: WorkOrder, netShortage: number) => {
    addJobCard({
      woId: wo.id,
      woNumber: wo.workOrderNo || wo.woNumber,
      itemId: item.id,
      itemCode: item.itemCode,
      itemName: item.name,
      itemType: item.category === 'FG' ? 'ASSEMBLY' : 'SUB_ASSEMBLY',
      targetQuantity: netShortage,
      completedQuantity: 0,
      assignedOperator: 'In-House Assembly Lead',
      stationName: 'Main In-house Sub-Assembly Bay',
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
    const { item, wo, netShortage, poQty, jwQty, vendorId, jwVendorId, processTypeChoice } = dualModalData;
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
      // Split Option
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

  // Native Print Handler for Visible Expanded Tree
  const handlePrintTree = () => {
    window.print();
  };

  return (
    <div className="module-layout-container">
      
      {/* Header */}
      <div className="sticky-module-header">
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
            <AlertTriangle size={20} color="var(--warning)" />
            Shortage Analytics & Planning Engine
          </h2>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Process Source Driven Routing &bull; Interactive Quantity Simulation &bull; Dual Source MOQ Split Engine
          </span>
        </div>

        <button className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.85rem' }} onClick={handlePrintTree}>
          <Printer size={15} />
          <span>Print Shortage Tree</span>
        </button>
      </div>

      {/* Top 4 Routing Tabs */}
      <div style={{ display: 'flex', gap: '0.35rem', backgroundColor: 'var(--bg-tertiary)', padding: '0.35rem', borderRadius: '0.5rem', flexWrap: 'wrap', flexShrink: 0 }}>
        <button 
          className={`btn ${activeTab === 'WO_SHORTAGE' ? 'btn-primary' : 'btn-outline'}`}
          style={{ padding: '0.4rem 0.9rem', fontSize: '0.82rem', border: 'none' }}
          onClick={() => setActiveTab('WO_SHORTAGE')}
        >
          <Layers size={14} /> Work Order Shortage (All Sources)
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
          <ClipboardList size={14} /> Job Card (In-house) Shortage
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="card" style={{ padding: '0.75rem 1rem', backgroundColor: 'var(--bg-card)', display: 'flex', flexDirection: 'column', gap: '0.5rem', flexShrink: 0 }}>
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
            const woKey = `wo-${wo.id}`;
            const isWOExpanded = expandedNodes[woKey] !== false;

            const filteredComponents = components.filter(c => {
              if (activeTab === 'PO_SHORTAGE') return c.processType === 'Brought out' || c.processType === 'Job work + Brought out';
              if (activeTab === 'JOBWORK_SHORTAGE') return c.processType === 'Job work' || c.processType === 'Job work + Brought out';
              if (activeTab === 'JOBCARD_SHORTAGE') return c.processType === 'In-house';
              return true;
            });

            return (
              <div key={wo.id} className="card" style={{ padding: '1rem', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
                
                {/* Level 1: Work Order Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-color)' }}>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer' }} onClick={() => toggleNode(woKey)}>
                    {isWOExpanded ? <ChevronDown size={18} color="var(--accent-primary)" /> : <ChevronRight size={18} color="var(--accent-primary)" />}
                    <div>
                      <span style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--accent-primary)', fontFamily: 'monospace' }}>
                        {wo.workOrderNo || wo.woNumber}
                      </span>
                      <span style={{ fontSize: '0.9rem', fontWeight: 700, marginLeft: '0.6rem', color: 'var(--text-primary)' }}>
                        {wo.machineModel}
                      </span>
                      <span className="badge badge-info" style={{ marginLeft: '0.6rem', fontSize: '0.72rem' }}>
                        {wo.stage || 'IN_PROGRESS'}
                      </span>
                    </div>
                  </div>

                  {/* Interactive Quantity Simulation Bar */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <label style={{ fontSize: '0.78rem', fontWeight: 700, margin: 0 }}>Simulate Build Qty:</label>
                    <input 
                      type="number" 
                      min="1" 
                      style={{ width: '65px', padding: '0.25rem 0.4rem', fontSize: '0.82rem', textAlign: 'center', fontWeight: 700 }}
                      className="input-field"
                      value={targetQty}
                      onChange={(e) => handleSimulatedQtyChange(wo.id, Number(e.target.value))}
                    />
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Units</span>
                  </div>
                </div>

                {/* Level 2: Component Breakdown */}
                {isWOExpanded && (
                  <div style={{ marginTop: '0.5rem' }}>
                    <table>
                      <thead>
                        <tr>
                          <th>Item Code & Description</th>
                          <th>Process Source</th>
                          <th>Per Unit Req</th>
                          <th>Total Needed ({targetQty} units)</th>
                          <th>In-House Stock</th>
                          <th>Jobwork Stock</th>
                          <th>Net Shortage</th>
                          <th>Action / Create</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredComponents.map((c, cIdx) => (
                          <tr key={c.itemId || cIdx} style={{ backgroundColor: c.isShortage ? 'rgba(239, 68, 68, 0.05)' : 'transparent' }}>
                            <td>
                              <div style={{ fontWeight: 700, color: 'var(--accent-primary)', fontFamily: 'monospace' }}>
                                {c.itemCode}
                              </div>
                              <div style={{ fontSize: '0.8rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                                {c.itemName}
                              </div>
                            </td>
                            <td>
                              <span className={`badge ${
                                c.processType === 'Brought out' ? 'badge-primary' :
                                c.processType === 'In-house' ? 'badge-success' :
                                c.processType === 'Job work' ? 'badge-warning' : 'badge-neutral'
                              }`}>
                                {c.processType}
                              </span>
                            </td>
                            <td style={{ fontWeight: 600 }}>{c.qtyPerMachine} {c.unit}</td>
                            <td style={{ fontWeight: 700 }}>{c.totalRequired} {c.unit}</td>
                            <td style={{ fontWeight: 600, color: c.inHouseStock > 0 ? 'var(--success)' : 'var(--danger)' }}>
                              {c.inHouseStock} {c.unit}
                            </td>
                            <td style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
                              {c.externalStock || 0} {c.unit}
                            </td>
                            <td style={{ fontWeight: 800, color: c.isShortage ? 'var(--danger)' : 'var(--success)' }}>
                              {c.isShortage ? `-${c.netShortage} ${c.unit}` : '0 (OK)'}
                            </td>
                            <td>
                              {c.isShortage && c.itemObj ? (
                                c.processType === 'Job work + Brought out' ? (
                                  <button 
                                    type="button"
                                    className="btn btn-primary"
                                    style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem', gap: '0.3rem' }}
                                    onClick={() => handleRaisePO(c.itemObj!, wo, c.netShortage)}
                                    title="Choose to raise PO, send for Job Work, or split quantities based on MOQ"
                                  >
                                    <Split size={13} /> Resolve Dual Source
                                  </button>
                                ) : c.processType === 'Brought out' ? (
                                  <button 
                                    type="button"
                                    className="btn btn-primary"
                                    style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem', gap: '0.3rem' }}
                                    onClick={() => handleRaisePO(c.itemObj!, wo, c.netShortage)}
                                  >
                                    <ShoppingCart size={13} /> Raise PO
                                  </button>
                                ) : c.processType === 'Job work' ? (
                                  <button 
                                    type="button"
                                    className="btn btn-outline"
                                    style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem', gap: '0.3rem', borderColor: 'var(--warning)', color: 'var(--warning)' }}
                                    onClick={() => handleIssueJobwork(c.itemObj!, wo, c.netShortage)}
                                  >
                                    <Truck size={13} /> Issue Job Work
                                  </button>
                                ) : (
                                  <button 
                                    type="button"
                                    className="btn btn-outline"
                                    style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem', gap: '0.3rem', borderColor: 'var(--success)', color: 'var(--success)' }}
                                    onClick={() => handleIssueJobCard(c.itemObj!, wo, c.netShortage)}
                                  >
                                    <ClipboardList size={13} /> Create Job Card
                                  </button>
                                )
                              ) : (
                                <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>Available</span>
                              )}
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

    </div>
  );
};
