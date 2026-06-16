import React, { useState } from 'react';
import { Layers, Search, Calendar, Info, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { formatNumber, apiClient } from '../../utils/apiService';
import { useQuery } from '@tanstack/react-query';

interface StockAdjustment {
  id: string;
  adjustmentNo: string;
  productId: string;
  product: { id: string; name: string; uom: string };
  date: string;
  type: string;
  quantity: number;
  previousStock: number;
  newStock: number;
  reason?: string;
  referenceNo?: string;
}

interface StockOverviewProps {
  adjustments?: StockAdjustment[];
}

export default function StockOverview({
  adjustments
}: StockOverviewProps) {
  const { data: fetchedAdjustments } = useQuery({
    queryKey: ['inventory-adjustments'],
    queryFn: () => apiClient.get<StockAdjustment[]>('/api/inventory/adjustments')
  });

  const activeAdjustments = adjustments || fetchedAdjustments || [];
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');

  const filteredAdjustments = activeAdjustments.filter((adj: StockAdjustment) => {
    if (!adj) return false;
    const productName = adj.product?.name || '';
    const adjNo = adj.adjustmentNo || '';
    const reason = adj.reason || '';
    const refNo = adj.referenceNo || '';
    const term = (searchTerm || '').toLowerCase();

    const matchesSearch = productName.toLowerCase().includes(term) ||
      adjNo.toLowerCase().includes(term) ||
      reason.toLowerCase().includes(term) ||
      refNo.toLowerCase().includes(term);

    const matchesType = filterType ? adj.type === filterType : true;

    return matchesSearch && matchesType;
  });

  const getTypeStyle = (t: string) => {
    switch (t) {
      case 'INWARD_PO':
      case 'INWARD_RETURN':
      case 'MANUAL_ADD':
        return 'bg-emerald-500/10 text-emerald-450 border-emerald-500/20';
      case 'OUTWARD_SO':
      case 'OUTWARD_RETURN':
      case 'MANUAL_SUB':
        return 'bg-red-500/10 text-red-400 border-red-500/20';
      default:
        return 'bg-slate-800 text-slate-400';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-900/40 p-6 rounded-2xl border border-slate-800/80 backdrop-blur-xl">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Layers className="w-6 h-6 text-indigo-400" />
            Stock Ledger & Transaction History
          </h1>
          <p className="text-slate-400 text-sm mt-1">Audit complete double-entry warehouse ledger logs tracking supplier inward POs, sales outward dispatches, and audit adjustments.</p>
        </div>
      </div>

      {/* Main Grid */}
      <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl backdrop-blur-xl overflow-hidden">
        {/* Search and Filter */}
        <div className="p-4 border-b border-slate-800/60 bg-slate-950/20 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative max-w-md w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search by product, adjustment no, or reference..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-950/40 border border-slate-850/60 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl text-white text-sm outline-none transition-all"
            />
          </div>

          <div className="flex items-center gap-2 self-stretch sm:self-auto">
            <label className="text-slate-450 text-xs font-semibold uppercase tracking-wider whitespace-nowrap">Filter Type:</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3.5 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-indigo-500 text-xs font-semibold"
            >
              <option value="">ALL TRANSACTION LEDGERS</option>
              <option value="INWARD_PO">INWARD PROCUREMENT POs</option>
              <option value="OUTWARD_SO">OUTWARD DISPATCH SOs</option>
              <option value="INWARD_RETURN">INWARD RETURNS (CUSTOMER)</option>
              <option value="OUTWARD_RETURN">OUTWARD DEBIT RETURNS (SUPPLIER)</option>
              <option value="MANUAL_ADD">MANUAL INWARD AUDITS</option>
              <option value="MANUAL_SUB">MANUAL OUTWARD DEDUCTIONS</option>
            </select>
          </div>
        </div>

        {/* Table/List */}
        <div className="overflow-x-auto">
          {filteredAdjustments.length === 0 ? (
            <div className="p-12 text-center">
              <Layers className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400 font-medium">No stock ledger transactions recorded</p>
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-medium uppercase tracking-wider text-xs bg-slate-950/40">
                  <th className="py-4 px-6">Ledger Adjust No</th>
                  <th className="py-4 px-6">Product Item</th>
                  <th className="py-4 px-6">Timestamp Date</th>
                  <th className="py-4 px-6">Transaction Type</th>
                  <th className="py-4 px-6">Quantity Volume</th>
                  <th className="py-4 px-6">Physical Level Change</th>
                  <th className="py-4 px-6">Reference / Reason Audit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
                {filteredAdjustments.map((adj: StockAdjustment) => {
                  const isInward = adj.quantity > 0;
                  return (
                    <tr key={adj.id} className="hover:bg-slate-800/20 transition-colors">
                      <td className="py-4 px-6 font-bold text-white">{adj.adjustmentNo || 'N/A'}</td>
                      <td className="py-4 px-6 font-semibold font-sans text-slate-200 text-sm">{adj.product?.name || 'Unnamed Product'}</td>
                      <td className="py-4 px-6 text-slate-350">{adj.date ? new Date(adj.date).toLocaleString() : 'N/A'}</td>
                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center px-2.5 py-0.5 font-bold rounded-full border ${getTypeStyle(adj.type || '')}`}>
                          {(adj.type || '').replace('_', ' ')}
                        </span>
                      </td>
                      <td className={`py-4 px-6 font-bold text-sm ${isInward ? 'text-emerald-450' : 'text-red-400'}`}>
                        <div className="flex items-center gap-1">
                          {isInward ? (
                            <ArrowUpRight className="w-3.5 h-3.5 flex-shrink-0 text-emerald-450" />
                          ) : (
                            <ArrowDownLeft className="w-3.5 h-3.5 flex-shrink-0 text-red-450" />
                          )}
                          <span>{isInward ? '+' : ''}{formatNumber(adj.quantity || 0)} <span className="text-[10px] text-slate-500 font-normal">{adj.product?.uom || 'PCS'}</span></span>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-slate-400">
                        {formatNumber(adj.previousStock || 0)} <span className="text-[10px] text-slate-600">to</span> <span className="text-white font-bold">{formatNumber(adj.newStock || 0)}</span>
                      </td>
                      <td className="py-4 px-6 max-w-xs font-sans text-slate-400">
                        {adj.reason && (
                          <div className="flex items-start gap-1">
                            <Info className="w-3.5 h-3.5 text-slate-500 flex-shrink-0 mt-0.5" />
                            <span className="line-clamp-2" title={adj.reason}>{adj.reason}</span>
                          </div>
                        )}
                        {adj.referenceNo && (
                          <div className="text-[10px] text-indigo-400 font-semibold font-mono mt-0.5">Ref: {adj.referenceNo}</div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
