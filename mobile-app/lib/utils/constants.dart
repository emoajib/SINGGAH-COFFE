class Constants {
  // For Android Emulator: use 10.0.2.2
  // For iOS Simulator: use localhost
  // Override via --dart-define=API_BASE_URL=http://192.168.1.x:8080
  static const String _envBaseUrl = String.fromEnvironment('API_BASE_URL');
  static const String apiBaseUrl = _envBaseUrl == ''
      ? 'http://localhost:8080/api'
      : '$_envBaseUrl/api';
}
