#!/usr/bin/env bun

/**
 * Direct implementation test - bypasses MCP server layer
 * Tests the LingQClient methods directly to verify functionality
 */

import { LingQClient } from './dist/lingq-client.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const API_KEY = process.env.LINGQ_API_KEY;

if (!API_KEY) {
  console.error('Error: LINGQ_API_KEY environment variable is required');
  process.exit(1);
}

const client = new LingQClient({ apiKey: API_KEY });

// Test configuration
const TEST_LANGUAGE = 'ko';
const TEST_LESSON_TITLE = 'KPop Demon Hunters (Korean Dub CC)';
const TEST_COLLECTION_TITLE = 'Netflix Movies';

console.log('='.repeat(80));
console.log('LingQ MCP Server - Implementation Test Suite');
console.log('='.repeat(80));
console.log();

// Test results tracking
const results = {
  passed: 0,
  failed: 0,
  tests: []
};

function recordTest(name, status, details = {}) {
  results.tests.push({ name, status, ...details });
  if (status === 'PASS') {
    results.passed++;
    console.log(`✅ ${name}`);
  } else {
    results.failed++;
    console.log(`❌ ${name}`);
  }
  if (details.message) {
    console.log(`   ${details.message}`);
  }
  if (details.tokenEstimate) {
    console.log(`   Token estimate: ~${details.tokenEstimate} tokens`);
  }
  console.log();
}

// Helper to estimate token count (rough approximation)
function estimateTokens(obj) {
  const str = JSON.stringify(obj);
  return Math.ceil(str.length / 4);
}

async function runTests() {
  console.log('PHASE 1: Meta Search Functions');
  console.log('-'.repeat(80));
  console.log();

  // Test 1.1: Find Lesson by Title (Success Case)
  try {
    const result = await client.findLessonByTitle(TEST_LANGUAGE, TEST_LESSON_TITLE);
    if (result.found && result.lessonId && result.title) {
      recordTest('Test 1.1: lingq_find_lesson_by_title (success case)', 'PASS', {
        message: `Found: ${result.title} (ID: ${result.lessonId})`,
        tokenEstimate: estimateTokens(result)
      });
    } else {
      recordTest('Test 1.1: lingq_find_lesson_by_title (success case)', 'FAIL', {
        message: 'Lesson not found or missing data'
      });
    }
  } catch (error) {
    recordTest('Test 1.1: lingq_find_lesson_by_title (success case)', 'FAIL', {
      message: error.message
    });
  }

  // Test 1.2: Find Lesson by Title (Not Found Case)
  try {
    const result = await client.findLessonByTitle(TEST_LANGUAGE, 'This Lesson Definitely Does Not Exist 12345xyz');
    if (!result.found) {
      recordTest('Test 1.2: lingq_find_lesson_by_title (not found case)', 'PASS', {
        message: 'Correctly returned found: false',
        tokenEstimate: estimateTokens(result)
      });
    } else {
      recordTest('Test 1.2: lingq_find_lesson_by_title (not found case)', 'FAIL', {
        message: 'Should not have found a lesson'
      });
    }
  } catch (error) {
    recordTest('Test 1.2: lingq_find_lesson_by_title (not found case)', 'FAIL', {
      message: error.message
    });
  }

  // Test 1.3: Find Collection by Title
  try {
    const result = await client.findCollectionByTitle(TEST_LANGUAGE, TEST_COLLECTION_TITLE);
    if (result.found && result.collectionId && result.title) {
      recordTest('Test 1.3: lingq_find_collection_by_title', 'PASS', {
        message: `Found: ${result.title} (ID: ${result.collectionId})`,
        tokenEstimate: estimateTokens(result)
      });
    } else {
      recordTest('Test 1.3: lingq_find_collection_by_title', 'FAIL', {
        message: 'Collection not found or missing data'
      });
    }
  } catch (error) {
    recordTest('Test 1.3: lingq_find_collection_by_title', 'FAIL', {
      message: error.message
    });
  }

  // Test 1.4: Check Lesson Exists
  try {
    const exists = await client.checkLessonExists(TEST_LANGUAGE, TEST_LESSON_TITLE);
    if (typeof exists === 'boolean' && exists === true) {
      recordTest('Test 1.4: lingq_check_lesson_exists', 'PASS', {
        message: 'Correctly returned boolean: true',
        tokenEstimate: 10
      });
    } else {
      recordTest('Test 1.4: lingq_check_lesson_exists', 'FAIL', {
        message: `Expected boolean true, got: ${exists}`
      });
    }
  } catch (error) {
    recordTest('Test 1.4: lingq_check_lesson_exists', 'FAIL', {
      message: error.message
    });
  }

  // Test 1.5: Get Recent Lessons
  try {
    const lessons = await client.getRecentLessons(TEST_LANGUAGE, 10);
    if (Array.isArray(lessons) && lessons.length <= 10) {
      const hasMinimalFields = lessons.every(l => l.id && l.title);
      if (hasMinimalFields) {
        recordTest('Test 1.5: lingq_get_recent_lessons', 'PASS', {
          message: `Retrieved ${lessons.length} lessons with minimal fields`,
          tokenEstimate: estimateTokens(lessons)
        });
      } else {
        recordTest('Test 1.5: lingq_get_recent_lessons', 'FAIL', {
          message: 'Some lessons missing required minimal fields (id, title)'
        });
      }
    } else {
      recordTest('Test 1.5: lingq_get_recent_lessons', 'FAIL', {
        message: `Expected array of ≤10 lessons, got: ${typeof lessons}, length: ${lessons?.length}`
      });
    }
  } catch (error) {
    recordTest('Test 1.5: lingq_get_recent_lessons', 'FAIL', {
      message: error.message
    });
  }

  console.log();
  console.log('PHASE 2: Minimal Mode on Existing Tools');
  console.log('-'.repeat(80));
  console.log();

  // Test 2.1: Get Lessons (Minimal Mode - Default)
  try {
    const result = await client.getLessons(TEST_LANGUAGE, undefined, 1, 10, true);
    const tokenCount = estimateTokens(result);
    const hasMinimalFields = result.results.every(l =>
      l.id && l.title && !('url' in l) && !('level' in l)
    );
    if (hasMinimalFields && result.results.length === 10) {
      recordTest('Test 2.1: lingq_get_lessons (minimal mode)', 'PASS', {
        message: `Retrieved 10 lessons with minimal fields only`,
        tokenEstimate: tokenCount
      });
    } else {
      recordTest('Test 2.1: lingq_get_lessons (minimal mode)', 'FAIL', {
        message: `Expected minimal fields only, got full objects or wrong count`
      });
    }
  } catch (error) {
    recordTest('Test 2.1: lingq_get_lessons (minimal mode)', 'FAIL', {
      message: error.message
    });
  }

  // Test 2.2: Get Lessons (Full Mode - Explicit)
  try {
    const result = await client.getLessons(TEST_LANGUAGE, undefined, 1, 10, false);
    const tokenCount = estimateTokens(result);
    const hasFullFields = result.results.some(l =>
      'url' in l || 'level' in l || 'wordCount' in l
    );
    if (hasFullFields && result.results.length === 10) {
      recordTest('Test 2.2: lingq_get_lessons (full mode)', 'PASS', {
        message: `Retrieved 10 lessons with full metadata`,
        tokenEstimate: tokenCount
      });
    } else {
      recordTest('Test 2.2: lingq_get_lessons (full mode)', 'FAIL', {
        message: `Expected full fields, got minimal or wrong count`
      });
    }
  } catch (error) {
    recordTest('Test 2.2: lingq_get_lessons (full mode)', 'FAIL', {
      message: error.message
    });
  }

  // Test 2.3: Get Collections (Minimal Mode - Default)
  try {
    const result = await client.getCollections(TEST_LANGUAGE, 1, 15, true);
    const tokenCount = estimateTokens(result);
    const hasMinimalFields = result.results.every(c =>
      c.pk && c.title && !('description' in c) && !('level' in c)
    );
    if (hasMinimalFields && result.results.length === 15) {
      recordTest('Test 2.3: lingq_get_collections (minimal mode)', 'PASS', {
        message: `Retrieved 15 collections with minimal fields only`,
        tokenEstimate: tokenCount
      });
    } else {
      recordTest('Test 2.3: lingq_get_collections (minimal mode)', 'FAIL', {
        message: `Expected 15 minimal collections, got ${result.results.length}`
      });
    }
  } catch (error) {
    recordTest('Test 2.3: lingq_get_collections (minimal mode)', 'FAIL', {
      message: error.message
    });
  }

  // Test 2.4: Get Collections (Full Mode)
  try {
    const result = await client.getCollections(TEST_LANGUAGE, 1, 15, false);
    const tokenCount = estimateTokens(result);
    const hasFullFields = result.results.some(c =>
      'description' in c || 'level' in c
    );
    if (hasFullFields && result.results.length === 15) {
      recordTest('Test 2.4: lingq_get_collections (full mode)', 'PASS', {
        message: `Retrieved 15 collections with full metadata`,
        tokenEstimate: tokenCount
      });
    } else {
      recordTest('Test 2.4: lingq_get_collections (full mode)', 'FAIL', {
        message: `Expected full collections, got minimal or wrong count`
      });
    }
  } catch (error) {
    recordTest('Test 2.4: lingq_get_collections (full mode)', 'FAIL', {
      message: error.message
    });
  }

  // Test 2.5: Search Cards (Minimal Mode - Default)
  try {
    const result = await client.searchCards(TEST_LANGUAGE, { page: 1, page_size: 15 }, true);
    const tokenCount = estimateTokens(result);
    const hasMinimalFields = result.results.every(c =>
      c.pk && c.term && c.status !== undefined && !('hints' in c) && !('readings' in c)
    );
    if (hasMinimalFields && result.results.length === 15) {
      recordTest('Test 2.5: lingq_search_cards (minimal mode)', 'PASS', {
        message: `Retrieved 15 cards with minimal fields only`,
        tokenEstimate: tokenCount
      });
    } else {
      recordTest('Test 2.5: lingq_search_cards (minimal mode)', 'FAIL', {
        message: `Expected 15 minimal cards, got ${result.results.length}`
      });
    }
  } catch (error) {
    recordTest('Test 2.5: lingq_search_cards (minimal mode)', 'FAIL', {
      message: error.message
    });
  }

  console.log();
  console.log('PHASE 3: Pagination Defaults');
  console.log('-'.repeat(80));
  console.log();

  // Test 3.1: Verify search_cards default pageSize = 15
  try {
    // The searchCards method has default page_size: 15 in line 90 of lingq-client.ts
    const result = await client.searchCards(TEST_LANGUAGE, {}, true);
    if (result.results.length === 15) {
      recordTest('Test 3.1: lingq_search_cards default pageSize = 15', 'PASS', {
        message: `Default returned 15 cards`
      });
    } else {
      recordTest('Test 3.1: lingq_search_cards default pageSize = 15', 'FAIL', {
        message: `Expected 15, got ${result.results.length}`
      });
    }
  } catch (error) {
    recordTest('Test 3.1: lingq_search_cards default pageSize = 15', 'FAIL', {
      message: error.message
    });
  }

  // Test 3.2: Verify get_collections default pageSize = 15
  try {
    // The getCollections method has default pageSize: 15 in line 202 of lingq-client.ts
    const result = await client.getCollections(TEST_LANGUAGE, 1, undefined, true);
    if (result.results.length === 15) {
      recordTest('Test 3.2: lingq_get_collections default pageSize = 15', 'PASS', {
        message: `Default returned 15 collections`
      });
    } else {
      recordTest('Test 3.2: lingq_get_collections default pageSize = 15', 'FAIL', {
        message: `Expected 15, got ${result.results.length}`
      });
    }
  } catch (error) {
    recordTest('Test 3.2: lingq_get_collections default pageSize = 15', 'FAIL', {
      message: error.message
    });
  }

  // Test 3.3: Verify get_lessons default pageSize = 25
  try {
    // The getLessons method has default pageSize: 25 in line 175 of lingq-client.ts
    const result = await client.getLessons(TEST_LANGUAGE, undefined, 1, undefined, true);
    if (result.results.length === 25) {
      recordTest('Test 3.3: lingq_get_lessons default pageSize = 25', 'PASS', {
        message: `Default returned 25 lessons (unchanged)`
      });
    } else {
      recordTest('Test 3.3: lingq_get_lessons default pageSize = 25', 'FAIL', {
        message: `Expected 25, got ${result.results.length}`
      });
    }
  } catch (error) {
    recordTest('Test 3.3: lingq_get_lessons default pageSize = 25', 'FAIL', {
      message: error.message
    });
  }

  console.log();
  console.log('='.repeat(80));
  console.log('TEST SUMMARY');
  console.log('='.repeat(80));
  console.log();
  console.log(`Total Tests: ${results.passed + results.failed}`);
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log();

  if (results.failed === 0) {
    console.log('🎉 All tests passed! Implementation verified.');
  } else {
    console.log('⚠️  Some tests failed. Review the output above.');
  }
  console.log();
}

// Run tests
runTests().catch(error => {
  console.error('Fatal error running tests:', error);
  process.exit(1);
});
