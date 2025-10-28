/**
 * Zustand store for web tools settings
 * Zero-config web search with multiple providers
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';


export type SearchProvider = 'searxng' | 'duckduckgo' | 'google' | 'auto';


export interface WebToolsState {
  // Search configuration
  searchProvider: SearchProvider;
  setSearchProvider: (provider: SearchProvider) => void;

  // SearXNG settings
  searxngInstance: string;
  setSearxngInstance: (instance: string) => void;

  // Web scraping
  enableScraping: boolean;
  setEnableScraping: (enable: boolean) => void;

  // Download limits
  maxDownloadSizeMB: number;
  setMaxDownloadSizeMB: (size: number) => void;
}


// Popular public SearXNG instances
export const SEARXNG_INSTANCES = [
  'https://searx.be',
  'https://searx.tiekoetter.com',
  'https://search.bus-hit.me',
  'https://searx.work',
  'https://searx.fmac.xyz',
];


export const useWebToolsStore = create<WebToolsState>()(
  persist(
    (set) => ({
      // Default to SearXNG (no API key required!)
      searchProvider: 'auto',
      setSearchProvider: (provider) => set({ searchProvider: provider }),

      // Default to a reliable public instance
      searxngInstance: SEARXNG_INSTANCES[0],
      setSearxngInstance: (instance) => set({ searxngInstance: instance }),

      // Web scraping enabled by default
      enableScraping: true,
      setEnableScraping: (enable) => set({ enableScraping: enable }),

      // Reasonable download limit
      maxDownloadSizeMB: 10,
      setMaxDownloadSizeMB: (size) => set({ maxDownloadSizeMB: size }),
    }),
    {
      name: 'app-web-tools',
      version: 1,
    }
  )
);
