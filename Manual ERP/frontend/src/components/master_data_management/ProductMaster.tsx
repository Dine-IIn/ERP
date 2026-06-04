import React, { useState } from 'react';
import { Package, Search, Plus, Edit, Trash2, X, AlertCircle, DollarSign, Tag, Image, FileText, Ruler, ListPlus, Sliders, Layers } from 'lucide-react';

interface ProductVariantForm {
  name: string;
  sku: string;
  priceAddon: string;
}

interface ProductMasterProps {
  products: any[];
  categories: any[];
  brands: any[];
  onCreateProduct: (product: any) => Promise<void>;
  onUpdateProduct: (id: string, product: any) => Promise<void>;
  onDeleteProduct: (id: string) => Promise<void>;
  onCreateCategory: (name: string) => Promise<void>;
  onDeleteCategory: (id: string) => Promise<void>;
  onCreateBrand: (name: string) => Promise<void>;
  onDeleteBrand: (id: string) => Promise<void>;
  currencySymbol?: string;
}

export default function ProductMaster({
  products,
  categories,
  brands,
  onCreateProduct,
  onUpdateProduct,
  onDeleteProduct,
  onCreateCategory,
  onDeleteCategory,
  onCreateBrand,
  onDeleteBrand,
  currencySymbol = '$',
}: ProductMasterProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Manage inline settings modal for categories/brands
  const [showManageCatBrandModal, setShowManageCatBrandModal] = useState(false);
  const [manageType, setManageType] = useState<'category' | 'brand'>('category');
  const [newCatBrandName, setNewCatBrandName] = useState('');
  const [manageErr, setManageErr] = useState<string | null>(null);
  const [manageLoading, setManageLoading] = useState(false);

  // Main product form
  const [form, setForm] = useState({
    name: '',
    categoryId: '',
    brandId: '',
    uom: 'PCS',
    pricing: '0.00',
    hsnSacCode: '',
    imageUrl: '',
    bomReference: '',
    moq: '1'
  });

  const [variants, setVariants] = useState<ProductVariantForm[]>([]);
  const [localErr, setLocalErr] = useState<string | null>(null);
  const [localSuccess, setLocalSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const openAddModal = () => {
    setForm({
      name: '',
      categoryId: '',
      brandId: '',
      uom: 'PCS',
      pricing: '0.00',
      hsnSacCode: '',
      imageUrl: '',
      bomReference: '',
      moq: '1'
    });
    setVariants([]);
    setIsEditing(false);
    setEditingId(null);
    setLocalErr(null);
    setLocalSuccess(null);
    setShowModal(true);
  };

  const openEditModal = (prod: any) => {
    setForm({
      name: prod.name,
      categoryId: prod.categoryId || '',
      brandId: prod.brandId || '',
      uom: prod.uom || 'PCS',
      pricing: String(prod.pricing || 0),
      hsnSacCode: prod.hsnSacCode || '',
      imageUrl: prod.imageUrl || '',
      bomReference: prod.bomReference || '',
      moq: String(prod.moq || 1)
    });

    const parsedVariants = (prod.variants || []).map((v: any) => ({
      name: v.name,
      sku: v.sku || '',
      priceAddon: String(v.priceAddon || 0)
    }));

    setVariants(parsedVariants);
    setIsEditing(true);
    setEditingId(prod.id);
    setLocalErr(null);
    setLocalSuccess(null);
    setShowModal(true);
  };

  const addVariantRow = () => {
    setVariants([...variants, { name: '', sku: '', priceAddon: '0.00' }]);
  };

  const removeVariantRow = (index: number) => {
    setVariants(variants.filter((_, i) => i !== index));
  };

  const handleVariantChange = (index: number, field: keyof ProductVariantForm, value: string) => {
    const updated = [...variants];
    updated[index][field] = value;
    setVariants(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.uom) {
      setLocalErr("Product Name and Unit of Measure (UOM) are required fields.");
      return;
    }

    // Validate variants SKU uniqueness internally (optional helper)
    const skus = variants.map(v => v.sku.trim()).filter(sku => sku !== '');
    const uniqueSkus = new Set(skus);
    if (skus.length !== uniqueSkus.size) {
      setLocalErr("Each product variant must have a unique SKU code.");
      return;
    }

    setLocalErr(null);
    setLocalSuccess(null);
    setLoading(true);

    const payload = {
      ...form,
      variants: variants.map(v => ({
        name: v.name.trim(),
        sku: v.sku.trim() || null,
        priceAddon: parseFloat(v.priceAddon) || 0.0
      })).filter(v => v.name !== '')
    };

    try {
      if (isEditing && editingId) {
        await onUpdateProduct(editingId, payload);
        setLocalSuccess("Product settings updated successfully!");
      } else {
        await onCreateProduct(payload);
        setLocalSuccess("Product onboarding completed successfully!");
      }
      setTimeout(() => {
        setShowModal(false);
      }, 1000);
    } catch (err: any) {
      setLocalErr(err.message || "Failed to process product master entry.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to permanently delete product '${name}'? This will wipe all its variants.`)) {
      try {
        await onDeleteProduct(id);
      } catch (err: any) {
        alert(err.message || "Failed to delete product");
      }
    }
  };

  const handleAddCatBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatBrandName.trim()) return;

    setManageErr(null);
    setManageLoading(true);
    try {
      if (manageType === 'category') {
        await onCreateCategory(newCatBrandName.trim());
      } else {
        await onCreateBrand(newCatBrandName.trim());
      }
      setNewCatBrandName('');
    } catch (err: any) {
      setManageErr(err.message || `Failed to add ${manageType}`);
    } finally {
      setManageLoading(false);
    }
  };

  const handleDeleteCatBrand = async (id: string) => {
    if (window.confirm(`Are you sure you want to delete this ${manageType}?`)) {
      setManageErr(null);
      setManageLoading(true);
      try {
        if (manageType === 'category') {
          await onDeleteCategory(id);
        } else {
          await onDeleteBrand(id);
        }
      } catch (err: any) {
        setManageErr(err.message || `Failed to delete ${manageType}`);
      } finally {
        setManageLoading(false);
      }
    }
  };

  const getCategoryName = (id: string) => categories.find(c => c.id === id)?.name || '';
  const getBrandName = (id: string) => brands.find(b => b.id === id)?.name || '';

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.hsnSacCode && p.hsnSacCode.includes(searchTerm)) ||
    (p.category && p.category.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (p.brand && p.brand.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="animate-fade-in flex flex-col gap-4 text-left select-none">
      {/* Upper Action Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-[var(--border-color)] pb-3">
        <div>
          <h3 className="font-bold text-sm text-[var(--text-primary)] font-display flex items-center gap-1.5 uppercase tracking-wide">
            <Package className="w-4 h-4 text-indigo-400" /> Product Master Hub
          </h3>
          <p className="text-[var(--text-secondary)] text-[10px] mt-0.5">Administer stock catalog, brands, UOM metrics, pricing variants, and HSN compliance tags</p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto shrink-0">
          <div className="relative flex-1 md:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Search products, brands..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-indigo-500/50 rounded-lg text-xs text-[var(--text-primary)] focus:outline-none"
            />
          </div>

          <button
            type="button"
            onClick={() => {
              setManageType('category');
              setShowManageCatBrandModal(true);
            }}
            className="px-2.5 py-1.5 bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] border border-[var(--border-color)] hover:text-[var(--text-primary)] font-semibold rounded-lg text-xs cursor-pointer flex items-center gap-1 transition-all"
            title="Configure Categories & Brands"
          >
            <Sliders className="w-3.5 h-3.5" /> Parameters
          </button>

          <button
            type="button"
            onClick={openAddModal}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-xs cursor-pointer flex items-center gap-1.5 border-0 bg-transparent transition-all shadow-md active:scale-95 shrink-0"
          >
            <Plus className="w-3.5 h-3.5" /> Onboard Product
          </button>
        </div>
      </div>

      {/* Main product log list grid */}
      <div className="overflow-x-auto border border-[var(--border-color)] rounded-xl mt-2">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-[var(--bg-tertiary)] border-b border-[var(--border-color)] text-[var(--text-secondary)] font-bold">
              <th className="p-3 text-[10px] uppercase tracking-wider">Item Name / Image</th>
              <th className="p-3 text-[10px] uppercase tracking-wider">Category & Brand</th>
              <th className="p-3 text-[10px] uppercase tracking-wider">UOM / Pricing</th>
              <th className="p-3 text-[10px] uppercase tracking-wider">HSN / BOM / MOQ</th>
              <th className="p-3 text-[10px] uppercase tracking-wider">Pricing Variants</th>
              <th className="p-3 text-[10px] uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(prod => (
              <tr key={prod.id} className="border-b border-[var(--border-color)]/40 hover:bg-[var(--bg-tertiary)]/20 transition-colors last:border-b-0 text-left">
                {/* Product Name & Image */}
                <td className="p-3 shrink-0 flex items-center gap-3">
                  {prod.imageUrl ? (
                    <img
                      src={prod.imageUrl}
                      alt={prod.name}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '';
                      }}
                      className="w-8 h-8 rounded-lg object-cover bg-[var(--bg-tertiary)] border border-[var(--border-color)]"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                      <Package className="w-4 h-4" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <span className="font-bold text-[var(--text-primary)] block truncate max-w-xs">{prod.name}</span>
                    <span className="text-[9px] text-[var(--text-muted)] mt-0.5 block truncate max-w-xs">ID: {prod.id}</span>
                  </div>
                </td>

                {/* Category & Brand tags */}
                <td className="p-3 shrink-0">
                  {prod.category ? (
                    <span className="px-2 py-0.5 rounded text-[8px] font-bold tracking-wider inline-block bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 uppercase">
                      {prod.category.name}
                    </span>
                  ) : (
                    <span className="text-[10px] text-[var(--text-muted)] italic block">No Category</span>
                  )}
                  {prod.brand ? (
                    <span className="px-2 py-0.5 rounded text-[8px] font-bold tracking-wider inline-block bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase ml-1.5">
                      {prod.brand.name}
                    </span>
                  ) : (
                    <span className="text-[10px] text-[var(--text-muted)] italic block mt-1">No Brand</span>
                  )}
                </td>

                {/* UOM & Base Pricing */}
                <td className="p-3 shrink-0">
                  <span className="text-[var(--text-primary)] font-bold flex items-center gap-0.5 font-mono">
                    <span className="text-indigo-400 font-bold mr-0.5">{currencySymbol}</span> {prod.pricing ? prod.pricing.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
                  </span>
                  <span className="text-[9px] text-[var(--text-secondary)] block mt-0.5 font-sans font-medium uppercase">
                    Metric: {prod.uom || 'PCS'}
                  </span>
                </td>

                {/* HSN, BOM, MOQ */}
                <td className="p-3 shrink-0">
                  <span className="text-[var(--text-primary)] font-bold font-mono block">
                    HSN: {prod.hsnSacCode || 'N/A'}
                  </span>
                  <span className="text-[9px] text-[var(--text-secondary)] block mt-0.5 truncate max-w-xs font-mono">
                    MOQ: {prod.moq || 1.0} • BOM: {prod.bomReference || 'None'}
                  </span>
                </td>

                {/* Variants List */}
                <td className="p-3 shrink-0">
                  {prod.variants && prod.variants.length > 0 ? (
                    <div className="flex flex-col gap-1 max-h-20 overflow-y-auto">
                      {prod.variants.map((v: any) => (
                        <div key={v.id} className="flex items-center gap-1.5 text-[9px] text-[var(--text-secondary)] font-mono">
                          <span className="font-bold text-[var(--text-primary)]">{v.name}</span>
                          {v.sku && <span className="text-[var(--text-muted)]">({v.sku})</span>}
                          <span className="text-indigo-400 font-semibold ml-auto">+{currencySymbol}{v.priceAddon || 0}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-[10px] text-[var(--text-muted)] italic">No variants configured</span>
                  )}
                </td>

                {/* Actions */}
                <td className="p-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => openEditModal(prod)}
                      className="px-2 py-1 bg-indigo-600/10 hover:bg-indigo-600 text-indigo-400 hover:text-white rounded transition-all cursor-pointer border-0 bg-transparent flex items-center gap-1 text-[9px] uppercase font-bold"
                      title="Edit Master Settings"
                    >
                      <Edit className="w-3.5 h-3.5" /> Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(prod.id, prod.name)}
                      className="px-2 py-1 bg-rose-600/10 hover:bg-rose-600 text-rose-400 hover:text-white rounded transition-all cursor-pointer border-0 bg-transparent flex items-center gap-1 text-[9px] uppercase font-bold"
                      title="Delete Product"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-8 text-[var(--text-muted)] italic">No inventory products registered yet</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ==========================================
          MODAL: PRODUCT CREATOR & MODIFIER FORM
          ========================================== */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in">
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl w-full max-w-2xl p-6 relative shadow-2xl text-left select-none animate-scale-up max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer bg-transparent border-0"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 pb-3 border-b border-[var(--border-color)]">
              <div className="p-2.5 bg-indigo-500/10 rounded-xl text-indigo-400 border border-indigo-500/20">
                <Package className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base text-[var(--text-primary)] font-display">
                  {isEditing ? 'Modify Product Specifications' : 'Onboard New Product Stock'}
                </h3>
                <p className="text-[var(--text-secondary)] text-[10px]">Configure inventory attributes, pricing matrices, and barcode classifications</p>
              </div>
            </div>

            {localErr && (
              <div className="p-3 mt-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{localErr}</span>
              </div>
            )}

            {localSuccess && (
              <div className="p-3 mt-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{localSuccess}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Product Name */}
              <div>
                <label className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block mb-1">Product Display Name</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-indigo-500/50 py-2 px-3 rounded-lg text-xs text-[var(--text-primary)] focus:outline-none"
                  placeholder="e.g. Copper Rod 10mm"
                />
              </div>

              {/* UOM Selection */}
              <div>
                <label className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block mb-1">Unit of Measure (UOM)</label>
                <select
                  value={form.uom}
                  onChange={e => setForm({ ...form, uom: e.target.value })}
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-indigo-500/50 py-2 px-3 rounded-lg text-xs text-[var(--text-primary)] focus:outline-none cursor-pointer"
                >
                  <option value="PCS">PCS (Pieces)</option>
                  <option value="KG">KG (Kilograms)</option>
                  <option value="GRAM">GRAM (Grams)</option>
                  <option value="LTR">LTR (Litres)</option>
                  <option value="ML">ML (Millilitres)</option>
                  <option value="MTR">MTR (Meters)</option>
                  <option value="CM">CM (Centimeters)</option>
                  <option value="MM">MM (Millimeters)</option>
                  <option value="IN">IN (Inches)</option>
                  <option value="FT">FT (Feet)</option>
                  <option value="SQM">SQM (Square Meters)</option>
                  <option value="CFT">CFT (Cubic Feet)</option>
                  <option value="BOX">BOX (Box Packaging)</option>
                  <option value="SET">SET (Stock sets)</option>
                </select>
              </div>

              {/* Category dropdown & Brand dropdown */}
              <div>
                <label className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block mb-1">Product Category</label>
                <select
                  value={form.categoryId}
                  onChange={e => setForm({ ...form, categoryId: e.target.value })}
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-indigo-500/50 py-2 px-3 rounded-lg text-xs text-[var(--text-primary)] focus:outline-none cursor-pointer"
                >
                  <option value="">-- No Category --</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block mb-1">Item Brand</label>
                <select
                  value={form.brandId}
                  onChange={e => setForm({ ...form, brandId: e.target.value })}
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-indigo-500/50 py-2 px-3 rounded-lg text-xs text-[var(--text-primary)] focus:outline-none cursor-pointer"
                >
                  <option value="">-- No Brand --</option>
                  {brands.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              {/* Pricing amount & HSN compliance */}
              <div>
                <label className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block mb-1">Base Price per unit ({currencySymbol})</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={form.pricing}
                  onChange={e => setForm({ ...form, pricing: e.target.value })}
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-indigo-500/50 py-2 px-3 rounded-lg text-xs text-[var(--text-primary)] focus:outline-none font-mono"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block mb-1">HSN / SAC Code</label>
                <input
                  type="text"
                  value={form.hsnSacCode}
                  onChange={e => setForm({ ...form, hsnSacCode: e.target.value })}
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-indigo-500/50 py-2 px-3 rounded-lg text-xs text-[var(--text-primary)] focus:outline-none font-mono uppercase"
                  placeholder="e.g. 74071010"
                />
              </div>

              {/* BOM Reference & Minimum Order Quantity (MOQ) */}
              <div>
                <label className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block mb-1">BOM Reference (Bill of Materials)</label>
                <input
                  type="text"
                  value={form.bomReference}
                  onChange={e => setForm({ ...form, bomReference: e.target.value })}
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-indigo-500/50 py-2 px-3 rounded-lg text-xs text-[var(--text-primary)] focus:outline-none"
                  placeholder="e.g. BOM-COPPER-ROD-V1"
                />
              </div>

              <div>
                <label className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block mb-1">Minimum Order Quantity (MOQ)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={form.moq}
                  onChange={e => setForm({ ...form, moq: e.target.value })}
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-indigo-500/50 py-2 px-3 rounded-lg text-xs text-[var(--text-primary)] focus:outline-none font-mono"
                />
              </div>

              {/* Product Image URL */}
              <div className="md:col-span-2">
                <label className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block mb-1">Product Image URL</label>
                <input
                  type="url"
                  value={form.imageUrl}
                  onChange={e => setForm({ ...form, imageUrl: e.target.value })}
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-indigo-500/50 py-2 px-3 rounded-lg text-xs text-[var(--text-primary)] focus:outline-none"
                  placeholder="e.g. https://images.unsplash.com/photo-1590244921950-718d0473a217"
                />
              </div>

              {/* Variants Section */}
              <div className="md:col-span-2 border-t border-[var(--border-color)] pt-4 mt-2">
                <div className="flex justify-between items-center mb-3">
                  <div>
                    <span className="text-[10px] font-bold text-indigo-400 tracking-wider uppercase block">Pricing & Stock Variants</span>
                    <span className="text-[8px] text-[var(--text-secondary)]">Create add-on configurations (e.g. Size, Color, Grade) with pricing offsets</span>
                  </div>

                  <button
                    type="button"
                    onClick={addVariantRow}
                    className="px-2.5 py-1.5 bg-indigo-600/10 hover:bg-indigo-600 text-indigo-400 hover:text-white rounded-lg text-[10px] font-bold border-0 bg-transparent flex items-center gap-1 transition-all cursor-pointer shadow-sm active:scale-95"
                  >
                    <ListPlus className="w-3.5 h-3.5" /> Append Variant Row
                  </button>
                </div>

                <div className="flex flex-col gap-2 max-h-56 overflow-y-auto border border-[var(--border-color)]/60 rounded-xl p-3 bg-[var(--bg-tertiary)]/10">
                  {variants.map((v, index) => (
                    <div key={index} className="flex flex-col md:flex-row items-center gap-3 bg-[var(--bg-primary)] p-2.5 rounded-lg border border-[var(--border-color)]/40 relative">
                      <div className="w-full md:w-5/12">
                        <label className="text-[7.5px] font-bold text-[var(--text-secondary)] block mb-0.5 uppercase">Variant Name *</label>
                        <input
                          type="text"
                          required
                          value={v.name}
                          onChange={e => handleVariantChange(index, 'name', e.target.value)}
                          className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] py-1.5 px-2.5 rounded-md text-xs text-[var(--text-primary)] focus:outline-none"
                          placeholder="e.g. Grade A, Red Color"
                        />
                      </div>
                      <div className="w-full md:w-4/12">
                        <label className="text-[7.5px] font-bold text-[var(--text-secondary)] block mb-0.5 uppercase">Unique SKU / Barcode</label>
                        <input
                          type="text"
                          value={v.sku}
                          onChange={e => handleVariantChange(index, 'sku', e.target.value)}
                          className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] py-1.5 px-2.5 rounded-md text-xs text-[var(--text-primary)] focus:outline-none font-mono"
                          placeholder="e.g. COP-ROD-G-A"
                        />
                      </div>
                      <div className="w-full md:w-3/12 flex items-end gap-2">
                        <div className="flex-1">
                          <label className="text-[7.5px] font-bold text-[var(--text-secondary)] block mb-0.5 uppercase">Price Addon ({currencySymbol})</label>
                          <input
                            type="number"
                            step="0.01"
                            value={v.priceAddon}
                            onChange={e => handleVariantChange(index, 'priceAddon', e.target.value)}
                            className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] py-1.5 px-2.5 rounded-md text-xs text-[var(--text-primary)] focus:outline-none font-mono"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeVariantRow(index)}
                          className="p-1.5 bg-rose-600/10 hover:bg-rose-600 text-rose-400 hover:text-white rounded-lg transition-all cursor-pointer border-0 bg-transparent"
                          title="Remove Variant Row"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {variants.length === 0 && (
                    <div className="text-center py-6 text-[var(--text-muted)] italic text-[10px]">No variants added. Base product pricing will be used exclusively.</div>
                  )}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="md:col-span-2 flex gap-3 mt-4 border-t border-[var(--border-color)] pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="w-1/2 bg-[var(--bg-tertiary)] border border-[var(--border-color)] hover:text-[var(--text-primary)] font-bold py-2 rounded-lg text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-1/2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 rounded-lg text-xs cursor-pointer transition-colors"
                >
                  {loading ? 'Processing...' : isEditing ? 'Apply Master Changes' : 'Complete Product Onboarding'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL: CATEGORIES & BRANDS MANAGER
          ========================================== */}
      {showManageCatBrandModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in">
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl w-full max-w-md p-6 relative shadow-2xl text-left select-none animate-scale-up">
            <button
              onClick={() => setShowManageCatBrandModal(false)}
              className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer bg-transparent border-0"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 pb-3 border-b border-[var(--border-color)]">
              <div className="p-2.5 bg-indigo-500/10 rounded-xl text-indigo-400 border border-indigo-500/20">
                <Sliders className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base text-[var(--text-primary)] font-display">Manage Product Parameters</h3>
                <p className="text-[var(--text-secondary)] text-[10px]">Create or delete categories and brands on-the-fly</p>
              </div>
            </div>

            {/* Selector tabs */}
            <div className="flex border border-[var(--border-color)] rounded-lg p-0.5 bg-[var(--bg-tertiary)]/20 mt-4">
              <button
                type="button"
                onClick={() => { setManageType('category'); setManageErr(null); }}
                className={`w-1/2 py-1 text-center font-bold text-xs rounded-md cursor-pointer transition-all border-0 bg-transparent ${
                  manageType === 'category' ? 'bg-indigo-600 text-white shadow-sm font-semibold' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                Categories ({categories.length})
              </button>
              <button
                type="button"
                onClick={() => { setManageType('brand'); setManageErr(null); }}
                className={`w-1/2 py-1 text-center font-bold text-xs rounded-md cursor-pointer transition-all border-0 bg-transparent ${
                  manageType === 'brand' ? 'bg-indigo-600 text-white shadow-sm font-semibold' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                Brands ({brands.length})
              </button>
            </div>

            {manageErr && (
              <div className="p-2.5 mt-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg text-[10px] flex items-center gap-2">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{manageErr}</span>
              </div>
            )}

            {/* Creation form */}
            <form onSubmit={handleAddCatBrand} className="mt-4 flex gap-2">
              <input
                type="text"
                required
                placeholder={manageType === 'category' ? "Add category (e.g. Copper Rods)" : "Add brand (e.g. ANB Cables)"}
                value={newCatBrandName}
                onChange={e => setNewCatBrandName(e.target.value)}
                className="flex-1 bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-indigo-500/50 py-1.5 px-3 rounded-lg text-xs text-[var(--text-primary)] focus:outline-none"
              />
              <button
                type="submit"
                disabled={manageLoading}
                className="px-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-xs cursor-pointer border-0 bg-transparent transition-all shadow-md active:scale-95"
              >
                Add
              </button>
            </form>

            {/* List pane */}
            <div className="mt-4 border border-[var(--border-color)] rounded-xl overflow-hidden max-h-60 overflow-y-auto">
              <div className="flex flex-wrap p-3 gap-2 bg-[var(--bg-primary)]">
                {(manageType === 'category' ? categories : brands).map(item => (
                  <div key={item.id} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[var(--bg-secondary)] border border-[var(--border-color)]/60 text-[var(--text-primary)] transition-all">
                    <span>{item.name}</span>
                    <button
                      type="button"
                      onClick={() => handleDeleteCatBrand(item.id)}
                      className="p-0.5 hover:bg-rose-600/20 text-[var(--text-secondary)] hover:text-rose-400 rounded-full cursor-pointer transition-all border-0 bg-transparent flex items-center justify-center"
                      title={`Remove ${manageType}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                {(manageType === 'category' ? categories : brands).length === 0 && (
                  <div className="w-full text-center py-6 text-[var(--text-muted)] italic text-[10px]">No {manageType} parameter configs found</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
