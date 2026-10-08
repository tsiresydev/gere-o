import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LeaveRequest, LeaveRequestSchema } from '../leaves/entities/leave-request.schema';
import { WorkDay, WorkDaySchema } from '../work-days/entities/work-day.schema';
import { CalendarController } from './calendar.controller';
import { CalendarService } from './calendar.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: WorkDay.name, schema: WorkDaySchema },
      { name: LeaveRequest.name, schema: LeaveRequestSchema },
    ]),
  ],
  controllers: [CalendarController],
  providers: [CalendarService],
})
export class CalendarModule {}
