class Product {
  final int id;
  final String name;
  final String category;
  final double price;
  final double cost;
  final int stock;
  final String sku;
  final String description;
  final String? imageUrl;

  Product({
    required this.id,
    required this.name,
    required this.category,
    required this.price,
    required this.cost,
    required this.stock,
    required this.sku,
    required this.description,
    this.imageUrl,
  });

  factory Product.fromJson(Map<String, dynamic> json) {
    return Product(
      id: json['id'] ?? 0,
      name: json['name'] ?? '',
      category: json['category'] ?? '',
      price: (json['price'] ?? 0).toDouble(),
      cost: (json['cost'] ?? 0).toDouble(),
      stock: json['stock'] ?? 0,
      sku: json['sku'] ?? '',
      description: json['description'] ?? '',
      imageUrl: json['image_url'],
    );
  }
}
