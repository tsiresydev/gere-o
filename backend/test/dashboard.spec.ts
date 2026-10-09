import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { UserRole } from '../src/common/enums/user-role.enum';
import { createTestApp, TestApp } from './helpers/create-test-app';
import { signToken } from './helpers/tokens';

describe('Dashboard — API', () => {
  let testApp: TestApp;
  let server: ReturnType<INestApplication['getHttpServer']>;
  let token: string;
  let employeeId: string;
  let otherToken: string;

  const pad = (value: number): string => String(value).padStart(2, '0');
  const toISO = (date: Date): string =>
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  const parseISO = (iso: string): Date => new Date(`${iso}T00:00:00.000Z`);
  const addDays = (iso: string, days: number): string => {
    const date = parseISO(iso);
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
  };
  const mondayOf = (iso: string): string => {
    const date = parseISO(iso);
    const day = date.getUTCDay();
    const diff = day === 0 ? -6 : 1 - day;
    date.setUTCDate(date.getUTCDate() + diff);
    return date.toISOString().slice(0, 10);
  };

  const today = toISO(new Date());
  const monday = mondayOf(today);

  const auth = (): Record<string, string> => ({ Authorization: `Bearer ${token}` });

  beforeAll(async () => {
    testApp = await createTestApp();
    server = testApp.app.getHttpServer();

    const employee = await testApp.users.create({
      email: 'dashboard@example.com',
      passwordHash: 'hash-simule',
      firstName: 'Dana',
      lastName: 'Dashboard',
      role: UserRole.EMPLOYEE,
    });
    employeeId = String(employee._id);
    token = signToken({ sub: employeeId, email: employee.email, role: employee.role });

    const other = await testApp.users.create({
      email: 'dashboard-other@example.com',
      passwordHash: 'hash-simule',
      firstName: 'Olivier',
      lastName: 'Autre',
      role: UserRole.EMPLOYEE,
    });
    otherToken = signToken({
      sub: String(other._id),
      email: other.email,
      role: other.role,
    });
  });

  afterAll(async () => {
    await testApp.app.close();
  });

  describe('GET /api/dashboard', () => {
    it('exige un token (401)', async () => {
      await request(server).get('/api/dashboard').expect(401);
    });

    it('retourne la structure complète avec des données vides', async () => {
      const response = await request(server)
        .get('/api/dashboard')
        .set(auth())
        .expect(200);

      expect(response.body).toHaveProperty('generatedAt');
      expect(response.body.today).toEqual({
        date: today,
        workedMinutes: 0,
        expectedMinutes: 480,
        balanceMinutes: 0,
        recorded: false,
      });
      expect(response.body.week).toEqual({
        weekStart: monday,
        weekEnd: addDays(monday, 6),
        workedMinutes: 0,
        expectedMinutes: 2400,
        balanceMinutes: -2400,
        recordedDays: 0,
      });
      expect(response.body.leaves).toEqual({
        initialBalance: 0,
        accruedDays: 0,
        consumedDays: 0,
        pendingDays: 0,
        availableDays: 0,
      });
      // 7 days: Monday to Sunday
      expect(response.body.trends.daily).toHaveLength(7);
      // Find today in the daily trends
      const todayTrend = response.body.trends.daily.find((d: { date: string }) => d.date === today);
      expect(todayTrend).toEqual({ date: today, workedMinutes: 0, isWeekend: false });
      expect(response.body.trends.weekly).toHaveLength(8);
      expect(response.body.trends.weekly[7]).toEqual({
        weekStart: monday,
        workedMinutes: 0,
        expectedMinutes: 2400,
      });
      expect(response.body.stats).toEqual({
        windowDays: 30,
        recordedDays: 0,
        totalWorkedMinutes: 0,
        averageMinutesPerDay: 0,
        daysAboveObjective: 0,
        daysBelowObjective: 0,
      });
    });

    it('reflete la journée et la semaine en cours', async () => {
      await request(server)
        .post('/api/work-days')
        .set(auth())
        .send({
          date: today,
          entryTime: '08:45',
          breakStart: '13:00',
          breakEnd: '14:00',
          exitTime: '17:45',
        })
        .expect(201);

      const response = await request(server)
        .get('/api/dashboard')
        .set(auth())
        .expect(200);

      expect(response.body.today).toEqual({
        date: today,
        workedMinutes: 480,
        expectedMinutes: 480,
        balanceMinutes: 0,
        recorded: true,
      });
      expect(response.body.week).toMatchObject({
        workedMinutes: 480,
        balanceMinutes: -1920,
        recordedDays: 1,
      });
      // Find today in the daily trends
      const todayTrend = response.body.trends.daily.find((d: { date: string }) => d.date === today);
      expect(todayTrend).toEqual({ date: today, workedMinutes: 480, isWeekend: false });
      expect(response.body.trends.weekly[7]).toMatchObject({ workedMinutes: 480 });
      expect(response.body.stats).toMatchObject({
        recordedDays: 1,
        totalWorkedMinutes: 480,
        averageMinutesPerDay: 480,
        daysAboveObjective: 0,
        daysBelowObjective: 0,
      });
    });

    it('inclut la semaine précédente dans les tendances et les statistiques', async () => {
      const lastMonday = addDays(monday, -7);

      await request(server)
        .post('/api/work-days')
        .set(auth())
        .send({ date: lastMonday, entryTime: '08:00', exitTime: '17:00' })
        .expect(201);

      const response = await request(server)
        .get('/api/dashboard')
        .set(auth())
        .expect(200);

      expect(response.body.week).toMatchObject({
        weekStart: monday,
        workedMinutes: 480,
        recordedDays: 1,
      });
      expect(response.body.trends.weekly[6]).toEqual({
        weekStart: lastMonday,
        workedMinutes: 540,
        expectedMinutes: 2400,
      });
      expect(response.body.stats).toEqual({
        windowDays: 30,
        recordedDays: 2,
        totalWorkedMinutes: 1020,
        averageMinutesPerDay: 510,
        daysAboveObjective: 1,
        daysBelowObjective: 0,
      });
    });

    it('exclut les journées hors fenêtre de 30 jours des statistiques', async () => {
      await request(server)
        .post('/api/work-days')
        .set(auth())
        .send({ date: addDays(today, -40), entryTime: '08:00', exitTime: '18:00' })
        .expect(201);

      const response = await request(server)
        .get('/api/dashboard')
        .set(auth())
        .expect(200);

      expect(response.body.stats.recordedDays).toBe(2);
      expect(response.body.stats.totalWorkedMinutes).toBe(1020);
    });

    it('expose le solde de congés et les demandes en attente', async () => {
      const stored = testApp.leaves.balances.find((item) => item.userId === employeeId);
      expect(stored).toBeDefined();
      if (stored) {
        stored.initialBalance = 10;
        stored.availableDays = 10;
      }

      await request(server)
        .post('/api/leaves')
        .set(auth())
        .send({
          leaveType: 'PAID',
          reason: 'Vacances dashboard',
          startDate: addDays(monday, 7),
          endDate: addDays(monday, 11),
          startDurationType: 'FULL_DAY',
          endDurationType: 'FULL_DAY',
        })
        .expect(201);

      const response = await request(server)
        .get('/api/dashboard')
        .set(auth())
        .expect(200);

      expect(response.body.leaves).toEqual({
        initialBalance: 10,
        accruedDays: 0,
        consumedDays: 5,
        pendingDays: 0,
        availableDays: 5,
      });
    });

    it('isole les données par utilisateur', async () => {
      const response = await request(server)
        .get('/api/dashboard')
        .set({ Authorization: `Bearer ${otherToken}` })
        .expect(200);

      expect(response.body.today.recorded).toBe(false);
      expect(response.body.week).toMatchObject({ workedMinutes: 0, recordedDays: 0 });
      expect(response.body.leaves).toMatchObject({
        availableDays: 0,
      });
      expect(response.body.stats.recordedDays).toBe(0);
    });
  });
});
