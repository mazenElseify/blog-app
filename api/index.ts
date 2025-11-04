import { VercelRequest, VercelResponse } from '@vercel/node';
import { connectDatabase } from '../src/config/database';
import app from '../src/app';

let isConnected = false;

const connectDB = async () => {
  if (!isConnected) {
    try {
      await connectDatabase();
      isConnected = true;
      console.log('✅ Connected to MongoDB in Vercel');
    } catch (error) {
      console.error('❌ Database connection failed:', error);
    }
  }
};

export default async (req: VercelRequest, res: VercelResponse) => {
  await connectDB();
  return app(req as any, res as any);
};
