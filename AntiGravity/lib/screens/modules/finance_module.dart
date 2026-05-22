import 'package:flutter/material.dart';
import '../../theme/app_colors.dart';
import '../../app_state.dart';
import '../../models/ledger_transaction.dart';

class FinanceTrendPainter extends CustomPainter {
  final List<double> values;
  final Color primaryColor;
  final Color secondaryColor;
  final bool isDark;

  FinanceTrendPainter({
    required this.values,
    required this.primaryColor,
    required this.secondaryColor,
    required this.isDark,
  });

  @override
  void paint(Canvas canvas, Size size) {
    if (values.isEmpty) return;

    final paint = Paint()
      ..color = primaryColor
      ..strokeWidth = 3.0
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;

    final fillPaint = Paint()
      ..style = PaintingStyle.fill;

    final path = Path();
    final fillPath = Path();

    double minVal = values.reduce((a, b) => a < b ? a : b);
    double maxVal = values.reduce((a, b) => a > b ? a : b);
    
    // Fallback if they are identical
    if (minVal == maxVal) {
      minVal -= 1000;
      maxVal += 1000;
    }

    final double widthInterval = size.width / (values.length - 1).clamp(1, 999999);
    final double range = maxVal - minVal;

    double getX(int index) => index * widthInterval;
    double getY(double val) {
      final double normalized = (val - minVal) / range;
      return size.height - (normalized * size.height * 0.65 + size.height * 0.15);
    }

    path.moveTo(getX(0), getY(values[0]));
    fillPath.moveTo(getX(0), size.height);
    fillPath.lineTo(getX(0), getY(values[0]));

    for (int i = 1; i < values.length; i++) {
      final double x0 = getX(i - 1);
      final double y0 = getY(values[i - 1]);
      final double x1 = getX(i);
      final double y1 = getY(values[i]);

      final double cx1 = x0 + (x1 - x0) / 2;
      final double cy1 = y0;
      final double cx2 = x0 + (x1 - x0) / 2;
      final double cy2 = y1;

      path.cubicTo(cx1, cy1, cx2, cy2, x1, y1);
      fillPath.cubicTo(cx1, cy1, cx2, cy2, x1, y1);
    }

    fillPath.lineTo(getX(values.length - 1), size.height);
    fillPath.close();

    fillPaint.shader = LinearGradient(
      colors: [primaryColor.withOpacity(0.3), secondaryColor.withOpacity(0.0)],
      begin: Alignment.topCenter,
      end: Alignment.bottomCenter,
    ).createShader(Rect.fromLTWH(0, 0, size.width, size.height));

    canvas.drawPath(fillPath, fillPaint);
    canvas.drawPath(path, paint);

    final endpointPaint = Paint()
      ..color = secondaryColor
      ..style = PaintingStyle.fill;
    
    final glowPaint = Paint()
      ..color = secondaryColor.withOpacity(0.4)
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 6);

    for (int i = 0; i < values.length; i++) {
      final double x = getX(i);
      final double y = getY(values[i]);
      
      canvas.drawCircle(Offset(x, y), 8, glowPaint);
      canvas.drawCircle(Offset(x, y), 4, endpointPaint);
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => true;
}

class FinanceModuleScreen extends StatefulWidget {
  const FinanceModuleScreen({super.key});

  @override
  State<FinanceModuleScreen> createState() => _FinanceModuleScreenState();
}

class _FinanceModuleScreenState extends State<FinanceModuleScreen> {
  final _invoiceAmountCtrl = TextEditingController();
  
  // Manual transaction controllers
  final _txCodeCtrl = TextEditingController();
  final _txTitleCtrl = TextEditingController();
  final _txAmountCtrl = TextEditingController();
  final _txDescCtrl = TextEditingController();
  String _txType = 'Debit';

  double _taxRate = 0.18; // 18% GST default
  double _calculatedTax = 0.0;
  double _calculatedCGST = 0.0;
  double _calculatedSGST = 0.0;
  double _calculatedTotal = 0.0;

  @override
  void dispose() {
    _invoiceAmountCtrl.dispose();
    _txCodeCtrl.dispose();
    _txTitleCtrl.dispose();
    _txAmountCtrl.dispose();
    _txDescCtrl.dispose();
    super.dispose();
  }

  void _calculateTaxSplit() {
    final amt = double.tryParse(_invoiceAmountCtrl.text.trim()) ?? 0.0;
    setState(() {
      _calculatedTax = amt * _taxRate;
      _calculatedCGST = _calculatedTax / 2;
      _calculatedSGST = _calculatedTax / 2;
      _calculatedTotal = amt + _calculatedTax;
    });
  }

  void _showPostTransactionDialog() {
    showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: const Text('Post General Ledger Entry'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(
                  controller: _txCodeCtrl,
                  decoration: const InputDecoration(labelText: 'Account Code (e.g., ACC-105)'),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _txTitleCtrl,
                  decoration: const InputDecoration(labelText: 'Account Title (e.g., Cash / Revenue)'),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _txAmountCtrl,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(labelText: 'Amount (INR)'),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _txDescCtrl,
                  decoration: const InputDecoration(labelText: 'Description / Journal Note'),
                ),
                const SizedBox(height: 16),
                DropdownButtonFormField<String>(
                  initialValue: _txType,
                  decoration: const InputDecoration(labelText: 'Transaction Type'),
                  items: const [
                    DropdownMenuItem(value: 'Debit', child: Text('Debit (+ Assets / Expenses)')),
                    DropdownMenuItem(value: 'Credit', child: Text('Credit (+ Revenues / Liabilities)')),
                  ],
                  onChanged: (val) => setDialogState(() => _txType = val!),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: () {
                final code = _txCodeCtrl.text.trim();
                final title = _txTitleCtrl.text.trim();
                final amt = double.tryParse(_txAmountCtrl.text.trim()) ?? 0.0;
                final desc = _txDescCtrl.text.trim();

                if (code.isEmpty || title.isEmpty || amt <= 0) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Please fill all compulsory fields.'), backgroundColor: AppColors.danger),
                  );
                  return;
                }

                AppState().addManualLedgerTransaction(code, title, _txType, amt, desc);
                
                _txCodeCtrl.clear();
                _txTitleCtrl.clear();
                _txAmountCtrl.clear();
                _txDescCtrl.clear();
                
                Navigator.pop(context);
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('General ledger entry posted successfully!'), backgroundColor: AppColors.accent),
                );
              },
              child: const Text('Post Entry'),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final dark = AppColors.isDark(context);

    return ListenableBuilder(
      listenable: AppState(),
      builder: (context, _) {
        final state = AppState();
        final ledger = state.ledgerTransactionsForCurrentCompany;

        final totalDebit = ledger.where((e) => e.type == 'Debit').fold<double>(0, (sum, e) => sum + e.amount);
        final totalCredit = ledger.where((e) => e.type == 'Credit').fold<double>(0, (sum, e) => sum + e.amount);
        final netCapital = totalDebit - totalCredit;

        // Calculate cumulative running values for the custom painter line graph
        List<double> runningBalances = [];
        double currentTotal = 0;
        
        // Sort transactions chronologically
        final sortedTx = List<LedgerTransaction>.from(ledger)
          ..sort((a, b) => a.date.compareTo(b.date));

        for (final tx in sortedTx) {
          if (tx.type == 'Debit') {
            currentTotal += tx.amount;
          } else {
            currentTotal -= tx.amount;
          }
          runningBalances.add(currentTotal);
        }

        // Default curves seed in case of empty logs
        if (runningBalances.isEmpty) {
          runningBalances = [10000.0, 45000.0, 32000.0, 68000.0];
        } else if (runningBalances.length == 1) {
          runningBalances.insert(0, 0); // Seed zero starting coord
        }

        return Scaffold(
          backgroundColor: dark ? AppColors.darkBg : AppColors.lightBg,
          appBar: AppBar(
            title: const Text('Finance & Double-Entry Accounting', style: TextStyle(fontWeight: FontWeight.bold)),
            backgroundColor: dark ? AppColors.darkSurface : AppColors.getPrimary(context),
            foregroundColor: Colors.white,
            actions: [
              ElevatedButton.icon(
                onPressed: _showPostTransactionDialog,
                icon: const Icon(Icons.add, size: 16),
                label: const Text('Post Transaction'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.accent,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                ),
              ),
              const SizedBox(width: 16),
            ],
          ),
          body: SingleChildScrollView(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Balance Sheet cards
                Row(
                  children: [
                    Expanded(
                      child: Container(
                        padding: const EdgeInsets.all(20),
                        decoration: AppColors.glassDecoration(context),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('Liquid Assets (Debits)', style: TextStyle(color: Colors.grey, fontSize: 12, fontWeight: FontWeight.bold)),
                            const SizedBox(height: 8),
                            Text('₹ ${totalDebit.toStringAsFixed(2)}', style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: AppColors.accent)),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Container(
                        padding: const EdgeInsets.all(20),
                        decoration: AppColors.glassDecoration(context),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('Accounts Payable (Credits)', style: TextStyle(color: Colors.grey, fontSize: 12, fontWeight: FontWeight.bold)),
                            const SizedBox(height: 8),
                            Text('₹ ${totalCredit.toStringAsFixed(2)}', style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: AppColors.danger)),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Container(
                        padding: const EdgeInsets.all(20),
                        decoration: AppColors.glassDecoration(context),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('Net Balance Sheet Capital', style: TextStyle(color: Colors.grey, fontSize: 12, fontWeight: FontWeight.bold)),
                            const SizedBox(height: 8),
                            Text('₹ ${netCapital.toStringAsFixed(2)}', style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: AppColors.getPrimary(context))),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 24),

                // Sleek CustomPainter Graph Chart
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(24),
                  decoration: AppColors.glassDecoration(context),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Net Capital Asset Trend (Real-time Canvas Curve)',
                        style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 4),
                      const Text(
                        'Displays cumulative running balances across double-entry transactions.',
                        style: TextStyle(fontSize: 11, color: Colors.grey),
                      ),
                      const SizedBox(height: 24),
                      SizedBox(
                        height: 180,
                        width: double.infinity,
                        child: CustomPaint(
                          painter: FinanceTrendPainter(
                            values: runningBalances,
                            primaryColor: AppColors.getPrimary(context),
                            secondaryColor: AppColors.getSecondary(context),
                            isDark: dark,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 24),

                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Left side: General Ledger Grid Table
                    Expanded(
                      flex: 6,
                      child: Container(
                        padding: const EdgeInsets.all(24),
                        decoration: AppColors.glassDecoration(context),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                const Text('General Ledger Account Stream', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                                IconButton(
                                  icon: Icon(Icons.refresh, color: AppColors.getPrimary(context)),
                                  onPressed: () {},
                                ),
                              ],
                            ),
                            const SizedBox(height: 16),
                            Table(
                              border: TableBorder.symmetric(
                                inside: BorderSide(color: dark ? AppColors.darkBorder : Colors.grey[200]!, width: 1.2),
                              ),
                              columnWidths: const {
                                0: FlexColumnWidth(2),
                                1: FlexColumnWidth(3),
                                2: FlexColumnWidth(2),
                                3: FlexColumnWidth(3),
                              },
                              children: [
                                TableRow(
                                  decoration: BoxDecoration(color: dark ? AppColors.darkBg : Colors.grey[100]),
                                  children: const [
                                    Padding(padding: EdgeInsets.all(12.0), child: Text('Account Code', style: TextStyle(fontWeight: FontWeight.bold))),
                                    Padding(padding: EdgeInsets.all(12.0), child: Text('Account Title', style: TextStyle(fontWeight: FontWeight.bold))),
                                    Padding(padding: EdgeInsets.all(12.0), child: Text('Type', style: TextStyle(fontWeight: FontWeight.bold))),
                                    Padding(padding: EdgeInsets.all(12.0), child: Text('Amount (INR)', style: TextStyle(fontWeight: FontWeight.bold), textAlign: TextAlign.right)),
                                  ],
                                ),
                                ...ledger.map((e) {
                                  final isDebit = e.type == 'Debit';
                                  return TableRow(
                                    children: [
                                      Padding(padding: const EdgeInsets.all(12.0), child: Text(e.code, style: const TextStyle(fontSize: 13))),
                                      Padding(
                                        padding: const EdgeInsets.all(12.0),
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Text(e.account, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
                                            if (e.description.isNotEmpty) ...[
                                              const SizedBox(height: 2),
                                              Text(e.description, style: const TextStyle(fontSize: 10, color: Colors.grey)),
                                            ]
                                          ],
                                        ),
                                      ),
                                      Padding(
                                        padding: const EdgeInsets.all(12.0),
                                        child: Text(
                                          e.type,
                                          style: TextStyle(
                                            color: isDebit ? AppColors.accent : AppColors.danger,
                                            fontWeight: FontWeight.bold,
                                            fontSize: 12,
                                          ),
                                        ),
                                      ),
                                      Padding(
                                        padding: const EdgeInsets.all(12.0),
                                        child: Text(
                                          '₹ ${e.amount.toStringAsFixed(2)}',
                                          style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold),
                                          textAlign: TextAlign.right,
                                        ),
                                      ),
                                    ],
                                  );
                                }),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(width: 24),

                    // Right side: GST & Taxes Split Calculator
                    Expanded(
                      flex: 4,
                      child: Container(
                        padding: const EdgeInsets.all(24),
                        decoration: AppColors.glassDecoration(context),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Icon(Icons.calculate, color: AppColors.getSecondary(context)),
                                const SizedBox(width: 8),
                                const Text('Automated Tax Splitter', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                              ],
                            ),
                            const SizedBox(height: 4),
                            const Text('Calculate SGST + CGST values automatically before invoicing.', style: TextStyle(color: Colors.grey, fontSize: 11)),
                            const Divider(height: 24),
                            
                            TextField(
                              controller: _invoiceAmountCtrl,
                              keyboardType: TextInputType.number,
                              decoration: const InputDecoration(labelText: 'Invoice Base Amount', prefixIcon: Icon(Icons.currency_rupee)),
                              onChanged: (_) => _calculateTaxSplit(),
                            ),
                            const SizedBox(height: 16),
                            
                            DropdownButtonFormField<double>(
                              initialValue: _taxRate,
                              decoration: const InputDecoration(labelText: 'Applicable Tax Bracket'),
                              items: const [
                                DropdownMenuItem(value: 0.18, child: Text('GST @ 18% (Standard Services)')),
                                DropdownMenuItem(value: 0.12, child: Text('GST @ 12% (Processed Goods)')),
                                DropdownMenuItem(value: 0.05, child: Text('GST @ 5% (Raw Logistics)')),
                                DropdownMenuItem(value: 0.28, child: Text('GST @ 28% (Luxury Machinery)')),
                              ],
                              onChanged: (rate) {
                                if (rate != null) {
                                  setState(() {
                                    _taxRate = rate;
                                  });
                                  _calculateTaxSplit();
                                }
                              },
                            ),
                            const SizedBox(height: 24),
                            
                            // Output Metrics Box
                            Container(
                              padding: const EdgeInsets.all(16),
                              decoration: BoxDecoration(
                                color: dark ? AppColors.darkBg : Colors.grey[50],
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(color: dark ? AppColors.darkBorder : Colors.grey[200]!),
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.stretch,
                                children: [
                                  _buildTaxRow('Central CGST (${(_taxRate * 100 / 2).toStringAsFixed(1)}%):', _calculatedCGST),
                                  const SizedBox(height: 8),
                                  _buildTaxRow('State SGST (${(_taxRate * 100 / 2).toStringAsFixed(1)}%):', _calculatedSGST),
                                  const SizedBox(height: 8),
                                  _buildTaxRow('Total Accumulated Tax:', _calculatedTax, isHighlight: true),
                                  const Divider(height: 20),
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      const Text('Estimated Gross Total:', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                                      Text(
                                        '₹ ${_calculatedTotal.toStringAsFixed(2)}',
                                        style: TextStyle(fontWeight: FontWeight.w900, fontSize: 15, color: AppColors.getSecondary(context)),
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
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

  Widget _buildTaxRow(String label, double val, {bool isHighlight = false}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: TextStyle(fontSize: 12, color: Colors.grey, fontWeight: isHighlight ? FontWeight.bold : FontWeight.normal)),
        Text('₹ ${val.toStringAsFixed(2)}', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: isHighlight ? AppColors.primary : null)),
      ],
    );
  }
}
