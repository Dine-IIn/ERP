import React, { useState, useEffect } from 'react';
import { Cpu, Plus, Search, Layers, ShieldCheck, Activity, Users, Clock, Sliders } from 'lucide-react';

interface WorkCenter {
  id: string;
  name: string;
  code: string;
  capacityHours: number;
  runtimeLogged: number;
  efficiencyScore: number;
  electricityKw: number;
  status: 'OPERATIONAL' | 'MAINTENANCE' | 'OFFLINE';
}

interface FactoryShift {
  id: string;
  operatorName: string;
  workCenterName: string;
  shiftName: string;
  shiftHours: string;
  assignedMachine: string;
  dateScheduled: string;
}

interface ShopFloorProps {
  employees: any[];
}

export default function ShopFloor({ employees = [] }: ShopFloorProps) {
  const [activeTab, setActiveTab] = useState<'centers' | 'shifts'>('centers');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // Mapped Active Employee Operators
  const employeeOperators = employees.length > 0 ? employees : [
    { id: 'emp-static-1', username: 'System Operator 1', role: 'Machine Operator' }
  ];

  // Work Centers - Initialized from LocalStorage (0 static/demo data)
  const [centersList, setCentersList] = useState<WorkCenter[]>(() => {
    const saved = localStorage.getItem('erp_centers');
    return saved ? JSON.parse(saved) : [];
  });

  // Shifts List - Initialized from LocalStorage (0 static/demo data)
  const [shiftsList, setShiftsList] = useState<FactoryShift[]>(() => {
    const saved = localStorage.getItem('erp_shifts');
    return saved ? JSON.parse(saved) : [];
  });

  // Persistence helpers
  useEffect(() => {
    localStorage.setItem('erp_centers', JSON.stringify(centersList));
  }, [centersList]);

  useEffect(() => {
    localStorage.setItem('erp_shifts', JSON.stringify(shiftsList));
  }, [shiftsList]);

  // Modal new Work Center variables
  const [newCenterName, setNewCenterName] = useState('3D Printing Resin Fab');
  const [newCenterCode, setNewCenterCode] = useState('WC-3DFAB-09');
  const [newCenterCapacity, setNewCenterCapacity] = useState(80);
  const [newCenterKw, setNewCenterKw] = useState(25);

  const handleCreateWorkCenter = (e: React.FormEvent) => {
    e.preventDefault();

    const newWC: WorkCenter = {
      id: `wc-${Date.now()}`,
      name: newCenterName,
      code: newCenterCode,
      capacityHours: Number(newCenterCapacity),
      runtimeLogged: 0,
      efficiencyScore: 100,
      electricityKw: Number(newCenterKw),
      status: 'OPERATIONAL'
    };

    setCentersList([...centersList, newWC]);
    setShowAddModal(false);
  };

  const filteredCenters = centersList.filter(wc =>
    wc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    wc.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-900/40 p-6 rounded-2xl border border-slate-800/80 backdrop-blur-xl animate-fade-in">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Cpu className="w-5.5 h-5.5 text-indigo-400" />
            Shop Floor Work Centers & Machines
          </h2>
          <p className="text-slate-400 text-xs mt-1">
            Register factory machinery terminals, audit running capacities load, examine efficiency metrics, and roster employee shift timetables.
          </p>
        </div>
        <div className="flex gap-2.5">
          <div className="flex bg-slate-950/40 p-1 border border-slate-800 rounded-xl">
            <button
              onClick={() => setActiveTab('centers')}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer border-0 ${
                activeTab === 'centers' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white bg-transparent'
              }`}
            >
              Work Centers
            </button>
            <button
              onClick={() => setActiveTab('shifts')}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer border-0 ${
                activeTab === 'shifts' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white bg-transparent'
              }`}
            >
              Factory Shifts
            </button>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 active:scale-95 transition-all text-white font-bold text-xs rounded-xl shadow-lg cursor-pointer border-0"
          >
            <Plus className="w-4 h-4" /> Add Work Center
          </button>
        </div>
      </div>

      {activeTab === 'centers' ? (
        <div className="space-y-4 animate-fade-in text-left">
          {/* Controls */}
          <div className="flex items-center relative w-full max-w-sm">
            <Search className="w-4 h-4 absolute left-3 text-slate-500" />
            <input
              type="text"
              placeholder="Search work centers..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-slate-900/40 border border-slate-800/80 focus:border-indigo-500/50 py-2.5 pl-10 pr-4 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none transition-all"
            />
          </div>

          {/* Grid list */}
          {filteredCenters.length === 0 ? (
            <div className="p-16 text-center text-slate-500 border border-dashed border-slate-800 rounded-2xl bg-slate-900/10 flex flex-col items-center justify-center">
              <Cpu className="w-12 h-12 text-slate-750 mb-3" />
              <p className="font-semibold text-sm">No Work Centers configured</p>
              <p className="text-slate-650 text-xs mt-1">Select "Add Work Center" above to register a machine or assembly station.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {filteredCenters.map(wc => (
                <div key={wc.id} className="bg-slate-900/35 border border-slate-850 p-5 rounded-2xl flex flex-col gap-4 backdrop-blur-md relative overflow-hidden transition-all hover:border-slate-800">
                  <div className="flex items-start justify-between border-b border-slate-850 pb-3">
                    <div className="text-left">
                      <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded border ${
                        wc.status === 'OPERATIONAL'
                          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20'
                          : wc.status === 'MAINTENANCE'
                          ? 'bg-amber-500/15 text-amber-400 border-amber-500/20'
                          : 'bg-rose-500/15 text-rose-400 border-rose-500/20'
                      }`}>
                        {wc.status}
                      </span>
                      <h4 className="font-bold text-sm text-white mt-2">{wc.name}</h4>
                      <p className="text-[10px] text-slate-500 font-mono mt-0.5">{wc.code}</p>
                    </div>
                  </div>

                  <div className="space-y-2 text-[11px] text-slate-400 text-left">
                    <div className="flex justify-between items-center">
                      <span>Electric Power Rating</span>
                      <span className="text-slate-200 font-mono">{wc.electricityKw} kW</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Running Machine Efficiency</span>
                      <span className="text-emerald-400 font-bold">{wc.efficiencyScore}% Score</span>
                    </div>

                    {/* Load/runtime capacity bars */}
                    <div className="pt-2">
                      <div className="flex justify-between text-[10px] text-slate-500 font-bold mb-1">
                        <span>Uptime Capacity Logged</span>
                        <span className="font-mono text-slate-350">{wc.runtimeLogged}h / {wc.capacityHours}h</span>
                      </div>
                      <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                        <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${(wc.runtimeLogged / wc.capacityHours) * 100}%` }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Factory Shift Timetables Roster sheets */
        <div className="bg-slate-900/35 border border-slate-800/80 p-6 rounded-2xl space-y-4 backdrop-blur-xl animate-fade-in text-left">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5 uppercase tracking-wider">
              <Users className="w-4.5 h-4.5 text-indigo-400" />
              Corporate Factory Shifts Rosters & Timetables
            </h3>
            <p className="text-slate-500 text-xs mt-1">
              Organize and view shift calendars for machine technicians scheduled on workstations today.
            </p>
          </div>

          {shiftsList.length === 0 ? (
            <div className="p-16 text-center text-slate-500 border border-dashed border-slate-800 rounded-2xl bg-slate-900/10 flex flex-col items-center justify-center">
              <Sliders className="w-12 h-12 text-slate-750 mb-3" />
              <p className="font-semibold text-sm">No Factory Shifts scheduled</p>
              <p className="text-slate-650 text-xs mt-1">Create a Work Order or Job Card to assign and schedule operator shifts rosters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-slate-300">
                <thead>
                  <tr className="border-b border-slate-900 text-slate-500 font-bold uppercase tracking-wider text-[9px]">
                    <th className="py-2.5 px-3 text-left">Technician Operator</th>
                    <th className="py-2.5 px-3 text-left">Work Center Machine</th>
                    <th className="py-2.5 px-3 text-center">Active Shift Roster</th>
                    <th className="py-2.5 px-3 text-center">Timing Hours</th>
                    <th className="py-2.5 px-3 text-center">Specific Machinery</th>
                    <th className="py-2.5 px-3 text-right">Scheduled Date</th>
                  </tr>
                </thead>
                <tbody>
                  {shiftsList.map((shift, idx) => (
                    <tr key={idx} className="border-b border-slate-900/50 hover:bg-slate-950/20 transition-colors">
                      <td className="py-3 px-3 font-bold text-slate-200">{shift.operatorName}</td>
                      <td className="py-3 px-3 text-left">{shift.workCenterName}</td>
                      <td className="py-3 px-3 text-center">
                        <span className="text-[9px] font-black uppercase bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 py-0.5 px-2 rounded-full">{shift.shiftName}</span>
                      </td>
                      <td className="py-3 px-3 text-center text-slate-400 font-semibold">{shift.shiftHours}</td>
                      <td className="py-3 px-3 text-center font-mono text-indigo-400 font-semibold">{shift.assignedMachine}</td>
                      <td className="py-3 px-3 text-right font-mono text-slate-500">{shift.dateScheduled}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Add Work Center Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md text-left">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-scale-up">
            <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/20">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5 uppercase">
                <Cpu className="w-4 h-4 text-indigo-400" />
                Configure New Shop Floor Work Center
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-500 hover:text-white p-1 hover:bg-slate-800 rounded-lg transition-all border-0 bg-transparent cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateWorkCenter} className="p-6 space-y-4">
              <div>
                <label className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 block mb-1">Work Center Label</label>
                <input
                  type="text"
                  required
                  value={newCenterName}
                  onChange={e => setNewCenterName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 p-2 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 block mb-1">Unique Terminal Code</label>
                  <input
                    type="text"
                    required
                    value={newCenterCode}
                    onChange={e => setNewCenterCode(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 p-2 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 block mb-1">Capacity Hours/Month</label>
                  <input
                    type="number"
                    required
                    value={newCenterCapacity}
                    onChange={e => setNewCenterCapacity(Number(e.target.value))}
                    min="10"
                    className="w-full bg-slate-950 border border-slate-850 p-2 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 block mb-1">Electric Power Draw (kW)</label>
                <input
                  type="number"
                  required
                  value={newCenterKw}
                  onChange={e => setNewCenterKw(Number(e.target.value))}
                  min="1"
                  className="w-full bg-slate-950 border border-slate-850 p-2 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                />
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
                  Activate Center
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
