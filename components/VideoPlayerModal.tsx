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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-4xl rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50">
                    <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-lg text-gray-800 line-clamp-1">{video.title}</h3>
                        {isWatched && (
                            <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                                시청완료
                            </span>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-200 rounded-full transition-colors"
                    >
                        <X size={24} className="text-gray-500" />
                    </button>
                </div>

                {/* Player Container */}
                <div className="relative pt-[56.25%] bg-black">
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

                {/* Actions */}
                <div className="p-6 bg-white flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex gap-4 w-full sm:w-auto">
                        <button
                            onClick={handleToggle}
                            disabled={loading}
                            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all ${isWatched
                                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                    : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg hover:shadow-blue-500/30'
                                }`}
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            ) : isWatched ? (
                                <CheckCircle size={20} />
                            ) : (
                                <Circle size={20} />
                            )}
                            {isWatched ? '시청완료' : '시청완료로 표시'}
                        </button>

                        <button
                            onClick={() => onQuiz(video)}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-xl font-semibold transition-colors border border-purple-200"
                        >
                            <HelpCircle size={20} />
                            퀴즈 풀기
                        </button>
                    </div>

                    <a
                        href={video.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-gray-500 hover:text-gray-900 flex items-center gap-1 hover:underline"
                    >
                        YouTube에서 보기 <ExternalLink size={14} />
                    </a>
                </div>
            </div>
        </div>
    )
}
