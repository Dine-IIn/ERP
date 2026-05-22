import 'package:flutter/material.dart';
import '../../theme/app_colors.dart';
import '../../app_state.dart';
import '../../models/lead.dart';

class CRMModuleScreen extends StatefulWidget {
  const CRMModuleScreen({super.key});

  @override
  State<CRMModuleScreen> createState() => _CRMModuleScreenState();
}

class _CRMModuleScreenState extends State<CRMModuleScreen> {
  final _nameCtrl = TextEditingController();
  final _companyCtrl = TextEditingController();
  final _valueCtrl = TextEditingController();
  String _leadStatus = 'Cold';

  @override
  void dispose() {
    _nameCtrl.dispose();
    _companyCtrl.dispose();
    _valueCtrl.dispose();
    super.dispose();
  }

  void _addLead() {
    final name = _nameCtrl.text.trim();
    final company = _companyCtrl.text.trim();
    final val = double.tryParse(_valueCtrl.text.trim()) ?? 0.0;

    if (name.isEmpty || company.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please fill name and company.'), backgroundColor: AppColors.danger),
      );
      return;
      return;
    }

    AppState().addNewLead(name, company, val, 'Manual Portal Entry', _leadStatus);

    _nameCtrl.clear();
    _companyCtrl.clear();
    _valueCtrl.clear();
    Navigator.pop(context);
  }

  void _moveLead(Lead lead, String newStatus) {
    AppState().updateLeadStatus(lead.id, newStatus);
  }

  void _showAddLeadDialog() {
    showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: const Text('Capture New Sales Lead'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(controller: _nameCtrl, decoration: const InputDecoration(labelText: 'Lead Contact Name')),
                const SizedBox(height: 12),
                TextField(controller: _companyCtrl, decoration: const InputDecoration(labelText: 'Corporate Organization')),
                const SizedBox(height: 12),
                TextField(controller: _valueCtrl, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Estimated Deal Value (INR)')),
                const SizedBox(height: 16),
                DropdownButtonFormField<String>(
                  initialValue: _leadStatus,
                  decoration: const InputDecoration(labelText: 'Pipeline Stage'),
                  items: ['Cold', 'Warm', 'Hot'].map((st) => DropdownMenuItem(value: st, child: Text(st))).toList(),
                  onChanged: (val) => setDialogState(() => _leadStatus = val!),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
            ElevatedButton(onPressed: _addLead, child: const Text('Capture Lead')),
          ],
        ),
      ),
    );
  }

  void _showInvoiceDialog(Lead lead) {
    final state = AppState();
    final inventoryItems = state.inventoryForCurrentCompany;
    if (inventoryItems.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('No active warehouse inventory stocks found. Please set up stock items in Inventory first.'),
          backgroundColor: AppColors.danger,
        ),
      );
      return;
    }

    String selectedSku = inventoryItems.first.sku;
    final qtyCtrl = TextEditingController(text: '1');

    showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: Text('Convert Lead: ${lead.name}'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Generate automated invoice sales deduction & ledger credits.', style: TextStyle(color: Colors.grey, fontSize: 12)),
              const SizedBox(height: 16),
              const Text('Select Product from Warehouse stock:', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
              const SizedBox(height: 6),
              DropdownButtonFormField<String>(
                initialValue: selectedSku,
                isExpanded: true,
                items: inventoryItems.map((item) {
                  return DropdownMenuItem<String>(
                    value: item.sku,
                    child: Text('${item.name} (${item.sku}) - Price: ₹${item.unitPrice.toStringAsFixed(0)} (In stock: ${item.quantity})'),
                  );
                }).toList(),
                onChanged: (val) {
                  if (val != null) {
                    setDialogState(() => selectedSku = val);
                  }
                },
              ),
              const SizedBox(height: 16),
              TextField(
                controller: qtyCtrl,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(
                  labelText: 'Invoice Quantity to Deduct',
                  border: OutlineInputBorder(),
                ),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancel'),
            ),
            ElevatedButton.icon(
              onPressed: () {
                final qty = int.tryParse(qtyCtrl.text.trim()) ?? 0;
                if (qty <= 0) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Quantity must be greater than zero.'), backgroundColor: AppColors.danger),
                  );
                  return;
                }

                final error = state.convertLeadToSale(
                  leadId: lead.id,
                  inventorySku: selectedSku,
                  quantity: qty,
                );

                if (error != null) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text(error), backgroundColor: AppColors.danger),
                  );
                } else {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text('Invoice posted! Deducted stock & credited Accounts Receivable for lead: ${lead.name}'),
                      backgroundColor: AppColors.accent,
                    ),
                  );
                  Navigator.pop(context);
                }
              },
              icon: const Icon(Icons.receipt_long),
              label: const Text('Generate Invoice'),
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
        final leads = state.leadsForCurrentCompany;
        final totalPipelineValue = leads.fold<double>(0, (sum, l) => sum + l.dealValue);

        return Scaffold(
          backgroundColor: dark ? AppColors.darkBg : AppColors.lightBg,
          appBar: AppBar(
            title: const Text('CRM - Customer Relationship Management', style: TextStyle(fontWeight: FontWeight.bold)),
            backgroundColor: dark ? AppColors.darkSurface : AppColors.getPrimary(context),
            foregroundColor: Colors.white,
            actions: [
              ElevatedButton.icon(
                onPressed: _showAddLeadDialog,
                icon: const Icon(Icons.person_add_alt_1, size: 16),
                label: const Text('Add Lead'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.accent,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                ),
              ),
              const SizedBox(width: 16),
            ],
          ),
          body: Padding(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Analytics cards
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: AppColors.glassDecoration(context),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('Total Pipeline Capital', style: TextStyle(color: Colors.grey, fontSize: 13, fontWeight: FontWeight.bold)),
                            const SizedBox(height: 4),
                            Text('₹ ${totalPipelineValue.toStringAsFixed(2)}', style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: AppColors.getPrimary(context))),
                          ],
                        ),
                      ),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('Active Sales Leads', style: TextStyle(color: Colors.grey, fontSize: 13, fontWeight: FontWeight.bold)),
                            const SizedBox(height: 4),
                            Text('${leads.length}', style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: AppColors.getSecondary(context))),
                          ],
                        ),
                      ),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('High-Value Leads (₹100k+)', style: TextStyle(color: Colors.grey, fontSize: 13, fontWeight: FontWeight.bold)),
                            const SizedBox(height: 4),
                            Text('${leads.where((l) => l.dealValue >= 100000).length}', style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: AppColors.accent)),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 24),

                // Kanban Pipeline columns
                Expanded(
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      _buildPipelineColumn(leads, 'Cold Leads', 'Cold', Colors.blue, dark),
                      const SizedBox(width: 12),
                      _buildPipelineColumn(leads, 'Warm Leads', 'Warm', Colors.orange, dark),
                      const SizedBox(width: 12),
                      _buildPipelineColumn(leads, 'Hot Leads', 'Hot', Colors.red, dark),
                      const SizedBox(width: 12),
                      _buildPipelineColumn(leads, 'Won Sales', 'Won', Colors.green, dark),
                    ],
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildPipelineColumn(List<Lead> leads, String title, String status, Color statusColor, bool dark) {
    final filteredLeads = leads.where((l) => l.status == status).toList();

    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: dark ? AppColors.darkSurface : Colors.grey[200],
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: dark ? AppColors.darkBorder : Colors.grey[300]!),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Row(
                    children: [
                      Container(
                        width: 8,
                        height: 8,
                        decoration: BoxDecoration(color: statusColor, shape: BoxShape.circle),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          title, 
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(color: statusColor.withOpacity(0.15), borderRadius: BorderRadius.circular(10)),
                  child: Text('${filteredLeads.length}', style: TextStyle(color: statusColor, fontSize: 11, fontWeight: FontWeight.bold)),
                ),
              ],
            ),
            const Divider(height: 20),
            Expanded(
              child: ListView.builder(
                itemCount: filteredLeads.length,
                itemBuilder: (context, idx) {
                  final lead = filteredLeads[idx];
                  return Card(
                    margin: const EdgeInsets.only(bottom: 12),
                    elevation: 1,
                    child: Padding(
                      padding: const EdgeInsets.all(12.0),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(lead.name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                          const SizedBox(height: 2),
                          Text(lead.company, style: const TextStyle(fontSize: 11, color: Colors.grey)),
                          const SizedBox(height: 8),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text('₹ ${lead.dealValue.toStringAsFixed(0)}', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: AppColors.getPrimary(context))),
                              Text(lead.source, style: const TextStyle(fontSize: 9, color: Colors.grey)),
                            ],
                          ),
                          const Divider(height: 16),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.end,
                            children: [
                              if (status == 'Hot')
                                Expanded(
                                  child: ElevatedButton.icon(
                                    onPressed: () => _showInvoiceDialog(lead),
                                    icon: const Icon(Icons.receipt_long, size: 12),
                                    label: const Text('Convert Sale', style: TextStyle(fontSize: 10)),
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: AppColors.accent,
                                      padding: const EdgeInsets.symmetric(vertical: 4, horizontal: 8),
                                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                    ),
                                  ),
                                ),
                              if (status != 'Cold' && status != 'Won')
                                IconButton(
                                  icon: const Icon(Icons.arrow_back, size: 14),
                                  onPressed: () => _moveLead(lead, status == 'Hot' ? 'Warm' : 'Cold'),
                                  tooltip: 'Demote',
                                  padding: EdgeInsets.zero,
                                  constraints: const BoxConstraints(),
                                ),
                              const SizedBox(width: 8),
                              if (status != 'Hot' && status != 'Won')
                                IconButton(
                                  icon: const Icon(Icons.arrow_forward, size: 14),
                                  onPressed: () => _moveLead(lead, status == 'Cold' ? 'Warm' : 'Hot'),
                                  tooltip: 'Advance Stage',
                                  padding: EdgeInsets.zero,
                                  constraints: const BoxConstraints(),
                                ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}
