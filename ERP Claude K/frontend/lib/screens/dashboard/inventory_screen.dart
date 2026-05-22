import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:syncfusion_flutter_charts/charts.dart';

import 'package:enterprise_erp/core/constants/app_constants.dart';

class InventoryScreen extends StatefulWidget {
  const InventoryScreen({super.key});

  @override
  State<InventoryScreen> createState() => _InventoryScreenState();
}

class _InventoryScreenState extends State<InventoryScreen> {
  late List<_StockData> _stockLevels;

  @override
  void initState() {
    super.initState();
    _stockLevels = [
      _StockData('Laptops', 85),
      _StockData('Keyboards', 140),
      _StockData('Monitors', 35),
      _StockData('Mice', 220),
      _StockData('Routers', 18),
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
                    'Warehouse & Inventory',
                    style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                  ),
                  const SizedBox(height: 4),
                  const Text(
                    'Track SKU stock status, verify warehouse capacities, and set depletion alerts.',
                    style: TextStyle(color: Colors.grey),
                  ),
                ],
              ),
              ElevatedButton.icon(
                icon: const Icon(Icons.add_box_outlined, size: 16),
                label: const Text('Add Product SKU'),
                onPressed: () {},
              ),
            ],
          ),
          const SizedBox(height: 24),

          // KPI Metrics
          LayoutBuilder(
            builder: (context, constraints) {
              final cardWidth = (constraints.maxWidth - 48) / (constraints.maxWidth > 1000 ? 4 : 2);
              return Wrap(
                spacing: 16,
                runSpacing: 16,
                children: [
                  _buildMetricCard('Total Active SKUs', '1,452 Items', '+42 New', Icons.inventory_2_outlined, const Color(AppColors.primaryBlue), cardWidth),
                  _buildMetricCard('Low Stock Alerts', '12 Items', 'Requires Audit', Icons.report_problem_outlined, const Color(AppColors.warning), cardWidth),
                  _buildMetricCard('Warehouse space', '82.4% Full', '+2.4% space', Icons.warehouse_outlined, const Color(AppColors.secondaryPurple), cardWidth),
                  _buildMetricCard('Awaiting Delivery', '4 Shipments', 'Arriving Today', Icons.local_shipping_outlined, const Color(AppColors.success), cardWidth),
                ],
              );
            },
          ),
          const SizedBox(height: 24),

          // Body Graphs & Logs
          Expanded(
            child: isDesktop
                ? Row(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Expanded(
                        flex: 1,
                        child: _buildStockDistributionChart(),
                      ),
                      const SizedBox(width: 24),
                      Expanded(
                        flex: 1,
                        child: _buildStockLevelsTable(),
                      ),
                    ],
                  )
                : Column(
                    children: [
                      Container(height: 300, child: _buildStockDistributionChart()),
                      const SizedBox(height: 24),
                      Expanded(child: _buildStockLevelsTable()),
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
                      style: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        change,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          color: Colors.grey,
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                        ),
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

  Widget _buildStockDistributionChart() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'SKU Stock Level Allocations',
              style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 16),
            Expanded(
              child: SfCartesianChart(
                primaryXAxis: CategoryAxis(),
                tooltipBehavior: TooltipBehavior(enable: true),
                series: <CartesianSeries<_StockData, String>>[
                  BarSeries<_StockData, String>(
                    dataSource: _stockLevels,
                    xValueMapper: (_StockData data, _) => data.itemName,
                    yValueMapper: (_StockData data, _) => data.qty,
                    name: 'Items in Stock',
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

  Widget _buildStockLevelsTable() {
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
                  'Critical Stock Stockouts',
                  style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.bold),
                ),
                TextButton(onPressed: () {}, child: const Text('Reorder All')),
              ],
            ),
            const SizedBox(height: 16),
            Expanded(
              child: SingleChildScrollView(
                child: SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: DataTable(
                    columns: const [
                      DataColumn(label: Text('SKU ID')),
                      DataColumn(label: Text('Product')),
                      DataColumn(label: Text('In Stock')),
                      DataColumn(label: Text('Status')),
                    ],
                    rows: const [
                      DataRow(cells: [
                        DataCell(Text('SKU-9021')),
                        DataCell(Text('ASUS Pro Router')),
                        DataCell(Text('18 units')),
                        DataCell(Text('Low Stock')),
                      ]),
                      DataRow(cells: [
                        DataCell(Text('SKU-9022')),
                        DataCell(Text('MacBook Air M3')),
                        DataCell(Text('5 units')),
                        DataCell(Text('Low Stock')),
                      ]),
                      DataRow(cells: [
                        DataCell(Text('SKU-9023')),
                        DataCell(Text('Dell U2412 Monitor')),
                        DataCell(Text('35 units')),
                        DataCell(Text('Healthy')),
                      ]),
                      DataRow(cells: [
                        DataCell(Text('SKU-9024')),
                        DataCell(Text('HP Laserjet Pro')),
                        DataCell(Text('0 units')),
                        DataCell(Text('Out of Stock')),
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

class _StockData {
  _StockData(this.itemName, this.qty);
  final String itemName;
  final double qty;
}
