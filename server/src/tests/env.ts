// Loaded via jest `setupFiles` before any module (incl. config/env) is imported.
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://localhost:27017/nova-test';
process.env.JWT_ACCESS_SECRET = 'test-access-secret-please-change-1234';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-please-change-5678';
process.env.JWT_ACCESS_EXPIRES_IN = '15m';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';
process.env.BCRYPT_SALT_ROUNDS = '4';
process.env.LOG_LEVEL = 'error';
