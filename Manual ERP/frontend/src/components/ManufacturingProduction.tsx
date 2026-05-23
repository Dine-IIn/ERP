import React, { useState } from 'react';
import { 
  Factory, Settings, Layers, Box, 
  Wrench, Activity, BarChart3, Plus, Search, Filter, Download, 
  ArrowUpRight, Clock, ShieldCheck, CheckCircle2, MoreHorizontal, AlertTriangle,
  Play, Pause, Calendar, Trash2, Cpu, FileText, UserCheck, Percent
} from 'lucide-react';

interface Props {
  activeTab?: string;
  user: any;
}

const ManufacturingProduction: React.FC<Props> = ({ user: _user, activeTab }) => {
  const mapping: Record<string, string> = {
    'MANUFACTURING_BOM': 'bom',
    'MANUFACTURING_ORDERS': 'orders',
    'MANUFACTURING_WORK_ORDERS': 'workorders',
    'MANUFACTURING_PLANNING': 'planning',
    'MANUFACTURING_MATERIAL': 'material',
    'MANUFACTURING_TRACKING': 'tracking',
    'MANUFACTURING_FG': 'fg',
    'MANUFACTURING_MACHINE': 'machine',
    'MANUFACTURING_SHIFT': 'shift',
    'MANUFACTURING_QUALITY': 'quality',
    'MANUFACTURING_COSTING': 'costing',
    'MANUFACTURING_SCRAP': 'scrap'
  };

  const currentTab = (activeTab && mapping[activeTab]) ? mapping[activeTab] : 'dashboard';
  const [searchQuery, setSearchQuery] = useState('');

  // Interactive UI Modal States
  const [showBomModal, setShowBomModal] = useState(false);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showWorkOrderModal, setShowWorkOrderModal] = useState(false);
  const [showConsumptionModal, setShowConsumptionModal] = useState(false);
  const [showMachineModal, setShowMachineModal] = useState(false);
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [showQcModal, setShowQcModal] = useState(false);
  const [showScrapModal, setShowScrapModal] = useState(false);

  // Forms States
  const [newBom, setNewBom] = useState({ item: '', version: 'v1.0', rawMaterials: [{ name: 'Copper Coil', qty: 2, unit: 'kg', cost: 15 }] });
  const [newOrder, setNewOrder] = useState({ item: '', bom: '', qty: 500, status: 'Planned', date: '' });
  const [newWorkOrder, setNewWorkOrder] = useState({ prodOrder: '', operation: '', machine: '', assignedTo: '', status: 'Pending' });
  const [newConsumption, setNewConsumption] = useState({ order: '', component: '', required: '', consumed: '', status: 'On Track' });
  const [selectedMachine, setSelectedMachine] = useState<string>('');
  const [newShift, setNewShift] = useState({ name: '', time: '08:00 AM - 04:00 PM', lineSupervised: '', operators: '' });
  const [newQc, setNewQc] = useState({ prodOrder: '', inspectedQty: 100, passedQty: 95, failedQty: 5, inspector: '', result: 'Pass', tests: { dims: true, elec: true, finish: true } });
  const [newScrap, setNewScrap] = useState({ order: '', component: '', qty: '', reason: 'Off-cut', cost: '' });

  // Interactive Live Telemetry state for shop floor tracking
  const [telemetrySpeed, setTelemetrySpeed] = useState(120);
  const [telemetryTemp, setTelemetryTemp] = useState(42);
  const [telemetryLogs, setTelemetryLogs] = useState<string[]>([
    'Line A functional checks completed',
    'Telemetry links fully synchronized',
    'Sensors logging at 1Hz frequency'
  ]);

  // Production Scheduling capacity slider
  const [capacityLoad, setCapacityLoad] = useState(82);

  // Toast notifications trigger
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'warning' } | null>(null);
  const showToast = (message: string, type: 'success' | 'warning' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // --- DUMMY DATABASES ---
  const [dashboardStats, setDashboardStats] = useState([
    { title: 'Active Floor Runs', val: '12 runs', desc: 'Shop-floor busy status', icon: Activity, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
    { title: 'MTD Units Produced', val: '14,500 pcs', desc: '+15% vs last month', icon: Box, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { title: 'Avg Machine Uptime', val: '98.8%', desc: 'Health index status', icon: Settings, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { title: 'Scrap Waste Cost', val: '$302.25', desc: 'Cumulative waste cost', icon: Trash2, color: 'text-red-500', bg: 'bg-red-500/10' }
  ]);

  const [boms, setBoms] = useState([
    { id: 'BOM-EM2-01', item: 'Electric Motor V2', componentsCount: 14, operationsCount: 5, status: 'Active', version: 'v2.1', totalCost: 165 },
    { id: 'BOM-BAT-05', item: 'Lithium Battery Pack', componentsCount: 42, operationsCount: 8, status: 'Active', version: 'v5.0', totalCost: 325 },
    { id: 'BOM-CW-99', item: 'Copper Wire Spool', componentsCount: 2, operationsCount: 1, status: 'Active', version: 'v1.0', totalCost: 9.35 },
    { id: 'BOM-SC-01', item: 'Steel Casing A1', componentsCount: 5, operationsCount: 3, status: 'Draft', version: 'v0.9', totalCost: 26.40 }
  ]);

  const [productionOrders, setProductionOrders] = useState([
    { id: 'PROD-1024', item: 'Electric Motor V2', bom: 'BOM-EM2-01', qty: 500, status: 'In Progress', progress: 65, date: 'May 20, 2026' },
    { id: 'PROD-1025', item: 'Lithium Battery Pack', bom: 'BOM-BAT-05', qty: 2000, status: 'Planned', progress: 0, date: 'May 24, 2026' },
    { id: 'PROD-1026', item: 'Copper Wire Spool', bom: 'BOM-CW-99', qty: 150, status: 'Completed', progress: 100, date: 'May 18, 2026' },
    { id: 'PROD-1027', item: 'Steel Casing A1', bom: 'BOM-SC-01', qty: 1000, status: 'On Hold', progress: 25, date: 'May 21, 2026' }
  ]);

  const [workOrders, setWorkOrders] = useState([
    { id: 'WO-5051', prodOrder: 'PROD-1024', operation: 'Coil Assembly', machine: 'ROB-02', assignedTo: 'John Doe', status: 'In Progress' },
    { id: 'WO-5052', prodOrder: 'PROD-1024', operation: 'Magnetic Alignment', machine: 'CNC-01', assignedTo: 'Jane Smith', status: 'Pending' },
    { id: 'WO-5053', prodOrder: 'PROD-1027', operation: 'Casing Molding', machine: 'MLD-02', assignedTo: 'Bob Wilson', status: 'Paused' }
  ]);

  const [consumptionLedger, setConsumptionLedger] = useState([
    { id: 'MAT-881', order: 'PROD-1024', component: 'Copper Wire', required: '500 kg', consumed: '320 kg', status: 'On Track' },
    { id: 'MAT-882', order: 'PROD-1024', component: 'Magnets', required: '1000 units', consumed: '650 units', status: 'On Track' },
    { id: 'MAT-883', order: 'PROD-1027', component: 'Steel Sheets', required: '2000 kg', consumed: '500 kg', status: 'Shortage' }
  ]);

  const [machinery, setMachinery] = useState([
    { id: 'CNC-01', name: 'Precision CNC Molder', type: 'Molding', status: 'Active', load: '85%', temp: '42°C', uptime: '99.4%' },
    { id: 'ROB-02', name: 'Automated Arm Assembler', type: 'Assembly', status: 'Active', load: '60%', temp: '38°C', uptime: '98.2%' },
    { id: 'SOL-03', name: 'High-Temp Wave Solderer', type: 'Soldering', status: 'Idle', load: '0%', temp: '210°C', uptime: '97.5%' },
    { id: 'QA-04', name: 'Functional Tester Rig', type: 'Testing', status: 'Active', load: '40%', temp: '32°C', uptime: '99.9%' }
  ]);

  const [shifts, setShifts] = useState([
    { id: 'SHFT-001', name: 'Day Floor Shift', time: '08:00 AM - 04:00 PM', lineSupervised: 'Line A (Motors)', operators: ['John Doe', 'Jane Smith', 'Alice Cooper'] },
    { id: 'SHFT-002', name: 'Swing Floor Shift', time: '04:00 PM - 12:00 AM', lineSupervised: 'Line B (Batteries)', operators: ['Bob Wilson', 'Charlie Ward', 'Daniel Craig'] },
    { id: 'SHFT-003', name: 'Night Guard Shift', time: '12:00 AM - 08:00 AM', lineSupervised: 'Facility Maintenance', operators: ['Edward Norton', 'Frank Castle'] }
  ]);

  const [qcInspections, setQcInspections] = useState([
    { id: 'QC-901', prodOrder: 'PROD-1024', item: 'Electric Motor V2', inspectedQty: 250, passedQty: 247, failedQty: 3, inspector: 'Sarah Connor', result: 'Pass' },
    { id: 'QC-902', prodOrder: 'PROD-1026', item: 'Copper Wire Spool', inspectedQty: 150, passedQty: 150, failedQty: 0, inspector: 'Tony Stark', result: 'Pass' },
    { id: 'QC-903', prodOrder: 'PROD-1027', item: 'Steel Casing A1', inspectedQty: 100, passedQty: 92, failedQty: 8, inspector: 'Bruce Banner', result: 'Fail' }
  ]);

  const [costingDetails, setCostingDetails] = useState([
    { id: 'CST-1024', order: 'PROD-1024', item: 'Electric Motor V2', materialCost: 12500, laborCost: 4200, overhead: 1800, totalCost: 18500, budget: 20000, variance: -1500 },
    { id: 'CST-1026', order: 'PROD-1026', item: 'Copper Wire Spool', materialCost: 3100, laborCost: 500, overhead: 200, totalCost: 3800, budget: 3500, variance: 300 }
  ]);

  const [scrapLogs, setScrapLogs] = useState([
    { id: 'SCRP-01', order: 'PROD-1024', component: 'Copper Wire', qty: '4.5 kg', reason: 'Spillage / Off-cut', cost: '$38.25', date: 'May 20, 2026' },
    { id: 'SCRP-02', order: 'PROD-1027', component: 'Steel Sheet Trim', qty: '12 kg', reason: 'Molding Defect', cost: '$264.00', date: 'May 21, 2026' }
  ]);

  const [finishedGoods, setFinishedGoods] = useState([
    { id: 'FG-8801', prodOrder: 'PROD-1026', item: 'Copper Wire Spool', lotNo: 'LOT-CW-026', receiptedQty: 150, location: 'WH-A / RACK-03', receiptDate: 'May 18, 2026' }
  ]);

  // --- ACTIONS HANDLERS ---
  const handleSaveBom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBom.item) {
      showToast('Please specify a target item name', 'warning');
      return;
    }
    const nextId = `BOM-${newBom.item.split(' ').map(w => w[0]).join('').toUpperCase()}-${10 + boms.length}`;
    const newBomObj = {
      id: nextId,
      item: newBom.item,
      componentsCount: newBom.rawMaterials.length * 3 + 2,
      operationsCount: Math.ceil(Math.random() * 5 + 2),
      status: 'Active',
      version: newBom.version,
      totalCost: newBom.rawMaterials.reduce((acc, item) => acc + (item.qty * item.cost), 0)
    };
    setBoms([newBomObj, ...boms]);
    showToast(`Bill of Materials ${nextId} created successfully`, 'success');
    setShowBomModal(false);
    setNewBom({ item: '', version: 'v1.0', rawMaterials: [{ name: 'Copper Coil', qty: 2, unit: 'kg', cost: 15 }] });
  };

  const handleSaveOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrder.item || !newOrder.bom) {
      showToast('Please fill out item and selected BOM details', 'warning');
      return;
    }
    const nextId = `PROD-${1024 + productionOrders.length}`;
    const newOrderObj = {
      id: nextId,
      item: newOrder.item,
      bom: newOrder.bom,
      qty: Number(newOrder.qty),
      status: newOrder.status,
      progress: newOrder.status === 'In Progress' ? 10 : 0,
      date: newOrder.date || new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    };
    setProductionOrders([newOrderObj, ...productionOrders]);

    // Automatically spawn raw component ledger mapping in state!
    const newMats = [
      { id: `MAT-${880 + consumptionLedger.length + 1}`, order: nextId, component: 'Copper Wire', required: `${Number(newOrder.qty) * 1.2} kg`, consumed: '0 kg', status: 'On Track' },
      { id: `MAT-${880 + consumptionLedger.length + 2}`, order: nextId, component: 'Casing Sheets', required: `${Number(newOrder.qty) * 2} sheets`, consumed: '0 sheets', status: 'On Track' }
    ];
    setConsumptionLedger(prev => [...prev, ...newMats]);

    // Spawns associated first stage work order
    const nextWoId = `WO-${5051 + workOrders.length}`;
    const firstStageWo = {
      id: nextWoId,
      prodOrder: nextId,
      operation: 'Pre-production Setup',
      machine: 'ROB-02',
      assignedTo: 'Unassigned',
      status: 'Pending'
    };
    setWorkOrders(prev => [...prev, firstStageWo]);

    // Update KPI Dashboard
    setDashboardStats(prev => {
      const copy = [...prev];
      if (newOrder.status === 'In Progress') {
        copy[0] = { ...copy[0], val: `${parseInt(copy[0].val) + 1} runs` };
      }
      return copy;
    });

    showToast(`Production run ${nextId} and associated schedules spawned!`, 'success');
    setShowOrderModal(false);
    setNewOrder({ item: '', bom: '', qty: 500, status: 'Planned', date: '' });
  };

  const handleSaveWorkOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkOrder.prodOrder || !newWorkOrder.operation) {
      showToast('Please link a production job and allocate operations step', 'warning');
      return;
    }
    const nextId = `WO-${5051 + workOrders.length}`;
    const newWoObj = {
      id: nextId,
      prodOrder: newWorkOrder.prodOrder,
      operation: newWorkOrder.operation,
      machine: newWorkOrder.machine || 'QA-04',
      assignedTo: newWorkOrder.assignedTo || 'Unassigned',
      status: newWorkOrder.status
    };
    setWorkOrders([newWoObj, ...workOrders]);
    showToast(`Work Order ${nextId} released to floor!`, 'success');
    setShowWorkOrderModal(false);
    setNewWorkOrder({ prodOrder: '', operation: '', machine: '', assignedTo: '', status: 'Pending' });
  };

  const handleSaveConsumption = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newConsumption.order || !newConsumption.component || !newConsumption.consumed) {
      showToast('Please specify target job, raw component, and issue amount', 'warning');
      return;
    }
    const nextId = `MAT-${880 + consumptionLedger.length + 1}`;
    const isShortage = Number(newConsumption.consumed.split(' ')[0]) < Number(newConsumption.required.split(' ')[0]) * 0.2;
    const newConsObj = {
      id: nextId,
      order: newConsumption.order,
      component: newConsumption.component,
      required: newConsumption.required || '100 units',
      consumed: newConsumption.consumed,
      status: isShortage ? 'Shortage' : 'On Track'
    };
    setConsumptionLedger([newConsObj, ...consumptionLedger]);
    showToast(`Issued ${newConsumption.consumed} for ${newConsumption.order}`, isShortage ? 'warning' : 'success');
    setShowConsumptionModal(false);
    setNewConsumption({ order: '', component: '', required: '', consumed: '', status: 'On Track' });
  };

  const handleToggleMachine = (machineId: string) => {
    setMachinery(prev => prev.map(m => {
      if (m.id === machineId) {
        const nextStatus = m.status === 'Active' ? 'Idle' : m.status === 'Idle' ? 'Maintenance' : 'Active';
        const nextLoad = nextStatus === 'Active' ? '70%' : '0%';
        showToast(`${m.name} is now ${nextStatus}`, 'success');
        return { ...m, status: nextStatus, load: nextLoad };
      }
      return m;
    }));
  };

  const handleSaveShift = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newShift.name || !newShift.lineSupervised) {
      showToast('Please fill out the shift name and production line', 'warning');
      return;
    }
    const nextId = `SHFT-${100 + shifts.length}`;
    const newShftObj = {
      id: nextId,
      name: newShift.name,
      time: newShift.time,
      lineSupervised: newShift.lineSupervised,
      operators: newShift.operators.split(',').map(o => o.trim()).filter(Boolean)
    };
    setShifts([newShftObj, ...shifts]);
    showToast(`Floor shift ${newShift.name} logged into weekly schedule`, 'success');
    setShowShiftModal(false);
    setNewShift({ name: '', time: '08:00 AM - 04:00 PM', lineSupervised: '', operators: '' });
  };

  const handleSaveQc = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQc.prodOrder || !newQc.inspector) {
      showToast('Please specify a production run and audit technician', 'warning');
      return;
    }
    const nextId = `QC-${901 + qcInspections.length}`;
    const passed = Number(newQc.passedQty);
    const failed = Number(newQc.failedQty);
    const total = passed + failed;
    const finalResult = failed > total * 0.05 ? 'Fail' : 'Pass';

    const newQcObj = {
      id: nextId,
      prodOrder: newQc.prodOrder,
      item: productionOrders.find(o => o.id === newQc.prodOrder)?.item || 'Electric Motor V2',
      inspectedQty: total,
      passedQty: passed,
      failedQty: failed,
      inspector: newQc.inspector,
      result: finalResult
    };
    setQcInspections([newQcObj, ...qcInspections]);

    // If failed, automatically record scrap!
    if (failed > 0) {
      const scrapId = `SCRP-${10 + scrapLogs.length}`;
      const autoScrap = {
        id: scrapId,
        order: newQc.prodOrder,
        component: 'Inspected Defect Scrap',
        qty: `${failed} pcs`,
        reason: 'QC Inspection Fail',
        cost: `$${(failed * 45.5).toFixed(2)}`,
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      };
      setScrapLogs(prev => [autoScrap, ...prev]);
    }

    showToast(`QC Audit ${nextId} processed. Verdict: ${finalResult}`, finalResult === 'Pass' ? 'success' : 'warning');
    setShowQcModal(false);
    setNewQc({ prodOrder: '', inspectedQty: 100, passedQty: 95, failedQty: 5, inspector: '', result: 'Pass', tests: { dims: true, elec: true, finish: true } });
  };

  const handleSaveScrap = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newScrap.order || !newScrap.component || !newScrap.qty) {
      showToast('Please fill out all required scrap waste ledger fields', 'warning');
      return;
    }
    const nextId = `SCRP-${10 + scrapLogs.length}`;
    const newScrpObj = {
      id: nextId,
      order: newScrap.order,
      component: newScrap.component,
      qty: newScrap.qty,
      reason: newScrap.reason,
      cost: `$${parseFloat(newScrap.cost || '25').toFixed(2)}`,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    };
    setScrapLogs([newScrpObj, ...scrapLogs]);

    // Update Scrap KPI
    setDashboardStats(prev => {
      const copy = [...prev];
      const currentScrapVal = parseFloat(copy[3].val.replace('$', ''));
      const extraScrapVal = parseFloat(newScrap.cost || '25');
      copy[3] = { ...copy[3], val: `$${(currentScrapVal + extraScrapVal).toFixed(2)}` };
      return copy;
    });

    showToast(`Logged waste ${nextId} into scrap register`, 'success');
    setShowScrapModal(false);
    setNewScrap({ order: '', component: '', qty: '', reason: 'Off-cut', cost: '' });
  };

  const handleSimulateTelemetry = () => {
    const isAccelerated = telemetrySpeed > 150;
    const nextSpd = isAccelerated ? 110 + Math.ceil(Math.random() * 20) : 160 + Math.ceil(Math.random() * 30);
    const nextTmp = isAccelerated ? 40 + Math.ceil(Math.random() * 5) : 58 + Math.ceil(Math.random() * 12);
    setTelemetrySpeed(nextSpd);
    setTelemetryTemp(nextTmp);

    const logMsg = nextTmp > 65 
      ? `WARNING: High friction thermal alert on assembly arms! Temp: ${nextTmp}°C`
      : `Optimal performance index reached. Telemetry logged speed: ${nextSpd} units/hr`;
    setTelemetryLogs(prev => [logMsg, ...prev.slice(0, 5)]);
    showToast(nextTmp > 65 ? 'High Temperature Alert!' : 'Simulated telemetry ping!', nextTmp > 65 ? 'warning' : 'success');
  };

  const handleCompleteOrder = (orderId: string) => {
    setProductionOrders(prev => prev.map(o => {
      if (o.id === orderId) {
        showToast(`Production Run ${orderId} finalized! Spawned warehouse transfer receipt.`, 'success');
        
        // Auto receipt Finished Goods lot
        const nextLotId = `FG-${8800 + finishedGoods.length + 1}`;
        const autoFg = {
          id: nextLotId,
          prodOrder: orderId,
          item: o.item,
          lotNo: `LOT-${o.item.split(' ').map(w => w[0]).join('').toUpperCase()}-${orderId.split('-')[1]}`,
          receiptedQty: o.qty,
          location: 'WH-Main / BAY-B1',
          receiptDate: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        };
        setFinishedGoods(prevFg => [autoFg, ...prevFg]);

        // Auto compile costing ledger summary
        const autoCostObj = {
          id: `CST-${orderId.split('-')[1]}`,
          order: orderId,
          item: o.item,
          materialCost: o.qty * 25,
          laborCost: o.qty * 8,
          overhead: o.qty * 3.5,
          totalCost: o.qty * 36.5,
          budget: o.qty * 40,
          variance: -(o.qty * 3.5)
        };
        setCostingDetails(prevCst => [autoCostObj, ...prevCst]);

        // Add to MTD Units Produced
        setDashboardStats(prevStats => {
          const copy = [...prevStats];
          const currPcs = parseInt(copy[1].val.replace(/,/g, ''));
          copy[1] = { ...copy[1], val: `${(currPcs + o.qty).toLocaleString()} pcs` };
          return copy;
        });

        return { ...o, status: 'Completed', progress: 100 };
      }
      return o;
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
          <h4 className="font-bold text-xs text-[var(--text-primary)] mb-4 font-display">Active Production Queue</h4>
          <div className="space-y-3">
            {productionOrders.filter(o => o.status === 'In Progress').map(order => (
              <div key={order.id} className="p-3 bg-[var(--bg-primary)]/40 rounded-xl border border-[var(--border-color)] text-xs">
                <div className="flex justify-between items-center mb-2">
                  <div>
                    <span className="font-mono text-[9px] font-bold text-indigo-400 block">{order.id}</span>
                    <p className="font-bold text-[var(--text-primary)] mt-0.5">{order.item}</p>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-[var(--text-primary)]">{order.progress}%</span>
                    <p className="text-[10px] text-[var(--text-muted)]">Target: {order.qty} units</p>
                  </div>
                </div>
                <div className="h-1.5 w-full bg-[var(--bg-tertiary)] rounded-full overflow-hidden mb-2">
                  <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${order.progress}%` }}></div>
                </div>
                <div className="flex justify-between items-center mt-3 text-[10px]">
                  <span className="text-[var(--text-muted)]">Locked BOM: {order.bom}</span>
                  <button 
                    onClick={() => handleCompleteOrder(order.id)}
                    className="px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded font-bold cursor-pointer"
                  >
                    Quick Finalize
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl p-5">
          <h4 className="font-bold text-xs text-[var(--text-primary)] mb-4 font-display">Material Alerts & Shortages</h4>
          <div className="space-y-3">
            {consumptionLedger.map(c => (
              <div key={c.id} className="flex justify-between items-center p-3 bg-[var(--bg-primary)]/40 rounded-xl border border-[var(--border-color)] text-xs">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${c.status === 'Shortage' ? 'bg-red-500/10 text-red-500' : 'bg-indigo-500/10 text-indigo-500'}`}>
                    <AlertTriangle className="w-4 h-4"/>
                  </div>
                  <div>
                    <p className="font-bold text-[var(--text-primary)]">{c.component}</p>
                    <p className="text-[10px] text-[var(--text-muted)] mt-0.5">Order Ref: {c.order}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold border uppercase tracking-wider ${
                    c.status === 'Shortage' ? 'bg-red-500/10 border-red-500/20 text-red-400 animate-pulse' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                  }`}>{c.status}</span>
                  <p className="text-[10px] text-[var(--text-muted)] mt-1">Req: {c.required} / Used: {c.consumed}</p>
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
          <CheckCircle2 className="w-4 h-4" />
          <span className="text-xs font-semibold">{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center border-b border-[var(--border-color)] pb-4 mb-4 shrink-0">
        <div>
          <h3 className="font-bold text-xl text-[var(--text-primary)] flex items-center gap-2 font-display">
            <Factory className="w-6 h-6 text-indigo-500" />
            Shop-Floor Manufacturing & Production
          </h3>
          <p className="text-xs text-[var(--text-secondary)] mt-1">Manage product recipes (BOMs), schedule production runs, monitor machinery speed, shifts and inspections logs</p>
        </div>
        <div className="flex gap-2">
          {currentTab === 'bom' && (
            <button 
              onClick={() => setShowBomModal(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-all shadow-lg flex items-center gap-2 cursor-pointer animate-scale-up"
            >
              <Plus className="w-4 h-4" /> Create Bill of Materials
            </button>
          )}
          {currentTab === 'orders' && (
            <button 
              onClick={() => setShowOrderModal(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-all shadow-lg flex items-center gap-2 cursor-pointer animate-scale-up"
            >
              <Plus className="w-4 h-4" /> Schedule Production Order
            </button>
          )}
          {currentTab === 'workorders' && (
            <button 
              onClick={() => setShowWorkOrderModal(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-all shadow-lg flex items-center gap-2 cursor-pointer animate-scale-up"
            >
              <Plus className="w-4 h-4" /> Release Work Order
            </button>
          )}
          {currentTab === 'material' && (
            <button 
              onClick={() => setShowConsumptionModal(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-all shadow-lg flex items-center gap-2 cursor-pointer animate-scale-up"
            >
              <Plus className="w-4 h-4" /> Log Component Issue
            </button>
          )}
          {currentTab === 'shift' && (
            <button 
              onClick={() => setShowShiftModal(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-all shadow-lg flex items-center gap-2 cursor-pointer animate-scale-up"
            >
              <Plus className="w-4 h-4" /> Schedule Shift Plan
            </button>
          )}
          {currentTab === 'quality' && (
            <button 
              onClick={() => setShowQcModal(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-all shadow-lg flex items-center gap-2 cursor-pointer animate-scale-up"
            >
              <Plus className="w-4 h-4" /> Log QC Inspection
            </button>
          )}
          {currentTab === 'scrap' && (
            <button 
              onClick={() => setShowScrapModal(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-all shadow-lg flex items-center gap-2 cursor-pointer animate-scale-up"
            >
              <Plus className="w-4 h-4" /> Log Scrap Waste
            </button>
          )}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden">
        {currentTab === 'dashboard' && renderDashboard()}

        {/* VIEW 1: BILL OF MATERIALS */}
        {currentTab === 'bom' && renderTable(
          ['BOM ID', 'Product Item Recipe', 'Components Assigned', 'Total Material Cost', 'Version', 'Status'],
          boms,
          (b) => (
            <tr key={b.id} className="hover:bg-[var(--bg-tertiary)]/30 transition-colors text-xs">
              <td className="px-6 py-4 font-mono font-bold text-indigo-400">{b.id}</td>
              <td className="px-6 py-4 font-bold text-[var(--text-primary)]">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-slate-400" />
                  {b.item}
                </div>
              </td>
              <td className="px-6 py-4">{b.componentsCount} components ({b.operationsCount} steps)</td>
              <td className="px-6 py-4 font-mono font-bold text-emerald-400">${b.totalCost.toFixed(2)}</td>
              <td className="px-6 py-4 font-mono">{b.version}</td>
              <td className="px-6 py-4">
                <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-bold rounded uppercase">
                  {b.status}
                </span>
              </td>
              <td className="px-6 py-4 text-right">
                <button className="text-[var(--text-muted)] hover:text-indigo-400 p-1 cursor-pointer"><ArrowUpRight className="w-4 h-4" /></button>
              </td>
            </tr>
          )
        )}

        {/* VIEW 2: PRODUCTION ORDERS */}
        {currentTab === 'orders' && renderTable(
          ['Run ID', 'Product Item / Recipe', 'Qty Goal', 'Process Timeline', 'Status'],
          productionOrders,
          (order) => (
            <tr key={order.id} className="hover:bg-[var(--bg-tertiary)]/30 transition-colors text-xs">
              <td className="px-6 py-4 font-mono font-bold text-indigo-400">{order.id}</td>
              <td className="px-6 py-4">
                <p className="font-bold text-[var(--text-primary)]">{order.item}</p>
                <span className="text-[9px] font-mono text-[var(--text-muted)] block mt-0.5">BOM: {order.bom}</span>
              </td>
              <td className="px-6 py-4 font-bold font-mono text-[var(--text-primary)]">{order.qty} pcs</td>
              <td className="px-6 py-4 w-48">
                <div className="flex flex-col gap-1.5 w-full">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-[var(--text-muted)]">{order.date}</span>
                    <span className="font-bold text-[var(--text-primary)]">{order.progress}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${order.progress === 100 ? 'bg-emerald-500' : order.progress > 0 ? 'bg-indigo-500' : 'bg-slate-500'}`} style={{ width: `${order.progress}%` }}></div>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4">
                <span className={`px-2 py-0.5 rounded text-[9px] font-bold border uppercase tracking-wider ${
                  order.status === 'Completed' ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400' :
                  order.status === 'In Progress' ? 'bg-indigo-500/10 border-indigo-500/25 text-indigo-400 animate-pulse' :
                  order.status === 'On Hold' ? 'bg-rose-500/10 border-rose-500/25 text-rose-400' :
                  'bg-slate-500/10 border-slate-500/25 text-slate-400'
                }`}>{order.status}</span>
              </td>
              <td className="px-6 py-4 text-right">
                <div className="flex items-center justify-end gap-2">
                  {order.status === 'Planned' && (
                    <button 
                      onClick={() => setProductionOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: 'In Progress', progress: 10 } : o))}
                      className="p-1 text-indigo-400 hover:text-indigo-300 font-bold text-[10px] border border-indigo-500/25 rounded bg-indigo-500/5 cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {order.status === 'In Progress' && (
                    <button 
                      onClick={() => handleCompleteOrder(order.id)}
                      className="p-1 text-emerald-400 hover:text-emerald-300 font-bold text-[10px] border border-emerald-500/25 rounded bg-emerald-500/5 cursor-pointer"
                    >
                      Finish
                    </button>
                  )}
                  <button className="text-[var(--text-muted)] hover:text-indigo-400 p-1 cursor-pointer"><MoreHorizontal className="w-4 h-4" /></button>
                </div>
              </td>
            </tr>
          )
        )}

        {/* VIEW 3: WORK ORDERS */}
        {currentTab === 'workorders' && renderTable(
          ['WO Ref ID', 'Parent Prod Run', 'Operation Task', 'Machinery Unit', 'Operator Assigned', 'Status'],
          workOrders,
          (wo) => (
            <tr key={wo.id} className="hover:bg-[var(--bg-tertiary)]/30 transition-colors text-xs">
              <td className="px-6 py-4 font-mono font-bold text-indigo-400">{wo.id}</td>
              <td className="px-6 py-4 font-mono text-[var(--text-muted)]">{wo.prodOrder}</td>
              <td className="px-6 py-4 font-bold text-[var(--text-primary)]">
                <div className="flex items-center gap-2">
                  <Wrench className="w-3.5 h-3.5 text-slate-400" />
                  {wo.operation}
                </div>
              </td>
              <td className="px-6 py-4 font-semibold text-[var(--text-secondary)]">{wo.machine}</td>
              <td className="px-6 py-4">{wo.assignedTo}</td>
              <td className="px-6 py-4">
                <span className={`px-2 py-0.5 rounded text-[9px] font-bold border uppercase tracking-wider ${
                  wo.status === 'In Progress' ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400' :
                  wo.status === 'Paused' ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' :
                  'bg-slate-500/10 border-slate-500/20 text-slate-400'
                }`}>{wo.status}</span>
              </td>
              <td className="px-6 py-4 text-right">
                <div className="flex items-center justify-end gap-1.5">
                  {wo.status === 'Pending' && (
                    <button 
                      onClick={() => setWorkOrders(prev => prev.map(w => w.id === wo.id ? { ...w, status: 'In Progress' } : w))}
                      className="p-1 text-indigo-400 hover:bg-indigo-500/10 rounded cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {wo.status === 'In Progress' && (
                    <button 
                      onClick={() => setWorkOrders(prev => prev.map(w => w.id === wo.id ? { ...w, status: 'Paused' } : w))}
                      className="p-1 text-amber-500 hover:bg-amber-500/10 rounded cursor-pointer"
                    >
                      <Pause className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button className="text-[var(--text-muted)] hover:text-indigo-400 p-1 cursor-pointer"><MoreHorizontal className="w-4 h-4" /></button>
                </div>
              </td>
            </tr>
          )
        )}

        {/* VIEW 4: PRODUCTION CAPACITY PLANNING */}
        {currentTab === 'planning' && (
          <div className="space-y-6 animate-fade-in text-left p-2 h-full overflow-y-auto text-xs">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Timeline Adjuster Controls */}
              <div className="border border-[var(--border-color)] bg-[var(--bg-tertiary)]/10 rounded-2xl p-5 space-y-4">
                <span className="text-[9px] font-bold text-[var(--text-muted)] tracking-widest uppercase block">Capacity Scheduling Slider</span>
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-bold text-[var(--text-secondary)] block mb-1">Target Shop Floor Capacity Load: {capacityLoad}%</label>
                    <input 
                      type="range" 
                      min="10" 
                      max="100" 
                      value={capacityLoad} 
                      onChange={(e) => setCapacityLoad(Number(e.target.value))}
                      className="w-full accent-indigo-600 h-1.5 bg-[var(--bg-primary)] rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                  <div className="p-3.5 rounded-xl border border-indigo-500/20 bg-indigo-500/5 text-[10px] text-[var(--text-secondary)] leading-relaxed">
                    <p className="font-bold text-indigo-400 flex items-center gap-1.5 mb-1"><Calendar className="w-3.5 h-3.5" /> Allocations Health Check</p>
                    Adjusting floor loading schedules allows you to simulate production output limits. Standard yield threshold: **85% capacity**. High load warnings occur at **90%+** overload risks.
                  </div>
                </div>
              </div>

              {/* Gantt Timeline Mock Board */}
              <div className="md:col-span-2 border border-[var(--border-color)] bg-[var(--bg-tertiary)]/20 p-5 rounded-2xl flex flex-col h-full min-h-[250px]">
                <span className="text-[9px] font-bold text-[var(--text-muted)] tracking-widest uppercase block border-b border-[var(--border-color)] pb-2 mb-4">Gantt Allocation Timeline (Active Jobs)</span>
                <div className="space-y-4 flex-1 flex flex-col justify-between">
                  {productionOrders.slice(0, 3).map((job, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between text-[10px] font-mono">
                        <span className="font-bold text-[var(--text-primary)]">{job.id} - {job.item}</span>
                        <span className="text-[var(--text-muted)]">Allocation Timeline (Days 1-10)</span>
                      </div>
                      <div className="h-6 w-full bg-[var(--bg-primary)] rounded-lg overflow-hidden border border-[var(--border-color)] relative">
                        <div 
                          className="h-full bg-indigo-500/20 border-r border-indigo-500 text-[9px] text-indigo-400 font-bold flex items-center pl-3"
                          style={{ width: `${Math.max(job.progress, 30)}%` }}
                        >
                          RUNNING STAGE
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 5: RAW MATERIAL CONSUMPTION */}
        {currentTab === 'material' && renderTable(
          ['Issue ID', 'Target Run Ref', 'Raw Component Item', 'Qty Required', 'Qty Dispatched / Consumed', 'Fulfillment Status'],
          consumptionLedger,
          (c) => (
            <tr key={c.id} className="hover:bg-[var(--bg-tertiary)]/30 transition-colors text-xs">
              <td className="px-6 py-4 font-mono font-bold text-indigo-400">{c.id}</td>
              <td className="px-6 py-4 font-mono text-[var(--text-muted)]">{c.order}</td>
              <td className="px-6 py-4 font-bold text-[var(--text-primary)]">
                <div className="flex items-center gap-2">
                  <Box className="w-3.5 h-3.5 text-slate-400" />
                  {c.component}
                </div>
              </td>
              <td className="px-6 py-4 font-mono">{c.required}</td>
              <td className="px-6 py-4 font-mono font-bold text-emerald-400">{c.consumed}</td>
              <td className="px-6 py-4">
                <span className={`px-2 py-0.5 rounded text-[9px] font-bold border uppercase tracking-wider ${
                  c.status === 'Shortage' ? 'bg-red-500/10 border-red-500/20 text-red-400 animate-pulse' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                }`}>{c.status}</span>
              </td>
              <td className="px-6 py-4 text-right">
                <button className="text-[var(--text-muted)] hover:text-indigo-400 p-1 cursor-pointer"><MoreHorizontal className="w-4 h-4" /></button>
              </td>
            </tr>
          )
        )}

        {/* VIEW 6: PRODUCTION TELEMETRY TRACKING */}
        {currentTab === 'tracking' && (
          <div className="space-y-6 animate-fade-in text-left p-2 h-full overflow-y-auto text-xs">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              
              {/* Telemetry Control Panel */}
              <div className="lg:col-span-2 border border-[var(--border-color)] bg-[var(--bg-tertiary)]/10 rounded-2xl p-5 space-y-4 flex flex-col justify-between">
                <div>
                  <span className="text-[9px] font-bold text-[var(--text-muted)] tracking-widest uppercase block mb-3">Live Machinery Telemetry</span>
                  <div className="space-y-4">
                    <div className="bg-[var(--bg-primary)] p-3.5 rounded-xl border border-[var(--border-color)]">
                      <span className="text-[8px] font-mono text-[var(--text-muted)] block uppercase">Simulated Output Rate</span>
                      <div className="flex items-baseline gap-1 mt-1">
                        <span className="text-2xl font-black text-indigo-400 font-mono">{telemetrySpeed}</span>
                        <span className="text-[10px] text-[var(--text-secondary)]">units/hour</span>
                      </div>
                    </div>
                    <div className="bg-[var(--bg-primary)] p-3.5 rounded-xl border border-[var(--border-color)]">
                      <span className="text-[8px] font-mono text-[var(--text-muted)] block uppercase">Primary Motor Temperature</span>
                      <div className="flex items-baseline gap-1 mt-1">
                        <span className={`text-2xl font-black font-mono ${telemetryTemp > 60 ? 'text-amber-500' : 'text-emerald-400'}`}>{telemetryTemp}°C</span>
                        <span className="text-[10px] text-[var(--text-secondary)]">{telemetryTemp > 60 ? 'Thermal Warning' : 'Optimal'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={handleSimulateTelemetry}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-xs shadow-md transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Activity className="w-4 h-4 animate-pulse" /> Ping Live Telemetry
                </button>
              </div>

              {/* Ticker Activity Logs */}
              <div className="lg:col-span-3 border border-[var(--border-color)] bg-[var(--bg-tertiary)]/20 p-5 rounded-2xl flex flex-col h-full min-h-[250px]">
                <span className="text-[9px] font-bold text-[var(--text-muted)] tracking-widest uppercase block border-b border-[var(--border-color)] pb-2 mb-3">Shop-floor Telemetry Log Event Stream</span>
                <div className="flex-1 overflow-y-auto font-mono text-[10px] space-y-2 bg-[var(--bg-primary)]/40 p-4 rounded-xl border border-[var(--border-color)] h-44 custom-scrollbar">
                  {telemetryLogs.map((log, idx) => (
                    <div key={idx} className={`p-1.5 border-b border-[var(--border-color)]/30 ${log.includes('WARNING') ? 'text-amber-400 font-bold' : 'text-[var(--text-secondary)]'}`}>
                      &gt; {log}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 7: FINISHED GOODS TRACKING */}
        {currentTab === 'fg' && renderTable(
          ['Receipt ID', 'Prod Order Ref', 'Receipted Item Product', 'Lot Code Number', 'Location Bin', 'Receipt Date', 'Lot Quantity'],
          finishedGoods,
          (row, i) => (
            <tr key={i} className="hover:bg-[var(--bg-tertiary)]/30 transition-colors text-xs">
              <td className="px-6 py-4 font-mono font-bold text-indigo-400">{row.id}</td>
              <td className="px-6 py-4 font-mono text-[var(--text-muted)]">{row.prodOrder}</td>
              <td className="px-6 py-4 font-bold text-[var(--text-primary)]">{row.item}</td>
              <td className="px-6 py-4 font-mono font-semibold text-amber-500">{row.lotNo}</td>
              <td className="px-6 py-4 font-semibold text-[var(--text-secondary)]">{row.location}</td>
              <td className="px-6 py-4">{row.receiptDate}</td>
              <td className="px-6 py-4 font-mono font-bold text-[var(--text-primary)]">{row.receiptedQty} pcs</td>
              <td className="px-6 py-4 text-right">
                <button className="text-[var(--text-muted)] hover:text-indigo-400 p-1 cursor-pointer"><MoreHorizontal className="w-4 h-4" /></button>
              </td>
            </tr>
          )
        )}

        {/* VIEW 8: MACHINE ALLOCATION */}
        {currentTab === 'machine' && (
          <div className="space-y-6 animate-fade-in text-left p-2 h-full overflow-y-auto text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {machinery.map((mac) => (
                <div key={mac.id} className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-5 flex flex-col justify-between hover:border-indigo-500/30 transition-all shadow-sm">
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <span className="font-mono text-[9px] font-bold text-indigo-400 block">{mac.id}</span>
                        <h4 className="font-bold text-xs text-[var(--text-primary)] font-display mt-0.5">{mac.name}</h4>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold border uppercase tracking-wider ${
                        mac.status === 'Active' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                        mac.status === 'Idle' ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' :
                        'bg-rose-500/10 border-rose-500/20 text-rose-400'
                      }`}>{mac.status}</span>
                    </div>
                    
                    <div className="space-y-2 text-[10px] text-[var(--text-secondary)] font-mono border-t border-[var(--border-color)] pt-3">
                      <div className="flex justify-between">
                        <span>Classification:</span>
                        <span>{mac.type}</span>
                      </div>
                      <div className="flex justify-between text-indigo-400">
                        <span>Current Floor Load:</span>
                        <span>{mac.load}</span>
                      </div>
                      <div className="flex justify-between text-amber-500">
                        <span>Core Thermal:</span>
                        <span>{mac.temp}</span>
                      </div>
                      <div className="flex justify-between text-emerald-400 font-bold">
                        <span>Historical Uptime:</span>
                        <span>{mac.uptime}</span>
                      </div>
                    </div>
                  </div>

                  <button 
                    onClick={() => handleToggleMachine(mac.id)}
                    className="w-full py-1.5 mt-4 bg-[var(--bg-primary)] hover:bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs font-bold rounded-lg transition-colors cursor-pointer"
                  >
                    Change Status
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* VIEW 9: SHIFT PLANNING */}
        {currentTab === 'shift' && renderTable(
          ['Shift Ref ID', 'Shift Slot Name', 'Timing Hours', 'Assembly Line Assigned', 'Operators Count', 'Supervisors Assigned'],
          shifts,
          (row, i) => (
            <tr key={i} className="hover:bg-[var(--bg-tertiary)]/30 transition-colors text-xs">
              <td className="px-6 py-4 font-mono font-bold text-indigo-400">{row.id}</td>
              <td className="px-6 py-4 font-bold text-[var(--text-primary)]">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                  {row.name}
                </div>
              </td>
              <td className="px-6 py-4 font-mono">{row.time}</td>
              <td className="px-6 py-4 font-semibold text-[var(--text-secondary)]">{row.lineSupervised}</td>
              <td className="px-6 py-4 font-mono">{row.operators.length} personnel</td>
              <td className="px-6 py-4 truncate max-w-[200px]">{row.operators.join(', ')}</td>
              <td className="px-6 py-4 text-right">
                <button className="text-[var(--text-muted)] hover:text-indigo-400 p-1 cursor-pointer"><MoreHorizontal className="w-4 h-4" /></button>
              </td>
            </tr>
          )
        )}

        {/* VIEW 10: QUALITY CONTROL INSPECTIONS */}
        {currentTab === 'quality' && renderTable(
          ['Inspection ID', 'Prod Run Ref', 'Product Audited', 'Total Audited', 'Defect Scrap Qty', 'Inspection Tech', 'QC Verdict'],
          qcInspections,
          (row, i) => (
            <tr key={i} className="hover:bg-[var(--bg-tertiary)]/30 transition-colors text-xs">
              <td className="px-6 py-4 font-mono font-bold text-indigo-400">{row.id}</td>
              <td className="px-6 py-4 font-mono">{row.prodOrder}</td>
              <td className="px-6 py-4 font-bold text-[var(--text-primary)]">{row.item}</td>
              <td className="px-6 py-4 font-mono">{row.inspectedQty} pcs</td>
              <td className={`px-6 py-4 font-mono font-bold ${row.failedQty > 0 ? 'text-rose-500' : 'text-[var(--text-muted)]'}`}>{row.failedQty} defects</td>
              <td className="px-6 py-4">{row.inspector}</td>
              <td className="px-6 py-4">
                <span className={`px-2 py-0.5 rounded text-[9px] font-bold border uppercase tracking-wider ${
                  row.result === 'Pass' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400 animate-pulse'
                }`}>{row.result}</span>
              </td>
              <td className="px-6 py-4 text-right">
                <button className="text-[var(--text-muted)] hover:text-indigo-400 p-1 cursor-pointer"><MoreHorizontal className="w-4 h-4" /></button>
              </td>
            </tr>
          )
        )}

        {/* VIEW 11: PRODUCTION COSTING & MOH */}
        {currentTab === 'costing' && renderTable(
          ['Costing ID', 'Run Ref', 'Item Product Particulars', 'Raw Materials Cost', 'Direct Labor Cost', 'Mfg Overhead (MOH)', 'Actual Total Cost', 'Estimated Variance'],
          costingDetails,
          (row, i) => (
            <tr key={i} className="hover:bg-[var(--bg-tertiary)]/30 transition-colors text-xs">
              <td className="px-6 py-4 font-mono font-bold text-indigo-400">{row.id}</td>
              <td className="px-6 py-4 font-mono">{row.order}</td>
              <td className="px-6 py-4 font-bold text-[var(--text-primary)]">{row.item}</td>
              <td className="px-6 py-4 font-mono">${row.materialCost.toLocaleString()}</td>
              <td className="px-6 py-4 font-mono">${row.laborCost.toLocaleString()}</td>
              <td className="px-6 py-4 font-mono">${row.overhead.toLocaleString()}</td>
              <td className="px-6 py-4 font-mono font-bold text-[var(--text-primary)]">${row.totalCost.toLocaleString()}</td>
              <td className={`px-6 py-4 font-mono font-bold ${row.variance < 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {row.variance < 0 ? `-$${Math.abs(row.variance).toLocaleString()} (Under)` : `+$${row.variance.toLocaleString()} (Over)`}
              </td>
              <td className="px-6 py-4 text-right">
                <button className="text-[var(--text-muted)] hover:text-indigo-400 p-1 cursor-pointer"><MoreHorizontal className="w-4 h-4" /></button>
              </td>
            </tr>
          )
        )}

        {/* VIEW 12: FLOOR SCRAP TRACKING */}
        {currentTab === 'scrap' && renderTable(
          ['Scrap ID', 'Prod Run Ref', 'Scrapped Raw Component', 'Qty Wasted', 'Scrap/Waste Reason', 'Evaluated Cost', 'Log Date'],
          scrapLogs,
          (row, i) => (
            <tr key={i} className="hover:bg-[var(--bg-tertiary)]/30 transition-colors text-xs">
              <td className="px-6 py-4 font-mono font-bold text-red-400">{row.id}</td>
              <td className="px-6 py-4 font-mono text-[var(--text-muted)]">{row.order}</td>
              <td className="px-6 py-4 font-bold text-[var(--text-primary)]">
                <div className="flex items-center gap-2">
                  <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                  {row.component}
                </div>
              </td>
              <td className="px-6 py-4 font-mono font-semibold">{row.qty}</td>
              <td className="px-6 py-4 italic">{row.reason}</td>
              <td className="px-6 py-4 font-mono font-bold text-rose-500">{row.cost}</td>
              <td className="px-6 py-4">{row.date}</td>
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

      {/* Create BOM Modal */}
      {showBomModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in text-xs">
          <form onSubmit={handleSaveBom} className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl w-full max-w-md p-6 relative shadow-2xl text-left select-none text-xs">
            <button type="button" onClick={() => setShowBomModal(false)} className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer">✕</button>
            <div className="flex items-center gap-2 pb-3 border-b border-[var(--border-color)] mb-4">
              <Layers className="w-5 h-5 text-indigo-400" />
              <h4 className="font-bold text-sm text-[var(--text-primary)] font-display">Create Bill of Materials (Recipe)</h4>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Target Finished Product</label>
                <input 
                  type="text" 
                  placeholder="e.g. Electric Motor V2" 
                  value={newBom.item} 
                  onChange={(e) => setNewBom({ ...newBom, item: e.target.value })} 
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none" 
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">BOM Version</label>
                  <input type="text" value={newBom.version} onChange={(e) => setNewBom({ ...newBom, version: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none" />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Base Quantity</label>
                  <input type="text" value="1 unit" readOnly className="w-full bg-[var(--bg-primary)]/50 border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none cursor-not-allowed" />
                </div>
              </div>
              
              <div className="border border-[var(--border-color)]/60 bg-[var(--bg-primary)]/10 rounded-xl p-3.5 mt-2 space-y-2">
                <span className="text-[9px] font-bold text-[var(--text-muted)] tracking-wider uppercase block border-b border-[var(--border-color)]/30 pb-1">Dynamic Ingredients Breakdown</span>
                <div className="space-y-2 text-[10px] text-[var(--text-secondary)] max-h-24 overflow-y-auto custom-scrollbar">
                  <div className="flex justify-between font-bold">
                    <span>Component Name</span>
                    <span>Cost Matrix</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Copper Coil (2 kg @ $15)</span>
                    <span>$30.00</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Neodymium Magnets (4 pcs @ $25)</span>
                    <span>$100.00</span>
                  </div>
                  <div className="flex justify-between border-t border-[var(--border-color)]/25 pt-1 text-emerald-400 font-bold">
                    <span>Estimated Recipe Unit Cost</span>
                    <span>$130.00</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-color)] mt-4">
              <button type="button" onClick={() => setShowBomModal(false)} className="py-1.5 px-4 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer">Cancel</button>
              <button type="submit" className="py-1.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold shadow cursor-pointer">Register Recipe BOM</button>
            </div>
          </form>
        </div>
      )}

      {/* Schedule Production Order Modal */}
      {showOrderModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in text-xs">
          <form onSubmit={handleSaveOrder} className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl w-full max-w-md p-6 relative shadow-2xl text-left select-none text-xs">
            <button type="button" onClick={() => setShowOrderModal(false)} className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer">✕</button>
            <div className="flex items-center gap-2 pb-3 border-b border-[var(--border-color)] mb-4">
              <Box className="w-5 h-5 text-indigo-400" />
              <h4 className="font-bold text-sm text-[var(--text-primary)] font-display">Schedule Shop-floor Production Order</h4>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Select Recipe BOM</label>
                <select 
                  value={newOrder.bom} 
                  onChange={(e) => {
                    const selBom = boms.find(b => b.id === e.target.value);
                    setNewOrder({ ...newOrder, bom: e.target.value, item: selBom ? selBom.item : '' });
                  }} 
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none"
                  required
                >
                  <option value="">-- Select Recipe BOM --</option>
                  {boms.map(b => <option key={b.id} value={b.id}>[{b.id}] {b.item}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Target Qty (pcs)</label>
                  <input type="number" value={newOrder.qty} onChange={(e) => setNewOrder({ ...newOrder, qty: Number(e.target.value) })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none" required />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Release Status</label>
                  <select value={newOrder.status} onChange={(e) => setNewOrder({ ...newOrder, status: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none">
                    <option value="Planned">Planned Mode</option>
                    <option value="In Progress">Release Immediately (In Progress)</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Planned Start Date</label>
                <input type="date" value={newOrder.date} onChange={(e) => setNewOrder({ ...newOrder, date: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none" />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-color)] mt-4">
              <button type="button" onClick={() => setShowOrderModal(false)} className="py-1.5 px-4 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer">Cancel</button>
              <button type="submit" className="py-1.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold shadow cursor-pointer">Log & Queue Run</button>
            </div>
          </form>
        </div>
      )}

      {/* Release Work Order Modal */}
      {showWorkOrderModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in text-xs">
          <form onSubmit={handleSaveWorkOrder} className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl w-full max-w-md p-6 relative shadow-2xl text-left select-none text-xs">
            <button type="button" onClick={() => setShowWorkOrderModal(false)} className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer">✕</button>
            <div className="flex items-center gap-2 pb-3 border-b border-[var(--border-color)] mb-4">
              <Wrench className="w-5 h-5 text-indigo-400" />
              <h4 className="font-bold text-sm text-[var(--text-primary)] font-display">Release Shop Floor Work Order</h4>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Link to Production Run</label>
                <select value={newWorkOrder.prodOrder} onChange={(e) => setNewWorkOrder({ ...newWorkOrder, prodOrder: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none" required>
                  <option value="">-- Choose Production ID --</option>
                  {productionOrders.map(o => <option key={o.id} value={o.id}>[{o.id}] {o.item} ({o.qty} pcs)</option>)}
                </select>
              </div>
              <div>
                <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Operation Description</label>
                <input type="text" placeholder="e.g. Solder components, functional testing" value={newWorkOrder.operation} onChange={(e) => setNewWorkOrder({ ...newWorkOrder, operation: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Machinery Allocation</label>
                  <select value={newWorkOrder.machine} onChange={(e) => setNewWorkOrder({ ...newWorkOrder, machine: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none">
                    <option value="">-- Assign Machine --</option>
                    {machinery.map(m => <option key={m.id} value={mac => m.name}>[{m.id}] {m.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Operator Assigned</label>
                  <input type="text" placeholder="Worker Name" value={newWorkOrder.assignedTo} onChange={(e) => setNewWorkOrder({ ...newWorkOrder, assignedTo: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none" />
                </div>
              </div>
              <div>
                <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Initial Status</label>
                <select value={newWorkOrder.status} onChange={(e) => setNewWorkOrder({ ...newWorkOrder, status: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none">
                  <option value="Pending">Pending Allocations</option>
                  <option value="In Progress">Deploy Instantly (In Progress)</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-color)] mt-4">
              <button type="button" onClick={() => setShowWorkOrderModal(false)} className="py-1.5 px-4 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer">Cancel</button>
              <button type="submit" className="py-1.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold shadow cursor-pointer">Deploy Task</button>
            </div>
          </form>
        </div>
      )}

      {/* Log Material Issue Modal */}
      {showConsumptionModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in text-xs">
          <form onSubmit={handleSaveConsumption} className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl w-full max-w-md p-6 relative shadow-2xl text-left select-none text-xs">
            <button type="button" onClick={() => setShowConsumptionModal(false)} className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer">✕</button>
            <div className="flex items-center gap-2 pb-3 border-b border-[var(--border-color)] mb-4">
              <Box className="w-5 h-5 text-indigo-400" />
              <h4 className="font-bold text-sm text-[var(--text-primary)] font-display">Log Raw Component Issue</h4>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Target Production Run</label>
                <select value={newConsumption.order} onChange={(e) => setNewConsumption({ ...newConsumption, order: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none" required>
                  <option value="">-- Select Active Job --</option>
                  {productionOrders.map(o => <option key={o.id} value={o.id}>[{o.id}] {o.item}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Component Name</label>
                <input type="text" placeholder="e.g. Copper wire, magnets" value={newConsumption.component} onChange={(e) => setNewConsumption({ ...newConsumption, component: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Estimated Required Amount</label>
                  <input type="text" placeholder="e.g. 500 kg" value={newConsumption.required} onChange={(e) => setNewConsumption({ ...newConsumption, required: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none" />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Actual Amount Issued</label>
                  <input type="text" placeholder="e.g. 480 kg" value={newConsumption.consumed} onChange={(e) => setNewConsumption({ ...newConsumption, consumed: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none" required />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-color)] mt-4">
              <button type="button" onClick={() => setShowConsumptionModal(false)} className="py-1.5 px-4 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer">Cancel</button>
              <button type="submit" className="py-1.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold shadow cursor-pointer">Issue Component</button>
            </div>
          </form>
        </div>
      )}

      {/* Schedule Shift Modal */}
      {showShiftModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in text-xs">
          <form onSubmit={handleSaveShift} className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl w-full max-w-md p-6 relative shadow-2xl text-left select-none text-xs">
            <button type="button" onClick={() => setShowShiftModal(false)} className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer">✕</button>
            <div className="flex items-center gap-2 pb-3 border-b border-[var(--border-color)] mb-4">
              <UserCheck className="w-5 h-5 text-indigo-400" />
              <h4 className="font-bold text-sm text-[var(--text-primary)] font-display">Schedule Weekly Shift Plan</h4>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Shift Plan Title</label>
                <input type="text" placeholder="e.g. Day Shift Line A" value={newShift.name} onChange={(e) => setNewShift({ ...newShift, name: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Shift Hours Slot</label>
                  <select value={newShift.time} onChange={(e) => setNewShift({ ...newShift, time: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none">
                    <option value="08:00 AM - 04:00 PM">Day Shift (08:00 AM - 04:00 PM)</option>
                    <option value="04:00 PM - 12:00 AM">Swing Shift (04:00 PM - 12:00 AM)</option>
                    <option value="12:00 AM - 08:00 AM">Night Shift (12:00 AM - 08:00 AM)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Line Assignment</label>
                  <input type="text" placeholder="e.g. Line A (Motors)" value={newShift.lineSupervised} onChange={(e) => setNewShift({ ...newShift, lineSupervised: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none" required />
                </div>
              </div>
              <div>
                <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Operators (Comma separated list)</label>
                <textarea placeholder="e.g. John Doe, Jane Smith, Alice Cooper" value={newShift.operators} onChange={(e) => setNewShift({ ...newShift, operators: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none h-16 font-sans resize-none" />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-color)] mt-4">
              <button type="button" onClick={() => setShowShiftModal(false)} className="py-1.5 px-4 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer">Cancel</button>
              <button type="submit" className="py-1.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold shadow cursor-pointer">Log Shift</button>
            </div>
          </form>
        </div>
      )}

      {/* QC Audit Modal */}
      {showQcModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in text-xs">
          <form onSubmit={handleSaveQc} className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl w-full max-w-md p-6 relative shadow-2xl text-left select-none text-xs">
            <button type="button" onClick={() => setShowQcModal(false)} className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer">✕</button>
            <div className="flex items-center gap-2 pb-3 border-b border-[var(--border-color)] mb-4">
              <ShieldCheck className="w-5 h-5 text-indigo-400" />
              <h4 className="font-bold text-sm text-[var(--text-primary)] font-display">Log QC Batch Inspection Checklist</h4>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Select Batch production Order</label>
                <select value={newQc.prodOrder} onChange={(e) => setNewQc({ ...newQc, prodOrder: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none" required>
                  <option value="">-- Choose Batch Run ID --</option>
                  {productionOrders.filter(o => o.status === 'In Progress' || o.status === 'Completed').map(o => <option key={o.id} value={o.id}>[{o.id}] {o.item} ({o.qty} pcs)</option>)}
                </select>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Inspected</label>
                  <input type="number" value={newQc.passedQty + newQc.failedQty} readOnly className="w-full bg-[var(--bg-primary)]/50 border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none cursor-not-allowed font-mono" />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Passed (pcs)</label>
                  <input type="number" value={newQc.passedQty} onChange={(e) => setNewQc({ ...newQc, passedQty: Number(e.target.value) })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none font-mono" required />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Defects Fail (pcs)</label>
                  <input type="number" value={newQc.failedQty} onChange={(e) => setNewQc({ ...newQc, failedQty: Number(e.target.value) })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none font-mono" required />
                </div>
              </div>
              <div>
                <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Quality Auditor Inspector</label>
                <input type="text" placeholder="Inspector Name" value={newQc.inspector} onChange={(e) => setNewQc({ ...newQc, inspector: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none" required />
              </div>
              
              <div className="border border-[var(--border-color)]/60 bg-[var(--bg-primary)]/10 rounded-xl p-3 space-y-2 mt-2">
                <span className="text-[8px] font-bold text-[var(--text-muted)] tracking-wider uppercase block">QC Checklist Standards</span>
                <div className="flex gap-4">
                  <label className="flex items-center gap-1.5 text-[9px] font-bold cursor-pointer">
                    <input type="checkbox" checked={newQc.tests.dims} onChange={(e) => setNewQc({ ...newQc, tests: { ...newQc.tests, dims: e.target.checked } })} /> Dimension Specs
                  </label>
                  <label className="flex items-center gap-1.5 text-[9px] font-bold cursor-pointer">
                    <input type="checkbox" checked={newQc.tests.elec} onChange={(e) => setNewQc({ ...newQc, tests: { ...newQc.tests, elec: e.target.checked } })} /> Voltage / Resistance
                  </label>
                  <label className="flex items-center gap-1.5 text-[9px] font-bold cursor-pointer">
                    <input type="checkbox" checked={newQc.tests.finish} onChange={(e) => setNewQc({ ...newQc, tests: { ...newQc.tests, finish: e.target.checked } })} /> Aesthetic Finish
                  </label>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-color)] mt-4">
              <button type="button" onClick={() => setShowQcModal(false)} className="py-1.5 px-4 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer">Cancel</button>
              <button type="submit" className="py-1.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold shadow cursor-pointer">Log Audit Verdict</button>
            </div>
          </form>
        </div>
      )}

      {/* Log Scrap Modal */}
      {showScrapModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in text-xs">
          <form onSubmit={handleSaveScrap} className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl w-full max-w-md p-6 relative shadow-2xl text-left select-none text-xs">
            <button type="button" onClick={() => setShowScrapModal(false)} className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer">✕</button>
            <div className="flex items-center gap-2 pb-3 border-b border-[var(--border-color)] mb-4">
              <Trash2 className="w-5 h-5 text-indigo-400" />
              <h4 className="font-bold text-sm text-[var(--text-primary)] font-display">Log Material Floor Scrap</h4>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Target Production run</label>
                <select value={newScrap.order} onChange={(e) => setNewScrap({ ...newScrap, order: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none" required>
                  <option value="">-- Select Active Job --</option>
                  {productionOrders.map(o => <option key={o.id} value={o.id}>[{o.id}] {o.item}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Scrapped Component / Item Particulars</label>
                <input type="text" placeholder="e.g. Copper offcuts, broken casing" value={newScrap.component} onChange={(e) => setNewScrap({ ...newScrap, component: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Scrap Quantity (e.g. 5 kg)</label>
                  <input type="text" placeholder="e.g. 2.4 kg" value={newScrap.qty} onChange={(e) => setNewScrap({ ...newScrap, qty: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none" required />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Reject Cost Value ($)</label>
                  <input type="number" placeholder="Cost e.g. 50" value={newScrap.cost} onChange={(e) => setNewScrap({ ...newScrap, cost: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none font-mono" />
                </div>
              </div>
              <div>
                <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Floor Waste Category Reason</label>
                <select value={newScrap.reason} onChange={(e) => setNewScrap({ ...newScrap, reason: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none">
                  <option value="Off-cut">Material Off-cut / Scrap Sheet</option>
                  <option value="Molding Defect">Molding Defect / Deformation</option>
                  <option value="Spillage">Spillage / Melting waste</option>
                  <option value="Tooling Damage">Machine / Tooling damage</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-color)] mt-4">
              <button type="button" onClick={() => setShowScrapModal(false)} className="py-1.5 px-4 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer">Cancel</button>
              <button type="submit" className="py-1.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold shadow cursor-pointer">Log Waste</button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
};

export default ManufacturingProduction;
