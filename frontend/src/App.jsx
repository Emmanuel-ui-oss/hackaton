import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import Layout from './components/layout/Layout'
import ProtectedRoute from './components/common/ProtectedRoute'
import AdminRoute from './components/common/AdminRoute'
import ErrorBoundary from './components/common/ErrorBoundary'
import Loading from './components/common/Loading'

const Landing    = lazy(() => import('./pages/Landing'))
const Dashboard  = lazy(() => import('./pages/Dashboard'))
const Mapa       = lazy(() => import('./pages/Mapa'))
const Zonas      = lazy(() => import('./pages/Zonas'))
const Reportes   = lazy(() => import('./pages/Reportes'))
const Transporte = lazy(() => import('./pages/Transporte'))
const Alertas    = lazy(() => import('./pages/Alertas'))
const Favoritos  = lazy(() => import('./pages/Favoritos'))
const Contactos  = lazy(() => import('./pages/Contactos'))
const Historial  = lazy(() => import('./pages/Historial'))
const Perfil     = lazy(() => import('./pages/Perfil'))
const Riesgos    = lazy(() => import('./pages/Riesgos'))
const Admin      = lazy(() => import('./pages/Admin'))

export default function App() {
  const location = useLocation()

  return (
    <AnimatePresence mode="wait">
      <ErrorBoundary>
      <Suspense fallback={null}>
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
          <Route path="/riesgos" element={<Riesgos />} />
          <Route element={<AdminRoute />}>
            <Route path="/admin" element={<Admin />} />
          </Route>
        </Route>
      </Routes>
      </Suspense>
      </ErrorBoundary>
    </AnimatePresence>
  )
}
