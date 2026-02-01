import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { PublicDashboard } from './pages/PublicDashboard';
import { Login } from './pages/Login';
import { AdminDashboard } from './pages/AdminDashboard';
import { ProtectedRoute } from './components/layout/ProtectedRoute';


function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Rota Pública (Tela de TV) */}
          <Route path="/" element={<PublicDashboard />} />

          {/* Rota de Login */}
          <Route path="/login" element={<Login />} />

          {/* Rotas Protegidas (Admin) */}
          <Route element={<ProtectedRoute />}>
            <Route path="/admin" element={<AdminDashboard />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
