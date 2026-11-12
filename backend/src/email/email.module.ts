import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersModule } from '../users/users.module';
import { WorkDay, WorkDaySchema } from '../work-days/entities/work-day.schema';
import { LeaveRequest, LeaveRequestSchema } from '../leaves/entities/leave-request.schema';
import { EmailController } from './email.controller';
import { EmailService } from './email.service';
import { ReportService } from './report.service';

@Module({
  imports: [
    ConfigModule,
    UsersModule,
    MongooseModule.forFeature([
      { name: WorkDay.name, schema: WorkDaySchema },
      { name: LeaveRequest.name, schema: LeaveRequestSchema },
    ]),
  ],
  controllers: [EmailController],
  providers: [EmailService, ReportService],
  exports: [EmailService, ReportService],
})
export class EmailModule {}