import 'package:flutter/material.dart';
import '../../app_state.dart';
import '../../models/erp_module_definition.dart';
import '../../theme/app_colors.dart';

class GenericModuleScreen extends StatelessWidget {
  final ERPModule module;
  const GenericModuleScreen({super.key, required this.module});

  @override
  Widget build(BuildContext context) {
    final dark = AppColors.isDark(context);

    return Scaffold(
      backgroundColor: dark ? AppColors.darkBg : AppColors.lightBg,
      appBar: AppBar(
        title: Text('${module.name} Controller', style: const TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: dark ? AppColors.darkSurface : AppColors.primary,
        foregroundColor: Colors.white,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24.0),
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 900),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Module Info Header Card
                Container(
                  padding: const EdgeInsets.all(32),
                  decoration: AppColors.glassDecoration(context),
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(20),
                        decoration: BoxDecoration(
                          gradient: AppColors.primaryGradient,
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Icon(module.icon, size: 48, color: Colors.white),
                      ),
                      const SizedBox(width: 24),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                              decoration: BoxDecoration(
                                color: AppColors.secondary.withOpacity(0.15),
                                borderRadius: BorderRadius.circular(20),
                              ),
                              child: Text(
                                module.category,
                                style: const TextStyle(color: AppColors.secondary, fontWeight: FontWeight.bold, fontSize: 11),
                              ),
                            ),
                            const SizedBox(height: 12),
                            Text(module.name, style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
                            const SizedBox(height: 8),
                            Text(
                              module.description,
                              style: const TextStyle(color: Colors.grey, fontSize: 14, height: 1.4),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                
                const SizedBox(height: 24),

                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Left Box: Checklist of child sub-features
                    Expanded(
                      flex: 6,
                      child: Container(
                        padding: const EdgeInsets.all(24),
                        decoration: AppColors.glassDecoration(context),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('Licensed Sub-Features Scope', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                            const Divider(height: 24),
                            ...module.features.map((f) => Padding(
                              padding: const EdgeInsets.only(bottom: 12.0),
                              child: Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Icon(Icons.verified, color: AppColors.accent, size: 18),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Text(
                                      f,
                                      style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
                                    ),
                                  ),
                                ],
                              ),
                            )),
                          ],
                        ),
                      ),
                    ),
                    
                    const SizedBox(width: 24),

                    // Right Box: Module Statistics & Simulated Telemetry
                    Expanded(
                      flex: 4,
                      child: Column(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(24),
                            decoration: AppColors.glassDecoration(context),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text('Operational Metrics', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                                const Divider(height: 20),
                                _buildMetricRow('Active Database Syncs:', 'Real-time'),
                                _buildMetricRow('API Endpoints Status:', '200 OK / Active'),
                                _buildMetricRow('Cloud Backup Sync:', 'Hourly Auto'),
                                _buildMetricRow('Isolated Tenant Code:', AppState().currentUser?.companyCode ?? 'DINE'),
                                const SizedBox(height: 16),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                                  decoration: BoxDecoration(
                                    color: AppColors.accent.withOpacity(0.08),
                                    borderRadius: BorderRadius.circular(10),
                                    border: Border.all(color: AppColors.accent.withOpacity(0.2)),
                                  ),
                                  child: const Row(
                                    children: [
                                      Icon(Icons.gavel, color: AppColors.accent, size: 16),
                                      SizedBox(width: 8),
                                      Text(
                                        'Complies with GDPR & ISO',
                                        style: TextStyle(color: AppColors.accent, fontSize: 11, fontWeight: FontWeight.bold),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ),
                          
                          const SizedBox(height: 24),

                          // Target User Profile
                          Container(
                            padding: const EdgeInsets.all(24),
                            decoration: AppColors.glassDecoration(context),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text('Permitted Roles Profiles', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                                const SizedBox(height: 12),
                                Wrap(
                                  spacing: 8,
                                  runSpacing: 8,
                                  children: module.targetUsers.map((role) {
                                    return Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                      decoration: BoxDecoration(
                                        color: AppColors.primary.withOpacity(0.08),
                                        borderRadius: BorderRadius.circular(8),
                                        border: Border.all(color: AppColors.primary.withOpacity(0.2)),
                                      ),
                                      child: Text(
                                        role,
                                        style: const TextStyle(color: AppColors.primary, fontSize: 11, fontWeight: FontWeight.bold),
                                      ),
                                    );
                                  }).toList(),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildMetricRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(fontSize: 12, color: Colors.grey)),
          Text(value, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }
}
