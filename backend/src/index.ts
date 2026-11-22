import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';

import { env } from '@/config/env';
import { connectDatabase } from '@/config/database';

// Import all models so they register with Sequelize (must be after database import)
import '@/modules/users/user.model';
import '@/modules/books/book.model';
import '@/modules/copies/copy.model';
import '@/modules/loans/loan.model';
import '@/modules/queue/queue.model';
import '@/modules/auth/refreshToken.model';

import { errorHandler } from '@/shared/middleware/errorHandler';
import { notFoundHandler } from '@/shared/middleware/notFoundHandler';
import { authRoutes } from '@/modules/auth/auth.routes';
import { userRoutes } from '@/modules/users/user.routes';
import { bookRoutes } from '@/modules/books/book.routes';
import { copyRoutes } from '@/modules/copies/copy.routes';
import { loanRoutes } from '@/modules/loans/loan.routes';
import { queueRoutes } from '@/modules/queue/queue.routes';

const app = express();

// API не должен отдавать 304 Not Modified: axios считает такой ответ ошибкой.
app.set('etag', false);

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// CORS
app.use(cors({
  origin: env.FRONTEND_URL,
  credentials: true,
}));

// Logging
app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
// Данные API персональные и меняются — запрещаем кэширование и 304-ответы,
// иначе после обновления токена повторный запрос может прийти из кэша.
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/copies', copyRoutes); // copy CRUD (/api/copies/:id); nested list/create lives in book routes
app.use('/api/loans', loanRoutes);
app.use('/api/queue', queueRoutes);

// 404 handler
app.use(notFoundHandler);

// Error handler
app.use(errorHandler);

// Start server
async function start() {
  try {
    await connectDatabase();
    
    app.listen(env.PORT, () => {
      console.log(`🚀 Server running on port ${env.PORT} in ${env.NODE_ENV} mode`);
      console.log(`📚 API available at http://localhost:${env.PORT}/api`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

export { app };