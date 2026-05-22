import { ConflictException, Injectable } from '@nestjs/common';
import { CreateCompanyDto } from '../dto/create-company.dto';
import { CompanyRepository } from '../repositories/company.repository';

@Injectable()
export class CompaniesService {
  constructor(private readonly companies: CompanyRepository) {}

  async create(dto: CreateCompanyDto) {
    const existing = await this.companies.findBySlug(dto.slug);
    if (existing) {
      throw new ConflictException('Company slug already exists');
    }

    return this.companies.create({
      ...dto,
      databaseName: `company_${dto.slug.replaceAll('-', '_')}`,
      featureFlags: {},
      license: {},
      deploymentConfig: {},
    });
  }

  findAll() {
    return this.companies.findAll();
  }
}
