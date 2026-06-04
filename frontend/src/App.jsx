import { Routes, Route, Navigate } from 'react-router-dom'
import './App.css'
import Layout from './components/Layout/Layout'
import Dashboard from './components/Dashboard/Dashboard'
import Simulador from './components/Simulador/Simulador'
import Cenarios from './components/Cenarios/Cenarios'
import Login from './components/Login/Login'
import ProtectedRoute from './components/ProtectedRoute'
import { useAuth } from './context/AuthContext'

// Se já está logado, /login redireciona pro dashboard.
function PublicOnly({ children }) {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : children
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />

      {/* Rotas protegidas dentro do Layout (sidebar + topbar) */}
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/simulador" element={<Simulador />} />
        <Route path="/cenarios" element={<Cenarios />} />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
