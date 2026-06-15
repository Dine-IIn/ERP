import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../utils/apiService';
import { CashTransactionSchema } from '../../utils/schemas';
import { BookOpen, Search, ArrowUpRight, ArrowDownRight, TrendingUp, DollarSign } from 'lucide-react';

interface Voucher {
  id: string;
  voucherNo: string;
  entryType: string;
  amount: number;
  previousBal: number;
  currentBal: number;
  description: string;
  referenceNo?: string;
  date: string;
}

export default function Cashbook() {
  const queryClient = useQueryClient();

  const { data: cashbook = [] } = useQuery({
    queryKey: ['cashbook'],
    queryFn: async () => {
      const res = await apiClient.get<{cashbook: any[]}>('/api/finance/cashbook');
      return res.cashbook || [];
    }
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiClient.post('/api/finance/cashbook', data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cashbook'] })
  });

  const [searchTerm, setSearchTerm] = useState('');

  const filteredVouchers = (cashbook || []).filter(v => {
    const voucherNo = v?.voucherNo || '';
    const description = v?.description || '';
    const referenceNo = v?.referenceNo || '';
    const term = (searchTerm || '').toLowerCase();
    return voucherNo.toLowerCase().includes(term) ||
      description.toLowerCase().includes(term) ||
      referenceNo.toLowerCase().includes(term);
  });

  // Inwards vs Outwards Totals
  const totalInward = cashbook
    .filter(v => v.entryType === 'INWARD_RECEIPT')
    .reduce((sum, v) => sum + v.amount, 0.0);

  const totalOutward = cashbook
    .filter(v => v.entryType !== 'INWARD_RECEIPT')
    .reduce((sum, v) => sum + v.amount, 0.0);

  const currencySymbol = '$';
  const openingBalance = cashbook.length > 0 ? cashbook[0].previousBal : 0;
  const closingBalance = cashbook.length > 0 ? cashbook[cashbook.length - 1].currentBal : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-900/40 p-6 rounded-2xl border border-slate-800/80 backdrop-blur-xl">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-indigo-400" />
            Cashbook double-entry
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Consolidated dual-entry running ledger tracking corporate collections and outward disbursements.
          </p>
        </div>
      </div>

      {/* Summary Matrix Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="p-5 bg-slate-900/35 border border-slate-800/80 rounded-2xl space-y-1">
          <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Opening Balance</span>
          <h3 className="text-2xl font-black text-slate-355 font-mono">{currencySymbol}{openingBalance.toFixed(2)}</h3>
        </div>

        <div className="p-5 bg-slate-900/35 border border-slate-800/80 rounded-2xl space-y-1 flex justify-between items-center">
          <div className="space-y-1">
            <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Total Cash Inflow</span>
            <h3 className="text-2xl font-black text-emerald-450 font-mono">+{currencySymbol}{totalInward.toFixed(2)}</h3>
          </div>
          <ArrowUpRight className="w-6 h-6 text-emerald-450 bg-emerald-500/10 rounded-lg p-1 border border-emerald-500/10" />
        </div>

        <div className="p-5 bg-slate-900/35 border border-slate-800/80 rounded-2xl space-y-1 flex justify-between items-center">
          <div className="space-y-1">
            <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Total Cash Outflow</span>
            <h3 className="text-2xl font-black text-rose-405 font-mono">-{currencySymbol}{totalOutward.toFixed(2)}</h3>
          </div>
          <ArrowDownRight className="w-6 h-6 text-rose-405 bg-rose-500/10 rounded-lg p-1 border border-rose-500/10" />
        </div>

        <div className="p-5 bg-slate-900/35 border border-slate-800/80 rounded-2xl space-y-1 flex justify-between items-center border-indigo-500/20 bg-indigo-500/5">
          <div className="space-y-1">
            <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Closing Balance (Net)</span>
            <h3 className="text-2xl font-black text-white font-mono">{currencySymbol}{closingBalance.toFixed(2)}</h3>
          </div>
          <TrendingUp className="w-6 h-6 text-indigo-400 bg-indigo-500/10 rounded-lg p-1 border border-indigo-500/10" />
        </div>
      </div>

      {/* Vouchers Table */}
      <div className="bg-slate-900/35 border border-slate-800/80 backdrop-blur-xl rounded-2xl overflow-hidden">
        {/* Search */}
        <div className="p-4 border-b border-slate-800/60 bg-slate-950/20 flex items-center justify-between">
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search voucher number, description, or references..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-950/40 border border-slate-850 rounded-xl text-white text-xs outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Ledger */}
        <div className="overflow-x-auto">
          {filteredVouchers.length === 0 ? (
            <div className="p-12 text-center text-slate-550 flex flex-col items-center justify-center">
              <BookOpen className="w-12 h-12 text-slate-750 mb-3" />
              <p className="font-semibold text-sm">No cashbook vouchers logged</p>
              <p className="text-slate-650 text-xs mt-1">Expenses, payments, and receipts populate this running double-entry log.</p>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-450 font-semibold uppercase bg-slate-950/40 text-[10px]">
                  <th className="py-3.5 px-5">Voucher No</th>
                  <th className="py-3.5 px-5">Log Date</th>
                  <th className="py-3.5 px-5">Ledger Description</th>
                  <th className="py-3.5 px-5">Reference No</th>
                  <th className="py-3.5 px-5">Previous Bal</th>
                  <th className="py-3.5 px-5">Transaction Amount</th>
                  <th className="py-3.5 px-5 text-right">Running Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {filteredVouchers.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-800/10 transition-colors">
                    <td className="py-4 px-5 font-mono font-bold text-white">{v.voucherNo}</td>
                    <td className="py-4 px-5 text-slate-400 font-medium">{new Date(v.date).toISOString().slice(0, 10)}</td>
                    <td className="py-4 px-5 text-slate-200 font-semibold flex items-center gap-1.5">
                      {v.entryType === 'INWARD_RECEIPT' ? (
                        <span className="p-1 bg-emerald-500/10 text-emerald-450 border border-emerald-500/10 rounded">IN</span>
                      ) : (
                        <span className="p-1 bg-rose-500/10 text-rose-455 border border-rose-500/10 rounded">OUT</span>
                      )}
                      <span>{v.description}</span>
                    </td>
                    <td className="py-4 px-5 font-mono text-slate-350">{v.referenceNo || '-'}</td>
                    <td className="py-4 px-5 font-mono text-slate-500">{currencySymbol}{v.previousBal.toFixed(2)}</td>
                    <td className={`py-4 px-5 font-mono font-black ${v.entryType === 'INWARD_RECEIPT' ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {v.entryType === 'INWARD_RECEIPT' ? '+' : '-'}{currencySymbol}{v.amount.toFixed(2)}
                    </td>
                    <td className="py-4 px-5 font-mono text-white font-black text-right text-sm">
                      {currencySymbol}{v.currentBal.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
