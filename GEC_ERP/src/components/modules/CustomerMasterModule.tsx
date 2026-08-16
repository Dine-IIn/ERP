import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import { Modal } from '../common/Modal';
import { BulkUploadModal } from '../common/BulkUploadModal';
import { Contact, Plus, Edit2, Trash2, Upload, Search, FileSpreadsheet } from 'lucide-react';
import { Customer } from '../../types/erp';
import { parseCustomersSheet } from '../../utils/csvParser';
import { openLiveModuleSheet } from '../../utils/sheetFolderManager';

export const CustomerMasterModule: React.FC = () => {
  const { customers, addCustomer, updateCustomer, deleteCustomer, bulkAddCustomers, searchTerm, setSearchTerm } = useERP();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  const [formData, setFormData] = useState({
    customerCode: '',
    name: '',
    contactPerson: '',
    phone: '',
    email: '',
    gstin: '',
    pan: '',
    bankName: '',
    accountNumber: '',
    ifscCode: '',
    address: '',
    city: 'Ahmedabad',
    state: 'Gujarat'
  });

  const filteredCustomers = customers.filter(c =>
    c.customerCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.contactPerson.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.gstin.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenAddModal = () => {
    setEditingCustomer(null);
    setFormData({
      customerCode: `CUST-GEC-${String(customers.length + 1).padStart(3, '0')}`,
      name: '',
      contactPerson: '',
      phone: '+91 ',
      email: '',
      gstin: '24',
      pan: '',
      bankName: '',
      accountNumber: '',
      ifscCode: '',
      address: '',
      city: 'Ahmedabad',
      state: 'Gujarat'
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (c: Customer) => {
    setEditingCustomer(c);
    setFormData({
      customerCode: c.customerCode,
      name: c.name,
      contactPerson: c.contactPerson,
      phone: c.phone,
      email: c.email,
      gstin: c.gstin,
      pan: c.pan || '',
      bankName: c.bankName || '',
      accountNumber: c.accountNumber || '',
      ifscCode: c.ifscCode || '',
      address: c.address,
      city: c.city,
      state: c.state
    });
    setIsModalOpen(true);
  };

  const handleOpenSheet = () => {
    openLiveModuleSheet('Customers', 'GEC_Customers_Live', customers, [
      { key: 'customerCode', label: 'Customer Code' },
      { key: 'name', label: 'Client / Company Name' },
      { key: 'contactPerson', label: 'Contact Person' },
      { key: 'phone', label: 'Phone' },
      { key: 'email', label: 'Email' },
      { key: 'city', label: 'City' },
      { key: 'state', label: 'State' },
      { key: 'address', label: 'Address' },
      { key: 'gstin', label: 'GSTIN' },
      { key: 'pan', label: 'PAN (Optional)' },
      { key: 'bankName', label: 'Bank Name' },
      { key: 'accountNumber', label: 'Account Number' },
      { key: 'ifscCode', label: 'IFSC Code' }
    ]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCustomer) {
      updateCustomer({ ...editingCustomer, ...formData });
    } else {
      addCustomer(formData);
    }
    setIsModalOpen(false);
  };

  const templateCSV = `Code,Name,ContactPerson,Phone,Email,GSTIN,PAN,BankName,AccountNumber,IFSC,Address,City,State\nCUST-GEC-099,Apex Polymers Ltd,Sanjay Shah,9825012345,purchasing@apexpolymers.com,24AAAPA9988J1Z2,AAAPA9988J,ICICI Bank,001205099887,ICIC0000012,GIDC Phase 2,Rajkot,Gujarat`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>Customer & Client Master</h2>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-outline" onClick={handleOpenSheet}>
            <FileSpreadsheet size={16} /> Open Sheet
          </button>
          <button className="btn btn-outline" onClick={() => setIsBulkModalOpen(true)}>
            <Upload size={16} /> Bulk Upload Sheet
          </button>
          <button className="btn btn-primary" onClick={handleOpenAddModal}>
            <Plus size={16} /> Add Customer
          </button>
        </div>
      </div>

      {/* Inline Search Bar */}
      <div className="card" style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', backgroundColor: 'var(--bg-card)' }}>
        <div style={{ position: 'relative', width: '360px' }}>
          <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search customer code, name, city, GSTIN..."
            className="input-field"
            style={{ paddingLeft: '2.25rem' }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Customer Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.25rem' }}>
        {filteredCustomers.map(c => (
          <div key={c.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-primary)', fontFamily: 'monospace' }}>
                    {c.customerCode}
                  </span>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                    {c.name}
                  </h3>
                </div>
                <div style={{ display: 'flex', gap: '0.35rem' }}>
                  <button className="btn btn-outline" style={{ padding: '0.3rem 0.5rem' }} onClick={() => handleOpenEditModal(c)}>
                    <Edit2 size={14} />
                  </button>
                  <button className="btn btn-outline" style={{ padding: '0.3rem 0.5rem', color: 'var(--danger)' }} onClick={() => deleteCustomer(c.id)}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                <div><strong>Contact Person:</strong> {c.contactPerson} ({c.phone})</div>
                <div><strong>Email:</strong> {c.email}</div>
                <div><strong>Location:</strong> {c.city}, {c.state}</div>
                <div style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  GSTIN: {c.gstin} {c.pan ? `| PAN: ${c.pan}` : ''}
                </div>
                {c.bankName && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', backgroundColor: 'var(--bg-tertiary)', padding: '0.35rem 0.5rem', borderRadius: '0.25rem' }}>
                    Bank: {c.bankName} - A/C: {c.accountNumber} ({c.ifscCode})
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCustomer ? 'Edit Customer Details' : 'Register New Customer'}
      >
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.25rem' }}>Customer Code</label>
              <input type="text" required className="input-field" value={formData.customerCode} onChange={(e) => setFormData({ ...formData, customerCode: e.target.value })} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.25rem' }}>Company / Client Name</label>
              <input type="text" required className="input-field" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
            </div>
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
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.25rem' }}>Email</label>
              <input type="email" required className="input-field" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
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

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.25rem' }}>Address</label>
              <input type="text" required className="input-field" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.25rem' }}>City</label>
              <input type="text" required className="input-field" value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.25rem' }}>State</label>
              <input type="text" required className="input-field" value={formData.state} onChange={(e) => setFormData({ ...formData, state: e.target.value })} />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary">Save Customer</button>
          </div>
        </form>
      </Modal>

      {/* Bulk Upload Modal */}
      <BulkUploadModal<Omit<Customer, 'id'>>
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        title="Bulk Upload Customer Master Sheet"
        templateCSV={templateCSV}
        templateFileName="gec_customers_template.csv"
        onParse={(text) => parseCustomersSheet(text, customers)}
        onConfirmImport={(newRows) => bulkAddCustomers(newRows)}
      />

    </div>
  );
};
