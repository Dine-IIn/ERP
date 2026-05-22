import { CreateCompanyDto } from '../dto/create-company.dto';
import { CompaniesService } from '../services/companies.service';
export declare class CompaniesController {
    private readonly companies;
    constructor(companies: CompaniesService);
    findAll(): Promise<import("../entities/company.entity").Company[]>;
    create(dto: CreateCompanyDto): Promise<import("../entities/company.entity").Company>;
}
