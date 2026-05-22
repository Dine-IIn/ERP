class InventoryMovement {
  const InventoryMovement({
    required this.id,
    required this.productId,
    required this.warehouseId,
    required this.type,
    required this.quantity,
  });

  final String id;
  final String productId;
  final String warehouseId;
  final String type;
  final double quantity;
}
