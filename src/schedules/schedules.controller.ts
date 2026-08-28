import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, NotFoundException, Query } from '@nestjs/common';
import { SchedulesService } from './schedules.service';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { RoleGuard, Roles } from '../helper/roles-guard'; 
import { AuthGuard } from '@nestjs/passport';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { DayOfWeek } from '@prisma/client';

@Controller('schedules')
@UseGuards(AuthGuard('jwt'), RoleGuard)
export class SchedulesController {
  constructor(private readonly schedulesService: SchedulesService) {}

  @Post()
  @Roles('ADMIN')
  create(@Body() createScheduleDto: CreateScheduleDto) {
    return this.schedulesService.create(createScheduleDto);
  }

  @Get()
  async findAll(
    @Query() query: PaginationQueryDto,
    @Query('day') day?: DayOfWeek,
    @Query('courseId') courseId?: string,
  ) {
    return this.schedulesService.findAll({ ...query, day, courseId });
  }

  @Get('me')
  @Roles('STUDENT')
  async getMySchedule(@Req() req) {
    const userId = req.user.id

    if (!userId) {
      throw new NotFoundException('User ID tidak ditemukan dalam token payload');
    }

    return this.schedulesService.findMySchedule(userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.schedulesService.findOne(id);
  }

  @Patch(':id')
  @Roles('ADMIN')
  update(@Param('id') id: string, @Body() updateScheduleDto: UpdateScheduleDto) {
    return this.schedulesService.update(id, updateScheduleDto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  remove(@Param('id') id: string) {
    return this.schedulesService.remove(id);
  }
}