import React, { useState, useEffect } from 'react';
import { Cpu, Plus, Search, Layers, ShieldCheck, Activity, Users, Clock, Sliders, Trash2, Edit2 } from 'lucide-react';
import { apiClient } from '../../utils/apiService';

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
  operatorId: string;
  operatorName: string;
  workCenterId: string;
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
  const [loading, setLoading] = useState(false);

  // Mapped Active Employee Operators
  const employeeOperators = employees.length > 0 ? employees : [
    { id: 'emp-static-1', username: 'System Operator 1', role: 'Machine Operator' }
  ];

  // Work Centers & Shifts lists
  const [centersList, setCentersList] = useState<WorkCenter[]>([]);
  const [shiftsList, setShiftsList] = useState<FactoryShift[]>([]);

  // Modal new Work Center variables
  const [newCenterName, setNewCenterName] = useState('3D Printing Resin Fab');
  const [newCenterCode, setNewCenterCode] = useState('WC-3DFAB-09');
  const [newCenterCapacity, setNewCenterCapacity] = useState(80);
  const [newCenterKw, setNewCenterKw] = useState(25);

  // Edit Work Center states
  const [showEditWCModal, setShowEditWCModal] = useState(false);
  const [editingWC, setEditingWC] = useState<WorkCenter | null>(null);
  const [editWCName, setEditWCName] = useState('');
  const [editWCCode, setEditWCCode] = useState('');
  const [editWCCapacity, setEditWCCapacity] = useState(0);
  const [editWCKw, setEditWCKw] = useState(0);
  const [editWCStatus, setEditWCStatus] = useState<'OPERATIONAL' | 'MAINTENANCE' | 'OFFLINE'>('OPERATIONAL');

  // Modal schedule Shift variables
  const [showScheduleShiftModal, setShowScheduleShiftModal] = useState(false);
  const [newShiftOperatorId, setNewShiftOperatorId] = useState('');
  const [newShiftWorkCenterId, setNewShiftWorkCenterId] = useState('');
  const [newShiftName, setNewShiftName] = useState('Morning');
  const [newShiftHours, setNewShiftHours] = useState('09:00 - 17:00');
  const [newShiftMachine, setNewShiftMachine] = useState('WC Terminal A');
  const [newShiftDate, setNewShiftDate] = useState(new Date().toISOString().split('T')[0]);

  // Edit Shift states
  const [showEditShiftModal, setShowEditShiftModal] = useState(false);
  const [editingShift, setEditingShift] = useState<FactoryShift | null>(null);
  const [editShiftOperatorId, setEditShiftOperatorId] = useState('');
  const [editShiftWorkCenterId, setEditShiftWorkCenterId] = useState('');
  const [editShiftName, setEditShiftName] = useState('');
  const [editShiftHours, setEditShiftHours] = useState('');
  const [editShiftMachine, setEditShiftMachine] = useState('');
  const [editShiftDate, setEditShiftDate] = useState('');

  const fetchShopFloorData = async () => {
    setLoading(true);
    try {
      const wcRes = await apiClient.get<{ workCenters: any[] }>('/api/manufacturing/work-centers');
      setCentersList(wcRes.workCenters || []);
      
      const shiftsRes = await apiClient.get<{ shifts: any[] }>('/api/manufacturing/shifts');
      setShiftsList((shiftsRes.shifts || []).map((sh: any) => ({
        id: sh.id,
        operatorId: sh.operatorId,
        operatorName: sh.operator?.username || sh.operator?.name || 'Technician',
        workCenterId: sh.workCenterId,
        workCenterName: sh.workCenter?.name || 'Work Station',
        shiftName: sh.shiftName,
        shiftHours: sh.shiftHours,
        assignedMachine: sh.assignedMachine,
        dateScheduled: sh.dateScheduled?.split('T')[0] || ''
      })));
    } catch (err: any) {
      console.error('Failed to load shop floor data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShopFloorData();
  }, [employees]);

  // Initialize dropdown default selections
  useEffect(() => {
    if (employeeOperators.length > 0 && !newShiftOperatorId) {
      setNewShiftOperatorId(employeeOperators[0].id);
    }
  }, [employeeOperators]);

  useEffect(() => {
    if (centersList.length > 0 && !newShiftWorkCenterId) {
      setNewShiftWorkCenterId(centersList[0].id);
    }
  }, [centersList]);

  const handleCreateWorkCenter = (e: React.FormEvent) => {
    e.preventDefault();
    apiClient.post('/api/manufacturing/work-centers', {
      name: newCenterName,
      code: newCenterCode,
      capacityHours: Number(newCenterCapacity),
      electricityKw: Number(newCenterKw)
    }).then(() => {
      fetchShopFloorData();
      setShowAddModal(false);
    }).catch((err: any) => {
      alert("Error creating work center: " + (err.response?.data?.error || err.message));
    });
  };

  const openEditWC = (wc: WorkCenter) => {
    setEditingWC(wc);
    setEditWCName(wc.name);
    setEditWCCode(wc.code);
    setEditWCCapacity(wc.capacityHours);
    setEditWCKw(wc.electricityKw);
    setEditWCStatus(wc.status);
    setShowEditWCModal(true);
  };

  const handleUpdateWorkCenter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWC) return;
    apiClient.put(`/api/manufacturing/work-centers/${editingWC.id}`, {
      name: editWCName,
      code: editWCCode,
      capacityHours: Number(editWCCapacity),
      electricityKw: Number(editWCKw),
      status: editWCStatus
    }).then(() => {
      fetchShopFloorData();
      setShowEditWCModal(false);
      setEditingWC(null);
    }).catch((err: any) => {
      alert("Error updating work center: " + (err.response?.data?.error || err.message));
    });
  };

  const handleDeleteWC = async (id: string) => {
    if (!confirm("Are you sure you want to remove this Work Center Machine? This cannot be undone.")) return;
    try {
      await apiClient.delete(`/api/manufacturing/work-centers/${id}`);
      fetchShopFloorData();
    } catch (err: any) {
      alert("Error deleting work center: " + (err.response?.data?.error || err.message));
    }
  };

  const handleScheduleShift = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newShiftOperatorId || !newShiftWorkCenterId) return;

    apiClient.post('/api/manufacturing/shifts', {
      operatorId: newShiftOperatorId,
      workCenterId: newShiftWorkCenterId,
      shiftName: newShiftName,
      shiftHours: newShiftHours,
      assignedMachine: newShiftMachine,
      dateScheduled: newShiftDate
    }).then(() => {
      fetchShopFloorData();
      setShowScheduleShiftModal(false);
    }).catch((err: any) => {
      alert("Error scheduling shift: " + (err.response?.data?.error || err.message));
    });
  };

  const openEditShift = (sh: FactoryShift) => {
    setEditingShift(sh);
    setEditShiftOperatorId(sh.operatorId);
    setEditShiftWorkCenterId(sh.workCenterId);
    setEditShiftName(sh.shiftName);
    setEditShiftHours(sh.shiftHours);
    setEditShiftMachine(sh.assignedMachine);
    setEditShiftDate(sh.dateScheduled);
    setShowEditShiftModal(true);
  };

  const handleUpdateShift = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingShift) return;

    apiClient.put(`/api/manufacturing/shifts/${editingShift.id}`, {
      operatorId: editShiftOperatorId,
      workCenterId: editShiftWorkCenterId,
      shiftName: editShiftName,
      shiftHours: editShiftHours,
      assignedMachine: editShiftMachine,
      dateScheduled: editShiftDate
    }).then(() => {
      fetchShopFloorData();
      setShowEditShiftModal(false);
      setEditingShift(null);
    }).catch((err: any) => {
      alert("Error updating shift: " + (err.response?.data?.error || err.message));
    });
  };

  const handleDeleteShift = async (id: string) => {
    if (!confirm("Are you sure you want to cancel this shift roster?")) return;
    try {
      await apiClient.delete(`/api/manufacturing/shifts/${id}`);
      fetchShopFloorData();
    } catch (err: any) {
      alert("Error cancelling shift: " + (err.response?.data?.error || err.message));
    }
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
            onClick={() => {
              if (activeTab === 'centers') {
                setShowAddModal(true);
              } else {
                setShowScheduleShiftModal(true);
              }
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 active:scale-95 transition-all text-white font-bold text-xs rounded-xl shadow-lg cursor-pointer border-0"
          >
            <Plus className="w-4 h-4" /> {activeTab === 'centers' ? 'Add Work Center' : 'Schedule Shift'}
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
                    <div className="text-left flex-1">
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
                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={() => openEditWC(wc)}
                        className="text-indigo-400 hover:text-indigo-300 p-1.5 hover:bg-slate-950/45 rounded transition-all cursor-pointer border-0 bg-transparent"
                        title="Edit Work Center"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteWC(wc.id)}
                        className="text-rose-450 hover:text-rose-400 p-1.5 hover:bg-slate-950/45 rounded transition-all cursor-pointer border-0 bg-transparent"
                        title="Delete Work Center"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
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
                      <div className="flex justify-between text-[10px] text-slate-550 font-bold mb-1">
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
                    <th className="py-2.5 px-3 text-center">Scheduled Date</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {shiftsList.map((shift) => (
                    <tr key={shift.id} className="border-b border-slate-900/50 hover:bg-slate-950/20 transition-colors">
                      <td className="py-3 px-3 font-bold text-slate-200">{shift.operatorName}</td>
                      <td className="py-3 px-3 text-left">{shift.workCenterName}</td>
                      <td className="py-3 px-3 text-center">
                        <span className="text-[9px] font-black uppercase bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 py-0.5 px-2 rounded-full">{shift.shiftName}</span>
                      </td>
                      <td className="py-3 px-3 text-center text-slate-400 font-semibold">{shift.shiftHours}</td>
                      <td className="py-3 px-3 text-center font-mono text-indigo-400 font-semibold">{shift.assignedMachine}</td>
                      <td className="py-3 px-3 text-center font-mono text-slate-500">{shift.dateScheduled}</td>
                      <td className="py-3 px-3 text-right flex gap-1 justify-end">
                        <button
                          onClick={() => openEditShift(shift)}
                          className="text-indigo-400 hover:text-indigo-300 p-1.5 hover:bg-slate-950/45 rounded transition-all cursor-pointer border-0 bg-transparent"
                          title="Edit Shift"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteShift(shift.id)}
                          className="text-rose-455 hover:text-rose-400 p-1.5 hover:bg-slate-950/45 rounded transition-all cursor-pointer border-0 bg-transparent"
                          title="Cancel Shift"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md text-left animate-fade-in">
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

      {/* Edit Work Center Modal */}
      {showEditWCModal && editingWC && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md text-left animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-scale-up">
            <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/20">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5 uppercase">
                <Cpu className="w-4 h-4 text-indigo-400" />
                Modify Work Center Config
              </h3>
              <button
                onClick={() => { setShowEditWCModal(false); setEditingWC(null); }}
                className="text-slate-500 hover:text-white p-1 hover:bg-slate-800 rounded-lg transition-all border-0 bg-transparent cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateWorkCenter} className="p-6 space-y-4">
              <div>
                <label className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 block mb-1">Work Center Label</label>
                <input
                  type="text"
                  required
                  value={editWCName}
                  onChange={e => setEditWCName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 p-2.5 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 block mb-1">Terminal Code</label>
                  <input
                    type="text"
                    required
                    value={editWCCode}
                    onChange={e => setEditWCCode(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 p-2.5 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 block mb-1">Capacity Hours/Month</label>
                  <input
                    type="number"
                    required
                    value={editWCCapacity}
                    onChange={e => setEditWCCapacity(Number(e.target.value))}
                    min="10"
                    className="w-full bg-slate-950 border border-slate-850 p-2.5 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 block mb-1">Electric Power Rating (kW)</label>
                  <input
                    type="number"
                    required
                    value={editWCKw}
                    onChange={e => setEditWCKw(Number(e.target.value))}
                    min="1"
                    className="w-full bg-slate-950 border border-slate-850 p-2.5 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 block mb-1">Operational Status</label>
                  <select
                    value={editWCStatus}
                    onChange={e => setEditWCStatus(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-850 p-2.5 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="OPERATIONAL">OPERATIONAL</option>
                    <option value="MAINTENANCE">MAINTENANCE</option>
                    <option value="OFFLINE">OFFLINE</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-3">
                <button
                  type="button"
                  onClick={() => { setShowEditWCModal(false); setEditingWC(null); }}
                  className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl border-0 cursor-pointer transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl border-0 cursor-pointer transition-all shadow-lg shadow-indigo-600/10"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Schedule Shift Modal */}
      {showScheduleShiftModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md text-left animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-scale-up">
            <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/20">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5 uppercase">
                <Clock className="w-4 h-4 text-indigo-400" />
                Schedule Factory Shift
              </h3>
              <button
                onClick={() => setShowScheduleShiftModal(false)}
                className="text-slate-500 hover:text-white p-1 hover:bg-slate-800 rounded-lg transition-all border-0 bg-transparent cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleScheduleShift} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 block mb-1">Technician Operator</label>
                  <select
                    value={newShiftOperatorId}
                    onChange={e => setNewShiftOperatorId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 p-2.5 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    {employeeOperators.map(op => (
                      <option key={op.id} value={op.id}>{op.username || op.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 block mb-1">Work Center Machine</label>
                  <select
                    value={newShiftWorkCenterId}
                    onChange={e => setNewShiftWorkCenterId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 p-2.5 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    {centersList.map(wc => (
                      <option key={wc.id} value={wc.id}>{wc.name} ({wc.code})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 block mb-1">Shift Name</label>
                  <input
                    type="text"
                    required
                    value={newShiftName}
                    onChange={e => setNewShiftName(e.target.value)}
                    placeholder="e.g. Morning, Night"
                    className="w-full bg-slate-950 border border-slate-850 p-2.5 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 block mb-1">Shift Hours</label>
                  <input
                    type="text"
                    required
                    value={newShiftHours}
                    onChange={e => setNewShiftHours(e.target.value)}
                    placeholder="e.g. 09:00 - 17:00"
                    className="w-full bg-slate-950 border border-slate-850 p-2.5 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 block mb-1">Machinery Terminal</label>
                  <input
                    type="text"
                    required
                    value={newShiftMachine}
                    onChange={e => setNewShiftMachine(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 p-2.5 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 block mb-1">Scheduled Date</label>
                  <input
                    type="date"
                    required
                    value={newShiftDate}
                    onChange={e => setNewShiftDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 p-2.5 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-3">
                <button
                  type="button"
                  onClick={() => setShowScheduleShiftModal(false)}
                  className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl border-0 cursor-pointer transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl border-0 cursor-pointer transition-all shadow-lg"
                >
                  Roster Shift
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditShiftModal && editingShift && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md text-left animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-scale-up">
            <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/20">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5 uppercase">
                <Clock className="w-4 h-4 text-indigo-400" />
                Modify Scheduled Shift
              </h3>
              <button
                onClick={() => { setShowEditShiftModal(false); setEditingShift(null); }}
                className="text-slate-500 hover:text-white p-1 hover:bg-slate-800 rounded-lg transition-all border-0 bg-transparent cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateShift} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 block mb-1">Technician Operator</label>
                  <select
                    value={editShiftOperatorId}
                    onChange={e => setEditShiftOperatorId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 p-2.5 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    {employeeOperators.map(op => (
                      <option key={op.id} value={op.id}>{op.username || op.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 block mb-1">Work Center Machine</label>
                  <select
                    value={editShiftWorkCenterId}
                    onChange={e => setEditShiftWorkCenterId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 p-2.5 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    {centersList.map(wc => (
                      <option key={wc.id} value={wc.id}>{wc.name} ({wc.code})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 block mb-1">Shift Name</label>
                  <input
                    type="text"
                    required
                    value={editShiftName}
                    onChange={e => setEditShiftName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 p-2.5 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 block mb-1">Shift Hours</label>
                  <input
                    type="text"
                    required
                    value={editShiftHours}
                    onChange={e => setEditShiftHours(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 p-2.5 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 block mb-1">Machinery Terminal</label>
                  <input
                    type="text"
                    required
                    value={editShiftMachine}
                    onChange={e => setEditShiftMachine(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 p-2.5 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 block mb-1">Scheduled Date</label>
                  <input
                    type="date"
                    required
                    value={editShiftDate}
                    onChange={e => setEditShiftDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 p-2.5 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-3">
                <button
                  type="button"
                  onClick={() => { setShowEditShiftModal(false); setEditingShift(null); }}
                  className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl border-0 cursor-pointer transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl border-0 cursor-pointer transition-all shadow-lg"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
