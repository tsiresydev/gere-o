import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WorkDay, WorkDaySchema } from './entities/work-day.schema';
import { WorkDaysController } from './work-days.controller';
import { WorkDaysService } from './work-days.service';

@Module({
  imports: [MongooseModule.forFeature([{ name: WorkDay.name, schema: WorkDaySchema }])],
  controllers: [WorkDaysController],
  providers: [WorkDaysService],
})
export class WorkDaysModule {}
