import React, { useState, useEffect } from 'react';
import { CalendarRange, Plus, Search, AlertTriangle, ShieldCheck, BarChart2, Edit2, Trash2, Printer, FileSpreadsheet, AlertCircle, CheckCircle2 } from 'lucide-react';
import { apiClient, formatNumber } from '../../utils/apiService';
import { openLocalSheet, syncLocalSheet } from '../../utils/localSheetsService';

interface ProductionPlan {
  id: string;
  salesOrderId?: string;
  customerName: string;
  salesOrderNo: string;
  finishedProductId: string;
  finishedProductName: string;
  finishedProductCode: string;
  qtyToProduce: number;
  startDate: string;
  endDate: string;
  status: 'PENDING' | 'SCHEDULED' | 'RELEASED' | 'COMPLETED';
  bomId: string;
}

interface ProductionPlanningProps {
  salesOrders: any[];
  products: any[];
  customers?: any[];
}

export default function ProductionPlanning({ salesOrders = [], products = [], customers = [] }: ProductionPlanningProps) {
  const [activeTab, setActiveTab] = useState<'schedule' | 'mrp'>('schedule');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Mapped Sales Orders from props (resolving relational parameters dynamically)
  const activeSalesOrders = salesOrders.length > 0 ? salesOrders.map((so: any) => {
    if (so.customerName && so.product) return so;
    const customer = customers.find(c => c.id === so.customerId);
    const firstItem = so.items?.[0];
    const product = products.find(p => p.id === firstItem?.productId);
    return {
      id: so.id,
      orderNo: so.orderNo || 'SO-UNKNOWN',
      customerName: customer ? customer.name : 'Standard Customer',
      productId: firstItem?.productId || '',
      product: product ? product.name : 'Standard Product',
      code: product ? (product.code || 'PROD-CF90') : 'PROD-CF90',
      qty: firstItem ? (parseFloat(firstItem.quantity) || 10) : 10,
      items: so.items || []
    };
  }) : [];

  // Mapped Warehouse Stocks from products prop (simulating real stocks from Master Product catalog)
  const warehouseInventory = products.length > 0 ? products.map(p => ({
    id: p.id,
    name: p.name,
    code: p.hsnSacCode || p.code || 'MAT-01',
    available: p.stock || 0,
    minimumThreshold: p.reorderLevel || 10
  })) : [];

  // Load BOM Definitions from Backend
  const [bomDefinitions, setBomDefinitions] = useState<any[]>([]);

  const fetchBoms = async () => {
    try {
      const data = await apiClient.get<{ boms: any[] }>('/api/manufacturing/boms');
      setBomDefinitions(data.boms || []);
    } catch (err) {
      console.error('Failed to load BOMs:', err);
    }
  };

  // Production Plans - Initialized from Backend
  const [plansList, setPlansList] = useState<ProductionPlan[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const data = await apiClient.get<{ plans: any[] }>('/api/manufacturing/plans');
      const formatted = (data.plans || []).map((p: any) => ({
        id: p.id,
        salesOrderId: p.salesOrderId,
        customerName: p.salesOrder?.customer?.name || 'Walk-in Customer',
        salesOrderNo: p.salesOrder?.orderNo || 'Direct Plan',
        finishedProductId: p.finishedProductId,
        finishedProductName: p.finishedProduct?.name || 'Standard Product',
        finishedProductCode: p.finishedProduct?.hsnSacCode || p.finishedProduct?.code || 'PROD-CF90',
        qtyToProduce: p.qtyToProduce,
        startDate: p.startDate?.split('T')[0] || '',
        endDate: p.endDate?.split('T')[0] || '',
        status: p.status,
        bomId: p.bomId
      }));
      setPlansList(formatted);
    } catch (err) {
      console.error('Failed to fetch production plans:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
    fetchBoms();
  }, [salesOrders, products]);

  // Modal Schedule variables
  const [selectedSoId, setSelectedSoId] = useState('');
  const [planStartDate, setPlanStartDate] = useState('2026-06-01');
  const [planEndDate, setPlanEndDate] = useState('2026-06-10');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Independent planning states
  const [planType, setPlanType] = useState<'sales_order' | 'independent'>('sales_order');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [independentQty, setIndependentQty] = useState('10');
  const [selectedBomId, setSelectedBomId] = useState('');

  // Automatically select default BOM for the chosen product
  useEffect(() => {
    if (selectedProductId) {
      const boms = bomDefinitions.filter(bom => bom.finishedProductId === selectedProductId);
      if (boms.length > 0) {
        setSelectedBomId(boms[0].id);
      } else {
        setSelectedBomId('');
      }
    }
  }, [selectedProductId, bomDefinitions]);

  // Set default dropdown selections when catalog loads (filtering out already scheduled Sales Orders)
  useEffect(() => {
    const scheduledSoIds = plansList.map(p => p.salesOrderId).filter(Boolean);
    const selectable = activeSalesOrders.filter(so => isEditing ? so.id === selectedSoId : !scheduledSoIds.includes(so.id));
    if (selectable.length > 0) {
      if (!selectedSoId || (!isEditing && !selectable.some(s => s.id === selectedSoId))) {
        setSelectedSoId(selectable[0].id);
      }
    } else {
      setSelectedSoId('');
    }
  }, [activeSalesOrders, plansList, isEditing, selectedSoId]);

  const handleCreatePlanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let payload: any = {};
    if (planType === 'sales_order') {
      const activeSO = activeSalesOrders.find(so => so.id === selectedSoId);
      if (!activeSO) return;

      const finishedProductId = activeSO.productId;
      if (!finishedProductId) {
        alert("No target product found in the selected Sales Order.");
        return;
      }

      const matchedBOM = bomDefinitions.find(bom => bom.finishedProductId === finishedProductId);
      if (!matchedBOM) {
        alert(`No Bill of Materials (BOM) configured for product "${activeSO.product}". Please publish a BOM formulation first!`);
        return;
      }

      payload = {
        salesOrderId: selectedSoId,
        finishedProductId,
        qtyToProduce: Number(activeSO.qty),
        startDate: planStartDate,
        endDate: planEndDate,
        bomId: matchedBOM.id
      };
    } else {
      if (!selectedProductId) {
        alert("Please select a finished product.");
        return;
      }
      if (!independentQty || Number(independentQty) <= 0) {
        alert("Please enter a valid quantity.");
        return;
      }
      if (!selectedBomId) {
        alert("Please select a BOM formulation.");
        return;
      }

      payload = {
        salesOrderId: null,
        finishedProductId: selectedProductId,
        qtyToProduce: Number(independentQty),
        startDate: planStartDate,
        endDate: planEndDate,
        bomId: selectedBomId
      };
    }

    try {
      if (isEditing && editingId) {
        await apiClient.put(`/api/manufacturing/plans/${editingId}`, payload);
      } else {
        await apiClient.post('/api/manufacturing/plans', payload);
      }
      setShowAddModal(false);
      setIsEditing(false);
      setEditingId(null);
      fetchPlans();
    } catch (err: any) {
      alert(err.message || 'Failed to save plan');
    }
  };

  const handleReleaseToFactory = async (planId: string) => {
    try {
      await apiClient.post(`/api/manufacturing/plans/${planId}/release`);
      fetchPlans();
    } catch (err: any) {
      alert(err.message || 'Failed to release plan');
    }
  };

  const handleDeletePlan = async (id: string) => {
    if (window.confirm("Are you sure you want to permanently delete this production schedule?")) {
      try {
        await apiClient.delete(`/api/manufacturing/plans/${id}`);
        fetchPlans();
      } catch (err: any) {
        alert(err.message || 'Failed to delete plan');
      }
    }
  };

  // 1. Calculate Cumulative Cross-Order Component Demand across ALL Active Plans
  const globalComponentDemand: Record<string, { name: string; uom: string; totalNeeded: number; productId: string; unitPrice: number }> = {};

  (plansList || []).forEach(plan => {
    const activeBOM = bomDefinitions.find(bom => bom.id === plan.bomId);
    if (activeBOM && activeBOM.components) {
      activeBOM.components.forEach((comp: any) => {
        const pId = comp.productId;
        const compName = comp.product?.name || 'Raw Component';
        const uom = comp.product?.uom || 'units';
        const unitPrice = comp.product?.pricing || 0;
        const neededForThisPlan = comp.qtyRequired * plan.qtyToProduce;

        if (!globalComponentDemand[pId]) {
          globalComponentDemand[pId] = { name: compName, uom, totalNeeded: 0, productId: pId, unitPrice };
        }
        globalComponentDemand[pId].totalNeeded += neededForThisPlan;
      });
    }
  });

  // 2. Compute Cumulative Deficit List across ALL plans
  const cumulativeDeficits = Object.values(globalComponentDemand).map(item => {
    const stock = warehouseInventory.find(inv => inv.id === item.productId);
    const availableStock = stock ? stock.available : 0;
    const netDeficit = Math.max(0, item.totalNeeded - availableStock);
    return {
      productId: item.productId,
      productName: item.name,
      uom: item.uom,
      totalPlannedDemand: item.totalNeeded,
      currentStock: availableStock,
      netDeficit,
      unitPrice: item.unitPrice,
      estimatedDeficitCost: netDeficit * item.unitPrice,
      status: netDeficit > 0 ? 'DEFICIT' : 'SUFFICIENT'
    };
  });

  // 3. Print Low Stock / Deficit Materials Report
  const handlePrintDeficits = () => {
    const deficitOnly = cumulativeDeficits.filter(d => d.netDeficit > 0);
    const rowsHtml = (deficitOnly.length > 0 ? deficitOnly : cumulativeDeficits)
      .map(
        d => `
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 8px; text-align: left; font-weight: bold;">${d.productName}</td>
          <td style="padding: 8px; text-align: center;">${d.uom}</td>
          <td style="padding: 8px; text-align: right; color: #475569;">${d.currentStock}</td>
          <td style="padding: 8px; text-align: right; color: #1e293b; font-weight: bold;">${d.totalPlannedDemand}</td>
          <td style="padding: 8px; text-align: right; color: ${d.netDeficit > 0 ? '#dc2626' : '#16a34a'}; font-weight: bold;">${d.netDeficit}</td>
          <td style="padding: 8px; text-align: right; font-weight: bold;">$${d.estimatedDeficitCost.toFixed(2)}</td>
        </tr>
      `
      )
      .join('');

    const printWin = window.open('', '_blank');
    if (!printWin) return alert('Please allow popups to print the Deficit Materials report.');

    printWin.document.write(`
      <html>
        <head>
          <title>MRP Deficit Materials Report — Production Planning</title>
          <style>
            body { font-family: sans-serif; padding: 24px; color: #0f172a; }
            h1 { font-size: 20px; margin-bottom: 4px; }
            p { font-size: 12px; color: #64748b; margin-bottom: 16px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th { background: #f8fafc; border-bottom: 2px solid #cbd5e1; padding: 8px; text-align: left; font-size: 10px; text-transform: uppercase; }
            .header-bar { display: flex; justify-content: space-between; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 16px; }
          </style>
        </head>
        <body>
          <div class="header-bar">
            <div>
              <h1>MRP Deficit Materials Report</h1>
              <p>Cumulative raw material requirements across ALL active production plans vs warehouse stock</p>
            </div>
            <div style="text-align: right; font-size: 11px;">
              <div>Date Generated: ${new Date().toLocaleDateString()}</div>
              <div>Deficit Items: ${deficitOnly.length}</div>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Component Item</th>
                <th style="text-align: center;">UOM</th>
                <th style="text-align: right;">Current Stock</th>
                <th style="text-align: right;">Total Planned Demand</th>
                <th style="text-align: right;">Net Deficit Qty</th>
                <th style="text-align: right;">Est. Deficit Cost</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `);
    printWin.document.close();
  };

  const handleOpenDeficitsSheet = () => {
    const deficitRows = cumulativeDeficits.map(d => ({
      'Component Name': d.productName,
      'UOM': d.uom,
      'Current Stock': d.currentStock,
      'Total Planned Demand': d.totalPlannedDemand,
      'Net Deficit Qty': d.netDeficit,
      'Unit Price': d.unitPrice,
      'Est Deficit Cost': d.estimatedDeficitCost,
      'Status': d.status
    }));
    openLocalSheet('mrp_deficits.csv', deficitRows);
  };

  const calculateMRP = (plan: ProductionPlan) => {
    const activeBOM = bomDefinitions.find(bom => bom.id === plan.bomId);
    if (!activeBOM) {
      return [
        {
          materialId: 'mat-fallback',
          name: 'No component ingredients configured (BOM missing)',
          qtyRequired: 0,
          available: 0,
          cumulativeNeeded: 0,
          deficit: 0,
          status: 'SUFFICIENT'
        }
      ];
    }

    return (activeBOM.components || []).map((comp: any) => {
      const totalRequiredThisPlan = comp.qtyRequired * plan.qtyToProduce;
      const stock = warehouseInventory.find(inv => inv.id === comp.productId);
      const availableStock = stock ? stock.available : 0;
      const cumulativeNeeded = globalComponentDemand[comp.productId]?.totalNeeded || totalRequiredThisPlan;

      // Real cumulative deficit across ALL active plans
      const deficit = Math.max(0, cumulativeNeeded - availableStock);

      return {
        materialId: comp.productId,
        name: comp.product?.name || 'Raw Component',
        qtyRequired: totalRequiredThisPlan,
        cumulativeNeeded,
        available: availableStock,
        deficit,
        status: deficit > 0 ? 'DEFICIT' : 'SUFFICIENT'
      };
    });
  };

  const scheduledSoIds = plansList.map(p => p.salesOrderId).filter(Boolean);
  const selectableSalesOrders = activeSalesOrders.filter(so => isEditing ? so.id === selectedSoId : !scheduledSoIds.includes(so.id));

  const filteredPlans = (plansList || []).filter(plan => {
    const finishedProductName = plan?.finishedProductName || '';
    const customerName = plan?.customerName || '';
    const salesOrderNo = plan?.salesOrderNo || '';
    const term = (searchTerm || '').toLowerCase();
    const matchesSearch = finishedProductName.toLowerCase().includes(term) ||
      customerName.toLowerCase().includes(term) ||
      salesOrderNo.toLowerCase().includes(term);
    const matchesStatus = statusFilter === 'ALL' || plan.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Module Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-900/40 p-6 rounded-2xl border border-slate-800/80 backdrop-blur-xl animate-fade-in">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <CalendarRange className="w-5.5 h-5.5 text-indigo-400" />
            Production Planning & MRP
          </h2>
          <p className="text-slate-400 text-xs mt-1">
            Coordinate assembly lines, schedule factory orders directly from customer Sales Orders, and compute raw materials shortages live.
          </p>
        </div>
        <div className="flex gap-2.5">
          <button
            onClick={() => setActiveTab(activeTab === 'schedule' ? 'mrp' : 'schedule')}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 hover:border-slate-600/85 text-slate-300 hover:text-white font-semibold text-xs rounded-xl transition-all cursor-pointer border-0"
          >
            <BarChart2 className="w-4 h-4 text-indigo-400" />
            {activeTab === 'schedule' ? 'Calculate MRP Deficits' : 'Manage Production Schedules'}
          </button>
          <button
            onClick={() => {
              if (activeSalesOrders.length === 0) {
                alert("Please add a customer Sales Order first before planning production runs!");
                return;
              }
              setIsEditing(false);
              setEditingId(null);
              setPlanType('sales_order');
              setShowAddModal(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 active:scale-95 transition-all text-white font-bold text-xs rounded-xl shadow-lg cursor-pointer border-0"
          >
            <Plus className="w-4 h-4" /> Schedule Sales Order
          </button>
          <button
            onClick={() => {
              setIsEditing(false);
              setEditingId(null);
              setPlanType('independent');
              setSelectedProductId(products[0]?.id || '');
              setIndependentQty('10');
              setShowAddModal(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 active:scale-95 transition-all text-white font-bold text-xs rounded-xl shadow-lg cursor-pointer border border-slate-750"
          >
            <Plus className="w-4 h-4 text-indigo-400" /> Create Direct Plan
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400 text-xs">Loading production timetables...</div>
      ) : activeTab === 'schedule' ? (
        <div className="space-y-4 animate-fade-in text-left">
          {/* Controls */}
          <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xl">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Search scheduled plans..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-slate-900/40 border border-slate-800/80 focus:border-indigo-500/50 py-2 pl-10 pr-4 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none transition-all"
              />
            </div>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="bg-slate-900/40 border border-slate-800/80 text-xs text-slate-300 rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500/50 cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">PENDING</option>
              <option value="SCHEDULED">SCHEDULED</option>
              <option value="RELEASED">RELEASED</option>
              <option value="COMPLETED">COMPLETED</option>
            </select>
          </div>

          {/* Schedule List */}
          {filteredPlans.length === 0 ? (
            <div className="p-16 text-center text-slate-500 border border-dashed border-slate-800 rounded-2xl bg-slate-900/10 flex flex-col items-center justify-center">
              <CalendarRange className="w-12 h-12 text-slate-750 mb-3" />
              <p className="font-semibold text-sm">No scheduled Production Plans</p>
              <p className="text-slate-650 text-xs mt-1">Select "Schedule Sales Order" above to roster a finished goods run schedule.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {filteredPlans.map(plan => (
                <div key={plan.id} className="bg-slate-900/35 border border-slate-850 p-5 rounded-2xl flex flex-col gap-4 backdrop-blur-md relative overflow-hidden transition-all hover:border-slate-800">
                  <div className="flex items-start justify-between border-b border-slate-850 pb-3">
                    <div>
                      <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                        plan.status === 'RELEASED'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : plan.status === 'SCHEDULED'
                          ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      }`}>
                        {plan.status}
                      </span>
                      <h4 className="font-bold text-sm text-white mt-2">{plan.finishedProductName}</h4>
                      <p className="text-[10px] text-slate-500 font-mono mt-0.5">{plan.finishedProductCode}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] text-slate-500 block uppercase font-semibold">Qty Target</span>
                      <span className="text-base font-extrabold text-white mt-1 block">{formatNumber(plan.qtyToProduce)} units</span>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between items-center text-slate-400">
                      <span>Customer Ref</span>
                      <span className="text-slate-200 font-medium">{plan.customerName}</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-400">
                      <span>Sales Order Code</span>
                      <span className="text-slate-200 font-mono">{plan.salesOrderNo}</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-400">
                      <span>Planned Runs Date Range</span>
                      <span className="text-slate-200 font-semibold">{plan.startDate} to {plan.endDate}</span>
                    </div>
                  </div>

                  <div className="border-t border-slate-850/60 pt-3 flex justify-between items-center">
                    <span className="text-[10px] text-slate-500">ID: {plan.id.slice(0, 8)}...</span>
                    <div className="flex gap-2">
                      {plan.status === 'PENDING' && (
                        <button
                          onClick={() => handleReleaseToFactory(plan.id)}
                          className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[10px] uppercase tracking-wider rounded-lg border-0 cursor-pointer transition-all active:scale-95 shadow-md"
                        >
                          Release to Shop Floor
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setSelectedSoId(plan.salesOrderId || '');
                          setPlanStartDate(plan.startDate);
                          setPlanEndDate(plan.endDate);
                          setIsEditing(true);
                          setEditingId(plan.id);
                          setPlanType(plan.salesOrderId ? 'sales_order' : 'independent');
                          setSelectedProductId(plan.finishedProductId || '');
                          setIndependentQty(String(plan.qtyToProduce || '10'));
                          setSelectedBomId(plan.bomId || '');
                          setShowAddModal(true);
                        }}
                        className="px-2.5 py-1.5 bg-indigo-650/10 hover:bg-indigo-650 text-indigo-400 hover:text-white rounded-lg text-[10px] uppercase font-bold cursor-pointer transition-all border-0 bg-transparent flex items-center gap-1"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeletePlan(plan.id)}
                        className="px-2.5 py-1.5 bg-rose-650/10 hover:bg-rose-600 text-rose-400 hover:text-white rounded-lg text-[10px] uppercase font-bold cursor-pointer transition-all border-0 bg-transparent flex items-center gap-1"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Material Requirement Planning (MRP) calculations sheet */
        <div className="bg-slate-900/35 border border-slate-800/80 p-6 rounded-2xl space-y-6 backdrop-blur-xl animate-fade-in text-left">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-850 pb-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5 uppercase tracking-wider font-display">
                <AlertTriangle className="w-4.5 h-4.5 text-indigo-400" />
                Global Cross-Order Cumulative MRP Deficit Calculations
              </h3>
              <p className="text-slate-500 text-xs mt-1">
                Evaluates cumulative raw material demand across ALL active planned schedules simultaneously to detect true factory shortages.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handlePrintDeficits}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition-all border-0 cursor-pointer shadow-md active:scale-95"
              >
                <Printer className="w-3.5 h-3.5" />
                Print Deficit Sheet
              </button>

              <button
                type="button"
                onClick={handleOpenDeficitsSheet}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition-all border-0 cursor-pointer shadow-md active:scale-95"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                Open Deficit Sheet
              </button>
            </div>
          </div>

          {/* Global Cross-Order Cumulative Deficit Summary Banner */}
          {cumulativeDeficits.filter(d => d.netDeficit > 0).length > 0 && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-rose-400 uppercase tracking-wide flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-rose-400" />
                  Combined Cross-Order Material Deficits ({cumulativeDeficits.filter(d => d.netDeficit > 0).length} Shortages Flagged)
                </span>
                <span className="text-[10px] font-bold text-rose-400 bg-rose-500/20 px-2 py-0.5 rounded">
                  Factory Deficit Alert
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-slate-300">
                  <thead>
                    <tr className="border-b border-rose-500/20 text-rose-400/80 text-[9px] font-extrabold uppercase tracking-wider text-left">
                      <th className="py-1.5 px-2">Raw Material Component</th>
                      <th className="py-1.5 px-2 text-center">UOM</th>
                      <th className="py-1.5 px-2 text-center">Current Stock</th>
                      <th className="py-1.5 px-2 text-center text-indigo-300">Total Planned Demand (All Plans)</th>
                      <th className="py-1.5 px-2 text-center text-rose-400">Net Deficit Qty</th>
                      <th className="py-1.5 px-2 text-right">Est. Deficit Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cumulativeDeficits.filter(d => d.netDeficit > 0).map((d, idx) => (
                      <tr key={idx} className="border-b border-rose-500/10 font-mono text-[11px]">
                        <td className="py-2 px-2 font-bold text-white font-sans">{d.productName}</td>
                        <td className="py-2 px-2 text-center text-slate-400">{d.uom}</td>
                        <td className="py-2 px-2 text-center text-slate-400">{d.currentStock}</td>
                        <td className="py-2 px-2 text-center font-bold text-indigo-300">{d.totalPlannedDemand}</td>
                        <td className="py-2 px-2 text-center font-black text-rose-400">-{d.netDeficit}</td>
                        <td className="py-2 px-2 text-right font-bold text-amber-400">${d.estimatedDeficitCost.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {filteredPlans.length === 0 ? (
            <div className="p-16 text-center text-slate-500 border border-dashed border-slate-800 rounded-2xl bg-slate-900/10 flex flex-col items-center justify-center">
              <AlertTriangle className="w-12 h-12 text-slate-750 mb-3" />
              <p className="font-semibold text-sm">No plans for MRP evaluation</p>
              <p className="text-slate-650 text-xs mt-1">Configure and schedule a production plan to calculate materials shortage details.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {filteredPlans.map(plan => {
                const mrpSheet = calculateMRP(plan);
                const hasDeficit = mrpSheet.some(item => item.deficit > 0);

                return (
                  <div key={plan.id} className="p-5 bg-slate-950/30 border border-slate-850 rounded-2xl space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-850 pb-3 gap-3">
                      <div className="text-left">
                        <h4 className="font-bold text-sm text-white">{plan.finishedProductName}</h4>
                        <p className="text-[10px] text-slate-500 font-mono mt-0.5">Linked SO: {plan.salesOrderNo} | Qty: {formatNumber(plan.qtyToProduce)} units</p>
                      </div>
                      <div className="flex items-center gap-3">
                        {hasDeficit ? (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 py-0.5 px-2.5 rounded-full animate-pulse">
                            <AlertTriangle className="w-3.5 h-3.5" /> Deficit Stock Detected
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 py-0.5 px-2.5 rounded-full">
                            <ShieldCheck className="w-3.5 h-3.5" /> Stock Levels Sufficient
                          </span>
                        )}
                      </div>
                    </div>

                    {/* MRP Component grid details */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-slate-300">
                        <thead>
                          <tr className="border-b border-slate-900 text-slate-500 font-bold uppercase tracking-wider text-[9px]">
                            <th className="py-2 px-3 text-left">Material Component</th>
                            <th className="py-2 px-3 text-center">This Plan Need</th>
                            <th className="py-2 px-3 text-center text-indigo-300">Total All Plans Need</th>
                            <th className="py-2 px-3 text-center">Available Stock</th>
                            <th className="py-2 px-3 text-center">Calculated Deficit</th>
                            <th className="py-2 px-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {mrpSheet.map((item, idx) => (
                            <tr key={idx} className="border-b border-slate-900/50 hover:bg-slate-950/20 transition-colors">
                              <td className="py-3 px-3 font-semibold text-slate-200">{item.name}</td>
                              <td className="py-3 px-3 text-center font-mono">{formatNumber(item.qtyRequired)}</td>
                              <td className="py-3 px-3 text-center font-mono font-bold text-indigo-300">{formatNumber(item.cumulativeNeeded)}</td>
                              <td className="py-3 px-3 text-center font-mono">{formatNumber(item.available)}</td>
                              <td className={`py-3 px-3 text-center font-mono font-bold ${item.deficit > 0 ? 'text-rose-400 font-black' : 'text-emerald-400'}`}>
                                {item.deficit > 0 ? `-${formatNumber(item.deficit)}` : 'Sufficient'}
                              </td>
                              <td className="py-3 px-3 text-right">
                                {item.deficit > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => alert(`Purchase requisition triggered for ${item.deficit} of ${item.name}!`)}
                                    className="px-2 py-1 bg-amber-500/10 hover:bg-amber-500 text-amber-500 hover:text-white font-bold text-[9px] uppercase tracking-wider rounded border border-amber-500/20 hover:border-0 transition-all cursor-pointer"
                                  >
                                    Spawn Sourcing PO
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Add/Edit Plan Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md text-left">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-scale-up">
            <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/20">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5 uppercase">
                <CalendarRange className="w-4 h-4 text-indigo-400" />
                {isEditing ? 'Modify Production Plan Schedule' : 'Schedule Sales Order Production'}
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-500 hover:text-white p-1 hover:bg-slate-800 rounded-lg transition-all border-0 bg-transparent cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreatePlanSubmit} className="p-6 space-y-4">
              {!isEditing && (
                <div className="flex gap-4 border-b border-slate-800 pb-3 mb-2">
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-350 cursor-pointer">
                    <input
                      type="radio"
                      name="planType"
                      checked={planType === 'sales_order'}
                      onChange={() => setPlanType('sales_order')}
                      className="accent-indigo-500"
                    />
                    Link Sales Order
                  </label>
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-350 cursor-pointer">
                    <input
                      type="radio"
                      name="planType"
                      checked={planType === 'independent'}
                      onChange={() => setPlanType('independent')}
                      className="accent-indigo-500"
                    />
                    Direct Independent Plan
                  </label>
                </div>
              )}

              {planType === 'sales_order' ? (
                <div>
                  <label className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 block mb-1">Select Customer Sales Order</label>
                  {selectableSalesOrders.length > 0 ? (
                    <select
                      value={selectedSoId}
                      onChange={e => setSelectedSoId(e.target.value)}
                      disabled={isEditing}
                      className="w-full bg-slate-950 border border-slate-850 p-2.5 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500 disabled:opacity-55"
                    >
                      {selectableSalesOrders.map(so => (
                        <option key={so.id} value={so.id}>
                          {so.orderNo} - {so.customerName} ({so.product} x {so.qty})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="text-amber-500 bg-amber-500/10 border border-amber-500/20 p-3 rounded-lg text-xs font-semibold mt-1">
                      No unscheduled Sales Orders available. All Sales Orders have already been planned!
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <div>
                    <label className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 block mb-1">Select Finished Product</label>
                    <select
                      value={selectedProductId}
                      onChange={e => setSelectedProductId(e.target.value)}
                      disabled={isEditing}
                      className="w-full bg-slate-950 border border-slate-850 p-2.5 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500 disabled:opacity-55"
                      required
                    >
                      <option value="" disabled>Select target item</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id}>{p.name} (SKU: {p.sku})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 block mb-1">Quantity to Produce</label>
                    <input
                      type="number"
                      min="1"
                      placeholder="e.g. 100"
                      value={independentQty}
                      onChange={e => setIndependentQty(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 p-2.5 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 block mb-1">Select BOM Formulation</label>
                    <select
                      value={selectedBomId}
                      onChange={e => setSelectedBomId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 p-2.5 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                      required
                    >
                      <option value="" disabled>Select BOM version</option>
                       {bomDefinitions.filter(bom => bom.finishedProductId === selectedProductId).map(bom => (
                        <option key={bom.id} value={bom.id}>
                          {bom.name ? `${bom.name} (${bom.version})` : `Version ${bom.version}`} (Labor: {bom.laborHours}h)
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 block mb-1">Target Start Date</label>
                  <input
                    type="date"
                    required
                    value={planStartDate}
                    onChange={e => setPlanStartDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 p-2 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 block mb-1">Target Completion Date</label>
                  <input
                    type="date"
                    required
                    value={planEndDate}
                    onChange={e => setPlanEndDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 p-2 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl border-0 cursor-pointer transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl border-0 cursor-pointer transition-all shadow-lg"
                >
                  {isEditing ? 'Save Changes' : 'Confirm Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
