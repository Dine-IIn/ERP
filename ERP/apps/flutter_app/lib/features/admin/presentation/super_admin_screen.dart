import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class SuperAdminScreen extends StatefulWidget {
  const SuperAdminScreen({super.key});

  @override
  State<SuperAdminScreen> createState() => _SuperAdminScreenState();
}

class _SuperAdminScreenState extends State<SuperAdminScreen> {
  final _companyController = TextEditingController(text: 'New Enterprise');
  final _ownerController = TextEditingController(text: 'owner@company.com');
  final Set<String> _selectedFeatures = {
    'Finance',
    'Sales',
    'Procurement',
    'Inventory',
    'Manufacturing',
    'Quality',
    'HR & Payroll',
    'Reports',
  };

  final List<_Tenant> _tenants = [
    const _Tenant(
      name: 'AlloyWorks Group',
      owner: 'owner@alloyworks.in',
      plan: 'Industrial Enterprise',
      users: 1284,
      status: 'Active',
      features: [
        'Finance',
        'Sales',
        'Procurement',
        'Inventory',
        'Manufacturing',
        'Quality',
        'Maintenance',
        'HR & Payroll',
        'Reports',
      ],
    ),
  ];

  static const _featureGroups = [
    _FeatureGroup('Core ERP', [
      'Finance',
      'Controlling',
      'Sales',
      'Procurement',
      'Inventory',
      'Warehouse',
      'Tax',
      'Assets',
    ]),
    _FeatureGroup('Industrial Operations', [
      'Manufacturing',
      'MRP',
      'BOM & Routing',
      'Quality',
      'Maintenance',
      'Job Costing',
      'Shop Floor',
      'Field Service',
    ]),
    _FeatureGroup('People & Collaboration', [
      'HR & Payroll',
      'Attendance',
      'CRM',
      'Projects',
      'Tasks',
      'Chat',
      'Documents',
      'Learning',
    ]),
    _FeatureGroup('Platform', [
      'Reports',
      'Workflow Automation',
      'Approvals',
      'Audit Logs',
      'Backups',
      'Integrations',
      'API Access',
      'Feature Flags',
    ]),
  ];

  @override
  void dispose() {
    _companyController.dispose();
    _ownerController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF6F7F9),
      appBar: AppBar(
        title: const Text('Super Admin Control Plane'),
        actions: [
          TextButton.icon(
            onPressed: () => context.go('/login'),
            icon: const Icon(Icons.logout_outlined),
            label: const Text('Sign out'),
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: CustomScrollView(
        slivers: [
          SliverPadding(
            padding: const EdgeInsets.all(18),
            sliver: SliverList(
              delegate: SliverChildListDelegate([
                _Header(onOpenWorkspace: () => context.go('/dashboard')),
                const SizedBox(height: 16),
                _Stats(tenants: _tenants),
                const SizedBox(height: 16),
                LayoutBuilder(
                  builder: (context, constraints) {
                    final wide = constraints.maxWidth >= 1050;
                    final createPanel = _CreateTenantPanel(
                      companyController: _companyController,
                      ownerController: _ownerController,
                      featureGroups: _featureGroups,
                      selectedFeatures: _selectedFeatures,
                      onToggleFeature: _toggleFeature,
                      onCreate: _createTenant,
                    );
                    final tenantsPanel = _TenantPanel(
                      tenants: _tenants,
                      onOpenWorkspace: () => context.go('/dashboard'),
                    );
                    if (!wide) {
                      return Column(
                        children: [
                          createPanel,
                          const SizedBox(height: 16),
                          tenantsPanel,
                        ],
                      );
                    }
                    return Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(flex: 5, child: createPanel),
                        const SizedBox(width: 16),
                        Expanded(flex: 4, child: tenantsPanel),
                      ],
                    );
                  },
                ),
                const SizedBox(height: 16),
                const _GovernancePanel(),
              ]),
            ),
          ),
        ],
      ),
    );
  }

  void _toggleFeature(String feature, bool selected) {
    setState(() {
      if (selected) {
        _selectedFeatures.add(feature);
      } else {
        _selectedFeatures.remove(feature);
      }
    });
  }

  void _createTenant() {
    final name = _companyController.text.trim();
    final owner = _ownerController.text.trim();
    if (name.isEmpty || owner.isEmpty || !owner.contains('@')) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
            content: Text('Enter a company name and valid owner email.')),
      );
      return;
    }

    setState(() {
      _tenants.insert(
        0,
        _Tenant(
          name: name,
          owner: owner,
          plan: 'Custom Enterprise',
          users: 1,
          status: 'Provisioning',
          features: _selectedFeatures.toList()..sort(),
        ),
      );
    });
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
          content:
              Text('$name created with ${_selectedFeatures.length} features.')),
    );
  }
}

class _Header extends StatelessWidget {
  const _Header({required this.onOpenWorkspace});

  final VoidCallback onOpenWorkspace;

  @override
  Widget build(BuildContext context) {
    return _Panel(
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Wrap(
          spacing: 16,
          runSpacing: 16,
          crossAxisAlignment: WrapCrossAlignment.center,
          alignment: WrapAlignment.spaceBetween,
          children: [
            SizedBox(
              width: 680,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Create companies, license modules, and control access before users enter ERP.',
                    style: Theme.of(context)
                        .textTheme
                        .headlineSmall
                        ?.copyWith(fontWeight: FontWeight.w700),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'This is the platform owner area: tenant provisioning, feature flags, roles, security policy, backups, integrations, and audit readiness.',
                    style: TextStyle(color: Color(0xFF5B6472)),
                  ),
                ],
              ),
            ),
            FilledButton.icon(
              onPressed: onOpenWorkspace,
              icon: const Icon(Icons.open_in_new_outlined),
              label: const Text('Open ERP workspace'),
            ),
          ],
        ),
      ),
    );
  }
}

class _Stats extends StatelessWidget {
  const _Stats({required this.tenants});

  final List<_Tenant> tenants;

  @override
  Widget build(BuildContext context) {
    final featureCount =
        tenants.fold<int>(0, (sum, tenant) => sum + tenant.features.length);
    return Wrap(
      spacing: 12,
      runSpacing: 12,
      children: [
        _StatCard(
            'Companies', '${tenants.length}', 'Tenant databases and licenses'),
        _StatCard('Licensed features', '$featureCount', 'Across all companies'),
        const _StatCard('Security baseline', 'Enabled', 'RBAC, audit, backups'),
        const _StatCard('Provisioning mode', 'Manual', 'Ready for API wiring'),
      ],
    );
  }
}

class _CreateTenantPanel extends StatelessWidget {
  const _CreateTenantPanel({
    required this.companyController,
    required this.ownerController,
    required this.featureGroups,
    required this.selectedFeatures,
    required this.onToggleFeature,
    required this.onCreate,
  });

  final TextEditingController companyController;
  final TextEditingController ownerController;
  final List<_FeatureGroup> featureGroups;
  final Set<String> selectedFeatures;
  final void Function(String feature, bool selected) onToggleFeature;
  final VoidCallback onCreate;

  @override
  Widget build(BuildContext context) {
    return _Panel(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Create Company / Entity',
              style: Theme.of(context)
                  .textTheme
                  .titleLarge
                  ?.copyWith(fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 12),
            Wrap(
              spacing: 12,
              runSpacing: 12,
              children: [
                SizedBox(
                  width: 300,
                  child: TextField(
                    controller: companyController,
                    decoration: const InputDecoration(
                      labelText: 'Company / entity name',
                      border: OutlineInputBorder(),
                    ),
                  ),
                ),
                SizedBox(
                  width: 300,
                  child: TextField(
                    controller: ownerController,
                    decoration: const InputDecoration(
                      labelText: 'Owner email',
                      border: OutlineInputBorder(),
                    ),
                  ),
                ),
                const SizedBox(
                  width: 220,
                  child: DropdownMenu<String>(
                    initialSelection: 'Industrial Enterprise',
                    label: Text('Plan'),
                    dropdownMenuEntries: [
                      DropdownMenuEntry(value: 'Starter', label: 'Starter'),
                      DropdownMenuEntry(
                          value: 'Industrial Enterprise',
                          label: 'Industrial Enterprise'),
                      DropdownMenuEntry(
                          value: 'Custom Enterprise',
                          label: 'Custom Enterprise'),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Text(
              'Feature Access',
              style: Theme.of(context)
                  .textTheme
                  .titleMedium
                  ?.copyWith(fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 8),
            for (final group in featureGroups) ...[
              Text(group.name,
                  style: const TextStyle(fontWeight: FontWeight.w700)),
              const SizedBox(height: 6),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  for (final feature in group.features)
                    FilterChip(
                      label: Text(feature),
                      selected: selectedFeatures.contains(feature),
                      onSelected: (selected) =>
                          onToggleFeature(feature, selected),
                    ),
                ],
              ),
              const SizedBox(height: 12),
            ],
            Align(
              alignment: Alignment.centerRight,
              child: FilledButton.icon(
                onPressed: onCreate,
                icon: const Icon(Icons.domain_add_outlined),
                label: const Text('Create company'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _TenantPanel extends StatelessWidget {
  const _TenantPanel({required this.tenants, required this.onOpenWorkspace});

  final List<_Tenant> tenants;
  final VoidCallback onOpenWorkspace;

  @override
  Widget build(BuildContext context) {
    return _Panel(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Companies',
              style: Theme.of(context)
                  .textTheme
                  .titleLarge
                  ?.copyWith(fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 8),
            for (final tenant in tenants)
              Card(
                elevation: 0,
                child: ExpansionTile(
                  leading: const Icon(Icons.apartment_outlined),
                  title: Text(tenant.name),
                  subtitle: Text(
                      '${tenant.plan} · ${tenant.status} · ${tenant.users} users'),
                  childrenPadding: const EdgeInsets.fromLTRB(16, 0, 16, 14),
                  children: [
                    Align(
                      alignment: Alignment.centerLeft,
                      child: Text('Owner: ${tenant.owner}'),
                    ),
                    const SizedBox(height: 8),
                    Align(
                      alignment: Alignment.centerLeft,
                      child: Wrap(
                        spacing: 6,
                        runSpacing: 6,
                        children: [
                          for (final feature in tenant.features)
                            Chip(label: Text(feature)),
                        ],
                      ),
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        OutlinedButton.icon(
                          onPressed: onOpenWorkspace,
                          icon: const Icon(Icons.login_outlined),
                          label: const Text('Access workspace'),
                        ),
                        const SizedBox(width: 8),
                        OutlinedButton.icon(
                          onPressed: () {},
                          icon: const Icon(Icons.security_outlined),
                          label: const Text('Roles'),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _GovernancePanel extends StatelessWidget {
  const _GovernancePanel();

  @override
  Widget build(BuildContext context) {
    return _Panel(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Provisioning Workflow',
              style: Theme.of(context)
                  .textTheme
                  .titleLarge
                  ?.copyWith(fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 10),
            const Wrap(
              spacing: 10,
              runSpacing: 10,
              children: [
                _StepTile('1', 'Create company', 'Tenant record, owner, plan'),
                _StepTile('2', 'Select features', 'License modules and limits'),
                _StepTile('3', 'Seed roles', 'Owner, admin, manager, operator'),
                _StepTile('4', 'Provision data', 'Database, storage, backups'),
                _StepTile(
                    '5', 'Invite users', 'Access controlled by feature flags'),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  const _StatCard(this.label, this.value, this.detail);

  final String label;
  final String value;
  final String detail;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 250,
      child: _Panel(
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label, style: Theme.of(context).textTheme.labelLarge),
              const SizedBox(height: 6),
              Text(
                value,
                style: Theme.of(context)
                    .textTheme
                    .titleLarge
                    ?.copyWith(fontWeight: FontWeight.w800),
              ),
              Text(detail, style: const TextStyle(color: Color(0xFF667085))),
            ],
          ),
        ),
      ),
    );
  }
}

class _StepTile extends StatelessWidget {
  const _StepTile(this.number, this.title, this.detail);

  final String number;
  final String title;
  final String detail;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 220,
      child: ListTile(
        leading: CircleAvatar(child: Text(number)),
        title: Text(title),
        subtitle: Text(detail),
      ),
    );
  }
}

class _Panel extends StatelessWidget {
  const _Panel({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 0,
      margin: EdgeInsets.zero,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(8),
        side: const BorderSide(color: Color(0xFFE3E7EF)),
      ),
      child: child,
    );
  }
}

class _Tenant {
  const _Tenant({
    required this.name,
    required this.owner,
    required this.plan,
    required this.users,
    required this.status,
    required this.features,
  });

  final String name;
  final String owner;
  final String plan;
  final int users;
  final String status;
  final List<String> features;
}

class _FeatureGroup {
  const _FeatureGroup(this.name, this.features);

  final String name;
  final List<String> features;
}
