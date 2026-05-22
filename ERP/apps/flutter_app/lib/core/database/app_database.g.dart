// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'app_database.dart';

// ignore_for_file: type=lint
class $OfflineQueueItemsTable extends OfflineQueueItems
    with TableInfo<$OfflineQueueItemsTable, OfflineQueueItem> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $OfflineQueueItemsTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<String> id = GeneratedColumn<String>(
      'id', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _operationMeta =
      const VerificationMeta('operation');
  @override
  late final GeneratedColumn<String> operation = GeneratedColumn<String>(
      'operation', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _payloadJsonMeta =
      const VerificationMeta('payloadJson');
  @override
  late final GeneratedColumn<String> payloadJson = GeneratedColumn<String>(
      'payload_json', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _createdAtMeta =
      const VerificationMeta('createdAt');
  @override
  late final GeneratedColumn<DateTime> createdAt = GeneratedColumn<DateTime>(
      'created_at', aliasedName, false,
      type: DriftSqlType.dateTime, requiredDuringInsert: true);
  static const VerificationMeta _syncedAtMeta =
      const VerificationMeta('syncedAt');
  @override
  late final GeneratedColumn<DateTime> syncedAt = GeneratedColumn<DateTime>(
      'synced_at', aliasedName, true,
      type: DriftSqlType.dateTime, requiredDuringInsert: false);
  @override
  List<GeneratedColumn> get $columns =>
      [id, operation, payloadJson, createdAt, syncedAt];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'offline_queue_items';
  @override
  VerificationContext validateIntegrity(Insertable<OfflineQueueItem> instance,
      {bool isInserting = false}) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    } else if (isInserting) {
      context.missing(_idMeta);
    }
    if (data.containsKey('operation')) {
      context.handle(_operationMeta,
          operation.isAcceptableOrUnknown(data['operation']!, _operationMeta));
    } else if (isInserting) {
      context.missing(_operationMeta);
    }
    if (data.containsKey('payload_json')) {
      context.handle(
          _payloadJsonMeta,
          payloadJson.isAcceptableOrUnknown(
              data['payload_json']!, _payloadJsonMeta));
    } else if (isInserting) {
      context.missing(_payloadJsonMeta);
    }
    if (data.containsKey('created_at')) {
      context.handle(_createdAtMeta,
          createdAt.isAcceptableOrUnknown(data['created_at']!, _createdAtMeta));
    } else if (isInserting) {
      context.missing(_createdAtMeta);
    }
    if (data.containsKey('synced_at')) {
      context.handle(_syncedAtMeta,
          syncedAt.isAcceptableOrUnknown(data['synced_at']!, _syncedAtMeta));
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  OfflineQueueItem map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return OfflineQueueItem(
      id: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}id'])!,
      operation: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}operation'])!,
      payloadJson: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}payload_json'])!,
      createdAt: attachedDatabase.typeMapping
          .read(DriftSqlType.dateTime, data['${effectivePrefix}created_at'])!,
      syncedAt: attachedDatabase.typeMapping
          .read(DriftSqlType.dateTime, data['${effectivePrefix}synced_at']),
    );
  }

  @override
  $OfflineQueueItemsTable createAlias(String alias) {
    return $OfflineQueueItemsTable(attachedDatabase, alias);
  }
}

class OfflineQueueItem extends DataClass
    implements Insertable<OfflineQueueItem> {
  final String id;
  final String operation;
  final String payloadJson;
  final DateTime createdAt;
  final DateTime? syncedAt;
  const OfflineQueueItem(
      {required this.id,
      required this.operation,
      required this.payloadJson,
      required this.createdAt,
      this.syncedAt});
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<String>(id);
    map['operation'] = Variable<String>(operation);
    map['payload_json'] = Variable<String>(payloadJson);
    map['created_at'] = Variable<DateTime>(createdAt);
    if (!nullToAbsent || syncedAt != null) {
      map['synced_at'] = Variable<DateTime>(syncedAt);
    }
    return map;
  }

  OfflineQueueItemsCompanion toCompanion(bool nullToAbsent) {
    return OfflineQueueItemsCompanion(
      id: Value(id),
      operation: Value(operation),
      payloadJson: Value(payloadJson),
      createdAt: Value(createdAt),
      syncedAt: syncedAt == null && nullToAbsent
          ? const Value.absent()
          : Value(syncedAt),
    );
  }

  factory OfflineQueueItem.fromJson(Map<String, dynamic> json,
      {ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return OfflineQueueItem(
      id: serializer.fromJson<String>(json['id']),
      operation: serializer.fromJson<String>(json['operation']),
      payloadJson: serializer.fromJson<String>(json['payloadJson']),
      createdAt: serializer.fromJson<DateTime>(json['createdAt']),
      syncedAt: serializer.fromJson<DateTime?>(json['syncedAt']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<String>(id),
      'operation': serializer.toJson<String>(operation),
      'payloadJson': serializer.toJson<String>(payloadJson),
      'createdAt': serializer.toJson<DateTime>(createdAt),
      'syncedAt': serializer.toJson<DateTime?>(syncedAt),
    };
  }

  OfflineQueueItem copyWith(
          {String? id,
          String? operation,
          String? payloadJson,
          DateTime? createdAt,
          Value<DateTime?> syncedAt = const Value.absent()}) =>
      OfflineQueueItem(
        id: id ?? this.id,
        operation: operation ?? this.operation,
        payloadJson: payloadJson ?? this.payloadJson,
        createdAt: createdAt ?? this.createdAt,
        syncedAt: syncedAt.present ? syncedAt.value : this.syncedAt,
      );
  OfflineQueueItem copyWithCompanion(OfflineQueueItemsCompanion data) {
    return OfflineQueueItem(
      id: data.id.present ? data.id.value : this.id,
      operation: data.operation.present ? data.operation.value : this.operation,
      payloadJson:
          data.payloadJson.present ? data.payloadJson.value : this.payloadJson,
      createdAt: data.createdAt.present ? data.createdAt.value : this.createdAt,
      syncedAt: data.syncedAt.present ? data.syncedAt.value : this.syncedAt,
    );
  }

  @override
  String toString() {
    return (StringBuffer('OfflineQueueItem(')
          ..write('id: $id, ')
          ..write('operation: $operation, ')
          ..write('payloadJson: $payloadJson, ')
          ..write('createdAt: $createdAt, ')
          ..write('syncedAt: $syncedAt')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode =>
      Object.hash(id, operation, payloadJson, createdAt, syncedAt);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is OfflineQueueItem &&
          other.id == this.id &&
          other.operation == this.operation &&
          other.payloadJson == this.payloadJson &&
          other.createdAt == this.createdAt &&
          other.syncedAt == this.syncedAt);
}

class OfflineQueueItemsCompanion extends UpdateCompanion<OfflineQueueItem> {
  final Value<String> id;
  final Value<String> operation;
  final Value<String> payloadJson;
  final Value<DateTime> createdAt;
  final Value<DateTime?> syncedAt;
  final Value<int> rowid;
  const OfflineQueueItemsCompanion({
    this.id = const Value.absent(),
    this.operation = const Value.absent(),
    this.payloadJson = const Value.absent(),
    this.createdAt = const Value.absent(),
    this.syncedAt = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  OfflineQueueItemsCompanion.insert({
    required String id,
    required String operation,
    required String payloadJson,
    required DateTime createdAt,
    this.syncedAt = const Value.absent(),
    this.rowid = const Value.absent(),
  })  : id = Value(id),
        operation = Value(operation),
        payloadJson = Value(payloadJson),
        createdAt = Value(createdAt);
  static Insertable<OfflineQueueItem> custom({
    Expression<String>? id,
    Expression<String>? operation,
    Expression<String>? payloadJson,
    Expression<DateTime>? createdAt,
    Expression<DateTime>? syncedAt,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (operation != null) 'operation': operation,
      if (payloadJson != null) 'payload_json': payloadJson,
      if (createdAt != null) 'created_at': createdAt,
      if (syncedAt != null) 'synced_at': syncedAt,
      if (rowid != null) 'rowid': rowid,
    });
  }

  OfflineQueueItemsCompanion copyWith(
      {Value<String>? id,
      Value<String>? operation,
      Value<String>? payloadJson,
      Value<DateTime>? createdAt,
      Value<DateTime?>? syncedAt,
      Value<int>? rowid}) {
    return OfflineQueueItemsCompanion(
      id: id ?? this.id,
      operation: operation ?? this.operation,
      payloadJson: payloadJson ?? this.payloadJson,
      createdAt: createdAt ?? this.createdAt,
      syncedAt: syncedAt ?? this.syncedAt,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<String>(id.value);
    }
    if (operation.present) {
      map['operation'] = Variable<String>(operation.value);
    }
    if (payloadJson.present) {
      map['payload_json'] = Variable<String>(payloadJson.value);
    }
    if (createdAt.present) {
      map['created_at'] = Variable<DateTime>(createdAt.value);
    }
    if (syncedAt.present) {
      map['synced_at'] = Variable<DateTime>(syncedAt.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('OfflineQueueItemsCompanion(')
          ..write('id: $id, ')
          ..write('operation: $operation, ')
          ..write('payloadJson: $payloadJson, ')
          ..write('createdAt: $createdAt, ')
          ..write('syncedAt: $syncedAt, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

class $CachedInventoryItemsTable extends CachedInventoryItems
    with TableInfo<$CachedInventoryItemsTable, CachedInventoryItem> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $CachedInventoryItemsTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<String> id = GeneratedColumn<String>(
      'id', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _skuMeta = const VerificationMeta('sku');
  @override
  late final GeneratedColumn<String> sku = GeneratedColumn<String>(
      'sku', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _nameMeta = const VerificationMeta('name');
  @override
  late final GeneratedColumn<String> name = GeneratedColumn<String>(
      'name', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _availableQuantityMeta =
      const VerificationMeta('availableQuantity');
  @override
  late final GeneratedColumn<double> availableQuantity =
      GeneratedColumn<double>('available_quantity', aliasedName, false,
          type: DriftSqlType.double, requiredDuringInsert: true);
  static const VerificationMeta _updatedAtMeta =
      const VerificationMeta('updatedAt');
  @override
  late final GeneratedColumn<DateTime> updatedAt = GeneratedColumn<DateTime>(
      'updated_at', aliasedName, false,
      type: DriftSqlType.dateTime, requiredDuringInsert: true);
  @override
  List<GeneratedColumn> get $columns =>
      [id, sku, name, availableQuantity, updatedAt];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'cached_inventory_items';
  @override
  VerificationContext validateIntegrity(
      Insertable<CachedInventoryItem> instance,
      {bool isInserting = false}) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    } else if (isInserting) {
      context.missing(_idMeta);
    }
    if (data.containsKey('sku')) {
      context.handle(
          _skuMeta, sku.isAcceptableOrUnknown(data['sku']!, _skuMeta));
    } else if (isInserting) {
      context.missing(_skuMeta);
    }
    if (data.containsKey('name')) {
      context.handle(
          _nameMeta, name.isAcceptableOrUnknown(data['name']!, _nameMeta));
    } else if (isInserting) {
      context.missing(_nameMeta);
    }
    if (data.containsKey('available_quantity')) {
      context.handle(
          _availableQuantityMeta,
          availableQuantity.isAcceptableOrUnknown(
              data['available_quantity']!, _availableQuantityMeta));
    } else if (isInserting) {
      context.missing(_availableQuantityMeta);
    }
    if (data.containsKey('updated_at')) {
      context.handle(_updatedAtMeta,
          updatedAt.isAcceptableOrUnknown(data['updated_at']!, _updatedAtMeta));
    } else if (isInserting) {
      context.missing(_updatedAtMeta);
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  CachedInventoryItem map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return CachedInventoryItem(
      id: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}id'])!,
      sku: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}sku'])!,
      name: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}name'])!,
      availableQuantity: attachedDatabase.typeMapping.read(
          DriftSqlType.double, data['${effectivePrefix}available_quantity'])!,
      updatedAt: attachedDatabase.typeMapping
          .read(DriftSqlType.dateTime, data['${effectivePrefix}updated_at'])!,
    );
  }

  @override
  $CachedInventoryItemsTable createAlias(String alias) {
    return $CachedInventoryItemsTable(attachedDatabase, alias);
  }
}

class CachedInventoryItem extends DataClass
    implements Insertable<CachedInventoryItem> {
  final String id;
  final String sku;
  final String name;
  final double availableQuantity;
  final DateTime updatedAt;
  const CachedInventoryItem(
      {required this.id,
      required this.sku,
      required this.name,
      required this.availableQuantity,
      required this.updatedAt});
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<String>(id);
    map['sku'] = Variable<String>(sku);
    map['name'] = Variable<String>(name);
    map['available_quantity'] = Variable<double>(availableQuantity);
    map['updated_at'] = Variable<DateTime>(updatedAt);
    return map;
  }

  CachedInventoryItemsCompanion toCompanion(bool nullToAbsent) {
    return CachedInventoryItemsCompanion(
      id: Value(id),
      sku: Value(sku),
      name: Value(name),
      availableQuantity: Value(availableQuantity),
      updatedAt: Value(updatedAt),
    );
  }

  factory CachedInventoryItem.fromJson(Map<String, dynamic> json,
      {ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return CachedInventoryItem(
      id: serializer.fromJson<String>(json['id']),
      sku: serializer.fromJson<String>(json['sku']),
      name: serializer.fromJson<String>(json['name']),
      availableQuantity: serializer.fromJson<double>(json['availableQuantity']),
      updatedAt: serializer.fromJson<DateTime>(json['updatedAt']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<String>(id),
      'sku': serializer.toJson<String>(sku),
      'name': serializer.toJson<String>(name),
      'availableQuantity': serializer.toJson<double>(availableQuantity),
      'updatedAt': serializer.toJson<DateTime>(updatedAt),
    };
  }

  CachedInventoryItem copyWith(
          {String? id,
          String? sku,
          String? name,
          double? availableQuantity,
          DateTime? updatedAt}) =>
      CachedInventoryItem(
        id: id ?? this.id,
        sku: sku ?? this.sku,
        name: name ?? this.name,
        availableQuantity: availableQuantity ?? this.availableQuantity,
        updatedAt: updatedAt ?? this.updatedAt,
      );
  CachedInventoryItem copyWithCompanion(CachedInventoryItemsCompanion data) {
    return CachedInventoryItem(
      id: data.id.present ? data.id.value : this.id,
      sku: data.sku.present ? data.sku.value : this.sku,
      name: data.name.present ? data.name.value : this.name,
      availableQuantity: data.availableQuantity.present
          ? data.availableQuantity.value
          : this.availableQuantity,
      updatedAt: data.updatedAt.present ? data.updatedAt.value : this.updatedAt,
    );
  }

  @override
  String toString() {
    return (StringBuffer('CachedInventoryItem(')
          ..write('id: $id, ')
          ..write('sku: $sku, ')
          ..write('name: $name, ')
          ..write('availableQuantity: $availableQuantity, ')
          ..write('updatedAt: $updatedAt')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(id, sku, name, availableQuantity, updatedAt);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is CachedInventoryItem &&
          other.id == this.id &&
          other.sku == this.sku &&
          other.name == this.name &&
          other.availableQuantity == this.availableQuantity &&
          other.updatedAt == this.updatedAt);
}

class CachedInventoryItemsCompanion
    extends UpdateCompanion<CachedInventoryItem> {
  final Value<String> id;
  final Value<String> sku;
  final Value<String> name;
  final Value<double> availableQuantity;
  final Value<DateTime> updatedAt;
  final Value<int> rowid;
  const CachedInventoryItemsCompanion({
    this.id = const Value.absent(),
    this.sku = const Value.absent(),
    this.name = const Value.absent(),
    this.availableQuantity = const Value.absent(),
    this.updatedAt = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  CachedInventoryItemsCompanion.insert({
    required String id,
    required String sku,
    required String name,
    required double availableQuantity,
    required DateTime updatedAt,
    this.rowid = const Value.absent(),
  })  : id = Value(id),
        sku = Value(sku),
        name = Value(name),
        availableQuantity = Value(availableQuantity),
        updatedAt = Value(updatedAt);
  static Insertable<CachedInventoryItem> custom({
    Expression<String>? id,
    Expression<String>? sku,
    Expression<String>? name,
    Expression<double>? availableQuantity,
    Expression<DateTime>? updatedAt,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (sku != null) 'sku': sku,
      if (name != null) 'name': name,
      if (availableQuantity != null) 'available_quantity': availableQuantity,
      if (updatedAt != null) 'updated_at': updatedAt,
      if (rowid != null) 'rowid': rowid,
    });
  }

  CachedInventoryItemsCompanion copyWith(
      {Value<String>? id,
      Value<String>? sku,
      Value<String>? name,
      Value<double>? availableQuantity,
      Value<DateTime>? updatedAt,
      Value<int>? rowid}) {
    return CachedInventoryItemsCompanion(
      id: id ?? this.id,
      sku: sku ?? this.sku,
      name: name ?? this.name,
      availableQuantity: availableQuantity ?? this.availableQuantity,
      updatedAt: updatedAt ?? this.updatedAt,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<String>(id.value);
    }
    if (sku.present) {
      map['sku'] = Variable<String>(sku.value);
    }
    if (name.present) {
      map['name'] = Variable<String>(name.value);
    }
    if (availableQuantity.present) {
      map['available_quantity'] = Variable<double>(availableQuantity.value);
    }
    if (updatedAt.present) {
      map['updated_at'] = Variable<DateTime>(updatedAt.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('CachedInventoryItemsCompanion(')
          ..write('id: $id, ')
          ..write('sku: $sku, ')
          ..write('name: $name, ')
          ..write('availableQuantity: $availableQuantity, ')
          ..write('updatedAt: $updatedAt, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

abstract class _$AppDatabase extends GeneratedDatabase {
  _$AppDatabase(QueryExecutor e) : super(e);
  $AppDatabaseManager get managers => $AppDatabaseManager(this);
  late final $OfflineQueueItemsTable offlineQueueItems =
      $OfflineQueueItemsTable(this);
  late final $CachedInventoryItemsTable cachedInventoryItems =
      $CachedInventoryItemsTable(this);
  @override
  Iterable<TableInfo<Table, Object?>> get allTables =>
      allSchemaEntities.whereType<TableInfo<Table, Object?>>();
  @override
  List<DatabaseSchemaEntity> get allSchemaEntities =>
      [offlineQueueItems, cachedInventoryItems];
}

typedef $$OfflineQueueItemsTableCreateCompanionBuilder
    = OfflineQueueItemsCompanion Function({
  required String id,
  required String operation,
  required String payloadJson,
  required DateTime createdAt,
  Value<DateTime?> syncedAt,
  Value<int> rowid,
});
typedef $$OfflineQueueItemsTableUpdateCompanionBuilder
    = OfflineQueueItemsCompanion Function({
  Value<String> id,
  Value<String> operation,
  Value<String> payloadJson,
  Value<DateTime> createdAt,
  Value<DateTime?> syncedAt,
  Value<int> rowid,
});

class $$OfflineQueueItemsTableFilterComposer
    extends Composer<_$AppDatabase, $OfflineQueueItemsTable> {
  $$OfflineQueueItemsTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get id => $composableBuilder(
      column: $table.id, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get operation => $composableBuilder(
      column: $table.operation, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get payloadJson => $composableBuilder(
      column: $table.payloadJson, builder: (column) => ColumnFilters(column));

  ColumnFilters<DateTime> get createdAt => $composableBuilder(
      column: $table.createdAt, builder: (column) => ColumnFilters(column));

  ColumnFilters<DateTime> get syncedAt => $composableBuilder(
      column: $table.syncedAt, builder: (column) => ColumnFilters(column));
}

class $$OfflineQueueItemsTableOrderingComposer
    extends Composer<_$AppDatabase, $OfflineQueueItemsTable> {
  $$OfflineQueueItemsTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get id => $composableBuilder(
      column: $table.id, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get operation => $composableBuilder(
      column: $table.operation, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get payloadJson => $composableBuilder(
      column: $table.payloadJson, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<DateTime> get createdAt => $composableBuilder(
      column: $table.createdAt, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<DateTime> get syncedAt => $composableBuilder(
      column: $table.syncedAt, builder: (column) => ColumnOrderings(column));
}

class $$OfflineQueueItemsTableAnnotationComposer
    extends Composer<_$AppDatabase, $OfflineQueueItemsTable> {
  $$OfflineQueueItemsTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<String> get operation =>
      $composableBuilder(column: $table.operation, builder: (column) => column);

  GeneratedColumn<String> get payloadJson => $composableBuilder(
      column: $table.payloadJson, builder: (column) => column);

  GeneratedColumn<DateTime> get createdAt =>
      $composableBuilder(column: $table.createdAt, builder: (column) => column);

  GeneratedColumn<DateTime> get syncedAt =>
      $composableBuilder(column: $table.syncedAt, builder: (column) => column);
}

class $$OfflineQueueItemsTableTableManager extends RootTableManager<
    _$AppDatabase,
    $OfflineQueueItemsTable,
    OfflineQueueItem,
    $$OfflineQueueItemsTableFilterComposer,
    $$OfflineQueueItemsTableOrderingComposer,
    $$OfflineQueueItemsTableAnnotationComposer,
    $$OfflineQueueItemsTableCreateCompanionBuilder,
    $$OfflineQueueItemsTableUpdateCompanionBuilder,
    (
      OfflineQueueItem,
      BaseReferences<_$AppDatabase, $OfflineQueueItemsTable, OfflineQueueItem>
    ),
    OfflineQueueItem,
    PrefetchHooks Function()> {
  $$OfflineQueueItemsTableTableManager(
      _$AppDatabase db, $OfflineQueueItemsTable table)
      : super(TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$OfflineQueueItemsTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$OfflineQueueItemsTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$OfflineQueueItemsTableAnnotationComposer(
                  $db: db, $table: table),
          updateCompanionCallback: ({
            Value<String> id = const Value.absent(),
            Value<String> operation = const Value.absent(),
            Value<String> payloadJson = const Value.absent(),
            Value<DateTime> createdAt = const Value.absent(),
            Value<DateTime?> syncedAt = const Value.absent(),
            Value<int> rowid = const Value.absent(),
          }) =>
              OfflineQueueItemsCompanion(
            id: id,
            operation: operation,
            payloadJson: payloadJson,
            createdAt: createdAt,
            syncedAt: syncedAt,
            rowid: rowid,
          ),
          createCompanionCallback: ({
            required String id,
            required String operation,
            required String payloadJson,
            required DateTime createdAt,
            Value<DateTime?> syncedAt = const Value.absent(),
            Value<int> rowid = const Value.absent(),
          }) =>
              OfflineQueueItemsCompanion.insert(
            id: id,
            operation: operation,
            payloadJson: payloadJson,
            createdAt: createdAt,
            syncedAt: syncedAt,
            rowid: rowid,
          ),
          withReferenceMapper: (p0) => p0
              .map((e) => (e.readTable(table), BaseReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: null,
        ));
}

typedef $$OfflineQueueItemsTableProcessedTableManager = ProcessedTableManager<
    _$AppDatabase,
    $OfflineQueueItemsTable,
    OfflineQueueItem,
    $$OfflineQueueItemsTableFilterComposer,
    $$OfflineQueueItemsTableOrderingComposer,
    $$OfflineQueueItemsTableAnnotationComposer,
    $$OfflineQueueItemsTableCreateCompanionBuilder,
    $$OfflineQueueItemsTableUpdateCompanionBuilder,
    (
      OfflineQueueItem,
      BaseReferences<_$AppDatabase, $OfflineQueueItemsTable, OfflineQueueItem>
    ),
    OfflineQueueItem,
    PrefetchHooks Function()>;
typedef $$CachedInventoryItemsTableCreateCompanionBuilder
    = CachedInventoryItemsCompanion Function({
  required String id,
  required String sku,
  required String name,
  required double availableQuantity,
  required DateTime updatedAt,
  Value<int> rowid,
});
typedef $$CachedInventoryItemsTableUpdateCompanionBuilder
    = CachedInventoryItemsCompanion Function({
  Value<String> id,
  Value<String> sku,
  Value<String> name,
  Value<double> availableQuantity,
  Value<DateTime> updatedAt,
  Value<int> rowid,
});

class $$CachedInventoryItemsTableFilterComposer
    extends Composer<_$AppDatabase, $CachedInventoryItemsTable> {
  $$CachedInventoryItemsTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get id => $composableBuilder(
      column: $table.id, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get sku => $composableBuilder(
      column: $table.sku, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get name => $composableBuilder(
      column: $table.name, builder: (column) => ColumnFilters(column));

  ColumnFilters<double> get availableQuantity => $composableBuilder(
      column: $table.availableQuantity,
      builder: (column) => ColumnFilters(column));

  ColumnFilters<DateTime> get updatedAt => $composableBuilder(
      column: $table.updatedAt, builder: (column) => ColumnFilters(column));
}

class $$CachedInventoryItemsTableOrderingComposer
    extends Composer<_$AppDatabase, $CachedInventoryItemsTable> {
  $$CachedInventoryItemsTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get id => $composableBuilder(
      column: $table.id, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get sku => $composableBuilder(
      column: $table.sku, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get name => $composableBuilder(
      column: $table.name, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<double> get availableQuantity => $composableBuilder(
      column: $table.availableQuantity,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<DateTime> get updatedAt => $composableBuilder(
      column: $table.updatedAt, builder: (column) => ColumnOrderings(column));
}

class $$CachedInventoryItemsTableAnnotationComposer
    extends Composer<_$AppDatabase, $CachedInventoryItemsTable> {
  $$CachedInventoryItemsTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<String> get sku =>
      $composableBuilder(column: $table.sku, builder: (column) => column);

  GeneratedColumn<String> get name =>
      $composableBuilder(column: $table.name, builder: (column) => column);

  GeneratedColumn<double> get availableQuantity => $composableBuilder(
      column: $table.availableQuantity, builder: (column) => column);

  GeneratedColumn<DateTime> get updatedAt =>
      $composableBuilder(column: $table.updatedAt, builder: (column) => column);
}

class $$CachedInventoryItemsTableTableManager extends RootTableManager<
    _$AppDatabase,
    $CachedInventoryItemsTable,
    CachedInventoryItem,
    $$CachedInventoryItemsTableFilterComposer,
    $$CachedInventoryItemsTableOrderingComposer,
    $$CachedInventoryItemsTableAnnotationComposer,
    $$CachedInventoryItemsTableCreateCompanionBuilder,
    $$CachedInventoryItemsTableUpdateCompanionBuilder,
    (
      CachedInventoryItem,
      BaseReferences<_$AppDatabase, $CachedInventoryItemsTable,
          CachedInventoryItem>
    ),
    CachedInventoryItem,
    PrefetchHooks Function()> {
  $$CachedInventoryItemsTableTableManager(
      _$AppDatabase db, $CachedInventoryItemsTable table)
      : super(TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$CachedInventoryItemsTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$CachedInventoryItemsTableOrderingComposer(
                  $db: db, $table: table),
          createComputedFieldComposer: () =>
              $$CachedInventoryItemsTableAnnotationComposer(
                  $db: db, $table: table),
          updateCompanionCallback: ({
            Value<String> id = const Value.absent(),
            Value<String> sku = const Value.absent(),
            Value<String> name = const Value.absent(),
            Value<double> availableQuantity = const Value.absent(),
            Value<DateTime> updatedAt = const Value.absent(),
            Value<int> rowid = const Value.absent(),
          }) =>
              CachedInventoryItemsCompanion(
            id: id,
            sku: sku,
            name: name,
            availableQuantity: availableQuantity,
            updatedAt: updatedAt,
            rowid: rowid,
          ),
          createCompanionCallback: ({
            required String id,
            required String sku,
            required String name,
            required double availableQuantity,
            required DateTime updatedAt,
            Value<int> rowid = const Value.absent(),
          }) =>
              CachedInventoryItemsCompanion.insert(
            id: id,
            sku: sku,
            name: name,
            availableQuantity: availableQuantity,
            updatedAt: updatedAt,
            rowid: rowid,
          ),
          withReferenceMapper: (p0) => p0
              .map((e) => (e.readTable(table), BaseReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: null,
        ));
}

typedef $$CachedInventoryItemsTableProcessedTableManager
    = ProcessedTableManager<
        _$AppDatabase,
        $CachedInventoryItemsTable,
        CachedInventoryItem,
        $$CachedInventoryItemsTableFilterComposer,
        $$CachedInventoryItemsTableOrderingComposer,
        $$CachedInventoryItemsTableAnnotationComposer,
        $$CachedInventoryItemsTableCreateCompanionBuilder,
        $$CachedInventoryItemsTableUpdateCompanionBuilder,
        (
          CachedInventoryItem,
          BaseReferences<_$AppDatabase, $CachedInventoryItemsTable,
              CachedInventoryItem>
        ),
        CachedInventoryItem,
        PrefetchHooks Function()>;

class $AppDatabaseManager {
  final _$AppDatabase _db;
  $AppDatabaseManager(this._db);
  $$OfflineQueueItemsTableTableManager get offlineQueueItems =>
      $$OfflineQueueItemsTableTableManager(_db, _db.offlineQueueItems);
  $$CachedInventoryItemsTableTableManager get cachedInventoryItems =>
      $$CachedInventoryItemsTableTableManager(_db, _db.cachedInventoryItems);
}
