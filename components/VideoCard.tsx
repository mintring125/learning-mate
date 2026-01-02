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
      className={`relative bg-white rounded-3xl transition-all duration-300 overflow-hidden flex flex-col h-full cursor-pointer group hover:-translate-y-1 ${isWatched
        ? 'shadow-none bg-[#f2f7f4] border border-[#e6f0ea]'
        : 'shadow-[0_4px_20px_-2px_rgba(92,81,70,0.08)] hover:shadow-[0_12px_30px_-5px_rgba(92,81,70,0.1)] border border-transparent'
        }`}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video bg-[#f7f5f0] overflow-hidden m-2 rounded-2xl">
        {video.thumbnail_url ? (
          <img
            src={video.thumbnail_url}
            alt={video.title}
            className={`w-full h-full object-cover transition-all duration-500 group-hover:scale-105 ${isWatched ? 'opacity-60 saturate-50' : ''}`}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-[#e8e4db]">
            <Youtube size={40} />
          </div>
        )}

        {/* NEW Badge */}
        {isNew && (
          <div className="absolute top-2 left-2 px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#eebb76] text-white flex items-center gap-1 shadow-sm">
            <Sparkles size={10} className="fill-white" />
            NEW
          </div>
        )}

        {/* Watch status badge */}
        {isWatched && (
          <div className="absolute top-2 right-2 px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#6b9e78] text-white flex items-center gap-1 shadow-sm">
            <CheckCircle2 size={10} strokeWidth={3} />
            완료
          </div>
        )}

        {/* Play overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
          <div className="bg-white/90 backdrop-blur-sm p-3.5 rounded-full shadow-lg transform scale-90 opacity-0 group-hover:opacity-100 group-hover:scale-100 transition-all duration-300">
            <Play className="text-[#6b9e78] fill-[#6b9e78] translate-x-0.5" size={24} />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-5 pb-5 pt-1 flex-1 flex flex-col">
        <h3 className={`font-bold text-sm mb-3 leading-relaxed transition-colors line-clamp-2 ${isWatched ? 'text-[#8c8c8c]' : 'text-[#4a4a4a] group-hover:text-[#6b9e78]'}`} title={video.title}>
          {video.title}
        </h3>

        {/* Stats */}
        <div className="flex items-center justify-between text-xs mb-4">
          <span className={`px-2 py-0.5 rounded-md font-medium ${isWatched ? 'bg-[#e6f0ea] text-[#6b9e78]' : 'bg-[#f7f5f0] text-[#8c8c8c]'}`}>
            {isWatched ? '시청 완료' : '미시청'}
          </span>
          <span className="text-[#8c8c8c]">
            {video.last_watched_at
              ? new Date(video.last_watched_at).toLocaleDateString('ko-KR')
              : ''}
          </span>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-2 mt-auto">
          <button
            onClick={handleToggle}
            disabled={loading}
            className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-2xl font-bold transition-all text-xs ${isWatched
              ? 'bg-[#e6f0ea] text-[#6b9e78] hover:bg-[#d9e6de]'
              : 'bg-[#f7f5f0] text-[#8c8c8c] hover:bg-[#e8e4db] hover:text-[#4a4a4a]'
              }`}
          >
            {loading ? (
              <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : isWatched ? (
              <CheckCircle2 size={16} strokeWidth={2.5} />
            ) : (
              <Circle size={16} strokeWidth={2.5} />
            )}
            {isWatched ? '완료' : '체크'}
          </button>
          <button
            onClick={handleOpenNotes}
            className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-2xl font-bold transition-all text-xs bg-[#fff8eb] text-[#eebb76] hover:bg-[#ffeac7]"
          >
            <StickyNote size={16} strokeWidth={2.5} />
            메모
          </button>
        </div>
      </div>
    </div>
  )
}

