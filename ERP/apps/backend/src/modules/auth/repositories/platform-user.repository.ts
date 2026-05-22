import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlatformUser } from '../entities/platform-user.entity';

@Injectable()
export class PlatformUserRepository {
  constructor(
    @InjectRepository(PlatformUser)
    private readonly repository: Repository<PlatformUser>,
  ) {}

  findActiveByEmail(email: string) {
    return this.repository.findOne({
      where: {
        email,
        status: 'active',
      },
    });
  }
}
