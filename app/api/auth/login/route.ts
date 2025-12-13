import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'

export async function POST(request: Request) {
    try {
        const { username, password } = await request.json()

        if (!username || !password) {
            return NextResponse.json({ message: 'Username and password are required' }, { status: 400 })
        }

        // Check if user exists and verify password
        const { data: user, error } = await supabase
            .from('users')
            .select('id, username, password, status, is_admin')
            .eq('username', username)
            .single()

        if (error || !user) {
            return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 })
        }

        // Check password
        if (user.password !== password) {
            return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 })
        }

        // Check if user is approved (admin is always allowed)
        if (!user.is_admin && user.status !== 'approved') {
            if (user.status === 'pending') {
                return NextResponse.json({ message: '계정 승인 대기 중입니다. 관리자 승인 후 로그인할 수 있습니다.' }, { status: 403 })
            } else if (user.status === 'rejected') {
                return NextResponse.json({ message: '계정이 거부되었습니다.' }, { status: 403 })
            }
            return NextResponse.json({ message: '계정이 활성화되지 않았습니다.' }, { status: 403 })
        }

        // Return user data (without password)
        return NextResponse.json({
            user: {
                id: user.id,
                username: user.username,
                isAdmin: user.is_admin || false
            }
        })

    } catch (error) {
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
    }
}
