import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LeavesModule } from '../leaves/leaves.module';
import { WorkDay, WorkDaySchema } from '../work-days/entities/work-day.schema';
import { LeaveRequest, LeaveRequestSchema } from '../leaves/entities/leave-request.schema';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: WorkDay.name, schema: WorkDaySchema },
      { name: LeaveRequest.name, schema: LeaveRequestSchema },
    ]),
    LeavesModule,
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
