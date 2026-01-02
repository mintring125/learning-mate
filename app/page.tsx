'use client'

import { useEffect, useState, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import confetti from 'canvas-confetti'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/components/AuthProvider'
import { Video, VideoWithLog } from '@/types'
import VideoCard from '@/components/VideoCard'
import AddVideoForm from '@/components/AddVideoForm'

import VideoPlayerModal from '@/components/VideoPlayerModal'
import { Award, Flame, CalendarCheck, LogOut, UserCircle, TrendingUp, X, Filter, Trophy, Shield, Key, Edit2, GripVertical, Loader2, RefreshCw, Sparkles, Plus } from 'lucide-react'
import { subDays } from 'date-fns'
import EmblemModal, { hasWeeklyEmblem, getCurrentWeekNumber } from '@/components/EmblemModal'
import Link from 'next/link'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

type FilterType = 'all' | 'unwatched' | 'watched'

// SortableChannelTab component for drag-and-drop
interface SortableChannelTabProps {
  channelName: string
  watched: number
  total: number
  isActive: boolean
  onSelect: () => void
  onRename: () => void
  onDelete: () => void
}

function SortableChannelTab({ channelName, watched, total, isActive, onSelect, onRename, onDelete }: SortableChannelTabProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: channelName })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative group"
    >
      <button
        onClick={onSelect}
        className={`px-3 md:px-6 py-2 md:py-3 text-xs md:text-sm font-black rounded-t-xl md:rounded-t-2xl transition-all flex items-center gap-1.5 md:gap-2 border-t-2 md:border-t-4 border-x-2 md:border-x-4 ${isActive
          ? 'bg-[#e6dcc8] border-[#d4c5a9] text-[#5d4037] translate-y-[2px] md:translate-y-[4px]'
          : 'bg-[#fffaeb] border-transparent text-[#9c826b] hover:bg-[#fff0c7]'
          }`}
        style={isActive ? { backgroundImage: "url('/assets/theme/wood_texture_light.png')", backgroundSize: '150px' } : {}}
      >
        {/* Drag Handle */}
        <span
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-[#b09b86] hover:text-[#8b5e3c] touch-none"
        >
          <GripVertical size={14} className="md:w-4 md:h-4" />
        </span>
        <span className="max-w-[80px] md:max-w-[120px] truncate drop-shadow-sm">{channelName}</span>
        <span className={`text-[10px] md:text-xs px-1.5 md:px-2 py-0.5 rounded-full font-bold ${isActive ? 'bg-[#74c74a] text-white shadow-inner' : 'bg-[#e6dcc8] text-[#8b5e3c]'}`}>
          {watched}/{total}
        </span>
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation()
          onRename()
        }}
        onPointerDown={(e) => e.stopPropagation()}
        className="absolute -top-2 right-6 bg-blue-400 text-white p-1 rounded-full shadow-md hover:bg-blue-500 hover:scale-110 transition-all opacity-0 group-hover:opacity-100 z-10"
        title="채널 이름 변경"
      >
        <Edit2 size={12} strokeWidth={3} />
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation()
          onDelete()
        }}
        onPointerDown={(e) => e.stopPropagation()}
        className="absolute -top-2 -right-2 bg-red-400 text-white p-1 rounded-full shadow-md hover:bg-red-500 hover:scale-110 transition-all opacity-0 group-hover:opacity-100 z-10"
        title="채널 삭제"
      >
        <X size={12} strokeWidth={3} />
      </button>
    </div>
  )
}

export default function Home() {
  const { user, loading: authLoading, logout } = useAuth()
  const router = useRouter()
  const [videos, setVideos] = useState<VideoWithLog[]>([])
  const [loading, setLoading] = useState(true)

  const [selectedVideoForPlayer, setSelectedVideoForPlayer] = useState<VideoWithLog | null>(null)
  const [openWithNotes, setOpenWithNotes] = useState(false)
  const [streak, setStreak] = useState(0)
  const [todayWatched, setTodayWatched] = useState(false)
  const [activeChannel, setActiveChannel] = useState<string | null>(null)
  const [filterType, setFilterType] = useState<FilterType>('unwatched')
  const [emblemModalOpen, setEmblemModalOpen] = useState(false)
  const [earnedEmblems, setEarnedEmblems] = useState<string[]>([])
  const [currentWeekEmblem, setCurrentWeekEmblem] = useState<string>('/img_bonus/BONUS.jpg')
  const [showCelebration, setShowCelebration] = useState(false)
  const [showEmblemCelebration, setShowEmblemCelebration] = useState(false)
  const [channelOrder, setChannelOrder] = useState<string[]>([]) // Saved order of channels
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'done'>('idle')
  const [newVideosCount, setNewVideosCount] = useState(0)
  const [showSyncToast, setShowSyncToast] = useState(false)
  const [showAddVideoModal, setShowAddVideoModal] = useState(false)
  const prevTodayWatched = useRef<boolean | null>(null)
  const prevStreak = useRef<number | null>(null)
  const isInitialLoadComplete = useRef(false) // Flag to prevent effects on initial data load

  // dnd-kit sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Auth redirect effect
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  // Data fetching
  const fetchData = async () => {
    try {
      // Fetch ALL videos using pagination (bypass 1000 limit)
      let allVideos: Video[] = []
      let page = 0
      const pageSize = 1000
      let hasMore = true

      while (hasMore) {
        const { data: videosData, error: videoError } = await supabase
          .from('videos')
          .select('*')
          .eq('is_deleted', false)  // Only fetch non-deleted videos
          .order('published_at', { ascending: false, nullsFirst: false })
          .range(page * pageSize, (page + 1) * pageSize - 1)

        if (videoError) throw videoError

        if (videosData && videosData.length > 0) {
          allVideos = [...allVideos, ...videosData]

          // If we got less than pageSize, we're done
          hasMore = videosData.length === pageSize
          page++
        } else {
          hasMore = false
        }
      }

      const { data: logsData, error: logsError } = await supabase
        .from('watch_logs')
        .select('video_id, watched_at')
        .order('watched_at', { ascending: false })

      if (logsError) throw logsError

      const processedVideos: VideoWithLog[] = allVideos.map((video: Video) => {
        const videoLogs = logsData?.filter(log => log.video_id === video.id) || []
        return {
          ...video,
          watch_count: videoLogs.length,
          last_watched_at: videoLogs.length > 0 ? videoLogs[0].watched_at : null
        }
      })

      setVideos(processedVideos)

      // Calculate stats
      if (logsData && logsData.length > 0) {
        const uniqueDates = Array.from(new Set(logsData.map(log => log.watched_at.split('T')[0]))).sort().reverse()
        const today = new Date().toISOString().split('T')[0]
        const hasWatchedToday = uniqueDates.includes(today)
        setTodayWatched(hasWatchedToday)

        let tempStreak = 0
        let loopDate = new Date()
        for (let i = 0; i < 365; i++) {
          const dateStr = loopDate.toISOString().split('T')[0]
          if (uniqueDates.includes(dateStr)) {
            tempStreak++
          } else {
            if (i === 0 && !hasWatchedToday) {
              // continue
            } else {
              break
            }
          }
          loopDate = subDays(loopDate, 1)
        }
        setStreak(tempStreak)
      } else {
        setStreak(0)
        setTodayWatched(false)
      }

    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!user) return
    setLoading(true)

    const init = async () => {
      await fetchData()

      // Fetch current week's emblem
      try {
        const emblemRes = await fetch('/api/emblems')
        const emblemData = await emblemRes.json()
        if (emblemData.emblems && emblemData.emblems.length > 0) {
          const weekNumber = getCurrentWeekNumber()
          const emblemIndex = (weekNumber - 1) % emblemData.emblems.length
          setCurrentWeekEmblem(emblemData.emblems[emblemIndex].path)
        }
      } catch (err) {
        console.error('Failed to fetch emblems', err)
      }

      // Auto-sync channels for new videos
      try {
        setSyncStatus('syncing')
        const syncRes = await fetch('/api/channels/sync', { method: 'POST' })
        const syncData = await syncRes.json()
        setSyncStatus('done')

        if (syncData.newVideos > 0) {
          setNewVideosCount(syncData.newVideos)
          setShowSyncToast(true)
          await fetchData() // Refresh data to show new videos

          // Hide toast after 4 seconds
          setTimeout(() => {
            setShowSyncToast(false)
          }, 4000)
        }
      } catch (err) {
        console.error('Auto-sync failed', err)
        setSyncStatus('idle')
      }

      // Mark initial load as complete - effects should only trigger after this
      isInitialLoadComplete.current = true
    }
    init()
  }, [user])

  // Celebration effect when today's learning is completed
  useEffect(() => {
    // Only trigger after initial load is complete, when todayWatched changes from false to true
    // Also skip if streak is reaching 7 (emblem effect will handle it)
    const willTriggerEmblem = prevStreak.current !== null && prevStreak.current < 7 && streak >= 7

    if (isInitialLoadComplete.current &&
      prevTodayWatched.current === false &&
      todayWatched === true &&
      !willTriggerEmblem) {
      setShowCelebration(true)

      // Fire confetti with leaf-like colors
      const colors = ['#74c74a', '#8dd775', '#68b642', '#a8e0ff', '#ffc107']

      // First burst
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: colors,
        shapes: ['circle', 'square'],
        scalar: 1.2,
      })

      // Second burst after a small delay
      setTimeout(() => {
        confetti({
          particleCount: 50,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: colors,
        })
        confetti({
          particleCount: 50,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: colors,
        })
      }, 250)

      // Hide celebration toast after 3 seconds
      setTimeout(() => {
        setShowCelebration(false)
      }, 3000)
    }
    prevTodayWatched.current = todayWatched
  }, [todayWatched, streak])

  // Emblem celebration effect when 7-day streak is achieved
  useEffect(() => {
    // Only trigger after initial load is complete, when streak changes from below 7 to 7 or above
    if (isInitialLoadComplete.current &&
      prevStreak.current !== null &&
      prevStreak.current < 7 &&
      streak >= 7) {
      setShowEmblemCelebration(true)

      // Fire golden confetti for emblem
      const goldenColors = ['#ffc107', '#ffca28', '#ffd54f', '#ffe082', '#fff176']

      // Multiple bursts for grand celebration
      const fireConfetti = () => {
        confetti({
          particleCount: 150,
          spread: 100,
          origin: { y: 0.5 },
          colors: goldenColors,
          shapes: ['circle', 'square'],
          scalar: 1.5,
        })
      }

      fireConfetti()
      setTimeout(fireConfetti, 300)
      setTimeout(fireConfetti, 600)

      // Side bursts
      setTimeout(() => {
        confetti({
          particleCount: 80,
          angle: 60,
          spread: 80,
          origin: { x: 0, y: 0.6 },
          colors: goldenColors,
        })
        confetti({
          particleCount: 80,
          angle: 120,
          spread: 80,
          origin: { x: 1, y: 0.6 },
          colors: goldenColors,
        })
      }, 400)

      // Hide emblem celebration after 4 seconds
      setTimeout(() => {
        setShowEmblemCelebration(false)
      }, 4000)
    }
    prevStreak.current = streak
  }, [streak])

  // Toggle watch status
  const handleToggleWatch = async (videoId: string, isWatched: boolean) => {
    try {
      if (isWatched) {
        // Remove all watch logs for this video
        const { error } = await supabase.from('watch_logs').delete().eq('video_id', videoId)
        if (error) throw error
      } else {
        // Add a watch log
        const { error } = await supabase.from('watch_logs').insert([{ video_id: videoId }])
        if (error) throw error
      }
      await fetchData()
    } catch (error) {
      console.error('Error toggling watch status:', error)
    }
  }




  // Delete channel and all its videos (soft delete - preserves watch history)
  const handleDeleteChannel = async (channelName: string) => {
    const confirmed = window.confirm(`"${channelName}" 채널을 삭제하시겠습니까?\n\n(시청 기록은 보존되며, 채널을 다시 등록하면 복원됩니다)`)

    if (!confirmed) return

    try {
      setLoading(true)

      // Soft delete: mark videos as deleted instead of actually deleting
      const { error: videoError } = await supabase
        .from('videos')
        .update({ is_deleted: true })
        .eq('channel_name', channelName)

      if (videoError) {
        console.error('Videos soft delete error:', videoError)
        throw new Error('영상 삭제 실패: ' + videoError.message)
      }

      // Delete channel from channels table (search by both name and title)
      const { error: channelError } = await supabase
        .from('channels')
        .delete()
        .or(`name.eq.${channelName},title.eq.${channelName}`)

      if (channelError) {
        console.warn('Channel table delete:', channelError.message)
      }

      // Success!
      alert(`"${channelName}" 채널이 삭제되었습니다.\n(다시 등록하면 시청 기록이 복원됩니다)`)
      await fetchData()

    } catch (error: any) {
      console.error('Error deleting channel:', error)
      alert('❌ 채널 삭제 실패\n\n' + (error?.message || '알 수 없는 오류가 발생했습니다.'))
    } finally {
      setLoading(false)
    }
  }

  // Rename channel
  const handleRenameChannel = async (oldName: string) => {
    const newName = window.prompt(`'${oldName}' 채널의 새로운 이름을 입력하세요:`, oldName)

    if (!newName || newName === oldName) return

    // Check if new name already exists
    if (channelNames.includes(newName)) {
      alert('이미 존재하는 채널 이름입니다.')
      return
    }

    try {
      setLoading(true)

      // 1. Update 'channels' table (update both 'name' and 'title' for compatibility)
      // Search by both 'name' and 'title' to handle legacy data
      const { error: channelError } = await supabase
        .from('channels')
        .update({ title: newName, name: newName })
        .or(`name.eq.${oldName},title.eq.${oldName}`)

      if (channelError) throw channelError

      // 2. Update 'videos' table (if denormalized)
      const { error: videoError } = await supabase
        .from('videos')
        .update({ channel_name: newName })
        .eq('channel_name', oldName)

      if (videoError) throw videoError

      // 3. Update local state
      // We can either refetch or manually update. Refetching is safer for consistency.
      await fetchData()
      setActiveChannel(newName)
      alert('채널 이름이 변경되었습니다.')

    } catch (error: any) {
      console.error('Error renaming channel:', error)
      alert('채널 이름 변경 실패: ' + (error?.message || '알 수 없는 오류'))
    } finally {
      setLoading(false)
    }
  }

  // Group videos by channel
  const channelData = useMemo(() => {
    const grouped = videos.reduce((acc, video) => {
      const channel = video.channel_name || '미분류'
      if (!acc[channel]) acc[channel] = []
      acc[channel].push(video)
      return acc
    }, {} as Record<string, VideoWithLog[]>)
    return grouped
  }, [videos])

  const channelNamesRaw = Object.keys(channelData)

  // Sort channels by saved order (persisted in localStorage)
  const channelNames = useMemo(() => {
    if (channelOrder.length === 0) return channelNamesRaw

    // Sort by saved order, append any new channels at the end
    const ordered = [...channelOrder].filter(name => channelNamesRaw.includes(name))
    const newChannels = channelNamesRaw.filter(name => !channelOrder.includes(name))
    return [...ordered, ...newChannels]
  }, [channelNamesRaw, channelOrder])

  // Load channel order from localStorage on mount
  useEffect(() => {
    const savedOrder = localStorage.getItem('channelOrder')
    if (savedOrder) {
      try {
        setChannelOrder(JSON.parse(savedOrder))
      } catch (e) {
        console.error('Failed to parse channel order', e)
      }
    }
  }, [])

  // Manual sync - refresh button handler
  const handleManualSync = async () => {
    if (syncStatus === 'syncing') return // Prevent double-click

    try {
      setSyncStatus('syncing')
      const syncRes = await fetch('/api/channels/sync', { method: 'POST' })
      const syncData = await syncRes.json()
      setSyncStatus('done')

      if (syncData.newVideos > 0) {
        setNewVideosCount(syncData.newVideos)
        setShowSyncToast(true)
        await fetchData() // Refresh data to show new videos

        // Hide toast after 4 seconds
        setTimeout(() => {
          setShowSyncToast(false)
        }, 4000)
      } else {
        // Show "no new videos" toast briefly
        setNewVideosCount(0)
        setShowSyncToast(true)
        setTimeout(() => {
          setShowSyncToast(false)
        }, 2000)
      }
    } catch (err) {
      console.error('Manual sync failed', err)
      setSyncStatus('idle')
    }
  }

  // Handle drag end - reorder channels
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = channelNames.indexOf(active.id as string)
      const newIndex = channelNames.indexOf(over.id as string)

      const newOrder = arrayMove(channelNames, oldIndex, newIndex)
      setChannelOrder(newOrder)

      // Save to localStorage
      localStorage.setItem('channelOrder', JSON.stringify(newOrder))
    }
  }

  // Set default active channel (or reset to null if no channels)
  useEffect(() => {
    if (channelNames.length > 0 && !activeChannel) {
      setActiveChannel(channelNames[0])
    } else if (channelNames.length === 0 && activeChannel !== null) {
      setActiveChannel(null) // Reset when all channels deleted
    }
  }, [channelNames, activeChannel])

  const currentChannelVideos = activeChannel ? channelData[activeChannel] || [] : videos

  // Apply filter and sort (newest first by YouTube upload date)
  const filteredAndSortedVideos = useMemo(() => {
    let filtered = [...currentChannelVideos]

    // Apply filter
    if (filterType === 'unwatched') {
      filtered = filtered.filter(v => v.watch_count === 0)
    } else if (filterType === 'watched') {
      filtered = filtered.filter(v => v.watch_count > 0)
    }

    // Sort: newest first by published_at (YouTube upload date), fallback to created_at
    filtered.sort((a, b) => {
      const dateA = a.published_at ? new Date(a.published_at).getTime() : new Date(a.created_at).getTime()
      const dateB = b.published_at ? new Date(b.published_at).getTime() : new Date(b.created_at).getTime()
      return dateB - dateA
    })

    return filtered
  }, [currentChannelVideos, filterType])

  const watchedInChannel = currentChannelVideos.filter(v => v.watch_count > 0).length
  const totalInChannel = currentChannelVideos.length
  const progressPercent = totalInChannel > 0 ? Math.round((watchedInChannel / totalInChannel) * 100) : 0

  // Loading/Auth check
  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-[#74c74a] border-t-transparent"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-20 font-sans">
      {/* Header */}
      <header
        className="sticky top-0 z-40 shadow-xl"
        style={{
          backgroundImage: "url('/assets/theme/wood_texture_dark.png')",
          backgroundSize: '300px',
          borderBottom: '4px solid #5d4037'
        }}
      >
        <div className="max-w-6xl 2xl:max-w-[1600px] mx-auto px-2 md:px-4 py-1.5 md:py-0 flex flex-row items-center justify-between gap-2 md:gap-4 md:h-20 h-auto">
          <div className="flex items-center gap-1.5 md:gap-3 shrink-0">
            <div className="bg-amber-400 p-[2px] rounded-full border-2 md:border-4 border-white shadow-lg overflow-hidden w-8 h-8 md:w-16 md:h-16 relative">
              <img src="/assets/theme/teacher_avatar.jpg" className="w-full h-full object-cover rounded-full" alt="Teacher Avatar" />
            </div>
            <h1 className="hidden md:block text-sm md:text-2xl font-black text-amber-100 tracking-wide drop-shadow-[0_2px_2px_rgba(0,0,0,0.5)] whitespace-nowrap" style={{ textShadow: '2px 2px 0 #5d4037' }}>
              형석쌤 공부용 사이트
            </h1>
          </div>

          <div className="flex items-center gap-1.5 md:gap-3 text-sm">
            <div className={`flex items-center gap-1 px-2 md:px-4 py-1 md:py-2 rounded-full transition-all border-2 ${streak > 0 ? 'bg-orange-100 border-orange-400 text-orange-700' : 'bg-gray-100 border-gray-300 text-gray-500'} shadow-md`}>
              <Flame size={14} className={`md:w-4 md:h-4 ${streak > 0 ? "fill-orange-500 text-orange-500" : ""}`} />
              <span className="font-extrabold text-xs md:text-base">{streak}</span>
              <span className="hidden sm:inline text-[10px] md:text-xs font-bold">일 연속</span>
            </div>
            {/* Sync Refresh Button */}
            <button
              onClick={handleManualSync}
              disabled={syncStatus === 'syncing'}
              className={`flex items-center gap-1 px-2 md:px-3 py-1 md:py-2 rounded-full shadow-md transition-all ${syncStatus === 'syncing'
                ? 'bg-blue-100 border-2 border-blue-300 cursor-not-allowed'
                : 'bg-[#fffaeb] border-2 border-[#e6dcc8] hover:bg-white hover:border-blue-400 hover:shadow-lg active:scale-95'
                }`}
              title="새 영상 확인"
            >
              {syncStatus === 'syncing' ? (
                <>
                  <Loader2 size={14} className="animate-spin text-blue-600 md:w-4 md:h-4" />
                  <span className="text-[10px] md:text-xs font-bold text-blue-600 hidden sm:inline">동기화 중...</span>
                </>
              ) : (
                <>
                  <RefreshCw size={14} className="text-[#8b5e3c] md:w-4 md:h-4" />
                  <span className="text-[10px] md:text-xs font-bold text-[#8b5e3c] hidden sm:inline">새 영상 확인</span>
                </>
              )}
            </button>
            {/* Add Video Button */}
            <button
              onClick={() => setShowAddVideoModal(true)}
              className="flex items-center gap-1 px-2 md:px-3 py-1 md:py-2 rounded-full shadow-md transition-all bg-[#74c74a] border-2 border-[#589e36] hover:bg-[#68b642] hover:shadow-lg active:scale-95"
              title="영상 추가"
            >
              <Plus size={14} className="text-white md:w-4 md:h-4" strokeWidth={3} />
              <span className="text-[10px] md:text-xs font-bold text-white hidden sm:inline">영상 추가</span>
            </button>
            <button
              onClick={() => setEmblemModalOpen(true)}
              className="flex items-center gap-1 md:gap-2 bg-[#fffaeb] border-2 border-[#e6dcc8] text-[#8b5e3c] hover:bg-white hover:border-amber-400 hover:text-amber-600 px-2 md:px-4 py-1 md:py-2 rounded-2xl transition-all cursor-pointer shadow-md"
            >
              {hasWeeklyEmblem(streak) && (
                <div className="relative hidden sm:block">
                  <img
                    src="/img_bonus/BONUS.jpg"
                    alt="Weekly Emblem"
                    className="w-5 h-5 md:w-6 md:h-6 rounded-full object-cover border-2 border-amber-400 shadow-sm"
                  />
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full flex items-center justify-center">
                    <Trophy size={6} className="text-yellow-800" />
                  </div>
                </div>
              )}
              <UserCircle size={16} className="text-amber-500 md:w-5 md:h-5" />
              <span className="font-bold text-[10px] md:text-sm max-w-[60px] md:max-w-none truncate">{user.username}</span>
            </button>
            <Link
              href="/change-password"
              className="p-1 md:p-2 text-gray-400 hover:text-amber-500 hover:bg-amber-50 rounded-lg transition-all"
              title="비밀번호 변경"
            >
              <Key size={14} className="md:w-[18px] md:h-[18px]" />
            </Link>
            <button onClick={logout} className="p-1 md:p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all" title="로그아웃">
              <LogOut size={14} className="md:w-[18px] md:h-[18px]" />
            </button>
          </div>
        </div>
      </header>

      {/* Sync Toast */}
      {showSyncToast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 ${newVideosCount > 0 ? 'animate-bounce' : ''}`}>
          <div className={`flex items-center gap-2 px-5 py-3 rounded-full shadow-lg border-2 border-white ${newVideosCount > 0
            ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-green-300/50'
            : 'bg-gradient-to-r from-gray-500 to-gray-600 text-white shadow-gray-300/50'
            }`}>
            {newVideosCount > 0 ? (
              <>
                <Sparkles size={18} className="animate-pulse" />
                <span className="font-bold text-sm md:text-base">
                  🎉 새 영상 {newVideosCount}개가 추가되었습니다!
                </span>
              </>
            ) : (
              <>
                <RefreshCw size={18} />
                <span className="font-bold text-sm md:text-base">
                  새로운 영상이 없습니다
                </span>
              </>
            )}
            <button
              onClick={() => setShowSyncToast(false)}
              className="ml-2 p-1 hover:bg-white/20 rounded-full transition-all"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      <main className="max-w-6xl 2xl:max-w-[1600px] mx-auto px-4 py-4 md:py-8">
        {/* Channel Tabs & Content */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Channel Tabs */}
          {channelNames.length > 0 && (
            <div className="border-b-4 border-[#e6dcc8] overflow-x-auto bg-[#fdfbf7] rounded-t-[2rem] mx-2 md:mx-4 mt-2 md:mt-6 scrollbar-hide">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={channelNames}
                  strategy={horizontalListSortingStrategy}
                >
                  <div className="flex px-2 md:px-4 pt-2 md:pt-4 gap-1 md:gap-2">
                    {channelNames.map((channelName) => {
                      const channelVideos = channelData[channelName]
                      const watched = channelVideos.filter(v => v.watch_count > 0).length
                      const total = channelVideos.length
                      const isActive = activeChannel === channelName

                      return (
                        <SortableChannelTab
                          key={channelName}
                          channelName={channelName}
                          watched={watched}
                          total={total}
                          isActive={isActive}
                          onSelect={() => setActiveChannel(channelName)}
                          onRename={() => handleRenameChannel(channelName)}
                          onDelete={() => handleDeleteChannel(channelName)}
                        />
                      )
                    })}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
          )}

          {/* Progress Bar & Filters */}
          {activeChannel && totalInChannel > 0 && (
            <div className="mx-2 md:mx-4 bg-[#fdfbf7] border-x-4 border-b-4 border-[#e6dcc8] rounded-b-[2rem] p-3 md:p-6 mb-4 md:mb-6 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 md:gap-4 mb-2 md:mb-4">
                {/* Filter Buttons */}
                <div className="flex items-center gap-1 md:gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-hide">
                  <div className="bg-[#e6dcc8] p-1 md:p-1.5 rounded-full text-[#8b5e3c] shrink-0">
                    <Filter size={14} className="md:w-4 md:h-4" />
                  </div>
                  <div className="flex bg-[#e6dcc8]/30 p-1 rounded-full shrink-0">
                    <button
                      onClick={() => setFilterType('all')}
                      className={`px-3 md:px-4 py-1 md:py-1.5 text-[10px] md:text-xs font-bold rounded-full transition-all whitespace-nowrap ${filterType === 'all'
                        ? 'bg-[#74c74a] text-white shadow-md'
                        : 'text-[#8b5e3c] hover:bg-[#e6dcc8]/50'
                        }`}
                    >
                      전체 ({totalInChannel})
                    </button>
                    <button
                      onClick={() => setFilterType('unwatched')}
                      className={`px-3 md:px-4 py-1 md:py-1.5 text-[10px] md:text-xs font-bold rounded-full transition-all whitespace-nowrap ${filterType === 'unwatched'
                        ? 'bg-orange-400 text-white shadow-md'
                        : 'text-[#8b5e3c] hover:bg-[#e6dcc8]/50'
                        }`}
                    >
                      미시청 ({totalInChannel - watchedInChannel})
                    </button>
                    <button
                      onClick={() => setFilterType('watched')}
                      className={`px-3 md:px-4 py-1 md:py-1.5 text-[10px] md:text-xs font-bold rounded-full transition-all whitespace-nowrap ${filterType === 'watched'
                        ? 'bg-[#74c74a] text-white shadow-md'
                        : 'text-[#8b5e3c] hover:bg-[#e6dcc8]/50'
                        }`}
                    >
                      시청 완료 ({watchedInChannel})
                    </button>
                  </div>
                </div>

                {/* Progress Text */}
                <div className="text-right flex items-center justify-end gap-2 md:block">
                  <span className="text-xs md:text-sm font-bold text-[#8b5e3c] mr-2">진행률</span>
                  <span className="text-sm md:text-lg font-black text-[#74c74a]">{progressPercent}%</span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="h-3 md:h-5 bg-[#e6dcc8] rounded-full overflow-hidden p-0.5 md:p-1 shadow-inner">
                <div
                  className="h-full bg-[repeating-linear-gradient(45deg,#74c74a,#74c74a_10px,#68b642_10px,#68b642_20px)] rounded-full transition-all duration-500 ease-out border-2 border-[#86c95c]"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}

          {/* Video Grid */}
          <div className="px-4 pb-8">
            {loading ? (
              <div className="py-16 text-center text-gray-400">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent mx-auto mb-3"></div>
                영상 목록 불러오는 중...
              </div>
            ) : videos.length === 0 ? (
              <div className="py-16 text-center">
                <p className="text-gray-400 text-lg mb-2">📭</p>
                <p className="text-gray-500">등록된 영상이 없습니다.</p>
                <p className="text-sm text-gray-400 mt-1">위에서 영상을 추가해보세요!</p>
              </div>
            ) : filteredAndSortedVideos.length === 0 ? (
              <div className="py-16 text-center text-gray-400">
                {filterType === 'unwatched' ? '미시청 영상이 없습니다. 🎉' :
                  filterType === 'watched' ? '시청한 영상이 없습니다.' :
                    '이 채널에 영상이 없습니다.'}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-5">
                {filteredAndSortedVideos.map(video => (
                  <VideoCard
                    key={video.id}
                    video={video}
                    onToggleWatch={handleToggleWatch}
                    onPlay={(v) => {
                      setOpenWithNotes(false)
                      setSelectedVideoForPlayer(v)
                    }}
                    onOpenWithNotes={(v) => {
                      setOpenWithNotes(true)
                      setSelectedVideoForPlayer(v)
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Modals */}
      {selectedVideoForPlayer && (
        <VideoPlayerModal
          video={selectedVideoForPlayer}
          onClose={() => {
            setSelectedVideoForPlayer(null)
            setOpenWithNotes(false)
          }}
          onComplete={(id, isWatched) => handleToggleWatch(id, isWatched)}
          openWithNotes={openWithNotes}
        />
      )}



      {/* Emblem Gallery Modal */}
      <EmblemModal
        isOpen={emblemModalOpen}
        onClose={() => setEmblemModalOpen(false)}
        streak={streak}
        earnedEmblems={earnedEmblems}
        username={user?.username || 'User'}
        todayWatched={todayWatched}
        totalWatchCount={videos.reduce((acc, curr) => acc + curr.watch_count, 0)}
      />

      {/* Add Video Modal */}
      {showAddVideoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50">
              <h2 className="text-lg font-bold text-gray-800">영상 추가</h2>
              <button
                onClick={() => setShowAddVideoModal(false)}
                className="p-2 hover:bg-gray-200 rounded-full transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            <div className="p-4">
              <AddVideoForm onVideoAdded={() => {
                fetchData()
                setShowAddVideoModal(false)
              }} />
            </div>
          </div>
        </div>
      )}

      {/* Celebration Toast */}
      {showCelebration && (
        <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-50">
          <div className="animate-bounce bg-gradient-to-r from-emerald-500 to-green-400 text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-4 border-4 border-white">
            <div className="bg-white/20 p-3 rounded-full">
              <CalendarCheck size={32} className="text-white" />
            </div>
            <div>
              <p className="text-2xl font-black drop-shadow-md">오늘의 학습 완료! 🎉</p>
              <p className="text-sm opacity-90 font-bold">수고했어요! 내일도 화이팅!</p>
            </div>
          </div>
        </div>
      )}

      {/* Emblem Celebration Modal */}
      {showEmblemCelebration && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="flex flex-col items-center gap-6 animate-in zoom-in-95 duration-500">
            {/* Glowing ring effect */}
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 blur-xl opacity-75 animate-pulse scale-110"></div>
              <div className="relative bg-gradient-to-br from-amber-100 to-amber-50 p-3 rounded-full border-8 border-amber-400 shadow-2xl">
                <img
                  src={currentWeekEmblem}
                  alt="Weekly Emblem"
                  className="w-48 h-48 md:w-64 md:h-64 rounded-full object-cover shadow-inner"
                />
              </div>
              {/* Trophy badge */}
              <div className="absolute -bottom-2 -right-2 bg-amber-500 p-3 rounded-full shadow-lg border-4 border-white animate-bounce">
                <Trophy size={28} className="text-white fill-white" />
              </div>
            </div>

            {/* Text */}
            <div className="text-center">
              <p className="text-4xl md:text-5xl font-black text-white drop-shadow-lg mb-2">
                🏆 엠블럼 획득! 🏆
              </p>
              <p className="text-xl text-amber-200 font-bold">
                7일 연속 학습 달성!
              </p>
              <p className="text-lg text-white/80 mt-2">
                대단해요! 계속 이 기세를 유지해봐요!
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}