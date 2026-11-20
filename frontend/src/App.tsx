import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { LoginPage } from '@/pages/auth/LoginPage';
import { RegisterPage } from '@/pages/auth/RegisterPage';
import { BooksPage } from '@/pages/books/BooksPage';
import { BookDetailPage } from '@/pages/books/BookDetailPage';
import { MyLoansPage } from '@/pages/loans/MyLoansPage';
import { MyQueuePage } from '@/pages/queue/MyQueuePage';
import { ProfilePage } from '@/pages/profile/ProfilePage';
import { AdminDashboardPage } from '@/pages/admin/AdminDashboardPage';
import { LibrarianDashboardPage } from '@/pages/librarian/LibrarianDashboardPage';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { RoleGuard } from '@/components/auth/RoleGuard';

function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      
      {/* Protected routes with layout */}
      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="/" element={<Navigate to="/books" replace />} />
        <Route path="/books" element={<BooksPage />} />
        <Route path="/books/:id" element={<BookDetailPage />} />
        <Route path="/my-loans" element={<MyLoansPage />} />
        <Route path="/my-queue" element={<MyQueuePage />} />
        <Route path="/profile" element={<ProfilePage />} />
        
        {/* Role-specific routes */}
        <Route 
          element={<RoleGuard allowedRoles={['LIBRARIAN', 'MODERATOR']}><Layout /></RoleGuard>}
        >
          <Route path="/librarian" element={<LibrarianDashboardPage />} />
        </Route>
        
        <Route 
          element={<RoleGuard allowedRoles={['MODERATOR']}><Layout /></RoleGuard>}
        >
          <Route path="/admin" element={<AdminDashboardPage />} />
        </Route>
      </Route>
      
      {/* 404 */}
      <Route path="*" element={<Navigate to="/books" replace />} />
    </Routes>
  );
}

export default App;