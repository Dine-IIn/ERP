import 'package:flutter/foundation.dart';
import 'package:enterprise_erp/core/services/api_service.dart';
import 'package:enterprise_erp/core/utils/storage_service.dart';
import 'package:enterprise_erp/core/constants/app_constants.dart';

class AuthProvider with ChangeNotifier {
  final ApiService _api = ApiService();
  final StorageService _storage = StorageService();

  bool _isLoading = false;
  bool _isAuthenticated = false;
  Map<String, dynamic>? _userData;
  Map<String, dynamic>? _companyData;
  String? _error;
  bool _isSuperAdmin = false;

  bool get isLoading => _isLoading;
  bool get isAuthenticated => _isAuthenticated;
  Map<String, dynamic>? get userData => _userData;
  Map<String, dynamic>? get companyData => _companyData;
  String? get error => _error;
  bool get isSuperAdmin => _isSuperAdmin;

  // Initialize - Check if user is already logged in
  Future<void> initialize() async {
    _isLoading = true;
    notifyListeners();

    try {
      final token = await _storage.getAuthToken();
      if (token != null && token.isNotEmpty) {
        _userData = await _storage.getUserData();
        _companyData = await _storage.getCompanyData();
        _isAuthenticated = true;
        _isSuperAdmin = _userData?['userType'] == 'super_admin';

        // Validate active session with backend in background
        validateSession().then((isValid) async {
          if (!isValid) {
            await logout();
          }
        });
      }
    } catch (e) {
      debugPrint('Auth initialization error: $e');
    }

    _isLoading = false;
    notifyListeners();
  }

  // Request Signup (Send OTP)
  Future<Map<String, dynamic>?> requestSignup({
    required String username,
    required String email,
    required String mobile,
    required String password,
    required String companyCode,
    required String verificationMethod,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final response = await _api.post(
        AppConfig.authSignupRequest,
        {
          'username': username,
          'email': email,
          'mobile': mobile,
          'password': password,
          'company_code': companyCode,
          'verification_method': verificationMethod,
        },
        requiresAuth: false,
      );

      _isLoading = false;

      if (response.success) {
        notifyListeners();
        return response.data;
      } else {
        _error = response.message ?? 'Signup request failed';
        notifyListeners();
        return null;
      }
    } catch (e) {
      _isLoading = false;
      _error = 'Error: ${e.toString()}';
      notifyListeners();
      return null;
    }
  }

  // Verify Signup OTP
  Future<bool> verifySignup({
    required String signupToken,
    required String otpCode,
    required String verificationMethod,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final response = await _api.post(
        AppConfig.authSignupVerify,
        {
          'signup_token': signupToken,
          'otp_code': otpCode,
          'verification_method': verificationMethod,
        },
        requiresAuth: false,
      );

      _isLoading = false;

      if (response.success) {
        await _handleAuthSuccess(response.data);
        return true;
      } else {
        _error = response.message ?? 'OTP verification failed';
        notifyListeners();
        return false;
      }
    } catch (e) {
      _isLoading = false;
      _error = 'Error: ${e.toString()}';
      notifyListeners();
      return false;
    }
  }

  // Login
  Future<bool> login({
    required String username,
    required String password,
    required String companyCode,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final response = await _api.post(
        AppConfig.authLogin,
        {
          'username': username,
          'password': password,
          'company_code': companyCode,
        },
        requiresAuth: false,
      );

      _isLoading = false;

      if (response.success) {
        await _handleAuthSuccess(response.data);
        return true;
      } else {
        _error = response.message ?? 'Login failed';
        notifyListeners();
        return false;
      }
    } catch (e) {
      _isLoading = false;
      _error = 'Error: ${e.toString()}';
      notifyListeners();
      return false;
    }
  }

  // Super Admin Login
  Future<bool> superAdminLogin({
    required String username,
    required String password,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final response = await _api.post(
        AppConfig.authSuperAdminLogin,
        {
          'username': username,
          'password': password,
        },
        requiresAuth: false,
      );

      _isLoading = false;

      if (response.success) {
        await _storage.saveAuthToken(response.data['token']);
        await _storage.saveRefreshToken(response.data['refresh_token']);
        await _storage.saveUserData(response.data['admin']);

        _userData = response.data['admin'];
        _isAuthenticated = true;
        _isSuperAdmin = true;
        notifyListeners();
        return true;
      } else {
        _error = response.message ?? 'Login failed';
        notifyListeners();
        return false;
      }
    } catch (e) {
      _isLoading = false;
      _error = 'Error: ${e.toString()}';
      notifyListeners();
      return false;
    }
  }

  // Handle successful authentication
  Future<void> _handleAuthSuccess(Map<String, dynamic> data) async {
    await _storage.saveAuthToken(data['token']);
    await _storage.saveRefreshToken(data['refresh_token']);
    await _storage.saveUserData(data['user']);

    if (data['company'] != null) {
      await _storage.saveCompanyData(data['company']);
      _companyData = data['company'];
    }

    _userData = data['user'];
    _isAuthenticated = true;
    _isSuperAdmin = false;
    notifyListeners();
  }

  // Logout
  Future<void> logout() async {
    _isLoading = true;
    notifyListeners();

    try {
      await _api.post(AppConfig.authLogout, {});
    } catch (e) {
      debugPrint('Logout API warning: $e');
    }

    try {
      await _storage.clearAll();
      _userData = null;
      _companyData = null;
      _isAuthenticated = false;
      _isSuperAdmin = false;
      _error = null;
    } catch (e) {
      debugPrint('Logout storage error: $e');
    }

    _isLoading = false;
    notifyListeners();
  }

  // Validate active session
  Future<bool> validateSession() async {
    try {
      final response = await _api.get(AppConfig.authValidateSession);
      if (response.success) {
        if (response.data['userType'] == 'super_admin') {
          _userData = response.data['admin'];
          _isSuperAdmin = true;
        } else {
          _userData = response.data['user'];
          _companyData = response.data['company'];
          _isSuperAdmin = false;
        }
        _isAuthenticated = true;

        await _storage.saveUserData(_userData!);
        if (_companyData != null) {
          await _storage.saveCompanyData(_companyData!);
        }
        notifyListeners();
        return true;
      }
    } catch (e) {
      debugPrint('Session validation error: $e');
    }
    return false;
  }

  // Forgot Password (Request OTP)
  Future<bool> forgotPassword({
    required String email,
    required String companyCode,
    String verificationMethod = 'email',
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final response = await _api.post(
        AppConfig.authForgotPassword,
        {
          'email': email,
          'company_code': companyCode,
          'verification_method': verificationMethod,
        },
        requiresAuth: false,
      );

      _isLoading = false;

      if (response.success) {
        notifyListeners();
        return true;
      } else {
        _error = response.message ?? 'Password reset request failed';
        notifyListeners();
        return false;
      }
    } catch (e) {
      _isLoading = false;
      _error = 'Error: ${e.toString()}';
      notifyListeners();
      return false;
    }
  }

  // Reset Password
  Future<bool> resetPassword({
    required String email,
    required String companyCode,
    required String otpCode,
    required String newPassword,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final response = await _api.post(
        AppConfig.authResetPassword,
        {
          'email': email,
          'company_code': companyCode,
          'otp_code': otpCode,
          'new_password': newPassword,
        },
        requiresAuth: false,
      );

      _isLoading = false;

      if (response.success) {
        notifyListeners();
        return true;
      } else {
        _error = response.message ?? 'Password reset failed';
        notifyListeners();
        return false;
      }
    } catch (e) {
      _isLoading = false;
      _error = 'Error: ${e.toString()}';
      notifyListeners();
      return false;
    }
  }

  // Clear error
  void clearError() {
    _error = null;
    notifyListeners();
  }
}
