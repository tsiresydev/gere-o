process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-secret-jwt-with-16-chars-minimum';
process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? '1h';
process.env.MONGODB_URI =
  process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:59999/gere-o-test?serverSelectionTimeoutMS=100';
process.env.CORS_ORIGIN = process.env.CORS_ORIGIN ?? 'http://localhost:3001';
process.env.PORT = process.env.PORT ?? '3000';
