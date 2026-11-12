import { NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import {
  CreateSentReportInput,
  SentReportSummaryDto,
} from '../src/email/dto/sent-report.dto';
import { SentReportService } from '../src/email/sent-report.service';

interface FakeReport {
  _id: Types.ObjectId;
  year: number;
  month: number;
  monthLabel: string;
  to: string;
  subject: string;
  workedDays: number;
  totalLeaveDays: number;
  createdAt: Date;
}

function createReport(overrides: Partial<FakeReport> = {}): FakeReport {
  return {
    _id: new Types.ObjectId(),
    year: 2026,
    month: 10,
    monthLabel: 'octobre 2026',
    to: 'responsable@example.com',
    subject: 'Récapitulatif mensuel — octobre 2026',
    workedDays: 20,
    totalLeaveDays: 1.5,
    createdAt: new Date('2026-11-02T10:00:00.000Z'),
    ...overrides,
  };
}

function createModelMock(reports: FakeReport[] = []) {
  const chain = {
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue(reports),
  };

  return {
    find: jest.fn().mockReturnValue(chain),
    countDocuments: jest.fn().mockResolvedValue(reports.length),
    findOne: jest.fn().mockResolvedValue(reports[0] ?? null),
    create: jest.fn().mockImplementation((input: Record<string, unknown>) =>
      Promise.resolve({ _id: new Types.ObjectId(), ...input }),
    ),
    chain,
  };
}

describe('SentReportService', () => {
  const userId = new Types.ObjectId().toHexString();

  it('liste les rapports de l’utilisateur avec pagination par défaut', async () => {
    const report = createReport();
    const model = createModelMock([report]);
    const service = new SentReportService(model as never);

    const result = await service.list(userId, {});

    expect(model.find).toHaveBeenCalledWith({ userId });
    expect(model.chain.skip).toHaveBeenCalledWith(0);
    expect(model.chain.limit).toHaveBeenCalledWith(10);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(10);
    expect(result.total).toBe(1);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toBeInstanceOf(SentReportSummaryDto);
    expect(result.items[0].id).toBe(String(report._id));
    expect(result.items[0].monthLabel).toBe('octobre 2026');
  });

  it('applique les filtres année et mois et la page demandée', async () => {
    const model = createModelMock([createReport()]);
    const service = new SentReportService(model as never);

    await service.list(userId, { page: 3, limit: 5, year: 2025, month: 7 });

    expect(model.find).toHaveBeenCalledWith({ userId, year: 2025, month: 7 });
    expect(model.chain.skip).toHaveBeenCalledWith(10);
    expect(model.chain.limit).toHaveBeenCalledWith(5);
    expect(model.countDocuments).toHaveBeenCalledWith({ userId, year: 2025, month: 7 });
  });

  it('crée un rapport rattaché à l’utilisateur', async () => {
    const model = createModelMock();
    const service = new SentReportService(model as never);
    const input: CreateSentReportInput = {
      year: 2026,
      month: 11,
      monthLabel: 'novembre 2026',
      from: 'expediteur@example.com',
      to: 'responsable@example.com',
      cc: 'copie@example.com',
      bcc: 'archive@example.com',
      subject: 'Récapitulatif mensuel — novembre 2026',
      message: 'Bonjour,',
      workedDays: 18,
      totalLeaveDays: 0,
      senderName: 'Élise EMPLOYÉE',
      messageId: 'message-1',
    };

    const created = await service.create(userId, input);

    expect(model.create).toHaveBeenCalledWith({ userId, ...input });
    expect(String(created._id)).toHaveLength(24);
  });

  it('renvoie 404 pour un identifiant invalide sans interroger la base', async () => {
    const model = createModelMock();
    const service = new SentReportService(model as never);

    await expect(service.findOne(userId, 'pas-un-id')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(model.findOne).not.toHaveBeenCalled();
  });

  it('renvoie 404 si le rapport appartient à un autre utilisateur', async () => {
    const model = createModelMock();
    model.findOne.mockResolvedValueOnce(null);
    const service = new SentReportService(model as never);

    await expect(
      service.findOne(userId, new Types.ObjectId().toHexString()),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('renvoie le détail complet d’un rapport', async () => {
    const report = {
      ...createReport(),
      from: 'expediteur@example.com',
      bcc: 'archive@example.com',
      message: 'Bonjour,',
      senderName: 'Élise EMPLOYÉE',
      messageId: 'message-1',
    };
    const model = createModelMock();
    model.findOne.mockResolvedValueOnce(report);
    const service = new SentReportService(model as never);

    const detail = await service.findOne(userId, String(report._id));

    expect(model.findOne).toHaveBeenCalledWith({ _id: String(report._id), userId });
    expect(detail.message).toBe('Bonjour,');
    expect(detail.from).toBe('expediteur@example.com');
    expect(detail.messageId).toBe('message-1');
  });
});
