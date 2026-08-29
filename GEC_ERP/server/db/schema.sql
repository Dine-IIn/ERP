-- ====================================================================
-- GEC Moulding Machine Manufacturing ERP - Comprehensive PostgreSQL Schema
-- ====================================================================

-- 1. Users Table with Authentication & Superadmin Flag
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(50) PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL DEFAULT 'password',
    full_name VARCHAR(150) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'Production Manager',
    email VARCHAR(150),
    department_id VARCHAR(50),
    role_id VARCHAR(50),
    is_super_admin BOOLEAN DEFAULT FALSE,
    is_admin BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    desktop_session_id VARCHAR(100),
    mobile_session_id VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
);

-- 2. Departments Table
CREATE TABLE IF NOT EXISTS departments (
    id VARCHAR(50) PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(150) NOT NULL,
    head_name VARCHAR(150),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Custom Roles & Granular Permissions
CREATE TABLE IF NOT EXISTS custom_roles (
    id VARCHAR(50) PRIMARY KEY,
    role_name VARCHAR(100) UNIQUE NOT NULL,
    department_id VARCHAR(50) REFERENCES departments(id) ON DELETE SET NULL,
    description TEXT,
    permissions JSONB NOT NULL DEFAULT '{}',
    is_system_role BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. User Activity Audit Trail Logs (High Security)
CREATE TABLE IF NOT EXISTS user_activity_logs (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50),
    username VARCHAR(100) NOT NULL,
    role VARCHAR(50) NOT NULL,
    action VARCHAR(100) NOT NULL,
    module VARCHAR(100) NOT NULL,
    details TEXT,
    ip_address VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Customer Master Table
CREATE TABLE IF NOT EXISTS customers (
    id VARCHAR(50) PRIMARY KEY,
    customer_code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    contact_person VARCHAR(150) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    email VARCHAR(150),
    gstin VARCHAR(50) NOT NULL,
    pan VARCHAR(30),
    bank_name VARCHAR(150),
    account_number VARCHAR(60),
    ifsc_code VARCHAR(30),
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Vendor / Supplier Master Table
CREATE TABLE IF NOT EXISTS vendors (
    id VARCHAR(50) PRIMARY KEY,
    vendor_code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    category VARCHAR(100) NOT NULL DEFAULT 'Raw Material',
    contact_person VARCHAR(150) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    email VARCHAR(150),
    city VARCHAR(100) NOT NULL,
    gstin VARCHAR(50),
    pan VARCHAR(30),
    bank_name VARCHAR(150),
    account_number VARCHAR(60),
    ifsc_code VARCHAR(30),
    credit_days INT DEFAULT 30,
    address TEXT,
    state VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Item Master Table (With Direct-to-Jobwork Feature)
CREATE TABLE IF NOT EXISTS items (
    id VARCHAR(50) PRIMARY KEY,
    item_code VARCHAR(50) UNIQUE NOT NULL,
    part_code VARCHAR(100),
    old_item_code VARCHAR(100),
    name VARCHAR(255) NOT NULL,
    part_no VARCHAR(100),
    category VARCHAR(100) NOT NULL,
    drawing_no VARCHAR(100),
    unit VARCHAR(20) NOT NULL DEFAULT 'PCS',
    purchase_uom VARCHAR(20) DEFAULT 'PCS',
    conversion_factor NUMERIC(10,2) DEFAULT 1,
    in_house_stock NUMERIC(14,2) DEFAULT 0,
    external_stock NUMERIC(14,2) DEFAULT 0,
    min_stock_qty NUMERIC(14,2) DEFAULT 5,
    min_order_qty NUMERIC(14,2) DEFAULT 5,
    reorder_level NUMERIC(14,2) DEFAULT 5,
    grn_allowance_percent NUMERIC(5,2) DEFAULT 0,
    unit_price NUMERIC(14,2) DEFAULT 0,
    weight_kg NUMERIC(10,2) DEFAULT 0,
    location VARCHAR(100) DEFAULT 'Store Rack A',
    qc_trigger VARCHAR(50) DEFAULT 'ON_GRN',
    test_report_required BOOLEAN DEFAULT FALSE,
    note TEXT,
    process_type VARCHAR(50) DEFAULT 'In-house',
    is_direct_jobwork_shipment BOOLEAN DEFAULT FALSE,
    mapped_vendors JSONB DEFAULT '[]',
    specification TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. Bill of Materials (BOM) Master Table
CREATE TABLE IF NOT EXISTS boms (
    id VARCHAR(50) PRIMARY KEY,
    bom_code VARCHAR(50) UNIQUE NOT NULL,
    machine_model VARCHAR(255) NOT NULL,
    version VARCHAR(30) DEFAULT 'Rev 1.0',
    description TEXT,
    estimated_production_hours NUMERIC(10,2) DEFAULT 120,
    components JSONB NOT NULL DEFAULT '[]',
    last_updated DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9. Sales Orders (SO) Table
CREATE TABLE IF NOT EXISTS sales_orders (
    id VARCHAR(50) PRIMARY KEY,
    so_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id VARCHAR(50) REFERENCES customers(id) ON DELETE SET NULL,
    customer_name VARCHAR(200) NOT NULL,
    machine_model VARCHAR(255) NOT NULL,
    quantity INT DEFAULT 1,
    unit_price NUMERIC(14,2) DEFAULT 0,
    total_amount NUMERIC(14,2) DEFAULT 0,
    order_date DATE NOT NULL,
    delivery_date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'CONFIRMED',
    custom_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 10. Work Orders (WO) Table
CREATE TABLE IF NOT EXISTS work_orders (
    id VARCHAR(50) PRIMARY KEY,
    work_order_no VARCHAR(50) UNIQUE NOT NULL,
    machine_model VARCHAR(255) NOT NULL,
    quantity INT DEFAULT 1,
    target_completion_date DATE NOT NULL,
    start_date DATE NOT NULL,
    assigned_lead VARCHAR(150) NOT NULL,
    stage VARCHAR(100) DEFAULT 'PLANNED',
    status VARCHAR(50) DEFAULT 'IN_PROGRESS',
    bom_id VARCHAR(50),
    wo_components JSONB DEFAULT '[]',
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 11. Purchase Orders (PO) Table
CREATE TABLE IF NOT EXISTS purchase_orders (
    id VARCHAR(50) PRIMARY KEY,
    po_number VARCHAR(50) UNIQUE NOT NULL,
    vendor_id VARCHAR(50) REFERENCES vendors(id) ON DELETE SET NULL,
    vendor_name VARCHAR(200) NOT NULL,
    order_date DATE NOT NULL,
    delivery_date DATE,
    po_create_date_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    prepared_by VARCHAR(150),
    status VARCHAR(50) DEFAULT 'DRAFT',
    items JSONB NOT NULL DEFAULT '[]',
    subtotal NUMERIC(14,2) DEFAULT 0,
    tax_amount NUMERIC(14,2) DEFAULT 0,
    total_amount NUMERIC(14,2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 12. Goods Received Notices (GRN) Table
CREATE TABLE IF NOT EXISTS grns (
    id VARCHAR(50) PRIMARY KEY,
    grn_number VARCHAR(50) UNIQUE NOT NULL,
    po_number VARCHAR(50) NOT NULL,
    po_id VARCHAR(50),
    vendor_id VARCHAR(50),
    vendor_name VARCHAR(200) NOT NULL,
    invoice_no VARCHAR(100),
    invoice_date DATE,
    received_date DATE NOT NULL,
    received_by VARCHAR(150),
    items JSONB NOT NULL DEFAULT '[]',
    status VARCHAR(50) DEFAULT 'QC_APPROVED',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 13. External Jobwork Challans Table
CREATE TABLE IF NOT EXISTS jobwork_challans (
    id VARCHAR(50) PRIMARY KEY,
    challan_no VARCHAR(50) UNIQUE NOT NULL,
    vendor_id VARCHAR(50) REFERENCES vendors(id) ON DELETE SET NULL,
    vendor_name VARCHAR(200) NOT NULL,
    item_id VARCHAR(50) REFERENCES items(id) ON DELETE SET NULL,
    item_code VARCHAR(50),
    item_name VARCHAR(200),
    sent_quantity NUMERIC(14,2) NOT NULL,
    received_quantity NUMERIC(14,2) DEFAULT 0,
    scrap_quantity NUMERIC(14,2) DEFAULT 0,
    pending_balance NUMERIC(14,2) NOT NULL,
    process_required VARCHAR(200) NOT NULL,
    issue_date DATE NOT NULL,
    expected_return_date DATE,
    status VARCHAR(50) DEFAULT 'ISSUED',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 14. Quality Control Inspections Table
CREATE TABLE IF NOT EXISTS qc_inspections (
    id VARCHAR(50) PRIMARY KEY,
    inspection_no VARCHAR(50) UNIQUE NOT NULL,
    po_number VARCHAR(50),
    vendor_name VARCHAR(200),
    item_code VARCHAR(50),
    item_name VARCHAR(200),
    inspected_qty NUMERIC(14,2) DEFAULT 0,
    passed_qty NUMERIC(14,2) DEFAULT 0,
    rejected_qty NUMERIC(14,2) DEFAULT 0,
    inspector_name VARCHAR(150),
    remarks TEXT,
    status VARCHAR(50) DEFAULT 'PASSED',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 15. Machine Assembly Line Progress Table
CREATE TABLE IF NOT EXISTS assemblies (
    id VARCHAR(50) PRIMARY KEY,
    assembly_no VARCHAR(50) UNIQUE NOT NULL,
    work_order_no VARCHAR(50) NOT NULL,
    machine_model VARCHAR(255) NOT NULL,
    stage VARCHAR(100) DEFAULT 'Base Fabrication',
    progress_percent INT DEFAULT 0,
    lead_technician VARCHAR(150),
    status VARCHAR(50) DEFAULT 'IN_ASSEMBLY',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 16. Backups Table (Audit & Storage Log)
CREATE TABLE IF NOT EXISTS backups (
    id VARCHAR(50) PRIMARY KEY,
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size_kb NUMERIC(12,2) DEFAULT 0,
    backup_type VARCHAR(50) DEFAULT 'MANUAL',
    status VARCHAR(50) DEFAULT 'SUCCESS',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 17. Application Global Settings Table
CREATE TABLE IF NOT EXISTS app_settings (
    setting_key VARCHAR(100) PRIMARY KEY,
    setting_value JSONB NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Default Super Admin Seed
INSERT INTO users (id, username, password_hash, full_name, role, email, is_super_admin, is_admin, is_active)
VALUES ('usr-superadmin', 'superadmin', 'GEC_SuperAdmin#2026!Secured$', 'GEC System Super Admin', 'Admin', 'superadmin@gecmachines.com', TRUE, TRUE, TRUE)
ON CONFLICT (username) DO NOTHING;
