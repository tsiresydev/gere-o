export default (): Record<string, unknown> => {
  const required = (key: string): string => {
    const value = process.env[key];
    if (!value) {
      throw new Error(`Variable d'environnement manquante : ${key}`);
    }
    return value;
  };

  const nodeEnv = process.env.NODE_ENV ?? 'development';
  const jwtSecret = required('JWT_SECRET');

  if (nodeEnv === 'production' && (jwtSecret === 'change-me' || jwtSecret.length < 16)) {
    throw new Error('JWT_SECRET invalide : utilisez un secret d\'au moins 16 caractères en production');
  }

  return {
    nodeEnv,
    port: Number(process.env.PORT ?? 3000),
    mongodbUri: required('MONGODB_URI'),
    jwtSecret,
    jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
    corsOrigins: (process.env.CORS_ORIGIN ?? '')
      .split(',')
      .map((origin) => origin.trim())
      .filter((origin) => origin.length > 0),
    smtpHost: process.env.SMTP_HOST ?? 'smtp.gmail.com',
    smtpPort: Number(process.env.SMTP_PORT ?? 587),
    smtpUser: process.env.SMTP_USER ?? '',
    smtpPassword: process.env.SMTP_PASSWORD ?? '',
    smtpFrom: process.env.SMTP_FROM ?? 'tsiresy.madasoftware@gmail.com',
    emailReportBcc: process.env.EMAIL_REPORT_BCC ?? 'tsiresyrabekoto@gmail.com',
    reminderTriggerSecret: process.env.REMINDER_TRIGGER_SECRET ?? '',
    reminderExtraHolidays: process.env.REMINDER_EXTRA_HOLIDAYS ?? '',
  };
};
