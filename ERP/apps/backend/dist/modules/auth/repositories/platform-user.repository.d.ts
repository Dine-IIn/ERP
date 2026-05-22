import { Repository } from 'typeorm';
import { PlatformUser } from '../entities/platform-user.entity';
export declare class PlatformUserRepository {
    private readonly repository;
    constructor(repository: Repository<PlatformUser>);
    findActiveByEmail(email: string): Promise<PlatformUser | null>;
}
