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
  };
};
