import { Injectable, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import * as QRCode from 'qrcode';
import { Prisma } from '@prisma/client';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';

@Injectable()
export class EventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async create(createEventDto: CreateEventDto) {
    if (createEventDto.scheduleId) {
      const schedule = await this.prisma.schedule.findUnique({
        where: { id: createEventDto.scheduleId },
      });
      if (!schedule) throw new NotFoundException('Jadwal tidak ditemukan');
    }

    try {
      // 1. Simpan Record Event Awal
      const event = await this.prisma.event.create({
        data: {
          title: createEventDto.title,
          date: new Date(createEventDto.date),
          durationMin: createEventDto.durationMin ?? 30,
          scheduleId: createEventDto.scheduleId,
        },
      });

      // 2. Generate Gambar QR Code sebagai Buffer dari event.id (Format JSON)
      const qrPayload = JSON.stringify({ eventId: event.id, title: event.title });
      const qrBuffer = await QRCode.toBuffer(qrPayload, {
        type: 'png',
        width: 400,
        margin: 2,
      });

      // 3. Upload Buffer Gambar QR ke Cloudinary (folder: qr-events)
      const uploadResult = await this.cloudinaryService.uploadFile(qrBuffer, 'qr-events');

      // 4. Update Event dengan simpan qrCodeUrl ke Database
      const updatedEvent = await this.prisma.event.update({
        where: { id: event.id },
        data: {
          qrCodeUrl: uploadResult.secure_url, // <-- Aktifkan simpan URL ke DB
        },
        include: { schedule: { include: { course: true } } },
      });

      return {
        success: true,
        message: 'Sesi Event dan QR Code berhasil dibuat',
        data: updatedEvent,
      };
    } catch (error) {
      throw new InternalServerErrorException('Gagal membuat Event');
    }
  }

  async findAll(query: PaginationQueryDto & { isActive?: boolean; scheduleId?: string }) {
  const { page = 1, limit = 10, search, sortBy = 'createdAt', sortOrder = 'desc', isActive, scheduleId } = query;
  const skip = (page - 1) * limit;

  const where: Prisma.EventWhereInput = {};
  if (search) where.title = { contains: search };
  if (isActive !== undefined) where.isActive = isActive;
  if (scheduleId) where.scheduleId = scheduleId;

  const [data, totalItems] = await this.prisma.$transaction([
    this.prisma.event.findMany({
      where,
      skip,
      take: Number(limit),
      orderBy: { [sortBy]: sortOrder.toLowerCase() },
      include: {
        schedule: { include: { course: true } },
        _count: { select: { attendances: true } },
      },
    }),
    this.prisma.event.count({ where }),
  ]);

  const totalPages = Math.ceil(totalItems / limit);
  return {
    success: true,
    data,
    meta: { currentPage: Number(page), itemsPerPage: Number(limit), totalItems, totalPages, hasNextPage: page < totalPages, hasPrevPage: page > 1 },
  };
}

  async findOne(id: string) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: {
        schedule: { include: { course: true } },
        attendances: {
          include: {
            student: true,
          },
          orderBy: { scannedAt: 'asc' },
        },
      },
    });

    if (!event) throw new NotFoundException('Event tidak ditemukan');
    return { success: true, data: event };
  }

  async update(id: string, updateEventDto: UpdateEventDto) {
    await this.findOne(id);
    const updated = await this.prisma.event.update({
      where: { id },
      data: {
        ...updateEventDto,
        date: updateEventDto.date ? new Date(updateEventDto.date) : undefined,
      },
    });
    return { success: true, message: 'Event berhasil diperbarui', data: updated };
  }

  async toggleStatus(id: string, isActive: boolean) {
    await this.findOne(id);
    const updated = await this.prisma.event.update({
      where: { id },
      data: { isActive },
    });
    return {
      success: true,
      message: `Event presensi berhasil di-${isActive ? 'aktifkan' : 'nonaktifkan'}`,
      data: updated,
    };
  }

  async remove(id: string) {
    const event = await this.prisma.event.findUnique({ where: { id } });
    if (!event) throw new NotFoundException('Event tidak ditemukan');

    // Hapus file QR dari Cloudinary jika ada
    if (event.qrCodeUrl) {
      await this.cloudinaryService.deleteFile(event.qrCodeUrl);
    }

    await this.prisma.event.delete({ where: { id } });
    return { success: true, message: 'Event dan QR Code berhasil dihapus' };
  }
}