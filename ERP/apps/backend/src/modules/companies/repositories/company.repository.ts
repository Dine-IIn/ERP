import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Company } from '../entities/company.entity';

@Injectable()
export class CompanyRepository {
  constructor(
    @InjectRepository(Company)
    private readonly repository: Repository<Company>,
  ) {}

  create(company: Partial<Company>) {
    return this.repository.save(this.repository.create(company));
  }

  findAll() {
    return this.repository.find({ order: { createdAt: 'DESC' } });
  }

  findBySlug(slug: string) {
    return this.repository.findOne({ where: { slug } });
  }
}
