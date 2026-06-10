import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, TrendingUp, AlertCircle, CheckCircle, BookOpen, Zap } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface QuizResult {
  id: string
  subject: string
  score: number
  total: number
  date: string
  questions: { topic: string; correct: boolean }[]
}

interface WeakTopic {
  topic: string
  failureRate: number
  attempts: number
  lastAttempt: string
}

export default function AdaptiveLearning() {
  const navigate = useNavigate()
  const [quizResults, setQuizResults] = useState<QuizResult[]>([])
  const [weakTopics, setWeakTopics] = useState<WeakTopic[]>([])
  const [overallScore, setOverallScore] = useState(0)
  const [improvement, setImprovement] = useState(0)

  useEffect(() => {
    // Mock quiz data from localStorage (in real app, this would come from actual quiz takes)
    const mockResults: QuizResult[] = [
      {
        id: '1',
        subject: 'Mathematics',
        score: 7,
        total: 10,
        date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        questions: [
          { topic: 'Calculus', correct: true },
          { topic: 'Calculus', correct: true },
          { topic: 'Algebra', correct: false },
          { topic: 'Algebra', correct: true },
          { topic: 'Geometry', correct: true },
          { topic: 'Calculus', correct: true },
          { topic: 'Algebra', correct: false },
          { topic: 'Trigonometry', correct: true },
          { topic: 'Geometry', correct: true },
          { topic: 'Trigonometry', correct: true },
        ],
      },
      {
        id: '2',
        subject: 'Physics',
        score: 6,
        total: 10,
        date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        questions: [
          { topic: 'Mechanics', correct: true },
          { topic: 'Mechanics', correct: false },
          { topic: 'Thermodynamics', correct: false },
          { topic: 'Thermodynamics', correct: true },
          { topic: 'Optics', correct: true },
          { topic: 'Mechanics', correct: true },
          { topic: 'Thermodynamics', correct: false },
          { topic: 'Waves', correct: true },
          { topic: 'Optics', correct: true },
          { topic: 'Waves', correct: false },
        ],
      },
    ]

    setQuizResults(mockResults)

    // Calculate weak topics
    const topicStats: { [key: string]: { correct: number; total: number; lastAttempt: string } } = {}

    mockResults.forEach((result) => {
      result.questions.forEach((q) => {
        if (!topicStats[q.topic]) {
          topicStats[q.topic] = { correct: 0, total: 0, lastAttempt: result.date }
        }
        topicStats[q.topic].total++
        if (q.correct) topicStats[q.topic].correct++
        topicStats[q.topic].lastAttempt = result.date
      })
    })

    const weak: WeakTopic[] = Object.entries(topicStats)
      .map(([topic, stats]) => ({
        topic,
        failureRate: Math.round(((stats.total - stats.correct) / stats.total) * 100),
        attempts: stats.total,
        lastAttempt: new Date(stats.lastAttempt).toLocaleDateString(),
      }))
      .filter((t) => t.failureRate > 0)
      .sort((a, b) => b.failureRate - a.failureRate)

    setWeakTopics(weak)

    // Calculate overall score
    const totalCorrect = mockResults.reduce((sum, r) => sum + r.score, 0)
    const totalQuestions = mockResults.reduce((sum, r) => sum + r.total, 0)
    const overall = Math.round((totalCorrect / totalQuestions) * 100)
    setOverallScore(overall)

    // Calculate improvement (first quiz vs latest)
    if (mockResults.length > 1) {
      const first = (mockResults[0].score / mockResults[0].total) * 100
      const latest = (mockResults[mockResults.length - 1].score / mockResults[mockResults.length - 1].total) * 100
      setImprovement(Math.round(latest - first))
    }
  }, [])

  const recommendations = weakTopics.slice(0, 3).map((topic) => ({
    topic: topic.topic,
    action: `Focus on ${topic.topic} - ${topic.failureRate}% failure rate`,
    priority: topic.failureRate > 50 ? 'high' : 'medium',
  }))

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-surface-light to-white">
      <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-navy hover:text-indigo-premium transition"
          >
            <ArrowLeft size={20} />
            <span className="font-medium">Back</span>
          </button>
          <div className="flex items-center gap-1">
            <span className="font-sora font-bold text-lg text-navy">STUDIA</span>
            <sup className="text-indigo-premium text-xs">β</sup>
          </div>
          <div className="w-20" />
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
          {/* HEADER */}
          <div>
            <h1 className="font-sora font-bold text-5xl text-navy mb-2">Adaptive Learning</h1>
            <p className="text-gray-600">Your personalized learning insights and recommendations.</p>
          </div>

          {/* PERFORMANCE CARDS */}
          <div className="grid md:grid-cols-3 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl p-6 border border-gray-200"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-lg bg-indigo-premium/10 flex items-center justify-center text-indigo-premium">
                  <CheckCircle size={24} />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Overall Score</p>
                  <p className="font-sora font-bold text-3xl text-navy">{overallScore}%</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-2xl p-6 border border-gray-200"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-lg bg-mint/10 flex items-center justify-center text-mint">
                  <TrendingUp size={24} />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Improvement</p>
                  <p className={`font-sora font-bold text-3xl ${improvement >= 0 ? 'text-mint' : 'text-red-500'}`}>
                    {improvement >= 0 ? '+' : ''}{improvement}%
                  </p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-2xl p-6 border border-gray-200"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-lg bg-warning/10 flex items-center justify-center text-warning">
                  <BookOpen size={24} />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Quizzes Taken</p>
                  <p className="font-sora font-bold text-3xl text-navy">{quizResults.length}</p>
                </div>
              </div>
            </motion.div>
          </div>

          {/* WEAK TOPICS */}
          <div>
            <h2 className="font-sora font-bold text-2xl text-navy mb-6">Topics Needing Focus</h2>
            {weakTopics.length > 0 ? (
              <div className="space-y-3">
                {weakTopics.map((topic, i) => (
                  <motion.div
                    key={topic.topic}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className={`rounded-xl p-4 border ${
                      topic.failureRate > 50
                        ? 'bg-red-50 border-red-200'
                        : topic.failureRate > 25
                        ? 'bg-yellow-50 border-yellow-200'
                        : 'bg-blue-50 border-blue-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-sora font-bold text-navy mb-1">{topic.topic}</p>
                        <p className="text-sm text-gray-600">
                          {topic.attempts} attempts • Last: {topic.lastAttempt}
                        </p>
                      </div>
                      <div className="text-right">
                        <p
                          className={`font-bold text-2xl ${
                            topic.failureRate > 50
                              ? 'text-red-600'
                              : topic.failureRate > 25
                              ? 'text-yellow-600'
                              : 'text-blue-600'
                          }`}
                        >
                          {topic.failureRate}%
                        </p>
                        <p className="text-xs text-gray-500">failure rate</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-xl p-8 border border-gray-200 text-center">
                <CheckCircle className="mx-auto text-mint mb-4" size={40} />
                <p className="text-navy font-semibold mb-2">You're doing great!</p>
                <p className="text-gray-600">No weak topics detected. Keep up the good work!</p>
              </div>
            )}
          </div>

          {/* RECOMMENDATIONS */}
          <div>
            <h2 className="font-sora font-bold text-2xl text-navy mb-6">Study Recommendations</h2>
            <div className="space-y-3">
              {recommendations.length > 0 ? (
                recommendations.map((rec, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className={`rounded-xl p-4 border flex items-start gap-4 ${
                      rec.priority === 'high'
                        ? 'bg-red-50 border-red-200'
                        : 'bg-yellow-50 border-yellow-200'
                    }`}
                  >
                    <AlertCircle
                      className={rec.priority === 'high' ? 'text-red-600' : 'text-yellow-600'}
                      size={24}
                    />
                    <div className="flex-1">
                      <p className="font-sora font-bold text-navy">{rec.action}</p>
                      <p className="text-sm text-gray-600 mt-1">
                        {rec.priority === 'high'
                          ? 'High priority - Review this topic immediately'
                          : 'Medium priority - Schedule revision soon'}
                      </p>
                    </div>
                    <button className="bg-indigo-premium text-white px-4 py-2 rounded-lg hover:bg-purple-premium transition text-sm font-medium whitespace-nowrap">
                      Study Now
                    </button>
                  </motion.div>
                ))
              ) : (
                <div className="bg-white rounded-xl p-8 border border-gray-200 text-center">
                  <Zap className="mx-auto text-indigo-premium mb-4" size={40} />
                  <p className="text-navy font-semibold">No recommendations yet</p>
                </div>
              )}
            </div>
          </div>

          {/* QUIZ HISTORY */}
          <div>
            <h2 className="font-sora font-bold text-2xl text-navy mb-6">Quiz History</h2>
            <div className="space-y-3">
              {quizResults.map((result, i) => (
                <motion.div
                  key={result.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-white rounded-xl p-4 border border-gray-200 hover:border-indigo-premium/50 transition"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-sora font-bold text-navy">{result.subject}</p>
                      <p className="text-sm text-gray-600">{new Date(result.date).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-2xl text-indigo-premium">
                        {Math.round((result.score / result.total) * 100)}%
                      </p>
                      <p className="text-sm text-gray-500">
                        {result.score} / {result.total}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
