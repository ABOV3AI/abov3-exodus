/**
 * DuckDuckGo search client via HTML scraping
 * No API keys required!
 */

import type { SearchResult, SearchOptions, SearchResponse } from './search.types';


/**
 * Parse DuckDuckGo HTML results
 */
function parseDDGResults(html: string, maxResults: number): SearchResult[] {
  const results: SearchResult[] = [];

  try {
    // Create a DOM parser
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // DDG HTML result selectors
    const resultElements = doc.querySelectorAll('.result, .results_links_deep');

    for (const element of Array.from(resultElements)) {
      if (results.length >= maxResults) break;

      // Extract title
      const titleEl = element.querySelector('.result__title, .result__a');
      const title = titleEl?.textContent?.trim() || 'No title';

      // Extract URL
      const linkEl = element.querySelector('a.result__url, a.result__a');
      const url = linkEl?.getAttribute('href') || '';

      // Skip if no URL
      if (!url) continue;

      // Extract snippet
      const snippetEl = element.querySelector('.result__snippet, .result__body');
      const snippet = snippetEl?.textContent?.trim() || '';

      results.push({
        title,
        url,
        snippet,
        source: 'duckduckgo',
      });
    }

    return results;

  } catch (error) {
    console.error('[DDG] Parse error:', error);
    return [];
  }
}


/**
 * Search using DuckDuckGo HTML scraping
 * No API keys required!
 */
export async function searchDuckDuckGo(
  query: string,
  options: SearchOptions = {}
): Promise<SearchResponse> {
  const startTime = Date.now();
  const numResults = options.numResults ?? 10;

  try {
    // Build search URL
    const params = new URLSearchParams({
      q: query,
      t: 'h_', // Simplified HTML
      ia: 'web',
    });

    // Add time range if specified
    if (options.timeRange && options.timeRange !== 'all') {
      const timeMap: Record<string, string> = {
        day: 'd',
        week: 'w',
        month: 'm',
        year: 'y',
      };
      params.set('df', timeMap[options.timeRange] || '');
    }

    const url = `https://html.duckduckgo.com/html/?${params.toString()}`;

    // Fetch HTML
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'text/html',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      signal: AbortSignal.timeout(10000), // 10 seconds
    });

    if (!response.ok) {
      throw new Error(`DuckDuckGo returned ${response.status}`);
    }

    const html = await response.text();

    // Parse results
    const results = parseDDGResults(html, numResults);

    if (results.length === 0) {
      throw new Error('No results found or parsing failed');
    }

    return {
      results,
      searchTime: Date.now() - startTime,
      provider: 'duckduckgo',
      query,
    };

  } catch (error: any) {
    if (error.name === 'AbortError' || error.name === 'TimeoutError') {
      throw new Error('DuckDuckGo search timed out');
    }

    if (error.message.includes('Failed to fetch')) {
      throw new Error('Cannot connect to DuckDuckGo. Check your internet connection.');
    }

    throw new Error(`DuckDuckGo search failed: ${error.message}`);
  }
}
