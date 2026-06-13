import React, { useState, useEffect } from 'react';
import { ClipboardList, Plus, Search, DollarSign, Calculator, Layers, Trash2, Edit2, Clock, Wrench, Settings, Download, Printer, ArrowUp, ArrowDown } from 'lucide-react';
import { apiClient, formatNumber } from '../../utils/apiService';

interface ComponentItem {
  id?: string;
  productId: string;
  name: string;
  qtyRequired: number;
  unit: string;
  costPerUnit: number;
  wasteMargin: number;
  subBomId?: string;
}

interface BOM {
  id: string;
  name?: string;
  description?: string;
  finishedProductId: string;
  finishedProductName: string;
  finishedProductCode: string;
  version: string;
  componentsCount: number;
  status: 'ACTIVE' | 'ARCHIVED' | 'DRAFT';
  components: ComponentItem[];
  laborHours: number;
  laborRate: number;
  overheadAllocation: number;
  createdAt: string;
}

interface BomManagementProps {
  products: any[];
  currencySymbol?: string;
}

export default function BomManagement({ products = [], currencySymbol = '$' }: BomManagementProps) {
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});

  const toggleNode = (nodeId: string) => {
    setExpandedNodes(prev => ({ ...prev, [nodeId]: !prev[nodeId] }));
  };

  const isServiceItemProduct = (prodId: string): boolean => {
    const prod = products.find(p => p.id === prodId);
    if (!prod) return false;
    const uomLower = (prod.uom || "").toLowerCase();
    const categoryLower = (prod.category?.name || "").toLowerCase();
    const nameLower = (prod.name || "").toLowerCase();
    return (
      uomLower.includes("hour") ||
      uomLower.includes("hrs") ||
      uomLower.includes("serv") ||
      uomLower.includes("labor") ||
      uomLower.includes("labour") ||
      categoryLower.includes("service") ||
      categoryLower.includes("process") ||
      nameLower.includes("service") ||
      nameLower.includes("labor") ||
      nameLower.includes("labour")
    );
  };

  const renderBOMTree = (components: ComponentItem[], parentQty = 1, depth = 0, parentPath = '') => {
    return components.map((comp, idx) => {
      const nodePath = `${parentPath}-${comp.productId}-${idx}`;
      const subBom = comp.subBomId
        ? bomsList.find(b => b.id === comp.subBomId)
        : bomsList.find(b => b.finishedProductId === comp.productId && b.status === 'ACTIVE');
      const isExpanded = !!expandedNodes[nodePath];
      const quantity = comp.qtyRequired * parentQty;

      return (
        <div key={nodePath} className="flex flex-col">
          <div className="flex justify-between items-center text-[11px] py-1.5 border-b border-slate-900/30 last:border-b-0">
            <div className="flex items-center" style={{ paddingLeft: `${depth * 16}px` }}>
              {subBom ? (
                <button
                  type="button"
                  onClick={() => toggleNode(nodePath)}
                  className="p-0.5 hover:bg-slate-800 rounded mr-1.5 text-indigo-400 focus:outline-none bg-transparent border-0 cursor-pointer flex items-center justify-center w-4 h-4"
                >
                  <span className="font-bold text-[8px] font-mono">{isExpanded ? '▼' : '▶'}</span>
                </button>
              ) : (
                <span className="w-4.5 block text-center text-slate-600 mr-1.5 text-[8px]">•</span>
              )}
              <span className={`text-slate-300 font-medium flex items-center flex-wrap gap-1.5 ${subBom ? 'text-indigo-300 font-bold' : ''}`}>
                {comp.name}
                {subBom && (
                  <span className="px-1.5 py-0.25 rounded text-[7px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 uppercase tracking-wide">
                    Nested BOM ({subBom.version})
                  </span>
                )}
                {isServiceItemProduct(comp.productId) && (
                  <span className="px-1.5 py-0.25 rounded text-[7px] font-bold bg-amber-500/10 text-amber-450 border border-amber-500/25 uppercase tracking-wide">
                    Process / Service
                  </span>
                )}
              </span>
            </div>
            <span className="font-mono text-slate-455 text-right shrink-0">
              {formatNumber(quantity)} {comp.unit}
              {comp.wasteMargin > 0 && <span className="text-[9px] text-amber-500/80 ml-1">(+{comp.wasteMargin}%)</span>}
            </span>
          </div>
          {subBom && isExpanded && (
            <div className="border-l border-slate-800/85 ml-2 pl-1 mt-0.5 mb-1 bg-slate-950/15 rounded-r-lg">
              {renderBOMTree(subBom.components, quantity, depth + 1, nodePath)}
            </div>
          )}
        </div>
      );
    });
  };

  const formatLaborTime = (hours: number): string => {
    if (hours === 0) return '0h';
    const totalSeconds = Math.round(hours * 3600);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    
    const parts: string[] = [];
    if (h > 0) parts.push(`${h}h`);
    if (m > 0) parts.push(`${m}m`);
    if (s > 0) parts.push(`${s}s`);
    return parts.join(' ');
  };

  const [activeTab, setActiveTab] = useState<'list' | 'costing'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [showAddModal, setShowAddModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Mapped finished goods from Product Master
  const finishedProductsCatalog = products.length > 0 ? products : [];

  // Mapped raw material options from Product Master
  const rawMaterialsCatalog = products.length > 0 ? products : [];

  // BOM List - Initialized from Backend
  const [bomsList, setBomsList] = useState<BOM[]>([]);
  const [loading, setLoading] = useState(false);

  const [routings, setRoutings] = useState<any[]>([]);
  const [workCenters, setWorkCenters] = useState<any[]>([]);
  const [modalTab, setModalTab] = useState<'components' | 'routing'>('components');

  const [exportBom, setExportBom] = useState<BOM | null>(null);
  const [exportQty, setExportQty] = useState<number>(1);
  const [activePrintLeaf, setActivePrintLeaf] = useState<BOM | null>(null);

  useEffect(() => {
    if (activePrintLeaf) {
      const timer = setTimeout(() => {
        window.print();
        setActivePrintLeaf(null);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [activePrintLeaf]);

  const getFlattenedLeafComponents = (finishedProductId: string, parentQty = 1, visited: string[] = [], specificBomId?: string): any[] => {
    if (visited.includes(finishedProductId)) return [];
    const currentVisited = [...visited, finishedProductId];

    const bom = specificBomId
      ? bomsList.find(b => b.id === specificBomId)
      : bomsList.find(b => b.finishedProductId === finishedProductId && b.status === 'ACTIVE');
    if (!bom) return [];

    const leaves: Record<string, { productId: string; name: string; code: string; qtyRequired: number; unit: string; costPerUnit: number }> = {};

    bom.components.forEach(comp => {
      const subBom = comp.subBomId
        ? bomsList.find(b => b.id === comp.subBomId)
        : bomsList.find(b => b.finishedProductId === comp.productId && b.status === 'ACTIVE');
      const totalQty = (Number(comp.qtyRequired) || 0) * parentQty;

      if (subBom) {
        const subLeaves = getFlattenedLeafComponents(comp.productId, totalQty, currentVisited, comp.subBomId);
        subLeaves.forEach(sl => {
          if (leaves[sl.productId]) {
            leaves[sl.productId].qtyRequired += sl.qtyRequired;
          } else {
            leaves[sl.productId] = { ...sl };
          }
        });
      } else {
        const prod = products.find(p => p.id === comp.productId);
        const code = prod?.hsnSacCode || prod?.sku || 'N/A';
        if (leaves[comp.productId]) {
          leaves[comp.productId].qtyRequired += totalQty;
        } else {
          leaves[comp.productId] = {
            productId: comp.productId,
            name: comp.name,
            code: code,
            qtyRequired: totalQty,
            unit: comp.unit,
            costPerUnit: Number(comp.costPerUnit) || 0
          };
        }
      }
    });

    return Object.values(leaves);
  };

  // routing states for modal
  const [routingName, setRoutingName] = useState('Standard Routing');
  const [routingSteps, setRoutingSteps] = useState<any[]>([]);

  // routing step input states for modal
  const [stepSeqNo, setStepSeqNo] = useState('1');
  const [stepOpName, setStepOpName] = useState('');
  const [stepWcId, setStepWcId] = useState('');
  const [stepSetupTime, setStepSetupTime] = useState('5');
  const [stepRunTime, setStepRunTime] = useState('2');

  // outsource step input states
  const [stepOperationType, setStepOperationType] = useState<'IN_HOUSE' | 'OUTSOURCED'>('IN_HOUSE');
  const [stepVendorId, setStepVendorId] = useState('');
  const [stepOutsourceCost, setStepOutsourceCost] = useState('0.0');
  const [stepLeadTimeDays, setStepLeadTimeDays] = useState('0');

  const [vendors, setVendors] = useState<any[]>([]);

  const moveStep = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === routingSteps.length - 1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const newSteps = [...routingSteps];
    
    // Swap sequence numbers
    const tempSeq = newSteps[index].sequenceNo;
    newSteps[index].sequenceNo = newSteps[targetIndex].sequenceNo;
    newSteps[targetIndex].sequenceNo = tempSeq;

    // Swap positions in array
    const tempItem = newSteps[index];
    newSteps[index] = newSteps[targetIndex];
    newSteps[targetIndex] = tempItem;

    // Sort to keep ordered by sequenceNo
    newSteps.sort((a, b) => parseInt(a.sequenceNo) - parseInt(b.sequenceNo));
    
    setRoutingSteps(newSteps);
  };

  const fetchRoutingsAndWorkCenters = async () => {
    try {
      const routingRes = await apiClient.get<any>('/api/manufacturing/routings');
      setRoutings(routingRes.routings || []);
    } catch (e) {
      console.error('Failed to load routings:', e);
    }
    try {
      const wcRes = await apiClient.get<{ workCenters: any[] }>('/api/manufacturing/work-centers');
      setWorkCenters(wcRes.workCenters || []);
    } catch (e) {
      console.error('Failed to load work centers:', e);
    }
    try {
      const vendorRes = await apiClient.get<{ vendors: any[] }>('/api/master/vendors');
      setVendors(vendorRes.vendors || []);
    } catch (e) {
      console.error('Failed to load vendors:', e);
    }
  };

  const fetchBOMs = async () => {
    setLoading(true);
    try {
      const data = await apiClient.get<{ boms: any[] }>('/api/manufacturing/boms');
      const formattedBoms: BOM[] = (data.boms || []).map((bom: any) => ({
        id: bom.id,
        name: bom.name || '',
        description: bom.description || '',
        finishedProductId: bom.finishedProductId,
        finishedProductName: bom.finishedProduct?.name || 'Standard Product',
        finishedProductCode: bom.finishedProduct?.hsnSacCode || bom.finishedProduct?.code || 'PROD-CF90',
        version: bom.version || 'v1.0',
        componentsCount: bom.components?.length || 0,
        status: bom.status || 'DRAFT',
        laborHours: Number(bom.laborHours) || 0,
        laborRate: Number(bom.laborRate) || 0,
        overheadAllocation: Number(bom.overheadAllocation) || 0,
        createdAt: bom.createdAt?.split('T')[0] || '',
        components: (bom.components || []).map((comp: any) => ({
          productId: comp.productId,
          name: comp.product?.name || 'Raw Component',
          qtyRequired: Number(comp.qtyRequired) || 0,
          unit: comp.product?.uom || 'unit',
          costPerUnit: Number(comp.product?.pricing) || Number(comp.costPerUnit) || 0,
          wasteMargin: Number(comp.wasteMargin) || 0,
          subBomId: comp.subBomId || undefined
        }))
      }));
      setBomsList(formattedBoms);
    } catch (err: any) {
      console.error('Failed to load BOMs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBOMs();
    fetchRoutingsAndWorkCenters();
  }, [products]);

  // State for creating new BOM
  const [newBomFinishedProductId, setNewBomFinishedProductId] = useState('');
  const [newBomName, setNewBomName] = useState('');
  const [newBomDescription, setNewBomDescription] = useState('');
  const [newBomVersion, setNewBomVersion] = useState('v1.0');
  const [newBomLaborTime, setNewBomLaborTime] = useState<number>(8);
  const [newBomLaborTimeUnit, setNewBomLaborTimeUnit] = useState<'HOURS' | 'MINUTES' | 'SECONDS'>('HOURS');
  const [newBomLaborRate, setNewBomLaborRate] = useState(25);
  const [newBomOverhead, setNewBomOverhead] = useState(100);
  const [newBomComponents, setNewBomComponents] = useState<ComponentItem[]>([]);

  // Temp selected raw material component to add
  const [selectedCompId, setSelectedCompId] = useState('');
  const [compQty, setCompQty] = useState(1);
  const [compWaste, setCompWaste] = useState(2);
  const [selectedSubBomId, setSelectedSubBomId] = useState('');

  // Set default dropdown selections when catalog loads
  useEffect(() => {
    if (finishedProductsCatalog.length > 0 && !newBomFinishedProductId) {
      setNewBomFinishedProductId(finishedProductsCatalog[0].id);
    }
  }, [finishedProductsCatalog, newBomFinishedProductId]);

  useEffect(() => {
    if (rawMaterialsCatalog.length > 0 && !selectedCompId) {
      setSelectedCompId(rawMaterialsCatalog[0].id);
    }
  }, [rawMaterialsCatalog, selectedCompId]);

  const addComponentToDraft = () => {
    const rawProd = rawMaterialsCatalog.find(p => p.id === selectedCompId);
    if (!rawProd) return;

    if (newBomComponents.some(c => c.productId === selectedCompId)) {
      alert("Material component already added to draft list!");
      return;
    }

    setNewBomComponents([
      ...newBomComponents,
      {
        productId: selectedCompId,
        name: rawProd.name,
        qtyRequired: Number(compQty),
        unit: rawProd.uom || 'unit',
        costPerUnit: rawProd.pricing || 0,
        wasteMargin: Number(compWaste),
        subBomId: selectedSubBomId || undefined
      }
    ]);
    setSelectedSubBomId('');
  };

  const removeComponentFromDraft = (prodId: string) => {
    setNewBomComponents(newBomComponents.filter(c => c.productId !== prodId));
  };

  const handleCreateBOMSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finishedProd = finishedProductsCatalog.find(p => p.id === newBomFinishedProductId);
    if (!finishedProd || newBomComponents.length === 0) {
      alert('Please select a target product and add at least one component.');
      return;
    }

    let calculatedHours = Number(newBomLaborTime);
    if (newBomLaborTimeUnit === 'MINUTES') {
      calculatedHours = Number(newBomLaborTime) / 60;
    } else if (newBomLaborTimeUnit === 'SECONDS') {
      calculatedHours = Number(newBomLaborTime) / 3600;
    }

    const payload = {
      name: newBomName || null,
      description: newBomDescription || null,
      finishedProductId: newBomFinishedProductId,
      version: newBomVersion,
      laborHours: calculatedHours,
      laborRate: Number(newBomLaborRate),
      overheadAllocation: Number(newBomOverhead),
      components: newBomComponents.map(c => ({
        productId: c.productId,
        qtyRequired: Number(c.qtyRequired),
        wasteMargin: Number(c.wasteMargin),
        subBomId: c.subBomId || null
      }))
    };

    try {
      if (isEditing && editingId) {
        await apiClient.put(`/api/manufacturing/boms/${editingId}`, payload);
      } else {
        await apiClient.post('/api/manufacturing/boms', payload);
      }

      // Sync routing steps with backend
      const rPayload = {
        productId: newBomFinishedProductId,
        name: routingName || 'Standard Routing',
        operations: routingSteps.map(step => ({
          sequenceNo: parseInt(step.sequenceNo) || 1,
          operationName: step.operationName,
          workCenterId: step.operationType === 'IN_HOUSE' && step.workCenterId ? step.workCenterId : null,
          setupTimeMins: step.operationType === 'IN_HOUSE' ? (parseFloat(step.setupTimeMins) || 0.0) : 0.0,
          runTimePerUnit: step.operationType === 'IN_HOUSE' ? (parseFloat(step.runTimePerUnit) || 0.0) : 0.0,
          operationType: step.operationType || 'IN_HOUSE',
          vendorId: step.operationType === 'OUTSOURCED' && step.vendorId ? step.vendorId : null,
          outsourceCost: step.operationType === 'OUTSOURCED' ? (parseFloat(step.outsourceCost) || 0.0) : 0.0,
          leadTimeDays: step.operationType === 'OUTSOURCED' ? (parseInt(step.leadTimeDays) || 0) : 0
        }))
      };

      const existingRouting = routings.find(rt => rt.productId === newBomFinishedProductId);
      if (existingRouting) {
        await apiClient.put(`/api/manufacturing/routings/${existingRouting.id}`, rPayload);
      } else {
        if (routingSteps.length > 0) {
          await apiClient.post('/api/manufacturing/routings', rPayload);
        }
      }

      setShowAddModal(false);
      setIsEditing(false);
      setEditingId(null);
      setNewBomComponents([]);
      setNewBomName('');
      setNewBomDescription('');
      setNewBomVersion('v1.0');
      setRoutingSteps([]);
      setRoutingName('Standard Routing');
      fetchBOMs();
      fetchRoutingsAndWorkCenters();
    } catch (err: any) {
      alert(err.message || 'Failed to save BOM/Routing');
    }
  };

  const handleEditBOM = (bom: BOM) => {
    setNewBomFinishedProductId(bom.finishedProductId);
    setNewBomName(bom.name || '');
    setNewBomDescription(bom.description || '');
    setNewBomVersion(bom.version);

    // Convert decimal hours back to a friendly time unit
    const hours = bom.laborHours;
    if (hours === 0) {
      setNewBomLaborTime(0);
      setNewBomLaborTimeUnit('HOURS');
    } else if (hours >= 1 && Number.isInteger(hours)) {
      setNewBomLaborTime(hours);
      setNewBomLaborTimeUnit('HOURS');
    } else if (hours * 60 >= 1 && Number.isInteger(hours * 60)) {
      setNewBomLaborTime(hours * 60);
      setNewBomLaborTimeUnit('MINUTES');
    } else {
      setNewBomLaborTime(Math.round(hours * 3600 * 100) / 100);
      setNewBomLaborTimeUnit('SECONDS');
    }

    setNewBomLaborRate(bom.laborRate);
    setNewBomOverhead(bom.overheadAllocation);
    setNewBomComponents(bom.components);

    const r = routings.find(rt => rt.productId === bom.finishedProductId);
    if (r) {
      setRoutingName(r.name || 'Standard Routing');
      setRoutingSteps((r.operations || []).map((op: any) => ({
        id: op.id,
        sequenceNo: String(op.sequenceNo),
        operationName: op.operationName,
        workCenterId: op.workCenterId || '',
        setupTimeMins: String(op.setupTimeMins),
        runTimePerUnit: String(op.runTimePerUnit),
        operationType: op.operationType || 'IN_HOUSE',
        vendorId: op.vendorId || '',
        outsourceCost: String(op.outsourceCost || 0.0),
        leadTimeDays: String(op.leadTimeDays || 0)
      })));
    } else {
      setRoutingName('Standard Routing');
      setRoutingSteps([]);
    }
    setModalTab('components');

    setIsEditing(true);
    setEditingId(bom.id);
    setShowAddModal(true);
  };

  const handleDeleteBOM = async (id: string) => {
    if (window.confirm("Are you sure you want to permanently delete this Bill of Materials formulation?")) {
      try {
        await apiClient.delete(`/api/manufacturing/boms/${id}`);
        fetchBOMs();
      } catch (err: any) {
        alert(err.message || 'Failed to delete BOM');
      }
    }
  };

  const calculateMaterialCost = (bom: BOM) => {
    return bom.components.reduce((sum, c) => {
      const grossQty = c.qtyRequired * (1 + c.wasteMargin / 100);
      return sum + (grossQty * c.costPerUnit);
    }, 0);
  };

  const filteredBOMs = (bomsList || []).filter(bom => {
    const finishedProductName = bom?.finishedProductName || '';
    const finishedProductCode = bom?.finishedProductCode || '';
    const version = bom?.version || '';
    const term = (searchTerm || '').toLowerCase();
    const matchesSearch = finishedProductName.toLowerCase().includes(term) ||
      finishedProductCode.toLowerCase().includes(term) ||
      version.toLowerCase().includes(term);
    const matchesStatus = statusFilter === 'ALL' || bom.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Dynamic Module Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-900/40 p-6 rounded-2xl border border-slate-800/80 backdrop-blur-xl animate-fade-in">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <ClipboardList className="w-5.5 h-5.5 text-indigo-400" />
            Bill of Materials (BOM) Management
          </h2>
          <p className="text-slate-400 text-xs mt-1">
            Build production formulas, define raw materials list, configure waste tolerances, and analyze precise labor & overhead allocations.
          </p>
        </div>
        <div className="flex gap-2.5">
          <button
            onClick={() => setActiveTab(activeTab === 'list' ? 'costing' : 'list')}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 hover:border-slate-600/85 text-slate-300 hover:text-white font-semibold text-xs rounded-xl transition-all cursor-pointer animate-fade-in"
          >
            <Calculator className="w-4 h-4 text-indigo-400" />
            {activeTab === 'list' ? 'View Costing Analysis' : 'Manage Formulations'}
          </button>
          <button
            onClick={() => {
              setIsEditing(false);
              setEditingId(null);
              setNewBomComponents([]);
              setNewBomName('');
              setNewBomDescription('');
              setRoutingSteps([]);
              setRoutingName('Standard Routing');
              setStepSeqNo('1');
              setStepOpName('');
              setStepWcId('');
              setStepSetupTime('5');
              setStepRunTime('2');
              setModalTab('components');
              setShowAddModal(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 active:scale-95 transition-all text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/10 cursor-pointer border-0"
          >
            <Plus className="w-4 h-4" /> Add New BOM
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400 text-xs">Loading formulation parameters...</div>
      ) : activeTab === 'list' ? (
        <div className="space-y-4 animate-fade-in text-left">
          {/* Controls */}
          <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xl">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Search formulations by product or version..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-slate-900/40 border border-slate-800/80 focus:border-indigo-500/50 py-2 pl-10 pr-4 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none transition-all"
              />
            </div>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="bg-slate-900/40 border border-slate-800/80 text-xs text-slate-300 rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500/50 cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="ARCHIVED">Archived</option>
              <option value="DRAFT">Draft</option>
            </select>
          </div>

          {/* BOM List Grid */}
          {filteredBOMs.length === 0 ? (
            <div className="p-16 text-center text-slate-500 border border-dashed border-slate-800 rounded-2xl bg-slate-900/10 flex flex-col items-center justify-center">
              <ClipboardList className="w-12 h-12 text-slate-750 mb-3" />
              <p className="font-semibold text-sm">No formulations configured</p>
              <p className="text-slate-650 text-xs mt-1">Add a new Bill of Materials recipe to calculate detailed costing sheets.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {filteredBOMs.map(bom => {
                const matCost = calculateMaterialCost(bom);
                const laborCost = bom.laborHours * bom.laborRate;
                const totalCost = matCost + laborCost + bom.overheadAllocation;

                return (
                  <div key={bom.id} className="bg-slate-900/35 border border-slate-850 p-5 rounded-2xl flex flex-col gap-4 backdrop-blur-md relative overflow-hidden transition-all hover:border-slate-800">
                    <div className="flex items-center justify-between border-b border-slate-850 pb-3">
                      <div className="text-left">
                        <span className="text-[10px] bg-indigo-500/15 border border-indigo-500/20 text-indigo-400 py-0.5 px-2 rounded-full font-bold uppercase tracking-wider">{bom.version}</span>
                        <h4 className="font-bold text-sm text-white mt-1.5">
                          {bom.name ? `${bom.name} (${bom.finishedProductName})` : bom.finishedProductName}
                        </h4>
                        {bom.description && (
                          <p className="text-[11px] text-slate-400 mt-1 italic">{bom.description}</p>
                        )}
                        <p className="text-[10px] text-slate-500 font-mono mt-0.5">{bom.finishedProductCode}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] text-slate-500 block uppercase tracking-wider font-semibold">Total Cost</span>
                        <span className="text-base font-extrabold text-white mt-1 block">{currencySymbol}{totalCost.toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="text-left">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Formulation Ingredients (Multilevel Nested Tree)</span>
                      <div className="flex flex-col gap-1 bg-slate-950/20 p-3 border border-slate-900 rounded-xl max-h-60 overflow-y-auto">
                        {renderBOMTree(bom.components, 1, 0, bom.id)}
                      </div>
                    </div>

                    {/* Visual Process Routing Steps Timeline */}
                    {(() => {
                      const r = routings.find(rt => rt.productId === bom.finishedProductId);
                      if (!r || !r.operations || r.operations.length === 0) return null;
                      return (
                        <div className="text-left border-t border-slate-850/65 pt-3.5">
                          <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest block mb-2">Process Routing Sequence</span>
                          <div className="relative border-l border-indigo-500/20 pl-4 ml-2.5 space-y-2">
                            {r.operations.map((op: any, index: number) => {
                              const isOutsource = op.operationType === 'OUTSOURCED';
                              return (
                                <div key={op.id || index} className="relative text-[10px]">
                                  <div className={`absolute -left-[20.5px] top-1.5 w-2 h-2 rounded-full border border-slate-900 shadow-[0_0_8px_rgba(99,102,241,0.5)] ${
                                    isOutsource ? 'bg-amber-500' : 'bg-indigo-500'
                                  }`} />
                                  <div className="text-slate-355 font-semibold flex items-center gap-1.5 flex-wrap">
                                    <span>Step {op.sequenceNo}: {op.operationName}</span>
                                    {isOutsource ? (
                                      <span className="text-[8px] bg-amber-500/10 text-amber-400 px-1.5 py-0.25 rounded border border-amber-500/25 uppercase font-bold tracking-wide">
                                        Outsource {op.vendor ? `@${op.vendor.name}` : ''}
                                      </span>
                                    ) : (
                                      op.workCenter && (
                                        <span className="text-[8px] bg-slate-800 text-slate-400 px-1 py-0.25 rounded border border-slate-700 font-mono">
                                          @{op.workCenter.name}
                                        </span>
                                      )
                                    )}
                                  </div>
                                  <div className="text-slate-500 text-[9px] mt-0.5">
                                    {isOutsource
                                      ? `Service Fee: {currencySymbol}${op.outsourceCost} | Lead Time: ${op.leadTimeDays}d`
                                      : `Setup: ${op.setupTimeMins}m | Run/unit: ${op.runTimePerUnit}m`
                                    }
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}

                    <div className="grid grid-cols-3 gap-2.5 border-t border-slate-850 pt-3.5 text-left">
                      <div>
                        <span className="text-[9px] text-slate-500 block uppercase font-bold tracking-wider">Materials</span>
                        <span className="text-[11px] font-bold text-slate-300">{currencySymbol}{matCost.toFixed(1)}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-500 block uppercase font-bold tracking-wider">Labor Time</span>
                        <span className="text-[11px] font-bold text-slate-300">{currencySymbol}{laborCost.toFixed(1)} <span className="text-[9px] text-slate-500">({formatLaborTime(bom.laborHours)})</span></span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-500 block uppercase font-bold tracking-wider">Overhead</span>
                        <span className="text-[11px] font-bold text-slate-300">{currencySymbol}{bom.overheadAllocation.toFixed(1)}</span>
                      </div>
                    </div>

                    {/* Edit & Delete Action Bar */}
                    <div className="flex justify-end gap-2 border-t border-slate-850/60 pt-3">
                      <button
                        type="button"
                        onClick={() => {
                          setExportBom(bom);
                          setExportQty(1);
                        }}
                        className="px-2.5 py-1 bg-emerald-650/10 hover:bg-emerald-650 text-emerald-400 hover:text-white rounded-lg text-[10px] uppercase font-bold cursor-pointer transition-all border-0 bg-transparent flex items-center gap-1"
                      >
                        <Download className="w-3 h-3" /> Explode Leaves
                      </button>
                      <button
                        onClick={() => handleEditBOM(bom)}
                        className="px-2.5 py-1 bg-indigo-650/10 hover:bg-indigo-650 text-indigo-400 hover:text-white rounded-lg text-[10px] uppercase font-bold cursor-pointer transition-all border-0 bg-transparent flex items-center gap-1"
                      >
                        <Edit2 className="w-3 h-3" /> Edit
                      </button>
                      <button
                        onClick={() => handleDeleteBOM(bom.id)}
                        className="px-2.5 py-1 bg-rose-650/10 hover:bg-rose-600 text-rose-400 hover:text-white rounded-lg text-[10px] uppercase font-bold cursor-pointer transition-all border-0 bg-transparent flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* Costing & Variance Analysis Sheet */
        <div className="bg-slate-900/35 border border-slate-800/80 p-6 rounded-2xl space-y-6 backdrop-blur-xl animate-fade-in text-left">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5 uppercase tracking-wider">
              <Calculator className="w-4.5 h-4.5 text-indigo-400" />
              Corporate BOM Costing & Variance Analysis Sheets
            </h3>
            <p className="text-slate-500 text-xs mt-1">
              Visualize cost distributions, compare raw material overhead structures, and analyze margins before launching batches.
            </p>
          </div>

          {filteredBOMs.length === 0 ? (
            <div className="p-16 text-center text-slate-500 border border-dashed border-slate-800 rounded-2xl bg-slate-900/10 flex flex-col items-center justify-center">
              <Calculator className="w-12 h-12 text-slate-750 mb-3" />
              <p className="font-semibold text-sm">No costing details available</p>
              <p className="text-slate-650 text-xs mt-1">Configure and publish a BOM formulation to view detailed labor & materials absorption analytics.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {filteredBOMs.map(bom => {
                const matCost = calculateMaterialCost(bom);
                const laborCost = bom.laborHours * bom.laborRate;
                const totalCost = matCost + laborCost + bom.overheadAllocation;

                const matPercent = totalCost > 0 ? (matCost / totalCost) * 100 : 0;
                const laborPercent = totalCost > 0 ? (laborCost / totalCost) * 100 : 0;
                const overheadPercent = totalCost > 0 ? (bom.overheadAllocation / totalCost) * 100 : 0;

                return (
                  <div key={bom.id} className="p-5 bg-slate-950/30 border border-slate-850 rounded-xl space-y-4">
                    <div className="flex justify-between items-start">
                      <div className="text-left">
                        <h4 className="font-bold text-xs text-white">{bom.finishedProductName}</h4>
                        <span className="text-[9px] text-indigo-400 font-mono tracking-widest uppercase mt-0.5 block">{bom.finishedProductCode} - Version {bom.version}</span>
                      </div>
                      <span className="text-xs font-black text-indigo-400">Total: {currencySymbol}{totalCost.toFixed(0)}</span>
                    </div>

                    {/* Cost Distribution Progress Bars */}
                    <div className="space-y-2.5">
                      <div>
                        <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-1">
                          <span>Materials Cost</span>
                          <span className="font-mono text-slate-300">{currencySymbol}{matCost.toFixed(0)} ({matPercent.toFixed(1)}%)</span>
                        </div>
                        <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                          <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${matPercent}%` }}></div>
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-1">
                          <span>Labor Allocations</span>
                          <span className="font-mono text-slate-300">{currencySymbol}{laborCost.toFixed(0)} ({laborPercent.toFixed(1)}%)</span>
                        </div>
                        <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                          <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${laborPercent}%` }}></div>
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-1">
                          <span>Factory Overheads</span>
                          <span className="font-mono text-slate-300">{currencySymbol}{bom.overheadAllocation.toFixed(0)} ({overheadPercent.toFixed(1)}%)</span>
                        </div>
                        <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                          <div className="bg-amber-500 h-full rounded-full" style={{ width: `${overheadPercent}%` }}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Add/Edit BOM Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-scale-up">
            <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/20 text-left">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5 uppercase">
                <Layers className="w-4 h-4 text-indigo-400" />
                {isEditing ? 'Modify Bill of Materials (BOM) Formula' : 'Configure Bill of Materials (BOM) Formula'}
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-500 hover:text-white p-1 hover:bg-slate-800 rounded-lg transition-all border-0 bg-transparent cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateBOMSubmit} className="p-6 space-y-4 text-left">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 block mb-1">BOM Name</label>
                  <input
                    type="text"
                    value={newBomName}
                    onChange={e => setNewBomName(e.target.value)}
                    placeholder="e.g. Standard Formulation, Premium Assembly"
                    className="w-full bg-slate-950 border border-slate-850 p-2 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 block mb-1">Description / Notes</label>
                  <input
                    type="text"
                    value={newBomDescription}
                    onChange={e => setNewBomDescription(e.target.value)}
                    placeholder="Brief description of this formula"
                    className="w-full bg-slate-950 border border-slate-850 p-2 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 block mb-1">Target Product</label>
                  <select
                    value={newBomFinishedProductId}
                    onChange={e => setNewBomFinishedProductId(e.target.value)}
                    disabled={isEditing}
                    className="w-full bg-slate-950 border border-slate-850 p-2.5 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500 disabled:opacity-55"
                  >
                    {finishedProductsCatalog.map(p => {
                      const isServ = isServiceItemProduct(p.id);
                      return (
                        <option key={p.id} value={p.id}>
                          {p.name} {isServ ? '🛠️ (Service/Process)' : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 block mb-1">Formula Version</label>
                  <input
                    type="text"
                    required
                    value={newBomVersion}
                    onChange={e => setNewBomVersion(e.target.value)}
                    disabled={isEditing}
                    placeholder="e.g. v1.0"
                    className="w-full bg-slate-950 border border-slate-850 p-2 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500 disabled:opacity-55"
                  />
                </div>
              </div>

              {/* Tab Navigation */}
              <div className="flex border-b border-slate-800 my-2">
                <button
                  type="button"
                  onClick={() => setModalTab('components')}
                  className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider text-center border-b-2 transition-all ${
                    modalTab === 'components'
                      ? 'border-indigo-500 text-indigo-400 font-bold'
                      : 'border-transparent text-slate-550 hover:text-slate-300'
                  } bg-transparent cursor-pointer`}
                >
                  Components List
                </button>
                <button
                  type="button"
                  onClick={() => setModalTab('routing')}
                  className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider text-center border-b-2 transition-all ${
                    modalTab === 'routing'
                      ? 'border-indigo-500 text-indigo-400 font-bold'
                      : 'border-transparent text-slate-550 hover:text-slate-300'
                  } bg-transparent cursor-pointer`}
                >
                  Process Routing Steps ({routingSteps.length})
                </button>
              </div>

              {/* Tab Content: Components List */}
              {modalTab === 'components' && (
                <>
                  {/* Add Material to formulation */}
                  <div className="p-4 bg-slate-950/40 border border-slate-850 rounded-xl space-y-3">
                    <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest block">Add Component Material</span>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="col-span-1">
                        <label className="text-[8px] font-bold text-slate-500 uppercase block mb-1">Raw Material</label>
                        <select
                          value={selectedCompId}
                          onChange={e => {
                            setSelectedCompId(e.target.value);
                            setSelectedSubBomId('');
                          }}
                          className="w-full bg-slate-900 border border-slate-800 p-2 rounded-lg text-[10px] text-white focus:outline-none focus:border-indigo-500"
                        >
                          {rawMaterialsCatalog.map(p => {
                            const hasSubBom = bomsList.some(b => b.finishedProductId === p.id && b.status === 'ACTIVE');
                            const isServ = isServiceItemProduct(p.id);
                            let label = p.name;
                            if (isServ) label += " 🛠️ (Service/Process)";
                            else if (hasSubBom) label += " 📦 (Has Sub-BOM)";
                            return (
                              <option key={p.id} value={p.id}>{label} ({currencySymbol}{p.pricing})</option>
                            );
                          })}
                        </select>
                      </div>
                      <div>
                        <label className="text-[8px] font-bold text-slate-500 uppercase block mb-1">Qty Required</label>
                        <input
                          type="number"
                          value={compQty}
                          step="0.001"
                          onChange={e => setCompQty(Number(e.target.value))}
                          min="0.001"
                          className="w-full bg-slate-900 border border-slate-800 p-1.5 rounded-lg text-[10px] text-white focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                      <div className="flex items-end gap-2">
                        <div className="flex-1">
                          <label className="text-[8px] font-bold text-slate-500 uppercase block mb-1">Waste Margin (%)</label>
                          <input
                            type="number"
                            value={compWaste}
                            onChange={e => setCompWaste(Number(e.target.value))}
                            min="0"
                            className="w-full bg-slate-900 border border-slate-800 p-1.5 rounded-lg text-[10px] text-white focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Sub-BOM optional version selector */}
                    {(() => {
                      const selectedProductBoms = bomsList.filter(b => b.finishedProductId === selectedCompId);
                      if (selectedProductBoms.length === 0) return null;
                      return (
                        <div className="grid grid-cols-3 gap-3 mt-1.5">
                          <div className="col-span-2">
                            <label className="text-[8px] font-bold text-slate-500 uppercase block mb-1">Specific Sub-BOM version override</label>
                            <select
                              value={selectedSubBomId}
                              onChange={e => setSelectedSubBomId(e.target.value)}
                              className="w-full bg-slate-900 border border-slate-800 p-1.5 rounded-lg text-[10px] text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                            >
                              <option value="">-- Active Standard BOM --</option>
                              {selectedProductBoms.map(b => (
                                <option key={b.id} value={b.id}>Version {b.version}</option>
                              ))}
                            </select>
                          </div>
                          <div className="flex items-end">
                            <button
                              type="button"
                              onClick={addComponentToDraft}
                              className="w-full py-1.5 bg-indigo-650/20 text-indigo-400 hover:bg-indigo-600 hover:text-white font-extrabold text-[10px] uppercase rounded-lg border-0 cursor-pointer transition-all"
                            >
                              Add component
                            </button>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Fallback button if there are no sub-BOM versions to select */}
                    {bomsList.filter(b => b.finishedProductId === selectedCompId).length === 0 && (
                      <div className="flex justify-end mt-2">
                        <button
                          type="button"
                          onClick={addComponentToDraft}
                          className="px-3.5 py-1.5 bg-indigo-650/20 text-indigo-400 hover:bg-indigo-600 hover:text-white font-extrabold text-[10px] uppercase rounded-lg border-0 cursor-pointer transition-all"
                        >
                          Add component
                        </button>
                      </div>
                    )}

                    {/* Draft list inside modal */}
                    {newBomComponents.length > 0 && (
                      <div className="mt-3 border-t border-slate-900 pt-3 space-y-2 max-h-[140px] overflow-y-auto">
                        {newBomComponents.map((item, idx) => {
                          const subBom = bomsList.find(b => b.id === item.subBomId);
                          return (
                            <div key={idx} className="flex justify-between items-center bg-slate-900/50 p-2 border border-slate-850 rounded-lg text-[11px]">
                              <span className="font-semibold text-slate-200">
                                {item.name}
                                {subBom && <span className="text-[9px] text-indigo-400 font-mono ml-2">({subBom.version})</span>}
                              </span>
                              <div className="flex items-center gap-3">
                                <span className="font-mono text-slate-400">{formatNumber(item.qtyRequired)} {item.unit} (Waste: {item.wasteMargin}%)</span>
                                <button
                                  type="button"
                                  onClick={() => removeComponentFromDraft(item.productId)}
                                  className="p-1 text-rose-500 hover:bg-rose-500/10 rounded border-0 bg-transparent cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Labor time and Overheads */}
                  <div className="grid grid-cols-4 gap-4 pt-2">
                    <div className="col-span-2">
                      <label className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 block mb-1">Labor Time</label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          value={newBomLaborTime}
                          step="any"
                          onChange={e => setNewBomLaborTime(Number(e.target.value))}
                          min="0"
                          className="w-2/3 bg-slate-950 border border-slate-850 p-2 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                        />
                        <select
                          value={newBomLaborTimeUnit}
                          onChange={e => setNewBomLaborTimeUnit(e.target.value as any)}
                          className="w-1/3 bg-slate-950 border border-slate-850 p-2 rounded-lg text-[10px] text-white focus:outline-none focus:border-indigo-500"
                        >
                          <option value="HOURS">Hours</option>
                          <option value="MINUTES">Minutes</option>
                          <option value="SECONDS">Seconds</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 block mb-1">Labor Rate/hr ({currencySymbol})</label>
                      <input
                        type="number"
                        value={newBomLaborRate}
                        step="0.01"
                        onChange={e => setNewBomLaborRate(Number(e.target.value))}
                        min="0"
                        className="w-full bg-slate-950 border border-slate-850 p-2 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 block mb-1">Overhead Allocation ({currencySymbol})</label>
                      <input
                        type="number"
                        value={newBomOverhead}
                        step="0.01"
                        onChange={e => setNewBomOverhead(Number(e.target.value))}
                        min="0"
                        className="w-full bg-slate-950 border border-slate-850 p-2 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Tab Content: Process Routing Steps */}
              {modalTab === 'routing' && (
                <div className="space-y-4">
                  {/* Routing Name */}
                  <div>
                    <label className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 block mb-1">Routing Sequence Name</label>
                    <input
                      type="text"
                      value={routingName}
                      onChange={e => setRoutingName(e.target.value)}
                      placeholder="e.g. Standard Routing, Assembly Flow"
                      className="w-full bg-slate-950 border border-slate-850 p-2 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  {/* Add routing operation form */}
                  <div className="p-4 bg-slate-950/40 border border-slate-850 rounded-xl space-y-3">
                    <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest block">Add Routing Operation</span>
                    
                    <div className="grid grid-cols-4 gap-2.5">
                      <div className="col-span-1">
                        <label className="text-[8px] font-bold text-slate-500 uppercase block mb-1">Seq No</label>
                        <input
                          type="number"
                          step="1"
                          value={stepSeqNo}
                          onChange={e => setStepSeqNo(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 p-1.5 rounded-lg text-[10px] text-white focus:outline-none focus:border-indigo-500 font-mono"
                        />
                      </div>
                      <div className="col-span-3">
                        <label className="text-[8px] font-bold text-slate-500 uppercase block mb-1">Operation Name</label>
                        <input
                          type="text"
                          value={stepOpName}
                          onChange={e => setStepOpName(e.target.value)}
                          placeholder="e.g. Molding / Plating Service"
                          className="w-full bg-slate-900 border border-slate-800 p-1.5 rounded-lg text-[10px] text-white focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-2.5">
                      <div className="col-span-2">
                        <label className="text-[8px] font-bold text-slate-500 uppercase block mb-1">Operation Type</label>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setStepOperationType('IN_HOUSE')}
                            className={`flex-1 py-1.5 rounded text-[9px] font-bold border cursor-pointer ${
                              stepOperationType === 'IN_HOUSE'
                                ? 'bg-indigo-650 border-indigo-550 text-white'
                                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                            }`}
                          >
                            In-House
                          </button>
                          <button
                            type="button"
                            onClick={() => setStepOperationType('OUTSOURCED')}
                            className={`flex-1 py-1.5 rounded text-[9px] font-bold border cursor-pointer ${
                              stepOperationType === 'OUTSOURCED'
                                ? 'bg-indigo-650 border-indigo-550 text-white'
                                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                            }`}
                          >
                            Outsourced
                          </button>
                        </div>
                      </div>

                      {stepOperationType === 'IN_HOUSE' ? (
                        <div className="col-span-2">
                          <label className="text-[8px] font-bold text-slate-500 uppercase block mb-1">Work Center</label>
                          <select
                            value={stepWcId}
                            onChange={e => setStepWcId(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 p-1.5 rounded-lg text-[10px] text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                          >
                            <option value="">-- No Work Center --</option>
                            {workCenters.map(wc => (
                              <option key={wc.id} value={wc.id}>{wc.name} ({wc.code})</option>
                            ))}
                          </select>
                        </div>
                      ) : (
                        <div className="col-span-2">
                          <label className="text-[8px] font-bold text-slate-500 uppercase block mb-1">Subcontractor Vendor</label>
                          <select
                            value={stepVendorId}
                            onChange={e => setStepVendorId(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 p-1.5 rounded-lg text-[10px] text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                          >
                            <option value="">-- Select Vendor --</option>
                            {vendors.map(v => (
                              <option key={v.id} value={v.id}>{v.name}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>

                    {stepOperationType === 'IN_HOUSE' ? (
                      <div className="grid grid-cols-3 gap-3 pt-1">
                        <div>
                          <label className="text-[8px] font-bold text-slate-500 uppercase block mb-1">Setup Mins</label>
                          <input
                            type="number"
                            value={stepSetupTime}
                            onChange={e => setStepSetupTime(e.target.value)}
                            min="0"
                            className="w-full bg-slate-900 border border-slate-800 p-1.5 rounded-lg text-[10px] text-white focus:outline-none focus:border-indigo-500 font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-[8px] font-bold text-slate-500 uppercase block mb-1">Run Time/Unit</label>
                          <input
                            type="number"
                            step="0.001"
                            value={stepRunTime}
                            onChange={e => setStepRunTime(e.target.value)}
                            min="0"
                            className="w-full bg-slate-900 border border-slate-800 p-1.5 rounded-lg text-[10px] text-white focus:outline-none focus:border-indigo-500 font-mono"
                          />
                        </div>
                        <div className="flex items-end">
                          <button
                            type="button"
                            onClick={() => {
                              if (!stepOpName) {
                                alert('Operation Name is required');
                                return;
                              }
                              const seq = parseInt(stepSeqNo) || 1;
                              if (routingSteps.some(s => parseInt(s.sequenceNo) === seq)) {
                                alert(`Sequence number ${seq} is already in use.`);
                                return;
                              }
                              const updatedSteps = [
                                ...routingSteps,
                                {
                                  sequenceNo: String(seq),
                                  operationName: stepOpName,
                                  workCenterId: stepWcId,
                                  setupTimeMins: String(parseFloat(stepSetupTime) || 0),
                                  runTimePerUnit: String(parseFloat(stepRunTime) || 0),
                                  operationType: 'IN_HOUSE',
                                  vendorId: '',
                                  outsourceCost: '0.0',
                                  leadTimeDays: '0'
                                }
                              ].sort((a, b) => parseInt(a.sequenceNo) - parseInt(b.sequenceNo));
                              
                              setRoutingSteps(updatedSteps);
                              setStepSeqNo(String(seq + 1));
                              setStepOpName('');
                            }}
                            className="w-full py-1.5 bg-indigo-650/20 text-indigo-400 hover:bg-indigo-600 hover:text-white font-extrabold text-[10px] uppercase rounded-lg border-0 cursor-pointer transition-all"
                          >
                            Add Step
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-3 pt-1">
                        <div>
                          <label className="text-[8px] font-bold text-slate-500 uppercase block mb-1">Fee/Unit ({currencySymbol})</label>
                          <input
                            type="number"
                            step="0.01"
                            value={stepOutsourceCost}
                            onChange={e => setStepOutsourceCost(e.target.value)}
                            min="0"
                            className="w-full bg-slate-900 border border-slate-800 p-1.5 rounded-lg text-[10px] text-white focus:outline-none focus:border-indigo-500 font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-[8px] font-bold text-slate-500 uppercase block mb-1">Lead Time (Days)</label>
                          <input
                            type="number"
                            step="1"
                            value={stepLeadTimeDays}
                            onChange={e => setStepLeadTimeDays(e.target.value)}
                            min="0"
                            className="w-full bg-slate-900 border border-slate-800 p-1.5 rounded-lg text-[10px] text-white focus:outline-none focus:border-indigo-500 font-mono"
                          />
                        </div>
                        <div className="flex items-end">
                          <button
                            type="button"
                            onClick={() => {
                              if (!stepOpName) {
                                alert('Operation Name is required');
                                return;
                              }
                              if (!stepVendorId) {
                                alert('Subcontractor vendor must be selected');
                                return;
                              }
                              const seq = parseInt(stepSeqNo) || 1;
                              if (routingSteps.some(s => parseInt(s.sequenceNo) === seq)) {
                                alert(`Sequence number ${seq} is already in use.`);
                                return;
                              }
                              const updatedSteps = [
                                ...routingSteps,
                                {
                                  sequenceNo: String(seq),
                                  operationName: stepOpName,
                                  workCenterId: '',
                                  setupTimeMins: '0',
                                  runTimePerUnit: '0',
                                  operationType: 'OUTSOURCED',
                                  vendorId: stepVendorId,
                                  outsourceCost: String(parseFloat(stepOutsourceCost) || 0),
                                  leadTimeDays: String(parseInt(stepLeadTimeDays) || 0)
                                }
                              ].sort((a, b) => parseInt(a.sequenceNo) - parseInt(b.sequenceNo));
                              
                              setRoutingSteps(updatedSteps);
                              setStepSeqNo(String(seq + 1));
                              setStepOpName('');
                              setStepVendorId('');
                              setStepOutsourceCost('0.0');
                              setStepLeadTimeDays('0');
                            }}
                            className="w-full py-1.5 bg-indigo-650/20 text-indigo-400 hover:bg-indigo-600 hover:text-white font-extrabold text-[10px] uppercase rounded-lg border-0 cursor-pointer transition-all"
                          >
                            Add Step
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Steps List */}
                  {routingSteps.length > 0 ? (
                    <div className="space-y-2 max-h-[180px] overflow-y-auto border border-slate-850 rounded-xl p-3 bg-slate-950/10">
                      {routingSteps.map((step, idx) => {
                        const wc = workCenters.find(w => w.id === step.workCenterId);
                        const vendor = vendors.find(v => v.id === step.vendorId);
                        const isOutsource = step.operationType === 'OUTSOURCED';
                        return (
                          <div key={idx} className={`flex justify-between items-center p-2 border rounded-lg text-[11px] ${
                            isOutsource
                              ? 'bg-amber-950/15 border-amber-900/40'
                              : 'bg-slate-900/50 border-slate-850'
                          }`}>
                            <div className="text-left flex-1">
                              <span className={`font-bold font-mono mr-2 ${isOutsource ? 'text-amber-450' : 'text-indigo-400'}`}>Step {step.sequenceNo}:</span>
                              <span className="font-semibold text-slate-200">{step.operationName}</span>
                              {isOutsource ? (
                                <span className="px-1.5 py-0.25 rounded text-[8px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 ml-2 uppercase tracking-wide">
                                  Outsource {vendor ? `@${vendor.name}` : ''}
                                </span>
                              ) : (
                                wc && (
                                  <span className="text-[8px] bg-slate-800 text-slate-400 px-1 py-0.25 rounded border border-slate-700 ml-2 font-mono">
                                    @{wc.name}
                                  </span>
                                )
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-slate-400 text-[10px] mr-2">
                                {isOutsource
                                  ? `Cost: {currencySymbol}${step.outsourceCost} | LT: ${step.leadTimeDays}d`
                                  : `Setup: ${step.setupTimeMins}m | Run/u: ${step.runTimePerUnit}m`
                                }
                              </span>
                              <button
                                type="button"
                                onClick={() => moveStep(idx, 'up')}
                                disabled={idx === 0}
                                className={`p-1 rounded border-0 bg-transparent cursor-pointer ${
                                  idx === 0 ? 'text-slate-700 cursor-not-allowed' : 'text-indigo-400 hover:bg-indigo-500/15'
                                }`}
                                title="Move Step Up"
                              >
                                <ArrowUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => moveStep(idx, 'down')}
                                disabled={idx === routingSteps.length - 1}
                                className={`p-1 rounded border-0 bg-transparent cursor-pointer ${
                                  idx === routingSteps.length - 1 ? 'text-slate-700 cursor-not-allowed' : 'text-indigo-400 hover:bg-indigo-500/15'
                                }`}
                                title="Move Step Down"
                              >
                                <ArrowDown className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setRoutingSteps(routingSteps.filter((_, i) => i !== idx));
                                }}
                                className="p-1 text-rose-500 hover:bg-rose-500/10 rounded border-0 bg-transparent cursor-pointer animate-fade-in"
                                title="Delete Step"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-slate-500 italic text-[10px]">No process routing steps configured yet. Configure operations above to route job cards.</div>
                  )}
                </div>
              )}

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
                  disabled={newBomComponents.length === 0}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl border-0 cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                >
                  {isEditing ? 'Save Changes' : 'Publish Formula'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL: EXPLODE LEAF COMPONENTS SUMMARY
          ========================================== */}
      {exportBom && (() => {
        const leafItems = getFlattenedLeafComponents(exportBom.finishedProductId, 1, [], exportBom.id);
        const totalLeafCost = leafItems.reduce((sum, item) => sum + (item.qtyRequired * exportQty * item.costPerUnit), 0);

        const handleCsvDownload = () => {
          const headers = ['Product Code', 'Product Name', 'Quantity Required', 'Unit', 'Unit Cost (INR)', 'Total Estimated Cost (INR)'];
          const rows = leafItems.map(item => [
            item.code,
            item.name,
            (item.qtyRequired * exportQty).toFixed(4),
            item.unit,
            item.costPerUnit,
            (item.qtyRequired * exportQty * item.costPerUnit).toFixed(2)
          ]);

          const csvContent = "data:text/csv;charset=utf-8," 
            + [headers.join(','), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))].join("\n");
          
          const encodedUri = encodeURI(csvContent);
          const link = document.createElement("a");
          link.setAttribute("href", encodedUri);
          link.setAttribute("download", `BOM_Leaf_Components_${exportBom.finishedProductName.replace(/\s+/g, '_')}.csv`);
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        };

        return (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in text-left">
            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl w-full max-w-3xl p-6 relative shadow-2xl animate-scale-up max-h-[90vh] overflow-y-auto animate-fade-in">
              <button 
                onClick={() => setExportBom(null)}
                className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-white cursor-pointer bg-transparent border-0"
              >
                ✕
              </button>

              <div className="flex items-center gap-3 pb-3 border-b border-[var(--border-color)]">
                <div className="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-400 border border-emerald-500/20">
                  <Layers className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-[var(--text-primary)] font-display">
                    Leaf Materials Checklist Studio
                  </h3>
                  <p className="text-[var(--text-secondary)] text-[10px]">
                    Exploded flattened end-point raw material checklist required for batch production runs of <strong>{exportBom.finishedProductName}</strong>
                  </p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Target Qty */}
                <div>
                  <label className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block mb-1">Target Production Run Quantity</label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    value={exportQty}
                    onChange={e => setExportQty(Math.max(1, parseFloat(e.target.value) || 1))}
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-emerald-500/50 py-2 px-3 rounded-lg text-xs text-[var(--text-primary)] focus:outline-none font-mono"
                  />
                </div>

                {/* Total Cost Valuation */}
                <div className="bg-[var(--bg-tertiary)]/30 border border-[var(--border-color)]/60 rounded-xl p-3 flex flex-col justify-center text-xs font-mono text-[var(--text-secondary)]">
                  <span className="flex justify-between">
                    <span>Base Formulation Unit Cost:</span> 
                    <span>{currencySymbol}{(totalLeafCost / exportQty).toFixed(2)}</span>
                  </span>
                  <span className="flex justify-between border-t border-[var(--border-color)]/60 pt-1 text-sm font-bold text-emerald-450 mt-1">
                    <span>Batch Valuation Total:</span> 
                    <span>{currencySymbol}{totalLeafCost.toFixed(2)}</span>
                  </span>
                </div>
              </div>

              {/* Leaf Nodes Table */}
              <div className="border border-[var(--border-color)] rounded-xl mt-4 overflow-hidden">
                <div className="max-h-72 overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-[var(--bg-tertiary)] border-b border-[var(--border-color)] text-[var(--text-secondary)] font-bold">
                        <th className="p-2.5 text-[9px] uppercase tracking-wider">Product Code</th>
                        <th className="p-2.5 text-[9px] uppercase tracking-wider">Product Name</th>
                        <th className="p-2.5 text-[9px] uppercase tracking-wider text-right font-bold">Qty Req</th>
                        <th className="p-2.5 text-[9px] uppercase tracking-wider">Unit</th>
                        <th className="p-2.5 text-[9px] uppercase tracking-wider text-right">Cost/Unit</th>
                        <th className="p-2.5 text-[9px] uppercase tracking-wider text-right font-bold">Total Cost</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leafItems.map((item, idx) => {
                        const scaledQty = item.qtyRequired * exportQty;
                        const itemTotalCost = scaledQty * item.costPerUnit;
                        return (
                          <tr key={item.productId || idx} className="border-b border-[var(--border-color)]/40 last:border-0 hover:bg-slate-900/25">
                            <td className="p-2.5 font-mono text-slate-400 text-[10px]">{item.code}</td>
                            <td className="p-2.5 font-semibold text-slate-200">{item.name}</td>
                            <td className="p-2.5 text-right font-mono text-white">{scaledQty.toFixed(3)}</td>
                            <td className="p-2.5 text-slate-400 text-[10px]">{item.unit}</td>
                            <td className="p-2.5 text-right font-mono text-slate-400 font-mono">{currencySymbol}{item.costPerUnit.toFixed(2)}</td>
                            <td className="p-2.5 text-right font-mono text-emerald-400 font-bold">{currencySymbol}{itemTotalCost.toFixed(2)}</td>
                          </tr>
                        );
                      })}
                      {leafItems.length === 0 && (
                        <tr>
                          <td colSpan={6} className="text-center py-6 text-slate-500 italic">No leaf components found for this design</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-3 mt-4 border-t border-[var(--border-color)] pt-4 justify-end">
                <button
                  type="button"
                  onClick={() => setExportBom(null)}
                  className="px-4 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-color)] hover:text-[var(--text-primary)] font-bold text-xs rounded-xl cursor-pointer transition-all"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleCsvDownload}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-indigo-400 hover:text-indigo-300 font-bold text-xs rounded-xl cursor-pointer transition-all border border-slate-700 flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" /> Download CSV
                </button>
                <button
                  type="button"
                  onClick={() => setActivePrintLeaf(exportBom)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl cursor-pointer transition-all flex items-center gap-1.5 shadow-lg shadow-emerald-600/10 border-0"
                >
                  <Printer className="w-3.5 h-3.5" /> Print Summary
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ==========================================
          HIDDEN PRINT CONTAINER FOR BATCH BOM LEAF SUMMARY
          ========================================== */}
      {activePrintLeaf && (() => {
        const leafItems = getFlattenedLeafComponents(activePrintLeaf.finishedProductId, 1, [], activePrintLeaf.id);
        const totalLeafCost = leafItems.reduce((sum, item) => sum + (item.qtyRequired * exportQty * item.costPerUnit), 0);

        return (
          <div id="print-section" className="hidden print:block fixed inset-0 z-[99999] bg-white text-black p-10 select-text">
            <style dangerouslySetInnerHTML={{__html: `
              @media print {
                body * {
                  visibility: hidden !important;
                }
                #print-section, #print-section * {
                  visibility: visible !important;
                }
                #print-section {
                  position: absolute !important;
                  left: 0 !important;
                  top: 0 !important;
                  width: 100% !important;
                  background: white !important;
                  color: black !important;
                }
              }
            `}} />
            <div className="space-y-6">
              {/* Header */}
              <div className="border-b-2 border-emerald-600 pb-5">
                <div className="text-xl font-extrabold uppercase text-emerald-700">Exploded Leaf Materials Summary</div>
                <div className="text-[12px] font-bold text-slate-800 mt-1">Final Design Formulation: {activePrintLeaf.finishedProductName}</div>
                <div className="text-[10px] text-slate-650 mt-0.5">Version: {activePrintLeaf.version} | Finished Product Code: {activePrintLeaf.finishedProductCode}</div>
              </div>

              {/* Batch details */}
              <div className="grid grid-cols-2 gap-6 text-[11px] text-slate-800 border border-slate-200 p-3 rounded-lg bg-slate-50 font-mono">
                <div>
                  <strong>Target Batch Run Quantity:</strong> {exportQty} units
                </div>
                <div className="text-right">
                  <strong>Estimated Total Batch Cost:</strong> {currencySymbol}{totalLeafCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
              </div>

              {/* Items Table */}
              <div className="pt-2">
                <table className="w-full text-left text-[11px] border-collapse">
                  <thead>
                    <tr className="border-b-2 border-emerald-600 font-bold bg-slate-100">
                      <th className="py-2.5 px-2 text-slate-900">Product Code</th>
                      <th className="py-2.5 px-2 text-slate-900">Product Name</th>
                      <th className="py-2.5 px-2 text-right text-slate-900 font-bold">Qty Required</th>
                      <th className="py-2.5 px-2 text-slate-900">Unit</th>
                      <th className="py-2.5 px-2 text-right text-slate-900">Cost/Unit</th>
                      <th className="py-2.5 px-2 text-right text-slate-900 font-bold">Estimated Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leafItems.map((item, idx) => {
                      const scaledQty = item.qtyRequired * exportQty;
                      const itemTotalCost = scaledQty * item.costPerUnit;
                      return (
                        <tr key={item.productId || idx} className="border-b border-slate-200">
                          <td className="py-2.5 px-2 font-mono text-slate-750">{item.code}</td>
                          <td className="py-2.5 px-2 font-bold text-slate-900">{item.name}</td>
                          <td className="py-2.5 px-2 text-right font-mono text-slate-900">{scaledQty.toFixed(3)}</td>
                          <td className="py-2.5 px-2 text-slate-700">{item.unit}</td>
                          <td className="py-2.5 px-2 text-right font-mono text-slate-700">{currencySymbol}{item.costPerUnit.toFixed(2)}</td>
                          <td className="py-2.5 px-2 text-right font-mono font-bold text-slate-900">{currencySymbol}{itemTotalCost.toFixed(2)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Summary of Totals */}
              <div className="flex justify-end pt-4 border-t border-slate-200">
                <div className="w-[55%] text-[11px] text-slate-800 space-y-1.5 font-mono">
                  <div className="flex justify-between">
                    <span>Base Formulation Unit Material Cost:</span>
                    <span className="font-bold text-slate-950">{currencySymbol}{(totalLeafCost / exportQty).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between border-t-2 border-emerald-600 pt-2 text-[13px] font-extrabold text-emerald-800">
                    <span>Grand Batch Valuation Cost:</span>
                    <span>{currencySymbol}{totalLeafCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
