import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import { Modal } from '../common/Modal';
import { AutocompleteSelect, AutocompleteOption } from '../common/AutocompleteSelect';
import { PrintDocumentModal } from '../common/PrintDocumentModal';
import { ShoppingCart, Plus, Trash2, Search, Printer, FileSpreadsheet } from 'lucide-react';
import { POLineItem, PurchaseOrder } from '../../types/erp';
import { openLiveModuleSheet } from '../../utils/sheetFolderManager';

export const PurchaseOrderModule: React.FC = () => {
  const { purchaseOrders, vendors, items, addPurchaseOrder, updatePOStatus, searchTerm, setSearchTerm } = useERP();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [printData, setPrintData] = useState<any>(null);

  const [poForm, setPoForm] = useState({
    poNumber: '',
    vendorId: '',
    orderDate: new Date().toISOString().split('T')[0],
    deliveryDate: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
    remarks: ''
  });

  const [lineItems, setLineItems] = useState<POLineItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState('');
  const [itemQty, setItemQty] = useState(1);

  const vendorOptions: AutocompleteOption[] = vendors.map(v => ({
    value: v.id,
    label: v.name,
    sublabel: `${v.vendorCode} | ${v.category} | ${v.city}`
  }));

  const itemOptions: AutocompleteOption[] = items.map(i => {
    const pUOM = i.purchaseUOM || i.unit;
    const cFact = i.conversionFactor || 1;
    return {
      value: i.id,
      label: `${i.itemCode} - ${i.name}`,
      sublabel: `Order in ${pUOM} (${cFact > 1 ? `1 ${pUOM} = ${cFact} ${i.unit}` : '1:1'}) | ₹${i.unitPrice}/${i.unit}`,
      badge: i.category
    };
  });

  const filteredPOs = purchaseOrders.filter(p =>
    p.poNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.vendorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.status.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenModal = () => {
    setPoForm({
      poNumber: `PO-GEC-2026-${String(purchaseOrders.length + 1).padStart(3, '0')}`,
      vendorId: '',
      orderDate: new Date().toISOString().split('T')[0],
      deliveryDate: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
      remarks: ''
    });
    setLineItems([]);
    setSelectedItemId('');
    setItemQty(1);
    setIsModalOpen(true);
  };

  const handlePrintPO = (po: PurchaseOrder) => {
    setPrintData(po);
    setPrintModalOpen(true);
  };

  const handleOpenSheet = () => {
    openLiveModuleSheet('PurchaseOrders', 'GEC_Purchase_Orders_Live', purchaseOrders, [
      { key: 'poNumber', label: 'PO Number' },
      { key: 'vendorName', label: 'Vendor Name' },
      { key: 'orderDate', label: 'Order Date' },
      { key: 'deliveryDate', label: 'Delivery Date' },
      { key: 'subtotal', label: 'Subtotal' },
      { key: 'taxAmount', label: 'GST (18%)' },
      { key: 'totalAmount', label: 'Total Amount' },
      { key: 'status', label: 'PO Status' }
    ]);
  };

  const handleAddLineItem = () => {
    const itemObj = items.find(i => i.id === selectedItemId);
    if (!itemObj) return;

    const existing = lineItems.find(l => l.itemId === selectedItemId);
    if (existing) {
      setLineItems(lineItems.map(l => l.itemId === selectedItemId ? { ...l, quantity: l.quantity + Number(itemQty), amount: (l.quantity + Number(itemQty)) * l.unitPrice } : l));
    } else {
      setLineItems([...lineItems, {
        itemId: itemObj.id,
        itemCode: itemObj.itemCode,
        itemName: itemObj.name,
        quantity: Number(itemQty),
        unitPrice: itemObj.unitPrice,
        receivedQty: 0,
        amount: Number(itemQty) * itemObj.unitPrice
      }]);
    }
  };

  const handleRemoveLineItem = (itemId: string) => {
    setLineItems(lineItems.filter(l => l.itemId !== itemId));
  };

  const handleSubmitPO = (e: React.FormEvent) => {
    e.preventDefault();
    if (lineItems.length === 0) {
      alert('Please add at least one line item to the purchase order!');
      return;
    }
    const vendorObj = vendors.find(v => v.id === poForm.vendorId);
    if (!vendorObj) return;

    addPurchaseOrder({
      poNumber: poForm.poNumber,
      vendorId: vendorObj.id,
      vendorName: vendorObj.name,
      orderDate: poForm.orderDate,
      deliveryDate: poForm.deliveryDate,
      items: lineItems,
      remarks: poForm.remarks
    });

    setIsModalOpen(false);
  };

  const subtotalCalc = lineItems.reduce((s, i) => s + i.amount, 0);
  const taxCalc = Math.round(subtotalCalc * 0.18);
  const totalCalc = subtotalCalc + taxCalc;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>Purchase Orders (PO)</h2>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-outline" onClick={handleOpenSheet}>
            <FileSpreadsheet size={16} /> Open Sheet
          </button>
          <button id="btn-new-po" className="btn btn-primary" onClick={handleOpenModal}>
            <Plus size={16} /> Create New PO
          </button>
        </div>
      </div>

      {/* Inline Search Bar */}
      <div className="card" style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', backgroundColor: 'var(--bg-card)' }}>
        <div style={{ position: 'relative', width: '360px' }}>
          <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search PO number, vendor name, status..."
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
              <th>PO Number</th>
              <th>Vendor Name</th>
              <th>Order Date</th>
              <th>Delivery Date</th>
              <th>Items Count</th>
              <th>Total Amount (18% GST)</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredPOs.map(po => (
              <tr key={po.id}>
                <td style={{ fontWeight: 700, color: 'var(--accent-primary)', fontFamily: 'monospace' }}>
                  {po.poNumber}
                </td>
                <td style={{ fontWeight: 600 }}>{po.vendorName}</td>
                <td>{po.orderDate}</td>
                <td>{po.deliveryDate}</td>
                <td>{po.items.length} Component(s)</td>
                <td style={{ fontWeight: 800, color: 'var(--text-primary)' }}>
                  ₹{po.totalAmount.toLocaleString()}
                </td>
                <td>
                  <span className={`badge ${
                    po.status === 'RECEIVED' ? 'badge-success' :
                    po.status === 'PARTIALLY_RECEIVED' ? 'badge-warning' : 'badge-info'
                  }`}>
                    {po.status.replace('_', ' ')}
                  </span>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                    <button className="btn btn-outline" style={{ padding: '0.3rem 0.5rem' }} title="Print PO Document" onClick={() => handlePrintPO(po)}>
                      <Printer size={14} />
                    </button>
                    {po.status === 'ISSUED' && (
                      <button 
                        className="btn btn-outline" 
                        style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                        onClick={() => updatePOStatus(po.id, 'CANCELLED')}
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal: Create Purchase Order */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create Vendor Purchase Order"
      >
        <form onSubmit={handleSubmitPO} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.25rem' }}>PO Number</label>
              <input type="text" required className="input-field" value={poForm.poNumber} onChange={(e) => setPoForm({ ...poForm, poNumber: e.target.value })} />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.25rem' }}>Search Vendor</label>
              <AutocompleteSelect
                options={vendorOptions}
                value={poForm.vendorId}
                onChange={(val) => setPoForm({ ...poForm, vendorId: val })}
                placeholder="Type vendor name..."
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.25rem' }}>Order Date</label>
              <input type="date" required className="input-field" value={poForm.orderDate} onChange={(e) => setPoForm({ ...poForm, orderDate: e.target.value })} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.25rem' }}>Expected Delivery Date</label>
              <input type="date" required className="input-field" value={poForm.deliveryDate} onChange={(e) => setPoForm({ ...poForm, deliveryDate: e.target.value })} />
            </div>
          </div>

          {/* Line Items Section */}
          <div style={{ padding: '1rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: '0.5rem', border: '1px solid var(--border-color)' }}>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.75rem' }}>Add Line Components</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr auto', gap: '0.75rem', alignItems: 'flex-end', marginBottom: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)' }}>Search Item to Add</label>
                <AutocompleteSelect
                  options={itemOptions}
                  value={selectedItemId}
                  onChange={(val) => setSelectedItemId(val)}
                  placeholder="Type item code or name..."
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)' }}>Quantity</label>
                <input type="number" min="1" className="input-field" value={itemQty} onChange={(e) => setItemQty(Number(e.target.value))} />
              </div>
              <button type="button" className="btn btn-secondary" onClick={handleAddLineItem}>
                <Plus size={16} /> Add Item
              </button>
            </div>

            {/* Line items list */}
            {lineItems.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                {lineItems.map(item => (
                  <div key={item.itemId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-card)', padding: '0.5rem 0.75rem', borderRadius: '0.375rem' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{item.itemName}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.quantity} x ₹{item.unitPrice.toLocaleString()}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>₹{item.amount.toLocaleString()}</span>
                      <button type="button" style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }} onClick={() => handleRemoveLineItem(item.itemId)}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}

                <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span>Subtotal: <strong>₹{subtotalCalc.toLocaleString()}</strong></span>
                  <span>GST (18%): <strong>₹{taxCalc.toLocaleString()}</strong></span>
                  <span style={{ fontWeight: 800, color: 'var(--accent-primary)', fontSize: '1rem' }}>Total: ₹{totalCalc.toLocaleString()}</span>
                </div>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary">Issue Purchase Order</button>
          </div>
        </form>
      </Modal>

      {/* Print Document Modal */}
      <PrintDocumentModal
        isOpen={printModalOpen}
        onClose={() => setPrintModalOpen(false)}
        title="Print Vendor Purchase Order"
        documentType="PO"
        data={printData}
      />

    </div>
  );
};
