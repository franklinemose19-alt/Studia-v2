import { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Loader, RotateCcw } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface Question {
  question: string
  options: string[]
  correct: number
}

export default function Quiz() {
  const navigate = useNavigate()
  const [notes, setNotes] = useState('')
  const [quizzes, setQuizzes] = useState<Question[]>([])
  const [answers, setAnswers] = useState<number[]>([])
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const generateQuiz = async () => {
    if (!notes.trim()) {
      alert('Please paste your lecture notes')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: notes }),
      })

      const data = await res.json()

      if (data.quizzes && data.quizzes.length > 0) {
        setQuizzes(data.quizzes)
        setAnswers(new Array(data.quizzes.length).fill(-1))
        setSubmitted(false)
      } else {
        alert('Error: ' + (data.error || 'Failed to generate quiz'))
      }
    } catch (err) {
      alert('Error: ' + (err instanceof Error ? err.message : 'Unknown error'))
    } finally {
      setLoading(false)
    }
  }

  const submitQuiz = () => {
    if (answers.some((a) => a === -1)) {
      alert('Please answer all questions')
      return
    }
    setSubmitted(true)
  }

  const calculateScore = () => {
    let correct = 0
    quizzes.forEach((q, i) => {
      if (answers[i] === q.correct) correct++
    })
    return { correct, total: quizzes.length, percentage: Math.round((correct / quizzes.length) * 100) }
  }

  const resetQuiz = () => {
    setQuizzes([])
    setAnswers([])
    setSubmitted(false)
    setNotes('')
  }

  const score = submitted ? calculateScore() : null

  return (
    <div className="min-h-screen bg-surface-base">
      <nav className="border-b border-white/5 bg-surface-elevated/50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-sm text-[#8B97B5] hover:text-white"
          >
            <ArrowLeft size={16} />
            Back
          </button>
          <div className="flex items-center gap-1">
            <span className="font-sora font-bold text-xl text-white">STUDIA</span>
            <sup className="text-brand-blue text-xs">β</sup>
          </div>
          <div className="w-20" />
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
          <div>
            <h1 className="font-sora font-bold text-4xl text-white mb-2">Generate Quiz</h1>
            <p className="text-[#8B97B5]">Paste lecture notes and we'll create MCQs to test your knowledge.</p>
          </div>

          {quizzes.length === 0 ? (
            <div className="bg-surface-elevated border border-white/5 rounded-2xl p-6 space-y-4">
              <label className="block text-sm font-medium text-white">Paste your lecture notes:</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Paste lecture notes here..."
                className="w-full h-64 bg-surface-base border border-white/10 rounded-xl p-4 text-white placeholder-[#4A5568] outline-none focus:border-brand-blue/40 resize-none"
              />
              <button
                onClick={generateQuiz}
                disabled={loading || !notes.trim()}
                className="w-full bg-brand-blue text-white font-medium py-3 rounded-xl hover:bg-brand-blue/90 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Generating Quiz...
                  </>
                ) : (
                  'Generate 5 Questions'
                )}
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {!submitted ? (
                <>
                  {quizzes.map((q, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="bg-surface-elevated border border-white/5 rounded-2xl p-6"
                    >
                      <p className="text-white font-medium mb-4">
                        Q{i + 1}. {q.question}
                      </p>
                      <div className="space-y-2">
                        {q.options.map((option, j) => (
                          <label key={j} className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-surface-base transition-all">
                            <input
                              type="radio"
                              name={`q${i}`}
                              checked={answers[i] === j}
                              onChange={() => {
                                const newAnswers = [...answers]
                                newAnswers[i] = j
                                setAnswers(newAnswers)
                              }}
                              className="w-4 h-4 accent-brand-blue cursor-pointer"
                            />
                            <span className="text-[#8B97B5] text-sm">{option}</span>
                          </label>
                        ))}
                      </div>
                    </motion.div>
                  ))}

                  <button
                    onClick={submitQuiz}
                    className="w-full bg-brand-blue text-white font-medium py-3 rounded-xl hover:bg-brand-blue/90"
                  >
                    Submit Quiz
                  </button>
                </>
              ) : (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="space-y-6"
                >
                  <div className="bg-gradient-to-r from-brand-blue/10 to-brand-blue/5 border border-brand-blue/20 rounded-2xl p-8 text-center">
                    <p className="text-6xl font-bold text-brand-blue mb-2">{score?.percentage}%</p>
                    <p className="text-xl text-white font-sora font-bold mb-1">
                      {score?.correct} out of {score?.total} correct
                    </p>
                    <p className="text-[#8B97B5]">Great effort! Keep studying to improve your score.</p>
                  </div>

                  {quizzes.map((q, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className={`rounded-2xl p-6 border ${answers[i] === q.correct ? 'bg-brand-green/10 border-brand-green/30' : 'bg-red-500/10 border-red-500/30'}`}
                    >
                      <p className="text-white font-medium mb-3">Q{i + 1}. {q.question}</p>
                      <div className="space-y-2">
                        {q.options.map((option, j) => (
                          <div
                            key={j}
                            className={`p-3 rounded-lg text-sm ${
                              j === q.correct
                                ? 'bg-brand-green/20 text-brand-green border border-brand-green/30'
                                : j === answers[i]
                                ? 'bg-red-500/20 text-red-500 border border-red-500/30'
                                : 'bg-surface-base text-[#8B97B5]'
                            }`}
                          >
                            {option}
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  ))}

                  <button
                    onClick={resetQuiz}
                    className="w-full bg-brand-blue text-white font-medium py-3 rounded-xl hover:bg-brand-blue/90 flex items-center justify-center gap-2"
                  >
                    <RotateCcw size={16} />
                    Try Another Quiz
                  </button>
                </motion.div>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}
