# AGENTS.md - Правила работы с проектом "Библиотека с книгами"

## Структура проекта (Monorepo)

```
library-monorepo/
├── agents.md                 # Этот файл
├── package.json              # Root package.json для управления workspace
├── frontend/                 # React + TypeScript + Vite
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── index.html
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── components/       # UI компоненты (buttons, inputs, modals, etc.)
│   │   ├── pages/            # Страницы приложения
│   │   ├── hooks/            # Custom React hooks
│   │   ├── services/         # API клиенты, работа с бэкендом
│   │   ├── store/            # State management (Context/Zustand/Redux)
│   │   ├── types/            # TypeScript интерфейсы и типы
│   │   ├── utils/            # Утилиты, хелперы
│   │   ├── styles/           # Глобальные стили, tailwind imports
│   │   └── constants/        # Константы, enums
│   └── public/
└── backend/                  # Node.js + Express + TypeScript
    ├── package.json
    ├── tsconfig.json
    ├── src/
    │   ├── index.ts                  # Entry point
    │   ├── config/                   # Конфигурация (DB, JWT, Env)
    │   │   ├── database.ts           # MySQL подключение (Sequelize/Prisma/TypeORM)
    │   │   ├── jwt.ts                # JWT конфигурация
    │   │   └── env.ts                # Переменные окружения
    │   ├── modules/                  # Feature-based модули
    │   │   ├── auth/                 # Авторизация/Аутентификация
    │   │   │   ├── auth.controller.ts
    │   │   │   ├── auth.service.ts
    │   │   │   ├── auth.routes.ts
    │   │   │   ├── auth.middleware.ts
    │   │   │   ├── dto/              # Data Transfer Objects
    │   │   │   └── strategies/       # Passport strategies
    │   │   ├── users/                # Управление пользователями
    │   │   │   ├── user.controller.ts
    │   │   │   ├── user.service.ts
    │   │   │   ├── user.routes.ts
    │   │   │   ├── user.model.ts
    │   │   │   └── dto/
    │   │   ├── books/                # Книги
    │   │   │   ├── book.controller.ts
    │   │   │   ├── book.service.ts
    │   │   │   ├── book.routes.ts
    │   │   │   ├── book.model.ts
    │   │   │   └── dto/
    │   │   ├── copies/               # Экземпляры книг
    │   │   │   ├── copy.controller.ts
    │   │   │   ├── copy.service.ts
    │   │   │   ├── copy.routes.ts
    │   │   │   ├── copy.model.ts
    │   │   │   └── dto/
    │   │   ├── loans/                # Выдачи/Возвраты книг
    │   │   │   ├── loan.controller.ts
    │   │   │   ├── loan.service.ts
    │   │   │   ├── loan.routes.ts
    │   │   │   ├── loan.model.ts
    │   │   │   └── dto/
    │   │   └── queue/                # Очередь ожидания книг
    │   │       ├── queue.controller.ts
    │   │       ├── queue.service.ts
    │   │       ├── queue.routes.ts
    │   │       ├── queue.model.ts
    │   │       └── dto/
    │   ├── shared/                   # Общий код между модулями
    │   │   ├── middleware/           # Общие мидлвари (error handling, validation)
    │   │   ├── utils/                # Утилиты
    │   │   ├── exceptions/           # Кастомные исключения
    │   │   ├── decorators/           # Декораторы
    │   │   └── types/                # Общие типы
    │   └── database/                 # Миграции, сиды, схемы БД
    │       ├── migrations/
    │       ├── seeders/
    │       └── models/               # Базовые модели ORM
    └── dist/                         # Скомпилированный JS (gitignore)
```

---

## Базовые правила разработки

### 1. Разделение файлов по папкам (Feature-based архитектура)
- **Никогда не храните всё в одном файле** — разбивайте на логические модули
- Каждый модуль (`auth`, `users`, `books`, `copies`, `loans`, `queue`) содержит:
  - `*.controller.ts` — HTTP слой (роуты, запросы/ответы)
  - `*.service.ts` — Бизнес-логика (инкапсулирована, тестируемая)
  - `*.model.ts` — Работа с БД (ORM модели)
  - `*.routes.ts` — Маршрутизация
  - `dto/` — Data Transfer Objects (валидация, типизация)
  - `*.middleware.ts` — Специфичные мидлвари модуля

### 2. Именование по содержанию
| Сущность | Правило | Пример |
|----------|---------|--------|
| Файлы | kebab-case | `book.controller.ts`, `loan.service.ts` |
| Классы | PascalCase | `BookService`, `LoanController` |
| Функции/Методы | camelCase | `getBookById()`, `createLoan()` |
| Интерфейсы | PascalCase + `I` префикс | `IBook`, `IUser`, `ILoan` |
| Типы | PascalCase | `BookStatus`, `UserRole` |
| Переменные | camelCase | `bookId`, `userList` |
| Константы | UPPER_SNAKE_CASE | `MAX_LOAN_DAYS`, `JWT_SECRET` |
| Enum | PascalCase | `UserRole`, `BookStatus` |

### 3. ООП и Инкапсуляция
- **Приватные поля/методы** — используйте `#privateField` или `private` в классах
- **Сервисы** — содержат только бизнес-логику, не знают про HTTP
- **Контроллеры** — тонкие, только валидация входных данных и вызов сервисов
- **Модели** — работа с БД, не содержат бизнес-логики
- **Dependency Injection** — передавайте зависимости через конструктор

```typescript
// ✅ Правильно: инкапсуляция в сервисе
export class LoanService {
  private readonly loanRepository: LoanRepository;
  private readonly queueService: QueueService;
  
  constructor(loanRepository: LoanRepository, queueService: QueueService) {
    this.loanRepository = loanRepository;
    this.queueService = queueService;
  }
  
  public async createLoan(data: CreateLoanDto): Promise<Loan> {
    // Бизнес-логика здесь
  }
}
```

### 4. Стили: Tailwind CSS + Bootstrap
- **Tailwind** — основной utility-first фреймворт
- **Bootstrap** — только для сложных компонентов (модалки, табы, карусели) через `bootstrap-icons` и отдельные компоненты
- Глобальные стили только в `src/styles/globals.css`
- Компонентные стили — через `className` с Tailwind классами

### 5. Git & Коммиты
- **НЕ коммитить без явного разрешения или просьбы пользователя**
- Коммиты только после код-ревью или по команде
- Используйте Conventional Commits: `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`

### 6. Типы пользователей (Роли)

```typescript
enum UserRole {
  READER = 'READER',       // Читатель — берет книги, встает в очередь
  LIBRARIAN = 'LIBRARIAN', // Библиотекарь — выдает/принимает книги, управляет экземплярами
  MODERATOR = 'MODERATOR'  // Модератор — управляет пользователями, книгами, очередями
}
```

### 7. Бизнес-логика: Очередь и экземпляры книг

**Экземпляр книги (BookCopy)**
- Статусы: `AVAILABLE` (доступен), `BORROWED` (на руках), `RESERVED` (зарезервирован), `LOST` (утерян)

**Логика выдачи:**
1. Читатель запрашивает книгу
2. Если есть свободный экземпляр (`AVAILABLE`) — выдается сразу
3. Если свободных нет — читатель встает в **очередь** (FIFO)
4. При возврате книги:
   - Если очередь пуста — экземпляр становится `AVAILABLE`
   - Если очередь не пуста — экземпляр **резервируется** для первого в очереди (`RESERVED`)
   - Уведомление первому в очереди (email/push)
   - Срок забора резерва: 48 часов (настраиваемо)

### 8. База данных: MySQL

**Основные таблицы:**
- `users` — пользователи (id, email, password_hash, role, first_name, last_name, created_at)
- `books` — книги (id, title, author, isbn, description, cover_url, created_at)
- `book_copies` — экземпляры (id, book_id, status, inventory_number, created_at)
- `loans` — выдачи (id, user_id, copy_id, loaned_at, due_date, returned_at, status)
- `queue` — очередь (id, user_id, book_id, position, status, created_at, notified_at)
- `refresh_tokens` — JWT refresh токены (id, user_id, token, expires_at, revoked_at)

### 9. JWT Авторизация
- Access Token: 15 минут
- Refresh Token: 7 дней (хранится в БД, httpOnly cookie)
- Payload: `{ userId, email, role, iat, exp }`
- Middleware проверки роли для защиты эндпоинтов

### 10. API Эндпоинты (планируемые)

| Модуль | Метод | Путь | Роль | Описание |
|--------|-------|------|------|----------|
| Auth | POST | `/api/auth/register` | — | Регистрация |
| Auth | POST | `/api/auth/login` | — | Вход |
| Auth | POST | `/api/auth/refresh` | — | Обновление access token |
| Auth | POST | `/api/auth/logout` | All | Выход |
| Users | GET | `/api/users/me` | All | Профиль текущего |
| Users | GET | `/api/users` | MODERATOR | Список пользователей |
| Users | PATCH | `/api/users/:id/role` | MODERATOR | Смена роли |
| Books | GET | `/api/books` | All | Каталог книг |
| Books | GET | `/api/books/:id` | All | Детали книги |
| Books | POST | `/api/books` | LIBRARIAN, MODERATOR | Создать книгу |
| Books | PATCH | `/api/books/:id` | LIBRARIAN, MODERATOR | Обновить книгу |
| Copies | GET | `/api/books/:bookId/copies` | All | Экземпляры книги |
| Copies | POST | `/api/books/:bookId/copies` | LIBRARIAN | Добавить экземпляр |
| Loans | POST | `/api/loans` | READER | Запросить книгу |
| Loans | PATCH | `/api/loans/:id/return` | LIBRARIAN, READER (свои) | Вернуть книгу |
| Loans | GET | `/api/loans/my` | READER | Мои выдачи |
| Queue | POST | `/api/queue` | READER | Встать в очередь |
| Queue | DELETE | `/api/queue/:id` | READER | Покинуть очередь |
| Queue | GET | `/api/queue/my` | READER | Моя позиция в очередях |

---

## Команды разработки

```bash
# Установка зависимостей (в корне)
npm install

# Фронтенд
cd frontend && npm run dev        # Dev сервер
cd frontend && npm run build      # Продакшн сборка
cd frontend && npm run lint       # ESLint

# Бэкенд
cd backend && npm run dev         # Dev с hot reload (tsx watch)
cd backend && npm run build       # Компиляция в dist/
cd backend && npm run start       # Продакшн (node dist/index.js)
cd backend && npm run db:migrate  # Миграции БД
cd backend && npm run db:seed     # Сиды тестовых данных
```

---

## Environment Variables

### Backend (`.env`)
```env
NODE_ENV=development
PORT=3000
DB_HOST=localhost
DB_PORT=3306
DB_NAME=library
DB_USER=root
DB_PASSWORD=secret
JWT_ACCESS_SECRET=your-access-secret
JWT_REFRESH_SECRET=your-refresh-secret
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d
FRONTEND_URL=http://localhost:5173
```

### Frontend (`.env`)
```env
VITE_API_URL=http://localhost:3000/api
```

---

## Зависимости (планируемые)

### Backend
- `express`, `typescript`, `ts-node-dev`
- `mysql2`, `sequelize` / `prisma` / `typeorm`
- `jsonwebtoken`, `bcryptjs`, `cookie-parser`
- `zod` / `class-validator` — валидация
- `helmet`, `cors`, `morgan`
- `jest`, `supertest` — тесты

### Frontend
- `react`, `react-dom`, `react-router-dom`
- `typescript`, `vite`
- `tailwindcss`, `postcss`, `autoprefixer`
- `bootstrap`, `bootstrap-icons` (только компоненты)
- `axios` / `ky` — HTTP клиент
- `zustand` / `@tanstack/react-query` — стейт/кэш
- `zod` — валидация форм
- `react-hook-form` — формы
- `eslint`, `prettier`