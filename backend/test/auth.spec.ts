import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, TestApp } from './helpers/create-test-app';

describe('Auth — API', () => {
  let testApp: TestApp;
  let server: ReturnType<INestApplication['getHttpServer']>;

  const validRegister = {
    email: 'alice@example.com',
    password: 'MotDePasse1',
    firstName: 'Alice',
    lastName: 'Martin',
  };

  beforeAll(async () => {
    testApp = await createTestApp();
    server = testApp.app.getHttpServer();
  });

  afterAll(async () => {
    await testApp.app.close();
  });

  describe('POST /api/auth/register', () => {
    it('crée un utilisateur (201) sans exposer passwordHash', async () => {
      const res = await request(server).post('/api/auth/register').send(validRegister).expect(201);

      expect(res.body).toMatchObject({
        email: 'alice@example.com',
        firstName: 'Alice',
        lastName: 'Martin',
        role: 'EMPLOYEE',
        isActive: true,
      });
      expect(typeof res.body.id).toBe('string');
      expect(res.body.passwordHash).toBeUndefined();
      expect(res.body.password).toBeUndefined();
    });

    it('refuse un email déjà utilisé (409)', async () => {
      const res = await request(server)
        .post('/api/auth/register')
        .send({ ...validRegister, firstName: 'Autre' })
        .expect(409);

      expect(res.body.statusCode).toBe(409);
      expect(res.body.message).toBe('Un utilisateur avec cet email existe déjà');
    });

    it('normalise la casse de l\'email', async () => {
      await request(server)
        .post('/api/auth/register')
        .send({ ...validRegister, email: '  Bob@Example.COM  ' })
        .expect(201);

      const stored = testApp.users.store.find((user) => user.email === 'bob@example.com');
      expect(stored).toBeDefined();
    });

    it('refuse un email invalide (400)', async () => {
      const res = await request(server)
        .post('/api/auth/register')
        .send({ ...validRegister, email: 'pas-un-email' })
        .expect(400);

      expect(res.body.statusCode).toBe(400);
    });

    it('refuse un mot de passe trop court (400)', async () => {
      const res = await request(server)
        .post('/api/auth/register')
        .send({ ...validRegister, email: 'court@example.com', password: 'abc' })
        .expect(400);

      expect(res.body.message).toContain(
        'Le mot de passe doit contenir au moins 8 caractères',
      );
    });

    it('refuse un prénom vide (400)', async () => {
      await request(server)
        .post('/api/auth/register')
        .send({ ...validRegister, email: 'sans-prenom@example.com', firstName: '' })
        .expect(400);
    });

    it('refuse les propriétés inconnues (400)', async () => {
      await request(server)
        .post('/api/auth/register')
        .send({ ...validRegister, email: 'inconnu@example.com', role: 'ADMIN' })
        .expect(400);
    });
  });

  describe('POST /api/auth/login', () => {
    it('connecte un utilisateur valide et retourne un token', async () => {
      const res = await request(server)
        .post('/api/auth/login')
        .send({ email: 'alice@example.com', password: 'MotDePasse1' })
        .expect(200);

      expect(typeof res.body.accessToken).toBe('string');
      expect(res.body.accessToken.length).toBeGreaterThan(0);
      expect(res.body.user).toMatchObject({ email: 'alice@example.com', role: 'EMPLOYEE' });
      expect(res.body.user.passwordHash).toBeUndefined();
      expect(res.body.passwordHash).toBeUndefined();
    });

    it('accepte un email saisi avec une casse différente', async () => {
      await request(server)
        .post('/api/auth/login')
        .send({ email: 'ALICE@EXAMPLE.COM', password: 'MotDePasse1' })
        .expect(200);
    });

    it('refuse un mot de passe incorrect (401)', async () => {
      const res = await request(server)
        .post('/api/auth/login')
        .send({ email: 'alice@example.com', password: 'MauvaisMotDePasse' })
        .expect(401);

      expect(res.body.message).toBe('Email ou mot de passe incorrect');
    });

    it('refuse un utilisateur inexistant (401) avec le même message', async () => {
      const res = await request(server)
        .post('/api/auth/login')
        .send({ email: 'inexistant@example.com', password: 'MotDePasse1' })
        .expect(401);

      expect(res.body.message).toBe('Email ou mot de passe incorrect');
    });

    it('refuse les données invalides (400)', async () => {
      await request(server)
        .post('/api/auth/login')
        .send({ email: 'alice@example.com' })
        .expect(400);
    });
  });

  describe('GET /api/auth/me', () => {
    it('retourne l\'utilisateur connecté (200)', async () => {
      const login = await request(server)
        .post('/api/auth/login')
        .send({ email: 'alice@example.com', password: 'MotDePasse1' })
        .expect(200);

      const res = await request(server)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${login.body.accessToken}`)
        .expect(200);

      expect(res.body).toMatchObject({
        email: 'alice@example.com',
        firstName: 'Alice',
        lastName: 'Martin',
        role: 'EMPLOYEE',
        isActive: true,
      });
      expect(res.body.passwordHash).toBeUndefined();
    });

    it('refuse une requête sans token (401)', async () => {
      const res = await request(server).get('/api/auth/me').expect(401);

      expect(res.body.statusCode).toBe(401);
    });
  });
});
