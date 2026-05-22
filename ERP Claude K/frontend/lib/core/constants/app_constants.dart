class AppConfig {
  // API Configuration
  static const String baseUrl = String.fromEnvironment('BASE_URL', defaultValue: 'http://localhost:5000/api/v1');
  static const String socketUrl = String.fromEnvironment('SOCKET_URL', defaultValue: 'http://localhost:5000');
  
  // API Endpoints
  static const String authSignupRequest = '/auth/signup/request';
  static const String authSignupVerify = '/auth/signup/verify';
  static const String authLogin = '/auth/login';
  static const String authSuperAdminLogin = '/auth/super-admin/login';
  static const String authRefreshToken = '/auth/refresh-token';
  static const String authForgotPassword = '/auth/forgot-password';
  static const String authResetPassword = '/auth/reset-password';
  static const String authLogout = '/auth/logout';
  static const String authValidateSession = '/auth/validate-session';
  
  // Company endpoints
  static const String companies = '/super-admin/companies';
  static const String companyStatistics = '/super-admin/companies/statistics';
  
  // Chat endpoints
  static const String chatRooms = '/chat/rooms';
  static const String chatMessages = '/chat/messages';
  
  // Expense endpoints
  static const String expenses = '/expenses';
  
  // Timeouts
  static const Duration connectionTimeout = Duration(seconds: 30);
  static const Duration receiveTimeout = Duration(seconds: 30);
  
  // Storage Keys
  static const String authTokenKey = 'auth_token';
  static const String refreshTokenKey = 'refresh_token';
  static const String userDataKey = 'user_data';
  static const String companyDataKey = 'company_data';
  static const String themeKey = 'theme_mode';
  
  // App Info
  static const String appName = 'Enterprise ERP';
  static const String appVersion = '1.0.0';
  static const String appBuildNumber = '1';
  
  // Pagination
  static const int defaultPageSize = 20;
  static const int maxPageSize = 100;
  
  // File Upload
  static const int maxFileSize = 10 * 1024 * 1024; // 10MB
  static const List<String> allowedImageFormats = ['jpg', 'jpeg', 'png', 'gif'];
  static const List<String> allowedDocFormats = ['pdf', 'doc', 'docx', 'xls', 'xlsx'];
}

class AppColors {
  // Primary Colors
  static const primaryBlue = 0xFF6366F1;
  static const primaryDark = 0xFF4F46E5;
  static const primaryLight = 0xFF818CF8;
  
  // Secondary Colors
  static const secondaryPurple = 0xFF8B5CF6;
  static const secondaryPink = 0xFFEC4899;
  
  // Neutral Colors
  static const white = 0xFFFFFFFF;
  static const black = 0xFF000000;
  static const gray50 = 0xFFF9FAFB;
  static const gray100 = 0xFFF3F4F6;
  static const gray200 = 0xFFE5E7EB;
  static const gray300 = 0xFFD1D5DB;
  static const gray400 = 0xFF9CA3AF;
  static const gray500 = 0xFF6B7280;
  static const gray600 = 0xFF4B5563;
  static const gray700 = 0xFF374151;
  static const gray800 = 0xFF1F2937;
  static const gray900 = 0xFF111827;
  
  // Status Colors
  static const success = 0xFF10B981;
  static const warning = 0xFFF59E0B;
  static const error = 0xFFEF4444;
  static const info = 0xFF3B82F6;
  
  // Background Colors
  static const backgroundLight = 0xFFF9FAFB;
  static const backgroundDark = 0xFF111827;
  static const cardLight = 0xFFFFFFFF;
  static const cardDark = 0xFF1F2937;
  
  // Chat Colors
  static const sentMessage = 0xFF6366F1;
  static const receivedMessage = 0xFFF3F4F6;
  static const onlineStatus = 0xFF10B981;
  static const offlineStatus = 0xFF9CA3AF;
}

class AppStrings {
  // Authentication
  static const String welcomeTitle = 'Welcome to Enterprise ERP';
  static const String welcomeSubtitle = 'Complete business management solution';
  static const String signIn = 'Sign In';
  static const String signUp = 'Sign Up';
  static const String signOut = 'Sign Out';
  static const String forgotPassword = 'Forgot Password?';
  
  // Form Labels
  static const String username = 'Username';
  static const String email = 'Email';
  static const String mobile = 'Mobile Number';
  static const String password = 'Password';
  static const String confirmPassword = 'Confirm Password';
  static const String companyCode = 'Company Code';
  static const String otpCode = 'OTP Code';
  
  // Buttons
  static const String submit = 'Submit';
  static const String cancel = 'Cancel';
  static const String save = 'Save';
  static const String delete = 'Delete';
  static const String edit = 'Edit';
  static const String search = 'Search';
  static const String filter = 'Filter';
  static const String refresh = 'Refresh';
  static const String export = 'Export';
  
  // Messages
  static const String loading = 'Loading...';
  static const String noData = 'No data available';
  static const String error = 'Something went wrong';
  static const String success = 'Success';
  static const String networkError = 'Network error. Please check your connection.';
  
  // Modules
  static const String dashboard = 'Dashboard';
  static const String crm = 'CRM';
  static const String sales = 'Sales';
  static const String purchase = 'Purchase';
  static const String inventory = 'Inventory';
  static const String manufacturing = 'Manufacturing';
  static const String finance = 'Finance';
  static const String hrm = 'HRM';
  static const String projects = 'Projects';
  static const String chat = 'Chat';
  static const String expenses = 'Expenses';
  static const String reports = 'Reports';
  static const String settings = 'Settings';
}

class AppRoutes {
  static const String splash = '/';
  static const String login = '/login';
  static const String signup = '/signup';
  static const String otpVerification = '/otp-verification';
  static const String superAdminLogin = '/super-admin-login';
  static const String forgotPassword = '/forgot-password';
  static const String resetPassword = '/reset-password';
  
  // Main App Routes
  static const String home = '/home';
  static const String dashboard = '/dashboard';
  
  // Super Admin Routes
  static const String superAdminDashboard = '/super-admin/dashboard';
  static const String companyManagement = '/super-admin/companies';
  static const String createCompany = '/super-admin/companies/create';
  
  // Chat Routes
  static const String chatList = '/chat/list';
  static const String chatRoom = '/chat/room';
  static const String expenseChat = '/chat/expense';
  
  // Settings
  static const String profile = '/profile';
  static const String settings = '/settings';
}

class AppAssets {
  // Images
  static const String logo = 'assets/images/logo.png';
  static const String logoWhite = 'assets/images/logo_white.png';
  static const String splashLogo = 'assets/images/splash_logo.png';
  static const String placeholder = 'assets/images/placeholder.png';
  static const String emptyState = 'assets/images/empty_state.png';
  
  // Icons
  static const String appIcon = 'assets/icons/app_icon.png';
}

class AppDimensions {
  // Padding & Margins
  static const double paddingXS = 4.0;
  static const double paddingS = 8.0;
  static const double paddingM = 16.0;
  static const double paddingL = 24.0;
  static const double paddingXL = 32.0;
  
  // Border Radius
  static const double radiusS = 4.0;
  static const double radiusM = 8.0;
  static const double radiusL = 12.0;
  static const double radiusXL = 16.0;
  static const double radiusRound = 999.0;
  
  // Icon Sizes
  static const double iconXS = 16.0;
  static const double iconS = 20.0;
  static const double iconM = 24.0;
  static const double iconL = 32.0;
  static const double iconXL = 48.0;
  
  // Font Sizes
  static const double fontXS = 10.0;
  static const double fontS = 12.0;
  static const double fontM = 14.0;
  static const double fontL = 16.0;
  static const double fontXL = 18.0;
  static const double fontXXL = 24.0;
  static const double fontHeading = 32.0;
  
  // Button Heights
  static const double buttonHeightS = 36.0;
  static const double buttonHeightM = 44.0;
  static const double buttonHeightL = 52.0;
  
  // Card & Container
  static const double cardElevation = 2.0;
  static const double maxContentWidth = 1200.0;
}
