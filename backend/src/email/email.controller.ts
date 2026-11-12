import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthUser } from '../common/interfaces/auth-user.interface';
import {
  EmailReportPreview,
  EmailSendResult,
  GenerateReportDto,
  SendReportDto,
} from './dto/email-dto';
import {
  ListSentReportsQueryDto,
  SentReportPageResponse,
  SentReportResponseDto,
} from './dto/sent-report.dto';
import { ReportService } from './report.service';
import { SentReportService } from './sent-report.service';

@Controller('email')
export class EmailController {
  constructor(
    private readonly reportService: ReportService,
    private readonly sentReportService: SentReportService,
  ) {}

  @Post('report/preview')
  async preview(
    @CurrentUser() user: AuthUser,
    @Body() dto: GenerateReportDto,
  ): Promise<EmailReportPreview> {
    return this.reportService.generatePreview(user.id, dto.year, dto.month);
  }

  @Post('report/send')
  async send(
    @CurrentUser() user: AuthUser,
    @Body() dto: SendReportDto,
  ): Promise<EmailSendResult> {
    return this.reportService.sendReport(user.id, dto);
  }

  @Get('reports')
  async list(
    @CurrentUser() user: AuthUser,
    @Query() query: ListSentReportsQueryDto,
  ): Promise<SentReportPageResponse> {
    return this.sentReportService.list(user.id, query);
  }

  @Get('reports/:id')
  async findOne(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<SentReportResponseDto> {
    return this.sentReportService.findOne(user.id, id);
  }
}
