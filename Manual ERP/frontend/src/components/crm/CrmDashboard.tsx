import React from 'react';
import { Users, TrendingUp, Award, Clock, Activity, BarChart3, ArrowRight, Sparkles } from 'lucide-react';

interface CrmDashboardProps {
  stats: {
    totalLeads: number;
    activePipelineVal: number;
    dealsWonCount: number;
    totalWonVal: number;
    statusCounts: Record<string, number>;
    pipelineStages: Record<string, number>;
    pendingFollowups: number;
  } | null;
  currencySymbol?: string;
}

export default function CrmDashboard({
  stats,
  currencySymbol = '$'
}: CrmDashboardProps) {
  // If stats is loading or unavailable, render a stateful mockup based on standard structures
  const data = stats || {
    totalLeads: 0,
    activePipelineVal: 0,
    dealsWonCount: 0,
    totalWonVal: 0,
    statusCounts: { NEW: 0, CONTACTED: 0, QUALIFIED: 0, LOST: 0 },
    pipelineStages: { PROSPECTING: 0, PROPOSAL: 0, NEGOTIATION: 0, WON: 0, LOST: 0 },
    pendingFollowups: 0
  };

  return (
    <div className="space-y-6">
      {/* Welcome Hero Panel */}
      <div className="relative overflow-hidden bg-gradient-to-r from-indigo-900/60 to-purple-900/40 p-6 sm:p-8 rounded-3xl border border-indigo-500/20 backdrop-blur-xl">
        <div className="absolute right-0 top-0 -translate-y-6 translate-x-6 w-72 h-72 rounded-full bg-indigo-500/10 blur-3xl"></div>
        <div className="absolute left-1/3 bottom-0 translate-y-12 w-60 h-60 rounded-full bg-purple-500/10 blur-3xl"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
              CRM Intelligence Analytics
              <Sparkles className="w-5 h-5 text-indigo-400 animate-pulse" />
            </h1>
            <p className="text-slate-300 text-sm sm:text-base mt-2 max-w-xl">
              Monitor lead pipeline conversions, deals speed, valuation projections, and scheduled activities.
            </p>
          </div>
          <div className="flex items-center gap-1 bg-slate-950/40 border border-slate-800/80 px-4.5 py-2.5 rounded-2xl font-mono text-sm text-indigo-300 font-bold self-start md:self-auto">
            <Activity className="w-4 h-4 text-indigo-455 animate-spin" />
            Real-Time Pipelines Linked
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1 */}
        <div className="bg-slate-900/40 hover:bg-slate-900/60 border border-slate-800/80 p-6 rounded-2xl backdrop-blur-xl transition-all group hover:scale-[1.01]">
          <div className="flex items-center justify-between">
            <span className="text-slate-450 text-xs font-bold uppercase tracking-wider">Total Leads Capture</span>
            <span className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-xl group-hover:scale-95 transition-all">
              <Users className="w-5 h-5" />
            </span>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-black text-white font-mono">{data.totalLeads}</div>
            <p className="text-slate-500 text-xs mt-1.5 flex items-center gap-1">
              Active discovery funnel
            </p>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="bg-slate-900/40 hover:bg-slate-900/60 border border-slate-800/80 p-6 rounded-2xl backdrop-blur-xl transition-all group hover:scale-[1.01]">
          <div className="flex items-center justify-between">
            <span className="text-slate-450 text-xs font-bold uppercase tracking-wider">Active Pipeline</span>
            <span className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl group-hover:scale-95 transition-all">
              <TrendingUp className="w-5 h-5" />
            </span>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-black text-emerald-400 font-mono">
              {currencySymbol}{data.activePipelineVal.toLocaleString()}
            </div>
            <p className="text-slate-500 text-xs mt-1.5">
              Unclosed deal volume
            </p>
          </div>
        </div>

        {/* KPI 3 */}
        <div className="bg-slate-900/40 hover:bg-slate-900/60 border border-slate-800/80 p-6 rounded-2xl backdrop-blur-xl transition-all group hover:scale-[1.01]">
          <div className="flex items-center justify-between">
            <span className="text-slate-450 text-xs font-bold uppercase tracking-wider">Deals Closed Won</span>
            <span className="p-2.5 bg-purple-500/10 text-purple-400 rounded-xl group-hover:scale-95 transition-all">
              <Award className="w-5 h-5" />
            </span>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-black text-white font-mono">{data.dealsWonCount}</div>
            <p className="text-slate-500 text-xs mt-1.5">
              Won revenue closed: <span className="text-purple-400 font-bold font-mono">{currencySymbol}{data.totalWonVal.toLocaleString()}</span>
            </p>
          </div>
        </div>

        {/* KPI 4 */}
        <div className="bg-slate-900/40 hover:bg-slate-900/60 border border-slate-800/80 p-6 rounded-2xl backdrop-blur-xl transition-all group hover:scale-[1.01]">
          <div className="flex items-center justify-between">
            <span className="text-slate-450 text-xs font-bold uppercase tracking-wider">Pending Reminders</span>
            <span className="p-2.5 bg-amber-500/10 text-amber-400 rounded-xl group-hover:scale-95 transition-all">
              <Clock className="w-5 h-5" />
            </span>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-black text-white font-mono">{data.pendingFollowups}</div>
            <p className="text-slate-500 text-xs mt-1.5">
              Follow-ups queued
            </p>
          </div>
        </div>
      </div>

      {/* Analytics Distributions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lead Status Distribution */}
        <div className="bg-slate-900/40 border border-slate-800/80 p-6 rounded-2xl backdrop-blur-xl">
          <h3 className="text-base font-bold text-white mb-6 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-400" />
            Leads Discovery Funnel Distribution
          </h3>
          <div className="space-y-4">
            {Object.entries(data.statusCounts).map(([statusKey, count]) => {
              const percentage = data.totalLeads > 0 ? (count / data.totalLeads) * 100 : 0;
              return (
                <div key={statusKey} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-350">{statusKey}</span>
                    <span className="text-white font-mono">{count} Leads ({percentage.toFixed(0)}%)</span>
                  </div>
                  <div className="w-full bg-slate-950 border border-slate-850 h-3.5 rounded-full overflow-hidden p-0.5">
                    <div
                      className={`h-full rounded-full transition-all duration-1000 ${
                        statusKey === 'NEW' ? 'bg-blue-500' :
                        statusKey === 'CONTACTED' ? 'bg-amber-500' :
                        statusKey === 'QUALIFIED' ? 'bg-emerald-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Opportunity Stages distribution */}
        <div className="bg-slate-900/40 border border-slate-800/80 p-6 rounded-2xl backdrop-blur-xl">
          <h3 className="text-base font-bold text-white mb-6 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-400" />
            Sales Deal Stage Funnel Conversion
          </h3>
          <div className="space-y-4">
            {Object.entries(data.pipelineStages).map(([stageKey, count]) => {
              const totalOpps = Object.values(data.pipelineStages).reduce((a, b) => a + b, 0);
              const percentage = totalOpps > 0 ? (count / totalOpps) * 100 : 0;
              return (
                <div key={stageKey} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-350">{stageKey.replace('_', ' ')}</span>
                    <span className="text-white font-mono">{count} Deals ({percentage.toFixed(0)}%)</span>
                  </div>
                  <div className="w-full bg-slate-950 border border-slate-850 h-3.5 rounded-full overflow-hidden p-0.5">
                    <div
                      className={`h-full rounded-full transition-all duration-1000 ${
                        stageKey === 'PROSPECTING' ? 'bg-blue-500' :
                        stageKey === 'PROPOSAL' ? 'bg-indigo-500' :
                        stageKey === 'NEGOTIATION' ? 'bg-amber-500' :
                        stageKey === 'WON' ? 'bg-emerald-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
