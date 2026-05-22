import 'package:flutter/foundation.dart';
import 'package:enterprise_erp/models/user_model.dart';
import 'package:enterprise_erp/models/role_model.dart';
import 'package:enterprise_erp/core/services/api_service.dart';

class UserProvider with ChangeNotifier {
  final ApiService _api = ApiService();

  UserModel? _currentUser;
  RoleModel? _currentRole;
  List<UserModel> _users = [];
  bool _isLoading = false;
  String? _error;

  UserModel? get currentUser => _currentUser;
  RoleModel? get currentRole => _currentRole;
  List<UserModel> get users => _users;
  bool get isLoading => _isLoading;
  String? get error => _error;

  void setCurrentUser(UserModel user) {
    _currentUser = user;
    notifyListeners();
  }

  // Check granular module permission
  bool hasPermission(String module, String action) {
    if (_currentUser?.userType == 'super_admin') return true;
    if (_currentRole == null) return false;

    final modulePermissions = _currentRole!.permissions[module];
    if (modulePermissions == null) return false;

    if (modulePermissions is Map) {
      return modulePermissions[action] == true;
    }
    return false;
  }

  // Fetch company users
  Future<void> fetchCompanyUsers() async {
    if (_currentUser == null) return;
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final response = await _api.get('/users?company_id=${_currentUser!.companyId}');
      if (response.success && response.data != null) {
        final list = response.data as List;
        _users = list.map((json) => UserModel.fromJson(json)).toList();
      } else {
        _error = response.message ?? 'Failed to load users';
      }
    } catch (e) {
      _error = e.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // Fetch current user's role permissions
  Future<void> fetchUserRole() async {
    if (_currentUser == null || _currentUser!.userType == 'super_admin') return;
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final response = await _api.get('/roles/${_currentUser!.roleId}');
      if (response.success && response.data != null) {
        _currentRole = RoleModel.fromJson(response.data);
      } else {
        _error = response.message ?? 'Failed to load role permissions';
      }
    } catch (e) {
      _error = e.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }
}
