import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextResponse } from 'next/server'
import { Innertube } from 'youtubei.js'

// Extract video ID from YouTube URL
function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?\s]+)/,
    /youtube\.com\/shorts\/([^&?\s]+)/,
  ]

  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return match[1]
  }
  return null
}

// Helper function to delay execution
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// Retry wrapper for Gemini API calls with exponential backoff
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelayMs: number = 10000
): Promise<T> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error: any) {
      lastError = error

      // Check if it's a rate limit error (429)
      const isRateLimitError = error?.message?.includes('429') ||
        error?.message?.includes('Too Many Requests') ||
        error?.message?.includes('quota')

      if (isRateLimitError && attempt < maxRetries - 1) {
        // Exponential backoff: 10s, 20s, 40s...
        const waitTime = baseDelayMs * Math.pow(2, attempt)
        await delay(waitTime)
        continue
      }

      throw error
    }
  }

  throw lastError
}

export async function POST(req: Request) {
  try {
    const { title, channelName, youtubeUrl, questionCount = 10 } = await req.json()
    const apiKey = process.env.GOOGLE_GEMINI_API_KEY

    if (!apiKey) {
      console.error('Gemini API Key is missing')
      return NextResponse.json({ error: 'Gemini API Key is missing' }, { status: 500 })
    }

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

    // Determine video type
    const isJapanese = /일본어|니혼고|japanese|JLPT/i.test(title + (channelName || ''))
    const isEnglish = /영어|english|TOEIC|토익/i.test(title + (channelName || ''))

    // Try to fetch transcript from YouTube using youtubei.js
    let transcript = ''
    let transcriptError = ''
    let transcriptLang = ''

    if (youtubeUrl) {
      const videoId = extractVideoId(youtubeUrl)

      if (videoId) {
        try {
          const youtube = await Innertube.create()
          const info = await youtube.getInfo(videoId)
          const transcriptData = await info.getTranscript()

          if (transcriptData && transcriptData.transcript && transcriptData.transcript.content) {
            const segments = transcriptData.transcript.content.body?.initial_segments || []

            if (segments.length > 0) {
              transcript = segments
                .map((seg: any) => seg.snippet?.text || '')
                .filter((text: string) => text.trim())
                .join(' ')
                .slice(0, 5000)

              transcriptLang = 'auto'
            } else {
              transcriptError = '자막 세그먼트를 찾을 수 없습니다'
            }
          } else {
            transcriptError = '자막 데이터를 찾을 수 없습니다'
          }
        } catch (err: any) {
          transcriptError = err?.message || 'Failed to fetch transcript'
        }
      } else {
        transcriptError = 'Invalid YouTube URL'
      }
    } else {
      transcriptError = 'No YouTube URL provided'
    }



    // Build the prompt based on whether we have transcript
    let videoContext: string

    if (transcript) {
      videoContext = `
## 영상 자막 내용:
${transcript}

위 자막은 유튜브 영상 "${title}"의 실제 내용입니다.
이 내용을 바탕으로 퀴즈를 만들어주세요.
`
    } else {
      videoContext = `
영상 제목: "${title}"
채널: "${channelName || '알 수 없음'}"
${transcriptError ? `(자막을 가져올 수 없음: ${transcriptError})` : ''}

제목과 채널명을 바탕으로 예상되는 내용으로 퀴즈를 만들어주세요.
`
    }

    let prompt: string

    if (isJapanese) {
      prompt = `
당신은 일본어 학습 전문가입니다. 

${videoContext}

## 퀴즈 생성 규칙:
1. ${transcript ? '**영상 자막에 나온 실제 일본어 표현**을 문제로 만드세요' : '제목에서 추출한 내용으로 문제를 만드세요'}
2. 문제는 반드시 한국어, 정답은 반드시 일본어(히라가나/가타카나/한자)
3. 사지선다형, 총 ${questionCount}문제 생성
4. 각 보기는 서로 구분되게 만들어주세요

## JSON 출력 형식:
{
  "videoSummary": "${transcript ? '자막 기반 영상 내용 요약 (2-3문장)' : '제목 기반 예상 내용'}",
  "questions": [
    {
      "question": "한국어 문제",
      "options": ["일본어1", "일본어2", "일본어3", "일본어4"],
      "correctAnswer": "정답"
    }
  ]
}

JSON만 반환하세요.
`
    } else if (isEnglish) {
      prompt = `
당신은 영어 학습 전문가입니다.

${videoContext}

## 퀴즈 생성 규칙:
1. ${transcript ? '**영상 자막에 나온 실제 영어 표현**을 문제로 만드세요' : '제목에서 추출한 내용으로 문제를 만드세요'}
2. 문제는 반드시 한국어, 정답은 반드시 영어
3. 사지선다형, 총 ${questionCount}문제 생성
4. 각 보기는 서로 비슷하지만 다르게 만들어주세요

## JSON 출력 형식:
{
  "videoSummary": "${transcript ? '자막 기반 영상 내용 요약 (2-3문장)' : '제목 기반 예상 내용'}",
  "questions": [
    {
      "question": "한국어 문제",
      "options": ["English1", "English2", "English3", "English4"],
      "correctAnswer": "correct answer"
    }
  ]
}

JSON만 반환하세요.
`
    } else {
      prompt = `
당신은 교육 전문가입니다.

${videoContext}

## 퀴즈 생성 규칙:
1. ${transcript ? '**영상 자막에 나온 핵심 내용**을 문제로 만드세요' : '제목에서 추출한 내용으로 문제를 만드세요'}
2. 사지선다형, 문제와 보기 모두 한국어
3. 총 ${questionCount}문제 생성

## JSON 출력 형식:
{
  "videoSummary": "${transcript ? '자막 기반 영상 내용 요약 (2-3문장)' : '제목 기반 예상 내용'}",
  "questions": [
    {
      "question": "문제",
      "options": ["보기1", "보기2", "보기3", "보기4"],
      "correctAnswer": "정답"
    }
  ]
}

JSON만 반환하세요.
`
    }

    // Generate quiz with retry logic for rate limits
    const result = await retryWithBackoff(async () => {
      return await model.generateContent(prompt)
    })
    const response = await result.response
    const text = response.text()

    // Clean up response
    let cleanedText = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
    const jsonMatch = cleanedText.match(/\{[\s\S]*\}/)
    if (jsonMatch) cleanedText = jsonMatch[0]

    const quizData = JSON.parse(cleanedText)

    if (!quizData.questions || !Array.isArray(quizData.questions)) {
      throw new Error('Invalid quiz data structure')
    }

    // Validate each question
    for (let i = 0; i < quizData.questions.length; i++) {
      const q = quizData.questions[i]
      if (!q.question || !q.options || !q.correctAnswer) {
        throw new Error(`Invalid question at index ${i}`)
      }
      if (!Array.isArray(q.options) || q.options.length !== 4) {
        throw new Error(`Invalid options at index ${i}`)
      }
    }

    // Add info about transcript availability
    quizData.hasTranscript = !!transcript
    quizData.transcriptLength = transcript.length

    return NextResponse.json(quizData)
  } catch (error: any) {
    console.error('Quiz generation error:', error)
    return NextResponse.json({
      error: 'Failed to generate quiz',
      details: error?.message || 'Unknown error'
    }, { status: 500 })
  }
}
