import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { UserRole } from '../src/common/enums/user-role.enum';
import { createTestApp, TestApp } from './helpers/create-test-app';
import { signToken } from './helpers/tokens';

describe('WorkDays — API', () => {
  let testApp: TestApp;
  let server: ReturnType<INestApplication['getHttpServer']>;
  let token: string;
  let otherToken: string;
  let otherUserId: string;

  const now = new Date();
  const today = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('-');

  const auth = (): Record<string, string> => ({ Authorization: `Bearer ${token}` });
  const otherAuth = (): Record<string, string> => ({
    Authorization: `Bearer ${otherToken}`,
  });

  beforeAll(async () => {
    testApp = await createTestApp();
    server = testApp.app.getHttpServer();

    const user = await testApp.users.create({
      email: 'pointeur@example.com',
      passwordHash: 'hash-simule',
      firstName: 'Paul',
      lastName: 'Pointeur',
      role: UserRole.EMPLOYEE,
    });
    token = signToken({ sub: String(user._id), email: user.email, role: user.role });

    const other = await testApp.users.create({
      email: 'autre@example.com',
      passwordHash: 'hash-simule',
      firstName: 'Anne',
      lastName: 'Autre',
      role: UserRole.EMPLOYEE,
    });
    otherUserId = String(other._id);
    otherToken = signToken({ sub: otherUserId, email: other.email, role: other.role });
  });

  afterAll(async () => {
    await testApp.app.close();
  });

  describe('POST /api/work-days', () => {
    it('enregistre une journée complète et calcule 8h00 / solde 0', async () => {
      const res = await request(server)
        .post('/api/work-days')
        .set(auth())
        .send({
          date: '2026-10-05',
          entryTime: '08:45',
          breakStart: '13:00',
          breakEnd: '14:00',
          exitTime: '17:45',
        })
        .expect(201);

      expect(res.body).toMatchObject({
        date: '2026-10-05',
        expectedMinutes: 480,
        workedMinutes: 480,
        balanceMinutes: 0,
        status: 'COMPLETED',
      });
      expect(typeof res.body.id).toBe('string');
      expect(res.body.userId).toBeDefined();
    });

    it('calcule un surplus (9h30 travaillées → +1h30)', async () => {
      const res = await request(server)
        .post('/api/work-days')
        .set(auth())
        .send({
          date: '2026-10-06',
          entryTime: '08:00',
          breakStart: '12:00',
          breakEnd: '12:30',
          exitTime: '18:00',
        })
        .expect(201);

      expect(res.body.workedMinutes).toBe(570);
      expect(res.body.balanceMinutes).toBe(90);
      expect(res.body.status).toBe('COMPLETED');
    });

    it('calcule un déficit (7h15 travaillées → -45)', async () => {
      const res = await request(server)
        .post('/api/work-days')
        .set(auth())
        .send({
          date: '2026-10-07',
          entryTime: '09:00',
          breakStart: '12:00',
          breakEnd: '12:45',
          exitTime: '16:00',
        })
        .expect(201);

      expect(res.body.workedMinutes).toBe(375);
      expect(res.body.balanceMinutes).toBe(-105);
    });

    it('crée une journée en cours (sans sortie) avec statut INCOMPLETE', async () => {
      const res = await request(server)
        .post('/api/work-days')
        .set(auth())
        .send({ date: '2026-10-08', entryTime: '08:45' })
        .expect(201);

      expect(res.body).toMatchObject({
        workedMinutes: 0,
        balanceMinutes: 0,
        status: 'INCOMPLETE',
      });
    });

    it('refuse une deuxième journée pour la même date (409)', async () => {
      const res = await request(server)
        .post('/api/work-days')
        .set(auth())
        .send({ date: '2026-10-05', entryTime: '09:00' })
        .expect(409);

      expect(res.body.message).toBe('Une journée existe déjà pour cette date');
    });

    it('refuse une date au format invalide (400)', async () => {
      const res = await request(server)
        .post('/api/work-days')
        .set(auth())
        .send({ date: '05/10/2026' })
        .expect(400);

      expect(res.body.message).toContain('La date doit être au format YYYY-MM-DD');
    });

    it('refuse une heure au format invalide (400)', async () => {
      const res = await request(server)
        .post('/api/work-days')
        .set(auth())
        .send({ date: '2026-10-09', entryTime: '8h45' })
        .expect(400);

      expect(res.body.message).toContain("L'heure d'entrée doit être au format HH:mm");
    });

    it('refuse une sortie antérieure à l’entrée (400)', async () => {
      const res = await request(server)
        .post('/api/work-days')
        .set(auth())
        .send({ date: '2026-10-09', entryTime: '17:00', exitTime: '09:00' })
        .expect(400);

      expect(res.body.message).toBe(
        "L'heure de sortie doit être postérieure à l'heure d'entrée",
      );
    });

    it('refuse une pause sans début (400)', async () => {
      const res = await request(server)
        .post('/api/work-days')
        .set(auth())
        .send({ date: '2026-10-09', entryTime: '08:45', breakEnd: '14:00' })
        .expect(400);

      expect(res.body.message).toBe(
        'La pause doit être renseignée avec un début et une fin',
      );
    });

    it('refuse une pause dont la fin précède le début (400)', async () => {
      const res = await request(server)
        .post('/api/work-days')
        .set(auth())
        .send({
          date: '2026-10-09',
          entryTime: '08:45',
          breakStart: '14:00',
          breakEnd: '13:00',
        })
        .expect(400);

      expect(res.body.message).toBe(
        'La fin de pause doit être postérieure au début de pause',
      );
    });

    it('refuse une pause antérieure à l’entrée (400)', async () => {
      const res = await request(server)
        .post('/api/work-days')
        .set(auth())
        .send({
          date: '2026-10-09',
          entryTime: '09:00',
          breakStart: '08:00',
          breakEnd: '09:00',
        })
        .expect(400);

      expect(res.body.message).toBe('Le début de pause doit être postérieur à l’entrée');
    });

    it('refuse une fin de pause après la sortie (400)', async () => {
      const res = await request(server)
        .post('/api/work-days')
        .set(auth())
        .send({
          date: '2026-10-09',
          entryTime: '08:00',
          breakStart: '12:00',
          breakEnd: '13:00',
          exitTime: '12:30',
        })
        .expect(400);

      expect(res.body.message).toBe('La fin de pause doit être antérieure à la sortie');
    });

    it('refuse une sortie sans entrée (400)', async () => {
      const res = await request(server)
        .post('/api/work-days')
        .set(auth())
        .send({ date: '2026-10-09', exitTime: '17:45' })
        .expect(400);

      expect(res.body.message).toBe(
        "L'heure d'entrée est obligatoire pour enregistrer l'heure de sortie",
      );
    });

    it('refuse les requêtes sans token (401)', async () => {
      await request(server)
        .post('/api/work-days')
        .send({ date: '2026-10-10', entryTime: '08:45' })
        .expect(401);
    });
  });

  describe('GET /api/work-days', () => {
    it('liste les journées de l’utilisateur, de la plus récente à la plus ancienne', async () => {
      const res = await request(server).get('/api/work-days').set(auth()).expect(200);

      expect(Array.isArray(res.body.items)).toBe(true);
      expect(res.body.items.length).toBeGreaterThanOrEqual(3);
      const dates = res.body.items.map((day: { date: string }) => day.date);
      expect([...dates].sort().reverse()).toEqual(dates);
      expect(res.body.items[0].passwordHash).toBeUndefined();
      expect(typeof res.body.total).toBe('number');
      expect(res.body.page).toBe(1);
      expect(res.body.limit).toBe(20);
    });

    it('ne retourne jamais les journées des autres utilisateurs', async () => {
      await request(server)
        .post('/api/work-days')
        .set(otherAuth())
        .send({ date: '2026-10-05', entryTime: '08:00' })
        .expect(201);

      const mine = await request(server).get('/api/work-days').set(auth()).expect(200);
      const others = await request(server)
        .get('/api/work-days')
        .set(otherAuth())
        .expect(200);

      expect(
        mine.body.items.every((day: { userId: string }) => day.userId !== otherUserId),
      ).toBe(true);
      expect(
        others.body.items.every((day: { userId: string }) => day.userId === otherUserId),
      ).toBe(true);
    });
  });

  describe('GET /api/work-days/:id', () => {
    it('retrouve une journée par son identifiant', async () => {
      const list = await request(server).get('/api/work-days').set(auth()).expect(200);
      const target = list.body.items.find((day: { date: string }) => day.date === '2026-10-05');

      const res = await request(server)
        .get(`/api/work-days/${target.id}`)
        .set(auth())
        .expect(200);

      expect(res.body.id).toBe(target.id);
      expect(res.body.workedMinutes).toBe(480);
    });

    it('renvoie 404 pour la journée d’un autre utilisateur', async () => {
      const others = await request(server)
        .get('/api/work-days')
        .set(otherAuth())
        .expect(200);
      const foreignId = others.body.items[0].id;

      await request(server).get(`/api/work-days/${foreignId}`).set(auth()).expect(404);
    });

    it('renvoie 404 pour un identifiant invalide', async () => {
      await request(server).get('/api/work-days/pas-un-id').set(auth()).expect(404);
    });
  });

  describe('PATCH /api/work-days/:id', () => {
    it('ajoute la sortie, recalcule et passe en COMPLETED', async () => {
      const list = await request(server).get('/api/work-days').set(auth()).expect(200);
      const inProgress = list.body.items.find(
        (day: { date: string }) => day.date === '2026-10-08',
      );

      const res = await request(server)
        .patch(`/api/work-days/${inProgress.id}`)
        .set(auth())
        .send({ breakStart: '12:45', breakEnd: '13:45', exitTime: '17:45' })
        .expect(200);

      expect(res.body).toMatchObject({
        entryTime: '08:45',
        breakStart: '12:45',
        breakEnd: '13:45',
        exitTime: '17:45',
        workedMinutes: 480,
        balanceMinutes: 0,
        status: 'COMPLETED',
      });
    });

    it('conserve les heures non modifiées lors d’une mise à jour partielle', async () => {
      const list = await request(server).get('/api/work-days').set(auth()).expect(200);
      const target = list.body.items.find((day: { date: string }) => day.date === '2026-10-06');

      const res = await request(server)
        .patch(`/api/work-days/${target.id}`)
        .set(auth())
        .send({ exitTime: '17:30' })
        .expect(200);

      expect(res.body.entryTime).toBe('08:00');
      expect(res.body.breakStart).toBe('12:00');
      expect(res.body.exitTime).toBe('17:30');
      expect(res.body.workedMinutes).toBe(540);
      expect(res.body.balanceMinutes).toBe(60);
    });

    it('interdit de modifier la journée d’un autre utilisateur (404)', async () => {
      const others = await request(server)
        .get('/api/work-days')
        .set(otherAuth())
        .expect(200);

      await request(server)
        .patch(`/api/work-days/${others.body.items[0].id}`)
        .set(auth())
        .send({ exitTime: '20:00' })
        .expect(404);
    });
  });

  describe('GET /api/work-days/summary/daily', () => {
    it('résume la journée du jour sans paramètre', async () => {
      const res = await request(server)
        .get('/api/work-days/summary/daily')
        .set(auth())
        .expect(200);

      expect(res.body.date).toBe(today);
      expect(res.body.expectedMinutes).toBe(480);
      expect(typeof res.body.workedMinutes).toBe('number');
      expect(typeof res.body.balanceMinutes).toBe('number');
    });

    it('résume une date précise (objectif/réalisé/solde)', async () => {
      const res = await request(server)
        .get('/api/work-days/summary/daily?date=2026-10-06')
        .set(auth())
        .expect(200);

      expect(res.body).toEqual({
        date: '2026-10-06',
        workedMinutes: 540,
        expectedMinutes: 480,
        balanceMinutes: 60,
      });
    });

    it('retourne des zéros pour une journée non enregistrée', async () => {
      const res = await request(server)
        .get('/api/work-days/summary/daily?date=2026-11-30')
        .set(auth())
        .expect(200);

      expect(res.body).toEqual({
        date: '2026-11-30',
        workedMinutes: 0,
        expectedMinutes: 480,
        balanceMinutes: 0,
      });
    });

    it('refuse une date invalide (400)', async () => {
      const res = await request(server)
        .get('/api/work-days/summary/daily?date=30-11-2026')
        .set(auth())
        .expect(400);

      expect(res.body.message).toContain('La date doit être au format YYYY-MM-DD');
    });
  });

  describe('GET /api/work-days/summary/weekly', () => {
    const days = [
      { date: '2025-01-06', entryTime: '08:00', exitTime: '16:00' },
      { date: '2025-01-07', entryTime: '09:00', exitTime: '15:00' },
      { date: '2025-01-12', entryTime: '08:00', exitTime: '16:00' },
      { date: '2025-01-13', entryTime: '08:00', exitTime: '16:00' },
      { date: '2025-02-03', entryTime: '08:00', exitTime: '16:00' },
    ];

    beforeAll(async () => {
      for (const day of days) {
        await request(server).post('/api/work-days').set(auth()).send(day).expect(201);
      }
    });

    it('totalise lundi → dimanche (06 au 12 janvier 2025 = 1320)', async () => {
      const res = await request(server)
        .get('/api/work-days/summary/weekly?weekStart=2025-01-06')
        .set(auth())
        .expect(200);

      expect(res.body).toEqual({
        weekStart: '2025-01-06',
        expectedMinutes: 2400,
        workedMinutes: 1320,
        balanceMinutes: -1080,
      });
    });

    it('normalise weekStart vers le lundi de la semaine', async () => {
      const res = await request(server)
        .get('/api/work-days/summary/weekly?weekStart=2025-01-10')
        .set(auth())
        .expect(200);

      expect(res.body.weekStart).toBe('2025-01-06');
      expect(res.body.workedMinutes).toBe(1320);
    });

    it('calcule la semaine courante sans paramètre', async () => {
      const res = await request(server)
        .get('/api/work-days/summary/weekly')
        .set(auth())
        .expect(200);

      expect(res.body.expectedMinutes).toBe(2400);
      expect(res.body.balanceMinutes).toBe(res.body.workedMinutes - 2400);
    });

    it('refuse une date invalide (400)', async () => {
      await request(server)
        .get('/api/work-days/summary/weekly?weekStart=05-01-2025')
        .set(auth())
        .expect(400);
    });
  });

  describe('GET /api/work-days/summary/monthly', () => {
    it('résume janvier 2025 sur les jours ouvrés (23 × 480 = 11040)', async () => {
      const res = await request(server)
        .get('/api/work-days/summary/monthly?year=2025&month=1')
        .set(auth())
        .expect(200);

      expect(res.body).toEqual({
        year: 2025,
        month: 1,
        expectedMinutes: 11040,
        workedMinutes: 1800,
        balanceMinutes: -9240,
      });
    });

    it('exclut les journées hors du mois demandé (février 2025)', async () => {
      const res = await request(server)
        .get('/api/work-days/summary/monthly?year=2025&month=2')
        .set(auth())
        .expect(200);

      expect(res.body.expectedMinutes).toBe(9600);
      expect(res.body.workedMinutes).toBe(480);
      expect(res.body.balanceMinutes).toBe(-9120);
    });

    it('refuse un mois hors bornes (400)', async () => {
      await request(server)
        .get('/api/work-days/summary/monthly?year=2025&month=13')
        .set(auth())
        .expect(400);
    });
  });

  describe('GET /api/work-days — filtres et pagination', () => {
    beforeAll(async () => {
      for (const date of ['2025-03-03', '2025-03-04', '2025-03-05', '2025-03-06', '2025-03-07']) {
        await request(server)
          .post('/api/work-days')
          .set(auth())
          .send({ date, entryTime: '08:00', exitTime: '16:00' })
          .expect(201);
      }
    });

    it('paginate la liste (page et limite)', async () => {
      const page1 = await request(server)
        .get('/api/work-days?startDate=2025-03-03&endDate=2025-03-07&limit=2&page=1')
        .set(auth())
        .expect(200);

      expect(page1.body).toMatchObject({ page: 1, limit: 2, total: 5 });
      expect(page1.body.items).toHaveLength(2);

      const page3 = await request(server)
        .get('/api/work-days?startDate=2025-03-03&endDate=2025-03-07&limit=2&page=3')
        .set(auth())
        .expect(200);

      expect(page3.body.items).toHaveLength(1);
      expect(page3.body.page).toBe(3);
    });

    it('filtre par plage de dates et trie par date décroissante', async () => {
      const res = await request(server)
        .get('/api/work-days?startDate=2025-03-04&endDate=2025-03-06')
        .set(auth())
        .expect(200);

      expect(res.body.total).toBe(3);
      expect(res.body.items.map((day: { date: string }) => day.date)).toEqual([
        '2025-03-06',
        '2025-03-05',
        '2025-03-04',
      ]);
    });

    it('refuse une pagination ou une date invalide (400)', async () => {
      await request(server).get('/api/work-days?page=0').set(auth()).expect(400);
      await request(server).get('/api/work-days?limit=abc').set(auth()).expect(400);
      await request(server)
        .get('/api/work-days?startDate=04-03-2025')
        .set(auth())
        .expect(400);
    });
  });

  describe('DELETE /api/work-days/:id', () => {
    it('supprime sa journée (204) puis la retrouve en 404', async () => {
      const created = await request(server)
        .post('/api/work-days')
        .set(auth())
        .send({ date: '2026-10-12', entryTime: '08:45' })
        .expect(201);

      await request(server)
        .delete(`/api/work-days/${created.body.id}`)
        .set(auth())
        .expect(204);

      await request(server)
        .get(`/api/work-days/${created.body.id}`)
        .set(auth())
        .expect(404);
    });

    it('interdit de supprimer la journée d’un autre utilisateur (404)', async () => {
      const others = await request(server)
        .get('/api/work-days')
        .set(otherAuth())
        .expect(200);

      await request(server)
        .delete(`/api/work-days/${others.body.items[0].id}`)
        .set(auth())
        .expect(404);
    });
  });

  describe('Sécurité', () => {
    it('exige un token sur toutes les routes', async () => {
      await request(server).get('/api/work-days').expect(401);
      await request(server).get('/api/work-days/summary/daily').expect(401);
      await request(server).get('/api/work-days/summary/weekly').expect(401);
      await request(server).get('/api/work-days/summary/monthly').expect(401);
      await request(server).patch('/api/work-days/abc').send({}).expect(401);
      await request(server).delete('/api/work-days/abc').expect(401);
    });

    it('refuse un champ inconnu dans le body (400)', async () => {
      const res = await request(server)
        .post('/api/work-days')
        .set(auth())
        .send({ date: '2026-10-13', entryTime: '08:45', hacked: true })
        .expect(400);

      expect(res.body.statusCode).toBe(400);
    });
  });
});
