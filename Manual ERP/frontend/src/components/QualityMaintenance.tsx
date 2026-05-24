import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, Wrench, AlertOctagon, FileText, 
  Settings, BarChart3, Plus, Search, Filter, Download, 
  ArrowUpRight, Clock, Box, ShieldAlert, ArrowDownRight, MoreHorizontal,
  AlertTriangle, Calendar, Layers, Activity, UserCheck, Shield
} from 'lucide-react';

interface Props {
  activeTab?: string;
  user: any;
  token?: string;
  backendUrl?: string;
}

const QualityMaintenance: React.FC<Props> = ({ user: _user, activeTab, token, backendUrl }) => {
  const mapping: Record<string, string> = {
    'QUALITY_INSPECTION': 'inspections',
    'QUALITY_DEFECTS': 'defects',
    'QUALITY_CAPA': 'capa',
    'QUALITY_AUDIT': 'audit',
    'QUALITY_TESTING': 'testing',
    'QUALITY_REPORTS': 'reports',
    'MAINTENANCE_PREVENTIVE': 'preventive',
    'MAINTENANCE_BREAKDOWN': 'breakdown',
    'MAINTENANCE_SCHEDULES': 'schedules',
    'MAINTENANCE_SPARES': 'spares',
    'MAINTENANCE_TECHNICIAN': 'technician',
    'MAINTENANCE_HISTORY': 'history'
  };

  const currentTab = (activeTab && mapping[activeTab]) ? mapping[activeTab] : 'dashboard';
  const [searchQuery, setSearchQuery] = useState('');

  // Interactive UI Modal States
  const [showInspectionModal, setShowInspectionModal] = useState(false);
  const [showDefectModal, setShowDefectModal] = useState(false);
  const [showCapaModal, setShowCapaModal] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [showTestingModal, setShowTestingModal] = useState(false);
  const [showBreakdownModal, setShowBreakdownModal] = useState(false);
  const [showSparesModal, setShowSparesModal] = useState(false);

  // Forms States
  const [newInspection, setNewInspection] = useState({ item: '', batch: '', inspector: '', status: 'Passed' });
  const [newDefect, setNewDefect] = useState({ refId: '', item: '', issue: '', severity: 'High', status: 'Open' });
  const [newCapa, setNewCapa] = useState({ defectRef: '', rootCause: '', correction: '', prevention: '', assignee: '' });
  const [newAudit, setNewAudit] = useState({ standard: 'ISO 9001:2015 QMS', type: 'Internal Audit', auditor: '', date: '' });
  const [newTesting, setNewTesting] = useState({ item: '', parameter: '', targetValue: '', actualValue: '', status: 'Pass' });
  const [newBreakdown, setNewBreakdown] = useState({ machine: '', description: '', reportedBy: '', priority: 'Critical', technician: '' });
  const [selectedSpare, setSelectedSpare] = useState({ id: '', dispatchQty: 1, linkedOrder: '' });
  const [selectedReportBatch, setSelectedReportBatch] = useState<string>('INSP-4022');

  // Toast notifications trigger
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'warning' } | null>(null);
  const showToast = (message: string, type: 'success' | 'warning' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // --- DUMMY DATABASES ---
  const [dashboardStats, setDashboardStats] = useState([
    { title: 'Floor Pass Rate', val: '94.5%', desc: '+1.2% vs last month', icon: ShieldCheck, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { title: 'Pending Inspections', val: '18 runs', desc: '-5 runs since yesterday', icon: Clock, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
    { title: 'Active Defects Logged', val: '7 critical', desc: 'Require CAPA review', icon: ShieldAlert, color: 'text-rose-500', bg: 'bg-rose-500/10' },
    { title: 'Active Machinery Down', val: '1 machine', desc: 'Tech dispatched CNC-01', icon: Wrench, color: 'text-amber-500', bg: 'bg-amber-500/10' }
  ]);

  const [inspections, setInspections] = useState([
    { id: 'INSP-4022', item: 'Electric Motor V2', batch: 'B-0012', inspector: 'John Smith', status: 'Passed', date: 'May 20, 2026' },
    { id: 'INSP-4023', item: 'Lithium Battery Pack', batch: 'B-0015', inspector: 'Alice Wong', status: 'Failed', date: 'May 21, 2026' },
    { id: 'INSP-4024', item: 'Steel Casing A1', batch: 'B-0018', inspector: 'Mike Jones', status: 'Pending', date: 'May 22, 2026' },
    { id: 'INSP-4025', item: 'Copper Wire Spool', batch: 'B-0005', inspector: 'Sarah Miller', status: 'Passed', date: 'May 19, 2026' }
  ]);

  const [defectsData, setDefectsData] = useState([
    { id: 'DEF-901', refId: 'INSP-4023', item: 'Lithium Battery Pack', issue: 'Voltage irregularity under heat stress test', severity: 'High', status: 'Open' },
    { id: 'DEF-902', refId: 'INSP-3998', item: 'Electric Motor V1', issue: 'Steel housing structural trim hairline scratch', severity: 'Low', status: 'Resolved' },
    { id: 'DEF-903', refId: 'PROD-1024', item: 'Electric Motor V2', issue: 'Missing bearing core ring assembly', severity: 'Critical', status: 'Under Review' }
  ]);

  const [capaData, setCapaData] = useState([
    { id: 'CAPA-701', defectRef: 'DEF-901', rootCause: 'Dendrite growth in lithium cells during high stress thermal cycles', correction: 'Recall and test batch cell chemistry standards', prevention: 'Implement cell chemistry thermal tests in factory', assignee: 'Dr. Bruce Banner', status: 'Investigation' },
    { id: 'CAPA-702', defectRef: 'DEF-903', rootCause: 'Feeder arm misalignment on assembly robot arm ROB-02', correction: 'Recalibrate assembler robot', prevention: 'Increase weekly calibration inspections checklists', assignee: 'Tony Stark', status: 'Action Taken' }
  ]);

  const [audits, setAudits] = useState([
    { id: 'AUD-501', standard: 'ISO 9001:2015 QMS', type: 'External Surveillance', auditor: 'Lloyds Register', date: 'Jun 12, 2026', status: 'Scheduled' },
    { id: 'AUD-502', standard: 'ISO 14001:2015 EMS', type: 'Internal Environmental Audit', auditor: 'Sarah Connor', date: 'Today', status: 'In Progress' }
  ]);

  const [testingRuns, setTestingRuns] = useState([
    { id: 'TST-801', item: 'Electric Motor V2', parameter: 'Stress Temp Heat Output', targetValue: '<65°C under high torque', actualValue: '61.2°C', status: 'Pass', date: 'May 20, 2026' },
    { id: 'TST-802', item: 'Lithium Battery Pack', parameter: 'Stress Voltage Cycle Life', targetValue: '>500 cycles @ 10C', actualValue: '482 cycles (decay warning)', status: 'Fail', date: 'May 21, 2026' }
  ]);

  const [preventiveData, setPreventiveData] = useState([
    { id: 'PM-202', machine: 'CNC Milling A', type: 'Calibration', assignedTo: 'Tech Team Alpha', nextDue: 'May 28, 2026', status: 'Scheduled' },
    { id: 'PM-203', machine: 'Assembly Line 1', type: 'Lubrication', assignedTo: 'Maintenance Team', nextDue: 'May 15, 2026', status: 'Overdue' },
    { id: 'PM-204', machine: 'Testing Station', type: 'Sensor Check', assignedTo: 'Tech Team Beta', nextDue: 'Jun 10, 2026', status: 'Planned' }
  ]);

  const [breakdownLogs, setBreakdownLogs] = useState([
    { id: 'BD-101', machine: 'CNC Milling A', description: 'Hydraulic pressure drop and oil leakage', reportedBy: 'Bob Wilson', priority: 'Critical', technician: 'Alice Cooper', status: 'Repairing', downtime: '3.5 hrs' },
    { id: 'BD-102', machine: 'Wave Solderer', description: 'Thermal relay trip on soldering iron', reportedBy: 'John Doe', priority: 'High', technician: 'Charlie Ward', status: 'Resolved', downtime: '1.2 hrs' }
  ]);

  const [schedulesData, setSchedulesData] = useState([
    { id: 'SCH-88', shift: 'Morning', team: 'Maintenance A', task: 'Routine calibration check', date: 'Today', status: 'In Progress' },
    { id: 'SCH-89', shift: 'Evening', team: 'Maintenance B', task: 'Floor exhaust filter replacement', date: 'Tomorrow', status: 'Scheduled' }
  ]);

  const [spareParts, setSpareParts] = useState([
    { id: 'SPR-301', name: 'Precision CNC Drillbits 4mm', category: 'Tooling', stock: 12, minQty: 5, unitCost: 45.00, status: 'In Stock' },
    { id: 'SPR-302', name: 'High-Temp Wave Solder Tips', category: 'Soldering', stock: 3, minQty: 10, unitCost: 15.00, status: 'Reorder Alert' },
    { id: 'SPR-303', name: 'Lithium BMS chips v2', category: 'Electronics', stock: 45, minQty: 15, unitCost: 8.50, status: 'In Stock' }
  ]);

  const [technicians, setTechnicians] = useState([
    { name: 'Alice Cooper', role: 'Lead Mechanical Technician', activeTask: 'PM-202 Calibration', uptimeRecord: '99.2%', status: 'Busy' },
    { name: 'Tony Stark', role: 'Automation Specialist', activeTask: 'CAPA-702 Calibrations', uptimeRecord: '99.9%', status: 'Busy' },
    { name: 'Charlie Ward', role: 'Electrical System Repairer', activeTask: 'None', uptimeRecord: '97.8%', status: 'Available' }
  ]);

  const [maintenanceHistory, setMaintenanceHistory] = useState([
    { id: 'HIST-501', machine: 'Precision CNC Molder', action: 'Complete spindle replacement', cost: 1200, resolvedDate: 'May 10, 2026', technician: 'Alice Cooper' },
    { id: 'HIST-502', machine: 'Wave Solderer', action: 'Core thermostat element replacement', cost: 250, resolvedDate: 'May 14, 2026', technician: 'Charlie Ward' }
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
      console.error(`[Quality API Error] ${endpoint}:`, err);
      return null;
    }
  };

  useEffect(() => {
    if (!token || !backendUrl) return;

    const loadData = async () => {
      try {
        const dbInspections = await apiRequest('/api/store/qms_inspections');
        if (dbInspections && dbInspections.length > 0) setInspections(dbInspections);
        else await apiRequest('/api/store/qms_inspections/bulk', 'POST', inspections);

        const dbDefects = await apiRequest('/api/store/qms_defects');
        if (dbDefects && dbDefects.length > 0) setDefectsData(dbDefects);
        else await apiRequest('/api/store/qms_defects/bulk', 'POST', defectsData);

        const dbCapa = await apiRequest('/api/store/qms_capa');
        if (dbCapa && dbCapa.length > 0) setCapaData(dbCapa);
        else await apiRequest('/api/store/qms_capa/bulk', 'POST', capaData);

        const dbAudits = await apiRequest('/api/store/qms_audits');
        if (dbAudits && dbAudits.length > 0) setAudits(dbAudits);
        else await apiRequest('/api/store/qms_audits/bulk', 'POST', audits);

        const dbTesting = await apiRequest('/api/store/qms_testing');
        if (dbTesting && dbTesting.length > 0) setTestingRuns(dbTesting);
        else await apiRequest('/api/store/qms_testing/bulk', 'POST', testingRuns);

        const dbPreventive = await apiRequest('/api/store/qms_preventive');
        if (dbPreventive && dbPreventive.length > 0) setPreventiveData(dbPreventive);
        else await apiRequest('/api/store/qms_preventive/bulk', 'POST', preventiveData);

        const dbBreakdowns = await apiRequest('/api/store/qms_breakdowns');
        if (dbBreakdowns && dbBreakdowns.length > 0) setBreakdownLogs(dbBreakdowns);
        else await apiRequest('/api/store/qms_breakdowns/bulk', 'POST', breakdownLogs);

        const dbSchedules = await apiRequest('/api/store/qms_schedules');
        if (dbSchedules && dbSchedules.length > 0) setSchedulesData(dbSchedules);
        else await apiRequest('/api/store/qms_schedules/bulk', 'POST', schedulesData);

        const dbSpares = await apiRequest('/api/store/qms_spares');
        if (dbSpares && dbSpares.length > 0) setSpareParts(dbSpares);
        else await apiRequest('/api/store/qms_spares/bulk', 'POST', spareParts);

        const dbTechs = await apiRequest('/api/store/qms_technicians');
        if (dbTechs && dbTechs.length > 0) setTechnicians(dbTechs);
        else await apiRequest('/api/store/qms_technicians/bulk', 'POST', technicians);

        const dbHistory = await apiRequest('/api/store/qms_history');
        if (dbHistory && dbHistory.length > 0) setMaintenanceHistory(dbHistory);
        else await apiRequest('/api/store/qms_history/bulk', 'POST', maintenanceHistory);

        setIsLoaded(true);
      } catch (err) {
        console.error('Error loading Quality data from backend:', err);
        setIsLoaded(true);
      }
    };

    loadData();
  }, [token, backendUrl]);

  // Synchronizers to write state changes to the SQLite database
  useEffect(() => {
    if (!isLoaded || !token || !backendUrl) return;
    apiRequest('/api/store/qms_inspections/bulk', 'POST', inspections);
  }, [inspections, isLoaded, token, backendUrl]);

  useEffect(() => {
    if (!isLoaded || !token || !backendUrl) return;
    apiRequest('/api/store/qms_defects/bulk', 'POST', defectsData);
  }, [defectsData, isLoaded, token, backendUrl]);

  useEffect(() => {
    if (!isLoaded || !token || !backendUrl) return;
    apiRequest('/api/store/qms_capa/bulk', 'POST', capaData);
  }, [capaData, isLoaded, token, backendUrl]);

  useEffect(() => {
    if (!isLoaded || !token || !backendUrl) return;
    apiRequest('/api/store/qms_audits/bulk', 'POST', audits);
  }, [audits, isLoaded, token, backendUrl]);

  useEffect(() => {
    if (!isLoaded || !token || !backendUrl) return;
    apiRequest('/api/store/qms_testing/bulk', 'POST', testingRuns);
  }, [testingRuns, isLoaded, token, backendUrl]);

  useEffect(() => {
    if (!isLoaded || !token || !backendUrl) return;
    apiRequest('/api/store/qms_preventive/bulk', 'POST', preventiveData);
  }, [preventiveData, isLoaded, token, backendUrl]);

  useEffect(() => {
    if (!isLoaded || !token || !backendUrl) return;
    apiRequest('/api/store/qms_breakdowns/bulk', 'POST', breakdownLogs);
  }, [breakdownLogs, isLoaded, token, backendUrl]);

  useEffect(() => {
    if (!isLoaded || !token || !backendUrl) return;
    apiRequest('/api/store/qms_schedules/bulk', 'POST', schedulesData);
  }, [schedulesData, isLoaded, token, backendUrl]);

  useEffect(() => {
    if (!isLoaded || !token || !backendUrl) return;
    apiRequest('/api/store/qms_spares/bulk', 'POST', spareParts);
  }, [spareParts, isLoaded, token, backendUrl]);

  useEffect(() => {
    if (!isLoaded || !token || !backendUrl) return;
    apiRequest('/api/store/qms_technicians/bulk', 'POST', technicians);
  }, [technicians, isLoaded, token, backendUrl]);

  useEffect(() => {
    if (!isLoaded || !token || !backendUrl) return;
    apiRequest('/api/store/qms_history/bulk', 'POST', maintenanceHistory);
  }, [maintenanceHistory, isLoaded, token, backendUrl]);

  // --- ACTIONS HANDLERS ---
  const handleSaveInspection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInspection.item || !newInspection.batch) {
      showToast('Please fill out item and batch details', 'warning');
      return;
    }
    const nextId = `INSP-${4022 + inspections.length}`;
    const newInspObj = {
      id: nextId,
      item: newInspection.item,
      batch: newInspection.batch,
      inspector: newInspection.inspector || 'Anonymous Auditor',
      status: newInspection.status,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    };
    setInspections([newInspObj, ...inspections]);

    // If failed, automatically trigger a Defect Log in state!
    if (newInspection.status === 'Failed') {
      const defId = `DEF-${901 + defectsData.length}`;
      const autoDef = {
        id: defId,
        refId: nextId,
        item: newInspection.item,
        issue: 'Aesthetic finish or core functionality spec check failure during QC inspection',
        severity: 'High' as const,
        status: 'Open'
      };
      setDefectsData(prev => [autoDef, ...prev]);

      // Update Defects KPI
      setDashboardStats(prev => {
        const copy = [...prev];
        const currDef = parseInt(copy[2].val.split(' ')[0]);
        copy[2] = { ...copy[2], val: `${currDef + 1} critical` };
        return copy;
      });
    }

    showToast(`Inspection ${nextId} completed successfully!`, 'success');
    setShowInspectionModal(false);
    setNewInspection({ item: '', batch: '', inspector: '', status: 'Passed' });
  };

  const handleSaveDefect = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDefect.item || !newDefect.issue) {
      showToast('Please specify a target item and issue description', 'warning');
      return;
    }
    const nextId = `DEF-${901 + defectsData.length}`;
    const newDefObj = {
      id: nextId,
      refId: newDefect.refId || 'INSP-N/A',
      item: newDefect.item,
      issue: newDefect.issue,
      severity: newDefect.severity,
      status: newDefect.status
    };
    setDefectsData([newDefObj, ...defectsData]);

    // Update Defects KPI
    setDashboardStats(prev => {
      const copy = [...prev];
      const currDef = parseInt(copy[2].val.split(' ')[0]);
      copy[2] = { ...copy[2], val: `${currDef + 1} critical` };
      return copy;
    });

    showToast(`Defect ${nextId} logged in QA Registry`, 'success');
    setShowDefectModal(false);
    setNewDefect({ refId: '', item: '', issue: '', severity: 'High', status: 'Open' });
  };

  const handleSaveCapa = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCapa.defectRef || !newCapa.rootCause || !newCapa.correction) {
      showToast('Please specify source Defect ID, root-cause and preventive steps', 'warning');
      return;
    }
    const nextId = `CAPA-${701 + capaData.length}`;
    const newCapaObj = {
      id: nextId,
      defectRef: newCapa.defectRef,
      rootCause: newCapa.rootCause,
      correction: newCapa.correction,
      prevention: newCapa.prevention || 'Establish routine calibrations check',
      assignee: newCapa.assignee || 'Unassigned Technologist',
      status: 'Investigation'
    };
    setCapaData([newCapaObj, ...capaData]);

    // Update associated defect status to "Resolved" or "Under Review"
    setDefectsData(prev => prev.map(d => d.id === newCapa.defectRef ? { ...d, status: 'Under Review' } : d));

    showToast(`CAPA Workflow ${nextId} initiated! linked to ${newCapa.defectRef}`, 'success');
    setShowCapaModal(false);
    setNewCapa({ defectRef: '', rootCause: '', correction: '', prevention: '', assignee: '' });
  };

  const handleSaveAudit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAudit.auditor || !newAudit.date) {
      showToast('Please specify assigned auditor and audit date', 'warning');
      return;
    }
    const nextId = `AUD-${501 + audits.length}`;
    const newAuditObj = {
      id: nextId,
      standard: newAudit.standard,
      type: newAudit.type,
      auditor: newAudit.auditor,
      date: newAudit.date,
      status: 'Scheduled'
    };
    setAudits([newAuditObj, ...audits]);
    showToast(`Quality audit ${nextId} queued in standard calendar`, 'success');
    setShowAuditModal(false);
    setNewAudit({ standard: 'ISO 9001:2015 QMS', type: 'Internal Audit', auditor: '', date: '' });
  };

  const handleSaveTesting = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTesting.item || !newTesting.parameter || !newTesting.actualValue) {
      showToast('Please fill out testing item, parameter, and actual value metrics', 'warning');
      return;
    }
    const nextId = `TST-${801 + testingRuns.length}`;
    const newTestObj = {
      id: nextId,
      item: newTesting.item,
      parameter: newTesting.parameter,
      targetValue: newTesting.targetValue || '>95% yield efficiency',
      actualValue: newTesting.actualValue,
      status: newTesting.status,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    };
    setTestingRuns([newTestObj, ...testingRuns]);

    // Update pass rate KPI if failed
    if (newTesting.status === 'Fail') {
      setDashboardStats(prev => {
        const copy = [...prev];
        const curRate = parseFloat(copy[0].val.replace('%', ''));
        copy[0] = { ...copy[0], val: `${(curRate - 0.4).toFixed(1)}%` };
        return copy;
      });
    }

    showToast(`Test ${nextId} completed under ${newTesting.status} status`, 'success');
    setShowTestingModal(false);
    setNewTesting({ item: '', parameter: '', targetValue: '', actualValue: '', status: 'Pass' });
  };

  const handleSaveBreakdown = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBreakdown.machine || !newBreakdown.description) {
      showToast('Please specify down machine and failure particulars', 'warning');
      return;
    }
    const nextId = `BD-${101 + breakdownLogs.length}`;
    const assignedTech = newBreakdown.technician || 'Alice Cooper';
    const newBdObj = {
      id: nextId,
      machine: newBreakdown.machine,
      description: newBreakdown.description,
      reportedBy: newBreakdown.reportedBy || 'Floor Supervisor',
      priority: newBreakdown.priority,
      technician: assignedTech,
      status: 'Repairing',
      downtime: '0.0 hrs'
    };
    setBreakdownLogs([newBdObj, ...breakdownLogs]);

    // Automatically mark the technician as "Busy"
    setTechnicians(prev => prev.map(t => t.name === assignedTech ? { ...t, status: 'Busy', activeTask: `${nextId} Repairs` } : t));

    // Update KPI Down Machine
    setDashboardStats(prev => {
      const copy = [...prev];
      const downCount = parseInt(copy[3].val.split(' ')[0]);
      copy[3] = { ...copy[3], val: `${downCount + 1} machines`, desc: `Tech dispatched ${newBreakdown.machine}` };
      return copy;
    });

    showToast(`Breakdown logged ${nextId}! Tech ${assignedTech} dispatched.`, 'warning');
    setShowBreakdownModal(false);
    setNewBreakdown({ machine: '', description: '', reportedBy: '', priority: 'Critical', technician: '' });
  };

  const handleSaveSpareRelease = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSpare.id || !selectedSpare.dispatchQty) {
      showToast('Please select spare part SKU and dispatch quantity amount', 'warning');
      return;
    }

    setSpareParts(prev => prev.map(p => {
      if (p.id === selectedSpare.id) {
        const nextStock = p.stock - selectedSpare.dispatchQty;
        const nextStatus = nextStock <= p.minQty ? 'Reorder Alert' : 'In Stock';
        showToast(`Dispatched ${selectedSpare.dispatchQty} pcs of ${p.name}`, nextStock <= p.minQty ? 'warning' : 'success');
        return { ...p, stock: nextStock, status: nextStatus };
      }
      return p;
    }));
    setShowSparesModal(false);
    setSelectedSpare({ id: '', dispatchQty: 1, linkedOrder: '' });
  };

  const handleResolveBreakdown = (breakdownId: string) => {
    setBreakdownLogs(prev => prev.map(b => {
      if (b.id === breakdownId) {
        showToast(`Downtime breakdown ${breakdownId} resolved. Machinery operational!`, 'success');
        
        // Log into historical registers!
        const nextHistId = `HIST-${501 + maintenanceHistory.length}`;
        const autoHistObj = {
          id: nextHistId,
          machine: b.machine,
          action: `Repaired machine: ${b.description}`,
          cost: 150 + Math.ceil(Math.random() * 400),
          resolvedDate: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          technician: b.technician
        };
        setMaintenanceHistory(prevHist => [autoHistObj, ...prevHist]);

        // Release technician availability in state
        setTechnicians(prevTech => prevTech.map(t => t.name === b.technician ? { ...t, status: 'Available', activeTask: 'None' } : t));

        // Decrease active down machines KPI
        setDashboardStats(prevStats => {
          const copy = [...prevStats];
          const downCount = parseInt(copy[3].val.split(' ')[0]);
          copy[3] = { ...copy[3], val: `${Math.max(downCount - 1, 0)} machines`, desc: 'All machines operational' };
          return copy;
        });

        return { ...b, status: 'Resolved', downtime: '2.4 hrs' };
      }
      return b;
    }));
  };

  // --- RENDER HELPERS ---
  const renderDashboard = () => (
    <div className="space-y-6 animate-fade-in p-2 text-left">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
        {dashboardStats.map((stat, idx) => (
          <div key={idx} className="bg-[var(--bg-secondary)] border border-[var(--border-color)] p-4 rounded-xl flex items-center justify-between shadow-sm">
            <div>
              <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider">{stat.title}</p>
              <h3 className="text-base font-black text-[var(--text-primary)] font-display mt-0.5">{stat.val}</h3>
              <div className="text-[10px] mt-2 font-semibold text-[var(--text-muted)]">
                {stat.desc}
              </div>
            </div>
            <div className="w-11 h-11 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/10">
              <stat.icon className="w-5 h-5 text-indigo-500" />
            </div>
          </div>
        ))}
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl p-5">
          <h4 className="font-bold text-xs text-[var(--text-primary)] mb-4 font-display">Quality Control inspections</h4>
          <div className="space-y-3">
            {inspections.slice(0, 4).map(insp => (
              <div key={insp.id} className="flex justify-between items-center p-3 bg-[var(--bg-primary)]/40 rounded-xl border border-[var(--border-color)] text-xs">
                <div>
                  <p className="font-bold text-[var(--text-primary)]">{insp.item}</p>
                  <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{insp.id} • Batch: {insp.batch} • {insp.date}</p>
                </div>
                <div>
                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold border uppercase tracking-wider ${
                    insp.status === 'Passed' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                    insp.status === 'Failed' ? 'bg-red-500/10 border-red-500/20 text-red-400' :
                    'bg-amber-500/10 border-amber-500/20 text-amber-500 animate-pulse'
                  }`}>{insp.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl p-5">
          <h4 className="font-bold text-xs text-[var(--text-primary)] mb-4 font-display">Active Breakdown Alerts</h4>
          <div className="space-y-3">
            {breakdownLogs.filter(b => b.status === 'Repairing').map(bd => (
              <div key={bd.id} className="flex justify-between items-center p-3 bg-[var(--bg-primary)]/40 rounded-xl border border-[var(--border-color)] text-xs">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-red-500/10 text-red-500">
                    <AlertOctagon className="w-4 h-4"/>
                  </div>
                  <div>
                    <p className="font-bold text-[var(--text-primary)]">{bd.machine}</p>
                    <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{bd.description}</p>
                  </div>
                </div>
                <div className="text-right flex flex-col items-end gap-1.5">
                  <span className="px-2 py-0.5 bg-red-500/10 text-red-400 border border-red-500/20 text-[9px] font-bold rounded uppercase animate-pulse">{bd.priority}</span>
                  <button 
                    onClick={() => handleResolveBreakdown(bd.id)}
                    className="px-2 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded font-bold cursor-pointer text-[9px]"
                  >
                    Mark Fixed
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderTable = (headers: string[], data: any[], renderRow: (item: any, i: number) => React.ReactNode) => {
    const filteredData = data.filter(item => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return Object.values(item).some(val => 
        val && String(val).toLowerCase().includes(query)
      );
    });

    return (
      <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-color)] overflow-hidden flex flex-col h-full animate-fade-in m-2">
        <div className="p-4 border-b border-[var(--border-color)] flex justify-between items-center bg-[var(--bg-tertiary)]/30">
          <div className="relative w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input 
              type="text" 
              placeholder="Search records..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg pl-9 pr-4 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-indigo-500 transition-colors"
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

  return (
    <div className="max-w-7xl mx-auto select-none animate-fade-in flex flex-col h-[calc(100vh-80px)] p-4 text-left relative">
      {/* Toast Alert */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl border flex items-center gap-2 shadow-2xl backdrop-blur-md animate-scale-up ${
          toast.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' :
          'bg-amber-500/10 border-amber-500/30 text-amber-400'
        }`}>
          <ShieldCheck className="w-4 h-4" />
          <span className="text-xs font-semibold">{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center border-b border-[var(--border-color)] pb-4 mb-4 shrink-0">
        <div>
          <h3 className="font-bold text-xl text-[var(--text-primary)] flex items-center gap-2 font-display">
            <ShieldCheck className="w-6 h-6 text-indigo-500" />
            Quality Control & Shop Maintenance
          </h3>
          <p className="text-xs text-[var(--text-secondary)] mt-1">Audit products batch quality, trace defects, execute CAPA root causes, schedule audits, manage spare inventories and breakdown tickets</p>
        </div>
        <div className="flex gap-2">
          {currentTab === 'inspections' && (
            <button 
              onClick={() => setShowInspectionModal(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-all shadow-lg flex items-center gap-2 cursor-pointer animate-scale-up"
            >
              <Plus className="w-4 h-4" /> Log QC Inspection
            </button>
          )}
          {currentTab === 'defects' && (
            <button 
              onClick={() => setShowDefectModal(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-all shadow-lg flex items-center gap-2 cursor-pointer animate-scale-up"
            >
              <Plus className="w-4 h-4" /> Log Defect
            </button>
          )}
          {currentTab === 'capa' && (
            <button 
              onClick={() => setShowCapaModal(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-all shadow-lg flex items-center gap-2 cursor-pointer animate-scale-up"
            >
              <Plus className="w-4 h-4" /> Initiate CAPA Workflow
            </button>
          )}
          {currentTab === 'audit' && (
            <button 
              onClick={() => setShowAuditModal(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-all shadow-lg flex items-center gap-2 cursor-pointer animate-scale-up"
            >
              <Plus className="w-4 h-4" /> Schedule Standards Audit
            </button>
          )}
          {currentTab === 'testing' && (
            <button 
              onClick={() => setShowTestingModal(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-all shadow-lg flex items-center gap-2 cursor-pointer animate-scale-up"
            >
              <Plus className="w-4 h-4" /> Record Test Run
            </button>
          )}
          {currentTab === 'breakdown' && (
            <button 
              onClick={() => setShowBreakdownModal(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-all shadow-lg flex items-center gap-2 cursor-pointer animate-scale-up"
            >
              <Plus className="w-4 h-4" /> Log Machine Breakdown
            </button>
          )}
          {currentTab === 'spares' && (
            <button 
              onClick={() => setShowSparesModal(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-all shadow-lg flex items-center gap-2 cursor-pointer animate-scale-up"
            >
              <Plus className="w-4 h-4" /> Dispatch Spare Parts
            </button>
          )}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden">
        {currentTab === 'dashboard' && renderDashboard()}

        {/* VIEW 1: QUALITY INSPECTIONS */}
        {currentTab === 'inspections' && renderTable(
          ['Inspection ID', 'Product Inspected', 'Source Batch Ref', 'QA Inspector', 'Filing Date', 'QC Verdict'],
          inspections,
          (insp) => (
            <tr key={insp.id} className="hover:bg-[var(--bg-tertiary)]/30 transition-colors text-xs">
              <td className="px-6 py-4 font-mono font-bold text-indigo-400">{insp.id}</td>
              <td className="px-6 py-4 font-bold text-[var(--text-primary)]">
                <div className="flex items-center gap-2">
                  <Box className="w-3.5 h-3.5 text-slate-400" />
                  {insp.item}
                </div>
              </td>
              <td className="px-6 py-4 font-mono font-semibold">{insp.batch}</td>
              <td className="px-6 py-4">{insp.inspector}</td>
              <td className="px-6 py-4 font-mono">{insp.date}</td>
              <td className="px-6 py-4">
                <span className={`px-2 py-0.5 rounded text-[9px] font-bold border uppercase tracking-wider ${
                  insp.status === 'Passed' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                  insp.status === 'Failed' ? 'bg-red-500/10 border-red-500/20 text-red-400' :
                  'bg-amber-500/10 border-amber-500/20 text-amber-500 animate-pulse'
                }`}>{insp.status}</span>
              </td>
              <td className="px-6 py-4 text-right">
                <button className="text-[var(--text-muted)] hover:text-indigo-400 p-1 cursor-pointer"><ArrowUpRight className="w-4 h-4" /></button>
              </td>
            </tr>
          )
        )}

        {/* VIEW 2: DEFECTS TRACKING */}
        {currentTab === 'defects' && renderTable(
          ['Defect ID', 'QC Source Ref', 'Item Name', 'Particular Defect Issue', 'Severity Level', 'Filing Status'],
          defectsData,
          (def) => (
            <tr key={def.id} className="hover:bg-[var(--bg-tertiary)]/30 transition-colors text-xs">
              <td className="px-6 py-4 font-mono font-bold text-red-400">{def.id}</td>
              <td className="px-6 py-4 font-mono text-[var(--text-muted)]">{def.refId}</td>
              <td className="px-6 py-4 font-bold text-[var(--text-primary)]">{def.item}</td>
              <td className="px-6 py-4 max-w-[250px] truncate">{def.issue}</td>
              <td className="px-6 py-4">
                <span className={`px-2 py-0.5 rounded text-[9px] font-bold border uppercase ${
                  def.severity === 'Critical' ? 'bg-red-500/10 border-red-500/20 text-red-400 animate-pulse' :
                  def.severity === 'High' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
                  'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                }`}>{def.severity}</span>
              </td>
              <td className="px-6 py-4">
                <span className={`px-2 py-0.5 rounded text-[9px] font-bold border uppercase ${
                  def.status === 'Resolved' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                  def.status === 'Under Review' ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' :
                  'bg-red-500/10 border-red-500/20 text-red-400 animate-pulse'
                }`}>{def.status}</span>
              </td>
              <td className="px-6 py-4 text-right">
                <div className="flex items-center justify-end gap-2">
                  {def.status === 'Open' && (
                    <button 
                      onClick={() => {
                        setNewCapa({ ...newCapa, defectRef: def.id });
                        setShowCapaModal(true);
                      }}
                      className="px-2 py-0.5 text-indigo-400 hover:text-indigo-300 font-bold border border-indigo-500/25 bg-indigo-500/5 rounded text-[9px] cursor-pointer"
                    >
                      Launch CAPA
                    </button>
                  )}
                  <button className="text-[var(--text-muted)] hover:text-indigo-400 p-1 cursor-pointer"><MoreHorizontal className="w-4 h-4" /></button>
                </div>
              </td>
            </tr>
          )
        )}

        {/* VIEW 3: CAPA REGISTRY */}
        {currentTab === 'capa' && renderTable(
          ['Workflow ID', 'Defect Ref', 'Root Cause Analysis', 'Corrective Action Taken', 'Preventive Controls', 'Assignee Head', 'Process Status'],
          capaData,
          (row, i) => (
            <tr key={i} className="hover:bg-[var(--bg-tertiary)]/30 transition-colors text-xs">
              <td className="px-6 py-4 font-mono font-bold text-indigo-400">{row.id}</td>
              <td className="px-6 py-4 font-mono text-[var(--text-muted)]">{row.defectRef}</td>
              <td className="px-6 py-4 font-medium text-[var(--text-primary)] max-w-[200px] truncate">{row.rootCause}</td>
              <td className="px-6 py-4 max-w-[150px] truncate">{row.correction}</td>
              <td className="px-6 py-4 max-w-[150px] truncate">{row.prevention}</td>
              <td className="px-6 py-4 font-semibold">{row.assignee}</td>
              <td className="px-6 py-4">
                <span className={`px-2 py-0.5 rounded text-[9px] font-bold border uppercase ${
                  row.status === 'Closed' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                  row.status === 'Action Taken' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' :
                  'bg-amber-500/10 border-amber-500/20 text-amber-500 animate-pulse'
                }`}>{row.status}</span>
              </td>
              <td className="px-6 py-4 text-right">
                <div className="flex items-center justify-end gap-1.5">
                  {row.status !== 'Closed' && (
                    <button 
                      onClick={() => setCapaData(prev => prev.map(c => c.id === row.id ? { ...c, status: 'Closed' } : c))}
                      className="px-2 py-0.5 text-emerald-400 hover:text-emerald-300 font-bold border border-emerald-500/25 bg-emerald-500/5 rounded text-[9px] cursor-pointer"
                    >
                      Close Workflow
                    </button>
                  )}
                  <button className="text-[var(--text-muted)] hover:text-indigo-400 p-1 cursor-pointer"><MoreHorizontal className="w-4 h-4" /></button>
                </div>
              </td>
            </tr>
          )
        )}

        {/* VIEW 4: AUDIT SCHEDULING */}
        {currentTab === 'audit' && renderTable(
          ['Audit ID', 'Filing Standards Standard', 'Audit Core Classification', 'Auditor Inspector Team', 'Audit Date Schedule', 'Filing Status'],
          audits,
          (row, i) => (
            <tr key={i} className="hover:bg-[var(--bg-tertiary)]/30 transition-colors text-xs">
              <td className="px-6 py-4 font-mono font-bold text-indigo-400">{row.id}</td>
              <td className="px-6 py-4 font-bold text-[var(--text-primary)]">{row.standard}</td>
              <td className="px-6 py-4">{row.type}</td>
              <td className="px-6 py-4 font-semibold text-[var(--text-secondary)]">{row.auditor}</td>
              <td className="px-6 py-4 font-mono font-semibold">{row.date}</td>
              <td className="px-6 py-4">
                <span className={`px-2 py-0.5 rounded text-[9px] font-bold border uppercase ${
                  row.status === 'Completed' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                  row.status === 'In Progress' ? 'bg-amber-500/10 border-amber-500/20 text-amber-500 animate-pulse' :
                  'bg-indigo-500/10 border-indigo-500/20 text-indigo-400'
                }`}>{row.status}</span>
              </td>
              <td className="px-6 py-4 text-right">
                <div className="flex items-center justify-end gap-2">
                  {row.status === 'Scheduled' && (
                    <button 
                      onClick={() => setAudits(prev => prev.map(a => a.id === row.id ? { ...a, status: 'In Progress' } : a))}
                      className="px-2 py-0.5 text-indigo-400 hover:text-indigo-300 font-bold border border-indigo-500/25 bg-indigo-500/5 rounded text-[9px] cursor-pointer"
                    >
                      Start Audit
                    </button>
                  )}
                  {row.status === 'In Progress' && (
                    <button 
                      onClick={() => setAudits(prev => prev.map(a => a.id === row.id ? { ...a, status: 'Completed' } : a))}
                      className="px-2 py-0.5 text-emerald-400 hover:text-emerald-300 font-bold border border-emerald-500/25 bg-emerald-500/5 rounded text-[9px] cursor-pointer"
                    >
                      Finalize
                    </button>
                  )}
                  <button className="text-[var(--text-muted)] hover:text-indigo-400 p-1 cursor-pointer"><MoreHorizontal className="w-4 h-4" /></button>
                </div>
              </td>
            </tr>
          )
        )}

        {/* VIEW 5: LABORATORY PRODUCT TESTING */}
        {currentTab === 'testing' && renderTable(
          ['Test Run ID', 'Product Item Under Test', 'Inspection Parameter Details', 'Standard Target Value Slabs', 'Actual Value Output', 'Filing Date', 'QC Verdict'],
          testingRuns,
          (row, i) => (
            <tr key={i} className="hover:bg-[var(--bg-tertiary)]/30 transition-colors text-xs">
              <td className="px-6 py-4 font-mono font-bold text-indigo-400">{row.id}</td>
              <td className="px-6 py-4 font-bold text-[var(--text-primary)]">{row.item}</td>
              <td className="px-6 py-4 font-semibold text-[var(--text-secondary)]">{row.parameter}</td>
              <td className="px-6 py-4 font-mono">{row.targetValue}</td>
              <td className="px-6 py-4 font-mono font-bold">{row.actualValue}</td>
              <td className="px-6 py-4 font-mono">{row.date}</td>
              <td className="px-6 py-4">
                <span className={`px-2 py-0.5 rounded text-[9px] font-bold border uppercase ${
                  row.status === 'Pass' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400 animate-pulse'
                }`}>{row.status}</span>
              </td>
              <td className="px-6 py-4 text-right">
                <button className="text-[var(--text-muted)] hover:text-indigo-400 p-1 cursor-pointer"><MoreHorizontal className="w-4 h-4" /></button>
              </td>
            </tr>
          )
        )}

        {/* VIEW 6: COMPLIANCE REPORTS CERTIFICATES */}
        {currentTab === 'reports' && (
          <div className="space-y-6 animate-fade-in text-left p-2 h-full overflow-y-auto text-xs">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              
              {/* Batch Selector */}
              <div className="lg:col-span-2 border border-[var(--border-color)] bg-[var(--bg-tertiary)]/10 rounded-2xl p-4 space-y-4">
                <span className="text-[9px] font-bold text-[var(--text-muted)] tracking-widest uppercase block">Select QA Audited Batch</span>
                <div className="space-y-2">
                  {inspections.map((insp) => (
                    <button
                      key={insp.id}
                      onClick={() => setSelectedReportBatch(insp.id)}
                      className={`w-full p-3 rounded-xl border text-left cursor-pointer transition-all ${
                        selectedReportBatch === insp.id ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400 font-semibold shadow' : 'border-[var(--border-color)] bg-[var(--bg-primary)]/20 hover:bg-[var(--bg-tertiary)]/50 text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      <span className="font-mono text-[9px] font-bold text-indigo-400 block">{insp.id}</span>
                      <span className="text-xs block mt-0.5">{insp.item}</span>
                      <div className="flex justify-between mt-2 text-[10px]">
                        <span>Batch: {insp.batch}</span>
                        <span className={`font-bold ${insp.status === 'Passed' ? 'text-emerald-400' : 'text-rose-400'}`}>{insp.status}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Compliance Certificate preview */}
              <div className="lg:col-span-3 border border-[var(--border-color)] bg-[var(--bg-tertiary)]/20 p-6 rounded-2xl">
                <div className="border border-gray-300 bg-white text-black p-6 rounded-xl space-y-4 font-mono select-none shadow">
                  <div className="border-b border-gray-300 pb-3 text-center space-y-1">
                    <span className="text-xs font-bold font-sans block uppercase tracking-wide">MANUAL QUALITY CONTROL COMPLIANCE</span>
                    <span className="text-[8px] text-gray-500 block">OFFICIAL INSPECTION COMPLIANCE CERTIFICATION</span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-[9px] text-gray-600">
                    <div>
                      <span className="block font-bold">PRODUCT INSPECTED:</span>
                      <p className="mt-0.5">{inspections.find(i => i.id === selectedReportBatch)?.item || 'Electric Motor V2'}</p>
                      <p>Batch Ref: {inspections.find(i => i.id === selectedReportBatch)?.batch}</p>
                    </div>
                    <div className="text-right">
                      <span className="block font-bold font-sans text-indigo-500">QC CERTIFICATE: {selectedReportBatch}</span>
                      <p className="mt-0.5">Auditor Inspector: {inspections.find(i => i.id === selectedReportBatch)?.inspector}</p>
                      <p>Date Certified: {inspections.find(i => i.id === selectedReportBatch)?.date}</p>
                    </div>
                  </div>

                  <div className="border-t border-b border-gray-300 py-4 text-center">
                    <span className={`text-base font-black font-sans tracking-widest ${
                      inspections.find(i => i.id === selectedReportBatch)?.status === 'Passed' ? 'text-emerald-600' : 'text-rose-600'
                    }`}>
                      *** VERDICT: {inspections.find(i => i.id === selectedReportBatch)?.status === 'Passed' ? 'QA COMPLIANCE PASSED' : 'QA AUDIT FAILED'} ***
                    </span>
                    <p className="text-[8px] text-gray-500 mt-2">All materials, structural specs and tolerance checks are verified in compliance with QMS criteria standards.</p>
                  </div>

                  <div className="pt-4 flex justify-between text-[8px] border-t border-gray-300 text-gray-500 font-sans font-bold">
                    <span>AUDITOR: MANUAL QC DEPT</span>
                    <span>OFFICIAL STAMP COMPLIANT</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 7: PREVENTIVE MAINTENANCE SCHEDULES */}
        {currentTab === 'preventive' && renderTable(
          ['PM ID', 'Target Machine', 'Maintenance Classification', 'Assigned Technical Team', 'Next Scheduled Due', 'Schedule Status'],
          preventiveData,
          (pm) => (
            <tr key={pm.id} className="hover:bg-[var(--bg-tertiary)]/30 transition-colors text-xs">
              <td className="px-6 py-4 font-mono font-bold text-indigo-400">{pm.id}</td>
              <td className="px-6 py-4 font-bold text-[var(--text-primary)]">{pm.machine}</td>
              <td className="px-6 py-4">{pm.type}</td>
              <td className="px-6 py-4 font-semibold text-[var(--text-secondary)]">{pm.assignedTo}</td>
              <td className="px-6 py-4 font-mono font-semibold">{pm.nextDue}</td>
              <td className="px-6 py-4">
                <span className={`px-2 py-0.5 rounded text-[9px] font-bold border uppercase ${
                  pm.status === 'Overdue' ? 'bg-red-500/10 border-red-500/20 text-red-400 animate-pulse' :
                  pm.status === 'Scheduled' ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400' :
                  'bg-slate-500/10 border-slate-500/20 text-slate-400'
                }`}>{pm.status}</span>
              </td>
              <td className="px-6 py-4 text-right">
                <div className="flex items-center justify-end gap-2">
                  {pm.status !== 'Completed' && (
                    <button 
                      onClick={() => setPreventiveData(prev => prev.map(p => p.id === pm.id ? { ...p, status: 'Completed' } : p))}
                      className="px-2 py-0.5 text-emerald-400 hover:text-emerald-300 font-bold border border-emerald-500/25 bg-emerald-500/5 rounded text-[9px] cursor-pointer"
                    >
                      Resolve
                    </button>
                  )}
                  <button className="text-[var(--text-muted)] hover:text-indigo-400 p-1 cursor-pointer"><MoreHorizontal className="w-4 h-4" /></button>
                </div>
              </td>
            </tr>
          )
        )}

        {/* VIEW 8: EQUIPMENT BREAKDOWNS LOGS */}
        {currentTab === 'breakdown' && renderTable(
          ['Log ID', 'Down Floor Machinery', 'Failure Details Description', 'Reported Operator', 'Priority Slabs', 'Tech Dispatched', 'downtime Duration', 'Repair status'],
          breakdownLogs,
          (row, i) => (
            <tr key={i} className="hover:bg-[var(--bg-tertiary)]/30 transition-colors text-xs">
              <td className="px-6 py-4 font-mono font-bold text-red-400">{row.id}</td>
              <td className="px-6 py-4 font-bold text-[var(--text-primary)]">
                <div className="flex items-center gap-2">
                  <AlertOctagon className="w-3.5 h-3.5 text-rose-500" />
                  {row.machine}
                </div>
              </td>
              <td className="px-6 py-4 max-w-[200px] truncate">{row.description}</td>
              <td className="px-6 py-4">{row.reportedBy}</td>
              <td className="px-6 py-4">
                <span className={`px-2 py-0.5 rounded text-[9px] font-bold border uppercase ${
                  row.priority === 'Critical' ? 'bg-red-500/10 border-red-500/20 text-red-400 animate-pulse' :
                  row.priority === 'High' ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' :
                  'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                }`}>{row.priority}</span>
              </td>
              <td className="px-6 py-4 font-semibold text-indigo-400">{row.technician}</td>
              <td className="px-6 py-4 font-mono">{row.downtime}</td>
              <td className="px-6 py-4">
                <span className={`px-2 py-0.5 rounded text-[9px] font-bold border uppercase ${
                  row.status === 'Resolved' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                  'bg-red-500/10 border-red-500/20 text-red-400 animate-pulse'
                }`}>{row.status}</span>
              </td>
              <td className="px-6 py-4 text-right">
                <div className="flex items-center justify-end gap-2">
                  {row.status === 'Repairing' && (
                    <button 
                      onClick={() => handleResolveBreakdown(row.id)}
                      className="px-2 py-0.5 text-emerald-400 hover:text-emerald-300 font-bold border border-emerald-500/25 bg-emerald-500/5 rounded text-[9px] cursor-pointer"
                    >
                      Resolve Repair
                    </button>
                  )}
                  <button className="text-[var(--text-muted)] hover:text-indigo-400 p-1 cursor-pointer"><MoreHorizontal className="w-4 h-4" /></button>
                </div>
              </td>
            </tr>
          )
        )}

        {/* VIEW 9: WEEKLY MAINTENANCE SCHEDULES */}
        {currentTab === 'schedules' && renderTable(
          ['Schedule ID', 'Target Shift', 'Technician Team', 'Assigned floor Task', 'Planned Date', 'Status'],
          schedulesData,
          (row, i) => (
            <tr key={i} className="hover:bg-[var(--bg-tertiary)]/30 transition-colors text-xs">
              <td className="px-6 py-4 font-mono font-bold text-indigo-400">{row.id}</td>
              <td className="px-6 py-4 font-bold text-[var(--text-primary)]">{row.shift}</td>
              <td className="px-6 py-4 font-semibold text-[var(--text-secondary)]">{row.team}</td>
              <td className="px-6 py-4">{row.task}</td>
              <td className="px-6 py-4 font-mono font-semibold">{row.date}</td>
              <td className="px-6 py-4">
                <span className={`px-2 py-0.5 rounded text-[9px] font-bold border uppercase ${
                  row.status === 'In Progress' ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400'
                }`}>{row.status}</span>
              </td>
              <td className="px-6 py-4 text-right">
                <button className="text-[var(--text-muted)] hover:text-indigo-400 p-1 cursor-pointer"><MoreHorizontal className="w-4 h-4" /></button>
              </td>
            </tr>
          )
        )}

        {/* VIEW 10: SPARE PARTS STOCK LEDGER */}
        {currentTab === 'spares' && renderTable(
          ['Spare SKU Ref', 'Spare Part Name', 'Category Classification', 'Stock quantity (pcs)', 'Min alert safety Qty', 'Unit cost Particulars', 'Safety Status'],
          spareParts,
          (row, i) => (
            <tr key={i} className="hover:bg-[var(--bg-tertiary)]/30 transition-colors text-xs">
              <td className="px-6 py-4 font-mono font-bold text-indigo-400">{row.id}</td>
              <td className="px-6 py-4 font-bold text-[var(--text-primary)]">{row.name}</td>
              <td className="px-6 py-4 font-semibold text-[var(--text-secondary)]">{row.category}</td>
              <td className="px-6 py-4 font-mono font-bold text-[var(--text-primary)]">{row.stock} pcs</td>
              <td className="px-6 py-4 font-mono">{row.minQty} pcs</td>
              <td className="px-6 py-4 font-mono font-semibold text-emerald-400">${row.unitCost.toFixed(2)}</td>
              <td className="px-6 py-4">
                <span className={`px-2 py-0.5 rounded text-[9px] font-bold border uppercase ${
                  row.status === 'Reorder Alert' ? 'bg-red-500/10 border-red-500/20 text-red-400 animate-pulse' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                }`}>{row.status}</span>
              </td>
              <td className="px-6 py-4 text-right">
                <button className="text-[var(--text-muted)] hover:text-indigo-400 p-1 cursor-pointer"><MoreHorizontal className="w-4 h-4" /></button>
              </td>
            </tr>
          )
        )}

        {/* VIEW 11: TECHNICIAN ASSIGNMENTS ROSTER */}
        {currentTab === 'technician' && renderTable(
          ['Technician Operator Name', 'Technical Role Specialty', 'Current Active Repair Task', 'Historical Uptime Score', 'Availability Status'],
          technicians,
          (row, i) => (
            <tr key={i} className="hover:bg-[var(--bg-tertiary)]/30 transition-colors text-xs">
              <td className="px-6 py-4 font-bold text-[var(--text-primary)]">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                  {row.name}
                </div>
              </td>
              <td className="px-6 py-4 font-medium text-[var(--text-secondary)]">{row.role}</td>
              <td className="px-6 py-4 font-mono font-semibold text-indigo-400">{row.activeTask}</td>
              <td className="px-6 py-4 font-mono font-bold text-emerald-400">{row.uptimeRecord}</td>
              <td className="px-6 py-4">
                <span className={`px-2 py-0.5 rounded text-[9px] font-bold border uppercase ${
                  row.status === 'Available' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-amber-500/10 border-amber-500/20 text-amber-505 animate-pulse'
                }`}>{row.status}</span>
              </td>
              <td className="px-6 py-4 text-right">
                <button className="text-[var(--text-muted)] hover:text-indigo-400 p-1 cursor-pointer"><MoreHorizontal className="w-4 h-4" /></button>
              </td>
            </tr>
          )
        )}

        {/* VIEW 12: HISTORICAL LOGS */}
        {currentTab === 'history' && renderTable(
          ['Job Ref', 'Machine Serviced', 'Maintenance Action Resolving particulars', 'Recorded spare Parts Cost', 'date Resolved', 'Technician Head'],
          maintenanceHistory,
          (row, i) => (
            <tr key={i} className="hover:bg-[var(--bg-tertiary)]/30 transition-colors text-xs">
              <td className="px-6 py-4 font-mono font-bold text-indigo-400">{row.id}</td>
              <td className="px-6 py-4 font-bold text-[var(--text-primary)]">{row.machine}</td>
              <td className="px-6 py-4 italic text-[var(--text-secondary)] max-w-[250px] truncate">{row.action}</td>
              <td className="px-6 py-4 font-mono font-bold text-emerald-400">${row.cost.toLocaleString()}</td>
              <td className="px-6 py-4 font-mono">{row.resolvedDate}</td>
              <td className="px-6 py-4 font-semibold">{row.technician}</td>
              <td className="px-6 py-4 text-right">
                <button className="text-[var(--text-muted)] hover:text-indigo-400 p-1 cursor-pointer"><MoreHorizontal className="w-4 h-4" /></button>
              </td>
            </tr>
          )
        )}

      </div>

      {/* ==========================================
          MODALS CORE DRAWERS
          ========================================== */}

      {/* QC Inspection Modal */}
      {showInspectionModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in text-xs">
          <form onSubmit={handleSaveInspection} className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl w-full max-w-md p-6 relative shadow-2xl text-left select-none text-xs">
            <button type="button" onClick={() => setShowInspectionModal(false)} className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer">✕</button>
            <div className="flex items-center gap-2 pb-3 border-b border-[var(--border-color)] mb-4">
              <Shield className="w-5 h-5 text-indigo-400" />
              <h4 className="font-bold text-sm text-[var(--text-primary)] font-display">Log QC Batch Inspection</h4>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Product Inspected</label>
                <input type="text" placeholder="e.g. Lithium Battery Pack" value={newInspection.item} onChange={(e) => setNewInspection({ ...newInspection, item: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Batch Reference</label>
                  <input type="text" placeholder="e.g. B-0012" value={newInspection.batch} onChange={(e) => setNewInspection({ ...newInspection, batch: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none" required />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Verdict Result</label>
                  <select value={newInspection.status} onChange={(e) => setNewInspection({ ...newInspection, status: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none">
                    <option value="Passed">Compliant (Passed)</option>
                    <option value="Failed">Audited Defect (Failed)</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Assigned QA Tech Inspector</label>
                <input type="text" placeholder="Auditor Name" value={newInspection.inspector} onChange={(e) => setNewInspection({ ...newInspection, inspector: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none" />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-color)] mt-4">
              <button type="button" onClick={() => setShowInspectionModal(false)} className="py-1.5 px-4 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer">Cancel</button>
              <button type="submit" className="py-1.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold shadow cursor-pointer">Save Audit Result</button>
            </div>
          </form>
        </div>
      )}

      {/* Log Defect Modal */}
      {showDefectModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in text-xs">
          <form onSubmit={handleSaveDefect} className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl w-full max-w-md p-6 relative shadow-2xl text-left select-none text-xs">
            <button type="button" onClick={() => setShowDefectModal(false)} className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer">✕</button>
            <div className="flex items-center gap-2 pb-3 border-b border-[var(--border-color)] mb-4">
              <AlertOctagon className="w-5 h-5 text-indigo-400" />
              <h4 className="font-bold text-sm text-[var(--text-primary)] font-display">Log Quality Defect</h4>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Item Product Particulars</label>
                <input type="text" placeholder="e.g. Lithium Battery Pack" value={newDefect.item} onChange={(e) => setNewDefect({ ...newDefect, item: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Source Inspection Ref</label>
                  <input type="text" placeholder="e.g. INSP-4023" value={newDefect.refId} onChange={(e) => setNewDefect({ ...newDefect, refId: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none font-mono" />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Severity Level</label>
                  <select value={newDefect.severity} onChange={(e) => setNewDefect({ ...newDefect, severity: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none">
                    <option value="Low">Low cosmetic risk</option>
                    <option value="High">High functionality alert</option>
                    <option value="Critical">Critical (Halts line)</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Defect Issue Details</label>
                <textarea placeholder="e.g. Voltage irregularity, structural hairline cracks molding fail" value={newDefect.issue} onChange={(e) => setNewDefect({ ...newDefect, issue: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none h-16 resize-none font-sans" required />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-color)] mt-4">
              <button type="button" onClick={() => setShowDefectModal(false)} className="py-1.5 px-4 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer">Cancel</button>
              <button type="submit" className="py-1.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold shadow cursor-pointer">Log Defect SKU</button>
            </div>
          </form>
        </div>
      )}

      {/* CAPA Workflow Modal */}
      {showCapaModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in text-xs">
          <form onSubmit={handleSaveCapa} className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl w-full max-w-md p-6 relative shadow-2xl text-left select-none text-xs">
            <button type="button" onClick={() => setShowCapaModal(false)} className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer">✕</button>
            <div className="flex items-center gap-2 pb-3 border-b border-[var(--border-color)] mb-4">
              <ShieldAlert className="w-5 h-5 text-indigo-400" />
              <h4 className="font-bold text-sm text-[var(--text-primary)] font-display">Initiate Corrective & Preventive Action (CAPA)</h4>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Source Defect ID</label>
                  <input type="text" placeholder="e.g. DEF-901" value={newCapa.defectRef} onChange={(e) => setNewCapa({ ...newCapa, defectRef: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none font-mono" required />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Assignee Lead Specialist</label>
                  <input type="text" placeholder="Specialist Name" value={newCapa.assignee} onChange={(e) => setNewCapa({ ...newCapa, assignee: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none" />
                </div>
              </div>
              <div>
                <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Root Cause Analysis (RCA)</label>
                <textarea placeholder="e.g. Dendrite growth cell insulation thermal cycles spillage" value={newCapa.rootCause} onChange={(e) => setNewCapa({ ...newCapa, rootCause: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none h-12 resize-none font-sans" required />
              </div>
              <div>
                <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Immediate Corrective Actions</label>
                <textarea placeholder="e.g. Recalibrate CNC spindles molding core, recall batch cell" value={newCapa.correction} onChange={(e) => setNewCapa({ ...newCapa, correction: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none h-12 resize-none font-sans" required />
              </div>
              <div>
                <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Preventive Actions / Standard Operating Controls</label>
                <textarea placeholder="e.g. Implement high-stress cycle checks tests weekly in floor" value={newCapa.prevention} onChange={(e) => setNewCapa({ ...newCapa, prevention: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none h-12 resize-none font-sans" />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-color)] mt-4">
              <button type="button" onClick={() => setShowCapaModal(false)} className="py-1.5 px-4 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer">Cancel</button>
              <button type="submit" className="py-1.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold shadow cursor-pointer">Initiate Workflow</button>
            </div>
          </form>
        </div>
      )}

      {/* Schedule Standards Audit Modal */}
      {showAuditModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in text-xs">
          <form onSubmit={handleSaveAudit} className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl w-full max-w-md p-6 relative shadow-2xl text-left select-none text-xs">
            <button type="button" onClick={() => setShowAuditModal(false)} className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer">✕</button>
            <div className="flex items-center gap-2 pb-3 border-b border-[var(--border-color)] mb-4">
              <Calendar className="w-5 h-5 text-indigo-400" />
              <h4 className="font-bold text-sm text-[var(--text-primary)] font-display">Schedule Standards Compliance Audit</h4>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Standard / Certification Target</label>
                <select value={newAudit.standard} onChange={(e) => setNewAudit({ ...newAudit, standard: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none">
                  <option value="ISO 9001:2015 QMS">ISO 9001:2015 Quality Management System</option>
                  <option value="ISO 14001:2015 EMS">ISO 14001:2015 Environmental System</option>
                  <option value="ISO 45001:2018 OHS">ISO 45001:2018 Safety & Health System</option>
                </select>
              </div>
              <div>
                <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Audit Classification Type</label>
                <select value={newAudit.type} onChange={(e) => setNewAudit({ ...newAudit, type: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none">
                  <option value="Internal Audit">Internal Surveillance Audit</option>
                  <option value="External Surveillance">External Certification Audit</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Assigned Auditor Head</label>
                  <input type="text" placeholder="Auditor Name" value={newAudit.auditor} onChange={(e) => setNewAudit({ ...newAudit, auditor: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none" required />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Scheduled Date</label>
                  <input type="date" value={newAudit.date} onChange={(e) => setNewAudit({ ...newAudit, date: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none" required />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-color)] mt-4">
              <button type="button" onClick={() => setShowAuditModal(false)} className="py-1.5 px-4 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer">Cancel</button>
              <button type="submit" className="py-1.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold shadow cursor-pointer">Queue Audit Event</button>
            </div>
          </form>
        </div>
      )}

      {/* Record Product Stress Test Modal */}
      {showTestingModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in text-xs">
          <form onSubmit={handleSaveTesting} className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl w-full max-w-md p-6 relative shadow-2xl text-left select-none text-xs">
            <button type="button" onClick={() => setShowTestingModal(false)} className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer">✕</button>
            <div className="flex items-center gap-2 pb-3 border-b border-[var(--border-color)] mb-4">
              <Activity className="w-5 h-5 text-indigo-400" />
              <h4 className="font-bold text-sm text-[var(--text-primary)] font-display">Record Product Laboratory stress Test</h4>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Audited Product Item</label>
                <input type="text" placeholder="e.g. Electric Motor V2" value={newTesting.item} onChange={(e) => setNewTesting({ ...newTesting, item: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none" required />
              </div>
              <div>
                <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Inspection Parameter tested</label>
                <input type="text" placeholder="e.g. Core stress temperature heat output" value={newTesting.parameter} onChange={(e) => setNewTesting({ ...newTesting, parameter: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Target Specs Standard Slabs</label>
                  <input type="text" placeholder="e.g. <65°C under torque" value={newTesting.targetValue} onChange={(e) => setNewTesting({ ...newTesting, targetValue: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none" />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Actual Measured Output</label>
                  <input type="text" placeholder="e.g. 61.2°C" value={newTesting.actualValue} onChange={(e) => setNewTesting({ ...newTesting, actualValue: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none font-mono" required />
                </div>
              </div>
              <div>
                <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Inspection Result Verdict</label>
                <select value={newTesting.status} onChange={(e) => setNewTesting({ ...newTesting, status: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none">
                  <option value="Pass">Pass Yield specs</option>
                  <option value="Fail">Fail (Escalates warning)</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-color)] mt-4">
              <button type="button" onClick={() => setShowTestingModal(false)} className="py-1.5 px-4 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer">Cancel</button>
              <button type="submit" className="py-1.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold shadow cursor-pointer">Record Test Result</button>
            </div>
          </form>
        </div>
      )}

      {/* Log Machine Breakdown Modal */}
      {showBreakdownModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in text-xs">
          <form onSubmit={handleSaveBreakdown} className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl w-full max-w-md p-6 relative shadow-2xl text-left select-none text-xs">
            <button type="button" onClick={() => setShowBreakdownModal(false)} className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer">✕</button>
            <div className="flex items-center gap-2 pb-3 border-b border-[var(--border-color)] mb-4">
              <Wrench className="w-5 h-5 text-indigo-400" />
              <h4 className="font-bold text-sm text-[var(--text-primary)] font-display">Log Machinery Breakdown failure</h4>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Down floor Machinery Station</label>
                <input type="text" placeholder="e.g. CNC Milling A, Wave Solderer" value={newBreakdown.machine} onChange={(e) => setNewBreakdown({ ...newBreakdown, machine: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">priority Class</label>
                  <select value={newBreakdown.priority} onChange={(e) => setNewBreakdown({ ...newBreakdown, priority: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none">
                    <option value="Critical">Critical Stop (Severe halt)</option>
                    <option value="High">High warning limit</option>
                    <option value="Low">Low standard servicing</option>
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Dispatched technician</label>
                  <select value={newBreakdown.technician} onChange={(e) => setNewBreakdown({ ...newBreakdown, technician: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none">
                    <option value="">-- Assign Tech Specialist --</option>
                    {technicians.filter(t => t.status === 'Available').map(t => <option key={t.name} value={t.name}>{t.name} ({t.role})</option>)}
                    <option value="Alice Cooper">Alice Cooper (Lead Mechanical)</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Reported Floor Operator</label>
                  <input type="text" placeholder="Supervisor Name" value={newBreakdown.reportedBy} onChange={(e) => setNewBreakdown({ ...newBreakdown, reportedBy: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none" />
                </div>
              </div>
              <div>
                <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Failure Issue description</label>
                <textarea placeholder="e.g. Spindle hydraulic leakage, motor core relay trip" value={newBreakdown.description} onChange={(e) => setNewBreakdown({ ...newBreakdown, description: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none h-16 resize-none font-sans" required />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-color)] mt-4">
              <button type="button" onClick={() => setShowBreakdownModal(false)} className="py-1.5 px-4 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer">Cancel</button>
              <button type="submit" className="py-1.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold shadow cursor-pointer">Dispatch Tech & log</button>
            </div>
          </form>
        </div>
      )}

      {/* Dispatch Spares Modal */}
      {showSparesModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in text-xs">
          <form onSubmit={handleSaveSpareRelease} className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl w-full max-w-md p-6 relative shadow-2xl text-left select-none text-xs">
            <button type="button" onClick={() => setShowSparesModal(false)} className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer">✕</button>
            <div className="flex items-center gap-2 pb-3 border-b border-[var(--border-color)] mb-4">
              <Box className="w-5 h-5 text-indigo-400" />
              <h4 className="font-bold text-sm text-[var(--text-primary)] font-display">Dispatch Maintenance Spare Part</h4>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Select Spare Part SKU</label>
                <select value={selectedSpare.id} onChange={(e) => setSelectedSpare({ ...selectedSpare, id: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none" required>
                  <option value="">-- Choose Spare SKU --</option>
                  {spareParts.map(p => <option key={p.id} value={p.id}>[{p.id}] {p.name} ({p.stock} in stock)</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Dispatch Qty (pcs)</label>
                  <input type="number" min="1" value={selectedSpare.dispatchQty} onChange={(e) => setSelectedSpare({ ...selectedSpare, dispatchQty: Number(e.target.value) })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none" required />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Linked maintenance order / Run ID</label>
                  <input type="text" placeholder="e.g. BD-101, PM-202" value={selectedSpare.linkedOrder} onChange={(e) => setSelectedSpare({ ...selectedSpare, linkedOrder: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none font-mono" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-color)] mt-4">
              <button type="button" onClick={() => setShowSparesModal(false)} className="py-1.5 px-4 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer">Cancel</button>
              <button type="submit" className="py-1.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold shadow cursor-pointer">Issue Spares SKU</button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
};

export default QualityMaintenance;
