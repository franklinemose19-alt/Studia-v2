import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence, useInView } from 'framer-motion'
import {
  Mic, Sparkles, GraduationCap, Camera, FlaskConical,
  WifiOff, CalendarDays, Target, Menu, X, Check,
  ChevronRight, Star, Zap, BookOpen, Brain, Play,
  ArrowRight, Twitter, Instagram, Linkedin
} from 'lucide-react'

function cn(...classes) {
  return classes.filter(Boolean).join(' ')
}

const fadeUp = {
  initial: { opacity: 0, y: 32 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-80px' },
  transition: { duration: 0.6, ease: [0.25, 0.1, 0.25, 1] },
}

const stagger = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { staggerChildren: 0.1 } },
}

const staggerChild = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] } },
}

function useCounter(end, duration = 2000) {
  const [count, setCount] = useState(0)
  const ref = useRef(null)
  const inView = useInView(ref, { once: true })

  useEffect(() => {
    if (!inView) return
    let start = 0
    const step = end / (duration / 16)
    const timer = setInterval(() => {
      start += step
      if (start >= end) { setCount(end); clearInterval(timer) }
      else setCount(Math.floor(start))
    }, 16)
    return () => clearInterval(timer)
  }, [inView, end, duration])

  return { count, ref }
}

function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handler)
    return () => window.removeEventListener('scroll', handler)
  }, [])

  const links = [
    { label: 'Features', href: '#features' },
    { label: 'How It Works', href: '#how-it-works' },
    { label: 'Pricing', href: '#pricing' },
  ]

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        scrolled ? 'bg-surface-base/90 backdrop-blur-md border-b border-white/5' : 'bg-transparent'
      )}
    >
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <a href="/" className="flex items-center gap-1">
          <span className="font-sora font-bold text-xl text-white tracking-tight">STUDIA</span>
          <sup className="text-brand-blue text-xs font-mono ml-0.5">β</sup>
        </a>

        <div className="hidden md:flex items-center gap-8">
          {links.map((l) => (
            
              key={l.href}
              href={l.href}
              className="text-sm text-[#8B97B5] hover:text-white transition-colors duration-200"
            >
              {l.label}
            </a>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-3">
          <a href="/login" className="text-sm text-[#8B97B5] hover:text-white transition-colors px-4 py-2">
            Log in
          </a>
          <a href="/signup" className="text-sm font-medium bg-brand-blue text-white px-4 py-2 rounded-lg hover:bg-brand-blue/90 transition-all duration-200 shadow-lg shadow-brand-blue/20">
            Get Started Free
          </a>
        </div>

        <button
          className="md:hidden text-white p-2"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </nav>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-surface-base/95 backdrop-blur-md border-b border-white/5 overflow-hidden"
          >
            <div className="px-4 py-6 flex flex-col gap-4">
              {links.map((l) => (
                
                  key={l.href}
                  href={l.href}
                  className="text-[#8B97B5] hover:text-white py-2 transition-colors"
                  onClick={() => setMobileOpen(false)}
                >
                  {l.label}
                </a>
              ))}
              <div className="pt-4 border-t border-white/5 flex flex-col gap-3">
                <a href="/login" className="text-sm text-[#8B97B5] py-2">Log in</a>
                <a href="/signup" className="text-sm font-medium bg-brand-blue text-white px-4 py-3 rounded-lg">
                  Get Started Free
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}

function HeroMockup() {
  const [activeTab, setActiveTab] = useState(0)
  const tabs = ['Summary', 'Key Points', 'Quiz']

  return (
    <motion.div
      animate={{ y: [0, -12, 0] }}
      transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      className="relative"
      style={{ transform: 'rotate(2deg)' }}
    >
      <div className="absolute inset-0 -z-10 blur-3xl opacity-30 bg-brand-blue rounded-3xl scale-110" />

      <div className="bg-surface-elevated border border-white/10 rounded-2xl overflow-hidden w-full max-w-md shadow-2xl shadow-black/50">
        <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
          <div>
            <p className="text-xs text-[#8B97B5] font-mono uppercase tracking-wider">BIO 201</p>
            <p className="text-sm font-sora font-semibold text-white mt-0.5">Cell Biology</p>
          </div>
          <span className="flex items-center gap-1.5 text-xs text-brand-green bg-brand-green/10 border border-brand-green/20 px-2.5 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-green animate-pulse" />
            Ready
          </span>
        </div>

        <div className="flex border-b border-white/5">
          {tabs.map((t, i) => (
            <button
              key={t}
              onClick={() => setActiveTab(i)}
              className={cn(
                'flex-1 text-xs py-3 transition-all duration-200',
                activeTab === i
                  ? 'text-brand-blue border-b-2 border-brand-blue font-medium'
                  : 'text-[#8B97B5] hover:text-white'
              )}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="p-5">
          <AnimatePresence mode="wait">
            {activeTab === 0 && (
              <motion.div
                key="summary"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="space-y-2"
              >
                <p className="text-xs text-[#8B97B5] leading-relaxed">
                  Mitochondria are the primary site of ATP synthesis through oxidative phosphorylation...
                </p>
                <div className="mt-3 flex items-center gap-2 text-brand-blue cursor-pointer hover:text-brand-blue/80 transition-colors">
                  <Play size={12} />
                  <span className="text-xs">Listen to narration</span>
                </div>
              </motion.div>
            )}
            {activeTab === 1 && (
              <motion.div
                key="keypoints"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="space-y-2"
              >
                {['Mitochondria produce ATP', 'Cristae increase surface area'].map((point, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <Check size={12} className="text-brand-green mt-0.5 shrink-0" />
                    <span className="text-xs text-[#8B97B5]">{point}</span>
                  </div>
                ))}
              </motion.div>
            )}
            {activeTab === 2 && (
              <motion.div key="quiz" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <p className="text-xs font-medium text-white mb-3">Q1. Where does oxidative phosphorylation occur?</p>
                <div className="space-y-2">
                  {['Nucleus', 'Mitochondria', 'Ribosome'].map((opt, i) => (
                    <div
                      key={i}
                      className={cn(
                        'flex items-center gap-2 px-3 py-2 rounded-lg border text-xs transition-all',
                        i === 1 ? 'border-brand-blue bg-brand-blue/10 text-white' : 'border-white/5 text-[#8B97B5]'
                      )}
                    >
                      <span className={cn('w-3 h-3 rounded-full border flex items-center justify-center shrink-0', i === 1 ? 'border-brand-blue bg-brand-blue' : 'border-white/20')}>
                        {i === 1 && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </span>
                      {opt}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="px-5 py-3 bg-surface-base/50 border-t border-white/5 flex items-center justify-between">
          <span className="text-xs text-[#4A5568] font-mono">12 key points</span>
          <span className="text-xs text-brand-amber">↓ Offline</span>
        </div>
      </div>
    </motion.div>
  )
}

function Hero() {
  return (
    <section className="relative min-h-screen flex items-center pt-16 overflow-hidden">
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `linear-gradient(rgba(79,142,247,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(79,142,247,0.1) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }}
      />
      <div className="absolute inset-0 bg-gradient-radial from-transparent via-transparent to-surface-base" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-blue/10 rounded-full blur-3xl -z-10" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-20 grid lg:grid-cols-2 gap-16 items-center">
        <motion.div variants={stagger} initial="initial" animate="animate" className="space-y-8">
          <motion.div variants={staggerChild}>
            <span className="inline-flex items-center gap-2 text-xs font-medium bg-brand-blue/10 text-brand-blue border border-brand-blue/20 px-3 py-1.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-blue animate-pulse" />
              AI-Powered Academic OS
            </span>
          </motion.div>

          <motion.h1
            variants={staggerChild}
            className="font-sora font-extrabold text-5xl lg:text-6xl xl:text-7xl leading-[1.05] tracking-tight text-white"
          >
            Turn Every Lecture Into <span className="text-brand-blue" style={{ textShadow: '0 0 40px rgba(79,142,247,0.5)' }}>Smart</span> Study Material.
          </motion.h1>

          <motion.p variants={staggerChild} className="text-[#8B97B5] text-lg leading-relaxed max-w-lg">
            Record your lecture. STUDIA transcribes it, summarizes it, builds revision notes and generates a quiz — automatically. Works offline. Runs on M-Pesa.
          </motion.p>

          <motion.div variants={staggerChild} className="flex flex-wrap gap-4">
            <a href="/signup" className="animate-glow-pulse inline-flex items-center gap-2 bg-brand-blue text-white font-medium px-6 py-3.5 rounded-xl text-sm hover:bg-brand-blue/90 transition-all shadow-lg shadow-brand-blue/25">
              Start Free — No Card Needed
              <ArrowRight size={16} />
            </a>
            <a href="#how-it-works" className="inline-flex items-center gap-2 text-white border border-white/10 px-6 py-3.5 rounded-xl text-sm hover:bg-white/5 transition-all">
              See How It Works
              <ChevronRight size={16} />
            </a>
          </motion.div>

          <motion.div variants={staggerChild} className="flex items-center gap-3">
            <div className="flex -space-x-2">
              {['AW', 'BK', 'FM'].map((initials, i) => (
                <div key={i} className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-blue/40 to-brand-blue/10 border-2 border-surface-base flex items-center justify-center text-xs font-medium text-white">
                  {initials}
                </div>
              ))}
            </div>
            <p className="text-xs text-[#8B97B5]">Trusted by <span className="text-white font-medium">2,400+</span> students</p>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
          className="flex justify-center lg:justify-end"
        >
          <HeroMockup />
        </motion.div>
      </div>
    </section>
  )
}

function Problem() {
  return (
    <section id="how-it-works" className="py-24 max-w-7xl mx-auto px-4 sm:px-6">
      <motion.div {...fadeUp} className="text-center mb-16">
        <h2 className="font-sora font-bold text-4xl lg:text-5xl text-white">Lectures are 2 hours. Your attention isn't.</h2>
      </motion.div>

      <div className="grid md:grid-cols-3 gap-6">
        {[
          { emoji: '📋', title: 'Messy notes', desc: 'You miss half. Unreadable by Sunday.' },
          { emoji: '😰', title: 'Exam panic', desc: '14 weeks of content. Zero structure.' },
          { emoji: '💸', title: 'Expensive help', desc: 'Tutors cost KSh 500/hr.' },
        ].map((p, i) => (
          <motion.div key={i} {...fadeUp} transition={{ duration: 0.6, delay: i * 0.1 }} whileHover={{ y: -4 }} className="bg-surface-card border border-white/5 rounded-2xl p-6">
            <div className="text-3xl mb-4">{p.emoji}</div>
            <h3 className="font-sora font-semibold text-white mb-2">{p.title}</h3>
            <p className="text-[#8B97B5] text-sm">{p.desc}</p>
          </motion.div>
        ))}
      </div>
    </section>
  )
}

function HowItWorks() {
  return (
    <section className="py-24 bg-surface-card/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <motion.div {...fadeUp} className="text-center mb-16">
          <h2 className="font-sora font-bold text-4xl lg:text-5xl text-white">Three steps to exam readiness.</h2>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {[
            { icon: <Mic size={24} />, title: 'Record', desc: 'Hit record. Background recording works.' },
            { icon: <Sparkles size={24} />, title: 'AI Processes', desc: 'Whisper + GPT-4 build summary and quiz.' },
            { icon: <GraduationCap size={24} />, title: 'Study Smarter', desc: 'Read, quiz, listen. Offline.' },
          ].map((s, i) => (
            <motion.div key={i} {...fadeUp} transition={{ duration: 0.6, delay: i * 0.15 }} className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-brand-blue/10 border border-brand-blue/20 rounded-2xl text-brand-blue mb-6">
                {s.icon}
              </div>
              <h3 className="font-sora font-semibold text-xl text-white mb-3">{s.title}</h3>
              <p className="text-[#8B97B5] text-sm">{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

function Features() {
  return (
    <section id="features" className="py-24 max-w-7xl mx-auto px-4 sm:px-6">
      <motion.div {...fadeUp} className="text-center mb-16">
        <h2 className="font-sora font-bold text-4xl lg:text-5xl text-white">Everything you need.</h2>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { icon: <Mic size={20} />, title: 'SmartCapture AI', desc: 'Filters noise. Clean text.' },
          { icon: <Camera size={20} />, title: 'SnapSolve', desc: 'Photo a past paper. Get answers.' },
          { icon: <FlaskConical size={20} />, title: 'Auto Quiz', desc: 'MCQs from your lectures.' },
          { icon: <WifiOff size={20} />, title: 'Offline Vault', desc: 'Download everything.' },
          { icon: <CalendarDays size={20} />, title: 'Semester Planner', desc: 'AI builds your schedule.' },
          { icon: <Target size={20} />, title: 'Exam Prediction', desc: 'Predicts likely topics.' },
        ].map((f, i) => (
          <motion.div key={i} {...fadeUp} transition={{ duration: 0.5, delay: i * 0.08 }} whileHover={{ y: -4 }} className="bg-surface-elevated border border-white/5 rounded-2xl p-6">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-brand-blue/10 border border-brand-blue/20 text-brand-blue mb-4">
              {f.icon}
            </div>
            <h3 className="font-sora font-semibold text-white mb-2">{f.title}</h3>
            <p className="text-[#8B97B5] text-sm">{f.desc}</p>
          </motion.div>
        ))}
      </div>
    </section>
  )
}

function Pricing() {
  const plans = [
    { name: 'Free', price: 'KSh 0', tag: 'Get started', cta: 'Start Free', highlight: false },
    { name: 'Lite', price: 'KSh 25–45', tag: 'Per lecture', cta: 'Pay Per Lecture', highlight: true },
    { name: 'Plus', price: 'KSh 250', tag: 'per month', cta: 'Go Plus', highlight: false },
    { name: 'Pro', price: 'KSh 450', tag: 'per month', cta: 'Go Pro', highlight: false },
  ]

  return (
    <section id="pricing" className="py-24 max-w-7xl mx-auto px-4 sm:px-6">
      <motion.div {...fadeUp} className="text-center mb-12">
        <h2 className="font-sora font-bold text-4xl lg:text-5xl text-white">Study smarter. Pay less.</h2>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {plans.map((p, i) => (
          <motion.div
            key={i}
            {...fadeUp}
            transition={{ duration: 0.5, delay: i * 0.08 }}
            className={cn(
              'relative bg-surface-elevated rounded-2xl p-5 border flex flex-col transition-all',
              p.highlight ? 'border-brand-blue shadow-xl shadow-brand-blue/20' : 'border-white/5'
            )}
          >
            {p.highlight && <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-medium bg-brand-blue text-white px-3 py-1 rounded-full">Most Popular</div>}
            <div className="mb-4">
              <p className="text-xs text-[#8B97B5] font-mono uppercase">{p.name}</p>
              <p className="font-sora font-bold text-2xl text-white mt-1">{p.price}</p>
              <p className="text-xs text-[#4A5568]">{p.tag}</p>
            </div>
            <a href="/signup" className={cn('w-full py-2.5 rounded-xl text-sm font-medium transition-all text-center', p.highlight ? 'bg-brand-blue text-white hover:bg-brand-blue/90' : 'bg-surface-base border border-white/10 text-white hover:bg-white/5')}>
              {p.cta}
            </a>
          </motion.div>
        ))}
      </div>
    </section>
  )
}

function FinalCTA() {
  return (
    <section className="py-32 text-center relative overflow-hidden">
      <motion.div {...fadeUp} className="relative max-w-3xl mx-auto px-4 sm:px-6">
        <h2 className="font-sora font-extrabold text-5xl lg:text-7xl text-white leading-tight mb-6">
          Your exams are in <span className="text-brand-blue">12 weeks.</span>
        </h2>
        <p className="text-[#8B97B5] text-lg mb-10">Every lecture you don't process is a gap. Start now — it's free.</p>
        <a href="/signup" className="animate-glow-pulse inline-flex items-center gap-3 bg-brand-blue text-white font-semibold px-8 py-4 rounded-2xl text-base hover:bg-brand-blue/90 transition-all">
          <Mic size={18} />
          Record Your First Lecture
          <ArrowRight size={18} />
        </a>
      </motion.div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="border-t border-white/5 bg-surface-base">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <div className="flex items-center gap-1 mb-8">
          <span className="font-sora font-bold text-lg text-white">STUDIA</span>
          <sup className="text-brand-blue text-xs font-mono">β</sup>
        </div>
        <p className="text-xs text-center text-[#4A5568]">© 2025 STUDIA. Made for Kenyan students.</p>
      </div>
    </footer>
  )
}

export default function Landing() {
  return (
    <div className="min-h-screen bg-surface-base">
      <Navbar />
      <Hero />
      <Problem />
      <HowItWorks />
      <Features />
      <Pricing />
      <FinalCTA />
      <Footer />
    </div>
  )
}
