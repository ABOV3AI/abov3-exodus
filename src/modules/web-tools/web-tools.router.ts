/**
 * Server-side web search router
 * Bypasses CORS by executing searches from the server
 */

import * as z from 'zod/v4';
import { TRPCError } from '@trpc/server';

import { createTRPCRouter, publicProcedure } from '~/server/trpc/trpc.server';

import type { SearchResponse, SearchResult } from './search.types';


// Input schemas
const searchWebInputSchema = z.object({
  query: z.string().min(1),
  numResults: z.number().min(1).max(20).optional().default(10),
  provider: z.enum(['searxng', 'duckduckgo', 'google', 'auto']).optional().default('auto'),
  searxngInstance: z.string().url().optional(),
});

const fetchWebpageInputSchema = z.object({
  url: z.string().url(),
  format: z.enum(['text', 'markdown', 'html']).optional().default('text'),
});

const scrapeLinksInputSchema = z.object({
  url: z.string().url(),
  filter: z.string().optional(),
});


// SearXNG search implementation (server-side)
async function searchSearXNGServer(
  query: string,
  numResults: number,
  instance: string = 'https://searx.be'
): Promise<SearchResponse> {
  const startTime = Date.now();

  try {
    const params = new URLSearchParams({
      q: query,
      format: 'json',
      pageno: '1',
    });

    const url = `${instance}/search?${params.toString()}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`SearXNG returned ${response.status}: ${response.statusText}`);
    }

    const data: any = await response.json();

    const results: SearchResult[] = (data.results || [])
      .slice(0, numResults)
      .map((result: any) => ({
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
    if (error.name === 'AbortError') {
      throw new Error(`SearXNG search timed out. Instance ${instance} may be slow or down.`);
    }
    throw new Error(`SearXNG search failed: ${error.message}`);
  }
}


// DuckDuckGo search implementation (server-side)
async function searchDuckDuckGoServer(
  query: string,
  numResults: number
): Promise<SearchResponse> {
  const startTime = Date.now();

  try {
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(searchUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`DuckDuckGo returned ${response.status}`);
    }

    const html = await response.text();

    // Simple HTML parsing (in production, use cheerio or similar)
    const results: SearchResult[] = [];
    const resultRegex = /<a[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/gi;
    const snippetRegex = /<a[^>]*class="result__snippet"[^>]*>([^<]*)<\/a>/gi;

    let match;
    let count = 0;
    while ((match = resultRegex.exec(html)) !== null && count < numResults) {
      const url = match[1];
      const title = match[2];

      // Try to find corresponding snippet
      const snippetMatch = snippetRegex.exec(html);
      const snippet = snippetMatch ? snippetMatch[1] : '';

      results.push({
        title: title || 'No title',
        url,
        snippet,
        source: 'duckduckgo',
      });
      count++;
    }

    return {
      results,
      totalResults: results.length,
      searchTime: Date.now() - startTime,
      provider: 'duckduckgo',
      query,
    };
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw new Error('DuckDuckGo search timed out');
    }
    throw new Error(`DuckDuckGo search failed: ${error.message}`);
  }
}


// Auto search with fallbacks (server-side)
async function searchAutoServer(
  query: string,
  numResults: number,
  searxngInstance?: string
): Promise<SearchResponse> {
  const errors: string[] = [];

  // Try SearXNG first
  try {
    return await searchSearXNGServer(query, numResults, searxngInstance);
  } catch (error: any) {
    errors.push(`SearXNG: ${error.message}`);
  }

  // Try DuckDuckGo
  try {
    return await searchDuckDuckGoServer(query, numResults);
  } catch (error: any) {
    errors.push(`DuckDuckGo: ${error.message}`);
  }

  throw new TRPCError({
    code: 'INTERNAL_SERVER_ERROR',
    message: `All search providers failed:\n${errors.join('\n')}`,
  });
}


// Router
export const webToolsRouter = createTRPCRouter({

  /* Search the web using free search engines */
  searchWeb: publicProcedure
    .input(searchWebInputSchema)
    .output(z.custom<SearchResponse>())
    .mutation(async ({ input }) => {
      const { query, numResults, provider, searxngInstance } = input;

      if (provider === 'auto') {
        return await searchAutoServer(query, numResults ?? 10, searxngInstance);
      }

      if (provider === 'searxng') {
        return await searchSearXNGServer(query, numResults ?? 10, searxngInstance);
      }

      if (provider === 'duckduckgo') {
        return await searchDuckDuckGoServer(query, numResults ?? 10);
      }

      if (provider === 'google') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Google search requires configuration in Settings → Services → Google Search',
        });
      }

      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `Invalid search provider: ${provider}`,
      });
    }),

  /* Fetch webpage content */
  fetchWebpage: publicProcedure
    .input(fetchWebpageInputSchema)
    .mutation(async ({ input }) => {
      const { url, format } = input;

      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);

        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (!response.ok) {
          throw new Error(`Failed to fetch ${url}: ${response.status}`);
        }

        const html = await response.text();

        // For now, return raw HTML
        // In production, use Turndown (markdown) or cheerio (text extraction)
        return {
          result: html,
          metadata: {
            url,
            format,
            contentType: response.headers.get('content-type') || undefined,
          },
        };
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to fetch webpage: ${error.message}`,
        });
      }
    }),

  /* Scrape links from a webpage */
  scrapeLinks: publicProcedure
    .input(scrapeLinksInputSchema)
    .mutation(async ({ input }) => {
      const { url, filter } = input;

      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);

        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (!response.ok) {
          throw new Error(`Failed to fetch ${url}: ${response.status}`);
        }

        const html = await response.text();

        // Simple link extraction using regex
        const links: Array<{ url: string; text: string }> = [];
        const linkRegex = /<a[^>]*href=["']([^"']*)["'][^>]*>([^<]*)<\/a>/gi;

        let match;
        while ((match = linkRegex.exec(html)) !== null) {
          const href = match[1];
          const text = match[2].trim();

          // Resolve relative URLs
          let absoluteUrl = href;
          try {
            absoluteUrl = new URL(href, url).href;
          } catch {
            // Keep as-is if resolution fails
          }

          // Apply filter if specified
          if (filter) {
            const filterLower = filter.toLowerCase();
            if (!absoluteUrl.toLowerCase().includes(filterLower) &&
                !text.toLowerCase().includes(filterLower)) {
              continue;
            }
          }

          links.push({ url: absoluteUrl, text });
        }

        // Format output
        const result = links
          .map((link, i) => `${i + 1}. ${link.text || '(no text)'}\n   ${link.url}`)
          .join('\n\n');

        return {
          result: result || '(no links found)',
          metadata: {
            totalLinks: links.length,
            filteredLinks: links.length,
          },
        };
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to scrape links: ${error.message}`,
        });
      }
    }),

});
