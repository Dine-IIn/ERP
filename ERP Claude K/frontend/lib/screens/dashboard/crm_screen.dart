import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:syncfusion_flutter_charts/charts.dart';

import 'package:enterprise_erp/core/constants/app_constants.dart';

class CRMScreen extends StatefulWidget {
  const CRMScreen({super.key});

  @override
  State<CRMScreen> createState() => _CRMScreenState();
}

class _CRMScreenState extends State<CRMScreen> {
  late List<_ChartData> _pipelineData;

  @override
  void initState() {
    super.initState();
    _pipelineData = [
      _ChartData('Prospecting', 120),
      _ChartData('Qualification', 80),
      _ChartData('Proposal', 45),
      _ChartData('Negotiation', 30),
      _ChartData('Closed Won', 22),
    ];
  }

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.of(context).size;
    final isDesktop = size.width > 1000;

    return Container(
      padding: const EdgeInsets.all(24.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'CRM & Lead Pipeline',
                    style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                  ),
                  const SizedBox(height: 4),
                  const Text(
                    'Track customer acquisitions, lead qualification phases, and campaign metrics.',
                    style: TextStyle(color: Colors.grey),
                  ),
                ],
              ),
              ElevatedButton.icon(
                icon: const Icon(Icons.person_add_alt_1, size: 16),
                label: const Text('Add New Lead'),
                onPressed: () {},
              ),
            ],
          ),
          const SizedBox(height: 24),

          // KPI Cards
          LayoutBuilder(
            builder: (context, constraints) {
              final cardWidth = (constraints.maxWidth - 48) / (constraints.maxWidth > 1000 ? 4 : 2);
              return Wrap(
                spacing: 16,
                runSpacing: 16,
                children: [
                  _buildMetricCard('Total Leads', '412', '+12.3%', Icons.people_outline, const Color(AppColors.primaryBlue), cardWidth),
                  _buildMetricCard('Win Rate', '64.8%', '+4.2%', Icons.emoji_events_outlined, const Color(AppColors.success), cardWidth),
                  _buildMetricCard('Pipeline Value', '\$248,500', '+8.9%', Icons.monetization_on_outlined, const Color(AppColors.secondaryPurple), cardWidth),
                  _buildMetricCard('Avg Sale Cycle', '18 Days', '-2 Days', Icons.speed_outlined, const Color(AppColors.info), cardWidth),
                ],
              );
            },
          ),
          const SizedBox(height: 24),

          // Chart and Leads Grid
          Expanded(
            child: isDesktop
                ? Row(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Expanded(
                        flex: 1,
                        child: _buildPipelineChart(),
                      ),
                      const SizedBox(width: 24),
                      Expanded(
                        flex: 1,
                        child: _buildLeadsTable(),
                      ),
                    ],
                  )
                : Column(
                    children: [
                      Container(height: 300, child: _buildPipelineChart()),
                      const SizedBox(height: 24),
                      Expanded(child: _buildLeadsTable()),
                    ],
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildMetricCard(String label, String value, String change, IconData icon, Color color, double width) {
    return Container(
      width: width,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Theme.of(context).cardTheme.color,
        borderRadius: BorderRadius.circular(AppDimensions.radiusL),
        border: Border.all(
          color: Theme.of(context).brightness == Brightness.dark ? Colors.white10 : Colors.black12,
        ),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(icon, color: color, size: 22),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: const TextStyle(color: Colors.grey, fontSize: 13),
                ),
                const SizedBox(height: 4),
                Row(
                  children: [
                    Text(
                      value,
                      style: GoogleFonts.inter(fontSize: 20, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      change,
                      style: TextStyle(
                        color: change.startsWith('+') ? const Color(AppColors.success) : const Color(AppColors.error),
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPipelineChart() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Sales Funnel Pipeline Distribution',
              style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 16),
            Expanded(
              child: SfCartesianChart(
                primaryXAxis: CategoryAxis(
                  labelStyle: const TextStyle(fontSize: 11),
                ),
                primaryYAxis: NumericAxis(
                  edgeLabelPlacement: EdgeLabelPlacement.shift,
                ),
                tooltipBehavior: TooltipBehavior(enable: true),
                series: <CartesianSeries<_ChartData, String>>[
                  ColumnSeries<_ChartData, String>(
                    dataSource: _pipelineData,
                    xValueMapper: (_ChartData data, _) => data.stage,
                    yValueMapper: (_ChartData data, _) => data.value,
                    name: 'Leads count',
                    color: const Color(AppColors.primaryBlue),
                    borderRadius: BorderRadius.circular(4),
                    dataLabelSettings: const DataLabelSettings(isVisible: true),
                  )
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildLeadsTable() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Recent Hot Leads',
                  style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.bold),
                ),
                TextButton(onPressed: () {}, child: const Text('View All')),
              ],
            ),
            const SizedBox(height: 16),
            Expanded(
              child: SingleChildScrollView(
                scrollDirection: Axis.vertical,
                child: SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: DataTable(
                    columns: const [
                      DataColumn(label: Text('Contact Name')),
                      DataColumn(label: Text('Stage')),
                      DataColumn(label: Text('Value')),
                      DataColumn(label: Text('Email')),
                    ],
                    rows: const [
                      DataRow(cells: [
                        DataCell(Text('Robert Dowson')),
                        DataCell(Text('Qualification')),
                        DataCell(Text('\$45,000')),
                        DataCell(Text('robert@techcorp.com')),
                      ]),
                      DataRow(cells: [
                        DataCell(Text('Elissa Vance')),
                        DataCell(Text('Negotiation')),
                        DataCell(Text('\$22,000')),
                        DataCell(Text('elissa@vanceholdings.com')),
                      ]),
                      DataRow(cells: [
                        DataCell(Text('Christopher Nolan')),
                        DataCell(Text('Proposal')),
                        DataCell(Text('\$115,000')),
                        DataCell(Text('nolan@synapsecinema.com')),
                      ]),
                      DataRow(cells: [
                        DataCell(Text('Michael Keaton')),
                        DataCell(Text('Prospecting')),
                        DataCell(Text('\$12,500')),
                        DataCell(Text('m.keaton@gothamcorp.com')),
                      ]),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ChartData {
  _ChartData(this.stage, this.value);
  final String stage;
  final double value;
}
