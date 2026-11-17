import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { Types } from 'mongoose';
import { UserRole } from '../src/common/enums/user-role.enum';
import { AuthUser } from '../src/common/interfaces/auth-user.interface';
import { CashLedgerService } from '../src/contributions/cash-ledger.service';
import { ContributionsService } from '../src/contributions/contributions.service';
import { ExpensesService } from '../src/contributions/expenses.service';
import { NotificationsService } from '../src/contributions/notifications.service';
import {
  createFakeModel,
  fakeConfigService,
  fakeConnection,
  fakeEmailService,
} from './helpers/fake-finance-models';

describe('Module Cotisations — règles métier', () => {
  const now = new Date();
  const year = now.getUTCFullYear();
  const currentMonth = now.getUTCMonth() + 1;
  const count = Math.min(2, currentMonth);
  const months = Array.from({ length: count }, (_, index) => currentMonth - count + 1 + index);
  const paymentDate = `${year}-${String(months[0]).padStart(2, '0')}-01`;

  const tsiresyId = new Types.ObjectId().toString();
  const employeeId = new Types.ObjectId().toString();

  const tsiresy: AuthUser = {
    id: tsiresyId,
    email: 'tsiresy.madasoftware@gmail.com',
    firstName: 'Tsiresy',
    lastName: 'RABEKOTO',
    role: UserRole.EMPLOYEE,
  };
  const employee: AuthUser = {
    id: employeeId,
    email: 'sambany.madasoftware@gmail.com',
    firstName: 'Sambany',
    lastName: 'RAKOTO',
    role: UserRole.EMPLOYEE,
  };

  let memberModel: ReturnType<typeof createFakeModel>;
  let contributionModel: ReturnType<typeof createFakeModel>;
  let expenseModel: ReturnType<typeof createFakeModel>;
  let categoryModel: ReturnType<typeof createFakeModel>;
  let cashModel: ReturnType<typeof createFakeModel>;
  let notificationModel: ReturnType<typeof createFakeModel>;
  let email: ReturnType<typeof fakeEmailService>;
  let service: ContributionsService;
  let expensesService: ExpensesService;
  let notifications: NotificationsService;

  const mahefaEmail = 'mahefa.madasoftware@gmail.com';

  beforeEach(() => {
    memberModel = createFakeModel([
      { name: 'Mahefa', email: mahefaEmail, status: 'ACTIVE', canValidate: true, joinedAt: new Date() },
      { name: 'Tsiresy', email: tsiresy.email, userId: new Types.ObjectId(tsiresyId), status: 'ACTIVE', canValidate: true, joinedAt: new Date() },
      { name: 'Sambany', email: employee.email, userId: new Types.ObjectId(employeeId), status: 'ACTIVE', canValidate: false, joinedAt: new Date() },
    ]);
    contributionModel = createFakeModel([], { uniqueFields: ['uniqueKey'] });
    expenseModel = createFakeModel([]);
    categoryModel = createFakeModel([
      { name: 'FAHASOAVANA', label: 'Fahasoavana', isActive: true },
      { name: 'HOSPITALISATION', label: 'Hospitalisation', isActive: true },
      { name: 'AUTRE', label: 'Autre', isActive: true },
    ]);
    cashModel = createFakeModel([], {
      groupDirection: true,
      uniqueFields: ['contributionId', 'expenseId'],
    });
    notificationModel = createFakeModel([]);
    email = fakeEmailService();

    const ledger = new CashLedgerService(cashModel, fakeConnection as never);
    notifications = new NotificationsService(
      notificationModel,
      email as never,
      memberModel,
      fakeConfigService as never,
    );
    service = new ContributionsService(
      memberModel,
      contributionModel,
      expenseModel,
      categoryModel,
      ledger,
      notifications,
    );
    expensesService = new ExpensesService(
      expenseModel,
      categoryModel,
      memberModel,
      ledger,
      notifications,
      service,
    );

    Object.assign(service, { ledger });
  });

  const declare = (user: AuthUser, memberId?: string) =>
    service.declare(
      {
        memberId,
        months,
        year,
        paymentDate,
        paymentMethod: 'Espèces',
      },
      user,
    );

  describe('Déclarations', () => {
    it('crée un enregistrement par mois reliés par un même groupe', async () => {
      const result = await declare(employee);

      expect(result.items).toHaveLength(months.length);
      expect(new Set(result.items.map((item) => item.declarationGroupId)).size).toBe(1);
      result.items.forEach((item, index) => {
        expect(item.periodMonth).toBe(months[index]);
        expect(item.periodYear).toBe(year);
        expect(item.declaredAmount).toBe(5000);
        expect(item.expectedAmount).toBe(5000);
        expect(item.status).toBe('EN_ATTENTE_DE_VALIDATION');
      });
      expect(contributionModel.docs).toHaveLength(months.length);
    });

    it('envoie une notification au payeur avec les autres membres actifs en copie', async () => {
      await declare(employee);

      expect(notificationModel.docs).toHaveLength(1);
      const log = notificationModel.docs[0];
      expect(log.recipients.to).toEqual([employee.email]);
      expect(log.recipients.cc).toContain(mahefaEmail);
      expect(log.recipients.cc).toContain(tsiresy.email);
      expect(log.recipients.cc).not.toContain(employee.email);
      expect(new Set(log.recipients.cc).size).toBe(log.recipients.cc.length);
      expect(email.sendMail).toHaveBeenCalledTimes(1);
      expect(email.sendMail.mock.calls[0][0].to).toEqual([{ email: employee.email }]);
    });

    it('calcule le montant côté backend et ignore un montant envoyé par le client', async () => {
      const result = await service.declare(
        { months: [months[0]], year, paymentDate, notes: 'test' } as never,
        employee,
      );
      expect(result.items[0].declaredAmount).toBe(5000);
    });

    it('refuse un doublon de mois', async () => {
      await declare(employee);
      await expect(declare(employee)).rejects.toBeInstanceOf(ConflictException);
    });

    it('protège contre deux déclarations concurrentes', async () => {
      const results = await Promise.allSettled([declare(employee), declare(employee)]);
      expect(results.filter((item) => item.status === 'fulfilled')).toHaveLength(1);
      expect(results.filter((item) => item.status === 'rejected')).toHaveLength(1);
      expect(contributionModel.docs).toHaveLength(months.length);
      expect(notificationModel.docs).toHaveLength(1);
    });

    it('empêche un employé de déclarer pour un autre membre', async () => {
      const mahefa = memberModel.docs.find(
        (item: { email: string; _id: Types.ObjectId }) => item.email === mahefaEmail,
      );
      await expect(declare(employee, String(mahefa._id))).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('autorise un validateur à déclarer pour n’importe quel membre', async () => {
      const sambany = memberModel.docs.find(
        (item: { email: string; _id: Types.ObjectId }) => item.email === employee.email,
      );
      const result = await declare(tsiresy, String(sambany._id));
      expect(result.items).toHaveLength(months.length);
      expect(notificationModel.docs[0].recipients.to).toEqual([employee.email]);
    });
  });

  describe('Validation et refus', () => {
    const pending = async () => (await declare(employee)).items[0];

    it('valide en comptabilisant l’entrée sans nouvel email', async () => {
      const declaration = await pending();
      const before = notificationModel.docs.length;
      const validated = await service.validate(declaration.id, tsiresy);

      expect(validated.status).toBe('VALIDE');
      expect(validated.validatedBy).toBe(tsiresyId);
      expect(validated.validatedAt).toBeDefined();
      expect(cashModel.docs).toHaveLength(1);
      expect(cashModel.docs[0]).toMatchObject({
        direction: 'IN',
        amount: 5000,
        type: 'CONTRIBUTION_VALIDEE',
      });
      expect(notificationModel.docs).toHaveLength(before);
    });

    it('refuse la validation à un employé', async () => {
      const declaration = await pending();
      await expect(service.validate(declaration.id, employee)).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('bloque la double validation', async () => {
      const declaration = await pending();
      await service.validate(declaration.id, tsiresy);
      await expect(service.validate(declaration.id, tsiresy)).rejects.toBeInstanceOf(ConflictException);
      expect(cashModel.docs).toHaveLength(1);
    });

    it('refuse puis autorise une nouvelle déclaration du même mois', async () => {
      const declaration = await pending();
      const rejected = await service.reject(declaration.id, { reason: 'Justificatif manquant' }, tsiresy);

      expect(rejected.status).toBe('REFUSE');
      expect(rejected.rejectionReason).toBe('Justificatif manquant');
      expect(contributionModel.docs[0].uniqueKey).toBeUndefined();
      expect(cashModel.docs).toHaveLength(0);

      const again = await service.declare(
        {
          months: [declaration.periodMonth],
          year,
          paymentDate,
        },
        employee,
      );
      expect(again.items).toHaveLength(1);
    });

    it('refuse le refus à un employé', async () => {
      const declaration = await pending();
      await expect(service.reject(declaration.id, { reason: 'Motif' }, employee)).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('Dépenses', () => {
    beforeEach(async () => {
      const declaration = (await declare(employee)).items[0];
      await service.validate(declaration.id, tsiresy);
    });

    it('enregistre une dépense avec contrôle du solde et notification ciblée', async () => {
      const beforeLogs = notificationModel.docs.length;
      const expense = await expensesService.create(
        {
          description: 'Fahasoavana Janvier',
          category: 'FAHASOAVANA',
          amount: 2000,
          expenseDate: paymentDate,
        },
        tsiresy,
      );

      expect(expense.amount).toBe(2000);
      expect(expense.balanceAfter).toBe(3000);
      expect(cashModel.docs[1]).toMatchObject({ direction: 'OUT', amount: 2000 });
      expect(notificationModel.docs).toHaveLength(beforeLogs + 1);
      const log = notificationModel.docs[beforeLogs];
      expect(log.recipients.to).toEqual([mahefaEmail]);
      expect(log.recipients.cc).not.toContain(mahefaEmail);
      expect(log.recipients.cc).toContain(employee.email);
      expect(email.sendMail).toHaveBeenCalledTimes(2);
    });

    it('refuse une dépense supérieure au solde disponible', async () => {
      await expect(
        expensesService.create(
          { description: 'Dépense trop chère', category: 'AUTRE', amount: 6000, expenseDate: paymentDate },
          tsiresy,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(expenseModel.docs).toHaveLength(0);
      expect(cashModel.docs).toHaveLength(1);
    });

    it('refuse une dépense à un employé', async () => {
      await expect(
        expensesService.create(
          { description: 'Tentative employé', category: 'AUTRE', amount: 1000, expenseDate: paymentDate },
          employee,
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('Solde, journal et KPI', () => {
    it('calcule solde = entrées validées − sorties enregistrées', async () => {
      const declaration = (await declare(employee)).items[0];
      await service.validate(declaration.id, tsiresy);
      await expensesService.create(
        { description: 'Hospitalisation', category: 'HOSPITALISATION', amount: 3000, expenseDate: paymentDate },
        tsiresy,
      );

      const overview = await service.getOverview({ year });
      expect(overview.balance).toBe(2000);
      expect(overview.totalCollected).toBe(5000);
      expect(overview.totalExpenses).toBe(3000);
      expect(overview.categories).toEqual([{ category: 'HOSPITALISATION', amount: 3000 }]);
    });

    it('conserve l’opération d’origine lors d’une correction', async () => {
      const declaration = (await declare(employee)).items[0];
      await service.validate(declaration.id, tsiresy);
      const original = cashModel.docs[0];

      const correction = await new CashLedgerService(cashModel, fakeConnection as never).correct(
        {
          transactionId: String(original._id),
          amount: 1000,
          direction: 'IN' as never,
          reason: 'Erreur de saisie',
        },
        tsiresy,
      );

      expect(correction.balance).toBe(6000);
      expect(cashModel.docs).toHaveLength(2);
      expect(cashModel.docs[1]).toMatchObject({ type: 'CORRECTION', direction: 'IN' });
      expect(cashModel.docs[0].amount).toBe(5000);
      await expect(
        new CashLedgerService(cashModel, fakeConnection as never).correct(
          {
            transactionId: String(original._id),
            amount: 7000,
            direction: 'OUT' as never,
            reason: 'Solde insuffisant',
          },
          tsiresy,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('Notifications', () => {
    it('ne renvoie pas d’email en double et permet un retry après échec SMTP', async () => {
      await declare(employee);
      const logId = String(notificationModel.docs[0]._id);
      notificationModel.docs[0].status = 'FAILED';
      notificationModel.docs[0].attempts = 0;
      email.sendMail.mockReset();
      email.sendMail.mockResolvedValueOnce({ success: false, error: 'SMTP indisponible' });
      email.sendMail.mockResolvedValue({ success: true });

      const failed = await notifications.dispatch(logId);
      expect(failed.sent).toBe(false);
      expect(notificationModel.docs[0].status).toBe('FAILED');
      expect(notificationModel.docs[0].attempts).toBe(1);

      const retried = await notifications.retry(logId);
      expect(retried.sent).toBe(true);
      expect(notificationModel.docs[0].status).toBe('SENT');
      expect(notificationModel.docs[0].attempts).toBe(2);

      const again = await notifications.retry(logId);
      expect(again).toEqual({ sent: false, skipped: 'Déjà envoyée' });
      expect(email.sendMail).toHaveBeenCalledTimes(2);
    });
  });
});
