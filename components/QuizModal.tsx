'use client'

import { VideoWithLog } from '@/types'
import { X, Sparkles, Check, AlertCircle, Trophy, Target } from 'lucide-react'
import { useState } from 'react'

interface Question {
  question: string
  options: string[]
  correctAnswer: string
}

interface QuizModalProps {
  video: VideoWithLog | null
  onClose: () => void
  onQuizComplete?: (videoId: string) => void
}

const TOTAL_QUESTIONS = 10
const PASS_THRESHOLD = 7

export default function QuizModal({ video, onClose, onQuizComplete }: QuizModalProps) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'playing' | 'finished' | 'error'>('idle')
  const [questions, setQuestions] = useState<Question[]>([])
  const [videoSummary, setVideoSummary] = useState<string>('') // Gemini's video summary
  const [hasTranscript, setHasTranscript] = useState<boolean>(false)
  const [transcriptLength, setTranscriptLength] = useState<number>(0)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [isAnswered, setIsAnswered] = useState(false)
  const [correctCount, setCorrectCount] = useState(0)
  const [errorMessage, setErrorMessage] = useState('')

  if (!video) return null

  const handleGenerate = async () => {
    setStatus('loading')
    setQuestions([])
    setVideoSummary('')
    setCurrentIndex(0)
    setCorrectCount(0)
    setSelectedAnswer(null)
    setIsAnswered(false)
    setErrorMessage('')

    try {
      const res = await fetch('/api/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: video.title,
          channelName: video.channel_name || '',
          youtubeUrl: video.url, // Pass YouTube URL for content analysis
          questionCount: TOTAL_QUESTIONS
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.details || data.error || '퀴즈 생성에 실패했습니다.')
      }

      if (!data.questions || data.questions.length === 0) {
        throw new Error('퀴즈 문제를 가져올 수 없습니다.')
      }

      setQuestions(data.questions)
      setVideoSummary(data.videoSummary || '')
      setHasTranscript(data.hasTranscript || false)
      setTranscriptLength(data.transcriptLength || 0)
      setStatus('playing')
    } catch (error: any) {
      setErrorMessage(error.message || '퀴즈 생성에 실패했습니다.')
      setStatus('error')
    }
  }

  const handleAnswerClick = (option: string) => {
    if (isAnswered) return

    setSelectedAnswer(option)
    setIsAnswered(true)

    const currentQuestion = questions[currentIndex]
    if (option === currentQuestion.correctAnswer) {
      setCorrectCount(prev => prev + 1)
    }
  }

  const handleNextQuestion = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1)
      setSelectedAnswer(null)
      setIsAnswered(false)
    } else {
      setStatus('finished')
    }
  }

  const isPassed = correctCount >= PASS_THRESHOLD
  const currentQuestion = questions[currentIndex]
  const isCorrect = selectedAnswer === currentQuestion?.correctAnswer

  const handleFinish = () => {
    if (isPassed && onQuizComplete) {
      onQuizComplete(video.id)
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-purple-600 to-indigo-600">
          <div className="flex items-center gap-3">
            <Sparkles size={20} className="text-white" />
            <div>
              <h3 className="font-semibold text-white">AI 퀴즈</h3>
              {status === 'playing' && (
                <p className="text-purple-200 text-xs">
                  {currentIndex + 1} / {questions.length} 문제
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {status === 'playing' && (
              <div className="flex items-center gap-1 bg-white/20 px-3 py-1 rounded-full">
                <Target size={14} className="text-white" />
                <span className="text-white text-sm font-medium">{correctCount}점</span>
              </div>
            )}
            <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full transition-colors">
              <X size={20} className="text-white" />
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        {status === 'playing' && (
          <div className="h-1.5 bg-gray-100">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-300"
              style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
            />
          </div>
        )}

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* Video Info */}
          <div className="text-sm text-gray-500 mb-4 p-3 bg-gray-50 rounded-lg">
            <p className="font-medium text-gray-700 truncate">{video.title}</p>
            {video.channel_name && (
              <p className="text-xs text-gray-400 mt-1">채널: {video.channel_name}</p>
            )}
          </div>

          {/* Video Summary from Gemini */}
          {status === 'playing' && (
            <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Sparkles size={14} className="text-blue-500" />
                  <span className="text-xs font-bold text-blue-600">AI 영상 분석 결과</span>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${hasTranscript ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>
                  {hasTranscript ? `✓ 자막 기반 (${transcriptLength.toLocaleString()}자)` : '✗ 제목 기반'}
                </span>
              </div>
              {videoSummary ? (
                <p className="text-sm text-gray-700 leading-relaxed">{videoSummary}</p>
              ) : (
                <p className="text-sm text-gray-500 italic">요약 정보가 없습니다</p>
              )}
            </div>
          )}

          {/* Idle State */}
          {status === 'idle' && (
            <div className="text-center py-8">
              <div className="bg-purple-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Target className="text-purple-600" size={40} />
              </div>
              <h4 className="text-xl font-bold text-gray-800 mb-2">퀴즈 도전!</h4>
              <p className="text-gray-600 mb-2">
                총 <span className="font-bold text-purple-600">{TOTAL_QUESTIONS}문제</span> 중{' '}
                <span className="font-bold text-green-600">{PASS_THRESHOLD}문제</span> 이상 맞히면 통과!
              </p>
              <p className="text-sm text-gray-400 mb-6">
                영상 내용과 관련된 퀴즈를 풀어보세요.
              </p>
              <button
                onClick={handleGenerate}
                className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-8 py-3 rounded-xl font-medium hover:from-purple-700 hover:to-indigo-700 transition-all shadow-lg shadow-purple-200"
              >
                퀴즈 시작하기
              </button>
            </div>
          )}

          {/* Loading State */}
          {status === 'loading' && (
            <div className="text-center py-12 space-y-4">
              <div className="animate-spin w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full mx-auto"></div>
              <p className="text-gray-600 animate-pulse font-medium">AI가 퀴즈를 생성하는 중...</p>
              <p className="text-xs text-gray-400">{TOTAL_QUESTIONS}개의 문제를 준비하고 있습니다</p>
            </div>
          )}

          {/* Error State */}
          {status === 'error' && (
            <div className="text-center py-8">
              <div className="bg-red-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="text-red-500" size={32} />
              </div>
              <p className="text-red-600 font-medium mb-2">퀴즈 생성 실패</p>
              <p className="text-sm text-gray-500 mb-4">{errorMessage}</p>
              <button
                onClick={handleGenerate}
                className="bg-gray-100 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-200 transition-colors"
              >
                다시 시도
              </button>
            </div>
          )}

          {/* Playing State */}
          {status === 'playing' && currentQuestion && (
            <div className="space-y-5 animate-in slide-in-from-right-4 duration-300">
              {/* Question */}
              <div className="bg-gradient-to-r from-purple-50 to-indigo-50 p-5 rounded-xl border border-purple-100">
                <div className="flex items-center gap-2 mb-3">
                  <span className="bg-purple-600 text-white text-xs font-bold px-2 py-1 rounded">
                    Q{currentIndex + 1}
                  </span>
                </div>
                <p className="text-gray-800 font-medium text-lg leading-relaxed">
                  {currentQuestion.question}
                </p>
              </div>

              {/* Options */}
              <div className="space-y-3">
                {currentQuestion.options.map((opt, idx) => {
                  let buttonClass = "border-gray-200 hover:border-purple-300 hover:bg-purple-50"

                  if (isAnswered) {
                    if (opt === currentQuestion.correctAnswer) {
                      buttonClass = "border-green-500 bg-green-50 text-green-900 ring-2 ring-green-500"
                    } else if (opt === selectedAnswer) {
                      buttonClass = "border-red-500 bg-red-50 text-red-900 ring-2 ring-red-500"
                    } else {
                      buttonClass = "opacity-40"
                    }
                  }

                  return (
                    <button
                      key={idx}
                      onClick={() => handleAnswerClick(opt)}
                      disabled={isAnswered}
                      className={`w-full text-left p-4 rounded-xl border-2 transition-all ${buttonClass}`}
                    >
                      <span className="font-bold mr-3 text-gray-400">{String.fromCharCode(65 + idx)}.</span>
                      <span className="text-base">{opt}</span>
                    </button>
                  )
                })}
              </div>

              {/* Answer Feedback */}
              {isAnswered && (
                <div className={`p-4 rounded-xl flex items-center gap-3 border-2 animate-in fade-in ${isCorrect ? 'bg-green-50 text-green-800 border-green-200' : 'bg-red-50 text-red-800 border-red-200'
                  }`}>
                  {isCorrect ? <Check size={20} /> : <AlertCircle size={20} />}
                  <div className="flex-1">
                    <p className="font-bold">{isCorrect ? '정답입니다! 🎉' : '오답입니다'}</p>
                    {!isCorrect && (
                      <p className="text-sm mt-1">정답: <span className="font-semibold">{currentQuestion.correctAnswer}</span></p>
                    )}
                  </div>
                </div>
              )}

              {/* Next Button */}
              {isAnswered && (
                <div className="flex justify-center pt-2">
                  <button
                    onClick={handleNextQuestion}
                    className="bg-purple-600 text-white px-8 py-3 rounded-xl font-medium hover:bg-purple-700 transition-colors shadow-lg shadow-purple-200"
                  >
                    {currentIndex < questions.length - 1 ? '다음 문제' : '결과 보기'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Finished State */}
          {status === 'finished' && (
            <div className="text-center py-8 animate-in zoom-in-95 duration-500">
              <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4 ${isPassed ? 'bg-gradient-to-br from-yellow-400 to-orange-500' : 'bg-gray-200'
                }`}>
                <Trophy size={48} className={isPassed ? 'text-white' : 'text-gray-400'} />
              </div>

              <h4 className={`text-2xl font-bold mb-2 ${isPassed ? 'text-green-600' : 'text-gray-600'}`}>
                {isPassed ? '축하합니다! 🎉' : '아쉬워요!'}
              </h4>

              <div className="text-4xl font-bold mb-4">
                <span className={isPassed ? 'text-green-600' : 'text-red-500'}>{correctCount}</span>
                <span className="text-gray-400 text-xl"> / {questions.length}</span>
              </div>

              <p className={`text-lg mb-6 ${isPassed ? 'text-green-600' : 'text-gray-500'}`}>
                {isPassed
                  ? '퀴즈를 통과했습니다!'
                  : `${PASS_THRESHOLD}문제 이상 맞혀야 통과입니다.`}
              </p>

              <div className="flex gap-3 justify-center">
                {!isPassed && (
                  <button
                    onClick={handleGenerate}
                    className="bg-purple-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-purple-700 transition-colors"
                  >
                    다시 도전
                  </button>
                )}
                <button
                  onClick={handleFinish}
                  className={`px-6 py-3 rounded-xl font-medium transition-colors ${isPassed
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                >
                  {isPassed ? '완료' : '닫기'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
