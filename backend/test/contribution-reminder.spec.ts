import { Types } from 'mongoose';
import { firstWorkingDay, madagascarDate, ContributionReminderService } from '../src/contributions/reminder.service';
import { ReminderController } from '../src/contributions/reminder.controller';

describe('Rappels de cotisations', () => {
  it('calcule le premier jour ouvrable en excluant week-end et jours fériés', () => {
    expect(firstWorkingDay(2027, 1)).toBe(4); // 1er janvier férié, puis week-end
    expect(firstWorkingDay(2026, 6)).toBe(1);
    expect(firstWorkingDay(2026, 6, ['2026-06-01'])).toBe(2);
    expect(firstWorkingDay(2026, 4, ['2026-04-01', '2026-04-02', '2026-04-03'])).toBe(7); // week-end et lundi de Pâques
    expect(madagascarDate(new Date('2026-12-01T05:00:00Z')).getUTCHours()).toBe(8);
  });

  it('envoie seulement au membre en retard, jusqu’au mois précédent, sans doublon', async () => {
    const memberId = new Types.ObjectId();
    const currentId = new Types.ObjectId();
    const memberList = [
      { _id: memberId, name: 'Mamy', email: 'mamy@example.test', status: 'ACTIVE' },
      { _id: currentId, name: 'À jour', email: 'ok@example.test', status: 'ACTIVE' },
    ];
    const paid = [
      ...Array.from({ length: 10 }, (_, index) => ({ memberId, periodYear: 2026, periodMonth: index + 1, status: 'VALIDE' })),
      ...Array.from({ length: 11 }, (_, index) => ({ memberId: currentId, periodYear: 2026, periodMonth: index + 1, status: 'VALIDE' })),
      { memberId, periodYear: 2026, periodMonth: 12, status: 'VALIDE' },
    ];
    const stored = new Map<string, Record<string, unknown>>();
    const members = { find: jest.fn(() => ({ exec: async () => memberList })) };
    const contributions = { find: jest.fn(() => ({ exec: async () => paid })) };
    const logs = {
      collection: { createIndex: jest.fn().mockResolvedValue('idempotencyKey_1') },
      updateOne: jest.fn((filter: { idempotencyKey: string }, update: { $setOnInsert: Record<string, unknown> }) => ({
        exec: async () => {
          if (!stored.has(filter.idempotencyKey)) stored.set(filter.idempotencyKey, { ...update.$setOnInsert, _id: new Types.ObjectId() });
        },
      })),
      findOne: jest.fn((filter: { idempotencyKey: string }) => ({ exec: async () => stored.get(filter.idempotencyKey) })),
    };
    let first = true;
    const notifications = { dispatch: jest.fn(async () => {
      if (first) { first = false; return { sent: true }; }
      return { sent: false, skipped: 'Déjà envoyée' };
    }) };
    const config = { get: jest.fn(() => '') };
    const service = new ContributionReminderService(members as never, contributions as never, logs as never, notifications as never, config as never);

    const before = await service.run(new Date('2026-12-01T04:59:00Z'));
    expect(before.eligible).toBe(0);
    const result = await service.run(new Date('2026-12-01T05:00:00Z'));
    expect(result).toEqual({ eligible: 1, sent: 1, skipped: null });
    expect(members.find).toHaveBeenCalledWith({ status: 'ACTIVE' });
    const log = [...stored.values()][0];
    expect(log.recipients).toEqual({ to: ['mamy@example.test'], cc: [] });
    expect(log.html).toContain('Novembre 2026');
    expect(log.html).not.toContain('Décembre 2026');
    expect(log.html).toContain('Si vous avez déjà effectué un paiement, merci de notifier Tsiresy ou Mahefa.');
    expect(log.html).toContain(`${new Intl.NumberFormat('fr-FR').format(5000)} Ar`);
    await service.run(new Date('2026-12-01T05:20:00Z'));
    expect(stored.size).toBe(1);
  });

  it('ne s’exécute pas le jour férié du Nouvel An et fonctionne au changement d’année', async () => {
    const members = { find: jest.fn(() => ({ exec: async () => [] })) };
    const contributions = { find: jest.fn(() => ({ exec: async () => [] })) };
    const logs = { collection: { createIndex: jest.fn().mockResolvedValue('idempotencyKey_1') } };
    const service = new ContributionReminderService(members as never, contributions as never, logs as never, {} as never, { get: () => '' } as never);
    expect((await service.run(new Date('2027-01-01T05:00:00Z'))).skipped).not.toBeNull();
    expect(members.find).not.toHaveBeenCalled();
    expect(await service.run(new Date('2027-01-04T05:00:00Z'))).toEqual({ eligible: 0, sent: 0, skipped: null });
  });

  it('refuse un déclencheur non configuré ou sans secret valide', () => {
    const run = jest.fn();
    const secret = 'x'.repeat(32);
    const controller = new ReminderController({ run } as never, { get: () => secret } as never);
    expect(() => controller.run()).toThrow();
    expect(() => controller.run('Bearer incorrect')).toThrow();
    expect(run).not.toHaveBeenCalled();
    controller.run(`Bearer ${secret}`);
    expect(run).toHaveBeenCalledTimes(1);
    const unconfigured = new ReminderController({ run } as never, { get: () => '' } as never);
    expect(() => unconfigured.run()).toThrow();
  });
});
