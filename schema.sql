-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Videos Table
create table videos (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  channel_name text,
  url text not null,
  thumbnail_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Watch Logs Table (Tracks every time a video is watched)
create table watch_logs (
  id uuid default uuid_generate_v4() primary key,
  video_id uuid references videos(id) on delete cascade not null,
  watched_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Row Level Security (Optional but recommended - public for now for simplicity)
alter table videos enable row level security;
alter table watch_logs enable row level security;

-- Allow public read/write for this prototype (Warning: Not for production!)
create policy "Public videos are viewable by everyone." on videos for select using (true);
create policy "Public videos are insertable by everyone." on videos for insert with check (true);
create policy "Public videos are deletable by everyone." on videos for delete using (true);

create policy "Public logs are viewable by everyone." on watch_logs for select using (true);
create policy "Public logs are insertable by everyone." on watch_logs for insert with check (true);
