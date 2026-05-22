import { Repository } from 'typeorm';
import { Company } from '../entities/company.entity';
export declare class CompanyRepository {
    private readonly repository;
    constructor(repository: Repository<Company>);
    create(company: Partial<Company>): Promise<Company>;
    findAll(): Promise<Company[]>;
    findBySlug(slug: string): Promise<Company | null>;
}
