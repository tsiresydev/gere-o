import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthUser } from '../common/interfaces/auth-user.interface';
import { CashLedgerService } from './cash-ledger.service';
import { ContributionValidatorGuard } from './contribution-validator.guard';
import { ContributionsService } from './contributions.service';
import { ExpensesService } from './expenses.service';
import { NotificationsService } from './notifications.service';
import { DeclareContributionDto } from './dto/declare-contribution.dto';
import { DecideContributionDto } from './dto/decide-contribution.dto';
import { CreateExpenseDto } from './dto/create-expense.dto';
import {
  ContributionQueryDto,
} from './dto/contribution-query.dto';
import {
  CreateCorrectionDto,
  CreateContributionMemberDto,
  CreateExpenseCategoryDto,
  UpdateContributionMemberDto,
  UpdateExpenseCategoryDto,
} from './dto/member-and-category.dto';
import {
  ExpenseQueryDto,
  JournalQueryDto,
  OverviewQueryDto,
} from './dto/query.dto';

@Controller('contributions')
export class ContributionsController {
  constructor(
    private readonly contributionsService: ContributionsService,
    private readonly expensesService: ExpensesService,
    private readonly ledger: CashLedgerService,
    private readonly notifications: NotificationsService,
  ) {}

  @Get('overview')
  getOverview(@Query() query: OverviewQueryDto) {
    return this.contributionsService.getOverview(query);
  }

  @Get('members')
  getMembers() {
    return this.contributionsService.listMembers();
  }

  @Post('members')
  @UseGuards(ContributionValidatorGuard)
  createMember(@Body() dto: CreateContributionMemberDto) {
    return this.contributionsService.createMember(dto);
  }

  @Patch('members/:id')
  @UseGuards(ContributionValidatorGuard)
  updateMember(@Param('id') id: string, @Body() dto: UpdateContributionMemberDto) {
    return this.contributionsService.updateMember(id, dto);
  }

  @Get('categories')
  getCategories() {
    return this.contributionsService.listCategories();
  }

  @Post('categories')
  @UseGuards(ContributionValidatorGuard)
  createCategory(@Body() dto: CreateExpenseCategoryDto) {
    return this.contributionsService.createCategory(dto);
  }

  @Patch('categories/:id')
  @UseGuards(ContributionValidatorGuard)
  updateCategory(@Param('id') id: string, @Body() dto: UpdateExpenseCategoryDto) {
    return this.contributionsService.updateCategory(id, dto);
  }

  @Get('expenses')
  getExpenses(@Query() query: ExpenseQueryDto) {
    return this.expensesService.list(query);
  }

  @Post('expenses')
  @UseGuards(ContributionValidatorGuard)
  createExpense(@Body() dto: CreateExpenseDto, @CurrentUser() user: AuthUser) {
    return this.expensesService.create(dto, user);
  }

  @Get('journal')
  getJournal(@Query() query: JournalQueryDto) {
    return this.ledger.listJournal(query);
  }

  @Post('journal/correct')
  @UseGuards(ContributionValidatorGuard)
  correctTransaction(@Body() dto: CreateCorrectionDto, @CurrentUser() user: AuthUser) {
    return this.ledger.correct(dto, user);
  }

  @Get('notifications')
  @UseGuards(ContributionValidatorGuard)
  getNotifications(@Query('page') page = '1', @Query('limit') limit = '10') {
    return this.notifications.listLogs(Number(page), Number(limit));
  }

  @Post('notifications/:id/retry')
  @UseGuards(ContributionValidatorGuard)
  retryNotification(@Param('id') id: string) {
    return this.notifications.retry(id);
  }

  @Get('me')
  getMine(@Query() query: ContributionQueryDto, @CurrentUser() user: AuthUser) {
    return this.contributionsService.getMine(user, query);
  }

  @Get()
  listContributions(@Query() query: ContributionQueryDto) {
    return this.contributionsService.listContributions(query);
  }

  @Post()
  declare(@Body() dto: DeclareContributionDto, @CurrentUser() user: AuthUser) {
    return this.contributionsService.declare(dto, user);
  }

  @Get('pending-declarations')
  @UseGuards(ContributionValidatorGuard)
  listPendingDeclarations(@CurrentUser() user: AuthUser) {
    return this.contributionsService.listPendingDeclarations(user);
  }

  @Patch(':id/validate')
  @UseGuards(ContributionValidatorGuard)
  validate(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.contributionsService.validate(id, user);
  }

  @Patch(':id/reject')
  @UseGuards(ContributionValidatorGuard)
  reject(
    @Param('id') id: string,
    @Body() dto: DecideContributionDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.contributionsService.reject(id, dto, user);
  }
}
