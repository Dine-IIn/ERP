import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { LoginDto } from '../dto/login.dto';
import { PlatformUserRepository } from '../repositories/platform-user.repository';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwt: JwtService,
    private readonly users: PlatformUserRepository,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.users.findActiveByEmail(
      dto.usernameOrEmail.toLowerCase(),
    );
    const valid = user
      ? await argon2.verify(user.passwordHash, dto.password)
      : false;

    if (!user || !valid) {
      throw new UnauthorizedException('Invalid credentials');
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
}
