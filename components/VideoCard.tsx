'use client'

import { VideoWithLog } from '@/types'
import { Play, Youtube, BrainCircuit, Sparkles, CheckCircle2, Circle, Trophy } from 'lucide-react'
import { useState } from 'react'

interface VideoCardProps {
  video: VideoWithLog
  onToggleWatch: (id: string, isWatched: boolean) => Promise<void>
  onQuiz: (video: VideoWithLog) => void
  onPlay: (video: VideoWithLog) => void
}

// Check if video is less than 1 week old based on YouTube publish date
const isNewVideo = (publishedAt?: string): boolean => {
  if (!publishedAt) return false
  const oneWeekAgo = new Date()
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
  return new Date(publishedAt) > oneWeekAgo
}

export default function VideoCard({ video, onToggleWatch, onQuiz, onPlay }: VideoCardProps) {
  const [loading, setLoading] = useState(false)
  const isWatched = video.watch_count > 0
  const isNew = isNewVideo(video.published_at)
  const isQuizCompleted = video.quiz_completed === true

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setLoading(true)
    await onToggleWatch(video.id, isWatched)
    setLoading(false)
  }

  return (
    <div
      onClick={() => onPlay(video)}
      className={`bg-white rounded-xl border shadow-sm hover:shadow-lg transition-all overflow-hidden flex flex-col h-full cursor-pointer group ${isWatched ? 'border-green-200 bg-green-50/30' : 'border-gray-200'
        }`}
    >
      {/* Thumbnail */}
      <div className="relative h-36 bg-gray-100">
        {video.thumbnail_url ? (
          <img
            src={video.thumbnail_url}
            alt={video.title}
            className={`w-full h-full object-cover ${isWatched ? 'opacity-80' : ''}`}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-300">
            <Youtube size={40} />
          </div>
        )}

        {/* NEW Badge */}
        {isNew && (
          <div className="absolute top-2 left-2 px-2 py-1 rounded-full text-xs font-bold bg-red-500 text-white flex items-center gap-1 animate-pulse">
            <Sparkles size={10} />
            NEW
          </div>
        )}

        {/* Watch status badge */}
        <div className={`absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-medium ${isWatched ? 'bg-green-500 text-white' : 'bg-gray-800/70 text-white'
          }`}>
          {isWatched ? '✓ 시청완료' : '미시청'}
        </div>

        {/* Play overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
          <Play className="text-white drop-shadow-lg fill-white" size={44} />
        </div>
      </div>

      {/* Content */}
      <div className="p-4 flex-1 flex flex-col">
        <h3 className="font-semibold text-gray-800 line-clamp-2 text-sm mb-3" title={video.title}>
          {video.title}
        </h3>

        {/* Stats */}
        <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
          <span>{isWatched ? '시청 완료' : '아직 시청하지 않음'}</span>
          <span>
            {video.last_watched_at
              ? new Date(video.last_watched_at).toLocaleDateString('ko-KR')
              : '-'}
          </span>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-2 mt-auto">
          <button
            onClick={handleToggle}
            disabled={loading}
            className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg font-medium transition-all text-xs ${isWatched
              ? 'bg-green-100 text-green-700 hover:bg-green-200'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : isWatched ? (
              <CheckCircle2 size={14} />
            ) : (
              <Circle size={14} />
            )}
            {isWatched ? '시청완료' : '미시청'}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onQuiz(video)
            }}
            className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg font-medium transition-all text-xs ${isQuizCompleted
              ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
              : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
              }`}
          >
            {isQuizCompleted ? (
              <>
                <Trophy size={14} />
                퀴즈완료
              </>
            ) : (
              <>
                <BrainCircuit size={14} />
                퀴즈
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
