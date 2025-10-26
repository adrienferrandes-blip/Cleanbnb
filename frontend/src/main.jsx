import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Tasks from './pages/Tasks'
import './styles.css'

function App(){
  return (
    <BrowserRouter>
      <div className="app">
        <nav className="nav">
          <Link to="/">Dashboard</Link> | <Link to="/tasks">Tâches</Link> | <Link to="/login">Login</Link>
        </nav>
        <Routes>
          <Route path="/login" element={<Login/>} />
          <Route path="/tasks" element={<Tasks/>} />
          <Route path="/" element={<Dashboard/>} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}

createRoot(document.getElementById('root')).render(<App />)
