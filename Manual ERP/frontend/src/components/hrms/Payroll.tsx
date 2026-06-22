import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../utils/apiService';
import { PayrollGenerateSchema } from '../../utils/schemas';

import { DollarSign, Plus, Check, X, AlertCircle, CheckCircle2, Award, ClipboardList, Send, Search } from 'lucide-react';

interface PayrollRecord {
  id: string;
  userId: string;
  user?: { username: string; email?: string };
  month: number;
  year: number;
  basicSalary: number;
  allowances: number;
  deductions: number;
  netSalary: number;
  status: string;
  paymentDate?: string;
  referenceNo?: string;
  notes?: string;
}

interface PayrollProps {
  payrolls?: PayrollRecord[];
  employees?: any[];
  onGeneratePayroll?: (data: any) => Promise<void>;
  onDisbursePayroll?: (id: string, payload: { referenceNo: string; notes: string }) => Promise<void>;
  currencySymbol?: string;
}

export default function Payroll({
  payrolls,
  employees = [],
  onGeneratePayroll,
  onDisbursePayroll,
  currencySymbol = '$'
}: PayrollProps) {
  const queryClient = useQueryClient();

  const { data: fetchedPayrolls } = useQuery({
    queryKey: ['hrms-payroll'],
    queryFn: async () => {
      const res = await apiClient.get<{ payrolls: PayrollRecord[] }>('/api/hrms/payroll');
      return (res && res.payrolls) || [];
    }
  });

  const generateMutation = useMutation({
    mutationFn: (data: any) => apiClient.post('/api/hrms/payroll/generate', data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['hrms-payroll'] })
  });

  const disburseMutation = useMutation({
    mutationFn: ({ id, refNo, notes }: { id: string, refNo: string, notes: string }) => apiClient.patch(`/api/hrms/payroll/disburse/${id}`, { referenceNo: refNo, notes }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['hrms-payroll'] })
  });

  const activePayrolls = payrolls || fetchedPayrolls || [];

  const [showAddModal, setShowAddModal] = useState(false);
  const [userId, setUserId] = useState('');
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [basicSalary, setBasicSalary] = useState('3000');
  const [allowances, setAllowances] = useState('200');
  const [deductions, setDeductions] = useState('100');
  const [calcMode, setCalcMode] = useState<'FIXED' | 'HOURLY'>('FIXED');
  const [hoursWorked, setHoursWorked] = useState('160');
  const [hourlyRate, setHourlyRate] = useState('20');

  const [showDisburseModal, setShowDisburseModal] = useState(false);
  const [activePayroll, setActivePayroll] = useState<PayrollRecord | null>(null);
  const [referenceNo, setReferenceNo] = useState('');
  const [notes, setNotes] = useState('');

  React.useEffect(() => {
    const handleClose = (e: Event) => {
      if (showDisburseModal) {
        e.preventDefault();
        setShowDisburseModal(false);
      } else if (showAddModal) {
        e.preventDefault();
        setShowAddModal(false);
      }
    };
    window.addEventListener('close-active-modal', handleClose);
    return () => window.removeEventListener('close-active-modal', handleClose);
  }, [showAddModal, showDisburseModal]);

  const [loading, setLoading] = useState(false);
  const [localErr, setLocalErr] = useState<string | null>(null);
  const [localSuccess, setLocalSuccess] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!userId) return;
    const emp = employees.find(e => e.id === userId);
    if (!emp) return;

    let salaryType = 'FIXED';
    let salaryRate = 0;

    if (emp.documents) {
      try {
        const parsed = JSON.parse(emp.documents);
        salaryType = parsed.salaryType || 'FIXED';
        salaryRate = parseFloat(parsed.salaryRate) || 0;
      } catch (err) {
        console.error("Error parsing employee documents for payroll:", err);
      }
    }

    apiClient.get<{ attendances: any[] }>('/api/hrms/attendance').then(res => {
      const logs = (res && res.attendances) || [];
      const filteredLogs = logs.filter(l => {
        if (l.userId !== userId) return false;
        const logDate = new Date(l.date || l.createdAt);
        return (logDate.getMonth() + 1) === Number(month) && logDate.getFullYear() === Number(year);
      });

      const totalHours = filteredLogs.reduce((acc, curr) => acc + (parseFloat(curr.duration) || 0), 0);
      
      setHoursWorked(String(Math.round(totalHours * 100) / 100));

      if (salaryType === 'HOURLY') {
        setCalcMode('HOURLY');
        setHourlyRate(String(salaryRate));
        setBasicSalary(String(Math.round(totalHours * salaryRate * 100) / 100));
      } else {
        setCalcMode('FIXED');
        setHourlyRate('0');
        setBasicSalary(String(salaryRate));
      }
    }).catch(err => {
      console.error("Failed to load attendance logs for payroll auto-calculation:", err);
      if (salaryType === 'HOURLY') {
        setCalcMode('HOURLY');
        setHourlyRate(String(salaryRate));
        setBasicSalary(String(Number(hoursWorked) * salaryRate));
      } else {
        setCalcMode('FIXED');
        setHourlyRate('0');
        setBasicSalary(String(salaryRate));
      }
    });

  }, [userId, month, year, employees]);

  const filteredPayrolls = (activePayrolls || []).filter(payroll => {
    if (!payroll) return false;
    const employee = payroll.user?.username || '';
    const status = payroll.status || '';
    const reference = payroll.referenceNo || '';
    const term = (searchTerm || '').toLowerCase();
    return employee.toLowerCase().includes(term) ||
      status.toLowerCase().includes(term) ||
      reference.toLowerCase().includes(term);
  });

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !month || !year || !basicSalary) {
      setLocalErr("Employee, month, year, and basic salary are required.");
      return;
    }

    setLocalErr(null);
    setLocalSuccess(null);
    setLoading(true);

    const payload = {
        userId,
        month: Number(month),
        year: Number(year),
        basicSalary: parseFloat(basicSalary),
        allowances: allowances ? parseFloat(allowances) : 0,
        deductions: deductions ? parseFloat(deductions) : 0
    };
    const parseResult = PayrollGenerateSchema.safeParse(payload);
    if (!parseResult.success) {
      setLocalErr(parseResult.error.issues[0].message);
      setLoading(false);
      return;
    }

    try {
      if (onGeneratePayroll) {
        await onGeneratePayroll(parseResult.data);
      } else {
        await generateMutation.mutateAsync(parseResult.data);
      }
      setLocalSuccess("Salary sheet successfully generated!");
      setTimeout(() => {
        setShowAddModal(false);
      }, 1000);
    } catch (err: any) {
      setLocalErr(err.message || "Failed to compile wages.");
    } finally {
      setLoading(false);
    }
  };

  const handleDisburse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePayroll) return;

    setLoading(true);
    try {
      if (onDisbursePayroll) {
        await onDisbursePayroll(activePayroll.id, { referenceNo: referenceNo.trim(), notes: notes.trim() });
      } else {
        await disburseMutation.mutateAsync({ id: activePayroll.id, refNo: referenceNo.trim(), notes: notes.trim() });
      }
      setShowDisburseModal(false);
      setReferenceNo('');
      setNotes('');
      setActivePayroll(null);
    } catch (err: any) {
      alert(err.message || "Failed to finalize disburse.");
    } finally {
      setLoading(false);
    }
  };

  const getMonthName = (m: number) => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[m - 1] || 'Month';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-900/40 p-6 rounded-2xl border border-slate-800/80 backdrop-blur-xl">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-indigo-400" />
            Corporate Payroll Ledger
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Track and disburse corporate staff salary sheets, configure allowances, and issue payout slips.
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
          Compile wages
        </button>
      </div>

      {/* Salaries Ledger Table */}
      <div className="bg-slate-900/35 border border-slate-800/80 backdrop-blur-xl rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-slate-800/60 bg-slate-950/20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-indigo-400" />
            Wage Disbursements and Ledgers
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

        <div className="overflow-x-auto">
          {filteredPayrolls.length === 0 ? (
            <div className="p-12 text-center text-slate-550 flex flex-col items-center justify-center">
              <DollarSign className="w-12 h-12 text-slate-750 mb-3" />
              <p className="font-semibold text-sm">No payroll registers logged</p>
              <p className="text-slate-650 text-xs mt-1">Press 'Compile wages' above to set basic rates and allowances.</p>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-450 font-semibold uppercase bg-slate-950/40 text-[10px]">
                  <th className="py-3 px-5">Employee</th>
                  <th className="py-3 px-5">Earnings Period</th>
                  <th className="py-3 px-5">Basic wage</th>
                  <th className="py-3 px-5">Allowances</th>
                  <th className="py-3 px-5">Deductions</th>
                  <th className="py-3 px-5">Net Salary</th>
                  <th className="py-3 px-5">Status</th>
                  <th className="py-3 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {filteredPayrolls.map((payroll) => (
                  <tr key={payroll.id} className="hover:bg-slate-800/10 transition-colors">
                    <td className="py-4 px-5 font-bold text-slate-250">{payroll.user?.username || 'Staff'}</td>
                    <td className="py-4 px-5 font-medium text-slate-450">{getMonthName(payroll.month)} {payroll.year}</td>
                    <td className="py-4 px-5 font-mono text-slate-300">{currencySymbol}{Number(payroll.basicSalary || 0).toFixed(2)}</td>
                    <td className="py-4 px-5 font-mono text-emerald-400">+{currencySymbol}{Number(payroll.allowances || 0).toFixed(2)}</td>
                    <td className="py-4 px-5 font-mono text-rose-400">-{currencySymbol}{Number(payroll.deductions || 0).toFixed(2)}</td>
                    <td className="py-4 px-5 font-mono text-white font-bold">{currencySymbol}{Number(payroll.netSalary || 0).toFixed(2)}</td>
                    <td className="py-4 px-5">
                      <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${payroll.status === "DISBURSED" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-450" : "bg-amber-500/10 border-amber-500/20 text-amber-400"}`}>
                        {payroll.status}
                      </span>
                    </td>
                    <td className="py-4 px-5 text-right">
                      {payroll.status === "PENDING" ? (
                        <button
                          onClick={() => {
                            setActivePayroll(payroll);
                            setReferenceNo('');
                            setNotes('');
                            setShowDisburseModal(true);
                          }}
                          className="px-3 py-1 bg-emerald-500 hover:bg-emerald-600 active:scale-95 transition-all text-white font-bold rounded-lg text-[10px]"
                        >
                          Disburse
                        </button>
                      ) : (
                        <span className="text-slate-500 italic text-[11px]">Slip generated</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Generate Payroll Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-950/20">
              <h3 className="text-md font-bold text-white flex items-center gap-1.5">
                <Award className="w-4 h-4 text-indigo-400" />
                Compile Wage Sheet
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleGenerate} className="p-6 space-y-4">
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
                <label className="text-slate-450 text-xs font-semibold uppercase tracking-wider">Target Staff Member</label>
                <select
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-850 rounded-xl text-white text-sm outline-none"
                  required
                >
                  <option value="">Choose Employee...</option>
                  {employees.map(e => (
                    <option key={e.id} value={e.id}>{e.username}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-450 text-xs font-semibold uppercase tracking-wider">Salary Month</label>
                  <select
                    value={month}
                    onChange={(e) => setMonth(Number(e.target.value))}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-850 rounded-xl text-white text-sm outline-none"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => (
                      <option key={m} value={m}>{getMonthName(m)}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-450 text-xs font-semibold uppercase tracking-wider">Salary Year</label>
                  <input
                    type="number"
                    value={year}
                    onChange={(e) => setYear(Number(e.target.value))}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-850 rounded-xl text-white text-sm outline-none"
                    required
                  />
                </div>
              </div>

              {/* Calculation Mode Toggle */}
              <div className="space-y-1">
                <label className="text-slate-450 text-xs font-semibold uppercase tracking-wider block">Payroll Calculation Basis</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCalcMode('FIXED');
                      setBasicSalary('3000');
                    }}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                      calcMode === 'FIXED'
                        ? 'bg-indigo-600 border-indigo-500 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    Fixed Salary Per Month
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCalcMode('HOURLY');
                      setBasicSalary(String(Number(hoursWorked) * Number(hourlyRate)));
                    }}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                      calcMode === 'HOURLY'
                        ? 'bg-indigo-600 border-indigo-500 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    Hourly Wage Rate
                  </button>
                </div>
              </div>

              {calcMode === 'HOURLY' ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Hours Worked</label>
                    <input
                      type="number"
                      value={hoursWorked}
                      onChange={(e) => {
                        setHoursWorked(e.target.value);
                        setBasicSalary(String(Number(e.target.value) * Number(hourlyRate)));
                      }}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-850 rounded-xl text-white text-xs outline-none font-mono focus:border-indigo-500 text-center"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Hourly Rate ({currencySymbol})</label>
                    <input
                      type="number"
                      value={hourlyRate}
                      onChange={(e) => {
                        setHourlyRate(e.target.value);
                        setBasicSalary(String(Number(hoursWorked) * Number(e.target.value)));
                      }}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-850 rounded-xl text-white text-xs outline-none font-mono focus:border-indigo-500 text-center"
                      required
                    />
                  </div>
                </div>
              ) : null}

              <div className="grid grid-cols-4 gap-2">
                <div className="space-y-1 col-span-2">
                  <label className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">
                    {calcMode === 'HOURLY' ? 'Computed Basic Wages' : 'Basic Salary'}
                  </label>
                  <input
                    type="number"
                    value={basicSalary}
                    onChange={(e) => setBasicSalary(e.target.value)}
                    className="w-full px-2 py-1.5 bg-slate-950 border border-slate-850 rounded-lg text-white text-xs outline-none text-center font-mono focus:border-indigo-500"
                    required
                    readOnly={calcMode === 'HOURLY'}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Allowances</label>
                  <input
                    type="number"
                    value={allowances}
                    onChange={(e) => setAllowances(e.target.value)}
                    className="w-full px-2 py-1.5 bg-slate-950 border border-slate-850 rounded-lg text-white text-xs outline-none text-center font-mono focus:border-indigo-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Deductions</label>
                  <input
                    type="number"
                    value={deductions}
                    onChange={(e) => setDeductions(e.target.value)}
                    className="w-full px-2 py-1.5 bg-slate-950 border border-slate-850 rounded-lg text-white text-xs outline-none text-center font-mono focus:border-indigo-500"
                  />
                </div>
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
                  {loading ? 'Compiling...' : 'Confirm compilation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Disburse Modal */}
      {showDisburseModal && activePayroll && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-950/20">
              <div>
                <h3 className="text-md font-bold text-white">Disburse Salary wage</h3>
                <p className="text-slate-500 text-xs mt-0.5">To Employee '{activePayroll.user?.username || 'Staff'}'</p>
              </div>
              <button
                onClick={() => setShowDisburseModal(false)}
                className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleDisburse} className="p-6 space-y-4">
              <div className="p-4 bg-slate-950/60 border border-slate-850 rounded-xl space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-bold uppercase">Basic wage:</span>
                  <span className="font-mono text-slate-200">{currencySymbol}{activePayroll.basicSalary}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-bold uppercase">Net salary due:</span>
                  <span className="font-mono text-emerald-400 font-extrabold text-sm">{currencySymbol}{activePayroll.netSalary}</span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-450 text-xs font-semibold uppercase tracking-wider">Payment Transaction reference</label>
                <input
                  type="text"
                  placeholder="e.g. HDFC-UPI-9940213"
                  value={referenceNo}
                  onChange={(e) => setReferenceNo(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-850 rounded-xl text-white text-sm outline-none focus:border-indigo-500 font-mono"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-450 text-xs font-semibold uppercase tracking-wider">Internal remarks</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Wages disbursed successfully..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-850 rounded-xl text-white text-xs outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-end gap-3 bg-slate-950/20 -mx-6 -mb-6 p-6">
                <button
                  type="button"
                  onClick={() => setShowDisburseModal(false)}
                  className="px-4.5 py-2 text-slate-400 hover:text-white transition-all text-sm font-semibold hover:bg-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-650 disabled:opacity-50 text-white transition-all text-sm font-bold rounded-xl shadow-lg shadow-emerald-500/20 flex items-center gap-1.5 active:scale-95"
                >
                  <Send className="w-3.5 h-3.5" />
                  Finalize Disbursement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
