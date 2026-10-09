import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { LeaveTransactionType } from '../src/common/enums/leave-transaction-type.enum';
import { UserRole } from '../src/common/enums/user-role.enum';
import { createTestApp, TestApp } from './helpers/create-test-app';
import { signToken } from './helpers/tokens';

describe('Leaves — API', () => {
  let testApp: TestApp;
  let server: ReturnType<INestApplication['getHttpServer']>;
  let token: string;
  let otherToken: string;
  let soloToken: string;
  let soloUserId: string;

  const now = new Date();
  const shiftMonth = (offset: number): string => {
    const date = new Date(Date.UTC(now.getFullYear(), now.getMonth() + offset, 1));
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
  };

  const auth = (): Record<string, string> => ({ Authorization: `Bearer ${token}` });
  const otherAuth = (): Record<string, string> => ({
    Authorization: `Bearer ${otherToken}`,
  });
  const soloAuth = (): Record<string, string> => ({
    Authorization: `Bearer ${soloToken}`,
  });

  beforeAll(async () => {
    testApp = await createTestApp();
    server = testApp.app.getHttpServer();

    const createUser = async (
      email: string,
      firstName: string,
      lastName: string,
      role: UserRole,
    ) => {
      const user = await testApp.users.create({
        email,
        passwordHash: 'hash-simule',
        firstName,
        lastName,
        role,
      });
      const userToken = signToken({
        sub: String(user._id),
        email: user.email,
        role: user.role,
      });
      return { id: String(user._id), token: userToken };
    };

    const employee = await createUser(
      'leaves@example.com',
      'Léo',
      'Leave',
      UserRole.EMPLOYEE,
    );
    token = employee.token;

    const other = await createUser(
      'anne@example.com',
      'Anne',
      'Autre',
      UserRole.EMPLOYEE,
    );
    otherToken = other.token;

    const solo = await createUser(
      'soliste@example.com',
      'Sonia',
      'Seule',
      UserRole.EMPLOYEE,
    );
    soloUserId = solo.id;
    soloToken = solo.token;

    const _manager = await createUser(
      'manager@example.com',
      'Marc',
      'Manager',
      UserRole.MANAGER,
    );
  });

  afterAll(async () => {
    await testApp.app.close();
  });

  describe('POST /api/leaves/balance/init', () => {
    it('exige un token (401)', async () => {
      await request(server)
        .post('/api/leaves/balance/init')
        .send({ initialDays: 10 })
        .expect(401);
    });

    it('initialise le solde du titulaire du token (EMPLOYEE)', async () => {
      await request(server)
        .post('/api/leaves/balance/init')
        .set(auth())
        .send({ initialDays: 10 })
        .expect(201);

      const balance = await request(server).get('/api/leaves/balance').set(auth()).expect(200);
      expect(balance.body).toMatchObject({
        initialBalance: 10,
        accruedDays: 0,
        consumedDays: 0,
        pendingDays: 0,
        availableDays: 10,
      });
    });

    it('remet un solde et trace la différence (réinitialisation autorisée)', async () => {
      const res = await request(server)
        .post('/api/leaves/balance/init')
        .set(auth())
        .send({ initialDays: 15 })
        .expect(201);

      expect(res.body.initialBalance).toBe(15);
      expect(res.body.availableDays).toBe(15);
    });
  });

  describe('GET /api/leaves/balance', () => {
    it('crée un solde à zéro pour un utilisateur sans solde', async () => {
      const res = await request(server)
        .get('/api/leaves/balance')
        .set(soloAuth())
        .expect(200);

      expect(res.body).toMatchObject({
        initialBalance: 0,
        accruedDays: 0,
        availableDays: 0,
      });
    });

    it('applique les acquisitions mensuelles (2,08 j/mois)', async () => {
      const record = testApp.leaves.balances.find(
        (item) => item.userId === soloUserId,
      );
      expect(record).toBeDefined();
      if (record) {
        record.lastAccrualMonth = shiftMonth(-2);
      }

      const res = await request(server)
        .get('/api/leaves/balance')
        .set(soloAuth())
        .expect(200);

      expect(res.body.accruedDays).toBeCloseTo(4.16, 2);
      expect(res.body.availableDays).toBeCloseTo(4.16, 2);

      const accruals = testApp.leaves.transactions.filter(
        (item) =>
          item.userId === soloUserId && item.type === LeaveTransactionType.ACCRUAL,
      );
      expect(accruals).toHaveLength(2);
      expect(accruals[0].amount).toBe(2.08);
    });

    it('exige un token (401)', async () => {
      await request(server).get('/api/leaves/balance').expect(401);
    });
  });

  describe('POST /api/leaves', () => {
    it('crée une demande vendredi → lundi et compte 2 jours ouvrés', async () => {
      const res = await request(server)
        .post('/api/leaves')
        .set(auth())
        .send({
          leaveType: 'PAID',
          reason: 'Vacances d’hiver',
          startDate: '2026-01-09',
          endDate: '2026-01-12',
          startDurationType: 'FULL_DAY',
          endDurationType: 'FULL_DAY',
        })
        .expect(201);

      expect(res.body).toMatchObject({
        leaveType: 'PAID',
        reason: 'Vacances d’hiver',
        startDate: '2026-01-09',
        endDate: '2026-01-12',
        durationDays: 2,
        status: 'APPROVED',
      });
      expect(typeof res.body.id).toBe('string');
    });

    it('crée la demande directement avec le statut APPROUVÉE', async () => {
      const res = await request(server)
        .post('/api/leaves')
        .set(auth())
        .send({
          leaveType: 'PAID',
          reason: 'Demi-journée',
          startDate: '2026-01-12',
          endDate: '2026-01-12',
          startDurationType: 'HALF_DAY_MORNING',
          endDurationType: 'HALF_DAY_MORNING',
        })
        .expect(201);

      expect(res.body.status).toBe('APPROVED');
      expect(res.body.durationDays).toBe(0.5);
    });

    it('crée une demande avec demi-journée en fin (201)', async () => {
      const res = await request(server)
        .post('/api/leaves')
        .set(auth())
        .send({
          leaveType: 'PAID',
          reason: 'Demi-journée en fin',
          startDate: '2026-01-13',
          endDate: '2026-01-14',
          startDurationType: 'FULL_DAY',
          endDurationType: 'HALF_DAY_MORNING',
        })
        .expect(201);

      expect(res.body.durationDays).toBe(1.5);
    });

    it('crée une demande avec demi-journée en début (201)', async () => {
      const res = await request(server)
        .post('/api/leaves')
        .set(auth())
        .send({
          leaveType: 'PAID',
          reason: 'Demi-journée en début',
          startDate: '2026-01-13',
          endDate: '2026-01-14',
          startDurationType: 'HALF_DAY_AFTERNOON',
          endDurationType: 'FULL_DAY',
        })
        .expect(201);

      expect(res.body.durationDays).toBe(1.5);
    });

    it('met à jour le solde (consommé déduit du montant disponible)', async () => {
      const balance = await request(server).get('/api/leaves/balance').set(auth()).expect(200);
      // After balance init with 15, then 5 requests: 2 + 0.5 + 1.5 + 1.5 = 5.5 consumed
      expect(balance.body.consumedDays).toBeCloseTo(5.5, 2);
      expect(balance.body.availableDays).toBeCloseTo(9.5, 2);
    });

    it('refuse une fin antérieure au début (400)', async () => {
      const res = await request(server)
        .post('/api/leaves')
        .set(auth())
        .send({
          leaveType: 'PAID',
          reason: 'Test',
          startDate: '2026-01-13',
          endDate: '2026-01-12',
          startDurationType: 'FULL_DAY',
          endDurationType: 'FULL_DAY',
        })
        .expect(400);

      expect(res.body.message).toBe(
        'La date de fin doit être postérieure ou égale à la date de début',
      );
    });

    it('refuse une période sans jour ouvré (400)', async () => {
      const res = await request(server)
        .post('/api/leaves')
        .set(auth())
        .send({
          leaveType: 'PAID',
          reason: 'Week-end',
          startDate: '2026-01-10',
          endDate: '2026-01-11',
          startDurationType: 'FULL_DAY',
          endDurationType: 'FULL_DAY',
        })
        .expect(400);

      expect(res.body.message).toBe('Aucun jour ouvré dans cette période');
    });

    it('refuse une demande au-delà du solde disponible (400)', async () => {
      // Initialize other user's balance first
      await request(server)
        .post('/api/leaves/balance/init')
        .set(otherAuth())
        .send({ initialDays: 5 })
        .expect(201);

      const res = await request(server)
        .post('/api/leaves')
        .set(otherAuth())
        .send({
          leaveType: 'PAID',
          reason: 'Long congé',
          startDate: '2026-03-02',
          endDate: '2026-03-31',
          startDurationType: 'FULL_DAY',
          endDurationType: 'FULL_DAY',
        })
        .expect(400);

      expect(res.body.message).toBe('Solde de congés insuffisant');
    });

    it('valide les entrées (motif obligatoire, type invalide) (400)', async () => {
      await request(server).post('/api/leaves').set(auth()).send({}).expect(400);

      const res = await request(server)
        .post('/api/leaves')
        .set(auth())
        .send({
          leaveType: 'SICK',
          reason: 'Test',
          startDate: '2026-01-12',
          endDate: '2026-01-12',
          startDurationType: 'FULL_DAY',
          endDurationType: 'FULL_DAY',
        })
        .expect(400);

      expect(res.body.message).toContain('leaveType invalide');
    });
  });

  describe('Préparation des demandes d’un autre utilisateur', () => {
    it('crée une demande pour l’autre employé (ownership)', async () => {
      const res = await request(server)
        .post('/api/leaves')
        .set(otherAuth())
        .send({
          leaveType: 'PAID',
          reason: 'Permission du mardi',
          startDate: '2026-01-13',
          endDate: '2026-01-13',
          startDurationType: 'FULL_DAY',
          endDurationType: 'FULL_DAY',
        })
        .expect(201);

      expect(res.body.durationDays).toBe(1);
    });
  });

  describe('GET /api/leaves, /api/leaves/history et /api/leaves/:id', () => {
    it('liste les demandes de l’utilisateur, de la plus récente à la plus ancienne', async () => {
      const res = await request(server).get('/api/leaves').set(auth()).expect(200);

      expect(res.body).toHaveLength(4);
      expect(res.body.every((leave: { status: string }) => leave.status === 'APPROVED')).toBe(true);
      expect(res.body[0].startDate).toBe('2026-01-13');
    });

    it('expose le même historique via /history', async () => {
      const res = await request(server).get('/api/leaves/history').set(auth()).expect(200);
      expect(res.body).toHaveLength(4);
    });

    it('retrouve une demande par identifiant', async () => {
      const list = await request(server).get('/api/leaves').set(auth()).expect(200);
      const target = list.body.find(
        (leave: { startDate: string }) => leave.startDate === '2026-01-09',
      );

      const res = await request(server)
        .get(`/api/leaves/${target.id}`)
        .set(auth())
        .expect(200);

      expect(res.body.id).toBe(target.id);
      expect(res.body.durationDays).toBe(2);
    });

    it('renvoie 404 pour la demande d’un autre utilisateur', async () => {
      const others = await request(server).get('/api/leaves').set(otherAuth()).expect(200);
      await request(server).get(`/api/leaves/${others.body[0].id}`).set(auth()).expect(404);
    });

    it('renvoie 404 pour un identifiant invalide', async () => {
      await request(server).get('/api/leaves/pas-un-id').set(auth()).expect(404);
    });
  });

  describe('DELETE /api/leaves/:id', () => {
    it('annule une demande APPROUVÉE (204) et restitue le solde', async () => {
      const list = await request(server).get('/api/leaves').set(auth()).expect(200);
      const target = list.body.find(
        (leave: { startDate: string }) => leave.startDate === '2026-01-09',
      );

      await request(server)
        .delete(`/api/leaves/${target.id}`)
        .set(auth())
        .expect(204);

      const res = await request(server).get(`/api/leaves/${target.id}`).set(auth()).expect(200);
      expect(res.body.status).toBe('CANCELLED');

      const balance = await request(server).get('/api/leaves/balance').set(auth()).expect(200);
      // Was 5.5 consumed, cancel 2-day request -> 3.5 consumed
      expect(balance.body.consumedDays).toBeCloseTo(3.5, 2);
      expect(balance.body.availableDays).toBeCloseTo(11.5, 2);
    });

    it('refuse d’annuler une demande déjà annulée (409)', async () => {
      const list = await request(server).get('/api/leaves').set(auth()).expect(200);
      const target = list.body.find(
        (leave: { startDate: string }) => leave.startDate === '2026-01-09',
      );

      await request(server)
        .delete(`/api/leaves/${target.id}`)
        .set(auth())
        .expect(409);
    });

    it('interdit d’annuler la demande d’un autre utilisateur (404)', async () => {
      const others = await request(server).get('/api/leaves').set(otherAuth()).expect(200);
      await request(server).delete(`/api/leaves/${others.body[0].id}`).set(auth()).expect(404);
    });
  });

  describe('Sécurité', () => {
    it('exige un token sur toutes les routes', async () => {
      await request(server).get('/api/leaves').expect(401);
      await request(server).get('/api/leaves/history').expect(401);
      await request(server).get('/api/leaves/balance').expect(401);
      await request(server).post('/api/leaves').send({}).expect(401);
      await request(server).delete('/api/leaves/abc').expect(401);
    });

    it('refuse un champ inconnu dans le body (400)', async () => {
      const res = await request(server)
        .post('/api/leaves')
        .set(auth())
        .send({
          leaveType: 'PAID',
          reason: 'Test',
          startDate: '2026-01-12',
          endDate: '2026-01-12',
          startDurationType: 'FULL_DAY',
          endDurationType: 'FULL_DAY',
          hacked: true,
        })
        .expect(400);

      expect(res.body.statusCode).toBe(400);
    });
  });
});