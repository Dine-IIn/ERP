import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import { Modal } from '../common/Modal';
import { AutocompleteSelect, AutocompleteOption } from '../common/AutocompleteSelect';
import { PrintDocumentModal } from '../common/PrintDocumentModal';
import { FileCheck, Plus, CheckCircle, Search, Printer, FileSpreadsheet, Truck, ShoppingCart } from 'lucide-react';
import { GRNLineItem, GoodsReceivedNotice } from '../../types/erp';
import { openLiveModuleSheet } from '../../utils/sheetFolderManager';

export const GRNModule: React.FC = () => {
  const { grns, purchaseOrders, jobworks, currentUser, addGRN, approveGRN, searchTerm, setSearchTerm } = useERP();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [printData, setPrintData] = useState<any>(null);

  const [inwardSourceType, setInwardSourceType] = useState<'PO' | 'JOBWORK'>('PO');
  const [selectedSourceId, setSelectedSourceId] = useState('');

  const [grnForm, setGrnForm] = useState({
    grnNumber: '',
    invoiceNo: '',
    invoiceDate: new Date().toISOString().split('T')[0],
    receivedDate: new Date().toISOString().split('T')[0]
  });

  const [grnItems, setGrnItems] = useState<GRNLineItem[]>([]);

  // Filter open POs and open Jobwork Challans for options
  const openPOs = purchaseOrders.filter(p => p.status === 'ISSUED' || p.status === 'PARTIALLY_RECEIVED');
  const openJobworks = jobworks.filter(j => j.pendingBalance > 0);

  const poOptions: AutocompleteOption[] = openPOs.map(p => ({
    value: p.id,
    label: `${p.poNumber} - ${p.vendorName}`,
    sublabel: `Date: ${p.orderDate} | ${p.items.length} Component Line(s)`
  }));

  const jobworkOptions: AutocompleteOption[] = openJobworks.map(j => ({
    value: j.id,
    label: `${j.challanNo} - ${j.vendorName}`,
    sublabel: `Component: ${j.itemName} | Pending: ${j.pendingBalance} PCS`
  }));

  const filteredGRNs = grns.filter(g =>
    g.grnNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    g.poNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    g.vendorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    g.invoiceNo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenModal = () => {
    setGrnForm({
      grnNumber: `GRN-GEC-2026-${String(grns.length + 1).padStart(3, '0')}`,
      invoiceNo: `INV-${Math.floor(1000 + Math.random() * 9000)}`,
      invoiceDate: new Date().toISOString().split('T')[0],
      receivedDate: new Date().toISOString().split('T')[0]
    });
    setInwardSourceType('PO');
    setSelectedSourceId('');
    setGrnItems([]);
    setIsModalOpen(true);
  };

  const handlePrintGRN = (g: GoodsReceivedNotice) => {
    setPrintData(g);
    setPrintModalOpen(true);
  };

  const handleOpenSheet = () => {
    openLiveModuleSheet('GRN', 'GEC_GRN_Inward_Live', grns, [
      { key: 'grnNumber', label: 'GRN Number' },
      { key: 'poNumber', label: 'PO / Challan Ref' },
      { key: 'vendorName', label: 'Vendor Name' },
      { key: 'invoiceNo', label: 'Invoice No' },
      { key: 'invoiceDate', label: 'Invoice Date' },
      { key: 'receivedDate', label: 'Received Date' },
      { key: 'receivedBy', label: 'Received By' },
      { key: 'status', label: 'QC & Store Status' }
    ]);
  };

  const handleSourceSelect = (sourceId: string) => {
    setSelectedSourceId(sourceId);

    if (inwardSourceType === 'PO') {
      const po = purchaseOrders.find(p => p.id === sourceId);
      if (po) {
        setGrnItems(po.items.map(i => ({
          itemId: i.itemId,
          itemCode: i.itemCode,
          itemName: i.itemName,
          orderedQty: i.quantity,
          receivedQty: Math.max(1, i.quantity - i.receivedQty),
          acceptedQty: Math.max(1, i.quantity - i.receivedQty),
          rejectedQty: 0,
          remarks: 'Physical count verified'
        })));
      }
    } else {
      const jw = jobworks.find(j => j.id === sourceId);
      if (jw) {
        setGrnItems([{
          itemId: jw.itemId,
          itemCode: jw.itemCode,
          itemName: `${jw.itemName} (Jobwork Return: ${jw.processRequired})`,
          orderedQty: jw.sentQuantity,
          receivedQty: jw.pendingBalance,
          acceptedQty: jw.pendingBalance,
          rejectedQty: 0,
          remarks: `Jobwork Return from ${jw.vendorName}`
        }]);
      }
    }
  };

  const handleItemQtyChange = (itemId: string, field: 'receivedQty' | 'acceptedQty' | 'rejectedQty', val: number) => {
    setGrnItems(grnItems.map(item => {
      if (item.itemId === itemId) {
        const updated = { ...item, [field]: val };
        if (field === 'receivedQty') {
          updated.acceptedQty = Math.max(0, val - updated.rejectedQty);
        } else if (field === 'rejectedQty') {
          updated.acceptedQty = Math.max(0, updated.receivedQty - val);
        }
        return updated;
      }
      return item;
    }));
  };

  const handleSubmitGRN = (e: React.FormEvent) => {
    e.preventDefault();
    let vendorId = '';
    let vendorName = '';
    let poNumberRef = '';

    if (inwardSourceType === 'PO') {
      const poObj = purchaseOrders.find(p => p.id === selectedSourceId);
      if (!poObj) {
        alert('Please select a valid Purchase Order!');
        return;
      }
      vendorId = poObj.vendorId;
      vendorName = poObj.vendorName;
      poNumberRef = poObj.poNumber;
    } else {
      const jwObj = jobworks.find(j => j.id === selectedSourceId);
      if (!jwObj) {
        alert('Please select a valid External Jobwork Challan!');
        return;
      }
      vendorId = jwObj.vendorId;
      vendorName = jwObj.vendorName;
      poNumberRef = jwObj.challanNo;
    }

    addGRN({
      grnNumber: grnForm.grnNumber,
      poId: selectedSourceId,
      poNumber: poNumberRef,
      vendorId,
      vendorName,
      invoiceNo: grnForm.invoiceNo,
      invoiceDate: grnForm.invoiceDate,
      receivedDate: grnForm.receivedDate,
      items: grnItems,
      receivedBy: currentUser?.fullName || 'Store Manager'
    });

    setIsModalOpen(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>Goods Received Notices (GRN)</h2>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button className="btn btn-outline" onClick={handleOpenSheet}>
            <FileSpreadsheet size={16} /> Open Sheet
          </button>
          <button className="btn btn-primary" onClick={handleOpenModal}>
            <Plus size={16} /> Create Goods Inward GRN
          </button>
        </div>
      </div>

      {/* Inline Search Bar */}
      <div className="card" style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', backgroundColor: 'var(--bg-card)' }}>
        <div style={{ position: 'relative', width: '360px', maxWidth: '100%' }}>
          <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search GRN number, PO/Challan ref, vendor, invoice..."
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
              <th>GRN Number</th>
              <th>PO / Job Challan Ref</th>
              <th>Vendor Name</th>
              <th>Invoice Ref</th>
              <th>Received Date</th>
              <th>Received By</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredGRNs.map(grn => (
              <tr key={grn.id}>
                <td style={{ fontWeight: 700, color: 'var(--success)', fontFamily: 'monospace' }}>
                  {grn.grnNumber}
                </td>
                <td style={{ fontWeight: 600, color: 'var(--accent-primary)', fontFamily: 'monospace' }}>{grn.poNumber}</td>
                <td style={{ fontWeight: 600 }}>{grn.vendorName}</td>
                <td style={{ fontSize: '0.85rem' }}>{grn.invoiceNo}</td>
                <td>{grn.receivedDate}</td>
                <td style={{ fontSize: '0.85rem' }}>{grn.receivedBy}</td>
                <td>
                  <span className={`badge ${grn.status === 'QC_APPROVED' ? 'badge-success' : 'badge-warning'}`}>
                    {grn.status.replace('_', ' ')}
                  </span>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                    <button className="btn btn-outline" style={{ padding: '0.3rem 0.5rem' }} title="Print GRN Slip" onClick={() => handlePrintGRN(grn)}>
                      <Printer size={14} />
                    </button>
                    {grn.status === 'PENDING_QC' && (
                      <button 
                        className="btn btn-outline" 
                        style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', color: 'var(--success)' }}
                        onClick={() => approveGRN(grn.id)}
                      >
                        Approve QC
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal: Create GRN */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create Goods Inward GRN Slip (PO or External Jobwork Return)"
      >
        <form onSubmit={handleSubmitGRN} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Source Selection Buttons */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <button
              type="button"
              className={`btn ${inwardSourceType === 'PO' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => { setInwardSourceType('PO'); setSelectedSourceId(''); setGrnItems([]); }}
            >
              <ShoppingCart size={16} /> Inward from Vendor PO
            </button>
            <button
              type="button"
              className={`btn ${inwardSourceType === 'JOBWORK' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => { setInwardSourceType('JOBWORK'); setSelectedSourceId(''); setGrnItems([]); }}
            >
              <Truck size={16} /> Inward from External Jobwork Return
            </button>
          </div>

          <div className="form-grid-2">
            <div>
              <label>GRN Number</label>
              <input type="text" required className="input-field" value={grnForm.grnNumber} onChange={(e) => setGrnForm({ ...grnForm, grnNumber: e.target.value })} />
            </div>

            <div>
              <label>{inwardSourceType === 'PO' ? 'Select Target Purchase Order (PO)' : 'Select External Jobwork Challan'}</label>
              <AutocompleteSelect
                options={inwardSourceType === 'PO' ? poOptions : jobworkOptions}
                value={selectedSourceId}
                onChange={handleSourceSelect}
                placeholder={inwardSourceType === 'PO' ? 'Type PO number or vendor...' : 'Type challan no or vendor...'}
              />
            </div>
          </div>

          <div className="form-grid-2">
            <div>
              <label>Invoice / Delivery Challan No.</label>
              <input type="text" required className="input-field" value={grnForm.invoiceNo} onChange={(e) => setGrnForm({ ...grnForm, invoiceNo: e.target.value })} />
            </div>
            <div>
              <label>Inward Received Date</label>
              <input type="date" required className="input-field" value={grnForm.receivedDate} onChange={(e) => setGrnForm({ ...grnForm, receivedDate: e.target.value })} />
            </div>
          </div>

          {/* Received Goods Table */}
          {grnItems.length > 0 && (
            <div style={{ padding: '0.875rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: '0.5rem', border: '1px solid var(--border-color)' }}>
              <h4 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--success)' }}>
                Physical Inward Quantity & Quality Verification
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                {grnItems.map(item => (
                  <div key={item.itemId} style={{ backgroundColor: 'var(--bg-card)', padding: '0.625rem', borderRadius: '0.375rem' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{item.itemName} ({item.itemCode})</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Ordered / Sent Qty: {item.orderedQty} Units</div>
                    <div className="form-grid-3">
                      <div>
                        <label style={{ fontSize: '0.7rem' }}>Recd Qty</label>
                        <input type="number" min="1" className="input-field" value={item.receivedQty} onChange={(e) => handleItemQtyChange(item.itemId, 'receivedQty', Number(e.target.value))} />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.7rem' }}>Accepted Qty</label>
                        <input type="number" min="0" className="input-field" value={item.acceptedQty} onChange={(e) => handleItemQtyChange(item.itemId, 'acceptedQty', Number(e.target.value))} />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.7rem' }}>Rejected Qty</label>
                        <input type="number" min="0" className="input-field" value={item.rejectedQty} onChange={(e) => handleItemQtyChange(item.itemId, 'rejectedQty', Number(e.target.value))} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary">Approve Goods Receipt & Credit In-House Stock</button>
          </div>
        </form>
      </Modal>

      {/* Print Document Modal */}
      <PrintDocumentModal
        isOpen={printModalOpen}
        onClose={() => setPrintModalOpen(false)}
        title="Print Goods Received Notice (GRN)"
        documentType="GRN"
        data={printData}
      />

    </div>
  );
};
