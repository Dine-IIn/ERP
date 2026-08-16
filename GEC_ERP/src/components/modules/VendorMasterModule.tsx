import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import { Modal } from '../common/Modal';
import { BulkUploadModal } from '../common/BulkUploadModal';
import { Users, Plus, Edit2, Trash2, Settings, Upload, MapPin, Phone, Mail, FileText, CreditCard, Search, FileSpreadsheet } from 'lucide-react';
import { Vendor } from '../../types/erp';
import { parseVendorsSheet } from '../../utils/csvParser';
import { openLiveModuleSheet } from '../../utils/sheetFolderManager';

export const VendorMasterModule: React.FC = () => {
  const { 
    vendors, vendorCategories, addVendor, updateVendor, deleteVendor, 
    bulkAddVendors, addVendorCategory, deleteVendorCategory, searchTerm, setSearchTerm 
  } = useERP();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);

  const [newCatInput, setNewCatInput] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL');

  const [formData, setFormData] = useState({
    vendorCode: '',
    name: '',
    category: vendorCategories[0] || 'Foundry & Casting',
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

  const filteredVendors = vendors.filter(v => {
    const matchesSearch = 
      v.vendorCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.contactPerson.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.gstin.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = selectedCategoryFilter === 'ALL' || v.category === selectedCategoryFilter;

    return matchesSearch && matchesCategory;
  });

  const handleOpenAddModal = () => {
    setEditingVendor(null);
    setFormData({
      vendorCode: `VEND-GEC-${String(vendors.length + 1).padStart(3, '0')}`,
      name: '',
      category: vendorCategories[0] || 'Foundry & Casting',
      contactPerson: '',
      phone: '+91 ',
      email: '',
      city: 'Ahmedabad',
      gstin: '24',
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
      category: v.category,
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

  const handleAddCategorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newCatInput.trim()) {
      addVendorCategory(newCatInput.trim());
      setNewCatInput('');
    }
  };

  const handleOpenSheet = () => {
    openLiveModuleSheet('Vendors', 'GEC_Vendors_Live', vendors, [
      { key: 'vendorCode', label: 'Vendor Code' },
      { key: 'name', label: 'Vendor Name' },
      { key: 'category', label: 'Specialization Category' },
      { key: 'contactPerson', label: 'Contact Person' },
      { key: 'phone', label: 'Phone' },
      { key: 'email', label: 'Email' },
      { key: 'city', label: 'City' },
      { key: 'gstin', label: 'GSTIN' },
      { key: 'pan', label: 'PAN (Optional)' },
      { key: 'bankName', label: 'Bank Name' },
      { key: 'accountNumber', label: 'Account Number' },
      { key: 'ifscCode', label: 'IFSC Code' }
    ]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingVendor) {
      updateVendor({ ...editingVendor, ...formData });
    } else {
      addVendor(formData);
    }
    setIsModalOpen(false);
  };

  const templateCSV = `Code,Name,Category,ContactPerson,Phone,Email,City,GSTIN,PAN,BankName,AccountNumber,IFSC\nVEND-GEC-099,Apex Nitriding Works,Heat Treatment & Nitriding,Rakesh Shah,9825099887,contact@apexnitride.com,Ahmedabad,24AAAPA1122K1Z5,AAAPA1122K,HDFC Bank,502000887766,HDFC0000123`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>Vendor & Supplier Master</h2>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-outline" onClick={() => setIsCatModalOpen(true)}>
            <Settings size={16} /> Manage Specializations
          </button>
          <button className="btn btn-outline" onClick={handleOpenSheet}>
            <FileSpreadsheet size={16} /> Open Sheet
          </button>
          <button className="btn btn-outline" onClick={() => setIsBulkModalOpen(true)}>
            <Upload size={16} /> Bulk Upload Sheet
          </button>
          <button className="btn btn-primary" onClick={handleOpenAddModal}>
            <Plus size={16} /> Add Vendor
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="card" style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', backgroundColor: 'var(--bg-card)' }}>
        <div style={{ position: 'relative', width: '320px' }}>
          <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search vendor code, supplier name, city, GSTIN..."
            className="input-field"
            style={{ paddingLeft: '2.25rem' }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Specialization:</div>
          <select 
            className="input-field" 
            style={{ width: '220px' }}
            value={selectedCategoryFilter}
            onChange={(e) => setSelectedCategoryFilter(e.target.value)}
          >
            <option value="ALL">All Categories ({vendors.length})</option>
            {vendorCategories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Vendor Table */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Vendor Code</th>
              <th>Supplier Name</th>
              <th>Specialization Category</th>
              <th>Contact Details</th>
              <th>Location</th>
              <th>GSTIN & PAN</th>
              <th>Bank Details</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredVendors.map(v => (
              <tr key={v.id}>
                <td style={{ fontWeight: 700, color: 'var(--accent-primary)', fontFamily: 'monospace' }}>
                  {v.vendorCode}
                </td>
                <td style={{ fontWeight: 600 }}>{v.name}</td>
                <td>
                  <span className="badge badge-info">{v.category}</span>
                </td>
                <td style={{ fontSize: '0.85rem' }}>
                  <div>{v.contactPerson}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{v.phone}</div>
                </td>
                <td style={{ fontWeight: 500 }}>{v.city}</td>
                <td style={{ fontSize: '0.75rem', fontFamily: 'monospace' }}>
                  <div>GST: {v.gstin}</div>
                  {v.pan && <div style={{ color: 'var(--text-muted)' }}>PAN: {v.pan}</div>}
                </td>
                <td style={{ fontSize: '0.75rem' }}>
                  {v.bankName ? (
                    <div>
                      <div>{v.bankName}</div>
                      <div style={{ color: 'var(--text-muted)', fontFamily: 'monospace' }}>{v.accountNumber} ({v.ifscCode})</div>
                    </div>
                  ) : (
                    <span style={{ color: 'var(--text-muted)' }}>-</span>
                  )}
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '0.35rem' }}>
                    <button className="btn btn-outline" style={{ padding: '0.3rem 0.5rem' }} onClick={() => handleOpenEditModal(v)}>
                      <Edit2 size={14} />
                    </button>
                    <button className="btn btn-outline" style={{ padding: '0.3rem 0.5rem', color: 'var(--danger)' }} onClick={() => deleteVendor(v.id)}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal: Manage Vendor Categories */}
      <Modal
        isOpen={isCatModalOpen}
        onClose={() => setIsCatModalOpen(false)}
        title="Manage Vendor Specialization Categories"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <form onSubmit={handleAddCategorySubmit} style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              required
              className="input-field"
              placeholder="Enter new category (e.g. Laser Cutting)"
              value={newCatInput}
              onChange={(e) => setNewCatInput(e.target.value)}
            />
            <button type="submit" className="btn btn-primary" style={{ whiteSpace: 'nowrap' }}>
              <Plus size={16} /> Add Category
            </button>
          </form>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '200px', overflowY: 'auto' }}>
            {vendorCategories.map(cat => (
              <div key={cat} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.75rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: '0.375rem' }}>
                <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{cat}</span>
                <button className="btn btn-outline" style={{ padding: '0.2rem 0.4rem', color: 'var(--danger)' }} onClick={() => deleteVendorCategory(cat)}>
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </Modal>

      {/* Add / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingVendor ? 'Edit Vendor Details' : 'Register New Vendor'}
      >
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.25rem' }}>Vendor Code</label>
              <input type="text" required className="input-field" value={formData.vendorCode} onChange={(e) => setFormData({ ...formData, vendorCode: e.target.value })} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.25rem' }}>Specialization Category</label>
              <select className="input-field" value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })}>
                {vendorCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.25rem' }}>Supplier / Vendor Name</label>
            <input type="text" required className="input-field" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.25rem' }}>Contact Person</label>
              <input type="text" required className="input-field" value={formData.contactPerson} onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.25rem' }}>Phone</label>
              <input type="text" required className="input-field" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.25rem' }}>City</label>
              <input type="text" required className="input-field" value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.25rem' }}>Email</label>
              <input type="email" required className="input-field" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.25rem' }}>GSTIN</label>
              <input type="text" required className="input-field" value={formData.gstin} onChange={(e) => setFormData({ ...formData, gstin: e.target.value })} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.25rem' }}>PAN (Optional)</label>
              <input type="text" className="input-field" value={formData.pan} onChange={(e) => setFormData({ ...formData, pan: e.target.value })} />
            </div>
          </div>

          {/* Optional Bank Details */}
          <div style={{ padding: '0.875rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: '0.5rem', border: '1px solid var(--border-color)' }}>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Bank Details (Optional)</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Bank Name</label>
                <input type="text" className="input-field" value={formData.bankName} onChange={(e) => setFormData({ ...formData, bankName: e.target.value })} />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Account Number</label>
                <input type="text" className="input-field" value={formData.accountNumber} onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })} />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>IFSC Code</label>
                <input type="text" className="input-field" value={formData.ifscCode} onChange={(e) => setFormData({ ...formData, ifscCode: e.target.value })} />
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary">Save Vendor</button>
          </div>
        </form>
      </Modal>

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

    </div>
  );
};
