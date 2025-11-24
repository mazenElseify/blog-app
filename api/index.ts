import { VercelRequest, VercelResponse } from '@vercel/node';
import mongoose from 'mongoose';
// import app from '../src/app';
import express from 'express';

let isConnected = false;
let app: express.Express | null = null;

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

async function getApp() {
  if (!app) {
    const { default: importedApp } = await import('../src/app');
    app = importedApp;
  }
  return app;
} 
export default async function handler( req: VercelRequest, res: VercelResponse) {
  try {
    // Configure CORS headers
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:5173',
      'http://localhost:5174', // Vite dev server alternative port
      'http://localhost:3001',
      'http://localhost:8080',
      'https://blog-app-amber-three.vercel.app',
      
      process.env.CORS_ORIGIN,
      process.env.FRONTEND_URL
    ].filter(Boolean);

    const origin = req.headers.origin;
    if (origin && allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    } else if (!origin) {
      // For requests without origin header (e.g., Postman, mobile apps)
      res.setHeader('Access-Control-Allow-Origin', '*');
    }
    
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');

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


    const expressApp = await getApp();
    return expressApp(req as any, res as any);
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



