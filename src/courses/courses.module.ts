import { Module } from '@nestjs/common';
import { CoursesService } from './courses.service';
import { CoursesController } from './courses.controller';
import { PrismaService } from '../prisma/prisma.service';
import { BcryptService } from '../bcrypt/bcrypt.service';

@Module({
  controllers: [CoursesController],
  providers: [CoursesService, BcryptService, PrismaService],
})
export class CoursesModule {}
