import AITools from './page/AITools'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from './lib/ProtectedRoute'

// Pages
import Landing from './page/Landing'
import Login from './page/Login'
import Signup from './page/Signup'
import Dashboard from './page/Dashboard'
import Recording from './page/Recording'
import Summarize from './page/Summarize'
import Quiz from './page/Quiz'
import NotesLibrary from './page/NotesLibrary'
import ExamCountdown from './page/ExamCountdown'
import StudyPlanner from './page/StudyPlanner'
import AdaptiveLearning from './page/AdaptiveLearning'
import OfflineVault from './page/OfflineVault'
import UnitManagement from './page/UnitManagement'
import Pricing from './page/Pricing'
import Checkout from './page/Checkout'
import PaymentDashboard from './page/PaymentDashboard'

export default function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/pricing" element={<Pricing />} />
       <Route path="/ai-tools" element={<ProtectedRoute><AITools /></ProtectedRoute>} />
    

        {/* Protected Routes */}
        <Route
  path="/checkout"
  element={
    <ProtectedRoute>
      <Checkout />
    </ProtectedRoute>
  }
/>
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/recording"
          element={
            <ProtectedRoute>
              <Recording />
            </ProtectedRoute>
          }
        />
        <Route
          path="/summarize"
          element={
            <ProtectedRoute>
              <Summarize />
            </ProtectedRoute>
          }
        />
        <Route
          path="/quiz"
          element={
            <ProtectedRoute>
              <Quiz />
            </ProtectedRoute>
          }
        />
        <Route
          path="/notes"
          element={
            <ProtectedRoute>
              <NotesLibrary />
            </ProtectedRoute>
          }
        />
        <Route
          path="/exam-countdown"
          element={
            <ProtectedRoute>
              <ExamCountdown />
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/study-planner"
          element={
            <ProtectedRoute>
              <StudyPlanner />
            </ProtectedRoute>
          }
        />
        <Route
          path="/adaptive-learning"
          element={
            <ProtectedRoute>
              <AdaptiveLearning />
            </ProtectedRoute>
          }
        />
        <Route
          path="/offline-vault"
          element={
            <ProtectedRoute>
              <OfflineVault />
            </ProtectedRoute>
          }
        />
        <Route
          path="/units"
          element={
            <ProtectedRoute>
              <UnitManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/unit-management"
          element={
            <ProtectedRoute>
              <UnitManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/payments"
          element={
            <ProtectedRoute>
              <PaymentDashboard />
            </ProtectedRoute>
          }
        />

        {/* Catch all - redirect to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  )
}
