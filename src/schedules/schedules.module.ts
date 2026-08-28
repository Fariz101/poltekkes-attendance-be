import { Module } from '@nestjs/common';
import { SchedulesService } from './schedules.service';
import { SchedulesController } from './schedules.controller';
import { PrismaService } from '../prisma/prisma.service';
import { BcryptService } from '../bcrypt/bcrypt.service';

@Module({
  controllers: [SchedulesController],
  providers: [SchedulesService, BcryptService, PrismaService],
})
export class SchedulesModule {}
