"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const bullmq_1 = require("@nestjs/bullmq");
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const throttler_1 = require("@nestjs/throttler");
const typeorm_1 = require("@nestjs/typeorm");
const app_config_1 = require("./config/app.config");
const auth_module_1 = require("./modules/auth/auth.module");
const companies_module_1 = require("./modules/companies/companies.module");
const health_controller_1 = require("./modules/health.controller");
const inventory_module_1 = require("./modules/inventory/inventory.module");
const realtime_module_1 = require("./modules/realtime/realtime.module");
const storage_module_1 = require("./modules/storage/storage.module");
const worker_module_1 = require("./modules/worker/worker.module");
const workflows_module_1 = require("./modules/workflows/workflows.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({ isGlobal: true, load: [app_config_1.appConfig] }),
            typeorm_1.TypeOrmModule.forRootAsync({
                inject: [config_1.ConfigService],
                useFactory: (config) => ({
                    type: 'postgres',
                    url: config.getOrThrow('MASTER_DATABASE_URL'),
                    autoLoadEntities: true,
                    synchronize: false,
                }),
            }),
            bullmq_1.BullModule.forRootAsync({
                inject: [config_1.ConfigService],
                useFactory: (config) => ({
                    connection: {
                        host: config.get('REDIS_HOST', 'localhost'),
                        port: config.get('REDIS_PORT', 6379),
                    },
                }),
            }),
            throttler_1.ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
            auth_module_1.AuthModule,
            companies_module_1.CompaniesModule,
            inventory_module_1.InventoryModule,
            workflows_module_1.WorkflowsModule,
            storage_module_1.StorageModule,
            realtime_module_1.RealtimeModule,
            worker_module_1.WorkerModule,
        ],
        controllers: [health_controller_1.HealthController],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map