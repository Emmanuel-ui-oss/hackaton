import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import Layout from './components/layout/Layout'
import ProtectedRoute from './components/common/ProtectedRoute'
import AdminRoute from './components/common/AdminRoute'
import ErrorBoundary from './components/common/ErrorBoundary'
const Landing    = lazy(() => import('./pages/Landing'))
const Dashboard  = lazy(() => import('./pages/Dashboard'))
const Mapa       = lazy(() => import('./pages/Mapa'))
const Zonas      = lazy(() => import('./pages/Zonas'))
const Reportes   = lazy(() => import('./pages/Reportes'))
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
    <Suspense fallback={null}>
    <Routes location={location} key={location.pathname}>
      <Route path="/" element={<ErrorBoundary name="Inicio"><Landing /></ErrorBoundary>} />

      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<ErrorBoundary name="Dashboard"><Dashboard /></ErrorBoundary>} />
        <Route path="/mapa" element={<ErrorBoundary name="Mapa"><Mapa /></ErrorBoundary>} />
        <Route path="/zonas" element={<ErrorBoundary name="Zonas"><Zonas /></ErrorBoundary>} />
        <Route path="/reportes" element={<ErrorBoundary name="Reportes"><Reportes /></ErrorBoundary>} />
        <Route path="/favoritos" element={<ErrorBoundary name="Favoritos"><Favoritos /></ErrorBoundary>} />
        <Route path="/contactos" element={<ErrorBoundary name="Contactos"><Contactos /></ErrorBoundary>} />
        <Route path="/historial" element={<ErrorBoundary name="Historial"><Historial /></ErrorBoundary>} />
        <Route path="/perfil" element={<ErrorBoundary name="Perfil"><Perfil /></ErrorBoundary>} />
        <Route path="/riesgos" element={<ErrorBoundary name="Riesgos"><Riesgos /></ErrorBoundary>} />
        <Route element={<AdminRoute />}>
          <Route path="/admin" element={<ErrorBoundary name="Admin"><Admin /></ErrorBoundary>} />
        </Route>
      </Route>
    </Routes>
    </Suspense>
    </AnimatePresence>
  )
}
