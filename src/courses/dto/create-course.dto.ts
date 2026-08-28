import { IsNotEmpty, IsString, IsInt, Min } from 'class-validator';

export class CreateCourseDto {
  @IsNotEmpty()
  @IsString()
  code!: string; // Contoh: "MK-001"

  @IsNotEmpty()
  @IsString()
  name!: string; // Contoh: "Pemrograman Web"

  @IsNotEmpty()
  @IsInt()
  @Min(1)
  sks!: number;

  @IsNotEmpty()
  @IsString()
  prodi!: string; // Sesuai schema: prodi

  @IsNotEmpty()
  @IsInt()
  @Min(1)
  semester!: number; // Sesuai schema: semester
}