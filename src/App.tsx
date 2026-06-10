import ExamCountdown from './page/ExamCountdown'
import Quiz from './page/Quiz'
import Summarize from './page/Summarize'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Landing from './page/Landing'
import Login from './page/Login'
import Signup from './page/Signup'
import Dashboard from './page/Dashboard'
import Recording from './page/Recording'
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
       <Route path="/exam-countdown" element={<ExamCountdown />} />
        <Route path="/quiz" element={<Quiz />} />
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/recording" element={<Recording />} />
        <Route path="/summarize" element={<Summarize />} />
      </Routes>
    </BrowserRouter>
  )
}
