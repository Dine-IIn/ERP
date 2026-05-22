import 'package:flutter/material.dart';
import 'package:enterprise_erp/core/constants/app_constants.dart';

class DashboardProvider with ChangeNotifier {
  String _selectedModule = 'Dashboard';
  int _unreadNotificationsCount = 3;
  List<Map<String, dynamic>> _kpiMetrics = [
    {
      'label': 'Total Revenue',
      'value': '\$128,450.00',
      'icon': Icons.attach_money,
      'color': Color(AppColors.primaryBlue),
    },
    {
      'label': 'Active Tenants',
      'value': '14',
      'icon': Icons.business,
      'color': Color(AppColors.secondaryPurple),
    },
    {
      'label': 'Pending Claims',
      'value': '\$2,450.00',
      'icon': Icons.pending_actions,
      'color': Color(AppColors.warning),
    },
    {
      'label': 'System Health',
      'value': '99.9%',
      'icon': Icons.dns,
      'color': Color(AppColors.success),
    },
  ];

  String get selectedModule => _selectedModule;
  int get unreadNotificationsCount => _unreadNotificationsCount;
  List<Map<String, dynamic>> get kpiMetrics => _kpiMetrics;

  void selectModule(String module) {
    _selectedModule = module;
    notifyListeners();
  }

  void clearNotifications() {
    _unreadNotificationsCount = 0;
    notifyListeners();
  }

  void updateKPIs(List<Map<String, dynamic>> metrics) {
    _kpiMetrics = metrics;
    notifyListeners();
  }
}
