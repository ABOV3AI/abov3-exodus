/**
 * Unified web search client with multi-provider fallback
 * Default: NO API KEYS REQUIRED!
 */

import type { SearchOptions, SearchResponse } from './search.types';
import { useWebToolsStore } from './store-web-tools';
import { searchSearXNG } from './search.searxng';
import { searchDuckDuckGo } from './search.duckduckgo';


/**
 * Search Google using existing implementation (requires API key)
 */
async function searchGoogle(
  query: string,
  options: SearchOptions = {}
): Promise<SearchResponse> {
  const startTime = Date.now();

  // Import the existing Google Search client
  const { callApiSearchGoogle } = await import('../google/search.client');
  const { useGoogleSearchStore } = await import('../google/store-module-google');
  const googleState = useGoogleSearchStore.getState();

  if (!googleState.googleCloudApiKey || !googleState.googleCSEId) {
    throw new Error('Google Search requires API key and CSE ID. Configure in Settings → Services → Google Search.');
  }

  try {
    const numResults = options.numResults ?? 10;
    const response = await callApiSearchGoogle(query, numResults);

    return {
      results: response.pages.map(page => ({
        title: page.title,
        url: page.link,
        snippet: page.snippet,
        source: 'google' as const,
      })),
      totalResults: response.pages.length,
      searchTime: Date.now() - startTime,
      provider: 'google',
      query,
    };
  } catch (error: any) {
    throw new Error(`Google Search failed: ${error.message}`);
  }
}


/**
 * Main search function with automatic provider fallback
 */
export async function searchWeb(
  query: string,
  options: SearchOptions = {}
): Promise<SearchResponse> {
  const { searchProvider } = useWebToolsStore.getState();
  const provider = options.provider ?? searchProvider;

  // Explicit provider selection
  if (provider === 'google') {
    return await searchGoogle(query, options);
  }

  if (provider === 'searxng') {
    return await searchSearXNG(query, options);
  }

  if (provider === 'duckduckgo') {
    return await searchDuckDuckGo(query, options);
  }

  // Auto mode: Try providers in order with fallbacks
  if (provider === 'auto') {
    const errors: string[] = [];

    // 1. Try SearXNG first (no API key, privacy-focused)
    try {
      if (process.env.NODE_ENV === 'development') {
        console.log('[Search] Trying SearXNG...');
      }
      return await searchSearXNG(query, options);
    } catch (error: any) {
      errors.push(`SearXNG: ${error.message}`);
      if (process.env.NODE_ENV === 'development') {
        console.warn('[Search] SearXNG failed:', error.message);
      }
    }

    // 2. Try DuckDuckGo (no API key, reliable)
    try {
      if (process.env.NODE_ENV === 'development') {
        console.log('[Search] Trying DuckDuckGo...');
      }
      return await searchDuckDuckGo(query, options);
    } catch (error: any) {
      errors.push(`DuckDuckGo: ${error.message}`);
      if (process.env.NODE_ENV === 'development') {
        console.warn('[Search] DuckDuckGo failed:', error.message);
      }
    }

    // 3. Try Google if configured
    try {
      if (process.env.NODE_ENV === 'development') {
        console.log('[Search] Trying Google...');
      }
      return await searchGoogle(query, options);
    } catch (error: any) {
      errors.push(`Google: ${error.message}`);
      if (process.env.NODE_ENV === 'development') {
        console.warn('[Search] Google failed:', error.message);
      }
    }

    // All providers failed
    throw new Error(
      `All search providers failed:\n${errors.join('\n')}\n\n` +
      `Try:\n` +
      `1. Check your internet connection\n` +
      `2. Change SearXNG instance in Settings → Tools → Web Tools\n` +
      `3. Configure Google Search API in Settings → Services`
    );
  }

  throw new Error(`Invalid search provider: ${provider}`);
}


/**
 * Format search results as readable text
 */
export function formatSearchResults(response: SearchResponse): string {
  const header = `Search results for "${response.query}" (${response.results.length} results, ${response.searchTime}ms, via ${response.provider}):\n\n`;

  const results = response.results
    .map((result, i) => {
      return `${i + 1}. ${result.title}\n   ${result.url}\n   ${result.snippet}\n`;
    })
    .join('\n');

  return header + results;
}
