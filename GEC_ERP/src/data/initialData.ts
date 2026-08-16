import { 
  User, Item, Customer, Vendor, JobworkChallan, 
  PurchaseOrder, GoodsReceivedNotice, WorkOrder, QCInspection, MachineAssembly, BOM, SalesOrder 
} from '../types/erp';

export const INITIAL_USERS: User[] = [
  {
    id: 'usr-superadmin',
    username: 'superadmin',
    fullName: 'GEC System Super Admin',
    role: 'Admin',
    email: 'superadmin@gecmachines.com',
    isSuperAdmin: true
  },
  {
    id: 'usr-1',
    username: 'admin',
    fullName: 'Rajesh GEC (Admin)',
    role: 'Admin',
    email: 'admin@gecmachines.com',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 'usr-2',
    username: 'production',
    fullName: 'Suresh Patel (Production Lead)',
    role: 'Production Manager',
    email: 'production@gecmachines.com'
  },
  {
    id: 'usr-3',
    username: 'store',
    fullName: 'Vikram Singh (Store Head)',
    role: 'Store Manager',
    email: 'store@gecmachines.com'
  },
  {
    id: 'usr-4',
    username: 'qc',
    fullName: 'Anit Shah (QC Engineer)',
    role: 'QC Officer',
    email: 'qc@gecmachines.com'
  }
];

export const INITIAL_CUSTOMERS: Customer[] = [
  {
    id: 'cst-1',
    customerCode: 'CUST-PLM-001',
    name: 'Polymax Plastics Pvt Ltd',
    contactPerson: 'Harish Bhai Patel',
    phone: '+91 98250 88776',
    email: 'purchase@polymaxplastics.com',
    gstin: '24AAACP9988C1Z4',
    pan: 'AAACP9988C',
    bankName: 'HDFC Bank Ltd',
    accountNumber: '50200012345678',
    ifscCode: 'HDFC0000123',
    address: 'Plot 12, GIDC Odhav Industrial Area',
    city: 'Ahmedabad',
    state: 'Gujarat'
  },
  {
    id: 'cst-2',
    customerCode: 'CUST-SIP-002',
    name: 'Shree Industrial Products Ltd',
    contactPerson: 'Jignesh Shah',
    phone: '+91 98790 11224',
    email: 'info@shreeindus.com',
    gstin: '24ABCCS1122B1Z8',
    pan: 'ABCCS1122B',
    bankName: 'State Bank of India',
    accountNumber: '33445566778',
    ifscCode: 'SBIN0001420',
    address: 'Survey 45, Rajkot-Gondal Highway',
    city: 'Rajkot',
    state: 'Gujarat'
  },
  {
    id: 'cst-3',
    customerCode: 'CUST-APX-003',
    name: 'Apex Precision Molding Systems',
    contactPerson: 'Rohan Verma',
    phone: '+91 97120 55443',
    email: 'rohan@apexmolding.in',
    gstin: '27AAACA4455K1Z3',
    pan: 'AAACA4455K',
    bankName: 'ICICI Bank Ltd',
    accountNumber: '001205012345',
    ifscCode: 'ICIC0000012',
    address: 'Phase 3, MIDC Industrial Zone',
    city: 'Pune',
    state: 'Maharashtra'
  }
];

export const INITIAL_ASSEMBLY_STAGES: string[] = [
  '1. BASE FABRICATION',
  '2. SUB ASSEMBLY',
  '3. HYDRAULIC FITTING',
  '4. ELECTRICAL PANEL',
  '5. TESTING & TRIAL',
  '6. FINAL DISPATCH'
];

export const INITIAL_ITEM_CATEGORIES: string[] = [
  'Raw Material Casting',
  'Machined Component',
  'Hydraulic Part',
  'Electrical & Automation',
  'Machine Sub-Assembly',
  'Final Machine Unit',
  'Consumable & Hardware',
  'Pneumatics',
  'Sheet Metal Fabrication'
];

export const INITIAL_VENDOR_CATEGORIES: string[] = [
  'Foundry & Casting',
  'CNC Machining Shop',
  'Hydraulics & Valves',
  'Electrical & PLC',
  'Heat Treatment & Nitriding',
  'Laser Cutting & Sheet Fabrication',
  'General Hardware & Fasteners'
];

export const INITIAL_VENDORS: Vendor[] = [
  {
    id: 'vnd-1',
    vendorCode: 'VEND-CAST-01',
    name: 'Precision Foundries & Alloy Castings',
    category: 'Foundry & Casting',
    contactPerson: 'Rameshbhai M.',
    phone: '+91 98250 11223',
    email: 'orders@precisionfoundry.com',
    city: 'Rajkot',
    gstin: '24AAAPF9876K1Z1',
    pan: 'AAAPF9876K',
    bankName: 'Kotak Mahindra Bank',
    accountNumber: '781200994433',
    ifscCode: 'KKBK0002580'
  },
  {
    id: 'vnd-2',
    vendorCode: 'VEND-CNC-02',
    name: 'Raj CNC Machining & Turning Works',
    category: 'CNC Machining Shop',
    contactPerson: 'Karan Shah',
    phone: '+91 98980 44556',
    email: 'karan@rajcnc.com',
    city: 'Ahmedabad',
    gstin: '24ABCPR5544J1Z9',
    pan: 'ABCPR5544J',
    bankName: 'Axis Bank Ltd',
    accountNumber: '9180200445566',
    ifscCode: 'UTIB0000450'
  },
  {
    id: 'vnd-3',
    vendorCode: 'VEND-HYD-03',
    name: 'Yuken Hydraulic Solutions India Ltd',
    category: 'Hydraulics & Valves',
    contactPerson: 'Devang Vyas',
    phone: '+91 97129 88776',
    email: 'sales@yukenindia.com',
    city: 'Vadodara',
    gstin: '24AAACY1122M1Z3',
    pan: 'AAACY1122M',
    bankName: 'State Bank of India',
    accountNumber: '11223344556',
    ifscCode: 'SBIN0000800'
  },
  {
    id: 'vnd-4',
    vendorCode: 'VEND-ELE-04',
    name: 'Siemens Automation Components',
    category: 'Electrical & PLC',
    contactPerson: 'Mehul Mehta',
    phone: '+91 98240 33221',
    email: 'support@siemens-distributor.in',
    city: 'Mumbai',
    gstin: '27AAACS9988H1Z8',
    pan: 'AAACS9988H',
    bankName: 'Citibank N.A.',
    accountNumber: '00987654321',
    ifscCode: 'CITI0000002'
  },
  {
    id: 'vnd-5',
    vendorCode: 'VEND-HEAT-05',
    name: 'Premier Heat Treatment & Nitriding Services',
    category: 'Heat Treatment & Nitriding',
    contactPerson: 'Pankaj Joshi',
    phone: '+91 98795 22334',
    email: 'info@premierheattreat.com',
    city: 'Ahmedabad',
    gstin: '24AAAFP3344P1Z2',
    pan: 'AAAFP3344P',
    bankName: 'Bank of Baroda',
    accountNumber: '0854020000123',
    ifscCode: 'BARB0AHMEDA'
  }
];

export const INITIAL_ITEMS: Item[] = [
  {
    id: 'itm-1',
    itemCode: 'GEC-TIE-80',
    name: 'Tie Bar 80mm Dia x 1800mm (Forged Steel)',
    category: 'Machined Component',
    drawingNo: 'DWG-GEC-TB-80',
    unit: 'PCS',
    purchaseUOM: 'BAR',
    conversionFactor: 3,
    inHouseStock: 8,
    externalStock: 4,
    reorderLevel: 6,
    unitPrice: 18500,
    location: 'Bay 2 - Heavy Stock Rack',
    specification: 'EN19 Grade Hardened & Ground, Chrome Finish'
  },
  {
    id: 'itm-2',
    itemCode: 'GEC-SCR-45',
    name: 'Injection Screw 45mm Bimetallic',
    category: 'Machined Component',
    drawingNo: 'DWG-GEC-SCR-45',
    unit: 'PCS',
    purchaseUOM: 'PCS',
    conversionFactor: 1,
    inHouseStock: 3,
    externalStock: 2,
    reorderLevel: 4,
    unitPrice: 42000,
    location: 'Rack B-04',
    specification: 'High wear-resistant bimetallic alloy for PET/PP molding'
  },
  {
    id: 'itm-3',
    itemCode: 'GEC-PLT-250T',
    name: 'Platen Casting Heavy Duty GEC-250T',
    category: 'Raw Material Casting',
    drawingNo: 'DWG-GEC-PLT-250',
    unit: 'SET',
    purchaseUOM: 'LOT',
    conversionFactor: 1,
    inHouseStock: 2,
    externalStock: 1,
    reorderLevel: 2,
    unitPrice: 165000,
    location: 'Outdoor Casting Yard A',
    specification: 'Spheroidal Graphite SG Iron Grade 500/7'
  },
  {
    id: 'itm-4',
    itemCode: 'GEC-PMP-35L',
    name: 'Servo Hydraulic Pump 35L Variable Displacement',
    category: 'Hydraulic Part',
    drawingNo: 'DWG-HYD-PMP-35',
    unit: 'PCS',
    purchaseUOM: 'PCS',
    conversionFactor: 1,
    inHouseStock: 5,
    externalStock: 0,
    reorderLevel: 3,
    unitPrice: 78000,
    location: 'Hydraulics Store Rack H-1',
    specification: 'Max Pressure 250 Bar, Low Noise Servo Design'
  },
  {
    id: 'itm-5',
    itemCode: 'GEC-PLC-10IN',
    name: 'GEC Motion Controller PLC Panel 10" Touch UI',
    category: 'Electrical & Automation',
    drawingNo: 'DWG-ELE-PLC-10',
    unit: 'SET',
    purchaseUOM: 'SET',
    conversionFactor: 1,
    inHouseStock: 4,
    externalStock: 0,
    reorderLevel: 3,
    unitPrice: 95000,
    location: 'Clean Store E-02',
    specification: 'Multilingual Touch Screen, Multi-stage Injection Control'
  },
  {
    id: 'itm-6',
    itemCode: 'GEC-HTR-BND',
    name: 'Barrel Ceramic Heating Band 230V 1500W',
    category: 'Electrical & Automation',
    drawingNo: 'DWG-ELE-HTR-45',
    unit: 'PCS',
    purchaseUOM: 'BOX',
    conversionFactor: 10,
    inHouseStock: 24,
    externalStock: 0,
    reorderLevel: 10,
    unitPrice: 1850,
    location: 'Shelf E-14',
    specification: 'High density ceramic insulation with thermocouple slot'
  },
  {
    id: 'itm-7',
    itemCode: 'GEC-OIL-46',
    name: 'Hydraulic Oil Servo System 68 Grade',
    category: 'Consumable & Hardware',
    drawingNo: 'DWG-HYD-OIL',
    unit: 'LTR',
    purchaseUOM: 'DRUM',
    conversionFactor: 210,
    inHouseStock: 420,
    externalStock: 0,
    reorderLevel: 200,
    unitPrice: 180,
    location: 'Fluid Storage Bay',
    specification: 'Anti-wear IS 10522 Grade 68 Oil'
  }
];

// BOM Without Prices as requested
export const INITIAL_BOMS: BOM[] = [
  {
    id: 'bom-1',
    bomCode: 'BOM-GEC-250T',
    machineModel: 'GEC-250T Servo Hydraulic Injection Moulding Machine',
    version: 'Rev 2.1 (Servo Series)',
    description: 'Standard Bill of Materials for GEC-250T Injection Machine',
    components: [
      { itemId: 'itm-1', itemCode: 'GEC-TIE-80', itemName: 'Tie Bar 80mm Dia x 1800mm', qtyPerMachine: 4, unit: 'PCS', subAssemblyTag: 'Clamping Unit', scrapPercent: 0 },
      { itemId: 'itm-2', itemCode: 'GEC-SCR-45', itemName: 'Injection Screw 45mm Bimetallic', qtyPerMachine: 1, unit: 'PCS', subAssemblyTag: 'Injection Unit', scrapPercent: 0 },
      { itemId: 'itm-3', itemCode: 'GEC-PLT-250T', itemName: 'Platen Casting Heavy Duty GEC-250T', qtyPerMachine: 1, unit: 'SET', subAssemblyTag: 'Clamping Unit', scrapPercent: 0 },
      { itemId: 'itm-4', itemCode: 'GEC-PMP-35L', itemName: 'Servo Hydraulic Pump 35L Variable Displacement', qtyPerMachine: 1, unit: 'PCS', subAssemblyTag: 'Hydraulic Powerpack', scrapPercent: 0 },
      { itemId: 'itm-5', itemCode: 'GEC-PLC-10IN', itemName: 'GEC Motion Controller PLC Panel 10" Touch UI', qtyPerMachine: 1, unit: 'SET', subAssemblyTag: 'Electrical Cabinet', scrapPercent: 0 },
      { itemId: 'itm-6', itemCode: 'GEC-HTR-BND', itemName: 'Barrel Ceramic Heating Band 230V 1500W', qtyPerMachine: 6, unit: 'PCS', subAssemblyTag: 'Injection Unit', scrapPercent: 0 }
    ],
    lastUpdated: '2026-08-16'
  },
  {
    id: 'bom-2',
    bomCode: 'BOM-GEC-180T',
    machineModel: 'GEC-180T Compact Servo Moulding Machine',
    version: 'Rev 1.4',
    description: 'Compact 180-Ton Moulding Machine Bill of Materials',
    components: [
      { itemId: 'itm-1', itemCode: 'GEC-TIE-80', itemName: 'Tie Bar 80mm Dia x 1800mm', qtyPerMachine: 4, unit: 'PCS', subAssemblyTag: 'Clamping Unit', scrapPercent: 0 },
      { itemId: 'itm-2', itemCode: 'GEC-SCR-45', itemName: 'Injection Screw 45mm Bimetallic', qtyPerMachine: 1, unit: 'PCS', subAssemblyTag: 'Injection Unit', scrapPercent: 0 },
      { itemId: 'itm-4', itemCode: 'GEC-PMP-35L', itemName: 'Servo Hydraulic Pump 35L Variable Displacement', qtyPerMachine: 1, unit: 'PCS', subAssemblyTag: 'Hydraulic Powerpack', scrapPercent: 0 },
      { itemId: 'itm-5', itemCode: 'GEC-PLC-10IN', itemName: 'GEC Motion Controller PLC Panel 10" Touch UI', qtyPerMachine: 1, unit: 'SET', subAssemblyTag: 'Electrical Cabinet', scrapPercent: 0 }
    ],
    lastUpdated: '2026-08-15'
  }
];

export const INITIAL_SALES_ORDERS: SalesOrder[] = [
  {
    id: 'so-1',
    soNumber: 'SO-GEC-2026-001',
    customerId: 'cst-1',
    customerName: 'Polymax Plastics Pvt Ltd',
    machineModel: 'GEC-250T Servo Hydraulic Injection Moulding Machine',
    quantity: 2,
    orderDate: '2026-08-01',
    deliveryDate: '2026-09-15',
    bomId: 'bom-1',
    status: 'WO_GENERATED',
    customNotes: 'Client requested extra set of Bimetallic Injection Screws (45mm)'
  },
  {
    id: 'so-2',
    soNumber: 'SO-GEC-2026-002',
    customerId: 'cst-2',
    customerName: 'Shree Industrial Products Ltd',
    machineModel: 'GEC-180T Compact Servo Moulding Machine',
    quantity: 1,
    orderDate: '2026-08-05',
    deliveryDate: '2026-09-10',
    bomId: 'bom-2',
    status: 'WO_GENERATED',
    customNotes: 'Standard build with custom 10" PLC touch screen'
  }
];

export const INITIAL_JOBWORK_CHALLANS: JobworkChallan[] = [
  {
    id: 'jw-1',
    challanNo: 'JW-GEC-2026-001',
    vendorId: 'vnd-5',
    vendorName: 'Premier Heat Treatment & Nitriding Services',
    itemId: 'itm-1',
    itemCode: 'GEC-TIE-80',
    itemName: 'Tie Bar 80mm Dia x 1800mm (Forged Steel)',
    sentQuantity: 4,
    receivedQuantity: 1,
    scrapQuantity: 0,
    pendingBalance: 3,
    processRequired: 'Gas Nitriding (0.4mm depth) & Surface Polish',
    issueDate: '2026-08-01',
    expectedReturnDate: '2026-08-20',
    status: 'PARTIALLY_RECEIVED',
    notes: 'Urgent for Work Order WO-GEC-250T-001 machine build'
  },
  {
    id: 'jw-2',
    challanNo: 'JW-GEC-2026-002',
    vendorId: 'vnd-2',
    vendorName: 'Raj CNC Machining & Turning Works',
    itemId: 'itm-3',
    itemCode: 'GEC-PLT-250T',
    itemName: 'Platen Casting Heavy Duty GEC-250T',
    sentQuantity: 1,
    receivedQuantity: 0,
    scrapQuantity: 0,
    pendingBalance: 1,
    processRequired: 'VMC Boring of Tie Bar holes & T-Slot Milling',
    issueDate: '2026-08-05',
    expectedReturnDate: '2026-08-22',
    status: 'ISSUED',
    notes: 'Drawing DWG-GEC-PLT-250 Rev C attached'
  }
];

export const INITIAL_PURCHASE_ORDERS: PurchaseOrder[] = [
  {
    id: 'po-1',
    poNumber: 'PO-GEC-2026-088',
    vendorId: 'vnd-3',
    vendorName: 'Yuken Hydraulic Solutions India Ltd',
    orderDate: '2026-08-10',
    deliveryDate: '2026-08-25',
    items: [
      {
        itemId: 'itm-4',
        itemCode: 'GEC-PMP-35L',
        itemName: 'Servo Hydraulic Pump 35L Variable Displacement',
        quantity: 4,
        unitPrice: 78000,
        receivedQty: 2,
        amount: 312000
      }
    ],
    subtotal: 312000,
    taxAmount: 56160,
    totalAmount: 368160,
    status: 'PARTIALLY_RECEIVED',
    remarks: 'Dispatched 2 units via V-Trans, remaining 2 expected next week'
  },
  {
    id: 'po-2',
    poNumber: 'PO-GEC-2026-089',
    vendorId: 'vnd-4',
    vendorName: 'Siemens Automation Components',
    orderDate: '2026-08-12',
    deliveryDate: '2026-08-28',
    items: [
      {
        itemId: 'itm-5',
        itemCode: 'GEC-PLC-10IN',
        itemName: 'GEC Motion Controller PLC Panel 10" Touch UI',
        quantity: 2,
        unitPrice: 95000,
        receivedQty: 0,
        amount: 190000
      }
    ],
    subtotal: 190000,
    taxAmount: 34200,
    totalAmount: 224200,
    status: 'ISSUED',
    remarks: 'Pre-programmed with GEC Moulding Machine OS v4.2'
  }
];

export const INITIAL_GRNS: GoodsReceivedNotice[] = [
  {
    id: 'grn-1',
    grnNumber: 'GRN-GEC-2026-034',
    poId: 'po-1',
    poNumber: 'PO-GEC-2026-088',
    vendorId: 'vnd-3',
    vendorName: 'Yuken Hydraulic Solutions India Ltd',
    invoiceNo: 'YUKEN-INV-9921',
    invoiceDate: '2026-08-14',
    receivedDate: '2026-08-15',
    items: [
      {
        itemId: 'itm-4',
        itemCode: 'GEC-PMP-35L',
        itemName: 'Servo Hydraulic Pump 35L Variable Displacement',
        orderedQty: 4,
        receivedQty: 2,
        acceptedQty: 2,
        rejectedQty: 0,
        remarks: 'Physical inspection clean, serial numbers verified'
      }
    ],
    status: 'QC_APPROVED',
    receivedBy: 'Vikram Singh (Store Head)'
  }
];

export const INITIAL_WORK_ORDERS: WorkOrder[] = [
  {
    id: 'wo-1',
    workOrderNo: 'WO-GEC-250T-001',
    soId: 'so-1',
    soNumber: 'SO-GEC-2026-001',
    machineModel: 'GEC-250T Servo Hydraulic Injection Moulding Machine',
    quantity: 2,
    targetCompletionDate: '2026-09-15',
    startDate: '2026-08-01',
    assignedLead: 'Suresh Patel (Production Lead)',
    stage: 'SUB_ASSEMBLY',
    status: 'IN_PROGRESS',
    customerName: 'Polymax Plastics Pvt Ltd',
    bomId: 'bom-1',
    woComponents: [
      { itemId: 'itm-1', itemCode: 'GEC-TIE-80', itemName: 'Tie Bar 80mm Dia x 1800mm', qtyRequired: 8, unit: 'PCS', subAssemblyTag: 'Clamping Unit', isCustomExtra: false },
      { itemId: 'itm-2', itemCode: 'GEC-SCR-45', itemName: 'Injection Screw 45mm Bimetallic', qtyRequired: 2, unit: 'PCS', subAssemblyTag: 'Injection Unit', isCustomExtra: false },
      { itemId: 'itm-2', itemCode: 'GEC-SCR-45', itemName: 'Injection Screw 45mm Bimetallic (Extra Client Spare Set)', qtyRequired: 1, unit: 'PCS', subAssemblyTag: 'Injection Unit', isCustomExtra: true }
    ],
    remarks: 'Client requested 1 extra spare Injection Screw set'
  },
  {
    id: 'wo-2',
    workOrderNo: 'WO-GEC-180T-004',
    soId: 'so-2',
    soNumber: 'SO-GEC-2026-002',
    machineModel: 'GEC-180T Compact Servo Moulding Machine',
    quantity: 1,
    targetCompletionDate: '2026-09-05',
    startDate: '2026-08-08',
    assignedLead: 'Amit Shah (Assy Tech)',
    stage: 'HYDRAULIC_FITTING',
    status: 'IN_PROGRESS',
    customerName: 'Shree Industrial Products Ltd',
    bomId: 'bom-2',
    woComponents: [
      { itemId: 'itm-1', itemCode: 'GEC-TIE-80', itemName: 'Tie Bar 80mm Dia x 1800mm', qtyRequired: 4, unit: 'PCS', subAssemblyTag: 'Clamping Unit', isCustomExtra: false },
      { itemId: 'itm-2', itemCode: 'GEC-SCR-45', itemName: 'Injection Screw 45mm Bimetallic', qtyRequired: 1, unit: 'PCS', subAssemblyTag: 'Injection Unit', isCustomExtra: false }
    ],
    remarks: 'Wiring & pipe fitting underway'
  }
];

export const INITIAL_QC_INSPECTIONS: QCInspection[] = [
  {
    id: 'qc-1',
    qcNumber: 'QC-GEC-2026-090',
    type: 'INCOMING_PO',
    referenceNo: 'GRN-GEC-2026-034',
    itemId: 'itm-4',
    itemCode: 'GEC-PMP-35L',
    itemName: 'Servo Hydraulic Pump 35L Variable Displacement',
    inspectedQuantity: 2,
    passedQuantity: 2,
    failedQuantity: 0,
    disposition: 'PASSED',
    inspectorName: 'Anit Shah (QC Engineer)',
    timestamp: '2026-08-15 14:30'
  },
  {
    id: 'qc-2',
    qcNumber: 'QC-GEC-2026-091',
    type: 'JOBWORK_RETURN',
    referenceNo: 'JW-GEC-2026-001',
    itemId: 'itm-1',
    itemCode: 'GEC-TIE-80',
    itemName: 'Tie Bar 80mm Dia x 1800mm (Forged Steel)',
    inspectedQuantity: 1,
    passedQuantity: 1,
    failedQuantity: 0,
    disposition: 'PASSED',
    defectReason: 'Surface hardness verified 62 HRC. Hardness test report archived.',
    inspectorName: 'Anit Shah (QC Engineer)',
    timestamp: '2026-08-16 11:00'
  }
];

export const INITIAL_ASSEMBLIES: MachineAssembly[] = [
  {
    id: 'asm-1',
    assemblyCode: 'ASM-250T-INJ-01',
    machineModel: 'GEC-250T Servo Hydraulic Injection Moulding Machine',
    subAssemblyType: 'Injection Unit',
    workOrderId: 'wo-1',
    workOrderNo: 'WO-GEC-250T-001',
    componentsConsumed: [
      { itemId: 'itm-2', itemCode: 'GEC-SCR-45', itemName: 'Injection Screw 45mm Bimetallic', qtyRequired: 1, qtyConsumed: 1 },
      { itemId: 'itm-6', itemCode: 'GEC-HTR-BND', itemName: 'Barrel Ceramic Heating Band 230V 1500W', qtyRequired: 4, qtyConsumed: 4 }
    ],
    progressPercentage: 85,
    status: 'IN_PROGRESS'
  },
  {
    id: 'asm-2',
    assemblyCode: 'ASM-250T-CLM-01',
    machineModel: 'GEC-250T Servo Hydraulic Injection Moulding Machine',
    subAssemblyType: 'Clamping Unit',
    workOrderId: 'wo-1',
    workOrderNo: 'WO-GEC-250T-001',
    componentsConsumed: [
      { itemId: 'itm-1', itemCode: 'GEC-TIE-80', itemName: 'Tie Bar 80mm Dia x 1800mm', qtyRequired: 4, qtyConsumed: 1 },
      { itemId: 'itm-3', itemCode: 'GEC-PLT-250T', itemName: 'Platen Casting Heavy Duty GEC-250T', qtyRequired: 1, qtyConsumed: 1 }
    ],
    progressPercentage: 45,
    status: 'IN_PROGRESS'
  }
];
