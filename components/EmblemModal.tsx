'use client'

import { useState, useEffect } from 'react'
import { X, Trophy, Lock, Star, Calendar, Sparkles } from 'lucide-react'

interface EmblemType {
    filename: string
    path: string
    createdAt: string
    modifiedAt: string
}

interface EmblemModalProps {
    isOpen: boolean
    onClose: () => void
    streak: number
    earnedEmblems: string[] // List of earned emblem dates (week end dates)
    username: string
}

// Check if user has earned 7-day streak emblem for current week
export const hasWeeklyEmblem = (streak: number): boolean => {
    return streak >= 7
}

// Get current week progress (days completed out of 7)
export const getWeekProgress = (streak: number): number => {
    return Math.min(streak, 7)
}

// Get current week number of the year
export const getCurrentWeekNumber = (): number => {
    const now = new Date()
    const start = new Date(now.getFullYear(), 0, 1)
    const diff = now.getTime() - start.getTime()
    const oneWeek = 604800000
    return Math.ceil(diff / oneWeek)
}

export default function EmblemModal({ isOpen, onClose, streak, earnedEmblems, username }: EmblemModalProps) {
    const [emblems, setEmblems] = useState<EmblemType[]>([])
    const [loading, setLoading] = useState(true)

    // Fetch emblems on mount
    useEffect(() => {
        const fetchEmblems = async () => {
            try {
                const res = await fetch('/api/emblems')
                const data = await res.json()
                if (data.emblems) {
                    setEmblems(data.emblems)
                }
            } catch (error) {
                console.error('Error fetching emblems:', error)
            } finally {
                setLoading(false)
            }
        }
        if (isOpen) {
            fetchEmblems()
        }
    }, [isOpen])

    if (!isOpen) return null

    const weekProgress = getWeekProgress(streak)
    const hasCurrentWeekEmblem = hasWeeklyEmblem(streak)
    const daysRemaining = Math.max(0, 7 - streak)

    // Get current week's emblem (based on week number, cycling through available emblems)
    const currentWeekNumber = getCurrentWeekNumber()
    const currentEmblemIndex = emblems.length > 0 ? (currentWeekNumber - 1) % emblems.length : 0
    const currentWeekEmblem = emblems[currentEmblemIndex]

    // Days of the week for visual display
    const days = ['월', '화', '수', '목', '금', '토', '일']

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-6 text-white">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Trophy size={28} />
                            <div>
                                <h2 className="text-xl font-bold">{username}님의 엠블럼</h2>
                                <p className="text-amber-100 text-sm">연속 학습 보상</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-white/20 rounded-full transition-colors"
                        >
                            <X size={24} />
                        </button>
                    </div>
                </div>

                {/* This Week's Progress */}
                <div className="p-6 border-b border-gray-100">
                    <div className="flex items-center gap-2 mb-4">
                        <Calendar size={18} className="text-blue-500" />
                        <h3 className="font-semibold text-gray-800">이번 주 엠블럼 획득 진행</h3>
                    </div>

                    {/* Weekly Progress Display */}
                    <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 mb-4">
                        <div className="flex justify-between items-center mb-3">
                            {days.map((day, i) => (
                                <div key={day} className="flex flex-col items-center">
                                    <span className="text-xs text-gray-500 mb-1">{day}</span>
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${i < weekProgress
                                            ? 'bg-gradient-to-br from-green-400 to-green-600 text-white shadow-lg shadow-green-200'
                                            : 'bg-gray-200 text-gray-400'
                                        }`}>
                                        {i < weekProgress ? (
                                            <Star size={16} className="fill-white" />
                                        ) : (
                                            <span className="text-xs">{i + 1}</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Progress Bar */}
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-green-400 to-emerald-500 rounded-full transition-all duration-500"
                                style={{ width: `${(weekProgress / 7) * 100}%` }}
                            />
                        </div>

                        <div className="mt-3 text-center">
                            {hasCurrentWeekEmblem ? (
                                <div className="flex items-center justify-center gap-2 text-green-600 font-semibold">
                                    <Sparkles size={18} className="animate-pulse" />
                                    축하합니다! 이번 주 엠블럼을 획득했습니다!
                                </div>
                            ) : (
                                <p className="text-sm text-gray-600">
                                    엠블럼 획득까지 <span className="font-bold text-blue-600">{daysRemaining}일</span> 남았습니다!
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Current Week Emblem Preview */}
                    <div className="flex items-center justify-center">
                        {loading ? (
                            <div className="w-32 h-32 rounded-2xl bg-gray-100 animate-pulse" />
                        ) : currentWeekEmblem ? (
                            <div className={`relative ${hasCurrentWeekEmblem ? '' : 'grayscale opacity-60'}`}>
                                <img
                                    src={currentWeekEmblem.path}
                                    alt="Weekly Emblem"
                                    className="w-32 h-32 rounded-2xl object-cover shadow-lg"
                                />
                                {!hasCurrentWeekEmblem && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-2xl">
                                        <Lock size={32} className="text-white" />
                                    </div>
                                )}
                                {hasCurrentWeekEmblem && (
                                    <div className="absolute -top-2 -right-2 bg-yellow-400 rounded-full p-1.5 shadow-lg animate-bounce">
                                        <Trophy size={16} className="text-yellow-800" />
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="w-32 h-32 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-400">
                                <Trophy size={40} />
                            </div>
                        )}
                    </div>
                </div>

                {/* Earned Emblems Gallery */}
                <div className="p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <Trophy size={18} className="text-amber-500" />
                        <h3 className="font-semibold text-gray-800">획득한 엠블럼 ({earnedEmblems.length}개)</h3>
                    </div>

                    {earnedEmblems.length > 0 ? (
                        <div className="grid grid-cols-4 gap-3">
                            {earnedEmblems.map((date, index) => {
                                const emblemIndex = index % emblems.length
                                const emblem = emblems[emblemIndex]
                                return (
                                    <div key={index} className="relative group">
                                        <img
                                            src={emblem?.path || '/img_bonus/BONUS.jpg'}
                                            alt={`Emblem ${date}`}
                                            className="w-full aspect-square rounded-xl object-cover shadow-md group-hover:scale-105 transition-transform"
                                        />
                                        <div className="absolute bottom-1 left-1 right-1 bg-black/60 rounded-lg px-1 py-0.5 text-center">
                                            <span className="text-white text-[10px]">{date}</span>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-gray-400">
                            <Trophy size={40} className="mx-auto mb-2 opacity-30" />
                            <p>아직 획득한 엠블럼이 없습니다</p>
                            <p className="text-sm">7일 연속 학습을 완료해보세요!</p>
                        </div>
                    )}
                </div>

                {/* Available Emblems Preview */}
                {emblems.length > 0 && (
                    <div className="px-6 pb-6">
                        <div className="flex items-center gap-2 mb-3">
                            <Sparkles size={16} className="text-purple-500" />
                            <h4 className="text-sm font-medium text-gray-600">등록된 엠블럼 ({emblems.length}개)</h4>
                        </div>
                        <div className="flex gap-2 overflow-x-auto pb-2">
                            {emblems.map((emblem, index) => (
                                <div
                                    key={emblem.filename}
                                    className={`flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden border-2 ${index === currentEmblemIndex ? 'border-amber-400 shadow-lg' : 'border-gray-200'
                                        }`}
                                >
                                    <img
                                        src={emblem.path}
                                        alt={emblem.filename}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
