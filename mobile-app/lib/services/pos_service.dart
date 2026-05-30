import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:singgah_pos_mobile/models/product_model.dart';
import 'package:singgah_pos_mobile/utils/constants.dart';

class PosService {
  final _storage = const FlutterSecureStorage();
  final _client = http.Client();

  Future<String?> _getToken() async {
    return await _storage.read(key: 'jwt_token');
  }

  Future<Map<String, dynamic>> getSettings() async {
    final token = await _getToken();
    final response = await _client
        .get(
          Uri.parse('${Constants.apiBaseUrl}/settings'),
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer $token',
          },
        )
        .timeout(const Duration(seconds: 10));

    if (response.statusCode == 200) {
      return jsonDecode(response.body) as Map<String, dynamic>;
    }
    return {};
  }

  Future<List<Product>> getProducts() async {
    final token = await _getToken();
    final response = await _client
        .get(
          Uri.parse('${Constants.apiBaseUrl}/products'),
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer $token',
          },
        )
        .timeout(const Duration(seconds: 10));

    if (response.statusCode == 200) {
      final List<dynamic> data = jsonDecode(response.body);
      return data.map((json) => Product.fromJson(json)).toList();
    }
    throw Exception('Failed to load products (${response.statusCode})');
  }

  Future<Map<String, dynamic>> createOrder(Map<String, dynamic> orderData) async {
    final token = await _getToken();
    final response = await _client
        .post(
          Uri.parse('${Constants.apiBaseUrl}/orders'),
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer $token',
          },
          body: jsonEncode(orderData),
        )
        .timeout(const Duration(seconds: 15));

    if (response.statusCode == 201) {
      return jsonDecode(response.body) as Map<String, dynamic>;
    }
    final body = jsonDecode(response.body);
    throw Exception(body['error'] ?? 'Order failed (${response.statusCode})');
  }

  void dispose() {
    _client.close();
  }
}
