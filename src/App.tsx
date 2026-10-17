import { Component, useState, type ErrorInfo, type ReactNode } from 'react'
import { HashRouter, Route, Routes } from 'react-router-dom'
import Sidebar from './components/layout/Sidebar'
import Topbar from './components/layout/Topbar'
import { ToastProvider } from './components/ui'
import { IncidentFormProvider } from './components/IncidentFormProvider'
import { AppProvider } from './context/AppContext'
import { ThemeProvider } from './context/ThemeContext'
import DashboardPage from './pages/DashboardPage'
import MapPage from './pages/MapPage'
import IncidentsPage from './pages/IncidentsPage'
import ResourcesPage from './pages/ResourcesPage'
import AiPage from './pages/AiPage'
import NodesPage from './pages/NodesPage'
import HistoryPage from './pages/HistoryPage'
import SettingsPage from './pages/SettingsPage'
import FieldPage from './pages/FieldPage'

function Shell() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-navy-deep">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar onMenu={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 lg:p-5 bg-[radial-gradient(ellipse_at_top,rgba(0,96,100,0.08),transparent_55%)]">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/mapa" element={<MapPage />} />
            <Route path="/incidentes" element={<IncidentsPage />} />
            <Route path="/recursos" element={<ResourcesPage />} />
            <Route path="/ia" element={<AiPage />} />
            <Route path="/nodos" element={<NodesPage />} />
            <Route path="/historial" element={<HistoryPage />} />
            <Route path="/brigadista" element={<FieldPage />} />
            <Route path="/configuracion" element={<SettingsPage />} />
            <Route path="*" element={<DashboardPage />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { error: null }
  }
  static getDerivedStateFromError(error: Error) { return { error } }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('Centinela render error:', error, info) }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 24, color: '#ffb4b4', background: '#071e33', height: '100vh', fontFamily: 'system-ui', overflow: 'auto' }}>
          <h2>Centinela — error de renderizado</h2>
          <pre style={{ whiteSpace: 'pre-wrap' }}>{this.state.error?.stack ?? String(this.state.error)}</pre>
          <p>Limpie localStorage y recargue.</p>
        </div>
      )
    }
    return this.props.children
  }
}

export default function App() {
  return (
    <ThemeProvider>
      <HashRouter>
        <ErrorBoundary>
          <AppProvider>
            <ToastProvider>
              <IncidentFormProvider>
                <Shell />
              </IncidentFormProvider>
            </ToastProvider>
          </AppProvider>
        </ErrorBoundary>
      </HashRouter>
    </ThemeProvider>
  )
}
