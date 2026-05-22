import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:syncfusion_flutter_charts/charts.dart';

import 'package:enterprise_erp/core/constants/app_constants.dart';

class HRMScreen extends StatefulWidget {
  const HRMScreen({super.key});

  @override
  State<HRMScreen> createState() => _HRMScreenState();
}

class _HRMScreenState extends State<HRMScreen> {
  late List<_HrmData> _deptDistribution;

  @override
  void initState() {
    super.initState();
    _deptDistribution = [
      _HrmData('Sales & CRM', 14, const Color(AppColors.primaryBlue)),
      _HrmData('Finance & ERP', 8, const Color(AppColors.success)),
      _HrmData('Engineering', 25, const Color(AppColors.secondaryPurple)),
      _HrmData('HR & Admin', 5, const Color(AppColors.info)),
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
                    'HRM & Workforce',
                    style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                  ),
                  const SizedBox(height: 4),
                  const Text(
                    'Manage employee lists, verify attendance percentages, and department distribution.',
                    style: TextStyle(color: Colors.grey),
                  ),
                ],
              ),
              ElevatedButton.icon(
                icon: const Icon(Icons.person_add_alt, size: 16),
                label: const Text('Add Employee'),
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
                  _buildMetricCard('Total Employees', '52 Members', '+3 Joined', Icons.people_outline, const Color(AppColors.primaryBlue), cardWidth),
                  _buildMetricCard('Attendance Rate', '96.8%', '+1.2% Today', Icons.fingerprint_outlined, const Color(AppColors.success), cardWidth),
                  _buildMetricCard('Open Positions', '6 Roles', 'Hiring active', Icons.work_outline, const Color(AppColors.warning), cardWidth),
                  _buildMetricCard('On Active Leave', '2 Members', 'Approved leaves', Icons.time_to_leave_outlined, const Color(AppColors.secondaryPurple), cardWidth),
                ],
              );
            },
          ),
          const SizedBox(height: 24),

          // Body Distribution Chart & Employees table
          Expanded(
            child: isDesktop
                ? Row(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Expanded(
                        flex: 1,
                        child: _buildDepartmentHeadcountChart(),
                      ),
                      const SizedBox(width: 24),
                      Expanded(
                        flex: 1,
                        child: _buildEmployeeRosterList(),
                      ),
                    ],
                  )
                : Column(
                    children: [
                      Container(height: 300, child: _buildDepartmentHeadcountChart()),
                      const SizedBox(height: 24),
                      Expanded(child: _buildEmployeeRosterList()),
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

  Widget _buildDepartmentHeadcountChart() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Workforce Department Headcounts',
              style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 16),
            Expanded(
              child: SfCircularChart(
                legend: const Legend(isVisible: true, position: LegendPosition.bottom),
                tooltipBehavior: TooltipBehavior(enable: true),
                series: <CircularSeries<_HrmData, String>>[
                  PieSeries<_HrmData, String>(
                    dataSource: _deptDistribution,
                    xValueMapper: (_HrmData data, _) => data.dept,
                    yValueMapper: (_HrmData data, _) => data.headcount,
                    pointColorMapper: (_HrmData data, _) => data.color,
                    name: 'Headcount',
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

  Widget _buildEmployeeRosterList() {
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
                  'Department Managers roster',
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
                      DataColumn(label: Text('Employee ID')),
                      DataColumn(label: Text('Name')),
                      DataColumn(label: Text('Designation')),
                      DataColumn(label: Text('Department')),
                    ],
                    rows: const [
                      DataRow(cells: [
                        DataCell(Text('EMP-001')),
                        DataCell(Text('Demo Admin')),
                        DataCell(Text('Administrator')),
                        DataCell(Text('Management')),
                      ]),
                      DataRow(cells: [
                        DataCell(Text('EMP-002')),
                        DataCell(Text('Sarah Jenkins')),
                        DataCell(Text('Marketing Manager')),
                        DataCell(Text('Sales & CRM')),
                      ]),
                      DataRow(cells: [
                        DataCell(Text('EMP-003')),
                        DataCell(Text('Alex Ferguson')),
                        DataCell(Text('HR Specialist')),
                        DataCell(Text('HR & Admin')),
                      ]),
                      DataRow(cells: [
                        DataCell(Text('EMP-004')),
                        DataCell(Text('Mark Zuckerberg')),
                        DataCell(Text('Lead Architect')),
                        DataCell(Text('Engineering')),
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

class _HrmData {
  _HrmData(this.dept, this.headcount, this.color);
  final String dept;
  final double headcount;
  final Color color;
}
