'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/components/AuthProvider'
import { Video, VideoWithLog } from '@/types'
import VideoCard from '@/components/VideoCard'
import AddVideoForm from '@/components/AddVideoForm'
import QuizModal from '@/components/QuizModal'
import VideoPlayerModal from '@/components/VideoPlayerModal'
import { Award, Flame, CalendarCheck, LogOut, UserCircle, TrendingUp, X, Filter, Trophy, Shield, Key } from 'lucide-react'
import { subDays } from 'date-fns'
import EmblemModal, { hasWeeklyEmblem, getCurrentWeekNumber } from '@/components/EmblemModal'
import Link from 'next/link'

type FilterType = 'all' | 'unwatched' | 'watched'

export default function Home() {
  const { user, loading: authLoading, logout } = useAuth()
  const router = useRouter()
  const [videos, setVideos] = useState<VideoWithLog[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedVideoForQuiz, setSelectedVideoForQuiz] = useState<VideoWithLog | null>(null)
  const [selectedVideoForPlayer, setSelectedVideoForPlayer] = useState<VideoWithLog | null>(null)
  const [streak, setStreak] = useState(0)
  const [todayWatched, setTodayWatched] = useState(false)
  const [activeChannel, setActiveChannel] = useState<string | null>(null)
  const [filterType, setFilterType] = useState<FilterType>('all')
  const [emblemModalOpen, setEmblemModalOpen] = useState(false)
  const [earnedEmblems, setEarnedEmblems] = useState<string[]>([])
  const [currentWeekEmblem, setCurrentWeekEmblem] = useState<string>('/img_bonus/BONUS.jpg')

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

      try {
        await fetch('/api/channels/sync', { method: 'POST' })
        await fetchData()
      } catch (err) {
        console.error('Auto-sync failed', err)
      }
    }
    init()
  }, [user])

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

  // Handle quiz completion - update quiz_completed status
  const handleQuizComplete = async (videoId: string) => {
    try {
      const { error } = await supabase
        .from('videos')
        .update({ quiz_completed: true })
        .eq('id', videoId)

      if (error) throw error
      await fetchData()
    } catch (error) {
      console.error('Error updating quiz completion:', error)
    }
  }


  // Delete channel and all its videos
  const handleDeleteChannel = async (channelName: string) => {
    const confirmed = window.confirm(`"${channelName}" 채널과 해당 채널의 모든 영상을 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.`)

    if (!confirmed) return

    // Show loading indicator
    const loadingAlert = window.confirm('삭제 중입니다... (확인을 누르면 백그라운드에서 진행됩니다)')

    try {
      // Get all video IDs for this channel
      const channelVideos = videos.filter(v => v.channel_name === channelName)
      const videoIds = channelVideos.map(v => v.id)

      if (videoIds.length === 0) {
        alert('삭제할 영상이 없습니다.')
        return
      }

      // Delete watch logs in batch (much faster!)
      if (videoIds.length > 0) {
        const { error: logError } = await supabase
          .from('watch_logs')
          .delete()
          .in('video_id', videoIds)

        // Watch logs might not exist - that's okay, ignore error
        // (no logs to delete is a normal situation)
      }

      // Delete all videos with this channel_name
      const { error: videoError } = await supabase
        .from('videos')
        .delete()
        .eq('channel_name', channelName)

      if (videoError) {
        console.error('Videos delete error:', videoError)
        throw new Error('영상 삭제 실패: ' + videoError.message)
      }

      // Delete channel from channels table
      const { error: channelError } = await supabase
        .from('channels')
        .delete()
        .eq('title', channelName)

      if (channelError) {
        console.warn('Channel table delete:', channelError.message)
      }

      // Success!
      alert(`"${channelName}" 채널이 성공적으로 삭제되었습니다.`)
      window.location.reload()

    } catch (error: any) {
      console.error('Error deleting channel:', error)
      alert('❌ 채널 삭제 실패\n\n' + (error?.message || '알 수 없는 오류가 발생했습니다.'))
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

  const channelNames = Object.keys(channelData)

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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-500 border-t-transparent"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 pb-20 font-sans">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            📚 자기주도 학습관리
          </h1>
          <div className="flex items-center gap-3 text-sm">
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all ${streak > 0 ? 'bg-gradient-to-r from-orange-400 to-red-400 text-white shadow-lg shadow-orange-200' : 'bg-gray-100 text-gray-400'}`}>
              <Flame size={16} className={streak > 0 ? "fill-white" : ""} />
              <span className="font-bold">{streak}</span>
              <span className="hidden sm:inline text-xs opacity-90">일 연속</span>
            </div>
            <button
              onClick={() => setEmblemModalOpen(true)}
              className="flex items-center gap-2 text-gray-600 hover:text-amber-600 hover:bg-amber-50 px-3 py-1.5 rounded-lg transition-all cursor-pointer"
            >
              {hasWeeklyEmblem(streak) && (
                <div className="relative">
                  <img
                    src="/img_bonus/BONUS.jpg"
                    alt="Weekly Emblem"
                    className="w-6 h-6 rounded-full object-cover border-2 border-amber-400 shadow-sm"
                  />
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full flex items-center justify-center">
                    <Trophy size={6} className="text-yellow-800" />
                  </div>
                </div>
              )}
              <UserCircle size={18} />
              <span className="font-medium hidden sm:inline">{user.username}</span>
            </button>
            <Link
              href="/change-password"
              className="p-2 text-gray-400 hover:text-amber-500 hover:bg-amber-50 rounded-lg transition-all"
              title="비밀번호 변경"
            >
              <Key size={18} />
            </Link>
            <button onClick={logout} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all" title="로그아웃">
              <LogOut size={18} />
            </button>
            {user.isAdmin && (
              <Link
                href="/admin/approvals"
                className="p-2 text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 rounded-lg transition-all"
                title="회원가입 승인"
              >
                <Shield size={18} />
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* Stats Cards */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
            <div className={`p-3 rounded-xl ${todayWatched ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
              <CalendarCheck size={24} />
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-0.5">오늘의 학습</p>
              <p className="font-bold text-gray-800">{todayWatched ? '✅ 완료!' : '⏳ 시작 전'}</p>
            </div>
          </div>
          <button
            onClick={() => setEmblemModalOpen(true)}
            className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4 hover:shadow-md hover:border-amber-200 transition-all cursor-pointer w-full text-left"
          >
            <div className={`w-12 h-12 rounded-xl overflow-hidden ${streak >= 7 ? '' : 'grayscale opacity-60'}`}>
              <img
                src={currentWeekEmblem}
                alt="Weekly Emblem"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1">
              <p className="text-xs text-gray-400 mb-0.5">이번 주 엠블럼</p>
              <div className="flex items-center gap-2">
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5, 6, 7].map(i => (
                    <div
                      key={i}
                      className={`w-2 h-2 rounded-full ${i <= Math.min(streak, 7) ? 'bg-green-500' : 'bg-gray-200'}`}
                    />
                  ))}
                </div>
                <span className="text-xs font-medium text-gray-600">{Math.min(streak, 7)}/7</span>
              </div>
            </div>
          </button>
          <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-5 rounded-2xl shadow-lg text-white">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp size={18} className="opacity-80" />
              <p className="text-xs opacity-80">총 시청 횟수</p>
            </div>
            <p className="text-3xl font-bold">
              {videos.reduce((acc, curr) => acc + curr.watch_count, 0)}
              <span className="text-sm font-normal opacity-70 ml-1">회</span>
            </p>
          </div>
        </section>

        {/* Add Video Form */}
        <AddVideoForm onVideoAdded={fetchData} />

        {/* Channel Tabs & Content */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mt-6">
          {/* Channel Tabs */}
          {channelNames.length > 0 && (
            <div className="border-b border-gray-100 overflow-x-auto">
              <div className="flex">
                {channelNames.map((channelName) => {
                  const channelVideos = channelData[channelName]
                  const watched = channelVideos.filter(v => v.watch_count > 0).length
                  const total = channelVideos.length
                  const isActive = activeChannel === channelName

                  return (
                    <div
                      key={channelName}
                      className={`relative group flex items-center ${isActive
                        ? 'border-b-2 border-blue-500 bg-blue-50/50'
                        : 'border-b-2 border-transparent hover:bg-gray-50'
                        }`}
                    >
                      <button
                        onClick={() => setActiveChannel(channelName)}
                        className={`px-5 py-4 text-sm font-medium whitespace-nowrap transition-all flex items-center gap-2 ${isActive
                          ? 'text-blue-600'
                          : 'text-gray-500 hover:text-gray-700'
                          }`}
                      >
                        <span className="max-w-[120px] truncate">{channelName}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${isActive ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                          {watched}/{total}
                        </span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteChannel(channelName)
                        }}
                        className="p-1.5 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100 mr-2"
                        title="채널 삭제"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Progress Bar */}
          {activeChannel && totalInChannel > 0 && (
            <div className="px-5 py-4 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100">
              {/* Filter Buttons */}
              <div className="flex items-center gap-2 mb-3">
                <Filter size={14} className="text-gray-400" />
                <div className="flex gap-1">
                  <button
                    onClick={() => setFilterType('all')}
                    className={`px-3 py-1 text-xs font-medium rounded-full transition-all ${filterType === 'all'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                  >
                    전체 ({totalInChannel})
                  </button>
                  <button
                    onClick={() => setFilterType('unwatched')}
                    className={`px-3 py-1 text-xs font-medium rounded-full transition-all ${filterType === 'unwatched'
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                  >
                    미시청 ({totalInChannel - watchedInChannel})
                  </button>
                  <button
                    onClick={() => setFilterType('watched')}
                    className={`px-3 py-1 text-xs font-medium rounded-full transition-all ${filterType === 'watched'
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                  >
                    시청 완료 ({watchedInChannel})
                  </button>
                </div>
              </div>

              {/* Progress */}
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">학습 진행률</span>
                <span className="text-sm font-bold text-blue-600">{watchedInChannel} / {totalInChannel} ({progressPercent}%)</span>
              </div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}

          {/* Video Grid */}
          <div className="p-5">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredAndSortedVideos.map(video => (
                  <VideoCard
                    key={video.id}
                    video={video}
                    onToggleWatch={handleToggleWatch}
                    onQuiz={setSelectedVideoForQuiz}
                    onPlay={setSelectedVideoForPlayer}
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
          onClose={() => setSelectedVideoForPlayer(null)}
          onComplete={(id, isWatched) => handleToggleWatch(id, isWatched)}
          onQuiz={(video) => {
            setSelectedVideoForPlayer(null)
            setSelectedVideoForQuiz(video)
          }}
        />
      )}

      {selectedVideoForQuiz && (
        <QuizModal
          video={selectedVideoForQuiz}
          onClose={() => setSelectedVideoForQuiz(null)}
          onQuizComplete={(videoId) => {
            // Mark quiz as completed (not auto-watch)
            handleQuizComplete(videoId)
          }}
        />
      )}

      {/* Emblem Gallery Modal */}
      <EmblemModal
        isOpen={emblemModalOpen}
        onClose={() => setEmblemModalOpen(false)}
        streak={streak}
        earnedEmblems={earnedEmblems}
        username={user?.username || 'User'}
      />
    </div>
  )
}