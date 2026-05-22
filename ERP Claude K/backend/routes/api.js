const express = require('express');
const router = express.Router();

// Import Controllers
const authController = require('../controllers/authController');
const companyController = require('../controllers/companyController');
const chatController = require('../controllers/chatController');

// Import Middleware
const { 
  verifyToken, 
  superAdminOnly, 
  adminOnly,
  checkPermission,
  checkFeature 
} = require('../middleware/auth');

// ==================== PUBLIC ROUTES ====================
// Authentication Routes
router.post('/auth/signup/request', authController.requestSignup);
router.post('/auth/signup/verify', authController.verifySignup);
router.post('/auth/login', authController.login);
router.post('/auth/super-admin/login', authController.superAdminLogin);
router.post('/auth/refresh-token', authController.refreshToken);
router.post('/auth/forgot-password', authController.forgotPassword);
router.post('/auth/reset-password', authController.resetPassword);
router.post('/auth/logout', verifyToken, authController.logout);
router.get('/auth/validate-session', verifyToken, authController.validateSession);

// ==================== SUPER ADMIN ROUTES ====================
// Company Management (Super Admin Only)
router.post('/super-admin/companies', verifyToken, superAdminOnly, companyController.createCompany);
router.get('/super-admin/companies', verifyToken, superAdminOnly, companyController.getAllCompanies);
router.get('/super-admin/companies/statistics', verifyToken, superAdminOnly, companyController.getCompanyStatistics);
router.get('/super-admin/companies/:id', verifyToken, superAdminOnly, companyController.getCompanyById);
router.put('/super-admin/companies/:id', verifyToken, superAdminOnly, companyController.updateCompany);
router.put('/super-admin/companies/:id/features', verifyToken, superAdminOnly, companyController.updateCompanyFeatures);
router.put('/super-admin/companies/:id/subscription', verifyToken, superAdminOnly, companyController.updateSubscription);
router.patch('/super-admin/companies/:id/toggle-status', verifyToken, superAdminOnly, companyController.toggleCompanyStatus);
router.delete('/super-admin/companies/:id', verifyToken, superAdminOnly, companyController.deleteCompany);

// ==================== AUTHENTICATED USER ROUTES ====================
// Chat Routes
router.post('/chat/rooms', verifyToken, checkFeature('chat'), chatController.createChatRoom);
router.get('/chat/rooms', verifyToken, checkFeature('chat'), chatController.getUserChatRooms);
router.get('/chat/rooms/:roomId/messages', verifyToken, checkFeature('chat'), chatController.getChatRoomMessages);
router.post('/chat/messages', verifyToken, checkFeature('chat'), chatController.sendMessage);

// Expense Chat Routes
router.post('/expenses', verifyToken, checkFeature('chat'), chatController.createExpense);
router.get('/expenses', verifyToken, checkFeature('chat'), chatController.getExpenses);
router.put('/expenses/:id', verifyToken, checkFeature('chat'), chatController.updateExpense);
router.patch('/expenses/:id/approve', verifyToken, checkFeature('chat'), chatController.approveExpense);

// Health Check
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API is running',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
