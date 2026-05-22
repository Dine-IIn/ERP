import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { Permissions } from '../../../common/guards/permissions.decorator';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { CreateCompanyDto } from '../dto/create-company.dto';
import { CompaniesService } from '../services/companies.service';

@Controller('companies')
@UseGuards(PermissionsGuard)
export class CompaniesController {
  constructor(private readonly companies: CompaniesService) {}

  @Get()
  @Permissions('companies.view')
  findAll() {
    return this.companies.findAll();
  }

  @Post()
  @Permissions('companies.create')
  create(@Body() dto: CreateCompanyDto) {
    return this.companies.create(dto);
  }
}
