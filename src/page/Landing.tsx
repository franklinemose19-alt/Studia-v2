## Recreate `src/page/Landing.tsx`

**"Add file"** → **"Create new file"** → Filename: `src/page/Landing.tsx`

Paste this simpler, working version:

```tsx
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, Menu, X, ArrowRight, ChevronRight, Star } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

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

        <div className="hidden md:flex items-center gap-8">
          {['Features', 'How It Works', 'Pricing'].map((l) => (
            <a key={l} href="#" className="text-sm text-[#8B97B5] hover:text-white transition-colors">
              {l}
            </a>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-3">
          <a href="/login" className="text-sm text-[#8B97B5] hover:text-white px-4 py-2">Log in</a>
          <a href="/signup" className="text-sm font-medium bg-brand-blue text-white px-4 py-2 rounded-lg hover:bg-brand-blue/90 shadow-lg shadow-brand-blue/20">
            Get Started Free
          </a>
        </div>

        <button className="md:hidden text-white p-2" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </nav>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="md:hidden bg-surface-base/95 backdrop-blur-md border-b border-white/5">
            <div className="px-4 py-6 flex flex-col gap-4">
              {['Features', 'How It Works', 'Pricing'].map((l) => (
                <a key={l} href="#" className="text-[#8B97B5] hover:text-white py-2" onClick={() => setMobileOpen(false)}>
                  {l}
                </a>
              ))}
              <div className="pt-4 border-t border-white/5 flex flex-col gap-3">
                <a href="/login" className="text-sm text-[#8B97B5]">Log in</a>
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

function Hero() {
  return (
    <section className="relative min-h-screen flex items-center pt-16 overflow-hidden">
      <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'linear-gradient(rgba(79,142,247,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(79,142,247,0.1) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-20 grid lg:grid-cols-2 gap-16 items-center">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8 }} className="space-y-8">
          <span className="inline-flex items-center gap-2 text-xs font-medium bg-brand-blue/10 text-brand-blue border border-brand-blue/20 px-3 py-1.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-blue animate-pulse" />
            AI-Powered Academic OS
          </span>

          <h1 className="font-sora font-extrabold text-5xl lg:text-6xl xl:text-7xl leading-tight text-white">
            Turn Every Lecture Into <span className="text-brand-blue">Smart</span> Study Material.
          </h1>

          <p className="text-[#8B97B5] text-lg max-w-lg">
            Record your lecture. STUDIA transcribes it, summarizes it, builds revision notes and generates a quiz — automatically. Works offline.
          </p>

          <div className="flex flex-wrap gap-4">
            <a href="/signup" className="inline-flex items-center gap-2 bg-brand-blue text-white font-medium px-6 py-3.5 rounded-xl text-sm hover:bg-brand-blue/90 shadow-lg shadow-brand-blue/25">
              Start Free — No Card Needed
              <ArrowRight size={16} />
            </a>
            <a href="#" className="inline-flex items-center gap-2 text-white border border-white/10 px-6 py-3.5 rounded-xl text-sm hover:bg-white/5">
              See How It Works
              <ChevronRight size={16} />
            </a>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex -space-x-2">
              {['AW', 'BK', 'FM'].map((initials) => (
                <div key={initials} className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-blue/40 to-brand-blue/10 border-2 border-surface-base flex items-center justify-center text-xs font-medium text-white">
                  {initials}
                </div>
              ))}
            </div>
            <p className="text-xs text-[#8B97B5]">
              Trusted by <span className="text-white font-medium">2,400+</span> students
            </p>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, delay: 0.2 }} className="flex justify-center lg:justify-end">
          <div className="relative w-full max-w-sm">
            <div className="absolute inset-0 -z-10 blur-3xl opacity-30 bg-brand-blue rounded-3xl" />
            <div className="bg-surface-elevated border border-white/10 rounded-2xl overflow-hidden shadow-2xl shadow-black/50">
              <div className="px-5 py-4 border-b border-white/5">
                <p className="text-xs text-[#8B97B5] font-mono uppercase">BIO 201</p>
                <p className="text-sm font-sora font-semibold text-white">Cell Biology</p>
              </div>
              <div className="p-5 space-y-3">
                <p className="text-xs text-[#8B97B5]">Mitochondria are the powerhouse of the cell...</p>
                <div className="space-y-2">
                  {['Summary', 'Quiz', 'Notes'].map((t) => (
                    <div key={t} className="px-3 py-2 rounded-lg bg-surface-base border border-white/5 text-xs text-white">
                      {t}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

function Features() {
  const items = [
    { emoji: '🎙️', title: 'SmartCapture', desc: 'Filters noise. Crystal clear transcripts.' },
    { emoji: '✨', title: 'AI Summary', desc: 'Auto-summarizes your entire lecture.' },
    { emoji: '📝', title: 'Auto Quiz', desc: 'MCQs generated from your notes.' },
    { emoji: '📱', title: 'Offline Access', desc: 'Download everything. Study anywhere.' },
    { emoji: '📅', title: 'Study Planner', desc: 'AI builds your custom schedule.' },
    { emoji: '🎯', title: 'Exam Prep', desc: 'Predicts likely exam topics.' },
  ]

  return (
    <section className="py-24 bg-surface-card/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
          <h2 className="font-sora font-bold text-4xl lg:text-5xl text-white">Everything you need.</h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="bg-surface-elevated border border-white/5 rounded-2xl p-6 hover:border-brand-blue/30 transition-all">
              <div className="text-3xl mb-4">{item.emoji}</div>
              <h3 className="font-sora font-semibold text-white mb-2">{item.title}</h3>
              <p className="text-[#8B97B5] text-sm">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

function Pricing() {
  const plans = [
    { name: 'Free', price: 'KSh 0', tag: 'Get started', cta: 'Start Free' },
    { name: 'Lite', price: 'KSh 25–45', tag: 'Per lecture', cta: 'Pay Per Lecture', highlight: true },
    { name: 'Plus', price: 'KSh 250', tag: 'per month', cta: 'Go Plus' },
    { name: 'Pro', price: 'KSh 450', tag: 'per month', cta: 'Go Pro' },
  ]

  return (
    <section className="py-24 max-w-7xl mx-auto px-4 sm:px-6">
      <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
        <h2 className="font-sora font-bold text-4xl lg:text-5xl text-white">Study smarter. Pay less.</h2>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {plans.map((p, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className={`bg-surface-elevated rounded-2xl p-5 border ${p.highlight ? 'border-brand-blue shadow-xl shadow-brand-blue/20' : 'border-white/5'}`}>
            {p.highlight && <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-medium bg-brand-blue text-white px-3 py-1 rounded-full relative">Most Popular</div>}
            <p className="text-xs text-[#8B97B5] font-mono uppercase">{p.name}</p>
            <p className="font-sora font-bold text-2xl text-white mt-1">{p.price}</p>
            <p className="text-xs text-[#4A5568]">{p.tag}</p>
            <a href="/signup" className={`w-full py-2.5 rounded-xl text-sm font-medium transition-all text-center mt-4 block ${p.highlight ? 'bg-brand-blue text-white hover:bg-brand-blue/90' : 'bg-surface-base border border-white/10 text-white hover:bg-white/5'}`}>
              {p.cta}
            </a>
          </motion.div>
        ))}
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="border-t border-white/5 bg-surface-base py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
        <div className="flex items-center justify-center gap-1 mb-4">
          <span className="font-sora font-bold text-lg text-white">STUDIA</span>
          <sup className="text-brand-blue text-xs font-mono">β</sup>
        </div>
        <p className="text-xs text-[#4A5568]">© 2025 STUDIA. Made for Kenyan students.</p>
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
```

**Commit** → Vercel will redeploy. Say "done" when committed.
