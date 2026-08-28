import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { CoursesService } from './courses.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { RoleGuard, Roles } from '../helper/roles-guard'; 
import { AuthGuard } from '@nestjs/passport';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';

@Controller('courses')
@UseGuards(AuthGuard('jwt'), RoleGuard)
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  // Endpoint Publik (Dropdown Prodi)
  @Get('prodi-list')
  getProdiList() {
    return this.coursesService.getProdiList();
  }

  @Post()
  @Roles('ADMIN')
  create(@Body() createCourseDto: CreateCourseDto) {
    return this.coursesService.create(createCourseDto);
  }

  @Get()
  async findAll(
    @Query() query: PaginationQueryDto,
    @Query('prodi') prodi?: string,
    @Query('semester') semester?: number,
  ) {
    return this.coursesService.findAll({ ...query, prodi, semester });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.coursesService.findOne(id);
  }

  @Patch(':id')
  @Roles('ADMIN')
  update(@Param('id') id: string, @Body() updateCourseDto: UpdateCourseDto) {
    return this.coursesService.update(id, updateCourseDto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  remove(@Param('id') id: string) {
    return this.coursesService.remove(id);
  }
}