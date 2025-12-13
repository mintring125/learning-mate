import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'

export async function POST(request: Request) {
    try {
        const { username, password } = await request.json()

        if (!username || !password) {
            return NextResponse.json({ message: '사용자 이름과 비밀번호를 입력해주세요.' }, { status: 400 })
        }

        if (username.length < 2) {
            return NextResponse.json({ message: '사용자 이름은 2자 이상이어야 합니다.' }, { status: 400 })
        }

        if (password.length < 4) {
            return NextResponse.json({ message: '비밀번호는 4자 이상이어야 합니다.' }, { status: 400 })
        }

        // Check if username already exists
        const { data: existingUser } = await supabase
            .from('users')
            .select('id')
            .eq('username', username)
            .single()

        if (existingUser) {
            return NextResponse.json({ message: '이미 사용 중인 사용자 이름입니다.' }, { status: 409 })
        }

        // Create new user with pending status
        const { data: newUser, error } = await supabase
            .from('users')
            .insert({
                username,
                password,
                status: 'pending',
                is_admin: false
            })
            .select('id, username')
            .single()

        if (error) {
            console.error('Registration error:', error)
            return NextResponse.json({ message: '회원가입 처리 중 오류가 발생했습니다.' }, { status: 500 })
        }

        return NextResponse.json({
            message: '회원가입 신청이 완료되었습니다. 관리자 승인 후 로그인할 수 있습니다.',
            user: newUser
        })

    } catch (error) {
        console.error('Registration error:', error)
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
    }
}
