import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

import '../config/api_config.dart';

class ApiService {
  ApiService._();
  static final ApiService instance = ApiService._();

  String get _baseUrl => kApiBaseUrl;

  Future<Map<String, String>> _headers({bool withAuth = true}) async {
    final headers = <String, String>{
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    if (withAuth) {
      final prefs = await SharedPreferences.getInstance();
      final raw = prefs.getString('sg_auth');
      if (raw != null) {
        try {
          final data = jsonDecode(raw) as Map<String, dynamic>;
          final token = data['token'] as String?;
          if (token != null) {
            headers['Authorization'] = 'Bearer $token';
          }
        } catch (_) {}
      }
    }
    return headers;
  }

  Future<http.Response> post(
    String path, {
    Map<String, dynamic>? body,
    bool withAuth = true,
  }) async {
    final uri = Uri.parse('$_baseUrl$path');
    return http.post(
      uri,
      headers: await _headers(withAuth: withAuth),
      body: body != null ? jsonEncode(body) : null,
    );
  }

  Future<http.Response> get(String path, {bool withAuth = true}) async {
    final uri = Uri.parse('$_baseUrl$path');
    return http.get(uri, headers: await _headers(withAuth: withAuth));
  }
}
