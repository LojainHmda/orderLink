import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { MainPage } from './pages/MainPage';
import { DashboardPage } from './pages/DashboardPage';
import { OrderBoardPage } from './pages/OrderBoardPage';
import { PosPage } from './pages/PosPage';
import { MenuManagerPage } from './pages/MenuManagerPage';
import { CustomerMenuPage } from './pages/CustomerMenuPage';
import { OrderStatusPage } from './pages/OrderStatusPage';

/**
 * Routes.
 *  - Restaurant console (sidebar shell): /dashboard, /orders, /pos, /menu
 *  - Public customer flow (no shell):    /r/:slug, /order/:id
 */
export function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<Navigate to="/home" replace />} />
        <Route path="/home" element={<MainPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/orders" element={<OrderBoardPage />} />
        <Route path="/pos" element={<PosPage />} />
        <Route path="/menu" element={<MenuManagerPage />} />
      </Route>

      <Route path="/r/:slug" element={<CustomerMenuPage />} />
      <Route path="/order/:id" element={<OrderStatusPage />} />

      <Route path="*" element={<Navigate to="/home" replace />} />
    </Routes>
  );
}
