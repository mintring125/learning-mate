import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'
import { google } from 'googleapis'

export async function POST() {
    try {
        // 1. Get all channels
        const { data: channels, error: channelsError } = await supabase
            .from('channels')
            .select('*')

        if (channelsError) throw channelsError
        if (!channels || channels.length === 0) {
            return NextResponse.json({ message: 'No channels to sync' })
        }

        const apiKey = process.env.YOUTUBE_API_KEY || process.env.GOOGLE_GEMINI_API_KEY
        if (!apiKey) return NextResponse.json({ error: 'No API Key' }, { status: 500 })

        const youtube = google.youtube({ version: 'v3', auth: apiKey })
        let totalNewVideos = 0

        // 2. Loop through channels
        for (const channel of channels) {
            try {
                // Get Uploads Playlist
                // We could store uploads_playlist_id in DB to save a call, but for now fetch it.
                const channelRes = await youtube.channels.list({
                    part: ['contentDetails'],
                    id: [channel.channel_id]
                })

                const uploadsId = channelRes.data.items?.[0]?.contentDetails?.relatedPlaylists?.uploads
                if (!uploadsId) continue

                // Get Videos
                const playlistRes = await youtube.playlistItems.list({
                    part: ['snippet'],
                    playlistId: uploadsId,
                    maxResults: 20 // Check last 20 videos
                })

                const fetchedVideos = playlistRes.data.items || []

                // Filter existing (simple check, or allow insert to fail on conflict if we had unique constraint on url/video_id)
                // Since we don't have unique constraint on video URL defined in schema.sql (my bad), we should check manually or assume UI filters.
                // Let's check manually for now to avoid duplicates.

                for (const item of fetchedVideos) {
                    const videoId = item.snippet?.resourceId?.videoId
                    if (!videoId) continue

                    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`

                    // Check existence
                    const { data: existing } = await supabase
                        .from('videos')
                        .select('id')
                        .eq('url', videoUrl)
                        .single()

                    if (!existing) {
                        await supabase.from('videos').insert({
                            title: item.snippet?.title,
                            url: videoUrl,
                            thumbnail_url: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.medium?.url,
                            channel_name: channel.title,
                            channel_id: channel.id
                        })
                        totalNewVideos++
                    }
                }

            } catch (err) {
                console.error(`Failed to sync channel ${channel.title}`, err)
            }
        }

        return NextResponse.json({ message: `Sync complete. Added ${totalNewVideos} new videos.` })

    } catch (error: any) {
        console.error('Sync error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
