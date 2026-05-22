import 'package:flutter/material.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  int _selectedModule = 0;
  int _selectedSection = 0;
  String _query = '';
  String _industryPack = 'Discrete Manufacturing';
  bool _offlineMode = false;
  bool _showOnlyLicensed = true;

  static const _sections = [
    'Overview',
    'Master Data',
    'Transactions',
    'Workflows',
    'Analytics',
    'Setup',
  ];

  static const _industryPacks = [
    'Discrete Manufacturing',
    'Process Manufacturing',
    'Distribution',
    'Retail',
    'Services',
    'Projects',
    'Healthcare',
    'Construction',
  ];

  final List<_ModuleDefinition> _modules = _enterpriseModules;

  @override
  Widget build(BuildContext context) {
    final selected = _modules[_selectedModule];
    final width = MediaQuery.sizeOf(context).width;
    final wide = width >= 1040;
    final roomyHeader = width >= 860;

    return Scaffold(
      backgroundColor: const Color(0xFFF5F7FA),
      appBar: AppBar(
        backgroundColor: const Color(0xFF172033),
        foregroundColor: Colors.white,
        titleSpacing: 16,
        title: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.account_balance_outlined),
            const SizedBox(width: 10),
            Flexible(
              child: Text(
                roomyHeader ? 'Enterprise ERP Suite' : 'ERP Suite',
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        ),
        actions: [
          if (roomyHeader) ...[
            _HeaderStatus(
              icon: Icons.apartment_outlined,
              label: 'Tenant: AlloyWorks Group',
            ),
            _HeaderStatus(
              icon: _offlineMode
                  ? Icons.cloud_off_outlined
                  : Icons.cloud_done_outlined,
              label: _offlineMode ? 'Offline queue: 12' : 'Live sync',
            ),
            const SizedBox(width: 12),
          ],
        ],
      ),
      drawer: wide
          ? null
          : Drawer(
              child: SafeArea(
                child: _ModuleMenu(
                  modules: _visibleModules,
                  selectedIndex: _selectedModule,
                  onSelected: _selectModule,
                ),
              ),
            ),
      body: Row(
        children: [
          if (wide)
            SizedBox(
              width: 286,
              child: _ModuleMenu(
                modules: _visibleModules,
                selectedIndex: _selectedModule,
                onSelected: _selectModule,
              ),
            ),
          Expanded(
            child: Column(
              children: [
                _WorkspaceToolbar(
                  selected: selected,
                  query: _query,
                  industryPack: _industryPack,
                  offlineMode: _offlineMode,
                  showOnlyLicensed: _showOnlyLicensed,
                  industryPacks: _industryPacks,
                  onQueryChanged: (value) => setState(() => _query = value),
                  onIndustryChanged: (value) =>
                      setState(() => _industryPack = value),
                  onOfflineChanged: (value) =>
                      setState(() => _offlineMode = value),
                  onLicensedChanged: (value) =>
                      setState(() => _showOnlyLicensed = value),
                ),
                Expanded(
                  child: CustomScrollView(
                    slivers: [
                      SliverPadding(
                        padding: const EdgeInsets.fromLTRB(18, 18, 18, 28),
                        sliver: SliverList(
                          delegate: SliverChildListDelegate([
                            _ModuleHeader(
                              module: selected,
                              industryPack: _industryPack,
                              query: _query,
                              onPrimaryAction: () => _showObjectSheet(
                                selected,
                                'Create ${selected.primaryObject}',
                              ),
                            ),
                            const SizedBox(height: 14),
                            _SectionTabs(
                              sections: _sections,
                              selectedIndex: _selectedSection,
                              onSelected: (index) =>
                                  setState(() => _selectedSection = index),
                            ),
                            const SizedBox(height: 14),
                            if (selected.id == 'command')
                              _CommandCenter(
                                modules: _visibleModules,
                                industryPack: _industryPack,
                                onOpenModule: _selectModuleById,
                              )
                            else
                              _ModuleWorkspace(
                                module: selected,
                                section: _sections[_selectedSection],
                                onOpenForm: (title) =>
                                    _showObjectSheet(selected, title),
                              ),
                          ]),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  List<_ModuleDefinition> get _visibleModules => _showOnlyLicensed
      ? _modules.where((module) => module.licensed).toList()
      : _modules;

  void _selectModule(int index) {
    final module = _visibleModules[index];
    final actualIndex = _modules.indexWhere((item) => item.id == module.id);
    setState(() {
      _selectedModule = actualIndex;
      _selectedSection = 0;
    });
    Navigator.maybePop(context);
  }

  void _selectModuleById(String id) {
    final actualIndex = _modules.indexWhere((module) => module.id == id);
    if (actualIndex < 0) return;
    setState(() {
      _selectedModule = actualIndex;
      _selectedSection = 0;
    });
  }

  void _showObjectSheet(_ModuleDefinition module, String title) {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (context) {
        final fields = module.formFields;
        return Padding(
          padding: EdgeInsets.fromLTRB(
            20,
            8,
            20,
            MediaQuery.viewInsetsOf(context).bottom + 20,
          ),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 760),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(title, style: Theme.of(context).textTheme.titleLarge),
                const SizedBox(height: 8),
                Text(
                  '${module.name} object page with draft, validation, approval, audit, attachment, and offline queue support.',
                  style: const TextStyle(color: Color(0xFF64748B)),
                ),
                const SizedBox(height: 16),
                for (final field in fields) ...[
                  TextField(
                    decoration: InputDecoration(
                      labelText: field.label,
                      helperText: field.help,
                      border: const OutlineInputBorder(),
                    ),
                  ),
                  const SizedBox(height: 12),
                ],
                Wrap(
                  alignment: WrapAlignment.end,
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    TextButton(
                      onPressed: () => Navigator.pop(context),
                      child: const Text('Cancel'),
                    ),
                    OutlinedButton.icon(
                      onPressed: () => Navigator.pop(context),
                      icon: const Icon(Icons.offline_pin_outlined),
                      label: const Text('Save offline draft'),
                    ),
                    FilledButton.icon(
                      onPressed: () => Navigator.pop(context),
                      icon: const Icon(Icons.route_outlined),
                      label: const Text('Submit workflow'),
                    ),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}

class _WorkspaceToolbar extends StatelessWidget {
  const _WorkspaceToolbar({
    required this.selected,
    required this.query,
    required this.industryPack,
    required this.offlineMode,
    required this.showOnlyLicensed,
    required this.industryPacks,
    required this.onQueryChanged,
    required this.onIndustryChanged,
    required this.onOfflineChanged,
    required this.onLicensedChanged,
  });

  final _ModuleDefinition selected;
  final String query;
  final String industryPack;
  final bool offlineMode;
  final bool showOnlyLicensed;
  final List<String> industryPacks;
  final ValueChanged<String> onQueryChanged;
  final ValueChanged<String> onIndustryChanged;
  final ValueChanged<bool> onOfflineChanged;
  final ValueChanged<bool> onLicensedChanged;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white,
      elevation: 1,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
        child: Wrap(
          spacing: 10,
          runSpacing: 10,
          crossAxisAlignment: WrapCrossAlignment.center,
          children: [
            SizedBox(
              width: 390,
              child: SearchBar(
                leading: const Icon(Icons.search),
                hintText:
                    'Command search: object, customer, SKU, employee, report',
                onChanged: onQueryChanged,
              ),
            ),
            DropdownMenu<String>(
              width: 260,
              initialSelection: industryPack,
              leadingIcon: const Icon(Icons.business_center_outlined),
              label: const Text('Industry pack'),
              dropdownMenuEntries: [
                for (final pack in industryPacks)
                  DropdownMenuEntry(value: pack, label: pack),
              ],
              onSelected: (value) {
                if (value != null) onIndustryChanged(value);
              },
            ),
            _ToolbarChip(icon: selected.icon, label: selected.name),
            FilterChip(
              avatar: Icon(
                offlineMode
                    ? Icons.cloud_off_outlined
                    : Icons.cloud_queue_outlined,
                size: 18,
              ),
              label: const Text('Offline-first'),
              selected: offlineMode,
              onSelected: onOfflineChanged,
            ),
            FilterChip(
              avatar: const Icon(Icons.verified_outlined, size: 18),
              label: const Text('Licensed modules'),
              selected: showOnlyLicensed,
              onSelected: onLicensedChanged,
            ),
            if (query.trim().isNotEmpty)
              _ToolbarChip(icon: Icons.filter_alt_outlined, label: query),
          ],
        ),
      ),
    );
  }
}

class _ModuleMenu extends StatelessWidget {
  const _ModuleMenu({
    required this.modules,
    required this.selectedIndex,
    required this.onSelected,
  });

  final List<_ModuleDefinition> modules;
  final int selectedIndex;
  final ValueChanged<int> onSelected;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: const Color(0xFF243044),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 18, 16, 12),
            child: FilledButton.icon(
              onPressed: () => onSelected(0),
              icon: const Icon(Icons.add_task_outlined),
              label: const Text('Create object'),
            ),
          ),
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.fromLTRB(8, 0, 8, 12),
              itemCount: modules.length,
              itemBuilder: (context, index) {
                final module = modules[index];
                final selected = index == selectedIndex ||
                    modules[index].id == _enterpriseModules[selectedIndex].id;
                return Padding(
                  padding: const EdgeInsets.only(bottom: 2),
                  child: ListTile(
                    key: ValueKey('module-${module.id}'),
                    selected: selected,
                    selectedTileColor: Colors.white.withValues(alpha: 0.12),
                    leading: Icon(module.icon, color: Colors.white),
                    title: Text(
                      module.name,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(color: Colors.white),
                    ),
                    subtitle: Text(
                      module.category,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(color: Color(0xFFB6C2D4)),
                    ),
                    trailing: module.licensed
                        ? const Icon(Icons.check_circle_outline,
                            color: Color(0xFF5EEAD4), size: 18)
                        : const Icon(Icons.lock_outline,
                            color: Color(0xFFFBBF24), size: 18),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                    onTap: () => onSelected(index),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

class _ModuleHeader extends StatelessWidget {
  const _ModuleHeader({
    required this.module,
    required this.industryPack,
    required this.query,
    required this.onPrimaryAction,
  });

  final _ModuleDefinition module;
  final String industryPack;
  final String query;
  final VoidCallback onPrimaryAction;

  @override
  Widget build(BuildContext context) {
    return _Surface(
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Wrap(
              spacing: 10,
              runSpacing: 10,
              crossAxisAlignment: WrapCrossAlignment.center,
              children: [
                Icon(module.icon, color: const Color(0xFF1D4ED8), size: 30),
                Text(
                  module.name,
                  style: Theme.of(context)
                      .textTheme
                      .headlineSmall
                      ?.copyWith(fontWeight: FontWeight.w700),
                ),
                _Badge(label: module.category),
                _Badge(label: industryPack),
                if (!module.licensed) const _Badge(label: 'License gated'),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              module.description,
              style: const TextStyle(color: Color(0xFF475569), height: 1.35),
            ),
            if (query.trim().isNotEmpty) ...[
              const SizedBox(height: 8),
              Text(
                'Filtering workspace by "$query"',
                style: const TextStyle(color: Color(0xFF1D4ED8)),
              ),
            ],
            const SizedBox(height: 14),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                FilledButton.icon(
                  onPressed: onPrimaryAction,
                  icon: const Icon(Icons.add_circle_outline),
                  label: Text('Create ${module.primaryObject}'),
                ),
                OutlinedButton.icon(
                  onPressed: onPrimaryAction,
                  icon: const Icon(Icons.upload_file_outlined),
                  label: const Text('Import / migration'),
                ),
                OutlinedButton.icon(
                  onPressed: onPrimaryAction,
                  icon: const Icon(Icons.history_outlined),
                  label: const Text('Audit trail'),
                ),
                OutlinedButton.icon(
                  onPressed: onPrimaryAction,
                  icon: const Icon(Icons.file_download_outlined),
                  label: const Text('Export'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _SectionTabs extends StatelessWidget {
  const _SectionTabs({
    required this.sections,
    required this.selectedIndex,
    required this.onSelected,
  });

  final List<String> sections;
  final int selectedIndex;
  final ValueChanged<int> onSelected;

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: SegmentedButton<int>(
        segments: [
          for (var index = 0; index < sections.length; index++)
            ButtonSegment(value: index, label: Text(sections[index])),
        ],
        selected: {selectedIndex},
        onSelectionChanged: (value) => onSelected(value.first),
      ),
    );
  }
}

class _CommandCenter extends StatelessWidget {
  const _CommandCenter({
    required this.modules,
    required this.industryPack,
    required this.onOpenModule,
  });

  final List<_ModuleDefinition> modules;
  final String industryPack;
  final ValueChanged<String> onOpenModule;

  @override
  Widget build(BuildContext context) {
    final operationalModules =
        modules.where((module) => module.id != 'command').toList();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _KpiWrap(
          metrics: const [
            _Metric('Order-to-cash', '₹18.6 Cr', '64 open orders'),
            _Metric('Procure-to-pay', '₹5.8 Cr', '88 PO lines'),
            _Metric('Inventory value', '₹13.8 Cr', '4 warehouses'),
            _Metric('Workforce today', '91.4%', '1,284 employees'),
            _Metric('Workflow SLA', '26 due', '7 overdue'),
            _Metric('Offline queue', '12 ops', 'Ready to sync'),
          ],
        ),
        const SizedBox(height: 14),
        _ResponsiveWrap(
          children: [
            _Surface(
              child: _PanelBlock(
                title: 'Enterprise Process Map',
                subtitle:
                    'Configurable ${industryPack.toLowerCase()} process flows with object pages and approvals.',
                child: Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: const [
                    _ProcessChip('Lead to cash'),
                    _ProcessChip('Procure to pay'),
                    _ProcessChip('Plan to produce'),
                    _ProcessChip('Hire to retire'),
                    _ProcessChip('Record to report'),
                    _ProcessChip('Issue to resolution'),
                    _ProcessChip('Asset to maintenance'),
                    _ProcessChip('Backup to restore'),
                  ],
                ),
              ),
            ),
            _Surface(
              child: _PanelBlock(
                title: 'Executive Work Queue',
                subtitle:
                    'Cross-module exceptions requiring attention, approval, or escalation.',
                child: const _RecordsTable(
                  columns: ['Object', 'Area', 'Status', 'Owner'],
                  rows: [
                    ['SO-8821', 'Sales credit', 'Blocked', 'Finance'],
                    ['PO-1042', 'Procurement', 'Variance', 'Plant Head'],
                    ['MO-7131', 'Production', 'QC hold', 'Quality'],
                    ['PAY-2026-W20', 'Payroll', 'Ready', 'HR'],
                    ['BK-0300', 'Backup', 'Verified', 'Platform'],
                  ],
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 14),
        Text(
          'Licensed Suite Modules',
          style: Theme.of(context)
              .textTheme
              .titleMedium
              ?.copyWith(fontWeight: FontWeight.w700),
        ),
        const SizedBox(height: 10),
        _ModuleCatalog(
          modules: operationalModules,
          onOpenModule: onOpenModule,
        ),
      ],
    );
  }
}

class _ModuleWorkspace extends StatelessWidget {
  const _ModuleWorkspace({
    required this.module,
    required this.section,
    required this.onOpenForm,
  });

  final _ModuleDefinition module;
  final String section;
  final ValueChanged<String> onOpenForm;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _KpiWrap(metrics: module.metrics),
        const SizedBox(height: 14),
        if (section == 'Overview') _OverviewSection(module: module),
        if (section == 'Master Data')
          _ListSection(
            title: '${module.name} Master Data',
            subtitle:
                'Governed master records with ownership, versions, and audit.',
            items: module.masterData,
            icon: Icons.dataset_outlined,
            onCreate: () => onOpenForm('Create master record'),
          ),
        if (section == 'Transactions')
          _TransactionsSection(module: module, onOpenForm: onOpenForm),
        if (section == 'Workflows')
          _ListSection(
            title: '${module.name} Workflows',
            subtitle:
                'Rules, approvals, notifications, scheduled actions, and escalations.',
            items: module.workflows,
            icon: Icons.account_tree_outlined,
            onCreate: () => onOpenForm('Create workflow rule'),
          ),
        if (section == 'Analytics')
          _AnalyticsSection(module: module, onOpenForm: onOpenForm),
        if (section == 'Setup')
          _ListSection(
            title: '${module.name} Setup',
            subtitle:
                'Numbering, roles, feature flags, integrations, retention, and exports.',
            items: module.setup,
            icon: Icons.tune_outlined,
            onCreate: () => onOpenForm('Configure module'),
          ),
      ],
    );
  }
}

class _OverviewSection extends StatelessWidget {
  const _OverviewSection({required this.module});

  final _ModuleDefinition module;

  @override
  Widget build(BuildContext context) {
    return _ResponsiveWrap(
      children: [
        _Surface(
          child: _PanelBlock(
            title: 'Capabilities',
            subtitle: 'Detailed functional coverage for this module.',
            child: _FeatureList(items: module.capabilities),
          ),
        ),
        _Surface(
          child: _PanelBlock(
            title: 'Open Object List',
            subtitle:
                'Standard ERP-style worklist with status, owner, value, and next step.',
            child: _RecordsTable(
              columns: const ['Object', 'Party', 'Status', 'Next Step'],
              rows: module.records,
            ),
          ),
        ),
      ],
    );
  }
}

class _TransactionsSection extends StatelessWidget {
  const _TransactionsSection({
    required this.module,
    required this.onOpenForm,
  });

  final _ModuleDefinition module;
  final ValueChanged<String> onOpenForm;

  @override
  Widget build(BuildContext context) {
    return _ResponsiveWrap(
      children: [
        _Surface(
          child: _PanelBlock(
            title: 'Transaction Workbench',
            subtitle:
                'Draft, validate, approve, post, reverse, return, export.',
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    for (final action in module.transactionActions)
                      FilledButton.tonalIcon(
                        onPressed: () => onOpenForm(action),
                        icon: const Icon(Icons.playlist_add_outlined),
                        label: Text(action),
                      ),
                  ],
                ),
                const SizedBox(height: 14),
                _RecordsTable(
                  columns: const ['Object', 'Party', 'Status', 'Next Step'],
                  rows: module.records,
                ),
              ],
            ),
          ),
        ),
        _Surface(
          child: _PanelBlock(
            title: 'Document Lifecycle',
            subtitle: 'Every business object follows traceable ERP states.',
            child: Wrap(
              spacing: 8,
              runSpacing: 8,
              children: const [
                _ProcessChip('Draft'),
                _ProcessChip('Validated'),
                _ProcessChip('Approval pending'),
                _ProcessChip('Posted'),
                _ProcessChip('Amended'),
                _ProcessChip('Reversed'),
                _ProcessChip('Closed'),
                _ProcessChip('Archived'),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class _AnalyticsSection extends StatelessWidget {
  const _AnalyticsSection({
    required this.module,
    required this.onOpenForm,
  });

  final _ModuleDefinition module;
  final ValueChanged<String> onOpenForm;

  @override
  Widget build(BuildContext context) {
    return _ResponsiveWrap(
      children: [
        _Surface(
          child: _PanelBlock(
            title: 'Operational Analytics',
            subtitle: 'Role-based KPIs, exception analysis, and drill-through.',
            child: Column(
              children: [
                for (final metric in module.metrics)
                  _ProgressLine(
                    label: metric.label,
                    value: metric.sampleProgress,
                    detail: '${metric.value} · ${metric.detail}',
                  ),
              ],
            ),
          ),
        ),
        _Surface(
          child: _PanelBlock(
            title: 'Reports & Exports',
            subtitle:
                'PDF, Excel, CSV, scheduled MIS, and audit-ready extracts.',
            child: Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                for (final report in module.reports)
                  OutlinedButton.icon(
                    onPressed: () => onOpenForm(report),
                    icon: const Icon(Icons.file_download_outlined),
                    label: Text(report),
                  ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class _ListSection extends StatelessWidget {
  const _ListSection({
    required this.title,
    required this.subtitle,
    required this.items,
    required this.icon,
    required this.onCreate,
  });

  final String title;
  final String subtitle;
  final List<String> items;
  final IconData icon;
  final VoidCallback onCreate;

  @override
  Widget build(BuildContext context) {
    return _Surface(
      child: _PanelBlock(
        title: title,
        subtitle: subtitle,
        trailing: FilledButton.icon(
          onPressed: onCreate,
          icon: const Icon(Icons.add_outlined),
          label: const Text('Add'),
        ),
        child: Wrap(
          spacing: 10,
          runSpacing: 10,
          children: [
            for (final item in items)
              _FeatureTile(icon: icon, title: item, subtitle: 'Configured'),
          ],
        ),
      ),
    );
  }
}

class _ModuleCatalog extends StatelessWidget {
  const _ModuleCatalog({required this.modules, required this.onOpenModule});

  final List<_ModuleDefinition> modules;
  final ValueChanged<String> onOpenModule;

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: 12,
      runSpacing: 12,
      children: [
        for (final module in modules)
          SizedBox(
            width: 310,
            child: _Surface(
              child: InkWell(
                borderRadius: BorderRadius.circular(8),
                onTap: () => onOpenModule(module.id),
                child: Padding(
                  padding: const EdgeInsets.all(14),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Icon(module.icon, color: const Color(0xFF1D4ED8)),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              module.name,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: Theme.of(context)
                                  .textTheme
                                  .titleMedium
                                  ?.copyWith(fontWeight: FontWeight.w700),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Text(
                        module.description,
                        maxLines: 3,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(color: Color(0xFF64748B)),
                      ),
                      const SizedBox(height: 10),
                      Wrap(
                        spacing: 6,
                        runSpacing: 6,
                        children: module.capabilities
                            .take(3)
                            .map((item) => _Badge(label: item))
                            .toList(),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
      ],
    );
  }
}

class _KpiWrap extends StatelessWidget {
  const _KpiWrap({required this.metrics});

  final List<_Metric> metrics;

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: 12,
      runSpacing: 12,
      children: [
        for (final metric in metrics)
          SizedBox(
            width: 246,
            child: _Surface(
              child: Padding(
                padding: const EdgeInsets.all(14),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      metric.label,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: Theme.of(context).textTheme.labelLarge,
                    ),
                    const SizedBox(height: 6),
                    Text(
                      metric.value,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: Theme.of(context)
                          .textTheme
                          .titleLarge
                          ?.copyWith(fontWeight: FontWeight.w800),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      metric.detail,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(color: Color(0xFF64748B)),
                    ),
                  ],
                ),
              ),
            ),
          ),
      ],
    );
  }
}

class _ResponsiveWrap extends StatelessWidget {
  const _ResponsiveWrap({required this.children});

  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final width = constraints.maxWidth > 980
            ? (constraints.maxWidth - 14) / 2
            : constraints.maxWidth;
        return Wrap(
          spacing: 14,
          runSpacing: 14,
          children: [
            for (final child in children) SizedBox(width: width, child: child),
          ],
        );
      },
    );
  }
}

class _PanelBlock extends StatelessWidget {
  const _PanelBlock({
    required this.title,
    required this.subtitle,
    required this.child,
    this.trailing,
  });

  final String title;
  final String subtitle;
  final Widget child;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: Theme.of(context)
                          .textTheme
                          .titleMedium
                          ?.copyWith(fontWeight: FontWeight.w700),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      subtitle,
                      style: const TextStyle(color: Color(0xFF64748B)),
                    ),
                  ],
                ),
              ),
              if (trailing != null) ...[
                const SizedBox(width: 8),
                trailing!,
              ],
            ],
          ),
          const SizedBox(height: 14),
          child,
        ],
      ),
    );
  }
}

class _FeatureList extends StatelessWidget {
  const _FeatureList({required this.items});

  final List<String> items;

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: 10,
      runSpacing: 10,
      children: [
        for (final item in items)
          _FeatureTile(
            icon: Icons.check_circle_outline,
            title: item,
            subtitle: 'Enabled for roles, approvals, audit, and exports',
          ),
      ],
    );
  }
}

class _FeatureTile extends StatelessWidget {
  const _FeatureTile({
    required this.icon,
    required this.title,
    required this.subtitle,
  });

  final IconData icon;
  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 270,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 20, color: const Color(0xFF0F766E)),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 4),
                Text(
                  subtitle,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(color: Color(0xFF64748B)),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _RecordsTable extends StatelessWidget {
  const _RecordsTable({required this.columns, required this.rows});

  final List<String> columns;
  final List<List<String>> rows;

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: DataTable(
        headingRowHeight: 40,
        dataRowMinHeight: 42,
        dataRowMaxHeight: 52,
        columns: [
          for (final column in columns) DataColumn(label: Text(column)),
        ],
        rows: [
          for (final row in rows)
            DataRow(
              cells: [
                for (final cell in row)
                  DataCell(SizedBox(
                    width: 150,
                    child: Text(cell, overflow: TextOverflow.ellipsis),
                  )),
              ],
            ),
        ],
      ),
    );
  }
}

class _ProgressLine extends StatelessWidget {
  const _ProgressLine({
    required this.label,
    required this.value,
    required this.detail,
  });

  final String label;
  final double value;
  final String detail;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(child: Text(label)),
              Text('${(value * 100).round()}%'),
            ],
          ),
          const SizedBox(height: 6),
          LinearProgressIndicator(value: value),
          const SizedBox(height: 4),
          Text(detail, style: const TextStyle(color: Color(0xFF64748B))),
        ],
      ),
    );
  }
}

class _Surface extends StatelessWidget {
  const _Surface({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 0,
      margin: EdgeInsets.zero,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(8),
        side: const BorderSide(color: Color(0xFFE2E8F0)),
      ),
      child: child,
    );
  }
}

class _Badge extends StatelessWidget {
  const _Badge({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
      decoration: BoxDecoration(
        color: const Color(0xFFEFF6FF),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: const Color(0xFFBFDBFE)),
      ),
      child: Text(
        label,
        style: const TextStyle(
          color: Color(0xFF1D4ED8),
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}

class _ToolbarChip extends StatelessWidget {
  const _ToolbarChip({required this.icon, required this.label});

  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Chip(
      avatar: Icon(icon, size: 18),
      label: Text(label, overflow: TextOverflow.ellipsis),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
    );
  }
}

class _HeaderStatus extends StatelessWidget {
  const _HeaderStatus({required this.icon, required this.label});

  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: Chip(
        avatar: Icon(icon, size: 17, color: Colors.white),
        label: Text(label),
        labelStyle: const TextStyle(color: Colors.white),
        backgroundColor: Colors.white.withValues(alpha: 0.12),
        side: BorderSide(color: Colors.white.withValues(alpha: 0.16)),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
      ),
    );
  }
}

class _ProcessChip extends StatelessWidget {
  const _ProcessChip(this.label);

  final String label;

  @override
  Widget build(BuildContext context) {
    return ActionChip(
      avatar: const Icon(Icons.route_outlined, size: 18),
      label: Text(label),
      onPressed: () {},
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
    );
  }
}

class _ModuleDefinition {
  const _ModuleDefinition({
    required this.id,
    required this.name,
    required this.category,
    required this.description,
    required this.icon,
    required this.primaryObject,
    required this.capabilities,
    required this.masterData,
    required this.transactionActions,
    required this.workflows,
    required this.reports,
    required this.setup,
    required this.metrics,
    required this.records,
    required this.formFields,
    this.licensed = true,
  });

  final String id;
  final String name;
  final String category;
  final String description;
  final IconData icon;
  final String primaryObject;
  final List<String> capabilities;
  final List<String> masterData;
  final List<String> transactionActions;
  final List<String> workflows;
  final List<String> reports;
  final List<String> setup;
  final List<_Metric> metrics;
  final List<List<String>> records;
  final List<_FieldSpec> formFields;
  final bool licensed;
}

class _Metric {
  const _Metric(this.label, this.value, this.detail,
      {this.sampleProgress = 0.72});

  final String label;
  final String value;
  final String detail;
  final double sampleProgress;
}

class _FieldSpec {
  const _FieldSpec(this.label, this.help);

  final String label;
  final String help;
}

const _defaultFields = [
  _FieldSpec('Business object', 'Document number, code, or reference'),
  _FieldSpec(
      'Organization unit', 'Company, branch, plant, warehouse, or department'),
  _FieldSpec('Party / owner', 'Customer, supplier, employee, asset, or team'),
  _FieldSpec(
      'Value and controls', 'Amount, quantity, policy, SLA, and approval path'),
];

const _enterpriseModules = [
  _ModuleDefinition(
    id: 'command',
    name: 'Command Center',
    category: 'Enterprise cockpit',
    description:
        'Role-based command center for executives, process owners, plant teams, finance, HR, and platform administrators.',
    icon: Icons.space_dashboard_outlined,
    primaryObject: 'work item',
    capabilities: [
      'Enterprise work queue',
      'Cross-module exception handling',
      'Global search and command actions',
      'Tenant, role, license, and sync status',
      'Industry pack switching',
      'Executive KPI cockpit',
    ],
    masterData: ['Companies', 'Branches', 'Plants', 'Departments'],
    transactionActions: ['Create task', 'Approve item', 'Export KPI pack'],
    workflows: ['Escalation routing', 'Owner approval', 'SLA notifications'],
    reports: ['Executive summary', 'Operational risk pack', 'Audit snapshot'],
    setup: ['Role homepage', 'Default industry pack', 'Dashboard widgets'],
    metrics: [
      _Metric('Workflow SLA', '26 due', '7 overdue', sampleProgress: 0.58),
      _Metric('Live operations', '94%', 'Modules online', sampleProgress: 0.94),
      _Metric('Sync health', '12 queued', 'Offline-capable',
          sampleProgress: 0.76),
    ],
    records: [
      ['SO-8821', 'Rane Motion', 'Credit hold', 'Finance release'],
      ['PO-1042', 'Apex Bearings', 'Variance', 'Plant approval'],
      ['MO-7131', 'Valve assembly', 'QC hold', 'Deviation review'],
    ],
    formFields: _defaultFields,
  ),
  _ModuleDefinition(
    id: 'finance',
    name: 'Finance & Accounting',
    category: 'Record to report',
    description:
        'General ledger, receivables, payables, cash, tax, cost centers, budgeting, closing, and financial controls.',
    icon: Icons.account_balance_wallet_outlined,
    primaryObject: 'journal entry',
    capabilities: [
      'Chart of accounts and ledgers',
      'Accounts receivable and payable',
      'Cash, bank, and reconciliation',
      'Tax, TDS/GST/VAT mapping',
      'Cost centers and profit centers',
      'Budgets, accruals, period close',
      'Credit control and collections',
    ],
    masterData: [
      'Chart of accounts',
      'Tax codes',
      'Cost centers',
      'Payment terms',
      'Bank accounts',
    ],
    transactionActions: [
      'Post journal',
      'Receive payment',
      'Vendor payment',
      'Bank reconciliation',
      'Close period',
    ],
    workflows: [
      'Journal approval',
      'Payment authorization',
      'Credit limit release',
      'Period close checklist',
    ],
    reports: [
      'Trial balance',
      'Profit and loss',
      'Balance sheet',
      'Cash flow',
      'Tax register',
    ],
    setup: [
      'Fiscal calendars',
      'Document numbering',
      'Currency rates',
      'Approval limits',
      'Posting rules',
    ],
    metrics: [
      _Metric('Cash position', '₹4.2 Cr', 'Across 9 accounts',
          sampleProgress: 0.68),
      _Metric('Receivables', '₹7.6 Cr', '₹1.1 Cr overdue',
          sampleProgress: 0.62),
      _Metric('Payables', '₹3.8 Cr', '31 due this week', sampleProgress: 0.74),
    ],
    records: [
      ['JE-9021', 'Monthly accrual', 'Draft', 'Controller review'],
      ['AR-8821', 'Rane Motion', 'Overdue', 'Collections call'],
      ['AP-2290', 'FastTrans', '3-way match', 'Payment run'],
    ],
    formFields: _defaultFields,
  ),
  _ModuleDefinition(
    id: 'sales',
    name: 'Sales & Distribution',
    category: 'Lead to cash',
    description:
        'Quotations, orders, pricing, invoices, dispatch, returns, credit notes, delivery planning, and customer profitability.',
    icon: Icons.point_of_sale_outlined,
    primaryObject: 'sales order',
    capabilities: [
      'Quotations and sales orders',
      'Pricing, discounts, and taxes',
      'Invoices, delivery notes, returns',
      'Credit notes and debit notes',
      'Dispatch, transport, and proof of delivery',
      'Credit limits and exposure',
      'Customer profitability',
    ],
    masterData: [
      'Customers',
      'Price lists',
      'Discount schemes',
      'Shipping routes',
      'Tax classifications',
    ],
    transactionActions: [
      'Create quotation',
      'Book sales order',
      'Generate invoice',
      'Plan dispatch',
      'Record return',
      'Issue credit note',
    ],
    workflows: [
      'Margin approval',
      'Credit release',
      'Dispatch hold',
      'Return authorization',
    ],
    reports: [
      'Order book',
      'Sales margin',
      'Dispatch aging',
      'Credit exposure',
      'Customer profitability',
    ],
    setup: [
      'Sales territories',
      'Price protection',
      'Credit policy',
      'Invoice numbering',
      'Delivery tolerances',
    ],
    metrics: [
      _Metric('Order book', '₹18.6 Cr', '64 open orders', sampleProgress: 0.83),
      _Metric('Dispatch ready', '22', '₹2.3 Cr value', sampleProgress: 0.71),
      _Metric('Credit holds', '9', '₹76 L blocked', sampleProgress: 0.41),
    ],
    records: [
      [
        'QT-5119',
        'Mahindra Hydraulics',
        'Commercial review',
        'Margin approval'
      ],
      ['SO-8821', 'Rane Motion', 'Credit hold', 'Finance release'],
      ['DN-2207', 'Tata Components', 'Packed', 'Assign vehicle'],
    ],
    formFields: _defaultFields,
  ),
  _ModuleDefinition(
    id: 'procurement',
    name: 'Procurement & Sourcing',
    category: 'Procure to pay',
    description:
        'Purchase requests, RFQs, purchase orders, goods receipts, vendor invoices, supplier scorecards, and purchase returns.',
    icon: Icons.shopping_cart_checkout_outlined,
    primaryObject: 'purchase request',
    capabilities: [
      'Purchase requests and RFQs',
      'Purchase orders and blanket orders',
      'Goods receipt notes',
      'Vendor invoice and 3-way match',
      'Purchase returns and debit notes',
      'Supplier contracts and scorecards',
      'Landed cost allocation',
    ],
    masterData: [
      'Suppliers',
      'Purchase info records',
      'Vendor contracts',
      'Payment terms',
      'Procurement categories',
    ],
    transactionActions: [
      'Raise PR',
      'Send RFQ',
      'Create PO',
      'Post GRN',
      'Match invoice',
      'Process return',
    ],
    workflows: [
      'PR budget check',
      'PO value approval',
      'Vendor onboarding',
      'Invoice variance approval',
    ],
    reports: [
      'Open PO report',
      'Supplier OTIF',
      'Purchase price variance',
      'GRN aging',
      'Vendor liability',
    ],
    setup: [
      'Release strategies',
      'Vendor rating rules',
      'Tolerance limits',
      'Contract templates',
      'Approval matrices',
    ],
    metrics: [
      _Metric('Open POs', '₹5.8 Cr', '88 PO lines', sampleProgress: 0.78),
      _Metric('Pending GRN', '31', '6 delayed', sampleProgress: 0.57),
      _Metric('Vendor OTIF', '92.1%', '+3.4%', sampleProgress: 0.92),
    ],
    records: [
      ['PR-4102', 'JSW Steel', 'Approved', 'Create PO'],
      ['PO-1042', 'Apex Bearings', 'Variance', 'Plant approval'],
      ['GRN-771', 'ChemPro', 'QC pending', 'Attach COA'],
    ],
    formFields: _defaultFields,
  ),
  _ModuleDefinition(
    id: 'inventory',
    name: 'Inventory & Warehouse',
    category: 'Stock to fulfill',
    description:
        'Products, variants, lots, serials, warehouses, bins, reservations, movements, cycle counts, barcode operations, and valuation.',
    icon: Icons.inventory_2_outlined,
    primaryObject: 'stock movement',
    capabilities: [
      'Products, variants, SKUs',
      'Warehouses, bins, zones',
      'Lots, serial numbers, expiry',
      'Stock movements and transfers',
      'Reservations and allocations',
      'Cycle counts and adjustments',
      'Barcode and offline scanning',
      'Inventory valuation',
    ],
    masterData: [
      'Products',
      'Variants',
      'Warehouses',
      'Bins',
      'Units of measure',
      'Stock policies',
    ],
    transactionActions: [
      'Record movement',
      'Transfer stock',
      'Reserve stock',
      'Cycle count',
      'Damage adjustment',
      'Barcode scan',
    ],
    workflows: [
      'Adjustment approval',
      'Reorder automation',
      'Warehouse transfer approval',
      'Stock discrepancy escalation',
    ],
    reports: [
      'Stock ledger',
      'Aging inventory',
      'Valuation report',
      'Reservation report',
      'Cycle count accuracy',
    ],
    setup: [
      'Valuation methods',
      'Safety stock rules',
      'Barcode templates',
      'Warehouse roles',
      'Counting calendars',
    ],
    metrics: [
      _Metric('On-hand value', '₹13.8 Cr', '4 warehouses',
          sampleProgress: 0.84),
      _Metric('Reserved stock', '18,420', '146 orders', sampleProgress: 0.69),
      _Metric('Stock risk', '17 SKUs', '5 critical', sampleProgress: 0.36),
    ],
    records: [
      ['RM-STL-08', 'Stainless coil', 'Healthy', 'Monitor'],
      ['FG-PMP-220', 'Industrial pump', 'Reorder', 'Create PR'],
      ['CHEM-PT-09', 'Pretreatment', 'Critical', 'Expedite'],
    ],
    formFields: _defaultFields,
  ),
  _ModuleDefinition(
    id: 'manufacturing',
    name: 'Manufacturing',
    category: 'Plan to produce',
    description:
        'BOMs, routings, production orders, capacity, stages, consumption, finished goods, scrap, WIP, machines, and shop-floor execution.',
    icon: Icons.precision_manufacturing_outlined,
    primaryObject: 'production order',
    capabilities: [
      'BOMs and alternate BOMs',
      'Routings and work centers',
      'Production orders and stages',
      'Material issue and consumption',
      'Finished goods receipt',
      'Scrap and rework',
      'Capacity planning and WIP',
      'Machine and operator assignment',
    ],
    masterData: [
      'BOMs',
      'Routings',
      'Work centers',
      'Machines',
      'Tooling',
      'Production calendars',
    ],
    transactionActions: [
      'Release order',
      'Issue material',
      'Post operation',
      'Record scrap',
      'Receive finished goods',
      'Close order',
    ],
    workflows: [
      'BOM revision approval',
      'Production release',
      'Scrap deviation approval',
      'Capacity overload escalation',
    ],
    reports: [
      'OEE dashboard',
      'Production variance',
      'WIP aging',
      'Scrap analysis',
      'Machine utilization',
    ],
    setup: [
      'Costing methods',
      'Stage gates',
      'Machine calendars',
      'Consumption policies',
      'Shop-floor terminals',
    ],
    metrics: [
      _Metric('Active orders', '38', '7 behind plan', sampleProgress: 0.66),
      _Metric('OEE', '78.6%', 'Line A: 86%', sampleProgress: 0.79),
      _Metric('Scrap today', '2.1%', 'Target < 1.8%', sampleProgress: 0.48),
    ],
    records: [
      ['MO-7122', 'Pump casing', 'Running', 'Machining'],
      ['MO-7128', 'Valve seat', 'Waiting', 'Heat treat'],
      ['MO-7131', 'Motor bracket', 'QC hold', 'Deviation review'],
    ],
    formFields: _defaultFields,
  ),
  _ModuleDefinition(
    id: 'quality',
    name: 'Quality Management',
    category: 'Inspect to release',
    description:
        'Inspection plans, incoming QC, in-process QC, final inspection, nonconformance, CAPA, certificates, and traceability.',
    icon: Icons.science_outlined,
    primaryObject: 'inspection lot',
    capabilities: [
      'Inspection plans and sampling',
      'Incoming quality checks',
      'In-process and final QC',
      'Nonconformance management',
      'CAPA and RCA workflows',
      'Certificates of analysis',
      'Supplier quality rating',
    ],
    masterData: [
      'Inspection plans',
      'Sampling rules',
      'Defect catalogs',
      'Test equipment',
      'Quality certificates',
    ],
    transactionActions: [
      'Create inspection lot',
      'Record results',
      'Block stock',
      'Release lot',
      'Create CAPA',
    ],
    workflows: [
      'QC release approval',
      'Deviation approval',
      'CAPA escalation',
      'Supplier corrective action',
    ],
    reports: [
      'Defect Pareto',
      'Supplier PPM',
      'Inspection aging',
      'CAPA status',
      'Certificate register',
    ],
    setup: [
      'AQL levels',
      'Quality gates',
      'Lab roles',
      'Certificate templates',
      'Traceability policy',
    ],
    metrics: [
      _Metric('QC holds', '14 lots', '3 high risk', sampleProgress: 0.44),
      _Metric('CAPA open', '8', '2 overdue', sampleProgress: 0.52),
      _Metric('First pass yield', '96.2%', '+1.1%', sampleProgress: 0.96),
    ],
    records: [
      ['QC-771', 'ChemPro GRN', 'Testing', 'Record COA'],
      ['NCR-118', 'Pump casing', 'Open', 'RCA'],
      ['CAPA-42', 'Supplier defect', 'Owner review', 'Approve'],
    ],
    formFields: _defaultFields,
  ),
  _ModuleDefinition(
    id: 'maintenance',
    name: 'Maintenance & Assets',
    category: 'Asset to maintenance',
    description:
        'Equipment assets, preventive maintenance, breakdowns, spare parts, work orders, downtime, calibration, and asset lifecycle.',
    icon: Icons.construction_outlined,
    primaryObject: 'maintenance order',
    capabilities: [
      'Asset register',
      'Preventive maintenance plans',
      'Breakdown maintenance',
      'Spare part reservations',
      'Downtime recording',
      'Calibration schedules',
      'Asset depreciation hooks',
    ],
    masterData: [
      'Assets',
      'Equipment hierarchy',
      'PM plans',
      'Spare parts',
      'Failure codes',
    ],
    transactionActions: [
      'Create work order',
      'Plan PM',
      'Record breakdown',
      'Issue spares',
      'Close maintenance',
    ],
    workflows: [
      'Breakdown escalation',
      'Spare approval',
      'PM overdue alert',
      'Asset disposal approval',
    ],
    reports: [
      'MTBF / MTTR',
      'Downtime cost',
      'PM compliance',
      'Spare consumption',
      'Asset history',
    ],
    setup: [
      'Maintenance calendars',
      'Failure taxonomy',
      'Technician teams',
      'Criticality matrix',
      'Calibration rules',
    ],
    metrics: [
      _Metric('PM compliance', '93.4%', '18 due this week',
          sampleProgress: 0.93),
      _Metric('Breakdowns', '6', '2 critical', sampleProgress: 0.38),
      _Metric('Downtime', '14.2 h', '₹6.8 L impact', sampleProgress: 0.57),
    ],
    records: [
      ['WO-902', 'CNC-04', 'Running', 'Replace bearing'],
      ['PM-118', 'Compressor', 'Due', 'Technician assign'],
      ['CAL-41', 'Torque wrench', 'Overdue', 'Lab booking'],
    ],
    formFields: _defaultFields,
  ),
  _ModuleDefinition(
    id: 'projects',
    name: 'Projects & Services',
    category: 'Project to profit',
    description:
        'Projects, WBS, milestones, service orders, field work, billing plans, timesheets, expenses, and profitability.',
    icon: Icons.work_outline,
    primaryObject: 'project',
    capabilities: [
      'Project and WBS planning',
      'Milestones and deliverables',
      'Service orders and tickets',
      'Timesheets and expenses',
      'Billing plans and retainers',
      'Resource allocation',
      'Project profitability',
    ],
    masterData: [
      'Project templates',
      'Service catalogs',
      'Resource pools',
      'Billing rates',
      'Expense policies',
    ],
    transactionActions: [
      'Create project',
      'Book timesheet',
      'Create service order',
      'Record expense',
      'Generate milestone invoice',
    ],
    workflows: [
      'Timesheet approval',
      'Expense approval',
      'Milestone acceptance',
      'Service SLA escalation',
    ],
    reports: [
      'Project margin',
      'Resource utilization',
      'SLA compliance',
      'Expense aging',
      'Milestone billing',
    ],
    setup: [
      'WBS templates',
      'SLA calendars',
      'Billing rules',
      'Resource skills',
      'Expense groups',
    ],
    metrics: [
      _Metric('Active projects', '46', '8 at risk', sampleProgress: 0.74),
      _Metric('Billable utilization', '81%', '+6%', sampleProgress: 0.81),
      _Metric('SLA compliance', '95.2%', '12 escalations',
          sampleProgress: 0.95),
    ],
    records: [
      ['PRJ-881', 'Metro retrofit', 'At risk', 'Milestone review'],
      ['SRV-1220', 'Pump service', 'Assigned', 'Field visit'],
      ['EXP-44', 'Travel group', 'Review', 'Finance approval'],
    ],
    formFields: _defaultFields,
  ),
  _ModuleDefinition(
    id: 'crm',
    name: 'CRM & Customer Success',
    category: 'Market to order',
    description:
        'Leads, opportunities, accounts, contacts, followups, complaints, contracts, service notes, and customer health.',
    icon: Icons.groups_2_outlined,
    primaryObject: 'opportunity',
    capabilities: [
      'Leads and opportunities',
      'Accounts and contacts',
      'Followups and reminders',
      'Contracts and renewals',
      'Complaints and service notes',
      'Customer health scoring',
      'Campaign and territory views',
    ],
    masterData: [
      'Accounts',
      'Contacts',
      'Territories',
      'Campaigns',
      'Contract templates',
    ],
    transactionActions: [
      'Create lead',
      'Add followup',
      'Log complaint',
      'Create contract',
      'Convert to quotation',
    ],
    workflows: [
      'Lead assignment',
      'Complaint escalation',
      'Contract approval',
      'Renewal reminder',
    ],
    reports: [
      'Pipeline forecast',
      'Win/loss analysis',
      'Followup aging',
      'Customer health',
      'Complaint SLA',
    ],
    setup: [
      'Sales stages',
      'Lead scoring',
      'Territory rules',
      'SLA rules',
      'Notification templates',
    ],
    metrics: [
      _Metric('Pipeline', '₹11.2 Cr', '42 opportunities', sampleProgress: 0.73),
      _Metric('Followups', '28 due', '9 escalated', sampleProgress: 0.46),
      _Metric('Complaints', '14 open', '3 high severity', sampleProgress: 0.39),
    ],
    records: [
      ['OPP-102', 'Mahindra Hydraulics', 'Quote', 'Tech review'],
      ['CMP-771', 'Pinnacle Pumps', 'Open', 'RCA share'],
      ['CON-91', 'Tata Components', 'Renewal', 'Legal review'],
    ],
    formFields: _defaultFields,
  ),
  _ModuleDefinition(
    id: 'hr',
    name: 'HR, Payroll & Attendance',
    category: 'Hire to retire',
    description:
        'Employees, roles, shifts, attendance, leave, payroll, loans, advances, expenses, compliance, and workforce analytics.',
    icon: Icons.badge_outlined,
    primaryObject: 'employee action',
    capabilities: [
      'Employee master and documents',
      'Organization structure and roles',
      'Shift and attendance management',
      'Leave, overtime, and holidays',
      'Payroll batches and payslips',
      'Loans, advances, and expenses',
      'Compliance and statutory reports',
    ],
    masterData: [
      'Employees',
      'Departments',
      'Designations',
      'Shift calendars',
      'Salary structures',
      'Leave policies',
    ],
    transactionActions: [
      'Onboard employee',
      'Mark attendance',
      'Approve leave',
      'Run payroll',
      'Record expense',
      'Process advance',
    ],
    workflows: [
      'Leave approval',
      'Payroll approval',
      'Expense approval',
      'Document verification',
      'Exit clearance',
    ],
    reports: [
      'Attendance register',
      'Payroll summary',
      'Leave liability',
      'Overtime report',
      'Compliance pack',
    ],
    setup: [
      'Payroll components',
      'Attendance devices',
      'Shift rules',
      'Expense groups',
      'Compliance mappings',
    ],
    metrics: [
      _Metric('Headcount', '1,284', '42 contractors', sampleProgress: 0.88),
      _Metric('Attendance', '91.4%', '2 biometric gaps', sampleProgress: 0.91),
      _Metric('Payroll ready', '₹2.84 Cr', 'May-W3', sampleProgress: 0.82),
    ],
    records: [
      ['EMP-221', 'Advance recovery', 'Approval', 'Finance'],
      ['ATT-512', 'Missing punch', 'Open', 'Supervisor'],
      ['PAY-2026-W20', 'Weekly payroll', 'Ready', 'HR head'],
    ],
    formFields: _defaultFields,
  ),
  _ModuleDefinition(
    id: 'collaboration',
    name: 'Collaboration & Tasks',
    category: 'Communicate to execute',
    description:
        'Direct messages, groups, department chat, mentions, attachments, tasks, work notes, expense groups, and calendar.',
    icon: Icons.forum_outlined,
    primaryObject: 'task',
    capabilities: [
      'Direct and group messages',
      'Department channels',
      'Mentions and notifications',
      'Attachments and work notes',
      'Tasks and checklists',
      'Expense groups',
      'Shared calendar',
    ],
    masterData: [
      'Departments',
      'User groups',
      'Channels',
      'Task templates',
      'Notification preferences',
    ],
    transactionActions: [
      'Send message',
      'Create task',
      'Attach document',
      'Create expense group',
      'Schedule event',
    ],
    workflows: [
      'Mention notification',
      'Task escalation',
      'Attachment retention',
      'Expense group approval',
    ],
    reports: [
      'Task aging',
      'Channel activity',
      'Expense groups',
      'Calendar load',
      'Attachment audit',
    ],
    setup: [
      'Channel permissions',
      'Retention policies',
      'Notification rules',
      'Calendar integrations',
      'Attachment limits',
    ],
    metrics: [
      _Metric('Open tasks', '112', '31 overdue', sampleProgress: 0.55),
      _Metric('Mentions', '46', '12 unread', sampleProgress: 0.64),
      _Metric('Expense groups', '18', '₹22.4 L', sampleProgress: 0.58),
    ],
    records: [
      ['TASK-551', 'Attach COA', 'Open', 'QC'],
      ['CHAT-plant', 'QC hold', 'Active', 'Engineering'],
      ['EG-44', 'Travel claim', 'Review', 'Finance'],
    ],
    formFields: _defaultFields,
  ),
  _ModuleDefinition(
    id: 'automation',
    name: 'Workflow Automation',
    category: 'Automate to control',
    description:
        'Approval designer, multi-step execution, rule triggers, scheduled actions, email, notifications, and process automation.',
    icon: Icons.account_tree_outlined,
    primaryObject: 'workflow rule',
    capabilities: [
      'Approval workflow designer',
      'Multi-step approvals',
      'Rule-based triggers',
      'Scheduled actions',
      'Email and notification automation',
      'Escalations and SLA timers',
      'Audit-backed workflow execution',
    ],
    masterData: [
      'Workflow templates',
      'Approval matrices',
      'Notification templates',
      'SLA calendars',
      'Rule conditions',
    ],
    transactionActions: [
      'Create rule',
      'Test condition',
      'Simulate workflow',
      'Pause automation',
      'View execution log',
    ],
    workflows: [
      'Owner approval',
      'Superadmin approval',
      'Budget threshold',
      'Credit hold',
      'Stock reorder',
    ],
    reports: [
      'Approval aging',
      'Workflow SLA',
      'Automation execution',
      'Failure log',
      'Escalation history',
    ],
    setup: [
      'Workflow engines',
      'Rule permissions',
      'Retry policy',
      'Email gateways',
      'Notification channels',
    ],
    metrics: [
      _Metric('Active rules', '86', '14 scheduled', sampleProgress: 0.86),
      _Metric('Approvals', '26 due', '7 overdue', sampleProgress: 0.58),
      _Metric('Automation success', '98.1%', '24h window',
          sampleProgress: 0.98),
    ],
    records: [
      ['WF-PO-10L', 'Purchase approval', 'Active', 'Plant Head'],
      ['WF-SO-CREDIT', 'Credit hold', 'Active', 'Finance'],
      ['WF-STOCK-LOW', 'Reorder PR', 'Paused', 'Procurement'],
    ],
    formFields: _defaultFields,
  ),
  _ModuleDefinition(
    id: 'reports',
    name: 'Reports & Analytics',
    category: 'Analyze to decide',
    description:
        'Report generation, scheduled MIS, operational dashboards, PDF/Excel/CSV exports, audit extracts, and management packs.',
    icon: Icons.analytics_outlined,
    primaryObject: 'report',
    capabilities: [
      'Role-based dashboards',
      'PDF, Excel, and CSV exports',
      'Scheduled MIS packs',
      'Operational drill-through',
      'Audit log reporting',
      'Report subscriptions',
      'Data snapshots',
    ],
    masterData: [
      'Report catalog',
      'Dataset definitions',
      'Subscriptions',
      'Export templates',
      'KPI definitions',
    ],
    transactionActions: [
      'Run report',
      'Schedule report',
      'Export Excel',
      'Export PDF',
      'Subscribe users',
    ],
    workflows: [
      'Report approval',
      'Scheduled distribution',
      'Export audit',
      'Data retention',
    ],
    reports: [
      'Executive pack',
      'Operational MIS',
      'Financial statements',
      'Inventory valuation',
      'Payroll pack',
    ],
    setup: [
      'Report security',
      'Export formats',
      'Scheduling',
      'Data refresh',
      'Retention',
    ],
    metrics: [
      _Metric('Scheduled reports', '18', '6 due today', sampleProgress: 0.78),
      _Metric('Export jobs', '42', '3 running', sampleProgress: 0.64),
      _Metric('Audit events', '4,812', '24 security', sampleProgress: 0.91),
    ],
    records: [
      ['RPT-OEE', 'Plant pack', 'Scheduled', 'Operations'],
      ['RPT-INV', 'Valuation', 'Ready', 'Finance'],
      ['RPT-PAY', 'Payroll pack', 'Draft', 'HR'],
    ],
    formFields: _defaultFields,
  ),
  _ModuleDefinition(
    id: 'platform',
    name: 'Platform Admin',
    category: 'Secure to scale',
    description:
        'Companies, tenant databases, users, roles, permissions, feature flags, licensing, sessions, storage providers, backups, and audit.',
    icon: Icons.admin_panel_settings_outlined,
    primaryObject: 'tenant configuration',
    capabilities: [
      'Company provisioning',
      'Tenant database migrations',
      'Users, roles, and permissions',
      'Feature flags and licensing',
      'Session and device tracking',
      'Storage providers: local, MinIO, S3',
      'Backups, restore, retention',
      'Security audit logs',
    ],
    masterData: [
      'Companies',
      'Users',
      'Roles',
      'Permissions',
      'Feature flags',
      'Storage providers',
    ],
    transactionActions: [
      'Provision company',
      'Assign role',
      'Toggle feature',
      'Run migration',
      'Start backup',
      'Restore snapshot',
    ],
    workflows: [
      'Company activation',
      'Owner approval',
      'Superadmin approval',
      'Backup verification',
      'License renewal',
    ],
    reports: [
      'Tenant health',
      'Permission audit',
      'Session audit',
      'Backup status',
      'License utilization',
    ],
    setup: [
      'JWT settings',
      'Rate limits',
      'Argon2 password policy',
      'Storage credentials',
      'Retention policies',
    ],
    metrics: [
      _Metric('Companies', '7', '5 active', sampleProgress: 0.71),
      _Metric('Feature flags', '42', '11 gated', sampleProgress: 0.76),
      _Metric('Backups', 'Healthy', 'Last 03:00', sampleProgress: 0.97),
    ],
    records: [
      ['TEN-ALLOY', 'AlloyWorks', 'Active', 'Monitor'],
      ['ROLE-OPS', 'Operations Admin', 'Updated', 'Audit'],
      ['BK-0300', 'Nightly backup', 'Verified', 'Retention'],
    ],
    formFields: _defaultFields,
  ),
  _ModuleDefinition(
    id: 'integration',
    name: 'Integrations & API',
    category: 'Connect to ecosystem',
    description:
        'REST APIs, webhooks, file imports, device connectors, accounting gateways, email, notifications, and external storage.',
    icon: Icons.hub_outlined,
    primaryObject: 'integration',
    capabilities: [
      'Versioned REST APIs',
      'Webhooks and event streams',
      'CSV/Excel imports',
      'Barcode and biometric devices',
      'Email and notification gateways',
      'Accounting and tax gateways',
      'S3-compatible storage',
    ],
    masterData: [
      'API clients',
      'Webhook endpoints',
      'Import maps',
      'Device registry',
      'Gateway credentials',
    ],
    transactionActions: [
      'Create API client',
      'Test webhook',
      'Import file',
      'Register device',
      'Sync gateway',
    ],
    workflows: [
      'Import validation',
      'API key approval',
      'Webhook retry',
      'Device exception',
    ],
    reports: [
      'API usage',
      'Webhook failures',
      'Import errors',
      'Device sync',
      'Gateway health',
    ],
    setup: [
      'API scopes',
      'Rate limits',
      'Retry policy',
      'Mapping templates',
      'Secret rotation',
    ],
    metrics: [
      _Metric('API calls', '1.8M', '30 days', sampleProgress: 0.84),
      _Metric('Webhook success', '99.2%', '24h window', sampleProgress: 0.99),
      _Metric('Device sync', '37/39', '2 offline', sampleProgress: 0.95),
    ],
    records: [
      ['API-MOBILE', 'Flutter clients', 'Active', 'Rotate key'],
      ['WH-SALES', 'Sales webhook', 'Healthy', 'Monitor'],
      ['IMP-882', 'Opening stock', 'Errors', 'Fix map'],
    ],
    formFields: _defaultFields,
    licensed: false,
  ),
];
