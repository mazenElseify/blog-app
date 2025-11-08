import { VercelRequest, VercelResponse } from '@vercel/node';
import mongoose from 'mongoose';
import app from '../src/app';

let isConnected = false;

async function connectDB  () {
  if (isConnected) {
    return;
  }
  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error('MONGO_URI environment variable is required');
    }
    await mongoose.connect(mongoUri, {
      bufferCommands: false,
    });
    isConnected = true;
    console.log('MongoDB connected in vercel');

  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
}
export default async function handler( req: VercelRequest, res: VercelResponse) {
  try {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }
    await connectDB();
    if (req.url === '/health') {
      return res.status(200).json({
        status: 'OK',
        message: 'Blog API is running',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      });
    } 
    const {default: app} = await import('../src/app');

    return app( req as any, res as any);
  } catch (error) {
    console.error("Error in Vercel handler:", error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
  // app(req as any, res as any);
}



