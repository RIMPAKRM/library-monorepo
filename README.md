# 📚 Library Monorepo

Монорепозиторий проекта "Библиотека с книгами" с фронтендом на React/TypeScript, бэкендом на Node.js/TypeScript и базой данных MySQL.

## 🏗️ Архитектура

```
library-monorepo/
├── agents.md              # Правила работы для агентов
├── package.json           # Root workspace
├── frontend/              # React + TypeScript + Vite + Tailwind
└── backend/               # Node.js + Express + TypeScript + Sequelize + MySQL
```

## 👥 Роли пользователей

| Роль | Возможности |
|------|-------------|
| **Читатель** | Брать книги, вставать в очередь, просматривать свои выдачи |
| **Библиотекарь** | Выдавать/принимать книги, управлять экземплярами, просматривать очередь |
| **Модератор** | Управлять пользователями, книгами, ролями, всеми данными |

## 🔄 Бизнес-логика

1. Читатель запрашивает книгу
2. Если есть свободный экземпляр — выдача оформляется сразу
3. Если свободных нет — читатель встаёт в очередь (FIFO)
4. При возврате книги:
   - Если очередь пуста — экземпляр становится доступным
   - Если очередь не пуста — экземпляр резервируется для первого в очереди
   - Срок забора резерва: 48 часов

## 🚀 Быстрый старт

### Предварительные требования
- Node.js >= 20
- MySQL 8.0+

### Установка

```bash
# Клонировать и перейти в папку
cd library-monorepo

# Установить зависимости
npm install

# Настроить переменные окружения
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
# Отредактировать .env файлы (DB_PASSWORD, JWT_SECRET и т.д.)

# Инициализировать БД
npm run db:migrate

# Заполнить тестовыми данными
npm run db:seed

# Запустить в режиме разработки
npm run dev
```

### Фронтенд (порт 5173)
```
http://localhost:5173
```

### Бэкенд API (порт 3000)
```
http://localhost:3000/api
```

### Тестовые аккаунты (после seed)

| Email | Пароль | Роль |
|-------|--------|------|
| admin@library.com | admin123 | Модератор |
| librarian@library.com | librarian123 | Библиотекарь |
| reader@library.com | reader123 | Читатель |

## 📜 Скрипты

### Корень
| Команда | Описание |
|---------|----------|
| `npm run dev` | Запуск frontend + backend одновременно |
| `npm run build` | Сборка обоих проектов |
| `npm run lint` | Проверка кода |

### Frontend
| Команда | Описание |
|---------|----------|
| `npm run dev` | Dev сервер (Vite) |
| `npm run build` | Продакшн сборка |
| `npm run lint` | ESLint |

### Backend
| Команда | Описание |
|---------|----------|
| `npm run dev` | Dev с hot reload (tsx) |
| `npm run build` | Компиляция TypeScript |
| `npm run start` | Запуск продакшн сборки |
| `npm run db:migrate` | Миграции БД |
| `npm run db:seed` | Тестовые данные |

## 📡 API Эндпоинты

### Аутентификация
- `POST /api/auth/register` — регистрация
- `POST /api/auth/login` — вход
- `POST /api/auth/refresh` — обновление access токена
- `POST /api/auth/logout` — выход
- `GET /api/auth/me` — профиль текущего пользователя

### Книги
- `GET /api/books` — список книг
- `GET /api/books/:id` — детали книги
- `POST /api/books` — создать (LIBRARIAN/MODERATOR)
- `PATCH /api/books/:id` — обновить (LIBRARIAN/MODERATOR)
- `DELETE /api/books/:id` — удалить (MODERATOR)

### Экземпляры книг
- `GET /api/books/:bookId/copies` — экземпляры книги
- `POST /api/books/:bookId/copies` — добавить (LIBRARIAN/MODERATOR)
- `PATCH /api/copies/:id` — обновить (LIBRARIAN/MODERATOR)
- `DELETE /api/copies/:id` — удалить (MODERATOR)

### Выдачи
- `POST /api/loans` — взять книгу (READER)
- `PATCH /api/loans/:id/return` — вернуть книгу
- `GET /api/loans/my` — мои выдачи (READER)
- `GET /api/loans` — все выдачи (LIBRARIAN/MODERATOR)
- `GET /api/loans/overdue` — просроченные (LIBRARIAN/MODERATOR)

### Очередь
- `POST /api/queue` — встать в очередь (READER)
- `DELETE /api/queue/:id` — покинуть очередь (READER)
- `GET /api/queue/my` — мои позиции в очередях (READER)
- `GET /api/queue` — все очереди (LIBRARIAN/MODERATOR)
- `PATCH /api/queue/:id/fulfill` — выполнить очередь (LIBRARIAN/MODERATOR)

### Пользователи
- `GET /api/users` — список (MODERATOR)
- `GET /api/users/:id` — профиль пользователя
- `PATCH /api/users/:id/role` — смена роли (MODERATOR)
- `DELETE /api/users/:id` — удалить (MODERATOR)

## 🛠️ Технологии

### Frontend
- React 18 + TypeScript
- Vite
- Tailwind CSS + Bootstrap Icons
- React Query (серверное состояние)
- Zustand (клиентское состояние)
- React Hook Form + Zod (формы)
- React Router (маршрутизация)
- Axios (HTTP клиент)

### Backend
- Node.js + Express + TypeScript
- Sequelize ORM + MySQL2
- JWT (доступ + refresh токены)
- bcryptjs (хеширование паролей)
- Zod + express-validator (валидация)
- Helmet, CORS, Morgan (безопасность/логирование)

## 📄 Правила разработки

См. `agents.md` — базовые правила работы с проектом для агентов:
- Разбиение файлов по папкам
- Именование по содержанию
- ООП и инкапсуляция
- Стили: Tailwind + Bootstrap
- Коммиты только по разрешению

## 📝 Лицензия

MIT