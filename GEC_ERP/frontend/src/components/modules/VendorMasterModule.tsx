import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import { BulkUploadModal } from '../common/BulkUploadModal';
import { PrintManagerModal } from '../printTemplates/PrintManagerModal';
import { VendorListPrintView } from '../printTemplates/ItemMasterPrintTemplates';
import { openLiveModuleSheet } from '../../utils/sheetFolderManager';
import { Users, Plus, Edit2, Trash2, Upload, Search, FileSpreadsheet, ArrowUpDown, ArrowUp, ArrowDown, ArrowLeft, X, Printer, RefreshCw } from 'lucide-react';
import { Vendor } from '../../types/erp';
import { parseVendorsSheet } from '../../utils/csvParser';
import { useTableKeyboardNav } from '../../hooks/useTableKeyboardNav';
import { ExportFieldSelectorModal, FieldOption } from '../common/ExportFieldSelectorModal';

const templateCSV = `Code,Name,Category,ContactPerson,Phone,Email,City,GSTIN,PAN,BankName,AccountNumber,IFSC\nVEND-GEC-099,Apex Nitriding Works,Raw Material Supplier,Rakesh Shah,9825099887,contact@apexnitride.com,Ahmedabad,24AAAPA1122K1Z5,AAAPA1122K,HDFC Bank,502000887766,HDFC0000123`;

type SortField = 'vendorCode' | 'name' | 'city' | 'phone' | 'category';

export const VendorMasterModule: React.FC = () => {
  const { 
    vendors, addVendor, updateVendor, deleteVendor, 
    bulkAddVendors, searchTerm, setSearchTerm 
  } = useERP();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);

  // Single Column Sorting State
  const [sortField, setSortField] = useState<SortField>('vendorCode');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const [formData, setFormData] = useState({
    vendorCode: '',
    name: '',
    category: 'Raw Material Supplier',
    contactPerson: '',
    phone: '',
    email: '',
    city: 'Ahmedabad',
    gstin: '',
    pan: '',
    bankName: '',
    accountNumber: '',
    ifscCode: ''
  });

  const handleSortToggle = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Universal @history search handling
  const isHistorySearch = searchTerm.toLowerCase().includes('@history');
  const cleanSearchTerm = searchTerm.replace(/@history/gi, '').trim().toLowerCase();

  const filteredVendors = vendors
    .filter(v =>
      !cleanSearchTerm ||
      v.name.toLowerCase().includes(cleanSearchTerm) ||
      v.vendorCode.toLowerCase().includes(cleanSearchTerm) ||
      v.city.toLowerCase().includes(cleanSearchTerm) ||
      v.contactPerson.toLowerCase().includes(cleanSearchTerm) ||
      v.gstin.toLowerCase().includes(cleanSearchTerm)
    )
    .sort((a, b) => {
      let valA: any = a[sortField] || '';
      let valB: any = b[sortField] || '';

      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

  // Table Keyboard Navigation
  const { selectedIndex, setSelectedIndex } = useTableKeyboardNav(filteredVendors, (v) => handleOpenEditModal(v));

  const handleOpenAddModal = () => {
    setEditingVendor(null);
    setFormData({
      vendorCode: `VEND-GEC-${String(vendors.length + 1).padStart(3, '0')}`,
      name: '',
      category: 'Raw Material Supplier',
      contactPerson: '',
      phone: '',
      email: '',
      city: 'Ahmedabad',
      gstin: '',
      pan: '',
      bankName: '',
      accountNumber: '',
      ifscCode: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (v: Vendor) => {
    setEditingVendor(v);
    setFormData({
      vendorCode: v.vendorCode,
      name: v.name,
      category: v.category || 'Raw Material Supplier',
      contactPerson: v.contactPerson,
      phone: v.phone,
      email: v.email,
      city: v.city,
      gstin: v.gstin,
      pan: v.pan || '',
      bankName: v.bankName || '',
      accountNumber: v.accountNumber || '',
      ifscCode: v.ifscCode || ''
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingVendor) {
      updateVendor({
        ...editingVendor,
        ...formData
      });
    } else {
      addVendor(formData);
    }
    setIsModalOpen(false);
  };

  // Custom Export Field Definitions
  const availableExportFields: FieldOption<Vendor>[] = [
    { key: 'vendorCode', label: 'Vendor Code' },
    { key: 'name', label: 'Vendor Name' },
    { key: 'category', label: 'Category' },
    { key: 'contactPerson', label: 'Contact Person' },
    { key: 'phone', label: 'Phone Number' },
    { key: 'email', label: 'Email Address' },
    { key: 'city', label: 'City' },
    { key: 'gstin', label: 'GSTIN' },
    { key: 'pan', label: 'PAN' },
    { key: 'bankName', label: 'Bank Name' },
    { key: 'accountNumber', label: 'Account Number' },
    { key: 'ifscCode', label: 'IFSC Code' }
  ];

  return (
    <div className="module-layout-container">
      
      {/* Top Action Header */}
      <div className="sticky-module-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {isModalOpen && (
            <button className="btn btn-outline" style={{ padding: '0.35rem 0.65rem', gap: '0.35rem', fontWeight: 600 }} onClick={() => setIsModalOpen(false)}>
              <ArrowLeft size={16} /> Back to Vendor List <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>(ESC)</span>
            </button>
          )}
          <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
            {isModalOpen ? (editingVendor ? `Editing Vendor: ${editingVendor.vendorCode}` : 'Registering New Vendor') : `All Vendor Masters (${filteredVendors.length})`}
          </span>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-outline" onClick={() => {
            const data = filteredVendors.map(v => ({
              vendorCode: v.vendorCode,
              name: v.name,
              category: v.category || '',
              contactPerson: v.contactPerson,
              phone: v.phone,
              email: v.email,
              city: v.city,
              gstin: v.gstin,
              pan: v.pan || '',
              bankName: v.bankName || '',
              accountNumber: v.accountNumber || '',
              ifscCode: v.ifscCode || ''
            }));

            const headers: { key: keyof typeof data[0]; label: string }[] = [
              { key: 'vendorCode', label: 'Vendor Code' },
              { key: 'name', label: 'Vendor Name' },
              { key: 'category', label: 'Category' },
              { key: 'contactPerson', label: 'Contact Person' },
              { key: 'phone', label: 'Phone' },
              { key: 'email', label: 'Email' },
              { key: 'city', label: 'City' },
              { key: 'gstin', label: 'GSTIN' },
              { key: 'pan', label: 'PAN' },
              { key: 'bankName', label: 'Bank Name' },
              { key: 'accountNumber', label: 'Account Number' },
              { key: 'ifscCode', label: 'IFSC Code' }
            ];

            openLiveModuleSheet('Vendors', 'GEC_Vendors_Live', data, headers);
          }} title="Sync and maintain live CSV sheet">
            <RefreshCw size={14} /> Live Sheet
          </button>
          <button type="button" className="btn btn-outline" onClick={() => setPrintModalOpen(true)} title="Print filtered vendors directory report">
            <Printer size={14} /> Print Report
          </button>
          <button className="btn btn-outline" onClick={() => setIsExportModalOpen(true)}>
            <FileSpreadsheet size={16} /> Open Sheet ({filteredVendors.length} filtered)
          </button>
          <button className="btn btn-outline" onClick={() => setIsBulkModalOpen(true)}>
            <Upload size={16} /> Bulk Create / Update
          </button>
          {!isModalOpen && (
            <button className="btn btn-primary" onClick={handleOpenAddModal}>
              <Plus size={16} /> Register New Vendor
            </button>
          )}
        </div>
      </div>

      {/* Main Search & Table OR In-Screen Form Panel */}
      {isModalOpen ? (
        /* In-Screen Page Panel: Add / Edit Vendor */
        <div className="card" style={{ padding: '1.25rem', backgroundColor: 'var(--bg-card)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
              {editingVendor ? `Edit Vendor Details (${editingVendor.vendorCode})` : 'Register New Vendor Master'}
            </h3>
            <button type="button" className="btn btn-outline" style={{ padding: '0.25rem 0.5rem', fontSize: '0.78rem' }} onClick={() => setIsModalOpen(false)}>
              <X size={15} /> Close (ESC)
            </button>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr', gap: '1rem' }}>
              <div>
                <label>Vendor Code</label>
                <input type="text" required className="input-field" value={formData.vendorCode} onChange={(e) => setFormData({ ...formData, vendorCode: e.target.value })} />
              </div>
              <div>
                <label>Vendor / Supplier Name</label>
                <input type="text" required className="input-field" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
              </div>
              <div>
                <label>Category</label>
                <select className="input-field" value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })}>
                  <option value="Raw Material Supplier">Raw Material Supplier</option>
                  <option value="Machining Jobworker">Machining Jobworker</option>
                  <option value="Heat Treatment Contractor">Heat Treatment Contractor</option>
                  <option value="Bought-Out Component Vendor">Bought-Out Component Vendor</option>
                  <option value="Electrical & Automation">Electrical & Automation</option>
                  <option value="Consumables & Tools">Consumables & Tools</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label>Contact Person</label>
                <input type="text" required className="input-field" value={formData.contactPerson} onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })} />
              </div>
              <div>
                <label>Phone Number</label>
                <input type="text" required className="input-field" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
              </div>
              <div>
                <label>Email Address</label>
                <input type="email" required className="input-field" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
              </div>
              <div>
                <label>City</label>
                <input type="text" required className="input-field" value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label>GSTIN</label>
                <input type="text" required className="input-field" value={formData.gstin} onChange={(e) => setFormData({ ...formData, gstin: e.target.value })} />
              </div>
              <div>
                <label>PAN (Optional)</label>
                <input type="text" className="input-field" value={formData.pan} onChange={(e) => setFormData({ ...formData, pan: e.target.value })} />
              </div>
            </div>

            {/* Banking Details */}
            <div style={{ padding: '0.875rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: '0.5rem', border: '1px solid var(--border-color)' }}>
              <h4 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Banking Details (Optional)</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem' }}>Bank Name</label>
                  <input type="text" className="input-field" value={formData.bankName} onChange={(e) => setFormData({ ...formData, bankName: e.target.value })} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem' }}>Account Number</label>
                  <input type="text" className="input-field" value={formData.accountNumber} onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem' }}>IFSC Code</label>
                  <input type="text" className="input-field" value={formData.ifscCode} onChange={(e) => setFormData({ ...formData, ifscCode: e.target.value })} />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel (ESC)</button>
              <button type="submit" className="btn btn-primary">{editingVendor ? 'Save Changes' : 'Register Vendor'}</button>
            </div>
          </form>
        </div>
      ) : (
        <>
          {/* Module Search Input */}
          <div className="card" style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '1rem', backgroundColor: 'var(--bg-card)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', width: '380px', maxWidth: '100%' }}>
                <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="Search vendor code, name, city, GSTIN... (type @history)"
                  className="input-field"
                  style={{ paddingLeft: '2.25rem' }}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {isHistorySearch && (
                <span className="badge" style={{ backgroundColor: '#7c3aed', color: '#ffffff', fontSize: '0.75rem', fontWeight: 700 }}>
                  📜 History Search Active
                </span>
              )}
            </div>
          </div>

          {/* Vendors Table */}
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th onClick={() => handleSortToggle('vendorCode')} style={{ cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      Vendor Code {sortField === 'vendorCode' ? (sortOrder === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} />) : <ArrowUpDown size={12} color="var(--text-muted)" />}
                    </div>
                  </th>
                  <th onClick={() => handleSortToggle('name')} style={{ cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      Vendor Name {sortField === 'name' ? (sortOrder === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} />) : <ArrowUpDown size={12} color="var(--text-muted)" />}
                    </div>
                  </th>
                  <th onClick={() => handleSortToggle('category')} style={{ cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      Category {sortField === 'category' ? (sortOrder === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} />) : <ArrowUpDown size={12} color="var(--text-muted)" />}
                    </div>
                  </th>
                  <th>Contact Person</th>
                  <th onClick={() => handleSortToggle('city')} style={{ cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      City {sortField === 'city' ? (sortOrder === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} />) : <ArrowUpDown size={12} color="var(--text-muted)" />}
                    </div>
                  </th>
                  <th>GSTIN</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredVendors.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                      No vendors found matching search criteria.
                    </td>
                  </tr>
                ) : (
                  filteredVendors.map((v, idx) => {
                    const isNavSelected = selectedIndex === idx;

                    return (
                      <tr
                        key={v.id}
                        onClick={() => {
                          setSelectedIndex(idx);
                          handleOpenEditModal(v);
                        }}
                        style={{
                          backgroundColor: isNavSelected ? 'rgba(59, 130, 246, 0.18)' : 'transparent',
                          cursor: 'pointer'
                        }}
                      >
                        <td style={{ fontWeight: 700, color: 'var(--accent-primary)', fontFamily: 'monospace' }}>
                          {v.vendorCode}
                        </td>
                        <td style={{ fontWeight: 600 }}>{v.name}</td>
                        <td>
                          <span className="badge badge-secondary" style={{ fontSize: '0.72rem' }}>{v.category || 'Supplier'}</span>
                        </td>
                        <td>{v.contactPerson} ({v.phone})</td>
                        <td>{v.city}</td>
                        <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{v.gstin}</td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <div style={{ display: 'flex', gap: '0.35rem' }}>
                            <button className="btn btn-outline" style={{ padding: '0.25rem 0.45rem' }} onClick={() => handleOpenEditModal(v)}>
                              <Edit2 size={13} />
                            </button>
                            <button className="btn btn-outline" style={{ padding: '0.25rem 0.45rem', color: 'var(--danger)' }} onClick={() => deleteVendor(v.id)}>
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Bulk Upload Modal */}
      <BulkUploadModal<Omit<Vendor, 'id'>>
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        title="Bulk Upload Vendor Master Sheet"
        templateCSV={templateCSV}
        templateFileName="gec_vendors_template.csv"
        onParse={(text) => parseVendorsSheet(text, vendors)}
        onConfirmImport={(newRows) => bulkAddVendors(newRows)}
      />

      {/* Export Field Selector Modal */}
      <ExportFieldSelectorModal<Vendor>
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        title="Custom Export Live Sheet Options"
        subfolder="Vendors"
        fileName="GEC_Filtered_Vendors_Live"
        data={filteredVendors}
        availableFields={availableExportFields}
      />

      {/* Feature-Wise Modular Print Manager Modal */}
      <PrintManagerModal
        isOpen={printModalOpen}
        onClose={() => setPrintModalOpen(false)}
        title="Print Vendor Master Directory"
        documentRefNumber="VENDOR-DIRECTORY"
      >
        <VendorListPrintView vendors={filteredVendors} filterLabel={isHistorySearch ? 'All Active & Historical Vendor Partners' : 'Active Approved Vendor Directory'} />
      </PrintManagerModal>
    </div>
  );
};
