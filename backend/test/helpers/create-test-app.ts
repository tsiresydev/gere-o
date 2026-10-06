import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { AuthModule } from '../../src/auth/auth.module';
import { configureApp } from '../../src/common/setup-app';
import configuration from '../../src/config/configuration';
import { User } from '../../src/users/entities/user.schema';
import { createFakeUserModel, FakeUserModel } from './fake-user-model';

export interface TestApp {
  app: INestApplication;
  users: FakeUserModel;
}

export async function createTestApp(): Promise<TestApp> {
  const users = createFakeUserModel();

  const moduleRef = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
      AuthModule,
    ],
  })
    .overrideProvider(getModelToken(User.name))
    .useValue(users)
    .compile();

  const app = moduleRef.createNestApplication();
  configureApp(app);
  await app.init();

  return { app, users };
}
