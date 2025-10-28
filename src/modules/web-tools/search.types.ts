/**
 * Common types for web search across different providers
 */

import type { SearchProvider } from './store-web-tools';


export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  source: SearchProvider;
  publishedDate?: string;
  thumbnail?: string;
}


export interface SearchOptions {
  numResults?: number;
  provider?: SearchProvider;
  language?: string;
  timeRange?: 'day' | 'week' | 'month' | 'year' | 'all';
}


export interface SearchResponse {
  results: SearchResult[];
  totalResults?: number;
  searchTime?: number;
  provider: SearchProvider;
  query: string;
}
