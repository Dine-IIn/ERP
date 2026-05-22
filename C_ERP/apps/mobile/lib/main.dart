import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

void main() {
  runApp(const ProviderScope(child: NexaErpMobileApp()));
}

final _router = GoRouter(
  routes: [
    GoRoute(
      path: '/',
      builder: (context, state) => const OperationsHomeScreen(),
    ),
  ],
);

class NexaErpMobileApp extends StatelessWidget {
  const NexaErpMobileApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: 'NexaERP',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF2563EB)),
        useMaterial3: true,
      ),
      routerConfig: _router,
    );
  }
}

class OperationsHomeScreen extends StatelessWidget {
  const OperationsHomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final cards = const [
      ('Open sales value', '₹4,22,200'),
      ('Pending approvals', '1'),
      ('Inventory risks', '2'),
      ('On-time dispatch', '94%'),
    ];

    return Scaffold(
      appBar: AppBar(title: const Text('NexaERP')),
      body: ListView.separated(
        padding: const EdgeInsets.all(16),
        itemBuilder: (context, index) {
          final item = cards[index];
          return Card(
            child: ListTile(
              title: Text(item.$1),
              trailing: Text(
                item.$2,
                style: Theme.of(context).textTheme.titleMedium,
              ),
            ),
          );
        },
        separatorBuilder: (context, index) => const SizedBox(height: 8),
        itemCount: cards.length,
      ),
    );
  }
}
