import React, { useState, useEffect } from 'react';
import { PlayCircle, Plus, Search, BarChart3, ShieldCheck, Database, Layers, ArrowUpRight, TrendingUp, Trash2 } from 'lucide-react';
import { apiClient } from '../../utils/apiService';

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
  const [yieldSearch, setYieldSearch] = useState('');
  const [consumptionSearch, setConsumptionSearch] = useState('');
  const [ledgerSearch, setLedgerSearch] = useState('');
  const [ledgerTypeFilter, setLedgerTypeFilter] = useState<'ALL' | 'FG_RECEIPT' | 'RAW_CONSUMPTION'>('ALL');
  const [showLogModal, setShowLogModal] = useState(false);
  const [loading, setLoading] = useState(false);

  // Mapped Active Released Work Orders from database
  const [dispatchedWorkOrders, setDispatchedWorkOrders] = useState<any[]>([]);

  // Logs List
  const [logsList, setLogsList] = useState<ProductionLog[]>([]);

  // Stock Ledger
  const [stockLedger, setStockLedger] = useState<StockLedgerEntry[]>([]);

  // Log Modal variables
  const [selectedWoId, setSelectedWoId] = useState('');
  const [logQtyCompleted, setLogQtyCompleted] = useState(5);
  const [logQtyScrapped, setLogQtyScrapped] = useState(0);
  const [logOperator, setLogOperator] = useState('System Operator');

  const fetchExecutionData = async () => {
    setLoading(true);
    try {
      // 1. Fetch work orders
      const wosRes = await apiClient.get<{ workOrders: any[] }>('/api/manufacturing/work-orders');
      const filteredWos = (wosRes.workOrders || []).filter((w: any) => w.status === 'RELEASED' || w.status === 'IN_PROGRESS');
      setDispatchedWorkOrders(filteredWos);
      if (filteredWos.length > 0 && !selectedWoId) {
        setSelectedWoId(filteredWos[0].id);
      }

      // 2. Fetch Yield logs
      const logsRes = await apiClient.get<{ logs: any[] }>('/api/manufacturing/logs');
      const formattedLogs = (logsRes.logs || []).map((log: any) => ({
        id: log.id,
        woNo: log.workOrder?.woNo || 'UNKNOWN',
        finishedProductName: log.workOrder?.plan?.finishedProduct?.name || 'Standard Product',
        qtyTarget: log.workOrder?.qtyTarget || 0,
        qtyCompleted: log.qtyCompleted,
        qtyScrapped: log.qtyScrapped,
        operatorName: log.operatorName,
        consumptionStatus: log.consumptionStatus,
        dateLog: log.dateLog?.split('T')[0] || log.createdAt?.split('T')[0] || ''
      }));
      setLogsList(formattedLogs);

      // 3. Fetch Stock Adjustments
      const adjRes = await apiClient.get<{ adjustments: any[] }>('/api/inventory/adjustments');
      const formattedLedger = (adjRes.adjustments || [])
        .filter((adj: any) => adj.referenceNo || adj.reason?.includes('BOM') || adj.reason?.includes('Yield'))
        .map((adj: any) => ({
          id: adj.id,
          transactionType: adj.quantity > 0 ? 'FG_RECEIPT' : 'RAW_CONSUMPTION',
          productName: adj.product?.name || 'Material Item',
          productCode: adj.product?.uom || 'unit',
          qtyChange: adj.quantity,
          remainingStock: adj.newStock,
          referenceNo: adj.referenceNo || adj.adjustmentNo,
          timestamp: adj.date?.replace('T', ' ').substring(0, 16) || adj.createdAt?.replace('T', ' ').substring(0, 16) || ''
        }));
      setStockLedger(formattedLedger);
    } catch (err: any) {
      console.error('Failed to load production execution data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExecutionData();
  }, [products]);

  // Set default dropdown selections when catalog loads
  useEffect(() => {
    if (dispatchedWorkOrders.length > 0 && !selectedWoId) {
      setSelectedWoId(dispatchedWorkOrders[0].id);
    }
  }, [dispatchedWorkOrders]);

  const handlePostProductionExecution = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWoId) return;

    apiClient.post('/api/manufacturing/logs', {
      woId: selectedWoId,
      qtyCompleted: Number(logQtyCompleted),
      qtyScrapped: Number(logQtyScrapped),
      operatorName: logOperator
    }).then(() => {
      fetchExecutionData();
      setShowLogModal(false);
      setLogQtyCompleted(5);
      setLogQtyScrapped(0);
    }).catch((err: any) => {
      alert("Error posting production yield: " + (err.response?.data?.error || err.message));
    });
  };

  const handleDeleteLog = async (id: string) => {
    if (!confirm("Are you sure you want to discard this production yield log? Stock adjustments in the ledger will remain, but the execution log entry will be removed.")) return;
    try {
      await apiClient.delete(`/api/manufacturing/logs/${id}`);
      fetchExecutionData();
    } catch (err: any) {
      alert("Error discarding log: " + (err.response?.data?.error || err.message));
    }
  };

  const filteredLogs = logsList.filter(log =>
    log.finishedProductName.toLowerCase().includes(yieldSearch.toLowerCase()) ||
    log.woNo.toLowerCase().includes(yieldSearch.toLowerCase()) ||
    log.operatorName.toLowerCase().includes(yieldSearch.toLowerCase())
  );

  const filteredConsumption = stockLedger
    .filter(entry => entry.transactionType === 'RAW_CONSUMPTION')
    .filter(entry =>
      entry.referenceNo.toLowerCase().includes(consumptionSearch.toLowerCase()) ||
      entry.productName.toLowerCase().includes(consumptionSearch.toLowerCase()) ||
      entry.productCode.toLowerCase().includes(consumptionSearch.toLowerCase())
    );

  const filteredLedger = stockLedger
    .filter(entry => ledgerTypeFilter === 'ALL' || entry.transactionType === ledgerTypeFilter)
    .filter(entry =>
      entry.referenceNo.toLowerCase().includes(ledgerSearch.toLowerCase()) ||
      entry.productName.toLowerCase().includes(ledgerSearch.toLowerCase()) ||
      entry.productCode.toLowerCase().includes(ledgerSearch.toLowerCase())
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
                placeholder="Search yield logs by product, WO, or operator..."
                value={yieldSearch}
                onChange={e => setYieldSearch(e.target.value)}
                className="w-full bg-slate-900/40 border border-slate-800/80 focus:border-indigo-500/50 py-2 pl-10 pr-4 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none transition-all"
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
                      <th className="py-2.5 px-3 text-center">Logging Date</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
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
                        <td className="py-3 px-3 text-center text-slate-500 font-mono">{log.dateLog}</td>
                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() => handleDeleteLog(log.id)}
                            className="text-rose-550 hover:text-rose-455 p-1.5 hover:bg-slate-950/45 rounded transition-all cursor-pointer border-0 bg-transparent"
                            title="Discard Yield Log"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-850 pb-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5 uppercase tracking-wider">
                <Layers className="w-4.5 h-4.5 text-indigo-400" />
                Double-Entry Materials Raw Consumption Logs
              </h3>
              <p className="text-slate-500 text-xs mt-1">
                Live audit logs tracking component stock drawdowns mapped to finished goods production recipes.
              </p>
            </div>
            <div className="flex items-center relative w-full max-w-sm shrink-0">
              <Search className="w-4 h-4 absolute left-3 text-slate-500" />
              <input
                type="text"
                placeholder="Search drawdowns by WO or component..."
                value={consumptionSearch}
                onChange={e => setConsumptionSearch(e.target.value)}
                className="w-full bg-slate-900/40 border border-slate-800/80 focus:border-indigo-500/50 py-2 pl-10 pr-4 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none transition-all"
              />
            </div>
          </div>

          {filteredConsumption.length === 0 ? (
            <div className="p-16 text-center text-slate-500 border border-dashed border-slate-800 rounded-2xl bg-slate-900/10 flex flex-col items-center justify-center">
              <Layers className="w-12 h-12 text-slate-750 mb-3" />
              <p className="font-semibold text-sm">No Materials Drawdown logs</p>
              <p className="text-slate-650 text-xs mt-1">Log a completed production yield lot to calculate components drawdowns.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredConsumption.map(entry => (
                <div key={entry.id} className="p-4 bg-slate-950/30 border border-slate-850 rounded-xl space-y-3">
                  <div className="flex justify-between items-start border-b border-slate-900 pb-2">
                    <div className="text-left">
                      <span className="text-[9px] text-slate-500 font-mono">Reference WO: {entry.referenceNo}</span>
                      <h5 className="font-bold text-xs text-white mt-1">{entry.productName}</h5>
                    </div>
                    <span className="text-[10px] bg-rose-500/10 text-rose-455 font-bold border border-rose-500/20 py-0.5 px-2 rounded-full uppercase tracking-wider">RAW DRAWDOWN</span>
                  </div>
                  <div className="text-xs space-y-1.5">
                    <div className="flex justify-between text-slate-400">
                      <span>Primary Core Material component</span>
                      <span className="font-mono text-rose-450 font-bold">{entry.qtyChange} {entry.productCode}</span>
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-550 pt-1 border-t border-slate-900/40">
                      <span>Audit Time</span>
                      <span className="font-mono">{entry.timestamp}</span>
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-850 pb-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5 uppercase tracking-wider">
                <Database className="w-4.5 h-4.5 text-indigo-400" />
                Corporate Warehouse Stock Ledger & Audit Trails
              </h3>
              <p className="text-slate-500 text-xs mt-1">
                Historical ledger of physical warehouse adjustments resulting directly from finished receipts and materials consumption.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xl shrink-0">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search ledger by ref, name, or code..."
                  value={ledgerSearch}
                  onChange={e => setLedgerSearch(e.target.value)}
                  className="w-full bg-slate-900/40 border border-slate-800/80 focus:border-indigo-500/50 py-2 pl-10 pr-4 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none transition-all"
                />
              </div>
              <select
                value={ledgerTypeFilter}
                onChange={e => setLedgerTypeFilter(e.target.value as any)}
                className="bg-slate-900/40 border border-slate-800/80 text-xs text-slate-300 rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500/50 cursor-pointer"
              >
                <option value="ALL">All Transactions</option>
                <option value="FG_RECEIPT">Receipts Only</option>
                <option value="RAW_CONSUMPTION">Drawdowns Only</option>
              </select>
            </div>
          </div>

          {filteredLedger.length === 0 ? (
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
                  {filteredLedger.map((entry, idx) => (
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
