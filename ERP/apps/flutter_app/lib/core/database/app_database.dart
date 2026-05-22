import 'package:drift/drift.dart';
import 'package:drift_flutter/drift_flutter.dart';

part 'app_database.g.dart';

class OfflineQueueItems extends Table {
  TextColumn get id => text()();
  TextColumn get operation => text()();
  TextColumn get payloadJson => text()();
  DateTimeColumn get createdAt => dateTime()();
  DateTimeColumn get syncedAt => dateTime().nullable()();

  @override
  Set<Column> get primaryKey => {id};
}

class CachedInventoryItems extends Table {
  TextColumn get id => text()();
  TextColumn get sku => text()();
  TextColumn get name => text()();
  RealColumn get availableQuantity => real()();
  DateTimeColumn get updatedAt => dateTime()();

  @override
  Set<Column> get primaryKey => {id};
}

@DriftDatabase(tables: [OfflineQueueItems, CachedInventoryItems])
class AppDatabase extends _$AppDatabase {
  AppDatabase() : super(_openConnection());

  @override
  int get schemaVersion => 1;
}

QueryExecutor _openConnection() {
  return driftDatabase(name: 'enterprise_erp');
}
