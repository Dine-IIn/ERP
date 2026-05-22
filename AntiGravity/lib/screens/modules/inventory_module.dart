import 'package:flutter/material.dart';
import '../../theme/app_colors.dart';
import '../../app_state.dart';
import '../../models/inventory_item.dart';
import '../../models/chat.dart';

class InventoryModuleScreen extends StatefulWidget {
  const InventoryModuleScreen({super.key});

  @override
  State<InventoryModuleScreen> createState() => _InventoryModuleScreenState();
}

class _InventoryModuleScreenState extends State<InventoryModuleScreen> {
  final _searchController = TextEditingController();
  final _skuCtrl = TextEditingController();
  final _nameCtrl = TextEditingController();
  final _qtyCtrl = TextEditingController();
  final _capCtrl = TextEditingController();
  final _locCtrl = TextEditingController();
  final _priceCtrl = TextEditingController();

  String _searchedDetails = '';

  @override
  void dispose() {
    _searchController.dispose();
    _skuCtrl.dispose();
    _nameCtrl.dispose();
    _qtyCtrl.dispose();
    _capCtrl.dispose();
    _locCtrl.dispose();
    _priceCtrl.dispose();
    super.dispose();
  }

  void _searchRegistry(String text, List<InventoryItem> stocks) {
    if (text.isEmpty) {
      setState(() => _searchedDetails = '');
      return;
    }
    
    final query = text.toLowerCase();
    final matched = stocks.where((s) => s.sku.toLowerCase().contains(query) || s.name.toLowerCase().contains(query)).toList();

    setState(() {
      if (matched.isNotEmpty) {
        final item = matched.first;
        _searchedDetails = 'FOUND SKU: ${item.sku}\nName: ${item.name}\nQuantity: ${item.quantity}/${item.capacity} units\nWarehouse Address: ${item.location}\nAlert Level: ${item.status}\nUnit Wholesale Value: ₹${item.unitPrice.toStringAsFixed(2)}';
      } else {
        _searchedDetails = 'No matching product registry record found for query: "$text"';
      }
    });
  }

  void _showAddStockDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Add New Stock Registry'),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(controller: _skuCtrl, decoration: const InputDecoration(labelText: 'Unique SKU (e.g. PIPE-01)')),
              const SizedBox(height: 12),
              TextField(controller: _nameCtrl, decoration: const InputDecoration(labelText: 'Item Name')),
              const SizedBox(height: 12),
              TextField(controller: _qtyCtrl, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Initial Quantity')),
              const SizedBox(height: 12),
              TextField(controller: _capCtrl, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Max Bin Capacity')),
              const SizedBox(height: 12),
              TextField(controller: _locCtrl, decoration: const InputDecoration(labelText: 'Zoning Location (e.g. Zone A - Rack 04)')),
              const SizedBox(height: 12),
              TextField(controller: _priceCtrl, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Estimated Unit Price (INR)')),
            ],
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () {
              final sku = _skuCtrl.text.trim();
              final name = _nameCtrl.text.trim();
              final qty = int.tryParse(_qtyCtrl.text.trim()) ?? 0;
              final cap = int.tryParse(_capCtrl.text.trim()) ?? 100;
              final loc = _locCtrl.text.trim();
              final price = double.tryParse(_priceCtrl.text.trim()) ?? 0.0;

              if (sku.isEmpty || name.isEmpty || qty < 0 || price <= 0) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Please fill all mandatory fields correctly.'), backgroundColor: AppColors.danger),
                );
                return;
              }

              AppState().addNewInventoryItem(sku, name, qty, cap, loc.isEmpty ? 'Zone D - Box' : loc, price);
              
              _skuCtrl.clear();
              _nameCtrl.clear();
              _qtyCtrl.clear();
              _capCtrl.clear();
              _locCtrl.clear();
              _priceCtrl.clear();
              Navigator.pop(context);
            },
            child: const Text('Register Item'),
          ),
        ],
      ),
    );
  }

  void _showRestockDialog(InventoryItem item) {
    final qtyCtrl = TextEditingController(text: '20');

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Procure Restock: ${item.name}'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('SKU: ${item.sku} | Unit wholesale cost: ₹${(item.unitPrice * 0.7).toStringAsFixed(0)} (70% standard)', style: const TextStyle(color: Colors.grey, fontSize: 12)),
            const SizedBox(height: 16),
            const Text('Enter restock quantity to purchase and load into warehouse:'),
            const SizedBox(height: 12),
            TextField(
              controller: qtyCtrl,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(labelText: 'Quantity to order'),
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
                  const SnackBar(content: Text('Procurement quantity must be positive.'), backgroundColor: AppColors.danger),
                );
                return;
              }

              final totalWholesaleCost = qty * item.unitPrice * 0.7;
              
              final state = AppState();
              
              // 1. Post dynamic general ledger debit cash expense for steel restock
              state.addManualLedgerTransaction(
                'ACC-101',
                'Cash & Bank',
                'Debit', // Asset cash outflow or specific debit
                totalWholesaleCost,
                'Wholesale procurement restock order: $qty units of SKU ${item.sku}',
              );

              // 2. Increment stock quantity
              final compIdx = state.inventoryForCurrentCompany.indexWhere((i) => i.sku == item.sku);
              if (compIdx != -1) {
                final matchedItem = state.inventoryForCurrentCompany[compIdx];
                final newQty = matchedItem.quantity + qty;
                state.inventoryForCurrentCompany[compIdx] = matchedItem.copyWith(
                  quantity: newQty,
                  status: newQty < (matchedItem.capacity * 0.1) ? 'LOW' : 'OK',
                );
                state.sendChatMessage(
                  'Wholesale restock completed! Procured $qty units of "${item.name}" (SKU: ${item.sku}) for a total wholesale price of Rs. ${totalWholesaleCost.toStringAsFixed(2)}. Ledger updated.',
                  ChatType.general,
                );
              }

              Navigator.pop(context);
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text('Restocked successfully! Procured $qty units at ₹${totalWholesaleCost.toStringAsFixed(2)}'),
                  backgroundColor: AppColors.accent,
                ),
              );
            },
            icon: const Icon(Icons.shopping_cart),
            label: const Text('Purchase Restock'),
          ),
        ],
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
        final stocks = state.inventoryForCurrentCompany;

        return Scaffold(
          backgroundColor: dark ? AppColors.darkBg : AppColors.lightBg,
          appBar: AppBar(
            title: const Text('Inventory & Smart Warehouse zoning', style: TextStyle(fontWeight: FontWeight.bold)),
            backgroundColor: dark ? AppColors.darkSurface : AppColors.getPrimary(context),
            foregroundColor: Colors.white,
            actions: [
              ElevatedButton.icon(
                onPressed: _showAddStockDialog,
                icon: const Icon(Icons.add, size: 16),
                label: const Text('New Item'),
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
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Left Column: Live Stock Controls
                    Expanded(
                      flex: 6,
                      child: Container(
                        padding: const EdgeInsets.all(24),
                        decoration: AppColors.glassDecoration(context),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('Warehouse Stock Tracking Logs', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                            const SizedBox(height: 4),
                            const Text('Capacity checks indicate restock urgency levels.', style: TextStyle(color: Colors.grey, fontSize: 12)),
                            const Divider(height: 24),
                            
                            ListView.separated(
                              shrinkWrap: true,
                              physics: const NeverScrollableScrollPhysics(),
                              itemCount: stocks.length,
                              separatorBuilder: (context, idx) => const Divider(height: 16),
                              itemBuilder: (context, idx) {
                                final item = stocks[idx];
                                final pct = (item.quantity / item.capacity).clamp(0.0, 1.0);
                                final isLow = item.status == 'LOW';

                                return Row(
                                  children: [
                                    Container(
                                      padding: const EdgeInsets.all(12),
                                      decoration: BoxDecoration(
                                        color: (isLow ? AppColors.danger : AppColors.accent).withOpacity(0.1),
                                        borderRadius: BorderRadius.circular(10),
                                      ),
                                      child: Icon(isLow ? Icons.warning_amber : Icons.check_circle_outline, color: isLow ? AppColors.danger : AppColors.accent, size: 24),
                                    ),
                                    const SizedBox(width: 16),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Row(
                                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                            children: [
                                              Expanded(
                                                child: Text(
                                                  item.name, 
                                                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                                                  overflow: TextOverflow.ellipsis,
                                                ),
                                              ),
                                              Text('${item.quantity} / ${item.capacity} units', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                                              const SizedBox(width: 16),
                                              TextButton.icon(
                                                onPressed: () => _showRestockDialog(item),
                                                icon: const Icon(Icons.shopping_cart, size: 12),
                                                label: const Text('Restock', style: TextStyle(fontSize: 11)),
                                                style: TextButton.styleFrom(
                                                  foregroundColor: Colors.white,
                                                  backgroundColor: isLow ? AppColors.danger : AppColors.getPrimary(context),
                                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                                ),
                                              ),
                                            ],
                                          ),
                                          const SizedBox(height: 8),
                                          LinearProgressIndicator(
                                            value: pct,
                                            backgroundColor: dark ? Colors.white.withOpacity(0.08) : Colors.grey[200],
                                            color: isLow ? AppColors.danger : AppColors.accent,
                                            minHeight: 6,
                                            borderRadius: BorderRadius.circular(3),
                                          ),
                                          const SizedBox(height: 6),
                                          Text('SKU ID: ${item.sku} | Location: ${item.location} | Unit Price: ₹${item.unitPrice.toStringAsFixed(0)}', style: const TextStyle(color: Colors.grey, fontSize: 11)),
                                        ],
                                      ),
                                    ),
                                  ],
                                );
                              },
                            ),
                          ],
                        ),
                      ),
                    ),
                    
                    const SizedBox(width: 24),

                    // Right Column: Zoning Coordinates Map & Serial Search
                    Expanded(
                      flex: 4,
                      child: Column(
                        children: [
                          // Serial Search Registry
                          Container(
                            padding: const EdgeInsets.all(24),
                            decoration: AppColors.glassDecoration(context),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    const Icon(Icons.qr_code_scanner, color: AppColors.primary),
                                    const SizedBox(width: 8),
                                    const Text('Serial & SKU Registry Search', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                                  ],
                                ),
                                const Divider(height: 24),
                                TextField(
                                  controller: _searchController,
                                  decoration: const InputDecoration(
                                    labelText: 'Enter SKU / Product Name',
                                    prefixIcon: Icon(Icons.search),
                                  ),
                                  onChanged: (text) => _searchRegistry(text, stocks),
                                ),
                                if (_searchedDetails.isNotEmpty) ...[
                                  const SizedBox(height: 16),
                                  Container(
                                    width: double.infinity,
                                    padding: const EdgeInsets.all(14),
                                    decoration: BoxDecoration(
                                      color: dark ? AppColors.darkBg : Colors.grey[100],
                                      borderRadius: BorderRadius.circular(10),
                                      border: Border.all(color: dark ? AppColors.darkBorder : Colors.grey[300]!),
                                    ),
                                    child: Text(
                                      _searchedDetails,
                                      style: const TextStyle(fontSize: 12, height: 1.4, fontFamily: 'monospace'),
                                    ),
                                  ),
                                ],
                              ],
                            ),
                          ),
                          
                          const SizedBox(height: 24),

                          // Visual Warehouse Rack Planner
                          Container(
                            padding: const EdgeInsets.all(24),
                            decoration: AppColors.glassDecoration(context),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text('Visual Rack Zoning Map', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                                const SizedBox(height: 12),
                                GridView.builder(
                                  shrinkWrap: true,
                                  physics: const NeverScrollableScrollPhysics(),
                                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                                    crossAxisCount: 3,
                                    crossAxisSpacing: 8,
                                    mainAxisSpacing: 8,
                                    childAspectRatio: 1.5,
                                  ),
                                  itemCount: 9,
                                  itemBuilder: (context, idx) {
                                    final zone = idx < 3 ? 'A' : (idx < 6 ? 'B' : 'C');
                                    final num = (idx % 3) + 1;
                                    final isOccupied = idx % 2 == 0;
                                    
                                    return Container(
                                      decoration: BoxDecoration(
                                        color: isOccupied 
                                            ? AppColors.getPrimary(context).withOpacity(0.08) 
                                            : Colors.transparent,
                                        borderRadius: BorderRadius.circular(8),
                                        border: Border.all(
                                          color: isOccupied ? AppColors.getPrimary(context) : (dark ? AppColors.darkBorder : Colors.grey[300]!),
                                          width: 1.2,
                                        ),
                                      ),
                                      child: Center(
                                        child: Column(
                                          mainAxisAlignment: MainAxisAlignment.center,
                                          children: [
                                            Text('Rack $zone$num', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                                            Text(
                                              isOccupied ? 'Occupied' : 'Vacant',
                                              style: TextStyle(fontSize: 9, color: isOccupied ? AppColors.getPrimary(context) : Colors.grey, fontWeight: FontWeight.bold),
                                            ),
                                          ],
                                        ),
                                      ),
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
              ],
            ),
          ),
        );
      },
    );
  }
}
