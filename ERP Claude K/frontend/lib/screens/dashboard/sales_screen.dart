import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:syncfusion_flutter_charts/charts.dart';

import 'package:enterprise_erp/core/constants/app_constants.dart';

class SalesScreen extends StatefulWidget {
  const SalesScreen({super.key});

  @override
  State<SalesScreen> createState() => _SalesScreenState();
}

class _SalesScreenState extends State<SalesScreen> {
  late List<_SalesData> _salesData;

  @override
  void initState() {
    super.initState();
    _salesData = [
      _SalesData('Jan', 35, 28),
      _SalesData('Feb', 28, 32),
      _SalesData('Mar', 34, 40),
      _SalesData('Apr', 32, 38),
      _SalesData('May', 40, 52),
      _SalesData('Jun', 55, 68),
    ];
  }

  @override
  Widget build(BuildContext context) {
    final isDesktop = MediaQuery.of(context).size.width > 1000;

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
                    'Sales Intelligence',
                    style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                  ),
                  const SizedBox(height: 4),
                  const Text(
                    'Analyze corporate revenue margins, invoices, and retail sales stats.',
                    style: TextStyle(color: Colors.grey),
                  ),
                ],
              ),
              ElevatedButton.icon(
                icon: const Icon(Icons.add_shopping_cart, size: 16),
                label: const Text('New Invoice / Order'),
                onPressed: () {},
              ),
            ],
          ),
          const SizedBox(height: 24),

          // KPI Section
          LayoutBuilder(
            builder: (context, constraints) {
              final cardWidth = (constraints.maxWidth - 48) / (constraints.maxWidth > 1000 ? 4 : 2);
              return Wrap(
                spacing: 16,
                runSpacing: 16,
                children: [
                  _buildMetricCard('Gross Revenue', '\$145,280', '+18.4%', Icons.monetization_on_outlined, const Color(AppColors.success), cardWidth),
                  _buildMetricCard('Total Invoices', '1,248 Bills', '+10.2%', Icons.article_outlined, const Color(AppColors.primaryBlue), cardWidth),
                  _buildMetricCard('Awaiting Payment', '14 Bills', '-5.2%', Icons.hourglass_empty_outlined, const Color(AppColors.warning), cardWidth),
                  _buildMetricCard('Net Margin', '24.6%', '+1.8%', Icons.trending_up_outlined, const Color(AppColors.secondaryPurple), cardWidth),
                ],
              );
            },
          ),
          const SizedBox(height: 24),

          // Body Graphs & Tables
          Expanded(
            child: isDesktop
                ? Row(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Expanded(
                        flex: 1,
                        child: _buildSalesPerformanceChart(),
                      ),
                      const SizedBox(width: 24),
                      Expanded(
                        flex: 1,
                        child: _buildRecentInvoicesList(),
                      ),
                    ],
                  )
                : Column(
                    children: [
                      Container(height: 300, child: _buildSalesPerformanceChart()),
                      const SizedBox(height: 24),
                      Expanded(child: _buildRecentInvoicesList()),
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

  Widget _buildSalesPerformanceChart() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Sales & Margin Performance (H1 2026)',
              style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 16),
            Expanded(
              child: SfCartesianChart(
                primaryXAxis: CategoryAxis(),
                tooltipBehavior: TooltipBehavior(enable: true),
                legend: const Legend(isVisible: true, position: LegendPosition.bottom),
                series: <CartesianSeries<_SalesData, String>>[
                  LineSeries<_SalesData, String>(
                    dataSource: _salesData,
                    xValueMapper: (_SalesData sales, _) => sales.month,
                    yValueMapper: (_SalesData sales, _) => sales.revenue,
                    name: 'Revenue (\$K)',
                    color: const Color(AppColors.primaryBlue),
                    dataLabelSettings: const DataLabelSettings(isVisible: true),
                    markerSettings: const MarkerSettings(isVisible: true),
                  ),
                  LineSeries<_SalesData, String>(
                    dataSource: _salesData,
                    xValueMapper: (_SalesData sales, _) => sales.month,
                    yValueMapper: (_SalesData sales, _) => sales.margin,
                    name: 'Net Profit (\$K)',
                    color: const Color(AppColors.success),
                    dataLabelSettings: const DataLabelSettings(isVisible: true),
                    markerSettings: const MarkerSettings(isVisible: true),
                  )
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildRecentInvoicesList() {
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
                  'Recent Billings / Invoices',
                  style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.bold),
                ),
                TextButton(onPressed: () {}, child: const Text('View All')),
              ],
            ),
            const SizedBox(height: 16),
            Expanded(
              child: SingleChildScrollView(
                child: SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: DataTable(
                    columns: const [
                      DataColumn(label: Text('Invoice ID')),
                      DataColumn(label: Text('Client')),
                      DataColumn(label: Text('Amount')),
                      DataColumn(label: Text('Status')),
                    ],
                    rows: const [
                      DataRow(cells: [
                        DataCell(Text('INV-2026-001')),
                        DataCell(Text('Amazon Web Services')),
                        DataCell(Text('\$12,450.00')),
                        DataCell(Text('Paid')),
                      ]),
                      DataRow(cells: [
                        DataCell(Text('INV-2026-002')),
                        DataCell(Text('Microsoft Systems')),
                        DataCell(Text('\$4,800.00')),
                        DataCell(Text('Pending')),
                      ]),
                      DataRow(cells: [
                        DataCell(Text('INV-2026-003')),
                        DataCell(Text('Google Cloud Platform')),
                        DataCell(Text('\$32,900.00')),
                        DataCell(Text('Paid')),
                      ]),
                      DataRow(cells: [
                        DataCell(Text('INV-2026-004')),
                        DataCell(Text('Synapse Ltd')),
                        DataCell(Text('\$1,250.00')),
                        DataCell(Text('Rejected')),
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

class _SalesData {
  _SalesData(this.month, this.revenue, this.margin);
  final String month;
  final double revenue;
  final double margin;
}
