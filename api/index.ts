import { VercelRequest, VercelResponse } from '@vercel/node';
import mongoose from 'mongoose';
// import app from '../src/app';

let isConnected = false;

async function connectDB  () {
  if (isConnected) {
    return;
  }
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI environment variable is required');
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
      return res.status(200).end();
    }
    await connectDB();
    if (req.url === '/health' || req.url === '/') {
      return res.status(200).json({
        status: 'success',
        message: 'Serverless function is working properly',
        timestamp: new Date().toISOString(),
        environment: {
        nodeEnv: process.env.NODE_ENV,
        hasMongoUri: !!process.env.MONGODB_URI,
        hasJwtSecret: !!process.env.JWT_SECRET,
        mongoConnected: isConnected
        }

      });
    } 

    const {default: app} = await import('../src/app');
    return app( req as any, res as any);

    // return res.status(200).json({
    //   status: 'info',
    //   message: 'Route handler working',
    //   url: req.url,
    //   method: req.method
    // });
  } catch (error) {
    console.error("Error in Vercel handler:", error);
    return res.status(500).json({ 
      status: 'error',
      message: 'Internal Server Error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }); 
  }
  // app(req as any, res as any);
}



