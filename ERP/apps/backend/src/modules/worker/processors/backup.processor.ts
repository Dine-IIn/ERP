import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';

@Processor('backups')
export class BackupProcessor extends WorkerHost {
  async process(job: Job<{ companyId: string }>) {
    return {
      companyId: job.data.companyId,
      status: 'queued',
      message: 'Backup execution hook is ready for pg_dump integration',
    };
  }
}
