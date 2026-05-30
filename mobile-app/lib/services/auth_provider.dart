import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:singgah_pos_mobile/models/user_model.dart';
import 'package:singgah_pos_mobile/utils/constants.dart';

class AuthProvider with ChangeNotifier {
  User? _user;
  bool _isLoading = false;
  bool _isInitializing = true;
  String? _errorMessage;
  final _storage = const FlutterSecureStorage();

  User? get user => _user;
  bool get isLoading => _isLoading;
  bool get isInitializing => _isInitializing;
  String? get errorMessage => _errorMessage;

  bool get isAuthenticated => _user != null;

  Future<void> tryAutoLogin() async {
    try {
      final token = await _storage.read(key: 'jwt_token');
      if (token != null) {
        final parts = token.split('.');
        if (parts.length == 3) {
          final payload = jsonDecode(utf8.decode(base64Url.decode(base64Url.normalize(parts[1]))));
          final expiry = payload['exp'];
          if (expiry != null && expiry is int) {
            final expDate = DateTime.fromMillisecondsSinceEpoch(expiry * 1000);
            if (expDate.isAfter(DateTime.now())) {
              _user = User(
                id: payload['user_id'] ?? 0,
                name: payload['email']?.toString().split('@').first ?? 'User',
                email: payload['email'] ?? '',
                role: payload['role'] ?? 'cashier',
                token: token,
              );
            } else {
              await _storage.delete(key: 'jwt_token');
            }
          }
        }
      }
    } catch (_) {
      await _storage.delete(key: 'jwt_token');
    }
    _isInitializing = false;
    notifyListeners();
  }

  Future<bool> login(String email, String password) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final response = await http.post(
        Uri.parse('${Constants.apiBaseUrl}/auth/login'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'email': email,
          'password': password,
        }),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final token = data['token'];
        final userData = data['user'];
        
        _user = User.fromJson(userData, token);
        await _storage.write(key: 'jwt_token', value: token);
        
        _isLoading = false;
        notifyListeners();
        return true;
      } else {
         final errorData = jsonDecode(response.body);
        _errorMessage = errorData['error'] ?? 'Login failed';
        _isLoading = false;
        notifyListeners();
        return false;
      }
    } catch (e) {
      _errorMessage = 'Connection error: $e';
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<void> logout() async {
    _user = null;
    await _storage.delete(key: 'jwt_token');
    notifyListeners();
  }
}
