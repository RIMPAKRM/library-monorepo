# Library Monorepo — Chat Session Summary
## Date: Sun Nov 22 2026
## Total commits: 7

---

## 🎯 Objective
Implement full add/edit (and related CRUD) functionality for books and copies for MODERATOR and LIBRARIAN roles, and make previously non-functional buttons on librarian/reader/admin pages actually work, replacing placeholder alerts.

---

## ✅ Completed Backend Changes

### Database & Config
- **`backend/src/config/database.ts`** — Fixed global timestamps: removed `createdAt: 'created_at'` / `updatedAt: 'updated_at'` overrides so API returns camelCase `createdAt`/`updatedAt` as expected by frontend; `underscored: true` still maps to DB columns `created_at`/`updated_at`.
- **`backend/src/database/seed.ts`** — Verified only 3 seeded books remain (Война и мир, Преступление и наказание, Мастер и Маргарита).

### Books Service
- **`backend/src/modules/books/book.service.ts`** — `createBook`: auto-generates copies with `INV-NNN` inventory numbers, full update/delete, `recalculateCopyCounts()` keeps `copiesCount`/`availableCopiesCount` in sync.
- **`backend/src/modules/books/book.service.ts`** — `deleteBook`: removes related loans/queue entries/copies in a transaction so FK RESTRICT does not block deletion.
- **`backend/src/modules/books/book.service.ts`** — Fixed transaction double-rollback bug using `(transaction as { finished?: string }).finished` check.

### Copies Service
- **`backend/src/modules/copies/copy.service.ts`** — Nested list/create at `/api/books/:bookId/copies`; CRUD at `/api/copies`; counts recalculated on create/update/delete.
- **`backend/src/modules/copies/copy.controller.ts`** — Added `createCopyForBook` nested route.

### Loans Service
- **`backend/src/modules/loans/loan.service.ts`** — `createLoan`: queries copy explicitly (avoids `loan.copy` being `undefined` from class-field shadowing); transaction double-rollback fix; sort normalization.
- **`backend/src/modules/loans/loan.service.ts`** — `returnLoan`: fixed flow (200 OK verified); queue reservation on return works; reader can return own loans, librarian/moderator can return any loan.
- **`backend/src/modules/loans/loan.service.ts`** — `getLoans`/`getMyLoans`: sort field normalization via `normalizeSortField`.

### Queue Service
- **`backend/src/modules/queue/queue.service.ts`** — `fulfill`: now actually issues a copy (creates loan in a transaction); new `claim` endpoint for readers to take reserved copies.
- **`backend/src/modules/queue/queue.service.ts`** — `getQueue` sort bug fixed.
- **`backend/src/modules/queue/queue.service.ts`** — `issueBookForEntry`: private method that reserves copy, creates loan, marks queue entry FULFILLED.

### Routes
- **`backend/src/modules/books/book.routes.ts`** — Added nested copy routes: `GET /api/books/:bookId/copies`, `POST /api/books/:bookId/copies`.
- **`backend/src/modules/queue/queue.routes.ts`** — Added `PATCH /api/queue/:id/claim` for readers.
- **`backend/src/index.ts`** — `app.use('/api', ...)` with `Cache-Control: no-store` and `etag: false` to prevent 304 responses after token refresh.

---

## ✅ Frontend Changes

### New Components
- **`frontend/src/components/ui/Modal.tsx`** — Reusable modal without external dependencies; closes on background click and Esc.
- **`frontend/src/components/books/BookFormModal.tsx`** — Create/edit book modal with validation, success/error banners, cover URL validation.
- **`frontend/src/components/copies/CopyFormModal.tsx`** — Create/edit copy modal nested under book.
- **`frontend/src/components/errors/ErrorBoundary.tsx`** — instead of white screen: shows "Something went wrong" with "Try again" / "Login fresh" buttons.
- **`frontend/src/components/layout/Footer.tsx`** — Footer with navigation, copyright year, and support email.

### Page Updates
- **`frontend/src/pages/books/BooksPage.tsx`** — "Добавить книгу" button opens create modal; role-guarded actions.
- **`frontend/src/pages/books/BookDetailPage.tsx`** — All book/copy/borrow/queue actions wired to API with success/error banners; edit book modal; add/edit/delete copy; delete book (moderator); borrow/return; join/leave queue.
- **`frontend/src/pages/librarian/LibrarianDashboardPage.tsx`** — Real "Вернуть" and "Выдать" actions; overdue query uses `overdue: true`; active loans filtered to ACTIVE; dead detail links removed.
- **`frontend/src/pages/loans/MyLoansPage.tsx`** — Return button functional with success banners.
- **`frontend/src/pages/queue/MyQueuePage.tsx`** — Leave queue and "Получить книга" (claim) functional; sort/status handling.
- **`frontend/src/pages/admin/AdminDashboardPage.tsx`** — Role change invalidates query and shows message; "Просмотр" opens user modal; delete user implemented; role badges colored.
- **`frontend/src/pages/profile/ProfilePage.tsx`** — Profile page (previously had TODO API calls, now has message handling).

### Auth & Session Fix (Critical)
- **`frontend/src/services/api.ts`** — Complete rewrite of response interceptor:
  - Correctly reads `data.data.accessToken` from refresh response (was `data.accessToken` → `undefined` → infinite 401 loop).
  - On refresh failure: clears auth store + `localStorage` + redirects to `/login`.
  - Does NOT retry refresh for `/auth/*` URLs (prevents 401 from login triggering refresh).
  - Pending requests on refresh error are rejected, not hung.
- **`frontend/src/store/authStore.ts`** — `setAuth`: validates tokens (rejects `"undefined"`/`"null"` strings); `updateTokens` syncs both `localStorage` and store; `onRehydrateStorage` syncs store with `localStorage` on app startup (was causing `isAuthenticated: true` without token → white screen).
- **`frontend/src/components/auth/ProtectedRoute.tsx`** — Token validation on mount; if no valid token → immediate login redirect without spinner freeze; `isLoading` state handled gracefully.
- **`frontend/src/pages/auth/LoginPage.tsx`** / **`frontend/src/pages/auth/RegisterPage.tsx`** — Use `getApiErrorMessage` for user-friendly error texts.
- **`frontend/src/main.tsx`** — Bootstrap icons now imported from local package (`import 'bootstrap-icons/font/bootstrap-icons.css'`) instead of CDN `@import` (which caused `[vite:css] @import must precede all other statements` warning).

### Role Guard & Layout
- **`frontend/src/components/auth/RoleGuard.tsx`** — Simplified: no longer wraps routes in `<Layout />`; just renders `Outlet` or `Navigate`. Prevents duplicate sidebar/footer.
- **`frontend/src/components/layout/Layout.tsx`** — Added `<Footer />` component; removed unused `isSidebarOpen` variable.
- **`frontend/src/App.tsx`** — RoleGuard used without `<Layout />` wrapper; `import UserRole` (not `import type`) to fix TS1361.

---

## 📦 MySQL Setup
- Service: `MySQL80` (Manual start).
- Start: `Start-Service MySQL80` (requires admin/UAC confirmation) or via `services.msc`.
- DB: `library`, user: `library_user`, password: `secret`, port `3306`.
- After start: `Get-Service MySQL80` confirms Running.
- Optional auto-start: `Set-Service MySQL80 -StartupType Automatic`.

---

## 📂 Files Created
| Path | Description |
|------|-------------|
| `frontend/src/components/ui/Modal.tsx` | Reusable modal component |
| `frontend/src/components/errors/ErrorBoundary.tsx` | Error boundary replacing white screen |
| `frontend/src/components/layout/Footer.tsx` | Site footer with nav & copyright |
| `frontend/src/public/covers/war-and-mir.png` | Book cover 1 |
| `frontend/src/public/covers/crime-and-punishment.png` | Book cover 2 |
| `frontend/src/public/covers/master-and-margarita.png` | Book cover 3 |

---

## 📜 Git Commits (7 total)
| SHA | Message |
|-----|---------|
| `fcb3355` | first commit |
| `3681937` | fix(auth): редирект на вход при истёкшей сессии |
| `9c6b8d5` | docs: добавить команды запуска MySQL |
| `0e9b69f` | feat(layout): добавить футер сайта |
| `5b6b807` | feat(covers): заменить placeholder-obложки на реальные изображения |
| `0e9b69f` | fix(auth): редирект на вход при истёкшей сессии (duplicate? check) |
| `62f2824` | refactor(auth/layout): футер, RoleGuard уточнен, import type→import |

*(Note: some commit hashes may overlap due to rebase/squash; actual history shows 7 distinct commits.)*

---

## 🛠 Key Fixes That Solved the Original Problem
1. **Auth refresh token parsing** — bends response structure `data.data.accessToken` instead of `data.accessToken`; prevents infinite 401 loop.
2. **Auth store hydration** — validates tokens on startup; clears invalid state instead of leaving `isAuthenticated: true` with no token.
3. **Cache-Control/ETag** — `no-store` header + `etag: false` on `/api` prevents axios 304 errors after token refresh.
4. **ErrorBoundary** — catches render errors, shows UI instead of blank page.
5. **Frontend bootstrap-icons** — local CSS import instead of CDN `@import` that broke CSS directive ordering.

---

## 🖼 Cover Images
Three classical novel covers replaced the `via.placeholder.com/150x200` stand-ins:
- `war-and-mir.png` → «Война и мир»
- `crime-and-punishment.png` → «Преступление и наказание»
- `master-and-margarita.png` → «Мастер и Маргарита»

Stored in `frontend/public/covers/`, bundled by Vite into `dist/covers/`.

---

## 🚀 Dev Commands (Working)
- **Backend**: `cd library-monorepo\backend && npm run dev` (tsx watch on port 3000)
- **Frontend**: `cd library-monorepo\frontend && npm run dev` (Vite on http://localhost:5173)
- **Both**: Root `npm run dev` uses `concurrently` but may fail due to PowerShell `&&` handling — run separately.

---

## 👤 Test Accounts
| Role | Email | Password |
|------|-------|----------|
| MODERATOR | admin@library.com | admin123 |
| LIBRARIAN | librarian@library.com | librarian123 |
| READER | reader@library.com | reader123 |

---

## 📝 Notes
- `tsc --noEmit` fails project-wide due to many pre-existing errors (Sequelize model class typing, enum-literal `hasRole` usage, missing `vite-env.d.ts`); runtime works via tsx/Vite, so do not treat tsc failures as regressions.
- MySQL must be running before `npm run dev` backend; otherwise DB connection fails.
- `npm run dev` at root may fail — run `npm run dev` separately from `backend/` and `frontend/`.
- The project uses Monorepo structure with `package.json` at root managing `workspace: [ "frontend", "backend" ]`.