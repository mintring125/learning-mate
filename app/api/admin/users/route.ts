import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'

export async function GET(request: Request) {
    // SECURITY TODO: This should verify the requester is an admin
    // Currently relying on client-side check or if we had sessions
    // For now, we just list users (assuming this route is protected or hidden)
    // Ideally we pass a session token and verify "is_admin"

    try {
        const { data: users, error } = await supabase
            .from('users')
            .select('id, username, status, is_admin, created_at')
            .order('created_at', { ascending: false })

        if (error) {
            return NextResponse.json({ message: 'Error fetching users' }, { status: 500 })
        }

        return NextResponse.json({ users })

    } catch (error) {
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
    }
}
