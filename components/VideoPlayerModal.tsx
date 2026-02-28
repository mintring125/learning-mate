'use client'

import { VideoWithLog } from '@/types'
import { X, CheckCircle, Circle, ExternalLink, StickyNote, Save, ChevronDown, ChevronUp, Eye, Edit3, Mic, MicOff } from 'lucide-react'
import { useState, useEffect, useCallback, useRef } from 'react'

type STTLang = 'ko-KR' | 'en-US' | 'ja-JP'

interface SpeechRecognitionAlternativeLike {
    transcript: string
}

interface SpeechRecognitionResultLike {
    0: SpeechRecognitionAlternativeLike
    isFinal: boolean
}

interface SpeechRecognitionEventLike extends Event {
    results: ArrayLike<SpeechRecognitionResultLike>
    resultIndex?: number
}

interface SpeechRecognitionLike {
    lang: string
    continuous: boolean
    interimResults: boolean
    onresult: ((event: SpeechRecognitionEventLike) => void) | null
    onerror: ((event: Event) => void) | null
    onend: (() => void) | null
    start: () => void
    stop: () => void
}

interface SpeechRecognitionConstructorLike {
    new(): SpeechRecognitionLike
}

declare global {
    interface Window {
        SpeechRecognition?: SpeechRecognitionConstructorLike
        webkitSpeechRecognition?: SpeechRecognitionConstructorLike
    }
}

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

interface NotesPanelProps {
    noteMode: 'edit' | 'preview'
    setNoteMode: (mode: 'edit' | 'preview') => void
    noteLoading: boolean
    noteContent: string
    setNoteContent: (content: string) => void
    noteSaving: boolean
    noteSaved: boolean
    saveNote: () => void
    closeNotes: () => void
    sttSupported: boolean
    sttLang: STTLang
    slashPrefixEnabled: boolean
    toggleSlashPrefix: () => void
    setSttLanguage: (lang: STTLang) => void
    isListening: boolean
    startSTT: () => void
    stopSTT: () => void
    compact?: boolean
}

function NotesPanel({
    noteMode,
    setNoteMode,
    noteLoading,
    noteContent,
    setNoteContent,
    noteSaving,
    noteSaved,
    saveNote,
    closeNotes,
    sttSupported,
    sttLang,
    slashPrefixEnabled,
    toggleSlashPrefix,
    setSttLanguage,
    isListening,
    startSTT,
    stopSTT,
    compact = false,
}: NotesPanelProps) {
    return (
        <div className="flex flex-col h-full min-h-0">
            <div className={`flex items-center justify-between ${compact ? 'p-3' : 'p-4'} border-b border-[var(--border)] bg-gradient-to-r from-[var(--accent-light)]/50 to-[var(--background-subtle)]`}>
                <div className="flex items-center gap-2">
                    <StickyNote className="text-[var(--accent)]" size={18} />
                    <h3 className="font-semibold text-[var(--foreground)]">메모</h3>
                </div>
                <button
                    onClick={closeNotes}
                    className="p-2 hover:bg-[var(--accent-light)] rounded-full transition-colors"
                >
                    <X size={18} className="text-[var(--foreground-muted)]" />
                </button>
            </div>

            <div className="flex border-b border-[var(--border)]">
                <button
                    onClick={() => setNoteMode('edit')}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium transition-colors ${noteMode === 'edit'
                        ? 'text-[var(--accent)] bg-[var(--accent-light)] border-b-2 border-[var(--accent)]'
                        : 'text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--background-subtle)]'
                        }`}
                >
                    <Edit3 size={15} />
                    편집
                </button>
                <button
                    onClick={() => setNoteMode('preview')}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium transition-colors ${noteMode === 'preview'
                        ? 'text-purple-700 bg-purple-50 border-b-2 border-purple-500'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                        }`}
                >
                    <Eye size={15} />
                    복습
                </button>
            </div>

            {noteMode === 'edit' && (
                <div className={`flex flex-col gap-2 ${compact ? 'p-2.5' : 'p-3'} border-b border-[var(--border)] bg-[var(--background-subtle)]/60`}>
                    <div className="flex items-stretch gap-2 flex-wrap sm:flex-nowrap">
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setSttLanguage('ko-KR')}
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${sttLang === 'ko-KR'
                                    ? 'bg-[var(--secondary)] text-white border-[var(--secondary)]'
                                    : 'bg-white text-[var(--foreground)] border-[var(--border)]'
                                    }`}
                            >
                                한
                            </button>
                            <button
                                onClick={() => setSttLanguage('en-US')}
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${sttLang === 'en-US'
                                    ? 'bg-[var(--secondary)] text-white border-[var(--secondary)]'
                                    : 'bg-white text-[var(--foreground)] border-[var(--border)]'
                                    }`}
                            >
                                영
                            </button>
                            <button
                                onClick={() => setSttLanguage('ja-JP')}
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${sttLang === 'ja-JP'
                                    ? 'bg-[var(--secondary)] text-white border-[var(--secondary)]'
                                    : 'bg-white text-[var(--foreground)] border-[var(--border)]'
                                    }`}
                            >
                                일
                            </button>
                            <button
                                onClick={toggleSlashPrefix}
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${slashPrefixEnabled
                                    ? 'bg-[#fff3c9] text-[#9a6a00] border-[#f3d88d]'
                                    : 'bg-white text-[var(--foreground-muted)] border-[var(--border)]'
                                    }`}
                                title="STT 결과 앞에 / 붙이기"
                            >
                                /
                            </button>
                        </div>
                        <button
                            onContextMenu={(e) => e.preventDefault()}
                            onTouchStart={(e) => e.preventDefault()}
                            onPointerDown={(e) => {
                                e.preventDefault()
                                if (e.currentTarget.setPointerCapture) {
                                    e.currentTarget.setPointerCapture(e.pointerId)
                                }
                                startSTT()
                            }}
                            onPointerUp={(e) => {
                                if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
                                    e.currentTarget.releasePointerCapture(e.pointerId)
                                }
                                stopSTT()
                            }}
                            onPointerCancel={(e) => {
                                if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
                                    e.currentTarget.releasePointerCapture(e.pointerId)
                                }
                                stopSTT()
                            }}
                            onLostPointerCapture={stopSTT}
                            draggable={false}
                            disabled={!sttSupported}
                            className={`flex-1 sm:flex-none sm:min-w-[240px] h-[44px] inline-flex items-center justify-center gap-2 px-5 rounded-xl text-sm font-semibold transition-all touch-none select-none ${isListening
                                ? 'bg-red-500 text-white hover:bg-red-600'
                                : 'bg-[var(--secondary)] text-white hover:bg-[#6891ac] disabled:opacity-50 disabled:cursor-not-allowed'
                                }`}
                            style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none', userSelect: 'none' }}
                            title={sttSupported ? '누르고 말하기 (손을 떼면 입력 완료)' : '이 브라우저는 STT를 지원하지 않습니다'}
                        >
                            {isListening ? <MicOff size={14} /> : <Mic size={14} />}
                            {isListening ? '말하는 중... 손을 떼면 완료' : '길게 눌러 말하기'}
                        </button>
                    </div>
                    {!sttSupported && (
                        <span className="text-[11px] text-[var(--foreground-muted)]">STT 미지원 브라우저</span>
                    )}
                </div>
            )}

            <div className={`${compact ? 'p-3' : 'p-4'} flex-1 min-h-0 overflow-auto`}>
                {noteLoading ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : noteMode === 'edit' ? (
                    <textarea
                        value={noteContent}
                        onChange={(e) => setNoteContent(e.target.value)}
                        placeholder={`영상을 보며 메모를 작성해보세요...\n\n💡 중요한 내용\n📝 핵심 키워드\n\n📌 플래시카드 만들기:\n줄 앞에 /를 붙이면 복습 시 숨겨집니다!\n예시: /일본의 수도는 도쿄입니다`}
                        className="w-full h-full min-h-[180px] resize-none border border-[var(--border)] rounded-xl p-4 text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent placeholder:text-[var(--foreground-muted)] text-sm leading-relaxed"
                    />
                ) : noteContent.trim() ? (
                    <NoteRenderer content={noteContent} />
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                        <StickyNote size={36} className="mb-2 opacity-50" />
                        <p className="text-sm">아직 메모가 없습니다</p>
                    </div>
                )}
            </div>

            <div className={`${compact ? 'p-3' : 'p-4'} border-t border-gray-200 bg-gray-50`}>
                <button
                    onClick={saveNote}
                    disabled={noteSaving}
                    className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold transition-all ${noteSaved
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
    const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
    const recognitionBufferRef = useRef('')
    const recognitionInterimRef = useRef('')
    const [isListening, setIsListening] = useState(false)
    const [sttLang, setSttLang] = useState<STTLang>('ko-KR')
    const [slashPrefixEnabled, setSlashPrefixEnabled] = useState(false)
    const [sttSupported] = useState(
        typeof window !== 'undefined' &&
        Boolean(window.SpeechRecognition || window.webkitSpeechRecognition)
    )

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

    useEffect(() => {
        if (!showNotes && recognitionRef.current) {
            recognitionRef.current.stop()
        }
    }, [showNotes])

    useEffect(() => {
        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.stop()
            }
        }
    }, [])

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

    const startSTT = () => {
        const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition
        if (!SpeechRecognitionCtor || isListening) return
        recognitionBufferRef.current = ''
        recognitionInterimRef.current = ''

        const recognition = new SpeechRecognitionCtor()
        recognition.lang = sttLang
        recognition.continuous = true
        recognition.interimResults = true

        recognition.onresult = (event) => {
            let capturedFinal = ''
            let capturedInterim = ''
            const startIndex = event.resultIndex ?? 0
            for (let i = startIndex; i < event.results.length; i++) {
                const result = event.results[i]
                if (result?.isFinal) {
                    capturedFinal += `${result[0]?.transcript || ''} `
                } else {
                    capturedInterim += `${result?.[0]?.transcript || ''} `
                }
            }
            if (capturedFinal.trim()) {
                recognitionBufferRef.current = `${recognitionBufferRef.current} ${capturedFinal}`.trim()
                recognitionInterimRef.current = ''
            } else if (capturedInterim.trim()) {
                recognitionInterimRef.current = capturedInterim.trim()
            }
        }

        recognition.onerror = () => {
            setIsListening(false)
            recognitionRef.current = null
            recognitionBufferRef.current = ''
            recognitionInterimRef.current = ''
        }

        recognition.onend = () => {
            const combined = `${recognitionBufferRef.current} ${recognitionInterimRef.current}`.trim()
            if (combined) {
                const textToAppend = slashPrefixEnabled ? `/${combined}` : combined
                setNoteContent((prev) => (prev ? `${prev}\n${textToAppend}` : textToAppend))
            }
            recognitionBufferRef.current = ''
            recognitionInterimRef.current = ''
            setIsListening(false)
            recognitionRef.current = null
        }

        recognitionRef.current = recognition
        recognition.start()
        setIsListening(true)
    }

    const stopSTT = () => {
        if (recognitionRef.current) {
            recognitionRef.current.stop()
        }
    }

    const setSttLanguage = (lang: STTLang) => {
        setSttLang(lang)
        setSlashPrefixEnabled(lang !== 'ko-KR')
    }

    const toggleSlashPrefix = () => {
        setSlashPrefixEnabled((prev) => !prev)
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className={`bg-[var(--surface)] w-full ${showNotes ? 'max-w-6xl' : 'max-w-5xl'} rounded-2xl overflow-hidden shadow-2xl max-h-[96vh] flex flex-col lg:flex-row`}>
                <div className="flex-1 min-h-0 flex flex-col">
                    <div className="flex items-center justify-between p-2.5 sm:p-3 border-b border-[var(--border)] bg-[var(--background-subtle)]">
                        <div className="flex items-center gap-3 min-w-0">
                            <h3 className="font-semibold text-base sm:text-lg text-[var(--foreground)] line-clamp-1">{video.title}</h3>
                            {isWatched && (
                                <span className="px-2 py-0.5 bg-[var(--primary-light)] text-[var(--primary)] text-xs font-medium rounded-full flex-shrink-0">
                                    시청완료
                                </span>
                            )}
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-[var(--border)] rounded-full transition-colors flex-shrink-0"
                        >
                            <X size={22} className="text-[var(--foreground-muted)]" />
                        </button>
                    </div>

                    <div className="relative bg-black aspect-video lg:aspect-video lg:min-h-[360px]">
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

                    <div className="p-2.5 sm:p-3 bg-[var(--surface)] flex flex-col sm:flex-row items-center justify-between gap-2.5">
                        <div className="flex gap-3 w-full sm:w-auto">
                            <button
                                onClick={handleToggle}
                                disabled={loading}
                                className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 sm:px-5 py-2 rounded-xl font-semibold transition-all text-sm ${isWatched
                                    ? 'bg-[var(--primary-light)] text-[var(--primary)] hover:bg-[#d9e6de]'
                                    : 'bg-[var(--secondary)] text-white hover:bg-[#6891ac] shadow-lg hover:shadow-[var(--shadow-hover)]'
                                    }`}
                            >
                                {loading ? (
                                    <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                ) : isWatched ? (
                                    <CheckCircle size={18} />
                                ) : (
                                    <Circle size={18} />
                                )}
                                {isWatched ? '시청완료' : '시청완료로 표시'}
                            </button>

                            <button
                                onClick={() => setShowNotes(!showNotes)}
                                className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 sm:px-5 py-2 rounded-xl font-semibold transition-colors border text-sm ${showNotes
                                    ? 'bg-[var(--accent-light)] text-[var(--accent)] border-[var(--accent)]/50'
                                    : 'bg-[var(--background-subtle)] text-[var(--accent)] hover:bg-[var(--accent-light)] border-[var(--border)]'
                                    }`}
                            >
                                <StickyNote size={18} />
                                메모
                                {showNotes ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </button>
                        </div>

                        <a
                            href={video.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs sm:text-sm text-[var(--foreground-muted)] hover:text-[var(--foreground)] flex items-center gap-1 hover:underline"
                        >
                            YouTube에서 보기
                            <ExternalLink size={14} />
                        </a>
                    </div>

                    {showNotes && (
                        <div className="lg:hidden border-t border-[var(--border)] max-h-[40vh] min-h-[220px]">
                            <NotesPanel
                                noteMode={noteMode}
                                setNoteMode={setNoteMode}
                                noteLoading={noteLoading}
                                noteContent={noteContent}
                                setNoteContent={setNoteContent}
                                noteSaving={noteSaving}
                                noteSaved={noteSaved}
                                saveNote={saveNote}
                                closeNotes={() => setShowNotes(false)}
                                sttSupported={sttSupported}
                                sttLang={sttLang}
                                slashPrefixEnabled={slashPrefixEnabled}
                                toggleSlashPrefix={toggleSlashPrefix}
                                setSttLanguage={setSttLanguage}
                                isListening={isListening}
                                startSTT={startSTT}
                                stopSTT={stopSTT}
                                compact
                            />
                        </div>
                    )}
                </div>

                {showNotes && (
                    <div className="hidden lg:block lg:w-[390px] border-l border-[var(--border)] min-h-0">
                        <NotesPanel
                            noteMode={noteMode}
                            setNoteMode={setNoteMode}
                            noteLoading={noteLoading}
                            noteContent={noteContent}
                            setNoteContent={setNoteContent}
                            noteSaving={noteSaving}
                            noteSaved={noteSaved}
                            saveNote={saveNote}
                            closeNotes={() => setShowNotes(false)}
                            sttSupported={sttSupported}
                            sttLang={sttLang}
                            slashPrefixEnabled={slashPrefixEnabled}
                            toggleSlashPrefix={toggleSlashPrefix}
                            setSttLanguage={setSttLanguage}
                            isListening={isListening}
                            startSTT={startSTT}
                            stopSTT={stopSTT}
                        />
                    </div>
                )}
            </div>
        </div>
    )
}
