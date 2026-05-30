import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/layout/Layout'
import ProtectedRoute from './components/common/ProtectedRoute'
import AdminRoute from './components/common/AdminRoute'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Mapa from './pages/Mapa'
import Zonas from './pages/Zonas'
import Reportes from './pages/Reportes'
import Transporte from './pages/Transporte'
import Alertas from './pages/Alertas'
import Favoritos from './pages/Favoritos'
import Contactos from './pages/Contactos'
import Historial from './pages/Historial'
import Perfil from './pages/Perfil'
import PlanificarRuta from './pages/PlanificarRuta'
import Admin from './pages/Admin'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/mapa" element={<Mapa />} />
        <Route path="/zonas" element={<Zonas />} />
        <Route path="/reportes" element={<Reportes />} />
        <Route path="/transporte" element={<Transporte />} />
        <Route path="/alertas" element={<Alertas />} />
        <Route path="/favoritos" element={<Favoritos />} />
        <Route path="/contactos" element={<Contactos />} />
        <Route path="/historial" element={<Historial />} />
        <Route path="/perfil" element={<Perfil />} />
        <Route path="/planificar-ruta" element={<PlanificarRuta />} />
        <Route element={<AdminRoute />}>
          <Route path="/admin" element={<Admin />} />
        </Route>
      </Route>
    </Routes>
  )
}
