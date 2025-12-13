# Vercel Deployment Guide

## Prerequisites

1. **Supabase Database Setup**
   - Create a Supabase project at https://supabase.com
   - Run the SQL from `schema.sql` in Supabase SQL Editor
   - Note your project URL and anon key

2. **API Keys**
   - YouTube Data API Key (Google Cloud Console)
   - Google Gemini API Key (AI Studio)

## Environment Variables

Set these in Vercel Project Settings → Environment Variables:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
YOUTUBE_API_KEY=your_youtube_api_key
GOOGLE_GEMINI_API_KEY=your_gemini_api_key
```

## Deployment Steps

### Option 1: Vercel CLI

```bash
npm install -g vercel
vercel login
vercel
```

### Option 2: GitHub Integration

1. Push code to GitHub
2. Import project in Vercel Dashboard
3. Configure environment variables
4. Deploy

## Post-Deployment

1. **Create Admin User**  
   Run `/setup` route once to initialize database
   
2. **Register First User**  
   Go to `/register` and create admin account (`mintkaori`)

3. **Test Features**
   - Video import
   - Quiz generation
   - Emblem system

## Troubleshooting

- **Build fails**: Check TypeScript errors with `npm run build`
- **API errors**: Verify environment variables are set
- **Database errors**: Confirm Supabase schema is up to date

## Notes

- The app auto-syncs YouTube channels daily
- Quizzes require 7/10 correct to pass
- Emblems awarded for 7-day streaks
