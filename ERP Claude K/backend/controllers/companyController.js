const Company = require('../models/Company');
const User = require('../models/User');
const Role = require('../models/Role');
const { Op } = require('sequelize');

// ==================== CREATE COMPANY ====================
exports.createCompany = async (req, res) => {
  try {
    const {
      company_code,
      company_name,
      email,
      phone,
      subscription_plan,
      max_users,
      max_storage_gb,
      enabled_features,
      settings,
      admin_username,
      admin_email,
      admin_mobile,
      admin_password,
      admin_first_name,
      admin_last_name
    } = req.body;

    // Validate required fields
    if (!company_code || !company_name || !email) {
      return res.status(400).json({
        success: false,
        message: 'Company code, name, and email are required'
      });
    }

    // Check if company code already exists
    const existingCompany = await Company.findOne({ where: { company_code } });
    if (existingCompany) {
      return res.status(400).json({
        success: false,
        message: 'Company code already exists'
      });
    }

    // Create company
    const company = await Company.create({
      company_code,
      company_name,
      email,
      phone,
      subscription_plan: subscription_plan || 'trial',
      subscription_start: new Date(),
      subscription_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days trial
      max_users: max_users || 5,
      max_storage_gb: max_storage_gb || 10,
      enabled_features: enabled_features || {},
      settings: settings || {},
      is_active: true
    });

    // Create default roles for the company
    const defaultRoles = [
      {
        company_id: company.id,
        name: 'Admin',
        slug: 'admin',
        description: 'Full access to all features',
        is_system_role: true,
        priority: 100
      },
      {
        company_id: company.id,
        name: 'Manager',
        slug: 'manager',
        description: 'Manage team and operations',
        is_system_role: true,
        priority: 80
      },
      {
        company_id: company.id,
        name: 'Employee',
        slug: 'employee',
        description: 'Basic employee access',
        is_system_role: true,
        priority: 50
      }
    ];

    const createdRoles = await Role.bulkCreate(defaultRoles);
    const adminRole = createdRoles.find(r => r.slug === 'admin');

    // Create admin user if credentials provided
    if (admin_username && admin_email && admin_mobile && admin_password) {
      const adminUser = await User.create({
        company_id: company.id,
        username: admin_username,
        email: admin_email,
        mobile: admin_mobile,
        password: admin_password,
        first_name: admin_first_name || 'Admin',
        last_name: admin_last_name || 'User',
        role_id: adminRole.id,
        is_admin: true,
        email_verified: true,
        mobile_verified: true,
        is_active: true
      });

      return res.status(201).json({
        success: true,
        message: 'Company and admin user created successfully',
        company: company.toJSON(),
        admin: adminUser.toJSON()
      });
    }

    res.status(201).json({
      success: true,
      message: 'Company created successfully',
      company: company.toJSON()
    });

  } catch (error) {
    console.error('Create company error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create company',
      error: error.message
    });
  }
};

// ==================== GET ALL COMPANIES ====================
exports.getAllCompanies = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      search, 
      subscription_plan, 
      is_active 
    } = req.query;

    const where = {};
    
    if (search) {
      where[Op.or] = [
        { company_name: { [Op.iLike]: `%${search}%` } },
        { company_code: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } }
      ];
    }

    if (subscription_plan) {
      where.subscription_plan = subscription_plan;
    }

    if (is_active !== undefined) {
      where.is_active = is_active === 'true';
    }

    const offset = (page - 1) * limit;

    const { count, rows: companies } = await Company.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset,
      order: [['created_at', 'DESC']]
    });

    res.status(200).json({
      success: true,
      companies,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / limit)
      }
    });

  } catch (error) {
    console.error('Get companies error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch companies',
      error: error.message
    });
  }
};

// ==================== GET COMPANY BY ID ====================
exports.getCompanyById = async (req, res) => {
  try {
    const { id } = req.params;

    const company = await Company.findByPk(id);

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    // Get user count
    const userCount = await User.count({
      where: { company_id: company.id }
    });

    res.status(200).json({
      success: true,
      company: {
        ...company.toJSON(),
        user_count: userCount
      }
    });

  } catch (error) {
    console.error('Get company error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch company',
      error: error.message
    });
  }
};

// ==================== UPDATE COMPANY ====================
exports.updateCompany = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const company = await Company.findByPk(id);

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    // Don't allow company_code to be changed
    delete updates.company_code;

    await company.update(updates);

    res.status(200).json({
      success: true,
      message: 'Company updated successfully',
      company: company.toJSON()
    });

  } catch (error) {
    console.error('Update company error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update company',
      error: error.message
    });
  }
};

// ==================== UPDATE COMPANY FEATURES ====================
exports.updateCompanyFeatures = async (req, res) => {
  try {
    const { id } = req.params;
    const { enabled_features } = req.body;

    const company = await Company.findByPk(id);

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    company.enabled_features = {
      ...company.enabled_features,
      ...enabled_features
    };

    await company.save();

    res.status(200).json({
      success: true,
      message: 'Company features updated successfully',
      enabled_features: company.enabled_features
    });

  } catch (error) {
    console.error('Update features error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update features',
      error: error.message
    });
  }
};

// ==================== UPDATE COMPANY SUBSCRIPTION ====================
exports.updateSubscription = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      subscription_plan, 
      subscription_end, 
      max_users, 
      max_storage_gb 
    } = req.body;

    const company = await Company.findByPk(id);

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    if (subscription_plan) company.subscription_plan = subscription_plan;
    if (subscription_end) company.subscription_end = new Date(subscription_end);
    if (max_users) company.max_users = max_users;
    if (max_storage_gb) company.max_storage_gb = max_storage_gb;

    await company.save();

    res.status(200).json({
      success: true,
      message: 'Subscription updated successfully',
      company: company.toJSON()
    });

  } catch (error) {
    console.error('Update subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update subscription',
      error: error.message
    });
  }
};

// ==================== TOGGLE COMPANY STATUS ====================
exports.toggleCompanyStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const company = await Company.findByPk(id);

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    company.is_active = !company.is_active;
    await company.save();

    res.status(200).json({
      success: true,
      message: `Company ${company.is_active ? 'activated' : 'deactivated'} successfully`,
      is_active: company.is_active
    });

  } catch (error) {
    console.error('Toggle status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle company status',
      error: error.message
    });
  }
};

// ==================== DELETE COMPANY ====================
exports.deleteCompany = async (req, res) => {
  try {
    const { id } = req.params;

    const company = await Company.findByPk(id);

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    await company.destroy();

    res.status(200).json({
      success: true,
      message: 'Company deleted successfully'
    });

  } catch (error) {
    console.error('Delete company error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete company',
      error: error.message
    });
  }
};

// ==================== GET COMPANY STATISTICS ====================
exports.getCompanyStatistics = async (req, res) => {
  try {
    const totalCompanies = await Company.count();
    const activeCompanies = await Company.count({ where: { is_active: true } });
    const inactiveCompanies = totalCompanies - activeCompanies;

    const subscriptionStats = await Company.findAll({
      attributes: [
        'subscription_plan',
        [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count']
      ],
      group: ['subscription_plan']
    });

    const recentCompanies = await Company.findAll({
      limit: 5,
      order: [['created_at', 'DESC']]
    });

    res.status(200).json({
      success: true,
      statistics: {
        total: totalCompanies,
        active: activeCompanies,
        inactive: inactiveCompanies,
        by_plan: subscriptionStats,
        recent: recentCompanies
      }
    });

  } catch (error) {
    console.error('Get statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics',
      error: error.message
    });
  }
};

module.exports = exports;
