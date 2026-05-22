import { JwtService } from '@nestjs/jwt';
import { LoginDto } from '../dto/login.dto';
import { PlatformUserRepository } from '../repositories/platform-user.repository';
export declare class AuthService {
    private readonly jwt;
    private readonly users;
    constructor(jwt: JwtService, users: PlatformUserRepository);
    login(dto: LoginDto): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
}
