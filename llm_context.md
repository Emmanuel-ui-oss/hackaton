## Goal
Reestructurar toda la app para que cada fuente de datos cargue independientemente y la UI se muestre sin esperar a todas las peticiones.

## Constraints & Preferences
- Cada sección de UI debe mostrar skeleton/placeholder mientras su dato individual carga.
- Layout y mapa deben renderizarse al instante (t=0).
- WebSocket debe seguir funcionando como fuente en vivo independiente.
- Los hooks genéricos deben ser reutilizables por cualquier página.

## Progress
### Done
- Creado `useProgressiveData.js` hook — fetch por fuente única, retorna `{ data, isLoading, error, refetch }`.
- Creado `Skeleton.jsx` component — variantes `line`, `card`, `circle`, `chart`, `stat-card`.
- **Dashboard.jsx**: reemplazado `usePageData` + 2 `useEffect` por 3 hooks independientes (`stats`, `weather`, `forecast`). WebSocket se fusiona con `displayStats`. Cada sección (topbar, stats row, riskbar, charts) muestra skeleton hasta recibir su dato.
- **Mapa.jsx**: reemplazado `usePageData` por `stats` + `weather` hooks. Mapa se renderiza inmediatamente. Sidebar y riskbar cargan progresivamente.
- **Trafico.jsx**: reemplazado `loading` manual + `setInterval` por `useProgressiveData`. Mapa base se monta sin datos. Panel lateral muestra skeletons mientras `traffic.isLoading`.
- **PlanificarRuta.jsx**: zonas-riesgo y tráfico cargan con `useProgressiveData`. Mapa se monta inmediato. Sugerencias y rutas siguen siendo user-driven.
- **Admin.jsx**: reemplazado `usePageData` condicional (por tab) por `useProgressiveData` — ambas fuentes cargan en montaje, cambio de tab es instantáneo. Skeletons mientras carga.
- `useProgressiveData` mejorado con `refetch()` para recarga manual.

### Pending
- (none — todas las páginas multi-fuente refactorizadas)

### Blocked
- (none)

## Key Decisions
- **Nuevo hook vs. modificar usePageData**: se crea `useProgressiveData` porque `usePageData` tiene semántica de "carga única de página". Cambiarlo rompería páginas simples que sí necesitan bloqueo. Ambos coexisten.
- **WebSocket sigue fusionado a `displayStats`**: el WS es una fuente "push" que actualiza el mismo estado que la REST, no una fuente independiente renderizable. Se dejó como `socketStats || stats.data` para no perder la actualización en vivo.
- **Skeleton inline styles, no CSS externo**: para mantenerlo portátil sin depender del sistema de diseño de cada página.
- **Admin carga ambas fuentes en montaje**: cambio de tab es instantáneo porque los datos ya están cacheados en estado. Las acciones (toggle/delete) disparan `refetch()` individual.

## Relevant Files
- `frontend/src/hooks/useProgressiveData.js`: hook para carga progresiva por fuente.
- `frontend/src/components/common/Skeleton.jsx`: componente skeleton reutilizable.
- `frontend/src/pages/Dashboard.jsx`: refactorizado con 3 hooks progresivos + skeletons.
- `frontend/src/pages/Mapa.jsx`: refactorizado con 2 hooks progresivos + mapa inmediato.
- `frontend/src/pages/Trafico.jsx`: refactorizado con 1 hook progresivo + mapa inmediato.
- `frontend/src/pages/PlanificarRuta.jsx`: refactorizado con 2 hooks + mapa inmediato.
- `frontend/src/pages/Admin.jsx`: refactorizado con 2 hooks + skeletons por tab.
