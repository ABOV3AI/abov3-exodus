/**
 * Web tools AIX definitions
 * search_web and fetch_webpage tools - NO API KEYS REQUIRED!
 */

import type { AixTools_ToolDefinition } from '../aix/server/api/aix.wiretypes';


export const WEB_SEARCH_TOOLS: AixTools_ToolDefinition[] = [
  {
    type: 'function_call',
    function_call: {
      name: 'search_web',
      description: 'Search the web for information using free search engines (SearXNG or DuckDuckGo). NO API KEYS REQUIRED - works out of the box! Returns top search results with titles, URLs, and snippets. Use this to find current information, recent news, documentation, tutorials, or any web content. The search automatically tries multiple providers for reliability.',
      input_schema: {
        properties: {
          query: {
            type: 'string',
            description: 'Search query - be specific for better results. Example: "Next.js 15 server actions tutorial"',
          },
          num_results: {
            type: 'number',
            description: 'Number of results to return (1-20). Default is 10.',
          },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function_call',
    function_call: {
      name: 'fetch_webpage',
      description: 'Download and extract content from a specific URL. Converts HTML to clean text or markdown for easy reading. Use this after search_web to get the full content of a specific page, or to read documentation, articles, or any web page. Works with any publicly accessible URL.',
      input_schema: {
        properties: {
          url: {
            type: 'string',
            description: 'Full URL to fetch (must start with http:// or https://)',
          },
          format: {
            type: 'string',
            description: 'Output format: "text" (plain text, default), "markdown" (formatted markdown), or "html" (raw HTML)',
            enum: ['text', 'markdown', 'html'],
          },
        },
        required: ['url'],
      },
    },
  },
  {
    type: 'function_call',
    function_call: {
      name: 'scrape_links',
      description: 'Extract all links from a webpage. Useful for discovering related pages, finding documentation sections, or building a sitemap. Returns a list of URLs found on the page with their anchor text.',
      input_schema: {
        properties: {
          url: {
            type: 'string',
            description: 'URL to scrape links from',
          },
          filter: {
            type: 'string',
            description: 'Optional: Only return links containing this text (e.g., "docs", "api")',
          },
        },
        required: ['url'],
      },
    },
  },
];
