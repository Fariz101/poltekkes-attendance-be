import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  BadRequestException,
  Delete,
} from '@nestjs/common';
import { AttendancesService } from './attendances.service';
import { ScanAttendanceDto } from './dto/scan-attendance.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { RoleGuard, Roles } from '../helper/roles-guard';
import { AuthGuard } from '@nestjs/passport';

@Controller('attendances')
@UseGuards(AuthGuard('jwt'), RoleGuard)
export class AttendancesController {
  constructor(private readonly attendancesService: AttendancesService) {}

  // 1. Mahasiswa melakukan scan QR Code
  @Post('scan')
  @Roles('STUDENT')
  async scanQR(@Req() req, @Body() scanDto: ScanAttendanceDto) {
    const userId = req.user.id;
    if (!userId) {
      throw new BadRequestException('User ID tidak ditemukan dalam token');
    }
    return this.attendancesService.scanQR(userId, scanDto);
  }

  // 2. Admin melihat SELURUH rekap presensi (Global dengan Filter, Search, Pagination)
  @Get()
  @Roles('ADMIN')
  async findAll(
    @Query() query: PaginationQueryDto,
    @Query('eventId') eventId?: string,
    @Query('studentId') studentId?: string,
  ) {
    return this.attendancesService.findAll({ ...query, eventId, studentId });
  }

  // 3. Mahasiswa melihat riwayat presensi pribadi (Dengan Pagination & Search)
  @Get('me')
  @Roles('STUDENT')
  async getMyAttendances(@Req() req, @Query() query: PaginationQueryDto) {
    const userId = req.user.id;
    if (!userId) {
      throw new BadRequestException('User ID tidak ditemukan dalam token');
    }
    return this.attendancesService.getMyAttendances(userId, query);
  }

  // 4. Admin melihat rekap mahasiswa pada event tertentu (Dengan Pagination & Search)
  @Get('event/:eventId')
  @Roles('ADMIN')
  async getEventAttendances(
    @Param('eventId') eventId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.attendancesService.getEventAttendances(eventId, query);
  }

  // 5. Admin menghapus record presensi
  @Delete(':id')
  @Roles('ADMIN')
  async remove(@Param('id') id: string) {
    return this.attendancesService.remove(id);
  }
}