import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateStudentDto } from './create-student.dto';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { RegistrationStatus } from '@prisma/client';

export class UpdateStudentDto extends PartialType(OmitType(CreateStudentDto, ['email', 'password'] as const),) {
    @IsOptional()
  @IsString()
  nim?: string;

  @IsOptional()
  @IsEnum(RegistrationStatus)
  status?: RegistrationStatus;
}
