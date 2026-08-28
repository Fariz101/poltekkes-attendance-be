import { IsEmail, IsNotEmpty, IsString, MinLength, IsOptional, IsEnum, IsDateString } from 'class-validator';
import { Gender, RegistrationStatus } from '@prisma/client';

export class CreateStudentDto {
  // --- Data Akun User ---
  @IsEmail({}, { message: 'Format email tidak valid' })
  @IsNotEmpty({ message: 'Email wajib diisi' })
  email!: string;

  @IsString()
  @MinLength(6, { message: 'Password minimal 6 karakter' })
  @IsNotEmpty({ message: 'Password wajib diisi' })
  password!: string;

  // --- Data Profil Student ---

  @IsString()
  @IsNotEmpty({ message: 'Nama lengkap wajib diisi' })
  fullName!: string;

  @IsString()
  @IsNotEmpty({ message: 'Nomor telepon wajib diisi' })
  phoneNumber!: string;

  @IsString()
  @IsNotEmpty({ message: 'Tempat lahir wajib diisi' })
  birthPlace!: string;

  @IsDateString({}, { message: 'Format birthDate harus ISO date string (misal: 2005-08-26)' })
  @IsNotEmpty({ message: 'Tanggal lahir wajib diisi' })
  birthDate!: string;

  @IsEnum(Gender, { message: 'Gender harus MALE atau FEMALE' })
  @IsNotEmpty({ message: 'Jenis kelamin wajib diisi' })
  gender!: Gender;

  @IsString()
  @IsNotEmpty({ message: 'Prodi pilihan wajib diisi' })
  prodiSelected!: string;

  @IsString()
  @IsNotEmpty({ message: 'Tahun ajaran wajib diisi' })
  tahunAjaran!: string;

  @IsOptional()
  @IsEnum(RegistrationStatus)
  status?: RegistrationStatus;

  @IsOptional()
  @IsString()
  qrCodeUrl?: string;
}