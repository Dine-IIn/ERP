import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import { Modal } from '../common/Modal';
import { AutocompleteSelect, AutocompleteOption } from '../common/AutocompleteSelect';
import { PrintDocumentModal } from '../common/PrintDocumentModal';
import { ShoppingBag, Plus, ArrowRight, CheckCircle2, Search, Printer, FileSpreadsheet } from 'lucide-react';
import { SalesOrder } from '../../types/erp';
import { openLiveModuleSheet } from '../../utils/sheetFolderManager';

export const SalesOrderModule: React.FC = () => {
  const { 
    salesOrders, customers, boms, addSalesOrder, generateWOFromSO, searchTerm, setSearchTerm 
  } = useERP();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [printData, setPrintData] = useState<any>(null);

  const [soForm, setSoForm] = useState({
    soNumber: '',
    customerId: customers[0]?.id || '',
    customerName: customers[0]?.name || '',
    machineModel: boms[0]?.machineModel || 'GEC-250T Servo Hydraulic Injection Moulding Machine',
    quantity: 1,
    orderDate: new Date().toISOString().split('T')[0],
    deliveryDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    customNotes: ''
  });

  const customerOptions: AutocompleteOption[] = customers.map(c => ({
    value: c.id,
    label: c.name,
    sublabel: `${c.customerCode} | ${c.city}`
  }));

  const machineModelOptions: AutocompleteOption[] = Array.from(
    new Set([
      'GEC-250T Servo Hydraulic Injection Moulding Machine',
      'GEC-180T Compact Servo Moulding Machine',
      'GEC-350T Heavy Duty Plastic Moulding Machine',
      ...boms.map(b => b.machineModel)
    ])
  ).map(m => ({
    value: m,
    label: m,
    sublabel: 'BOM Model'
  }));

  const filteredSOs = salesOrders.filter(s =>
    s.soNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.machineModel.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.status.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenModal = () => {
    setSoForm({
      soNumber: `SO-GEC-2026-${String(salesOrders.length + 1).padStart(3, '0')}`,
      customerId: '',
      customerName: '',
      machineModel: '',
      quantity: 1,
      orderDate: new Date().toISOString().split('T')[0],
      deliveryDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      customNotes: ''
    });
    setIsModalOpen(true);
  };

  const handlePrintSO = (so: SalesOrder) => {
    setPrintData(so);
    setPrintModalOpen(true);
  };

  const handleOpenSheet = () => {
    openLiveModuleSheet('SalesOrders', 'GEC_Sales_Orders_Live', salesOrders, [
      { key: 'soNumber', label: 'SO Number' },
      { key: 'customerName', label: 'Customer Name' },
      { key: 'machineModel', label: 'Ordered Machine Model' },
      { key: 'quantity', label: 'Order Quantity' },
      { key: 'orderDate', label: 'Order Date' },
      { key: 'deliveryDate', label: 'Target Delivery' },
      { key: 'status', label: 'SO Status' },
      { key: 'customNotes', label: 'Customization Notes' }
    ]);
  };

  const handleCustomerChange = (cId: string) => {
    const cObj = customers.find(c => c.id === cId);
    if (cObj) {
      setSoForm({
        ...soForm,
        customerId: cObj.id,
        customerName: cObj.name
      });
    }
  };

  const handleSubmitSO = (e: React.FormEvent) => {
    e.preventDefault();
    const linkedBOM = boms.find(b => b.machineModel === soForm.machineModel);

    addSalesOrder({
      soNumber: soForm.soNumber,
      customerId: soForm.customerId,
      customerName: soForm.customerName,
      machineModel: soForm.machineModel,
      quantity: Number(soForm.quantity),
      orderDate: soForm.orderDate,
      deliveryDate: soForm.deliveryDate,
      bomId: linkedBOM?.id,
      customNotes: soForm.customNotes
    });

    setIsModalOpen(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>Sales Orders (SO)</h2>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-outline" onClick={handleOpenSheet}>
            <FileSpreadsheet size={16} /> Open Sheet
          </button>
          <button className="btn btn-primary" onClick={handleOpenModal}>
            <Plus size={16} /> Create Client Sales Order
          </button>
        </div>
      </div>

      {/* Inline Search Bar */}
      <div className="card" style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', backgroundColor: 'var(--bg-card)' }}>
        <div style={{ position: 'relative', width: '360px' }}>
          <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search SO number, customer name, machine model..."
            className="input-field"
            style={{ paddingLeft: '2.25rem' }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>SO Number</th>
              <th>Customer Name</th>
              <th>Ordered Machine Model</th>
              <th>Order Qty</th>
              <th>Order Date</th>
              <th>Delivery Target</th>
              <th>SO Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredSOs.map(so => (
              <tr key={so.id}>
                <td style={{ fontWeight: 700, color: 'var(--accent-primary)', fontFamily: 'monospace' }}>
                  {so.soNumber}
                </td>
                <td style={{ fontWeight: 600 }}>{so.customerName}</td>
                <td>{so.machineModel}</td>
                <td style={{ fontWeight: 700 }}>{so.quantity} Machine(s)</td>
                <td style={{ fontSize: '0.85rem' }}>{so.orderDate}</td>
                <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{so.deliveryDate}</td>
                <td>
                  <span className={`badge ${
                    so.status === 'WO_GENERATED' ? 'badge-success' : 'badge-info'
                  }`}>
                    {so.status.replace('_', ' ')}
                  </span>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                    <button className="btn btn-outline" style={{ padding: '0.3rem 0.5rem' }} title="Print SO" onClick={() => handlePrintSO(so)}>
                      <Printer size={14} />
                    </button>
                    {so.status !== 'WO_GENERATED' ? (
                      <button 
                        className="btn btn-primary" 
                        style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
                        onClick={() => generateWOFromSO(so.id)}
                      >
                        <span>Generate WO</span>
                        <ArrowRight size={14} />
                      </button>
                    ) : (
                      <span style={{ fontSize: '0.75rem', color: 'var(--success)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                        <CheckCircle2 size={14} /> WO Active
                      </span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal: Create Sales Order */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create Client Sales Order"
      >
        <form onSubmit={handleSubmitSO} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.25rem' }}>SO Number</label>
              <input type="text" required className="input-field" value={soForm.soNumber} onChange={(e) => setSoForm({ ...soForm, soNumber: e.target.value })} />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.25rem' }}>Search Customer</label>
              <AutocompleteSelect
                options={customerOptions}
                value={soForm.customerId}
                onChange={handleCustomerChange}
                placeholder="Type customer name..."
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.25rem' }}>Ordered Machine Model</label>
            <AutocompleteSelect
              options={machineModelOptions}
              value={soForm.machineModel}
              onChange={(val) => setSoForm({ ...soForm, machineModel: val })}
              placeholder="Type machine model..."
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.25rem' }}>Order Quantity</label>
              <input type="number" min="1" required className="input-field" value={soForm.quantity} onChange={(e) => setSoForm({ ...soForm, quantity: Number(e.target.value) })} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.25rem' }}>Target Delivery Date</label>
              <input type="date" required className="input-field" value={soForm.deliveryDate} onChange={(e) => setSoForm({ ...soForm, deliveryDate: e.target.value })} />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.25rem' }}>Client Customization Requests / Extra Tool Demands</label>
            <textarea className="input-field" rows={2} placeholder="e.g. Client requested extra set of Bimetallic Injection Screws & special clamping kit" value={soForm.customNotes} onChange={(e) => setSoForm({ ...soForm, customNotes: e.target.value })} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary">Confirm Sales Order</button>
          </div>
        </form>
      </Modal>

      {/* Print Document Modal */}
      <PrintDocumentModal
        isOpen={printModalOpen}
        onClose={() => setPrintModalOpen(false)}
        title="Print Sales Order Acknowledgement"
        documentType="SO"
        data={printData}
      />

    </div>
  );
};
