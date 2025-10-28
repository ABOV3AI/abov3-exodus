/**
 * SearXNG search client
 * No API keys required! Uses public SearXNG instances
 */

import type { SearchResult, SearchOptions, SearchResponse } from './search.types';
import { useWebToolsStore } from './store-web-tools';


interface SearXNGResult {
  title: string;
  url: string;
  content: string;
  publishedDate?: string;
  thumbnail?: string;
  engine?: string;
}


interface SearXNGResponse {
  results: SearXNGResult[];
  query: string;
  number_of_results?: number;
}


/**
 * Search using SearXNG (privacy-focused metasearch engine)
 * No API keys required!
 */
export async function searchSearXNG(
  query: string,
  options: SearchOptions = {}
): Promise<SearchResponse> {
  const startTime = Date.now();
  const instance = useWebToolsStore.getState().searxngInstance;
  const numResults = options.numResults ?? 10;

  try {
    // Build search URL
    const params = new URLSearchParams({
      q: query,
      format: 'json',
      pageno: '1',
    });

    // Add language if specified
    if (options.language) {
      params.set('language', options.language);
    }

    // Add time range if specified
    if (options.timeRange && options.timeRange !== 'all') {
      params.set('time_range', options.timeRange);
    }

    const url = `${instance}/search?${params.toString()}`;

    // Fetch results
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      // Add timeout
      signal: AbortSignal.timeout(10000), // 10 seconds
    });

    if (!response.ok) {
      throw new Error(`SearXNG returned ${response.status}: ${response.statusText}`);
    }

    const data: SearXNGResponse = await response.json();

    // Convert to standard format
    const results: SearchResult[] = (data.results || [])
      .slice(0, numResults)
      .map(result => ({
        title: result.title || 'No title',
        url: result.url,
        snippet: result.content || '',
        source: 'searxng' as const,
        publishedDate: result.publishedDate,
        thumbnail: result.thumbnail,
      }));

    return {
      results,
      totalResults: data.number_of_results,
      searchTime: Date.now() - startTime,
      provider: 'searxng',
      query,
    };

  } catch (error: any) {
    // Provide helpful error messages
    if (error.name === 'AbortError' || error.name === 'TimeoutError') {
      throw new Error(`SearXNG search timed out. Instance ${instance} may be slow or down.`);
    }

    if (error.message.includes('Failed to fetch')) {
      throw new Error(`Cannot connect to SearXNG instance ${instance}. It may be blocked or offline. Try a different instance in Settings.`);
    }

    throw new Error(`SearXNG search failed: ${error.message}`);
  }
}


/**
 * Test if a SearXNG instance is responding
 */
export async function testSearXNGInstance(instance: string): Promise<boolean> {
  try {
    const response = await fetch(`${instance}/search?q=test&format=json`, {
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch {
    return false;
  }
}
