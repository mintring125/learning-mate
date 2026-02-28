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
import { Flame, CalendarCheck, LogOut, UserCircle, X, Trophy, Key, Edit2, GripVertical, Loader2, RefreshCw, Sparkles, Plus, Star } from 'lucide-react'
import { subDays } from 'date-fns'
import EmblemModal, { getCurrentWeekNumber } from '@/components/EmblemModal'
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

type FilterType = 'all' | 'unwatched' | 'watched' | 'favorite'
const normalizeChannelKey = (name: string) => name.trim().toLowerCase()
const getErrorMessage = (error: unknown) => error instanceof Error ? error.message : '알 수 없는 오류'

// SortableChannelTab component for drag-and-drop
interface SortableChannelTabProps {
  channelName: string
  avatarUrl?: string
  watched: number
  total: number
  isActive: boolean
  onSelect: () => void
  onRename: () => void
  onDelete: () => void
  enableLongPressMenu?: boolean
  showMobileMenu?: boolean
  canMoveLeft?: boolean
  canMoveRight?: boolean
  onLongPressMenu?: () => void
  onMoveLeft?: () => void
  onMoveRight?: () => void
}

function SortableChannelTab({
  channelName,
  avatarUrl,
  watched,
  total,
  isActive,
  onSelect,
  onRename,
  onDelete,
  enableLongPressMenu = false,
  showMobileMenu = false,
  canMoveLeft = false,
  canMoveRight = false,
  onLongPressMenu,
  onMoveLeft,
  onMoveRight,
}: SortableChannelTabProps) {
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

  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPressTriggeredRef = useRef(false)

  const clearLongPressTimer = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
  }

  const handlePointerDown = () => {
    if (!enableLongPressMenu || !onLongPressMenu) return
    longPressTriggeredRef.current = false
    clearLongPressTimer()
    longPressTimerRef.current = setTimeout(() => {
      longPressTriggeredRef.current = true
      onLongPressMenu()
    }, 450)
  }

  const handlePointerUp = () => {
    clearLongPressTimer()
  }

  const handleSelectClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (longPressTriggeredRef.current) {
      e.preventDefault()
      e.stopPropagation()
      longPressTriggeredRef.current = false
      return
    }
    onSelect()
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative group"
    >
      <button
        onClick={handleSelectClick}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onContextMenu={(e) => e.preventDefault()}
        title={channelName}
        className={`w-12 h-12 md:w-auto md:h-auto md:px-4 md:py-2 text-sm font-bold rounded-2xl transition-all flex items-center justify-center md:justify-start gap-2 select-none ${isActive
          ? 'bg-[var(--surface)] text-[var(--foreground)] shadow-[var(--shadow-soft)] ring-1 ring-[var(--border)]'
          : 'text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--accent-light)]'
          }`}
        style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none', userSelect: 'none' }}
        aria-label={`${channelName} 채널 선택`}
      >
        {/* Drag Handle */}
        <span
          {...attributes}
          {...listeners}
          className={`hidden md:inline-flex cursor-grab active:cursor-grabbing touch-none ${isActive ? 'text-[var(--accent)]' : 'text-[var(--border)] hover:text-[#c4c0b6]'}`}
        >
          <GripVertical size={14} strokeWidth={2.5} />
        </span>
        <div className="w-8 h-8 md:w-6 md:h-6 rounded-full overflow-hidden bg-[var(--background-subtle)] border border-[var(--border)] shrink-0 flex items-center justify-center">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={`${channelName} avatar`}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <span className="text-[10px] font-bold text-[var(--foreground-muted)]">
              {channelName.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <span className="hidden md:inline max-w-[72px] md:max-w-[110px] truncate">{channelName}</span>
        <span className={`hidden md:inline text-[10px] px-2 py-0.5 rounded-full font-bold ${isActive ? 'bg-[var(--primary-light)] text-[var(--primary)]' : 'bg-[var(--background-subtle)] text-[var(--foreground-muted)]'}`}>
          {watched}/{total}
        </span>
      </button>
      {showMobileMenu && (
        <div className="md:hidden absolute top-full mt-1 left-0 z-20 bg-white border border-[var(--border)] rounded-xl shadow-lg p-1.5 flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onMoveLeft?.()
            }}
            disabled={!canMoveLeft}
            className="px-2 py-1 rounded-lg text-xs font-semibold bg-[var(--background-subtle)] text-[var(--foreground)] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            ← 이동
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onMoveRight?.()
            }}
            disabled={!canMoveRight}
            className="px-2 py-1 rounded-lg text-xs font-semibold bg-[var(--background-subtle)] text-[var(--foreground)] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            이동 →
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
            }}
            className="px-2 py-1 rounded-lg text-xs font-semibold bg-[#ffefef] text-[#d35a5a]"
          >
            삭제
          </button>
        </div>
      )}
      <button
        onClick={(e) => {
          e.stopPropagation()
          onRename()
        }}
        onPointerDown={(e) => e.stopPropagation()}
        className="hidden md:block absolute -top-1 right-5 bg-[#7aa2bd] text-white p-1 rounded-full shadow-sm hover:bg-[#6891ac] transition-all opacity-0 group-hover:opacity-100 z-10"
        title="채널 이름 변경"
      >
        <Edit2 size={10} strokeWidth={2.5} />
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation()
          onDelete()
        }}
        onPointerDown={(e) => e.stopPropagation()}
        className="hidden md:block absolute -top-1 -right-1 bg-[#ff8c8c] text-white p-1 rounded-full shadow-sm hover:bg-[#ff7575] transition-all opacity-0 group-hover:opacity-100 z-10"
        title="채널 삭제"
      >
        <X size={10} strokeWidth={2.5} />
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
  const [earnedEmblems] = useState<string[]>([])
  const [currentWeekEmblem, setCurrentWeekEmblem] = useState<string>('/img_bonus/BONUS.jpg')
  const [showCelebration, setShowCelebration] = useState(false)
  const [showEmblemCelebration, setShowEmblemCelebration] = useState(false)
  const [channelOrder, setChannelOrder] = useState<string[]>([]) // Saved order of channels
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'done'>('idle')
  const [newVideosCount, setNewVideosCount] = useState(0)
  const [showSyncToast, setShowSyncToast] = useState(false)
  const [showAddVideoModal, setShowAddVideoModal] = useState(false)
  const [channelAvatars, setChannelAvatars] = useState<Record<string, string>>({})
  const [mobileChannelMenu, setMobileChannelMenu] = useState<string | null>(null)
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
          is_favorite: Boolean(video.is_favorite),
          watch_count: videoLogs.length,
          last_watched_at: videoLogs.length > 0 ? videoLogs[0].watched_at : null
        }
      })

      setVideos(processedVideos)

      const { data: channelsData, error: channelsError } = await supabase
        .from('channels')
        .select('name, title, thumbnail_url')

      if (channelsError) {
        console.warn('Error fetching channel avatars:', channelsError.message)
      } else {
        const avatars: Record<string, string> = {}
        ;(channelsData || []).forEach((channel: { name: string | null; title: string | null; thumbnail_url: string | null }) => {
          if (!channel.thumbnail_url) return
          if (channel.name) avatars[normalizeChannelKey(channel.name)] = channel.thumbnail_url
          if (channel.title) avatars[normalizeChannelKey(channel.title)] = channel.thumbnail_url
        })
        setChannelAvatars(avatars)
      }

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

  // Toggle favorite status
  const handleToggleFavorite = async (videoId: string, isFavorite: boolean) => {
    try {
      const { error } = await supabase
        .from('videos')
        .update({ is_favorite: !isFavorite })
        .eq('id', videoId)

      if (error) throw error

      setVideos(prev =>
        prev.map(video =>
          video.id === videoId ? { ...video, is_favorite: !isFavorite } : video
        )
      )
    } catch (error) {
      console.error('Error toggling favorite status:', error)
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

    } catch (error: unknown) {
      console.error('Error deleting channel:', error)
      alert('❌ 채널 삭제 실패\n\n' + getErrorMessage(error))
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

    } catch (error: unknown) {
      console.error('Error renaming channel:', error)
      alert('채널 이름 변경 실패: ' + getErrorMessage(error))
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

  const moveChannelByOffset = (channelName: string, offset: -1 | 1) => {
    const currentIndex = channelNames.indexOf(channelName)
    if (currentIndex < 0) return
    const targetIndex = currentIndex + offset
    if (targetIndex < 0 || targetIndex >= channelNames.length) return
    const newOrder = arrayMove(channelNames, currentIndex, targetIndex)
    setChannelOrder(newOrder)
    localStorage.setItem('channelOrder', JSON.stringify(newOrder))
  }

  // Set default active channel (or reset to null if no channels)
  useEffect(() => {
    if (channelNames.length > 0 && !activeChannel) {
      setActiveChannel(channelNames[0])
    } else if (channelNames.length === 0 && activeChannel !== null) {
      setActiveChannel(null) // Reset when all channels deleted
    }
  }, [channelNames, activeChannel])

  const currentChannelVideos = useMemo(
    () => (activeChannel ? channelData[activeChannel] || [] : videos),
    [activeChannel, channelData, videos]
  )

  // Apply filter and sort (newest first by YouTube upload date)
  const filteredAndSortedVideos = useMemo(() => {
    let filtered = [...currentChannelVideos]

    // Apply filter
    if (filterType === 'unwatched') {
      filtered = filtered.filter(v => v.watch_count === 0)
    } else if (filterType === 'watched') {
      filtered = filtered.filter(v => v.watch_count > 0)
    } else if (filterType === 'favorite') {
      filtered = filtered.filter(v => Boolean(v.is_favorite))
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
  const favoriteInChannel = currentChannelVideos.filter(v => Boolean(v.is_favorite)).length
  const totalInChannel = currentChannelVideos.length
  const progressPercent = totalInChannel > 0 ? Math.round((watchedInChannel / totalInChannel) * 100) : 0

  // Loading/Auth check
  if (loading || authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-500 border-t-transparent"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-8 md:pb-10">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[var(--surface)]/70 backdrop-blur-lg border-b border-[var(--border)] supports-[backdrop-filter]:bg-[var(--surface)]/60">
        <div className="max-w-6xl 2xl:max-w-[1600px] mx-auto px-4 md:px-8 py-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full border-2 border-white shadow-md overflow-hidden relative group cursor-pointer hover:scale-110 transition-transform duration-300">
              <img
                src="/icon-192.png"
                alt="Learning Mate App Icon"
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                  e.currentTarget.parentElement!.classList.add('bg-gradient-to-br', 'from-[#6b9e78]', 'to-[#4a7a58]', 'flex', 'items-center', 'justify-center')
                  e.currentTarget.parentElement!.innerHTML = '<span class="text-white font-bold text-xl font-sans tracking-tight">L</span>'
                }}
              />
            </div>
            <h1 className="hidden md:block text-lg font-bold text-[var(--foreground)] tracking-tight">
              Learning Mate
            </h1>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            {/* Streak Badge */}
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium transition-all ${streak > 0
              ? 'bg-[var(--accent-light)] text-[var(--accent)] border border-[var(--accent)]/30'
              : 'bg-[var(--background-subtle)] text-[var(--foreground-muted)] border border-[var(--border)]'
              }`}>
              <Flame size={16} className={streak > 0 ? "fill-[var(--accent)] text-[var(--accent)]" : ""} strokeWidth={2.5} />
              <span className="font-bold">{streak}</span>
              <span className="hidden sm:inline text-xs opacity-70">Day</span>
            </div>

            {/* Sync Button */}
            <button
              onClick={handleManualSync}
              disabled={syncStatus === 'syncing'}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${syncStatus === 'syncing'
                ? 'bg-[var(--secondary-light)] text-[var(--secondary)]'
                : 'hover:bg-[var(--background-subtle)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] active:scale-95'
                }`}
              title="새 영상 확인"
            >
              {syncStatus === 'syncing' ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <RefreshCw size={20} strokeWidth={2} />
              )}
            </button>

            {/* Add Video Button */}
            <button
              onClick={() => setShowAddVideoModal(true)}
              className="flex items-center justify-center w-10 h-10 md:w-auto md:h-auto md:px-4 md:py-2 gap-2 rounded-full bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white font-bold text-sm transition-all shadow-[0_4px_12px_-2px_rgba(107,158,120,0.3)] hover:shadow-[0_6px_16px_-4px_rgba(107,158,120,0.4)] active:scale-95 active:shadow-none"
              title="영상 추가"
            >
              <Plus size={20} strokeWidth={3} />
              <span className="hidden sm:inline">Add</span>
            </button>

            <div className="w-px h-6 bg-[var(--border)] mx-1 md:hidden"></div>

            {/* Profile Button */}
            <button
              onClick={() => setEmblemModalOpen(true)}
              className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-full hover:bg-[var(--background-subtle)] transition-all group"
            >
              <div className="w-9 h-9 rounded-full bg-[var(--background-subtle)] border-2 border-white shadow-sm flex items-center justify-center group-hover:scale-105 transition-transform">
                <UserCircle size={20} className="text-[var(--foreground-muted)]" />
              </div>
            </button>

            {/* Settings & Logout (Only Desktop) */}
            <div className="hidden md:flex items-center gap-1">
              <Link
                href="/change-password"
                className="w-9 h-9 flex items-center justify-center text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--background-subtle)] rounded-full transition-all"
                title="비밀번호 변경"
              >
                <Key size={18} />
              </Link>

              <button
                onClick={logout}
                className="w-9 h-9 flex items-center justify-center text-[var(--foreground-muted)] hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                title="로그아웃"
              >
                <LogOut size={18} />
              </button>
            </div>
            {/* Mobile Menu Button - can implement later if needed */}
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

      <main className="max-w-6xl 2xl:max-w-[1600px] mx-auto px-4 py-2 md:py-3">
        {/* Channel Tabs & Content */}
        <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] overflow-hidden">
          {/* Channel Tabs */}
          {channelNames.length > 0 && (
            <div className="border-b border-[var(--border)] bg-[var(--background-subtle)]">
              {/* Mobile: icon-based channel picker without horizontal scroll */}
              <div className="md:hidden px-2 py-1.5 flex flex-wrap gap-2">
                {channelNames.map((channelName, index) => {
                  const channelVideos = channelData[channelName]
                  const watched = channelVideos.filter(v => v.watch_count > 0).length
                  const total = channelVideos.length
                  const isActive = activeChannel === channelName

                  return (
                    <SortableChannelTab
                      key={channelName}
                      channelName={channelName}
                      avatarUrl={channelAvatars[normalizeChannelKey(channelName)]}
                      watched={watched}
                      total={total}
                      isActive={isActive}
                      onSelect={() => {
                        setMobileChannelMenu(null)
                        setActiveChannel(channelName)
                      }}
                      onRename={() => handleRenameChannel(channelName)}
                      onDelete={() => {
                        setMobileChannelMenu(null)
                        handleDeleteChannel(channelName)
                      }}
                      enableLongPressMenu
                      showMobileMenu={mobileChannelMenu === channelName}
                      canMoveLeft={index > 0}
                      canMoveRight={index < channelNames.length - 1}
                      onLongPressMenu={() => setMobileChannelMenu(channelName)}
                      onMoveLeft={() => moveChannelByOffset(channelName, -1)}
                      onMoveRight={() => moveChannelByOffset(channelName, 1)}
                    />
                  )
                })}
              </div>

              {activeChannel && (
                <div className="md:hidden px-4 pb-2 text-sm">
                  <span className="font-semibold text-[var(--foreground)]">{activeChannel}</span>
                  <span className="ml-2 text-xs text-[var(--foreground-muted)]">
                    {watchedInChannel}/{totalInChannel}
                  </span>
                </div>
              )}

              {/* Desktop: sortable channel tabs */}
              <div className="hidden md:block overflow-x-auto scrollbar-hide">
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={channelNames}
                    strategy={horizontalListSortingStrategy}
                  >
                    <div className="flex px-2 md:px-4 py-1.5 gap-1 md:gap-2">
                      {channelNames.map((channelName) => {
                        const channelVideos = channelData[channelName]
                        const watched = channelVideos.filter(v => v.watch_count > 0).length
                        const total = channelVideos.length
                        const isActive = activeChannel === channelName

                        return (
                          <SortableChannelTab
                            key={channelName}
                            channelName={channelName}
                            avatarUrl={channelAvatars[normalizeChannelKey(channelName)]}
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
            </div>
          )}

          {/* Progress Bar & Filters */}
          {activeChannel && totalInChannel > 0 && (
            <div className="px-4 md:px-6 py-3 md:py-4 border-b border-[#e8e4db] bg-white">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-3">
                {/* Filter Buttons */}
                <div className="flex bg-[#f7f5f0] p-1.5 rounded-2xl w-full md:w-auto">
                  <button
                    onClick={() => setFilterType('all')}
                    className={`flex-1 md:flex-none px-4 py-1.5 text-xs font-bold rounded-xl transition-all ${filterType === 'all'
                      ? 'bg-white text-[#4a4a4a] shadow-sm'
                      : 'text-[#8c8c8c] hover:text-[#4a4a4a]'
                      }`}
                  >
                    전체 ({totalInChannel})
                  </button>
                  <button
                    onClick={() => setFilterType('unwatched')}
                    className={`flex-1 md:flex-none px-4 py-1.5 text-xs font-bold rounded-xl transition-all ${filterType === 'unwatched'
                      ? 'bg-white text-[#eebb76] shadow-sm'
                      : 'text-[#8c8c8c] hover:text-[#4a4a4a]'
                      }`}
                  >
                    미시청 <span className="hidden sm:inline">({totalInChannel - watchedInChannel})</span>
                  </button>
                  <button
                    onClick={() => setFilterType('watched')}
                    className={`flex-1 md:flex-none px-4 py-1.5 text-xs font-bold rounded-xl transition-all ${filterType === 'watched'
                      ? 'bg-white text-[#6b9e78] shadow-sm'
                      : 'text-[#8c8c8c] hover:text-[#4a4a4a]'
                      }`}
                  >
                    완료 <span className="hidden sm:inline">({watchedInChannel})</span>
                  </button>
                  <button
                    onClick={() => setFilterType('favorite')}
                    className={`flex-1 md:flex-none px-4 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1 ${filterType === 'favorite'
                      ? 'bg-white text-[#d39b00] shadow-sm'
                      : 'text-[#8c8c8c] hover:text-[#4a4a4a]'
                      }`}
                  >
                    <Star size={12} className={filterType === 'favorite' ? 'fill-current' : ''} />
                    즐겨찾기 <span className="hidden sm:inline">({favoriteInChannel})</span>
                  </button>
                </div>

                {/* Progress Text */}
                <div className="flex items-center justify-between md:justify-end gap-3 px-2">
                  <span className="text-xs font-medium text-[#8c8c8c]">학습 진행률</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-xl font-bold text-[#6b9e78]">{progressPercent}</span>
                    <span className="text-xs font-medium text-[#6b9e78]">%</span>
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="h-3 bg-[#f2efe9] rounded-full overflow-hidden shadow-inner">
                <div
                  className="h-full bg-gradient-to-r from-[#8cc99f] to-[#6b9e78] rounded-full transition-all duration-700 ease-out relative"
                  style={{ width: `${progressPercent}%` }}
                >
                  <div className="absolute inset-0 bg-white/20 background-shine"></div>
                </div>
              </div>
            </div>
          )}

          {/* Video Grid */}
          <div className="px-4 pb-4">
            {loading ? (
              <div className="py-10 text-center text-gray-400">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent mx-auto mb-3"></div>
                영상 목록 불러오는 중...
              </div>
            ) : videos.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-gray-400 text-lg mb-2">📭</p>
                <p className="text-gray-500">등록된 영상이 없습니다.</p>
                <p className="text-sm text-gray-400 mt-1">위에서 영상을 추가해보세요!</p>
              </div>
            ) : filteredAndSortedVideos.length === 0 ? (
              <div className="py-10 text-center text-gray-400">
                {filterType === 'unwatched' ? '미시청 영상이 없습니다. 🎉' :
                  filterType === 'watched' ? '시청한 영상이 없습니다.' :
                    filterType === 'favorite' ? '즐겨찾기한 영상이 없습니다.' :
                    '이 채널에 영상이 없습니다.'}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4">
                {filteredAndSortedVideos.map(video => (
                  <VideoCard
                    key={video.id}
                    video={video}
                    onToggleWatch={handleToggleWatch}
                    onToggleFavorite={handleToggleFavorite}
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
