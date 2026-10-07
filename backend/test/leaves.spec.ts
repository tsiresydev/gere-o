import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { LeaveTransactionType } from '../src/common/enums/leave-transaction-type.enum';
import { UserRole } from '../src/common/enums/user-role.enum';
import { createTestApp, TestApp } from './helpers/create-test-app';
import { signToken } from './helpers/tokens';

describe('Leaves — API', () => {
  let testApp: TestApp;
  let server: ReturnType<INestApplication['getHttpServer']>;
  let employeeId: string;
  let token: string;
  let otherToken: string;
  let managerToken: string;
  let managerId: string;
  let otherUserId: string;
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
  const managerAuth = (): Record<string, string> => ({
    Authorization: `Bearer ${managerToken}`,
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
    employeeId = employee.id;
    token = employee.token;

    const other = await createUser(
      'anne@example.com',
      'Anne',
      'Autre',
      UserRole.EMPLOYEE,
    );
    otherUserId = other.id;
    otherToken = other.token;

    const solo = await createUser(
      'soliste@example.com',
      'Sonia',
      'Seule',
      UserRole.EMPLOYEE,
    );
    soloUserId = solo.id;
    soloToken = solo.token;

    const manager = await createUser(
      'manager@example.com',
      'Marc',
      'Manager',
      UserRole.MANAGER,
    );
    managerId = manager.id;
    managerToken = manager.token;
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

    it('refuse l’initialisation par un EMPLOYEE (403)', async () => {
      await request(server)
        .post('/api/leaves/balance/init')
        .set(auth())
        .send({ initialDays: 10 })
        .expect(403);
    });

    it('initialise le solde d’un employé (MANAGER uniquement)', async () => {
      await request(server)
        .post('/api/leaves/balance/init')
        .set(managerAuth())
        .send({ initialDays: 10, userId: employeeId })
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

    it('initialise le solde d’un autre employé puis refuse le doublon (409)', async () => {
      await request(server)
        .post('/api/leaves/balance/init')
        .set(managerAuth())
        .send({ initialDays: 10, userId: otherUserId })
        .expect(201);

      const res = await request(server)
        .post('/api/leaves/balance/init')
        .set(managerAuth())
        .send({ initialDays: 10, userId: otherUserId })
        .expect(409);

      expect(res.body.message).toBe('Le solde de congés existe déjà pour cet utilisateur');
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
          durationType: 'FULL_DAY',
        })
        .expect(201);

      expect(res.body).toMatchObject({
        leaveType: 'PAID',
        reason: 'Vacances d’hiver',
        startDate: '2026-01-09',
        endDate: '2026-01-12',
        durationType: 'FULL_DAY',
        durationDays: 2,
        status: 'PENDING',
      });
      expect(typeof res.body.id).toBe('string');
    });

    it('calcule une demi-journée à 0,5 jour', async () => {
      const res = await request(server)
        .post('/api/leaves')
        .set(auth())
        .send({
          leaveType: 'PAID',
          reason: 'Rendez-vous',
          startDate: '2026-01-12',
          endDate: '2026-01-12',
          durationType: 'HALF_DAY_MORNING',
        })
        .expect(201);

      expect(res.body.durationDays).toBe(0.5);
    });

    it('met à jour le solde (disponible déduit du montant en attente)', async () => {
      const balance = await request(server).get('/api/leaves/balance').set(auth()).expect(200);
      expect(balance.body.pendingDays).toBe(2.5);
      expect(balance.body.availableDays).toBeCloseTo(7.5, 2);
    });

    it('refuse un congé d’une demi-journée sur plusieurs dates (400)', async () => {
      const res = await request(server)
        .post('/api/leaves')
        .set(auth())
        .send({
          leaveType: 'PAID',
          reason: 'Test',
          startDate: '2026-01-12',
          endDate: '2026-01-13',
          durationType: 'HALF_DAY_AFTERNOON',
        })
        .expect(400);

      expect(res.body.message).toBe(
        "Un congé d'une demi-journée doit porter sur une seule date",
      );
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
          durationType: 'FULL_DAY',
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
          durationType: 'FULL_DAY',
        })
        .expect(400);

      expect(res.body.message).toBe('Aucun jour ouvré dans cette période');
    });

    it('refuse une demande au-delà du solde disponible (400)', async () => {
      const res = await request(server)
        .post('/api/leaves')
        .set(otherAuth())
        .send({
          leaveType: 'PAID',
          reason: 'Long congé',
          startDate: '2026-03-02',
          endDate: '2026-03-31',
          durationType: 'FULL_DAY',
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
          durationType: 'FULL_DAY',
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
          durationType: 'FULL_DAY',
        })
        .expect(201);

      expect(res.body.durationDays).toBe(1);
    });
  });

  describe('GET /api/leaves, /api/leaves/history et /api/leaves/:id', () => {
    it('liste les demandes de l’utilisateur, de la plus récente à la plus ancienne', async () => {
      const res = await request(server).get('/api/leaves').set(auth()).expect(200);

      expect(res.body).toHaveLength(2);
      expect(res.body[0].startDate).toBe('2026-01-12');
      expect(res.body[1].startDate).toBe('2026-01-09');
    });

    it('expose le même historique via /history', async () => {
      const res = await request(server).get('/api/leaves/history').set(auth()).expect(200);
      expect(res.body).toHaveLength(2);
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
    it('annule une demande en attente (204) et restitue le solde', async () => {
      const list = await request(server).get('/api/leaves').set(auth()).expect(200);
      const halfDay = list.body.find(
        (leave: { startDate: string }) => leave.startDate === '2026-01-12',
      );

      await request(server)
        .delete(`/api/leaves/${halfDay.id}`)
        .set(auth())
        .expect(204);

      const res = await request(server).get(`/api/leaves/${halfDay.id}`).set(auth()).expect(200);
      expect(res.body.status).toBe('CANCELLED');

      const balance = await request(server).get('/api/leaves/balance').set(auth()).expect(200);
      expect(balance.body.pendingDays).toBe(2);
      expect(balance.body.availableDays).toBeCloseTo(8, 2);
    });

    it('refuse d’annuler une demande déjà traitée (409)', async () => {
      const record = testApp.leaves.requests.find(
        (item) => item.userId === otherUserId,
      );
      expect(record).toBeDefined();
      if (record) {
        record.status = 'APPROVED';
      }

      await request(server)
        .delete(`/api/leaves/${record?._id}`)
        .set(otherAuth())
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
          durationType: 'FULL_DAY',
          hacked: true,
        })
        .expect(400);

      expect(res.body.statusCode).toBe(400);
    });
  });

  describe('Workflow de validation — MANAGER', () => {
    let vacationId: string;
    let extraId: string;
    let cancelledId: string;

    beforeAll(async () => {
      const list = await request(server).get('/api/leaves').set(auth()).expect(200);
      vacationId = list.body.find(
        (leave: { status: string }) => leave.status === 'PENDING',
      ).id;
      cancelledId = list.body.find(
        (leave: { status: string }) => leave.status === 'CANCELLED',
      ).id;

      const extra = await request(server)
        .post('/api/leaves')
        .set(auth())
        .send({
          leaveType: 'PAID',
          reason: 'Lundi de février',
          startDate: '2026-02-02',
          endDate: '2026-02-02',
          durationType: 'FULL_DAY',
        })
        .expect(201);
      extraId = extra.body.id;
    });

    it('exige un token (401)', async () => {
      await request(server).get('/api/leaves/pending').expect(401);
      await request(server).patch(`/api/leaves/${vacationId}`).expect(401);
    });

    it('interdit la décision et la liste des attentes à un EMPLOYEE (403)', async () => {
      const decision = await request(server)
        .patch(`/api/leaves/${vacationId}`)
        .set(auth())
        .send({ status: 'APPROVED' })
        .expect(403);
      expect(decision.body.message).toBe('Rôle insuffisant');

      await request(server).get('/api/leaves/pending').set(auth()).expect(403);
    });

    it('expose toutes les demandes en attente au MANAGER', async () => {
      const res = await request(server)
        .get('/api/leaves/pending')
        .set(managerAuth())
        .expect(200);

      expect(res.body.length).toBeGreaterThanOrEqual(2);
      expect(
        res.body.every(
          (leave: { status: string }) => leave.status === 'PENDING',
        ),
      ).toBe(true);

      const ids = res.body.map((leave: { id: string }) => leave.id);
      expect(ids).toContain(vacationId);
      expect(ids).toContain(extraId);

      const target = res.body.find((leave: { id: string }) => leave.id === vacationId);
      expect(target.applicantName).toBe('Léo Leave');
    });

    it('renvoie 404 pour un identifiant invalide (404)', async () => {
      await request(server)
        .patch('/api/leaves/pas-un-id')
        .set(managerAuth())
        .send({ status: 'APPROVED' })
        .expect(404);
    });

    it('valide le body de décision (400)', async () => {
      const wrongStatus = await request(server)
        .patch(`/api/leaves/${vacationId}`)
        .set(managerAuth())
        .send({ status: 'PENDING' })
        .expect(400);
      expect(String(wrongStatus.body.message)).toContain('statut invalide');

      await request(server)
        .patch(`/api/leaves/${vacationId}`)
        .set(managerAuth())
        .send({ status: 'APPROVED', hacked: true })
        .expect(400);
    });

    it('approuve la demande et trace la décision (200)', async () => {
      const res = await request(server)
        .patch(`/api/leaves/${vacationId}`)
        .set(managerAuth())
        .send({ status: 'APPROVED', comment: 'Congés validés' })
        .expect(200);

      expect(res.body).toMatchObject({
        status: 'APPROVED',
        comment: 'Congés validés',
        decidedBy: managerId,
      });
      expect(typeof res.body.decidedAt).toBe('string');

      const balance = await request(server)
        .get('/api/leaves/balance')
        .set(auth())
        .expect(200);
      expect(balance.body.pendingDays).toBe(1);
      expect(balance.body.consumedDays).toBe(2);
      expect(balance.body.availableDays).toBeCloseTo(7, 2);

      const decisions = testApp.leaves.transactions.filter(
        (item) => item.type === LeaveTransactionType.DECISION,
      );
      expect(decisions).toHaveLength(1);
      expect(decisions[0].reason).toBe('Demande approuvée : Congés validés');
    });

    it('refuse une seconde décision sur la même demande (409)', async () => {
      const res = await request(server)
        .patch(`/api/leaves/${vacationId}`)
        .set(managerAuth())
        .send({ status: 'REJECTED' })
        .expect(409);

      expect(res.body.message).toBe(
        'Seules les demandes en attente peuvent être traitées',
      );
    });

    it('refuse une demande déjà annulée (409)', async () => {
      await request(server)
        .patch(`/api/leaves/${cancelledId}`)
        .set(managerAuth())
        .send({ status: 'APPROVED' })
        .expect(409);
    });

    it('refuse la demande restante et restitue le solde (200)', async () => {
      const res = await request(server)
        .patch(`/api/leaves/${extraId}`)
        .set(managerAuth())
        .send({ status: 'REJECTED', comment: 'Période chargée' })
        .expect(200);

      expect(res.body.status).toBe('REJECTED');

      const balance = await request(server)
        .get('/api/leaves/balance')
        .set(auth())
        .expect(200);
      expect(balance.body.pendingDays).toBe(0);
      expect(balance.body.consumedDays).toBe(2);
      expect(balance.body.availableDays).toBeCloseTo(8, 2);

      const released = testApp.leaves.transactions.find(
        (item) =>
          item.type === LeaveTransactionType.LEAVE_RELEASED &&
          item.referenceId === extraId,
      );
      expect(released).toBeDefined();
      expect(released?.amount).toBe(1);
    });

    it('expose la décision dans l’historique de l’utilisateur', async () => {
      const res = await request(server)
        .get('/api/leaves')
        .set(auth())
        .expect(200);

      const approved = res.body.find(
        (leave: { id: string }) => leave.id === vacationId,
      );
      expect(approved).toMatchObject({
        status: 'APPROVED',
        comment: 'Congés validés',
        decidedBy: managerId,
      });
      expect(typeof approved.decidedAt).toBe('string');
    });
  });
});