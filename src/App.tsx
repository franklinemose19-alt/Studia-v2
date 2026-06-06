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
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/recording" element={<Recording />} />
      </Routes>
    </BrowserRouter>
  )
}
