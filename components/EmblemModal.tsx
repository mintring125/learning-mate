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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-[#fdfbf7] w-full max-w-lg rounded-[2rem] overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto border-4 border-[#e6dcc8]">
                {/* Header */}
                <div
                    className="p-6 text-white relative"
                    style={{
                        backgroundImage: "url('/assets/theme/wood_texture_dark.png')",
                        backgroundSize: '300px',
                        borderBottom: '4px solid #5d4037'
                    }}
                >
                    <div className="flex items-center justify-between relative z-10">
                        <div className="flex items-center gap-3">
                            <div className="bg-amber-400 p-2 rounded-full border-2 border-white/50 shadow-md">
                                <Trophy size={28} className="text-amber-900" />
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-amber-100 drop-shadow-md" style={{ textShadow: '2px 2px 0 #5d4037' }}>{username}님의 엠블럼</h2>
                                <p className="text-amber-200/80 text-sm font-bold">연속 학습 보상</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-white/20 rounded-full transition-colors"
                        >
                            <X size={28} strokeWidth={3} />
                        </button>
                    </div>
                </div>

                {/* This Week's Progress */}
                <div className="p-6 border-b-4 border-[#e6dcc8] border-dashed">
                    <div className="flex items-center gap-2 mb-4">
                        <Calendar size={20} className="text-[#8b5e3c]" strokeWidth={2.5} />
                        <h3 className="font-black text-[#5d4037] text-lg">이번 주 엠블럼 획득 진행</h3>
                    </div>

                    {/* Weekly Progress Display */}
                    <div className="bg-[#f0ede6] rounded-2xl p-5 mb-4 border-2 border-[#e6dcc8] shadow-inner">
                        <div className="flex justify-between items-center mb-4">
                            {days.map((day, i) => (
                                <div key={day} className="flex flex-col items-center gap-1">
                                    <span className="text-xs font-bold text-[#9c826b]">{day}</span>
                                    <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-all border-2 ${i < weekProgress
                                        ? 'bg-[#74c74a] border-[#589e36] text-white shadow-md'
                                        : 'bg-[#e6dcc8] border-[#d4c5a9] text-[#9c826b]'
                                        }`}>
                                        {i < weekProgress ? (
                                            <Star size={18} className="fill-white" />
                                        ) : (
                                            <span className="text-sm font-bold">{i + 1}</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Progress Bar */}
                        <div className="h-4 bg-[#e6dcc8] rounded-full overflow-hidden border border-[#d4c5a9]">
                            <div
                                className="h-full bg-[repeating-linear-gradient(45deg,#74c74a,#74c74a_8px,#68b642_8px,#68b642_16px)] rounded-full transition-all duration-500"
                                style={{ width: `${(weekProgress / 7) * 100}%` }}
                            />
                        </div>

                        <div className="mt-4 text-center">
                            {hasCurrentWeekEmblem ? (
                                <div className="flex items-center justify-center gap-2 text-[#589e36] font-black bg-[#e2f2da] py-2 rounded-xl">
                                    <Sparkles size={20} className="animate-pulse" />
                                    축하합니다! 엠블럼 획득!
                                </div>
                            ) : (
                                <p className="text-sm text-[#8b5e3c] font-bold">
                                    엠블럼 획득까지 <span className="font-black text-[#74c74a] text-lg mx-1">{daysRemaining}일</span> 남았습니다!
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Current Week Emblem Preview */}
                    <div className="flex items-center justify-center py-2">
                        {loading ? (
                            <div className="w-32 h-32 rounded-2xl bg-gray-100 animate-pulse" />
                        ) : currentWeekEmblem ? (
                            <div className={`relative group ${hasCurrentWeekEmblem ? '' : 'grayscale opacity-70'}`}>
                                <img
                                    src={currentWeekEmblem.path}
                                    alt="Weekly Emblem"
                                    className="w-40 h-40 rounded-[2rem] object-cover shadow-[0_8px_0_rgba(0,0,0,0.1)] border-4 border-white transform group-hover:scale-105 transition-transform duration-300"
                                />
                                {!hasCurrentWeekEmblem && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/10 rounded-[2rem]">
                                        <div className="bg-white/80 p-3 rounded-full backdrop-blur-sm shadow-lg">
                                            <Lock size={32} className="text-[#8b5e3c]" />
                                        </div>
                                    </div>
                                )}
                                {hasCurrentWeekEmblem && (
                                    <div className="absolute -top-3 -right-3 bg-amber-400 rounded-full p-2 shadow-lg animate-bounce border-2 border-white">
                                        <Trophy size={20} className="text-amber-900 fill-amber-900" />
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
                <div className="p-6 bg-[#fdfbf7]">
                    <div className="flex items-center gap-2 mb-4">
                        <Trophy size={20} className="text-amber-500" />
                        <h3 className="font-black text-[#5d4037] text-lg">획득한 엠블럼 ({earnedEmblems.length}개)</h3>
                    </div>

                    {earnedEmblems.length > 0 ? (
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
                            {earnedEmblems.map((date, index) => {
                                const emblemIndex = index % emblems.length
                                const emblem = emblems[emblemIndex]
                                return (
                                    <div key={index} className="relative group cursor-pointer">
                                        <div className="bg-white p-1 rounded-xl shadow-[0_4px_0_rgba(214,204,184,1)] border-2 border-[#e6dcc8] hover:-translate-y-1 transition-transform">
                                            <img
                                                src={emblem?.path || '/img_bonus/BONUS.jpg'}
                                                alt={`Emblem ${date}`}
                                                className="w-full aspect-square rounded-lg object-cover"
                                            />
                                        </div>
                                        <div className="absolute -bottom-6 left-0 right-0 text-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <span className="text-[#8b5e3c] text-[10px] font-bold bg-[#e6dcc8] px-2 py-0.5 rounded-full">{date}</span>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-10 text-[#9c826b] bg-[#f0ede6] rounded-2xl border-2 border-dashed border-[#d4c5a9]">
                            <Trophy size={40} className="mx-auto mb-3 opacity-40" />
                            <p className="font-bold">아직 획득한 엠블럼이 없습니다</p>
                            <p className="text-xs mt-1">7일 연속 학습을 완료해보세요!</p>
                        </div>
                    )}
                </div>

                {/* Available Emblems Preview */}
                {emblems.length > 0 && (
                    <div className="px-6 pb-6 pt-2 bg-[#fdfbf7]">
                        <div className="flex items-center gap-2 mb-3">
                            <Sparkles size={16} className="text-purple-500" />
                            <h4 className="text-sm font-bold text-[#9c826b]">등록된 엠블럼 ({emblems.length}개)</h4>
                        </div>
                        <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide">
                            {emblems.map((emblem, index) => (
                                <div
                                    key={emblem.filename}
                                    className={`flex-shrink-0 w-14 h-14 rounded-xl overflow-hidden border-2 bg-white ${index === currentEmblemIndex ? 'border-amber-400 shadow-[0_0_0_2px_rgba(251,191,36,0.5)] scale-105' : 'border-[#e6dcc8] opacity-70'
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
