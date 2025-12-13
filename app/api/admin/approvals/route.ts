import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'

// GET: Fetch pending users
export async function GET() {
    try {
        const { data: users, error } = await supabase
            .from('users')
            .select('id, username, created_at')
            .eq('status', 'pending')
            .order('created_at', { ascending: true })

        if (error) {
            console.error('Error fetching pending users:', error)
            return NextResponse.json({ message: 'Failed to fetch pending users' }, { status: 500 })
        }

        return NextResponse.json({ users: users || [] })

    } catch (error) {
        console.error('Error:', error)
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
    }
}

// POST: Approve or reject a user
export async function POST(request: Request) {
    try {
        const { userId, action } = await request.json()

        if (!userId || !action) {
            return NextResponse.json({ message: 'User ID and action are required' }, { status: 400 })
        }

        if (action !== 'approve' && action !== 'reject') {
            return NextResponse.json({ message: 'Invalid action' }, { status: 400 })
        }

        const newStatus = action === 'approve' ? 'approved' : 'rejected'

        const { error } = await supabase
            .from('users')
            .update({ status: newStatus })
            .eq('id', userId)

        if (error) {
            console.error('Error updating user status:', error)
            return NextResponse.json({ message: 'Failed to update user status' }, { status: 500 })
        }

        return NextResponse.json({
            message: action === 'approve' ? '승인되었습니다.' : '거부되었습니다.',
            status: newStatus
        })

    } catch (error) {
        console.error('Error:', error)
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
    }
}
