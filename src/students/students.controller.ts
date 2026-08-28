import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, Query } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { StudentsService } from './students.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { RoleGuard, Roles } from '../helper/roles-guard'; 
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { Gender, RegistrationStatus } from '@prisma/client';

@Controller('students')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Post()
  create(@Body() createStudentDto: CreateStudentDto) {
    return this.studentsService.create(createStudentDto);
  }

  @Post(':id/regenerate-qr')
  @UseGuards(AuthGuard('jwt'), RoleGuard)
  @Roles('ADMIN')
  regenerateQrCode(@Param('id') id: string) {
    return this.studentsService.regenerateQrCode(id);
  }

  @Get()
  async findAll(
    @Query() query: PaginationQueryDto,
    @Query('gender') gender?: Gender,
    @Query('prodi') prodi?: string,
    @Query('status') status?: RegistrationStatus,
  ) {
    return this.studentsService.findAll({ ...query, gender, prodi, status });
  }

  @Get('me')
  @UseGuards(AuthGuard('jwt'), RoleGuard)
  @Roles('STUDENT')
  async getMyProfile(@Req() req) {
    return this.studentsService.findMe(req.user.id);
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'), RoleGuard)
  @Roles('ADMIN', 'STUDENT')
  findOne(@Param('id') id: string) {
    return this.studentsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(AuthGuard('jwt'), RoleGuard)
  @Roles('ADMIN', 'STUDENT')
  update(@Param('id') id: string, @Body() updateStudentDto: UpdateStudentDto) {
    return this.studentsService.update(id, updateStudentDto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), RoleGuard)
  @Roles('ADMIN')
  remove(@Param('id') id: string) {
    return this.studentsService.remove(id);
  }
}