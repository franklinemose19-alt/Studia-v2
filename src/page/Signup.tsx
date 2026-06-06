import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, Lock, User, BookOpen, Calendar, Zap, Eye, EyeOff, ArrowRight, ArrowLeft, CheckCircle2, Building2, Loader } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function Signup() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    campus: '',
    courseName: '',
    yearOfStudy: '',
    semester: '',
    studyHoursPerDay: '3',
    notificationsEnabled: true,
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async () => {
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      navigate('/dashboard')
    }, 2000)
  }

  const canProceed = () => {
    switch (step) {
      case 1:
        return formData.fullName && formData.email && formData.password && formData.confirmPassword
      case 2:
        return formData.campus && formData.courseName
      case 3:
        return formData.yearOfStudy && formData.semester
      default:
        return true
    }
  }

  const campuses = [
    'University of Nairobi', 'Kenyatta University', 'Strathmore University', 'JKUAT',
    'Moi University', 'Egerton University', 'Maseno University', 'USIU Africa',
  ]

  const years = ['Year 1', 'Year 2', 'Year 3', 'Year 4', 'Year 5', 'Year 6', 'Year 7', 'Year 8']
  const semesters = ['Semester 1', 'Semester 2', 'Semester 3']

  return (
    <div className="min-h-screen bg-surface-base flex items-center justify-center px-4 py-12">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="relative w-full max-w-md">
        <div className="bg-surface-elevated border border-white/5 rounded-3xl p-8 sm:p-10">
          <div className="mb-8">
            <a href="/" className="inline-flex items-center gap-1 mb-6">
              <span className="font-sora font-bold text-2xl text-white">STUDIA</span>
              <sup className="text-brand-blue text-xs font-mono">β</sup>
            </a>

            <div>
              <h1 className="font-sora font-bold text-2xl text-white">
                {step === 1 && 'Create your account'}
                {step === 2 && 'Your campus and course'}
                {step === 3 && 'Your year and semester'}
                {step === 4 && 'Study preferences'}
                {step === 5 && `You're all set!`}
              </h1>
              <p className="text-[#8B97B5] text-sm mt-2">
                {step === 1 && 'Start your AI-powered study journey'}
                {step === 2 && 'Help us customize your experience'}
                {step === 3 && 'So we know when your exams are'}
                {step === 4 && 'When do you study best?'}
                {step === 5 && 'Welcome to STUDIA'}
              </p>
            </div>

            <div className="mt-6 flex gap-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <motion.div key={s} className={`h-1.5 flex-1 rounded-full transition-colors ${s <= step ? 'bg-brand-blue' : 'bg-white/10'}`} />
              ))}
            </div>
            <p className="text-xs text-[#4A5568] mt-2">Step {step} of 5</p>
          </div>

          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-white mb-2">Full name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4A5568] w-4 h-4" />
                    <input type="text" placeholder="John Mwangi" value={formData.fullName} onChange={(e) => handleInputChange('fullName', e.target.value)} className="w-full bg-surface-base border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white placeholder-[#4A5568] outline-none focus:border-brand-blue/40" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-white mb-2">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4A5568] w-4 h-4" />
                    <input type="email" placeholder="you@university.ac.ke" value={formData.email} onChange={(e) => handleInputChange('email', e.target.value)} className="w-full bg-surface-base border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white placeholder-[#4A5568] outline-none focus:border-brand-blue/40" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-white mb-2">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4A5568] w-4 h-4" />
                    <input type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={formData.password} onChange={(e) => handleInputChange('password', e.target.value)} className="w-full bg-surface-base border border-white/10 rounded-xl pl-10 pr-10 py-3 text-white placeholder-[#4A5568] outline-none focus:border-brand-blue/40" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#4A5568] hover:text-white">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-white mb-2">Confirm password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4A5568] w-4 h-4" />
                    <input type={showConfirm ? 'text' : 'password'} placeholder="••••••••" value={formData.confirmPassword} onChange={(e) => handleInputChange('confirmPassword', e.target.value)} className="w-full bg-surface-base border border-white/10 rounded-xl pl-10 pr-10 py-3 text-white placeholder-[#4A5568] outline-none focus:border-brand-blue/40" />
                    <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#4A5568] hover:text-white">
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-white mb-2">Campus</label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-3.5 text-[#4A5568] w-4 h-4 pointer-events-none" />
                    <select value={formData.campus} onChange={(e) => handleInputChange('campus', e.target.value)} className="w-full bg-surface-base border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white outline-none focus:border-brand-blue/40 appearance-none cursor-pointer">
                      <option value="">Select your campus...</option>
                      {campuses.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-white mb-2">Course name</label>
                  <div className="relative">
                    <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4A5568] w-4 h-4" />
                    <input type="text" placeholder="e.g. Computer Science" value={formData.courseName} onChange={(e) => handleInputChange('courseName', e.target.value)} className="w-full bg-surface-base border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white placeholder-[#4A5568] outline-none focus:border-brand-blue/40" />
                  </div>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-white mb-2">Year of study</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-3.5 text-[#4A5568] w-4 h-4 pointer-events-none" />
                    <select value={formData.yearOfStudy} onChange={(e) => handleInputChange('yearOfStudy', e.target.value)} className="w-full bg-surface-base border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white outline-none focus:border-brand-blue/40 appearance-none cursor-pointer">
                      <option value="">Select your year...</option>
                      {years.map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-white mb-2">Current semester</label>
                  <div className="relative">
                    <Zap className="absolute left-3 top-3.5 text-[#4A5568] w-4 h-4 pointer-events-none" />
                    <select value={formData.semester} onChange={(e) => handleInputChange('semester', e.target.value)} className="w-full bg-surface-base border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white outline-none focus:border-brand-blue/40 appearance-none cursor-pointer">
                      <option value="">Select your semester...</option>
                      {semesters.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }} className="space-y-6">
                <div>
                  <label className="block text-xs font-medium text-white mb-4">How many hours per day do you study?</label>
                  <div className="space-y-3">
                    {['1', '2', '3', '4', '5', '6', '7', '8'].map((h) => (
                      <label key={h} className="flex items-center gap-3 cursor-pointer">
                        <input type="radio" name="hours" value={h} checked={formData.studyHoursPerDay === h} onChange={(e) => handleInputChange('studyHoursPerDay', e.target.value)} className="w-4 h-4 accent-brand-blue cursor-pointer" />
                        <span className="text-white">{h} hour{h !== '1' ? 's' : ''}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {step === 5 && (
              <motion.div key="step5" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.3 }} className="text-center space-y-6">
                <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 0.6, delay: 0.2 }} className="flex justify-center">
                  <CheckCircle2 className="w-16 h-16 text-brand-green" />
                </motion.div>
                <div>
                  <h2 className="font-sora font-bold text-2xl text-white mb-2">Welcome to STUDIA!</h2>
                  <p className="text-[#8B97B5] text-sm">Your account is ready. Let's turn your lectures into smart study material.</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-8 flex gap-3">
            {step > 1 && (
              <button onClick={() => setStep(step - 1)} className="flex-1 border border-white/10 text-white font-medium py-3 rounded-xl hover:bg-white/5 flex items-center justify-center gap-2">
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
            )}

            {step < 5 && (
              <button onClick={() => setStep(step + 1)} disabled={!canProceed()} className="flex-1 bg-brand-blue text-white font-medium py-3 rounded-xl hover:bg-brand-blue/90 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                Next
                <ArrowRight className="w-4 h-4" />
              </button>
            )}

            {step === 5 && (
              <button onClick={handleSubmit} disabled={loading} className="flex-1 bg-brand-blue text-white font-medium py-3 rounded-xl hover:bg-brand-blue/90 flex items-center justify-center gap-2 disabled:opacity-50">
                {loading ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Setting up...
                  </>
                ) : (
                  <>
                    Get Started
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            )}
          </div>

          <p className="text-center text-sm text-[#8B97B5] mt-6">
            Already have an account?{' '}
            <a href="/login" className="text-brand-blue hover:text-brand-blue/80 font-medium">
              Sign in
            </a>
          </p>
        </div>
      </motion.div>
    </div>
  )
}
