import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'

export async function POST(request: Request) {
    try {
        const { userId, status } = await request.json()

        if (!userId || !status) {
            return NextResponse.json({ message: 'Missing fields' }, { status: 400 })
        }

        const { error } = await supabase
            .from('users')
            .update({ status })
            .eq('id', userId)

        if (error) {
            return NextResponse.json({ message: 'Error updating user' }, { status: 500 })
        }

        return NextResponse.json({ message: 'Success' })

    } catch (error) {
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
    }
}
