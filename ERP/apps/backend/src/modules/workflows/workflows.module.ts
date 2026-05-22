import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkflowsController } from './controllers/workflows.controller';
import { WorkflowRule } from './entities/workflow-rule.entity';
import { WorkflowRuleRepository } from './repositories/workflow-rule.repository';
import { WorkflowsService } from './services/workflows.service';

@Module({
  imports: [TypeOrmModule.forFeature([WorkflowRule])],
  controllers: [WorkflowsController],
  providers: [WorkflowsService, WorkflowRuleRepository],
})
export class WorkflowsModule {}
