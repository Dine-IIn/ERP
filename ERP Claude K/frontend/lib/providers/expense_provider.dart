import 'package:flutter/foundation.dart';
import 'package:enterprise_erp/models/expense_model.dart';
import 'package:enterprise_erp/core/services/api_service.dart';
import 'package:enterprise_erp/core/constants/app_constants.dart';

class ExpenseProvider with ChangeNotifier {
  final ApiService _api = ApiService();

  List<ExpenseModel> _expenses = [];
  bool _isLoading = false;
  String? _error;

  List<ExpenseModel> get expenses => _expenses;
  bool get isLoading => _isLoading;
  String? get error => _error;

  // Fetch expenses
  Future<void> fetchExpenses() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final response = await _api.get(AppConfig.expenses);
      if (response.success && response.data != null) {
        final list = response.data as List;
        _expenses = list.map((json) => ExpenseModel.fromJson(json)).toList();
      } else {
        _error = response.message ?? 'Failed to load expenses';
      }
    } catch (e) {
      _error = e.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // Create new expense
  Future<bool> createExpense(Map<String, dynamic> data) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final response = await _api.post(AppConfig.expenses, data);
      _isLoading = false;
      if (response.success) {
        await fetchExpenses();
        return true;
      } else {
        _error = response.message ?? 'Failed to submit expense';
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

  // Approve / Reject expense
  Future<bool> updateExpenseStatus(String expenseId, String status) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final response = await _api.put(
        '${AppConfig.expenses}/$expenseId/status',
        {'status': status},
      );
      _isLoading = false;
      if (response.success) {
        await fetchExpenses();
        return true;
      } else {
        _error = response.message ?? 'Failed to update expense status';
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
