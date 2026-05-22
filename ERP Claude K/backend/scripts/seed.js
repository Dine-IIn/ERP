require('dotenv').config();
const { SuperAdmin, Company, User, Role, ChatRoom } = require('../models');

const seed = async () => {
  try {
    console.log('Starting database seeding...');

    // Create Super Admin
    const [superAdmin, created] = await SuperAdmin.findOrCreate({
      where: { username: 'superadmin' },
      defaults: {
        username: 'superadmin',
        email: process.env.SUPER_ADMIN_EMAIL || 'admin@erp.com',
        mobile: process.env.SUPER_ADMIN_PHONE || '+1234567890',
        password: process.env.SUPER_ADMIN_PASSWORD || 'SuperAdmin@123',
        full_name: 'Super Administrator',
        is_active: true
      }
    });

    if (created) {
      console.log('✅ Super Admin created');
      console.log(`   Username: superadmin`);
      console.log(`   Email: ${superAdmin.email}`);
      console.log(`   Password: ${process.env.SUPER_ADMIN_PASSWORD || 'SuperAdmin@123'}`);
    } else {
      console.log('ℹ️  Super Admin already exists');
    }

    // Create Demo Company
    const [demoCompany, companyCreated] = await Company.findOrCreate({
      where: { company_code: 'DEMO001' },
      defaults: {
        company_code: 'DEMO001',
        company_name: 'Demo Corporation',
        legal_name: 'Demo Corporation Private Limited',
        email: 'demo@company.com',
        phone: '+91 9876543210',
        address_line1: '123 Business Park',
        city: 'Mumbai',
        state: 'Maharashtra',
        country: 'India',
        postal_code: '400001',
        subscription_plan: 'premium',
        subscription_start: new Date(),
        subscription_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
        max_users: 100,
        max_storage_gb: 100,
        enabled_features: {
          crm: true,
          sales: true,
          purchase: true,
          inventory: true,
          manufacturing: true,
          finance: true,
          hrm: true,
          projects: true,
          scm: true,
          qms: true,
          maintenance: true,
          pos: true,
          ecommerce: true,
          analytics: true,
          chat: true
        },
        is_active: true,
        is_verified: true
      }
    });

    if (companyCreated) {
      console.log('✅ Demo Company created');
      console.log(`   Company Code: DEMO001`);

      // Create roles for demo company
      const roles = [
        {
          company_id: demoCompany.id,
          name: 'Admin',
          slug: 'admin',
          description: 'Full system access',
          is_system_role: true,
          priority: 100
        },
        {
          company_id: demoCompany.id,
          name: 'Manager',
          slug: 'manager',
          description: 'Department management',
          is_system_role: true,
          priority: 80
        },
        {
          company_id: demoCompany.id,
          name: 'Sales Representative',
          slug: 'sales_rep',
          description: 'Sales and CRM access',
          is_system_role: false,
          priority: 60
        },
        {
          company_id: demoCompany.id,
          name: 'Employee',
          slug: 'employee',
          description: 'Basic access',
          is_system_role: true,
          priority: 50
        }
      ];

      await Role.bulkCreate(roles);
      console.log('✅ Default roles created');

      // Get admin role
      const adminRole = await Role.findOne({
        where: { company_id: demoCompany.id, slug: 'admin' }
      });

      // Create demo admin user
      const [demoAdmin, userCreated] = await User.findOrCreate({
        where: { 
          company_id: demoCompany.id,
          username: 'admin'
        },
        defaults: {
          company_id: demoCompany.id,
          username: 'admin',
          email: 'admin@demo.com',
          mobile: '+91 9876543210',
          password: 'Admin@123',
          first_name: 'Demo',
          last_name: 'Admin',
          role_id: adminRole.id,
          is_admin: true,
          email_verified: true,
          mobile_verified: true,
          is_active: true,
          designation: 'Administrator',
          department: 'Management'
        }
      });

      if (userCreated) {
        console.log('✅ Demo Admin User created');
        console.log(`   Username: admin`);
        console.log(`   Password: Admin@123`);
        console.log(`   Company Code: DEMO001`);
      }

      // Create demo employee
      const employeeRole = await Role.findOne({
        where: { company_id: demoCompany.id, slug: 'employee' }
      });

      const [demoEmployee, empCreated] = await User.findOrCreate({
        where: { 
          company_id: demoCompany.id,
          username: 'employee1'
        },
        defaults: {
          company_id: demoCompany.id,
          username: 'employee1',
          email: 'employee1@demo.com',
          mobile: '+91 9876543211',
          password: 'Employee@123',
          first_name: 'John',
          last_name: 'Doe',
          role_id: employeeRole.id,
          is_admin: false,
          email_verified: true,
          mobile_verified: true,
          is_active: true,
          designation: 'Sales Executive',
          department: 'Sales'
        }
      });

      if (empCreated) {
        console.log('✅ Demo Employee created');
        console.log(`   Username: employee1`);
        console.log(`   Password: Employee@123`);
      }

      // Create default chat rooms
      const [generalRoom, roomCreated] = await ChatRoom.findOrCreate({
        where: {
          company_id: demoCompany.id,
          type: 'general',
          name: 'General'
        },
        defaults: {
          company_id: demoCompany.id,
          name: 'General',
          type: 'general',
          description: 'Company-wide general discussion',
          created_by: demoAdmin.id
        }
      });

      const [expenseRoom, expRoomCreated] = await ChatRoom.findOrCreate({
        where: {
          company_id: demoCompany.id,
          type: 'expense',
          name: 'Expense Tracker'
        },
        defaults: {
          company_id: demoCompany.id,
          name: 'Expense Tracker',
          type: 'expense',
          description: 'Track and manage expenses',
          created_by: demoAdmin.id,
          settings: {
            expense_visibility: 'all'
          }
        }
      });

      if (roomCreated || expRoomCreated) {
        console.log('✅ Default chat rooms created');
      }

    } else {
      console.log('ℹ️  Demo Company already exists');
    }

    console.log('');
    console.log('═══════════════════════════════════════════════════');
    console.log('✅ Database seeding completed successfully!');
    console.log('═══════════════════════════════════════════════════');
    console.log('');
    console.log('🔐 LOGIN CREDENTIALS:');
    console.log('');
    console.log('Super Admin Portal:');
    console.log('  Username: superadmin');
    console.log(`  Password: ${process.env.SUPER_ADMIN_PASSWORD || 'SuperAdmin@123'}`);
    console.log('');
    console.log('Company Admin (DEMO001):');
    console.log('  Username: admin');
    console.log('  Password: Admin@123');
    console.log('  Company Code: DEMO001');
    console.log('');
    console.log('Employee (DEMO001):');
    console.log('  Username: employee1');
    console.log('  Password: Employee@123');
    console.log('  Company Code: DEMO001');
    console.log('');
    console.log('═══════════════════════════════════════════════════');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
};

seed();
