import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersModule } from '../users/users.module';
import { WorkDay, WorkDaySchema } from '../work-days/entities/work-day.schema';
import { LeaveRequest, LeaveRequestSchema } from '../leaves/entities/leave-request.schema';
import { EmailController } from './email.controller';
import { EmailService } from './email.service';
import { SentReport, SentReportSchema } from './entities/sent-report.schema';
import { ReportService } from './report.service';
import { SentReportService } from './sent-report.service';

@Module({
  imports: [
    ConfigModule,
    UsersModule,
    MongooseModule.forFeature([
      { name: WorkDay.name, schema: WorkDaySchema },
      { name: LeaveRequest.name, schema: LeaveRequestSchema },
      { name: SentReport.name, schema: SentReportSchema },
    ]),
  ],
  controllers: [EmailController],
  providers: [EmailService, ReportService, SentReportService],
  exports: [EmailService, ReportService, SentReportService],
})
export class EmailModule {}
