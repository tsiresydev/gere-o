import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LeavesModule } from '../leaves/leaves.module';
import { WorkDay, WorkDaySchema } from '../work-days/entities/work-day.schema';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: WorkDay.name, schema: WorkDaySchema }]),
    LeavesModule,
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
