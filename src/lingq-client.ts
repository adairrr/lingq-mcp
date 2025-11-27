import axios, { AxiosInstance, AxiosError } from 'axios';
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
  FindCollectionOptions
} from './types.js';

export class LingQClient {
  private apiV2: AxiosInstance;
  private apiV3: AxiosInstance;

  constructor(config: LingQConfig) {
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

  // Lesson Methods
  async createLesson(
    languageCode: string,
    lessonData: CreateLessonRequest
  ): Promise<Lesson> {
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
    const clean = (s: string) => s.replace(/[^\w\s]/g, '').replace(/\s+/g, ' ');
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
