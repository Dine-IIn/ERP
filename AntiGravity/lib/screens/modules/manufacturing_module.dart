import 'package:flutter/material.dart';
import '../../theme/app_colors.dart';
import '../../app_state.dart';
import '../../models/production.dart';
import '../../models/inventory_item.dart';

class ManufacturingModuleScreen extends StatefulWidget {
  const ManufacturingModuleScreen({super.key});

  @override
  State<ManufacturingModuleScreen> createState() => _ManufacturingModuleScreenState();
}

class _ManufacturingModuleScreenState extends State<ManufacturingModuleScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  MasterProductionOrder? _selectedOrder;
  int _selectedBatchIndex = 0;

  // BOM recipe creator controllers
  final _recipeNameCtrl = TextEditingController();
  final _finishedSkuCtrl = TextEditingController();
  final List<BOMComponent> _tempComponents = [];
  final _rawSkuCtrl = TextEditingController();
  final _qtyCtrl = TextEditingController();
  String _selectedUnit = 'Units';

  String _formatDate(DateTime dt) {
    return "${dt.year}-${dt.month.toString().padLeft(2, '0')}-${dt.day.toString().padLeft(2, '0')}";
  }

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    _recipeNameCtrl.dispose();
    _finishedSkuCtrl.dispose();
    _rawSkuCtrl.dispose();
    _qtyCtrl.dispose();
    super.dispose();
  }

  void _addTempBOMComponent() {
    final sku = _rawSkuCtrl.text.trim();
    final qty = int.tryParse(_qtyCtrl.text.trim()) ?? 0;

    if (sku.isEmpty || qty <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter valid SKU and quantity.'), backgroundColor: AppColors.danger),
      );
      return;
    }

    setState(() {
      _tempComponents.add(BOMComponent(
        rawMaterialSku: sku,
        qtyRequired: qty,
        unit: _selectedUnit,
      ));
    });

    _rawSkuCtrl.clear();
    _qtyCtrl.clear();
  }

  void _saveBOMRecipe() {
    final name = _recipeNameCtrl.text.trim();
    final finishedSku = _finishedSkuCtrl.text.trim();

    if (name.isEmpty || finishedSku.isEmpty || _tempComponents.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('BOM recipe requires a name, finished SKU, and at least 1 raw ingredient.'), backgroundColor: AppColors.danger),
      );
      return;
    }

    AppState().addNewBOMRecipe(name, finishedSku, List.from(_tempComponents));
    
    _recipeNameCtrl.clear();
    _finishedSkuCtrl.clear();
    setState(() {
      _tempComponents.clear();
    });

    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('BOM Recipe registered successfully!'), backgroundColor: AppColors.accent),
    );
  }

  void _showCreateOrderDialog() {
    final state = AppState();
    final recipes = state.recipesForCurrentCompany;
    if (recipes.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('No active BOM Recipes found. Please register a recipe first.'), backgroundColor: AppColors.danger),
      );
      return;
    }

    final salesOrderCtrl = TextEditingController(text: 'SO-102');
    final totalQtyCtrl = TextEditingController(text: '10');
    final batchesCtrl = TextEditingController(text: '3,3,4');
    final monthsCtrl = TextEditingController(text: '1');
    String selectedRecipeId = recipes.first.id;

    showDialog(
      context: context,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setDialogState) {
            final dark = AppColors.isDark(context);
            return AlertDialog(
              backgroundColor: dark ? AppColors.darkSurface : Colors.white,
              title: const Row(
                children: [
                  Icon(Icons.playlist_add, color: AppColors.primary),
                  SizedBox(width: 12),
                  Text('New Master Production Order (MPS)', style: TextStyle(fontWeight: FontWeight.bold)),
                ],
              ),
              content: SingleChildScrollView(
                child: SizedBox(
                  width: 500,
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      TextField(
                        controller: salesOrderCtrl,
                        decoration: const InputDecoration(
                          labelText: 'Sales Order / Reference Code',
                          hintText: 'e.g. SO-102',
                        ),
                      ),
                      const SizedBox(height: 12),
                      DropdownButtonFormField<String>(
                        initialValue: selectedRecipeId,
                        decoration: const InputDecoration(labelText: 'BOM Finished Assembly Recipe'),
                        items: recipes.map((r) => DropdownMenuItem(value: r.id, child: Text('${r.name} (${r.finishedSku})'))).toList(),
                        onChanged: (val) => setDialogState(() => selectedRecipeId = val!),
                      ),
                      const SizedBox(height: 12),
                      TextField(
                        controller: totalQtyCtrl,
                        keyboardType: TextInputType.number,
                        decoration: const InputDecoration(
                          labelText: 'Total Planned Quantity',
                          hintText: 'e.g. 10',
                        ),
                        onChanged: (val) {
                          // Auto split suggested batch distribution
                          final total = int.tryParse(val) ?? 0;
                          if (total > 0) {
                            if (total == 10) {
                              batchesCtrl.text = '3,3,4';
                            } else {
                              final b1 = (total / 3).floor();
                              final b2 = (total / 3).floor();
                              final b3 = total - b1 - b2;
                              batchesCtrl.text = '$b1,$b2,$b3';
                            }
                          }
                        },
                      ),
                      const SizedBox(height: 12),
                      TextField(
                        controller: batchesCtrl,
                        decoration: const InputDecoration(
                          labelText: 'Batch Split Qty Wave Distribution (comma separated)',
                          hintText: 'e.g. 3,3,4',
                        ),
                      ),
                      const SizedBox(height: 12),
                      TextField(
                        controller: monthsCtrl,
                        keyboardType: TextInputType.number,
                        decoration: const InputDecoration(
                          labelText: 'Months to Complete Production',
                          hintText: 'e.g. 1',
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(context),
                  child: const Text('Cancel'),
                ),
                ElevatedButton.icon(
                  onPressed: () {
                    final salesOrder = salesOrderCtrl.text.trim();
                    final totalQty = int.tryParse(totalQtyCtrl.text.trim()) ?? 0;
                    final months = int.tryParse(monthsCtrl.text.trim()) ?? 1;
                    
                    final batchQtys = batchesCtrl.text
                        .split(',')
                        .map((s) => int.tryParse(s.trim()) ?? 0)
                        .where((q) => q > 0)
                        .toList();

                    if (salesOrder.isEmpty || totalQty <= 0 || batchQtys.isEmpty) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Please enter valid order details and batch splits.'), backgroundColor: AppColors.danger),
                      );
                      return;
                    }

                    final sumBatches = batchQtys.fold<int>(0, (sum, q) => sum + q);
                    if (sumBatches != totalQty) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text('Batch partition sum ($sumBatches) must equal total quantity ($totalQty).'), backgroundColor: AppColors.danger),
                      );
                      return;
                    }

                    state.createMasterProductionOrder(
                      salesOrderCode: salesOrder,
                      recipeId: selectedRecipeId,
                      totalQuantity: totalQty,
                      batchQuantities: batchQtys,
                      monthsPlanned: months,
                    );

                    Navigator.pop(context);
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Master Production Order & scheduled batches registered successfully.'), backgroundColor: AppColors.accent),
                    );
                  },
                  icon: const Icon(Icons.check),
                  label: const Text('Create MPS Order'),
                ),
              ],
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final dark = AppColors.isDark(context);
    final state = AppState();

    return ListenableBuilder(
      listenable: state,
      builder: (context, _) {
        final orders = state.masterProductionOrdersForCurrentCompany;
        final recipes = state.recipesForCurrentCompany;
        final jobs = state.jobsForCurrentCompany;

        // Auto resolve selected order reference if deleted or empty
        if (_selectedOrder != null) {
          final matched = orders.where((o) => o.id == _selectedOrder!.id).toList();
          if (matched.isNotEmpty) {
            _selectedOrder = matched.first;
          } else {
            _selectedOrder = orders.isNotEmpty ? orders.first : null;
          }
        } else if (orders.isNotEmpty) {
          _selectedOrder = orders.first;
        }

        return Scaffold(
          backgroundColor: dark ? AppColors.darkBg : AppColors.lightBg,
          appBar: AppBar(
            title: const Text('SAP PP-MPS: Manufacturing Production Control', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
            backgroundColor: dark ? AppColors.darkSurface : AppColors.getPrimary(context),
            foregroundColor: Colors.white,
            bottom: TabBar(
              controller: _tabController,
              isScrollable: true,
              labelColor: Colors.white,
              unselectedLabelColor: Colors.white70,
              indicatorColor: AppColors.secondary,
              indicatorWeight: 3.0,
              tabs: const [
                Tab(icon: Icon(Icons.table_chart, size: 20), text: 'Master Schedule (MPS)'),
                Tab(icon: Icon(Icons.timeline, size: 20), text: 'MRP Batch Planner'),
                Tab(icon: Icon(Icons.edit_note, size: 20), text: 'Bill of Materials (BOM)'),
                Tab(icon: Icon(Icons.sensors, size: 20), text: 'Live Telemetry'),
              ],
            ),
          ),
          body: TabBarView(
            controller: _tabController,
            children: [
              _buildMPSTab(orders, dark),
              _buildMRPPlannerTab(orders, dark),
              _buildBOMTab(recipes, jobs, dark),
              _buildTelemetryTab(dark),
            ],
          ),
        );
      },
    );
  }

  // TAB 1: MASTER PRODUCTION SCHEDULE
  Widget _buildMPSTab(List<MasterProductionOrder> orders, bool dark) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Enterprise Master Production Schedule (MPS)', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 4),
                  Text('Spreadsheet matrix of active Finished Goods customer orders and scheduled manufacturing batches.', style: TextStyle(color: dark ? Colors.grey : Colors.grey[600], fontSize: 12)),
                ],
              ),
              ElevatedButton.icon(
                onPressed: _showCreateOrderDialog,
                icon: const Icon(Icons.add, size: 16),
                label: const Text('Create Production Order'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.getPrimary(context),
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          if (orders.isEmpty)
            Container(
              padding: const EdgeInsets.all(32),
              alignment: Alignment.center,
              decoration: AppColors.glassDecoration(context),
              child: const Column(
                children: [
                  Icon(Icons.playlist_remove, size: 48, color: Colors.grey),
                  SizedBox(height: 12),
                  Text('No active Master Production Orders found.', style: TextStyle(fontWeight: FontWeight.bold)),
                  SizedBox(height: 4),
                  Text('Click "Create Production Order" to instantiate a phased multi-batch manufacturing pipeline.', style: TextStyle(color: Colors.grey, fontSize: 12)),
                ],
              ),
            )
          else
            Container(
              decoration: AppColors.glassDecoration(context),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(16),
                child: Table(
                  border: TableBorder.symmetric(inside: BorderSide(color: dark ? AppColors.darkBorder : Colors.grey[200]!)),
                  columnWidths: const {
                    0: FlexColumnWidth(2),
                    1: FlexColumnWidth(2),
                    2: FlexColumnWidth(4),
                    3: FlexColumnWidth(2),
                    4: FlexColumnWidth(2.5),
                    5: FlexColumnWidth(2.5),
                    6: FlexColumnWidth(2),
                    7: FlexColumnWidth(3),
                  },
                  children: [
                    TableRow(
                      decoration: BoxDecoration(color: dark ? AppColors.darkSurface : Colors.grey[100]),
                      children: const [
                        Padding(padding: EdgeInsets.symmetric(vertical: 12, horizontal: 16), child: Text('MPO Code', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12))),
                        Padding(padding: EdgeInsets.symmetric(vertical: 12, horizontal: 16), child: Text('Sales Ref', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12))),
                        Padding(padding: EdgeInsets.symmetric(vertical: 12, horizontal: 16), child: Text('Finished Good Assembly', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12))),
                        Padding(padding: EdgeInsets.symmetric(vertical: 12, horizontal: 16), child: Text('Total Qty', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12), textAlign: TextAlign.center)),
                        Padding(padding: EdgeInsets.symmetric(vertical: 12, horizontal: 16), child: Text('Release Date', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12))),
                        Padding(padding: EdgeInsets.symmetric(vertical: 12, horizontal: 16), child: Text('Delivery Target', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12))),
                        Padding(padding: EdgeInsets.symmetric(vertical: 12, horizontal: 16), child: Text('Status', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12))),
                        Padding(padding: EdgeInsets.symmetric(vertical: 12, horizontal: 16), child: Text('Staged Batches', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12), textAlign: TextAlign.center)),
                      ],
                    ),
                    ...orders.map((order) {
                      final isSelected = _selectedOrder?.id == order.id;
                      final rowColor = isSelected 
                          ? (dark ? Colors.blue.withOpacity(0.1) : Colors.blue.withOpacity(0.05))
                          : (orders.indexOf(order) % 2 == 0 ? Colors.transparent : (dark ? Colors.white.withOpacity(0.01) : Colors.grey[50]));

                      return TableRow(
                        decoration: BoxDecoration(
                          color: rowColor,
                          border: Border(left: BorderSide(color: isSelected ? AppColors.secondary : Colors.transparent, width: 4)),
                        ),
                        children: [
                          TableCell(
                            verticalAlignment: TableCellVerticalAlignment.middle,
                            child: Padding(
                              padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
                              child: Text(order.id.substring(0, 8).toUpperCase(), style: const TextStyle(fontFamily: 'monospace', fontWeight: FontWeight.bold)),
                            ),
                          ),
                          TableCell(
                            verticalAlignment: TableCellVerticalAlignment.middle,
                            child: Padding(
                              padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
                              child: Text(order.salesOrderCode, style: const TextStyle(fontWeight: FontWeight.w500)),
                            ),
                          ),
                          TableCell(
                            verticalAlignment: TableCellVerticalAlignment.middle,
                            child: Padding(
                              padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
                              child: Text(order.recipeName, maxLines: 1, overflow: TextOverflow.ellipsis),
                            ),
                          ),
                          TableCell(
                            verticalAlignment: TableCellVerticalAlignment.middle,
                            child: Padding(
                              padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
                              child: Text('${order.totalQuantity}', style: const TextStyle(fontWeight: FontWeight.bold), textAlign: TextAlign.center),
                            ),
                          ),
                          TableCell(
                            verticalAlignment: TableCellVerticalAlignment.middle,
                            child: Padding(
                              padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
                              child: Text(_formatDate(order.orderDate), style: const TextStyle(fontSize: 12)),
                            ),
                          ),
                          TableCell(
                            verticalAlignment: TableCellVerticalAlignment.middle,
                            child: Padding(
                              padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
                              child: Text(_formatDate(order.targetDeliveryDate), style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.secondary)),
                            ),
                          ),
                          TableCell(
                            verticalAlignment: TableCellVerticalAlignment.middle,
                            child: Padding(
                              padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
                              child: _buildStatusBadge(order.status),
                            ),
                          ),
                          TableCell(
                            verticalAlignment: TableCellVerticalAlignment.middle,
                            child: Padding(
                              padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 8),
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Text('${order.batches.length} Waves', style: const TextStyle(fontSize: 12)),
                                  const SizedBox(width: 8),
                                  ElevatedButton(
                                    onPressed: () {
                                      setState(() {
                                        _selectedOrder = order;
                                        _selectedBatchIndex = 0;
                                      });
                                      _tabController.animateTo(1);
                                    },
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: isSelected ? AppColors.secondary : AppColors.getPrimary(context).withOpacity(0.1),
                                      foregroundColor: isSelected ? Colors.white : AppColors.getPrimary(context),
                                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
                                    ),
                                    child: const Text('Manage', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ],
                      );
                    }),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }

  // TAB 2: MRP BATCH PLANNER TAB
  Widget _buildMRPPlannerTab(List<MasterProductionOrder> orders, bool dark) {
    if (_selectedOrder == null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(32.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.timeline_outlined, size: 64, color: Colors.grey),
              const SizedBox(height: 16),
              const Text('No Production Order Selected', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              const Text('Please navigate to the Master Schedule (MPS) tab to select or create a manufacturing order.', textAlign: TextAlign.center, style: TextStyle(color: Colors.grey)),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: () => _tabController.animateTo(0),
                child: const Text('Go to Master Schedule'),
              ),
            ],
          ),
        ),
      );
    }

    final order = _selectedOrder!;
    final batch = order.batches[_selectedBatchIndex];

    return Row(
      children: [
        // Left Column: Vertical Timeline of Batches
        Expanded(
          flex: 4,
          child: Container(
            decoration: BoxDecoration(
              border: Border(right: BorderSide(color: dark ? AppColors.darkBorder : Colors.grey[200]!)),
            ),
            child: ListView.separated(
              padding: const EdgeInsets.all(24),
              itemCount: order.batches.length,
              separatorBuilder: (context, idx) => const SizedBox(height: 16),
              itemBuilder: (context, index) {
                final b = order.batches[index];
                final isSelected = index == _selectedBatchIndex;

                return InkWell(
                  onTap: () {
                    setState(() {
                      _selectedBatchIndex = index;
                    });
                  },
                  borderRadius: BorderRadius.circular(12),
                  child: Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: isSelected 
                          ? (dark ? AppColors.primary.withOpacity(0.15) : AppColors.primary.withOpacity(0.06))
                          : (dark ? AppColors.darkCard : Colors.white),
                      border: Border.all(
                        color: isSelected ? AppColors.primary : (dark ? AppColors.darkBorder : Colors.grey[200]!),
                        width: isSelected ? 2.0 : 1.0,
                      ),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Row(
                      children: [
                        CircleAvatar(
                          radius: 18,
                          backgroundColor: isSelected ? AppColors.primary : (dark ? Colors.white10 : Colors.grey[200]),
                          child: Text(
                            b.batchNumber,
                            style: TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 12,
                              color: isSelected ? Colors.white : (dark ? Colors.white70 : Colors.black87),
                            ),
                          ),
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('Batch Quantity: ${b.batchQuantity} Units', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                              const SizedBox(height: 4),
                              Text('Scheduled: ${_formatDate(b.scheduledStartDate)}', style: const TextStyle(color: Colors.grey, fontSize: 11)),
                            ],
                          ),
                        ),
                        _buildStatusBadge(b.status),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
        ),
        // Right Column: Batch Details & Staged Procurement Spreadsheet Matrix
        Expanded(
          flex: 6,
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Batch Info Header
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Batch ${batch.batchNumber} Execution Room', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                        const SizedBox(height: 4),
                        Text('Planning production wave of ${batch.batchQuantity} items for parent order ${order.salesOrderCode}.', style: const TextStyle(color: Colors.grey, fontSize: 12)),
                      ],
                    ),
                    _buildStatusBadge(batch.status),
                  ],
                ),
                const Divider(height: 32),

                // Component Requirements Spreadsheet
                const Text('Material Requirements Planning (MRP) Matrix', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold)),
                const SizedBox(height: 12),
                Container(
                  decoration: AppColors.glassDecoration(context),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(12),
                    child: Table(
                      border: TableBorder.symmetric(inside: BorderSide(color: dark ? AppColors.darkBorder : Colors.grey[200]!)),
                      columnWidths: const {
                        0: FlexColumnWidth(4),
                        1: FlexColumnWidth(2),
                        2: FlexColumnWidth(2),
                        3: FlexColumnWidth(2),
                        4: FlexColumnWidth(3),
                      },
                      children: [
                        TableRow(
                          decoration: BoxDecoration(color: dark ? AppColors.darkSurface : Colors.grey[100]),
                          children: const [
                            Padding(padding: EdgeInsets.all(10.0), child: Text('Raw Component', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 11))),
                            Padding(padding: EdgeInsets.all(10.0), child: Text('Required', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 11), textAlign: TextAlign.center)),
                            Padding(padding: EdgeInsets.all(10.0), child: Text('Procured', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 11), textAlign: TextAlign.center)),
                            Padding(padding: EdgeInsets.all(10.0), child: Text('Warehouse', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 11), textAlign: TextAlign.center)),
                            Padding(padding: EdgeInsets.all(10.0), child: Text('Procurement Status', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 11))),
                          ],
                        ),
                        ...batch.componentsProcured.map((comp) {
                          final state = AppState();
                          final whItem = state.inventoryForCurrentCompany.firstWhere((i) => i.sku == comp.rawMaterialSku, 
                              orElse: () => InventoryItem(sku: comp.rawMaterialSku, name: 'Unknown Raw', quantity: 0, capacity: 100, location: '', status: '', unitPrice: 0.0, companyCode: ''));

                          final shortage = comp.qtyRequired > whItem.quantity;

                          return TableRow(
                            children: [
                              Padding(
                                padding: const EdgeInsets.all(10.0),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(whItem.name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12), maxLines: 1, overflow: TextOverflow.ellipsis),
                                    Text(comp.rawMaterialSku, style: const TextStyle(fontFamily: 'monospace', fontSize: 10, color: Colors.grey)),
                                  ],
                                ),
                              ),
                              Padding(padding: const EdgeInsets.all(10.0), child: Text('${comp.qtyRequired}', style: const TextStyle(fontWeight: FontWeight.bold), textAlign: TextAlign.center)),
                              Padding(padding: const EdgeInsets.all(10.0), child: Text('${comp.qtyProcured}', textAlign: TextAlign.center)),
                              Padding(
                                padding: const EdgeInsets.all(10.0),
                                child: Text(
                                  '${whItem.quantity}', 
                                  textAlign: TextAlign.center,
                                  style: TextStyle(
                                    color: shortage ? AppColors.danger : Colors.green,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ),
                              Padding(
                                padding: const EdgeInsets.all(8.0),
                                child: Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                  decoration: BoxDecoration(
                                    color: comp.procurementStatus == 'In Stock' 
                                        ? Colors.green.withOpacity(0.1) 
                                        : AppColors.secondary.withOpacity(0.1),
                                    borderRadius: BorderRadius.circular(6),
                                  ),
                                  child: Text(
                                    comp.procurementStatus,
                                    style: TextStyle(
                                      color: comp.procurementStatus == 'In Stock' ? Colors.green : AppColors.secondary,
                                      fontWeight: FontWeight.bold,
                                      fontSize: 10,
                                    ),
                                    textAlign: TextAlign.center,
                                  ),
                                ),
                              ),
                            ],
                          );
                        }),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 24),

                // Batch Actions console
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: dark ? AppColors.darkSurface : Colors.grey[50],
                    border: Border.all(color: dark ? AppColors.darkBorder : Colors.grey[200]!),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Batch Stage Actions', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          Expanded(
                            child: ElevatedButton.icon(
                              onPressed: batch.status == 'Draft' 
                                  ? () {
                                      final err = AppState().runMRPForBatch(order.id, _selectedBatchIndex);
                                      if (err != null) {
                                        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(err), backgroundColor: AppColors.danger));
                                      } else {
                                        ScaffoldMessenger.of(context).showSnackBar(
                                          const SnackBar(content: Text('MRP requirements compiled. Restock shortage levels calculated.'), backgroundColor: AppColors.accent),
                                        );
                                      }
                                    }
                                  : null,
                              icon: const Icon(Icons.analytics_outlined, size: 16),
                              label: const Text('Run MRP Stock Check', style: TextStyle(fontSize: 11)),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: AppColors.primary,
                                padding: const EdgeInsets.symmetric(vertical: 14),
                              ),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: ElevatedButton.icon(
                              onPressed: (batch.status == 'MRP Planned' || batch.status == 'Draft')
                                  ? () {
                                      final err = AppState().generateRequisitionAndProcureBatch(order.id, _selectedBatchIndex);
                                      if (err != null) {
                                        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(err), backgroundColor: AppColors.danger));
                                      } else {
                                        ScaffoldMessenger.of(context).showSnackBar(
                                          const SnackBar(content: Text('Purchase Order generated. Raw materials restocked. Ledger double-entry posted.'), backgroundColor: AppColors.accent),
                                        );
                                      }
                                    }
                                  : null,
                              icon: const Icon(Icons.shopping_cart_checkout, size: 16),
                              label: const Text('Procure Wave Parts', style: TextStyle(fontSize: 11)),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: Colors.orange,
                                padding: const EdgeInsets.symmetric(vertical: 14),
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton.icon(
                          onPressed: (batch.status == 'PO Placed' || batch.status == 'MRP Planned' || batch.status == 'Draft')
                              ? () {
                                  final err = AppState().executeBatchProductionRun(order.id, _selectedBatchIndex);
                                  if (err != null) {
                                    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(err), backgroundColor: AppColors.danger));
                                  } else {
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      const SnackBar(content: Text('Batch production completed! Finished goods compiled.'), backgroundColor: Colors.green),
                                    );
                                  }
                                }
                              : null,
                          icon: const Icon(Icons.precision_manufacturing, size: 18),
                          label: const Text('Execute Batch Run & Assemble Products', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.green,
                            padding: const EdgeInsets.symmetric(vertical: 16),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  // TAB 3: BILL OF MATERIALS EDITOR
  Widget _buildBOMTab(List<BOMRecipe> recipes, List<ProductionJob> jobs, bool dark) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24.0),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Left Column: Interactive BOM Creator
          Expanded(
            flex: 6,
            child: Column(
              children: [
                Container(
                  padding: const EdgeInsets.all(24),
                  decoration: AppColors.glassDecoration(context),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Bill of Materials (BOM) Recipe Architect', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                      const SizedBox(height: 4),
                      const Text('Declare finished-good assembly recipes and required raw component ratios.', style: TextStyle(color: Colors.grey, fontSize: 12)),
                      const Divider(height: 24),
                      
                      Row(
                        children: [
                          Expanded(
                            flex: 3,
                            child: TextField(
                              controller: _recipeNameCtrl,
                              decoration: const InputDecoration(labelText: 'Recipe Assembly Name', hintText: 'e.g. Relief Valve'),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            flex: 2,
                            child: TextField(
                              controller: _finishedSkuCtrl,
                              decoration: const InputDecoration(labelText: 'Finished Good SKU', hintText: 'e.g. VALVE-01'),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      const Divider(height: 16),
                      const Text('Add Raw Material Item:', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          Expanded(
                            flex: 4,
                            child: TextField(
                              controller: _rawSkuCtrl,
                              decoration: const InputDecoration(labelText: 'Raw Component SKU', hintText: 'e.g. STEEL-03'),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            flex: 2,
                            child: TextField(
                              controller: _qtyCtrl,
                              keyboardType: TextInputType.number,
                              decoration: const InputDecoration(labelText: 'Qty Required'),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            flex: 2,
                            child: DropdownButtonFormField<String>(
                              initialValue: _selectedUnit,
                              items: ['Units', 'Sheets', 'Kgs', 'Meters', 'Rolls'].map((u) => DropdownMenuItem(value: u, child: Text(u))).toList(),
                              onChanged: (val) => setState(() => _selectedUnit = val!),
                            ),
                          ),
                          const SizedBox(width: 12),
                          IconButton.filled(
                            onPressed: _addTempBOMComponent,
                            icon: const Icon(Icons.add_shopping_cart),
                            style: IconButton.styleFrom(backgroundColor: AppColors.getPrimary(context)),
                          ),
                        ],
                      ),
                      
                      if (_tempComponents.isNotEmpty) ...[
                        const SizedBox(height: 16),
                        const Text('Recipe Ingredient Components Draft:', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
                        const SizedBox(height: 8),
                        Table(
                          border: TableBorder.symmetric(inside: BorderSide(color: dark ? AppColors.darkBorder : Colors.grey[200]!)),
                          columnWidths: const {
                            0: FlexColumnWidth(6),
                            1: FlexColumnWidth(2),
                            2: FlexColumnWidth(2),
                          },
                          children: [
                            TableRow(
                              decoration: BoxDecoration(color: dark ? AppColors.darkBg : Colors.grey[100]),
                              children: const [
                                Padding(padding: EdgeInsets.all(8.0), child: Text('Raw SKU', style: TextStyle(fontWeight: FontWeight.bold))),
                                Padding(padding: EdgeInsets.all(8.0), child: Text('Qty', style: TextStyle(fontWeight: FontWeight.bold), textAlign: TextAlign.center)),
                                Padding(padding: EdgeInsets.all(8.0), child: Text('Unit', style: TextStyle(fontWeight: FontWeight.bold))),
                              ],
                            ),
                            ..._tempComponents.map((c) => TableRow(
                              children: [
                                Padding(padding: const EdgeInsets.all(8.0), child: Text(c.rawMaterialSku, style: const TextStyle(fontFamily: 'monospace'))),
                                Padding(padding: const EdgeInsets.all(8.0), child: Text('${c.qtyRequired}', textAlign: TextAlign.center)),
                                Padding(padding: const EdgeInsets.all(8.0), child: Text(c.unit)),
                              ],
                            )),
                          ],
                        ),
                        const SizedBox(height: 16),
                        ElevatedButton.icon(
                          onPressed: _saveBOMRecipe,
                          icon: const Icon(Icons.save),
                          label: const Text('Save BOM Recipe'),
                          style: ElevatedButton.styleFrom(backgroundColor: AppColors.accent),
                        ),
                      ],
                    ],
                  ),
                ),
                const SizedBox(height: 24),

                // Active Recipes Listing
                Container(
                  padding: const EdgeInsets.all(24),
                  decoration: AppColors.glassDecoration(context),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Registered BOM Assemblies', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
                      const SizedBox(height: 12),
                      if (recipes.isEmpty)
                        const Text('No recipes registered yet.')
                      else
                        ListView.separated(
                          shrinkWrap: true,
                          physics: const NeverScrollableScrollPhysics(),
                          itemCount: recipes.length,
                          separatorBuilder: (context, idx) => const Divider(height: 16),
                          itemBuilder: (context, idx) {
                            final rec = recipes[idx];
                            return Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(rec.name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                                const SizedBox(height: 4),
                                Text('Outputs SKU: ${rec.finishedSku} | Parts required: ${rec.components.map((c) => "${c.qtyRequired}x ${c.rawMaterialSku}").join(', ')}', style: const TextStyle(color: Colors.grey, fontSize: 11)),
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
          const SizedBox(width: 24),
          // Right Column: Legacy job list
          Expanded(
            flex: 4,
            child: Container(
              padding: const EdgeInsets.all(24),
              decoration: AppColors.glassDecoration(context),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Production Run Logging Archive', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 12),
                  if (jobs.isEmpty)
                    const Text('No production runs archived.')
                  else
                    ListView.separated(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      itemCount: jobs.length > 8 ? 8 : jobs.length,
                      separatorBuilder: (context, idx) => const Divider(height: 12),
                      itemBuilder: (context, idx) {
                        final job = jobs[idx];
                        return Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(job.recipeName, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold), maxLines: 1, overflow: TextOverflow.ellipsis),
                                  Text('Assembled Qty: ${job.qtyToProduce}', style: const TextStyle(color: Colors.grey, fontSize: 10)),
                                ],
                              ),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                              decoration: BoxDecoration(color: Colors.green.withOpacity(0.15), borderRadius: BorderRadius.circular(10)),
                              child: const Text('Completed', style: TextStyle(color: Colors.green, fontSize: 9, fontWeight: FontWeight.bold)),
                            ),
                          ],
                        );
                      },
                    ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  // TAB 4: TELEMETRY TAB
  Widget _buildTelemetryTab(bool dark) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Center(
        child: SizedBox(
          width: 800,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Row(
                children: [
                  Icon(Icons.sensors, color: AppColors.secondary),
                  SizedBox(width: 12),
                  Text('Active Industrial IoT Telemetry Gateways', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                ],
              ),
              const SizedBox(height: 4),
              const Text('Live machine stats representing factory operations. Gated through secure isolated protocols.', style: TextStyle(color: Colors.grey, fontSize: 12)),
              const Divider(height: 32),
              
              _buildMachineStats('CNC Heavy Milling Machine A', 0.85, 'Active Load: 85%', Colors.green, dark),
              const SizedBox(height: 20),
              _buildMachineStats('Hydraulic Pressure System 03', 0.94, 'Overload Warning: 94%', AppColors.danger, dark),
              const SizedBox(height: 20),
              _buildMachineStats('Main Packaging Conveyor Belt', 0.45, 'Optimal Speed: 45%', AppColors.primary, dark),
              const SizedBox(height: 20),
              _buildMachineStats('Robotic Welding Arm unit 07', 0.00, 'Standby Mode: Idle', Colors.grey, dark),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildMachineStats(String name, double load, String statusMsg, Color color, bool dark) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: dark ? AppColors.darkCard : Colors.white,
        border: Border.all(color: dark ? AppColors.darkBorder : Colors.grey[200]!),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
              Text(statusMsg, style: TextStyle(color: color, fontSize: 12, fontWeight: FontWeight.bold)),
            ],
          ),
          const SizedBox(height: 12),
          LinearProgressIndicator(
            value: load,
            backgroundColor: dark ? Colors.white.withOpacity(0.08) : Colors.grey[200],
            color: color,
            minHeight: 10,
            borderRadius: BorderRadius.circular(6),
          ),
        ],
      ),
    );
  }

  Widget _buildStatusBadge(String status) {
    Color bg = Colors.grey;
    Color fg = Colors.white;

    switch (status) {
      case 'Draft':
        bg = Colors.grey.withOpacity(0.15);
        fg = Colors.grey;
        break;
      case 'MRP Planned':
        bg = AppColors.primary.withOpacity(0.15);
        fg = AppColors.primary;
        break;
      case 'PO Placed':
        bg = Colors.orange.withOpacity(0.15);
        fg = Colors.orange;
        break;
      case 'Active':
      case 'In Production':
        bg = Colors.blue.withOpacity(0.15);
        fg = Colors.blue;
        break;
      case 'Completed':
        bg = Colors.green.withOpacity(0.15);
        fg = Colors.green;
        break;
      default:
        break;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        status,
        style: TextStyle(color: fg, fontWeight: FontWeight.bold, fontSize: 11),
      ),
    );
  }
}
