# LingQ API Complete Reference Guide

> **Last Updated:** 2025-11-27
> **API Versions:** v2 (stable), v3 (undocumented)
> **Research Sources:** Official docs, LingQ Forum, GitHub community projects

This guide documents all known LingQ API endpoints, including undocumented v3 endpoints discovered through reverse engineering and community research.

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [API Versions](#api-versions)
4. [Endpoints Reference](#endpoints-reference)
   - [Languages](#languages)
   - [Lessons](#lessons)
   - [Collections](#collections)
   - [Vocabulary Cards](#vocabulary-cards)
   - [Progress & Statistics](#progress--statistics)
   - [Audio & Timestamps](#audio--timestamps)
5. [Common Patterns](#common-patterns)
6. [Known Issues & Workarounds](#known-issues--workarounds)
7. [Rate Limiting](#rate-limiting)
8. [Error Handling](#error-handling)
9. [Missing Features](#missing-features)
10. [Community Resources](#community-resources)

---

## Overview

### Base URLs

| Version | URL | Status |
|---------|-----|--------|
| v1 (Legacy) | `https://www.lingq.com/api/` | **Deprecated** - Returns 404 |
| v2 (Stable) | `https://www.lingq.com/api/v2` | **Primary** - Documented |
| v3 (Current) | `https://www.lingq.com/api/v3` | **Undocumented** - Use with caution |

### Documentation Status

- **Official Docs:** https://www.lingq.com/apidocs/ (~8 years outdated)
- **Legacy Docs:** http://www.lingq.com/lingq_api/details/
- **v3 Docs:** None - requires reverse engineering via browser DevTools

### Key Insight

LingQ uses **both v2 and v3** simultaneously depending on the operation:
- **v2:** Lessons list, collections, card updates, reviews
- **v3:** Lesson creation, card search/retrieval, progress data

---

## Authentication

### Method

Token-based authentication via HTTP header.

### Header Format

```
Authorization: Token YOUR_API_KEY
```

**Important:** Include a space after "Token".

### Getting Your API Key

1. Log in to https://www.lingq.com
2. Navigate to https://www.lingq.com/en/accounts/apikey/
3. Copy the API key (GUID format)

### Example Requests

**cURL:**
```bash
curl -H "Authorization: Token YOUR_API_KEY" \
     https://www.lingq.com/api/v2/languages/
```

**JavaScript (axios):**
```javascript
const axios = require('axios');

const client = axios.create({
  baseURL: 'https://www.lingq.com/api/v2',
  headers: {
    'Authorization': `Token ${API_KEY}`,
    'Content-Type': 'application/json'
  }
});

const languages = await client.get('/languages/');
```

**Python (requests):**
```python
import requests

headers = {'Authorization': f'Token {API_KEY}'}
response = requests.get(
    'https://www.lingq.com/api/v2/languages/',
    headers=headers
)
```

---

## API Versions

### Version 1 (Legacy) - DEPRECATED

- **Status:** No longer functional
- **Endpoints:** Return 404 errors
- **Example:** `GET /api/languages/en/lessons/` - BROKEN

### Version 2 (Stable) - PRIMARY

- **Status:** Active, documented (partially)
- **Best For:** Lessons list, collections, card updates, reviews
- **Documentation:** Available but outdated

### Version 3 (Current) - UNDOCUMENTED

- **Status:** Active, no official documentation
- **Best For:** Lesson creation, card search, progress data
- **Discovery:** Use browser DevTools (F12 → Network → Fetch/XHR)

---

## Endpoints Reference

### Languages

#### Get Available Languages

**Endpoint:** `GET /api/v2/languages/`

**Authentication:** Required

**Parameters:** None

**Response:**
```json
[
  { "code": "ko", "title": "Korean" },
  { "code": "ja", "title": "Japanese" },
  { "code": "es", "title": "Spanish" }
]
```

**Language Codes (ISO 639-1):**
| Code | Language |
|------|----------|
| `ko` | Korean |
| `ja` | Japanese |
| `zh` | Chinese |
| `es` | Spanish |
| `fr` | French |
| `de` | German |
| `it` | Italian |
| `ru` | Russian |
| `pt` | Portuguese |
| `ar` | Arabic |

---

### Lessons

#### Create Lesson (Text Only)

**Endpoint:** `POST /api/v3/{languageCode}/lessons/`

**Authentication:** Required

**Content-Type:** `application/json`

**Request Body:**
```json
{
  "title": "My Lesson Title",
  "text": "The lesson content goes here...",
  "collection": 12345,
  "share_status": "private",
  "original_url": "https://source.com/article",
  "tags": ["grammar", "beginner"]
}
```

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `title` | string | Yes | Lesson title |
| `text` | string | Yes | Lesson content (max ~2000 words before auto-split) |
| `collection` | number | No | Collection ID to organize lesson |
| `share_status` | string | No | "private" (default) or "shared" |
| `original_url` | string | No | Source URL |
| `tags` | string[] | No | Array of tags for categorization |

**Response:**
```json
{
  "id": 123456,
  "title": "My Lesson Title",
  "share_status": "private"
}
```

**Important Notes:**
- Content over ~2000 words is automatically split into multiple lessons
- Use `<p>` tags for paragraph breaks (plain newlines are stripped)
- v2 endpoint also exists but v3 is preferred

#### Create Lesson with Audio (Multipart)

**Endpoint:** `POST /api/v3/{languageCode}/lessons/`

**Authentication:** Required

**Content-Type:** `multipart/form-data`

**Request (Python example):**
```python
from requests_toolbelt.multipart.encoder import MultipartEncoder

encoder = MultipartEncoder([
    ('title', 'Lesson with Audio'),
    ('text', 'The lesson text content...'),
    ('share_status', 'private'),
    ('collection', str(collection_id)),
    ('audio', ('audio.mp3', open('audio.mp3', 'rb'), 'audio/mpeg'))
])

response = requests.post(
    f'https://www.lingq.com/api/v3/{lang}/lessons/',
    data=encoder,
    headers={
        'Authorization': f'Token {API_KEY}',
        'Content-Type': encoder.content_type
    }
)
```

**Supported Audio Formats:**
- MP3 (`audio/mpeg`)
- M4A (`audio/mp4`)
- WAV (`audio/wav`)
- OGG (`audio/ogg`)

**Important:** Must use proper multipart encoding. Simple JSON with file path will fail.

#### Get Lessons List

**Endpoint:** `GET /api/v2/{languageCode}/lessons/`

**Authentication:** Required

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | number | 1 | Page number |
| `page_size` | number | 25 | Items per page (max 100) |
| `collection` | number | - | Filter by collection ID |

**Response:**
```json
{
  "count": 150,
  "next": "https://www.lingq.com/api/v2/ko/lessons/?page=2",
  "previous": null,
  "results": [
    {
      "id": 123456,
      "title": "Lesson Title",
      "collection": 789,
      "collectionTitle": "My Course",
      "pubDate": "2024-01-15T10:30:00Z",
      "status": "active"
    }
  ]
}
```

#### Get Single Lesson

**Endpoint:** `GET /api/v2/{languageCode}/lessons/{lessonId}/`

**Authentication:** Required

**Response:** Complete lesson object including tokenized text, cards, words, bookmarks

**Note:** This endpoint returns extensive data. Use for detailed lesson inspection only.

#### Update Lesson Audio

**Endpoint:** `PATCH /api/v3/{languageCode}/lessons/{lessonId}/`

**Authentication:** Required

**Content-Type:** `multipart/form-data`

**Use Case:** Add or replace audio for existing lesson

```python
encoder = MultipartEncoder([
    ('audio', ('audio.mp3', open('audio.mp3', 'rb'), 'audio/mpeg'))
])
```

#### Delete Lesson

**Status:** NOT AVAILABLE via API

**Workaround:** Must delete via web interface

---

### Collections

#### Get Collections List

**Endpoint:** `GET /api/v2/{languageCode}/collections/`

**Authentication:** Required

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | number | 1 | Page number |
| `page_size` | number | 25 | Items per page (max 100) |

**Response:**
```json
{
  "count": 50,
  "next": "https://www.lingq.com/api/v2/ko/collections/?page=2",
  "previous": null,
  "results": [
    {
      "pk": 12345,
      "title": "My Course",
      "description": "A collection of lessons",
      "lessonsCount": 10,
      "level": "intermediate"
    }
  ]
}
```

#### Get Single Collection

**Endpoint:** `GET /api/v2/{languageCode}/collections/{collectionId}/`

**Authentication:** Required

**Response:** Collection object with nested lessons array

#### Create Collection

**Status:** NOT DOCUMENTED

**Workaround:** Create via web interface, then reference by ID

#### Delete Collection

**Status:** NOT AVAILABLE via API

**Known Issue:** UI has bugs preventing deletion of collections with shared items

---

### Vocabulary Cards

#### Search Cards

**Endpoint:** `GET /api/v3/{languageCode}/cards/`

**Authentication:** Required

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | number | 1 | Page number |
| `page_size` | number | 25 | Items per page (max 100) |
| `search` | string | - | Search term |
| `search_criteria` | string | - | "startsWith" or "contains" |
| `status` | number[] | - | Filter by status codes |
| `sort` | string | - | "date", "term", or "status" |

**Status Codes:**
| Code | Status | Meaning |
|------|--------|---------|
| 0 | New | Never seen |
| 1 | Recognized | Seen, not familiar |
| 2 | Familiar | Somewhat known |
| 3 | Learned | Well known |
| 4 | Known | Mastered |
| 5 | Ignored | Not tracking |

**Response:**
```json
{
  "count": 500,
  "next": "https://www.lingq.com/api/v3/ko/cards/?page=2",
  "previous": null,
  "results": [
    {
      "pk": 12345,
      "term": "단어",
      "fragment": "이것은 단어입니다",
      "status": 2,
      "tags": ["grammar", "noun"],
      "hints": [
        {
          "text": "word",
          "popularity": 95,
          "is_google_translate": false
        }
      ],
      "srs_due_date": "2024-01-20T00:00:00Z",
      "notes": "User notes here"
    }
  ]
}
```

#### Get Single Card

**Endpoint:** `GET /api/v3/{languageCode}/cards/{cardId}/`

**Authentication:** Required

**Response:** Full card object (45+ fields)

**Error Response (404):**
```json
{"detail": "Not Found."}
```

#### Update Card

**Endpoint:** `PATCH /api/v2/{languageCode}/cards/{cardId}/`

**Authentication:** Required

**Content-Type:** `application/json`

**Request Body:**
```json
{
  "status": 3,
  "tags": ["grammar", "verb", "important"],
  "notes": "Remember: irregular conjugation"
}
```

**Updateable Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `status` | number | Status code 0-5 |
| `tags` | string[] | **Replaces** all existing tags |
| `notes` | string | User notes (max 250 chars) |

**Important:** Setting `tags` replaces ALL existing tags. To add tags, first GET the card, merge arrays, then PATCH.

#### Review Card (SRS)

**Endpoint:** `POST /api/v2/{languageCode}/cards/{cardId}/review/`

**Authentication:** Required

**Request Body:** Empty POST

**Response:**
```json
{
  "srs_due_date": "2024-01-25T00:00:00Z",
  "status_changed_date": "2024-01-15T10:30:00Z"
}
```

**SRS Intervals by Level:**
| Level | Interval |
|-------|----------|
| 1 | 0 days |
| 2 | 5 days |
| 3 | 13 days |
| 4 | 34 days |
| 5 (Known) | 85 days |

**Important:** Use this endpoint instead of manually patching `srs_due_date`.

#### Create Card (LingQ)

**Status:** NOT AVAILABLE via direct API

**Workaround:** Cards are created automatically when highlighting words in lessons via web/app interface

#### Delete Card

**Status:** NOT AVAILABLE via API

---

### Progress & Statistics

#### Get Progress Data

**Endpoint:** `GET /api/v3/{languageCode}/progress/`

**Authentication:** Required

**Status:** UNDOCUMENTED - Discovered via browser DevTools

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `username` | string | Optional username filter |
| `interval` | string | Time interval |

#### Get Chart Data

**Endpoint:** `GET /api/v3/{languageCode}/progress/chart_data/`

**Authentication:** Required

**Status:** UNDOCUMENTED

**Query Parameters:**
| Parameter | Values |
|-----------|--------|
| `metric` | "reading", "listening", etc. |
| `period` | "today", "last_7d", "last_14d", "last_30d", "last_1m", "last_3m", "last_6m", "this_month", "all" |

**Example:**
```bash
curl -H "Authorization: Token YOUR_KEY" \
     "https://www.lingq.com/api/v3/ko/progress/chart_data/?metric=reading&period=last_30d"
```

---

### Audio & Timestamps

#### Get Lesson Timestamps

**Endpoint:** `GET /api/v3/{languageCode}/lessons/{lessonId}/timestamps/`

**Authentication:** Required

**Status:** UNDOCUMENTED

**Response:** Array of timestamp objects mapping text segments to audio positions

#### Update Lesson Timestamps

**Endpoint:** `POST /api/v3/{languageCode}/lessons/{lessonId}/timestamps/`

**Authentication:** Required

**Status:** UNDOCUMENTED

**Use Case:** Sync text with audio for sentence-by-sentence playback

#### Text-to-Speech

**Endpoint:** `GET /api/v2/tts/`

**Authentication:** Required

**Status:** UNDOCUMENTED

**Query Parameters:**
| Parameter | Description |
|-----------|-------------|
| `language` | Language code |
| `voice` | Voice name |
| `app_name` | TTS engine (e.g., "polly") |
| `text` | Text to synthesize |

---

## Common Patterns

### Pagination

All list endpoints use consistent pagination:

```json
{
  "count": 150,
  "next": "https://www.lingq.com/api/v2/ko/lessons/?page=2",
  "previous": null,
  "results": [...]
}
```

**Best Practice:** Check `next` for null to detect last page.

### Efficient Searching

**Bad (token-heavy):**
```javascript
// Fetches all lessons, AI filters client-side
const allLessons = await getAllLessonsWithPagination();
const found = allLessons.find(l => l.title === searchTitle);
```

**Good (server-side pagination with early termination):**
```javascript
async function findLessonByTitle(lang, title, maxPages = 20) {
  for (let page = 1; page <= maxPages; page++) {
    const response = await client.get(`/${lang}/lessons/`, {
      params: { page, page_size: 50 }
    });

    const match = response.data.results.find(
      l => l.title.toLowerCase() === title.toLowerCase()
    );
    if (match) return { found: true, ...match };

    if (!response.data.next) break;
  }
  return { found: false };
}
```

### Adding Tags (Preserving Existing)

The API **replaces** tags on update. To add tags:

```javascript
async function addTagsToCard(lang, cardId, newTags) {
  // 1. Get current card
  const card = await client.get(`/${lang}/cards/${cardId}/`);

  // 2. Merge tags (deduplicate)
  const allTags = [...new Set([...card.data.tags, ...newTags])];

  // 3. Update with merged tags
  return client.patch(`/${lang}/cards/${cardId}/`, { tags: allTags });
}
```

### Multipart File Upload

For audio uploads, use proper multipart encoding:

```javascript
const FormData = require('form-data');
const fs = require('fs');

const form = new FormData();
form.append('title', 'Lesson Title');
form.append('text', 'Lesson content...');
form.append('audio', fs.createReadStream('audio.mp3'), {
  filename: 'audio.mp3',
  contentType: 'audio/mpeg'
});

await axios.post(`/v3/${lang}/lessons/`, form, {
  headers: {
    ...form.getHeaders(),
    'Authorization': `Token ${API_KEY}`
  }
});
```

---

## Known Issues & Workarounds

### 1. Newlines Disappear in Imported Text

**Issue:** Plain `\n` characters are stripped when importing via API.

**Workaround:** Wrap paragraphs in HTML `<p>` tags:

```javascript
const text = paragraphs.map(p => `<p>${p}</p>`).join('');
```

### 2. Content Auto-Split at ~2000 Words

**Issue:** Long content is automatically split into multiple lessons.

**Workaround:** Pre-split content before sending to API:

```javascript
function splitText(text, maxWords = 1800) {
  const words = text.split(/\s+/);
  const chunks = [];
  for (let i = 0; i < words.length; i += maxWords) {
    chunks.push(words.slice(i, i + maxWords).join(' '));
  }
  return chunks;
}
```

### 3. Audio Upload Fails

**Issue:** `{"audio": ["The submitted data was not a file."]}`

**Cause:** Incorrect encoding - API expects multipart/form-data, not JSON.

**Solution:** Use `requests_toolbelt.MultipartEncoder` (Python) or `form-data` (Node.js).

### 4. Tags Replace Instead of Add

**Issue:** PATCH with `tags` replaces all existing tags.

**Workaround:** Fetch current tags, merge, then update (see Common Patterns).

### 5. LingQ Stores Words Lowercase

**Issue:** Words saved with original case, but searches are case-insensitive.

**Impact:** Affects German and other case-sensitive languages.

**Workaround:** Restore case from original text context.

### 6. No Lesson Ordering Data

**Issue:** Lessons returned without collection order information.

**Workaround:** None - must infer from creation date or manual tracking.

---

## Rate Limiting

### Limits

- **Documented:** None specified
- **Observed:** ~100 requests per 15 minutes (per IP)
- **Error Code:** 429 Too Many Requests

### Best Practices

```javascript
// Exponential backoff
async function requestWithRetry(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (error.response?.status === 429) {
        const delay = Math.pow(2, i) * 1000;
        await new Promise(r => setTimeout(r, delay));
      } else {
        throw error;
      }
    }
  }
}

// Batch with delays
async function batchProcess(items, processFn, delayMs = 100) {
  for (const item of items) {
    await processFn(item);
    await new Promise(r => setTimeout(r, delayMs));
  }
}
```

---

## Error Handling

### HTTP Status Codes

| Code | Meaning | Common Cause |
|------|---------|--------------|
| 401 | Unauthorized | Invalid or missing API key |
| 403 | Forbidden | No permission for resource |
| 404 | Not Found | Resource doesn't exist |
| 429 | Too Many Requests | Rate limit exceeded |
| 500+ | Server Error | LingQ server issues |

### Error Responses

**Standard Error:**
```json
{
  "detail": "Not Found."
}
```

**Validation Error:**
```json
{
  "title": ["This field is required."],
  "audio": ["The submitted data was not a file."]
}
```

### Recommended Error Handling

```javascript
function handleError(error) {
  if (error.response) {
    const status = error.response.status;
    switch (status) {
      case 401: throw new Error('Invalid API key');
      case 403: throw new Error('Access forbidden');
      case 404: throw new Error('Resource not found');
      case 429: throw new Error('Rate limit exceeded');
      default: throw new Error(`API error: ${status}`);
    }
  } else if (error.request) {
    throw new Error('No response from server');
  } else {
    throw new Error(`Request failed: ${error.message}`);
  }
}
```

---

## Missing Features

Features NOT available via API:

| Feature | Status | Alternative |
|---------|--------|-------------|
| Delete lesson | Not available | Web UI only |
| Update lesson text | Not available | Delete & recreate |
| Create collection | Not documented | Web UI, then use ID |
| Delete collection | Not available | Web UI only |
| Create vocabulary card | Not available | Highlight in web/app |
| Delete vocabulary card | Not available | Set status to "Ignored" |
| User statistics (coins, streak) | Not available | None |
| Known words export | Not available | Count Status 4 cards |
| Reorder lessons in collection | Not available | None |
| Generate timestamps | Not available | Manual via web |

---

## Community Resources

### Official

- **API Docs:** https://www.lingq.com/apidocs/
- **API Key:** https://www.lingq.com/en/accounts/apikey/
- **Developer Forum:** https://forum.lingq.com/c/lingq-developer-forum/43

### Community Projects

| Project | Language | Description |
|---------|----------|-------------|
| [OnkelTem/lingq-api](https://github.com/OnkelTem/lingq-api) | OpenAPI | Best unofficial API spec |
| [daxida/lingq](https://github.com/daxida/lingq) | Python | CLI with YouTube/Whisper |
| [thags/lingqAnkiSync](https://github.com/thags/lingqAnkiSync) | Python | Anki synchronization |
| [paulywill/lingq_upload](https://github.com/paulywill/lingq_upload) | Python | Audio upload patterns |

### Forum Threads

- [v3 API Documentation Request](https://forum.lingq.com/t/url-and-docs-for-30-api/75276)
- [LingQ API General Discussion](https://forum.lingq.com/t/lingq-api/64922)
- [v2 Missing Methods](https://forum.lingq.com/t/lingq-api-v2-missing-methods/27155)
- [Update Word Status](https://forum.lingq.com/t/api-endpoint-for-updating-word-status/38968)
- [Audio Upload Help](https://forum.lingq.com/t/python-uploading-audio-via-api/64977)

### Discovering New Endpoints

Since v3 is undocumented, use browser DevTools:

1. Open Chrome DevTools (F12)
2. Go to Network tab → Filter: Fetch/XHR
3. Perform desired action in LingQ web interface
4. Examine API calls to discover endpoints
5. Note: Request/response headers and body

---

## Changelog

| Date | Changes |
|------|---------|
| 2025-11-27 | Initial comprehensive documentation |
| - | Documented all known v2 and v3 endpoints |
| - | Added undocumented endpoints from community research |
| - | Included code examples and common patterns |

---

## Contributing

Found an undocumented endpoint? Please:

1. Verify it works consistently
2. Document the request/response format
3. Note any limitations or quirks
4. Submit a PR or open an issue

---

*This documentation was compiled from official sources, LingQ developer forum discussions, GitHub community projects, and reverse engineering. Not affiliated with LingQ.*
