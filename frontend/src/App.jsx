import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { AnimatePresence } from 'framer-motion'
import Layout from './components/layout/Layout'
import ProtectedRoute from './components/common/ProtectedRoute'
import AdminRoute from './components/common/AdminRoute'

const Landing = lazy(() => import('./pages/Landing'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Mapa = lazy(() => import('./pages/Mapa'))
const Zonas = lazy(() => import('./pages/Zonas'))
const Reportes = lazy(() => import('./pages/Reportes'))
const Transporte = lazy(() => import('./pages/Transporte'))
const Alertas = lazy(() => import('./pages/Alertas'))
const Favoritos = lazy(() => import('./pages/Favoritos'))
const Contactos = lazy(() => import('./pages/Contactos'))
const Historial = lazy(() => import('./pages/Historial'))
const Perfil = lazy(() => import('./pages/Perfil'))
const PlanificarRuta = lazy(() => import('./pages/PlanificarRuta'))
const Trafico = lazy(() => import('./pages/Trafico'))
const Riesgos = lazy(() => import('./pages/Riesgos'))
const Admin = lazy(() => import('./pages/Admin'))

export default function App() {
  const location = useLocation()

  return (
    <AnimatePresence mode="wait">
      <Suspense fallback={
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
        </div>
      }>
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
            <Route path="/planificar-ruta" element={<PlanificarRuta />} />
            <Route path="/trafico" element={<Trafico />} />
            <Route path="/riesgos" element={<Riesgos />} />
            <Route element={<AdminRoute />}>
              <Route path="/admin" element={<Admin />} />
            </Route>
          </Route>
        </Routes>
      </Suspense>
    </AnimatePresence>
  )
}
