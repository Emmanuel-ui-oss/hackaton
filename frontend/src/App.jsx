import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import Layout from './components/layout/Layout'
import ProtectedRoute from './components/common/ProtectedRoute'
import AdminRoute from './components/common/AdminRoute'
import Landing from './pages/Landing'

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
import Trafico from './pages/Trafico'
import Riesgos from './pages/Riesgos'
import Admin from './pages/Admin'

export default function App() {
  const location = useLocation()

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Landing />} />

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
          <Route path="/planificar-ruta" element={<Navigate to="/mapa?mode=route" replace />} />
          <Route path="/trafico" element={<Navigate to="/mapa?mode=traffic" replace />} />
          <Route path="/riesgos" element={<Riesgos />} />
          <Route element={<AdminRoute />}>
            <Route path="/admin" element={<Admin />} />
          </Route>
        </Route>
      </Routes>
    </AnimatePresence>
  )
}
