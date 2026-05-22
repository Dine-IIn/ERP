import 'package:flutter/material.dart';

class ERPModule {
  final String id;
  final String name;
  final String description;
  final IconData icon;
  final List<String> features;
  final List<String> targetUsers;
  final String category;

  const ERPModule({
    required this.id,
    required this.name,
    required this.description,
    required this.icon,
    required this.features,
    required this.targetUsers,
    required this.category,
  });
}

class ERPModulesList {
  static const List<ERPModule> modules = [
    ERPModule(
      id: 'admin',
      name: 'Company & Administration',
      description: 'Multi-company administration, branch and hierarchy operations, logs, and settings.',
      icon: Icons.business,
      targetUsers: ['Owners', 'Directors', 'Admins'],
      category: 'Core Administration',
      features: [
        'Multi-company support',
        'Multiple branch/factory management',
        'Role-based access control',
        'Employee permissions',
        'Department management',
        'User activity logs',
        'Audit trails',
        'GST/VAT/TAX settings',
        'Currency & Timezone settings',
        'Approval workflows'
      ],
    ),
    ERPModule(
      id: 'crm',
      name: 'CRM & Leads',
      description: 'Client database, WhatsApp lead imports, scheduling, and conversion funnels.',
      icon: Icons.people_alt,
      targetUsers: ['Sales Team', 'Marketing Team'],
      category: 'Sales & Marketing',
      features: [
        'Lead capture forms',
        'Website inquiry integration',
        'WhatsApp lead import',
        'Lead scoring & assignment',
        'Follow-up reminders',
        'Sales pipeline tracking',
        'Customer profiles',
        'Communication history',
        'Customer credit limits'
      ],
    ),
    ERPModule(
      id: 'sales',
      name: 'Sales & Order Management',
      description: 'Create quotations, invoices, handle bulk schedules, and manage recurring sales.',
      icon: Icons.shopping_bag,
      targetUsers: ['Sales Department'],
      category: 'Sales & Marketing',
      features: [
        'Quotation generation',
        'Estimate & Sales order management',
        'Order approval system',
        'Product catalog',
        'Dynamic customer pricing',
        'Tax & Discount calculations',
        'Invoice generation',
        'Payment tracking',
        'Return & Refund handling'
      ],
    ),
    ERPModule(
      id: 'purchase',
      name: 'Purchase & Procurement',
      description: 'Vendor quotes, comparison charts, inventory restocking, and automation alerts.',
      icon: Icons.shopping_cart,
      targetUsers: ['Purchase Department'],
      category: 'Logistics & Supply',
      features: [
        'Vendor management',
        'Supplier quotations',
        'Purchase requests & orders',
        'Approval workflows',
        'Goods receipt notes (GRN)',
        'Supplier payment tracking',
        'Raw material tracking',
        'Minimum stock auto-reorders'
      ],
    ),
    ERPModule(
      id: 'inventory',
      name: 'Inventory & Warehouse',
      description: 'Real-time stock controls, batch tracking, rack assignments, and barcode integration.',
      icon: Icons.inventory_2,
      targetUsers: ['Warehouse Team'],
      category: 'Logistics & Supply',
      features: [
        'Real-time stock tracking',
        'Multi-warehouse support',
        'Batch & Serial number tracking',
        'Expiry & Lot tracking',
        'Stock transfers & adjustments',
        'Warehouse zoning (Rack/Bin)',
        'Barcode & QR inventory scanning',
        'Dispatch management'
      ],
    ),
    ERPModule(
      id: 'manufacturing',
      name: 'Manufacturing & Production',
      description: 'BOM configuration, machine workloads, live IoT tracking, and defect control panels.',
      icon: Icons.precision_manufacturing,
      targetUsers: ['Factory & Production Teams'],
      category: 'Production & Quality',
      features: [
        'Bill of Materials (BOM)',
        'Production scheduling & scheduling',
        'Work order management',
        'Machine allocation & Shift planning',
        'Raw material consumption',
        'Live machine IoT monitoring',
        'Defect & Scrap tracking',
        'Finished goods analytics'
      ],
    ),
    ERPModule(
      id: 'finance',
      name: 'Finance & Accounting',
      description: 'Double-entry ledger, P&L reporting, bank sync, and GST/TDS automated filings.',
      icon: Icons.account_balance,
      targetUsers: ['Accounts Department'],
      category: 'Core Administration',
      features: [
        'General ledger & Journal entries',
        'Trial balance & Profit & Loss',
        'Balance sheet & Cash flow statements',
        'Bank reconciliation',
        'GST & TDS tax handling',
        'Accounts payable/receivable',
        'Asset depreciation tracking',
        'Petty cash management'
      ],
    ),
    ERPModule(
      id: 'hrm',
      name: 'Human Resource (HRM)',
      description: 'Employee lifecycle, digital timesheets, leave policies, and salary slip generators.',
      icon: Icons.badge,
      targetUsers: ['HR Department'],
      category: 'Core Administration',
      features: [
        'Employee profiles & Joining records',
        'Attendance & Shift management',
        'Leave tracking & Holiday calendars',
        'Payroll management & Salary slips',
        'Incentive & Reimbursement tracking',
        'Performance appraisal systems',
        'Recruitment & Interview schedules',
        'Employee Self-Service portal'
      ],
    ),
    ERPModule(
      id: 'project',
      name: 'Project Management',
      description: 'Interactive Gantt charts, tasks, timesheets, and Agile project boards.',
      icon: Icons.account_tree,
      targetUsers: ['Managers', 'Teams'],
      category: 'Operations',
      features: [
        'Project & Milestone creation',
        'Task assignment & tracking',
        'Interactive Gantt charts',
        'Employee time tracking',
        'Resource allocation',
        'Agile/Scrum task boards',
        'Bug & Issue tracking'
      ],
    ),
    ERPModule(
      id: 'scm',
      name: 'Supply Chain (SCM)',
      description: 'Fleet routing, container logistics, courier updates, and export/import flow trackers.',
      icon: Icons.local_shipping,
      targetUsers: ['Logistics & Operations'],
      category: 'Logistics & Supply',
      features: [
        'Supplier network logs',
        'Transportation tracking',
        'Route optimization',
        'Fleet & Courier integrations',
        'Container tracking',
        'Logistics analytics'
      ],
    ),
    ERPModule(
      id: 'qms',
      name: 'Quality Management (QMS)',
      description: 'Quality checklist audits, SOP controls, and CAPA compliance logs.',
      icon: Icons.assignment_turned_in,
      targetUsers: ['QA Team'],
      category: 'Production & Quality',
      features: [
        'Quality inspections',
        'SOP management',
        'Compliance tracking',
        'Defect logging',
        'CAPA management',
        'Quality certificates'
      ],
    ),
    ERPModule(
      id: 'maintenance',
      name: 'Maintenance Management',
      description: 'Machine schedules, breakdown alerts, spare parts logs, and technician assigners.',
      icon: Icons.build_circle,
      targetUsers: ['Maintenance Team'],
      category: 'Production & Quality',
      features: [
        'Equipment tracking',
        'Machine maintenance schedules',
        'Preventive maintenance logs',
        'Breakdown logging',
        'Spare part tracking',
        'Technician assignment'
      ],
    ),
    ERPModule(
      id: 'pos',
      name: 'Retail & POS System',
      description: 'Fast barcode billing, drawer controls, customer rewards, and offline syncing.',
      icon: Icons.point_of_sale,
      targetUsers: ['Retail Stores'],
      category: 'Sales & Marketing',
      features: [
        'Point of Sale billing',
        'Barcode scanning billing',
        'Retail inventory sync',
        'Loyalty programs & Rewards',
        'Coupons & Discounts',
        'Cash drawer management'
      ],
    ),
    ERPModule(
      id: 'ecommerce',
      name: 'E-Commerce Integration',
      description: 'Sync inventory, stocks, and sales orders from Shopify, WooCommerce, and Amazon.',
      icon: Icons.cloud_sync,
      targetUsers: ['Online Businesses'],
      category: 'Sales & Marketing',
      features: [
        'Website product sync',
        'Online order management',
        'Shopify & WooCommerce integration',
        'Amazon/Flipkart sync',
        'Live stock synchronization'
      ],
    ),
    ERPModule(
      id: 'analytics',
      name: 'Analytics & BI',
      description: 'Visual profit reports, dynamic KPI dials, custom charts, and exports.',
      icon: Icons.bar_chart,
      targetUsers: ['Management'],
      category: 'Operations',
      features: [
        'Real-time dashboards',
        'Sales & Profit analytics',
        'Inventory forecasting',
        'KPI dashboards',
        'Custom report exports',
        'Data visualization charts'
      ],
    ),
    ERPModule(
      id: 'communication',
      name: 'Communication Hub',
      description: 'Team rooms, internal direct chat, calendars, and notice boards.',
      icon: Icons.chat_bubble_outline,
      targetUsers: ['Entire Company'],
      category: 'Operations',
      features: [
        'Internal general chat',
        'Team messaging channels',
        'Shared calendars',
        'Announcement notice boards',
        'File sharing & approvals'
      ],
    ),
    ERPModule(
      id: 'ai',
      name: 'AI & Automation',
      description: 'Smart report builders, OCR invoices, demand forecasts, and assistant chatbots.',
      icon: Icons.psychology,
      targetUsers: ['Entire Company'],
      category: 'Operations',
      features: [
        'AI chatbot assistant',
        'Smart report generation',
        'AI demand forecasting',
        'OCR invoice scanning',
        'Workflow automations',
        'Auto stock alerts'
      ],
    ),
    ERPModule(
      id: 'security',
      name: 'Security & Compliance',
      description: 'Manage 2FA, data encryptions, GDPR consent logs, and audit trail monitors.',
      icon: Icons.security,
      targetUsers: ['Admins', 'Owners'],
      category: 'Core Administration',
      features: [
        'Two-factor authentication',
        'IP restrictions',
        'Data encryption metrics',
        'Login tracking & Access logs',
        'GDPR & ISO compliance'
      ],
    ),
    ERPModule(
      id: 'mobile',
      name: 'Mobile & Remote Access',
      description: 'Offline sync logs, GPS tracking, mobile approvals, and push registers.',
      icon: Icons.phone_android,
      targetUsers: ['Field Employees', 'Admins'],
      category: 'Operations',
      features: [
        'Offline mode status',
        'Mobile approval workflow',
        'Mobile dashboards',
        'GPS & Field tracking'
      ],
    ),
    ERPModule(
      id: 'industry',
      name: 'Industry-Specific Modules',
      description: 'Add-ons for Textile, Plastic mold tracking, Pharmacy, and Construction sites.',
      icon: Icons.category,
      targetUsers: ['Management', 'Factory'],
      category: 'Production & Quality',
      features: [
        'Textile fabric roll tracking',
        'Plastic mold/resin logs',
        'Healthcare records & Pharmacy sync',
        'Construction site management',
        'Logistics route maps'
      ],
    ),
  ];
}
