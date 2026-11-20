/** Environment configuration with validation */
export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3000', 10),
  
  // Database
  DB_HOST: process.env.DB_HOST || 'localhost',
  DB_PORT: parseInt(process.env.DB_PORT || '3306', 10),
  DB_NAME: process.env.DB_NAME || 'library',
  DB_USER: process.env.DB_USER || 'root',
  DB_PASSWORD: process.env.DB_PASSWORD || '',
  
  // JWT
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || 'your-access-secret-change-in-production',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-change-in-production',
  JWT_ACCESS_EXPIRES: process.env.JWT_ACCESS_EXPIRES || '15m',
  JWT_REFRESH_EXPIRES: process.env.JWT_REFRESH_EXPIRES || '7d',
  
  // Frontend
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
  
  // Reservation
  RESERVATION_HOURS: parseInt(process.env.RESERVATION_HOURS || '48', 10),
  MAX_LOAN_DAYS: parseInt(process.env.MAX_LOAN_DAYS || '14', 10),
} as const;

/** Validate required environment variables */
export function validateEnv(): void {
  const required = [
    'JWT_ACCESS_SECRET',
    'JWT_REFRESH_SECRET',
    'DB_PASSWORD',
  ];
  
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0 && env.NODE_ENV === 'production') {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  
  if (env.NODE_ENV === 'production') {
    if (env.JWT_ACCESS_SECRET === 'your-access-secret-change-in-production') {
      throw new Error('JWT_ACCESS_SECRET must be changed in production');
    }
    if (env.JWT_REFRESH_SECRET === 'your-refresh-secret-change-in-production') {
      throw new Error('JWT_REFRESH_SECRET must be changed in production');
    }
  }
}