import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../utils/apiService';
import { LeaveRequestSchema } from '../../utils/schemas';

import { CalendarRange, Plus, Check, X, AlertCircle, CheckCircle2, User, FileText, ChevronRight, MessageSquare, Search } from 'lucide-react';

interface LeaveRequest {
  id: string;
  userId: string;
  user?: { username: string };
  type: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: string;
  approvedById?: string;
  approvedBy?: { username: string };
  notes?: string;
  createdAt: string;
}

interface LeaveManagementProps {
  leaveRequests?: LeaveRequest[];
  currentUser?: any;
  onCreateLeaveRequest?: (data: any) => Promise<void>;
  onUpdateLeaveStatus?: (id: string, status: string, notes: string) => Promise<void>;
}

export default function LeaveManagement({
  leaveRequests,
  currentUser,
  onCreateLeaveRequest,
  onUpdateLeaveStatus
}: LeaveManagementProps) {
  const queryClient = useQueryClient();

  const { data: fetchedLeaveRequests } = useQuery({
    queryKey: ['hrms-leaves'],
    queryFn: () => apiClient.get<LeaveRequest[]>('/api/hrms/leaves')
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiClient.post('/api/hrms/leaves', data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['hrms-leaves'] })
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status, notes }: { id: string, status: string, notes: string }) => apiClient.patch(`/api/hrms/leaves/${id}`, { status, notes }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['hrms-leaves'] })
  });

  const activeLeaveRequests = leaveRequests || fetchedLeaveRequests || [];

  const [showApplyModal, setShowApplyModal] = useState(false);
  const [type, setType] = useState('SICK');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');

  const [notes, setNotes] = useState('');
  const [activeRequest, setActiveRequest] = useState<LeaveRequest | null>(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);

  const [loading, setLoading] = useState(false);
  const [localErr, setLocalErr] = useState<string | null>(null);
  const [localSuccess, setLocalSuccess] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');

  const myRequests = activeLeaveRequests
    .filter(l => l.userId === currentUser.id)
    .filter(l => {
      const type = l?.type || '';
      const reason = l?.reason || '';
      const term = (searchTerm || '').toLowerCase();
      return type.toLowerCase().includes(term) || reason.toLowerCase().includes(term);
    });

  const pendingRequests = activeLeaveRequests
    .filter(l => l.status === "PENDING" && l.userId !== currentUser.id)
    .filter(l => {
      const username = l?.user?.username || '';
      const type = l?.type || '';
      const reason = l?.reason || '';
      const term = (searchTerm || '').toLowerCase();
      return username.toLowerCase().includes(term) ||
        type.toLowerCase().includes(term) ||
        reason.toLowerCase().includes(term);
    });

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !endDate || !reason.trim() || !type) {
      setLocalErr("All leave request fields are required.");
      return;
    }

    setLocalErr(null);
    setLocalSuccess(null);
    setLoading(true);

    const payload = { type, startDate, endDate, reason: reason.trim() };
    const parseResult = LeaveRequestSchema.safeParse(payload);
    if (!parseResult.success) {
      setLocalErr(parseResult.error.errors[0].message);
      setLoading(false);
      return;
    }

    try {
      if (onCreateLeaveRequest) {
        await onCreateLeaveRequest(parseResult.data);
      } else {
        await createMutation.mutateAsync(parseResult.data);
      }
      setLocalSuccess("Leave request submitted successfully!");
      setTimeout(() => {
        setShowApplyModal(false);
        setReason('');
        setStartDate('');
        setEndDate('');
      }, 1000);
    } catch (err: any) {
      setLocalErr(err.message || "Failed to submit leave request.");
    } finally {
      setLoading(false);
    }
  };

  const handleDecide = async (status: 'APPROVED' | 'REJECTED') => {
    if (!activeRequest) return;
    setLoading(true);
    try {
      if (onUpdateLeaveStatus) {
        await onUpdateLeaveStatus(activeRequest.id, status, notes.trim());
      } else {
        await updateStatusMutation.mutateAsync({ id: activeRequest.id, status, notes: notes.trim() });
      }
      setShowApprovalModal(false);
      setNotes('');
      setActiveRequest(null);
    } catch (err: any) {
      alert(err.message || "Failed to log decision.");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return 'bg-emerald-500/10 text-emerald-450 border-emerald-500/20';
      case 'REJECTED':
        return 'bg-red-500/10 text-red-405 border-red-500/20';
      default:
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-900/40 p-6 rounded-2xl border border-slate-800/80 backdrop-blur-xl">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <CalendarRange className="w-6 h-6 text-indigo-400" />
            Leaves Management Console
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            File leaves requests, view active corporate calendar allocations, and manage holiday balances.
          </p>
        </div>
        <button
          onClick={() => {
            setLocalErr(null);
            setLocalSuccess(null);
            setShowApplyModal(true);
          }}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-500 hover:bg-indigo-600 active:scale-95 transition-all text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/20"
        >
          <Plus className="w-5 h-5" />
          Request Leave
        </button>
      </div>

      {/* Summary Matrix Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <div className="p-5 bg-slate-900/35 border border-slate-800/80 rounded-2xl space-y-1">
          <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Sick Leaves</span>
          <h3 className="text-2xl font-black text-white">4 <span className="text-xs text-slate-500 font-semibold">/ 8 days used</span></h3>
        </div>
        <div className="p-5 bg-slate-900/35 border border-slate-800/80 rounded-2xl space-y-1">
          <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Casual Leaves</span>
          <h3 className="text-2xl font-black text-white">2 <span className="text-xs text-slate-500 font-semibold">/ 12 days used</span></h3>
        </div>
        <div className="p-5 bg-slate-900/35 border border-slate-800/80 rounded-2xl space-y-1">
          <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Annual Leaves</span>
          <h3 className="text-2xl font-black text-white">5 <span className="text-xs text-slate-500 font-semibold">/ 15 days used</span></h3>
        </div>
        <div className="p-5 bg-slate-900/35 border border-slate-800/80 rounded-2xl space-y-1">
          <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Unpaid / Holiday Balance</span>
          <h3 className="text-2xl font-black text-indigo-400">14 <span className="text-xs text-slate-500 font-semibold">days available</span></h3>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left/Middle: My Leaves List */}
        <div className="lg:col-span-2 bg-slate-900/35 border border-slate-800/80 backdrop-blur-xl rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-slate-800/60 bg-slate-950/20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">My Leave Applications</h3>
            <div className="relative max-w-xs w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
              <input
                type="text"
                placeholder="Search leaves by reason or type..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-950/40 border border-slate-850 rounded-xl text-white text-xs outline-none focus:border-indigo-500 transition-all"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            {myRequests.length === 0 ? (
              <div className="p-12 text-center text-slate-555">
                <CalendarRange className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                <p className="font-semibold text-sm">No leave applications filed</p>
                <p className="text-slate-650 text-xs mt-1">Press 'Request Leave' above to log a holiday or sickness entry.</p>
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-450 font-semibold uppercase bg-slate-950/40 text-[10px]">
                    <th className="py-3 px-5">Type</th>
                    <th className="py-3 px-5">Start Date</th>
                    <th className="py-3 px-5">End Date</th>
                    <th className="py-3 px-5">Reason</th>
                    <th className="py-3 px-5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {myRequests.map((req) => (
                    <tr key={req.id} className="hover:bg-slate-800/10 transition-colors">
                      <td className="py-3 px-5">
                        <span className="px-2 py-0.5 bg-indigo-500/15 border border-indigo-500/20 text-indigo-400 rounded-full font-bold text-[10px]">
                          {req.type}
                        </span>
                      </td>
                      <td className="py-3 px-5 font-mono text-slate-300">{new Date(req.startDate).toISOString().slice(0, 10)}</td>
                      <td className="py-3 px-5 font-mono text-slate-300">{new Date(req.endDate).toISOString().slice(0, 10)}</td>
                      <td className="py-3 px-5 text-slate-400 font-medium truncate max-w-[150px]">{req.reason}</td>
                      <td className="py-3 px-5">
                        <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${getStatusBadge(req.status)}`}>
                          {req.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right: Manager Approvals Portal */}
        <div className="p-6 bg-slate-900/35 border border-slate-800/80 backdrop-blur-xl rounded-2xl space-y-4">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              Manager Approvals
            </h3>
            <p className="text-[11px] text-slate-500">Authorize or reject pending holiday applications from subordinate staff.</p>
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
            {pendingRequests.length === 0 ? (
              <div className="p-8 text-center text-slate-600 flex flex-col items-center justify-center">
                <Check className="w-8 h-8 text-emerald-450 mb-2 border border-emerald-500/10 bg-emerald-500/5 p-1 rounded-full" />
                <p className="font-semibold text-xs text-slate-400">All applications sorted!</p>
                <p className="text-[10px] text-slate-650 mt-0.5">No pending leaves to decide.</p>
              </div>
            ) : (
              pendingRequests.map((req) => (
                <div
                  key={req.id}
                  onClick={() => {
                    setActiveRequest(req);
                    setNotes('');
                    setShowApprovalModal(true);
                  }}
                  className="p-3.5 bg-slate-950/60 hover:bg-slate-950/90 border border-slate-850 hover:border-slate-800 rounded-xl flex items-center justify-between cursor-pointer transition-all"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-indigo-400" />
                      <span className="text-xs font-bold text-white">{req.user?.username || 'Staff'}</span>
                    </div>
                    <p className="text-[10px] text-slate-450 leading-normal">
                      Requested <span className="font-bold text-indigo-400">{req.type}</span>: {new Date(req.startDate).toISOString().slice(0, 10)}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-600" />
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Apply Leave Modal */}
      {showApplyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-950/20">
              <h3 className="text-md font-bold text-white">Log Corporate Holiday Request</h3>
              <button
                onClick={() => setShowApplyModal(false)}
                className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleApply} className="p-6 space-y-4">
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
                <label className="text-slate-450 text-xs font-semibold uppercase tracking-wider">Leave Category</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-850 rounded-xl text-white outline-none text-sm animate-none"
                >
                  <option value="SICK">Sick Medical Leave</option>
                  <option value="CASUAL">Casual Personal Leave</option>
                  <option value="ANNUAL">Annual Corporate Leave</option>
                  <option value="MATERNITY">Maternity / Parental Leave</option>
                  <option value="OTHER">Other Miscellaneous Leave</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-450 text-xs font-semibold uppercase tracking-wider">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-850 rounded-xl text-white outline-none text-sm focus:border-indigo-500"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-450 text-xs font-semibold uppercase tracking-wider">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-850 rounded-xl text-white outline-none text-sm focus:border-indigo-500"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-450 text-xs font-semibold uppercase tracking-wider">Filing Reason</label>
                <textarea
                  rows={3}
                  placeholder="Summarize reasons or context for holiday application..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-850 rounded-xl text-white outline-none text-sm resize-none focus:border-indigo-500"
                  required
                />
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-end gap-3 bg-slate-950/20 -mx-6 -mb-6 p-6">
                <button
                  type="button"
                  onClick={() => setShowApplyModal(false)}
                  className="px-4.5 py-2 text-slate-400 hover:text-white transition-all text-sm font-semibold hover:bg-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-indigo-500 hover:bg-indigo-650 disabled:opacity-50 text-white transition-all text-sm font-bold rounded-xl shadow-lg shadow-indigo-500/20"
                >
                  {loading ? 'Submitting...' : 'Confirm Submission'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Approval Modal (Manager Action) */}
      {showApprovalModal && activeRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-950/20">
              <div>
                <h3 className="text-md font-bold text-white">Review Leave Application</h3>
                <p className="text-slate-500 text-xs mt-0.5">Submitted by '{activeRequest.user?.username || 'Staff'}'</p>
              </div>
              <button
                onClick={() => setShowApprovalModal(false)}
                className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-4 bg-slate-950/60 border border-slate-850 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-bold uppercase tracking-wider">Leave Category</span>
                  <span className="font-bold text-indigo-400">{activeRequest.type}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-bold uppercase tracking-wider">Dates Timeline</span>
                  <span className="text-slate-350 font-medium">
                    {new Date(activeRequest.startDate).toISOString().slice(0, 10)} to {new Date(activeRequest.endDate).toISOString().slice(0, 10)}
                  </span>
                </div>
                <div className="border-t border-slate-900 pt-2 text-xs">
                  <span className="text-slate-500 font-bold uppercase tracking-wider block mb-1">Stated Reason</span>
                  <p className="text-slate-300 italic leading-relaxed">"{activeRequest.reason}"</p>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-450 text-xs font-semibold uppercase tracking-wider flex items-center gap-1">
                  <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
                  Manager Remarks / Comments
                </label>
                <textarea
                  rows={2}
                  placeholder="Append feedback or context for staff (Optional)..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-850 rounded-xl text-white text-xs outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-between gap-3 bg-slate-950/20 -mx-6 -mb-6 p-6">
                <button
                  type="button"
                  onClick={() => handleDecide('REJECTED')}
                  disabled={loading}
                  className="px-5 py-2 bg-red-500/10 hover:bg-red-500 border border-red-500/20 hover:border-red-600 text-red-400 hover:text-white transition-all text-xs font-bold rounded-xl active:scale-95"
                >
                  Reject application
                </button>
                <button
                  type="button"
                  onClick={() => handleDecide('APPROVED')}
                  disabled={loading}
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-650 text-white transition-all text-xs font-bold rounded-xl active:scale-95 shadow-md shadow-emerald-500/15"
                >
                  Approve application
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
