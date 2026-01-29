import axios, { AxiosInstance, AxiosError } from 'axios';
import FormData from 'form-data';
import {
  LingQConfig,
  Language,
  CardsResponse,
  LingQCard,
  Lesson,
  Collection,
  CreateLessonRequest,
  UpdateCardRequest,
  SearchCardsRequest,
  MinimalLesson,
  MinimalCollection,
  MinimalCard,
  SearchResult,
  FindLessonOptions,
  FindCollectionOptions,
  SUPPORTED_AUDIO_MIMES
} from './types.js';

export class LingQClient {
  private apiV2: AxiosInstance;
  private apiV3: AxiosInstance;
  private apiKey: string;

  constructor(config: LingQConfig) {
    this.apiKey = config.apiKey;

    const headers = {
      'Authorization': `Token ${config.apiKey}`,
      'Content-Type': 'application/json'
    };

    this.apiV2 = axios.create({
      baseURL: config.baseUrlV2 || 'https://www.lingq.com/api/v2',
      headers,
      timeout: 30000
    });

    this.apiV3 = axios.create({
      baseURL: config.baseUrlV3 || 'https://www.lingq.com/api/v3',
      headers,
      timeout: 30000
    });

    // Add response interceptor for error handling
    [this.apiV2, this.apiV3].forEach(api => {
      api.interceptors.response.use(
        response => response,
        this.handleError.bind(this)
      );
    });
  }

  private handleError(error: AxiosError): Promise<never> {
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;

      if (status === 401) {
        throw new Error('Authentication failed. Please check your API key.');
      } else if (status === 403) {
        throw new Error('Access forbidden. You may not have permission for this resource.');
      } else if (status === 404) {
        throw new Error('Resource not found.');
      } else if (status === 429) {
        throw new Error('Rate limit exceeded. Please wait before retrying.');
      } else if (status >= 500) {
        throw new Error('LingQ server error. Please try again later.');
      }

      throw new Error(`API Error (${status}): ${JSON.stringify(data)}`);
    } else if (error.request) {
      throw new Error('No response from LingQ API. Please check your internet connection.');
    } else {
      throw new Error(`Request error: ${error.message}`);
    }
  }

  // Language Methods
  async getLanguages(): Promise<Language[]> {
    const response = await this.apiV2.get('/languages/');
    return response.data;
  }

  // Card Methods
  async searchCards(
    languageCode: string,
    params: SearchCardsRequest = {},
    minimal: boolean = false
  ): Promise<CardsResponse | { count: number; next: string | null; previous: string | null; results: MinimalCard[] }> {
    const queryParams: any = {
      page: params.page || 1,
      page_size: params.page_size || 15
    };

    if (params.search_criteria) queryParams.search_criteria = params.search_criteria;
    if (params.sort) queryParams.sort = params.sort;
    if (params.status) queryParams.status = params.status;
    if (params.search) queryParams.search = params.search;

    const response = await this.apiV3.get(
      `/${languageCode}/cards/`,
      { params: queryParams }
    );

    if (minimal) {
      return {
        count: response.data.count,
        next: response.data.next,
        previous: response.data.previous,
        results: response.data.results.map((card: LingQCard) => this.toMinimalCard(card))
      };
    }

    return response.data;
  }

  async getCard(languageCode: string, cardId: number): Promise<LingQCard> {
    const response = await this.apiV3.get(`/${languageCode}/cards/${cardId}/`);
    return response.data;
  }

  async updateCard(
    languageCode: string,
    cardId: number,
    updates: UpdateCardRequest
  ): Promise<LingQCard> {
    const response = await this.apiV2.patch(
      `/${languageCode}/cards/${cardId}/`,
      updates
    );
    return response.data;
  }

  async reviewCard(
    languageCode: string,
    cardId: number
  ): Promise<{ srs_due_date: string; status_changed_date: string }> {
    const response = await this.apiV2.post(
      `/${languageCode}/cards/${cardId}/review/`
    );
    return response.data;
  }

  async addTagsToCard(
    languageCode: string,
    cardId: number,
    newTags: string[]
  ): Promise<LingQCard> {
    // Fetch current card to get existing tags
    const card = await this.getCard(languageCode, cardId);

    // Merge tags (deduplicate)
    const mergedTags = [...new Set([...card.tags, ...newTags])];

    // Update with merged tags
    return this.updateCard(languageCode, cardId, { tags: mergedTags });
  }

  // Audio Helper Methods
  private inferMimeType(filename: string): string | null {
    const ext = filename.toLowerCase().slice(filename.lastIndexOf('.'));
    for (const [mime, extensions] of Object.entries(SUPPORTED_AUDIO_MIMES)) {
      if (extensions.includes(ext)) return mime;
    }
    return null;
  }

  // Lesson Methods
  async createLesson(
    languageCode: string,
    lessonData: CreateLessonRequest
  ): Promise<Lesson> {
    // If no audio, use existing JSON approach
    if (!lessonData.audio) {
      const data: any = {
        title: lessonData.title,
        text: lessonData.text,
        share_status: lessonData.share_status || 'private'
      };

      if (lessonData.collection) data.collection = lessonData.collection;
      if (lessonData.original_url) data.original_url = lessonData.original_url;
      if (lessonData.tags && lessonData.tags.length > 0) data.tags = lessonData.tags;

      const response = await this.apiV3.post(
        `/${languageCode}/lessons/`,
        data
      );
      return response.data;
    }

    // With audio: validate input and get audio buffer
    const { url, base64Data, filename: inputFilename, mimeType: inputMimeType } = lessonData.audio;

    // Validate: must have exactly one of url or base64Data
    if (!url && !base64Data) {
      throw new Error('Audio requires either url or base64Data');
    }
    if (url && base64Data) {
      throw new Error('Provide either url or base64Data, not both');
    }

    let audioBuffer: Buffer;
    let filename: string;
    let mimeType: string;

    if (base64Data) {
      // Handle base64 input
      let base64String = base64Data;
      let extractedMimeType: string | null = null;

      // Support data URI format: data:audio/mpeg;base64,AAAA...
      if (base64String.startsWith('data:')) {
        const matches = base64String.match(/^data:([^;]+);base64,(.+)$/);
        if (matches) {
          extractedMimeType = matches[1];
          base64String = matches[2];
        }
      }

      // Validate base64 format (Buffer.from doesn't throw on invalid base64)
      const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
      if (!base64Regex.test(base64String)) {
        throw new Error('Invalid base64 encoding');
      }
      audioBuffer = Buffer.from(base64String, 'base64');
      if (audioBuffer.length === 0) {
        throw new Error('Empty audio data');
      }

      filename = inputFilename || 'audio.mp3';
      mimeType = inputMimeType || extractedMimeType || this.inferMimeType(filename) || 'audio/mpeg';

    } else {
      // Handle URL input
      let parsedUrl: URL;
      try {
        parsedUrl = new URL(url!);
      } catch {
        throw new Error('Invalid audio URL');
      }

      try {
        const audioResponse = await axios.get(url!, {
          responseType: 'arraybuffer',
          timeout: 120000,  // 2 min for large files
          maxContentLength: 100 * 1024 * 1024  // 100MB limit
        });
        audioBuffer = Buffer.from(audioResponse.data);
      } catch (error: any) {
        if (error.response?.status === 404) {
          throw new Error('Audio URL not found (404)');
        }
        if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
          throw new Error('Cannot reach audio URL');
        }
        throw new Error(`Failed to download audio: ${error.message}`);
      }

      const urlPath = parsedUrl.pathname;
      filename = inputFilename || urlPath.split('/').pop() || 'audio.mp3';
      mimeType = inputMimeType || this.inferMimeType(filename) || 'audio/mpeg';
    }

    // Build form data
    const form = new FormData();
    form.append('title', lessonData.title);
    form.append('text', lessonData.text);
    form.append('share_status', lessonData.share_status || 'private');

    if (lessonData.collection) form.append('collection', String(lessonData.collection));
    if (lessonData.original_url) form.append('original_url', lessonData.original_url);
    if (lessonData.tags && lessonData.tags.length > 0) {
      lessonData.tags.forEach(tag => form.append('tags', tag));
    }

    form.append('audio', audioBuffer, {
      filename,
      contentType: mimeType
    });

    // Use configured base URL instead of hardcoded URL
    const baseUrl = this.apiV3.defaults.baseURL || 'https://www.lingq.com/api/v3';

    try {
      const response = await axios.post(
        `${baseUrl}/${languageCode}/lessons/`,
        form,
        {
          headers: {
            ...form.getHeaders(),
            'Authorization': `Token ${this.apiKey}`
          },
          timeout: 120000,
          maxBodyLength: Infinity
        }
      );
      return response.data;
    } catch (error) {
      // Use centralized error handler for consistent error messages
      return this.handleError(error as AxiosError);
    }
  }

  async getLessons(
    languageCode: string,
    collectionId?: number,
    page: number = 1,
    pageSize: number = 25,
    minimal: boolean = false
  ): Promise<{ count: number; results: Lesson[] } | { count: number; results: MinimalLesson[] }> {
    const params: any = { page, page_size: pageSize };
    if (collectionId) {
      params.collection = collectionId;
    }

    const response = await this.apiV2.get(
      `/${languageCode}/lessons/`,
      { params }
    );

    if (minimal) {
      return {
        count: response.data.count,
        results: response.data.results.map((lesson: any) => this.toMinimalLesson(lesson))
      };
    }

    return response.data;
  }

  // Collection Methods
  async getCollections(
    languageCode: string,
    page: number = 1,
    pageSize: number = 15,
    minimal: boolean = false
  ): Promise<{ count: number; results: Collection[]; next: string | null; previous: string | null } | { count: number; results: MinimalCollection[]; next: string | null; previous: string | null }> {
    const params: any = { page, page_size: pageSize };
    const response = await this.apiV2.get(`/${languageCode}/collections/`, { params });

    if (minimal) {
      return {
        count: response.data.count,
        next: response.data.next,
        previous: response.data.previous,
        results: response.data.results.map((collection: Collection) => this.toMinimalCollection(collection))
      };
    }

    return response.data;
  }

  // Helper Methods
  private titleMatches(a: string, b: string, fuzzy: boolean): boolean {
    const normalize = (s: string) => s.toLowerCase().trim();
    const aNorm = normalize(a);
    const bNorm = normalize(b);

    if (!fuzzy) {
      return aNorm === bNorm;
    }

    // Fuzzy matching: remove punctuation and extra whitespace
    // Use Unicode-aware pattern to support Korean and other non-ASCII characters
    const clean = (s: string) => s.replace(/[^\p{L}\p{N}\s]/gu, '').replace(/\s+/g, ' ').trim();
    return clean(aNorm) === clean(bNorm);
  }

  private toMinimalLesson(lesson: any): MinimalLesson {
    return {
      id: lesson.id,
      title: lesson.title,
      collectionId: lesson.collectionId || lesson.collection,
      collectionTitle: lesson.collectionTitle,
      pubDate: lesson.pubDate,
      status: lesson.status
    };
  }

  private toMinimalCollection(collection: Collection): MinimalCollection {
    return {
      pk: collection.pk,
      title: collection.title,
      lessonsCount: collection.lessonsCount || 0
    };
  }

  private toMinimalCard(card: LingQCard): MinimalCard {
    return {
      pk: card.pk,
      term: card.term,
      status: card.status,
      tags: card.tags,
      fragment: card.fragment
    };
  }

  // Meta Search Methods
  async findLessonByTitle(
    languageCode: string,
    searchTitle: string,
    options?: FindLessonOptions
  ): Promise<SearchResult> {
    const maxPages = options?.maxPages || 20;
    const fuzzy = options?.fuzzyMatch || false;
    const collectionId = options?.collectionId;

    for (let page = 1; page <= maxPages; page++) {
      const params: any = { page, page_size: 50 };
      if (collectionId) {
        params.collection = collectionId;
      }

      const response = await this.apiV2.get(
        `/${languageCode}/lessons/`,
        { params }
      );

      for (const lesson of response.data.results) {
        if (this.titleMatches(lesson.title, searchTitle, fuzzy)) {
          return {
            found: true,
            lessonId: lesson.id,
            collectionId: lesson.collection,
            title: lesson.title
          };
        }
      }

      // Stop if we've reached the last page
      if (!response.data.next || response.data.results.length === 0) {
        break;
      }
    }

    return { found: false };
  }

  async findCollectionByTitle(
    languageCode: string,
    searchTitle: string,
    options?: FindCollectionOptions
  ): Promise<SearchResult> {
    const maxPages = options?.maxPages || 20;
    const fuzzy = options?.fuzzyMatch || false;

    for (let page = 1; page <= maxPages; page++) {
      const params: any = { page, page_size: 50 };
      const response = await this.apiV2.get(`/${languageCode}/collections/`, { params });

      for (const collection of response.data.results) {
        if (this.titleMatches(collection.title, searchTitle, fuzzy)) {
          return {
            found: true,
            collectionId: collection.pk,
            title: collection.title
          };
        }
      }

      // Stop if we've reached the last page
      if (!response.data.next || response.data.results.length === 0) {
        break;
      }
    }

    return { found: false };
  }

  async checkLessonExists(
    languageCode: string,
    title: string,
    options?: FindLessonOptions
  ): Promise<boolean> {
    const result = await this.findLessonByTitle(languageCode, title, options);
    return result.found;
  }

  async getRecentLessons(
    languageCode: string,
    limit: number = 20
  ): Promise<MinimalLesson[]> {
    const pageSize = Math.min(limit, 100);
    const params: any = { page: 1, page_size: pageSize };

    const response = await this.apiV2.get(
      `/${languageCode}/lessons/`,
      { params }
    );

    return response.data.results.slice(0, limit).map((l: any) => this.toMinimalLesson(l));
  }
}

// Utility function to create a delay for rate limiting
export async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
