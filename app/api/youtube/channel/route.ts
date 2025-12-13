import { google } from 'googleapis'
import { NextResponse } from 'next/server'

// Parse ISO 8601 duration to seconds
function parseDuration(duration: string): number {
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
    if (!match) return 0
    const hours = parseInt(match[1] || '0', 10)
    const minutes = parseInt(match[2] || '0', 10)
    const seconds = parseInt(match[3] || '0', 10)
    return hours * 3600 + minutes * 60 + seconds
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const channelUrl = searchParams.get('channelUrl')

    if (!channelUrl) {
        return NextResponse.json({ error: 'Channel URL is required' }, { status: 400 })
    }

    const apiKey = process.env.YOUTUBE_API_KEY || process.env.GOOGLE_GEMINI_API_KEY

    if (!apiKey) {
        return NextResponse.json({ error: 'YouTube API Key is missing' }, { status: 500 })
    }

    const youtube = google.youtube({
        version: 'v3',
        auth: apiKey,
    })

    try {
        let channelId = ''

        // 1. Extract Channel ID or Handle
        let handle = ''

        if (channelUrl.includes('youtube.com/@')) {
            handle = channelUrl.split('@')[1].split('/')[0].split('?')[0]
        } else if (channelUrl.includes('youtube.com/channel/')) {
            channelId = channelUrl.split('channel/')[1].split('/')[0].split('?')[0]
        } else if (channelUrl.startsWith('@')) {
            handle = channelUrl.substring(1)
        } else {
            return NextResponse.json({ error: 'Invalid channel URL format. Use https://www.youtube.com/@handle' }, { status: 400 })
        }

        // 2. Get Channel Info (Uploads Playlist ID)
        let uploadsPlaylistId = ''
        let channelTitle = ''

        if (channelId) {
            const response = await youtube.channels.list({
                part: ['contentDetails', 'snippet'],
                id: [channelId],
            })
            const channel = response.data.items?.[0]
            if (!channel) throw new Error('Channel not found')
            uploadsPlaylistId = channel.contentDetails?.relatedPlaylists?.uploads || ''
            channelTitle = channel.snippet?.title || ''
            channelId = channel.id || channelId
        } else if (handle) {
            const response = await youtube.channels.list({
                part: ['contentDetails', 'snippet'],
                forHandle: '@' + handle,
            })
            const channel = response.data.items?.[0]
            if (!channel) throw new Error('Channel not found')
            uploadsPlaylistId = channel.contentDetails?.relatedPlaylists?.uploads || ''
            channelTitle = channel.snippet?.title || ''
            channelId = channel.id || ''
        }

        if (!uploadsPlaylistId) {
            return NextResponse.json({ error: 'Could not find uploads playlist' }, { status: 404 })
        }

        // 3. Fetch ALL Videos from Uploads Playlist with pagination
        const allVideos: Array<{
            id: string
            title: string
            thumbnail_url: string
            channel_name: string
            published_at: string
        }> = []
        let nextPageToken: string | undefined = undefined
        let pageCount = 0
        const maxPages = 100 // Increased limit (100 pages * 50 = 5000 videos max, excluding Shorts)

        do {
            const playlistResponse: any = await youtube.playlistItems.list({
                part: ['snippet'],
                playlistId: uploadsPlaylistId,
                maxResults: 50,
                pageToken: nextPageToken,
            })

            const videoIds = playlistResponse.data.items
                ?.map((item: any) => item.snippet?.resourceId?.videoId)
                .filter((id: any): id is string => !!id) || []

            // Fetch video details to check duration (for Shorts filtering)
            if (videoIds.length > 0) {
                const videosResponse = await youtube.videos.list({
                    part: ['contentDetails', 'snippet'],
                    id: videoIds,
                })

                const filteredVideos = videosResponse.data.items
                    ?.filter(video => {
                        const duration = video.contentDetails?.duration || 'PT0S'
                        const durationSeconds = parseDuration(duration)
                        const title = video.snippet?.title || ''

                        // Exclude Shorts: duration <= 60 seconds OR title contains #shorts
                        const isShort = durationSeconds <= 60 ||
                            title.toLowerCase().includes('#shorts') ||
                            title.toLowerCase().includes('#short')

                        return !isShort && video.id && video.snippet?.title
                    })
                    .map(video => ({
                        id: video.id!,
                        title: video.snippet!.title!,
                        thumbnail_url: video.snippet!.thumbnails?.high?.url || video.snippet!.thumbnails?.medium?.url || '',
                        channel_name: channelTitle,
                        published_at: video.snippet!.publishedAt || '',
                    })) || []

                allVideos.push(...filteredVideos)
            }

            nextPageToken = playlistResponse.data.nextPageToken || undefined
            pageCount++

        } while (nextPageToken && pageCount < maxPages)

        return NextResponse.json({
            videos: allVideos,
            channel: {
                id: channelId,
                title: channelTitle,
                uploadsPlaylistId: uploadsPlaylistId
            }
        })

    } catch (error: any) {
        console.error('YouTube API Error:', error)
        return NextResponse.json({ error: error.message || 'Failed to fetch channel videos' }, { status: 500 })
    }
}
