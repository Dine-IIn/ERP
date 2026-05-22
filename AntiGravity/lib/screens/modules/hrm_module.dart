import 'package:flutter/material.dart';
import '../../app_state.dart';
import '../../models/hrm.dart';
import '../../theme/app_colors.dart';

class HRMModuleScreen extends StatefulWidget {
  const HRMModuleScreen({super.key});

  @override
  State<HRMModuleScreen> createState() => _HRMModuleScreenState();
}

class _HRMModuleScreenState extends State<HRMModuleScreen> {
  final _baseSalaryCtrl = TextEditingController(text: '75000');
  final _allowanceCtrl = TextEditingController(text: '8000');
  final _taxCtrl = TextEditingController(text: '5000');
  final _periodCtrl = TextEditingController(text: 'May 2026');
  
  String _selectedEmployee = 'sales_user';
  double _calculatedGross = 0.0;
  double _calculatedNet = 0.0;
  bool _salaryGenerated = false;

  @override
  void dispose() {
    _baseSalaryCtrl.dispose();
    _allowanceCtrl.dispose();
    _taxCtrl.dispose();
    _periodCtrl.dispose();
    super.dispose();
  }

  String _formatDate(DateTime dt) {
    return "${dt.year}-${dt.month.toString().padLeft(2, '0')}-${dt.day.toString().padLeft(2, '0')}";
  }

  String _formatTime(DateTime dt) {
    final hr = dt.hour > 12 ? dt.hour - 12 : (dt.hour == 0 ? 12 : dt.hour);
    final min = dt.minute.toString().padLeft(2, '0');
    final ampm = dt.hour >= 12 ? 'PM' : 'AM';
    return "${hr.toString().padLeft(2, '0')}:$min $ampm";
  }

  String _formatDuration(DateTime clockIn, DateTime? clockOut) {
    if (clockOut == null) return 'Active Shift';
    final diff = clockOut.difference(clockIn);
    final hrs = diff.inHours;
    final mins = diff.inMinutes % 60;
    return '$hrs hrs $mins mins';
  }

  void _toggleClock(AppState appState) {
    final activeTimesheetIdx = appState.timesheetsForCurrentCompany.indexWhere(
      (t) => t.username == appState.currentUser?.username && t.clockOut == null
    );
    final isClockedIn = activeTimesheetIdx != -1;

    if (!isClockedIn) {
      appState.clockInUser();
      final nowStr = _formatTime(DateTime.now());
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Timesheet active! Clocked in at $nowStr'), backgroundColor: AppColors.accent),
      );
    } else {
      appState.clockOutUser();
      final nowStr = _formatTime(DateTime.now());
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Shift completed! Clocked out at $nowStr'), backgroundColor: AppColors.secondary),
      );
    }
  }

  void _generateSalarySlip() {
    final base = double.tryParse(_baseSalaryCtrl.text.trim()) ?? 0.0;
    final allowance = double.tryParse(_allowanceCtrl.text.trim()) ?? 0.0;
    final tax = double.tryParse(_taxCtrl.text.trim()) ?? 0.0;

    setState(() {
      _calculatedGross = base + allowance;
      _calculatedNet = _calculatedGross - tax;
      _salaryGenerated = true;
    });
  }

  void _submitPayslip(AppState appState) {
    final base = double.tryParse(_baseSalaryCtrl.text.trim()) ?? 0.0;
    final allowance = double.tryParse(_allowanceCtrl.text.trim()) ?? 0.0;
    final tax = double.tryParse(_taxCtrl.text.trim()) ?? 0.0;
    final period = _periodCtrl.text.trim();

    if (period.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter a billing period.'), backgroundColor: AppColors.danger),
      );
      return;
    }

    // Calculate total hours of selected employee in this period (simulated as 160 if none clocked)
    final employeeTimesheets = appState.timesheetsForCurrentCompany.where((t) => t.username == _selectedEmployee).toList();
    double totalHours = employeeTimesheets.fold<double>(0.0, (sum, t) => sum + t.totalHours);
    if (totalHours == 0.0) {
      totalHours = 160.0; // Standard month default hours for payroll seeder
    }

    appState.addNewPayslip(
      username: _selectedEmployee,
      period: period,
      totalHours: totalHours,
      hourlyRate: base / 160.0,
      bonus: allowance,
      deductions: tax,
    );

    setState(() {
      _salaryGenerated = false;
    });

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Payslip submitted and issued for $_selectedEmployee!'), backgroundColor: AppColors.accent),
    );
  }

  void _approveAndPay(AppState appState, String id) {
    final err = appState.approvePayslip(id);
    if (err != null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(err), backgroundColor: AppColors.danger),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Salary approved and ledger debit transaction posted successfully!'), backgroundColor: AppColors.accent),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final dark = AppColors.isDark(context);

    return Scaffold(
      backgroundColor: dark ? AppColors.darkBg : AppColors.lightBg,
      appBar: AppBar(
        title: const Text('Human Resource & Timesheets', style: TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: dark ? AppColors.darkSurface : AppColors.primary,
        foregroundColor: Colors.white,
      ),
      body: ListenableBuilder(
        listenable: AppState(),
        builder: (context, _) {
          final appState = AppState();
          final user = appState.currentUser;
          if (user == null) {
            return const Center(child: Text('Unauthorized access. Please log in.'));
          }

          final isAdmin = user.isCompanyAdmin || user.isSuperAdmin;

          // Fetch timesheets
          final rawTimesheets = appState.timesheetsForCurrentCompany;
          final timesheets = isAdmin 
              ? rawTimesheets 
              : rawTimesheets.where((t) => t.username == user.username).toList();

          // Check active shift
          final activeTimesheetIdx = rawTimesheets.indexWhere(
            (t) => t.username == user.username && t.clockOut == null
          );
          final isClockedIn = activeTimesheetIdx != -1;
          final clockStatus = isClockedIn ? 'Clocked In (Active)' : 'Clocked Out';

          // Fetch payslips
          final rawPayslips = appState.payslipsForCurrentCompany;
          final payslips = isAdmin
              ? rawPayslips
              : rawPayslips.where((p) => p.username == user.username).toList();

          // Fetch company employees for dropdown
          final companyEmployees = appState.usersForCurrentCompany.where((u) => !u.isSuperAdmin && u.username != 'admin').toList();
          if (companyEmployees.isNotEmpty && !companyEmployees.any((e) => e.username == _selectedEmployee)) {
            _selectedEmployee = companyEmployees.first.username;
          }

          return SingleChildScrollView(
            padding: const EdgeInsets.all(24.0),
            child: Wrap(
              spacing: 24,
              runSpacing: 24,
              children: [
                // Left Column: Timesheet clock in / logs
                Container(
                  width: MediaQuery.of(context).size.width > 900 
                      ? (MediaQuery.of(context).size.width - 72) * 0.5 
                      : MediaQuery.of(context).size.width - 48,
                  padding: const EdgeInsets.all(24),
                  decoration: AppColors.glassDecoration(context),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text('Active Shift Clock', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(
                              color: (isClockedIn ? AppColors.accent : Colors.grey).withOpacity(0.15),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: Text(
                              clockStatus,
                              style: TextStyle(color: isClockedIn ? AppColors.accent : Colors.grey, fontWeight: FontWeight.bold, fontSize: 11),
                            ),
                          ),
                        ],
                      ),
                      const Divider(height: 24),
                      
                      ElevatedButton.icon(
                        onPressed: () => _toggleClock(appState),
                        icon: Icon(isClockedIn ? Icons.logout : Icons.login, size: 20),
                        label: Text(isClockedIn ? 'Clock Out Shift' : 'Clock In Shift', style: const TextStyle(fontWeight: FontWeight.bold)),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: isClockedIn ? AppColors.danger : AppColors.primary,
                          minimumSize: const Size.fromHeight(55),
                        ),
                      ),
                      const SizedBox(height: 24),

                      Text(isAdmin ? 'Organization Attendance Logs:' : 'Your Weekly Work Logs:', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                      const SizedBox(height: 8),
                      if (timesheets.isEmpty)
                        Padding(
                          padding: const EdgeInsets.symmetric(vertical: 24.0),
                          child: Center(
                            child: Text('No attendance records found.', style: TextStyle(color: Colors.grey[500], fontSize: 12)),
                          ),
                        )
                      else
                        Table(
                          border: TableBorder.symmetric(inside: BorderSide(color: dark ? AppColors.darkBorder : Colors.grey[200]!)),
                          children: [
                            TableRow(
                              decoration: BoxDecoration(color: dark ? AppColors.darkBg : Colors.grey[100]),
                              children: [
                                if (isAdmin) const Padding(padding: EdgeInsets.all(12.0), child: Text('User', style: TextStyle(fontWeight: FontWeight.bold))),
                                const Padding(padding: EdgeInsets.all(12.0), child: Text('Date', style: TextStyle(fontWeight: FontWeight.bold))),
                                const Padding(padding: EdgeInsets.all(12.0), child: Text('Clock-In', style: TextStyle(fontWeight: FontWeight.bold))),
                                const Padding(padding: EdgeInsets.all(12.0), child: Text('Clock-Out', style: TextStyle(fontWeight: FontWeight.bold))),
                                const Padding(padding: EdgeInsets.all(12.0), child: Text('Duration', style: TextStyle(fontWeight: FontWeight.bold))),
                              ],
                            ),
                            ...timesheets.map((t) => TableRow(
                              children: [
                                if (isAdmin) Padding(padding: const EdgeInsets.all(12.0), child: Text(t.username, style: const TextStyle(fontWeight: FontWeight.w600))),
                                Padding(padding: const EdgeInsets.all(12.0), child: Text(_formatDate(t.clockIn))),
                                Padding(padding: const EdgeInsets.all(12.0), child: Text(_formatTime(t.clockIn))),
                                Padding(padding: const EdgeInsets.all(12.0), child: Text(t.clockOut != null ? _formatTime(t.clockOut!) : 'Active')),
                                Padding(padding: const EdgeInsets.all(12.0), child: Text(_formatDuration(t.clockIn, t.clockOut), style: const TextStyle(fontWeight: FontWeight.bold))),
                              ],
                            )),
                          ],
                        ),
                    ],
                  ),
                ),
                
                // Right Column: Salary slip generator & payroll table
                SizedBox(
                  width: MediaQuery.of(context).size.width > 900 
                      ? (MediaQuery.of(context).size.width - 72) * 0.5 
                      : MediaQuery.of(context).size.width - 48,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Admin Payroll Section
                      if (isAdmin) ...[
                        Container(
                          padding: const EdgeInsets.all(24),
                          decoration: AppColors.glassDecoration(context),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Row(
                                children: [
                                  Icon(Icons.badge, color: AppColors.secondary),
                                  SizedBox(width: 8),
                                  Text('Digital Salary Slip Generator', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                                ],
                              ),
                              const SizedBox(height: 4),
                              const Text('Provision slip breakdowns for organization employees.', style: TextStyle(color: Colors.grey, fontSize: 11)),
                              const Divider(height: 24),
                              
                              if (companyEmployees.isEmpty)
                                const Text('No active employees registered to generate payroll for.', style: TextStyle(color: Colors.grey, fontSize: 12))
                              else ...[
                                DropdownButtonFormField<String>(
                                  initialValue: _selectedEmployee,
                                  decoration: const InputDecoration(labelText: 'Target Employee Name'),
                                  items: companyEmployees.map((e) => DropdownMenuItem(value: e.username, child: Text('${e.username} (${e.role})'))).toList(),
                                  onChanged: (val) => setState(() => _selectedEmployee = val!),
                                ),
                                const SizedBox(height: 12),
                                Row(
                                  children: [
                                    Expanded(
                                      child: TextField(
                                        controller: _baseSalaryCtrl,
                                        keyboardType: TextInputType.number,
                                        decoration: const InputDecoration(labelText: 'Base Salary (INR)'),
                                      ),
                                    ),
                                    const SizedBox(width: 12),
                                    Expanded(
                                      child: TextField(
                                        controller: _allowanceCtrl,
                                        keyboardType: TextInputType.number,
                                        decoration: const InputDecoration(labelText: 'Allowances'),
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 12),
                                Row(
                                  children: [
                                    Expanded(
                                      child: TextField(
                                        controller: _taxCtrl,
                                        keyboardType: TextInputType.number,
                                        decoration: const InputDecoration(labelText: 'Tax Deductions / TDS'),
                                      ),
                                    ),
                                    const SizedBox(width: 12),
                                    Expanded(
                                      child: TextField(
                                        controller: _periodCtrl,
                                        decoration: const InputDecoration(labelText: 'Billing Period'),
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 16),
                                
                                ElevatedButton.icon(
                                  onPressed: _generateSalarySlip,
                                  icon: const Icon(Icons.analytics_outlined),
                                  label: const Text('Calculate & Generate Slip'),
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: AppColors.secondary,
                                    minimumSize: const Size.fromHeight(50),
                                  ),
                                ),
                              ],
                              
                              if (_salaryGenerated) ...[
                                const SizedBox(height: 20),
                                Container(
                                  padding: const EdgeInsets.all(16),
                                  decoration: BoxDecoration(
                                    color: dark ? AppColors.darkBg : Colors.grey[50],
                                    borderRadius: BorderRadius.circular(12),
                                    border: Border.all(color: dark ? AppColors.darkBorder : Colors.grey[200]!),
                                  ),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      const Text('SALARY RECEIPT BREAKDOWN', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 11, color: Colors.grey)),
                                      const Divider(height: 16),
                                      _buildPayRow('Basic Salary Base:', double.tryParse(_baseSalaryCtrl.text) ?? 0.0),
                                      _buildPayRow('Performance Allowances:', double.tryParse(_allowanceCtrl.text) ?? 0.0),
                                      _buildPayRow('Corporate Deductions / TDS:', -(double.tryParse(_taxCtrl.text) ?? 0.0)),
                                      const Divider(height: 16),
                                      Row(
                                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                        children: [
                                          const Text('Net Disbursed Take-Home:', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                                          Text('₹ ${_calculatedNet.toStringAsFixed(2)}', style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 14, color: AppColors.accent)),
                                        ],
                                      ),
                                      const SizedBox(height: 16),
                                      ElevatedButton.icon(
                                        onPressed: () => _submitPayslip(appState),
                                        icon: const Icon(Icons.send_outlined),
                                        label: const Text('Submit & Issue Issued Payslip'),
                                        style: ElevatedButton.styleFrom(
                                          backgroundColor: AppColors.accent,
                                          minimumSize: const Size.fromHeight(45),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ],
                          ),
                        ),
                        const SizedBox(height: 24),
                      ],

                      // Payslips Directory Section
                      Container(
                        padding: const EdgeInsets.all(24),
                        decoration: AppColors.glassDecoration(context),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                const Icon(Icons.payments_outlined, color: AppColors.accent),
                                const SizedBox(width: 8),
                                Text(isAdmin ? 'Issued Salary Slips Registry' : 'Your Issued Payslips', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                              ],
                            ),
                            const SizedBox(height: 4),
                            Text(isAdmin ? 'Review pending payouts, pay salaries, and audit wages expenses.' : 'Track your salary slips and pending payouts details.', style: const TextStyle(color: Colors.grey, fontSize: 11)),
                            const Divider(height: 24),
                            
                            if (payslips.isEmpty)
                              Padding(
                                padding: const EdgeInsets.symmetric(vertical: 24.0),
                                child: Center(
                                  child: Text('No salary slips issued yet.', style: TextStyle(color: Colors.grey[500], fontSize: 12)),
                                ),
                              )
                            else
                              ListView.separated(
                                shrinkWrap: true,
                                physics: const NeverScrollableScrollPhysics(),
                                itemCount: payslips.length,
                                separatorBuilder: (context, idx) => Divider(color: dark ? AppColors.darkBorder : Colors.grey[200]!, height: 24),
                                itemBuilder: (context, idx) {
                                  final p = payslips[idx];
                                  final isPending = p.status == 'Pending' || p.status == 'Approved';
                                  
                                  return Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            '${p.username} - ${p.period}',
                                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                                          ),
                                          const SizedBox(height: 4),
                                          Text(
                                            'Net Pay: ₹${p.grossPayout.toStringAsFixed(2)} | Hrs: ${p.totalHours.toStringAsFixed(1)}',
                                            style: TextStyle(color: Colors.grey[500], fontSize: 11),
                                          ),
                                        ],
                                      ),
                                      Row(
                                        children: [
                                          Container(
                                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                            decoration: BoxDecoration(
                                              color: (p.status == 'Paid' ? AppColors.accent : Colors.orange).withOpacity(0.15),
                                              borderRadius: BorderRadius.circular(8),
                                            ),
                                            child: Text(
                                              p.status,
                                              style: TextStyle(
                                                color: p.status == 'Paid' ? AppColors.accent : Colors.orange,
                                                fontWeight: FontWeight.bold,
                                                fontSize: 11,
                                              ),
                                            ),
                                          ),
                                          if (isAdmin && isPending) ...[
                                            const SizedBox(width: 8),
                                            ElevatedButton(
                                              onPressed: () => _approveAndPay(appState, p.id),
                                              style: ElevatedButton.styleFrom(
                                                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                                                backgroundColor: AppColors.accent,
                                                minimumSize: Size.zero,
                                              ),
                                              child: const Text('Approve & Pay', style: TextStyle(fontSize: 10)),
                                            ),
                                          ],
                                        ],
                                      ),
                                    ],
                                  );
                                },
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
        },
      ),
    );
  }

  Widget _buildPayRow(String label, double val) {
    final isNegative = val < 0;
    return Padding(
      padding: const EdgeInsets.only(bottom: 6.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(fontSize: 11, color: Colors.grey)),
          Text(
            isNegative ? '- ₹ ${val.abs().toStringAsFixed(0)}' : '₹ ${val.toStringAsFixed(0)}',
            style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: isNegative ? AppColors.danger : null),
          ),
        ],
      ),
    );
  }
}
