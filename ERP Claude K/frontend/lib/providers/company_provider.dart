import 'package:flutter/foundation.dart';
import 'package:enterprise_erp/models/company_model.dart';
import 'package:enterprise_erp/core/services/api_service.dart';
import 'package:enterprise_erp/core/constants/app_constants.dart';

class CompanyProvider with ChangeNotifier {
  final ApiService _api = ApiService();

  CompanyModel? _currentCompany;
  List<CompanyModel> _companies = [];
  bool _isLoading = false;
  String? _error;
  Map<String, dynamic>? _statistics;

  CompanyModel? get currentCompany => _currentCompany;
  List<CompanyModel> get companies => _companies;
  bool get isLoading => _isLoading;
  String? get error => _error;
  Map<String, dynamic>? get statistics => _statistics;

  void setCurrentCompany(CompanyModel company) {
    _currentCompany = company;
    notifyListeners();
  }

  // Load super admin statistics
  Future<void> fetchCompanyStatistics() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final response = await _api.get(AppConfig.companyStatistics);
      if (response.success && response.data != null) {
        _statistics = response.data as Map<String, dynamic>;
      } else {
        _error = response.message ?? 'Failed to load statistics';
      }
    } catch (e) {
      _error = e.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // Load all companies (Super Admin context)
  Future<void> fetchAllCompanies() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final response = await _api.get(AppConfig.companies);
      if (response.success && response.data != null) {
        final list = response.data as List;
        _companies = list.map((json) => CompanyModel.fromJson(json)).toList();
      } else {
        _error = response.message ?? 'Failed to load companies';
      }
    } catch (e) {
      _error = e.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // Register new company
  Future<bool> createCompany(Map<String, dynamic> data) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final response = await _api.post(AppConfig.companies, data);
      _isLoading = false;
      if (response.success) {
        await fetchAllCompanies();
        return true;
      } else {
        _error = response.message ?? 'Failed to create company';
        notifyListeners();
        return false;
      }
    } catch (e) {
      _isLoading = false;
      _error = e.toString();
      notifyListeners();
      return false;
    }
  }
}
