import { Module } from '@nestjs/common';
import { AdminsService } from './admins.service';
import { AdminsController } from './admins.controller';
import { PrismaService } from '../prisma/prisma.service';
import { BcryptService } from '../bcrypt/bcrypt.service';

@Module({
  controllers: [AdminsController],
  providers: [AdminsService, BcryptService, PrismaService],
})
export class AdminsModule {}
