/**
 * Web tools executor - implements search_web, fetch_webpage, scrape_links
 */

import type { ToolDefinition, ToolExecutor } from '../tools/tools.types';
import { WEB_SEARCH_TOOLS } from './web-tools.tools';
import { formatSearchResults } from './search.client';
import { useWebToolsStore } from './store-web-tools';
import { apiAsync } from '~/common/util/trpc.client';


/**
 * Execute search_web tool (server-side via tRPC)
 */
const searchWebExecutor: ToolExecutor = async (args) => {
  try {
    const { query, num_results } = args;

    if (!query || typeof query !== 'string') {
      return { error: 'Missing or invalid "query" parameter' };
    }

    const numResults = typeof num_results === 'number' ? num_results : 10;

    if (numResults < 1 || numResults > 20) {
      return { error: 'num_results must be between 1 and 20' };
    }

    // Get settings from store
    const { searchProvider, searxngInstance } = useWebToolsStore.getState();

    // Call server-side tRPC endpoint (bypasses CORS)
    const response = await apiAsync.webTools.searchWeb.mutate({
      query,
      numResults,
      provider: searchProvider,
      searxngInstance,
    });

    return {
      result: formatSearchResults(response),
      metadata: {
        source: response.provider,
        resultCount: response.results.length,
        searchTime: response.searchTime,
      },
    };

  } catch (error: any) {
    return {
      error: `Web search failed: ${error.message}`,
    };
  }
};


/**
 * Execute fetch_webpage tool (server-side via tRPC)
 */
const fetchWebpageExecutor: ToolExecutor = async (args) => {
  try {
    const { url, format = 'text' } = args;

    if (!url || typeof url !== 'string') {
      return { error: 'Missing or invalid "url" parameter' };
    }

    // Validate URL
    try {
      new URL(url);
    } catch {
      return { error: 'Invalid URL format' };
    }

    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return { error: 'URL must start with http:// or https://' };
    }

    // Try using browse module first (better quality extraction)
    try {
      const { callBrowseFetchPageOrThrow } = await import('../browse/browse.client');
      const transforms: Array<'text' | 'markdown' | 'html'> = format === 'html' ? ['html'] : format === 'markdown' ? ['markdown'] : ['text'];
      const page = await callBrowseFetchPageOrThrow(url, transforms);

      let result: string = '';
      if (page.content) {
        if (format === 'html' && page.content.html) {
          result = page.content.html;
        } else if (format === 'markdown' && page.content.markdown) {
          result = page.content.markdown;
        } else if (page.content.text) {
          result = page.content.text;
        } else if (page.content.markdown) {
          result = page.content.markdown;
        }
      }

      return {
        result,
        metadata: {
          url,
          format,
          title: page.title,
        },
      };
    } catch (browseError: any) {
      // Fallback to server-side fetch via tRPC (bypasses CORS)
      try {
        const response = await apiAsync.webTools.fetchWebpage.mutate({ url, format });
        return response;
      } catch (trpcError: any) {
        return {
          error: `Failed to fetch webpage: ${trpcError.message}`,
        };
      }
    }

  } catch (error: any) {
    return {
      error: `Failed to fetch webpage: ${error.message}`,
    };
  }
};


/**
 * Execute scrape_links tool (server-side via tRPC)
 */
const scrapeLinksExecutor: ToolExecutor = async (args) => {
  try {
    const { url, filter } = args;

    if (!url || typeof url !== 'string') {
      return { error: 'Missing or invalid "url" parameter' };
    }

    // Call server-side tRPC endpoint (bypasses CORS)
    const response = await apiAsync.webTools.scrapeLinks.mutate({ url, filter });
    return response;

  } catch (error: any) {
    return {
      error: `Failed to scrape links: ${error.message}`,
    };
  }
};


/**
 * Web tools definitions for registry
 */
export const WEB_TOOLS: ToolDefinition[] = [
  {
    id: 'search_web',
    category: 'web',
    name: 'Web Search',
    description: 'Search the web using free search engines (no API keys required)',
    aixDefinition: WEB_SEARCH_TOOLS[0],
    executor: searchWebExecutor,
    requiresNetwork: true,
    browserAPIs: [],
  },
  {
    id: 'fetch_webpage',
    category: 'web',
    name: 'Fetch Webpage',
    description: 'Download and extract content from a URL',
    aixDefinition: WEB_SEARCH_TOOLS[1],
    executor: fetchWebpageExecutor,
    requiresNetwork: true,
    browserAPIs: [],
  },
  {
    id: 'scrape_links',
    category: 'web',
    name: 'Scrape Links',
    description: 'Extract all links from a webpage',
    aixDefinition: WEB_SEARCH_TOOLS[2],
    executor: scrapeLinksExecutor,
    requiresNetwork: true,
    browserAPIs: [],
  },
];
