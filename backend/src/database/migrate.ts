import 'dotenv/config';
import { sequelize } from '@/config/database';

// Import all models so they register with Sequelize (must be after database import)
import '@/modules/users/user.model';
import '@/modules/books/book.model';
import '@/modules/copies/copy.model';
import '@/modules/loans/loan.model';
import '@/modules/queue/queue.model';
import '@/modules/auth/refreshToken.model';

/** Run database migrations */
export async function migrateDatabase(): Promise<void> {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established');

    await sequelize.sync({ alter: true });
    console.log('✅ Database synchronized (migrations applied)');

    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrateDatabase();