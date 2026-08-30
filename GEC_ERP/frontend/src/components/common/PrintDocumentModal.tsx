import React from 'react';
import { Modal } from './Modal';
import { Printer } from 'lucide-react';

interface PrintDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  documentType: 'BOM' | 'SO' | 'WO' | 'PO' | 'GRN' | 'CHALLAN';
  data: any;
}

export const PrintDocumentModal: React.FC<PrintDocumentModalProps> = ({
  isOpen,
  onClose,
  title,
  documentType,
  data
}) => {
  if (!data) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
          <button className="btn btn-primary" onClick={handlePrint}>
            <Printer size={16} /> Print Document / Save PDF
          </button>
        </div>

        {/* Printable Document Container */}
        <div id="printable-area" style={{
          backgroundColor: '#ffffff',
          color: '#111827',
          padding: '1.5rem',
          borderRadius: '0.5rem',
          border: '1px solid #e5e7eb',
          fontSize: '0.85rem',
          lineHeight: '1.4'
        }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #111827', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
            <div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: '#111827' }}>
                GEC MOULDING MACHINES
              </h2>
              <div style={{ fontSize: '0.75rem', color: '#4b5563' }}>
                GIDC Industrial Estate, Odhav, Ahmedabad - 382415, Gujarat, India
              </div>
              <div style={{ fontSize: '0.75rem', color: '#4b5563' }}>
                Phone: +91 98250 00000 | Email: info@gecmachines.com
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#2563eb', margin: 0 }}>
                {documentType === 'BOM' && 'BILL OF MATERIALS (BOM)'}
                {documentType === 'SO' && 'SALES ORDER ACKNOWLEDGEMENT'}
                {documentType === 'WO' && 'PRODUCTION WORK ORDER JOB CARD'}
                {documentType === 'PO' && 'PURCHASE ORDER'}
                {documentType === 'GRN' && 'GOODS RECEIVED NOTICE (GRN)'}
                {documentType === 'CHALLAN' && 'JOBWORK OUTWARD CHALLAN'}
              </h3>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, fontFamily: 'monospace', marginTop: '0.25rem' }}>
                Ref: {data.bomCode || data.soNumber || data.workOrderNo || data.poNumber || data.grnNumber || data.challanNo}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                Date: {data.lastUpdated || data.orderDate || data.startDate || data.receivedDate || data.issueDate || new Date().toISOString().split('T')[0]}
              </div>
            </div>
          </div>

          {/* BOM Printing View */}
          {documentType === 'BOM' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem', backgroundColor: '#f9fafb', padding: '0.75rem', borderRadius: '0.375rem' }}>
                <div><strong>Machine Model:</strong> {data.machineModel}</div>
                <div><strong>BOM Revision:</strong> {data.version}</div>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '0.5rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f3f4f6', textAlign: 'left', borderBottom: '1px solid #d1d5db' }}>
                    <th style={{ padding: '0.4rem' }}>#</th>
                    <th style={{ padding: '0.4rem' }}>Item Code</th>
                    <th style={{ padding: '0.4rem' }}>Component Name</th>
                    <th style={{ padding: '0.4rem' }}>Sub-Assembly</th>
                    <th style={{ padding: '0.4rem' }}>Qty Per Machine</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.components || []).map((c: any, i: number) => (
                    <tr key={i} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '0.4rem' }}>{i + 1}</td>
                      <td style={{ padding: '0.4rem', fontFamily: 'monospace', fontWeight: 600 }}>{c.itemCode}</td>
                      <td style={{ padding: '0.4rem' }}>{c.itemName}</td>
                      <td style={{ padding: '0.4rem' }}>{c.subAssemblyTag}</td>
                      <td style={{ padding: '0.4rem', fontWeight: 700 }}>{c.qtyPerMachine} {c.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Sales Order (SO) View */}
          {documentType === 'SO' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem', backgroundColor: '#f9fafb', padding: '0.75rem', borderRadius: '0.375rem' }}>
                <div>
                  <div><strong>Customer Name:</strong> {data.customerName}</div>
                  <div><strong>SO Status:</strong> {data.status}</div>
                </div>
                <div>
                  <div><strong>Ordered Machine:</strong> {data.machineModel}</div>
                  <div><strong>Order Quantity:</strong> {data.quantity} Unit(s)</div>
                  <div><strong>Target Delivery:</strong> {data.deliveryDate}</div>
                </div>
              </div>
              {data.customNotes && (
                <div style={{ padding: '0.5rem', backgroundColor: '#fffbe6', borderRadius: '0.25rem', marginBottom: '1rem' }}>
                  <strong>Client Customizations:</strong> {data.customNotes}
                </div>
              )}
            </div>
          )}

          {/* Work Order (WO) View */}
          {documentType === 'WO' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem', backgroundColor: '#f9fafb', padding: '0.75rem', borderRadius: '0.375rem' }}>
                <div>
                  <div><strong>SO Reference:</strong> {data.soNumber || 'Direct Build'}</div>
                  <div><strong>Customer:</strong> {data.customerName || 'Stock Build'}</div>
                  <div><strong>Assigned Lead:</strong> {data.assignedLead}</div>
                </div>
                <div>
                  <div><strong>Machine Model:</strong> {data.machineModel}</div>
                  <div><strong>Build Quantity:</strong> {data.quantity} Machine(s)</div>
                  <div><strong>Current Stage:</strong> {data.stage}</div>
                </div>
              </div>
              <h4 style={{ margin: '0.5rem 0', fontWeight: 700 }}>Manufacturing Component Job List:</h4>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f3f4f6', textAlign: 'left', borderBottom: '1px solid #d1d5db' }}>
                    <th style={{ padding: '0.4rem' }}>#</th>
                    <th style={{ padding: '0.4rem' }}>Item Code</th>
                    <th style={{ padding: '0.4rem' }}>Component Name</th>
                    <th style={{ padding: '0.4rem' }}>Qty Required</th>
                    <th style={{ padding: '0.4rem' }}>Type</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.woComponents || []).map((c: any, i: number) => (
                    <tr key={i} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '0.4rem' }}>{i + 1}</td>
                      <td style={{ padding: '0.4rem', fontFamily: 'monospace' }}>{c.itemCode}</td>
                      <td style={{ padding: '0.4rem' }}>{c.itemName}</td>
                      <td style={{ padding: '0.4rem', fontWeight: 700 }}>{c.qtyRequired} {c.unit}</td>
                      <td style={{ padding: '0.4rem' }}>{c.isCustomExtra ? 'Extra Client Tool' : 'Standard BOM'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Purchase Order (PO) View */}
          {documentType === 'PO' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem', backgroundColor: '#f9fafb', padding: '0.75rem', borderRadius: '0.375rem' }}>
                <div>
                  <div><strong>Supplier / Vendor:</strong> {data.vendorName}</div>
                  <div><strong>Order Date:</strong> {data.orderDate}</div>
                </div>
                <div>
                  <div><strong>Expected Delivery:</strong> {data.deliveryDate}</div>
                  <div><strong>PO Status:</strong> {data.status}</div>
                </div>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f3f4f6', textAlign: 'left', borderBottom: '1px solid #d1d5db' }}>
                    <th style={{ padding: '0.4rem' }}>Item Code</th>
                    <th style={{ padding: '0.4rem' }}>Description</th>
                    <th style={{ padding: '0.4rem' }}>Qty</th>
                    <th style={{ padding: '0.4rem' }}>Unit Price</th>
                    <th style={{ padding: '0.4rem' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.items || []).map((item: any, i: number) => (
                    <tr key={i} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '0.4rem', fontFamily: 'monospace' }}>{item.itemCode}</td>
                      <td style={{ padding: '0.4rem' }}>{item.itemName}</td>
                      <td style={{ padding: '0.4rem', fontWeight: 700 }}>{item.quantity}</td>
                      <td style={{ padding: '0.4rem' }}>₹{item.unitPrice.toLocaleString()}</td>
                      <td style={{ padding: '0.4rem', fontWeight: 700 }}>₹{item.amount.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ textAlign: 'right', borderTop: '2px solid #111827', paddingTop: '0.5rem', fontWeight: 700 }}>
                <div>Subtotal: ₹{(data.subtotal || 0).toLocaleString()}</div>
                <div>GST (18%): ₹{(data.taxAmount || 0).toLocaleString()}</div>
                <div style={{ fontSize: '1.1rem', color: '#2563eb', marginTop: '0.25rem' }}>Total Amount: ₹{(data.totalAmount || 0).toLocaleString()}</div>
              </div>
            </div>
          )}

          {/* Jobwork Outward Challan View */}
          {documentType === 'CHALLAN' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem', backgroundColor: '#f9fafb', padding: '0.75rem', borderRadius: '0.375rem' }}>
                <div>
                  <div><strong>Processing Vendor:</strong> {data.vendorName}</div>
                  <div><strong>Process Required:</strong> {data.processRequired}</div>
                </div>
                <div>
                  <div><strong>Issue Date:</strong> {data.issueDate}</div>
                  <div><strong>Expected Return:</strong> {data.expectedReturnDate}</div>
                </div>
              </div>
              <div style={{ padding: '0.75rem', border: '1px solid #e5e7eb', borderRadius: '0.375rem' }}>
                <div><strong>Component Item:</strong> {data.itemName} ({data.itemCode})</div>
                <div><strong>Sent Quantity:</strong> {data.sentQuantity} PCS</div>
                <div><strong>Received Back:</strong> {data.receivedQuantity} PCS</div>
                <div><strong>Pending at Vendor:</strong> {data.pendingBalance} PCS</div>
              </div>
            </div>
          )}

          {/* Footer Signatures */}
          <div style={{ marginTop: '2.5rem', paddingTop: '1rem', borderTop: '1px dashed #d1d5db', display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
            <div>Prepared By: ___________________</div>
            <div>Checked By (Store/QC): ___________________</div>
            <div>Authorized Signatory (GEC): ___________________</div>
          </div>
        </div>
      </div>
    </Modal>
  );
};
