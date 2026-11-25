import { Types } from 'mongoose';
import { UserRole } from '../src/common/enums/user-role.enum';
import { CashLedgerService } from '../src/contributions/cash-ledger.service';
import { ContributionsService } from '../src/contributions/contributions.service';
import { NotificationsService } from '../src/contributions/notifications.service';
import { createFakeModel, fakeConfigService, fakeConnection, fakeEmailService } from './helpers/fake-finance-models';

describe('Validation groupée des cotisations', () => {
  const user = { id: new Types.ObjectId().toString(), email: 'tsiresy.madasoftware@gmail.com', firstName: 'Tsiresy', lastName: '', role: UserRole.EMPLOYEE };
  const memberId = new Types.ObjectId();
  let service: ContributionsService;
  let contributions: ReturnType<typeof createFakeModel>;
  let cash: ReturnType<typeof createFakeModel>;
  let logs: ReturnType<typeof createFakeModel>;
  let mail: ReturnType<typeof fakeEmailService>;

  beforeEach(() => {
    const members = createFakeModel([
      { email: user.email, name: 'Tsiresy', status: 'ACTIVE', canValidate: true, userId: new Types.ObjectId(user.id) },
      { _id: memberId, email: 'membre@example.com', name: 'Membre', status: 'ACTIVE' },
    ]);
    contributions = createFakeModel([], { uniqueFields: ['uniqueKey'] });
    cash = createFakeModel([], { groupDirection: true, uniqueFields: ['contributionId'] });
    logs = createFakeModel([]);
    mail = fakeEmailService();
    const ledger = new CashLedgerService(cash, fakeConnection as never);
    jest.spyOn(ledger, 'runInRequiredTransaction').mockImplementation(async (fn) => fn({} as never));
    const notifications = new NotificationsService(logs, mail as never, members, fakeConfigService as never);
    service = new ContributionsService(members, contributions, createFakeModel(), createFakeModel(), ledger, notifications);
  });

  const declare = () => service.declare({ memberId: String(memberId), year: 2026, months: [1, 2], paymentDate: '2026-02-01' }, user);

  it('ne comptabilise ni ne notifie avant validation, puis traite tout le groupe une seule fois', async () => {
    const result = await declare();
    expect(result.items.map((item) => item.status)).toEqual(['EN_ATTENTE_DE_VALIDATION', 'EN_ATTENTE_DE_VALIDATION']);
    expect(cash.docs).toHaveLength(0);
    expect(mail.sendMail).not.toHaveBeenCalled();
    await service.validate(result.items[0].id, user);
    expect(contributions.docs.map((item: { status: string }) => item.status)).toEqual(['VALIDE', 'VALIDE']);
    expect(cash.docs).toHaveLength(2);
    expect(logs.docs).toHaveLength(1);
    expect(logs.docs[0].recipients).toEqual({ to: ['membre@example.com'], cc: [user.email] });
    expect(logs.docs[0].html).toContain('<strong>Validé par :</strong> Tsiresy');
    await new Promise<void>((resolve) => setImmediate(resolve));
    expect(mail.sendMail).toHaveBeenCalledTimes(1);
    await expect(service.validate(result.items[1].id, user)).rejects.toThrow();
    expect(cash.docs).toHaveLength(2);
  });

  it('répond sans attendre un serveur SMTP bloqué', async () => {
    mail.sendMail.mockImplementation(() => new Promise(() => undefined));
    const result = await declare();
    const validated = await service.validate(result.items[0].id, user);
    expect(validated.status).toBe('VALIDE');
    expect(logs.docs).toHaveLength(1);
    await new Promise<void>((resolve) => setImmediate(resolve));
    expect(mail.sendMail).toHaveBeenCalledTimes(1);
  });

  it('refuse tout le groupe avec un motif et permet une nouvelle déclaration', async () => {
    const result = await declare();
    await expect(service.reject(result.items[0].id, { reason: '   ' }, user)).rejects.toThrow();
    await service.reject(result.items[0].id, { reason: 'À vérifier' }, user);
    expect(contributions.docs.every((item: { status: string; uniqueKey?: string }) => item.status === 'REFUSE' && !item.uniqueKey)).toBe(true);
    expect(cash.docs).toHaveLength(0);
    expect(mail.sendMail).not.toHaveBeenCalled();
    expect((await declare()).items).toHaveLength(2);
  });
});
