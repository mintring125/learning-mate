'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/AuthProvider'
import { Check, X, Shield, User, Loader2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface UserData {
    id: string
    username: string
    status: 'pending' | 'approved' | 'rejected'
    created_at?: string
    is_admin: boolean
}

export default function AdminUsersPage() {
    const { user, loading: authLoading } = useAuth()
    const router = useRouter()
    const [users, setUsers] = useState<UserData[]>([])
    const [loading, setLoading] = useState(true)
    const [actionLoading, setActionLoading] = useState<string | null>(null)

    useEffect(() => {
        if (!authLoading && !user) {
            router.replace('/login')
            return
        }

        if (!authLoading && user && !user.isAdmin) {
            alert('관리자만 접근할 수 있습니다.')
            router.replace('/')
            return
        }

        if (user?.isAdmin) {
            fetchUsers()
        }
    }, [user, authLoading, router])

    const fetchUsers = async () => {
        try {
            const res = await fetch('/api/admin/users')
            if (res.ok) {
                const data = await res.json()
                setUsers(data.users)
            }
        } catch (error) {
            console.error('Failed to fetch users', error)
        } finally {
            setLoading(false)
        }
    }

    const handleStatusChange = async (userId: string, newStatus: 'approved' | 'rejected') => {
        setActionLoading(userId)
        try {
            const res = await fetch('/api/admin/approve', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, status: newStatus })
            })

            if (res.ok) {
                setUsers(users.map(u => u.id === userId ? { ...u, status: newStatus } : u))
            } else {
                alert('처리 중 오류가 발생했습니다.')
            }
        } catch (error) {
            console.error('Error updating status:', error)
            alert('오류가 발생했습니다.')
        } finally {
            setActionLoading(null)
        }
    }

    if (loading || authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
                <Loader2 className="animate-spin text-[var(--primary)]" size={32} />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[var(--background)] p-4 md:p-8">
            <div className="max-w-4xl mx-auto">
                <div className="mb-8 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/" className="p-2 hover:bg-[var(--background-subtle)] rounded-full transition-colors text-[var(--foreground-muted)]">
                            <ArrowLeft size={24} />
                        </Link>
                        <h1 className="text-2xl font-bold text-[var(--foreground)] flex items-center gap-2">
                            <Shield className="text-[var(--primary)]" />
                            사용자 관리
                        </h1>
                    </div>
                </div>

                <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] overflow-hidden shadow-sm">
                    <div className="p-6 border-b border-[var(--border)]">
                        <h2 className="font-bold text-lg text-[var(--foreground)]">승인 대기 중인 사용자</h2>
                    </div>

                    <div className="divide-y divide-[var(--border)]">
                        {users.filter(u => u.status === 'pending').length === 0 ? (
                            <div className="p-8 text-center text-[var(--foreground-muted)]">
                                대기 중인 사용자가 없습니다.
                            </div>
                        ) : (
                            users
                                .filter(u => u.status === 'pending')
                                .map(user => (
                                    <div key={user.id} className="p-4 flex items-center justify-between hover:bg-[var(--background-subtle)] transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-[var(--background-subtle)] flex items-center justify-center text-[var(--foreground-muted)]">
                                                <User size={20} />
                                            </div>
                                            <div>
                                                <div className="font-bold text-[var(--foreground)]">{user.username}</div>
                                                <div className="text-xs text-[var(--foreground-muted)]">상태: 승인 대기</div>
                                            </div>
                                        </div>

                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleStatusChange(user.id, 'approved')}
                                                disabled={actionLoading === user.id}
                                                className="px-3 py-1.5 bg-[var(--primary)] text-white text-sm font-bold rounded-lg hover:bg-[var(--primary-dark)] transition-colors flex items-center gap-1 disabled:opacity-50"
                                            >
                                                {actionLoading === user.id ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                                                승인
                                            </button>
                                            <button
                                                onClick={() => handleStatusChange(user.id, 'rejected')}
                                                disabled={actionLoading === user.id}
                                                className="px-3 py-1.5 bg-red-500 text-white text-sm font-bold rounded-lg hover:bg-red-600 transition-colors flex items-center gap-1 disabled:opacity-50"
                                            >
                                                {actionLoading === user.id ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
                                                거절
                                            </button>
                                        </div>
                                    </div>
                                ))
                        )}
                    </div>
                </div>

                <div className="mt-8 bg-[var(--surface)] rounded-2xl border border-[var(--border)] overflow-hidden shadow-sm">
                    <div className="p-6 border-b border-[var(--border)]">
                        <h2 className="font-bold text-lg text-[var(--foreground)]">모든 사용자</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-[var(--foreground-muted)] uppercase bg-[var(--background-subtle)] border-b border-[var(--border)]">
                                <tr>
                                    <th className="px-6 py-3">사용자명</th>
                                    <th className="px-6 py-3">상태</th>
                                    <th className="px-6 py-3">권한</th>
                                    <th className="px-6 py-3">관리</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map(user => (
                                    <tr key={user.id} className="bg-[var(--surface)] border-b border-[var(--border)] hover:bg-[var(--background-subtle)]">
                                        <td className="px-6 py-4 font-medium text-[var(--foreground)]">
                                            {user.username}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${user.status === 'approved' ? 'bg-[var(--primary-light)] text-[var(--primary)]' :
                                                    user.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                                        'bg-red-100 text-red-700'
                                                }`}>
                                                {user.status === 'approved' ? '승인됨' : user.status === 'pending' ? '대기중' : '거절됨'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-[var(--foreground-muted)]">
                                            {user.is_admin ? '관리자' : '일반'}
                                        </td>
                                        <td className="px-6 py-4">
                                            {user.status !== 'approved' && !user.is_admin && (
                                                <button onClick={() => handleStatusChange(user.id, 'approved')} className="text-[var(--primary)] hover:underline">
                                                    승인하기
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    )
}
