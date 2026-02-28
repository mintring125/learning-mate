'use client'

import { VideoWithLog } from '@/types'
import { X, CheckCircle, Circle, ExternalLink, StickyNote, ChevronDown, ChevronUp, Eye, Edit3, Mic, MicOff } from 'lucide-react'
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

const normalizeWhitespace = (text: string) => text.replace(/\s+/g, ' ').trim()

// Merge final/interim transcripts while removing overlapped tail-head tokens.
const mergeTranscriptWithOverlap = (finalText: string, interimText: string) => {
    const finalTokens = normalizeWhitespace(finalText).split(' ').filter(Boolean)
    const interimTokens = normalizeWhitespace(interimText).split(' ').filter(Boolean)

    if (finalTokens.length === 0) return interimTokens.join(' ')
    if (interimTokens.length === 0) return finalTokens.join(' ')

    const maxOverlap = Math.min(finalTokens.length, interimTokens.length)
    let overlap = 0
    for (let len = maxOverlap; len >= 1; len--) {
        const finalTail = finalTokens.slice(finalTokens.length - len).join(' ')
        const interimHead = interimTokens.slice(0, len).join(' ')
        if (finalTail === interimHead) {
            overlap = len
            break
        }
    }

    return [...finalTokens, ...interimTokens.slice(overlap)].join(' ')
}

// Reduce repeated words: "저는 저는 저는 김형석입니다" -> "저는 김형석입니다"
const removeConsecutiveDuplicateWords = (text: string) => {
    const tokens = normalizeWhitespace(text).split(' ').filter(Boolean)
    if (tokens.length <= 1) return tokens.join(' ')
    const cleaned: string[] = [tokens[0]]
    for (let i = 1; i < tokens.length; i++) {
        if (tokens[i] !== cleaned[cleaned.length - 1]) {
            cleaned.push(tokens[i])
        }
    }
    return cleaned.join(' ')
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

// Append a new speech chunk while avoiding common STT overlap/replay cases.
const appendTranscriptChunk = (baseText: string, chunkText: string) => {
    const base = normalizeWhitespace(baseText)
    const chunk = normalizeWhitespace(chunkText)
    if (!chunk) return base
    if (!base) return chunk
    if (base === chunk) return base
    if (base.endsWith(chunk)) return base
    if (chunk.startsWith(base)) return chunk
    return mergeTranscriptWithOverlap(base, chunk)
}

interface NotesPanelProps {
    noteMode: 'edit' | 'preview'
    setNoteMode: (mode: 'edit' | 'preview') => void
    noteLoading: boolean
    noteContent: string
    setNoteContent: (content: string) => void
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
    textareaRef: { current: HTMLTextAreaElement | null }
}

function NotesPanel({
    noteMode,
    setNoteMode,
    noteLoading,
    noteContent,
    setNoteContent,
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
    textareaRef,
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

            <div className={`${compact ? 'p-3' : 'p-4'} flex-1 min-h-0 overflow-auto overscroll-contain`}>
                {noteLoading ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : noteMode === 'edit' ? (
                    <textarea
                        ref={textareaRef}
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
    const [noteLoading, setNoteLoading] = useState(false)
    const [noteMode, setNoteMode] = useState<'edit' | 'preview'>('preview')
    const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
    const recognitionBufferRef = useRef('')
    const recognitionInterimRef = useRef('')
    const recognitionLiveRef = useRef('')
    const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const isNoteSavingRef = useRef(false)
    const hasLoadedNoteRef = useRef(false)
    const lastSavedNoteRef = useRef('')
    const noteTextareaRef = useRef<HTMLTextAreaElement | null>(null)
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
            const loadedContent = data.note?.content ?? ''
            setNoteContent(loadedContent)
            lastSavedNoteRef.current = loadedContent
        } catch (error) {
            console.error('Failed to load note:', error)
        } finally {
            hasLoadedNoteRef.current = true
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
        if (!showNotes && autoSaveTimerRef.current) {
            clearTimeout(autoSaveTimerRef.current)
            autoSaveTimerRef.current = null
        }
    }, [showNotes])

    useEffect(() => {
        return () => {
            if (stopTimerRef.current) {
                clearTimeout(stopTimerRef.current)
                stopTimerRef.current = null
            }
            if (autoSaveTimerRef.current) {
                clearTimeout(autoSaveTimerRef.current)
                autoSaveTimerRef.current = null
            }
            if (recognitionRef.current) {
                recognitionRef.current.stop()
            }
        }
    }, [])

    // Lock page scroll while modal is open so only modal content scrolls.
    useEffect(() => {
        const prevOverflow = document.body.style.overflow
        const prevOverscroll = document.body.style.overscrollBehavior
        document.body.style.overflow = 'hidden'
        document.body.style.overscrollBehavior = 'none'

        return () => {
            document.body.style.overflow = prevOverflow
            document.body.style.overscrollBehavior = prevOverscroll
        }
    }, [])

    // 메모 저장
    const saveNote = useCallback(async (
        contentToSave: string,
        options?: { keepalive?: boolean }
    ) => {
        if (isNoteSavingRef.current || contentToSave === lastSavedNoteRef.current) return
        isNoteSavingRef.current = true
        try {
            const res = await fetch('/api/notes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                keepalive: options?.keepalive,
                body: JSON.stringify({ videoId: video.id, content: contentToSave })
            })
            if (res.ok) {
                lastSavedNoteRef.current = contentToSave
            }
        } catch (error) {
            console.error('Failed to save note:', error)
        } finally {
            isNoteSavingRef.current = false
        }
    }, [video.id])

    const saveNoteOnClose = useCallback(() => {
        void saveNote(noteContent, { keepalive: true })
    }, [noteContent, saveNote])

    useEffect(() => {
        if (!showNotes || noteLoading || !hasLoadedNoteRef.current) return
        if (noteContent === lastSavedNoteRef.current) return

        if (autoSaveTimerRef.current) {
            clearTimeout(autoSaveTimerRef.current)
        }
        autoSaveTimerRef.current = setTimeout(() => {
            void saveNote(noteContent)
        }, 1200)

        return () => {
            if (autoSaveTimerRef.current) {
                clearTimeout(autoSaveTimerRef.current)
                autoSaveTimerRef.current = null
            }
        }
    }, [showNotes, noteLoading, noteContent, saveNote])

    const handleCloseNotes = useCallback(() => {
        saveNoteOnClose()
        setShowNotes(false)
    }, [saveNoteOnClose])

    const handleToggleNotes = useCallback(() => {
        if (showNotes) {
            handleCloseNotes()
            return
        }
        setShowNotes(true)
    }, [showNotes, handleCloseNotes])

    const handleCloseModal = useCallback(() => {
        saveNoteOnClose()
        onClose()
    }, [saveNoteOnClose, onClose])

    const handleToggle = async () => {
        setLoading(true)
        onComplete(video.id, isWatched)
        setIsWatched(!isWatched)
        setLoading(false)
    }

    const startSTT = () => {
        const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition
        if (!SpeechRecognitionCtor || isListening) return
        if (stopTimerRef.current) {
            clearTimeout(stopTimerRef.current)
            stopTimerRef.current = null
        }
        recognitionBufferRef.current = ''
        recognitionInterimRef.current = ''
        recognitionLiveRef.current = ''

        const recognition = new SpeechRecognitionCtor()
        recognition.lang = sttLang
        recognition.continuous = true
        recognition.interimResults = true

        recognition.onresult = (event) => {
            let latestFinal = ''
            let latestInterim = ''
            for (let i = event.results.length - 1; i >= 0; i--) {
                const result = event.results[i]
                const transcript = normalizeWhitespace(result?.[0]?.transcript || '')
                if (!transcript) continue
                if (result?.isFinal) {
                    if (!latestFinal) latestFinal = transcript
                } else if (!latestInterim) {
                    latestInterim = transcript
                }
            }
            if (latestFinal) {
                recognitionBufferRef.current = appendTranscriptChunk(
                    recognitionBufferRef.current,
                    latestFinal
                )
            }
            recognitionInterimRef.current = latestInterim
            recognitionLiveRef.current = mergeTranscriptWithOverlap(
                recognitionBufferRef.current,
                recognitionInterimRef.current
            )
        }

        recognition.onerror = () => {
            setIsListening(false)
            recognitionRef.current = null
            recognitionBufferRef.current = ''
            recognitionInterimRef.current = ''
            recognitionLiveRef.current = ''
        }

        recognition.onend = () => {
            const merged = recognitionLiveRef.current || mergeTranscriptWithOverlap(
                recognitionBufferRef.current,
                recognitionInterimRef.current
            )
            const combined = removeConsecutiveDuplicateWords(merged)
            if (combined) {
                const textToAppend = slashPrefixEnabled ? `/${combined}` : combined
                insertGeneratedTextAtCursor(textToAppend)
            }
            recognitionBufferRef.current = ''
            recognitionInterimRef.current = ''
            recognitionLiveRef.current = ''
            setIsListening(false)
            recognitionRef.current = null
        }

        recognitionRef.current = recognition
        recognition.start()
        setIsListening(true)
    }

    const stopSTT = () => {
        if (stopTimerRef.current) clearTimeout(stopTimerRef.current)
        stopTimerRef.current = setTimeout(() => {
            if (recognitionRef.current) {
                recognitionRef.current.stop()
            }
            stopTimerRef.current = null
        }, 180)
    }

    const setSttLanguage = (lang: STTLang) => {
        setSttLang(lang)
        setSlashPrefixEnabled(lang !== 'ko-KR')
    }

    const toggleSlashPrefix = () => {
        setSlashPrefixEnabled((prev) => !prev)
    }

    const insertGeneratedTextAtCursor = (text: string) => {
        const textarea = noteTextareaRef.current
        if (!textarea) {
            setNoteContent((prev) => (prev ? `${prev}\n${text}` : text))
            return
        }

        const start = textarea.selectionStart ?? noteContent.length
        const end = textarea.selectionEnd ?? start

        setNoteContent((prev) => {
            const before = prev.slice(0, start)
            const after = prev.slice(end)
            const generatedText = before && !before.endsWith('\n') ? `\n${text}` : text
            const nextValue = `${before}${generatedText}${after}`
            const nextCaret = before.length + generatedText.length

            requestAnimationFrame(() => {
                const nextTextarea = noteTextareaRef.current
                if (!nextTextarea) return
                if (document.activeElement === nextTextarea) {
                    nextTextarea.setSelectionRange(nextCaret, nextCaret)
                }
            })

            return nextValue
        })
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
                            onClick={handleCloseModal}
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
                                onClick={handleToggleNotes}
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
                                closeNotes={handleCloseNotes}
                                sttSupported={sttSupported}
                                sttLang={sttLang}
                                slashPrefixEnabled={slashPrefixEnabled}
                                toggleSlashPrefix={toggleSlashPrefix}
                                setSttLanguage={setSttLanguage}
                                isListening={isListening}
                                startSTT={startSTT}
                                stopSTT={stopSTT}
                                compact
                                textareaRef={noteTextareaRef}
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
                            closeNotes={handleCloseNotes}
                            sttSupported={sttSupported}
                            sttLang={sttLang}
                            slashPrefixEnabled={slashPrefixEnabled}
                            toggleSlashPrefix={toggleSlashPrefix}
                            setSttLanguage={setSttLanguage}
                            isListening={isListening}
                            startSTT={startSTT}
                            stopSTT={stopSTT}
                            textareaRef={noteTextareaRef}
                        />
                    </div>
                )}
            </div>
        </div>
    )
}
