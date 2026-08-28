import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { DayOfWeek, Prisma } from '@prisma/client';

@Injectable()
export class SchedulesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createScheduleDto: CreateScheduleDto) {
    const course = await this.prisma.course.findUnique({
      where: { id: createScheduleDto.courseId },
    });
    if (!course) throw new NotFoundException('Mata kuliah tidak ditemukan');

    const schedule = await this.prisma.schedule.create({
      data: createScheduleDto,
      include: { course: true },
    });
    return { success: true, message: 'Jadwal berhasil dibuat', data: schedule };
  }

  async findAll(query: PaginationQueryDto & { day?: DayOfWeek; courseId?: string }) {
  const { page = 1, limit = 10, search, sortBy = 'createdAt', sortOrder = 'desc', day, courseId } = query;
  const skip = (page - 1) * limit;

  const where: Prisma.ScheduleWhereInput = {};
  if (search) {
    where.OR = [
      { lecturer: { contains: search } },
      { room: { contains: search } },
      { course: { name: { contains: search } } },
    ];
  }
  if (day) where.day = day;
  if (courseId) where.courseId = courseId;

  const [data, totalItems] = await this.prisma.$transaction([
    this.prisma.schedule.findMany({
      where,
      skip,
      take: Number(limit),
      orderBy: { [sortBy]: sortOrder.toLowerCase() },
      include: { course: true },
    }),
    this.prisma.schedule.count({ where }),
  ]);

  const totalPages = Math.ceil(totalItems / limit);
  return {
    success: true,
    data,
    meta: { currentPage: Number(page), itemsPerPage: Number(limit), totalItems, totalPages, hasNextPage: page < totalPages, hasPrevPage: page > 1 },
  };
}

  async findMySchedule(userId: string) {
    if (!userId) {
      throw new NotFoundException('User ID tidak ditemukan dalam token');
    }

    // 1. Cari data Student berdasarkan userId dari payload JWT
    const student = await this.prisma.student.findUnique({
      where: { userId },
      select: {
        id: true,
        prodiSelected: true,
        fullName: true,
      },
    });

    if (!student) {
      throw new NotFoundException('Data profil Mahasiswa tidak ditemukan');
    }

    // 2. Ambil seluruh jadwal perkuliahan yang prodi mata kuliahnya sesuai dengan prodiSelected mahasiswa
    const schedules = await this.prisma.schedule.findMany({
      where: {
        course: {
          prodi: student.prodiSelected,
        },
      },
      include: {
        course: true,
      },
      orderBy: {
        day: 'asc',
      },
    });

    return {
      success: true,
      studentInfo: {
        fullName: student.fullName,
        prodi: student.prodiSelected,
      },
      data: schedules,
    };
  }

  async findOne(id: string) {
    const schedule = await this.prisma.schedule.findUnique({
      where: { id },
      include: { course: true },
    });
    if (!schedule) throw new NotFoundException('Jadwal tidak ditemukan');
    return { success: true, data: schedule };
  }

  async update(id: string, updateScheduleDto: UpdateScheduleDto) {
    await this.findOne(id);
    const updated = await this.prisma.schedule.update({
      where: { id },
      data: updateScheduleDto,
      include: { course: true },
    });
    return { success: true, message: 'Jadwal berhasil di-update', data: updated };
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.schedule.delete({ where: { id } });
    return { success: true, message: 'Jadwal berhasil dihapus' };
  }
}