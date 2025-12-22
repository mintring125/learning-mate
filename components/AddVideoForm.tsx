'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { PlusCircle, Loader2, Youtube, Link, CheckCircle2, AlertCircle } from 'lucide-react'

interface AddVideoFormProps {
  onVideoAdded: () => void
}

type Status = 'idle' | 'detecting' | 'fetching' | 'importing' | 'success' | 'error'

export default function AddVideoForm({ onVideoAdded }: AddVideoFormProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [url, setUrl] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [statusMessage, setStatusMessage] = useState('')
  const [importCount, setImportCount] = useState(0)

  // Detect if URL is a single video or channel
  const detectUrlType = (inputUrl: string): 'video' | 'channel' | 'unknown' => {
    // Video patterns
    if (inputUrl.includes('youtube.com/watch?v=') || inputUrl.includes('youtu.be/')) {
      return 'video'
    }
    // Channel patterns
    if (inputUrl.includes('youtube.com/@') ||
      inputUrl.includes('youtube.com/channel/') ||
      inputUrl.includes('youtube.com/c/') ||
      inputUrl.includes('youtube.com/user/')) {
      return 'channel'
    }
    return 'unknown'
  }

  // Extract video ID from URL
  const getVideoId = (inputUrl: string): string | null => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/
    const match = inputUrl.match(regExp)
    return (match && match[2].length === 11) ? match[2] : null
  }

  // Handle URL submission
  const handleSubmit = async () => {
    if (!url.trim()) return

    const urlType = detectUrlType(url)

    if (urlType === 'unknown') {
      setStatus('error')
      setStatusMessage('인식할 수 없는 URL입니다. YouTube 영상 또는 채널 URL을 입력해주세요.')
      return
    }

    if (urlType === 'video') {
      await handleSingleVideo()
    } else {
      await handleChannelImport()
    }
  }

  // Handle single video import
  const handleSingleVideo = async () => {
    setStatus('fetching')
    setStatusMessage('영상 정보를 가져오는 중...')

    try {
      const videoId = getVideoId(url)
      if (!videoId) throw new Error('유효한 YouTube URL이 아닙니다.')

      // Fetch video details from YouTube API
      const res = await fetch(`/api/youtube/video?videoId=${videoId}`)
      const data = await res.json()

      if (!res.ok) throw new Error(data.error || '영상 정보를 가져올 수 없습니다.')

      setStatus('importing')
      setStatusMessage('영상을 등록하는 중...')

      // Insert into database
      const { error } = await supabase.from('videos').insert([{
        title: data.title,
        channel_name: data.channel_name,
        url: url,
        thumbnail_url: data.thumbnail_url,
        published_at: data.published_at // YouTube upload date
      }])

      if (error) throw error

      setStatus('success')
      setStatusMessage('영상이 등록되었습니다!')
      setImportCount(1)

      setTimeout(() => {
        setIsOpen(false)
        setUrl('')
        setStatus('idle')
        setStatusMessage('')
        onVideoAdded()
      }, 1500)

    } catch (error: any) {
      console.error('Error adding video:', error)
      setStatus('error')
      setStatusMessage(error.message || '영상 등록에 실패했습니다.')
    }
  }

  // Handle channel import
  const handleChannelImport = async () => {
    setStatus('fetching')
    setStatusMessage('채널 영상을 가져오는 중...')

    try {
      const res = await fetch(`/api/youtube/channel?channelUrl=${encodeURIComponent(url)}`)
      const data = await res.json()

      if (!res.ok) throw new Error(data.error || '채널 정보를 가져올 수 없습니다.')

      const videos = data.videos || []
      if (videos.length === 0) {
        throw new Error('채널에서 영상을 찾을 수 없습니다.')
      }

      setStatus('importing')
      setStatusMessage(`${videos.length}개 영상을 등록하는 중...`)

      // Check for existing deleted videos to restore
      const videoUrls = videos.map((v: any) => `https://www.youtube.com/watch?v=${v.id}`)
      console.log('[AddVideoForm] Looking for deleted videos, URLs count:', videoUrls.length)

      // Process in batches of 30 to avoid URL length limits
      const BATCH_SIZE = 30
      const restoredUrls = new Set<string>()
      const existingUrls = new Set<string>()

      for (let i = 0; i < videoUrls.length; i += BATCH_SIZE) {
        const batchUrls = videoUrls.slice(i, i + BATCH_SIZE)

        // Find deleted videos in this batch
        const { data: deletedVideos, error: findError } = await supabase
          .from('videos')
          .select('id, url, channel_name')
          .in('url', batchUrls)
          .eq('is_deleted', true)

        if (findError) {
          console.error('[AddVideoForm] Find error:', findError)
        } else if (deletedVideos && deletedVideos.length > 0) {
          console.log('[AddVideoForm] Found deleted videos in batch:', deletedVideos.length)

          // Restore deleted videos
          const { error: restoreError } = await supabase
            .from('videos')
            .update({ is_deleted: false })
            .in('url', deletedVideos.map(v => v.url))

          if (restoreError) {
            console.error('[AddVideoForm] Restore error:', restoreError)
          } else {
            deletedVideos.forEach(v => restoredUrls.add(v.url))
          }
        }

        // Find existing active videos in this batch
        const { data: existingVideos } = await supabase
          .from('videos')
          .select('url')
          .in('url', batchUrls)
          .eq('is_deleted', false)

        existingVideos?.forEach(v => existingUrls.add(v.url))
      }

      console.log('[AddVideoForm] Total restored:', restoredUrls.size, 'Total existing:', existingUrls.size)

      // Filter to only new videos (not existing and not restored)
      const videosToInsert = videos
        .filter((v: any) => {
          const url = `https://www.youtube.com/watch?v=${v.id}`
          return !existingUrls.has(url) && !restoredUrls.has(url)
        })
        .map((v: any) => ({
          title: v.title,
          channel_name: v.channel_name,
          url: `https://www.youtube.com/watch?v=${v.id}`,
          thumbnail_url: v.thumbnail_url,
          published_at: v.published_at,
          is_deleted: false
        }))

      // Insert only new videos
      if (videosToInsert.length > 0) {
        const { error } = await supabase.from('videos').insert(videosToInsert)
        if (error) throw error
      }

      // Register channel for auto-sync
      if (data.channel) {
        await supabase.from('channels').upsert({
          channel_id: data.channel.id,  // 필수 컬럼
          youtube_channel_id: data.channel.id,
          name: data.channel.title,
          title: data.channel.title,
          uploads_playlist_id: data.channel.uploadsPlaylistId
        }, { onConflict: 'youtube_channel_id' })
      }

      const totalCount = videosToInsert.length + restoredUrls.size
      const restoredCount = restoredUrls.size

      setStatus('success')
      if (restoredCount > 0) {
        setStatusMessage(`${restoredCount}개 영상 복원, ${videosToInsert.length}개 신규 등록!`)
      } else {
        setStatusMessage(`${videosToInsert.length}개 영상이 등록되었습니다!`)
      }
      setImportCount(totalCount)

      setTimeout(() => {
        setIsOpen(false)
        setUrl('')
        setStatus('idle')
        setStatusMessage('')
        onVideoAdded()
      }, 2000)

    } catch (error: any) {
      console.error('Error importing channel:', error)
      setStatus('error')
      setStatusMessage(error.message || '채널 가져오기에 실패했습니다.')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !['fetching', 'importing'].includes(status)) {
      handleSubmit()
    }
  }

  const resetForm = () => {
    setStatus('idle')
    setStatusMessage('')
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-5 py-2.5 rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg shadow-blue-200 font-medium mb-6"
      >
        <PlusCircle size={18} />
        영상 추가
      </button>
    )
  }

  return (
    <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm mb-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-gray-800 flex items-center gap-2">
          <Youtube className="text-red-500" size={20} />
          영상 추가하기
        </h3>
        <button
          onClick={() => {
            setIsOpen(false)
            setUrl('')
            setStatus('idle')
          }}
          className="text-gray-400 hover:text-gray-600 text-sm"
        >
          닫기
        </button>
      </div>

      {/* Input Section */}
      <div className="space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Link size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              className="w-full border border-gray-200 rounded-xl pl-10 pr-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-900 placeholder:text-gray-400 transition-all"
              placeholder="YouTube 영상 또는 채널 URL 입력"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value)
                if (status === 'error') resetForm()
              }}
              onKeyDown={handleKeyDown}
              disabled={['fetching', 'importing'].includes(status)}
            />
          </div>
          <button
            onClick={handleSubmit}
            disabled={!url.trim() || ['fetching', 'importing'].includes(status)}
            className="bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium transition-all whitespace-nowrap"
          >
            {['fetching', 'importing'].includes(status) ? (
              <>
                <Loader2 className="animate-spin" size={18} />
                처리 중...
              </>
            ) : (
              '추가하기'
            )}
          </button>
        </div>

        {/* Helper text */}
        {status === 'idle' && url === '' && (
          <p className="text-xs text-gray-400 pl-1">
            💡 개별 영상 URL 또는 채널 URL을 입력하면 자동으로 인식합니다.
          </p>
        )}

        {/* URL Type Detection Preview */}
        {url && status === 'idle' && (
          <div className="flex items-center gap-2 text-sm text-gray-500 pl-1">
            {detectUrlType(url) === 'video' && (
              <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-medium">📹 단일 영상</span>
            )}
            {detectUrlType(url) === 'channel' && (
              <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-xs font-medium">📺 채널 전체 영상</span>
            )}
            {detectUrlType(url) === 'unknown' && (
              <span className="bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full text-xs font-medium">❓ URL 확인 필요</span>
            )}
          </div>
        )}

        {/* Status Messages */}
        {status === 'fetching' && (
          <div className="flex items-center gap-2 text-blue-600 text-sm bg-blue-50 p-3 rounded-lg">
            <Loader2 className="animate-spin" size={16} />
            {statusMessage}
          </div>
        )}

        {status === 'importing' && (
          <div className="flex items-center gap-2 text-purple-600 text-sm bg-purple-50 p-3 rounded-lg">
            <Loader2 className="animate-spin" size={16} />
            {statusMessage}
          </div>
        )}

        {status === 'success' && (
          <div className="flex items-center gap-2 text-green-600 text-sm bg-green-50 p-3 rounded-lg">
            <CheckCircle2 size={16} />
            {statusMessage}
          </div>
        )}

        {status === 'error' && (
          <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg">
            <AlertCircle size={16} />
            {statusMessage}
            <button onClick={resetForm} className="ml-auto text-xs underline">다시 시도</button>
          </div>
        )}
      </div>
    </div>
  )
}
