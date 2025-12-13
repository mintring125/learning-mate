'use client'

import { useState } from 'react'
import { useAuth } from '@/components/AuthProvider'
import { Lock, Loader2, ArrowLeft, CheckCircle, Key } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function ChangePasswordPage() {
    const { user, loading: authLoading } = useAuth()
    const router = useRouter()
    const [currentPassword, setCurrentPassword] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [error, setError] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isSuccess, setIsSuccess] = useState(false)

    // Redirect if not logged in
    if (!authLoading && !user) {
        router.push('/login')
        return null
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')

        if (newPassword !== confirmPassword) {
            setError('새 비밀번호가 일치하지 않습니다.')
            return
        }

        if (newPassword.length < 4) {
            setError('비밀번호는 4자 이상이어야 합니다.')
            return
        }

        if (currentPassword === newPassword) {
            setError('현재 비밀번호와 새 비밀번호가 같습니다.')
            return
        }

        setIsSubmitting(true)

        try {
            const res = await fetch('/api/auth/change-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: user?.username,
                    currentPassword,
                    newPassword
                })
            })

            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.message || '비밀번호 변경에 실패했습니다.')
            }

            setIsSuccess(true)
        } catch (err: any) {
            setError(err.message || '비밀번호 변경에 실패했습니다.')
        } finally {
            setIsSubmitting(false)
        }
    }

    if (authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <Loader2 className="animate-spin text-blue-600" size={32} />
            </div>
        )
    }

    if (isSuccess) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
                <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden">
                    <div className="bg-green-600 p-8 text-center">
                        <CheckCircle className="mx-auto mb-4 text-white" size={48} />
                        <h1 className="text-2xl font-bold text-white mb-2">비밀번호 변경 완료</h1>
                        <p className="text-green-100">새 비밀번호로 변경되었습니다.</p>
                    </div>
                    <div className="p-8 text-center">
                        <Link
                            href="/"
                            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
                        >
                            <ArrowLeft size={16} />
                            홈으로 돌아가기
                        </Link>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden">
                <div className="bg-amber-600 p-8 text-center">
                    <Key className="mx-auto mb-2 text-white" size={32} />
                    <h1 className="text-2xl font-bold text-white mb-2">비밀번호 변경</h1>
                    <p className="text-amber-100">새로운 비밀번호를 설정하세요</p>
                </div>

                <div className="p-8">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {error && (
                            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm text-center">
                                {error}
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 block">현재 비밀번호</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-3 text-gray-400" size={20} />
                                <input
                                    type="password"
                                    required
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all"
                                    placeholder="현재 비밀번호 입력"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 block">새 비밀번호</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-3 text-gray-400" size={20} />
                                <input
                                    type="password"
                                    required
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all"
                                    placeholder="새 비밀번호 입력"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 block">새 비밀번호 확인</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-3 text-gray-400" size={20} />
                                <input
                                    type="password"
                                    required
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all"
                                    placeholder="새 비밀번호 다시 입력"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full bg-amber-600 text-white py-2.5 rounded-lg font-semibold hover:bg-amber-700 transition-colors shadow-md hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center"
                        >
                            {isSubmitting ? <Loader2 className="animate-spin" /> : '비밀번호 변경'}
                        </button>

                        <div className="text-center">
                            <Link href="/" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-700 text-sm">
                                <ArrowLeft size={16} />
                                홈으로 돌아가기
                            </Link>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )
}
