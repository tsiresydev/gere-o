import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from './auth/auth.module';
import { CalendarModule } from './calendar/calendar.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { LeavesModule } from './leaves/leaves.module';
import { UsersModule } from './users/users.module';
import { WorkDaysModule } from './work-days/work-days.module';
import configuration from './config/configuration';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.getOrThrow<string>('mongodbUri'),
      }),
    }),
    AuthModule,
    UsersModule,
    WorkDaysModule,
    LeavesModule,
    DashboardModule,
    CalendarModule,
  ],
})
export class AppModule {}
