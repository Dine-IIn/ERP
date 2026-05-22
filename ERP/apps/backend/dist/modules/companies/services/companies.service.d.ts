import { CreateCompanyDto } from '../dto/create-company.dto';
import { CompanyRepository } from '../repositories/company.repository';
export declare class CompaniesService {
    private readonly companies;
    constructor(companies: CompanyRepository);
    create(dto: CreateCompanyDto): Promise<import("../entities/company.entity").Company>;
    findAll(): Promise<import("../entities/company.entity").Company[]>;
}
