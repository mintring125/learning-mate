'use client'

import { VideoWithLog } from '@/types'
import { Play, Youtube, Sparkles, CheckCircle2, Circle, StickyNote } from 'lucide-react'
import { useState } from 'react'

interface VideoCardProps {
  video: VideoWithLog
  onToggleWatch: (id: string, isWatched: boolean) => Promise<void>
  onPlay: (video: VideoWithLog) => void
  onOpenWithNotes?: (video: VideoWithLog) => void
}

// Check if video is less than 1 week old based on YouTube publish date
const isNewVideo = (publishedAt?: string): boolean => {
  if (!publishedAt) return false
  const oneWeekAgo = new Date()
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
  return new Date(publishedAt) > oneWeekAgo
}

export default function VideoCard({ video, onToggleWatch, onPlay, onOpenWithNotes }: VideoCardProps) {
  const [loading, setLoading] = useState(false)
  const isWatched = video.watch_count > 0
  const isNew = isNewVideo(video.published_at)

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setLoading(true)
    await onToggleWatch(video.id, isWatched)
    setLoading(false)
  }

  const handleOpenNotes = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onOpenWithNotes) {
      onOpenWithNotes(video)
    }
  }

  return (
    <div
      onClick={() => onPlay(video)}
      className={`relative bg-white rounded-xl border hover:shadow-md transition-all overflow-hidden flex flex-col h-full cursor-pointer group ${isWatched
        ? 'border-emerald-200 bg-emerald-50/30'
        : 'border-slate-200'
        }`}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video bg-slate-100 overflow-hidden">
        {video.thumbnail_url ? (
          <img
            src={video.thumbnail_url}
            alt={video.title}
            className={`w-full h-full object-cover ${isWatched ? 'opacity-75' : ''}`}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-slate-300">
            <Youtube size={40} />
          </div>
        )}

        {/* NEW Badge */}
        {isNew && (
          <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500 text-white flex items-center gap-1">
            <Sparkles size={10} />
            NEW
          </div>
        )}

        {/* Watch status badge */}
        {isWatched && (
          <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500 text-white flex items-center gap-1">
            <CheckCircle2 size={10} />
            완료
          </div>
        )}

        {/* Play overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
          <div className="bg-white p-3 rounded-full shadow-lg transform scale-0 group-hover:scale-100 transition-transform duration-200">
            <Play className="text-emerald-500 fill-emerald-500 translate-x-0.5" size={24} />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 flex-1 flex flex-col">
        <h3 className="font-medium text-slate-800 line-clamp-2 text-sm mb-3 leading-snug" title={video.title}>
          {video.title}
        </h3>

        {/* Stats */}
        <div className="flex items-center justify-between text-xs text-slate-500 mb-3">
          <span className={isWatched ? 'text-emerald-600' : ''}>{isWatched ? '시청 완료' : '미시청'}</span>
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
            className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg font-medium transition-all text-xs ${isWatched
              ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
          >
            {loading ? (
              <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : isWatched ? (
              <CheckCircle2 size={14} />
            ) : (
              <Circle size={14} />
            )}
            {isWatched ? '완료' : '체크'}
          </button>
          <button
            onClick={handleOpenNotes}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg font-medium transition-all text-xs bg-amber-50 text-amber-700 hover:bg-amber-100"
          >
            <StickyNote size={14} />
            메모
          </button>
        </div>
      </div>
    </div>
  )
}

