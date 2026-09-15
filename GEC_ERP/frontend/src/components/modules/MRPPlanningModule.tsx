import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import { ShoppingCart, Search, FileSpreadsheet } from 'lucide-react';
import { MRPShortageItem } from '../../types/erp';

export const MRPPlanningModule: React.FC = () => {
  const { items, purchaseOrders, workOrders, jobCards, jobworks, setActiveModule, addPurchaseOrder, vendors, searchTerm, setSearchTerm, itemProcessCards } = useERP();

  // Explode required components from active Work Orders and Job Cards
  const activeWOs = workOrders.filter(w => w.status === 'IN_PROGRESS' || w.status === 'PLANNED');
  const activeJCs = jobCards.filter(jc => jc.status !== 'COMPLETED' && jc.status !== 'CANCELLED' && !(jc as any).isDeleted);
  const activeJWs = jobworks.filter(jw => jw.status !== 'COMPLETED' && jw.status !== 'CANCELLED');

  const mrpResults: MRPShortageItem[] = items
    .filter(item => item.category !== 'Final Machine Unit')
    .map(item => {
      // 1. Calculate total required across active Work Orders
      let requiredForActiveWOs = 0;
      activeWOs.forEach(wo => {
        const woComp = (wo.woComponents || []).find(c => c.itemId === item.id || c.itemCode === item.itemCode);
        if (woComp) {
          requiredForActiveWOs += woComp.qtyRequired;
        }
      });

      // 2. Calculate Job Card component demand
      let requiredForActiveJCs = 0;
      activeJCs.forEach(jc => {
        const remaining = Math.max(0, (jc.targetQuantity || 1) - (jc.completedQuantity || 0));
        if (jc.itemId === item.id || jc.itemCode === item.itemCode) {
          requiredForActiveJCs += remaining;
        }
        if (jc.components) {
          jc.components.forEach(c => {
            if (c.itemId === item.id || c.itemCode === item.itemCode) {
              requiredForActiveJCs += (c.qtyPerUnit || 1) * remaining;
            }
          });
        }
      });

      // 3. Calculate Job Work demand
      let requiredForActiveJWs = 0;
      activeJWs.forEach(jw => {
        if (jw.itemId === item.id || jw.itemCode === item.itemCode) {
          requiredForActiveJWs += (jw.pendingBalance !== undefined ? jw.pendingBalance : (jw.sentQuantity || 0));
        }
      });

      // 4. Calculate induced demand from Process Cards (if this item is the raw material input for an item in shortage)
      let requiredFromProcessCards = 0;
      (itemProcessCards || []).forEach(pc => {
        if (pc.rawItemId === item.id || (pc.rawItemCode && pc.rawItemCode.toLowerCase() === item.itemCode.toLowerCase())) {
          const parentComp = items.find(i => i.id === pc.itemId || (pc.itemCode && i.itemCode.toLowerCase() === pc.itemCode.toLowerCase()));
          if (parentComp) {
            let parentReq = 0;
            activeWOs.forEach(wo => {
              const woComp = (wo.woComponents || []).find(c => c.itemId === parentComp.id || c.itemCode === parentComp.itemCode);
              if (woComp) parentReq += woComp.qtyRequired;
            });
            activeJCs.forEach(jc => {
              const remaining = Math.max(0, (jc.targetQuantity || 1) - (jc.completedQuantity || 0));
              if (jc.itemId === parentComp.id || jc.itemCode === parentComp.itemCode) parentReq += remaining;
              if (jc.components) {
                jc.components.forEach(c => {
                  if (c.itemId === parentComp.id || c.itemCode === parentComp.itemCode) parentReq += (c.qtyPerUnit || 1) * remaining;
                });
              }
            });
            const parentInHouse = parentComp.inHouseStock || 0;
            const parentShortage = Math.max(0, parentReq - parentInHouse);
            if (parentShortage > 0) {
              requiredFromProcessCards += parentShortage;
            }
          }
        }
      });

      const totalRequired = requiredForActiveWOs + requiredForActiveJCs + requiredForActiveJWs + requiredFromProcessCards;
      const required = Math.max(totalRequired, (item.minStockQty || item.reorderLevel || 0));
      const inHouse = item.inHouseStock || 0;

      const openPOQty = purchaseOrders
        .filter(p => p.status === 'ISSUED' || p.status === 'PARTIALLY_RECEIVED' || p.status === 'APPROVED' || p.status === 'SENT')
        .reduce((sum, po) => {
          const poLine = po.items.find(i => i.itemId === item.id || i.itemCode === item.itemCode);
          return sum + (poLine ? ((poLine.quantity || poLine.orderedQty || 0) - (poLine.receivedQty || 0)) : 0);
        }, 0);

      const pendingJWQty = activeJWs
        .reduce((sum, jw) => (jw.itemId === item.id || jw.itemCode === item.itemCode) ? sum + (jw.pendingBalance ?? jw.sentQuantity ?? 0) : sum, 0);
      const pendingQCQty = item.pendingQCStock || 0;

      const totalPipeline = openPOQty + pendingJWQty + pendingQCQty;
      const netShortage = Math.max(0, required - (inHouse + totalPipeline));

      let action: MRPShortageItem['suggestedAction'] = 'STOCK_SUFFICIENT';
      if (netShortage > 0) {
        action = inHouse === 0 ? 'CRITICAL_SHORTAGE' : 'REORDER_NEEDED';
      }

      return {
        itemId: item.id,
        itemCode: item.itemCode,
        itemName: item.name,
        unit: item.unit,
        requiredQtyForBuild: required,
        currentInHouseStock: inHouse,
        pendingPOQuantity: openPOQty,
        netShortage,
        suggestedAction: action
      };
    });

  const filteredMRPResults = mrpResults.filter(r =>
    r.itemCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.itemName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const criticalShortages = mrpResults.filter(r => r.netShortage > 0);

  const handleAutoCreateDraftPO = () => {
    if (criticalShortages.length === 0) {
      alert('Stock is sufficient for active Work Orders! No shortage POs required.');
      return;
    }

    const defaultVendor = vendors[0];
    if (!defaultVendor) return;

    addPurchaseOrder({
      poNumber: `PO-MRP-AUTO-${Math.floor(1000 + Math.random() * 9000)}`,
      vendorId: defaultVendor.id,
      vendorName: defaultVendor.name,
      orderDate: new Date().toISOString().split('T')[0],
      deliveryDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
      items: criticalShortages.map(s => {
        const itemObj = items.find(i => i.id === s.itemId);
        return {
          itemId: s.itemId,
          itemCode: s.itemCode,
          itemName: s.itemName,
          quantity: s.netShortage,
          unitPrice: itemObj?.unitPrice || 1000,
          receivedQty: 0,
          amount: s.netShortage * (itemObj?.unitPrice || 1000)
        };
      }),
      notes: `Auto-generated MRP Purchase Order for active Work Orders`
    });

    alert(`Successfully generated Draft Purchase Order for ${criticalShortages.length} shortage component(s)! Redirecting to Purchase Orders...`);
    setActiveModule('purchase-orders');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>MRP & Material Shortage Planning</h2>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {criticalShortages.length > 0 && (
            <button className="btn btn-primary" onClick={handleAutoCreateDraftPO}>
              <ShoppingCart size={16} /> 1-Click Auto PO for {criticalShortages.length} Shortage Item(s)
            </button>
          )}
        </div>
      </div>

      <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1.5rem', backgroundColor: 'var(--bg-card)' }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Active Work Orders Material Breakdown</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Exploding BOM requirements + Custom WO extra tools across {activeWOs.length} active Work Orders
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Critical Shortages</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: criticalShortages.length > 0 ? 'var(--danger)' : 'var(--success)' }}>
            {criticalShortages.length} Component(s)
          </div>
        </div>
      </div>

      {/* Inline Search Bar */}
      <div className="card" style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', backgroundColor: 'var(--bg-card)' }}>
        <div style={{ position: 'relative', width: '360px' }}>
          <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search shortage item code, component name..."
            className="input-field"
            style={{ paddingLeft: '2.25rem' }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Item Code</th>
              <th>Component Name</th>
              <th>Required for Active WOs</th>
              <th>In-House Stock</th>
              <th>Pending PO Qty</th>
              <th>Net Shortage Qty</th>
              <th>Suggested Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredMRPResults.map(res => (
              <tr key={res.itemId}>
                <td style={{ fontWeight: 700, color: 'var(--accent-primary)', fontFamily: 'monospace' }}>
                  {res.itemCode}
                </td>
                <td style={{ fontWeight: 600 }}>{res.itemName}</td>
                <td style={{ fontWeight: 700 }}>
                  {res.requiredQtyForBuild} {res.unit}
                </td>
                <td style={{ color: 'var(--text-primary)' }}>
                  {res.currentInHouseStock} {res.unit}
                </td>
                <td style={{ color: 'var(--warning)', fontWeight: 600 }}>
                  +{res.pendingPOQuantity} {res.unit}
                </td>
                <td style={{ fontWeight: 800, color: res.netShortage > 0 ? 'var(--danger)' : 'var(--success)', fontSize: '0.95rem' }}>
                  {res.netShortage > 0 ? `${res.netShortage} ${res.unit}` : '0 (Sufficient)'}
                </td>
                <td>
                  <span className={`badge ${
                    res.suggestedAction === 'STOCK_SUFFICIENT' ? 'badge-success' :
                    res.suggestedAction === 'CRITICAL_SHORTAGE' ? 'badge-danger' : 'badge-warning'
                  }`}>
                    {res.suggestedAction.replace('_', ' ')}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
};
