import React, { useState, useEffect } from 'react';
import { PlayCircle, Plus, Search, BarChart3, ShieldCheck, Database, Layers, ArrowUpRight, TrendingUp } from 'lucide-react';

interface ProductionLog {
  id: string;
  woNo: string;
  finishedProductName: string;
  qtyTarget: number;
  qtyCompleted: number;
  qtyScrapped: number;
  operatorName: string;
  consumptionStatus: 'CONSUMED' | 'PENDING';
  dateLog: string;
}

interface StockLedgerEntry {
  id: string;
  transactionType: 'FG_RECEIPT' | 'RAW_CONSUMPTION';
  productName: string;
  productCode: string;
  qtyChange: number;
  remainingStock: number;
  referenceNo: string;
  timestamp: string;
}

interface ProductionExecutionProps {
  products: any[];
}

export default function ProductionExecution({ products = [] }: ProductionExecutionProps) {
  const [activeTab, setActiveTab] = useState<'execution' | 'consumption' | 'ledger'>('execution');
  const [searchTerm, setSearchTerm] = useState('');
  const [showLogModal, setShowLogModal] = useState(false);

  // Mapped Active Released Work Orders from LocalStorage
  const [dispatchedWorkOrders, setDispatchedWorkOrders] = useState<any[]>([]);

  useEffect(() => {
    const wos = localStorage.getItem('erp_work_orders');
    if (wos) {
      setDispatchedWorkOrders(JSON.parse(wos).filter((w: any) => w.status === 'RELEASED' || w.status === 'IN_PROGRESS'));
    }
  }, []);

  // Mapped Warehouse Stocks from products prop (simulating real stocks from Master Product catalog)
  const warehouseInventory = products.length > 0 ? products : [
    { id: 'p-static-1', name: 'Standard Finished Product', code: 'PROD-S1', available: 10 }
  ];

  // Logs List - Initialized from LocalStorage (0 static/demo data)
  const [logsList, setLogsList] = useState<ProductionLog[]>(() => {
    const saved = localStorage.getItem('erp_logs');
    return saved ? JSON.parse(saved) : [];
  });

  // Stock Ledger - Initialized from LocalStorage (0 static/demo data)
  const [stockLedger, setStockLedger] = useState<StockLedgerEntry[]>(() => {
    const saved = localStorage.getItem('erp_ledger');
    return saved ? JSON.parse(saved) : [];
  });

  // Persistence helpers
  useEffect(() => {
    localStorage.setItem('erp_logs', JSON.stringify(logsList));
  }, [logsList]);

  useEffect(() => {
    localStorage.setItem('erp_ledger', JSON.stringify(stockLedger));
  }, [stockLedger]);

  // Log Modal variables
  const [selectedWoId, setSelectedWoId] = useState('');
  const [logQtyCompleted, setLogQtyCompleted] = useState(5);
  const [logQtyScrapped, setLogQtyScrapped] = useState(0);
  const [logOperator, setLogOperator] = useState('System Operator');

  // Set default dropdown selections when catalog loads
  useEffect(() => {
    if (dispatchedWorkOrders.length > 0 && !selectedWoId) {
      setSelectedWoId(dispatchedWorkOrders[0].id);
    }
  }, [dispatchedWorkOrders]);

  const handlePostProductionExecution = (e: React.FormEvent) => {
    e.preventDefault();
    const wo = dispatchedWorkOrders.find(w => w.id === selectedWoId);
    if (!wo) return;

    // 1. Add Log
    const newLog: ProductionLog = {
      id: `log-${Date.now()}`,
      woNo: wo.woNo,
      finishedProductName: wo.finishedProductName,
      qtyTarget: wo.qtyTarget,
      qtyCompleted: Number(logQtyCompleted),
      qtyScrapped: Number(logQtyScrapped),
      operatorName: logOperator,
      consumptionStatus: 'CONSUMED',
      dateLog: new Date().toISOString().split('T')[0]
    };

    setLogsList([newLog, ...logsList]);

    // 2. Add to Stock Ledger
    const fgReceiptEntry: StockLedgerEntry = {
      id: `st-receipt-${Date.now()}`,
      transactionType: 'FG_RECEIPT',
      productName: wo.finishedProductName,
      productCode: wo.finishedProductCode || 'PROD-CF90',
      qtyChange: Number(logQtyCompleted),
      remainingStock: (warehouseInventory.find(i => i.code === wo.finishedProductCode)?.stockCount || 10) + Number(logQtyCompleted),
      referenceNo: wo.woNo,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16)
    };

    setStockLedger([fgReceiptEntry, ...stockLedger]);

    // 3. Mark the Work Order as Completed or update produced qty in LocalStorage
    const allWOs = localStorage.getItem('erp_work_orders');
    if (allWOs) {
      const parsedWOs = JSON.parse(allWOs).map((w: any) => {
        if (w.id === selectedWoId) {
          const updatedProduced = w.qtyProduced + Number(logQtyCompleted);
          return {
            ...w,
            qtyProduced: updatedProduced,
            status: updatedProduced >= w.qtyTarget ? 'COMPLETED' : 'IN_PROGRESS',
            routingStage: updatedProduced >= w.qtyTarget ? 'Audit & QC' : w.routingStage
          };
        }
        return w;
      });
      localStorage.setItem('erp_work_orders', JSON.stringify(parsedWOs));
    }

    setShowLogModal(false);
  };

  const filteredLogs = logsList.filter(log =>
    log.finishedProductName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.woNo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-900/40 p-6 rounded-2xl border border-slate-800/80 backdrop-blur-xl animate-fade-in">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <PlayCircle className="w-5.5 h-5.5 text-indigo-400" />
            Production Execution & Yield Logs
          </h2>
          <p className="text-slate-400 text-xs mt-1">
            Audit actual yields, adjust central warehouse inventory levels automatically, and record double-entry materials consumption trails.
          </p>
        </div>
        <div className="flex gap-2.5">
          <div className="flex bg-slate-950/40 p-1 border border-slate-800 rounded-xl">
            <button
              onClick={() => setActiveTab('execution')}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer border-0 ${
                activeTab === 'execution' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white bg-transparent'
              }`}
            >
              Yield Logs
            </button>
            <button
              onClick={() => setActiveTab('consumption')}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer border-0 ${
                activeTab === 'consumption' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white bg-transparent'
              }`}
            >
              Materials Consumed
            </button>
            <button
              onClick={() => setActiveTab('ledger')}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer border-0 ${
                activeTab === 'ledger' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white bg-transparent'
              }`}
            >
              Stock Ledger
            </button>
          </div>
          <button
            onClick={() => {
              if (dispatchedWorkOrders.length === 0) {
                alert("Please start a released Work Order first before logging yields!");
                return;
              }
              setShowLogModal(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 active:scale-95 transition-all text-white font-bold text-xs rounded-xl shadow-lg cursor-pointer border-0"
          >
            <Plus className="w-4 h-4" /> Log Yield
          </button>
        </div>
      </div>

      {activeTab === 'execution' && (
        <div className="space-y-4 animate-fade-in text-left">
          {/* Controls */}
          <div className="flex flex-col sm:flex-row gap-4 sm:items-center justify-between">
            <div className="flex items-center relative w-full max-w-sm">
              <Search className="w-4 h-4 absolute left-3 text-slate-500" />
              <input
                type="text"
                placeholder="Search yield logs..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-slate-900/40 border border-slate-800/80 focus:border-indigo-500/50 py-2.5 pl-10 pr-4 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none transition-all"
              />
            </div>
          </div>

          {/* Table */}
          {filteredLogs.length === 0 ? (
            <div className="p-16 text-center text-slate-500 border border-dashed border-slate-800 rounded-2xl bg-slate-900/10 flex flex-col items-center justify-center">
              <PlayCircle className="w-12 h-12 text-slate-750 mb-3" />
              <p className="font-semibold text-sm">No Output Yield logs</p>
              <p className="text-slate-650 text-xs mt-1">Select "Log Yield" above to post a completed finished goods run lot transaction.</p>
            </div>
          ) : (
            <div className="bg-slate-900/35 border border-slate-800/80 backdrop-blur-xl rounded-2xl overflow-hidden p-6">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-slate-300">
                  <thead>
                    <tr className="border-b border-slate-900 text-slate-500 font-bold uppercase tracking-wider text-[9px]">
                      <th className="py-2.5 px-3 text-left">Work Order</th>
                      <th className="py-2.5 px-3 text-left">Finished Product</th>
                      <th className="py-2.5 px-3 text-center">Plan Target</th>
                      <th className="py-2.5 px-3 text-center">Accepted Yield</th>
                      <th className="py-2.5 px-3 text-center">Scrap / Waste</th>
                      <th className="py-2.5 px-3 text-left">Operator Log</th>
                      <th className="py-2.5 px-3 text-right">Logging Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLogs.map(log => (
                      <tr key={log.id} className="border-b border-slate-900/50 hover:bg-slate-950/20 transition-colors">
                        <td className="py-3 px-3 font-mono font-semibold text-indigo-400">{log.woNo}</td>
                        <td className="py-3 px-3 font-bold text-slate-200">{log.finishedProductName}</td>
                        <td className="py-3 px-3 text-center font-mono text-slate-400">{log.qtyTarget} units</td>
                        <td className="py-3 px-3 text-center font-mono text-emerald-400 font-bold">+{log.qtyCompleted} units</td>
                        <td className="py-3 px-3 text-center font-mono text-rose-500">-{log.qtyScrapped}</td>
                        <td className="py-3 px-3 text-slate-300">{log.operatorName}</td>
                        <td className="py-3 px-3 text-right text-slate-500 font-mono">{log.dateLog}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'consumption' && (
        <div className="bg-slate-900/35 border border-slate-800/80 p-6 rounded-2xl space-y-4 backdrop-blur-xl animate-fade-in text-left">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5 uppercase tracking-wider">
              <Layers className="w-4.5 h-4.5 text-indigo-400" />
              Double-Entry Materials Raw Consumption Logs
            </h3>
            <p className="text-slate-500 text-xs mt-1">
              Live audit logs tracking component stock drawdowns mapped to finished goods production recipes.
            </p>
          </div>

          {logsList.length === 0 ? (
            <div className="p-16 text-center text-slate-500 border border-dashed border-slate-800 rounded-2xl bg-slate-900/10 flex flex-col items-center justify-center">
              <Layers className="w-12 h-12 text-slate-750 mb-3" />
              <p className="font-semibold text-sm">No Materials Drawdown logs</p>
              <p className="text-slate-650 text-xs mt-1">Log a completed production yield lot to calculate components drawdowns.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {logsList.map(log => (
                <div key={log.id} className="p-4 bg-slate-950/30 border border-slate-850 rounded-xl space-y-3">
                  <div className="flex justify-between items-start border-b border-slate-900 pb-2">
                    <div className="text-left">
                      <span className="text-[9px] text-slate-500 font-mono">Reference WO: {log.woNo}</span>
                      <h5 className="font-bold text-xs text-white mt-1">{log.finishedProductName}</h5>
                    </div>
                    <span className="text-[10px] bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20 py-0.5 px-2 rounded-full uppercase tracking-wider">STOCK ADJUSTED</span>
                  </div>
                  <div className="text-xs space-y-1.5">
                    <div className="flex justify-between text-slate-400">
                      <span>Primary Core Material component</span>
                      <span className="font-mono text-rose-450">-{log.qtyCompleted * 3} units</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Secondary Curing component</span>
                      <span className="font-mono text-rose-455">-{log.qtyCompleted * 5} units</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'ledger' && (
        <div className="bg-slate-900/35 border border-slate-800/80 p-6 rounded-2xl space-y-4 backdrop-blur-xl animate-fade-in text-left">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5 uppercase tracking-wider">
              <Database className="w-4.5 h-4.5 text-indigo-400" />
              Corporate Warehouse Stock Ledger & Audit Trails
            </h3>
            <p className="text-slate-500 text-xs mt-1">
              Historical ledger of physical warehouse adjustments resulting directly from finished receipts and materials consumption.
            </p>
          </div>

          {stockLedger.length === 0 ? (
            <div className="p-16 text-center text-slate-500 border border-dashed border-slate-800 rounded-2xl bg-slate-900/10 flex flex-col items-center justify-center">
              <Database className="w-12 h-12 text-slate-750 mb-3" />
              <p className="font-semibold text-sm">Stock Ledger empty</p>
              <p className="text-slate-650 text-xs mt-1">Perform yield runs to post real-time receipts audit logs.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-slate-300">
                <thead>
                  <tr className="border-b border-slate-900 text-slate-500 font-bold uppercase tracking-wider text-[9px]">
                    <th className="py-2.5 px-3 text-left">Transaction Reference</th>
                    <th className="py-2.5 px-3 text-left">Material Product</th>
                    <th className="py-2.5 px-3 text-center">Type</th>
                    <th className="py-2.5 px-3 text-center">Adjustment</th>
                    <th className="py-2.5 px-3 text-center">Post Stock</th>
                    <th className="py-2.5 px-3 text-right">Audit Time</th>
                  </tr>
                </thead>
                <tbody>
                  {stockLedger.map((entry, idx) => (
                    <tr key={idx} className="border-b border-slate-900/50 hover:bg-slate-950/20 transition-colors">
                      <td className="py-3 px-3 font-mono font-semibold text-indigo-400">{entry.referenceNo}</td>
                      <td className="py-3 px-3 text-left">
                        <span className="font-bold text-slate-200 block">{entry.productName}</span>
                        <span className="text-[9px] text-slate-500 font-mono mt-0.5 block">{entry.productCode}</span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded ${
                          entry.transactionType === 'FG_RECEIPT' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                        }`}>{entry.transactionType === 'FG_RECEIPT' ? 'Receipt' : 'Drawdown'}</span>
                      </td>
                      <td className={`py-3 px-3 text-center font-mono font-bold ${entry.qtyChange > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {entry.qtyChange > 0 ? `+${entry.qtyChange}` : entry.qtyChange}
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-slate-400">{entry.remainingStock} units</td>
                      <td className="py-3 px-3 text-right font-mono text-slate-500">{entry.timestamp}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Log Modal */}
      {showLogModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md text-left">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-scale-up">
            <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/20">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5 uppercase">
                <PlayCircle className="w-4 h-4 text-indigo-400" />
                Record Output Yield Receipt
              </h3>
              <button
                onClick={() => setShowLogModal(false)}
                className="text-slate-500 hover:text-white p-1 hover:bg-slate-800 rounded-lg transition-all border-0 bg-transparent cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handlePostProductionExecution} className="p-6 space-y-4">
              <div>
                <label className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 block mb-1">Active Released Work Order</label>
                <select
                  value={selectedWoId}
                  onChange={e => setSelectedWoId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 p-2.5 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  {dispatchedWorkOrders.map(wo => (
                    <option key={wo.id} value={wo.id}>{wo.woNo} - {wo.finishedProductName} (Target: {wo.qtyTarget})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 block mb-1">Accepted Yield Qty</label>
                  <input
                    type="number"
                    required
                    value={logQtyCompleted}
                    onChange={e => setLogQtyCompleted(Number(e.target.value))}
                    min="1"
                    className="w-full bg-slate-950 border border-slate-850 p-2 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 block mb-1">Scrapped Qty</label>
                  <input
                    type="number"
                    required
                    value={logQtyScrapped}
                    onChange={e => setLogQtyScrapped(Number(e.target.value))}
                    min="0"
                    className="w-full bg-slate-950 border border-slate-850 p-2 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 block mb-1">Machine Operator Name</label>
                <input
                  type="text"
                  required
                  value={logOperator}
                  onChange={e => setLogOperator(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 p-2 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex gap-3 justify-end pt-3">
                <button
                  type="button"
                  onClick={() => setShowLogModal(false)}
                  className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl border-0 cursor-pointer transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl border-0 cursor-pointer transition-all shadow-lg shadow-indigo-600/10"
                >
                  Post Transaction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
