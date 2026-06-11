import React, { useState } from 'react';
import { CalendarClock, Plus, Clock, X, AlertCircle, CheckCircle2, Sliders, CalendarDays, Zap, Search } from 'lucide-react';

interface ShiftRoster {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  gracePeriod: number;
  createdAt: string;
}

interface ShiftsProps {
  shiftRosters: ShiftRoster[];
  onCreateShiftRoster: (data: any) => Promise<void>;
}

export default function Shifts({
  shiftRosters,
  onCreateShiftRoster
}: ShiftsProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [gracePeriod, setGracePeriod] = useState(15);

  const [loading, setLoading] = useState(false);
  const [localErr, setLocalErr] = useState<string | null>(null);
  const [localSuccess, setLocalSuccess] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredRosters = (shiftRosters || []).filter(roster => {
    const shiftName = roster?.name || '';
    const start = roster?.startTime || '';
    const end = roster?.endTime || '';
    const term = (searchTerm || '').toLowerCase();
    return shiftName.toLowerCase().includes(term) ||
      start.toLowerCase().includes(term) ||
      end.toLowerCase().includes(term);
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !startTime || !endTime) {
      setLocalErr("Shift name, start time, and end time are required.");
      return;
    }

    setLocalErr(null);
    setLocalSuccess(null);
    setLoading(true);

    try {
      await onCreateShiftRoster({
        name: name.trim(),
        startTime,
        endTime,
        gracePeriod: Number(gracePeriod)
      });
      setLocalSuccess("Shift roster configured successfully!");
      setTimeout(() => {
        setShowAddModal(false);
        setName('');
        setStartTime('09:00');
        setEndTime('17:00');
        setGracePeriod(15);
      }, 1000);
    } catch (err: any) {
      setLocalErr(err.message || "Failed to configure shift roster.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-900/40 p-6 rounded-2xl border border-slate-800/80 backdrop-blur-xl">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <CalendarClock className="w-6 h-6 text-indigo-400" />
            Corporate Shifts Roster
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Configure default company work rosters, standard timing start/end hours, and punch-in grace tolerances.
          </p>
        </div>
        <button
          onClick={() => {
            setLocalErr(null);
            setLocalSuccess(null);
            setShowAddModal(true);
          }}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-500 hover:bg-indigo-600 active:scale-95 transition-all text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/20"
        >
          <Plus className="w-5 h-5" />
          Add Shift Roster
        </button>
      </div>

      {/* Roster Cards and Calendar Visual Map */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Shifts List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-slate-900/35 border border-slate-800/80 backdrop-blur-xl rounded-2xl overflow-hidden p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-800/40 pb-3 -mx-6 px-6 bg-slate-950/20 py-3 -mt-6">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-indigo-400" />
                Active Timing Shifts Configurations
              </h3>
              <div className="relative max-w-xs w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search shifts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-950/40 border border-slate-850 rounded-xl text-white text-xs outline-none focus:border-indigo-500 transition-all"
                />
              </div>
            </div>

            {filteredRosters.length === 0 ? (
              <div className="p-12 text-center text-slate-550 flex flex-col items-center justify-center">
                <Clock className="w-12 h-12 text-slate-750 mb-3" />
                <p className="font-semibold text-sm">No custom shifts configured</p>
                <p className="text-slate-650 text-xs mt-1">Add a timing shift to establish custom grace periods and rosters.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {filteredRosters.map((roster) => (
                  <div key={roster.id} className="p-4 bg-slate-950/40 border border-slate-850 hover:border-slate-800 rounded-xl space-y-3 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">{roster.name}</span>
                      <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/15 rounded-full text-[9px] font-bold">
                        Grace: {roster.gracePeriod} min
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs border-t border-slate-900 pt-2 text-slate-450">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-indigo-400" />
                        <span>{roster.startTime} to {roster.endTime}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Roster Timeline Grid */}
        <div className="p-6 bg-slate-900/35 border border-slate-800/80 backdrop-blur-xl rounded-2xl space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-indigo-400" />
            Roster Timeline Visualizer
          </h3>
          <p className="text-slate-500 text-xs leading-relaxed">
            Corporate overview of active shift distribution schedules.
          </p>

          <div className="space-y-4 pt-2">
            {/* Visual Timeline blocks */}
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 bg-indigo-500 rounded-full flex-shrink-0" />
              <div className="text-xs">
                <span className="font-bold text-white block">Morning Shift (09:00 - 17:00)</span>
                <span className="text-slate-500 text-[10px]">Standard Corporate hours with 15 mins grace.</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 bg-rose-500 rounded-full flex-shrink-0" />
              <div className="text-xs">
                <span className="font-bold text-white block">Evening Shift (17:00 - 01:00)</span>
                <span className="text-slate-500 text-[10px]">Corporate night support shifts.</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 bg-amber-500 rounded-full flex-shrink-0" />
              <div className="text-xs">
                <span className="font-bold text-white block">General Flexi Shift</span>
                <span className="text-slate-500 text-[10px]">Flexible timing shifts.</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Shift Roster Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-950/20">
              <h3 className="text-md font-bold text-white flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-indigo-400" />
                Configure Corporate Shift Roster
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-4">
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
                <label className="text-slate-450 text-xs font-semibold uppercase tracking-wider">Shift Roster Label</label>
                <input
                  type="text"
                  placeholder="e.g. Early Morning Shift"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-850 rounded-xl text-white text-sm outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-450 text-xs font-semibold uppercase tracking-wider">Start Time</label>
                  <input
                    type="text"
                    placeholder="09:00"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-850 rounded-xl text-white text-sm outline-none text-center font-mono focus:border-indigo-500"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-450 text-xs font-semibold uppercase tracking-wider">End Time</label>
                  <input
                    type="text"
                    placeholder="17:00"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-850 rounded-xl text-white text-sm outline-none text-center font-mono focus:border-indigo-500"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-450 text-xs font-semibold uppercase tracking-wider">Tardiness Grace Period (Minutes)</label>
                <input
                  type="number"
                  placeholder="15"
                  value={gracePeriod}
                  onChange={(e) => setGracePeriod(Number(e.target.value))}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-850 rounded-xl text-white text-sm outline-none focus:border-indigo-500"
                  min="0"
                  required
                />
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-end gap-3 bg-slate-950/20 -mx-6 -mb-6 p-6">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4.5 py-2 text-slate-400 hover:text-white transition-all text-sm font-semibold hover:bg-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white transition-all text-sm font-bold rounded-xl shadow-lg shadow-indigo-500/20"
                >
                  {loading ? 'Configuring...' : 'Confirm & Configure'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
