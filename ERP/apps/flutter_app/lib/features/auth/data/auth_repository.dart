import '../../../core/api/api_client.dart';
import '../domain/session.dart';

class AuthRepository {
  AuthRepository(this._api);

  final ApiClient _api;

  Future<Session> login({
    required String usernameOrEmail,
    required String password,
  }) async {
    final response = await _api.postJson('/auth/login', {
      'usernameOrEmail': usernameOrEmail,
      'password': password,
    });
    final data = response['data'] as Map<String, dynamic>;

    return Session(
      accessToken: data['accessToken'] as String,
      refreshToken: data['refreshToken'] as String,
    );
  }
}
