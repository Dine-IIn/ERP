import React, { useState } from 'react';
import { Package, Search, Plus, Trash2, X, AlertCircle, CheckCircle2, Sliders, Warehouse, Edit } from 'lucide-react';
import { formatNumber } from '../../utils/apiService';

interface Product {
  id: string;
  name: string;
  sku: string;
  uom: string;
  pricing: number;
  stock: number;
  reorderLevel: number;
  warehouseLoc?: string;
  category?: { name: string };
}

interface InventoryProductsProps {
  products: Product[];
  onAdjustStock: (payload: any) => Promise<void>;
  onUpdateProduct: (id: string, payload: any) => Promise<void>;
}

export default function InventoryProducts({
  products,
  onAdjustStock,
  onUpdateProduct
}: InventoryProductsProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAdjModal, setShowAdjModal] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Manual adjustment form states
  const [productId, setProductId] = useState('');
  const [adjType, setAdjType] = useState('MANUAL_ADD');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');

  // Location/Reorder edit states
  const [reorderLevel, setReorderLevel] = useState('');
  const [warehouseLoc, setWarehouseLoc] = useState('');

  const [localErr, setLocalErr] = useState<string | null>(null);
  const [localSuccess, setLocalSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const openAdjModal = () => {
    setProductId(products[0]?.id || '');
    setAdjType('MANUAL_ADD');
    setQuantity('');
    setReason('');
    setLocalErr(null);
    setLocalSuccess(null);
    setShowAdjModal(true);
  };

  const openLocationModal = (p: Product) => {
    setSelectedProduct(p);
    setReorderLevel(String(p.reorderLevel || 5));
    setWarehouseLoc(p.warehouseLoc || '');
    setLocalErr(null);
    setLocalSuccess(null);
    setShowLocationModal(true);
  };

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId || !quantity.trim() || !adjType) {
      setLocalErr("Product selector, adjustment type, and audit quantities are required.");
      return;
    }

    setLocalErr(null);
    setLocalSuccess(null);
    setLoading(true);

    const payload = {
      productId,
      type: adjType,
      quantity: parseFloat(quantity) || 0,
      reason: reason.trim() || "Manual inventory stock audit."
    };

    try {
      await onAdjustStock(payload);
      setLocalSuccess("Manual stock adjustment registered and physical ledger updated!");
      setTimeout(() => {
        setShowAdjModal(false);
      }, 1000);
    } catch (err: any) {
      setLocalErr(err.message || "Failed to adjust stock level.");
    } finally {
      setLoading(false);
    }
  };

  const handleLocationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;

    setLocalErr(null);
    setLocalSuccess(null);
    setLoading(true);

    const payload = {
      reorderLevel: parseFloat(reorderLevel) || 5.0,
      warehouseLoc: warehouseLoc.trim() || null
    };

    try {
      await onUpdateProduct(selectedProduct.id, payload);
      setLocalSuccess("Warehouse tagging and reorder parameters saved!");
      setTimeout(() => {
        setShowLocationModal(false);
      }, 1000);
    } catch (err: any) {
      setLocalErr(err.message || "Failed to update product details.");
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.warehouseLoc && p.warehouseLoc.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-900/40 p-6 rounded-2xl border border-slate-800/80 backdrop-blur-xl">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Warehouse className="w-6 h-6 text-indigo-400" />
            Warehouse Physical Stocks
          </h1>
          <p className="text-slate-400 text-sm mt-1">Conduct physical stock count audits, configure reorder trigger limits, and allocate warehouse shelving racks.</p>
        </div>
        <button
          onClick={openAdjModal}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-550 hover:bg-indigo-655 active:scale-95 transition-all text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/20"
        >
          <Sliders className="w-5 h-5" />
          Perform Stock Audit
        </button>
      </div>

      {/* Main Grid */}
      <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl backdrop-blur-xl overflow-hidden">
        {/* Search */}
        <div className="p-4 border-b border-slate-800/60 bg-slate-950/20">
          <div className="relative max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search products by SKU, name or rack location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-950/40 border border-slate-850/60 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl text-white text-sm outline-none transition-all"
            />
          </div>
        </div>

        {/* Table/List */}
        <div className="overflow-x-auto">
          {filteredProducts.length === 0 ? (
            <div className="p-12 text-center">
              <Package className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400 font-medium">No products registered</p>
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-medium uppercase tracking-wider text-xs bg-slate-950/40">
                  <th className="py-4 px-6">Product Details</th>
                  <th className="py-4 px-6">SKU Code</th>
                  <th className="py-4 px-6">Warehouse Location</th>
                  <th className="py-4 px-6">Available Stock</th>
                  <th className="py-4 px-6">Min Reorder Level</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredProducts.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-800/20 transition-colors">
                    <td className="py-4 px-6">
                      <div className="font-semibold text-white">{p.name}</div>
                      {p.category && <div className="text-[10px] text-indigo-400 mt-0.5">{p.category.name}</div>}
                    </td>
                    <td className="py-4 px-6 font-mono text-xs text-slate-350">{p.sku}</td>
                    <td className="py-4 px-6">
                      {p.warehouseLoc ? (
                        <span className="px-2.5 py-1 text-xs rounded-full bg-slate-850 text-indigo-300 font-semibold border border-slate-800">
                          {p.warehouseLoc}
                        </span>
                      ) : (
                        <span className="text-slate-600 text-xs italic">Unallocated</span>
                      )}
                    </td>
                    <td className="py-4 px-6 font-mono text-white text-base font-bold">
                      {formatNumber(p.stock)} <span className="text-xs text-slate-500 font-medium">{p.uom}</span>
                    </td>
                    <td className="py-4 px-6 font-mono text-slate-400">{formatNumber(p.reorderLevel)} {p.uom}</td>
                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={() => openLocationModal(p)}
                        className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-indigo-400 transition-colors rounded-lg flex items-center gap-1.5 text-xs font-semibold ml-auto"
                        title="Configure Storage Parameters"
                      >
                        <Edit className="w-4 h-4" />
                        Configure Storage
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Manual adjustment Modal */}
      {showAdjModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden transform transition-all animate-scaleUp">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-950/20">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Sliders className="w-5 h-5 text-indigo-400" />
                Physical Stock count Audit
              </h3>
              <button
                onClick={() => setShowAdjModal(false)}
                className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleAdjustSubmit} className="p-6 space-y-4">
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
                <label className="text-slate-450 text-xs font-semibold uppercase tracking-wider">Select Product Catalog</label>
                <select
                  value={productId}
                  onChange={(e) => setProductId(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-indigo-500 transition-all text-sm"
                  required
                >
                  <option value="" disabled>Select target item</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name} (SKU: {p.sku})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-450 text-xs font-semibold uppercase tracking-wider">Audit Adjustment Type</label>
                  <select
                    value={adjType}
                    onChange={(e) => setAdjType(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-indigo-500 transition-all text-sm font-semibold"
                  >
                    <option value="MANUAL_ADD">INWARD / ADD STOCK</option>
                    <option value="MANUAL_SUB">OUTWARD / SUBTRACT STOCK</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-450 text-xs font-semibold uppercase tracking-wider">Audit Quantity</label>
                  <input
                    type="number"
                    min="0.01"
                    step="any"
                    placeholder="0.00"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-indigo-500 transition-all text-sm font-mono font-bold"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-450 text-xs font-semibold uppercase tracking-wider">Audit Adjust reason</label>
                <textarea
                  rows={3}
                  placeholder="Record why this adjustment is made (e.g. Physical inventory batch discrepancy)..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-indigo-500 transition-all text-sm resize-none"
                  required
                />
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-end gap-3 bg-slate-950/20 -mx-6 -mb-6 p-6">
                <button
                  type="button"
                  onClick={() => setShowAdjModal(false)}
                  className="px-4.5 py-2 text-slate-400 hover:text-white transition-all text-sm font-semibold hover:bg-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white transition-all text-sm font-bold rounded-xl shadow-lg shadow-indigo-500/20"
                >
                  {loading ? 'Processing...' : 'Confirm Audit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Storage location adjustment Modal */}
      {showLocationModal && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden transform transition-all">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-950/20">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Warehouse className="w-5 h-5 text-indigo-400" />
                Configure storage tags
              </h3>
              <button
                onClick={() => setShowLocationModal(false)}
                className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleLocationSubmit} className="p-6 space-y-4">
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

              <div className="text-sm font-semibold text-slate-300">
                Product: <span className="text-white font-bold">{selectedProduct.name}</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-450 text-xs font-semibold uppercase tracking-wider">Min Reorder Level</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="5.00"
                    value={reorderLevel}
                    onChange={(e) => setReorderLevel(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-indigo-500 transition-all text-sm font-mono"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-450 text-xs font-semibold uppercase tracking-wider">Warehouse Rack Loc</label>
                  <input
                    type="text"
                    placeholder="e.g. Rack A-3"
                    value={warehouseLoc}
                    onChange={(e) => setWarehouseLoc(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-indigo-500 transition-all text-sm font-semibold"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-end gap-3 bg-slate-950/20 -mx-6 -mb-6 p-6">
                <button
                  type="button"
                  onClick={() => setShowLocationModal(false)}
                  className="px-4.5 py-2 text-slate-400 hover:text-white transition-all text-sm font-semibold hover:bg-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white transition-all text-sm font-bold rounded-xl shadow-lg shadow-indigo-500/20"
                >
                  {loading ? 'Processing...' : 'Save Parameters'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
