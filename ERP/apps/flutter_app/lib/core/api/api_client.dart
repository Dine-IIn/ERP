import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

final apiClientProvider = Provider<ApiClient>((ref) {
  return ApiClient(
    Dio(
      BaseOptions(
        baseUrl: const String.fromEnvironment(
          'API_BASE_URL',
          defaultValue: 'http://localhost:3000/api/v1',
        ),
        connectTimeout: const Duration(seconds: 15),
        receiveTimeout: const Duration(seconds: 30),
      ),
    ),
  );
});

class ApiClient {
  ApiClient(this._dio);

  final Dio _dio;

  Future<Map<String, dynamic>> getJson(String path) async {
    final response = await _dio.get<Map<String, dynamic>>(path);
    return response.data ?? <String, dynamic>{};
  }

  Future<Map<String, dynamic>> postJson(
    String path,
    Map<String, dynamic> body,
  ) async {
    final response = await _dio.post<Map<String, dynamic>>(path, data: body);
    return response.data ?? <String, dynamic>{};
  }
}
