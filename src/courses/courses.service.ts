import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class CoursesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createCourseDto: CreateCourseDto) {
    const existingCourse = await this.prisma.course.findUnique({
      where: { code: createCourseDto.code },
    });
    if (existingCourse) {
      throw new BadRequestException('Kode mata kuliah sudah terdaftar');
    }

    const course = await this.prisma.course.create({ data: createCourseDto });
    return { success: true, message: 'Mata kuliah berhasil dibuat', data: course };
  }

  async findAll(query: PaginationQueryDto & { prodi?: string; semester?: number }) {
  const { page = 1, limit = 10, search, sortBy = 'createdAt', sortOrder = 'desc', prodi, semester } = query;
  const skip = (page - 1) * limit;

  const where: Prisma.CourseWhereInput = {};
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { code: { contains: search } },
    ];
  }
  if (prodi) where.prodi = prodi;
  if (semester) where.semester = Number(semester);

  const [data, totalItems] = await this.prisma.$transaction([
    this.prisma.course.findMany({
      where,
      skip,
      take: Number(limit),
      orderBy: { [sortBy]: sortOrder.toLowerCase() },
    }),
    this.prisma.course.count({ where }),
  ]);

  const totalPages = Math.ceil(totalItems / limit);
  return {
    success: true,
    data,
    meta: { currentPage: Number(page), itemsPerPage: Number(limit), totalItems, totalPages, hasNextPage: page < totalPages, hasPrevPage: page > 1 },
  };
}

  // Dipanggil Frontend untuk Dropdown Form Pendaftaran Mahasiswa
  async getProdiList() {
    const prodis = await this.prisma.course.findMany({
      select: { prodi: true },
      distinct: ['prodi'],
    });
    return { success: true, data: prodis.map((item) => item.prodi) };
  }

  async findOne(id: string) {
    const course = await this.prisma.course.findUnique({ where: { id } });
    if (!course) throw new NotFoundException('Mata kuliah tidak ditemukan');
    return { success: true, data: course };
  }

  async update(id: string, updateCourseDto: UpdateCourseDto) {
    await this.findOne(id);
    const updated = await this.prisma.course.update({
      where: { id },
      data: updateCourseDto,
    });
    return { success: true, message: 'Mata kuliah berhasil di-update', data: updated };
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.course.delete({ where: { id } });
    return { success: true, message: 'Mata kuliah berhasil dihapus' };
  }
}