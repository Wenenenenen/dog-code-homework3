import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom'
import useAppStore from './store/appStore'
import Notification from './components/Notification'
import RecordPage from './pages/RecordPage'
import ReplayPage from './pages/ReplayPage'
import ManagerPage from './pages/ManagerPage'
import './styles/App.css'

function App() {
  const { init, isRecording } = useAppStore()

  useEffect(() => {
    init()
  }, [init])

  return (
    <BrowserRouter>
      <div className="app-container">
        <nav className="navbar">
          <div className="navbar-content">
            <NavLink to="/" className="navbar-brand">
              <div className="navbar-brand-icon">📹</div>
              <span>行为记录系统</span>
            </NavLink>
            
            <div className="navbar-nav">
              <NavLink 
                to="/record" 
                className="nav-link"
                style={({ isActive }) => ({
                  backgroundColor: isActive ? 'var(--primary-light)' : undefined,
                  color: isActive ? 'var(--primary-color)' : undefined
                })}
              >
                记录
              </NavLink>
              <NavLink 
                to="/replay" 
                className="nav-link"
                style={({ isActive }) => ({
                  backgroundColor: isActive ? 'var(--primary-light)' : undefined,
                  color: isActive ? 'var(--primary-color)' : undefined
                })}
              >
                回放
              </NavLink>
              <NavLink 
                to="/manager" 
                className="nav-link"
                style={({ isActive }) => ({
                  backgroundColor: isActive ? 'var(--primary-light)' : undefined,
                  color: isActive ? 'var(--primary-color)' : undefined
                })}
              >
                管理
              </NavLink>
              
              {isRecording && (
                <div className="recording-indicator">
                  <span className="recording-dot"></span>
                  <span>记录中</span>
                </div>
              )}
            </div>
          </div>
        </nav>

        <main className="main-content">
          <Routes>
            <Route path="/" element={<Navigate to="/record" replace />} />
            <Route path="/record" element={<RecordPage />} />
            <Route path="/replay" element={<ReplayPage />} />
            <Route path="/manager" element={<ManagerPage />} />
          </Routes>
        </main>

        <Notification />
      </div>
    </BrowserRouter>
  )
}

export default App
