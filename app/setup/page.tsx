'use client'

import { useState } from 'react'
import { Copy, Check, ExternalLink } from 'lucide-react'

export default function SetupPage() {
  const [copied, setCopied] = useState(false)

  const schema = `-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Users Table (Simple Auth with status and admin flag)
create table if not exists users (
  id uuid default uuid_generate_v4() primary key,
  username text unique not null,
  password text not null,
  status text default 'approved',
  is_admin boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Add columns if they don't exist (for existing tables)
alter table users add column if not exists status text default 'approved';
alter table users add column if not exists is_admin boolean default false;

-- Seed Admin User (mintkaori)
insert into users (username, password, status, is_admin) 
values ('mintkaori', 'mintkaori', 'approved', true) 
on conflict (username) do update set 
  password = 'mintkaori',
  status = 'approved',
  is_admin = true;

-- 2. Channels Table (Updated for auto-sync)
create table if not exists channels (
  id uuid default uuid_generate_v4() primary key,
  channel_id text unique,
  youtube_channel_id text unique,
  title text,
  name text,
  custom_url text,
  thumbnail_url text,
  uploads_playlist_id text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Add missing columns to existing channels table
alter table channels add column if not exists youtube_channel_id text;
alter table channels add column if not exists name text;
alter table channels add column if not exists uploads_playlist_id text;

-- 3. Videos Table (Updated)
create table if not exists videos (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  url text not null,
  thumbnail_url text,
  channel_name text, -- Keep for backward compatibility or simple display
  channel_id uuid references channels(id) on delete set null,
  duration text,
  published_at timestamp with time zone, -- YouTube original upload date
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Add published_at column if not exists
alter table videos add column if not exists published_at timestamp with time zone;

-- Add quiz_completed column if not exists
alter table videos add column if not exists quiz_completed boolean default false;

-- 4. Watch Logs Table (Updated)
create table if not exists watch_logs (
  id uuid default uuid_generate_v4() primary key,
  video_id uuid references videos(id) on delete cascade not null,
  user_id uuid references users(id) on delete cascade,
  completed boolean default false,
  watched_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. Row Level Security
alter table users enable row level security;
alter table channels enable row level security;
alter table videos enable row level security;
alter table watch_logs enable row level security;

-- Policies (Public for prototype)
create policy "Public access" on users for all using (true) with check (true);
create policy "Public access" on channels for all using (true) with check (true);
create policy "Public access" on videos for all using (true) with check (true);
create policy "Public access" on watch_logs for all using (true) with check (true);
`

  const copyToClipboard = () => {
    navigator.clipboard.writeText(schema)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-3xl w-full bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
        <div className="bg-purple-600 p-6 text-white">
          <h1 className="text-3xl font-bold mb-2">Major Update: Database Schema</h1>
          <p className="opacity-90">
            To support Channels, Auto-sync, and Login, we need to update the database.
          </p>
        </div>

        <div className="p-8 space-y-6">
          <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg text-yellow-800 text-sm">
            <strong>Note:</strong> If you already have tables, this script tries to create them if they don't exist.
            If you see errors about "relation already exists", it usually means the table is already there.
            However, for a clean start with new features, you might want to <strong>delete (drop) existing tables</strong> in Supabase first.
          </div>

          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-purple-100 text-purple-600 text-sm">1</span>
              Go to Supabase SQL Editor
            </h2>
            <div className="ml-8">
              <a
                href="https://supabase.com/dashboard/project/_/sql/new"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-purple-600 hover:text-purple-700 font-medium hover:underline"
              >
                Open Supabase Dashboard <ExternalLink size={16} />
              </a>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-purple-100 text-purple-600 text-sm">2</span>
              Run this Updated SQL Script
            </h2>
            <div className="relative group ml-8">
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={copyToClipboard}
                  className="bg-white/90 shadow-sm border border-gray-200 hover:bg-white text-gray-700 px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-2 transition-all"
                >
                  {copied ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
                  {copied ? 'Copied!' : 'Copy SQL'}
                </button>
              </div>
              <pre className="bg-gray-900 text-gray-100 p-4 rounded-xl overflow-x-auto text-sm font-mono leading-relaxed border border-gray-800">
                <code>{schema}</code>
              </pre>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-purple-100 text-purple-600 text-sm">3</span>
              Verification
            </h2>
            <p className="text-gray-600 ml-8">
              After running this, you will have a <code>test</code> user (password: <code>test</code>) and support for Channels.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
