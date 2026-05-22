import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './controllers/auth.controller';
import { PlatformUser } from './entities/platform-user.entity';
import { PlatformUserRepository } from './repositories/platform-user.repository';
import { AuthService } from './services/auth.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([PlatformUser]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_ACCESS_SECRET', 'dev-secret'),
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, PlatformUserRepository],
})
export class AuthModule {}
