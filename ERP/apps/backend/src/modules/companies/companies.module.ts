import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompaniesController } from './controllers/companies.controller';
import { Company } from './entities/company.entity';
import { CompanyRepository } from './repositories/company.repository';
import { CompaniesService } from './services/companies.service';

@Module({
  imports: [TypeOrmModule.forFeature([Company])],
  controllers: [CompaniesController],
  providers: [CompaniesService, CompanyRepository],
  exports: [CompaniesService],
})
export class CompaniesModule {}
