import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:singgah_pos_mobile/models/product_model.dart';
import 'package:singgah_pos_mobile/services/pos_service.dart';
import 'package:singgah_pos_mobile/services/auth_provider.dart';
import 'package:singgah_pos_mobile/utils/constants.dart';
import 'package:intl/intl.dart';

class PosScreen extends StatefulWidget {
  const PosScreen({super.key});

  @override
  State<PosScreen> createState() => _PosScreenState();
}

class _PosScreenState extends State<PosScreen> {
  final PosService _posService = PosService();
  List<Product> _products = [];
  final Map<int, int> _cart = {};
  bool _isLoading = true;
  bool _isProcessing = false;
  String _paymentMethod = 'Cash';
  Map<String, dynamic> _settings = {};
  double _serviceRate = 0;
  double _taxRate = 0;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    try {
      final results = await Future.wait([
        _posService.getProducts(),
        _posService.getSettings(),
      ]);
      setState(() {
        _products = results[0] as List<Product>;
        _settings = results[1] as Map<String, dynamic>;
        _serviceRate = (double.tryParse(_settings['service_charge']?.toString() ?? '') ?? 0) / 100;
        _taxRate = (double.tryParse(_settings['tax_percentage']?.toString() ?? '') ?? 0) / 100;
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error loading data: $e')),
        );
      }
    }
  }

  void _addToCart(int productId) {
    setState(() {
      _cart[productId] = (_cart[productId] ?? 0) + 1;
    });
  }

  void _removeFromCart(int productId) {
    setState(() {
      if ((_cart[productId] ?? 0) > 0) {
        _cart[productId] = (_cart[productId] ?? 0) - 1;
        if (_cart[productId] == 0) {
          _cart.remove(productId);
        }
      }
    });
  }

  double _calculateSubtotal() {
    double total = 0;
    _cart.forEach((productId, qty) {
      try {
        final product = _products.firstWhere((p) => p.id == productId);
        total += product.price * qty;
      } catch (_) {}
    });
    return total;
  }

  Future<void> _processCheckout() async {
    if (_cart.isEmpty || _isProcessing) return;
    setState(() => _isProcessing = true);

    try {
      final user = Provider.of<AuthProvider>(context, listen: false).user;
      final orderItems = _cart.entries.map((e) {
        return {
          'product_id': e.key,
          'quantity': e.value,
        };
      }).toList();

      final now = DateTime.now();
      final orderNumber = 'ORD-${now.year}${now.month.toString().padLeft(2, '0')}${now.day.toString().padLeft(2, '0')}${now.hour.toString().padLeft(2, '0')}${now.minute.toString().padLeft(2, '0')}${now.second.toString().padLeft(2, '0')}';

      final orderData = {
        'order_number': orderNumber,
        'payment_method': _paymentMethod,
        'cashier_name': user?.name ?? 'Unknown',
        'items': orderItems,
      };

      await _posService.createOrder(orderData);
      setState(() => _cart.clear());
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Transaction Success!')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Transaction Failed: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _isProcessing = false);
    }
  }

  @override
  void dispose() {
    _posService.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final subtotal = _calculateSubtotal();
    final serviceFee = subtotal * _serviceRate;
    final tax = (subtotal + serviceFee) * _taxRate;
    final total = subtotal + serviceFee + tax;

    return Scaffold(
      appBar: AppBar(title: const Text('Cashier Terminal')),
      body: Row(
        children: [
          Expanded(
            flex: 2,
            child: _isLoading 
              ? const Center(child: CircularProgressIndicator()) 
              : GridView.builder(
                  padding: const EdgeInsets.all(16),
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 3,
                    childAspectRatio: 0.8,
                    crossAxisSpacing: 16,
                    mainAxisSpacing: 16,
                  ),
                  itemCount: _products.length,
                  itemBuilder: (context, index) {
                    final product = _products[index];
                    return Card(
                      child: InkWell(
                        onTap: () => _addToCart(product.id),
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            ClipRRect(
                              borderRadius: BorderRadius.circular(8),
                              child: product.imageUrl != null
                                  ? Image.network(
                                      product.imageUrl!.startsWith('http')
                                          ? product.imageUrl!
                                          : '${Constants.baseUrl}/../$product.imageUrl',
                                      height: 48, width: 48, fit: BoxFit.cover,
                                      errorBuilder: (_, __, ___) => const Icon(Icons.coffee, size: 48, color: Colors.brown),
                                    )
                                  : const Icon(Icons.coffee, size: 48, color: Colors.brown),
                            ),
                            const SizedBox(height: 8),
                            Text(product.name, style: const TextStyle(fontWeight: FontWeight.bold), textAlign: TextAlign.center),
                            Text('Rp ${NumberFormat('#,###').format(product.price)}'),
                            const SizedBox(height: 4),
                            Text('Stock: ${product.stock}', style: const TextStyle(fontSize: 12, color: Colors.grey)),
                          ],
                        ),
                      ),
                    );
                  },
                ),
          ),
          
          Expanded(
            flex: 1,
            child: Container(
              color: Colors.grey[100],
              child: Column(
                children: [
                  Container(
                    padding: const EdgeInsets.all(16),
                    color: Colors.blueAccent,
                    width: double.infinity,
                    child: const Text('Current Order', style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
                  ),
                  Expanded(
                    child: ListView.builder(
                      itemCount: _cart.length,
                      itemBuilder: (context, index) {
                        final productId = _cart.keys.elementAt(index);
                        final qty = _cart[productId]!;
                        final product = _products.firstWhere((p) => p.id == productId, orElse: () => Product(id: productId, name: 'Unknown', category: '', price: 0, stock: 0, sku: '', description: ''));
                        
                        return ListTile(
                          title: Text(product.name),
                          subtitle: Text('@ Rp ${NumberFormat('#,###').format(product.price)}'),
                          trailing: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              IconButton(icon: const Icon(Icons.remove_circle, size: 20, color: Colors.red), onPressed: () => _removeFromCart(productId)),
                              Text('$qty', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                              IconButton(icon: const Icon(Icons.add_circle, size: 20, color: Colors.green), onPressed: () => _addToCart(productId)),
                            ],
                          ),
                        );
                      },
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.all(24),
                    color: Colors.white,
                    child: Column(
                      children: [
                        if (_serviceRate > 0)
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text('Service (${(_serviceRate * 100).toInt()}%)', style: const TextStyle(fontSize: 14, color: Colors.grey)),
                              Text('Rp ${NumberFormat('#,###').format(serviceFee)}', style: const TextStyle(fontSize: 14)),
                            ],
                          ),
                        if (_taxRate > 0)
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text('Tax (${(_taxRate * 100).toInt()}%)', style: const TextStyle(fontSize: 14, color: Colors.grey)),
                              Text('Rp ${NumberFormat('#,###').format(tax)}', style: const TextStyle(fontSize: 14)),
                            ],
                          ),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text('Total', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                            Text('Rp ${NumberFormat('#,###').format(total)}', style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.blue)),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Row(
                          children: [
                            Expanded(
                              child: ChoiceChip(
                                label: const Text('Cash'),
                                selected: _paymentMethod == 'Cash',
                                onSelected: (_) => setState(() => _paymentMethod = 'Cash'),
                              ),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: ChoiceChip(
                                label: const Text('QRIS'),
                                selected: _paymentMethod == 'QRIS',
                                onSelected: (_) => setState(() => _paymentMethod = 'QRIS'),
                              ),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: ChoiceChip(
                                label: const Text('Transfer'),
                                selected: _paymentMethod == 'Transfer',
                                onSelected: (_) => setState(() => _paymentMethod = 'Transfer'),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 16),
                        SizedBox(
                          width: double.infinity,
                          child: ElevatedButton(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: Colors.blue,
                              padding: const EdgeInsets.symmetric(vertical: 16),
                            ),
                            onPressed: (_cart.isEmpty || _isProcessing) ? null : _processCheckout,
                            child: _isProcessing
                              ? const SizedBox(
                                  height: 20, width: 20,
                                  child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                                )
                              : const Text('CHARGE PAYMENT', style: TextStyle(fontSize: 18, color: Colors.white)),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
