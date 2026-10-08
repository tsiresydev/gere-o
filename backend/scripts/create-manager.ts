import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { UsersService } from '../src/users/users.service';
import * as bcrypt from 'bcryptjs';
import { UserRole } from '../src/common/enums/user-role.enum';
import { PASSWORD_HASH_ROUNDS } from '../src/config/constants';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const usersService = app.get(UsersService);

  const email = process.env.SEED_USER_EMAIL || 'manager@gere-o.local';
  const password = process.env.SEED_USER_PASSWORD || 'manager123';
  const firstName = process.env.SEED_USER_FIRSTNAME || 'Manager';
  const lastName = process.env.SEED_USER_LASTNAME || 'Gere-o';
  const role = (process.env.SEED_USER_ROLE as UserRole) || UserRole.MANAGER;

  const existing = await usersService.findByEmail(email);
  if (existing) {
    console.log(`User ${email} already exists`);
    await app.close();
    process.exit(0);
  }

  const passwordHash = await bcrypt.hash(password, PASSWORD_HASH_ROUNDS);

  const user = await usersService.create({
    email,
    passwordHash,
    firstName,
    lastName,
    role,
  });

  console.log('User created successfully:');
  console.log(`  Email: ${user.email}`);
  console.log(`  Password: ${password}`);
  console.log(`  Name: ${user.firstName} ${user.lastName}`);
  console.log(`  Role: ${user.role}`);
  console.log(`  ID: ${user._id}`);

  await app.close();
}

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});