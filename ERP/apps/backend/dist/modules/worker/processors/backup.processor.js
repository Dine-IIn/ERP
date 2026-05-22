"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BackupProcessor = void 0;
const bullmq_1 = require("@nestjs/bullmq");
let BackupProcessor = class BackupProcessor extends bullmq_1.WorkerHost {
    async process(job) {
        return {
            companyId: job.data.companyId,
            status: 'queued',
            message: 'Backup execution hook is ready for pg_dump integration',
        };
    }
};
exports.BackupProcessor = BackupProcessor;
exports.BackupProcessor = BackupProcessor = __decorate([
    (0, bullmq_1.Processor)('backups')
], BackupProcessor);
//# sourceMappingURL=backup.processor.js.map