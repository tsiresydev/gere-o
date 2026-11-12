import { Body, Controller, Post } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthUser } from '../common/interfaces/auth-user.interface';
import { EmailReportPreview, EmailSendResult, GenerateReportDto, SendReportDto } from './dto/email-dto';
import { ReportService } from './report.service';

@Controller('email')
export class EmailController {
  constructor(private readonly reportService: ReportService) {}

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
}