import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X, ArrowRight, ChevronRight } from 'lucide-react'

function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handler)
    return () => window.removeEventListener('scroll', handler)
  }, [])

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-surface-base/90 backdrop-blur-md border-b border-white/5' : 'bg-transparent'}`}>
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <a href="/" className="flex items-center gap-1">
          <span className="font-sora font-bold text-xl text-white">STUDIA</span>
          <sup className="text-brand-blue text-xs font-mono">β</sup>
        </a>

        <div className="hidden md:flex items-center gap-3">
          <a href="/login" className="text-sm text-[#8B97B5] px-4 py-2">Log in</a>
          <a href="/signup" className="text-sm font-medium bg-brand-blue text-white px-4 py-2 rounded-lg hover:bg-brand-blue/90">Get Started Free</a>
        </div>

        <button className="md:hidden text-white" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </nav>
    </header>
  )
}

function Hero() {
  return (
    <section className="relative min-h-screen flex items-center pt-16">
      <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'linear-gradient(rgba(79,142,247,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(79,142,247,0.1) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-20 text-center">
        <h1 className="font-sora font-extrabold text-5xl lg:text-6xl text-white mb-6">
          Turn Every Lecture Into <span className="text-brand-blue">Smart</span> Study Material
        </h1>
        <p className="text-[#8B97B5] text-lg max-w-2xl mx-auto mb-8">
          Record. Transcribe. Summarize. Quiz. All automatically. Works offline.
        </p>
        <div className="flex flex-wrap gap-4 justify-center">
          <a href="/signup" className="inline-flex items-center gap-2 bg-brand-blue text-white font-medium px-6 py-3.5 rounded-xl hover:bg-brand-blue/90">
            Start Free
            <ArrowRight size={16} />
          </a>
          <a href="#features" className="inline-flex items-center gap-2 text-white border border-white/10 px-6 py-3.5 rounded-xl hover:bg-white/5">
            Learn More
            <ChevronRight size={16} />
          </a>
        </div>
      </div>
    </section>
  )
}

function Features() {
  return (
    <section id="features" className="py-24 bg-surface-card/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <h2 className="font-sora font-bold text-4xl text-white text-center mb-12">Everything you need</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { emoji: '🎙️', title: 'SmartCapture', desc: 'Crystal clear transcripts' },
            { emoji: '✨', title: 'AI Summary', desc: 'Auto-summarize lectures' },
            { emoji: '📝', title: 'Auto Quiz', desc: 'MCQs from your notes' },
            { emoji: '📱', title: 'Offline', desc: 'Study anywhere' },
            { emoji: '📅', title: 'Planner', desc: 'Smart schedules' },
            { emoji: '🎯', title: 'Exam Prep', desc: 'Topic predictions' },
          ].map((item, i) => (
            <div key={i} className="bg-surface-elevated border border-white/5 rounded-2xl p-6">
              <div className="text-3xl mb-4">{item.emoji}</div>
              <h3 className="font-sora font-semibold text-white mb-2">{item.title}</h3>
              <p className="text-[#8B97B5] text-sm">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function Pricing() {
  return (
    <section className="py-24 max-w-7xl mx-auto px-4 sm:px-6">
      <h2 className="font-sora font-bold text-4xl text-white text-center mb-12">Simple pricing</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { name: 'Free', price: 'KSh 0' },
          { name: 'Lite', price: 'KSh 25-45', highlight: true },
          { name: 'Plus', price: 'KSh 250' },
          { name: 'Pro', price: 'KSh 450' },
        ].map((p, i) => (
          <div key={i} className={`rounded-2xl p-5 border ${p.highlight ? 'border-brand-blue bg-surface-elevated' : 'bg-surface-elevated border-white/5'}`}>
            <p className="text-xs text-[#8B97B5] uppercase mb-2">{p.name}</p>
            <p className="text-2xl font-bold text-white mb-4">{p.price}</p>
            <a href="/signup" className="w-full py-2 rounded-lg text-sm font-medium text-center block bg-brand-blue text-white hover:bg-brand-blue/90">
              Choose
            </a>
          </div>
        ))}
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="border-t border-white/5 bg-surface-base py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
        <p className="text-xs text-[#4A5568]">© 2025 STUDIA</p>
      </div>
    </footer>
  )
}

export default function Landing() {
  return (
    <div className="min-h-screen bg-surface-base">
      <Navbar />
      <Hero />
      <Features />
      <Pricing />
      <Footer />
    </div>
  )
}
