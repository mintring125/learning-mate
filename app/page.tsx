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
  const [filterType, setFilterType] = useState<FilterType>('unwatched')
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
        <div className="max-w-6xl 2xl:max-w-[1600px] mx-auto px-4 h-auto md:h-20 py-4 md:py-0 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-amber-400 p-[2px] rounded-full border-4 border-white shadow-lg overflow-hidden w-16 h-16 relative -ml-2">
              <img src="/assets/theme/teacher_avatar.jpg" className="w-full h-full object-cover rounded-full" alt="Teacher Avatar" />
            </div>
            <h1 className="text-xl md:text-2xl font-black text-amber-100 tracking-wide drop-shadow-[0_2px_2px_rgba(0,0,0,0.5)]" style={{ textShadow: '2px 2px 0 #5d4037' }}>
              형석쌤 공부용 사이트
            </h1>
          </div>

          <div className="flex items-center gap-3 text-sm">
            <div className={`flex items-center gap-1.5 px-4 py-2 rounded-full transition-all border-2 ${streak > 0 ? 'bg-orange-100 border-orange-400 text-orange-700' : 'bg-gray-100 border-gray-300 text-gray-500'} shadow-md`}>
              <Flame size={18} className={streak > 0 ? "fill-orange-500 text-orange-500" : ""} />
              <span className="font-extrabold text-base">{streak}</span>
              <span className="hidden sm:inline text-xs font-bold">일 연속</span>
            </div>
            <button
              onClick={() => setEmblemModalOpen(true)}
              className="flex items-center gap-2 bg-[#fffaeb] border-2 border-[#e6dcc8] text-[#8b5e3c] hover:bg-white hover:border-amber-400 hover:text-amber-600 px-4 py-2 rounded-2xl transition-all cursor-pointer shadow-md"
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
              <UserCircle size={20} className="text-amber-500" />
              <span className="font-bold text-sm">{user.username}</span>
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

      <main className="max-w-6xl 2xl:max-w-[1600px] mx-auto px-4 py-8">
        {/* Stats Cards */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* Today's Learning Card */}
          <div className="bg-[#fdfbf7] p-1 rounded-[2rem] shadow-[0_8px_0_rgba(214,204,184,1)] border-4 border-[#e6dcc8] relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-4 bg-[#e6dcc8]/30"></div>
            <div className="p-5 flex items-center gap-5">
              <div className={`p-4 rounded-2xl shadow-inner ${todayWatched ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                <CalendarCheck size={28} strokeWidth={2.5} />
              </div>
              <div>
                <p className="text-sm font-bold text-[#8b5e3c] mb-1 opacity-70">오늘의 학습</p>
                <p className={`text-xl font-black ${todayWatched ? 'text-emerald-600' : 'text-slate-400'}`}>{todayWatched ? '완료함!' : '아직 안함'}</p>
              </div>
            </div>
            {todayWatched && <div className="absolute -bottom-2 -right-2 opacity-20 rotate-12"><img src="/assets/theme/leaf_icon_green.png" className="w-24 h-24" /></div>}
          </div>
          <button
            onClick={() => setEmblemModalOpen(true)}
            className="bg-[#fdfbf7] p-1 rounded-[2rem] shadow-[0_8px_0_rgba(214,204,184,1)] border-4 border-[#e6dcc8] relative overflow-hidden group hover:translate-y-1 hover:shadow-[0_4px_0_rgba(214,204,184,1)] transition-all cursor-pointer w-full text-left"
          >
            <div className="p-5 flex items-center gap-4 relative z-10">
              <div className={`w-14 h-14 rounded-2xl overflow-hidden shadow-md border-2 border-white ${streak >= 7 ? 'ring-2 ring-amber-400' : 'grayscale opacity-60'}`}>
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
            </div>
          </button>
          <div className="bg-[#fdfbf7] p-1 rounded-[2rem] shadow-[0_8px_0_rgba(214,204,184,1)] border-4 border-[#e6dcc8] relative overflow-hidden">
            <div className="absolute right-0 top-0 h-full w-20 bg-gradient-to-l from-amber-50 to-transparent"></div>
            <div className="p-5 flex items-center justify-between relative z-10">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <img src="/assets/theme/bell_bag_icon.png" className="w-5 h-5" />
                  <p className="text-sm font-bold text-[#8b5e3c] opacity-70">총 시청 횟수</p>
                </div>
                <p className="text-3xl font-black text-[#5d4037]">
                  {videos.reduce((acc, curr) => acc + curr.watch_count, 0)}
                  <span className="text-lg font-bold opacity-60 ml-1">회</span>
                </p>
              </div>
              <img src="/assets/theme/bell_bag_icon.png" className="w-16 h-16 opacity-20 absolute -right-2 -bottom-2 rotate-12" />
            </div>
          </div>
        </section>

        {/* Add Video Form */}
        <AddVideoForm onVideoAdded={fetchData} />

        {/* Channel Tabs & Content */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mt-6">
          {/* Channel Tabs */}
          {channelNames.length > 0 && (
            <div className="border-b-4 border-[#e6dcc8] overflow-x-auto bg-[#fdfbf7] rounded-t-[2rem] mx-4 mt-6">
              <div className="flex px-4 pt-4 gap-2">
                {channelNames.map((channelName) => {
                  const channelVideos = channelData[channelName]
                  const watched = channelVideos.filter(v => v.watch_count > 0).length
                  const total = channelVideos.length
                  const isActive = activeChannel === channelName

                  return (
                    <div
                      key={channelName}
                      className="relative group"
                    >
                      <button
                        onClick={() => setActiveChannel(channelName)}
                        className={`px-6 py-3 text-sm font-black rounded-t-2xl transition-all flex items-center gap-2 border-t-4 border-x-4 ${isActive
                          ? 'bg-[#e6dcc8] border-[#d4c5a9] text-[#5d4037] translate-y-[4px]'
                          : 'bg-[#fffaeb] border-transparent text-[#9c826b] hover:bg-[#fff0c7]'
                          }`}
                        style={isActive ? { backgroundImage: "url('/assets/theme/wood_texture_light.png')", backgroundSize: '150px' } : {}}
                      >
                        <span className="max-w-[120px] truncate drop-shadow-sm">{channelName}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${isActive ? 'bg-[#74c74a] text-white shadow-inner' : 'bg-[#e6dcc8] text-[#8b5e3c]'}`}>
                          {watched}/{total}
                        </span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteChannel(channelName)
                        }}
                        className="absolute -top-2 -right-2 bg-red-400 text-white p-1 rounded-full shadow-md hover:bg-red-500 hover:scale-110 transition-all opacity-0 group-hover:opacity-100 z-10"
                        title="채널 삭제"
                      >
                        <X size={12} strokeWidth={3} />
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Progress Bar & Filters */}
          {activeChannel && totalInChannel > 0 && (
            <div className="mx-4 bg-[#fdfbf7] border-x-4 border-b-4 border-[#e6dcc8] rounded-b-[2rem] p-6 mb-6 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                {/* Filter Buttons */}
                <div className="flex items-center gap-2">
                  <div className="bg-[#e6dcc8] p-1.5 rounded-full text-[#8b5e3c]">
                    <Filter size={16} />
                  </div>
                  <div className="flex bg-[#e6dcc8]/30 p-1 rounded-full">
                    <button
                      onClick={() => setFilterType('all')}
                      className={`px-4 py-1.5 text-xs font-bold rounded-full transition-all ${filterType === 'all'
                        ? 'bg-[#74c74a] text-white shadow-md'
                        : 'text-[#8b5e3c] hover:bg-[#e6dcc8]/50'
                        }`}
                    >
                      전체 ({totalInChannel})
                    </button>
                    <button
                      onClick={() => setFilterType('unwatched')}
                      className={`px-4 py-1.5 text-xs font-bold rounded-full transition-all ${filterType === 'unwatched'
                        ? 'bg-orange-400 text-white shadow-md'
                        : 'text-[#8b5e3c] hover:bg-[#e6dcc8]/50'
                        }`}
                    >
                      미시청 ({totalInChannel - watchedInChannel})
                    </button>
                    <button
                      onClick={() => setFilterType('watched')}
                      className={`px-4 py-1.5 text-xs font-bold rounded-full transition-all ${filterType === 'watched'
                        ? 'bg-[#74c74a] text-white shadow-md'
                        : 'text-[#8b5e3c] hover:bg-[#e6dcc8]/50'
                        }`}
                    >
                      시청 완료 ({watchedInChannel})
                    </button>
                  </div>
                </div>

                {/* Progress Text */}
                <div className="text-right">
                  <span className="text-sm font-bold text-[#8b5e3c] mr-2">진행률</span>
                  <span className="text-lg font-black text-[#74c74a]">{progressPercent}%</span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="h-5 bg-[#e6dcc8] rounded-full overflow-hidden p-1 shadow-inner">
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