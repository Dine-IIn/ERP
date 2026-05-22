import 'package:dio/dio.dart';
import 'package:enterprise_erp/core/constants/app_constants.dart';
import 'package:enterprise_erp/core/utils/storage_service.dart';
import 'package:flutter/foundation.dart';

class ApiService {
  static final ApiService _instance = ApiService._internal();
  factory ApiService() => _instance;

  late final Dio _dio;
  final StorageService _storage = StorageService();
  bool _isRefreshing = false;
  final List<void Function(String?)> _refreshQueue = [];

  ApiService._internal() {
    _dio = Dio(BaseOptions(
      baseUrl: AppConfig.baseUrl,
      connectTimeout: AppConfig.connectionTimeout,
      receiveTimeout: AppConfig.receiveTimeout,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    ));

    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        final requiresAuth = options.extra['requiresAuth'] ?? true;
        if (requiresAuth) {
          final token = await _storage.getAuthToken();
          if (token != null && token.isNotEmpty) {
            options.headers['Authorization'] = 'Bearer $token';
          }
        }
        return handler.next(options);
      },
      onError: (DioException e, handler) async {
        final requestOptions = e.requestOptions;
        final requiresAuth = requestOptions.extra['requiresAuth'] ?? true;

        // Handle 401 Unauthorized for token refresh
        if (e.response?.statusCode == 401 && requiresAuth) {
          if (_isRefreshing) {
            // Queue request while refreshing
            _refreshQueue.add((newToken) {
              if (newToken != null) {
                requestOptions.headers['Authorization'] = 'Bearer $newToken';
                _dio.fetch(requestOptions).then(
                  (response) => handler.resolve(response),
                  onError: (err) => handler.reject(err),
                );
              } else {
                handler.reject(e);
              }
            });
            return;
          }

          _isRefreshing = true;

          try {
            final refreshToken = await _storage.getRefreshToken();
            if (refreshToken != null && refreshToken.isNotEmpty) {
              final refreshDio = Dio(BaseOptions(
                baseUrl: AppConfig.baseUrl,
                headers: {
                  'Content-Type': 'application/json',
                  'Accept': 'application/json',
                },
              ));

              final response = await refreshDio.post(
                AppConfig.authRefreshToken,
                data: {'refresh_token': refreshToken},
              );

              if (response.statusCode == 200 && response.data['success'] == true) {
                final newToken = response.data['token'];
                final newRefreshToken = response.data['refresh_token'];

                await _storage.saveAuthToken(newToken);
                if (newRefreshToken != null) {
                  await _storage.saveRefreshToken(newRefreshToken);
                }

                // Process queue
                _isRefreshing = false;
                for (var callback in _refreshQueue) {
                  callback(newToken);
                }
                _refreshQueue.clear();

                // Retry original request
                requestOptions.headers['Authorization'] = 'Bearer $newToken';
                final clonedResponse = await _dio.fetch(requestOptions);
                return handler.resolve(clonedResponse);
              }
            }
          } catch (refreshErr) {
            debugPrint('🔑 Token refresh failed: $refreshErr');
            await _storage.clearAll();
          } finally {
            _isRefreshing = false;
            _refreshQueue.clear();
          }
        }

        return handler.next(e);
      },
    ));
  }

  Future<ApiResponse> get(String endpoint, {bool requiresAuth = true}) async {
    try {
      final response = await _dio.get(
        endpoint,
        options: Options(extra: {'requiresAuth': requiresAuth}),
      );
      return _handleDioResponse(response);
    } on DioException catch (e) {
      return _handleDioError(e);
    } catch (e) {
      return ApiResponse(
        success: false,
        message: 'Error: ${e.toString()}',
        statusCode: 0,
      );
    }
  }

  Future<ApiResponse> post(
    String endpoint,
    Map<String, dynamic> body, {
    bool requiresAuth = true,
  }) async {
    try {
      final response = await _dio.post(
        endpoint,
        data: body,
        options: Options(extra: {'requiresAuth': requiresAuth}),
      );
      return _handleDioResponse(response);
    } on DioException catch (e) {
      return _handleDioError(e);
    } catch (e) {
      return ApiResponse(
        success: false,
        message: 'Error: ${e.toString()}',
        statusCode: 0,
      );
    }
  }

  Future<ApiResponse> put(
    String endpoint,
    Map<String, dynamic> body, {
    bool requiresAuth = true,
  }) async {
    try {
      final response = await _dio.put(
        endpoint,
        data: body,
        options: Options(extra: {'requiresAuth': requiresAuth}),
      );
      return _handleDioResponse(response);
    } on DioException catch (e) {
      return _handleDioError(e);
    } catch (e) {
      return ApiResponse(
        success: false,
        message: 'Error: ${e.toString()}',
        statusCode: 0,
      );
    }
  }

  Future<ApiResponse> patch(
    String endpoint,
    Map<String, dynamic> body, {
    bool requiresAuth = true,
  }) async {
    try {
      final response = await _dio.patch(
        endpoint,
        data: body,
        options: Options(extra: {'requiresAuth': requiresAuth}),
      );
      return _handleDioResponse(response);
    } on DioException catch (e) {
      return _handleDioError(e);
    } catch (e) {
      return ApiResponse(
        success: false,
        message: 'Error: ${e.toString()}',
        statusCode: 0,
      );
    }
  }

  Future<ApiResponse> delete(String endpoint, {bool requiresAuth = true}) async {
    try {
      final response = await _dio.delete(
        endpoint,
        options: Options(extra: {'requiresAuth': requiresAuth}),
      );
      return _handleDioResponse(response);
    } on DioException catch (e) {
      return _handleDioError(e);
    } catch (e) {
      return ApiResponse(
        success: false,
        message: 'Error: ${e.toString()}',
        statusCode: 0,
      );
    }
  }

  ApiResponse _handleDioResponse(Response response) {
    final data = response.data;
    final statusCode = response.statusCode ?? 200;
    
    if (statusCode >= 200 && statusCode < 300) {
      return ApiResponse(
        success: true,
        data: data,
        statusCode: statusCode,
      );
    } else {
      return ApiResponse(
        success: false,
        message: (data is Map) ? data['message'] : 'Request failed',
        data: data,
        statusCode: statusCode,
      );
    }
  }

  ApiResponse _handleDioError(DioException e) {
    if (e.response != null) {
      final data = e.response!.data;
      final statusCode = e.response!.statusCode ?? 500;
      
      return ApiResponse(
        success: false,
        message: (data is Map) ? data['message'] : 'Request failed',
        data: data,
        statusCode: statusCode,
      );
    } else {
      String message = AppStrings.networkError;
      if (e.type == DioExceptionType.connectionTimeout || e.type == DioExceptionType.receiveTimeout) {
        message = 'Request timeout. Please try again.';
      }
      return ApiResponse(
        success: false,
        message: message,
        statusCode: 0,
      );
    }
  }
}

class ApiResponse {
  final bool success;
  final String? message;
  final dynamic data;
  final int statusCode;

  ApiResponse({
    required this.success,
    this.message,
    this.data,
    required this.statusCode,
  });

  bool get isUnauthorized => statusCode == 401;
  bool get isForbidden => statusCode == 403;
  bool get isNotFound => statusCode == 404;
  bool get isServerError => statusCode >= 500;
}
