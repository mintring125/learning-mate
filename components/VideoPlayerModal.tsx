'use client'

import { VideoWithLog } from '@/types'
import { X, CheckCircle, Circle, HelpCircle, ExternalLink } from 'lucide-react'
import { useState } from 'react'

interface VideoPlayerModalProps {
    video: VideoWithLog
    onClose: () => void
    onComplete: (videoId: string, isWatched: boolean) => void
    onQuiz: (video: VideoWithLog) => void
}

export default function VideoPlayerModal({ video, onClose, onComplete, onQuiz }: VideoPlayerModalProps) {
    const [isWatched, setIsWatched] = useState(video.watch_count > 0)
    const [loading, setLoading] = useState(false)

    const getVideoId = (url: string) => {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/
        const match = url.match(regExp)
        return (match && match[2].length === 11) ? match[2] : null
    }

    const videoId = getVideoId(video.url)

    const handleToggle = async () => {
        setLoading(true)
        onComplete(video.id, isWatched)
        setIsWatched(!isWatched)
        setLoading(false)
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-5xl rounded-2xl overflow-hidden shadow-2xl flex flex-col landscape:flex-row max-h-[95vh] landscape:max-h-[90vh]">
                {/* Header - 세로모드에서만 표시 */}
                <div className="landscape:hidden flex items-center justify-between p-3 sm:p-4 border-b border-gray-100 bg-gray-50">
                    <div className="flex items-center gap-3 min-w-0">
                        <h3 className="font-semibold text-base sm:text-lg text-gray-800 line-clamp-1">{video.title}</h3>
                        {isWatched && (
                            <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full flex-shrink-0">
                                시청완료
                            </span>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-200 rounded-full transition-colors flex-shrink-0"
                    >
                        <X size={24} className="text-gray-500" />
                    </button>
                </div>

                {/* Player Container */}
                <div className="relative bg-black landscape:flex-1 landscape:min-w-0">
                    <div className="relative pt-[56.25%] landscape:pt-0 landscape:h-full">
                        {videoId ? (
                            <iframe
                                className="absolute inset-0 w-full h-full"
                                src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
                                title={video.title}
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                            ></iframe>
                        ) : (
                            <div className="absolute inset-0 flex items-center justify-center text-white">
                                영상을 불러올 수 없습니다
                            </div>
                        )}
                    </div>
                </div>

                {/* Actions - 가로모드에서 오른쪽, 세로모드에서 아래 */}
                <div className="p-4 sm:p-6 bg-white flex flex-col sm:flex-row landscape:flex-col items-center justify-between gap-3 sm:gap-4 landscape:w-48 landscape:justify-start landscape:items-stretch">
                    {/* 가로모드 헤더 (닫기 버튼 + 제목) */}
                    <div className="hidden landscape:flex landscape:flex-col landscape:gap-3 landscape:w-full landscape:mb-2">
                        <button
                            onClick={onClose}
                            className="self-end p-2 hover:bg-gray-200 rounded-full transition-colors"
                        >
                            <X size={20} className="text-gray-500" />
                        </button>
                        <h3 className="font-semibold text-sm text-gray-800 line-clamp-2">{video.title}</h3>
                        {isWatched && (
                            <span className="self-start px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                                시청완료
                            </span>
                        )}
                    </div>

                    <div className="flex gap-3 sm:gap-4 w-full sm:w-auto landscape:flex-col">
                        <button
                            onClick={handleToggle}
                            disabled={loading}
                            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl font-semibold transition-all text-sm sm:text-base ${isWatched
                                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg hover:shadow-blue-500/30'
                                }`}
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            ) : isWatched ? (
                                <CheckCircle size={18} />
                            ) : (
                                <Circle size={18} />
                            )}
                            <span className="landscape:hidden sm:landscape:inline">{isWatched ? '시청완료' : '시청완료로 표시'}</span>
                            <span className="hidden landscape:inline sm:landscape:hidden">{isWatched ? '완료' : '완료표시'}</span>
                        </button>

                        <button
                            onClick={() => onQuiz(video)}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-xl font-semibold transition-colors border border-purple-200 text-sm sm:text-base"
                        >
                            <HelpCircle size={18} />
                            <span className="landscape:hidden sm:landscape:inline">퀴즈 풀기</span>
                            <span className="hidden landscape:inline sm:landscape:hidden">퀴즈</span>
                        </button>
                    </div>

                    <a
                        href={video.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs sm:text-sm text-gray-500 hover:text-gray-900 flex items-center gap-1 hover:underline landscape:mt-auto"
                    >
                        <span className="landscape:hidden">YouTube에서 보기</span>
                        <span className="hidden landscape:inline">YouTube</span>
                        <ExternalLink size={14} />
                    </a>
                </div>
            </div>
        </div>
    )
}
