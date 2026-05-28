import React, { useState } from 'react';
import { Users, Search, Edit, Eye, X, AlertCircle, CheckCircle2, ShieldCheck, Clock, UserCog, UserCheck } from 'lucide-react';

interface Employee {
  id: string;
  username: string;
  mobileNo: string;
  email?: string;
  status: string;
  roleId?: string;
  role?: { id: string; name: string };
  departmentId?: string;
  department?: { id: string; name: string };
  shiftStart?: string;
  shiftEnd?: string;
  shiftName?: string;
  reportsToId?: string;
  reportsTo?: { id: string; username: string };
  createdAt: string;
}

interface EmployeesProps {
  employees: Employee[];
  departments: any[];
  roles: any[];
  onUpdateEmployee: (id: string, data: any) => Promise<void>;
}

export default function Employees({
  employees,
  departments,
  roles,
  onUpdateEmployee
}: EmployeesProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState<Employee | null>(null);

  // Form Fields
  const [roleId, setRoleId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [status, setStatus] = useState('ACTIVE');
  const [shiftStart, setShiftStart] = useState('09:00');
  const [shiftEnd, setShiftEnd] = useState('17:00');
  const [shiftName, setShiftName] = useState('General Shift');
  const [reportsToId, setReportsToId] = useState('');
  const [mobileNo, setMobileNo] = useState('');
  const [email, setEmail] = useState('');

  const [loading, setLoading] = useState(false);
  const [localErr, setLocalErr] = useState<string | null>(null);
  const [localSuccess, setLocalSuccess] = useState<string | null>(null);

  const openEditModal = (emp: Employee) => {
    setSelectedEmp(emp);
    setRoleId(emp.roleId || '');
    setDepartmentId(emp.departmentId || '');
    setStatus(emp.status);
    setShiftStart(emp.shiftStart || '09:00');
    setShiftEnd(emp.shiftEnd || '17:00');
    setShiftName(emp.shiftName || 'General Shift');
    setReportsToId(emp.reportsToId || '');
    setMobileNo(emp.mobileNo);
    setEmail(emp.email || '');
    setLocalErr(null);
    setLocalSuccess(null);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmp) return;

    setLocalErr(null);
    setLocalSuccess(null);
    setLoading(true);

    const payload = {
      roleId: roleId || null,
      departmentId: departmentId || null,
      status,
      shiftStart: shiftStart || null,
      shiftEnd: shiftEnd || null,
      shiftName: shiftName || null,
      reportsToId: reportsToId || null,
      mobileNo,
      email: email || null
    };

    try {
      await onUpdateEmployee(selectedEmp.id, payload);
      setLocalSuccess("Employee profile synchronized successfully!");
      setTimeout(() => {
        setShowModal(false);
      }, 1000);
    } catch (err: any) {
      setLocalErr(err.message || "Failed to synchronize profile changes.");
    } finally {
      setLoading(false);
    }
  };

  const filteredEmployees = employees.filter(emp =>
    emp.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (emp.email && emp.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
    emp.mobileNo.includes(searchTerm) ||
    (emp.role?.name && emp.role.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (emp.department?.name && emp.department.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-900/40 p-6 rounded-2xl border border-slate-800/80 backdrop-blur-xl">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-400" />
            Employees Master & Directory
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Connected to company master profiles and authorization roles. Delegate department nodes, reports structure, and shifts.
          </p>
        </div>
      </div>

      {/* Main Container */}
      <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl backdrop-blur-xl overflow-hidden">
        {/* Search Header */}
        <div className="p-4 border-b border-slate-800/60 bg-slate-950/20">
          <div className="relative max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search by name, email, department or role..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-950/40 border border-slate-850/60 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl text-white text-sm outline-none transition-all"
            />
          </div>
        </div>

        {/* Directory Table */}
        <div className="overflow-x-auto">
          {filteredEmployees.length === 0 ? (
            <div className="p-12 text-center text-slate-550">
              <Users className="w-12 h-12 text-slate-700 mx-auto mb-3" />
              <p className="font-semibold text-sm">No employees found in company registry</p>
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-slate-450 font-semibold uppercase tracking-wider text-xs bg-slate-950/40">
                  <th className="py-4 px-6">Employee Profile</th>
                  <th className="py-4 px-6">Company Role</th>
                  <th className="py-4 px-6">Department</th>
                  <th className="py-4 px-6">Shift schedule</th>
                  <th className="py-4 px-6">Reporting Manager</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {filteredEmployees.map(emp => (
                  <tr key={emp.id} className="hover:bg-slate-800/25 transition-colors">
                    <td className="py-4 px-6">
                      <div className="font-bold text-white text-sm">{emp.username}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{emp.email || emp.mobileNo}</div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="inline-flex items-center gap-1 text-xs text-indigo-400 font-medium bg-indigo-500/10 border border-indigo-500/15 rounded-lg px-2 py-0.5">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        {emp.role?.name || "No Role"}
                      </span>
                    </td>
                    <td className="py-4 px-6 font-medium text-slate-300">
                      {emp.department?.name || <span className="text-slate-600 text-xs italic">Unmapped</span>}
                    </td>
                    <td className="py-4 px-6 text-slate-350 space-y-0.5">
                      {emp.shiftName ? (
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold text-white">{emp.shiftName}</span>
                          <span className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3 text-indigo-400" />
                            {emp.shiftStart} to {emp.shiftEnd}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-600 text-xs italic">Not Assigned</span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-slate-350">
                      {emp.reportsTo ? (
                        <span className="text-slate-300 font-medium">{emp.reportsTo.username}</span>
                      ) : (
                        <span className="text-slate-650 text-xs italic">None</span>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-2.5 py-0.5 rounded-full border text-xs font-bold ${emp.status === "ACTIVE" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-amber-500/10 border-amber-500/20 text-amber-400"}`}>
                        {emp.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={() => openEditModal(emp)}
                        className="p-2 hover:bg-slate-800 hover:text-indigo-400 rounded-lg transition-all"
                        title="Configure employee properties"
                      >
                        <UserCog className="w-4 h-4 text-slate-450 hover:text-indigo-400" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Slide-over or Modal Overlay */}
      {showModal && selectedEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-950/20">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-indigo-400" />
                  Synchronize Employee Profile
                </h3>
                <p className="text-slate-500 text-xs mt-0.5">Admin master panel for '{selectedEmp.username}'</p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-450 text-xs font-semibold uppercase tracking-wider">Company Department</label>
                  <select
                    value={departmentId}
                    onChange={(e) => setDepartmentId(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-850 rounded-xl text-white outline-none text-sm"
                  >
                    <option value="">Unassigned / Free Staff</option>
                    {departments.map(dept => (
                      <option key={dept.id} value={dept.id}>{dept.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-450 text-xs font-semibold uppercase tracking-wider">Corporate Role</label>
                  <select
                    value={roleId}
                    onChange={(e) => setRoleId(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-850 rounded-xl text-white outline-none text-sm"
                  >
                    <option value="">No authorization Role</option>
                    {roles.map(role => (
                      <option key={role.id} value={role.id}>{role.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-450 text-xs font-semibold uppercase tracking-wider">Mobile Number</label>
                  <input
                    type="tel"
                    value={mobileNo}
                    onChange={(e) => setMobileNo(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-850 rounded-xl text-white outline-none text-sm font-mono"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-450 text-xs font-semibold uppercase tracking-wider">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-850 rounded-xl text-white outline-none text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-450 text-xs font-semibold uppercase tracking-wider">Staff Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-850 rounded-xl text-white outline-none text-sm"
                  >
                    <option value="ACTIVE">ACTIVE (Authorized)</option>
                    <option value="SUSPENDED">SUSPENDED (Locked)</option>
                    <option value="PENDING_APPROVAL">Awaiting Approval</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-450 text-xs font-semibold uppercase tracking-wider">Reporting Manager</label>
                  <select
                    value={reportsToId}
                    onChange={(e) => setReportsToId(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-850 rounded-xl text-white outline-none text-sm"
                  >
                    <option value="">None (Top Executive)</option>
                    {employees.filter(x => x.id !== selectedEmp.id).map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.username}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="p-4 bg-slate-950/60 border border-slate-850 rounded-xl space-y-3">
                <h4 className="text-xs font-bold text-white tracking-wide uppercase flex items-center gap-1.5 border-b border-slate-800 pb-2">
                  <Clock className="w-3.5 h-3.5 text-indigo-400" />
                  Configure Standard Work Shift
                </h4>

                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-3 space-y-1">
                    <label className="text-slate-500 text-[10px] uppercase font-bold tracking-wide">Shift Label</label>
                    <input
                      type="text"
                      placeholder="e.g. Morning Shift"
                      value={shiftName}
                      onChange={(e) => setShiftName(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-white text-xs outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-500 text-[10px] uppercase font-bold tracking-wide">Start Hour</label>
                    <input
                      type="text"
                      placeholder="09:00"
                      value={shiftStart}
                      onChange={(e) => setShiftStart(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-white text-xs outline-none text-center font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-500 text-[10px] uppercase font-bold tracking-wide">End Hour</label>
                    <input
                      type="text"
                      placeholder="17:00"
                      value={shiftEnd}
                      onChange={(e) => setShiftEnd(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-white text-xs outline-none text-center font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-end gap-3 bg-slate-950/20 -mx-6 -mb-6 p-6">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4.5 py-2 text-slate-400 hover:text-white transition-all text-sm font-semibold hover:bg-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white transition-all text-sm font-bold rounded-xl shadow-lg shadow-indigo-500/20"
                >
                  {loading ? 'Synchronizing...' : 'Save Configuration'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
