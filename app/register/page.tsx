'use client'

import { useState } from 'react'
import { User, Lock, Loader2, ArrowLeft, CheckCircle, UserPlus } from 'lucide-react'
import Link from 'next/link'

export default function RegisterPage() {
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [error, setError] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isSuccess, setIsSuccess] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')

        if (password !== confirmPassword) {
            setError('비밀번호가 일치하지 않습니다.')
            return
        }

        if (password.length < 4) {
            setError('비밀번호는 4자 이상이어야 합니다.')
            return
        }

        setIsSubmitting(true)

        try {
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            })

            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.message || '회원가입에 실패했습니다.')
            }

            setIsSuccess(true)
        } catch (err: any) {
            setError(err.message || '회원가입에 실패했습니다.')
        } finally {
            setIsSubmitting(false)
        }
    }

    if (isSuccess) {
        return (
            <div className="min-h-screen flex items-center justify-center px-4 relative">
                <div className="max-w-md w-full bg-[#fdfbf7] rounded-[1.5rem] md:rounded-[2.5rem] border-4 md:border-8 border-[#e6dcc8] shadow-[0_6px_0_rgba(214,204,184,1)] md:shadow-[0_10px_0_rgba(214,204,184,1)] overflow-hidden relative">
                    <div className="bg-[#74c74a] p-4 md:p-8 text-center border-b-2 md:border-b-4 border-[#65ab40]">
                        <CheckCircle className="mx-auto mb-2 md:mb-4 text-white drop-shadow-md" size={36} strokeWidth={2.5} />
                        <h1 className="text-xl md:text-2xl font-black text-white drop-shadow-sm mb-1 md:mb-2">여권 발급 신청 완료!</h1>
                        <p className="text-green-50 font-bold text-xs md:text-base">도착하면 너굴 사장님(관리자)의<br />승인을 기다려주세요.</p>
                    </div>
                    <div className="p-4 md:p-8 text-center bg-[#fdfbf7]">
                        <Link
                            href="/login"
                            className="inline-flex items-center gap-1.5 md:gap-2 text-[#8b5e3c] hover:text-[#74c74a] font-extrabold text-base md:text-lg px-4 md:px-6 py-2 md:py-3 rounded-full bg-[#f4ebd0] hover:bg-white transition-all shadow-sm border-2 border-transparent hover:border-[#74c74a]"
                        >
                            <ArrowLeft size={18} />
                            체크인 화면으로
                        </Link>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex items-center justify-center px-4 relative">
            <div className="max-w-md w-full bg-[#fdfbf7] rounded-[1.5rem] md:rounded-[2.5rem] border-4 md:border-8 border-[#e6dcc8] shadow-[0_6px_0_rgba(214,204,184,1)] md:shadow-[0_10px_0_rgba(214,204,184,1)] overflow-hidden relative">
                {/* Decorative Screw Heads */}
                <div className="absolute top-2 md:top-4 left-2 md:left-4 w-2 md:w-3 h-2 md:h-3 rounded-full bg-[#d6ccb8] shadow-inner"></div>
                <div className="absolute top-2 md:top-4 right-2 md:right-4 w-2 md:w-3 h-2 md:h-3 rounded-full bg-[#d6ccb8] shadow-inner"></div>

                <div className="bg-[#a8e0ff] p-4 md:p-8 text-center border-b-2 md:border-b-4 border-[#8ec7e6] relative">
                    <div className="bg-white/30 absolute inset-0 -rotate-3 scale-150 pointer-events-none transform origin-center opacity-30"></div>
                    <div className="relative z-10 flex flex-col items-center">
                        <div className="bg-white p-2 md:p-3 rounded-full shadow-lg mb-2 md:mb-3">
                            <UserPlus className="w-8 h-8 md:w-10 md:h-10 text-[#4fb0d6]" />
                        </div>
                        <h1 className="text-xl md:text-2xl font-black text-[#007096] drop-shadow-sm tracking-wide">여권 발급 신청</h1>
                        <p className="text-[#007096]/70 font-bold text-xs md:text-sm mt-1">새로운 모험을 시작해볼까요?</p>
                    </div>
                </div>

                <div className="p-4 md:p-8">
                    <form onSubmit={handleSubmit} className="space-y-3 md:space-y-5">
                        {error && (
                            <div className="bg-red-50 border-2 border-red-100 text-red-500 p-3 rounded-xl text-sm text-center font-bold">
                                {error}
                            </div>
                        )}

                        <div className="space-y-1">
                            <label className="text-xs md:text-sm font-bold text-[#8b5e3c] block ml-2">사용자 이름</label>
                            <div className="relative group">
                                <User className="absolute left-3 md:left-4 top-2.5 md:top-3.5 text-[#b09b86] group-focus-within:text-[#007096] transition-colors" size={18} />
                                <input
                                    type="text"
                                    required
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full pl-10 md:pl-12 pr-4 py-2.5 md:py-3 bg-[#fffbf0] border-2 border-[#e6dcc8] rounded-2xl md:rounded-3xl text-[#5d4037] placeholder-[#d6ccb8] focus:border-[#4fb0d6] focus:ring-0 outline-none transition-all font-bold text-sm md:text-base"
                                    placeholder="사용할 아이디 입력"
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs md:text-sm font-bold text-[#8b5e3c] block ml-2">비밀번호</label>
                            <div className="relative group">
                                <Lock className="absolute left-3 md:left-4 top-2.5 md:top-3.5 text-[#b09b86] group-focus-within:text-[#007096] transition-colors" size={18} />
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-10 md:pl-12 pr-4 py-2.5 md:py-3 bg-[#fffbf0] border-2 border-[#e6dcc8] rounded-2xl md:rounded-3xl text-[#5d4037] placeholder-[#d6ccb8] focus:border-[#4fb0d6] focus:ring-0 outline-none transition-all font-bold text-sm md:text-base"
                                    placeholder="비밀번호 입력"
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs md:text-sm font-bold text-[#8b5e3c] block ml-2">비밀번호 확인</label>
                            <div className="relative group">
                                <Lock className="absolute left-3 md:left-4 top-2.5 md:top-3.5 text-[#b09b86] group-focus-within:text-[#007096] transition-colors" size={18} />
                                <input
                                    type="password"
                                    required
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full pl-10 md:pl-12 pr-4 py-2.5 md:py-3 bg-[#fffbf0] border-2 border-[#e6dcc8] rounded-2xl md:rounded-3xl text-[#5d4037] placeholder-[#d6ccb8] focus:border-[#4fb0d6] focus:ring-0 outline-none transition-all font-bold text-sm md:text-base"
                                    placeholder="비밀번호 다시 입력"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full bg-[#4fb0d6] hover:bg-[#3ca0c5] text-white py-3 md:py-3.5 rounded-full font-black text-base md:text-lg shadow-[0_4px_0_#2b82a6] hover:shadow-[0_6px_0_#2b82a6] hover:-translate-y-0.5 active:translate-y-1 active:shadow-none transition-all disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center gap-2 mt-3 md:mt-4"
                        >
                            {isSubmitting ? <Loader2 className="animate-spin" /> : '발급 신청하기'}
                        </button>

                        <div className="text-center mt-3 md:mt-4">
                            <Link href="/login" className="inline-flex items-center gap-1.5 md:gap-2 text-[#8b5e3c] hover:text-[#007096] text-xs md:text-sm font-extrabold transition-colors">
                                <ArrowLeft size={14} />
                                체크인 화면으로 돌아가기
                            </Link>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )
}
