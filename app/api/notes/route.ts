import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

// GET notes for a video
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url)
    const videoId = searchParams.get('videoId')

    if (!videoId) {
        return NextResponse.json({ error: 'videoId is required' }, { status: 400 })
    }

    const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('video_id', videoId)
        .order('created_at', { ascending: false })
        .single()

    if (error && error.code !== 'PGRST116') {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ note: data })
}

// POST or UPDATE a note for a video
export async function POST(request: NextRequest) {
    const body = await request.json()
    const { videoId, content } = body

    if (!videoId) {
        return NextResponse.json({ error: 'videoId is required' }, { status: 400 })
    }

    // Check if note already exists
    const { data: existing } = await supabase
        .from('notes')
        .select('id')
        .eq('video_id', videoId)
        .single()

    let result
    if (existing) {
        // Update existing note
        result = await supabase
            .from('notes')
            .update({ content, updated_at: new Date().toISOString() })
            .eq('video_id', videoId)
            .select()
            .single()
    } else {
        // Insert new note
        result = await supabase
            .from('notes')
            .insert({ video_id: videoId, content })
            .select()
            .single()
    }

    if (result.error) {
        return NextResponse.json({ error: result.error.message }, { status: 500 })
    }

    return NextResponse.json({ note: result.data })
}
