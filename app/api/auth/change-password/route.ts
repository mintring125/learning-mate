import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'

export async function POST(request: Request) {
    try {
        const { username, currentPassword, newPassword } = await request.json()

        if (!username || !currentPassword || !newPassword) {
            return NextResponse.json({ message: '모든 필드를 입력해주세요.' }, { status: 400 })
        }

        if (newPassword.length < 4) {
            return NextResponse.json({ message: '비밀번호는 4자 이상이어야 합니다.' }, { status: 400 })
        }

        // Check if user exists and verify current password
        const { data: user, error: fetchError } = await supabase
            .from('users')
            .select('id, password')
            .eq('username', username)
            .single()

        if (fetchError || !user) {
            return NextResponse.json({ message: '사용자를 찾을 수 없습니다.' }, { status: 404 })
        }

        // Verify current password
        if (user.password !== currentPassword) {
            return NextResponse.json({ message: '현재 비밀번호가 올바르지 않습니다.' }, { status: 401 })
        }

        // Update password
        const { error: updateError } = await supabase
            .from('users')
            .update({ password: newPassword })
            .eq('id', user.id)

        if (updateError) {
            console.error('Password update error:', updateError)
            return NextResponse.json({ message: '비밀번호 변경 중 오류가 발생했습니다.' }, { status: 500 })
        }

        return NextResponse.json({ message: '비밀번호가 변경되었습니다.' })

    } catch (error) {
        console.error('Change password error:', error)
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
    }
}
