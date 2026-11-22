# Library Monorepo - Implementation History

*Chat extraction and project documentation*

## Project Overview
Monorepo structure for "Library with Books" system containing:
- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Backend**: Node.js + Express + TypeScript + Sequelize + MySQL
- **Database**: MySQL with 7 tables (users, books, book_copies, loans, queue, refresh_tokens)

## Key Components Created

### Frontend (`library-monorepo/frontend/`)
- `src/main.tsx` - React root with React Query
- `src/App.tsx` - Routing with role-based guards
- `src/components/layout/Layout.tsx` - Sidebar layout with role-based navigation
- `src/components/auth/ProtectedRoute.tsx` - Authentication middleware
- `src/components/auth/RoleGuard.tsx` - Role-based access control
- `src/pages/auth/LoginPage.tsx` - Login form with validation
- `src/pages/auth/RegisterPage.tsx` - Registration form
- `src/pages/books/BooksPage.tsx` - Book catalog with search
- `src/pages/books/BookDetailPage.tsx` - Book detail view
- `src/pages/loans/MyLoansPage.tsx` - User's active loans
- `src/pages/queue/MyQueuePage.tsx` - User's queue positions
- `src/pages/profile/ProfilePage.tsx` - User profile management
- `src/pages/librarian/LibrarianDashboardPage.tsx` - Librarian panel
- `src/pages/admin/AdminDashboardPage.tsx` - Moderator panel
- `src/services/api.ts` - Axios API client with token refresh
- `src/store/authStore.ts` - Zustand auth store with persistence
- `src/constants/` - Enums and constants (roles, statuses, routes)
- `src/utils/helpers.ts` - Utility functions (debounce, formatDate, etc.)

### Backend (`library-monorepo/backend/`)
- `src/index.ts` - Express app with middleware and routes
- `src/config/env.ts` - Environment configuration
- `src/config/database.ts` - Sequelize MySQL connection
- `src/config/jwt.ts` - JWT token generation and verification
- `src/shared/middleware/errorHandler.ts` - Error handling middleware
- `src/shared/middleware/notFoundHandler.ts` - 404 handler
- `src/shared/exceptions/AppError.ts` - Custom error classes
- `src/shared/types.ts` - Shared type definitions

### Modules
- `auth/` - Registration, login, refresh tokens, role middleware
- `users/` - User management (CRUD, role changes)
- `books/` - Book catalog, CRUD operations
- `copies/` - Book copies/exemplars with status tracking
- `loans/` - Loan transactions with return logic and overdue handling
- `queue/` - Waiting queue system with 48-hour reservation

### Database (MySQL via Sequelize)
- `users` table - users with roles (READER, LIBRARIAN, MODERATOR)
- `books` table - books with title, author, ISBN, description
- `book_copies` table - book instances with status (AVAILABLE, BORROWED, RESERVED, LOST)
- `loans` table - loan records with due dates and return status
- `queue` table - waiting queue with position tracking
- `refresh_tokens` table - JWT refresh token storage

### Key Business Logic
1. **Book lending**: If available copies exist → issue immediately; otherwise → user joins queue
2. **Return logic**: On return → check queue → if waiters exist → reserve copy for first person (48h); else → make available
3. **User roles**:
   - **Reader**: Borrow books, join queue, view own loans/queue
   - **Librarian**: Issue/return books, manage all loans and queues
   - **Moderator**: Manage users, books, all data

### API Endpoints (planned)
- `POST /api/auth/*` - Auth operations
- `GET /api/books` - Book catalog
- `POST /api/loans` - Borrow book
- `PATCH /api/loans/:id/return` - Return book
- `POST /api/queue` - Join waiting queue
- `GET /api/queue/my` - User's queue positions

### Key Rules (from AGENTS.md)
- Files split into folders by feature (not one big file)
- Named by content (controllers, services, models, routes, DTOs)
- OOP principles with encapsulation
- Tailwind CSS + Bootstrap for styles
- No commits without permission
- Users: Reader, Librarian, Moderator
- Queue logic: FIFO, 48h reservation on return

### Test Accounts
| Email | Password | Role |
|-------|----------|------|
| admin@library.com | admin123 | Модератор |
| librarian@library.com | librarian123 | Библиотекарь |
| reader@library.com | reader123 | Читатель |

### Project Structure (Monorepo)
```
library-monorepo/
├── agents.md              # Project rules
├── README.md              # Project documentation
├── package.json           # Root workspace
├── frontend/              # React + TypeScript + Vite + Tailwind
│   └── src/...            # Frontend source
└── backend/               # Node.js + Express + TypeScript + Sequelize
    └── src/...            # Backend source
```

### Dependencies
**Frontend**: react, react-dom, react-router-dom, axios, zustand, @tanstack/react-query, react-hook-form, zod, tailwindcss, bootstrap, bootstrap-icons

**Backend**: express, sequelize, mysql2, jsonwebtoken, bcryptjs, cookie-parser, zod, express-validator, helmet, cors, morgan

### Commands
```
npm run dev              # Start both frontend (5173) and backend (3000)
npm run db:migrate       # Run database migrations
npm run db:seed          # Populate test data
npm run lint             # Code linting
```

## Development Notes
- Created through extensive agent collaboration
- Focus on modular architecture and separation of concerns
- JWT access (15min) + refresh (7days) token flow
- Reservation system: 48 hours to claim reserved book
- Role-based access control throughout
- Type-safe with full TypeScript coverage