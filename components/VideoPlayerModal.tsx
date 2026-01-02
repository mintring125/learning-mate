'use client'

import { VideoWithLog } from '@/types'
import { X, CheckCircle, Circle, ExternalLink, StickyNote, Save, ChevronDown, ChevronUp, Eye, Edit3 } from 'lucide-react'
import { useState, useEffect, useCallback } from 'react'

// 플래시카드 토글 아이템 컴포넌트
function FlashcardItem({ content }: { content: string }) {
    const [revealed, setRevealed] = useState(false)
    const displayContent = content.slice(1).trim() // 앞의 / 제거

    return (
        <div
            onClick={() => setRevealed(!revealed)}
            className={`cursor-pointer border rounded-lg p-3 transition-all duration-200 ${revealed
                ? 'bg-green-50 border-green-300'
                : 'bg-gradient-to-r from-purple-50 via-blue-50 to-indigo-50 border-purple-200 hover:border-purple-400'
                }`}
        >
            <div className="flex items-center gap-2">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${revealed
                    ? 'bg-green-200 text-green-700'
                    : 'bg-purple-200 text-purple-700'
                    }`}>
                    {revealed ? '✓' : '?'}
                </span>
                {revealed ? (
                    <span className="text-gray-800 text-sm">{displayContent}</span>
                ) : (
                    <span className="text-purple-600 text-sm font-medium">탭하여 답 확인하기</span>
                )}
            </div>
        </div>
    )
}

// 메모 내용을 렌더링하는 컴포넌트
function NoteRenderer({ content }: { content: string }) {
    const lines = content.split('\n')

    return (
        <div className="space-y-2">
            {lines.map((line, index) => {
                if (line.startsWith('/')) {
                    return <FlashcardItem key={index} content={line} />
                }
                if (line.trim() === '') {
                    return <div key={index} className="h-2" />
                }
                return (
                    <p key={index} className="text-gray-700 text-sm leading-relaxed">
                        {line}
                    </p>
                )
            })}
        </div>
    )
}

interface VideoPlayerModalProps {
    video: VideoWithLog
    onClose: () => void
    onComplete: (videoId: string, isWatched: boolean) => void
    openWithNotes?: boolean
}

export default function VideoPlayerModal({ video, onClose, onComplete, openWithNotes = false }: VideoPlayerModalProps) {
    const [isWatched, setIsWatched] = useState(video.watch_count > 0)
    const [loading, setLoading] = useState(false)
    const [showNotes, setShowNotes] = useState(openWithNotes)
    const [noteContent, setNoteContent] = useState('')
    const [noteSaving, setNoteSaving] = useState(false)
    const [noteSaved, setNoteSaved] = useState(false)
    const [noteLoading, setNoteLoading] = useState(false)
    const [noteMode, setNoteMode] = useState<'edit' | 'preview'>('preview')

    const getVideoId = (url: string) => {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/
        const match = url.match(regExp)
        return (match && match[2].length === 11) ? match[2] : null
    }

    const videoId = getVideoId(video.url)

    // 메모 불러오기
    const loadNote = useCallback(async () => {
        setNoteLoading(true)
        try {
            const res = await fetch(`/api/notes?videoId=${video.id}`)
            const data = await res.json()
            if (data.note?.content) {
                setNoteContent(data.note.content)
            }
        } catch (error) {
            console.error('Failed to load note:', error)
        } finally {
            setNoteLoading(false)
        }
    }, [video.id])

    useEffect(() => {
        if (showNotes) {
            loadNote()
        }
    }, [showNotes, loadNote])

    // 메모 저장
    const saveNote = async () => {
        setNoteSaving(true)
        try {
            const res = await fetch('/api/notes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ videoId: video.id, content: noteContent })
            })
            if (res.ok) {
                setNoteSaved(true)
                setTimeout(() => setNoteSaved(false), 2000)
            }
        } catch (error) {
            console.error('Failed to save note:', error)
        } finally {
            setNoteSaving(false)
        }
    }

    const handleToggle = async () => {
        setLoading(true)
        onComplete(video.id, isWatched)
        setIsWatched(!isWatched)
        setLoading(false)
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-5xl rounded-2xl overflow-hidden shadow-2xl flex flex-col landscape:flex-row max-h-[95vh] landscape:max-h-[90vh]">
                {/* Header - 세로모드에서만 표시 */}
                <div className="landscape:hidden flex items-center justify-between p-3 sm:p-4 border-b border-gray-100 bg-gray-50">
                    <div className="flex items-center gap-3 min-w-0">
                        <h3 className="font-semibold text-base sm:text-lg text-gray-800 line-clamp-1">{video.title}</h3>
                        {isWatched && (
                            <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full flex-shrink-0">
                                시청완료
                            </span>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-200 rounded-full transition-colors flex-shrink-0"
                    >
                        <X size={24} className="text-gray-500" />
                    </button>
                </div>

                {/* Player Container */}
                <div className="relative bg-black landscape:flex-1 landscape:min-w-0">
                    <div className="relative pt-[56.25%] landscape:pt-0 landscape:h-full">
                        {videoId ? (
                            <iframe
                                className="absolute inset-0 w-full h-full"
                                src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
                                title={video.title}
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                            ></iframe>
                        ) : (
                            <div className="absolute inset-0 flex items-center justify-center text-white">
                                영상을 불러올 수 없습니다
                            </div>
                        )}
                    </div>
                </div>

                {/* Actions - 가로모드에서 오른쪽, 세로모드에서 아래 */}
                <div className="p-4 sm:p-6 bg-white flex flex-col sm:flex-row landscape:flex-col items-center justify-between gap-3 sm:gap-4 landscape:w-48 landscape:justify-start landscape:items-stretch">
                    {/* 가로모드 헤더 (닫기 버튼 + 제목) */}
                    <div className="hidden landscape:flex landscape:flex-col landscape:gap-3 landscape:w-full landscape:mb-2">
                        <button
                            onClick={onClose}
                            className="self-end p-2 hover:bg-gray-200 rounded-full transition-colors"
                        >
                            <X size={20} className="text-gray-500" />
                        </button>
                        <h3 className="font-semibold text-sm text-gray-800 line-clamp-2">{video.title}</h3>
                        {isWatched && (
                            <span className="self-start px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                                시청완료
                            </span>
                        )}
                    </div>

                    <div className="flex gap-3 sm:gap-4 w-full sm:w-auto landscape:flex-col">
                        <button
                            onClick={handleToggle}
                            disabled={loading}
                            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl font-semibold transition-all text-sm sm:text-base ${isWatched
                                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg hover:shadow-blue-500/30'
                                }`}
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            ) : isWatched ? (
                                <CheckCircle size={18} />
                            ) : (
                                <Circle size={18} />
                            )}
                            <span className="landscape:hidden sm:landscape:inline">{isWatched ? '시청완료' : '시청완료로 표시'}</span>
                            <span className="hidden landscape:inline sm:landscape:hidden">{isWatched ? '완료' : '완료표시'}</span>
                        </button>



                        {/* 메모 버튼 */}
                        <button
                            onClick={() => setShowNotes(!showNotes)}
                            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl font-semibold transition-colors border text-sm sm:text-base ${showNotes
                                ? 'bg-amber-100 text-amber-700 border-amber-300'
                                : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-200'
                                }`}
                        >
                            <StickyNote size={18} />
                            <span className="landscape:hidden sm:landscape:inline">메모</span>
                            <span className="hidden landscape:inline sm:landscape:hidden">메모</span>
                            {showNotes ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                    </div>

                    <a
                        href={video.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs sm:text-sm text-gray-500 hover:text-gray-900 flex items-center gap-1 hover:underline landscape:mt-auto"
                    >
                        <span className="landscape:hidden">YouTube에서 보기</span>
                        <span className="hidden landscape:inline">YouTube</span>
                        <ExternalLink size={14} />
                    </a>
                </div>
            </div>

            {/* Notes Panel - 별도의 슬라이드 패널 */}
            <div className={`fixed right-0 top-0 h-full w-full sm:w-96 bg-white shadow-2xl transform transition-transform duration-300 z-60 ${showNotes ? 'translate-x-0' : 'translate-x-full'
                }`}>
                <div className="flex flex-col h-full">
                    {/* 메모 헤더 */}
                    <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-amber-50 to-yellow-50">
                        <div className="flex items-center gap-2">
                            <StickyNote className="text-amber-600" size={20} />
                            <h3 className="font-semibold text-gray-800">메모</h3>
                        </div>
                        <button
                            onClick={() => setShowNotes(false)}
                            className="p-2 hover:bg-amber-100 rounded-full transition-colors"
                        >
                            <X size={20} className="text-gray-500" />
                        </button>
                    </div>

                    {/* 편집/미리보기 탭 */}
                    <div className="flex border-b border-gray-200">
                        <button
                            onClick={() => setNoteMode('edit')}
                            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors ${noteMode === 'edit'
                                ? 'text-amber-700 bg-amber-50 border-b-2 border-amber-500'
                                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                                }`}
                        >
                            <Edit3 size={16} />
                            편집
                        </button>
                        <button
                            onClick={() => setNoteMode('preview')}
                            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors ${noteMode === 'preview'
                                ? 'text-purple-700 bg-purple-50 border-b-2 border-purple-500'
                                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                                }`}
                        >
                            <Eye size={16} />
                            복습
                        </button>
                    </div>

                    {/* 메모 내용 */}
                    <div className="flex-1 p-4 overflow-auto">
                        {noteLoading ? (
                            <div className="flex items-center justify-center h-full">
                                <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin" />
                            </div>
                        ) : noteMode === 'edit' ? (
                            <textarea
                                value={noteContent}
                                onChange={(e) => setNoteContent(e.target.value)}
                                placeholder={`영상을 보며 메모를 작성해보세요...\n\n💡 중요한 내용\n📝 핵심 키워드\n\n📌 플래시카드 만들기:\n줄 앞에 /를 붙이면 복습 시 숨겨집니다!\n예시: /일본의 수도는 도쿄입니다`}
                                className="w-full h-full resize-none border border-gray-200 rounded-xl p-4 text-gray-700 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent placeholder:text-gray-400 text-sm leading-relaxed"
                            />
                        ) : noteContent.trim() ? (
                            <NoteRenderer content={noteContent} />
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-gray-400">
                                <StickyNote size={40} className="mb-2 opacity-50" />
                                <p className="text-sm">아직 메모가 없습니다</p>
                            </div>
                        )}
                    </div>

                    {/* 저장 버튼 */}
                    <div className="p-4 border-t border-gray-200 bg-gray-50">
                        <button
                            onClick={saveNote}
                            disabled={noteSaving}
                            className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold transition-all ${noteSaved
                                ? 'bg-green-500 text-white'
                                : 'bg-amber-500 hover:bg-amber-600 text-white shadow-lg hover:shadow-amber-500/30'
                                }`}
                        >
                            {noteSaving ? (
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : noteSaved ? (
                                <>
                                    <CheckCircle size={18} />
                                    저장완료!
                                </>
                            ) : (
                                <>
                                    <Save size={18} />
                                    메모 저장
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Overlay for notes panel on mobile */}
            {showNotes && (
                <div
                    className="fixed inset-0 bg-black/30 z-55 sm:hidden"
                    onClick={() => setShowNotes(false)}
                />
            )}
        </div>
    )
}
