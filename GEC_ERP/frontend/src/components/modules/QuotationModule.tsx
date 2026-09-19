import React, { useState, useEffect, useMemo } from 'react';
import { useERP } from '../../context/ERPContext';
import { GEC_PRODUCTS_DATA } from '../../data/quotationProductsData';
import { GECQuotationPrintView, QuotationPrintData } from '../printTemplates/QuotationPrintTemplates';
import { Modal } from '../common/Modal';
import { 
  FileText, Plus, Search, Printer, Edit2, Trash2, CheckCircle2, 
  X, ShoppingBag 
} from 'lucide-react';

export const QuotationModule: React.FC = () => {
  const { currentUser, customers, addSalesOrder, items, setActiveModule } = useERP();

  const [quotations, setQuotations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [printModalQuote, setPrintModalQuote] = useState<QuotationPrintData | null>(null);

  // Form State
  const [quoteNo, setQuoteNo] = useState('');
  const [quoteDate, setQuoteDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [customerCompany, setCustomerCompany] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerMobile, setCustomerMobile] = useState('');
  const [customerCity, setCustomerCity] = useState('');
  const [customerState, setCustomerState] = useState('Gujarat');
  const [customerAddress, setCustomerAddress] = useState('');
  const [reference, setReference] = useState('');

  // Selected Machine Model State
  const [selectedCategory, setSelectedCategory] = useState<string>('Standard');
  const [selectedModelId, setSelectedModelId] = useState<string>('');
  const [basePrice, setBasePrice] = useState<number>(0);
  const [discountPercent, setDiscountPercent] = useState<number>(10);
  const [selectedOptions, setSelectedOptions] = useState<Array<{ name: string; price: number }>>([]);
  const [extraDemand, setExtraDemand] = useState<string>('');
  const [extraAmount, setExtraAmount] = useState<number>(0);
  const [customDescription, setCustomDescription] = useState<string>('');
  const [editingQuoteId, setEditingQuoteId] = useState<string | null>(null);

  const categories = GEC_PRODUCTS_DATA.categories || [];
  const models = GEC_PRODUCTS_DATA.models || [];

  const filteredModels = useMemo(() => {
    return models.filter((m: any) => m.category === selectedCategory);
  }, [models, selectedCategory]);

  const selectedModelObj = useMemo(() => {
    return models.find((m: any) => m.id === selectedModelId) || null;
  }, [models, selectedModelId]);

  // Fetch Quotation List from Central API
  const fetchQuotations = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/quotations/list');
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setQuotations(json.data);
        }
      }
    } catch (err) {
      console.error('Error fetching quotations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotations();
  }, []);

  // Fetch Atomic Next Number when opening Create Modal
  const openNewQuotationModal = async () => {
    setEditingQuoteId(null);
    setQuoteDate(new Date().toISOString().split('T')[0]);
    setCustomerCompany('');
    setCustomerName('');
    setCustomerMobile('');
    setCustomerCity('');
    setCustomerState('Gujarat');
    setCustomerAddress('');
    setReference('');
    setExtraDemand('');
    setExtraAmount(0);
    setCustomDescription('');
    setSelectedOptions([]);
    setDiscountPercent(10);

    const firstCat = categories[0]?.id || 'Standard';
    setSelectedCategory(firstCat);
    const firstModel = models.find((m: any) => m.category === firstCat);
    if (firstModel) {
      setSelectedModelId(firstModel.id);
      setBasePrice(firstModel.base_price || 0);
    }

    try {
      const res = await fetch('/api/quotations/next-number');
      if (res.ok) {
        const data = await res.json();
        if (data.quoteNo) {
          setQuoteNo(data.quoteNo);
        }
      }
    } catch (err) {
      console.warn('Could not fetch next quote no:', err);
    }

    setIsCreateModalOpen(true);
  };

  // Handle Model Selection change
  const handleModelChange = (modelId: string) => {
    setSelectedModelId(modelId);
    const m = models.find((x: any) => x.id === modelId);
    if (m) {
      setBasePrice(m.base_price || 0);
      setSelectedOptions([]);
    }
  };

  // Option toggle
  const toggleOption = (optName: string, optPrice: number) => {
    setSelectedOptions(prev => {
      const exists = prev.some(o => o.name === optName);
      if (exists) {
        return prev.filter(o => o.name !== optName);
      } else {
        return [...prev, { name: optName, price: optPrice }];
      }
    });
  };

  // Calculate live totals
  const calculatedDiscountAmt = Math.round(basePrice * (discountPercent / 100));
  const calculatedDiscountedBase = basePrice - calculatedDiscountAmt;
  const calculatedOptionsTotal = selectedOptions.reduce((sum, o) => sum + (o.price || 0), 0);
  const calculatedGrandTotal = calculatedDiscountedBase + calculatedOptionsTotal + (Number(extraAmount) || 0);

  // Customer Autofill helper
  const handleCustomerSelect = (companyName: string) => {
    setCustomerCompany(companyName);
    const cMatch = customers.find(c => c.name.toLowerCase() === companyName.toLowerCase());
    if (cMatch) {
      setCustomerName(cMatch.contactPerson || '');
      setCustomerMobile(cMatch.phone || '');
      setCustomerCity(cMatch.city || '');
      setCustomerState(cMatch.state || 'Gujarat');
      setCustomerAddress(cMatch.address || '');
    }
  };

  // Save Quotation
  const handleSaveQuotation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedModelObj) {
      alert('Please select a machine model.');
      return;
    }

    const payload = {
      id: editingQuoteId || undefined,
      quoteNo,
      date: quoteDate,
      customerCompany,
      customerName,
      customerMobile,
      customerCity,
      customerState,
      customerAddress,
      reference,
      model: {
        id: selectedModelObj.id,
        sheet_name: selectedModelObj.sheet_name,
        display_name: selectedModelObj.display_name,
        category: selectedModelObj.category,
        description: selectedModelObj.description,
        salient_features: selectedModelObj.salient_features,
        specs: selectedModelObj.specs,
        base_price: selectedModelObj.base_price
      },
      basePrice,
      discountPercent,
      selectedOptions,
      customDescription: customDescription.trim() ? customDescription : null,
      extraDemand,
      extraAmount: Number(extraAmount) || 0,
      totalAmount: calculatedGrandTotal,
      executiveName: currentUser?.fullName || 'Sales Executive'
    };

    try {
      const res = await fetch('/api/quotations/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quoteData: payload,
          user: currentUser ? {
            id: currentUser.id,
            username: currentUser.username,
            fullName: currentUser.fullName,
            role: currentUser.role
          } : undefined
        })
      });

      if (res.ok) {
        setIsCreateModalOpen(false);
        fetchQuotations();
      } else {
        alert('Failed to save quotation.');
      }
    } catch (err) {
      alert('Error connecting to backend: ' + err);
    }
  };

  // Edit Quotation
  const handleOpenEdit = (q: any) => {
    setEditingQuoteId(q.id);
    setQuoteNo(q.quoteNo);
    setQuoteDate(q.date || new Date().toISOString().split('T')[0]);
    setCustomerCompany(q.customerCompany || '');
    setCustomerName(q.customerName || '');
    setCustomerMobile(q.customerMobile || '');
    setCustomerCity(q.customerCity || '');
    setCustomerState(q.customerState || 'Gujarat');
    setCustomerAddress(q.customerAddress || '');
    setReference(q.reference || '');
    setBasePrice(q.basePrice || 0);
    setDiscountPercent(q.discountPercent || 0);
    setSelectedOptions(q.selectedOptions || []);
    setExtraDemand(q.extraDemand || '');
    setExtraAmount(q.extraAmount || 0);
    setCustomDescription(q.customDescription || '');

    const m = models.find((x: any) => x.id === q.modelId || x.sheet_name === q.modelName);
    if (m) {
      setSelectedCategory(m.category);
      setSelectedModelId(m.id);
    }
    setIsCreateModalOpen(true);
  };

  // Delete Quotation
  const handleDelete = async (id: string, qNo: string) => {
    if (!window.confirm('Are you sure you want to delete Quotation ' + qNo + '?')) return;
    try {
      const res = await fetch('/api/quotations/' + id, { method: 'DELETE' });
      if (res.ok) {
        fetchQuotations();
      }
    } catch (err) {
      alert('Error deleting quotation: ' + err);
    }
  };

  // Convert Quotation into ERP Sales Order
  const handleConvertToSalesOrder = (q: any) => {
    if (window.confirm('Convert Quotation ' + q.quoteNo + ' into an active ERP Sales Order?')) {
      const soNum = 'SO-' + Date.now().toString().slice(-4);
      const custObj = customers.find(c => c.name.toLowerCase() === (q.customerCompany || q.customerName || '').toLowerCase());

      addSalesOrder({
        soNumber: soNum,
        customerId: custObj?.id || 'cust-direct',
        customerName: q.customerCompany || q.customerName || 'Direct Customer',
        machineModel: q.modelName || 'NEO PRIME 90-280 S',
        quantity: 1,
        unitPrice: q.totalAmount || q.basePrice || 0,
        totalAmount: q.totalAmount || q.basePrice || 0,
        orderDate: new Date().toISOString().split('T')[0],
        deliveryDate: new Date(Date.now() + 75 * 86400000).toISOString().split('T')[0],
        notes: `Converted from Official Quotation ${q.quoteNo} (${q.modelName || 'Machine'}). Options: ${(q.selectedOptions || []).map((o: any) => o.name).join(', ') || 'Standard'}`
      });

      alert('Successfully created ERP Sales Order ' + soNum + ' from Quotation ' + q.quoteNo + '!');
      setActiveModule('sales-orders');
    }
  };

  // Filtered Quotations List
  const filteredQuotations = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return quotations;
    return quotations.filter(q => 
      (q.quoteNo || '').toLowerCase().includes(term) ||
      (q.customerCompany || '').toLowerCase().includes(term) ||
      (q.customerName || '').toLowerCase().includes(term) ||
      (q.customerCity || '').toLowerCase().includes(term) ||
      (q.modelName || '').toLowerCase().includes(term) ||
      (q.createdBy?.fullName || '').toLowerCase().includes(term)
    );
  }, [quotations, searchTerm]);

  return (
    <div className="module-layout-container">
      {/* Sticky Header */}
      <div className="sticky-module-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#0284c7', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FileText size={20} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
              Machine Quotations
            </h2>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Central Sales Quotations, Pricing Calculator & Official GEC PDF Engine
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button className="btn btn-primary" onClick={openNewQuotationModal} style={{ gap: '0.4rem', fontWeight: 700 }}>
            <Plus size={16} /> New Machine Quotation
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="card" style={{ padding: '1.25rem', backgroundColor: 'var(--bg-card)', display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1 }}>
        
        {/* Search & Metrics Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ position: 'relative', width: '340px' }}>
            <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              className="input-field" 
              style={{ paddingLeft: '2rem', fontSize: '0.85rem' }} 
              placeholder="Search Quote No, Company, Model, Executive..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            <span>Total Quotes: <strong>{quotations.length}</strong></span>
            <span>Total Value: <strong>₹{quotations.reduce((sum, q) => sum + (q.totalAmount || 0), 0).toLocaleString()}</strong></span>
          </div>
        </div>

        {/* Quotations Table */}
        <div className="table-responsive" style={{ border: '1px solid var(--border-color)', borderRadius: '6px', overflow: 'hidden' }}>
          <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-tertiary)', borderBottom: '2px solid var(--border-color)' }}>
                <th>Quote No</th>
                <th>Date</th>
                <th>Customer / Company</th>
                <th>Machine Model</th>
                <th>Quoted Value (₹)</th>
                <th>Sales Executive</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredQuotations.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                    {loading ? 'Loading quotations...' : 'No quotations created yet. Click "New Machine Quotation" to generate.'}
                  </td>
                </tr>
              ) : (
                filteredQuotations.map((q) => (
                  <tr key={q.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--accent-primary)' }}>
                      {q.quoteNo}
                    </td>
                    <td style={{ fontSize: '0.85rem' }}>{q.date}</td>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{q.customerCompany || q.customerName || '-'}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {q.customerCity ? q.customerCity + ', ' : ''}{q.customerState || ''} {q.customerMobile ? '• 📞 ' + q.customerMobile : ''}
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-primary" style={{ fontWeight: 700, fontSize: '0.78rem' }}>
                        {q.modelName || 'NEO PRIME'}
                      </span>
                    </td>
                    <td style={{ fontWeight: 800, color: 'var(--accent-primary)', fontSize: '0.95rem' }}>
                      ₹{(q.totalAmount || 0).toLocaleString()}
                    </td>
                    <td>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{q.createdBy?.fullName || 'Sales Executive'}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{q.createdBy?.role || 'Staff'}</div>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                        <button 
                          className="btn btn-outline" 
                          style={{ padding: '0.25rem 0.5rem', color: '#0284c7', borderColor: '#0284c7' }} 
                          title="Print Official 4-Page Quotation PDF"
                          onClick={() => setPrintModalQuote(q.fullData || q)}
                        >
                          <Printer size={14} /> Print PDF
                        </button>
                        <button 
                          className="btn btn-outline" 
                          style={{ padding: '0.25rem 0.5rem', color: '#16a34a', borderColor: '#16a34a' }} 
                          title="Convert directly to ERP Sales Order"
                          onClick={() => handleConvertToSalesOrder(q)}
                        >
                          <ShoppingBag size={14} /> Make SO
                        </button>
                        <button 
                          className="btn btn-outline" 
                          style={{ padding: '0.25rem 0.45rem' }} 
                          title="Edit Quotation"
                          onClick={() => handleOpenEdit(q)}
                        >
                          <Edit2 size={13} />
                        </button>
                        <button 
                          className="btn btn-outline" 
                          style={{ padding: '0.25rem 0.45rem', color: 'var(--danger)' }} 
                          title="Delete Quotation"
                          onClick={() => handleDelete(q.id, q.quoteNo)}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE / EDIT QUOTATION MODAL */}
      {isCreateModalOpen && (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
          <div className="card" style={{ maxWidth: '950px', width: '95%', maxHeight: '90vh', overflowY: 'auto', padding: '1.5rem', backgroundColor: 'var(--bg-card)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                  {editingQuoteId ? 'Edit Quotation (' + quoteNo + ')' : 'New Machine Quotation Generator'}
                </h3>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  Auto-sequenced official quotation generator for Plastic Injection Moulding Machines
                </div>
              </div>
              <button className="btn btn-outline" onClick={() => setIsCreateModalOpen(false)}>
                <X size={16} /> (ESC)
              </button>
            </div>

            <form onSubmit={handleSaveQuotation} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {/* Top Row: Quote Meta */}
              <div className="form-grid-4">
                <div>
                  <label>Quotation Ref No (Auto-Sequenced) *</label>
                  <input 
                    type="text" 
                    required 
                    readOnly 
                    className="input-field" 
                    style={{ fontWeight: 700, color: 'var(--accent-primary)', backgroundColor: 'var(--bg-tertiary)' }}
                    value={quoteNo} 
                    onChange={(e) => setQuoteNo(e.target.value)} 
                  />
                </div>
                <div>
                  <label>Date *</label>
                  <input type="date" required className="input-field" value={quoteDate} onChange={(e) => setQuoteDate(e.target.value)} />
                </div>
                <div>
                  <label>Sales Executive</label>
                  <input type="text" readOnly className="input-field" style={{ backgroundColor: 'var(--bg-tertiary)', fontWeight: 600 }} value={currentUser?.fullName || 'Sales Executive'} />
                </div>
                <div>
                  <label>Enquiry Reference</label>
                  <input type="text" className="input-field" placeholder="e.g. Indiamart / Direct" value={reference} onChange={(e) => setReference(e.target.value)} />
                </div>
              </div>

              {/* Customer Information Block */}
              <div style={{ border: '1px solid var(--border-color)', borderRadius: '6px', padding: '1rem', backgroundColor: 'var(--bg-tertiary)' }}>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 700, margin: '0 0 0.75rem 0', color: 'var(--accent-primary)' }}>
                  Customer Details & Destination
                </h4>
                <div className="form-grid-3" style={{ marginBottom: '0.75rem' }}>
                  <div>
                    <label>Company Name * (Quick Lookup or Type)</label>
                    <input 
                      type="text" 
                      required 
                      className="input-field" 
                      placeholder="e.g. Apex Polymers Pvt Ltd"
                      value={customerCompany} 
                      onChange={(e) => handleCustomerSelect(e.target.value)} 
                      list="customer-suggestions"
                    />
                    <datalist id="customer-suggestions">
                      {customers.map(c => (
                        <option key={c.id} value={c.name}>{c.contactPerson} ({c.city})</option>
                      ))}
                    </datalist>
                  </div>
                  <div>
                    <label>Contact Person</label>
                    <input type="text" className="input-field" placeholder="e.g. Mr. Ramesh Patel" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
                  </div>
                  <div>
                    <label>Mobile Number</label>
                    <input type="text" className="input-field" placeholder="e.g. 9825293732" value={customerMobile} onChange={(e) => setCustomerMobile(e.target.value)} />
                  </div>
                </div>
                <div className="form-grid-3">
                  <div>
                    <label>City</label>
                    <input type="text" className="input-field" placeholder="e.g. Rajkot / Ahmedabad" value={customerCity} onChange={(e) => setCustomerCity(e.target.value)} />
                  </div>
                  <div>
                    <label>State</label>
                    <input type="text" className="input-field" placeholder="e.g. Gujarat" value={customerState} onChange={(e) => setCustomerState(e.target.value)} />
                  </div>
                  <div>
                    <label>Factory Address</label>
                    <input type="text" className="input-field" placeholder="e.g. GIDC Phase 2, Plot 45" value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} />
                  </div>
                </div>
              </div>

              {/* Machine Model Selection */}
              <div style={{ border: '1px solid var(--border-color)', borderRadius: '6px', padding: '1rem' }}>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 700, margin: '0 0 0.75rem 0', color: 'var(--accent-primary)' }}>
                  Machine Series & Model Selection
                </h4>
                
                {/* Series Tabs */}
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                  {categories.map((cat: any) => (
                    <button
                      key={cat.id}
                      type="button"
                      className={'btn ' + (selectedCategory === cat.id ? 'btn-primary' : 'btn-outline')}
                      style={{ padding: '0.35rem 0.75rem', fontSize: '0.82rem' }}
                      onClick={() => {
                        setSelectedCategory(cat.id);
                        const firstM = models.find((m: any) => m.category === cat.id);
                        if (firstM) handleModelChange(firstM.id);
                      }}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>

                <div className="form-grid-3">
                  <div>
                    <label>Select Model *</label>
                    <select 
                      className="input-field" 
                      style={{ fontWeight: 700 }}
                      value={selectedModelId} 
                      onChange={(e) => handleModelChange(e.target.value)}
                    >
                      {filteredModels.map((m: any) => (
                        <option key={m.id} value={m.id}>
                          {m.sheet_name} ({m.display_name || m.sheet_name}) - ₹{Math.round(m.base_price || 0).toLocaleString()}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label>List Base Price (₹)</label>
                    <input 
                      type="number" 
                      className="input-field" 
                      style={{ fontWeight: 700 }}
                      value={basePrice} 
                      onChange={(e) => setBasePrice(Number(e.target.value) || 0)} 
                    />
                  </div>
                  <div>
                    <label>Discount % ({discountPercent}%)</label>
                    <input 
                      type="number" 
                      min="0" 
                      max="50" 
                      step="0.5" 
                      className="input-field" 
                      value={discountPercent} 
                      onChange={(e) => setDiscountPercent(Number(e.target.value) || 0)} 
                    />
                  </div>
                </div>

                {selectedModelObj && (
                  <div style={{ marginTop: '0.75rem', padding: '0.75rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: '4px', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    <strong>Standard Machine Specifications:</strong> {selectedModelObj.description}
                  </div>
                )}
              </div>

              {/* Optional Upgrades & Extra Demands */}
              {selectedModelObj && selectedModelObj.options && selectedModelObj.options.length > 0 && (
                <div style={{ border: '1px solid var(--border-color)', borderRadius: '6px', padding: '1rem' }}>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 700, margin: '0 0 0.75rem 0', color: 'var(--accent-primary)' }}>
                    Select Optional Accessories & Attachments
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.5rem' }}>
                    {selectedModelObj.options.map((opt: any, idx: number) => {
                      const isChecked = selectedOptions.some(o => o.name === opt.name);
                      return (
                        <label 
                          key={idx} 
                          style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'space-between',
                            padding: '0.45rem 0.65rem', 
                            borderRadius: '4px',
                            backgroundColor: isChecked ? 'rgba(59, 130, 246, 0.1)' : 'var(--bg-tertiary)',
                            border: '1px solid ' + (isChecked ? 'var(--accent-primary)' : 'var(--border-color)'),
                            cursor: 'pointer',
                            fontSize: '0.82rem'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <input 
                              type="checkbox" 
                              checked={isChecked} 
                              onChange={() => toggleOption(opt.name, opt.price || 0)} 
                            />
                            <span>{opt.name}</span>
                          </div>
                          <span style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>+₹{(opt.price || 0).toLocaleString()}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Extra Custom Demands */}
              <div className="form-grid-2">
                <div>
                  <label>Special Extra Demand / Custom Fixture Notes</label>
                  <input 
                    type="text" 
                    className="input-field" 
                    placeholder="e.g. Special Ceramic Nozzle, Extended Stroke" 
                    value={extraDemand} 
                    onChange={(e) => setExtraDemand(e.target.value)} 
                  />
                </div>
                <div>
                  <label>Extra Amount for Custom Demand (₹)</label>
                  <input 
                    type="number" 
                    className="input-field" 
                    placeholder="0" 
                    value={extraAmount === 0 ? '' : extraAmount} 
                    onChange={(e) => setExtraAmount(Number(e.target.value) || 0)} 
                  />
                </div>
              </div>

              {/* Final Summary Calculation Card */}
              <div style={{ padding: '1rem', borderRadius: '6px', backgroundColor: 'var(--bg-tertiary)', border: '2px solid var(--accent-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    Base Price: ₹{basePrice.toLocaleString()} | Discount ({discountPercent}%): -₹{calculatedDiscountAmt.toLocaleString()} | Options: +₹{calculatedOptionsTotal.toLocaleString()}
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent-primary)' }}>
                    Quoted Final Ex-Factory Value: ₹{calculatedGrandTotal.toLocaleString()}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button type="button" className="btn btn-outline" onClick={() => setIsCreateModalOpen(false)}>
                    Cancel (ESC)
                  </button>
                  <button type="submit" className="btn btn-primary" style={{ padding: '0.5rem 1.25rem', fontWeight: 800 }}>
                    <CheckCircle2 size={16} /> Save Quotation
                  </button>
                </div>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* PRINT OFFICIAL 4-PAGE PDF MODAL */}
      {printModalQuote && (
        <Modal
          isOpen={true}
          onClose={() => setPrintModalQuote(null)}
          title={'GEC Official Quotation - ' + printModalQuote.quoteNo}
        >
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
            <button className="btn btn-primary" onClick={() => window.print()}>
              <Printer size={16} /> Print Document / Save PDF
            </button>
          </div>
          <div id="printable-area">
            <GECQuotationPrintView quotation={printModalQuote} />
          </div>
        </Modal>
      )}

    </div>
  );
};
