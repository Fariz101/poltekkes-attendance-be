import { Module } from '@nestjs/common';
import { AttendancesService } from './attendances.service';
import { AttendancesController } from './attendances.controller';
import { PrismaService } from '../prisma/prisma.service';
import { BcryptService } from '../bcrypt/bcrypt.service';

@Module({
  controllers: [AttendancesController],
  providers: [AttendancesService, BcryptService, PrismaService],
})
export class AttendancesModule {}
