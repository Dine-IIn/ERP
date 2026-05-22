import 'dart:convert';

import 'package:uuid/uuid.dart';

import '../database/app_database.dart';

class SyncQueue {
  SyncQueue(this._database);

  final AppDatabase _database;
  final _uuid = const Uuid();

  Future<void> enqueue({
    required String operation,
    required Map<String, dynamic> payload,
  }) {
    return _database.into(_database.offlineQueueItems).insert(
          OfflineQueueItemsCompanion.insert(
            id: _uuid.v7(),
            operation: operation,
            payloadJson: jsonEncode(payload),
            createdAt: DateTime.now().toUtc(),
          ),
        );
  }
}
