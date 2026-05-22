import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { Permissions } from '../../../common/guards/permissions.decorator';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { CreateWorkflowRuleDto } from '../dto/create-workflow-rule.dto';
import { WorkflowsService } from '../services/workflows.service';

@Controller('workflows')
@UseGuards(PermissionsGuard)
export class WorkflowsController {
  constructor(private readonly workflows: WorkflowsService) {}

  @Get('companies/:companyId/rules')
  @Permissions('workflow.view')
  findRules(@Param('companyId') companyId: string) {
    return this.workflows.findRules(companyId);
  }

  @Post('rules')
  @Permissions('workflow.create')
  createRule(@Body() dto: CreateWorkflowRuleDto) {
    return this.workflows.createRule(dto);
  }
}
