import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { title, channelName, questionCount = 10 } = await req.json()
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

    // Extract key content hints from title
    const titleAnalysis = `
영상 제목 분석:
- 제목: "${title}"
- 채널: "${channelName || '알 수 없음'}"

제목에서 추출 가능한 학습 내용:
${title.match(/[가-힣a-zA-Z]+/g)?.slice(0, 10).join(', ') || title}
`

    let prompt: string

    if (isJapanese) {
      prompt = `
당신은 일본어 학습 전문가입니다. 아래 유튜브 영상 제목을 자세히 분석하여 **영상 내용에 직접적으로 관련된** 일본어 학습 퀴즈 ${questionCount}개를 만들어주세요.

${titleAnalysis}

## 중요 규칙:
1. **영상 제목에 나온 일본어 표현/단어/문법을 직접 활용**하세요
2. 제목에 "~문장", "~표현", "~패턴" 등이 있다면 그 내용을 퀴즈로 만드세요
3. 제목에 특정 일본어가 있다면 그것의 의미, 활용, 발음을 물어보세요
4. 문제는 반드시 한국어, 정답은 반드시 일본어(히라가나/가타카나/한자)
5. 사지선다형, 각 보기는 서로 구분되게

## 예시:
- 제목이 "일본어 인사 표현 5가지"라면 → "일본어로 '안녕하세요'는?" 같은 문제
- 제목이 "~ている 문법"이라면 → "~ている의 의미는?" 같은 문제

## JSON 출력 형식:
{
  "questions": [
    {
      "question": "영상 내용 관련 한국어 문제",
      "options": ["일본어1", "일본어2", "일본어3", "일본어4"],
      "correctAnswer": "정답"
    }
  ]
}

JSON만 반환하세요.
`
    } else if (isEnglish) {
      prompt = `
당신은 영어 학습 전문가입니다. 아래 유튜브 영상 제목을 자세히 분석하여 **영상 내용에 직접적으로 관련된** 영어 학습 퀴즈 ${questionCount}개를 만들어주세요.

${titleAnalysis}

## 중요 규칙:
1. **영상 제목에 나온 영어 표현/단어/문법을 직접 활용**하세요
2. 제목에 "What's with", "Do you want", "Time expression" 등이 있다면 그 표현을 퀴즈로
3. 제목에 특정 영어 표현이 있다면 그것의 한국어 뜻, 다른 표현, 용법을 물어보세요
4. 문제는 반드시 한국어, 정답은 반드시 영어
5. 사지선다형, 각 보기는 서로 비슷하지만 다르게

## 예시:
- 제목에 "What's with+α"가 있다면 → "What's with you?의 뜻은?" 같은 문제
- 제목에 "Time expression"이 있다면 → "시간 표현 관련 영어는?" 같은 문제

## JSON 출력 형식:
{
  "questions": [
    {
      "question": "영상 내용 관련 한국어 문제",
      "options": ["English1", "English2", "English3", "English4"],
      "correctAnswer": "correct answer"
    }
  ]
}

JSON만 반환하세요.
`
    } else {
      prompt = `
아래 유튜브 영상 제목을 자세히 분석하여 **영상 내용에 직접적으로 관련된** 교육적인 퀴즈 ${questionCount}개를 만들어주세요.

${titleAnalysis}

## 중요 규칙:
1. **영상 제목에 나온 주제/키워드를 직접 활용**하세요
2. 제목의 핵심 내용을 묻는 문제를 만드세요
3. 일반적인 지식이 아닌, 이 영상에서 다룰 법한 구체적인 내용으로
4. 사지선다형, 문제와 보기 모두 한국어

## JSON 출력 형식:
{
  "questions": [
    {
      "question": "영상 내용 관련 문제",
      "options": ["보기1", "보기2", "보기3", "보기4"],
      "correctAnswer": "정답"
    }
  ]
}

JSON만 반환하세요.
`
    }

    const result = await model.generateContent(prompt)
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

    return NextResponse.json(quizData)
  } catch (error: any) {
    console.error('Quiz generation error:', error)
    return NextResponse.json({
      error: 'Failed to generate quiz',
      details: error?.message || 'Unknown error'
    }, { status: 500 })
  }
}
