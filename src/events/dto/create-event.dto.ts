import { IsNotEmpty, IsString, IsOptional, IsUUID, IsInt, IsDateString, Min } from 'class-validator';

export class CreateEventDto {
  @IsNotEmpty()
  @IsString()
  title!: string; // Contoh: "Pertemuan 1 - Pengenalan Keperawatan"

  @IsNotEmpty()
  @IsDateString()
  date!: string; // ISO String, contoh: "2026-08-28T08:00:00Z"

  @IsOptional()
  @IsInt()
  @Min(5)
  durationMin?: number; // Default 30 menit di Prisma schema

  @IsOptional()
  @IsUUID()
  scheduleId?: string;
}