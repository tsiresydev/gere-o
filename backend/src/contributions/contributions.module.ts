import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { EmailModule } from '../email/email.module';
import { User, UserSchema } from '../users/entities/user.schema';
import { CashLedgerService } from './cash-ledger.service';
import { ContributionValidatorGuard } from './contribution-validator.guard';
import { ContributionsController } from './contributions.controller';
import { ContributionsService } from './contributions.service';
import { ContributionSeedService } from './seed.service';
import { ExpensesService } from './expenses.service';
import {
  NotificationProcessorService,
  NotificationsService,
} from './notifications.service';
import {
  CashTransaction,
  CashTransactionSchema,
} from './entities/cash-transaction.schema';
import {
  Contribution,
  ContributionSchema,
} from './entities/contribution.schema';
import {
  ContributionMember,
  ContributionMemberSchema,
} from './entities/contribution-member.schema';
import {
  ExpenseCategory,
  ExpenseCategorySchema,
} from './entities/expense-category.schema';
import { Expense, ExpenseSchema } from './entities/expense.schema';
import {
  NotificationLog,
  NotificationLogSchema,
} from './entities/notification-log.schema';

@Module({
  imports: [
    ConfigModule,
    EmailModule,
    MongooseModule.forFeature([
      { name: ContributionMember.name, schema: ContributionMemberSchema },
      { name: Contribution.name, schema: ContributionSchema },
      { name: Expense.name, schema: ExpenseSchema },
      { name: ExpenseCategory.name, schema: ExpenseCategorySchema },
      { name: CashTransaction.name, schema: CashTransactionSchema },
      { name: NotificationLog.name, schema: NotificationLogSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [ContributionsController],
  providers: [
    ContributionsService,
    ExpensesService,
    CashLedgerService,
    NotificationsService,
    NotificationProcessorService,
    ContributionValidatorGuard,
    ContributionSeedService,
  ],
  exports: [ContributionsService, ExpensesService, CashLedgerService, NotificationsService],
})
export class ContributionsModule {}
