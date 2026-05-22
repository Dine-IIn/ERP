import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { appConfig } from './config/app.config';
import { AuthModule } from './modules/auth/auth.module';
import { CompaniesModule } from './modules/companies/companies.module';
import { HealthController } from './modules/health.controller';
import { InventoryModule } from './modules/inventory/inventory.module';
import { RealtimeModule } from './modules/realtime/realtime.module';
import { StorageModule } from './modules/storage/storage.module';
import { WorkerModule } from './modules/worker/worker.module';
import { WorkflowsModule } from './modules/workflows/workflows.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [appConfig] }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.getOrThrow<string>('MASTER_DATABASE_URL'),
        autoLoadEntities: true,
        synchronize: false,
      }),
    }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>('REDIS_HOST', 'localhost'),
          port: config.get<number>('REDIS_PORT', 6379),
        },
      }),
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    AuthModule,
    CompaniesModule,
    InventoryModule,
    WorkflowsModule,
    StorageModule,
    RealtimeModule,
    WorkerModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
