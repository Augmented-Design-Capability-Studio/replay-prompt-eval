import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import CodingInterface from './components/CodingInterface.tsx' // Import the new component

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Router basename="/woz">
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/coding" element={<CodingInterface />} />
      </Routes>
    </Router>
  </StrictMode>,
)