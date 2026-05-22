class InventoryItem {
  final String sku;
  final String name;
  final int quantity;
  final int capacity;
  final String location; // e.g. "Zone A - Rack 03"
  final String status;   // 'OK', 'LOW'
  final double unitPrice;
  final String companyCode;

  InventoryItem({
    required this.sku,
    required this.name,
    required this.quantity,
    required this.capacity,
    required this.location,
    required this.status,
    required this.unitPrice,
    required this.companyCode,
  });

  InventoryItem copyWith({
    String? name,
    int? quantity,
    int? capacity,
    String? location,
    String? status,
    double? unitPrice,
  }) {
    return InventoryItem(
      sku: sku,
      name: name ?? this.name,
      quantity: quantity ?? this.quantity,
      capacity: capacity ?? this.capacity,
      location: location ?? this.location,
      status: status ?? this.status,
      unitPrice: unitPrice ?? this.unitPrice,
      companyCode: companyCode,
    );
  }
}
