import { apiClient } from '../utils/apiService';
import React, { useState, useEffect } from 'react';
import { 
  Box, MapPin, ArrowRightLeft, SlidersHorizontal, FileText, 
  Truck, BarChart3, Plus, Search, Filter, Download, ArrowUpRight, 
  Package, AlertTriangle, Layers, QrCode, ShieldCheck, MoreHorizontal, CheckCircle, 
  RefreshCw, Trash2, Tag, Calendar, LayoutGrid, ClipboardCheck, Settings
} from 'lucide-react';

interface Props {
  activeTab?: string;
  user: any;
  token?: string;
  backendUrl?: string;
}

const InventoryWarehouse: React.FC<Props> = ({ user: _user, activeTab, token, backendUrl }) => {
  const mapping: Record<string, string> = {
    'INVENTORY_TRACKING': 'ledger',
    'INVENTORY_MULTI_WH': 'locations',
    'INVENTORY_BATCH': 'batches',
    'INVENTORY_SERIAL': 'serials',
    'INVENTORY_TRANSFERS': 'transfers',
    'INVENTORY_ADJUSTMENTS': 'adjustments',
    'INVENTORY_VALUATION': 'valuation',
    'INVENTORY_ALERTS': 'alerts',
    'INVENTORY_BARCODE': 'barcodes',
    'INVENTORY_RACK_BIN': 'rackbin',
    'INVENTORY_DISPATCH': 'dispatch',
    'INVENTORY_GRN': 'grn',
    'INVENTORY_REPORTS': 'reports',
    'INVENTORY_LEDGER': 'ledger',
    'INVENTORY_CYCLE_COUNT': 'cycle_count'
  };

  const currentTab = (activeTab && mapping[activeTab]) ? mapping[activeTab] : 'ledger';
  const [searchQuery, setSearchQuery] = useState('');
  
  // Custom states for interactive builders
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  const [showSafetyModal, setShowSafetyModal] = useState(false);
  const [barcodeGeneratorInput, setBarcodeGeneratorInput] = useState({ sku: 'POC-992', format: 'EAN-13', count: 1 });
  const [barcodePreview, setBarcodePreview] = useState<string | null>(null);
  
  // Forms states
  const [newTransfer, setNewTransfer] = useState({ item: '', from: '', to: '', qty: '', ref: '' });
  const [newAdjustment, setNewAdjustment] = useState({ item: '', type: 'Write-off', qty: '', reason: '' });
  const [safetyThresholds, setSafetyThresholds] = useState<Record<string, number>>({
    'POC-992': 50,
    'ED-104': 20,
    'WM-009': 100,
    'MK-111': 30
  });

  // Toast notification state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'warning' } | null>(null);
  const showToast = (message: string, type: 'success' | 'warning' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // --- MOCK DATABASES ---
  const [stockItems, setStockItems] = useState([
    { id: 'STK-001', name: 'Premium Office Chair', sku: 'POC-992', warehouse: 'Main Hub', qty: 245, status: 'Healthy', val: '$24,500' },
    { id: 'STK-002', name: 'Ergonomic Desk', sku: 'ED-104', warehouse: 'Main Hub', qty: 12, status: 'Low Stock', val: '$3,600' },
    { id: 'STK-003', name: 'Wireless Mouse', sku: 'WM-009', warehouse: 'East Wing', qty: 890, status: 'Healthy', val: '$13,350' },
    { id: 'STK-004', name: 'Mechanical Keyboard', sku: 'MK-111', warehouse: 'West Wing', qty: 0, status: 'Out of Stock', val: '$0' }
  ]);

  const [locationsData, setLocationsData] = useState([
    { id: 'WH-01', name: 'Main Hub', type: 'Central Warehouse', capacity: '85%', zones: 12, manager: 'John Doe', status: 'Active' },
    { id: 'WH-02', name: 'East Wing', type: 'Fulfillment Center', capacity: '45%', zones: 8, manager: 'Jane Smith', status: 'Active' },
    { id: 'WH-03', name: 'West Wing', type: 'Storage Facility', capacity: '92%', zones: 5, manager: 'Bob Wilson', status: 'Near Full' },
  ]);

  const [transfersData, setTransfersData] = useState([
    { id: 'TRF-1021', date: 'Today, 10:30 AM', from: 'Main Hub', to: 'East Wing', items: 45, status: 'In Transit', ref: 'REQ-992' },
    { id: 'TRF-1022', date: 'Yesterday', from: 'West Wing', to: 'Main Hub', items: 120, status: 'Completed', ref: 'REQ-985' },
    { id: 'TRF-1023', date: 'Oct 20, 2026', from: 'Supplier A', to: 'Main Hub', items: 500, status: 'Pending', ref: 'PO-4552' },
  ]);

  const [adjustmentsData, setAdjustmentsData] = useState([
    { id: 'ADJ-881', date: 'Today', type: 'Stock Write-off', item: 'Ergonomic Desk', qty: '-2', reason: 'Damaged in transit', value: '-$600', status: 'Approved' },
    { id: 'ADJ-882', date: 'Yesterday', type: 'Cycle Count', item: 'Wireless Mouse', qty: '+5', reason: 'Found in bin 4B', value: '+$75', status: 'Pending Review' },
  ]);

  const [grnData, setGrnData] = useState([
    { id: 'GRN-5041', poRef: 'PO-9921', supplier: 'Tech Corp', receivedDate: 'Today', items: 4, totalQty: 1200, status: 'Inspected' },
    { id: 'GRN-5042', poRef: 'PO-9905', supplier: 'Office Supplies Inc', receivedDate: 'Yesterday', items: 12, totalQty: 450, status: 'Quarantine' },
  ]);

  const [dispatchData, setDispatchData] = useState([
    { id: 'DSP-221', orderRef: 'SO-1045', customer: 'Acme Corp', method: 'FedEx Ground', items: 3, status: 'Packed' },
    { id: 'DSP-222', orderRef: 'SO-1048', customer: 'Global Tech', method: 'UPS Next Day', items: 15, status: 'Shipped' },
  ]);

  const [batchData, setBatchData] = useState([
    { code: 'LOT-2026-001', product: 'Premium Office Chair', mfgDate: '2026-01-10', expDate: '2029-01-10', qty: 150, status: 'Active' },
    { code: 'LOT-2026-002', product: 'Wireless Mouse', mfgDate: '2026-03-12', expDate: '2028-03-12', qty: 450, status: 'Active' },
    { code: 'LOT-2025-092', product: 'Ergonomic Desk', mfgDate: '2025-05-15', expDate: '2026-05-15', qty: 10, status: 'Expired' }
  ]);

  const [serialData, setSerialData] = useState([
    { sn: 'SN-ED-288301', product: 'Ergonomic Desk', warranty: 'Active (24 Months)', status: 'In Warehouse', order: 'GRN-5042' },
    { sn: 'SN-POC-900212', product: 'Premium Office Chair', warranty: 'Active (12 Months)', status: 'Sold / Dispatched', order: 'SO-1045' },
    { sn: 'SN-MK-399120', product: 'Mechanical Keyboard', warranty: 'Active (36 Months)', status: 'In Warehouse', order: 'GRN-5041' }
  ]);

  const [valuationData, setValuationData] = useState([
    { sku: 'POC-992', name: 'Premium Office Chair', qty: 245, unitCost: '$100.00', fifoVal: '$24,500', lifoVal: '$24,500', wacVal: '$24,500' },
    { sku: 'ED-104', name: 'Ergonomic Desk', qty: 12, unitCost: '$300.00', fifoVal: '$3,600', lifoVal: '$3,480', wacVal: '$3,550' },
    { sku: 'WM-009', name: 'Wireless Mouse', qty: 890, unitCost: '$15.00', fifoVal: '$13,350', lifoVal: '$13,350', wacVal: '$13,350' }
  ]);

  const [rackBinData, setRackBinData] = useState([
    { warehouse: 'Main Hub', aisle: 'Aisle A', rack: 'Rack A3', bin: 'Bin 4', item: 'Premium Office Chair', fill: '90%' },
    { warehouse: 'Main Hub', aisle: 'Aisle B', rack: 'Rack B1', bin: 'Bin 2', item: 'Ergonomic Desk', fill: '35%' },
    { warehouse: 'East Wing', aisle: 'Aisle D', rack: 'Rack D2', bin: 'Bin 5', item: 'Wireless Mouse', fill: '78%' }
  ]);

  const [cycleCountData, setCycleCountData] = useState([
    { id: 'CYC-0091', date: '2026-05-20', zone: 'Zone A (Main Hub)', items: 5, expectedQty: 300, countedQty: 298, status: 'Reconciled', variance: '-2' },
    { id: 'CYC-0092', date: '2026-05-23', zone: 'Zone B (East Wing)', items: 12, expectedQty: 890, countedQty: 895, status: 'Pending Approval', variance: '+5' }
  ]);

  // --- DATABASE SYNC & BACKEND CONNECTIVITY ---
  const [isLoaded, setIsLoaded] = useState(false);

    const apiRequest = async (endpoint: string, method = 'GET', body: any = null): Promise<any> => {
    try {
      if (method === 'GET') {
        return await apiClient.get<any>(endpoint);
      } else if (method === 'POST') {
        return await apiClient.post<any>(endpoint, body);
      } else if (method === 'PUT') {
        return await apiClient.put<any>(endpoint, body);
      } else if (method === 'PATCH') {
        return await apiClient.patch<any>(endpoint, body);
      } else if (method === 'DELETE') {
        return await apiClient.delete<any>(endpoint);
      }
    } catch (err) {
      console.error(`[API Error] ${endpoint}:`, err);
      return null;
    }
  };

  useEffect(() => {
    if (!token || !backendUrl) return;

    const loadData = async () => {
      try {
        const dbStock = await apiRequest('/api/store/inv_stock');
        if (dbStock && dbStock.length > 0) setStockItems(dbStock);
        else await apiRequest('/api/store/inv_stock/bulk', 'POST', stockItems);

        const dbLocs = await apiRequest('/api/store/inv_locations');
        if (dbLocs && dbLocs.length > 0) setLocationsData(dbLocs);
        else await apiRequest('/api/store/inv_locations/bulk', 'POST', locationsData);

        const dbTransfers = await apiRequest('/api/store/inv_transfers');
        if (dbTransfers && dbTransfers.length > 0) setTransfersData(dbTransfers);
        else await apiRequest('/api/store/inv_transfers/bulk', 'POST', transfersData);

        const dbAdjustments = await apiRequest('/api/store/inv_adjustments');
        if (dbAdjustments && dbAdjustments.length > 0) setAdjustmentsData(dbAdjustments);
        else await apiRequest('/api/store/inv_adjustments/bulk', 'POST', adjustmentsData);

        const dbGrn = await apiRequest('/api/store/inv_grn');
        if (dbGrn && dbGrn.length > 0) setGrnData(dbGrn);
        else await apiRequest('/api/store/inv_grn/bulk', 'POST', grnData);

        const dbDispatch = await apiRequest('/api/store/inv_dispatch');
        if (dbDispatch && dbDispatch.length > 0) setDispatchData(dbDispatch);
        else await apiRequest('/api/store/inv_dispatch/bulk', 'POST', dispatchData);

        const dbBatch = await apiRequest('/api/store/inv_batches');
        if (dbBatch && dbBatch.length > 0) setBatchData(dbBatch);
        else await apiRequest('/api/store/inv_batches/bulk', 'POST', batchData);

        const dbSerials = await apiRequest('/api/store/inv_serials');
        if (dbSerials && dbSerials.length > 0) setSerialData(dbSerials);
        else await apiRequest('/api/store/inv_serials/bulk', 'POST', serialData);

        const dbValuation = await apiRequest('/api/store/inv_valuation');
        if (dbValuation && dbValuation.length > 0) setValuationData(dbValuation);
        else await apiRequest('/api/store/inv_valuation/bulk', 'POST', valuationData);

        const dbRackBin = await apiRequest('/api/store/inv_rackbin');
        if (dbRackBin && dbRackBin.length > 0) setRackBinData(dbRackBin);
        else await apiRequest('/api/store/inv_rackbin/bulk', 'POST', rackBinData);

        const dbCycle = await apiRequest('/api/store/inv_cyclecount');
        if (dbCycle && dbCycle.length > 0) setCycleCountData(dbCycle);
        else await apiRequest('/api/store/inv_cyclecount/bulk', 'POST', cycleCountData);

        setIsLoaded(true);
      } catch (err) {
        console.error('Error loading Inventory data from backend:', err);
        setIsLoaded(true);
      }
    };

    loadData();
  }, [token, backendUrl]);

  useEffect(() => {
    if (!isLoaded || !token || !backendUrl) return;
    apiRequest('/api/store/inv_stock/bulk', 'POST', stockItems);
  }, [stockItems, isLoaded, token, backendUrl]);

  useEffect(() => {
    if (!isLoaded || !token || !backendUrl) return;
    apiRequest('/api/store/inv_locations/bulk', 'POST', locationsData);
  }, [locationsData, isLoaded, token, backendUrl]);

  useEffect(() => {
    if (!isLoaded || !token || !backendUrl) return;
    apiRequest('/api/store/inv_transfers/bulk', 'POST', transfersData);
  }, [transfersData, isLoaded, token, backendUrl]);

  useEffect(() => {
    if (!isLoaded || !token || !backendUrl) return;
    apiRequest('/api/store/inv_adjustments/bulk', 'POST', adjustmentsData);
  }, [adjustmentsData, isLoaded, token, backendUrl]);

  useEffect(() => {
    if (!isLoaded || !token || !backendUrl) return;
    apiRequest('/api/store/inv_grn/bulk', 'POST', grnData);
  }, [grnData, isLoaded, token, backendUrl]);

  useEffect(() => {
    if (!isLoaded || !token || !backendUrl) return;
    apiRequest('/api/store/inv_dispatch/bulk', 'POST', dispatchData);
  }, [dispatchData, isLoaded, token, backendUrl]);

  useEffect(() => {
    if (!isLoaded || !token || !backendUrl) return;
    apiRequest('/api/store/inv_batches/bulk', 'POST', batchData);
  }, [batchData, isLoaded, token, backendUrl]);

  useEffect(() => {
    if (!isLoaded || !token || !backendUrl) return;
    apiRequest('/api/store/inv_serials/bulk', 'POST', serialData);
  }, [serialData, isLoaded, token, backendUrl]);

  useEffect(() => {
    if (!isLoaded || !token || !backendUrl) return;
    apiRequest('/api/store/inv_valuation/bulk', 'POST', valuationData);
  }, [valuationData, isLoaded, token, backendUrl]);

  useEffect(() => {
    if (!isLoaded || !token || !backendUrl) return;
    apiRequest('/api/store/inv_rackbin/bulk', 'POST', rackBinData);
  }, [rackBinData, isLoaded, token, backendUrl]);

  useEffect(() => {
    if (!isLoaded || !token || !backendUrl) return;
    apiRequest('/api/store/inv_cyclecount/bulk', 'POST', cycleCountData);
  }, [cycleCountData, isLoaded, token, backendUrl]);

  // --- ACTIONS HANDLERS ---
  const handleSaveTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTransfer.item || !newTransfer.from || !newTransfer.to || !newTransfer.qty) {
      showToast('Please fill all required transfer scheduler fields', 'warning');
      return;
    }
    const nextId = newTransfer.ref || `TRF-102${transfersData.length + 1}`;
    const nTrf = {
      id: nextId,
      date: 'Today, 10:30 AM',
      from: newTransfer.from,
      to: newTransfer.to,
      items: Number(newTransfer.qty),
      status: 'In Transit',
      ref: newTransfer.ref || 'Manual Req'
    };
    setTransfersData([nTrf, ...transfersData]);
    showToast(`Inter-warehouse Transfer ${nextId} scheduled successfully`, 'success');
    setShowTransferModal(false);
    setNewTransfer({ item: '', from: '', to: '', qty: '', ref: '' });
  };

  const handleSaveAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdjustment.item || !newAdjustment.qty || !newAdjustment.reason) {
      showToast('Please fill all required adjustment fields', 'warning');
      return;
    }
    const nextId = `ADJ-88${adjustmentsData.length + 1}`;
    const nAdj = {
      id: nextId,
      date: 'Today',
      type: `Stock ${newAdjustment.type}`,
      item: newAdjustment.item,
      qty: newAdjustment.qty,
      reason: newAdjustment.reason,
      value: '-$100',
      status: 'Approved'
    };
    setAdjustmentsData([nAdj, ...adjustmentsData]);
    showToast(`Stock Adjustment ${newAdjustment.type} recorded and ledger updated`, 'success');
    setShowAdjustmentModal(false);
    setNewAdjustment({ item: '', type: 'Write-off', qty: '', reason: '' });
  };

  const handleSaveSafetyLimit = (e: React.FormEvent, sku: string, limit: number) => {
    e.preventDefault();
    setSafetyThresholds(prev => ({ ...prev, [sku]: limit }));
    showToast(`Safety Stock Threshold for SKU ${sku} set to ${limit} units`, 'success');
    setShowSafetyModal(false);
  };

  const generateBarcode = () => {
    const sn = `EAN-${Math.floor(1000000000000 + Math.random() * 9000000000000)}`;
    setBarcodePreview(sn);
    showToast('Product EAN-13 barcode generated successfully', 'success');
  };

  const renderTable = (headers: string[], data: any[], renderRow: (item: any, i: number) => React.ReactNode) => (
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
            {data.map((item, i) => renderRow(item, i))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto select-none animate-fade-in flex flex-col h-[calc(100vh-80px)] p-4 text-left relative">
      {/* Toast Alert */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl border flex items-center gap-2 shadow-2xl backdrop-blur-md animate-scale-up ${
          toast.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' :
          'bg-amber-500/10 border-amber-500/30 text-amber-400'
        }`}>
          <CheckCircle className="w-4 h-4" />
          <span className="text-xs font-semibold">{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center border-b border-[var(--border-color)] pb-4 mb-4 shrink-0">
        <div>
          <h3 className="font-bold text-xl text-[var(--text-primary)] flex items-center gap-2 font-display">
            <Box className="w-6 h-6 text-indigo-500" />
            Inventory & Warehouse Hub
          </h3>
          <p className="text-xs text-[var(--text-secondary)] mt-1">Real-time stock tracking, multi-warehouse zones, barcode scanning, and cycle counting</p>
        </div>
        <div className="flex gap-2">
          {currentTab === 'transfers' && (
            <button 
              onClick={() => setShowTransferModal(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-all shadow-lg flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Schedule Stock Transfer
            </button>
          )}
          {currentTab === 'adjustments' && (
            <button 
              onClick={() => setShowAdjustmentModal(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-all shadow-lg flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Record Adjustment
            </button>
          )}
          {currentTab === 'alerts' && (
            <button 
              onClick={() => setShowSafetyModal(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-all shadow-lg flex items-center gap-2 cursor-pointer"
            >
              <Settings className="w-4 h-4" /> Set Safety Stocks
            </button>
          )}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden">
        
        {/* VIEW 1: STOCK LEDGER TRACKING */}
        {currentTab === 'ledger' && (
          <div className="flex flex-col gap-6 animate-fade-in h-full overflow-hidden p-2">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 shrink-0">
              {[
                { title: 'Total Items in Stock', val: '14,234 units', icon: Package, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
                { title: 'Inventory Valuation', val: '$1.42M asset', icon: BarChart3, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
                { title: 'Low Stock Alerts', val: '24 SKUs', icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-500/10' },
                { title: 'Pending Transfers', val: '8 requests', icon: ArrowRightLeft, color: 'text-blue-500', bg: 'bg-blue-500/10' }
              ].map((kpi, i) => (
                <div key={i} className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl p-5 flex items-center gap-4 hover:border-indigo-500/30 transition-all shadow-sm">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${kpi.bg}`}>
                    <kpi.icon className={`w-6 h-6 ${kpi.color}`} />
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider">{kpi.title}</p>
                    <h4 className="text-base font-black text-[var(--text-primary)] font-display mt-0.5">{kpi.val}</h4>
                  </div>
                </div>
              ))}
            </div>

            {/* Main Table */}
            <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl flex flex-col overflow-hidden flex-1">
              <div className="p-4 border-b border-[var(--border-color)] flex justify-between items-center bg-[var(--bg-tertiary)]/50">
                <div className="relative w-64">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                  <input type="text" placeholder="Search SKU or Item..." className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg pl-9 pr-4 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-indigo-500 transition-colors" />
                </div>
                <button className="p-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer">
                  <Filter className="w-4 h-4" />
                </button>
              </div>
              
              <div className="overflow-x-auto flex-1 custom-scrollbar">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="sticky top-0 bg-[var(--bg-primary)]/90 backdrop-blur-sm shadow-sm z-10">
                    <tr className="border-b border-[var(--border-color)] text-[var(--text-muted)] font-bold">
                      <th className="p-4">Item Details</th>
                      <th className="p-4">Location</th>
                      <th className="p-4">Quantity</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Valuation</th>
                      <th className="p-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stockItems.map((item, i) => (
                      <tr key={i} className="border-b border-[var(--border-color)] hover:bg-[var(--bg-tertiary)]/30 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)] flex items-center justify-center">
                              <Box className="w-5 h-5 text-indigo-400" />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-[var(--text-primary)]">{item.name}</p>
                              <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">{item.sku}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-xs text-[var(--text-secondary)] font-medium">
                          <div className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-slate-400" />{item.warehouse}</div>
                        </td>
                        <td className="p-4">
                          <span className="text-sm font-black text-[var(--text-primary)] font-display">{item.qty}</span>
                          <span className="text-xs text-[var(--text-muted)] ml-1">/ {safetyThresholds[item.sku] || 30} min</span>
                        </td>
                        <td className="p-4">
                          <span className={`px-2.5 py-1 rounded-md text-[9px] font-bold uppercase tracking-wide border ${
                            item.qty > (safetyThresholds[item.sku] || 30) ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                            item.qty > 0 ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                            'bg-red-500/10 text-red-500 border-red-500/20'
                          }`}>
                            {item.qty > (safetyThresholds[item.sku] || 30) ? 'Healthy' : item.qty > 0 ? 'Low Stock' : 'Out of Stock'}
                          </span>
                        </td>
                        <td className="p-4 text-right font-mono font-bold text-[var(--text-primary)]">{item.val}</td>
                        <td className="p-4 text-center">
                          <button className="p-2 text-[var(--text-secondary)] hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-colors cursor-pointer"><ArrowUpRight className="w-4 h-4" /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 2: MULTI-WAREHOUSE LOCATIONS */}
        {currentTab === 'locations' && renderTable(
          ['ID', 'Warehouse Name', 'Type', 'Capacity', 'Zones', 'Manager', 'Status'],
          locationsData,
          (loc) => (
            <tr key={loc.id} className="hover:bg-[var(--bg-tertiary)]/30 transition-colors group text-xs">
              <td className="px-6 py-4 font-mono text-xs">{loc.id}</td>
              <td className="px-6 py-4 font-bold text-[var(--text-primary)]">{loc.name}</td>
              <td className="px-6 py-4">{loc.type}</td>
              <td className="px-6 py-4 font-bold">
                <div className="flex items-center gap-2">
                  <span className="font-mono">{loc.capacity}</span>
                  <div className="w-16 bg-[var(--bg-primary)] h-1.5 rounded-full overflow-hidden border border-[var(--border-color)]">
                    <div className={`h-full ${parseInt(loc.capacity) > 80 ? 'bg-rose-500' : 'bg-indigo-500'}`} style={{ width: loc.capacity }}></div>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4">{loc.zones} Zones</td>
              <td className="px-6 py-4">{loc.manager}</td>
              <td className="px-6 py-4">
                <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${loc.status === 'Active' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-amber-500/10 border-amber-500/20 text-amber-500'}`}>
                  {loc.status}
                </span>
              </td>
              <td className="px-6 py-4 text-right">
                <button className="text-[var(--text-muted)] hover:text-indigo-400 p-1 cursor-pointer"><MoreHorizontal className="w-4 h-4" /></button>
              </td>
            </tr>
          )
        )}

        {/* VIEW 3: BATCH MANAGEMENT */}
        {currentTab === 'batches' && renderTable(
          ['Lot Code', 'Product / SKU', 'Manufacture Date', 'Expiry Date', 'Available Qty', 'Batch Status'],
          batchData,
          (bat) => (
            <tr key={bat.code} className="hover:bg-[var(--bg-tertiary)]/30 transition-colors text-xs">
              <td className="px-6 py-4 font-mono font-bold text-indigo-400">{bat.code}</td>
              <td className="px-6 py-4 font-bold text-[var(--text-primary)]">{bat.product}</td>
              <td className="px-6 py-4 font-mono">{bat.mfgDate}</td>
              <td className="px-6 py-4 font-mono">
                <span className={bat.status === 'Expired' ? 'text-rose-400 font-bold' : ''}>{bat.expDate}</span>
              </td>
              <td className="px-6 py-4 font-mono font-bold">{bat.qty} units</td>
              <td className="px-6 py-4">
                <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${
                  bat.status === 'Active' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                }`}>
                  {bat.status}
                </span>
              </td>
              <td className="px-6 py-4 text-right">
                <button className="text-[var(--text-muted)] hover:text-indigo-400 p-1 cursor-pointer"><MoreHorizontal className="w-4 h-4" /></button>
              </td>
            </tr>
          )
        )}

        {/* VIEW 4: SERIAL NUMBER TRACKING */}
        {currentTab === 'serials' && renderTable(
          ['Serial Number', 'Linked Product', 'Warranty Term', 'Asset Status', 'Origin Document'],
          serialData,
          (ser) => (
            <tr key={ser.sn} className="hover:bg-[var(--bg-tertiary)]/30 transition-colors text-xs">
              <td className="px-6 py-4 font-mono font-bold text-indigo-400">{ser.sn}</td>
              <td className="px-6 py-4 font-bold text-[var(--text-primary)]">{ser.product}</td>
              <td className="px-6 py-4 font-semibold text-emerald-400">{ser.warranty}</td>
              <td className="px-6 py-4">
                <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${
                  ser.status === 'In Warehouse' ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400' : 'bg-slate-500/10 border-slate-500/20 text-slate-400'
                }`}>
                  {ser.status}
                </span>
              </td>
              <td className="px-6 py-4 font-mono font-bold text-[var(--text-muted)]">{ser.order}</td>
              <td className="px-6 py-4 text-right">
                <button className="text-[var(--text-muted)] hover:text-indigo-400 p-1 cursor-pointer"><MoreHorizontal className="w-4 h-4" /></button>
              </td>
            </tr>
          )
        )}

        {/* VIEW 5: STOCK TRANSFERS */}
        {currentTab === 'transfers' && renderTable(
          ['Transfer ID', 'Date', 'From', 'To', 'Items', 'Status', 'Reference'],
          transfersData,
          (trf) => (
            <tr key={trf.id} className="hover:bg-[var(--bg-tertiary)]/30 transition-colors text-xs">
              <td className="px-6 py-4 font-mono text-xs">{trf.id}</td>
              <td className="px-6 py-4">{trf.date}</td>
              <td className="px-6 py-4 font-semibold">{trf.from}</td>
              <td className="px-6 py-4 font-semibold">{trf.to}</td>
              <td className="px-6 py-4 font-mono">{trf.items} qty</td>
              <td className="px-6 py-4">
                <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${trf.status === 'Completed' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : trf.status === 'In Transit' ? 'bg-blue-500/10 border-blue-500/20 text-blue-500' : 'bg-amber-500/10 border-amber-500/20 text-amber-500'}`}>
                  {trf.status}
                </span>
              </td>
              <td className="px-6 py-4 font-mono text-xs text-[var(--text-muted)]">{trf.ref}</td>
              <td className="px-6 py-4 text-right">
                <button className="text-[var(--text-muted)] hover:text-indigo-400 p-1 cursor-pointer"><MoreHorizontal className="w-4 h-4" /></button>
              </td>
            </tr>
          )
        )}

        {/* VIEW 6: STOCK ADJUSTMENTS */}
        {currentTab === 'adjustments' && renderTable(
          ['ID', 'Date', 'Type', 'Item', 'Qty Adj.', 'Value Adj.', 'Reason', 'Status'],
          adjustmentsData,
          (adj) => (
            <tr key={adj.id} className="hover:bg-[var(--bg-tertiary)]/30 transition-colors text-xs">
              <td className="px-6 py-4 font-mono text-xs">{adj.id}</td>
              <td className="px-6 py-4">{adj.date}</td>
              <td className="px-6 py-4 font-medium">{adj.type}</td>
              <td className="px-6 py-4 font-bold text-[var(--text-primary)]">{adj.item}</td>
              <td className={`px-6 py-4 font-mono font-bold ${adj.qty.startsWith('-') ? 'text-rose-400' : 'text-emerald-400'}`}>{adj.qty}</td>
              <td className={`px-6 py-4 font-mono font-bold ${adj.value.startsWith('-') ? 'text-rose-400' : 'text-emerald-400'}`}>{adj.value}</td>
              <td className="px-6 py-4 text-[11px] text-[var(--text-secondary)]">{adj.reason}</td>
              <td className="px-6 py-4">
                <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${adj.status === 'Approved' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-amber-500/10 border-amber-500/20 text-amber-500'}`}>
                  {adj.status}
                </span>
              </td>
              <td className="px-6 py-4 text-right">
                <button className="text-[var(--text-muted)] hover:text-indigo-400 p-1 cursor-pointer"><MoreHorizontal className="w-4 h-4" /></button>
              </td>
            </tr>
          )
        )}

        {/* VIEW 7: INVENTORY VALUATION */}
        {currentTab === 'valuation' && (
          <div className="space-y-6 animate-fade-in text-left p-2 h-full overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-[var(--bg-tertiary)]/20 border border-[var(--border-color)] rounded-2xl p-4">
                <span className="text-[9px] font-bold text-[var(--text-muted)] tracking-wider uppercase block">FIFO Total Asset Valuation</span>
                <span className="text-xl font-black font-mono text-emerald-400 mt-1 block">$41,450.00</span>
                <span className="text-[8px] text-[var(--text-secondary)] block mt-0.5">First-In First-Out</span>
              </div>
              <div className="bg-[var(--bg-tertiary)]/20 border border-[var(--border-color)] rounded-2xl p-4">
                <span className="text-[9px] font-bold text-[var(--text-muted)] tracking-wider uppercase block">LIFO Asset Valuation</span>
                <span className="text-xl font-black font-mono text-indigo-400 mt-1 block">$41,330.00</span>
                <span className="text-[8px] text-[var(--text-secondary)] block mt-0.5">Last-In First-Out</span>
              </div>
              <div className="bg-[var(--bg-tertiary)]/20 border border-[var(--border-color)] rounded-2xl p-4">
                <span className="text-[9px] font-bold text-[var(--text-muted)] tracking-wider uppercase block">Weighted Average Cost (WAC)</span>
                <span className="text-xl font-black font-mono text-amber-500 mt-1 block">$41,400.00</span>
                <span className="text-[8px] text-[var(--text-secondary)] block mt-0.5">Average Cost Rolled-over</span>
              </div>
            </div>

            <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-color)] overflow-hidden">
              <div className="px-6 py-4 bg-[var(--bg-tertiary)]/40 border-b border-[var(--border-color)] flex justify-between items-center">
                <span className="text-[9px] font-bold text-[var(--text-muted)] tracking-widest uppercase block">Method Cost comparison breakdown ledger</span>
                <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-bold rounded">LIVE</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--border-color)] text-[var(--text-muted)] font-bold">
                      <th className="py-2.5 px-6">SKU</th>
                      <th className="py-2.5 px-6">Product Item</th>
                      <th className="py-2.5 px-6 font-mono text-right">Available Qty</th>
                      <th className="py-2.5 px-6 font-mono text-right">Unit cost</th>
                      <th className="py-2.5 px-6 font-mono text-right">FIFO Val</th>
                      <th className="py-2.5 px-6 font-mono text-right">LIFO Val</th>
                      <th className="py-2.5 px-6 font-mono text-right">WAC Val</th>
                    </tr>
                  </thead>
                  <tbody>
                    {valuationData.map((val, i) => (
                      <tr key={i} className="border-b border-[var(--border-color)] hover:bg-[var(--bg-primary)]/50 transition-colors">
                        <td className="py-3 px-6 font-mono font-bold text-indigo-400">{val.sku}</td>
                        <td className="py-3 px-6 font-bold text-[var(--text-primary)]">{val.name}</td>
                        <td className="py-3 px-6 font-mono text-right">{val.qty}</td>
                        <td className="py-3 px-6 font-mono text-right text-emerald-400 font-semibold">{val.unitCost}</td>
                        <td className="py-3 px-6 font-mono text-right font-bold text-[var(--text-primary)]">{val.fifoVal}</td>
                        <td className="py-3 px-6 font-mono text-right font-bold text-[var(--text-primary)]">{val.lifoVal}</td>
                        <td className="py-3 px-6 font-mono text-right font-bold text-[var(--text-primary)]">{val.wacVal}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 8: LOW STOCK ALERTS */}
        {currentTab === 'alerts' && (
          <div className="space-y-6 animate-fade-in text-left p-2 h-full overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border border-[var(--border-color)] bg-[var(--bg-tertiary)]/10 rounded-2xl p-5 space-y-4 text-xs">
                <span className="text-[9px] font-bold text-[var(--text-muted)] tracking-widest uppercase block">Requisition Safety limits</span>
                
                <div className="space-y-3">
                  {stockItems.map((item) => (
                    <div key={item.sku} className="flex justify-between items-center bg-[var(--bg-secondary)] border border-[var(--border-color)] p-3 rounded-xl">
                      <div>
                        <span className="font-bold text-[var(--text-primary)]">{item.name}</span>
                        <span className="text-[9px] text-[var(--text-secondary)] block mt-0.5">SKU: {item.sku}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[11px] font-bold text-amber-500 font-mono">Limit: {safetyThresholds[item.sku] || 30} units</span>
                        <button 
                          onClick={() => {
                            const val = prompt(`Change safety threshold for ${item.sku}:`, (safetyThresholds[item.sku] || 30).toString());
                            if (val && parseInt(val) > 0) {
                              setSafetyThresholds(prev => ({ ...prev, [item.sku]: parseInt(val) }));
                              showToast(`Limit for SKU ${item.sku} set to ${val}`, 'success');
                            }
                          }}
                          className="px-2 py-1 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 font-bold rounded cursor-pointer"
                        >
                          Edit
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Low stock alerts board */}
              <div className="border border-[var(--border-color)] bg-[var(--bg-tertiary)]/20 rounded-2xl p-4 space-y-3 text-xs flex flex-col h-full">
                <span className="text-[9px] font-bold text-[var(--text-muted)] tracking-widest uppercase block border-b border-[var(--border-color)] pb-2">Active Safety alerts trigger</span>
                
                <div className="space-y-2 flex-1 overflow-y-auto max-h-[250px] custom-scrollbar">
                  {stockItems.filter(item => item.qty <= (safetyThresholds[item.sku] || 30)).map(item => (
                    <div key={item.sku} className="flex items-center justify-between p-3 border border-rose-500/20 bg-rose-500/5 rounded-xl">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-rose-500 animate-pulse" />
                        <div>
                          <span className="font-bold text-rose-400 block">{item.name}</span>
                          <span className="text-[8px] font-mono text-[var(--text-secondary)] mt-0.5">SKU: {item.sku}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-black text-rose-400 font-mono block">{item.qty} left</span>
                        <span className="text-[8px] text-[var(--text-muted)] block">Safety: {safetyThresholds[item.sku] || 30}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 9: BARCODE GENERATOR */}
        {currentTab === 'barcodes' && (
          <div className="space-y-6 animate-fade-in text-left p-2 h-full overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Generator form */}
              <div className="border border-[var(--border-color)] bg-[var(--bg-tertiary)]/10 rounded-2xl p-5 space-y-4 text-xs">
                <span className="text-[9px] font-bold text-[var(--text-muted)] tracking-widest uppercase block">EAN/QR Label Generator</span>
                
                <div className="space-y-3">
                  <div>
                    <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Select Product SKU</label>
                    <select 
                      value={barcodeGeneratorInput.sku}
                      onChange={(e) => setBarcodeGeneratorInput({ ...barcodeGeneratorInput, sku: e.target.value })}
                      className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none"
                    >
                      {stockItems.map(item => <option key={item.sku} value={item.sku}>[{item.sku}] {item.name}</option>)}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Label Format</label>
                      <select 
                        value={barcodeGeneratorInput.format}
                        onChange={(e) => setBarcodeGeneratorInput({ ...barcodeGeneratorInput, format: e.target.value })}
                        className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none"
                      >
                        <option value="EAN-13">EAN-13 Barcode</option>
                        <option value="QR-CODE">QR Code Matrix</option>
                        <option value="UPC-A">UPC-A standard</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Print count</label>
                      <input 
                        type="number" 
                        value={barcodeGeneratorInput.count}
                        onChange={(e) => setBarcodeGeneratorInput({ ...barcodeGeneratorInput, count: parseInt(e.target.value) || 1 })}
                        className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                <button 
                  onClick={generateBarcode}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-xs shadow-md transition-colors cursor-pointer"
                >
                  Generate EAN Label PREVIEW
                </button>
              </div>

              {/* Barcode label print sheet */}
              <div className="border border-[var(--border-color)] bg-[var(--bg-tertiary)]/20 rounded-2xl p-5 flex flex-col justify-center items-center h-full">
                <span className="text-[9px] font-bold text-[var(--text-muted)] tracking-widest uppercase block border-b border-[var(--border-color)] pb-2 w-full text-center mb-6">Barcodes printable label</span>
                
                {barcodePreview ? (
                  <div className="bg-white text-black p-6 rounded-xl border border-gray-300 space-y-4 flex flex-col items-center select-none shadow">
                    <span className="font-bold text-[10px] tracking-widest font-sans">{barcodeGeneratorInput.sku} LABEL</span>
                    
                    {barcodeGeneratorInput.format === 'QR-CODE' ? (
                      <QrCode className="w-24 h-24 text-black" />
                    ) : (
                      <div className="flex flex-col items-center space-y-1">
                        {/* Simulated EAN barcode */}
                        <div className="flex h-12 gap-0.5 justify-center items-center">
                          {[1,2,4,1,3,1,1,4,2,1,1,2,3,1,4,1,2,3,1,1,2,4,1].map((w, idx) => (
                            <div key={idx} className={`bg-black h-full`} style={{ width: `${w}px` }}></div>
                          ))}
                        </div>
                        <span className="font-mono text-xs font-bold tracking-wider">{barcodePreview}</span>
                      </div>
                    )}
                    
                    <button className="py-1 px-3 bg-indigo-600 text-white text-[9px] font-bold rounded hover:bg-indigo-500 transition-colors flex items-center gap-1 cursor-pointer">
                      <Download className="w-3 h-3" /> PRINT ({barcodeGeneratorInput.count} SHEETS)
                    </button>
                  </div>
                ) : (
                  <div className="text-center text-xs text-[var(--text-muted)]">
                    Generate a product label to view layout printable previews.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* VIEW 10: RACK & BIN FLOORS */}
        {currentTab === 'rackbin' && renderTable(
          ['Warehouse Center', 'Aisle Location', 'Rack Coordinate', 'Bin Position', 'Assigned product Item', 'Bin Capacity Utilization'],
          rackBinData,
          (row, i) => (
            <tr key={i} className="hover:bg-[var(--bg-tertiary)]/30 transition-colors text-xs">
              <td className="px-6 py-4 font-semibold text-[var(--text-primary)]">
                <div className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-indigo-400" />{row.warehouse}</div>
              </td>
              <td className="px-6 py-4 font-mono font-bold">{row.aisle}</td>
              <td className="px-6 py-4 font-mono">{row.rack}</td>
              <td className="px-6 py-4 font-mono">{row.bin}</td>
              <td className="px-6 py-4 font-medium">{row.item}</td>
              <td className="px-6 py-4">
                <div className="flex items-center gap-2">
                  <span className="font-mono">{row.fill}</span>
                  <div className="w-16 bg-[var(--bg-primary)] h-1.5 rounded-full overflow-hidden border border-[var(--border-color)]">
                    <div className="h-full bg-emerald-500" style={{ width: row.fill }}></div>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 text-right">
                <button className="text-[var(--text-muted)] hover:text-indigo-400 p-1 cursor-pointer"><MoreHorizontal className="w-4 h-4" /></button>
              </td>
            </tr>
          )
        )}

        {/* VIEW 11: DISPATCH SHIPPING */}
        {currentTab === 'dispatch' && renderTable(
          ['Dispatch ID', 'Order Ref', 'Customer', 'Shipping Method', 'Items', 'Status'],
          dispatchData,
          (dsp) => (
            <tr key={dsp.id} className="hover:bg-[var(--bg-tertiary)]/30 transition-colors text-xs">
              <td className="px-6 py-4 font-mono font-bold text-indigo-400">{dsp.id}</td>
              <td className="px-6 py-4 font-mono text-xs text-[var(--text-muted)]">{dsp.orderRef}</td>
              <td className="px-6 py-4 font-bold text-[var(--text-primary)]">{dsp.customer}</td>
              <td className="px-6 py-4">{dsp.method}</td>
              <td className="px-6 py-4 font-mono">{dsp.items} qty</td>
              <td className="px-6 py-4">
                <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${dsp.status === 'Shipped' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-amber-500/10 border-amber-500/20 text-amber-500'}`}>
                  {dsp.status}
                </span>
              </td>
              <td className="px-6 py-4 text-right">
                <button className="text-[var(--text-muted)] hover:text-indigo-400 p-1 cursor-pointer"><MoreHorizontal className="w-4 h-4" /></button>
              </td>
            </tr>
          )
        )}

        {/* VIEW 12: GRN INTEGRATION */}
        {currentTab === 'grn' && renderTable(
          ['GRN Number', 'PO Ref', 'Supplier Name', 'Received Date', 'Total Types', 'Total Qty', 'Quality Gate Status'],
          grnData,
          (grn) => (
            <tr key={grn.id} className="hover:bg-[var(--bg-tertiary)]/30 transition-colors text-xs">
              <td className="px-6 py-4 font-mono font-bold text-indigo-400">{grn.id}</td>
              <td className="px-6 py-4 font-mono text-[var(--text-muted)]">{grn.poRef}</td>
              <td className="px-6 py-4 font-bold text-[var(--text-primary)]">{grn.supplier}</td>
              <td className="px-6 py-4">{grn.receivedDate}</td>
              <td className="px-6 py-4 font-mono">{grn.items} lines</td>
              <td className="px-6 py-4 font-mono font-bold">{grn.totalQty} units</td>
              <td className="px-6 py-4">
                <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${grn.status === 'Inspected' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-500'}`}>
                  {grn.status}
                </span>
              </td>
              <td className="px-6 py-4 text-right">
                <button className="text-[var(--text-muted)] hover:text-indigo-400 p-1 cursor-pointer"><MoreHorizontal className="w-4 h-4" /></button>
              </td>
            </tr>
          )
        )}

        {/* VIEW 13: REPORTS & ANALYTICS */}
        {currentTab === 'reports' && (
           <div className="h-full flex flex-col items-center justify-center text-center p-12 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl animate-fade-in m-2">
            <div className="w-20 h-20 bg-[var(--bg-tertiary)] rounded-full flex items-center justify-center mb-6">
              <BarChart3 className="w-10 h-10 text-[var(--text-muted)]" />
            </div>
            <h4 className="text-xl font-bold text-[var(--text-primary)] mb-2 font-display">
              Inventory Reports & Analytics Dashboard
            </h4>
            <p className="text-[var(--text-secondary)] max-w-md text-xs">
              Generate detailed inventory valuation, slow-moving items audits, and sales forecasting reports. 
            </p>
            
            <div className="grid grid-cols-2 gap-4 mt-6">
              {[
                { title: 'Inventory Turn Rates', desc: '4.8 turns/year (Active)' },
                { title: 'Slow-Moving Stock', desc: '14 SKUs over 90 days' }
              ].map((r, i) => (
                <div key={i} className="bg-[var(--bg-primary)] p-4 rounded-xl border border-[var(--border-color)] w-48 text-left">
                  <span className="font-bold text-indigo-400 block text-xs">{r.title}</span>
                  <span className="text-[10px] text-[var(--text-secondary)] block mt-1">{r.desc}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* VIEW 14: CYCLE COUNTING */}
        {currentTab === 'cycle_count' && renderTable(
          ['Count ID', 'Count Date', 'Zone / Floor', 'Total SKUs Checked', 'Expected Qty', 'Counted Qty', 'Reconciliation Status', 'Variance Difference'],
          cycleCountData,
          (row) => (
            <tr key={row.id} className="hover:bg-[var(--bg-tertiary)]/30 transition-colors text-xs">
              <td className="px-6 py-4 font-mono font-bold text-indigo-400">{row.id}</td>
              <td className="px-6 py-4 font-mono">{row.date}</td>
              <td className="px-6 py-4 font-semibold">{row.zone}</td>
              <td className="px-6 py-4">{row.items} items</td>
              <td className="px-6 py-4 font-mono font-bold">{row.expectedQty}</td>
              <td className="px-6 py-4 font-mono font-bold text-[var(--text-primary)]">{row.countedQty}</td>
              <td className="px-6 py-4">
                <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${
                  row.status === 'Reconciled' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-amber-500/10 border-amber-500/20 text-amber-500'
                }`}>
                  {row.status}
                </span>
              </td>
              <td className={`px-6 py-4 font-mono font-bold ${row.variance.startsWith('-') ? 'text-rose-400' : 'text-emerald-400'}`}>{row.variance}</td>
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

      {/* Transfer modal */}
      {showTransferModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in">
          <form onSubmit={handleSaveTransfer} className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl w-full max-w-md p-6 relative shadow-2xl text-left select-none text-xs">
            <button type="button" onClick={() => setShowTransferModal(false)} className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer">✕</button>
            <div className="flex items-center gap-2 pb-3 border-b border-[var(--border-color)] mb-4">
              <ArrowRightLeft className="w-5 h-5 text-indigo-400" />
              <h4 className="font-bold text-sm text-[var(--text-primary)] font-display">Schedule Stock Transfer</h4>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Select Product</label>
                <select value={newTransfer.item} onChange={(e) => setNewTransfer({ ...newTransfer, item: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none">
                  <option value="">-- Choose Product --</option>
                  {stockItems.map(item => <option key={item.sku} value={item.sku}>[{item.sku}] {item.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">From Warehouse</label>
                  <select value={newTransfer.from} onChange={(e) => setNewTransfer({ ...newTransfer, from: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none">
                    <option value="">-- Source --</option>
                    <option value="Main Hub">Main Hub</option>
                    <option value="East Wing">East Wing</option>
                    <option value="West Wing">West Wing</option>
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">To Warehouse</label>
                  <select value={newTransfer.to} onChange={(e) => setNewTransfer({ ...newTransfer, to: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none">
                    <option value="">-- Target --</option>
                    <option value="Main Hub">Main Hub</option>
                    <option value="East Wing">East Wing</option>
                    <option value="West Wing">West Wing</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Transfer Quantity</label>
                  <input type="number" placeholder="e.g. 50" value={newTransfer.qty} onChange={(e) => setNewTransfer({ ...newTransfer, qty: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none" />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Reference Code</label>
                  <input type="text" placeholder="e.g. REQ-993" value={newTransfer.ref} onChange={(e) => setNewTransfer({ ...newTransfer, ref: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-color)] mt-4">
              <button type="button" onClick={() => setShowTransferModal(false)} className="py-1.5 px-4 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer">Cancel</button>
              <button type="submit" className="py-1.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold shadow cursor-pointer">Confirm Transfer</button>
            </div>
          </form>
        </div>
      )}

      {/* Adjustment modal */}
      {showAdjustmentModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in">
          <form onSubmit={handleSaveAdjustment} className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl w-full max-w-md p-6 relative shadow-2xl text-left select-none text-xs">
            <button type="button" onClick={() => setShowAdjustmentModal(false)} className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer">✕</button>
            <div className="flex items-center gap-2 pb-3 border-b border-[var(--border-color)] mb-4">
              <SlidersHorizontal className="w-5 h-5 text-indigo-400" />
              <h4 className="font-bold text-sm text-[var(--text-primary)] font-display">Record Stock Adjustment</h4>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Select Product</label>
                <select value={newAdjustment.item} onChange={(e) => setNewAdjustment({ ...newAdjustment, item: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none">
                  <option value="">-- Choose Product --</option>
                  {stockItems.map(item => <option key={item.sku} value={item.sku}>[{item.sku}] {item.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Adjustment Type</label>
                  <select value={newAdjustment.type} onChange={(e) => setNewAdjustment({ ...newAdjustment, type: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none">
                    <option value="Write-off">Stock Write-off</option>
                    <option value="Cycle Count">Cycle Count Difference</option>
                    <option value="Damage">Scrap / Damage</option>
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Adjustment Quantity (e.g. -5, +2)</label>
                  <input type="text" placeholder="-2 or +5" value={newAdjustment.qty} onChange={(e) => setNewAdjustment({ ...newAdjustment, qty: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none" />
                </div>
              </div>
              <div>
                <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Reason / Narration</label>
                <textarea rows={2} placeholder="Reason for adjusting ledger..." value={newAdjustment.reason} onChange={(e) => setNewAdjustment({ ...newAdjustment, reason: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none font-sans"></textarea>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-color)] mt-4">
              <button type="button" onClick={() => setShowAdjustmentModal(false)} className="py-1.5 px-4 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer">Cancel</button>
              <button type="submit" className="py-1.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold shadow cursor-pointer">Approve Adjustment</button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
};

export default InventoryWarehouse;
