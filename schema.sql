-- Unified schema for this project (users/channels/videos/watch_logs/notes)
-- Safe to run multiple times.

create extension if not exists "uuid-ossp";

-- 1) Users table (simple auth + approval flow)
create table if not exists users (
  id uuid default uuid_generate_v4() primary key,
  username text unique not null,
  password text not null,
  status text default 'approved',
  is_admin boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table users add column if not exists status text default 'approved';
alter table users add column if not exists is_admin boolean default false;

insert into users (username, password, status, is_admin)
values ('mintkaori', 'mintkaori', 'approved', true)
on conflict (username) do update set
  password = excluded.password,
  status = excluded.status,
  is_admin = excluded.is_admin;

-- 2) Channels table
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

alter table channels add column if not exists youtube_channel_id text;
alter table channels add column if not exists name text;
alter table channels add column if not exists uploads_playlist_id text;

-- 3) Videos table
create table if not exists videos (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  url text not null,
  thumbnail_url text,
  channel_name text,
  channel_id uuid references channels(id) on delete set null,
  duration text,
  published_at timestamp with time zone,
  is_favorite boolean default false,
  is_deleted boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table videos add column if not exists channel_id uuid references channels(id) on delete set null;
alter table videos add column if not exists duration text;
alter table videos add column if not exists published_at timestamp with time zone;
alter table videos add column if not exists is_favorite boolean default false;
alter table videos add column if not exists is_deleted boolean default false;

-- 4) Watch logs table
create table if not exists watch_logs (
  id uuid default uuid_generate_v4() primary key,
  video_id uuid references videos(id) on delete cascade not null,
  user_id uuid references users(id) on delete cascade,
  completed boolean default false,
  watched_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table watch_logs add column if not exists user_id uuid references users(id) on delete cascade;
alter table watch_logs add column if not exists completed boolean default false;

-- 5) Notes table
create table if not exists notes (
  id uuid default uuid_generate_v4() primary key,
  video_id uuid references videos(id) on delete cascade not null unique,
  content text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_videos_url on videos (url);
create index if not exists idx_watch_logs_video_id on watch_logs (video_id);
create index if not exists idx_watch_logs_user_id on watch_logs (user_id);
create index if not exists idx_notes_video_id on notes (video_id);
create index if not exists idx_channels_youtube_channel_id on channels (youtube_channel_id);

-- 6) Row level security + prototype public policies
alter table users enable row level security;
alter table channels enable row level security;
alter table videos enable row level security;
alter table watch_logs enable row level security;
alter table notes enable row level security;

drop policy if exists "Public access" on users;
create policy "Public access" on users for all using (true) with check (true);

drop policy if exists "Public access" on channels;
create policy "Public access" on channels for all using (true) with check (true);

drop policy if exists "Public access" on videos;
create policy "Public access" on videos for all using (true) with check (true);

drop policy if exists "Public access" on watch_logs;
create policy "Public access" on watch_logs for all using (true) with check (true);

drop policy if exists "Public access" on notes;
create policy "Public access" on notes for all using (true) with check (true);
