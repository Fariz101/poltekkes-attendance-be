import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BcryptService } from '../bcrypt/bcrypt.service';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';
import { Prisma, Role } from '@prisma/client';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';

@Injectable()
export class AdminsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bcrypt: BcryptService,
  ) {}

  async create(createAdminDto: CreateAdminDto) {
    const { email, password, fullName } = createAdminDto;

    const existingUser = await this.prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new BadRequestException('Email sudah terdaftar');
    }

    const hashedPassword = await this.bcrypt.hashPassword(password);

    return await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          role: Role.ADMIN,
        },
      });

      const admin = await tx.admin.create({
        data: {
          userId: user.id,
          fullName,
        },
      });

      const { password: _, ...userWithoutPassword } = user;

      return {
        success: true,
        message: 'Admin & User berhasil dibuat',
        data: {
          ...admin,
          user: userWithoutPassword,
        },
      };
    });
  }

  async findAll(query: PaginationQueryDto) {
  const { page = 1, limit = 10, search, sortBy = 'createdAt', sortOrder = 'desc' } = query;
  const skip = (page - 1) * limit;

  const where: Prisma.AdminWhereInput = {};
  if (search) {
    where.OR = [
      { fullName: { contains: search } },
      { user: { email: { contains: search } } },
    ];
  }

  const [data, totalItems] = await this.prisma.$transaction([
    this.prisma.admin.findMany({
      where,
      skip,
      take: Number(limit),
      orderBy: { [sortBy]: sortOrder.toLowerCase() },
      include: { user: { select: { id: true, email: true, role: true, isActive: true } } },
    }),
    this.prisma.admin.count({ where }),
  ]);

  const totalPages = Math.ceil(totalItems / limit);
  return {
    success: true,
    data,
    meta: { currentPage: Number(page), itemsPerPage: Number(limit), totalItems, totalPages, hasNextPage: page < totalPages, hasPrevPage: page > 1 },
  };
}

  async findMe(userId: string) {
  const admin = await this.prisma.admin.findUnique({
    where: { userId },
    include: {
      user: {
        select: { id: true, email: true, role: true, isActive: true },
      },
    },
  });

  if (!admin) {
    throw new NotFoundException('Data profil Admin tidak ditemukan');
  }

  return { success: true, data: admin };
}

  async findOne(id: string) {
    const admin = await this.prisma.admin.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, email: true, role: true, isActive: true },
        },
      },
    });

    if (!admin) throw new NotFoundException('Data Admin tidak ditemukan');
    return { success: true, data: admin };
  }

  async update(id: string, updateAdminDto: UpdateAdminDto) {
    await this.findOne(id);

    const updated = await this.prisma.admin.update({
      where: { id },
      data: updateAdminDto,
    });

    return { success: true, message: 'Admin berhasil diupdate', data: updated };
  }

  async remove(id: string) {
    const admin = await this.findOne(id);

    await this.prisma.user.delete({
      where: { id: admin.data.userId },
    });

    return { success: true, message: 'Admin & User berhasil dihapus' };
  }
}