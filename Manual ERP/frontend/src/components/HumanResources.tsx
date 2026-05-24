import React, { useState, useEffect } from 'react';
import { 
  Users, Calendar, Clock, DollarSign, 
  UserPlus, BarChart3, Plus, Search, Filter, Download, 
  MoreHorizontal, CheckCircle2, AlertCircle, FileText, Briefcase, 
  GraduationCap, Sliders, ShieldCheck, Activity, FileSpreadsheet, 
  UploadCloud, Settings, ArrowRight, Check, X, ShieldAlert, Award, FileUp
} from 'lucide-react';

interface Props {
  activeTab?: string;
  user: any;
  token?: string;
  backendUrl?: string;
}

// Simple Clock3 icon component
const Clock3 = (props: any) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const HumanResources: React.FC<Props> = ({ user: _user, activeTab, token, backendUrl }) => {
  const mapping: Record<string, string> = {
    'HR_PROFILES': 'profiles',
    'HR_ATTENDANCE': 'attendance',
    'HR_LEAVE': 'leave',
    'HR_PAYROLL': 'payroll',
    'HR_SALARY_SLIPS': 'slips',
    'HR_REIMBURSEMENTS': 'reimbursements',
    'HR_RECRUITMENT': 'recruitment',
    'HR_SHIFT': 'shift',
    'HR_PERFORMANCE': 'performance',
    'HR_REPORTS': 'reports',
    'HR_DOCUMENTS': 'documents',
    'HR_DASHBOARD': 'dashboard'
  };

  const currentTab = (activeTab && mapping[activeTab]) ? mapping[activeTab] : 'dashboard';
  const [searchQuery, setSearchQuery] = useState('');

  // Interactive UI Modal Drawers
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showReimbursementModal, setShowReimbursementModal] = useState(false);
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showDocModal, setShowDocModal] = useState(false);
  const [showPayslipPreview, setShowPayslipPreview] = useState<any | null>(null);

  // Forms States
  const [newEmployee, setNewEmployee] = useState({ name: '', role: 'Software Engineer', dept: 'Engineering', email: '', salary: 8500, status: 'Active', joinDate: '2026-05-23' });
  const [newLeave, setNewLeave] = useState({ name: 'John Doe', type: 'Sick Leave', startDate: '2026-06-01', endDate: '2026-06-03', duration: '3 Days', reason: 'Medical appointment' });
  const [newReimbursement, setNewReimbursement] = useState({ name: 'John Doe', type: 'Travel Expense', amount: 150, date: '2026-05-23', reason: 'Client onsite review meeting' });
  const [newShift, setNewShift] = useState({ name: 'John Doe', type: 'Day Shift', timing: '09:00 AM - 05:00 PM', days: 'Mon - Fri' });
  const [newReview, setNewReview] = useState({ name: 'John Doe', evaluator: 'Jane Smith', period: 'Q2 2026', score: 4.5, feedback: 'Strong contributor to backend releases' });
  const [newDoc, setNewDoc] = useState({ name: 'John Doe', type: 'Employment Contract', filename: 'contract_signed_v2.pdf', size: 1.2 });

  // Toast notifications trigger
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'warning' } | null>(null);
  const showToast = (message: string, type: 'success' | 'warning' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // --- DUMMY DATABASES (MIGRATED TO STATE) ---
  const [dashboardStats, setDashboardStats] = useState([
    { title: 'Total Employees', value: '142', change: '+3 this month', isPositive: true, icon: Users, color: 'text-cyan-500', bg: 'bg-cyan-500/10' },
    { title: 'On Leave Today', value: '5', change: '2% of workforce', isPositive: true, icon: Calendar, color: 'text-teal-500', bg: 'bg-teal-500/10' },
    { title: 'Open Positions', value: '12', change: '4 new requisitions', isPositive: true, icon: Briefcase, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
    { title: 'Avg Performance', value: '4.2/5', change: '+0.1 since Q1', isPositive: true, icon: Award, color: 'text-amber-500', bg: 'bg-amber-500/10' },
  ]);

  const [employees, setEmployees] = useState([
    { id: 'EMP-001', name: 'John Doe', role: 'Software Engineer', dept: 'Engineering', email: 'john@acme.com', status: 'Active', joinDate: '2023-01-15', salary: 8500 },
    { id: 'EMP-002', name: 'Jane Smith', role: 'HR Manager', dept: 'Human Resources', email: 'jane@acme.com', status: 'Active', joinDate: '2021-08-01', salary: 7200 },
    { id: 'EMP-003', name: 'Robert Chen', role: 'Sales Exec', dept: 'Sales', email: 'robert@acme.com', status: 'Active', joinDate: '2024-03-10', salary: 5000 },
    { id: 'EMP-004', name: 'Lisa Wong', role: 'Product Manager', dept: 'Product', email: 'lisa@acme.com', status: 'Active', joinDate: '2022-11-20', salary: 9000 },
    { id: 'EMP-005', name: 'Tom Wilson', role: 'QA Tester', dept: 'Engineering', email: 'tom@acme.com', status: 'Inactive', joinDate: '2023-05-05', salary: 6000 },
  ]);

  const [attendance, setAttendance] = useState([
    { id: 'ATT-101', name: 'John Doe', date: '2026-05-23', checkIn: '08:55 AM', checkOut: '05:02 PM', status: 'Present', hours: '8h 7m' },
    { id: 'ATT-102', name: 'Jane Smith', date: '2026-05-23', checkIn: '09:10 AM', checkOut: '05:15 PM', status: 'Late', hours: '8h 5m' },
    { id: 'ATT-103', name: 'Robert Chen', date: '2026-05-23', checkIn: '08:48 AM', checkOut: '05:00 PM', status: 'Present', hours: '8h 12m' },
    { id: 'ATT-104', name: 'Lisa Wong', date: '2026-05-23', checkIn: '--', checkOut: '--', status: 'On Leave', hours: '0h 0m' },
  ]);

  const [leaves, setLeaves] = useState([
    { id: 'LV-501', name: 'Robert Chen', type: 'Sick Leave', startDate: '2026-05-20', endDate: '2026-05-22', duration: '3 Days', status: 'Approved' },
    { id: 'LV-502', name: 'John Doe', type: 'Annual Leave', startDate: '2026-06-01', endDate: '2026-06-10', duration: '8 Days', status: 'Pending' },
    { id: 'LV-503', name: 'Jane Smith', type: 'Maternity', startDate: '2026-12-01', endDate: '2027-03-01', duration: '90 Days', status: 'Pending' },
    { id: 'LV-504', name: 'Lisa Wong', type: 'Annual Leave', startDate: '2026-05-23', endDate: '2026-05-23', duration: '1 Day', status: 'Approved' },
  ]);

  const [payroll, setPayroll] = useState([
    { id: 'PR-2610', name: 'John Doe', base: 8500, allowance: 500, deductions: 1200, net: 7800, status: 'Paid', month: 'May 2026' },
    { id: 'PR-2611', name: 'Jane Smith', base: 7200, allowance: 0, deductions: 950, net: 6250, status: 'Paid', month: 'May 2026' },
    { id: 'PR-2612', name: 'Robert Chen', base: 5000, allowance: 3200, deductions: 800, net: 7400, status: 'Processing', month: 'May 2026' },
    { id: 'PR-2613', name: 'Lisa Wong', base: 9000, allowance: 1000, deductions: 1400, net: 8600, status: 'Processing', month: 'May 2026' },
  ]);

  const [slips, setSlips] = useState([
    { id: 'SLIP-261001', name: 'John Doe', period: 'May 2026', paidDate: '2026-05-20', format: 'PDF', size: '154 KB', net: 7800 },
    { id: 'SLIP-261002', name: 'Jane Smith', period: 'May 2026', paidDate: '2026-05-20', format: 'PDF', size: '148 KB', net: 6250 },
  ]);

  const [reimbursements, setReimbursements] = useState([
    { id: 'RM-701', name: 'John Doe', type: 'Client Entertainment', amount: 350, date: '2026-05-18', receipt: 'receipt_ent_701.png', status: 'Approved' },
    { id: 'RM-702', name: 'Lisa Wong', type: 'Internet & WiFi', amount: 80, date: '2026-05-20', receipt: 'receipt_wifi_702.png', status: 'Pending' },
    { id: 'RM-703', name: 'Robert Chen', type: 'Hardware Supplies', amount: 1200, date: '2026-05-21', receipt: 'receipt_hw_703.png', status: 'Pending' },
  ]);

  const [jobs, setJobs] = useState([
    { id: 'REQ-01', title: 'Senior Frontend Dev', dept: 'Engineering', location: 'Remote', applicants: 45, stage: 'Interviewing', status: 'Open', candidate: 'Arthur Pendragon' },
    { id: 'REQ-02', title: 'Marketing Lead', dept: 'Marketing', location: 'New York', applicants: 12, stage: 'Screening', status: 'Open', candidate: 'Gwen Stacy' },
    { id: 'REQ-03', title: 'Customer Support', dept: 'Support', location: 'London', applicants: 89, stage: 'Offer', status: 'Open', candidate: 'Peter Parker' },
  ]);

  const [shifts, setShifts] = useState([
    { id: 'SH-801', name: 'John Doe', type: 'Day Shift', timing: '09:00 AM - 05:00 PM', days: 'Mon - Fri', status: 'Active' },
    { id: 'SH-802', name: 'Jane Smith', type: 'Day Shift', timing: '09:00 AM - 05:00 PM', days: 'Mon - Fri', status: 'Active' },
    { id: 'SH-803', name: 'Robert Chen', type: 'Night Shift', timing: '09:00 PM - 05:00 AM', days: 'Mon - Fri', status: 'Active' },
    { id: 'SH-804', name: 'Lisa Wong', type: 'Rotational Shift', timing: '01:00 PM - 09:00 PM', days: 'Tue - Sat', status: 'Active' },
  ]);

  const [reviews, setReviews] = useState([
    { id: 'REV-901', name: 'John Doe', reviewer: 'Lisa Wong', period: 'Q3 2026', score: 4.5, feedback: 'Completed core software updates successfully.', status: 'Completed' },
    { id: 'REV-902', name: 'Jane Smith', reviewer: 'CEO Office', period: 'Q3 2026', score: 4.8, feedback: 'Exceeded recruitment quotas and finalized benefits plan.', status: 'Completed' },
    { id: 'REV-903', name: 'Robert Chen', reviewer: 'Jane Smith', period: 'Q3 2026', score: 3.5, feedback: 'Met sales baseline, but pipeline requires expansion.', status: 'Pending Review' },
  ]);

  const [reports, setReports] = useState([
    { id: 'REP-001', name: 'Global Payroll Roster May 2026', generated: '2026-05-23', format: 'CSV', size: '2.4 MB', status: 'Ready' },
    { id: 'REP-002', name: 'Headcount & Turnover Analysis Q2', generated: '2026-05-22', format: 'PDF', size: '4.8 MB', status: 'Ready' },
    { id: 'REP-003', name: 'Employee Benefits Roster 2026', generated: '2026-05-15', format: 'XLSX', size: '1.8 MB', status: 'Ready' },
  ]);

  const [documents, setDocuments] = useState([
    { id: 'DOC-301', name: 'John Doe', type: 'Passport Scans', filename: 'passport_scan_jdoe.pdf', size: '4.2 MB', uploaded: '2026-05-10', verified: true },
    { id: 'DOC-302', name: 'Jane Smith', type: 'NDA signed', filename: 'nda_signed_smith.pdf', size: '1.8 MB', uploaded: '2026-05-12', verified: true },
    { id: 'DOC-303', name: 'Robert Chen', type: 'Degree Certificate', filename: 'mtech_degree_chen.pdf', size: '16.5 MB', uploaded: '2026-05-21', verified: false },
  ]);

  // --- DATABASE SYNC & BACKEND CONNECTIVITY ---
  const [isLoaded, setIsLoaded] = useState(false);

  const apiRequest = async (endpoint: string, method = 'GET', body: any = null) => {
    if (!token || !backendUrl) return null;
    try {
      const headers: any = { 'Authorization': `Bearer ${token}` };
      if (body) headers['Content-Type'] = 'application/json';
      const res = await fetch(`${backendUrl}${endpoint}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : null
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Request failed');
      }
      return await res.json();
    } catch (err) {
      console.error(`[HR API Error] ${endpoint}:`, err);
      return null;
    }
  };

  useEffect(() => {
    if (!token || !backendUrl) return;

    const loadData = async () => {
      try {
        const dbEmployees = await apiRequest('/api/store/hr_employees');
        if (dbEmployees && dbEmployees.length > 0) setEmployees(dbEmployees);
        else await apiRequest('/api/store/hr_employees/bulk', 'POST', employees);

        const dbAttendance = await apiRequest('/api/store/hr_attendance');
        if (dbAttendance && dbAttendance.length > 0) setAttendance(dbAttendance);
        else await apiRequest('/api/store/hr_attendance/bulk', 'POST', attendance);

        const dbLeaves = await apiRequest('/api/store/hr_leaves');
        if (dbLeaves && dbLeaves.length > 0) setLeaves(dbLeaves);
        else await apiRequest('/api/store/hr_leaves/bulk', 'POST', leaves);

        const dbPayroll = await apiRequest('/api/store/hr_payroll');
        if (dbPayroll && dbPayroll.length > 0) setPayroll(dbPayroll);
        else await apiRequest('/api/store/hr_payroll/bulk', 'POST', payroll);

        const dbSlips = await apiRequest('/api/store/hr_slips');
        if (dbSlips && dbSlips.length > 0) setSlips(dbSlips);
        else await apiRequest('/api/store/hr_slips/bulk', 'POST', slips);

        const dbReimbursements = await apiRequest('/api/store/hr_reimbursements');
        if (dbReimbursements && dbReimbursements.length > 0) setReimbursements(dbReimbursements);
        else await apiRequest('/api/store/hr_reimbursements/bulk', 'POST', reimbursements);

        const dbJobs = await apiRequest('/api/store/hr_jobs');
        if (dbJobs && dbJobs.length > 0) setJobs(dbJobs);
        else await apiRequest('/api/store/hr_jobs/bulk', 'POST', jobs);

        const dbShifts = await apiRequest('/api/store/hr_shifts');
        if (dbShifts && dbShifts.length > 0) setShifts(dbShifts);
        else await apiRequest('/api/store/hr_shifts/bulk', 'POST', shifts);

        const dbReviews = await apiRequest('/api/store/hr_reviews');
        if (dbReviews && dbReviews.length > 0) setReviews(dbReviews);
        else await apiRequest('/api/store/hr_reviews/bulk', 'POST', reviews);

        const dbReports = await apiRequest('/api/store/hr_reports');
        if (dbReports && dbReports.length > 0) setReports(dbReports);
        else await apiRequest('/api/store/hr_reports/bulk', 'POST', reports);

        const dbDocs = await apiRequest('/api/store/hr_documents');
        if (dbDocs && dbDocs.length > 0) setDocuments(dbDocs);
        else await apiRequest('/api/store/hr_documents/bulk', 'POST', documents);

        setIsLoaded(true);
      } catch (err) {
        console.error('Error loading HR data from backend:', err);
        setIsLoaded(true);
      }
    };

    loadData();
  }, [token, backendUrl]);

  // Synchronizers to write state changes to the SQLite database
  useEffect(() => {
    if (!isLoaded || !token || !backendUrl) return;
    apiRequest('/api/store/hr_employees/bulk', 'POST', employees);
  }, [employees, isLoaded, token, backendUrl]);

  useEffect(() => {
    if (!isLoaded || !token || !backendUrl) return;
    apiRequest('/api/store/hr_attendance/bulk', 'POST', attendance);
  }, [attendance, isLoaded, token, backendUrl]);

  useEffect(() => {
    if (!isLoaded || !token || !backendUrl) return;
    apiRequest('/api/store/hr_leaves/bulk', 'POST', leaves);
  }, [leaves, isLoaded, token, backendUrl]);

  useEffect(() => {
    if (!isLoaded || !token || !backendUrl) return;
    apiRequest('/api/store/hr_payroll/bulk', 'POST', payroll);
  }, [payroll, isLoaded, token, backendUrl]);

  useEffect(() => {
    if (!isLoaded || !token || !backendUrl) return;
    apiRequest('/api/store/hr_slips/bulk', 'POST', slips);
  }, [slips, isLoaded, token, backendUrl]);

  useEffect(() => {
    if (!isLoaded || !token || !backendUrl) return;
    apiRequest('/api/store/hr_reimbursements/bulk', 'POST', reimbursements);
  }, [reimbursements, isLoaded, token, backendUrl]);

  useEffect(() => {
    if (!isLoaded || !token || !backendUrl) return;
    apiRequest('/api/store/hr_jobs/bulk', 'POST', jobs);
  }, [jobs, isLoaded, token, backendUrl]);

  useEffect(() => {
    if (!isLoaded || !token || !backendUrl) return;
    apiRequest('/api/store/hr_shifts/bulk', 'POST', shifts);
  }, [shifts, isLoaded, token, backendUrl]);

  useEffect(() => {
    if (!isLoaded || !token || !backendUrl) return;
    apiRequest('/api/store/hr_reviews/bulk', 'POST', reviews);
  }, [reviews, isLoaded, token, backendUrl]);

  useEffect(() => {
    if (!isLoaded || !token || !backendUrl) return;
    apiRequest('/api/store/hr_reports/bulk', 'POST', reports);
  }, [reports, isLoaded, token, backendUrl]);

  useEffect(() => {
    if (!isLoaded || !token || !backendUrl) return;
    apiRequest('/api/store/hr_documents/bulk', 'POST', documents);
  }, [documents, isLoaded, token, backendUrl]);

  // --- ACTIONS HANDLERS ---
  const handleSaveEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmployee.name || !newEmployee.email) {
      showToast('Please fill out employee name and email address', 'warning');
      return;
    }
    const nextId = `EMP-${(employees.length + 1).toString().padStart(3, '0')}`;
    const baseSal = Number(newEmployee.salary);
    const newEmpObj = {
      id: nextId,
      name: newEmployee.name,
      role: newEmployee.role,
      dept: newEmployee.dept,
      email: newEmployee.email,
      status: newEmployee.status,
      joinDate: newEmployee.joinDate,
      salary: baseSal
    };
    setEmployees([newEmpObj, ...employees]);

    // Append to payroll state
    const newPrObj = {
      id: `PR-26${10 + payroll.length}`,
      name: newEmployee.name,
      base: baseSal,
      allowance: 0,
      deductions: Math.floor(baseSal * 0.12),
      net: Math.floor(baseSal * 0.88),
      status: 'Processing',
      month: 'May 2026'
    };
    setPayroll([newPrObj, ...payroll]);

    // Increment Employee Dashboard KPI
    setDashboardStats(prev => {
      const copy = [...prev];
      const curTotal = parseInt(copy[0].value);
      copy[0] = { ...copy[0], value: (curTotal + 1).toString() };
      return copy;
    });

    showToast(`Employee Profile ${nextId} created and initialized in Payroll!`, 'success');
    setShowEmployeeModal(false);
    setNewEmployee({ name: '', role: 'Software Engineer', dept: 'Engineering', email: '', salary: 8500, status: 'Active', joinDate: '2026-05-23' });
  };

  const handleSaveLeave = (e: React.FormEvent) => {
    e.preventDefault();
    const nextId = `LV-${500 + leaves.length + 1}`;
    const newLeaveObj = {
      id: nextId,
      name: newLeave.name,
      type: newLeave.type,
      startDate: newLeave.startDate,
      endDate: newLeave.endDate,
      duration: newLeave.duration,
      status: 'Pending'
    };
    setLeaves([newLeaveObj, ...leaves]);
    showToast(`Leave Request ${nextId} filed and sent for approval!`, 'success');
    setShowLeaveModal(false);
    setNewLeave({ name: 'John Doe', type: 'Sick Leave', startDate: '2026-06-01', endDate: '2026-06-03', duration: '3 Days', reason: '' });
  };

  const handleSaveReimbursement = (e: React.FormEvent) => {
    e.preventDefault();
    const nextId = `RM-${700 + reimbursements.length + 1}`;
    const newClaimObj = {
      id: nextId,
      name: newReimbursement.name,
      type: newReimbursement.type,
      amount: Number(newReimbursement.amount),
      date: newReimbursement.date,
      receipt: `receipt_${newReimbursement.type.toLowerCase().replace(' ', '_')}_${nextId}.pdf`,
      status: 'Pending'
    };
    setReimbursements([newClaimObj, ...reimbursements]);
    showToast(`Expense claim ${nextId} filed successfully!`, 'success');
    setShowReimbursementModal(false);
    setNewReimbursement({ name: 'John Doe', type: 'Travel Expense', amount: 150, date: '2026-05-23', reason: '' });
  };

  const handleSaveShift = (e: React.FormEvent) => {
    e.preventDefault();
    const nextId = `SH-${800 + shifts.length + 1}`;
    const newShiftObj = {
      id: nextId,
      name: newShift.name,
      type: newShift.type,
      timing: newShift.timing,
      days: newShift.days,
      status: 'Active'
    };
    setShifts([newShiftObj, ...shifts]);
    showToast(`Roster Shift ${nextId} assigned to ${newShift.name}!`, 'success');
    setShowShiftModal(false);
    setNewShift({ name: 'John Doe', type: 'Day Shift', timing: '09:00 AM - 05:00 PM', days: 'Mon - Fri' });
  };

  const handleSaveReview = (e: React.FormEvent) => {
    e.preventDefault();
    const nextId = `REV-${900 + reviews.length + 1}`;
    const newReviewObj = {
      id: nextId,
      name: newReview.name,
      reviewer: newReview.reviewer,
      period: newReview.period,
      score: Number(newReview.score),
      feedback: newReview.feedback,
      status: 'Completed'
    };
    setReviews([newReviewObj, ...reviews]);

    // Recalculate Performance Indicator Average
    setDashboardStats(prev => {
      const copy = [...prev];
      const sum = reviews.reduce((acc, curr) => acc + (typeof curr.score === 'number' ? curr.score : 4.0), 0) + Number(newReview.score);
      const avg = (sum / (reviews.length + 1)).toFixed(1);
      copy[3] = { ...copy[3], value: `${avg}/5` };
      return copy;
    });

    showToast(`Performance evaluation ${nextId} generated!`, 'success');
    setShowReviewModal(false);
    setNewReview({ name: 'John Doe', evaluator: 'Jane Smith', period: 'Q2 2026', score: 4.5, feedback: '' });
  };

  const handleSaveDoc = (e: React.FormEvent) => {
    e.preventDefault();
    if (newDoc.size > 15.0) {
      showToast(`Warning: File "${newDoc.filename}" (${newDoc.size} MB) exceeds standard 15MB audit size limits!`, 'warning');
    }
    const nextId = `DOC-${300 + documents.length + 1}`;
    const newDocObj = {
      id: nextId,
      name: newDoc.name,
      type: newDoc.type,
      filename: newDoc.filename,
      size: `${newDoc.size} MB`,
      uploaded: 'Just now',
      verified: false
    };
    setDocuments([newDocObj, ...documents]);
    showToast(`Document uploaded successfully! Verification pending.`, 'success');
    setShowDocModal(false);
    setNewDoc({ name: 'John Doe', type: 'Employment Contract', filename: 'contract_signed_v2.pdf', size: 1.2 });
  };

  // Dynamic Flows
  const handleApproveLeave = (leaveId: string) => {
    setLeaves(prev => prev.map(l => {
      if (l.id === leaveId) {
        showToast(`Leave request ${leaveId} Approved!`, 'success');
        // Increment leave count on dashboard
        setDashboardStats(d => {
          const copy = [...d];
          const curr = parseInt(copy[1].value);
          copy[1] = { ...copy[1], value: (curr + 1).toString() };
          return copy;
        });
        return { ...l, status: 'Approved' };
      }
      return l;
    }));
  };

  const handleRejectLeave = (leaveId: string) => {
    setLeaves(prev => prev.map(l => {
      if (l.id === leaveId) {
        showToast(`Leave request ${leaveId} Rejected.`, 'warning');
        return { ...l, status: 'Rejected' };
      }
      return l;
    }));
  };

  const handleHireApplicant = (reqId: string, candidate: string, dept: string, jobTitle: string) => {
    showToast(`Hired ${candidate}! Spawning active employee profile card.`, 'success');
    
    // De-register/close JobVacancy
    setJobs(prev => prev.map(j => {
      if (j.id === reqId) {
        return { ...j, status: 'Closed', stage: 'Hired' };
      }
      return j;
    }));

    // Add candidate into employees state
    const nextEmpId = `EMP-${(employees.length + 1).toString().padStart(3, '0')}`;
    const baseSal = dept === 'Engineering' ? 9500 : 6200;
    const newEmp = {
      id: nextEmpId,
      name: candidate,
      role: jobTitle,
      dept: dept,
      email: `${candidate.toLowerCase().replace(' ', '.')}@acme.com`,
      status: 'Active',
      joinDate: '2026-05-23',
      salary: baseSal
    };
    setEmployees([newEmp, ...employees]);

    // Append to payroll state
    const newPrObj = {
      id: `PR-26${10 + payroll.length}`,
      name: candidate,
      base: baseSal,
      allowance: 0,
      deductions: Math.floor(baseSal * 0.12),
      net: Math.floor(baseSal * 0.88),
      status: 'Processing',
      month: 'May 2026'
    };
    setPayroll([newPrObj, ...payroll]);

    // Increment headcount metric
    setDashboardStats(d => {
      const copy = [...d];
      const cur = parseInt(copy[0].value);
      const jobsOpen = parseInt(copy[2].value);
      copy[0] = { ...copy[0], value: (cur + 1).toString() };
      copy[2] = { ...copy[2], value: Math.max(0, jobsOpen - 1).toString() };
      return copy;
    });
  };

  const handleApproveReimbursement = (claimId: string, empName: string, amount: number) => {
    setReimbursements(prev => prev.map(rm => {
      if (rm.id === claimId) {
        showToast(`Approved Claim ${claimId}! $${amount} added as Allowance in next Payroll payrun.`, 'success');

        // Reconcile into Payroll Allowances
        setPayroll(prevPr => prevPr.map(pr => {
          if (pr.name.toLowerCase() === empName.toLowerCase()) {
            const nextAllow = pr.allowance + amount;
            const nextNet = pr.base + nextAllow - pr.deductions;
            return { ...pr, allowance: nextAllow, net: nextNet };
          }
          return pr;
        }));

        return { ...rm, status: 'Approved' };
      }
      return rm;
    }));
  };

  const handleProcessPayroll = (payrollId: string, empName: string, netAmount: number) => {
    setPayroll(prev => prev.map(p => {
      if (p.id === payrollId) {
        showToast(`Payroll processed successfully for ${empName}! Spawning Salary Slip PDF.`, 'success');

        // Append to salary slips logs
        const nextSlipId = `SLIP-2610${10 + slips.length + 1}`;
        const newSlip = {
          id: nextSlipId,
          name: empName,
          period: 'May 2026',
          paidDate: '2026-05-23',
          format: 'PDF',
          size: '152 KB',
          net: netAmount
        };
        setSlips([newSlip, ...slips]);

        return { ...p, status: 'Paid' };
      }
      return p;
    }));
  };

  const handleGenerateReport = (reportType: string) => {
    const nextId = `REP-${(reports.length + 1).toString().padStart(3, '0')}`;
    const newReport = {
      id: nextId,
      name: `${reportType} Generated Data`,
      generated: '2026-05-23',
      format: 'PDF',
      size: '2.1 MB',
      status: 'Ready'
    };
    setReports([newReport, ...reports]);
    showToast(`Compiled report "${reportType}" successfully!`, 'success');
  };

  const handleTriggerVerification = (docId: string) => {
    setDocuments(prev => prev.map(d => {
      if (d.id === docId) {
        showToast(`Audited and verified document ${docId}!`, 'success');
        return { ...d, verified: true };
      }
      return d;
    }));
  };

  // --- RENDER TABLES SEARCH ENGINE FILTER ---
  const renderTable = (headers: string[], data: any[], renderRow: (item: any, i: number) => React.ReactNode) => {
    const filteredData = data.filter(item => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return Object.values(item).some(val => 
        val && String(val).toLowerCase().includes(query)
      );
    });

    return (
      <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-color)] overflow-hidden flex flex-col h-full animate-fade-in m-2 text-xs">
        <div className="p-4 border-b border-[var(--border-color)] flex justify-between items-center bg-[var(--bg-tertiary)]/30">
          <div className="relative w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input 
              type="text" 
              placeholder="Search records..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg pl-9 pr-4 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>
          <div className="flex gap-2">
            <button className="p-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer">
              <Filter className="w-4 h-4" />
            </button>
            <button className="p-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer">
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="overflow-x-auto flex-1 custom-scrollbar">
          <table className="w-full text-left text-sm text-[var(--text-secondary)] min-w-[800px]">
            <thead className="text-xs uppercase bg-[var(--bg-tertiary)]/50 text-[var(--text-muted)] sticky top-0 z-10 shadow-sm">
              <tr>
                {headers.map((h, i) => <th key={i} className="px-6 py-3 font-semibold">{h}</th>)}
                <th className="px-6 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {filteredData.map((item, i) => renderRow(item, i))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderDashboard = () => (
    <div className="space-y-6 animate-fade-in p-2 text-xs">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {dashboardStats.map((stat, idx) => (
          <div key={idx} className="bg-[var(--bg-secondary)] border border-[var(--border-color)] p-4 rounded-xl flex items-center justify-between shadow-sm hover:shadow-md transition-shadow">
            <div>
              <p className="text-[var(--text-secondary)] text-sm font-semibold">{stat.title}</p>
              <h3 className="text-2xl font-bold text-[var(--text-primary)] mt-1 font-display">{stat.value}</h3>
              <div className="text-[10px] mt-2 text-[var(--text-muted)] font-medium flex items-center gap-1">
                <Activity className="w-3 h-3 text-cyan-400" />
                {stat.change}
              </div>
            </div>
            <div className={`w-12 h-12 rounded-full ${stat.bg} flex items-center justify-center`}>
              <stat.icon className={`w-6 h-6 ${stat.color}`} />
            </div>
          </div>
        ))}
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-5 shadow-sm text-left">
          <div className="flex justify-between items-center mb-4">
            <h4 className="font-bold text-[var(--text-primary)] text-sm font-display flex items-center gap-2">
              <Calendar className="w-4 h-4 text-teal-400" />
              Pending Leave Approvals
            </h4>
            <span className="text-[10px] text-teal-400 bg-teal-400/10 px-2 py-0.5 rounded-full font-bold">Action Needed</span>
          </div>
          <div className="space-y-3 max-h-[220px] overflow-y-auto custom-scrollbar">
            {leaves.filter(l => l.status === 'Pending').length === 0 ? (
              <div className="text-center py-6 text-[var(--text-muted)] font-medium">All leave requests audited successfully.</div>
            ) : (
              leaves.filter(l => l.status === 'Pending').map(leave => (
                <div key={leave.id} className="flex justify-between items-center p-3 bg-[var(--bg-primary)] rounded-lg border border-[var(--border-color)] hover:border-cyan-500/30 transition-colors">
                  <div>
                    <p className="font-bold text-sm text-[var(--text-primary)]">{leave.name}</p>
                    <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">{leave.type} • <span className="font-mono text-cyan-400 font-semibold">{leave.duration}</span> ({leave.startDate})</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => handleApproveLeave(leave.id)} className="px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-[10px] font-bold rounded-md cursor-pointer transition-colors flex items-center gap-1 border border-emerald-500/20">
                      <Check className="w-3 h-3" /> Approve
                    </button>
                    <button onClick={() => handleRejectLeave(leave.id)} className="px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-[10px] font-bold rounded-md cursor-pointer transition-colors flex items-center gap-1 border border-rose-500/20">
                      <X className="w-3 h-3" /> Reject
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-5 shadow-sm text-left">
          <div className="flex justify-between items-center mb-4">
            <h4 className="font-bold text-[var(--text-primary)] text-sm font-display flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-indigo-400" />
              Talent Acquisition Pipelines
            </h4>
            <span className="text-[10px] text-indigo-400 bg-indigo-400/10 px-2 py-0.5 rounded-full font-bold">Active Openings</span>
          </div>
          <div className="space-y-3 max-h-[220px] overflow-y-auto custom-scrollbar">
            {jobs.filter(j => j.status === 'Open').map(req => (
              <div key={req.id} className="flex justify-between items-center p-3 bg-[var(--bg-primary)] rounded-lg border border-[var(--border-color)] hover:border-cyan-500/30 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 shrink-0">
                    <GraduationCap className="w-4 h-4"/>
                  </div>
                  <div>
                    <p className="font-bold text-sm text-[var(--text-primary)]">{req.title}</p>
                    <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">{req.dept} • {req.applicants} Applicants • Candidate: <span className="text-cyan-400 font-semibold">{req.candidate}</span></p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[9px] font-bold px-2 py-0.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-md uppercase tracking-wider">{req.stage}</span>
                  {req.stage === 'Offer' ? (
                    <button 
                      onClick={() => handleHireApplicant(req.id, req.candidate, req.dept, req.title)}
                      className="px-2 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-[9px] font-bold cursor-pointer transition-all shrink-0"
                    >
                      Hire
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto select-none animate-fade-in flex flex-col h-[calc(100vh-80px)] p-4 text-left relative text-xs">
      {/* Toast Alert Notifications */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl border flex items-center gap-2 shadow-2xl backdrop-blur-md animate-scale-up ${
          toast.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' :
          'bg-amber-500/10 border-amber-500/30 text-amber-400'
        }`}>
          <CheckCircle2 className="w-4 h-4" />
          <span className="text-xs font-semibold">{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center border-b border-[var(--border-color)] pb-4 mb-4 shrink-0">
        <div>
          <h3 className="font-bold text-xl text-[var(--text-primary)] flex items-center gap-2 font-display">
            <Users className="w-6 h-6 text-cyan-500" />
            Human Resources Management (HRMS) Hub
          </h3>
          <p className="text-xs text-[var(--text-secondary)] mt-1 font-sans">Manage employee records, clock-in rosters, shift allocations, compensation, payroll slips distributions, expense claims, reviews, and documents vault</p>
        </div>
        <div className="flex gap-2">
          {currentTab === 'profiles' && (
            <button onClick={() => setShowEmployeeModal(true)} className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-sm font-bold transition-all shadow-lg flex items-center gap-2 cursor-pointer animate-scale-up">
              <UserPlus className="w-4 h-4" /> Onboard Employee
            </button>
          )}
          {currentTab === 'leave' && (
            <button onClick={() => setShowLeaveModal(true)} className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-sm font-bold transition-all shadow-lg flex items-center gap-2 cursor-pointer animate-scale-up">
              <Calendar className="w-4 h-4" /> File Leave Request
            </button>
          )}
          {currentTab === 'reimbursements' && (
            <button onClick={() => setShowReimbursementModal(true)} className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-sm font-bold transition-all shadow-lg flex items-center gap-2 cursor-pointer animate-scale-up">
              <DollarSign className="w-4 h-4" /> Log Expense Claim
            </button>
          )}
          {currentTab === 'shift' && (
            <button onClick={() => setShowShiftModal(true)} className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-sm font-bold transition-all shadow-lg flex items-center gap-2 cursor-pointer animate-scale-up">
              <Clock className="w-4 h-4" /> Configure Shift
            </button>
          )}
          {currentTab === 'performance' && (
            <button onClick={() => setShowReviewModal(true)} className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-sm font-bold transition-all shadow-lg flex items-center gap-2 cursor-pointer animate-scale-up">
              <Award className="w-4 h-4" /> Log Evaluation
            </button>
          )}
          {currentTab === 'documents' && (
            <button onClick={() => setShowDocModal(true)} className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-sm font-bold transition-all shadow-lg flex items-center gap-2 cursor-pointer animate-scale-up">
              <FileUp className="w-4 h-4" /> Upload Document
            </button>
          )}
          {currentTab === 'reports' && (
            <div className="flex gap-2">
              <button onClick={() => handleGenerateReport('Payroll Summary')} className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg cursor-pointer flex items-center gap-1.5 transition-colors">
                <Plus className="w-3.5 h-3.5" /> Payroll Report
              </button>
              <button onClick={() => handleGenerateReport('Headcount Audit')} className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-lg cursor-pointer flex items-center gap-1.5 transition-colors">
                <Plus className="w-3.5 h-3.5" /> Headcount Analysis
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Content Workspace Area */}
      <div className="flex-1 overflow-hidden">
        {currentTab === 'dashboard' && renderDashboard()}

        {/* VIEW 1: EMPLOYEE PROFILES */}
        {currentTab === 'profiles' && renderTable(
          ['Employee ID', 'Employee Profile Name', 'Designation Role', 'Department', 'Company Email Address', 'Date Of Joining', 'Compensation Structure', 'Status'],
          employees,
          (row) => (
            <tr key={row.id} className="hover:bg-[var(--bg-tertiary)]/30 transition-colors text-xs font-sans">
              <td className="px-6 py-4 font-mono font-bold text-cyan-400">{row.id}</td>
              <td className="px-6 py-4 font-bold text-[var(--text-primary)]">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-[10px] font-black uppercase font-display">{row.name.charAt(0)}</div>
                  {row.name}
                </div>
              </td>
              <td className="px-6 py-4 font-semibold text-[var(--text-secondary)]">{row.role}</td>
              <td className="px-6 py-4">{row.dept}</td>
              <td className="px-6 py-4 font-sans">{row.email}</td>
              <td className="px-6 py-4 font-mono">{row.joinDate}</td>
              <td className="px-6 py-4 font-mono font-bold text-[var(--text-primary)]">${row.salary.toLocaleString()}/mo</td>
              <td className="px-6 py-4">
                <span className={`px-2 py-0.5 rounded text-[9px] font-bold border uppercase tracking-wider ${
                  row.status === 'Active' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                  'bg-rose-500/10 border-rose-500/20 text-rose-400'
                }`}>{row.status}</span>
              </td>
              <td className="px-6 py-4 text-right">
                <button className="text-[var(--text-muted)] hover:text-cyan-400 p-1 cursor-pointer"><MoreHorizontal className="w-4 h-4" /></button>
              </td>
            </tr>
          )
        )}

        {/* VIEW 2: ATTENDANCE MANAGEMENT */}
        {currentTab === 'attendance' && renderTable(
          ['Log ID', 'Employee Name', 'Shift Date', 'Check In Time', 'Check Out Time', 'Working Duration', 'Status Tag'],
          attendance,
          (row) => (
            <tr key={row.id} className="hover:bg-[var(--bg-tertiary)]/30 transition-colors text-xs">
              <td className="px-6 py-4 font-mono font-bold text-cyan-400">{row.id}</td>
              <td className="px-6 py-4 font-bold text-[var(--text-primary)]">{row.name}</td>
              <td className="px-6 py-4 font-mono">{row.date}</td>
              <td className="px-6 py-4 font-mono font-semibold text-[var(--text-secondary)]">{row.checkIn}</td>
              <td className="px-6 py-4 font-mono text-[var(--text-secondary)]">{row.checkOut}</td>
              <td className="px-6 py-4 font-mono font-bold text-[var(--text-primary)]">{row.hours}</td>
              <td className="px-6 py-4">
                <span className={`px-2 py-0.5 rounded text-[9px] font-bold border uppercase tracking-wider ${
                  row.status === 'Present' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                  row.status === 'Late' ? 'bg-amber-500/10 border-amber-500/20 text-amber-500 animate-pulse' :
                  'bg-cyan-500/10 border-cyan-500/20 text-cyan-400'
                }`}>{row.status}</span>
              </td>
              <td className="px-6 py-4 text-right">
                <button className="text-[var(--text-muted)] hover:text-cyan-400 p-1 cursor-pointer"><MoreHorizontal className="w-4 h-4" /></button>
              </td>
            </tr>
          )
        )}

        {/* VIEW 3: LEAVE MANAGEMENT */}
        {currentTab === 'leave' && renderTable(
          ['Request ID', 'Employee Name', 'Leave Category', 'Start Date', 'End Date', 'Duration Time', 'Audit Status'],
          leaves,
          (row) => (
            <tr key={row.id} className="hover:bg-[var(--bg-tertiary)]/30 transition-colors text-xs font-sans">
              <td className="px-6 py-4 font-mono font-bold text-cyan-400">{row.id}</td>
              <td className="px-6 py-4 font-bold text-[var(--text-primary)]">{row.name}</td>
              <td className="px-6 py-4 font-semibold">{row.type}</td>
              <td className="px-6 py-4 font-mono">{row.startDate}</td>
              <td className="px-6 py-4 font-mono">{row.endDate}</td>
              <td className="px-6 py-4 font-mono font-bold text-cyan-400">{row.duration}</td>
              <td className="px-6 py-4">
                <span className={`px-2 py-0.5 rounded text-[9px] font-bold border uppercase tracking-wider ${
                  row.status === 'Approved' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                  row.status === 'Pending' ? 'bg-amber-500/10 border-amber-500/20 text-amber-500 animate-pulse' :
                  'bg-rose-500/10 border-rose-500/20 text-rose-400'
                }`}>{row.status}</span>
              </td>
              <td className="px-6 py-4 text-right">
                <div className="flex items-center justify-end gap-2">
                  {row.status === 'Pending' ? (
                    <div className="flex gap-1">
                      <button onClick={() => handleApproveLeave(row.id)} className="p-1 text-emerald-400 hover:text-white hover:bg-emerald-600 rounded border border-emerald-500/20 cursor-pointer transition-colors"><Check className="w-3 h-3" /></button>
                      <button onClick={() => handleRejectLeave(row.id)} className="p-1 text-rose-400 hover:text-white hover:bg-rose-600 rounded border border-rose-500/20 cursor-pointer transition-colors"><X className="w-3 h-3" /></button>
                    </div>
                  ) : null}
                  <button className="text-[var(--text-muted)] hover:text-cyan-400 p-1 cursor-pointer"><MoreHorizontal className="w-4 h-4" /></button>
                </div>
              </td>
            </tr>
          )
        )}

        {/* VIEW 4: PAYROLL MANAGEMENT */}
        {currentTab === 'payroll' && renderTable(
          ['Payroll ID', 'Employee Name', 'Base Salary', 'Allowance Claims', 'Statutory Deductions', 'Net Payable Amount', 'Pay Period Month', 'Processing Status'],
          payroll,
          (row) => (
            <tr key={row.id} className="hover:bg-[var(--bg-tertiary)]/30 transition-colors text-xs font-mono">
              <td className="px-6 py-4 font-bold text-cyan-400">{row.id}</td>
              <td className="px-6 py-4 font-bold text-[var(--text-primary)] font-sans">{row.name}</td>
              <td className="px-6 py-4 font-bold text-[var(--text-primary)]">${row.base.toLocaleString()}</td>
              <td className="px-6 py-4 text-emerald-400 font-bold">+${row.allowance.toLocaleString()}</td>
              <td className="px-6 py-4 text-rose-400">-${row.deductions.toLocaleString()}</td>
              <td className="px-6 py-4 text-cyan-400 font-black text-sm">${row.net.toLocaleString()}</td>
              <td className="px-6 py-4 font-sans text-[var(--text-secondary)]">{row.month}</td>
              <td className="px-6 py-4 font-sans">
                <span className={`px-2 py-0.5 rounded text-[9px] font-bold border uppercase tracking-wider ${
                  row.status === 'Paid' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                  'bg-amber-500/10 border-amber-500/20 text-amber-500 animate-pulse'
                }`}>{row.status}</span>
              </td>
              <td className="px-6 py-4 text-right font-sans">
                <div className="flex items-center justify-end gap-2">
                  {row.status === 'Processing' ? (
                    <button 
                      onClick={() => handleProcessPayroll(row.id, row.name, row.net)}
                      className="px-2 py-0.5 text-cyan-400 hover:text-cyan-300 font-bold border border-cyan-500/25 bg-cyan-500/5 rounded text-[9px] cursor-pointer"
                    >
                      Process Payrun
                    </button>
                  ) : null}
                  <button className="text-[var(--text-muted)] hover:text-cyan-400 p-1 cursor-pointer"><MoreHorizontal className="w-4 h-4" /></button>
                </div>
              </td>
            </tr>
          )
        )}

        {/* VIEW 5: SALARY SLIPS */}
        {currentTab === 'slips' && renderTable(
          ['Slip ID', 'Employee Recipient', 'Pay Period', 'Paid Distribution Date', 'File Format', 'Attachment Size', 'Distributed Wages'],
          slips,
          (row) => (
            <tr key={row.id} className="hover:bg-[var(--bg-tertiary)]/30 transition-colors text-xs font-sans">
              <td className="px-6 py-4 font-mono font-bold text-cyan-400">{row.id}</td>
              <td className="px-6 py-4 font-bold text-[var(--text-primary)]">{row.name}</td>
              <td className="px-6 py-4 font-semibold">{row.period}</td>
              <td className="px-6 py-4 font-mono text-[var(--text-secondary)]">{row.paidDate}</td>
              <td className="px-6 py-4 font-mono"><span className="text-[9px] bg-red-500/10 text-red-400 px-1 py-0.5 rounded font-bold">{row.format}</span></td>
              <td className="px-6 py-4 font-mono text-[var(--text-muted)]">{row.size}</td>
              <td className="px-6 py-4 font-mono font-bold text-emerald-400">${row.net.toLocaleString()}</td>
              <td className="px-6 py-4 text-right">
                <div className="flex items-center justify-end gap-2">
                  <button 
                    onClick={() => setShowPayslipPreview(row)}
                    className="px-2 py-0.5 text-cyan-400 hover:text-cyan-300 font-bold border border-cyan-500/25 bg-cyan-500/5 rounded text-[9px] cursor-pointer"
                  >
                    View Slip
                  </button>
                  <button className="text-[var(--text-muted)] hover:text-cyan-400 p-1 cursor-pointer"><MoreHorizontal className="w-4 h-4" /></button>
                </div>
              </td>
            </tr>
          )
        )}

        {/* VIEW 6: REIMBURSEMENTS */}
        {currentTab === 'reimbursements' && renderTable(
          ['Claim ID', 'Employee Name Account', 'Expense claim Category', 'Requested Amount', 'Claim Logging Date', 'Receipt Document', 'Auditing Status'],
          reimbursements,
          (row) => (
            <tr key={row.id} className="hover:bg-[var(--bg-tertiary)]/30 transition-colors text-xs font-sans">
              <td className="px-6 py-4 font-mono font-bold text-cyan-400">{row.id}</td>
              <td className="px-6 py-4 font-bold text-[var(--text-primary)]">{row.name}</td>
              <td className="px-6 py-4 font-semibold text-[var(--text-secondary)]">{row.type}</td>
              <td className="px-6 py-4 font-mono font-bold text-emerald-400">${row.amount.toLocaleString()}</td>
              <td className="px-6 py-4 font-mono">{row.date}</td>
              <td className="px-6 py-4 font-mono text-cyan-400 underline cursor-pointer">{row.receipt}</td>
              <td className="px-6 py-4">
                <span className={`px-2 py-0.5 rounded text-[9px] font-bold border uppercase tracking-wider ${
                  row.status === 'Approved' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                  'bg-amber-500/10 border-amber-500/20 text-amber-500 animate-pulse'
                }`}>{row.status}</span>
              </td>
              <td className="px-6 py-4 text-right">
                <div className="flex items-center justify-end gap-2">
                  {row.status === 'Pending' ? (
                    <button 
                      onClick={() => handleApproveReimbursement(row.id, row.name, row.amount)}
                      className="px-2 py-0.5 text-emerald-400 hover:text-emerald-300 font-bold border border-emerald-500/25 bg-emerald-500/5 rounded text-[9px] cursor-pointer"
                    >
                      Approve Claim
                    </button>
                  ) : null}
                  <button className="text-[var(--text-muted)] hover:text-cyan-400 p-1 cursor-pointer"><MoreHorizontal className="w-4 h-4" /></button>
                </div>
              </td>
            </tr>
          )
        )}

        {/* VIEW 7: RECRUITMENT MANAGEMENT */}
        {currentTab === 'recruitment' && renderTable(
          ['Requisition ID', 'Hiring Job Title', 'Department', 'Location Particulars', 'Applicants Total', 'Current Interview Stage', 'Auditing Status'],
          jobs,
          (row) => (
            <tr key={row.id} className="hover:bg-[var(--bg-tertiary)]/30 transition-colors text-xs font-sans">
              <td className="px-6 py-4 font-mono font-bold text-cyan-400">{row.id}</td>
              <td className="px-6 py-4 font-bold text-[var(--text-primary)]">
                <div className="flex items-center gap-2">
                  <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                  {row.title}
                </div>
              </td>
              <td className="px-6 py-4 font-semibold text-[var(--text-secondary)]">{row.dept}</td>
              <td className="px-6 py-4 font-mono">{row.location}</td>
              <td className="px-6 py-4 font-mono font-bold text-[var(--text-primary)]">{row.applicants} applicants</td>
              <td className="px-6 py-4">
                <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-[var(--border-color)] uppercase tracking-wider">{row.stage}</span>
              </td>
              <td className="px-6 py-4">
                <span className={`px-2 py-0.5 rounded text-[9px] font-bold border uppercase tracking-wider ${
                  row.status === 'Open' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 animate-pulse' :
                  'bg-rose-500/10 border-rose-500/20 text-rose-400'
                }`}>{row.status}</span>
              </td>
              <td className="px-6 py-4 text-right">
                <div className="flex items-center justify-end gap-2">
                  {row.stage === 'Offer' && row.status === 'Open' ? (
                    <button 
                      onClick={() => handleHireApplicant(row.id, row.candidate, row.dept, row.title)}
                      className="px-2 py-0.5 text-emerald-400 hover:text-emerald-300 font-bold border border-emerald-500/25 bg-emerald-500/5 rounded text-[9px] cursor-pointer"
                    >
                      Hire Candidate
                    </button>
                  ) : null}
                  <button className="text-[var(--text-muted)] hover:text-cyan-400 p-1 cursor-pointer"><MoreHorizontal className="w-4 h-4" /></button>
                </div>
              </td>
            </tr>
          )
        )}

        {/* VIEW 8: SHIFT SCHEDULES */}
        {currentTab === 'shift' && renderTable(
          ['Roster ID', 'Employee Name Roster', 'Shift Category Type', 'Standard Timing Range', 'Working Weekdays', 'Roster Status'],
          shifts,
          (row) => (
            <tr key={row.id} className="hover:bg-[var(--bg-tertiary)]/30 transition-colors text-xs font-sans">
              <td className="px-6 py-4 font-mono font-bold text-cyan-400">{row.id}</td>
              <td className="px-6 py-4 font-bold text-[var(--text-primary)]">{row.name}</td>
              <td className="px-6 py-4 font-semibold text-[var(--text-secondary)] flex items-center gap-1.5">
                <Clock3 className="w-3.5 h-3.5 text-cyan-400" />
                {row.type}
              </td>
              <td className="px-6 py-4 font-mono font-medium text-[var(--text-primary)]">{row.timing}</td>
              <td className="px-6 py-4 font-mono">{row.days}</td>
              <td className="px-6 py-4">
                <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 uppercase tracking-wider">{row.status}</span>
              </td>
              <td className="px-6 py-4 text-right">
                <button className="text-[var(--text-muted)] hover:text-cyan-400 p-1 cursor-pointer"><MoreHorizontal className="w-4 h-4" /></button>
              </td>
            </tr>
          )
        )}

        {/* VIEW 9: PERFORMANCE EVALUATION */}
        {currentTab === 'performance' && renderTable(
          ['Evaluation ID', 'Employee Evaluated', 'Evaluator Supervisor', 'Review Period', 'Review KPI Score', 'Manager Feedback details', 'Process Status'],
          reviews,
          (row) => (
            <tr key={row.id} className="hover:bg-[var(--bg-tertiary)]/30 transition-colors text-xs font-sans">
              <td className="px-6 py-4 font-mono font-bold text-cyan-400">{row.id}</td>
              <td className="px-6 py-4 font-bold text-[var(--text-primary)]">{row.name}</td>
              <td className="px-6 py-4 font-semibold text-[var(--text-secondary)]">{row.reviewer}</td>
              <td className="px-6 py-4 font-mono">{row.period}</td>
              <td className="px-6 py-4 font-mono font-bold">
                <div className="flex items-center gap-2">
                  <span className="text-cyan-400 text-sm font-black">{row.score}/5</span>
                  <div className="h-1.5 w-16 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                    <div className="h-full bg-cyan-500 rounded-full" style={{ width: `${(row.score / 5) * 100}%` }}></div>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 text-[var(--text-secondary)] font-medium max-w-xs truncate">{row.feedback}</td>
              <td className="px-6 py-4">
                <span className={`px-2 py-0.5 rounded text-[9px] font-bold border uppercase tracking-wider ${
                  row.status === 'Completed' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                  'bg-amber-500/10 border-amber-500/20 text-amber-500 animate-pulse'
                }`}>{row.status}</span>
              </td>
              <td className="px-6 py-4 text-right">
                <button className="text-[var(--text-muted)] hover:text-cyan-400 p-1 cursor-pointer"><MoreHorizontal className="w-4 h-4" /></button>
              </td>
            </tr>
          )
        )}

        {/* VIEW 10: ANALYTICAL REPORTS */}
        {currentTab === 'reports' && renderTable(
          ['Report ID', 'Analytical Document Title Name', 'Generated Logging Date', 'File Format', 'Attachment Size', 'Download Status'],
          reports,
          (row) => (
            <tr key={row.id} className="hover:bg-[var(--bg-tertiary)]/30 transition-colors text-xs font-sans">
              <td className="px-6 py-4 font-mono font-bold text-cyan-400">{row.id}</td>
              <td className="px-6 py-4 font-bold text-[var(--text-primary)]">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-slate-400" />
                  {row.name}
                </div>
              </td>
              <td className="px-6 py-4 font-mono text-[var(--text-secondary)]">{row.generated}</td>
              <td className="px-6 py-4 font-mono"><span className="text-[9px] bg-cyan-500/10 text-cyan-400 px-1 py-0.5 rounded font-bold uppercase">{row.format}</span></td>
              <td className="px-6 py-4 font-mono text-[var(--text-muted)]">{row.size}</td>
              <td className="px-6 py-4">
                <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 uppercase tracking-wider">{row.status}</span>
              </td>
              <td className="px-6 py-4 text-right">
                <button className="text-cyan-400 hover:text-cyan-300 font-bold underline cursor-pointer">Download</button>
              </td>
            </tr>
          )
        )}

        {/* VIEW 11: DOCUMENT VAULT STORAGE */}
        {currentTab === 'documents' && renderTable(
          ['Doc ID', 'Employee Owner', 'Document Type Particulars', 'Attached Filename', 'File Storage Size', 'Upload Logging Date', 'Verification Audit'],
          documents,
          (row) => (
            <tr key={row.id} className="hover:bg-[var(--bg-tertiary)]/30 transition-colors text-xs font-sans">
              <td className="px-6 py-4 font-mono font-bold text-cyan-400">{row.id}</td>
              <td className="px-6 py-4 font-bold text-[var(--text-primary)]">{row.name}</td>
              <td className="px-6 py-4 font-semibold text-[var(--text-secondary)]">{row.type}</td>
              <td className="px-6 py-4 font-mono text-cyan-400 underline cursor-pointer">{row.filename}</td>
              <td className="px-6 py-4 font-mono">
                <span className={`font-bold ${parseFloat(row.size) > 15.0 ? 'text-rose-400' : 'text-[var(--text-secondary)]'}`}>
                  {row.size}
                </span>
              </td>
              <td className="px-6 py-4 font-mono">{row.uploaded}</td>
              <td className="px-6 py-4">
                <span className={`px-2 py-0.5 rounded text-[9px] font-bold border uppercase tracking-wider ${
                  row.verified ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                  'bg-amber-500/10 border-amber-500/20 text-amber-500 animate-pulse'
                }`}>{row.verified ? 'Verified' : 'Pending'}</span>
              </td>
              <td className="px-6 py-4 text-right">
                <div className="flex items-center justify-end gap-2">
                  {!row.verified ? (
                    <button 
                      onClick={() => handleTriggerVerification(row.id)}
                      className="px-2 py-0.5 text-emerald-400 hover:text-emerald-300 font-bold border border-emerald-500/25 bg-emerald-500/5 rounded text-[9px] cursor-pointer"
                    >
                      Audit Approve
                    </button>
                  ) : null}
                  <button className="text-[var(--text-muted)] hover:text-cyan-400 p-1 cursor-pointer"><MoreHorizontal className="w-4 h-4" /></button>
                </div>
              </td>
            </tr>
          )
        )}
      </div>

      {/* ==========================================
          MODALS CORE DRAWERS
          ========================================== */}

      {/* Onboard Employee Modal */}
      {showEmployeeModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in text-xs">
          <form onSubmit={handleSaveEmployee} className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl w-full max-w-md p-6 relative shadow-2xl text-left select-none text-xs">
            <button type="button" onClick={() => setShowEmployeeModal(false)} className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer">✕</button>
            <div className="flex items-center gap-2 pb-3 border-b border-[var(--border-color)] mb-4">
              <UserPlus className="w-5 h-5 text-cyan-400" />
              <h4 className="font-bold text-sm text-[var(--text-primary)] font-display">Onboard Employee Profile</h4>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Full Legal Name</label>
                <input type="text" placeholder="e.g. Clark Kent" value={newEmployee.name} onChange={(e) => setNewEmployee({ ...newEmployee, name: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Designation Role</label>
                  <input type="text" placeholder="Software Engineer" value={newEmployee.role} onChange={(e) => setNewEmployee({ ...newEmployee, role: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none" required />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Corporate Department</label>
                  <select value={newEmployee.dept} onChange={(e) => setNewEmployee({ ...newEmployee, dept: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none">
                    <option value="Engineering">Engineering & Development</option>
                    <option value="Human Resources">Human Resources (HR)</option>
                    <option value="Sales">Sales & Marketing</option>
                    <option value="Product">Product Management</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Base Monthly Salary ($)</label>
                  <input type="number" placeholder="8500" value={newEmployee.salary} onChange={(e) => setNewEmployee({ ...newEmployee, salary: Number(e.target.value) })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none font-mono" />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Company Email Address</label>
                  <input type="email" placeholder="clark@acme.com" value={newEmployee.email} onChange={(e) => setNewEmployee({ ...newEmployee, email: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none font-sans" required />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-color)] mt-4">
              <button type="button" onClick={() => setShowEmployeeModal(false)} className="py-1.5 px-4 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer">Cancel</button>
              <button type="submit" className="py-1.5 px-4 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-bold shadow cursor-pointer">Log Employee</button>
            </div>
          </form>
        </div>
      )}

      {/* File Leave Request Modal */}
      {showLeaveModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in text-xs">
          <form onSubmit={handleSaveLeave} className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl w-full max-w-md p-6 relative shadow-2xl text-left select-none text-xs">
            <button type="button" onClick={() => setShowLeaveModal(false)} className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer">✕</button>
            <div className="flex items-center gap-2 pb-3 border-b border-[var(--border-color)] mb-4">
              <Calendar className="w-5 h-5 text-cyan-400" />
              <h4 className="font-bold text-sm text-[var(--text-primary)] font-display">File Employee Leave Request</h4>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Employee Account Profile</label>
                <select value={newLeave.name} onChange={(e) => setNewLeave({ ...newLeave, name: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none">
                  {employees.map(e => <option key={e.id} value={e.name}>{e.name} ({e.role})</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Leave Category</label>
                  <select value={newLeave.type} onChange={(e) => setNewLeave({ ...newLeave, type: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none">
                    <option value="Sick Leave">Medical / Sick Leave</option>
                    <option value="Annual Leave">Annual Vacation Leave</option>
                    <option value="Maternity">Maternity/Paternity Leave</option>
                    <option value="Casual Leave">Casual Off Roster</option>
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Duration Days (e.g. 3 Days)</label>
                  <input type="text" placeholder="3 Days" value={newLeave.duration} onChange={(e) => setNewLeave({ ...newLeave, duration: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none" required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Start Date</label>
                  <input type="date" value={newLeave.startDate} onChange={(e) => setNewLeave({ ...newLeave, startDate: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none" required />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">End Date</label>
                  <input type="date" value={newLeave.endDate} onChange={(e) => setNewLeave({ ...newLeave, endDate: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none" required />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-color)] mt-4">
              <button type="button" onClick={() => setShowLeaveModal(false)} className="py-1.5 px-4 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer">Cancel</button>
              <button type="submit" className="py-1.5 px-4 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-bold shadow cursor-pointer">Submit Leave Request</button>
            </div>
          </form>
        </div>
      )}

      {/* Log Expense Reimbursement Claim Modal */}
      {showReimbursementModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in text-xs">
          <form onSubmit={handleSaveReimbursement} className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl w-full max-w-md p-6 relative shadow-2xl text-left select-none text-xs">
            <button type="button" onClick={() => setShowReimbursementModal(false)} className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer">✕</button>
            <div className="flex items-center gap-2 pb-3 border-b border-[var(--border-color)] mb-4">
              <DollarSign className="w-5 h-5 text-cyan-400" />
              <h4 className="font-bold text-sm text-[var(--text-primary)] font-display">Log Expense Reimbursement Claim</h4>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Employee Claimant Name</label>
                <select value={newReimbursement.name} onChange={(e) => setNewReimbursement({ ...newReimbursement, name: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none">
                  {employees.map(e => <option key={e.id} value={e.name}>{e.name} ({e.dept})</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Expense Type</label>
                  <select value={newReimbursement.type} onChange={(e) => setNewReimbursement({ ...newReimbursement, type: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none">
                    <option value="Travel Expense">Travel & Commute</option>
                    <option value="Internet & WiFi">WiFi & Communications</option>
                    <option value="Hardware Supplies">Client Hardware & Supplies</option>
                    <option value="Meals & Ent">Meals & Client Entertainment</option>
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Reimbursement Amount ($)</label>
                  <input type="number" placeholder="150" value={newReimbursement.amount} onChange={(e) => setNewReimbursement({ ...newReimbursement, amount: Number(e.target.value) })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none font-mono" required />
                </div>
              </div>
              <div>
                <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Claim Logging Date</label>
                <input type="date" value={newReimbursement.date} onChange={(e) => setNewReimbursement({ ...newReimbursement, date: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none" required />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-color)] mt-4">
              <button type="button" onClick={() => setShowReimbursementModal(false)} className="py-1.5 px-4 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer">Cancel</button>
              <button type="submit" className="py-1.5 px-4 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-bold shadow cursor-pointer">File Claim</button>
            </div>
          </form>
        </div>
      )}

      {/* Configure Shift Modal */}
      {showShiftModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in text-xs">
          <form onSubmit={handleSaveShift} className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl w-full max-w-sm p-6 relative shadow-2xl text-left select-none text-xs">
            <button type="button" onClick={() => setShowShiftModal(false)} className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer">✕</button>
            <div className="flex items-center gap-2 pb-3 border-b border-[var(--border-color)] mb-4">
              <Clock className="w-5 h-5 text-cyan-400" />
              <h4 className="font-bold text-sm text-[var(--text-primary)] font-display">Assign Employee Roster Shift</h4>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Target Employee</label>
                <select value={newShift.name} onChange={(e) => setNewShift({ ...newShift, name: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none">
                  {employees.map(e => <option key={e.id} value={e.name}>{e.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Shift Category Type</label>
                <select value={newShift.type} onChange={(e) => setNewShift({ ...newShift, type: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none">
                  <option value="Day Shift">Day Shift (09:00 AM - 05:00 PM)</option>
                  <option value="Night Shift">Night Shift (09:00 PM - 05:00 AM)</option>
                  <option value="Rotational Shift">Rotational Shift (01:00 PM - 09:00 PM)</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Standard Timing Range</label>
                  <input type="text" placeholder="09:00 AM - 05:00 PM" value={newShift.timing} onChange={(e) => setNewShift({ ...newShift, timing: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none font-mono" required />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Working Days</label>
                  <input type="text" placeholder="Mon - Fri" value={newShift.days} onChange={(e) => setNewShift({ ...newShift, days: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none" required />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-color)] mt-4">
              <button type="button" onClick={() => setShowShiftModal(false)} className="py-1.5 px-4 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer">Cancel</button>
              <button type="submit" className="py-1.5 px-4 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-bold shadow cursor-pointer">Assign Shift</button>
            </div>
          </form>
        </div>
      )}

      {/* Log Review Evaluation Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in text-xs">
          <form onSubmit={handleSaveReview} className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl w-full max-w-md p-6 relative shadow-2xl text-left select-none text-xs">
            <button type="button" onClick={() => setShowReviewModal(false)} className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer">✕</button>
            <div className="flex items-center gap-2 pb-3 border-b border-[var(--border-color)] mb-4">
              <Award className="w-5 h-5 text-cyan-400" />
              <h4 className="font-bold text-sm text-[var(--text-primary)] font-display">Log Performance Review Evaluation</h4>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Target Employee</label>
                <select value={newReview.name} onChange={(e) => setNewReview({ ...newReview, name: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none">
                  {employees.map(e => <option key={e.id} value={e.name}>{e.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Reviewer Supervisor</label>
                  <input type="text" placeholder="Jane Smith" value={newReview.evaluator} onChange={(e) => setNewReview({ ...newReview, evaluator: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none" required />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Review Period</label>
                  <select value={newReview.period} onChange={(e) => setNewReview({ ...newReview, period: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none">
                    <option value="Q1 2026">Q1 2026</option>
                    <option value="Q2 2026">Q2 2026</option>
                    <option value="Q3 2026">Q3 2026</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Review Score Range (1-5): <span className="text-cyan-400 font-bold font-mono">{newReview.score}/5</span></label>
                <input type="range" min="1.0" max="5.0" step="0.1" value={newReview.score} onChange={(e) => setNewReview({ ...newReview, score: Number(e.target.value) })} className="w-full accent-cyan-500 h-1.5 bg-[var(--bg-primary)] rounded-lg appearance-none cursor-pointer" />
              </div>
              <div>
                <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Detailed Performance Feedback Comments</label>
                <textarea placeholder="Exceeded target KPIs, strong backend releases contribution..." value={newReview.feedback} onChange={(e) => setNewReview({ ...newReview, feedback: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none resize-none h-16" required />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-color)] mt-4">
              <button type="button" onClick={() => setShowReviewModal(false)} className="py-1.5 px-4 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer">Cancel</button>
              <button type="submit" className="py-1.5 px-4 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-bold shadow cursor-pointer">Log Review</button>
            </div>
          </form>
        </div>
      )}

      {/* Upload Document Modal */}
      {showDocModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in text-xs">
          <form onSubmit={handleSaveDoc} className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl w-full max-w-md p-6 relative shadow-2xl text-left select-none text-xs">
            <button type="button" onClick={() => setShowDocModal(false)} className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer">✕</button>
            <div className="flex items-center gap-2 pb-3 border-b border-[var(--border-color)] mb-4">
              <UploadCloud className="w-5 h-5 text-cyan-400" />
              <h4 className="font-bold text-sm text-[var(--text-primary)] font-display">Upload Document to Vault</h4>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Employee Document Owner</label>
                <select value={newDoc.name} onChange={(e) => setNewDoc({ ...newDoc, name: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none">
                  {employees.map(e => <option key={e.id} value={e.name}>{e.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Document Category Type</label>
                  <select value={newDoc.type} onChange={(e) => setNewDoc({ ...newDoc, type: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none">
                    <option value="Employment Contract">Employment Contract</option>
                    <option value="Passport Scans">Government Scans / Passport</option>
                    <option value="Degree Certificate">Academic Degree Certificate</option>
                    <option value="NDA signed">NDA Document (Signed)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Estimated File Size (MB)</label>
                  <input type="number" step="0.1" placeholder="1.2" value={newDoc.size} onChange={(e) => setNewDoc({ ...newDoc, size: Number(e.target.value) })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none font-mono" required />
                </div>
              </div>
              <div>
                <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Attachment Filename</label>
                <input type="text" placeholder="contract_signed_final.pdf" value={newDoc.filename} onChange={(e) => setNewDoc({ ...newDoc, filename: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none font-mono" required />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-color)] mt-4">
              <button type="button" onClick={() => setShowDocModal(false)} className="py-1.5 px-4 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer">Cancel</button>
              <button type="submit" className="py-1.5 px-4 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-bold shadow cursor-pointer">Upload Document</button>
            </div>
          </form>
        </div>
      )}

      {/* Salary Slip PDF Mock Preview Modal */}
      {showPayslipPreview && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in text-xs font-sans">
          <div className="bg-slate-900 border border-slate-750 rounded-2xl w-full max-w-2xl p-8 relative shadow-2xl text-left select-none text-slate-200">
            <button onClick={() => setShowPayslipPreview(null)} className="absolute top-4 right-4 text-slate-400 hover:text-white cursor-pointer text-base">✕</button>
            
            {/* Payslip PDF Structure */}
            <div className="border border-slate-700 bg-white text-slate-800 p-6 rounded-xl space-y-6">
              {/* Slip Header */}
              <div className="flex justify-between items-start border-b border-slate-200 pb-4">
                <div>
                  <h2 className="font-extrabold text-lg text-cyan-600 tracking-wide">ACME CORPORATION</h2>
                  <p className="text-[10px] text-slate-500 font-medium">100 Tech Venture Pkwy, Silicon Valley, CA</p>
                </div>
                <div className="text-right">
                  <h3 className="font-bold text-xs text-slate-700">OFFICIAL SALARY SLIP</h3>
                  <p className="text-[9px] text-slate-500 font-mono mt-0.5">Pay Period: {showPayslipPreview.period}</p>
                </div>
              </div>

              {/* Employee Particulars */}
              <div className="grid grid-cols-2 gap-4 text-[10px] border-b border-slate-100 pb-4">
                <div>
                  <p className="text-slate-400 font-medium uppercase tracking-wider text-[8px]">Employee Recipient</p>
                  <p className="font-bold text-slate-700 text-xs mt-0.5">{showPayslipPreview.name}</p>
                  <p className="text-slate-500 mt-0.5">System Reference ID: <span className="font-mono text-cyan-600">{showPayslipPreview.id}</span></p>
                </div>
                <div className="text-right">
                  <p className="text-slate-400 font-medium uppercase tracking-wider text-[8px]">Distribution Details</p>
                  <p className="font-bold text-slate-700 text-xs mt-0.5">Paid Bank Remittance</p>
                  <p className="text-slate-500 font-mono mt-0.5">Transfer Date: {showPayslipPreview.paidDate}</p>
                </div>
              </div>

              {/* Earnings & Deductions Tables */}
              <div className="grid grid-cols-2 gap-6 text-[10px]">
                <div>
                  <h4 className="font-bold text-slate-700 uppercase border-b border-slate-200 pb-1 mb-2 tracking-wider text-[9px]">Earnings & Compensation</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between font-mono">
                      <span className="text-slate-500">Base Monthly Salary:</span>
                      <span className="font-bold text-slate-700">${(showPayslipPreview.net * 0.95).toFixed(0)}</span>
                    </div>
                    <div className="flex justify-between font-mono text-emerald-600">
                      <span>Allowance claims:</span>
                      <span className="font-bold">+${(showPayslipPreview.net * 0.15).toFixed(0)}</span>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="font-bold text-slate-700 uppercase border-b border-slate-200 pb-1 mb-2 tracking-wider text-[9px]">Deductions & Statutory</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between font-mono text-rose-500">
                      <span>Statutory Deductions (10%):</span>
                      <span className="font-bold">-${(showPayslipPreview.net * 0.1).toFixed(0)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Net Salary Calculation Summary */}
              <div className="bg-cyan-50/50 border border-cyan-100 rounded-xl p-4 flex justify-between items-center text-slate-800">
                <div>
                  <p className="font-bold text-xs uppercase text-cyan-800 tracking-wider text-[9px]">Net Payable Amount</p>
                  <p className="text-[9px] text-slate-500 mt-0.5">Calculated Net wages distributed to registered employee bank account</p>
                </div>
                <p className="text-2xl font-black text-cyan-600 font-mono">${showPayslipPreview.net.toLocaleString()}</p>
              </div>
            </div>

            {/* Slip Footer Actions */}
            <div className="flex justify-end gap-3 pt-6">
              <button onClick={() => setShowPayslipPreview(null)} className="py-1.5 px-4 bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded-lg text-xs font-bold text-slate-300 hover:text-white cursor-pointer">Close Preview</button>
              <button onClick={() => { showToast('Dispatched PDF download request successfully!', 'success'); setShowPayslipPreview(null); }} className="py-1.5 px-4 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-bold shadow flex items-center gap-1.5 cursor-pointer">
                <Download className="w-3.5 h-3.5" /> Download Payslip PDF
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default HumanResources;
