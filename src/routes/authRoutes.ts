import express, { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';

const router = express.Router();

// Mock user storage (replace with database in production)
interface User {
  id: string;
  email: string;
  password: string;
  name: string;
}

const users: User[] = [];

// Validation middleware
const registerValidation = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('name')
    .notEmpty()
    .withMessage('Name is required')
    .trim()
];

const loginValidation = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

// POST /api/v1/auth/register - Register new user
router.post('/register', registerValidation, async (req: Request, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: errors.array()
      });
      return;
    }

    const { email, password, name } = req.body;

    // Check if user already exists
    const existingUser = users.find(user => user.email === email);
    if (existingUser) {
      res.status(400).json({
        status: 'error',
        message: 'User with this email already exists'
      });
      return;
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create new user
    const newUser: User = {
      id: Date.now().toString(),
      email,
      password: hashedPassword,
      name
    };

    users.push(newUser);

    // Generate JWT token
    const jwtSecret = process.env.JWT_SECRET || 'fallback-secret';
    const token = jwt.sign(
      { userId: newUser.id, email: newUser.email },
      jwtSecret,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      status: 'success',
      message: 'User registered successfully',
      data: {
        user: {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name
        },
        token
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to register user'
    });
  }
});

// POST /api/v1/auth/login - Login user
router.post('/login', loginValidation, async (req: Request, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: errors.array()
      });
      return;
    }

    const { email, password } = req.body;

    // Find user
    const user = users.find(u => u.email === email);
    if (!user) {
      res.status(401).json({
        status: 'error',
        message: 'Invalid email or password'
      });
      return;
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      res.status(401).json({
        status: 'error',
        message: 'Invalid email or password'
      });
      return;
    }
        
    // Generate JWT token
    const jwtSecret = process.env.JWT_SECRET || 'fallback-secret';
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      jwtSecret,
      { expiresIn: '7d' }
    );

    res.json({
      status: 'success',
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name
        },
        token
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to login'
    });
  }
});

// GET /api/v1/auth/me - Get current user info (requires token)
router.get('/me', async (req: Request, res: Response): Promise<void> => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      res.status(401).json({
        status: 'error',
        message: 'No token provided'
      });
      return;
    }

    const jwtSecret = process.env.JWT_SECRET || 'fallback-secret';
    const decoded = jwt.verify(token, jwtSecret) as any;
    const user = users.find(u => u.id === decoded.userId);

    if (!user) {
      res.status(401).json({
        status: 'error',
        message: 'Invalid token'
      });
      return;
    }

    res.json({
      status: 'success',
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name
        }
      }
    });
  } catch (error) {
    res.status(401).json({
      status: 'error',
      message: 'Invalid token'
    });
  }
});

export default router;