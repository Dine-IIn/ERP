import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../utils/apiService';

import { Clock, Search, ShieldAlert, CheckCircle, Fingerprint, Calendar, UserCheck, Play, Square } from 'lucide-react';

interface AttendanceLog {
  id: string;
  userId: string;
  user?: { username: string };
  date: string;
  checkIn: string;
  checkOut?: string;
  duration?: number;
  status: string;
}

interface AttendanceProps {
  attendances?: AttendanceLog[];
  employees?: any[];
  currentUser?: any;
  onPunchAttendance?: () => Promise<void>;
  onFetchFilteredAttendance?: (userId?: string, start?: string, end?: string) => Promise<void>;
}

export default function Attendance({
  attendances,
  employees,
  currentUser,
  onPunchAttendance,
  onFetchFilteredAttendance
}: AttendanceProps) {
  const queryClient = useQueryClient();

  const { data: fetchedAttendances } = useQuery({
    queryKey: ['hrms-attendance'],
    queryFn: () => apiClient.get<AttendanceLog[]>('/api/hrms/attendance')
  });
  
  const punchMutation = useMutation({
    mutationFn: () => apiClient.post('/api/hrms/attendance/punch', {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['hrms-attendance'] })
  });

  const activeAttendances = attendances || fetchedAttendances || [];

  const [filterUser, setFilterUser] = useState('');
  const [filterStart, setFilterStart] = useState('');
  const [filterEnd, setFilterEnd] = useState('');
  const [loading, setLoading] = useState(false);
  const [punching, setPunching] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Check if current user is checked-in (last log has checkOut null)
  const userLogs = activeAttendances.filter(a => a.userId === currentUser.id);
  const isCheckedIn = userLogs.length > 0 && !userLogs[0].checkOut;
  const activeLog = isCheckedIn ? userLogs[0] : null;

  const handlePunch = async () => {
    setPunching(true);
    try {
      if (onPunchAttendance) {
        await onPunchAttendance();
      } else {
        await punchMutation.mutateAsync();
      }
    } catch (e: any) {
      alert(e.message || "Failed to log punch event.");
    } finally {
      setPunching(false);
    }
  };

  const handleApplyFilters = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onFetchFilteredAttendance(
        filterUser || undefined,
        filterStart || undefined,
        filterEnd || undefined
      );
    } catch (e: any) {
      alert(e.message || "Failed to search filters.");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PRESENT':
        return 'bg-emerald-500/10 text-emerald-450 border-emerald-500/20';
      case 'LATE':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'HALFDAY':
        return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
      default:
        return 'bg-red-500/10 text-red-400 border-red-500/20';
    }
  };

  const filteredAttendances = activeAttendances.filter(log => {
    const username = log.user?.username || currentUser.username || '';
    const status = log.status || '';
    const term = (searchTerm || '').toLowerCase();
    return username.toLowerCase().includes(term) || status.toLowerCase().includes(term);
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-900/40 p-6 rounded-2xl border border-slate-800/80 backdrop-blur-xl">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Clock className="w-6 h-6 text-indigo-400" />
            Attendance Punch Console
          </h1>
          <p className="text-slate-400 text-sm mt-1 flex items-center gap-1">
            Log your daily corporate shift attendance triggers. Reconcile hours compiled.
          </p>
        </div>
      </div>

      {/* Main Container Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Punch Module */}
        <div className="lg:col-span-1 p-6 bg-slate-900/35 border border-slate-800/80 backdrop-blur-xl rounded-2xl flex flex-col items-center justify-between text-center space-y-6">
          <div className="space-y-2">
            <span className="px-3 py-1 bg-slate-950 border border-slate-850 text-indigo-400 font-bold rounded-full text-[10px] tracking-widest uppercase">
              Fingerprint Terminal
            </span>
            <h3 className="text-md font-bold text-white">Daily Punch Tracker</h3>
            <p className="text-slate-500 text-xs px-4">
              Punch-in when entering the office, and punch-out at completion of shift. Worked duration computes automatically.
            </p>
          </div>

          {/* Punch Trigger */}
          <div className="relative flex items-center justify-center p-4">
            <div className={`absolute inset-0 rounded-full blur-2xl opacity-20 animate-pulse ${isCheckedIn ? 'bg-amber-500' : 'bg-indigo-500'}`} />
            <button
              onClick={handlePunch}
              disabled={punching}
              className={`relative z-10 w-40 h-40 rounded-full flex flex-col items-center justify-center border-4 active:scale-95 transition-all text-white shadow-2xl ${isCheckedIn ? 'bg-amber-500/10 border-amber-500 shadow-amber-500/20 hover:bg-amber-500/20' : 'bg-indigo-500/10 border-indigo-500 shadow-indigo-500/20 hover:bg-indigo-500/20'}`}
            >
              <Fingerprint className={`w-14 h-14 mb-2 ${isCheckedIn ? 'text-amber-400' : 'text-indigo-400'}`} />
              <span className="font-extrabold text-sm uppercase tracking-widest">
                {punching ? 'PUNCHING...' : isCheckedIn ? 'CHECK OUT' : 'CHECK IN'}
              </span>
            </button>
          </div>

          {/* Punch Status Detail */}
          {isCheckedIn && activeLog ? (
            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl w-full text-amber-400 space-y-1">
              <div className="text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5">
                <Play className="w-3 h-3 text-amber-400" />
                Active Shift Punch
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                Checked in today at <span className="text-white font-semibold font-mono">{new Date(activeLog.checkIn).toLocaleTimeString()}</span>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-slate-950/60 border border-slate-850 rounded-xl w-full text-slate-400 space-y-1">
              <div className="text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-1.5">
                <Square className="w-3 h-3 text-slate-500" />
                No active session
              </div>
              <p className="text-[11px] text-slate-500 leading-normal">
                Click above to log your shift check-in stamp.
              </p>
            </div>
          )}
        </div>

        {/* Right: History logs & Filter Dashboard */}
        <div className="lg:col-span-2 space-y-6">
          {/* Filters Form (Visible to Admins/Supervisors for company audit) */}
          {currentUser.role === 'Admin' && (
            <form onSubmit={handleApplyFilters} className="p-5 bg-slate-900/35 border border-slate-800/80 backdrop-blur-xl rounded-2xl grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
              <div className="space-y-1">
                <label className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Filter Employee</label>
                <select
                  value={filterUser}
                  onChange={(e) => setFilterUser(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-850 rounded-xl text-white text-xs outline-none focus:border-indigo-500"
                >
                  <option value="">All Staff</option>
                  {employees.map(e => (
                    <option key={e.id} value={e.id}>{e.username}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Start Date</label>
                <input
                  type="date"
                  value={filterStart}
                  onChange={(e) => setFilterStart(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-850 rounded-xl text-white text-xs outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">End Date</label>
                <input
                  type="date"
                  value={filterEnd}
                  onChange={(e) => setFilterEnd(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-850 rounded-xl text-white text-xs outline-none focus:border-indigo-500"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 bg-indigo-500 hover:bg-indigo-655 text-white transition-all text-xs font-bold rounded-xl shadow-md"
              >
                {loading ? 'Searching...' : 'Apply Filters'}
              </button>
            </form>
          )}

          {/* Table list */}
          <div className="bg-slate-900/35 border border-slate-800/80 backdrop-blur-xl rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-800/60 bg-slate-950/20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-indigo-400" />
                Shift Attendance History logs
              </h3>
              <div className="relative max-w-xs w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search by employee name or status..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-950/40 border border-slate-850 rounded-xl text-white text-xs outline-none focus:border-indigo-500 transition-all"
                />
              </div>
            </div>

            <div className="overflow-x-auto max-h-96">
              {filteredAttendances.length === 0 ? (
                <div className="p-12 text-center text-slate-550 flex flex-col items-center justify-center">
                  <UserCheck className="w-12 h-12 text-slate-750 mb-3" />
                  <p className="font-semibold text-sm">No attendance punches logged</p>
                  <p className="text-slate-650 text-xs mt-1">Check-in using the footprint scanner module to build active logs.</p>
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-450 font-semibold uppercase bg-slate-950/40 text-[10px]">
                      <th className="py-3 px-5">Staff member</th>
                      <th className="py-3 px-5">Shift Date</th>
                      <th className="py-3 px-5">Punch In</th>
                      <th className="py-3 px-5">Punch Out</th>
                      <th className="py-3 px-5">Worked Duration</th>
                      <th className="py-3 px-5">Tardy Stage</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {filteredAttendances.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-800/10 transition-colors">
                        <td className="py-3.5 px-5 font-bold text-slate-250">{log.user?.username || currentUser.username}</td>
                        <td className="py-3.5 px-5 font-medium text-slate-400">{new Date(log.date).toISOString().slice(0, 10)}</td>
                        <td className="py-3.5 px-5 font-mono text-slate-300">{new Date(log.checkIn).toLocaleTimeString()}</td>
                        <td className="py-3.5 px-5 font-mono text-slate-300">
                          {log.checkOut ? new Date(log.checkOut).toLocaleTimeString() : <span className="text-amber-500 italic text-[11px]">ACTIVE</span>}
                        </td>
                        <td className="py-3.5 px-5 font-mono text-slate-250 font-bold">
                          {log.duration !== undefined && log.duration !== null ? `${log.duration} hrs` : '-'}
                        </td>
                        <td className="py-3.5 px-5">
                          <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${getStatusBadge(log.status)}`}>
                            {log.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
