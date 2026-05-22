import 'package:flutter/material.dart';
import 'package:enterprise_erp/core/utils/storage_service.dart';

class ThemeProvider with ChangeNotifier {
  final StorageService _storage = StorageService();
  ThemeMode _themeMode = ThemeMode.light;

  ThemeMode get themeMode => _themeMode;
  bool get isDarkMode => _themeMode == ThemeMode.dark;

  Future<void> initialize() async {
    final mode = await _storage.getThemeMode();
    if (mode == 'dark') {
      _themeMode = ThemeMode.dark;
    } else if (mode == 'system') {
      _themeMode = ThemeMode.system;
    } else {
      _themeMode = ThemeMode.light;
    }
    notifyListeners();
  }

  Future<void> toggleTheme(bool isDark) async {
    _themeMode = isDark ? ThemeMode.dark : ThemeMode.light;
    await _storage.saveThemeMode(isDark ? 'dark' : 'light');
    notifyListeners();
  }
}
