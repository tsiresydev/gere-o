import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthUser } from '../common/interfaces/auth-user.interface';
import { CreateWorkDayDto } from './dto/create-work-day.dto';
import { DailySummaryQueryDto } from './dto/daily-summary-query.dto';
import { ListWorkDaysQueryDto } from './dto/list-work-days-query.dto';
import { MonthlySummaryQueryDto, WeeklySummaryQueryDto } from './dto/summary-query.dto';
import { UpdateWorkDayDto } from './dto/update-work-day.dto';
import {
  DailySummaryResponse,
  MonthlySummaryResponse,
  WeeklySummaryResponse,
  WorkDayPageResponse,
  WorkDayResponseDto,
} from './dto/work-day-response.dto';
import { WorkDaysService } from './work-days.service';

@Controller('work-days')
export class WorkDaysController {
  constructor(private readonly workDaysService: WorkDaysService) {}

  @Post()
  async create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateWorkDayDto,
  ): Promise<WorkDayResponseDto> {
    const day = await this.workDaysService.create(user.id, dto);
    return WorkDayResponseDto.from(day);
  }

  @Get()
  async findAll(
    @CurrentUser() user: AuthUser,
    @Query() query: ListWorkDaysQueryDto,
  ): Promise<WorkDayPageResponse> {
    const result = await this.workDaysService.findAll(user.id, query);
    return {
      ...result,
      items: result.items.map((day) => WorkDayResponseDto.from(day)),
    };
  }

  @Get('summary/daily')
  async dailySummary(
    @CurrentUser() user: AuthUser,
    @Query() query: DailySummaryQueryDto,
  ): Promise<DailySummaryResponse> {
    const date = query.date ?? this.today();
    return await this.workDaysService.dailySummary(user.id, date);
  }

  @Get('summary/weekly')
  async weeklySummary(
    @CurrentUser() user: AuthUser,
    @Query() query: WeeklySummaryQueryDto,
  ): Promise<WeeklySummaryResponse> {
    return await this.workDaysService.weeklySummary(user.id, query.weekStart);
  }

  @Get('summary/monthly')
  async monthlySummary(
    @CurrentUser() user: AuthUser,
    @Query() query: MonthlySummaryQueryDto,
  ): Promise<MonthlySummaryResponse> {
    return await this.workDaysService.monthlySummary(
      user.id,
      query.year,
      query.month,
    );
  }

  @Get(':id')
  async findOne(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<WorkDayResponseDto> {
    const day = await this.workDaysService.findOne(user.id, id);
    return WorkDayResponseDto.from(day);
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateWorkDayDto,
  ): Promise<WorkDayResponseDto> {
    const day = await this.workDaysService.update(user.id, id, dto);
    return WorkDayResponseDto.from(day);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<void> {
    await this.workDaysService.remove(user.id, id);
  }

  private today(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
