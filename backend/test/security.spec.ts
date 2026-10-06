import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { UserRole } from '../src/common/enums/user-role.enum';
import { createTestApp, TestApp } from './helpers/create-test-app';
import { signToken } from './helpers/tokens';

describe('Sécurité', () => {
  let testApp: TestApp;
  let server: ReturnType<INestApplication['getHttpServer']>;
  let userId: string;
  let token: string;

  const credentials = {
    email: 'securite@example.com',
    password: 'MotDePasse1',
    firstName: 'Sam',
    lastName: 'Secure',
  };

  beforeAll(async () => {
    testApp = await createTestApp();
    server = testApp.app.getHttpServer();

    const register = await request(server).post('/api/auth/register').send(credentials).expect(201);
    userId = register.body.id;

    const login = await request(server)
      .post('/api/auth/login')
      .send({ email: credentials.email, password: credentials.password })
      .expect(200);
    token = login.body.accessToken;
  });

  afterAll(async () => {
    await testApp.app.close();
  });

  it('stocke le mot de passe sous forme de hash', () => {
    const stored = testApp.users.store.find((user) => user.email === credentials.email);

    expect(stored).toBeDefined();
    expect(stored?.passwordHash).not.toBe(credentials.password);
    expect(stored?.passwordHash).toMatch(/^\$2/);
  });

  it('ne retourne jamais passwordHash dans les réponses', async () => {
    const register = await request(server)
      .post('/api/auth/register')
      .send({ ...credentials, email: 'autre@example.com' })
      .expect(201);

    const login = await request(server)
      .post('/api/auth/login')
      .send({ email: credentials.email, password: credentials.password })
      .expect(200);

    const me = await request(server)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const responses = [register.body, login.body, login.body.user, me.body];

    for (const body of responses) {
      expect(JSON.stringify(body)).not.toContain('passwordHash');
      expect(JSON.stringify(body)).not.toContain(credentials.password);
    }
  });

  describe('routes protégées', () => {
    it('refuse un accès sans token (401)', async () => {
      await request(server).get('/api/auth/me').expect(401);
      await request(server).get('/api/users').expect(401);
    });

    it('refuse un token invalide (401)', async () => {
      const res = await request(server)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer ce-token-n-existe-pas')
        .expect(401);

      expect(res.body.message).toBe('Token invalide');
    });

    it('refuse un header Authorization malformé (401)', async () => {
      await request(server).get('/api/auth/me').set('Authorization', 'Basic xyz').expect(401);
      await request(server).get('/api/auth/me').set('Authorization', 'Bearer').expect(401);
    });

    it('refuse un token signé avec un autre secret (401)', async () => {
      const forged = new JwtService({ secret: 'autre-secret-totalement-different' }).sign({
        sub: userId,
        email: credentials.email,
        role: UserRole.EMPLOYEE,
      });

      const res = await request(server)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${forged}`)
        .expect(401);

      expect(res.body.message).toBe('Token invalide');
    });

    it('refuse un token expiré (401)', async () => {
      const expired = signToken(
        { sub: userId, email: credentials.email, role: UserRole.EMPLOYEE },
        { expiresIn: '-1h' },
      );

      const res = await request(server)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${expired}`)
        .expect(401);

      expect(res.body.message).toBe('Session expirée');
    });

    it('refuse un token dont l\'utilisateur n\'existe plus (401)', async () => {
      const orphan = signToken({
        sub: '000000000000000000000000',
        email: 'supprime@example.com',
        role: UserRole.EMPLOYEE,
      });

      await request(server)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${orphan}`)
        .expect(401);
    });
  });
});
