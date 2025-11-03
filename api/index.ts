import { VercelRequest, VercelResponse } from '@vercel/node';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { connectDatabase } from '../src/config/database';
import { errorHandler } from '../src/middleware/errorHandler';
import blogRoutes from '../src/routes/blogRoutes';
import authRoutes from '../src/routes/authRoutes';

// Load environment variables
dotenv.config();

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));

// Logging middleware
app.use(morgan('combined'));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/blogs', blogRoutes);

// Welcome route
app.get('/', (req: express.Request, res: express.Response) => {
  res.json({
    message: '🚀 Welcome to Blog API',
    version: '1.0.0',
    status: 'active',
    endpoints: {
      health: '/health',
      auth: {
        register: '/api/v1/auth/register',
        login: '/api/v1/auth/login',
        profile: '/api/v1/auth/me'
      },
      blogs: {
        getAll: '/api/v1/blogs',
        getBySlug: '/api/v1/blogs/:slug',
        create: 'POST /api/v1/blogs',
        update: 'PUT /api/v1/blogs/:id',
        delete: 'DELETE /api/v1/blogs/:id'
      }
    },
    documentation: 'https://github.com/mazenElseify/blog-app',
    timestamp: new Date().toISOString()
  });
});

// Health check endpoint
app.get('/health', (req: express.Request, res: express.Response) => {
  res.json({
    status: 'OK',
    message: 'Blog API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use('*', (req: express.Request, res: express.Response) => {
  res.status(404).json({
    status: 'error',
    message: 'Route not found'
  });
});

// Connect to database once
let isConnected = false;

const connectDB = async () => {
  if (!isConnected) {
    try {
      await connectDatabase();
      isConnected = true;
    } catch (error) {
      console.error('Database connection failed:', error);
    }
  }
};

export default async (req: VercelRequest, res: VercelResponse) => {
  await connectDB();
  return app(req, res);
};
