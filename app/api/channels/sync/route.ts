import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'
import { google } from 'googleapis'

const getErrorMessage = (error: unknown) => error instanceof Error ? error.message : 'Unknown error'

type ChannelDebugInfo = {
    name?: string | null
    title?: string | null
    youtube_channel_id?: string | null
    uploads_playlist_id?: string | null
    thumbnail_url?: string | null
    status: 'processing' | 'success' | 'error'
    error?: string
    meta_updated?: boolean
    cached_now?: boolean
    videosChecked?: number
    newVideosAdded?: number
    videosRestored?: number
}

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

        if (channelsError) {
            console.error('Channels query error:', channelsError)
            return NextResponse.json({
                error: 'Failed to query channels',
                details: channelsError.message,
                hint: channelsError.hint || 'Check if channels table exists',
                newVideos: 0
            }, { status: 500 })
        }

        if (!channels || channels.length === 0) {
            return NextResponse.json({
                message: 'No channels to sync',
                newVideos: 0,
                debug: {
                    channelsFound: 0,
                    hint: 'Add a YouTube channel URL using the "영상 추가" button to register channels for auto-sync'
                }
            })
        }

        const apiKey = process.env.YOUTUBE_API_KEY || process.env.GOOGLE_GEMINI_API_KEY
        if (!apiKey) return NextResponse.json({ error: 'No API Key' }, { status: 500 })

        const youtube = google.youtube({ version: 'v3', auth: apiKey })
        let totalNewVideos = 0
        const debugInfo: ChannelDebugInfo[] = []

        // 2. Loop through channels
        for (const channel of channels) {
            const channelDebug: ChannelDebugInfo = {
                name: channel.name,
                title: channel.title,
                youtube_channel_id: channel.youtube_channel_id,
                uploads_playlist_id: channel.uploads_playlist_id,
                status: 'processing'
            }

            try {
                // Validate youtube_channel_id
                if (!channel.youtube_channel_id) {
                    channelDebug.status = 'error'
                    channelDebug.error = 'Missing youtube_channel_id'
                    debugInfo.push(channelDebug)
                    continue
                }

                let uploadsId = channel.uploads_playlist_id
                let channelDisplayName = channel.name || channel.title || 'Unknown Channel'
                let channelThumbnailUrl = channel.thumbnail_url || null

                // Refresh channel metadata (playlist id, title, thumbnail) from YouTube.
                const channelRes = await youtube.channels.list({
                    part: ['contentDetails', 'snippet'],
                    id: [channel.youtube_channel_id]
                })
                const channelItem = channelRes.data.items?.[0]
                if (!channelItem) {
                    channelDebug.status = 'error'
                    channelDebug.error = 'Channel not found in YouTube API'
                    debugInfo.push(channelDebug)
                    continue
                }

                const fetchedUploadsId = channelItem.contentDetails?.relatedPlaylists?.uploads || null
                const fetchedTitle = channelItem.snippet?.title || channelDisplayName
                const fetchedThumbnailUrl =
                    channelItem.snippet?.thumbnails?.high?.url ||
                    channelItem.snippet?.thumbnails?.medium?.url ||
                    channelItem.snippet?.thumbnails?.default?.url ||
                    null

                uploadsId = uploadsId || fetchedUploadsId
                channelDisplayName = fetchedTitle
                channelThumbnailUrl = fetchedThumbnailUrl

                const shouldUpdateChannelMeta =
                    !!fetchedUploadsId && fetchedUploadsId !== channel.uploads_playlist_id ||
                    fetchedTitle !== (channel.name || channel.title) ||
                    fetchedThumbnailUrl !== (channel.thumbnail_url || null)

                if (shouldUpdateChannelMeta) {
                    const { error: updateChannelError } = await supabase
                        .from('channels')
                        .update({
                            uploads_playlist_id: fetchedUploadsId || channel.uploads_playlist_id,
                            name: fetchedTitle,
                            title: fetchedTitle,
                            thumbnail_url: fetchedThumbnailUrl
                        })
                        .eq('youtube_channel_id', channel.youtube_channel_id)

                    if (updateChannelError) {
                        console.warn('[Sync] Failed to update channel metadata:', updateChannelError.message)
                    } else {
                        channelDebug.meta_updated = true
                    }
                }

                // If uploads_playlist_id is not cached, fetch it
                if (!uploadsId) {
                    if (!uploadsId) {
                        channelDebug.status = 'error'
                        channelDebug.error = 'Could not get uploads playlist from YouTube API'
                        debugInfo.push(channelDebug)
                        continue
                    }

                    // Cache the uploads_playlist_id for future syncs
                    await supabase
                        .from('channels')
                        .update({ uploads_playlist_id: uploadsId })
                        .eq('youtube_channel_id', channel.youtube_channel_id)

                    channelDebug.uploads_playlist_id = uploadsId
                    channelDebug.cached_now = true
                }

                // Get Videos (last 50 to catch more new uploads)
                const playlistRes = await youtube.playlistItems.list({
                    part: ['snippet'],
                    playlistId: uploadsId,
                    maxResults: 50
                })

                const fetchedItems = playlistRes.data.items || []
                const videoIds = fetchedItems
                    .map((item) => item.snippet?.resourceId?.videoId)
                    .filter((id): id is string => !!id)

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
                        // Check if video already exists (including deleted ones)
                        const { data: existing } = await supabase
                            .from('videos')
                            .select('id, is_deleted')
                            .eq('url', videoUrl)
                            .single()

                        if (!existing) {
                            // New video - insert it
                            await supabase.from('videos').insert({
                                title: video.snippet?.title,
                                url: videoUrl,
                                thumbnail_url: video.snippet?.thumbnails?.high?.url || video.snippet?.thumbnails?.medium?.url,
                                channel_name: channelDisplayName,
                                published_at: video.snippet?.publishedAt,
                                is_deleted: false
                            })
                            totalNewVideos++
                            channelDebug.newVideosAdded = (channelDebug.newVideosAdded || 0) + 1
                        } else if (existing.is_deleted) {
                            // Restore deleted video
                            await supabase
                                .from('videos')
                                .update({ is_deleted: false, channel_name: channelDisplayName })
                                .eq('id', existing.id)
                            totalNewVideos++
                            channelDebug.videosRestored = (channelDebug.videosRestored || 0) + 1
                        }
                        // If video exists and is not deleted, skip it
                    }
                }

                channelDebug.status = 'success'
                channelDebug.videosChecked = videoIds.length
                channelDebug.thumbnail_url = channelThumbnailUrl
                debugInfo.push(channelDebug)

            } catch (err: unknown) {
                console.error(`Failed to sync channel ${channel.name}`, err)
                channelDebug.status = 'error'
                channelDebug.error = getErrorMessage(err)
                debugInfo.push(channelDebug)
            }
        }

        console.log('[Sync] Complete:', JSON.stringify(debugInfo, null, 2))

        return NextResponse.json({
            message: `Sync complete. Added ${totalNewVideos} new videos.`,
            newVideos: totalNewVideos,
            debug: {
                channelCount: channels.length,
                channels: debugInfo
            }
        })

    } catch (error: unknown) {
        console.error('Sync error:', error)
        return NextResponse.json({ error: getErrorMessage(error), newVideos: 0 }, { status: 500 })
    }
}
