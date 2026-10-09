import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { UserRole } from '../src/common/enums/user-role.enum';
import { createTestApp, TestApp } from './helpers/create-test-app';
import { signToken } from './helpers/tokens';

describe('Calendar — API', () => {
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

  const today = toISO(new Date());
  const auth = (): Record<string, string> => ({ Authorization: `Bearer ${token}` });
  const otherAuth = (): Record<string, string> => ({ Authorization: `Bearer ${otherToken}` });

  beforeAll(async () => {
    testApp = await createTestApp();
    server = testApp.app.getHttpServer();

    const employee = await testApp.users.create({
      email: 'calendar@example.com',
      passwordHash: 'hash-simule',
      firstName: 'Carmen',
      lastName: 'Calendrier',
      role: UserRole.EMPLOYEE,
    });
    employeeId = String(employee._id);
    token = signToken({ sub: employeeId, email: employee.email, role: employee.role });

    const other = await testApp.users.create({
      email: 'calendar-other@example.com',
      passwordHash: 'hash-simule',
      firstName: 'Camille',
      lastName: 'Autre',
      role: UserRole.EMPLOYEE,
    });
    otherToken = signToken({ sub: String(other._id), email: other.email, role: other.role });
  });

  afterAll(async () => {
    await testApp.app.close();
  });

  describe('GET /api/calendar', () => {
    it('exige un token (401)', async () => {
      await request(server).get('/api/calendar').expect(401);
    });

    it('retourne le mois en cours par défaut', async () => {
      const response = await request(server).get('/api/calendar').set(auth()).expect(200);

      expect(response.body).toHaveProperty('start');
      expect(response.body).toHaveProperty('end');
      expect(response.body.days.length).toBeGreaterThan(0);
      expect(response.body.start).toMatch(/^\d{4}-\d{2}-01$/);
    });

    it('accepte month=YYYY-MM', async () => {
      const response = await request(server)
        .get('/api/calendar?month=2026-10')
        .set(auth())
        .expect(200);

      expect(response.body.start).toBe('2026-10-01');
      expect(response.body.end).toBe('2026-10-31');
      expect(response.body.days).toHaveLength(31);
    });

    it('accepte start et end (range)', async () => {
      const response = await request(server)
        .get('/api/calendar?start=2026-10-05&end=2026-10-11')
        .set(auth())
        .expect(200);

      expect(response.body.days).toHaveLength(7);
      expect(response.body.days[0].date).toBe('2026-10-05');
      expect(response.body.days[6].date).toBe('2026-10-11');
    });

    it('refuse end < start (400)', async () => {
      await request(server)
        .get('/api/calendar?start=2026-10-10&end=2026-10-05')
        .set(auth())
        .expect(400);
    });

    it('refuse plage > 92 jours (400)', async () => {
      await request(server)
        .get('/api/calendar?start=2026-01-01&end=2026-04-03')
        .set(auth())
        .expect(400);
    });

    it('marque les week-ends', async () => {
      const response = await request(server)
        .get('/api/calendar?start=2026-10-03&end=2026-10-04')
        .set(auth())
        .expect(200);

      expect(response.body.days[0].isWeekend).toBe(true);
      expect(response.body.days[1].isWeekend).toBe(true);
      expect(response.body.days[0].kind).toBe('WEEKEND');
    });

    it('identifie WORKED après pointage', async () => {
      await request(server)
        .post('/api/work-days')
        .set(auth())
        .send({
          date: '2026-10-09',
          entryTime: '08:45',
          breakStart: '13:00',
          breakEnd: '14:00',
          exitTime: '17:45',
        })
        .expect(201);

      const response = await request(server)
        .get('/api/calendar?start=2026-10-09&end=2026-10-09')
        .set(auth())
        .expect(200);

      expect(response.body.days[0].kind).toBe('WORKED');
      expect(response.body.days[0].workDay).toEqual(
        expect.objectContaining({
          workedMinutes: 480,
          balanceMinutes: 0,
          status: 'COMPLETED',
        }),
      );

      await request(server)
        .delete(`/api/work-days/${testApp.workDays.store.at(-1)?._id}`)
        .set(auth())
        .expect(204);
    });

    it('identifie LEAVE (APPROVED) et exclut PENDING', async () => {
      // Initialize balance for employee
      await request(server)
        .post('/api/leaves/balance/init')
        .set(auth())
        .send({ initialDays: 20 })
        .expect(201);

      const created = await request(server)
        .post('/api/leaves')
        .set(auth())
        .send({
          leaveType: 'PAID',
          reason: 'Calendrier E2E',
          startDate: '2026-10-15',
          endDate: '2026-10-15',
          durationType: 'FULL_DAY',
        })
        .expect(201);

      const requestId = created.body.id;

      const response = await request(server)
        .get('/api/calendar?start=2026-10-15&end=2026-10-15')
        .set(auth())
        .expect(200);

      expect(response.body.days[0].kind).toBe('LEAVE');
      expect(response.body.days[0].leaves[0]).toEqual(
        expect.objectContaining({
          id: requestId,
          status: 'APPROVED',
        }),
      );

      // Other user should not see this leave
      const otherRes = await request(server)
        .get('/api/calendar?start=2026-10-15&end=2026-10-15')
        .set(otherAuth())
        .expect(200);
      expect(otherRes.body.days[0].leaves).toHaveLength(0);
    });

    it('classe les journées passées sans pointage comme ABSENCE, futures comme FUTURE', async () => {
      const yesterday = addDays(today, -1);

      // Find a future weekday (skip weekends)
      let tomorrow = addDays(today, 1);
      while (new Date(`${tomorrow}T00:00:00.000Z`).getUTCDay() === 0 || new Date(`${tomorrow}T00:00:00.000Z`).getUTCDay() === 6) {
        tomorrow = addDays(tomorrow, 1);
      }

      const response = await request(server)
        .get(`/api/calendar?start=${yesterday}&end=${tomorrow}`)
        .set(otherAuth())
        .expect(200);

      const days = response.body.days as Array<{ date: string; kind: string; leaves: unknown[] }>;
      const yday = days.find((d) => d.date === yesterday);
      const tday = days.find((d) => d.date === tomorrow);
      expect(yday?.kind).toBe('ABSENCE');
      expect(tday?.kind).toBe('FUTURE');
    });
  });
});
