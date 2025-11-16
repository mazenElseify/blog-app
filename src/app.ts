import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { connectDatabase } from './config/database';
import { errorHandler } from './middleware/errorHandler';
import blogRoutes from './routes/blogRoutes';
import authRoutes from './routes/authRoutes';


// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());

// Configure allowed origins
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173', // Vite dev server
  'http://localhost:3001',
  'http://localhost:8080',
  'https://blog-app-amber-three.vercel.app' // Vercel production domain (no trailing slash)
];

// Add environment-specific origins if they exist
if (process.env.CORS_ORIGIN) {
  allowedOrigins.push(process.env.CORS_ORIGIN);
}
if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}

app.use(cors({
  origin: allowedOrigins,
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

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
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
app.use('*', (req: Request, res: Response) => {
  res.status(404).json({
    status: 'error',
    message: 'Route not found'
  });
});

// Start server
const startServer = async () => {
  try {
    // Connect to MongoDB
    if (!process.env.VERCEL) {
      await connectDatabase();
    }

    app.listen(PORT, () => {
      console.log(`🚀 Server is running on port ${PORT}`);
      console.log(`📚 Blog App API available at http://localhost:${PORT}`);
      console.log(`🏥 Health check: http://localhost:${PORT}/health`);
      console.log(`🔐 Auth endpoints: http://localhost:${PORT}/api/v1/auth/register`);
      console.log(`🔑 Login endpoint: http://localhost:${PORT}/api/v1/auth/login`);
      console.log(`📝 Blog endpoints: http://localhost:${PORT}/api/v1/blogs`);
      console.log('✅ All systems ready!');
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    if (!process.env.VERCEL){
      process.exit(1);
    }
  }
};

// Only start server if not in Vercel environment
if (!process.env.VERCEL) {
  startServer();
}

export default app;