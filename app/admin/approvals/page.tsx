'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/AuthProvider'
import { useRouter } from 'next/navigation'
import { CheckCircle, XCircle, Loader2, Users, ArrowLeft, Shield } from 'lucide-react'
import Link from 'next/link'

interface PendingUser {
    id: string
    username: string
    created_at: string
}

export default function ApprovalsPage() {
    const { user, loading: authLoading } = useAuth()
    const router = useRouter()
    const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([])
    const [loading, setLoading] = useState(true)
    const [processingId, setProcessingId] = useState<string | null>(null)
    const [error, setError] = useState('')

    useEffect(() => {
        if (!authLoading && (!user || !user.isAdmin)) {
            router.push('/login')
        }
    }, [user, authLoading, router])

    useEffect(() => {
        if (user?.isAdmin) {
            fetchPendingUsers()
        }
    }, [user])

    const fetchPendingUsers = async () => {
        try {
            const res = await fetch('/api/admin/approvals')
            if (res.ok) {
                const data = await res.json()
                setPendingUsers(data.users)
            }
        } catch (err) {
            setError('목록을 불러오는데 실패했습니다.')
        } finally {
            setLoading(false)
        }
    }

    const handleApproval = async (userId: string, action: 'approve' | 'reject') => {
        setProcessingId(userId)
        setError('')

        try {
            const res = await fetch('/api/admin/approvals', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, action })
            })

            if (res.ok) {
                setPendingUsers(prev => prev.filter(u => u.id !== userId))
            } else {
                const data = await res.json()
                setError(data.message || '처리에 실패했습니다.')
            }
        } catch (err) {
            setError('처리 중 오류가 발생했습니다.')
        } finally {
            setProcessingId(null)
        }
    }

    if (authLoading || !user?.isAdmin) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <Loader2 className="animate-spin text-blue-600" size={32} />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-100 py-8 px-4">
            <div className="max-w-2xl mx-auto">
                <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                    <div className="bg-indigo-600 p-6 text-white">
                        <div className="flex items-center gap-3 mb-2">
                            <Shield size={28} />
                            <h1 className="text-2xl font-bold">회원가입 승인 관리</h1>
                        </div>
                        <p className="text-indigo-100">대기 중인 회원가입 신청을 승인 또는 거부합니다.</p>
                    </div>

                    <div className="p-6">
                        <Link
                            href="/"
                            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-6"
                        >
                            <ArrowLeft size={16} />
                            홈으로 돌아가기
                        </Link>

                        {error && (
                            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4">
                                {error}
                            </div>
                        )}

                        {loading ? (
                            <div className="flex justify-center py-8">
                                <Loader2 className="animate-spin text-indigo-600" size={32} />
                            </div>
                        ) : pendingUsers.length === 0 ? (
                            <div className="text-center py-12 text-gray-500">
                                <Users className="mx-auto mb-4 text-gray-400" size={48} />
                                <p>대기 중인 회원가입 신청이 없습니다.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {pendingUsers.map((pendingUser) => (
                                    <div
                                        key={pendingUser.id}
                                        className="border border-gray-200 rounded-xl p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                                    >
                                        <div>
                                            <p className="font-semibold text-gray-800">{pendingUser.username}</p>
                                            <p className="text-xs text-gray-500">
                                                신청일: {new Date(pendingUser.created_at).toLocaleDateString('ko-KR')}
                                            </p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleApproval(pendingUser.id, 'approve')}
                                                disabled={processingId === pendingUser.id}
                                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
                                            >
                                                {processingId === pendingUser.id ? (
                                                    <Loader2 className="animate-spin" size={14} />
                                                ) : (
                                                    <CheckCircle size={14} />
                                                )}
                                                승인
                                            </button>
                                            <button
                                                onClick={() => handleApproval(pendingUser.id, 'reject')}
                                                disabled={processingId === pendingUser.id}
                                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
                                            >
                                                {processingId === pendingUser.id ? (
                                                    <Loader2 className="animate-spin" size={14} />
                                                ) : (
                                                    <XCircle size={14} />
                                                )}
                                                거부
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
