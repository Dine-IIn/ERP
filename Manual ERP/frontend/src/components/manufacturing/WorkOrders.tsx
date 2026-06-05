import React, { useState, useEffect } from 'react';
import { ClipboardSignature, Plus, Search, Layers, Play, CheckCircle2, Trash2, Edit2, Users, Clock, Cpu } from 'lucide-react';
import { apiClient, formatNumber } from '../../utils/apiService';

interface WorkOrder {
  id: string;
  woNo: string;
  planId: string;
  finishedProductName: string;
  finishedProductCode: string;
  qtyTarget: number;
  qtyProduced: number;
  priority: 'URGENT' | 'HIGH' | 'NORMAL';
  status: 'DRAFT' | 'RELEASED' | 'IN_PROGRESS' | 'COMPLETED';
  routingStage: string;
  createdAt: string;
}

interface JobCard {
  id: string;
  woId: string;
  woNo: string;
  operationName: string;
  workCenterName: string;
  assignedOperator: string;
  operatorId: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'PAUSED';
  startTime?: string;
  endTime?: string;
  cycleTimeMinutes: number;
  qtyTarget: number;
  qtyAccepted: number;
  qtyScrapped: number;
}

interface WorkOrdersProps {
  employees: any[];
}

export default function WorkOrders({ employees = [] }: WorkOrdersProps) {
  const [activeTab, setActiveTab] = useState<'wo' | 'jobs'>('wo');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAddJobModal, setShowAddJobModal] = useState(false);
  
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [isEditingJob, setIsEditingJob] = useState(false);
  const [editingJobId, setEditingJobId] = useState<string | null>(null);

  // Core Mapped Active Employees (connected to HR Employees Directory)
  const employeeOperators = employees.length > 0 ? employees : [];

  // Core Mapped Active Production Plans from database
  const [activeReleasedPlans, setActiveReleasedPlans] = useState<any[]>([]);

  // Lists
  const [workOrdersList, setWorkOrdersList] = useState<WorkOrder[]>([]);
  const [jobCardsList, setJobCardsList] = useState<JobCard[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchWorkOrders = async () => {
    setLoading(true);
    try {
      const data = await apiClient.get<{ workOrders: any[] }>('/api/manufacturing/work-orders');
      const formatted = (data.workOrders || []).map((wo: any) => ({
        id: wo.id,
        woNo: wo.woNo,
        planId: wo.planId,
        finishedProductName: wo.plan?.finishedProduct?.name || 'Finished Goods',
        finishedProductCode: wo.plan?.finishedProduct?.hsnSacCode || wo.plan?.finishedProduct?.code || 'PROD-CF90',
        qtyTarget: wo.qtyTarget,
        qtyProduced: wo.qtyProduced,
        priority: wo.priority,
        status: wo.status,
        routingStage: wo.routingStage,
        createdAt: wo.createdAt?.split('T')[0] || ''
      }));
      setWorkOrdersList(formatted);
    } catch (err) {
      console.error('Failed to load work orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchJobCards = async () => {
    try {
      const data = await apiClient.get<{ jobCards: any[] }>('/api/manufacturing/job-cards');
      const formatted = (data.jobCards || []).map((job: any) => ({
        id: job.id,
        woId: job.woId,
        woNo: job.workOrder?.woNo || 'WO-UNKNOWN',
        operationName: job.operationName,
        workCenterName: job.workCenterId || 'Center A',
        assignedOperator: job.assignedOperator?.username || 'Operator',
        operatorId: job.assignedOperatorId || '',
        status: job.status,
        startTime: job.startTime ? new Date(job.startTime).toISOString().replace('T', ' ').substring(0, 16) : undefined,
        endTime: job.endTime ? new Date(job.endTime).toISOString().replace('T', ' ').substring(0, 16) : undefined,
        cycleTimeMinutes: job.cycleTimeMinutes,
        qtyTarget: job.qtyTarget,
        qtyAccepted: job.qtyAccepted,
        qtyScrapped: job.qtyScrapped
      }));
      setJobCardsList(formatted);
    } catch (err) {
      console.error('Failed to load job cards:', err);
    }
  };

  const fetchPlans = async () => {
    try {
      const data = await apiClient.get<{ plans: any[] }>('/api/manufacturing/plans');
      const releasedPlans = (data.plans || []).filter((p: any) => p.status === 'RELEASED');
      setActiveReleasedPlans(releasedPlans);
    } catch (err) {
      console.error('Failed to load production plans:', err);
    }
  };

  useEffect(() => {
    fetchWorkOrders();
    fetchJobCards();
    fetchPlans();
  }, [employees]);

  // Modal new Work Order variables
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [woPriority, setWoPriority] = useState<'URGENT' | 'HIGH' | 'NORMAL'>('HIGH');

  // Modal new Job Card variables
  const [selectedWoId, setSelectedWoId] = useState('');
  const [jobOperationName, setJobOperationName] = useState('Autoclave Molding');
  const [jobWorkCenter, setJobWorkCenter] = useState('Autoclave Molding Oven B');
  const [selectedOperatorId, setSelectedOperatorId] = useState('');
  const [jobCycleTime, setJobCycleTime] = useState(30);
  const [jobQtyTarget, setJobQtyTarget] = useState(10);

  // Set default dropdown selections when list loads
  useEffect(() => {
    if (activeReleasedPlans.length > 0 && !selectedPlanId) {
      setSelectedPlanId(activeReleasedPlans[0].id);
    }
  }, [activeReleasedPlans, selectedPlanId]);

  useEffect(() => {
    if (workOrdersList.length > 0 && !selectedWoId) {
      setSelectedWoId(workOrdersList[0].id);
    }
  }, [workOrdersList, selectedWoId]);

  useEffect(() => {
    if (employeeOperators.length > 0 && !selectedOperatorId) {
      setSelectedOperatorId(employeeOperators[0].id);
    }
  }, [employeeOperators, selectedOperatorId]);

  const handleCreateWorkOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const plan = activeReleasedPlans.find(p => p.id === selectedPlanId);
    if (!plan && !isEditing) {
      alert("Please configure and schedule a Production Plan first before creating a Work Order!");
      return;
    }

    try {
      if (isEditing && editingId) {
        await apiClient.put(`/api/manufacturing/work-orders/${editingId}`, {
          priority: woPriority
        });
      } else {
        const payload = {
          planId: selectedPlanId,
          woNo: `WO-2026-${Math.floor(1000 + Math.random() * 9000)}`,
          qtyTarget: Number(plan.qtyToProduce),
          priority: woPriority
        };
        await apiClient.post('/api/manufacturing/work-orders', payload);
      }
      setShowAddModal(false);
      setIsEditing(false);
      setEditingId(null);
      fetchWorkOrders();
      fetchPlans();
    } catch (err: any) {
      alert(err.message || 'Failed to save Work Order');
    }
  };

  const handleCreateJobCardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      woId: selectedWoId,
      operationName: jobOperationName,
      workCenterId: jobWorkCenter,
      assignedOperatorId: selectedOperatorId,
      cycleTimeMinutes: Number(jobCycleTime),
      qtyTarget: Number(jobQtyTarget)
    };

    try {
      if (isEditingJob && editingJobId) {
        await apiClient.put(`/api/manufacturing/job-cards/${editingJobId}`, payload);
      } else {
        await apiClient.post('/api/manufacturing/job-cards', payload);
      }
      setShowAddJobModal(false);
      setIsEditingJob(false);
      setEditingJobId(null);
      fetchJobCards();
    } catch (err: any) {
      alert(err.message || 'Failed to save job card');
    }
  };

  const handleStartWO = async (woId: string) => {
    try {
      await apiClient.post(`/api/manufacturing/work-orders/${woId}/start`);
      fetchWorkOrders();
    } catch (err: any) {
      alert(err.message || 'Failed to start Work Order');
    }
  };

  const handleDeleteWO = async (id: string) => {
    if (window.confirm("Are you sure you want to permanently delete this Work Order?")) {
      try {
        await apiClient.delete(`/api/manufacturing/work-orders/${id}`);
        fetchWorkOrders();
      } catch (err: any) {
        alert(err.message || 'Failed to delete Work Order');
      }
    }
  };

  const handleStartJob = async (jobId: string) => {
    try {
      await apiClient.post(`/api/manufacturing/job-cards/${jobId}/start`);
      fetchJobCards();
    } catch (err: any) {
      alert(err.message || 'Failed to start job');
    }
  };

  const handleCompleteJob = async (jobId: string, accepted: number, scrapped: number) => {
    try {
      await apiClient.post(`/api/manufacturing/job-cards/${jobId}/complete`, {
        qtyAccepted: Number(accepted),
        qtyScrapped: Number(scrapped)
      });
      fetchJobCards();
    } catch (err: any) {
      alert(err.message || 'Failed to complete job');
    }
  };

  const handleDeleteJob = async (id: string) => {
    if (window.confirm("Are you sure you want to permanently delete this Job Card?")) {
      try {
        await apiClient.delete(`/api/manufacturing/job-cards/${id}`);
        fetchJobCards();
      } catch (err: any) {
        alert(err.message || 'Failed to delete Job Card');
      }
    }
  };

  const filteredWO = workOrdersList.filter(wo =>
    wo.finishedProductName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    wo.woNo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-900/40 p-6 rounded-2xl border border-slate-800/80 backdrop-blur-xl animate-fade-in">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <ClipboardSignature className="w-5.5 h-5.5 text-indigo-400" />
            Shop Floor Work Orders & Job Cards
          </h2>
          <p className="text-slate-400 text-xs mt-1">
            Dispatch official production assembly tickets to factory floors, map machine operational routings, assign operators, and audit time logs.
          </p>
        </div>
        <div className="flex gap-2.5">
          <button
            onClick={() => setActiveTab(activeTab === 'wo' ? 'jobs' : 'wo')}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 hover:border-slate-600/85 text-slate-300 hover:text-white font-semibold text-xs rounded-xl transition-all cursor-pointer border-0"
          >
            <Users className="w-4 h-4 text-indigo-400" />
            {activeTab === 'wo' ? 'Track Operator Job Cards' : 'Manage Work Orders'}
          </button>
          {activeTab === 'jobs' ? (
            <button
              onClick={() => {
                if (workOrdersList.length === 0) {
                  alert("Please release a Work Order first before configuring Job Cards!");
                  return;
                }
                setIsEditingJob(false);
                setEditingJobId(null);
                setShowAddJobModal(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 active:scale-95 transition-all text-white font-bold text-xs rounded-xl shadow-lg cursor-pointer border-0"
            >
              <Plus className="w-4 h-4" /> Create Job Card
            </button>
          ) : (
            <button
              onClick={() => {
                if (activeReleasedPlans.length === 0) {
                  alert("Please configure and schedule a Production Plan first before releasing Work Orders!");
                  return;
                }
                setIsEditing(false);
                setEditingId(null);
                setShowAddModal(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 active:scale-95 transition-all text-white font-bold text-xs rounded-xl shadow-lg cursor-pointer border-0"
            >
              <Plus className="w-4 h-4" /> Dispatch Work Order
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400 text-xs">Syncing operations logs...</div>
      ) : activeTab === 'wo' ? (
        <div className="space-y-4 animate-fade-in text-left">
          {/* Search */}
          <div className="flex items-center relative w-full max-w-sm">
            <Search className="w-4 h-4 absolute left-3 text-slate-500" />
            <input
              type="text"
              placeholder="Search work order numbers..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-slate-900/40 border border-slate-800/80 focus:border-indigo-500/50 py-2.5 pl-10 pr-4 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none transition-all"
            />
          </div>

          {/* Work Orders List */}
          {filteredWO.length === 0 ? (
            <div className="p-16 text-center text-slate-500 border border-dashed border-slate-800 rounded-2xl bg-slate-900/10 flex flex-col items-center justify-center">
              <ClipboardSignature className="w-12 h-12 text-slate-750 mb-3" />
              <p className="font-semibold text-sm">No dispatched Work Orders</p>
              <p className="text-slate-650 text-xs mt-1">Configure and schedule a production plan to dispatch custom assembly tickets.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {filteredWO.map(wo => (
                <div key={wo.id} className="bg-slate-900/35 border border-slate-850 p-5 rounded-2xl flex flex-col gap-4 backdrop-blur-md relative overflow-hidden transition-all hover:border-slate-800">
                  <div className="flex items-start justify-between border-b border-slate-850 pb-3">
                    <div>
                      <span className={`text-[8px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                        wo.priority === 'URGENT'
                          ? 'bg-rose-500/15 text-rose-400 border-rose-500/20'
                          : wo.priority === 'HIGH'
                          ? 'bg-amber-500/15 text-amber-400 border-amber-500/20'
                          : 'bg-indigo-500/15 text-indigo-400 border-indigo-500/20'
                      }`}>
                        {wo.priority} Priority
                      </span>
                      <h4 className="font-bold text-sm text-white mt-2">{wo.finishedProductName}</h4>
                      <p className="text-[10px] text-slate-500 font-mono mt-0.5">{wo.woNo}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] text-slate-500 block uppercase font-semibold">Yield Target</span>
                      <span className="text-base font-extrabold text-white mt-1 block">{formatNumber(wo.qtyTarget)} units</span>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between items-center text-slate-400">
                      <span>Routing Stage</span>
                      <span className="text-slate-200 font-medium flex items-center gap-1">
                        <Cpu className="w-3.5 h-3.5 text-indigo-400" /> {wo.routingStage}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-slate-400">
                      <span>Production Yield Progress</span>
                      <span className="text-slate-200 font-bold">{formatNumber(wo.qtyProduced)} / {formatNumber(wo.qtyTarget)} completed</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-400">
                      <span>Dispatched Date</span>
                      <span className="text-slate-200 font-semibold">{wo.createdAt}</span>
                    </div>
                  </div>

                  <div className="border-t border-slate-850/60 pt-3.5 flex items-center justify-between">
                    <span className={`text-[10px] font-extrabold uppercase ${
                      wo.status === 'COMPLETED' ? 'text-emerald-400' : wo.status === 'IN_PROGRESS' ? 'text-indigo-400' : 'text-slate-550'
                    }`}>
                      Status: {wo.status}
                    </span>
                    
                    <div className="flex gap-2">
                      {wo.status === 'RELEASED' && (
                        <button
                          onClick={() => handleStartWO(wo.id)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[10px] uppercase rounded-lg border-0 cursor-pointer transition-all"
                        >
                          <Play className="w-3 h-3" /> Start Run
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setSelectedPlanId(wo.planId);
                          setWoPriority(wo.priority);
                          setIsEditing(true);
                          setEditingId(wo.id);
                          setShowAddModal(true);
                        }}
                        className="px-2.5 py-1.5 bg-indigo-650/10 hover:bg-indigo-650 text-indigo-400 hover:text-white rounded-lg text-[10px] uppercase font-bold cursor-pointer transition-all border-0 bg-transparent flex items-center gap-1"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteWO(wo.id)}
                        className="px-2.5 py-1.5 bg-rose-650/10 hover:bg-rose-600 text-rose-400 hover:text-white rounded-lg text-[10px] uppercase font-bold cursor-pointer transition-all border-0 bg-transparent flex items-center gap-1"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Job Cards Console */
        <div className="bg-slate-900/35 border border-slate-800/80 p-6 rounded-2xl space-y-6 backdrop-blur-xl animate-fade-in text-left">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5 uppercase tracking-wider">
              <Users className="w-4.5 h-4.5 text-indigo-400" />
              Corporate Operator Job Cards & Route Sheeting
            </h3>
            <p className="text-slate-500 text-xs mt-1">
              Roster factory technicians, initiate assembly routing operations timers, and log real-time scrap.
            </p>
          </div>

          {jobCardsList.length === 0 ? (
            <div className="p-16 text-center text-slate-500 border border-dashed border-slate-800 rounded-2xl bg-slate-900/10 flex flex-col items-center justify-center">
              <Users className="w-12 h-12 text-slate-750 mb-3" />
              <p className="font-semibold text-sm">No Job Cards configured</p>
              <p className="text-slate-650 text-xs mt-1">Select "Create Job Card" above to roster a technician on an active shop floor routing stage.</p>
            </div>
          ) : (
            <div className="space-y-5">
              {jobCardsList.map(job => {
                const [accepted, setAccepted] = useState(job.qtyTarget);
                const [scrapped, setScrapped] = useState(0);

                return (
                  <div key={job.id} className="p-5 bg-slate-950/30 border border-slate-850 rounded-2xl flex flex-col md:flex-row gap-5 items-start md:items-center justify-between">
                    <div className="space-y-2 text-left flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded border ${
                          job.status === 'RUNNING' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' : 'bg-slate-900 text-slate-500 border-slate-800'
                        }`}>{job.status}</span>
                        <span className="text-[10px] text-slate-500 font-mono">Work Order: {job.woNo}</span>
                      </div>
                      <h4 className="font-extrabold text-sm text-white">{job.operationName}</h4>
                      <p className="text-[10px] text-slate-400 flex items-center gap-1.5">
                        <Cpu className="w-3.5 h-3.5 text-indigo-400" /> {job.workCenterName}
                      </p>
                      <div className="flex gap-4 text-[10px] text-slate-500 pt-1.5">
                        <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> Operator: <strong className="text-slate-300">{job.assignedOperator}</strong></span>
                        <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Cycle Time: <strong className="text-slate-300">{job.cycleTimeMinutes} min</strong></span>
                      </div>
                    </div>

                    <div className="flex gap-4 items-center">
                      {job.status === 'PENDING' && (
                        <button
                          onClick={() => handleStartJob(job.id)}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl border-0 cursor-pointer transition-all active:scale-95 shadow-md shadow-indigo-600/10 flex items-center gap-1"
                        >
                          <Play className="w-3.5 h-3.5" /> Start Operation
                        </button>
                      )}

                      {job.status === 'RUNNING' && (
                        <div className="flex flex-col sm:flex-row gap-3 items-end">
                          <div className="flex gap-2">
                            <div>
                              <label className="text-[8px] font-bold text-slate-500 uppercase block mb-1">Accepted Yield</label>
                              <input
                                type="number"
                                value={accepted}
                                onChange={e => setAccepted(Number(e.target.value))}
                                className="w-16 bg-slate-900 border border-slate-800 p-1 rounded text-[10px] text-white focus:outline-none focus:border-indigo-500 text-center font-mono"
                              />
                            </div>
                            <div>
                              <label className="text-[8px] font-bold text-slate-500 uppercase block mb-1">Scrapped Qty</label>
                              <input
                                type="number"
                                value={scrapped}
                                onChange={e => setScrapped(Number(e.target.value))}
                                className="w-16 bg-slate-900 border border-slate-800 p-1 rounded text-[10px] text-white focus:outline-none focus:border-indigo-500 text-center font-mono"
                              />
                            </div>
                          </div>
                          <button
                            onClick={() => handleCompleteJob(job.id, accepted, scrapped)}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl border-0 cursor-pointer transition-all active:scale-95 shadow-md shadow-emerald-600/10 flex items-center gap-1"
                          >
                            <CheckCircle2 className="w-4 h-4" /> End & log
                          </button>
                        </div>
                      )}

                      {job.status === 'COMPLETED' && (
                        <div className="text-right">
                          <span className="text-[9px] text-slate-500 block uppercase font-bold tracking-wider">Completed Logs</span>
                          <span className="text-xs font-bold text-emerald-400 mt-1 block">Accepted: {formatNumber(job.qtyAccepted)} | Scrap: {formatNumber(job.qtyScrapped)}</span>
                          <span className="text-[9px] text-slate-650 font-mono mt-0.5 block">Ended at: {job.endTime}</span>
                        </div>
                      )}

                      {/* Edit / Delete on Job Cards */}
                      <div className="flex flex-col gap-1.5 ml-2">
                        {job.status === 'PENDING' && (
                          <button
                            onClick={() => {
                              setSelectedWoId(job.woId);
                              setJobOperationName(job.operationName);
                              setJobWorkCenter(job.workCenterName);
                              setSelectedOperatorId(job.operatorId);
                              setJobCycleTime(job.cycleTimeMinutes);
                              setJobQtyTarget(job.qtyTarget);
                              setIsEditingJob(true);
                              setEditingJobId(job.id);
                              setShowAddJobModal(true);
                            }}
                            className="p-1.5 text-indigo-400 hover:bg-indigo-600/15 rounded border-0 bg-transparent cursor-pointer"
                            title="Edit Job Card"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteJob(job.id)}
                          className="p-1.5 text-rose-450 hover:bg-rose-500/15 rounded border-0 bg-transparent cursor-pointer"
                          title="Delete Job Card"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Add Work Order Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md text-left">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-scale-up">
            <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/20">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5 uppercase">
                <ClipboardSignature className="w-4 h-4 text-indigo-400" />
                {isEditing ? 'Modify Assembly Work Order Priority' : 'Dispatch Assembly Work Order'}
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-500 hover:text-white p-1 hover:bg-slate-800 rounded-lg transition-all border-0 bg-transparent cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateWorkOrderSubmit} className="p-6 space-y-4">
              {!isEditing && (
                <div>
                  <label className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 block mb-1">Select Scheduled Production Plan</label>
                  <select
                    value={selectedPlanId}
                    onChange={e => setSelectedPlanId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 p-2.5 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    {activeReleasedPlans.map(p => (
                      <option key={p.id} value={p.id}>{p.finishedProductName} (Plan Target: {p.qtyToProduce} units)</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 block mb-1">Priority Classification</label>
                <select
                  value={woPriority}
                  onChange={e => setWoPriority(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-850 p-2.5 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="NORMAL">Normal Standard priority</option>
                  <option value="HIGH">High speed priority</option>
                  <option value="URGENT">Urgent Express dispatch</option>
                </select>
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
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl border-0 cursor-pointer transition-all shadow-lg"
                >
                  {isEditing ? 'Save Changes' : 'Dispatch to Floor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Job Card Modal */}
      {showAddJobModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md text-left">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-scale-up">
            <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/20">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5 uppercase">
                <Users className="w-4 h-4 text-indigo-400" />
                {isEditingJob ? 'Edit Job Card details' : 'Roster Operator Job Card'}
              </h3>
              <button
                onClick={() => setShowAddJobModal(false)}
                className="text-slate-500 hover:text-white p-1 hover:bg-slate-800 rounded-lg transition-all border-0 bg-transparent cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateJobCardSubmit} className="p-6 space-y-4">
              <div>
                <label className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 block mb-1">Select Work Order Target</label>
                <select
                  value={selectedWoId}
                  onChange={e => setSelectedWoId(e.target.value)}
                  disabled={isEditingJob}
                  className="w-full bg-slate-950 border border-slate-850 p-2.5 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500 disabled:opacity-55"
                >
                  {workOrdersList.map(wo => (
                    <option key={wo.id} value={wo.id}>{wo.woNo} - {wo.finishedProductName}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 block mb-1">Operation Routing Name</label>
                  <select
                    value={jobOperationName}
                    onChange={e => setJobOperationName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 p-2.5 rounded-lg text-xs text-white focus:outline-none"
                  >
                    <option value="Autoclave Molding">Autoclave Molding & Layup</option>
                    <option value="Robotic Precision Welding">Robotic Precision Welding</option>
                    <option value="Torque Stress testing">Torque Stress testing</option>
                    <option value="Anodized Spray Finish">Anodized Spray Finish</option>
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 block mb-1">Machine / Work Center</label>
                  <input
                    type="text"
                    required
                    value={jobWorkCenter}
                    onChange={e => setJobWorkCenter(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 p-2 rounded-lg text-xs text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 block mb-1">Assign Operator Technician</label>
                  <select
                    value={selectedOperatorId}
                    onChange={e => setSelectedOperatorId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 p-2.5 rounded-lg text-xs text-white focus:outline-none"
                  >
                    {employeeOperators.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.username} ({emp.role || 'Operator'})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 block mb-1">Target Qty</label>
                  <input
                    type="number"
                    required
                    value={jobQtyTarget}
                    onChange={e => setJobQtyTarget(Number(e.target.value))}
                    min="1"
                    className="w-full bg-slate-950 border border-slate-850 p-2 rounded-lg text-xs text-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 block mb-1">Standard Cycle Time (minutes)</label>
                <input
                  type="number"
                  required
                  value={jobCycleTime}
                  onChange={e => setJobCycleTime(Number(e.target.value))}
                  min="1"
                  className="w-full bg-slate-950 border border-slate-850 p-2 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex gap-3 justify-end pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddJobModal(false)}
                  className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl border-0 cursor-pointer transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl border-0 cursor-pointer transition-all shadow-lg"
                >
                  {isEditingJob ? 'Save Changes' : 'Confirm Job Roster'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
