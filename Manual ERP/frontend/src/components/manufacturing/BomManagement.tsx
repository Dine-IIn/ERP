import React, { useState, useEffect } from 'react';
import { ClipboardList, Plus, Search, DollarSign, Calculator, Layers, Trash2, Edit2 } from 'lucide-react';
import { apiClient, formatNumber } from '../../utils/apiService';

interface ComponentItem {
  id?: string;
  productId: string;
  name: string;
  qtyRequired: number;
  unit: string;
  costPerUnit: number;
  wasteMargin: number;
}

interface BOM {
  id: string;
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
}

export default function BomManagement({ products = [] }: BomManagementProps) {
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

  const fetchBOMs = async () => {
    setLoading(true);
    try {
      const data = await apiClient.get<{ boms: any[] }>('/api/manufacturing/boms');
      const formattedBoms: BOM[] = (data.boms || []).map((bom: any) => ({
        id: bom.id,
        finishedProductId: bom.finishedProductId,
        finishedProductName: bom.finishedProduct?.name || 'Standard Product',
        finishedProductCode: bom.finishedProduct?.hsnSacCode || bom.finishedProduct?.code || 'PROD-CF90',
        version: bom.version,
        componentsCount: bom.components?.length || 0,
        status: bom.status,
        laborHours: bom.laborHours,
        laborRate: bom.laborRate,
        overheadAllocation: bom.overheadAllocation,
        createdAt: bom.createdAt?.split('T')[0] || '',
        components: (bom.components || []).map((comp: any) => ({
          productId: comp.productId,
          name: comp.product?.name || 'Raw Component',
          qtyRequired: comp.qtyRequired,
          unit: comp.product?.uom || 'unit',
          costPerUnit: comp.product?.pricing || 0,
          wasteMargin: comp.wasteMargin
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
  }, [products]);

  // State for creating new BOM
  const [newBomFinishedProductId, setNewBomFinishedProductId] = useState('');
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
        wasteMargin: Number(compWaste)
      }
    ]);
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
      finishedProductId: newBomFinishedProductId,
      version: newBomVersion,
      laborHours: calculatedHours,
      laborRate: Number(newBomLaborRate),
      overheadAllocation: Number(newBomOverhead),
      components: newBomComponents.map(c => ({
        productId: c.productId,
        qtyRequired: Number(c.qtyRequired),
        wasteMargin: Number(c.wasteMargin)
      }))
    };

    try {
      if (isEditing && editingId) {
        await apiClient.put(`/api/manufacturing/boms/${editingId}`, payload);
      } else {
        await apiClient.post('/api/manufacturing/boms', payload);
      }
      setShowAddModal(false);
      setIsEditing(false);
      setEditingId(null);
      setNewBomComponents([]);
      setNewBomVersion('v1.0');
      fetchBOMs();
    } catch (err: any) {
      alert(err.message || 'Failed to save BOM');
    }
  };

  const handleEditBOM = (bom: BOM) => {
    setNewBomFinishedProductId(bom.finishedProductId);
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

  const filteredBOMs = bomsList.filter(bom => {
    const matchesSearch = bom.finishedProductName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bom.finishedProductCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bom.version.toLowerCase().includes(searchTerm.toLowerCase());
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
                        <h4 className="font-bold text-sm text-white mt-1.5">{bom.finishedProductName}</h4>
                        <p className="text-[10px] text-slate-500 font-mono mt-0.5">{bom.finishedProductCode}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] text-slate-500 block uppercase tracking-wider font-semibold">Total Cost</span>
                        <span className="text-base font-extrabold text-white mt-1 block">₹{totalCost.toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="text-left">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Formulation Ingredients</span>
                      <div className="flex flex-col gap-1.5 bg-slate-950/20 p-3 border border-slate-900 rounded-xl">
                        {bom.components.map((comp, idx) => (
                          <div key={idx} className="flex justify-between items-center text-[11px]">
                            <span className="text-slate-300 font-medium">{comp.name}</span>
                            <span className="font-mono text-slate-400">{formatNumber(comp.qtyRequired)} {comp.unit} <span className="text-[10px] text-amber-500/80">(+{comp.wasteMargin}% waste)</span></span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2.5 border-t border-slate-850 pt-3.5 text-left">
                      <div>
                        <span className="text-[9px] text-slate-500 block uppercase font-bold tracking-wider">Materials</span>
                        <span className="text-[11px] font-bold text-slate-300">₹{matCost.toFixed(1)}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-500 block uppercase font-bold tracking-wider">Labor Time</span>
                        <span className="text-[11px] font-bold text-slate-300">₹{laborCost.toFixed(1)} <span className="text-[9px] text-slate-500">({formatLaborTime(bom.laborHours)})</span></span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-500 block uppercase font-bold tracking-wider">Overhead</span>
                        <span className="text-[11px] font-bold text-slate-300">₹{bom.overheadAllocation.toFixed(1)}</span>
                      </div>
                    </div>

                    {/* Edit & Delete Action Bar */}
                    <div className="flex justify-end gap-2 border-t border-slate-850/60 pt-3">
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
                      <span className="text-xs font-black text-indigo-400">Total: ₹{totalCost.toFixed(0)}</span>
                    </div>

                    {/* Cost Distribution Progress Bars */}
                    <div className="space-y-2.5">
                      <div>
                        <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-1">
                          <span>Materials Cost</span>
                          <span className="font-mono text-slate-300">₹{matCost.toFixed(0)} ({matPercent.toFixed(1)}%)</span>
                        </div>
                        <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                          <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${matPercent}%` }}></div>
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-1">
                          <span>Labor Allocations</span>
                          <span className="font-mono text-slate-300">₹{laborCost.toFixed(0)} ({laborPercent.toFixed(1)}%)</span>
                        </div>
                        <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                          <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${laborPercent}%` }}></div>
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-1">
                          <span>Factory Overheads</span>
                          <span className="font-mono text-slate-300">₹{bom.overheadAllocation.toFixed(0)} ({overheadPercent.toFixed(1)}%)</span>
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
                  <label className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 block mb-1">Target Product</label>
                  <select
                    value={newBomFinishedProductId}
                    onChange={e => setNewBomFinishedProductId(e.target.value)}
                    disabled={isEditing}
                    className="w-full bg-slate-950 border border-slate-850 p-2.5 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500 disabled:opacity-55"
                  >
                    {finishedProductsCatalog.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
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

              {/* Add Material to formulation */}
              <div className="p-4 bg-slate-950/40 border border-slate-850 rounded-xl space-y-3">
                <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest block">Add Component Material</span>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-[8px] font-bold text-slate-500 uppercase block mb-1">Raw Material</label>
                    <select
                      value={selectedCompId}
                      onChange={e => setSelectedCompId(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 p-2 rounded-lg text-[10px] text-white focus:outline-none focus:border-indigo-500"
                    >
                      {rawMaterialsCatalog.map(p => (
                        <option key={p.id} value={p.id}>{p.name} (₹{p.pricing})</option>
                      ))}
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
                    <button
                      type="button"
                      onClick={addComponentToDraft}
                      className="px-3.5 py-2.5 bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600 hover:text-white font-extrabold text-[10px] uppercase rounded-lg border-0 cursor-pointer transition-all"
                    >
                      Add
                    </button>
                  </div>
                </div>

                {/* Draft list inside modal */}
                {newBomComponents.length > 0 && (
                  <div className="mt-3 border-t border-slate-900 pt-3 space-y-2 max-h-[140px] overflow-y-auto">
                    {newBomComponents.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center bg-slate-900/50 p-2 border border-slate-850 rounded-lg text-[11px]">
                        <span className="font-semibold text-slate-200">{item.name}</span>
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
                    ))}
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
                  <label className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 block mb-1">Labor Rate/hr (₹)</label>
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
                  <label className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 block mb-1">Overhead Allocation (₹)</label>
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
    </div>
  );
}
