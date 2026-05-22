import { WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
export declare class BackupProcessor extends WorkerHost {
    process(job: Job<{
        companyId: string;
    }>): Promise<{
        companyId: string;
        status: string;
        message: string;
    }>;
}
