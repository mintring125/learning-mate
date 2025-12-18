import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'
import { google } from 'googleapis'

// Parse ISO 8601 duration to seconds
function parseDuration(duration: string): number {
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
    if (!match) return 0
    const hours = parseInt(match[1] || '0', 10)
    const minutes = parseInt(match[2] || '0', 10)
    const seconds = parseInt(match[3] || '0', 10)
    return hours * 3600 + minutes * 60 + seconds
}

export async function POST() {
    try {
        // 1. Get all channels
        const { data: channels, error: channelsError } = await supabase
            .from('channels')
            .select('*')

        if (channelsError) throw channelsError
        if (!channels || channels.length === 0) {
            return NextResponse.json({ message: 'No channels to sync', newVideos: 0 })
        }

        const apiKey = process.env.YOUTUBE_API_KEY || process.env.GOOGLE_GEMINI_API_KEY
        if (!apiKey) return NextResponse.json({ error: 'No API Key' }, { status: 500 })

        const youtube = google.youtube({ version: 'v3', auth: apiKey })
        let totalNewVideos = 0

        // 2. Loop through channels
        for (const channel of channels) {
            try {
                let uploadsId = channel.uploads_playlist_id

                // If uploads_playlist_id is not cached, fetch it
                if (!uploadsId) {
                    const channelRes = await youtube.channels.list({
                        part: ['contentDetails'],
                        id: [channel.youtube_channel_id]
                    })

                    uploadsId = channelRes.data.items?.[0]?.contentDetails?.relatedPlaylists?.uploads
                    if (!uploadsId) continue

                    // Cache the uploads_playlist_id for future syncs
                    await supabase
                        .from('channels')
                        .update({ uploads_playlist_id: uploadsId })
                        .eq('youtube_channel_id', channel.youtube_channel_id)
                }

                // Get Videos (last 50 to catch more new uploads)
                const playlistRes = await youtube.playlistItems.list({
                    part: ['snippet'],
                    playlistId: uploadsId,
                    maxResults: 50
                })

                const fetchedItems = playlistRes.data.items || []
                const videoIds = fetchedItems
                    .map((item: any) => item.snippet?.resourceId?.videoId)
                    .filter((id: any): id is string => !!id)

                // Fetch video details to filter Shorts
                if (videoIds.length > 0) {
                    const videosResponse = await youtube.videos.list({
                        part: ['contentDetails', 'snippet'],
                        id: videoIds,
                    })

                    for (const video of videosResponse.data.items || []) {
                        const videoId = video.id
                        if (!videoId) continue

                        // Filter Shorts (duration <= 60s)
                        const duration = video.contentDetails?.duration || 'PT0S'
                        const durationSeconds = parseDuration(duration)
                        const title = video.snippet?.title || ''
                        const isShort = durationSeconds <= 60 ||
                            title.toLowerCase().includes('#shorts') ||
                            title.toLowerCase().includes('#short')

                        if (isShort) continue

                        const videoUrl = `https://www.youtube.com/watch?v=${videoId}`

                        // Check if video already exists
                        const { data: existing } = await supabase
                            .from('videos')
                            .select('id')
                            .eq('url', videoUrl)
                            .single()

                        if (!existing) {
                            await supabase.from('videos').insert({
                                title: video.snippet?.title,
                                url: videoUrl,
                                thumbnail_url: video.snippet?.thumbnails?.high?.url || video.snippet?.thumbnails?.medium?.url,
                                channel_name: channel.name,
                                published_at: video.snippet?.publishedAt
                            })
                            totalNewVideos++
                        }
                    }
                }

            } catch (err) {
                console.error(`Failed to sync channel ${channel.name}`, err)
            }
        }

        return NextResponse.json({
            message: `Sync complete. Added ${totalNewVideos} new videos.`,
            newVideos: totalNewVideos
        })

    } catch (error: any) {
        console.error('Sync error:', error)
        return NextResponse.json({ error: error.message, newVideos: 0 }, { status: 500 })
    }
}
