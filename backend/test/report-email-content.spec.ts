import { EmailReportData } from '../src/email/dto/email-dto';
import { ReportService } from '../src/email/report.service';

function createService(): ReportService {
  return new ReportService(
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
  );
}

function createData(overrides: Partial<EmailReportData> = {}): EmailReportData {
  return {
    month: 11,
    year: 2026,
    monthLabel: 'novembre 2026',
    workedDays: 18,
    totalLeaveDays: 0,
    leaveDetails: [],
    senderName: 'Élise EMPLOYÉE',
    ...overrides,
  };
}

describe('ReportService — contenu de l’e-mail', () => {
  it('n’inclut pas la section « Détail des congés » quand aucun congé n’est pris', () => {
    const { message } = createService().buildEmailContent(createData());

    expect(message).toContain('**Congés pris :** 0 jour');
    expect(message).not.toContain('Détail des congés');
    expect(message).not.toContain('Aucun congé');
    expect(message).not.toContain('{{');
  });

  it('inclut le détail quand au moins une demi-journée est prise', () => {
    const { message } = createService().buildEmailContent(
      createData({
        totalLeaveDays: 0.5,
        leaveDetails: [{ date: '2026-11-12', duration: 0.5, period: 'morning' }],
      }),
    );

    expect(message).toContain('**Congés pris :** 0,5 jour');
    expect(message).toContain('**Détail des congés :**');
    expect(message).toContain('- 12/11/2026 : 0,5 jour (matin)');
  });

  it('utilise l’adresse SMTP commune tout en conservant le nom de l’utilisateur', async () => {
    const workDayModel = { find: jest.fn().mockResolvedValue([]) };
    const requestModel = { find: jest.fn().mockResolvedValue([]) };
    const usersService = {
      findById: jest.fn().mockResolvedValue({
        _id: 'user-1',
        firstName: 'Élise',
        lastName: 'Employé',
        email: 'elise@example.com',
      }),
    };
    const emailService = {
      getFrom: () => ({ email: 'smtp@example.com', name: 'SMTP' }),
      getBcc: () => null,
    };
    const service = new ReportService(
      workDayModel as never,
      requestModel as never,
      usersService as never,
      emailService as never,
      {} as never,
    );

    const preview = await service.generatePreview('user-1', 2026, 11);

    expect(preview.from).toBe('smtp@example.com');
    expect(preview.senderName).toBe('Élise EMPLOYÉ');
  });
});
