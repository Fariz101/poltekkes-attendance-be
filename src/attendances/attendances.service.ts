import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ScanAttendanceDto } from './dto/scan-attendance.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class AttendancesService {
  constructor(private readonly prisma: PrismaService) {}

  // 1. Scan QR Code Presensi oleh Mahasiswa
  async scanQR(userId: string, scanDto: ScanAttendanceDto) {
    const student = await this.prisma.student.findUnique({
      where: { userId },
    });

    if (!student) {
      throw new NotFoundException('Data mahasiswa tidak ditemukan untuk user ini');
    }

    const event = await this.prisma.event.findUnique({
      where: { id: scanDto.eventId },
      include: { schedule: { include: { course: true } } },
    });

    if (!event) {
      throw new NotFoundException('Sesi presensi (Event) tidak ditemukan');
    }

    if (!event.isActive) {
      throw new BadRequestException('Sesi presensi ini sudah ditutup oleh Dosen/Admin');
    }

    // Validasi Waktu Kadaluarsa Presensi
    const now = new Date();
    const eventStartTime = new Date(event.date);
    const eventEndTime = new Date(eventStartTime.getTime() + event.durationMin * 60 * 1000);

    if (now > eventEndTime) {
      throw new BadRequestException('Waktu presensi untuk sesi ini telah berakhir');
    }

    // Cek Duplikasi Presensi
    const existingAttendance = await this.prisma.attendance.findUnique({
      where: {
        eventId_studentId: {
          eventId: event.id,
          studentId: student.id,
        },
      },
    });

    if (existingAttendance) {
      throw new ConflictException('Anda sudah melakukan presensi pada sesi ini sebelumnya');
    }

    // Simpan Data Presensi
    const attendance = await this.prisma.attendance.create({
      data: {
        eventId: event.id,
        studentId: student.id,
      },
      include: {
        event: { select: { title: true, date: true } },
        student: { select: { fullName: true, nrm: true, nim: true } },
      },
    });

    return {
      success: true,
      message: 'Presensi berhasil dicatat!',
      data: attendance,
    };
  }

  // 2. Main FindAll dengan Pagination, Search, Filtering & Sorting (Global/Admin)
  async findAll(query: PaginationQueryDto & { eventId?: string; studentId?: string }) {
    const { page = 1, limit = 10, search, sortBy = 'scannedAt', sortOrder = 'desc', eventId, studentId } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.AttendanceWhereInput = {};

    if (eventId) where.eventId = eventId;
    if (studentId) where.studentId = studentId;

    if (search) {
      where.OR = [
        { student: { fullName: { contains: search } } },
        { student: { nrm: { contains: search } } },
        { student: { nim: { contains: search } } },
        { event: { title: { contains: search } } },
      ];
    }

    const [data, totalItems] = await this.prisma.$transaction([
      this.prisma.attendance.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { [sortBy]: sortOrder.toLowerCase() },
        include: {
          student: { select: { id: true, fullName: true, nrm: true, nim: true, prodiSelected: true } },
          event: { select: { id: true, title: true, date: true } },
        },
      }),
      this.prisma.attendance.count({ where }),
    ]);

    const totalPages = Math.ceil(totalItems / limit);

    return {
      success: true,
      data,
      meta: {
        currentPage: Number(page),
        itemsPerPage: Number(limit),
        totalItems,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  // 3. Rekap Riwayat Presensi Mahasiswa yang Login (Dengan Pagination)
  async getMyAttendances(userId: string, query: PaginationQueryDto) {
    const student = await this.prisma.student.findUnique({
      where: { userId },
    });

    if (!student) {
      throw new NotFoundException('Data mahasiswa tidak ditemukan');
    }

    // Reuse findAll khusus untuk ID student ini
    return this.findAll({ ...query, studentId: student.id });
  }

  // 4. Rekap Presensi Per Event untuk Dosen/Admin (Dengan Pagination)
  async getEventAttendances(eventId: string, query: PaginationQueryDto) {
    const event = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!event) {
      throw new NotFoundException('Event tidak ditemukan');
    }

    // Reuse findAll khusus untuk ID event ini
    return this.findAll({ ...query, eventId });
  }

  // 5. Hapus Presensi (Admin Fixes)
  async remove(id: string) {
    const attendance = await this.prisma.attendance.findUnique({ where: { id } });

    if (!attendance) {
      throw new NotFoundException('Data presensi tidak ditemukan');
    }

    await this.prisma.attendance.delete({ where: { id } });

    return {
      success: true,
      message: 'Record presensi berhasil dihapus',
    };
  }
}