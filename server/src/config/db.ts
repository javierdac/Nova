import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from './logger.js';

mongoose.set('strictQuery', true);

export async function connectDatabase(uri: string = env.MONGODB_URI): Promise<typeof mongoose> {
  mongoose.connection.on('connected', () => logger.info('🟢 MongoDB connected'));
  mongoose.connection.on('error', (err) => logger.error({ err }, '🔴 MongoDB connection error'));
  mongoose.connection.on('disconnected', () => logger.warn('🟡 MongoDB disconnected'));

  await mongoose.connect(uri, {
    maxPoolSize: 20,
    serverSelectionTimeoutMS: 10000,
  });

  return mongoose;
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.connection.close();
}
