import { NextResponse } from 'next/server'
import { google } from 'googleapis'

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const videoId = searchParams.get('videoId')

        if (!videoId) {
            return NextResponse.json({ error: 'Video ID is required' }, { status: 400 })
        }

        const apiKey = process.env.YOUTUBE_API_KEY || process.env.GOOGLE_GEMINI_API_KEY

        if (!apiKey) {
            return NextResponse.json({ error: 'YouTube API Key not configured' }, { status: 500 })
        }

        const youtube = google.youtube({
            version: 'v3',
            auth: apiKey
        })

        // Fetch video details
        const videoResponse = await youtube.videos.list({
            part: ['snippet'],
            id: [videoId]
        })

        const video = videoResponse.data.items?.[0]

        if (!video) {
            return NextResponse.json({ error: 'Video not found' }, { status: 404 })
        }

        const snippet = video.snippet!

        return NextResponse.json({
            id: videoId,
            title: snippet.title,
            channel_name: snippet.channelTitle,
            thumbnail_url: snippet.thumbnails?.high?.url || snippet.thumbnails?.medium?.url || snippet.thumbnails?.default?.url,
            published_at: snippet.publishedAt
        })

    } catch (error: any) {
        console.error('Error fetching video:', error)
        return NextResponse.json({ error: error.message || 'Failed to fetch video' }, { status: 500 })
    }
}
