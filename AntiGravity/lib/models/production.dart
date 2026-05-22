class BOMComponent {
  final String rawMaterialSku;
  final int qtyRequired;
  final String unit;

  BOMComponent({
    required this.rawMaterialSku,
    required this.qtyRequired,
    required this.unit,
  });
}

class BOMRecipe {
  final String id;
  final String name;
  final String finishedSku;
  final List<BOMComponent> components;
  final String companyCode;

  BOMRecipe({
    required this.id,
    required this.name,
    required this.finishedSku,
    required this.components,
    required this.companyCode,
  });
}

class ProductionJob {
  final String id;
  final String recipeId;
  final String recipeName;
  final int qtyToProduce;
  final String status; // 'Pending', 'Completed', 'Failed'
  final DateTime date;
  final String companyCode;

  ProductionJob({
    required this.id,
    required this.recipeId,
    required this.recipeName,
    required this.qtyToProduce,
    required this.status,
    required this.date,
    required this.companyCode,
  });
}

class BatchComponentProcurement {
  final String rawMaterialSku;
  final int qtyRequired;
  int qtyProcured;
  final double estimatedCost;
  String procurementStatus; // 'Required', 'Requisitioned', 'Purchased', 'In Stock'

  BatchComponentProcurement({
    required this.rawMaterialSku,
    required this.qtyRequired,
    required this.qtyProcured,
    required this.estimatedCost,
    required this.procurementStatus,
  });

  Map<String, dynamic> toJson() => {
        'rawMaterialSku': rawMaterialSku,
        'qtyRequired': qtyRequired,
        'qtyProcured': qtyProcured,
        'estimatedCost': estimatedCost,
        'procurementStatus': procurementStatus,
      };

  factory BatchComponentProcurement.fromJson(Map<String, dynamic> json) => BatchComponentProcurement(
        rawMaterialSku: json['rawMaterialSku'],
        qtyRequired: json['qtyRequired'],
        qtyProcured: json['qtyProcured'] ?? 0,
        estimatedCost: (json['estimatedCost'] as num).toDouble(),
        procurementStatus: json['procurementStatus'] ?? 'Required',
      );
}

class ProductionBatchRun {
  final String id;
  final String batchNumber; // e.g. B-01, B-02
  final int batchQuantity;
  final DateTime scheduledStartDate;
  String status; // 'Draft', 'PR Generated', 'PO Placed', 'In Production', 'Completed'
  final List<BatchComponentProcurement> componentsProcured;

  ProductionBatchRun({
    required this.id,
    required this.batchNumber,
    required this.batchQuantity,
    required this.scheduledStartDate,
    required this.status,
    required this.componentsProcured,
  });

  Map<String, dynamic> toJson() => {
        'id': id,
        'batchNumber': batchNumber,
        'batchQuantity': batchQuantity,
        'scheduledStartDate': scheduledStartDate.toIso8601String(),
        'status': status,
        'componentsProcured': componentsProcured.map((c) => c.toJson()).toList(),
      };

  factory ProductionBatchRun.fromJson(Map<String, dynamic> json) => ProductionBatchRun(
        id: json['id'],
        batchNumber: json['batchNumber'],
        batchQuantity: json['batchQuantity'],
        scheduledStartDate: DateTime.parse(json['scheduledStartDate']),
        status: json['status'],
        componentsProcured: (json['componentsProcured'] as List)
            .map((c) => BatchComponentProcurement.fromJson(c))
            .toList(),
      );
}

class MasterProductionOrder {
  final String id;
  final String salesOrderCode; // e.g. SO-101
  final String recipeId;
  final String recipeName;
  final int totalQuantity;
  final DateTime orderDate;
  final DateTime targetDeliveryDate;
  String status; // 'Active', 'Completed'
  final List<ProductionBatchRun> batches;
  final String companyCode;

  MasterProductionOrder({
    required this.id,
    required this.salesOrderCode,
    required this.recipeId,
    required this.recipeName,
    required this.totalQuantity,
    required this.orderDate,
    required this.targetDeliveryDate,
    required this.status,
    required this.batches,
    required this.companyCode,
  });

  Map<String, dynamic> toJson() => {
        'id': id,
        'salesOrderCode': salesOrderCode,
        'recipeId': recipeId,
        'recipeName': recipeName,
        'totalQuantity': totalQuantity,
        'orderDate': orderDate.toIso8601String(),
        'targetDeliveryDate': targetDeliveryDate.toIso8601String(),
        'status': status,
        'batches': batches.map((b) => b.toJson()).toList(),
        'companyCode': companyCode,
      };

  factory MasterProductionOrder.fromJson(Map<String, dynamic> json) => MasterProductionOrder(
        id: json['id'],
        salesOrderCode: json['salesOrderCode'],
        recipeId: json['recipeId'],
        recipeName: json['recipeName'],
        totalQuantity: json['totalQuantity'],
        orderDate: DateTime.parse(json['orderDate']),
        targetDeliveryDate: DateTime.parse(json['targetDeliveryDate']),
        status: json['status'],
        batches: (json['batches'] as List)
            .map((b) => ProductionBatchRun.fromJson(b))
            .toList(),
        companyCode: json['companyCode'],
      );
}
