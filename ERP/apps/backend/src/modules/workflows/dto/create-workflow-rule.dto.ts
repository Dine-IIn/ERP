import { IsArray, IsBoolean, IsObject, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateWorkflowRuleDto {
  @IsUUID()
  companyId: string;

  @IsString()
  name: string;

  @IsString()
  module: string;

  @IsObject()
  trigger: Record<string, unknown>;

  @IsArray()
  actions: Record<string, unknown>[];

  @IsBoolean()
  @IsOptional()
  enabled?: boolean;
}
