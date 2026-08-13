import { lazy, Suspense } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from './lib/ProtectedRoute'
import AdminRoute from './lib/AdminRoute'
import { AuthProvider } from './lib/AuthContext'
import BottomNav from './components/BottomNav'
import MaintenanceGate from './components/MaintenanceGate'

const Landing = lazy(() => import('./page/Landing'))
const Login = lazy(() => import('./page/Login'))
const Signup = lazy(() => import('./page/Signup'))
const Dashboard = lazy(() => import('./page/Dashboard'))
const Recording = lazy(() => import('./page/Recording'))
const Quiz = lazy(() => import('./page/Quiz'))
const NotesLibrary = lazy(() => import('./page/NotesLibrary'))
const ExamCountdown = lazy(() => import('./page/ExamCountdown'))
const StudyPlanner = lazy(() => import('./page/StudyPlanner'))
const AdaptiveLearning = lazy(() => import('./page/AdaptiveLearning'))
const OfflineVault = lazy(() => import('./page/OfflineVault'))
const UnitManagement = lazy(() => import('./page/UnitManagement'))
const Pricing = lazy(() => import('./page/Pricing'))
const Checkout = lazy(() => import('./page/Checkout'))
const PaymentDashboard = lazy(() => import('./page/PaymentDashboard'))
const SageAITutor = lazy(() => import('./page/SageAITutor'))
const AdminDashboard = lazy(() => import('./page/AdminDashboard'))
const KnowledgeMap = lazy(() => import('./page/KnowledgeMap'))
function PageLoader() {
  return (
    <div className="min-h-screen bg-surface-base flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-premium to-purple-premium flex items-center justify-center">
          <span className="text-white font-bold text-xl">S</span>
        </div>
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-brand-blue" />
      </div>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <MaintenanceGate>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/summarize" element={<Navigate to="/notes?tab=summarize" replace />} />
              <Route path="/ai-tools" element={<Navigate to="/sage" replace />} />
              <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
              <Route path="/checkout" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
              <Route path="/sage" element={<ProtectedRoute><SageAITutor /></ProtectedRoute>} />
              <Route path="/knowledge-map" element={<ProtectedRoute><KnowledgeMap /></ProtectedRoute>} />
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/recording" element={<ProtectedRoute><Recording /></ProtectedRoute>} />
              <Route path="/quiz" element={<ProtectedRoute><Quiz /></ProtectedRoute>} />
              <Route path="/notes" element={<ProtectedRoute><NotesLibrary /></ProtectedRoute>} />
              <Route path="/exam-countdown" element={<ProtectedRoute><ExamCountdown /></ProtectedRoute>} />
              <Route path="/study-planner" element={<ProtectedRoute><StudyPlanner /></ProtectedRoute>} />
              <Route path="/adaptive-learning" element={<ProtectedRoute><AdaptiveLearning /></ProtectedRoute>} />
              <Route path="/offline-vault" element={<ProtectedRoute><OfflineVault /></ProtectedRoute>} />
              <Route path="/units" element={<ProtectedRoute><UnitManagement /></ProtectedRoute>} />
              <Route path="/unit-management" element={<ProtectedRoute><UnitManagement /></ProtectedRoute>} />
              <Route path="/payments" element={<ProtectedRoute><PaymentDashboard /></ProtectedRoute>} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </MaintenanceGate>
        <BottomNav />
      </Router>
    </AuthProvider>
  )
}
