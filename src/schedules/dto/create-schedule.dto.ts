import { IsNotEmpty, IsString, IsEnum, IsUUID, Matches } from 'class-validator';
import { DayOfWeek } from '@prisma/client';

export class CreateScheduleDto {
  @IsNotEmpty()
  @IsUUID()
  courseId!: string;

  @IsNotEmpty()
  @IsEnum(DayOfWeek)
  day!: DayOfWeek; // MONDAY, TUESDAY, WEDNESDAY, dst.

  @IsNotEmpty()
  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: 'startTime format harus HH:mm (contoh: 08:00)' })
  startTime!: string;

  @IsNotEmpty()
  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: 'endTime format harus HH:mm (contoh: 10:30)' })
  endTime!: string;

  @IsNotEmpty()
  @IsString()
  room!: string;

  @IsNotEmpty()
  @IsString()
  lecturer!: string; // Sesuai schema: lecturer
}