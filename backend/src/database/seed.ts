import 'dotenv/config';
import { sequelize } from '@/config/database';
import { User, UserRole } from '@/modules/users/user.model';
import { Book } from '@/modules/books/book.model';
import { BookCopy, BookCopyStatus } from '@/modules/copies/copy.model';
import { Loan, LoanStatus } from '@/modules/loans/loan.model';
import { QueueEntry, QueueStatus } from '@/modules/queue/queue.model';
import { RefreshToken } from '@/modules/auth/refreshToken.model';
import bcrypt from 'bcryptjs';

/** Run database seeds */
export async function seedDatabase(): Promise<void> {
  try {
    // Create admin user
    const adminPassword = await bcrypt.hash('admin123', 12);
    const admin = await User.create({
      email: 'admin@library.com',
      passwordHash: adminPassword,
      firstName: 'Администратор',
      lastName: 'Системы',
      role: UserRole.MODERATOR,
    });

    // Create librarian user
    const librarianPassword = await bcrypt.hash('librarian123', 12);
    const librarian = await User.create({
      email: 'librarian@library.com',
      passwordHash: librarianPassword,
      firstName: 'Иван',
      lastName: 'Библиотекарь',
      role: UserRole.LIBRARIAN,
    });

    // Create reader user
    const readerPassword = await bcrypt.hash('reader123', 12);
    const reader = await User.create({
      email: 'reader@library.com',
      passwordHash: readerPassword,
      firstName: 'Петр',
      lastName: 'Читатель',
      role: UserRole.READER,
    });

    console.log('✅ Users created');

    // Create books
    const book1 = await Book.create({
      title: 'Война и мир',
      author: 'Лев Толстой',
      isbn: '978-5-17-090839-4',
      description: 'Эпопея о русской жизни в эпоху наполеоновских войн.',
      coverUrl: 'https://via.placeholder.com/150x200?c=war-and-peace',
      copiesCount: 3,
      availableCopiesCount: 3,
    });

    const book2 = await Book.create({
      title: 'Преступление и наказание',
      author: 'Федор Достоевский',
      isbn: '978-5-17-090840-0',
      description: 'Роман о человеке, который пошел на преступление ради идеи.',
      coverUrl: 'https://via.placeholder.com/150x200?c=crime-and-punishment',
      copiesCount: 2,
      availableCopiesCount: 2,
    });

    const book3 = await Book.create({
      title: 'Мастер и Маргарита',
      author: 'Михаил Булгаков',
      isbn: '978-5-17-090841-7',
      description: 'Мистический роман о приходе дьявола в Москву.',
      coverUrl: 'https://via.placeholder.com/150x200?c=master-and-margarita',
      copiesCount: 1,
      availableCopiesCount: 1,
    });

    console.log('✅ Books created');

    // Create copies for book 1
    await BookCopy.create({
      bookId: book1.id,
      inventoryNumber: 'INV-001',
      status: BookCopyStatus.AVAILABLE,
    });
    await BookCopy.create({
      bookId: book1.id,
      inventoryNumber: 'INV-002',
      status: BookCopyStatus.AVAILABLE,
    });
    await BookCopy.create({
      bookId: book1.id,
      inventoryNumber: 'INV-003',
      status: BookCopyStatus.AVAILABLE,
    });

    // Create copies for book 2
    await BookCopy.create({
      bookId: book2.id,
      inventoryNumber: 'INV-004',
      status: BookCopyStatus.AVAILABLE,
    });
    await BookCopy.create({
      bookId: book2.id,
      inventoryNumber: 'INV-005',
      status: BookCopyStatus.AVAILABLE,
    });

    // Create copies for book 3
    await BookCopy.create({
      bookId: book3.id,
      inventoryNumber: 'INV-006',
      status: BookCopyStatus.AVAILABLE,
    });

    console.log('✅ Copies created');

    console.log('✅ Database seeded successfully');
    console.log(`\nTest accounts:`);
    console.log(`  Admin: admin@library.com / admin123`);
    console.log(`  Librarian: librarian@library.com / librarian123`);
    console.log(`  Reader: reader@library.com / reader123`);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

/** Clear all data */
export async function clearDatabase(): Promise<void> {
  await QueueEntry.destroy({ where: {}, truncate: true, cascade: true });
  await Loan.destroy({ where: {}, truncate: true, cascade: true });
  await BookCopy.destroy({ where: {}, truncate: true, cascade: true });
  await Book.destroy({ where: {}, truncate: true, cascade: true });
  await RefreshToken.destroy({ where: {}, truncate: true, cascade: true });
  await User.destroy({ where: {}, truncate: true, cascade: true });
  console.log('✅ Database cleared');
}

seedDatabase();
