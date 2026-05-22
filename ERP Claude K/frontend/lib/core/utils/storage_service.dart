import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:enterprise_erp/core/constants/app_constants.dart';

class StorageService {
  static final StorageService _instance = StorageService._internal();
  factory StorageService() => _instance;
  StorageService._internal();

  SharedPreferences? _prefs;

  Future<void> init() async {
    _prefs ??= await SharedPreferences.getInstance();
  }

  // Auth Token
  Future<void> saveAuthToken(String token) async {
    await _prefs?.setString(AppConfig.authTokenKey, token);
  }

  Future<String?> getAuthToken() async {
    return _prefs?.getString(AppConfig.authTokenKey);
  }

  Future<void> removeAuthToken() async {
    await _prefs?.remove(AppConfig.authTokenKey);
  }

  // Refresh Token
  Future<void> saveRefreshToken(String token) async {
    await _prefs?.setString(AppConfig.refreshTokenKey, token);
  }

  Future<String?> getRefreshToken() async {
    return _prefs?.getString(AppConfig.refreshTokenKey);
  }

  // User Data
  Future<void> saveUserData(Map<String, dynamic> userData) async {
    await _prefs?.setString(AppConfig.userDataKey, jsonEncode(userData));
  }

  Future<Map<String, dynamic>?> getUserData() async {
    final data = _prefs?.getString(AppConfig.userDataKey);
    if (data != null) {
      return jsonDecode(data);
    }
    return null;
  }

  Future<void> removeUserData() async {
    await _prefs?.remove(AppConfig.userDataKey);
  }

  // Company Data
  Future<void> saveCompanyData(Map<String, dynamic> companyData) async {
    await _prefs?.setString(AppConfig.companyDataKey, jsonEncode(companyData));
  }

  Future<Map<String, dynamic>?> getCompanyData() async {
    final data = _prefs?.getString(AppConfig.companyDataKey);
    if (data != null) {
      return jsonDecode(data);
    }
    return null;
  }

  // Theme
  Future<void> saveThemeMode(String mode) async {
    await _prefs?.setString(AppConfig.themeKey, mode);
  }

  Future<String?> getThemeMode() async {
    return _prefs?.getString(AppConfig.themeKey);
  }

  // Check if user is logged in
  Future<bool> isLoggedIn() async {
    final token = await getAuthToken();
    return token != null && token.isNotEmpty;
  }

  // Clear all data (logout)
  Future<void> clearAll() async {
    await removeAuthToken();
    await _prefs?.remove(AppConfig.refreshTokenKey);
    await removeUserData();
    await _prefs?.remove(AppConfig.companyDataKey);
  }

  // Generic methods
  Future<void> setString(String key, String value) async {
    await _prefs?.setString(key, value);
  }

  String? getString(String key) {
    return _prefs?.getString(key);
  }

  Future<void> setBool(String key, bool value) async {
    await _prefs?.setBool(key, value);
  }

  bool? getBool(String key) {
    return _prefs?.getBool(key);
  }

  Future<void> setInt(String key, int value) async {
    await _prefs?.setInt(key, value);
  }

  int? getInt(String key) {
    return _prefs?.getInt(key);
  }

  Future<void> remove(String key) async {
    await _prefs?.remove(key);
  }
}
