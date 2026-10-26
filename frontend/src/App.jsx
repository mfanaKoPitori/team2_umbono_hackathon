import { Routes, Route } from 'react-router-dom'
import { LanguageProvider } from './i18n.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import ReportPage from './pages/ReportPage.jsx'
import ConfirmationPage from './pages/ConfirmationPage.jsx'

function App() {
  return (
    <LanguageProvider>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/report" element={<ReportPage />} />
        <Route path="/submitted/:id" element={<ConfirmationPage />} />
      </Routes>
    </LanguageProvider>
  )
}

export default App
