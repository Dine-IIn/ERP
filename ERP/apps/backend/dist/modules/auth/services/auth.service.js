"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const argon2 = require("argon2");
const platform_user_repository_1 = require("../repositories/platform-user.repository");
let AuthService = class AuthService {
    jwt;
    users;
    constructor(jwt, users) {
        this.jwt = jwt;
        this.users = users;
    }
    async login(dto) {
        const user = await this.users.findActiveByEmail(dto.usernameOrEmail.toLowerCase());
        const valid = user
            ? await argon2.verify(user.passwordHash, dto.password)
            : false;
        if (!user || !valid) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        const payload = {
            sub: user.id,
            email: user.email,
            roles: [user.role],
            permissions: [],
        };
        return {
            accessToken: await this.jwt.signAsync(payload, { expiresIn: '15m' }),
            refreshToken: await this.jwt.signAsync(payload, { expiresIn: '30d' }),
        };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [jwt_1.JwtService,
        platform_user_repository_1.PlatformUserRepository])
], AuthService);
//# sourceMappingURL=auth.service.js.map