# LingQ API Capabilities Research Report

**Date:** 2025-11-27
**Purpose:** Comprehensive documentation of LingQ API capabilities across all major feature areas
**Current Implementation:** lingq-mcp v1.0.0 (MCP SDK v1.22.0)

---

## Executive Summary

This document provides a comprehensive analysis of LingQ API capabilities based on web research, developer forum discussions, and the current implementation. The LingQ API is partially documented with multiple versions (v1, v2, v3) in various states of availability.

**Key Findings:**
- Official API documentation is limited and scattered
- v1 API is deprecated and no longer works
- v2 API is the primary stable version but lacks some legacy features
- v3 API exists for certain endpoints (cards) but lacks comprehensive documentation
- Many API capabilities have been reverse-engineered by the developer community
- No official API for: known words export, complete statistics, TTS generation, sentence-level data

---

## 1. Content Import API

### Current Implementation Status: ✅ **Fully Implemented**

#### Implemented Endpoints

**Create Lesson** (v3)
```
POST https://www.lingq.com/api/v3/{languageCode}/lessons/
```

**Parameters:**
- `title` (required): Lesson title
- `text` (required): Lesson text content
- `collection` (optional): Collection ID to add lesson to
- `share_status` (optional): 'private' or 'shared' (default: private)
- `original_url` (optional): Source URL for reference

**Implemented in:** `lingqClient.createLesson()` → `lingq_create_lesson` MCP tool

#### Additional Capabilities (Not Implemented)

**Audio Upload:**
- Manual: Users can upload audio files via "Edit Lesson" → "Add Audio" in the UI
- API: Forum discussions mention audio upload capabilities but no clear documentation
- Parameters mentioned: `audio`, `external_audio`, `duration`
- **Status:** ⚠️ Not documented, implementation unclear

**YouTube Import:**
- UI supports YouTube video import via browser extension
- Requires videos with closed captions (CC)
- Automatically extracts transcript and audio
- **API Support:** ❌ No direct API endpoint found
- Workaround: Third-party tool ([lingq-importer](https://github.com/rtjohnson12/lingq-importer))

**PDF/EPUB Import:**
- UI supports drag-and-drop import of EPUB, PDF, DOCX, TXT, MOBI
- Extracts text only (no audio)
- **API Support:** ❌ No direct API endpoint found

**Audio Timestamping:**
- UI has "Generate Timestamps" feature in Edit Lesson → Clips tab
- **API Support:** ❌ No direct API endpoint found

### Recommendations for Enhancement

1. **Investigate Audio Upload API:**
   - Search for undocumented endpoints in v2/v3
   - Review lingq-importer source code for implementation details
   - Consider adding `audio` and `external_audio` parameters to `createLesson()`

2. **YouTube Integration:**
   - Could build wrapper around YouTube transcript extraction + LingQ lesson creation
   - Use youtube-transcript-api or similar library

3. **PDF Text Extraction:**
   - Add client-side PDF parsing (pdf-parse library)
   - Extract text and create lesson via existing API

---

## 2. LingQ/Vocabulary API

### Current Implementation Status: ✅ **Fully Implemented (Core Features)**

#### Implemented Endpoints

**Search Cards** (v3)
```
GET https://www.lingq.com/api/v3/{languageCode}/cards/
```

**Query Parameters:**
- `page`: Page number (default: 1)
- `page_size`: Items per page (default: 15, max: 100)
- `search`: Search term
- `search_criteria`: 'startsWith' or 'contains'
- `status`: Array of status codes (0-5)
- `sort`: 'date', 'term', or 'status'

**Implemented in:** `lingqClient.searchCards()` → `lingq_search_cards` MCP tool

**Get Card** (v3)
```
GET https://www.lingq.com/api/v3/{languageCode}/cards/{cardId}/
```

**Returns:** Full LingQCard object with all metadata

**Implemented in:** `lingqClient.getCard()` → `lingq_get_card` MCP tool

**Update Card** (v2)
```
PATCH https://www.lingq.com/api/v2/{languageCode}/cards/{cardId}/
```

**Parameters:**
- `status`: Status code (0-5)
- `tags`: Array of tags (replaces all existing tags)
- `notes`: Text notes

**Implemented in:** `lingqClient.updateCard()` → `lingq_update_card` MCP tool

**Review Card** (v2)
```
POST https://www.lingq.com/api/v2/{languageCode}/cards/{cardId}/review/
```

**Returns:** Updated `srs_due_date` and `status_changed_date`

**Implemented in:** `lingqClient.reviewCard()` → `lingq_review_card` MCP tool

#### LingQCard Data Structure

```typescript
interface LingQCard {
  pk: number;                           // Primary key
  url: string;                          // API URL for this card
  term: string;                         // The vocabulary word/phrase
  fragment: string;                     // Context sentence
  importance: number;                   // User-defined importance
  status: number;                       // 0-5 (New, Recognized, Familiar, Learned, Known, Ignored)
  extended_status: string | null;       // Additional status info
  last_reviewed_correct: string | null; // ISO timestamp
  srs_due_date: string;                 // ISO timestamp for next review
  notes: string;                        // User notes
  audio: string | null;                 // Audio URL if available
  words: string[];                      // Word components
  tags: string[];                       // User tags
  hints: Hint[];                        // Translation hints
  transliteration: Record<string, any>; // Pronunciation data
  gTags: string[];                      // Grammar tags
  wordTags: string[];                   // Word-level tags
  readings: Record<string, any>;        // Language-specific readings
  writings: string[];                   // Alternative writings
}
```

#### Additional Capabilities (Not Implemented)

**Repetition/SRS Endpoint** (Legacy)
```
GET https://www.lingq.com/api/languages/{languageCode}/repetition-lingqs/?apikey=APIKEY
```

**Status:** ⚠️ Legacy endpoint, still mentioned as working in forum discussions
**Use Case:** Get cards due for SRS review
**Priority:** Low (can filter searchCards by srs_due_date)

**Create LingQ from API:**
- **Status:** ❌ Not available via API
- Forum discussions confirm: "You can list and modify existing LingQs, but you cannot delete or create them through the API"
- LingQs are created in the UI by clicking on unknown words

**Delete Card:**
- **Status:** ❌ Not available via API
- Workaround: Set status to 5 (Ignored)

**Bulk Operations:**
- **Status:** ❌ No batch endpoints found
- Current approach: Loop through cards with rate limiting

### Recommendations for Enhancement

1. **Add SRS Queue Functionality:**
   - Implement helper method to get cards due for review today
   - Filter by `srs_due_date <= now()`

2. **Batch Operations:**
   - Add client-side batching with rate limiting
   - Example: `updateCards([{cardId, updates}, ...])`

---

## 3. Collections/Courses API

### Current Implementation Status: ✅ **Fully Implemented (Read-Only)**

#### Implemented Endpoints

**Get Collections** (v2)
```
GET https://www.lingq.com/api/v2/{languageCode}/collections/
```

**Query Parameters:**
- `page`: Page number (default: 1)
- `page_size`: Items per page (default: 15)

**Implemented in:** `lingqClient.getCollections()` → `lingq_get_collections` MCP tool

**Find Collection by Title** (Meta Function)
- Server-side pagination and search
- Fuzzy matching support
- **Implemented in:** `lingqClient.findCollectionByTitle()` → `lingq_find_collection_by_title` MCP tool

#### Collection Data Structure

```typescript
interface Collection {
  pk: number;                    // Primary key
  url?: string;                  // API URL
  title: string;                 // Collection title
  description?: string;          // Description text
  level?: string;                // Difficulty level
  language?: string;             // Language code
  imageUrl?: string;             // Cover image URL
  difficulty?: number;           // Numeric difficulty
  lessonsCount?: number;         // Number of lessons
  newWordsCount?: number;        // New words in collection
  tags?: string;                 // Comma-separated tags
  external_type?: string | null; // External source type
  rosesCount?: number;           // Community likes
  type?: string;                 // Collection type
}
```

#### Additional Capabilities (Not Implemented)

**Create Collection:**
- **Status:** ❌ Not found in v2 API
- Forum discussions suggest collections must be created via UI
- **Priority:** Medium (useful for automated content organization)

**Update Collection:**
- **Status:** ❌ Not found in v2 API
- **Priority:** Low (infrequent operation)

**Delete Collection:**
- **Status:** ❌ Not found in v2 API
- **Priority:** Low (infrequent operation)

**Collection Lessons List:**
- **Status:** ✅ Implemented via `getLessons(languageCode, collectionId)`
- Available in v2 API

### Recommendations for Enhancement

1. **Investigate Create Collection API:**
   - Check if undocumented POST endpoint exists
   - May require reverse-engineering from browser network activity

---

## 4. Progress/Statistics API

### Current Implementation Status: ❌ **Not Implemented**

#### API Limitations (From Research)

**Known Words Count:**
- **UI:** Visible in user profile and statistics page
- **API:** ❌ No direct endpoint to get known words count
- **Workaround:** Can retrieve Status 4 cards via `searchCards()` and count them
- **Limitation:** Only counts learned LingQs, not words marked "known" without saving

**Statistics Available in UI:**
- Known Words: All Status 4 cards + words marked known
- LingQs Created: Count of vocabulary cards created
- LingQs Learned: Count of cards reaching Status 4
- Listening Hours: Total audio playback time
- Words Read: Total words read in lessons
- Streak: Consecutive days meeting daily goal

**API Endpoints (Not Found):**
- ❌ GET user profile/statistics
- ❌ GET known words count
- ❌ GET learning streak
- ❌ GET reading statistics
- ❌ GET listening statistics

#### Legacy Endpoints (Mentioned but Unverified)

**Lesson Stats** (Legacy)
```
GET https://www.lingq.com/api/languages/{languageCode}/{contentId}/stats/
```

**Status:** ⚠️ May not work in current API
**Returns:** Lesson-specific statistics (words, LingQs, etc.)

**User Profile:**
- **Status:** ❌ No confirmed endpoint found
- Forum discussions suggest profile data not accessible via API

### Recommendations for Enhancement

1. **Implement Known Words Counter:**
   ```typescript
   async getKnownWordsCount(languageCode: string): Promise<number> {
     // Search for all Status 4 cards
     const response = await searchCards(languageCode, { status: [4], page_size: 1 });
     return response.count;
   }
   ```
   **Limitation:** Only counts learned LingQs, not all known words

2. **Investigate Hidden Endpoints:**
   - Use browser DevTools to monitor network requests
   - Check for `/api/v2/{languageCode}/profile/` or similar
   - May find undocumented statistics endpoints

3. **Create Statistics Dashboard Tool:**
   - Aggregate data from multiple API calls
   - Calculate derived metrics (e.g., words per day, review accuracy)

---

## 5. Lessons API

### Current Implementation Status: ✅ **Fully Implemented (Read + Create)**

#### Implemented Endpoints

**Get Lessons** (v2)
```
GET https://www.lingq.com/api/v2/{languageCode}/lessons/
```

**Query Parameters:**
- `page`: Page number (default: 1)
- `page_size`: Items per page (default: 25)
- `collection`: Filter by collection ID

**Implemented in:** `lingqClient.getLessons()` → `lingq_get_lessons` MCP tool

**Find Lesson by Title** (Meta Function)
- Server-side pagination and search
- Fuzzy matching support
- **Implemented in:** `lingqClient.findLessonByTitle()` → `lingq_find_lesson_by_title` MCP tool

**Check Lesson Exists** (Meta Function)
- Fast boolean check
- **Implemented in:** `lingqClient.checkLessonExists()` → `lingq_check_lesson_exists` MCP tool

**Get Recent Lessons** (Meta Function)
- Get N most recent lessons with minimal data
- **Implemented in:** `lingqClient.getRecentLessons()` → `lingq_get_recent_lessons` MCP tool

#### Lesson Data Structure

```typescript
interface Lesson {
  id: number;
  title: string;
  description?: string;
  text?: string;
  collection?: number;
  share_status: 'private' | 'shared';
  level?: string;
  created?: string;
}

// Minimal version for efficient responses
interface MinimalLesson {
  id: number;
  title: string;
  collectionId?: number;
  collectionTitle?: string;
  pubDate?: string;
  status?: string;
}
```

#### Additional Capabilities (Not Implemented)

**Get Lesson Text** (Legacy v1)
```
GET https://www.lingq.com/api/languages/{langID}/lessons/{lessonID}/text/
```

**Status:** ❌ Removed in v2 API
**Workaround:** Lesson text may be included in full lesson object from v3 create response

**Get Lesson LingQs** (Legacy)
```
GET https://www.lingq.com/api/languages/{languageCode}/{contentId}/lingqs/
```

**Status:** ⚠️ May not work in current API
**Workaround:** Use `searchCards()` and filter by lesson context

**Update Lesson:**
- **Status:** ❌ Not found in v2 API
- Forum: "V2 is missing useful methods that the old API had, such as GET lesson text and PUT to update properties on existing lessons"
- **Priority:** Medium (useful for fixing typos, updating titles)

**Delete Lesson:**
- **Status:** ❌ Not confirmed in API
- **Priority:** Low (infrequent operation)

**Get Lesson Sentences:**
```
GET https://www.lingq.com/api/languages/{languageCode}/{contentId}/sentences/
```

**Status:** ⚠️ Mentioned in forum but not documented
**Use Case:** Sentence-level reading and review
**Priority:** Medium (useful for sentence mining)

### Recommendations for Enhancement

1. **Test Lesson Sentences Endpoint:**
   - Try `GET /api/v2/{lang}/lessons/{id}/sentences/`
   - If available, add to client and expose as MCP tool

2. **Investigate Update/Delete:**
   - Check for PATCH/DELETE endpoints in v3
   - May need to reverse-engineer from UI

---

## 6. Audio/TTS API

### Current Implementation Status: ❌ **Not Implemented**

#### Findings from Research

**Text-to-Speech (TTS):**
- **UI:** iOS app has automatic TTS generation feature
- Uses iOS built-in TTS engine
- Web version has more limited TTS support
- **API:** ❌ No TTS generation endpoint found
- Forum discussions mention feature requests for ChatGPT TTS API integration

**Audio Upload:**
- **UI:** Edit Lesson → Upload Audio File
- Supports MP3 and other audio formats
- Can add timestamps for sentence-level audio
- **API:** ⚠️ Mentioned in forums but not documented
- Parameters: `audio` (file), `external_audio` (URL), `duration`

**Audio Processing:**
- **Whisper Transcription:** UI mentions Whisper for auto-generating transcripts from audio
- **API Support:** ❌ Not found

**Audio Playback:**
- Lesson audio accessible via URL in lesson object
- Card audio accessible via `audio` field in LingQCard

#### Third-Party Tools

**LingQ Text-to-Audio Generator:**
- GitHub project using AWS Polly for TTS
- Generates MP3 files for LingQ lessons
- [GitHub Link](https://github.com/dankentfield/LingQ-text-to-audio-generator)

### Recommendations for Enhancement

1. **Research Audio Upload Endpoint:**
   - Test `POST /api/v2/{lang}/lessons/{id}/audio/`
   - Try form-data upload with `audio` field

2. **TTS Integration Options:**
   - External TTS service (Google Cloud TTS, AWS Polly, OpenAI TTS)
   - Generate audio file
   - Upload via API to lesson

3. **Audio Download Helper:**
   - Add utility to download lesson audio
   - Store locally for offline processing

---

## 7. Sentence/Phrase API

### Current Implementation Status: ❌ **Not Implemented**

#### Findings from Research

**Sentences Endpoint** (Unverified)
```
GET https://www.lingq.com/api/languages/{languageCode}/{contentId}/sentences/
```

**Status:** ⚠️ Mentioned in forum but not officially documented
**Potential Use Cases:**
- Sentence-level reading and review
- Sentence mining for Anki
- Context extraction for vocabulary
- Sentence-level audio timestamps

**API Documentation:**
- ❌ No official documentation found
- Forum users have mentioned the endpoint but no detailed specifications

**Data Structure:** (Speculative based on forum mentions)
```typescript
interface Sentence {
  id: number;
  text: string;
  startTime?: number;  // Audio timestamp
  endTime?: number;    // Audio timestamp
  words?: string[];    // Word segmentation
}
```

### Recommendations for Enhancement

1. **Test Sentences Endpoint:**
   ```typescript
   async getLessonSentences(languageCode: string, lessonId: number) {
     // Try multiple potential endpoints
     const endpoints = [
       `/${languageCode}/lessons/${lessonId}/sentences/`,
       `/${languageCode}/content/${lessonId}/sentences/`,
     ];
     // Test each endpoint
   }
   ```

2. **Implement Sentence Mining Tool:**
   - If endpoint works, add sentence extraction
   - Expose as MCP tool for Anki integration
   - Add sentence search/filter capabilities

---

## 8. User/Languages API

### Current Implementation Status: ✅ **Partially Implemented**

#### Implemented Endpoints

**Get Languages** (v2)
```
GET https://www.lingq.com/api/v2/languages/
```

**Returns:** Array of languages available to the user

**Implemented in:** `lingqClient.getLanguages()` → `lingq_get_languages` MCP tool

#### Language Data Structure

```typescript
interface Language {
  code: string;  // ISO 639-1 code (e.g., "ko", "ja", "es")
  title: string; // Display name (e.g., "Korean", "Japanese")
}
```

#### Additional Capabilities (Not Implemented)

**User Profile:**
- **Status:** ❌ No endpoint found
- **Desired Data:**
  - User ID
  - Username
  - Email
  - Subscription tier
  - Account creation date
  - Default language settings

**User Settings:**
- **Status:** ❌ No endpoint found
- **Desired Data:**
  - Daily goal
  - Review settings
  - Notification preferences
  - Privacy settings

**Add Language:**
- **Status:** ❌ Not confirmed
- Users can add languages via UI
- API support unknown

### Recommendations for Enhancement

1. **Investigate User Profile Endpoint:**
   - Try `GET /api/v2/user/profile/`
   - Try `GET /api/v2/account/`
   - Check browser DevTools when viewing profile

---

## 9. Authentication & Rate Limiting

### Current Implementation Status: ✅ **Fully Implemented**

#### Authentication

**Method:** Token-based authentication

**Header Format:**
```
Authorization: Token YOUR_API_KEY
```

**API Key Location:**
- Get from: https://www.lingq.com/en/accounts/apikey/
- Store in: `LINGQ_API_KEY` environment variable

**Implemented in:**
- `LingQClient` constructor sets auth header for all requests
- `authenticateToken()` middleware for HTTP transport mode

#### Rate Limiting

**LingQ API Rate Limits:**
- **Status:** Not officially documented
- **Observed:** 429 errors possible under high load
- **Recommendation:** Implement exponential backoff

**Current Implementation:**
- HTTP mode: Rate limiting via express-rate-limit (100 req/15 min per IP)
- API client: Axios timeout set to 30 seconds
- Error handling: Detects 429 errors and provides user-friendly message

**Missing:**
- Automatic retry with exponential backoff
- Request queue/throttling
- Rate limit tracking

### Recommendations for Enhancement

1. **Add Retry Logic:**
   ```typescript
   async retryWithBackoff(fn: Function, maxRetries = 3) {
     for (let i = 0; i < maxRetries; i++) {
       try {
         return await fn();
       } catch (error) {
         if (error.response?.status === 429 && i < maxRetries - 1) {
           await delay(Math.pow(2, i) * 1000); // Exponential backoff
           continue;
         }
         throw error;
       }
     }
   }
   ```

2. **Request Queue:**
   - Implement p-queue or similar
   - Limit concurrent requests
   - Prevent rate limit errors

---

## 10. API Version Comparison

### v1 (Legacy - Deprecated)

**Status:** ❌ No longer works

**Documentation:** https://www.lingq.com/apidocs/api-1.0.html

**Notable Features (Lost in v2):**
- `GET /api/languages/{langID}/lessons/{lessonID}/text/` - Get lesson text
- `PUT` methods to update lesson properties
- More comprehensive user profile data

### v2 (Current Stable)

**Base URL:** `https://www.lingq.com/api/v2/`

**Documentation:** http://www.lingq.com/lingq_api/details/

**Primary Endpoints:**
- Lessons: Create, list, filter by collection
- Collections: List, paginate
- Cards: Update, review
- Languages: List available languages

**Limitations:**
- No lesson text retrieval
- No lesson updates
- No collection creation
- Limited statistics
- No user profile

**Authentication:** `Authorization: Token {apiKey}`

### v3 (Partial Availability)

**Base URL:** `https://www.lingq.com/api/v3/`

**Documentation:** ❌ Not publicly available

**Known Endpoints:**
- `POST /{languageCode}/lessons/` - Create lesson (returns more data than v2)
- `GET /{languageCode}/cards/` - Search cards (better than v2)
- `GET /{languageCode}/cards/{cardId}/` - Get card details

**Status:** Partially implemented, not fully documented

**Forum Quote:** "The 2.0 API docs are available, but regarding the 3.0 API - developers have asked if it is available to be developed on."

### Recommendations

1. **Prioritize v3 where available:**
   - Better data structures
   - More complete responses
   - Current implementation already uses v3 for cards and lesson creation

2. **Monitor for v3 expansion:**
   - Check forum for updates
   - Test v3 equivalents of v2 endpoints
   - Update client as v3 becomes more available

3. **Document version requirements:**
   - Clearly mark which version each method uses
   - Test for breaking changes during LingQ updates

---

## 11. Undocumented/Reverse-Engineered Endpoints

### Research Methods Used by Community

**Browser DevTools:**
- Monitor network traffic when using LingQ web app
- Inspect request/response payloads
- Identify undocumented endpoints

**Browser Extension Decompilation:**
- Official LingQ browser extension contains API calls
- Some developers have decompressed and analyzed the extension code
- Found additional endpoints not in documentation

**Third-Party API Wrappers:**
- Ruby gem: [evizitei/lingq](https://github.com/evizitei/lingq)
- Python: lingqAnkiSync project
- These projects may contain discovered endpoints

### Potentially Available Endpoints (Unverified)

**Lesson Operations:**
```
PATCH /api/v2/{lang}/lessons/{id}/     # Update lesson
DELETE /api/v2/{lang}/lessons/{id}/    # Delete lesson
GET /api/v2/{lang}/lessons/{id}/text/  # Get lesson text (lost from v1)
```

**Collection Operations:**
```
POST /api/v2/{lang}/collections/       # Create collection
PATCH /api/v2/{lang}/collections/{id}/ # Update collection
DELETE /api/v2/{lang}/collections/{id}/# Delete collection
```

**Statistics:**
```
GET /api/v2/{lang}/statistics/         # User language statistics
GET /api/v2/user/profile/              # User profile
GET /api/v2/user/streak/               # Learning streak
```

**Audio:**
```
POST /api/v2/{lang}/lessons/{id}/audio/# Upload audio file
POST /api/v2/{lang}/lessons/{id}/tts/  # Generate TTS audio (wishful)
```

### Recommendations for Discovery

1. **Systematic Endpoint Testing:**
   - Create test script to probe common REST patterns
   - Try GET/POST/PATCH/DELETE on known resources
   - Document results

2. **Browser Extension Analysis:**
   - Download official LingQ extension
   - Decompile and search for API calls
   - Document findings

3. **Community Collaboration:**
   - Monitor LingQ Developer Forum regularly
   - Share findings with community
   - Contribute to documentation efforts

---

## 12. Current MCP Implementation Summary

### Implemented MCP Tools (13 Total)

| Tool Name | API Version | Status | Token Efficiency |
|-----------|-------------|--------|------------------|
| `lingq_get_languages` | v2 | ✅ Complete | High |
| `lingq_create_lesson` | v3 | ✅ Complete | Medium |
| `lingq_search_cards` | v3 | ✅ Complete | High (minimal mode) |
| `lingq_get_card` | v3 | ✅ Complete | Medium |
| `lingq_update_card` | v2 | ✅ Complete | High |
| `lingq_add_tags_to_card` | v2 | ✅ Complete | High |
| `lingq_review_card` | v2 | ✅ Complete | High |
| `lingq_get_collections` | v2 | ✅ Complete | High (minimal mode) |
| `lingq_get_lessons` | v2 | ✅ Complete | High (minimal mode) |
| `lingq_find_lesson_by_title` | v2 | ✅ Complete | Very High |
| `lingq_find_collection_by_title` | v2 | ✅ Complete | Very High |
| `lingq_check_lesson_exists` | v2 | ✅ Complete | Very High |
| `lingq_get_recent_lessons` | v2 | ✅ Complete | Very High |

### Feature Coverage

| Feature Area | Implementation | Completeness |
|--------------|----------------|--------------|
| Content Import | ✅ Text-based lessons | 70% (missing audio/video) |
| Vocabulary Management | ✅ Full CRUD (except create) | 90% (can't create LingQs via API) |
| Collections | ✅ Read-only | 60% (missing create/update/delete) |
| Lessons | ✅ Create + Read | 70% (missing update/delete) |
| Statistics | ❌ None | 0% |
| Audio/TTS | ❌ None | 0% |
| Sentences | ❌ None | 0% |
| User Profile | ✅ Languages only | 20% |

### Optimization Features

**Minimal Mode:**
- Reduces response size by 70-90%
- Returns only essential fields
- Enabled by default for all list operations

**Meta Functions:**
- Server-side pagination (no AI orchestration needed)
- Early termination when match found
- ~96% token savings vs traditional approach

**Performance Metrics:**
| Operation | Full Response | Minimal Response | Token Savings |
|-----------|---------------|------------------|---------------|
| Get 25 lessons | ~4000 tokens | ~1200 tokens | 70% |
| Get 15 collections | ~2000 tokens | ~400 tokens | 80% |
| Search 15 cards | ~3500 tokens | ~800 tokens | 77% |
| Find lesson by title | ~4000+ tokens | ~150 tokens | 96% |

---

## 13. Priority Recommendations

### High Priority (Immediate Value)

1. **Test Sentence Endpoint:**
   - Try `GET /api/v2/{lang}/lessons/{id}/sentences/`
   - If available, major feature unlock for sentence mining
   - Estimated effort: 2-4 hours

2. **Implement Known Words Counter:**
   - Add `getKnownWordsCount()` helper
   - Aggregate Status 4 cards count
   - Estimated effort: 1 hour

3. **Add SRS Review Queue:**
   - Filter cards by `srs_due_date <= today`
   - Expose as `lingq_get_due_cards` tool
   - Estimated effort: 2 hours

### Medium Priority (Nice to Have)

4. **Audio Upload API Research:**
   - Test potential audio upload endpoints
   - Document findings
   - Implement if available
   - Estimated effort: 4-8 hours

5. **Lesson Update/Delete Investigation:**
   - Test PATCH/DELETE endpoints in v2/v3
   - Browser DevTools analysis
   - Estimated effort: 2-4 hours

6. **Collection Create/Update:**
   - Test POST/PATCH on collections endpoint
   - Enables automated course organization
   - Estimated effort: 2-4 hours

### Low Priority (Future Enhancement)

7. **TTS Integration:**
   - External TTS service integration
   - Audio file upload
   - Complex feature, multi-day effort

8. **Statistics Dashboard:**
   - Aggregate metrics from multiple API calls
   - Custom analytics
   - Estimated effort: 1-2 days

9. **YouTube Integration:**
   - Transcript extraction + lesson creation
   - Requires external libraries
   - Estimated effort: 1-2 days

---

## 14. Testing Recommendations

### Endpoint Discovery Testing

**Script Template:**
```typescript
async function testEndpoint(method: string, path: string, data?: any) {
  try {
    const response = await axios({
      method,
      url: `https://www.lingq.com/api/v2${path}`,
      headers: { 'Authorization': `Token ${API_KEY}` },
      data
    });
    console.log(`✅ ${method} ${path}:`, response.status);
    return response.data;
  } catch (error) {
    console.log(`❌ ${method} ${path}:`, error.response?.status, error.response?.data);
    return null;
  }
}

// Test batch
await testEndpoint('GET', '/ko/lessons/12345/sentences/');
await testEndpoint('PATCH', '/ko/lessons/12345/', { title: 'New Title' });
await testEndpoint('POST', '/ko/collections/', { title: 'Test Collection' });
await testEndpoint('GET', '/user/profile/');
await testEndpoint('GET', '/ko/statistics/');
```

### Browser DevTools Monitoring

1. Open LingQ web app
2. Open Chrome DevTools → Network tab
3. Filter by "Fetch/XHR"
4. Perform action (e.g., edit lesson, create collection)
5. Inspect request details (URL, method, payload, response)
6. Document findings

### Community Resources

**Forums to Monitor:**
- [LingQ Developer Forum](https://forum.lingq.com/c/lingq-developer-forum/43)
- Check for API update announcements
- Search for undocumented endpoint discussions

---

## 15. Source Links & References

### Official Documentation
- [LingQ API Documentation](http://www.lingq.com/lingq_api/details/)
- [LingQ API v1 Documentation](https://www.lingq.com/apidocs/api-1.0.html)
- [LingQ API Key](https://www.lingq.com/en/accounts/apikey/)
- [LingQ Developer Forum](https://forum.lingq.com/c/lingq-developer-forum/43)
- [LingQ Support - Statistics Explanation](https://lingq-support.groovehq.com/help/what-do-all-the-statistics-mean)
- [LingQ Support - SRS Review](https://lingq-support.groovehq.com/help/how-does-the-lingq-srs-review-work)

### User Guides & Blog Posts
- [Complete Guide to Importing on LingQ](https://www.lingq.com/blog/complete-guide-importing-lingq/)
- [Import Any YouTube Video into LingQ](https://www.lingq.com/blog/import-any-youtube-video-into-lingq/)
- [How to Import Music Videos on LingQ](https://www.lingq.com/blog/how-to-import-music-videos-on-lingq/)

### Community Projects & Tools
- [GitHub - evizitei/lingq (Ruby API wrapper)](https://github.com/evizitei/lingq)
- [GitHub - thags/lingqAnkiSync](https://github.com/thags/lingqAnkiSync)
- [GitHub - rtjohnson12/lingq-importer (YouTube importer)](https://github.com/rtjohnson12/lingq-importer)
- [GitHub - dankentfield/LingQ-text-to-audio-generator](https://github.com/dankentfield/LingQ-text-to-audio-generator)

### Forum Discussions (Key Threads)
- [URL and docs for 3.0 API?](https://forum.lingq.com/t/url-and-docs-for-30-api/75276)
- [LingQ API V2 missing methods?](https://forum.lingq.com/t/lingq-api-v2-missing-methods/27155)
- [LingQ API - General Discussion](https://forum.lingq.com/t/lingq-api/64922)
- [Expanding the LingQ API](https://forum.lingq.com/t/expanding-the-lingq-api/64883)
- [API endpoint for updating word status](https://forum.lingq.com/t/api-endpoint-for-updating-word-status/38968)
- [Python example for creating a lesson](https://forum.lingq.com/t/python-example-for-creating-a-lesson-for-a-course/64897)
- [Python - uploading audio via API](https://forum.lingq.com/t/python-uploading-audio-via-api/64977)
- [Lessons in course with API](https://forum.lingq.com/t/lessons-in-course-with-api/64967)
- [Need help on LingQ API](https://forum.lingq.com/t/need-help-on-lingq-api/19519)
- [Visualize/Export List of "Known Words"](https://forum.lingq.com/t/visualizeexport-list-of-known-words/21928)
- [How does one import a whole book (pdf and audio on youtube)?](https://forum.lingq.com/t/how-does-one-import-a-whole-book-pdf-and-separate-audio-on-youtube/34329)
- [Importing Audio with Ebook into LingQ](https://forum.lingq.com/t/importing-audio-with-ebook-into-lingq/32589)
- [How do I upload Youtube Audio?](https://forum.lingq.com/t/how-do-i-upload-youtube-audio/29933)
- [LingQ SRS - Updates, Tips and Known Issues](https://forum.lingq.com/t/lingq-srs/4057)
- [rick elrod - Becoming multilingual in German and Rust](https://elrod.me/blog/becoming-multilingual-rust-german-lingq/)

### API-Related Blog Post
- [Use the LingQ API to practice your foreign listening language skills (Gist)](https://gist.github.com/dboris/4179647)

---

## 16. Conclusion

The LingQ API provides solid core functionality for lesson creation, vocabulary management, and basic content organization. However, significant gaps exist in:

- **Statistics/Progress Tracking** - No API access to user statistics
- **Audio Management** - Limited or undocumented audio upload capabilities
- **Content Management** - Cannot update or delete lessons/collections via API
- **Advanced Features** - No sentence-level API, TTS generation, or full profile access

**Current Implementation (lingq-mcp) Status:**
The MCP server has implemented all confirmed, documented API capabilities with excellent optimization features (minimal mode, meta functions). Further enhancement requires:

1. **Testing undocumented endpoints** (highest ROI)
2. **Reverse-engineering from UI** (medium effort, high value)
3. **External service integration** (TTS, YouTube) (high effort, medium value)

**Recommendation:** Prioritize endpoint discovery testing (Section 14) to unlock hidden API capabilities before investing in external service integrations.

---

**Document Version:** 1.0
**Last Updated:** 2025-11-27
**Maintained By:** LingQ MCP Server Project
