import { IsNotEmpty, IsUUID } from 'class-validator';

export class ScanAttendanceDto {
  @IsNotEmpty()
  @IsUUID()
  eventId!: string; // Nilai eventId hasil scan dari QR Code Dosen/Admin
}