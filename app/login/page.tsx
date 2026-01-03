'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/AuthProvider'
import { Lock, User, Loader2, UserPlus } from 'lucide-react'
import Link from 'next/link'

export default function LoginPage() {
    const router = useRouter()
    const { user, loading: authLoading, login } = useAuth()
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)

    // If user is already logged in, redirect to main page
    useEffect(() => {
        if (!authLoading && user) {
            router.replace('/') // Use replace to prevent back button loop
        }
    }, [user, authLoading, router])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setIsSubmitting(true)

        try {
            await login(username, password)
        } catch (err: any) {
            setError(err.message || '로그인에 실패했습니다.')
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center px-4 relative">
            {/* Background Pattern Overlay if needed, or rely on layout */}

            <div className="max-w-md w-full bg-[var(--surface)] rounded-[1.5rem] md:rounded-[2.5rem] border-4 md:border-8 border-[var(--border)] shadow-[0_6px_0_var(--border)] md:shadow-[0_10px_0_var(--border)] overflow-hidden relative">
                {/* Decorative Screw Heads */}
                <div className="absolute top-2 md:top-4 left-2 md:left-4 w-2 md:w-3 h-2 md:h-3 rounded-full bg-[var(--border)] shadow-inner"></div>
                <div className="absolute top-2 md:top-4 right-2 md:right-4 w-2 md:w-3 h-2 md:h-3 rounded-full bg-[var(--border)] shadow-inner"></div>

                <div className="bg-[var(--primary)] p-4 md:p-8 text-center border-b-2 md:border-b-4 border-[var(--primary-dark)] relative">
                    <div className="bg-white/30 absolute inset-0 rotate-3 scale-150 pointer-events-none transform origin-center opacity-30"></div>
                    <div className="relative z-10 flex flex-col items-center">
                        <div className="bg-white p-2 md:p-3 rounded-full shadow-lg mb-2 md:mb-3">
                            <img src="/assets/theme/leaf_logo.png" alt="Leaf Logo" className="w-8 h-8 md:w-10 md:h-10 object-contain" />
                        </div>
                        <h1 className="text-xl md:text-2xl font-black text-white drop-shadow-md tracking-wide">학습 여권</h1>
                        <p className="text-[var(--primary-light)] font-bold text-xs md:text-sm mt-1 opacity-90">Nook Inc. Learning Service</p>
                    </div>
                </div>

                <div className="p-4 md:p-8">
                    <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
                        {error && (
                            <div className="bg-red-50 border-2 border-red-100 text-red-500 p-3 rounded-xl text-sm text-center font-bold">
                                {error}
                            </div>
                        )}

                        <div className="space-y-1 md:space-y-2">
                            <label className="text-xs md:text-sm font-bold text-[var(--foreground)] block ml-2">여권 번호 (아이디)</label>
                            <div className="relative group">
                                <User className="absolute left-3 md:left-4 top-2.5 md:top-3.5 text-[var(--foreground-muted)] group-focus-within:text-[var(--primary)] transition-colors" size={18} />
                                <input
                                    type="text"
                                    required
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full pl-10 md:pl-12 pr-4 py-2.5 md:py-3 bg-[var(--background-subtle)] border-2 border-[var(--border)] rounded-2xl md:rounded-3xl text-[var(--foreground)] placeholder-[var(--foreground-muted)] focus:border-[var(--primary)] focus:ring-0 outline-none transition-all font-bold text-sm md:text-base"
                                    placeholder="아이디를 입력하세요"
                                />
                            </div>
                        </div>

                        <div className="space-y-1 md:space-y-2">
                            <label className="text-xs md:text-sm font-bold text-[var(--foreground)] block ml-2">비밀번호</label>
                            <div className="relative group">
                                <Lock className="absolute left-3 md:left-4 top-2.5 md:top-3.5 text-[var(--foreground-muted)] group-focus-within:text-[var(--primary)] transition-colors" size={18} />
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-10 md:pl-12 pr-4 py-2.5 md:py-3 bg-[var(--background-subtle)] border-2 border-[var(--border)] rounded-2xl md:rounded-3xl text-[var(--foreground)] placeholder-[var(--foreground-muted)] focus:border-[var(--primary)] focus:ring-0 outline-none transition-all font-bold text-sm md:text-base"
                                    placeholder="비밀번호를 입력하세요"
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-between px-2">
                            <label className="flex items-center gap-2 cursor-pointer group">
                                <div className="relative flex items-center">
                                    <input type="checkbox" className="peer sr-only" defaultChecked />
                                    <div className="w-5 h-5 border-2 border-[var(--border)] rounded-md bg-[var(--background-subtle)] peer-checked:bg-[var(--primary)] peer-checked:border-[var(--primary)] transition-all"></div>
                                    <div className="absolute inset-0 text-white hidden peer-checked:flex items-center justify-center">
                                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                    </div>
                                </div>
                                <span className="text-xs md:text-sm font-bold text-[var(--foreground-muted)] group-hover:text-[var(--foreground)] transition-colors">자동 체크인</span>
                            </label>
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white py-3 md:py-3.5 rounded-full font-black text-base md:text-lg shadow-[0_4px_0_var(--primary-dark)] hover:shadow-[0_6px_0_var(--primary-dark)] hover:-translate-y-0.5 active:translate-y-1 active:shadow-none transition-all disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                        >
                            {isSubmitting ? <Loader2 className="animate-spin" /> : '체크인 하기'}
                        </button>

                        <div className="text-center mt-4 md:mt-6">
                            <Link href="/register" className="inline-flex items-center gap-1.5 md:gap-2 text-[var(--foreground-muted)] hover:text-[var(--primary)] text-xs md:text-sm font-extrabold transition-colors bg-[var(--background-subtle)] px-3 md:px-4 py-1.5 md:py-2 rounded-full hover:bg-white border hover:border-[var(--primary)] text-center">
                                <UserPlus size={16} />
                                <span>새로운 여권 만들기 (회원가입)</span>
                            </Link>
                        </div>
                    </form>
                </div>

                {/* Decorative Bottom */}
                <div className="h-2 md:h-4 bg-[var(--background-subtle)] border-t-2 border-[var(--border)]"></div>
            </div>
        </div>
    )
}
