import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { AuthModule } from '../../src/auth/auth.module';
import { configureApp } from '../../src/common/setup-app';
import configuration from '../../src/config/configuration';
import { DashboardModule } from '../../src/dashboard/dashboard.module';
import { LeaveBalance } from '../../src/leaves/entities/leave-balance.schema';
import { LeaveRequest } from '../../src/leaves/entities/leave-request.schema';
import {
  LeaveTransaction,
} from '../../src/leaves/entities/leave-transaction.schema';
import { LeavesModule } from '../../src/leaves/leaves.module';
import { User } from '../../src/users/entities/user.schema';
import { WorkDay } from '../../src/work-days/entities/work-day.schema';
import { WorkDaysModule } from '../../src/work-days/work-days.module';
import { createFakeLeavesModels, FakeLeavesModels } from './fake-leave-models';
import { createFakeUserModel, FakeUserModel } from './fake-user-model';
import { createFakeWorkDayModel, FakeWorkDayModel } from './fake-work-day-model';

export interface TestApp {
  app: INestApplication;
  users: FakeUserModel;
  workDays: FakeWorkDayModel;
  leaves: FakeLeavesModels;
}

export async function createTestApp(): Promise<TestApp> {
  const users = createFakeUserModel();
  const workDays = createFakeWorkDayModel();
  const leaves = createFakeLeavesModels();

  const moduleRef = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
      AuthModule,
      WorkDaysModule,
      LeavesModule,
      DashboardModule,
    ],
  })
    .overrideProvider(getModelToken(User.name))
    .useValue(users)
    .overrideProvider(getModelToken(WorkDay.name))
    .useValue(workDays)
    .overrideProvider(getModelToken(LeaveBalance.name))
    .useValue({
      findOne: leaves.findBalance,
      create: leaves.createBalance,
    })
    .overrideProvider(getModelToken(LeaveRequest.name))
    .useValue({
      create: leaves.createRequest,
      find: leaves.findRequests,
      countDocuments: leaves.countRequests,
      findOne: leaves.findOneRequest,
      findByIdAndUpdate: leaves.updateRequest,
    })
    .overrideProvider(getModelToken(LeaveTransaction.name))
    .useValue({
      create: leaves.createTransaction,
    })
    .compile();

  const app = moduleRef.createNestApplication();
  configureApp(app);
  await app.init();

  return { app, users, workDays, leaves };
}
