class User {
  final int id;
  final String name;
  final String email;
  final String role;
  final String token;

  User({
    required this.id,
    required this.name,
    required this.email,
    required this.role,
    required this.token,
  });

  factory User.fromJson(Map<String, dynamic> json, String token) {
    // Backend returns { "token": "...", "user": { "ID": 1, ... } }
    // OR depending on implementation. Let's assume standard response based on go backend.
    
    // We get the user object from the outer map or passed manually.
    // For simplicity, let's assume the json passed here is the 'user' object from backend response.
    return User(
      id: json['id'] ?? json['ID'] ?? 0,
      name: json['name'] ?? '',
      email: json['email'] ?? '',
      role: json['role'] ?? '',
      token: token,
    );
  }
}
