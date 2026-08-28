import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { RoleGuard, Roles } from '../helper/roles-guard'; 
import { AuthGuard } from '@nestjs/passport';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';

@Controller('events')
@UseGuards(AuthGuard('jwt'), RoleGuard)
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  @Roles('ADMIN')
  create(@Body() createEventDto: CreateEventDto) {
    return this.eventsService.create(createEventDto);
  }

  @Get()
  async findAll(
    @Query() query: PaginationQueryDto,
    @Query('isActive') isActive?: string,
    @Query('scheduleId') scheduleId?: string,
  ) {
    const activeBool = isActive !== undefined ? isActive === 'true' : undefined;
    return this.eventsService.findAll({ ...query, isActive: activeBool, scheduleId });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.eventsService.findOne(id);
  }

  @Patch(':id')
  @Roles('ADMIN')
  update(@Param('id') id: string, @Body() updateEventDto: UpdateEventDto) {
    return this.eventsService.update(id, updateEventDto);
  }

  @Patch('status/:id')
  @Roles('ADMIN')
  toggleStatus(@Param('id') id: string, @Body('isActive') isActive: boolean) {
    return this.eventsService.toggleStatus(id, isActive);
  }

  @Delete(':id')
  @Roles('ADMIN')
  remove(@Param('id') id: string) {
    return this.eventsService.remove(id);
  }
}