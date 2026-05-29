import React, { useState, useEffect } from 'react';
import { CalendarRange, Plus, Search, AlertTriangle, ShieldCheck, RefreshCw, BarChart2, ShoppingCart, UserCheck } from 'lucide-react';

interface ProductionPlan {
  id: string;
  salesOrderId: string;
  customerName: string;
  salesOrderNo: string;
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
}

export default function ProductionPlanning({ salesOrders = [], products = [] }: ProductionPlanningProps) {
  const [activeTab, setActiveTab] = useState<'schedule' | 'mrp'>('schedule');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // Mapped Sales Orders from props
  const activeSalesOrders = salesOrders.length > 0 ? salesOrders : [
    { id: 'so-static-1', orderNo: 'SO-STANDARD-01', customerName: 'Apex Distributors Ltd', product: 'Standard Finished Item A', code: 'PROD-S1', qty: 10 }
  ];

  // Mapped Warehouse Stocks from products prop (simulating real stocks from Master Product catalog)
  const warehouseInventory = products.length > 0 ? products.map(p => ({
    id: p.id || p.name,
    name: p.name,
    code: p.code || 'MAT-01',
    available: p.stockCount || p.quantity || 15,
    minimumThreshold: 10
  })) : [
    { id: 'p3', name: 'Raw Carbon Fiber Spool', code: 'MAT-CF01', available: 120, minimumThreshold: 50 }
  ];

  // Load BOM Definitions from LocalStorage dynamically
  const [bomDefinitions, setBomDefinitions] = useState<any[]>([]);

  useEffect(() => {
    const boms = localStorage.getItem('erp_boms');
    if (boms) {
      setBomDefinitions(JSON.parse(boms));
    }
  }, []);

  // Production Plans - Initialized from LocalStorage (0 static/demo data)
  const [plansList, setPlansList] = useState<ProductionPlan[]>(() => {
    const saved = localStorage.getItem('erp_plans');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('erp_plans', JSON.stringify(plansList));
  }, [plansList]);

  // Modal Schedule variables
  const [selectedSoId, setSelectedSoId] = useState('');
  const [planStartDate, setPlanStartDate] = useState('2026-06-01');
  const [planEndDate, setPlanEndDate] = useState('2026-06-10');

  // Set default dropdown selections when catalog loads
  useEffect(() => {
    if (activeSalesOrders.length > 0 && !selectedSoId) {
      setSelectedSoId(activeSalesOrders[0].id || activeSalesOrders[0].orderNo);
    }
  }, [activeSalesOrders]);

  const handleCreatePlanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const activeSO = activeSalesOrders.find(so => (so.id || so.orderNo) === selectedSoId);
    if (!activeSO) return;

    if (plansList.some(p => p.salesOrderId === selectedSoId)) {
      alert("This Sales Order is already mapped to a Production Plan schedule!");
      return;
    }

    // Try to match a published BOM formula
    const matchedBOM = bomDefinitions.find(bom => bom.finishedProductName === activeSO.product || bom.finishedProductId === activeSO.productId);

    const newPlan: ProductionPlan = {
      id: `plan-${Date.now()}`,
      salesOrderId: selectedSoId,
      customerName: activeSO.customerName || activeSO.customer || 'Standard Customer',
      salesOrderNo: activeSO.orderNo || activeSO.invoiceNo || 'SO-2026-X',
      finishedProductName: activeSO.product || activeSO.name || 'Standard Product',
      finishedProductCode: activeSO.code || 'PROD-CF90',
      qtyToProduce: Number(activeSO.qty || activeSO.quantity || 10),
      startDate: planStartDate,
      endDate: planEndDate,
      status: 'PENDING',
      bomId: matchedBOM ? matchedBOM.id : 'bom-01'
    };

    setPlansList([...plansList, newPlan]);
    setShowAddModal(false);
  };

  const handleReleaseToFactory = (planId: string) => {
    setPlansList(plansList.map(p => p.id === planId ? { ...p, status: 'RELEASED' } : p));
  };

  const calculateMRP = (plan: ProductionPlan) => {
    const activeBOM = bomDefinitions.find(bom => bom.id === plan.bomId);
    if (!activeBOM) {
      // Return a simulated fallback if no BOM found
      return [
        {
          materialId: 'mat-fallback',
          name: 'Carbon Fiber Raw Yarn (Fallback)',
          qtyRequired: plan.qtyToProduce * 5,
          available: 20,
          deficit: Math.max(0, (plan.qtyToProduce * 5) - 20),
          status: (plan.qtyToProduce * 5) > 20 ? 'DEFICIT' : 'SUFFICIENT'
        }
      ];
    }

    return activeBOM.components.map((comp: any) => {
      const totalRequired = comp.qtyRequired * plan.qtyToProduce;
      const stock = warehouseInventory.find(inv => inv.id === comp.productId || inv.name === comp.name);
      const availableStock = stock ? stock.available : 0;
      const deficit = Math.max(0, totalRequired - availableStock);

      return {
        materialId: comp.productId,
        name: comp.name,
        qtyRequired: totalRequired,
        available: availableStock,
        deficit,
        status: deficit > 0 ? 'DEFICIT' : 'SUFFICIENT'
      };
    });
  };

  const filteredPlans = plansList.filter(plan =>
    plan.finishedProductName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    plan.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    plan.salesOrderNo.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 hover:border-slate-600/85 text-slate-300 hover:text-white font-semibold text-xs rounded-xl transition-all cursor-pointer"
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
              setShowAddModal(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 active:scale-95 transition-all text-white font-bold text-xs rounded-xl shadow-lg cursor-pointer border-0"
          >
            <Plus className="w-4 h-4" /> Schedule Sales Order
          </button>
        </div>
      </div>

      {activeTab === 'schedule' ? (
        <div className="space-y-4 animate-fade-in text-left">
          {/* Controls */}
          <div className="flex items-center relative w-full max-w-sm">
            <Search className="w-4 h-4 absolute left-3 text-slate-500" />
            <input
              type="text"
              placeholder="Search scheduled plans..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-slate-900/40 border border-slate-800/80 focus:border-indigo-500/50 py-2.5 pl-10 pr-4 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none transition-all"
            />
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
                      <span className="text-base font-extrabold text-white mt-1 block">{plan.qtyToProduce} units</span>
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

                  {plan.status === 'PENDING' && (
                    <div className="border-t border-slate-850 pt-3 flex justify-end">
                      <button
                        onClick={() => handleReleaseToFactory(plan.id)}
                        className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[10px] uppercase tracking-wider rounded-lg border-0 cursor-pointer transition-all active:scale-95 shadow-md shadow-indigo-600/10"
                      >
                        Release to Shop Floor
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Material Requirement Planning (MRP) calculations sheet */
        <div className="bg-slate-900/35 border border-slate-800/80 p-6 rounded-2xl space-y-6 backdrop-blur-xl animate-fade-in text-left">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5 uppercase tracking-wider">
              <AlertTriangle className="w-4.5 h-4.5 text-indigo-400" />
              Real-time MRP Inventory Deficit Calculations
            </h3>
            <p className="text-slate-500 text-xs mt-1">
              Select an active planned schedule to evaluate component shortages and trigger purchase order requisitions.
            </p>
          </div>

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
                        <p className="text-[10px] text-slate-500 font-mono mt-0.5">Linked SO: {plan.salesOrderNo} | Qty: {plan.qtyToProduce} units</p>
                      </div>
                      <div className="flex items-center gap-3">
                        {hasDeficit ? (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-amber-500 bg-amber-500/10 border border-amber-500/20 py-0.5 px-2.5 rounded-full animate-pulse">
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
                            <th className="py-2 px-3 text-center">Required (Total)</th>
                            <th className="py-2 px-3 text-center">Available Stock</th>
                            <th className="py-2 px-3 text-center">Calculated Deficit</th>
                            <th className="py-2 px-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {mrpSheet.map((item, idx) => (
                            <tr key={idx} className="border-b border-slate-900/50 hover:bg-slate-950/20 transition-colors">
                              <td className="py-3 px-3 font-semibold text-slate-200">{item.name}</td>
                              <td className="py-3 px-3 text-center font-mono">{item.qtyRequired} units</td>
                              <td className="py-3 px-3 text-center font-mono">{item.available} units</td>
                              <td className={`py-3 px-3 text-center font-mono font-bold ${item.deficit > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                                {item.deficit > 0 ? `-${item.deficit} units` : 'Sufficient'}
                              </td>
                              <td className="py-3 px-3 text-right">
                                {item.deficit > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => alert(`Purchase requisition triggered for ${item.deficit} units of ${item.name}!`)}
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

      {/* Add New Plan Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md text-left">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-scale-up">
            <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/20">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5 uppercase">
                <CalendarRange className="w-4 h-4 text-indigo-400" />
                Schedule Sales Order Production
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-500 hover:text-white p-1 hover:bg-slate-800 rounded-lg transition-all border-0 bg-transparent cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreatePlanSubmit} className="p-6 space-y-4">
              <div>
                <label className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 block mb-1">Select Customer Sales Order</label>
                <select
                  value={selectedSoId}
                  onChange={e => setSelectedSoId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 p-2.5 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  {activeSalesOrders.map(so => (
                    <option key={so.id || so.orderNo} value={so.id || so.orderNo}>
                      {so.orderNo || so.invoiceNo} - {so.customerName || so.customer} ({so.product || so.name} x {so.qty || so.quantity || 10})
                    </option>
                  ))}
                </select>
              </div>

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
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl border-0 cursor-pointer transition-all shadow-lg shadow-indigo-600/10"
                >
                  Confirm Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
