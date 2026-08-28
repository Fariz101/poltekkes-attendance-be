import { 
  Injectable, 
  BadRequestException, 
  NotFoundException, 
  InternalServerErrorException 
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BcryptService } from '../bcrypt/bcrypt.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { Role, RegistrationStatus, Gender, Prisma } from '@prisma/client';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import * as QRCode from 'qrcode';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';

@Injectable()
export class StudentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bcrypt: BcryptService,
    private readonly cloudinaryService: CloudinaryService
  ) {}

  // Helper Private: Auto-generate NRM (Format: STD-YYYY-XXXX)
  private async generateNRM(): Promise<string> {
    const currentYear = new Date().getFullYear();
    const prefix = `STD-${currentYear}-`;

    const lastStudent = await this.prisma.student.findFirst({
      where: { nrm: { startsWith: prefix } },
      orderBy: { createdAt: 'desc' },
      select: { nrm: true },
    });

    if (!lastStudent || !lastStudent.nrm) {
      return `${prefix}0001`;
    }

    const lastSequence = parseInt(lastStudent.nrm.replace(prefix, ''), 10);
    const nextSequence = lastSequence + 1;
    return `${prefix}${nextSequence.toString().padStart(4, '0')}`;
  }

  // CREATE STUDENT (Pendaftaran Mahasiswa Baru)
async create(createStudentDto: CreateStudentDto) {
  const { 
    email, 
    password, 
    fullName,
    phoneNumber,
    birthPlace,
    birthDate,
    gender,
    prodiSelected,
    tahunAjaran,
  } = createStudentDto;

  // 1. Cek ketersediaan email
  const existingUser = await this.prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    throw new BadRequestException('Email sudah terdaftar');
  }

  // 2. Hash password & auto-generate NRM
  const hashedPassword = await this.bcrypt.hashPassword(password);
  const nrm = await this.generateNRM();

  // 3. Simpan User & Student dalam transaksi DB
  const result = await this.prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email,
        password: hashedPassword,
        role: Role.STUDENT,
      },
    });

    const student = await tx.student.create({
      data: {
        userId: user.id,
        nrm,
        fullName,
        phoneNumber,
        birthPlace,
        birthDate: new Date(birthDate),
        gender,
        prodiSelected,
        tahunAjaran,
        status: RegistrationStatus.SUBMITTED,
      },
    });

    const { password: _, ...userWithoutPassword } = user;
    return { student, userWithoutPassword };
  });

  // 4. Generate & Upload QR Code (Beri try...catch khusus agar error Cloudinary kelihatan)
  let qrCodeUrl: string | null = null;

  try {
    const qrPayload = JSON.stringify({
      name: result.student.fullName,
      studentId: result.student.id,
      nrm: result.student.nrm,
    });

    const qrBuffer = await QRCode.toBuffer(qrPayload, {
      type: 'png',
      width: 400,
      margin: 2,
    });

    // Upload ke Cloudinary
    const uploadResult = await this.cloudinaryService.uploadFile(qrBuffer, 'qr-students');
    qrCodeUrl = uploadResult.secure_url;

    // Update qrCodeUrl di DB
    await this.prisma.student.update({
      where: { id: result.student.id },
      data: { qrCodeUrl },
    });
  } catch (error) {
    // Print error asli ke terminal VS Code agar gampang di-debug!
    console.error('ERROR CLOUDINARY / QR GENERATE:', error);
  }

  return {
    success: true,
    message: 'Student berhasil didaftarkan',
    data: {
      ...result.student,
      qrCodeUrl,
      user: result.userWithoutPassword,
    },
  };
}
  // READ ALL
  async findAll(query: PaginationQueryDto & { gender?: Gender; prodi?: string; status?: RegistrationStatus }) {
  const { page = 1, limit = 10, search, sortBy = 'createdAt', sortOrder = 'desc', gender, prodi, status } = query;
  const skip = (page - 1) * limit;

  const where: Prisma.StudentWhereInput = {};
  if (search) {
    where.OR = [
      { fullName: { contains: search } },
      { nrm: { contains: search } },
      { nim: { contains: search } },
      { user: { email: { contains: search } } },
    ];
  }
  if (gender) where.gender = gender;
  if (prodi) where.prodiSelected = prodi;
  if (status) where.status = status;

  const [data, totalItems] = await this.prisma.$transaction([
    this.prisma.student.findMany({
      where,
      skip,
      take: Number(limit),
      orderBy: { [sortBy]: sortOrder.toLowerCase() },
      include: { user: { select: { id: true, email: true, role: true, isActive: true } } },
    }),
    this.prisma.student.count({ where }),
  ]);

  const totalPages = Math.ceil(totalItems / limit);
  return {
    success: true,
    data,
    meta: { currentPage: Number(page), itemsPerPage: Number(limit), totalItems, totalPages, hasNextPage: page < totalPages, hasPrevPage: page > 1 },
  };
}

  // READ ME (Berdasarkan userId dari JWT)
async findMe(userId: string) {
  const student = await this.prisma.student.findUnique({
    where: { userId },
    include: {
      user: {
        select: { id: true, email: true, role: true, isActive: true },
      },
    },
  });

  if (!student) {
    throw new NotFoundException('Data profil Student tidak ditemukan');
  }

  return { success: true, data: student };
}

  // READ ONE
  async findOne(id: string) {
    const student = await this.prisma.student.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, email: true, role: true, isActive: true },
        },
      },
    });

    if (!student) throw new NotFoundException('Data Student tidak ditemukan');
    return { success: true, data: student };
  }

  // UPDATE STUDENT (Update Profil, Status, dan Input NIM oleh Admin)
  async update(id: string, updateStudentDto: UpdateStudentDto) {
    await this.findOne(id); // Pastikan data ada

    const { birthDate, ...otherFields } = updateStudentDto;

    try {
      const updatedStudent = await this.prisma.student.update({
        where: { id },
        data: {
          ...otherFields,
          ...(birthDate && { birthDate: new Date(birthDate) }),
        },
        include: {
          user: {
            select: { id: true, email: true, role: true, isActive: true },
          },
        },
      });

      return {
        success: true,
        message: 'Data Student berhasil diperbarui',
        data: updatedStudent,
      };
    } catch (error) {
      throw new InternalServerErrorException('Gagal memperbarui data Student');
    }
  }

  // DELETE STUDENT (Beserta Hapus File QR di Cloudinary & Record User)
async remove(id: string) {
  const student = await this.prisma.student.findUnique({
    where: { id },
    select: { userId: true, qrCodeUrl: true }, // <-- Tambahkan qrCodeUrl di select
  });

  if (!student) {
    throw new NotFoundException('Data Student tidak ditemukan');
  }

  // Hapus QR Code di Cloudinary jika file-nya ada
  if (student.qrCodeUrl) {
    await this.cloudinaryService.deleteFile(student.qrCodeUrl);
  }

  // Menghapus User (karena ada onDelete: Cascade, record Student otomatis ikut terhapus)
  await this.prisma.user.delete({
    where: { id: student.userId },
  });

  return { success: true, message: 'Student, User, dan QR Code berhasil dihapus' };
}

  async regenerateQrCode(id: string) {
    const student = await this.prisma.student.findUnique({ where: { id } });
    if (!student) throw new NotFoundException('Mahasiswa tidak ditemukan');

    if (student.qrCodeUrl) {
      await this.cloudinaryService.deleteFile(student.qrCodeUrl);
    }

    const qrPayload = JSON.stringify({
      studentId: student.id,
      nrm: student.nrm,
    });

    const qrBuffer = await QRCode.toBuffer(qrPayload, { type: 'png', width: 400, margin: 2 });
    const uploadResult = await this.cloudinaryService.uploadFile(qrBuffer, 'qr-students');

    const updatedStudent = await this.prisma.student.update({
      where: { id },
      data: { qrCodeUrl: uploadResult.secure_url },
    });

    return {
      success: true,
      message: 'QR Code Mahasiswa berhasil diperbarui',
      data: updatedStudent,
    };
  }
}