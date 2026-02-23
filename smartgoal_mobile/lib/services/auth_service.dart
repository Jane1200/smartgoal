import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

import '../config/api_config.dart';
import 'api_service.dart';

class LoginResult {
  final bool ok;
  final String? error;
  final bool requiresOTP;
  final String? email;
  final String? message;
  final Map<String, dynamic>? user;
  final String? token;

  const LoginResult({
    required this.ok,
    this.error,
    this.requiresOTP = false,
    this.email,
    this.message,
    this.user,
    this.token,
  });
}

class RegisterResult {
  final bool ok;
  final String? error;
  final Map<String, dynamic>? user;
  final String? token;

  const RegisterResult({
    required this.ok,
    this.error,
    this.user,
    this.token,
  });
}

class AuthService {
  AuthService._();
  static final AuthService instance = AuthService._();

  static const _authKey = 'sg_auth';

  Future<LoginResult> login(String email, String password) async {
    try {
      final res = await ApiService.instance.post(
        '/auth/login',
        body: {'email': email.trim(), 'password': password},
        withAuth: false,
      );
      Map<String, dynamic> data = {};
      try {
        data = jsonDecode(res.body) as Map<String, dynamic>? ?? {};
      } catch (_) {}

      if (res.statusCode != 200) {
        return LoginResult(
          ok: false,
          error: data['message'] as String? ?? 'Login failed',
        );
      }

      if (data['requiresOTP'] == true) {
        return LoginResult(
          ok: false,
          requiresOTP: true,
          email: data['email'] as String? ?? email,
          message: data['message'] as String?,
        );
      }

      final token = data['token'] as String?;
      final user = data['user'] as Map<String, dynamic>?;
      if (token == null || user == null) {
        return LoginResult(ok: false, error: 'Invalid response from server');
      }

      await _saveAuth(token: token, profile: user);
      return LoginResult(ok: true, user: user, token: token);
    } catch (e) {
      return LoginResult(ok: false, error: e.toString());
    }
  }

  Future<LoginResult> verifyOtp(String email, String otp) async {
    try {
      final res = await ApiService.instance.post(
        '/auth/verify-otp',
        body: {'email': email.trim(), 'otp': otp},
        withAuth: false,
      );
      Map<String, dynamic> data = {};
      try {
        data = jsonDecode(res.body) as Map<String, dynamic>? ?? {};
      } catch (_) {}

      if (res.statusCode != 200) {
        return LoginResult(
          ok: false,
          error: data['message'] as String? ?? 'Verification failed',
        );
      }

      final token = data['token'] as String?;
      final user = data['user'] as Map<String, dynamic>?;
      if (token == null || user == null) {
        return LoginResult(ok: false, error: 'Invalid response from server');
      }

      await _saveAuth(token: token, profile: user);
      return LoginResult(ok: true, user: user, token: token);
    } catch (e) {
      return LoginResult(ok: false, error: e.toString());
    }
  }

  Future<RegisterResult> register({
    required String name,
    required String email,
    required String password,
    required String role,
  }) async {
    try {
      final res = await ApiService.instance.post(
        '/auth/register',
        body: {
          'name': name.trim(),
          'email': email.trim(),
          'password': password,
          'role': role,
        },
        withAuth: false,
      );
      Map<String, dynamic> data = {};
      try {
        data = jsonDecode(res.body) as Map<String, dynamic>? ?? {};
      } catch (_) {}

      if (res.statusCode != 200) {
        return RegisterResult(
          ok: false,
          error: data['message'] as String? ?? 'Registration failed',
        );
      }

      final token = data['token'] as String?;
      final user = data['user'] as Map<String, dynamic>?;
      if (token == null || user == null) {
        return RegisterResult(ok: false, error: 'Invalid response from server');
      }

      await _saveAuth(token: token, profile: user);
      return RegisterResult(ok: true, user: user, token: token);
    } catch (e) {
      return RegisterResult(ok: false, error: e.toString());
    }
  }

  Future<void> _saveAuth({required String token, required Map<String, dynamic> profile}) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(
      _authKey,
      jsonEncode({'token': token, 'profile': profile}),
    );
  }

  Future<Map<String, dynamic>?> getStoredAuth() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_authKey);
    if (raw == null) return null;
    try {
      return jsonDecode(raw) as Map<String, dynamic>?;
    } catch (_) {
      return null;
    }
  }

  Future<void> logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_authKey);
  }
}
