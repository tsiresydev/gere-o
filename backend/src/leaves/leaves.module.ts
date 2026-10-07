import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersModule } from '../users/users.module';
import { LeaveBalance, LeaveBalanceSchema } from './entities/leave-balance.schema';
import { LeaveRequest, LeaveRequestSchema } from './entities/leave-request.schema';
import {
  LeaveTransaction,
  LeaveTransactionSchema,
} from './entities/leave-transaction.schema';
import { LeavesController } from './leaves.controller';
import { LeavesService } from './leaves.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: LeaveBalance.name, schema: LeaveBalanceSchema },
      { name: LeaveRequest.name, schema: LeaveRequestSchema },
      { name: LeaveTransaction.name, schema: LeaveTransactionSchema },
    ]),
    UsersModule,
  ],
  controllers: [LeavesController],
  providers: [LeavesService],
  exports: [LeavesService],
})
export class LeavesModule {}