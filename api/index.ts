import { VercelRequest, VercelResponse } from '@vercel/node';
import mongoose from 'mongoose';
import { connectDatabase } from '../src/config/database';
import app from '../src/app';

let cached = (global as any).mongoose;

const connectDB = async () => {
  if (cached.conn) {
    return cached.conn;
  } 
  if (!cached) {
    cached = { conn: null , promise: null};
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };
    const mongoUri = process.env.MONGODB_URI!;
    if (!mongoUri) {
      throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
    }

    cached.promise = mongoose.connect(mongoUri, opts).then((mongoose) => {
      console.log('MongoDB connected to vercel');
      return mongoose;
    });
  }
  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    console.error('MongoDB connection error:', e);
    throw e;
}
  return cached.conn;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    await connectDB();
    return app(req as any, res as any);
  } catch (error) {
    console.error('Error in handler:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal Server Error'
    });
  }
}