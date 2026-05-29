import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:singgah_pos_mobile/services/auth_provider.dart';
import 'package:singgah_pos_mobile/screens/login_screen.dart';
import 'package:singgah_pos_mobile/screens/pos_screen.dart';

class DashboardScreen extends StatelessWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final authProvider = Provider.of<AuthProvider>(context);
    final user = authProvider.user;
    final role = user?.role ?? 'cashier';

    return Scaffold(
      appBar: AppBar(
        title: const Text('Singgah POS'),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () {
               authProvider.logout();
               Navigator.of(context).pushReplacement(
                 MaterialPageRoute(builder: (_) => const LoginScreen()),
               );
            },
          ),
        ],
      ),
      body: Center(
        child: SingleChildScrollView(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const CircleAvatar(
                radius: 40,
                backgroundColor: Colors.brown,
                child: Icon(Icons.person, size: 50, color: Colors.white),
              ),
              const SizedBox(height: 16),
              Text(
                'Welcome, ${user?.name ?? "Staff"}!',
                style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
              ),
              Text(
                role.toUpperCase(),
                style: TextStyle(color: Colors.grey[600], letterSpacing: 1.2),
              ),
              const SizedBox(height: 24),
              const Text('Select a module to begin:'),
              const SizedBox(height: 24),
              
              Wrap(
                spacing: 16,
                runSpacing: 16,
                alignment: WrapAlignment.center,
                children: [
                  _buildModuleCard(context, 'New Order', Icons.shopping_cart, true),
                  _buildModuleCard(context, 'Orders History', Icons.history, true),
                  // Restricted modules
                  if (role == 'owner' || role == 'manager')
                    _buildModuleCard(context, 'Inventory', Icons.inventory, true),
                  
                  _buildModuleCard(context, 'Settings', Icons.settings, true),
                  
                  if (role == 'owner')
                    _buildModuleCard(context, 'Reports', Icons.bar_chart, false),
                ],
              ),
              const SizedBox(height: 32),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildModuleCard(BuildContext context, String title, IconData icon, bool implemented) {
    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: InkWell(
        onTap: () {
          if (title == 'New Order') {
            Navigator.push(
              context,
              MaterialPageRoute(builder: (context) => const PosScreen()),
            );
          } else {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(implemented ? 'Module $title coming soon' : 'Access Restricted'),
                backgroundColor: implemented ? Colors.blue : Colors.orange,
              ),
            );
          }
        },
        borderRadius: BorderRadius.circular(16),
        child: Container(
          width: 140,
          height: 140,
          padding: const EdgeInsets.all(16),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, size: 40, color: Theme.of(context).colorScheme.primary),
              const SizedBox(height: 12),
              Text(
                title, 
                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
