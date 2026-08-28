import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from '../prisma/prisma.service';
import { BcryptService } from '../bcrypt/bcrypt.service';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { Prisma, Role } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bcrypt: BcryptService,
  ) {}

  async create(createUserDto: CreateUserDto) {
    const { email, password, role } = createUserDto;

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new BadRequestException('Email sudah terdaftar');
    }

    const hashedPassword = await this.bcrypt.hashPassword(password);

    const createUser = await this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role,
      },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    return {
      success: true,
      message: 'User berhasil dibuat',
      data: createUser,
    };
  }

  async findAll(query: PaginationQueryDto & { role?: Role; isActive?: boolean }) {
  const { page = 1, limit = 10, search, sortBy = 'createdAt', sortOrder = 'desc', role, isActive } = query;
  const skip = (page - 1) * limit;

  const where: Prisma.UserWhereInput = {};
  if (search) where.email = { contains: search };
  if (role) where.role = role;
  if (isActive !== undefined) where.isActive = isActive;

  const [data, totalItems] = await this.prisma.$transaction([
    this.prisma.user.findMany({
      where,
      skip,
      take: Number(limit),
      orderBy: { [sortBy]: sortOrder.toLowerCase() },
      select: { id: true, email: true, role: true, isActive: true, createdAt: true },
    }),
    this.prisma.user.count({ where }),
  ]);

  const totalPages = Math.ceil(totalItems / limit);
  return {
    success: true,
    data,
    meta: { currentPage: Number(page), itemsPerPage: Number(limit), totalItems, totalPages, hasNextPage: page < totalPages, hasPrevPage: page > 1 },
  };
}

async findMe(id: string) {
    if (!id) {
      throw new BadRequestException('ID user tidak boleh kosong');
    }

    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        admin: {
          select: {
            id: true,
            fullName: true,
          },
        },
        student: {
          select: {
            id: true,
            nim: true,
            fullName: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Data user tidak ditemukan');
    }

    return {
      success: true,
      data: user,
    };
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        student: true,
        admin: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Data user tidak ditemukan');
    }

    return {
      success: true,
      message: 'Data user berhasil ditemukan',
      data: user,
    };
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    const findUser = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!findUser) {
      throw new NotFoundException('Data user tidak ditemukan');
    }

    if (updateUserDto.email && updateUserDto.email !== findUser.email) {
      const emailExist = await this.prisma.user.findUnique({
        where: { email: updateUserDto.email },
      });
      if (emailExist) {
        throw new BadRequestException('Email sudah digunakan oleh akun lain');
      }
    }

    const hashedPassword = updateUserDto.password
      ? await this.bcrypt.hashPassword(updateUserDto.password)
      : undefined;

    const updateUser = await this.prisma.user.update({
      where: { id },
      data: {
        ...updateUserDto,
        ...(hashedPassword && { password: hashedPassword }),
      },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        updatedAt: true,
      },
    });

    return {
      success: true,
      message: 'User berhasil diperbarui',
      data: updateUser,
    };
  }

  async remove(id: string) {
    await this.findOne(id);

    const deletedUser = await this.prisma.user.delete({
      where: { id },
      select: { id: true, email: true },
    });

    return {
      success: true,
      message: 'User berhasil dihapus',
      data: deletedUser,
    };
  }
}