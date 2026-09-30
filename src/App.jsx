import { Routes, Route, Outlet, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import FloatingAdminButton from './components/FloatingAdminButton';
import LandingPage from './pages/LandingPage';
import MenuPage from './pages/MenuPage';
import AdminLoginPage from './pages/AdminLoginPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import CashierPOSPage from './pages/CashierPOSPage';
import NotFoundPage from './pages/NotFoundPage';
import ProtectedRoute from './components/ProtectedRoute';
import OrderingPage from './pages/OrderingPage';
import TrackOrderPage from './pages/TrackOrderPage';
import RiderPage from './pages/RiderPage';

function PublicLayout() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', position: 'relative' }}>
      <Navbar />
      <main style={{ flex: 1 }}>
        <Outlet />
      </main>
      <Footer />
      {/* Floating admin/staff icon button in the lower left, stays fixed during scroll */}
      <FloatingAdminButton />
    </div>
  );
}

function PublicLayoutNoFooter() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', position: 'relative' }}>
      <Navbar />
      <main style={{ flex: 1 }}>
        <Outlet />
      </main>
      <FloatingAdminButton />
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      {/* Landing & 404 — with footer */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<LandingPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>

      <Route element={<PublicLayoutNoFooter />}>
        <Route path="/menu" element={<MenuPage />} />
        <Route path="/order" element={<Navigate to="/menu" replace />} />
        <Route path="/track" element={<TrackOrderPage />} />
      </Route>


      {/* Staff / Admin Authentication Entry Point */}
      <Route path="/admin/login" element={<AdminLoginPage />} />
      <Route path="/login" element={<Navigate to="/admin/login" replace />} />

      {/* Protected Admin Inventory & Management Area */}
      <Route
        path="/admin/dashboard"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminDashboardPage />
          </ProtectedRoute>
        }
      />

      {/* Protected Cashier POS Terminal & Sales Reports */}
      <Route
        path="/cashier/pos"
        element={
          <ProtectedRoute allowedRoles={['cashier', 'admin']}>
            <CashierPOSPage />
          </ProtectedRoute>
        }
      />
      <Route path="/cashier" element={<Navigate to="/cashier/pos" replace />} />

      {/* Protected Rider Delivery Portal */}
      <Route
        path="/rider"
        element={
          <ProtectedRoute allowedRoles={['rider', 'admin']}>
            <RiderPage />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
