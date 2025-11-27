export interface LingQConfig {
  apiKey: string;
  baseUrlV2?: string;
  baseUrlV3?: string;
}

export interface Language {
  code: string;
  title: string;
}

export interface Hint {
  id: number;
  locale: string;
  text: string;
  term: string;
  popularity: number;
  is_google_translate: boolean;
  flagged: boolean;
}

export interface LingQCard {
  pk: number;
  url: string;
  term: string;
  fragment: string;
  importance: number;
  status: number;
  extended_status: string | null;
  last_reviewed_correct: string | null;
  srs_due_date: string;
  notes: string;
  audio: string | null;
  words: string[];
  tags: string[];
  hints: Hint[];
  transliteration: Record<string, any>;
  gTags: string[];
  wordTags: string[];
  readings: Record<string, any>;
  writings: string[];
}

export interface CardsResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: LingQCard[];
}

export interface Lesson {
  id: number;
  title: string;
  description?: string;
  text?: string;
  collection?: number;
  share_status: 'private' | 'shared';
  level?: string;
  created?: string;
}

export interface Collection {
  pk: number;                     // Primary key from API
  id?: number;                    // Optional for backwards compatibility
  url?: string;
  title: string;
  description?: string;
  level?: string;
  language?: string;              // Optional since API uses languageCode
  imageUrl?: string;
  difficulty?: number;
  lessonsCount?: number;
  newWordsCount?: number;
  tags?: string;
  external_type?: string | null;
  rosesCount?: number;
  type?: string;
}

export interface AudioInput {
  url?: string;           // URL to download audio from
  base64Data?: string;    // Base64-encoded audio data (can include data URI prefix)
  filename?: string;      // Override filename
  mimeType?: string;      // Override mime type (useful for base64)
}

export const SUPPORTED_AUDIO_MIMES: Record<string, string[]> = {
  'audio/mpeg': ['.mp3'],
  'audio/mp4': ['.m4a'],
  'audio/wav': ['.wav'],
  'audio/ogg': ['.ogg']
};

export interface CreateLessonRequest {
  title: string;
  text: string;
  collection?: number;
  share_status?: 'private' | 'shared';
  original_url?: string;
  tags?: string[];
  audio?: AudioInput;
}

export interface UpdateCardRequest {
  status?: number;
  tags?: string[];
  notes?: string;
}

export interface SearchCardsRequest {
  page?: number;
  page_size?: number;
  search_criteria?: 'startsWith' | 'contains';
  sort?: 'date' | 'term' | 'status';
  status?: number[];
  search?: string;
}

// Minimal response types for efficient token usage
export interface MinimalLesson {
  id: number;
  title: string;
  collectionId?: number;
  collectionTitle?: string;
  pubDate?: string;
  status?: string;
}

export interface MinimalCollection {
  pk: number;
  title: string;
  lessonsCount: number;
}

export interface MinimalCard {
  pk: number;
  term: string;
  status: number;
  tags: string[];
  fragment?: string;
}

// Meta search function types
export interface SearchResult {
  found: boolean;
  lessonId?: number;
  collectionId?: number;
  title?: string;
}

export interface FindLessonOptions {
  maxPages?: number;
  fuzzyMatch?: boolean;
  collectionId?: number;
}

export interface FindCollectionOptions {
  maxPages?: number;
  fuzzyMatch?: boolean;
}
