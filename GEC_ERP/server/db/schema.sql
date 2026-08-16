-- PostgreSQL Schema for GEC Moulding Machine ERP Database

CREATE DATABASE gec_erp;
\c gec_erp;

-- 1. Users Table
CREATE TABLE users (
    id VARCHAR(50) PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    role VARCHAR(50) NOT NULL,
    email VARCHAR(150),
    avatar_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Customer Master
CREATE TABLE customers (
    id VARCHAR(50) PRIMARY KEY,
    customer_code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    contact_person VARCHAR(150) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    email VARCHAR(150),
    gstin VARCHAR(50) NOT NULL,
    pan VARCHAR(20),
    bank_name VARCHAR(150),
    account_number VARCHAR(50),
    ifsc_code VARCHAR(30),
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Vendor Master
CREATE TABLE vendors (
    id VARCHAR(50) PRIMARY KEY,
    vendor_code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    category VARCHAR(100) NOT NULL,
    contact_person VARCHAR(150) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    email VARCHAR(150),
    city VARCHAR(100) NOT NULL,
    gstin VARCHAR(50),
    pan VARCHAR(20),
    bank_name VARCHAR(150),
    account_number VARCHAR(50),
    ifsc_code VARCHAR(30),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Item Master
CREATE TABLE items (
    id VARCHAR(50) PRIMARY KEY,
    item_code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    category VARCHAR(100) NOT NULL,
    drawing_no VARCHAR(100),
    unit VARCHAR(20) NOT NULL DEFAULT 'PCS',
    in_house_stock NUMERIC(12,2) DEFAULT 0,
    external_stock NUMERIC(12,2) DEFAULT 0,
    reorder_level NUMERIC(12,2) DEFAULT 5,
    unit_price NUMERIC(12,2) DEFAULT 0,
    location VARCHAR(100),
    specification TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Bill of Materials (BOM) Master
CREATE TABLE boms (
    id VARCHAR(50) PRIMARY KEY,
    bom_code VARCHAR(50) UNIQUE NOT NULL,
    machine_model VARCHAR(200) NOT NULL,
    version VARCHAR(30) DEFAULT 'Rev 1.0',
    description TEXT,
    total_cost NUMERIC(12,2) DEFAULT 0,
    last_updated DATE DEFAULT CURRENT_DATE
);

CREATE TABLE bom_components (
    id SERIAL PRIMARY KEY,
    bom_id VARCHAR(50) REFERENCES boms(id) ON DELETE CASCADE,
    item_id VARCHAR(50) REFERENCES items(id),
    qty_per_machine NUMERIC(10,2) NOT NULL,
    sub_assembly_tag VARCHAR(100) NOT NULL,
    scrap_percent NUMERIC(5,2) DEFAULT 0
);

-- 6. External Jobwork Inventory
CREATE TABLE jobwork_challans (
    id VARCHAR(50) PRIMARY KEY,
    challan_no VARCHAR(50) UNIQUE NOT NULL,
    vendor_id VARCHAR(50) REFERENCES vendors(id),
    item_id VARCHAR(50) REFERENCES items(id),
    sent_quantity NUMERIC(10,2) NOT NULL,
    received_quantity NUMERIC(10,2) DEFAULT 0,
    scrap_quantity NUMERIC(10,2) DEFAULT 0,
    pending_balance NUMERIC(10,2) NOT NULL,
    process_required VARCHAR(200) NOT NULL,
    issue_date DATE NOT NULL,
    expected_return_date DATE,
    status VARCHAR(50) DEFAULT 'ISSUED',
    notes TEXT
);

-- 7. Purchase Orders (PO)
CREATE TABLE purchase_orders (
    id VARCHAR(50) PRIMARY KEY,
    po_number VARCHAR(50) UNIQUE NOT NULL,
    vendor_id VARCHAR(50) REFERENCES vendors(id),
    order_date DATE NOT NULL,
    delivery_date DATE,
    subtotal NUMERIC(12,2) DEFAULT 0,
    tax_amount NUMERIC(12,2) DEFAULT 0,
    total_amount NUMERIC(12,2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'ISSUED',
    remarks TEXT
);

-- 8. Work Orders (WO)
CREATE TABLE work_orders (
    id VARCHAR(50) PRIMARY KEY,
    work_order_no VARCHAR(50) UNIQUE NOT NULL,
    machine_model VARCHAR(200) NOT NULL,
    quantity INT DEFAULT 1,
    target_completion_date DATE,
    start_date DATE,
    assigned_lead VARCHAR(150),
    stage VARCHAR(100) DEFAULT 'PLANNED',
    status VARCHAR(50) DEFAULT 'IN_PROGRESS',
    customer_id VARCHAR(50) REFERENCES customers(id),
    remarks TEXT
);
