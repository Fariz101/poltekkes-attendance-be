import { IsEmail, IsNotEmpty, IsEnum, MinLength, IsOptional } from 'class-validator';
import { Role } from '@prisma/client'

export class CreateUserDto {
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @MinLength(6)
  @IsNotEmpty()
  password!: string;

  @IsOptional()
  @IsEnum(Role)
  role?: Role;
}