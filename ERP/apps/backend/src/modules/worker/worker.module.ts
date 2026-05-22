import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { BackupProcessor } from './processors/backup.processor';

@Module({
  imports: [BullModule.registerQueue({ name: 'backups' })],
  providers: [BackupProcessor],
})
export class WorkerModule {}
