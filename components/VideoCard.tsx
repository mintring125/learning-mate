'use client'

import { VideoWithLog } from '@/types'
import { Play, Youtube, Sparkles, CheckCircle2, Circle } from 'lucide-react'
import { useState } from 'react'

interface VideoCardProps {
  video: VideoWithLog
  onToggleWatch: (id: string, isWatched: boolean) => Promise<void>
  onPlay: (video: VideoWithLog) => void
}

// Check if video is less than 1 week old based on YouTube publish date
const isNewVideo = (publishedAt?: string): boolean => {
  if (!publishedAt) return false
  const oneWeekAgo = new Date()
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
  return new Date(publishedAt) > oneWeekAgo
}

export default function VideoCard({ video, onToggleWatch, onPlay }: VideoCardProps) {
  const [loading, setLoading] = useState(false)
  const isWatched = video.watch_count > 0
  const isNew = isNewVideo(video.published_at)

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setLoading(true)
    await onToggleWatch(video.id, isWatched)
    setLoading(false)
  }

  return (
    <div
      onClick={() => onPlay(video)}
      className={`relative bg-white rounded-[2rem] border-4 shadow-[0_6px_0_rgba(0,0,0,0.1)] hover:translate-y-1 hover:shadow-[0_3px_0_rgba(0,0,0,0.1)] transition-all overflow-hidden flex flex-col h-full cursor-pointer group ${isWatched
        ? 'border-[#74c74a] shadow-[0_6px_0_#589e36] bg-emerald-50'
        : 'border-[#e6dcc8] shadow-[0_6px_0_#d4c5a9]'
        }`}
    >
      {/* Thumbnail */}
      <div className="relative h-40 bg-[#f0ede6] m-2 rounded-[1.5rem] overflow-hidden border-2 border-[#e6dcc8]">
        {video.thumbnail_url ? (
          <img
            src={video.thumbnail_url}
            alt={video.title}
            className={`w-full h-full object-cover ${isWatched ? 'opacity-80 grayscale-[30%]' : ''}`}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-[#d4c5a9]">
            <Youtube size={40} />
          </div>
        )}

        {/* NEW Badge */}
        {isNew && (
          <div className="absolute top-2 left-2 px-3 py-1 rounded-full text-xs font-black bg-rose-500 text-white flex items-center gap-1 animate-bounce shadow-md border-2 border-white">
            <Sparkles size={12} className="fill-white" />
            NEW
          </div>
        )}

        {/* Watch status badge */}
        <div className={`absolute top-2 right-2 px-3 py-1 rounded-full text-xs font-bold border-2 border-white shadow-md flex items-center gap-1 ${isWatched ? 'bg-[#74c74a] text-white' : 'bg-slate-800/80 text-white'
          }`}>
          {isWatched ? <CheckCircle2 size={12} className="stroke-[3]" /> : null}
          {isWatched ? '완료!' : '미시청'}
        </div>

        {/* Play overlay */}
        <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
          <div className="bg-white/90 p-3 rounded-full shadow-lg transform scale-0 group-hover:scale-110 transition-transform duration-300">
            <Play className="text-[#74c74a] fill-[#74c74a] translate-x-0.5" size={28} />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-5 pb-5 pt-2 flex-1 flex flex-col">
        <h3 className="font-bold text-[#5d4037] line-clamp-2 text-sm mb-4 leading-relaxed" title={video.title}>
          {video.title}
        </h3>

        {/* Stats */}
        <div className="flex items-center justify-between text-xs font-bold text-[#9c826b] mb-4 bg-[#fdfbf7] p-2 rounded-lg border border-[#e6dcc8]">
          <span>{isWatched ? '🌿 시청 완료' : '🍂 시청 전'}</span>
          <span>
            {video.last_watched_at
              ? new Date(video.last_watched_at).toLocaleDateString('ko-KR')
              : '-'}
          </span>
        </div>

        {/* Actions */}
        <div className="mt-auto">
          <button
            onClick={handleToggle}
            disabled={loading}
            className={`w-full flex items-center justify-center gap-1.5 px-3 py-3 rounded-2xl font-black transition-all text-xs border-b-4 active:border-b-0 active:translate-y-1 ${isWatched
              ? 'bg-[#e2f2da] text-[#589e36] border-[#589e36] hover:bg-[#d4edc9]'
              : 'bg-white text-[#9c826b] border-[#e6dcc8] hover:bg-[#fffaeb]'
              }`}
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : isWatched ? (
              <CheckCircle2 size={16} strokeWidth={2.5} />
            ) : (
              <Circle size={16} strokeWidth={2.5} />
            )}
            {isWatched ? '시청완료' : '시청완료로 체크'}
          </button>
        </div>
      </div>
    </div>
  )
}
