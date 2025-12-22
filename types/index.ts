export interface Video {
  id: string;
  title: string;
  channel_name: string;
  url: string;
  thumbnail_url?: string;
  published_at?: string; // YouTube upload date
  quiz_completed?: boolean; // Quiz passed status
  is_deleted?: boolean; // Soft delete flag - preserves watch history
  created_at: string;
}

export interface WatchLog {
  id: string;
  video_id: string;
  watched_at: string;
}

export interface VideoWithLog extends Video {
  watch_count: number;
  last_watched_at: string | null;
}

