import { LoginDto } from '../dto/login.dto';
import { AuthService } from '../services/auth.service';
export declare class AuthController {
    private readonly auth;
    constructor(auth: AuthService);
    login(dto: LoginDto): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
}
