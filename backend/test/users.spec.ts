import { INestApplication } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import request from 'supertest';
import { UserRole } from '../src/common/enums/user-role.enum';
import { createTestApp, TestApp } from './helpers/create-test-app';
import { signToken } from './helpers/tokens';

describe('Utilisateurs et rôles', () => {
  let testApp: TestApp;
  let server: ReturnType<INestApplication['getHttpServer']>;
  let adminToken: string;
  let employeeToken: string;

  const adminEmail = 'admin@example.com';
  const employeeEmail = 'employe@example.com';

  beforeAll(async () => {
    testApp = await createTestApp();
    server = testApp.app.getHttpServer();

    await testApp.users.create({
      email: adminEmail,
      passwordHash: await bcrypt.hash('AdminMotDePasse1', 10),
      firstName: 'Ada',
      lastName: 'Admin',
      role: UserRole.ADMIN,
      isActive: true,
    });

    const adminLogin = await request(server)
      .post('/api/auth/login')
      .send({ email: adminEmail, password: 'AdminMotDePasse1' })
      .expect(200);
    adminToken = adminLogin.body.accessToken;

    const employeeRegister = await request(server)
      .post('/api/auth/register')
      .send({
        email: employeeEmail,
        password: 'MotDePasse1',
        firstName: 'Élise',
        lastName: 'Employée',
      })
      .expect(201);

    expect(employeeRegister.body.role).toBe('EMPLOYEE');

    const employeeLogin = await request(server)
      .post('/api/auth/login')
      .send({ email: employeeEmail, password: 'MotDePasse1' })
      .expect(200);
    employeeToken = employeeLogin.body.accessToken;
  });

  afterAll(async () => {
    await testApp.app.close();
  });

  describe('GET /api/users (ADMIN uniquement)', () => {
    it('accepte un ADMIN (200) et ne expose pas passwordHash', async () => {
      const res = await request(server)
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(2);

      const emails = res.body.map((user: { email: string }) => user.email);
      expect(emails).toContain(adminEmail);
      expect(emails).toContain(employeeEmail);

      expect(JSON.stringify(res.body)).not.toContain('passwordHash');
      expect(res.body[0].role).toBeDefined();
    });

    it('refuse un EMPLOYEE (403)', async () => {
      const res = await request(server)
        .get('/api/users')
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(403);

      expect(res.body.message).toBe('Rôle insuffisant');
    });

    it('refuse une requête sans token (401)', async () => {
      await request(server).get('/api/users').expect(401);
    });
  });

  describe('Utilisateur courant', () => {
    it('retourne le rôle ADMIN via /api/auth/me', async () => {
      const res = await request(server)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).toMatchObject({ email: adminEmail, role: UserRole.ADMIN });
    });

    it('retourne le rôle EMPLOYEE via /api/auth/me', async () => {
      const res = await request(server)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(200);

      expect(res.body).toMatchObject({ email: employeeEmail, role: UserRole.EMPLOYEE });
    });
  });

  describe('Compte désactivé', () => {
    it('refuse la connexion d\'un compte désactivé (403)', async () => {
      await testApp.users.create({
        email: 'desactive@example.com',
        passwordHash: await bcrypt.hash('MotDePasse1', 10),
        firstName: 'Dana',
        lastName: 'Desactive',
        role: UserRole.EMPLOYEE,
        isActive: false,
      });

      const res = await request(server)
        .post('/api/auth/login')
        .send({ email: 'desactive@example.com', password: 'MotDePasse1' })
        .expect(403);

      expect(res.body.message).toBe('Compte désactivé');
    });

    it('refuse le token d\'un compte désactivé (401)', async () => {
      const disabled = testApp.users.store.find(
        (user) => user.email === 'desactive@example.com',
      );

      expect(disabled).toBeDefined();

      const forged = signToken({
        sub: disabled?._id ?? '',
        email: 'desactive@example.com',
        role: UserRole.EMPLOYEE,
      });

      await request(server)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${forged}`)
        .expect(401);
    });
  });
});
