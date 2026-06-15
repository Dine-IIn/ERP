import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../utils/apiService';
import { GstSettingSchema } from '../../utils/schemas';
import { Landmark, RefreshCw, X, AlertCircle, CheckCircle2, FileSpreadsheet, ShieldAlert, Award } from 'lucide-react';

interface GstWorksheet {
  companyGstin: string;
  companyPan: string;
  outputGst: number;
  inputGst: number;
  netGstPayable: number;
  salesTaxCollected: number;
  purchasesTaxCredited: number;
}

export default function GstSettings() {
  const queryClient = useQueryClient();

  const { data: gstSettings = [] } = useQuery({
    queryKey: ['gstSettings'],
    queryFn: async () => {
      const res = await apiClient.get<{gstSettings: any[]}>('/api/finance/gst');
      return res.gstSettings || [];
    }
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => apiClient.patch('/api/admin/company/tax', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companyProfile'] });
      queryClient.invalidateQueries({ queryKey: ['gstWorksheet'] });
    }
  });

  const { data: companyProfile = {} as any } = useQuery({
    queryKey: ['companyProfile'],
    queryFn: async () => {
      const res = await apiClient.get<any>('/api/admin/company');
      return res.company || {};
    }
  });

  const { data: gstWorksheet = {} as any, refetch: onRefreshWorksheet } = useQuery({
    queryKey: ['gstWorksheet'],
    queryFn: async () => {
      const res = await apiClient.get<any>('/api/finance/gst/worksheet');
      return res.worksheet || {};
    }
  });

  const [showEditModal, setShowEditModal] = useState(false);
  const [gstin, setGstin] = useState(companyProfile?.gstin || '');
  const [pan, setPan] = useState(companyProfile?.pan || '');

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [localErr, setLocalErr] = useState<string | null>(null);
  const [localSuccess, setLocalSuccess] = useState<string | null>(null);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalErr(null);
    setLocalSuccess(null);
    setLoading(true);

    try {
      await updateMutation.mutateAsync({
        gstin: gstin.trim() || null,
        pan: pan.trim() || null
      });
      setLocalSuccess("GST credentials successfully registered!");
      setTimeout(() => {
        setShowEditModal(false);
      }, 1000);
    } catch (err: any) {
      setLocalErr(err.message || "Failed to update tax details.");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await onRefreshWorksheet();
    } catch (e: any) {
      alert("Failed to sync tax aggregates worksheet.");
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-900/40 p-6 rounded-2xl border border-slate-800/80 backdrop-blur-xl">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Landmark className="w-6 h-6 text-indigo-400" />
            GST Settings & Taxation worksheets
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Configure corporate GSTIN registration details and calculate net taxation credit worksheets.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-xl active:scale-95 transition-all text-white font-semibold text-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-indigo-400' : 'text-slate-400'}`} />
            Refresh aggregates
          </button>
          <button
            onClick={() => {
              setGstin(companyProfile?.gstin || '');
              setPan(companyProfile?.pan || '');
              setLocalErr(null);
              setLocalSuccess(null);
              setShowEditModal(true);
            }}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-500 hover:bg-indigo-600 active:scale-95 transition-all text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/20 text-xs"
          >
            Configure Tax credentials
          </button>
        </div>
      </div>

      {/* Tax Profile Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="p-5 bg-slate-900/35 border border-slate-800/80 backdrop-blur-xl rounded-2xl space-y-1">
          <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Corporate GSTIN</span>
          <h3 className="text-lg font-bold text-white font-mono">{gstWorksheet.companyGstin}</h3>
        </div>
        <div className="p-5 bg-slate-900/35 border border-slate-800/80 backdrop-blur-xl rounded-2xl space-y-1">
          <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Permanent Account (PAN)</span>
          <h3 className="text-lg font-bold text-white font-mono">{gstWorksheet.companyPan}</h3>
        </div>
        <div className="p-5 bg-slate-900/35 border border-slate-800/80 backdrop-blur-xl rounded-2xl space-y-1">
          <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Taxation bracket</span>
          <h3 className="text-lg font-bold text-indigo-400">GST Standard 18%</h3>
        </div>
      </div>

      {/* GST Filing worksheets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Output vs Input ledger */}
        <div className="lg:col-span-2 p-6 bg-slate-900/35 border border-slate-800/80 backdrop-blur-xl rounded-2xl space-y-6">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-indigo-400" />
            Dynamic GST Filing Worksheet (Liability Aggregates)
          </h3>

          <div className="space-y-4">
            <div className="p-4 bg-slate-950/40 border border-slate-850 rounded-xl flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-xs font-bold text-white">GST Output Liability (Taxes Collected)</span>
                <span className="text-[10px] text-slate-500 block">Computed from {gstWorksheet.salesTaxCollected} paid customer Sales Invoices</span>
              </div>
              <h4 className="text-md font-bold text-rose-405 font-mono">${gstWorksheet.outputGst?.toFixed(2)}</h4>
            </div>

            <div className="p-4 bg-slate-950/40 border border-slate-850 rounded-xl flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-xs font-bold text-white">GST Input Credit (Taxes Paid)</span>
                <span className="text-[10px] text-slate-500 block">Computed from {gstWorksheet.purchasesTaxCredited} completed Purchase Orders</span>
              </div>
              <h4 className="text-md font-bold text-emerald-450 font-mono">${gstWorksheet.inputGst?.toFixed(2)}</h4>
            </div>

            <div className="p-4 bg-indigo-500/5 border border-indigo-500/20 rounded-xl flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-xs font-bold text-white">Net GST Liability Payable</span>
                <span className="text-[10px] text-indigo-400 block">GST Output minus Input Credit. A negative balance denotes refundable asset.</span>
              </div>
              <h4 className={`text-lg font-black font-mono ${gstWorksheet.netGstPayable >= 0 ? 'text-rose-450' : 'text-emerald-450'}`}>
                ${gstWorksheet.netGstPayable?.toFixed(2)}
              </h4>
            </div>
          </div>
        </div>

        {/* GST Filing notes alerts */}
        <div className="p-6 bg-slate-900/35 border border-slate-800/80 backdrop-blur-xl rounded-2xl space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4 text-amber-500" />
            GST Compliance Guidelines
          </h3>
          <p className="text-slate-500 text-xs leading-relaxed">
            Ensure company GST details match invoices declarations correctly. Output liability represents taxes collected from clients which must be filed to tax councils monthly. Input tax credits reduce total outflows.
          </p>

          <div className="p-4 bg-slate-950/60 border border-slate-850 rounded-xl text-[11px] text-slate-400 leading-normal">
            Tax brackets are assigned inside <span className="text-indigo-400 font-bold">Tax Master</span> and declared in quotations or performa sheets dynamically.
          </div>
        </div>
      </div>

      {/* Edit Credentials Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-950/20">
              <h3 className="text-md font-bold text-white flex items-center gap-1.5">
                Configure GST credentials
              </h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdate} className="p-6 space-y-4">
              {localErr && (
                <div className="flex items-center gap-2.5 p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <span>{localErr}</span>
                </div>
              )}

              {localSuccess && (
                <div className="flex items-center gap-2.5 p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-sm">
                  <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                  <span>{localSuccess}</span>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-slate-450 text-xs font-semibold uppercase tracking-wider">Company GSTIN Number</label>
                <input
                  type="text"
                  placeholder="e.g. 27AADCB2230M1Z5"
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-850 rounded-xl text-white text-sm outline-none font-mono focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-450 text-xs font-semibold uppercase tracking-wider">Permanent Account (PAN)</label>
                <input
                  type="text"
                  placeholder="e.g. AADCB2230M"
                  value={pan}
                  onChange={(e) => setPan(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-850 rounded-xl text-white text-sm outline-none font-mono focus:border-indigo-500"
                />
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-end gap-3 bg-slate-950/20 -mx-6 -mb-6 p-6">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4.5 py-2 text-slate-400 hover:text-white transition-all text-sm font-semibold hover:bg-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white transition-all text-sm font-bold rounded-xl shadow-lg shadow-indigo-500/20 font-sans"
                >
                  {loading ? 'Updating...' : 'Save credentials'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
