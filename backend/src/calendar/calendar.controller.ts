import { Controller, Get, Query } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthUser } from '../common/interfaces/auth-user.interface';
import { CalendarService } from './calendar.service';
import { CalendarQueryDto } from './dto/calendar-query.dto';
import { CalendarResponse } from './dto/calendar-response.dto';

@Controller('calendar')
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  @Get()
  async getCalendar(
    @CurrentUser() user: AuthUser,
    @Query() query: CalendarQueryDto,
  ): Promise<CalendarResponse> {
    return await this.calendarService.getCalendar(user.id, query);
  }
}
