import { Sequelize } from 'sequelize';
import { env } from '@/config/env';

// Create Sequelize instance
export const sequelize = new Sequelize(
  env.DB_NAME,
  env.DB_USER,
  env.DB_PASSWORD,
  {
    host: env.DB_HOST,
    port: env.DB_PORT,
    dialect: 'mysql',
    logging: env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
    define: {
      // Keep camelCase attribute names (createdAt/updatedAt) mapped to
      // snake_case columns (created_at/updated_at) via `underscored`.
      // Do not override createdAt/updatedAt here: that renames the
      // attributes themselves and breaks the API contract expected by
      // the frontend (createdAt/updatedAt).
      underscored: true,
      timestamps: true,
    },
    timezone: '+00:00',
  }
);

/** Connect to database */
export async function connectDatabase(): Promise<void> {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established');
    
    if (env.NODE_ENV === 'development') {
      // Sync models in development (alter: true updates tables)
      await sequelize.sync({ alter: true });
      console.log('✅ Database synchronized');
    }
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    throw error;
  }
}

/** Close database connection */
export async function closeDatabase(): Promise<void> {
  await sequelize.close();
  console.log('✅ Database connection closed');
}

// Export for models
export { DataTypes, Model } from 'sequelize';